const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where unavailable
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "allam-2-7b",
];

// Common greeting / conversational patterns that are NOT legal disputes
const GREETING_OR_TRIVIAL_REGEX = /^(hi|hello|hey|namaste|vanakkam|pranam|good\s+(morning|afternoon|evening|day|night)|how\s+are\s+you|what('?s|\s+is)\s+up|testing|test(\s+123)?|asdf+|qwerty|ok|okay|fine|cool|thanks|thank\s+you|who\s+are\s+you|what\s+is\s+your\s+name|tell\s+me\s+a\s+joke|howdy|sup)[\s.!?,]*$/i;

// Legal / dispute indicator words for heuristic fallback
const LEGAL_DISPUTE_KEYWORDS = [
  "encroach", "land", "plot", "boundary", "property", "tenant", "evict", "rent",
  "survey", "7/12", "partition", "will", "ancestral", "theft", "stolen", "fir",
  "police", "fraud", "cheating", "assault", "injure", "threat", "harass", "bns",
  "ipc", "divorce", "custody", "marriage", "maintenance", "alimony", "domestic",
  "dowry", "consumer", "defective", "refund", "cheque", "dishonour", "contract",
  "agreement", "salary", "wages", "employment", "injunction", "suit", "damages",
  "compensation", "possession", "forgery", "trespass", "mutation", "patta", "fir",
  "complaint", "accused", "victim", "dispute", "illegal", "violat", "damage"
];

class CaseValidationService {
  /**
   * Evaluates if a given narrative describes a genuine legal dispute/case grievance
   * or is an irrelevant sentence like "hi", "hello", casual chat, or gibberish.
   *
   * @param {string} text - Case description narrative
   * @param {string} language - Narrative language (English, Marathi, Hindi, etc.)
   * @returns {Promise<{ isValid: boolean, reason: string, detectedTopic?: string }>}
   */
  static async validateCaseNarrative(text, language = "English") {
    if (!text || typeof text !== "string") {
      return {
        isValid: false,
        reason: "Dispute narrative cannot be empty. Please describe the facts of your dispute.",
        detectedTopic: "Empty input",
      };
    }

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Pure greeting or trivial banter check (checked first)
    if (GREETING_OR_TRIVIAL_REGEX.test(trimmed)) {
      return {
        isValid: false,
        reason: `The text entered ("${trimmed}") is a casual greeting, not an actionable legal dispute. Please describe your specific grievance (e.g., land encroachment, theft, contract breach, or family dispute).`,
        detectedTopic: "Casual greeting",
      };
    }

    if (trimmed.length < 4) {
      return {
        isValid: false,
        reason: "Dispute narrative is too brief. Please describe your legal grievance or dispute in detail.",
        detectedTopic: "Too brief",
      };
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    const hasLegalKeyword = LEGAL_DISPUTE_KEYWORDS.some((kw) => lower.includes(kw));

    // If it lacks legal keywords and is too short or conversational
    if (!hasLegalKeyword && (trimmed.length < 15 || words.length < 3)) {
      return {
        isValid: false,
        reason: `The text entered ("${trimmed}") does not describe a valid legal case or dispute. Please provide details of your legal grievance (parties involved, property, or incident).`,
        detectedTopic: "Non-legal sentence",
      };
    }

    // 3. Groq LLM Semantic Scrutiny
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey && groqKey.startsWith("gsk_")) {
      for (const model of GROQ_MODELS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const prompt = `You are an Indian Court Registrar and Registry Scrutiny Officer evaluating initial case filings.
Your job is to determine whether the user-submitted text genuinely describes an actual legal grievance, dispute, conflict, crime report, or civil injury suitable for an Indian court, e-courts petition, or police FIR.

CRITICAL RULES:
- If the text is merely a greeting (e.g. "hi", "hello", "hey", "namaste", "good morning"), casual banter ("how are you", "who are you"), testing gibberish, a trivial sentence ("i want pizza", "the weather is nice"), or completely unrelated to any legal conflict:
  Set "isValid": false.
- If the text describes an actual dispute, rights violation, property encroachment, contract breach, financial fraud, domestic dispute, violence, theft, or civil grievance:
  Set "isValid": true.

Input Text to Scrutinize: "${trimmed}" (Language: ${language})

Respond ONLY with a valid JSON object matching this exact schema:
{
  "isValid": boolean,
  "reason": "1-2 concise sentences explaining why this is or is not an acceptable legal case description",
  "detectedTopic": "Short label, e.g. 'Casual Greeting', 'Trivial Chatter', 'Land Encroachment Claim', etc."
}`;

          const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "system",
                  content: "You are an Indian Court Registrar. Output only valid JSON.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
              max_tokens: 250,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const rawContent = data.choices?.[0]?.message?.content;
            if (rawContent) {
              const parsed = JSON.parse(rawContent);
              return {
                isValid: Boolean(parsed.isValid),
                reason: parsed.reason || (parsed.isValid ? "Valid legal dispute." : "Irrelevant non-legal text detected."),
                detectedTopic: parsed.detectedTopic || (parsed.isValid ? "Legal Dispute" : "Irrelevant Text"),
                verifiedBy: `Groq (${model})`,
              };
            }
          } else {
            console.warn(`[CaseValidationService] Groq model ${model} HTTP ${response.status}`);
          }
        } catch (err) {
          console.warn(`[CaseValidationService] Groq model ${model} failed:`, err.message);
        }
      }
    }

    // 4. Deterministic Heuristic Fallback Engine
    const isConversational =
      lower.includes("how are you") ||
      lower.includes("what are you doing") ||
      lower.includes("who are you") ||
      lower.includes("good morning") ||
      lower.includes("good evening") ||
      lower.includes("tell me") ||
      lower.includes("weather") ||
      lower.includes("pizza") ||
      lower.includes("song") ||
      lower.startsWith("hi ") ||
      lower.startsWith("hello ");

    if (!hasLegalKeyword && (isConversational || words.length < 5)) {
      return {
        isValid: false,
        reason: `The submitted sentence ("${trimmed}") does not contain any legal grievance, dispute facts, or claims recognizable under Indian law. Please describe your dispute.`,
        detectedTopic: "Unrelated non-legal sentence",
        verifiedBy: "Judicial Rule Engine",
      };
    }

    // Default to valid if length is substantive and has legal substance
    return {
      isValid: true,
      reason: "Grievance narrative contains dispute facts suitable for procedural classification.",
      detectedTopic: "Legal Grievance",
      verifiedBy: "Judicial Rule Engine",
    };
  }
}

module.exports = CaseValidationService;
