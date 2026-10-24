/**
 * Sovereign Indian Legal Knowledge & Statutory Retrieval Service
 * Indexes primary Indian statutes, procedural codes, and evidentiary standards
 * Grounded in official India Code (indiacode.nic.in) & e-Courts Architecture
 */

const STATUTORY_KNOWLEDGE_BASE = [
  {
    id: "bns-305",
    act: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
    section: "Section 305",
    title: "Theft in dwelling house, etc.",
    description: "Whoever commits theft in any building, tent or vessel used as human dwelling or for custody of property.",
    punishment: "Imprisonment up to 7 years and fine.",
    bailable: "Non-Bailable",
    triableBy: "Any Magistrate",
    keywords: ["theft", "stolen", "dwelling", "housebreak", "robbery", "stole"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/20062",
  },
  {
    id: "bns-318",
    act: "Bharatiya Nyaya Sanhita, 2023 (BNS)",
    section: "Section 318(4)",
    title: "Cheating and dishonestly inducing delivery of property",
    description: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property or make, alter or destroy valuable security.",
    punishment: "Imprisonment up to 7 years and fine.",
    bailable: "Non-Bailable",
    triableBy: "Magistrate of the First Class",
    keywords: ["cheating", "fraud", "scam", "deceive", "cyber", "financial"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/20062",
  },
  {
    id: "bnss-173",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
    section: "Section 173",
    title: "Information in cognizable cases (First Information Report - FIR)",
    description: "Every information relating to the commission of a cognizable offence shall be recorded in writing or electronically with digital signature.",
    keywords: ["fir", "police", "complaint", "cognizable", "incident", "investigation"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/20064",
  },
  {
    id: "bnss-415",
    act: "Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)",
    section: "Section 415 & 419",
    title: "Appeals against conviction and acquittal",
    description: "Procedures for filing criminal appeals from Magistrate Courts to the Court of Session, and from Court of Session to the High Court.",
    limitationPeriod: "30 Days (Court of Session) / 60-90 Days (High Court)",
    keywords: ["appeal", "criminal appeal", "conviction", "acquittal", "session court", "high court"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/20064",
  },
  {
    id: "bsa-63",
    act: "Bharatiya Sakshya Adhiniyam, 2023 (BSA)",
    section: "Section 63",
    title: "Admissibility of electronic records and cryptographic certificates",
    description: "Governs admissibility of electronic evidence, digital signatures, and hash value verification for files, CCTV, and digital messages.",
    keywords: ["electronic evidence", "digital certificate", "hash", "sha256", "whatsapp", "cctv", "sms", "email"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/20063",
  },
  {
    id: "cpc-order-39",
    act: "Code of Civil Procedure, 1908 (CPC)",
    section: "Order XXXIX Rules 1 & 2",
    title: "Temporary and Interim Injunctions",
    description: "Grounds for urgent interim relief: (1) Prima facie case, (2) Balance of convenience, and (3) Irreparable injury to property or legal rights.",
    keywords: ["injunction", "stay order", "interim relief", "encroachment", "status quo", "possession"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2191",
  },
  {
    id: "cpc-sec-96",
    act: "Code of Civil Procedure, 1908 (CPC)",
    section: "Section 96 & Order XLI",
    title: "First Appeal from Original Decrees",
    description: "An appeal shall lie from every original civil decree passed by any Court exercising original jurisdiction to the Court authorized to hear appeals.",
    forum: "Subordinate Court -> District Court / District Court -> High Court",
    limitationPeriod: "30 Days (to District Court) / 90 Days (to High Court)",
    keywords: ["appeal", "first appeal", "civil appeal", "decree", "order 41", "limitation"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2191",
  },
  {
    id: "cpc-sec-100",
    act: "Code of Civil Procedure, 1908 (CPC)",
    section: "Section 100 & Order XLII",
    title: "Second Appeal to High Court",
    description: "An appeal shall lie to the High Court from every appellate decree if the High Court is satisfied that the case involves a substantial question of law.",
    forum: "District Court -> High Court",
    limitationPeriod: "90 Days from date of appellate decree",
    keywords: ["second appeal", "substantial question of law", "high court", "appeal", "decree"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2191",
  },
  {
    id: "sra-38",
    act: "Specific Relief Act, 1963",
    section: "Section 38",
    title: "Perpetual Injunction to prevent breach of an obligation",
    description: "Granted to the plaintiff to prevent the breach of an obligation existing in his favour, or where defendant invades plaintiff's right to property.",
    keywords: ["perpetual injunction", "permanent injunction", "property", "encroachment", "land", "boundary"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/1583",
  },
  {
    id: "ni-138",
    act: "Negotiable Instruments Act, 1881",
    section: "Section 138",
    title: "Dishonour of cheque for insufficiency of funds",
    description: "Statutory offence where a cheque is returned unpaid by the bank due to insufficient funds or exceeding arranged amount.",
    prerequisites: "Statutory demand notice within 30 days of cheque return; payment window 15 days; complaint within 30 days thereafter.",
    punishment: "Imprisonment up to 2 years, or fine up to twice the cheque amount, or both.",
    keywords: ["cheque", "dishonour", "bounce", "bank", "insufficient funds", "138", "notice"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/2281",
  },
  {
    id: "cpa-35",
    act: "Consumer Protection Act, 2019",
    section: "Section 35",
    title: "Manner in which complaint shall be made",
    description: "A complaint, in relation to any goods sold or delivered or agreed to be sold, or any service provided, may be filed with the District Commission.",
    pecuniaryJurisdiction: "District Commission: up to ₹50 Lakhs; State Commission: ₹50 Lakhs to ₹2 Crores; National Commission: above ₹2 Crores.",
    keywords: ["consumer", "defective", "refund", "warranty", "dealer", "service deficiency"],
    sourceUrl: "https://www.indiacode.nic.in/handle/123456789/15256",
  },
  {
    id: "mlrc-143",
    act: "State Land Revenue Code & 7/12 Extract Records",
    section: "Section 143 (MLRC / Equivalent)",
    title: "Right of way over boundaries and agricultural land mutation",
    description: "Tahsildar jurisdiction to inquire into and decide claims for right of way over boundaries of agricultural survey plots, Record of Rights (RoR).",
    keywords: ["7/12", "land", "mutation", "survey", "boundary", "tahsildar", "talathi", "mojani", "encroach"],
    sourceUrl: "https://www.indiacode.nic.in",
  },
];

class LegalKnowledgeService {
  /**
   * Search statutory knowledge base by keyword or semantic query
   */
  static searchStatutes(query = "") {
    if (!query || typeof query !== "string") return STATUTORY_KNOWLEDGE_BASE.slice(0, 5);

    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);

    const scored = STATUTORY_KNOWLEDGE_BASE.map((item) => {
      let score = 0;
      if (item.act.toLowerCase().includes(q)) score += 10;
      if (item.section.toLowerCase().includes(q)) score += 15;
      if (item.title.toLowerCase().includes(q)) score += 8;

      for (const w of words) {
        if (item.keywords.some((k) => k.includes(w) || w.includes(k))) score += 4;
        if (item.description.toLowerCase().includes(w)) score += 2;
      }

      return { ...item, matchScore: score };
    });

    return scored
      .filter((s) => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 6);
  }

  /**
   * Returns statutory checklist and appeal forum recommendation for an adverse order
   */
  static analyzeAppellateGrounds({ court = "Civil Court", category = "Civil", decreeType = "Dismissal / Injunction Refusal", summary = "" }) {
    const isCriminal = category.toLowerCase().includes("criminal") || summary.toLowerCase().includes("fir");

    if (isCriminal) {
      return {
        appellateForum: "Court of Session / High Court",
        statutoryProvision: "Bharatiya Nagarik Suraksha Sanhita, 2023 Section 415 & 419",
        limitationDays: 30,
        limitationActArticle: "Article 115(b) of Limitation Act, 1963",
        suggestedGrounds: [
          "Misinterpretation of witness deposition under Section 180 BNSS",
          "Non-consideration of digital evidence integrity certificate under Section 63 BSA",
          "Erroneous sentencing / disproportionate penalty against established precedent",
          "Violation of statutory bail parameters under Section 480 BNSS",
        ],
        requiredDocuments: [
          "Certified copy of Impugned Trial Court Judgment / Order",
          "Copy of Chargesheet / FIR Narrative",
          "Vakalatnama duly executed by Appellant",
          "Affidavit in support of Stay Application / Suspension of Sentence",
        ],
        eCourtsAppealType: "Criminal Appeal (CRA)",
      };
    }

    // Civil First Appeal (Section 96 CPC)
    return {
      appellateForum: court.includes("SDM") || court.includes("Subordinate") ? "District & Sessions Court" : "High Court of Judicature",
      statutoryProvision: "Code of Civil Procedure, 1908 Section 96 read with Order XLI",
      limitationDays: court.includes("SDM") || court.includes("Subordinate") ? 30 : 90,
      limitationActArticle: "Article 116 of Limitation Act, 1963",
      suggestedGrounds: [
        "Trial court failed to appreciate the prima facie possession established by registered 7/12 extract",
        "Erroneous rejection of interim injunction under Order 39 Rules 1 & 2 despite balance of convenience",
        "Disregard of surveyor boundary demarcation map (TILR Mojani sheet)",
        "Substantial question of law regarding statutory limitation and prescriptive easement rights",
      ],
      requiredDocuments: [
        "Certified copy of Impugned Civil Decree / Interim Order",
        "Memorandum of Appeal (Form No. 1, Appendix G, CPC)",
        "Certified copy of Trial Court Plaint and Written Statement",
        "Application for Stay of Execution under Order XLI Rule 5 CPC",
        "Court Fee computation receipt",
      ],
      eCourtsAppealType: "First Appeal from Order (FAO) / Regular Civil Appeal (RCA)",
    };
  }
}

module.exports = LegalKnowledgeService;
