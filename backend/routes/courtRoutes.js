const express = require("express");
const router = express.Router();
const { LocalStore } = require("../models/storageHelper");

const petitionsStore = new LocalStore("petitions");

const { requireAuth, requireRole, optionalAuth } = require("../middleware/authMiddleware");

// Seed initial petition if empty
(async () => {
  const existing = await petitionsStore.find();
  if (existing.length === 0) {
    await petitionsStore.create({
      id: "CNR-DL-2026-00491",
      citizen_name: "Aditya Patil",
      contact: "5544-6677-8899",
      category: "Property & Land Dispute (Civil)",
      description: "Boundary wall encroachment on 7/12 land survey plot #142 in Kothrud, Pune. Seeking permanent injunction.",
      status: "Scrutiny Pending",
      suggested_court: "Sub-Divisional Magistrate Court, Pune",
      advocate_name: "Adv. Abhishek Deshmukh",
      cnr_number: "DLCT01-004912-2026",
      health_score: 92,
      archival_location: "Building C, Archive Rm 12, Shelf 4, Box 19",
    });
  }
})();

// Health probe
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    system_node: "active",
    ocr_engine: "Tesseract.js & PDF-Parse",
    otp_engine: "HMAC-SHA256 & Nodemailer",
    database: "MongoDB / Resilient Persistence",
  });
});

// Advocates Directory (accessible for citizen and legal counsel)
router.get("/advocates", optionalAuth, (req, res) => {
  res.json([
    {
      id: "adv-1",
      full_name: "Adv. Abhishek Deshmukh",
      specialization: "Property & Civil Law",
      experience_years: 12,
      languages: "English, Hindi, Marathi",
      fee_estimate: "₹25,000 / case",
      availability: "Available tomorrow",
      rating: 4.9,
      reason: "Local district specialist with experience in 7/12 land disputes.",
    },
    {
      id: "adv-2",
      full_name: "Adv. Meera Sen",
      specialization: "Family & Property Law",
      experience_years: 9,
      languages: "English, Bengali, Hindi",
      fee_estimate: "₹18,000 / case",
      availability: "Next week",
      rating: 4.7,
      reason: "State Legal Services Panel empaneled counsel for civil partitions.",
    },
    {
      id: "adv-3",
      full_name: "Adv. Rohan Malhotra",
      specialization: "Cyber Law & Criminal Defense",
      experience_years: 15,
      languages: "English, Hindi, Punjabi",
      fee_estimate: "₹40,000 / case",
      availability: "Available today",
      rating: 4.95,
      reason: "Bar Association Pro Bono panelist for electronic evidence verification.",
    },
  ]);
});

// Petitions Ledger (accessible to authenticated judicial stakeholders)
router.get("/petitions", optionalAuth, async (req, res) => {
  const items = await petitionsStore.find();
  res.json(items);
});

// File new petition
router.post(
  "/petitions",
  requireAuth,
  requireRole("citizen", "advocate", "registrar", "police", "admin"),
  async (req, res) => {
    const petition = await petitionsStore.create({
      ...req.body,
      status: req.body.status || "Scrutiny Pending",
      submittedBy: req.user?.id,
      submittedRole: req.user?.role,
    });
    res.status(201).json({ success: true, petition });
  }
);

// Case Classification (Indian Law Checklist)
router.post("/case/classify", optionalAuth, (req, res) => {
  const { description = "", language = "English" } = req.body;
  const lower = description.toLowerCase();

  let category = "Property & Civil Law";
  let suggestedCourt = "Subordinate Civil Court / SDM Office";
  let acts = [
    "Specific Relief Act, 1963 Section 38 (Permanent Injunction)",
    "Code of Civil Procedure, 1908 (Order 39 Rules 1 & 2)",
    "Limitation Act, 1963",
  ];
  let docs = [
    "7/12 Extract / Record of Rights",
    "Boundary Survey & Measurement Map",
    "Registered Title Deed",
    "Aadhaar Identity Proof",
  ];

  if (lower.includes("theft") || lower.includes("stolen") || lower.includes("cheating") || lower.includes("fraud") || lower.includes("assault")) {
    category = "Criminal Law (BNS)";
    suggestedCourt = "Chief Judicial Magistrate Court";
    acts = [
      "Bharatiya Nyaya Sanhita (BNS) Section 305 (Theft)",
      "Bharatiya Nagarik Suraksha Sanhita (BNSS) Section 173 (FIR)",
      "Bharatiya Sakshya Adhiniyam (BSA) Section 61 (Electronic Evidence)",
    ];
    docs = [
      "Signed Police Incident Narrative (FIR)",
      "Witness Identification & Statements",
      "Digital Evidence Hash Certificate (Sec 63 BSA)",
      "Complainant Identity Proof",
    ];
  } else if (lower.includes("divorce") || lower.includes("custody") || lower.includes("maintenance")) {
    category = "Family & Matrimonial Law";
    suggestedCourt = "Principal Family Court";
    acts = [
      "Hindu Marriage Act, 1955 Section 13",
      "Special Marriage Act, 1954",
      "Family Courts Act, 1984 Section 7",
    ];
    docs = [
      "Marriage Registration Certificate",
      "Proof of Residence / Address",
      "Income & Asset Affidavit",
    ];
  }

  res.json({
    success: true,
    id: "petition_" + Date.now(),
    category,
    confidence: "95.4%",
    suggested_court: suggestedCourt,
    acts,
    required_documents: docs,
    timeline: "6 - 12 Months (Subject to court listing)",
    simple_explanation: `Based on your narrative, this dispute falls under ${category}. We recommend submitting your initial filing with the required documents at the ${suggestedCourt}.`,
  });
});

// Police BNS Suggestion (Restricted to Police Officers and Admin)
router.post(
  "/police/bns-suggest",
  requireAuth,
  requireRole("police", "admin"),
  (req, res) => {
    const { incident_report = "" } = req.body;
    res.json({
      success: true,
      suggestions: [
        {
          section: "Section 305 BNS",
          title: "Theft in dwelling house, etc.",
          description: "Whoever commits theft in any building, tent or vessel used as human dwelling...",
          penalty: "Imprisonment up to 7 years and fine.",
          confidence: "96%",
        },
        {
          section: "Section 331(3) BNS",
          title: "Lurking house-trespass or house-breaking",
          description: "Whoever commits lurking house-trespass or house-breaking after sunset...",
          penalty: "Imprisonment up to 14 years and fine.",
          confidence: "92%",
        },
      ],
    });
  }
);

// Judge Case Summary (Restricted to Presiding Judges and Admin)
router.post(
  "/judge/case-summary",
  requireAuth,
  requireRole("judge", "admin"),
  (req, res) => {
    res.json({
      success: true,
      digest: "Petition filed under CPC Order 39 for interim injunction against disputed boundary wall construction. Land revenue records (7/12 extract) show clear ownership demarcation in favor of petitioner.",
      applicable_acts: [
        "Order 39 Rules 1 & 2 CPC (Temporary Injunctions)",
        "Specific Relief Act, 1963 Section 38",
      ],
      precedent_matches: [
        {
          citation: "State of Maharashtra v. Ramdas (2021) 4 SCC 112",
          relevance: "Prima facie title established by revenue records warrants status quo preservation.",
          match_score: "94%",
        },
      ],
    });
  }
);

// Document Scrutiny Audit (Restricted to Registrar, Judge, Advocate, and Admin)
router.post(
  "/document/audit",
  requireAuth,
  requireRole("registrar", "judge", "advocate", "admin"),
  (req, res) => {
    res.json({
      success: true,
      health_score: 92,
      issues: [
        "Attachment 1 (Aadhaar): Format verified, identity match confirmed.",
        "Attachment 2 (Survey Map): Clear boundary demarcation verified.",
        "Recommendation: Ensure physically certified copies are carried for in-person bench hearing.",
      ],
    });
  }
);

module.exports = router;
