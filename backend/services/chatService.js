const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore in environments where unavailable
}

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const XAI_API_URL = "https://api.x.ai/v1/chat/completions";

// Groq models verified and active on the configured API key
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "allam-2-7b",
];

function getSystemPrompt(role = "citizen", userName = "", userEmail = "") {
  const basePrompt = `You are NyayaFlow AI, the judicial intelligence assistant powering the Indian judiciary and e-courts modernization platform "NyayaFlow".
You possess deep, authoritative, and accurate knowledge of Indian Law and court procedures.

Core Knowledge Base:
- Bharatiya Nyaya Sanhita (BNS, 2023) - replacement for the Indian Penal Code (IPC).
- Bharatiya Nagarik Suraksha Sanhita (BNSS, 2023) - replacement for the Code of Criminal Procedure (CrPC).
- Bharatiya Sakshya Adhiniyam (BSA, 2023) - replacement for the Indian Evidence Act (especially Section 63 for admissibility of electronic records and cryptographic hash integrity).
- Code of Civil Procedure, 1908 (CPC) - especially Order XXXIX Rules 1 & 2 for temporary/interim injunctions, Section 9 for civil court jurisdiction.
- Specific Relief Act, 1963 - Sections 36 to 42 for preventive relief, injunctions, and Section 6 for recovery of possession.
- Indian e-Courts Architecture - 16-character Case Number Record (CNR) structure: 2-digit State Code + 2-digit District Code + 4-digit Court Establishment Code + 6-digit Case Number + 2-digit Year (e.g., MHPU020001422026).
- Land Records & Revenue Law - 7/12 extract mutation registers, Record of Rights (RoR), survey partition maps, and demarcation under State Land Revenue Codes (e.g. MLRC 1966 Section 143).

Strict Guidelines:
1. ACCURACY & INTEGRITY: Always cite genuine Indian statutes, sections, orders, and legal doctrines accurately. NEVER invent, hallucinate, or fabricate non-existent laws, acts, or sections. If an issue is governed by state-specific amendments or judicial discretion, explicitly state that.
2. CONVERSATION CONTINUITY: Maintain conversation history across multiple turns. Answer follow-up questions in context.
3. USER IDENTITY: ${userName ? `The current logged-in user's name is "${userName}"${userEmail ? ` (Email: ${userEmail})` : ''}. If they ask for their name, who they are, or their identity, answer them directly and warmly.` : 'If the user asks for their name and it is not specified, politely advise them they are logged in as a ' + role + ' user.'}
4. STRUCTURE & CLARITY: Format answers cleanly using bold headings and bullet points. Keep explanations thorough yet structured for easy reading.
5. ADVISORY DISCLAIMER: Frame your guidance as intelligent judicial copilot analysis (human-in-the-loop). Always remind users that advice is advisory and procedural.`;

  const roleDirectives = {
    citizen: `The user is an Indian CITIZEN (Litigant).
Provide clear, compassionate, layman-friendly guidance on filing civil/criminal petitions, understanding court procedures, obtaining certified copies, 7/12 land extract mutation, finding verified advocates, and tracking cases using CNR numbers. Avoid unclarified legalese.`,
    advocate: `The user is an ADVOCATE (Counsel / Legal Practitioner).
Provide rigorous statutory analysis, petition drafting guidelines, Vakalatnama filing prerequisites, cross-references between old IPC/CrPC sections and new BNS/BNSS provisions, CPC Order 39 interim injunction grounds (prima facie case, balance of convenience, irreparable injury), and procedural scrutiny checklists.`,
    police: `The user is a POLICE OFFICER / INVESTIGATING OFFICER.
Assist with mapping incident narratives to appropriate Bharatiya Nyaya Sanhita (BNS) sections, maintaining digital evidence chain of custody (SHA-256 cryptographic hashes under Section 63 BSA), witness examination under Section 180 BNSS, and checklist for filing chargesheets/final reports before the Magistrate.`,
    registrar: `The user is a COURT REGISTRAR / REGISTRY SCRUTINY CLERK.
Assist with document scrutiny standards, OCR compliance threshold checks (85% baseline), duplicate petition detection rules (>85% semantic text/boundary overlap), physical dossier tracking, and 16-character alphanumeric CNR number allocation protocol.`,
    judge: `The user is a PRESIDING JUDICIAL OFFICER (Judge).
Assist with synthesizing cause list petitions into concise brief digests, analyzing precedent decree relevance scores, structuring judicial interim orders under CPC Order XXXIX or criminal bail conditions under BNSS Section 480, and drafting balanced operative orders.`,
    admin: `The user is a SYSTEM ADMINISTRATOR.
Assist with e-Courts platform infrastructure, PostgreSQL/MongoDB database health, audit trail logging (SHA-256 state hashes), role-based access control (RLS), and system security telemetry.`,
  };

  const specific = roleDirectives[role] || roleDirectives.citizen;
  return `${basePrompt}\n\n[Active Workspace Role: ${role.toUpperCase()}]\n${specific}`;
}

const fallbackKnowledgeBase = {
  citizen: {
    "property boundary": "To resolve a property boundary dispute in India:\n1. **Obtain Land Records**: Procure the updated 7/12 extract mutation register, survey partition map, and Record of Rights (RoR) from the Talathi / Tehsil office.\n2. **Demarcation Application**: File a demarcation application (Mojani) before the Taluka Inspector of Land Records (TILR) or Revenue Survey Officer.\n3. **Engage an Advocate**: Connect with a verified civil advocate in your district court jurisdiction to draft the petition.\n4. **Civil Suit**: If encroachment persists, file a suit for perpetual injunction under Section 38 of the Specific Relief Act, 1963 and Order VII of the CPC.\n5. **CNR Tracking**: Once registered, track your case hearing dates using your 16-character CNR number.",
    "cnr": "A **CNR (Case Number Record)** is a unique 16-character alphanumeric identifier assigned to every case filed in Indian District and Subordinate Courts.\n- **Structure**: 2-digit State code + 2-digit District code + 4-digit Court Establishment code + 6-digit Case Number + 2-digit Filing Year (e.g., `MHPU02-004912-2026`).\n- **Function**: Enables seamless tracking of case status, cause lists, daily orders, and certified copies across the e-Courts National Judicial Data Grid (NJDG).",
    "documents": "Mandatory documents for filing a civil petition include:\n- **Identity Proof**: Aadhaar Card, Voter ID, or Passport of petitioner.\n- **Property / Title Proof**: Certified 7/12 extract, Index II, Sale Deed, or Gift Deed.\n- **Site Plan**: Cadastral survey map or approved municipal building layout.\n- **Vakalatnama**: Duly signed and stamped advocate authorization.\n- **Court Fee & Verification Affidavit**: Notarized affidavit affirming petition contents under CPC Order VI Rule 15.",
  },
  advocate: {
    "partition": "For Partition Suits under Indian Law:\n- **Governing Law**: Hindu Succession Act, 1956 (as amended 2005) read with Partition Act, 1893 and CPC Order XX Rule 18.\n- **Mandatory Schedules**: Schedule 'A' specifying agricultural properties with survey numbers, and Schedule 'B' listing movable properties.\n- **Preliminary vs Final Decree**: The court first passes a Preliminary Decree declaring respective shares of coparceners, followed by appointment of a Court Commissioner (TILR / Revenue Officer) for physical metes and bounds division before the Final Decree.",
    "overlap": "Under NyayaFlow Scrutiny Protocol, semantic vector overlap exceeding **85%** between newly lodged petitions and pending court registries flags a potential duplicate filing or vexatious litigation under Section 10 of the CPC (Res Sub-Judice) or Section 11 (Res Judicata).",
    "injunction": "To secure an Interim Injunction under **Order XXXIX, Rules 1 & 2 of the Code of Civil Procedure, 1908**, the applicant must satisfy the established Triple Test:\n1. **Prima Facie Case**: Credible legal right and probability of success at trial.\n2. **Balance of Convenience**: Demonstrating that greater hardship will befall the applicant if injunction is denied than to the respondent if granted.\n3. **Irreparable Injury**: Showing that the threatened injury cannot be adequately compensated by monetary damages.",
  },
  police: {
    "theft": "Applicable provisions under the **Bharatiya Nyaya Sanhita (BNS, 2023)**:\n- **Section 303 BNS**: Theft and general punishment (replacing IPC Section 379).\n- **Section 305 BNS**: Theft in a dwelling house or building (replacing IPC Section 380).\n- **Section 318 BNS**: Cheating and dishonestly inducing delivery of property (replacing IPC Section 415/420).\n- **Section 66D IT Act, 2000**: Cheating by personation using a computer resource.",
    "hash": "Digital Evidence Custody under **Section 63 of Bharatiya Sakshya Adhiniyam (BSA, 2023)**:\n- Binary uploads must generate an immediate SHA-256 cryptographic checksum (64-character hexadecimal).\n- This fixed cryptographic hash proves the binary data has not been modified or tampered with since seizure, accompanied by the mandatory Section 63 BSA certificate.",
    "chargesheet": "Checklist for filing Police Report / Chargesheet under **Section 193 of BNSS, 2023**:\n1. Accused identity details and arrest memo.\n2. Certified Panchnama and seizure memos.\n3. SHA-256 digital evidence hash certificates.\n4. Witness statements recorded under Section 180 BNSS (formerly Section 161 CrPC).\n5. Forensic FSL reports and Investigating Officer's final charge summary.",
  },
  registrar: {
    "ocr": "Registry Scrutiny Standard: The minimum OCR confidence threshold is **85%**. Submissions scoring below 85% due to low scan resolution, skew, smudged notary seals, or illegible schedules must be returned for defect cure within 14 days under Court Scrutiny Rules.",
    "duplicate": "Duplicate detection compares petitioner/respondent names, survey numbers, and petition text against the e-Courts database. Filings with >85% similarity trigger a scrutiny hold to prevent conflicting concurrent orders across judicial benches.",
    "cnr": "CNR Assignment Protocol: A unique 16-character alphanumeric CNR is generated upon passing initial scrutiny (e.g. MHPU020001422026). Registrars assign physical dossier shelf barcodes matching this CNR.",
  },
  judge: {
    "precedent": "Judicial Precedent Matching: Analyzes the ratio decidendi of Supreme Court and High Court decrees against the cause list pleadings. Matches above 85% cite binding rulings under Article 141 of the Constitution.",
    "143": "Section 143 of Maharashtra Land Revenue Code, 1966 governs the Tahsildar's power to decide right of way over field boundaries. High Court precedents establish that revenue authorities cannot determine substantive title, which remains solely within the jurisdiction of Civil Courts.",
    "interim": "Structure for Judicial Interim Order under CPC Order XXXIX:\n1. Brief factual narrative and disputed property description.\n2. Evaluation of the Triple Test: Prima facie case, balance of convenience, and irreparable injury.\n3. Operative order: Maintaining status quo or ad-interim restraint against alienation/construction.\n4. Direction for expeditious filing of written statement and fixing next returnable hearing date.",
  },
  admin: {
    "database": "NyayaFlow Database Architecture: MongoDB and local resilient persistence layer with automatic failover, WAL logging, and encrypted backups.",
    "audit": "Immutable Audit Trail: Every state modification, document verification, and user access records an SHA-256 hashed ledger entry containing User UUID, Stakeholder Role, Action, Timestamp, and Client IP.",
    "rbac": "Role-Based Access Control (RBAC): Strict segregation of duties across all 6 stakeholder tiers (Citizen, Advocate, Police, Registrar, Judge, Admin) enforced via signed JWT authorization tokens.",
  },
};

function getLocalFallback(role, query) {
  const lower = (query || "").toLowerCase();
  const roleAnswers = fallbackKnowledgeBase[role] || fallbackKnowledgeBase.citizen;

  for (const [key, answer] of Object.entries(roleAnswers)) {
    if (lower.includes(key)) {
      return answer;
    }
  }

  return `### NyayaFlow Court Advisory (${role.toUpperCase()} Workspace)\n\nI have received your inquiry: **"${query}"**.\n\nAs your Indian legal assistant, I can assist you with:\n- **Statutory Provisions**: Bharatiya Nyaya Sanhita (BNS), BNSS, BSA, and Code of Civil Procedure (CPC).\n- **Court Procedures**: 16-character CNR case tracking, filing compliance, and Order 39 interim relief.\n- **Document Scrutiny**: 7/12 land records, mutation entries, digital hash verification (Section 63 BSA), and advocate Vakalatnama.\n\nPlease ask a specific legal or procedural question, or select one of the suggested inquiries below.`;
}

class ChatService {
  /**
   * Generates a context-aware AI response using Groq with full conversation history
   */
  static async generateChatResponse({ messages = [], role = "citizen", userName = "", userEmail = "" }) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array is required.");
    }

    const latestMessage = messages[messages.length - 1]?.content || "";
    const systemPrompt = getSystemPrompt(role, userName, userEmail);

    // Normalize messages to ensure standard OpenAI-compatible role names ("user" | "assistant")
    const formattedHistory = messages
      .slice(-12) // Keep last 12 turns for deep conversation continuity and follow-ups
      .map((m) => ({
        role: m.role === "ai" ? "assistant" : (m.role || "user"),
        content: String(m.content || "").trim(),
      }))
      .filter((m) => m.content.length > 0);

    const groqKey = process.env.GROQ_API_KEY;
    const grokKey = process.env.GROK_API_KEY || process.env.XAI_API_KEY;

    // 1. Groq Inference with active verified models
    if (groqKey && groqKey.startsWith("gsk_")) {
      for (const model of GROQ_MODELS) {
        try {
          const payload = {
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...formattedHistory,
            ],
            temperature: 0.5,
            max_tokens: 500,
          };

          const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
              "User-Agent": "NyayaFlow-Backend/1.0",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            const choice = data.choices?.[0];
            let reply = choice?.message?.content;
            if (reply && typeof reply === "string" && reply.trim().length > 0) {
              return {
                reply: reply.trim(),
                model: `Groq (${model})`,
                role,
              };
            }
          } else {
            const errBody = await response.text();
            console.warn(`[ChatService] Groq model ${model} HTTP ${response.status}:`, errBody.slice(0, 200));
          }
        } catch (err) {
          console.warn(`[ChatService] Groq model ${model} network error:`, err.message);
        }
      }
    }

    // 2. xAI Grok Fallback if configured
    if (grokKey) {
      try {
        const payload = {
          model: "grok-2-latest",
          messages: [
            { role: "system", content: systemPrompt },
            ...formattedHistory,
          ],
          temperature: 0.5,
        };

        const response = await fetch(XAI_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${grokKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply && typeof reply === "string" && reply.trim().length > 0) {
            return {
              reply: reply.trim(),
              model: "xAI Grok",
              role,
            };
          }
        }
      } catch (err) {
        console.warn("[ChatService] Grok xAI error:", err.message);
      }
    }

    // 3. Resilient Judicial Legal Knowledge Engine Fallback
    const fallbackReply = getLocalFallback(role, latestMessage);
    return {
      reply: fallbackReply,
      model: "NyayaFlow Court Legal Engine",
      role,
    };
  }
}

module.exports = ChatService;
