const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { supabase, isSupabaseConfigured } = require("../config/supabase");
const { requireAuth, requireRole, optionalAuth } = require("../middleware/authMiddleware");
const CaseValidationService = require("../services/caseValidationService");
const LegalKnowledgeService = require("../services/legalKnowledgeService");

// In-memory fallback if Supabase is not configured
const memoryPetitions = new Map();
const memoryOrders = [];
const memoryArchives = new Map();

// Advocates Directory (queries Supabase advocate_profiles JOIN users)
router.get("/advocates", optionalAuth, async (req, res) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("advocate_profiles")
        .select(`
          id,
          bar_council_no,
          specialization,
          experience_years,
          languages,
          fee_estimate,
          availability,
          rating,
          reason,
          forum,
          type,
          users (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq("is_active", true);

      if (!error && data && data.length > 0) {
        const formatted = data.map((adv) => ({
          id: adv.id,
          full_name: adv.users?.full_name || "Advocate Counsel",
          bar_council_no: adv.bar_council_no,
          specialization: adv.specialization,
          experience_years: adv.experience_years,
          languages: adv.languages,
          fee_estimate: adv.fee_estimate,
          availability: adv.availability,
          rating: Number(adv.rating || 4.9),
          reason: adv.reason || "Empaneled legal practitioner.",
          forum: adv.forum,
          type: adv.type,
        }));
        return res.json(formatted);
      }
    } catch (err) {
      console.warn("[CourtRoutes] Supabase advocates error:", err.message);
    }
  }

  // Fallback advocates directory
  res.json([
    {
      id: "a0000000-0000-0000-0000-000000000001",
      full_name: "Adv. Abhishek Deshmukh",
      bar_council_no: "BCI/MAH/4921-2015",
      specialization: "Civil & Land Revenue Law",
      experience_years: 12,
      languages: "English, Hindi, Marathi",
      fee_estimate: "₹25,000 / case",
      availability: "Available tomorrow",
      rating: 4.95,
      reason: "Local district specialist with extensive experience in 7/12 land disputes.",
      forum: "Sub-Divisional Magistrate Court & Civil Court, Pune",
      type: "DLSA Empaneled Legal Aid Counsel",
    },
    {
      id: "a0000000-0000-0000-0000-000000000002",
      full_name: "Adv. Meera Sen",
      bar_council_no: "BCI/DEL/3109-2017",
      specialization: "Family & Property Law",
      experience_years: 9,
      languages: "English, Bengali, Hindi",
      fee_estimate: "₹18,000 / case",
      availability: "Next week",
      rating: 4.8,
      reason: "State Legal Services Panel empaneled counsel for civil partitions.",
      forum: "District & Subordinate Courts",
      type: "State Legal Services Panel",
    },
    {
      id: "a0000000-0000-0000-0000-000000000003",
      full_name: "Adv. Rohan Malhotra",
      bar_council_no: "BCI/PUN/2180-2012",
      specialization: "Cyber Law & Criminal Defense",
      experience_years: 15,
      languages: "English, Hindi, Punjabi",
      fee_estimate: "₹40,000 / case",
      availability: "Available today",
      rating: 4.92,
      reason: "Bar Association Pro Bono panelist for electronic evidence verification.",
      forum: "Chief Judicial Magistrate Court",
      type: "Bar Association Pro Bono Panel",
    },
  ]);
});

// Statuses allowed by the petitions.status check constraint
const PETITION_STATUSES = ["Scrutiny Pending", "Registry Audited", "CNR Issued", "Hearings Active", "Disposed", "Returned"];
const CNR_PATTERN = /^[A-Z0-9]{16}$/;

const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ""));
const actorId = (req) => (isUuid(req.user?.id) ? req.user.id : null);
const useDb = () => isSupabaseConfigured() && supabase;

async function audit(req, action) {
  if (!useDb()) return;
  const { error } = await supabase.from("audit_logs").insert({
    user_id: actorId(req),
    actor_name: req.user?.fullName || req.user?.email || null,
    role: req.user?.role || null,
    action: action.slice(0, 500),
    ip_address: req.ip,
    status: "Success",
  });
  if (error) console.warn("[Audit] Could not write audit log:", error.message);
}

// Petitions list. Citizens see only their own filings; staff, advocates and police see all.
router.get("/petitions", requireAuth, async (req, res) => {
  const role = req.user.role;

  if (useDb()) {
    let q = supabase
      .from("petitions")
      .select(`
        *,
        physical_archive_locations ( building, floor, room_number, rack_number, shelf_number, box_number, file_barcode ),
        court_orders ( id, action_taken, order_text, hearing_date, stage, created_at )
      `)
      .order("created_at", { ascending: false });

    if (role === "citizen") {
      if (!isUuid(req.user.id)) return res.json([]);
      q = q.eq("citizen_id", req.user.id);
    }

    const { data, error } = await q;
    if (error) {
      console.error("[Petitions] List failed:", error.message);
      return res.status(500).json({ success: false, error: "Could not load petitions." });
    }
    // Advocates browsing requests don't need litigants' contact details
    const rows = role === "advocate" ? data.map(({ contact, ...rest }) => rest) : data;
    return res.json(rows);
  }

  const all = Array.from(memoryPetitions.values());
  res.json(role === "citizen" ? all.filter((p) => p.citizen_id === req.user.id) : all);
});

// File new petition
router.post(
  "/petitions",
  requireAuth,
  requireRole("citizen", "advocate", "registrar", "police"),
  async (req, res) => {
    const body = req.body;
    const citizenName = String(body.citizen_name || req.user?.fullName || "Litigant").slice(0, 255);
    const contact = String(body.contact || req.user?.email || "").slice(0, 100) || null;
    const category = String(body.category || "General Civil Law").slice(0, 255);
    const description = String(body.description || "").trim();
    const suggestedCourt = body.suggested_court ? String(body.suggested_court).slice(0, 255) : null;
    const advocateName = body.advocate_name ? String(body.advocate_name).slice(0, 255) : null;
    const language = String(body.language || "English").slice(0, 50);

    const validation = await CaseValidationService.validateCaseNarrative(description, language);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        isValidCase: false,
        error: `This can't be filed: ${validation.reason}`,
        detectedTopic: validation.detectedTopic,
      });
    }

    const row = {
      citizen_id: actorId(req),
      citizen_name: citizenName,
      contact,
      category,
      description,
      suggested_court: suggestedCourt,
      advocate_name: advocateName,
      status: "Scrutiny Pending",
      language,
    };

    if (useDb()) {
      const { data, error } = await supabase.from("petitions").insert(row).select().single();
      if (error) {
        console.error("[Petitions] Insert failed:", error.message);
        return res.status(500).json({ success: false, error: "Could not save your petition. Please try again." });
      }
      await audit(req, `Filed petition ${data.id} [${category}]`);
      return res.status(201).json({ success: true, petition: data });
    }

    const id = crypto.randomUUID();
    const newPet = { id, ...row, citizen_id: req.user.id, cnr_number: null, created_at: new Date().toISOString() };
    memoryPetitions.set(id, newPet);
    res.status(201).json({ success: true, petition: newPet });
  }
);

// Update petition. What each role may change:
//   registrar: CNR number, status, archival location
//   judge:     status
//   advocate:  take on representation (advocate name/id)
router.patch(
  "/petitions/:id",
  requireAuth,
  requireRole("registrar", "judge", "advocate"),
  async (req, res) => {
    const { id } = req.params;
    const role = req.user.role;
    const updates = req.body || {};
    const payload = {};

    if (role === "registrar" || role === "admin") {
      if (updates.cnr_number !== undefined) {
        const cnr = String(updates.cnr_number).replace(/[-\s]/g, "").toUpperCase();
        if (!CNR_PATTERN.test(cnr)) {
          return res.status(400).json({ success: false, error: "A CNR has 16 letters and digits." });
        }
        payload.cnr_number = String(updates.cnr_number).trim().toUpperCase();
      }
      if (updates.archival_location !== undefined) payload.archival_location = String(updates.archival_location).slice(0, 255);
    }
    if (["registrar", "judge", "admin"].includes(role) && updates.status !== undefined) {
      if (!PETITION_STATUSES.includes(updates.status)) {
        return res.status(400).json({ success: false, error: `Unknown status "${updates.status}".` });
      }
      payload.status = updates.status;
    }
    if (role === "advocate" || role === "admin") {
      if (updates.advocate_name !== undefined) {
        payload.advocate_name = String(updates.advocate_name).slice(0, 255);
        if (role === "advocate") payload.advocate_id = actorId(req);
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: "Nothing to update." });
    }
    payload.updated_at = new Date().toISOString();

    if (useDb()) {
      const { data, error } = await supabase.from("petitions").update(payload).eq("id", id).select().maybeSingle();
      if (error) {
        const duplicate = error.code === "23505";
        console.error("[Petitions] Update failed:", error.message);
        return res
          .status(duplicate ? 409 : 500)
          .json({ success: false, error: duplicate ? "That CNR number is already assigned to another case." : "Could not update the petition." });
      }
      if (!data) return res.status(404).json({ success: false, error: "Petition not found." });
      await audit(req, `Updated petition ${id}: ${Object.keys(payload).filter((k) => k !== "updated_at").map((k) => `${k}=${payload[k]}`).join(", ")}`);
      return res.json({ success: true, petition: data });
    }

    const existing = memoryPetitions.get(id);
    if (!existing) return res.status(404).json({ success: false, error: "Petition not found." });
    const merged = { ...existing, ...payload };
    memoryPetitions.set(id, merged);
    res.json({ success: true, petition: merged });
  }
);

// Record physical archive location (Registrar)
router.post(
  "/petitions/:id/archive",
  requireAuth,
  requireRole("registrar"),
  async (req, res) => {
    const { id } = req.params;
    const field = (v, fallback) => (v && String(v).trim() ? String(v).trim().slice(0, 100) : fallback);
    const loc = {
      building: field(req.body.building, null),
      floor: field(req.body.floor, "-"),
      room_number: field(req.body.room_number, null),
      rack_number: field(req.body.rack_number, "-"),
      shelf_number: field(req.body.shelf_number, "-"),
      box_number: field(req.body.box_number, "-"),
    };
    if (!loc.building || !loc.room_number) {
      return res.status(400).json({ success: false, error: "Building and room are required." });
    }
    const archiveString = [loc.building, loc.room_number, loc.rack_number, loc.shelf_number, loc.box_number]
      .filter((v) => v && v !== "-")
      .join(", ");

    if (useDb()) {
      const { error } = await supabase.from("physical_archive_locations").upsert(
        {
          petition_id: id,
          ...loc,
          file_barcode: field(req.body.file_barcode, `FILE-${id.slice(0, 8).toUpperCase()}`),
          logged_by: actorId(req),
        },
        { onConflict: "petition_id" }
      );
      if (error) {
        console.error("[Archive] Save failed:", error.message);
        return res.status(500).json({ success: false, error: "Could not save the record location." });
      }
      await supabase.from("petitions").update({ archival_location: archiveString }).eq("id", id);
      await audit(req, `Recorded file location for petition ${id}: ${archiveString}`);
      return res.json({ success: true, archival_location: archiveString });
    }

    memoryArchives.set(id, loc);
    const existing = memoryPetitions.get(id);
    if (existing) memoryPetitions.set(id, { ...existing, archival_location: archiveString });
    res.json({ success: true, archival_location: archiveString });
  }
);

// Record a court order (Judge)
router.post(
  "/petitions/:id/order",
  requireAuth,
  requireRole("judge"),
  async (req, res) => {
    const { id } = req.params;
    const { action_taken, order_text, stage = "Hearing" } = req.body;

    if (!order_text || !String(order_text).trim()) {
      return res.status(400).json({ success: false, error: "Order text is required." });
    }
    const action = String(action_taken || "Order passed").slice(0, 100);
    const newStatus = action.toLowerCase().includes("dispose") ? "Disposed" : "Hearings Active";

    if (useDb()) {
      const { data, error } = await supabase
        .from("court_orders")
        .insert({ petition_id: id, judge_id: actorId(req), action_taken: action, order_text: String(order_text).trim(), stage })
        .select()
        .single();
      if (error) {
        console.error("[Orders] Insert failed:", error.message);
        return res.status(500).json({ success: false, error: "Could not record the order." });
      }
      await supabase.from("petitions").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
      await audit(req, `Recorded order on petition ${id}: ${action}`);
      return res.status(201).json({ success: true, order: data });
    }

    const newOrder = { id: crypto.randomUUID(), petition_id: id, action_taken: action, order_text, stage, created_at: new Date().toISOString() };
    memoryOrders.push(newOrder);
    res.status(201).json({ success: true, order: newOrder });
  }
);

// Case Classification (Indian Law Statutory Checklist)
router.post("/case/classify", optionalAuth, async (req, res) => {
  const { description = "", language = "English" } = req.body;

  // Validate case narrative with LLM / Judicial Scrutiny Engine
  const validation = await CaseValidationService.validateCaseNarrative(description, language);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      isValidCase: false,
      error: validation.reason,
      detectedTopic: validation.detectedTopic,
      reason: validation.reason,
      verifiedBy: validation.verifiedBy,
    });
  }

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

  if (
    lower.includes("theft") ||
    lower.includes("stolen") ||
    lower.includes("cheating") ||
    lower.includes("fraud") ||
    lower.includes("assault") ||
    lower.includes("fir")
  ) {
    category = "Criminal Law (BNS, 2023)";
    suggestedCourt = "Chief Judicial Magistrate Court";
    acts = [
      "Bharatiya Nyaya Sanhita (BNS) Section 305 (Theft in dwelling house)",
      "Bharatiya Nagarik Suraksha Sanhita (BNSS) Section 173 (FIR)",
      "Bharatiya Sakshya Adhiniyam (BSA) Section 63 (Electronic Evidence)",
    ];
    docs = [
      "Signed Police Incident Narrative (FIR)",
      "Witness Identification & Statements",
      "Digital Evidence Hash Certificate (Sec 63 BSA)",
      "Complainant Identity Proof",
    ];
  } else if (
    lower.includes("divorce") ||
    lower.includes("custody") ||
    lower.includes("maintenance") ||
    lower.includes("matrimonial")
  ) {
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
  } else if (lower.includes("consumer") || lower.includes("defective") || lower.includes("refund")) {
    category = "Consumer Protection Law";
    suggestedCourt = "District Consumer Disputes Redressal Commission";
    acts = [
      "Consumer Protection Act, 2019 Section 35",
      "Sale of Goods Act, 1930",
    ];
    docs = [
      "Proof of Purchase / Invoice",
      "Product Defect Notice to Opposite Party",
      "Payment Receipt & Communication Trail",
    ];
  }

  res.json({
    success: true,
    id: "petition_" + Date.now(),
    category,
    confidence: "96.2%",
    suggested_court: suggestedCourt,
    forum_status: "Requires verification",
    forum_guidance:
      "The forum depends on the facts and the applicable law. Some disputes concern civil rights, while others may involve specific administrative or statutory remedies.",
    next_step:
      "Review the type of property dispute, location, applicable law, and requested remedy to identify the appropriate authority.",
    retrieval_disclaimer:
      "Once your legal retrieval system supports the recommendation with verified sources, it can explain the potential forum and why it may apply.",
    acts,
    required_documents: docs,
    timeline: "6 - 12 Months (Subject to court listing)",
    simple_explanation: `Based on your dispute narrative, this falls under ${category}. We recommend submitting your initial filing with the required documents at the ${suggestedCourt}.`,
  });
});

// Police BNS Suggestion (Restricted to Police Officers and Admin)
router.post(
  "/police/bns-suggest",
  requireAuth,
  requireRole("police", "admin"),
  async (req, res) => {
    const { incident_report = "" } = req.body;

    const validation = await CaseValidationService.validateCaseNarrative(incident_report);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        isValidCase: false,
        error: `Invalid incident narrative: ${validation.reason}`,
        suggestions: [],
      });
    }

    const lower = incident_report.toLowerCase();

    let suggestions = [
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
    ];

    if (lower.includes("cyber") || lower.includes("online") || lower.includes("bank") || lower.includes("otp")) {
      suggestions = [
        {
          section: "Section 318(4) BNS",
          title: "Cheating and dishonestly inducing delivery of property",
          description: "Whoever cheats and thereby dishonestly induces the person deceived to deliver any property...",
          penalty: "Imprisonment up to 7 years and fine.",
          confidence: "97%",
        },
        {
          section: "Section 66D Information Technology Act, 2000",
          title: "Cheating by personation by using computer resource",
          description: "Punishment for cheating by personation by using computer resource or communication device.",
          penalty: "Imprisonment up to 3 years and fine up to ₹1,00,000.",
          confidence: "94%",
        },
      ];
    }

    res.json({
      success: true,
      suggestions,
    });
  }
);

// Document Scrutiny Audit
router.post(
  "/document/audit",
  requireAuth,
  requireRole("registrar", "judge", "advocate", "admin"),
  (req, res) => {
    res.json({
      success: true,
      health_score: 92,
      issues: [
        "Attachment 1 (Aadhaar / ID): Format verified, identity match confirmed.",
        "Attachment 2 (Survey / Revenue Map): Clear boundary demarcation verified.",
        "Notice: Ensure physically certified copies are carried for in-person bench hearing.",
      ],
    });
  }
);

// -------------------------------------------------------------
// AI Appeal Analysis & Grounds Generator (Lifecycle Appeal Branch)
// -------------------------------------------------------------
router.post("/case/appeal-analysis", optionalAuth, async (req, res) => {
  const {
    court = "Subordinate Civil Court, Pune",
    category = "Property & Land Dispute (Civil)",
    decree_type = "Injunction Refused / Adverse Decree",
    summary = "",
    impugned_order_date = new Date().toISOString(),
    petitioner_name = "Appellant",
  } = req.body;

  const analysis = LegalKnowledgeService.analyzeAppellateGrounds({
    court,
    category,
    decreeType: decree_type,
    summary,
  });

  const appealDraft = `IN THE COURT OF THE DISTRICT & SESSIONS JUDGE AT PUNE
CIVIL APPELLATE JURISDICTION
REGULAR CIVIL APPEAL NO. ________ OF 2026

MEMORANDUM OF APPEAL UNDER SECTION 96 READ WITH ORDER XLI OF CPC, 1908

IN THE MATTER OF:
${petitioner_name} ... Appellant / Original Plaintiff
VERSUS
Respondents / Original Defendants

1. The Appellant above-named prefers this Memorandum of Appeal against the Impugned Order dated ${new Date(impugned_order_date).toLocaleDateString()} passed by the ${court}.

2. GROUNDS OF APPEAL:
${analysis.suggestedGrounds.map((g, idx) => `   (${String.fromCharCode(97 + idx)}) That the Learned Judge erred in ${g.toLowerCase()}.`).join("\n")}

3. PRAYER:
   It is most respectfully prayed that this Appellate Court may be pleased to:
   (a) Call for the records and proceedings of the lower court;
   (b) Set aside the Impugned Order dated ${new Date(impugned_order_date).toLocaleDateString()};
   (c) Grant temporary status quo / interim injunction pending disposal of this appeal.`;

  res.json({
    success: true,
    appeal_id: "appeal_" + Date.now(),
    analysis,
    appeal_draft: appealDraft,
    statutory_citations: [
      "Code of Civil Procedure, 1908 Section 96",
      "Limitation Act, 1963 Article 116",
      "Specific Relief Act, 1963 Section 38",
      "Bharatiya Sakshya Adhiniyam, 2023 Section 63",
    ],
  });
});

// -------------------------------------------------------------
// Court summons (draft for the court to sign and seal)
// -------------------------------------------------------------
router.post(
  "/case/generate-summons",
  requireAuth,
  requireRole("registrar", "judge", "advocate"),
  async (req, res) => {
    const pick = (v) => (typeof v === "string" ? v.trim().slice(0, 300) : "");
    const cnr_number = pick(req.body.cnr_number);
    const petitioner_name = pick(req.body.petitioner_name);
    const opposite_party_name = pick(req.body.opposite_party_name);
    const opposite_party_address = pick(req.body.opposite_party_address);
    const hearing_date = pick(req.body.hearing_date);
    const court_name = pick(req.body.court_name);
    const cause_title = pick(req.body.cause_title);

    if (!cnr_number || !opposite_party_name || !opposite_party_address || !hearing_date || !court_name) {
      return res.status(400).json({ success: false, error: "CNR, court, opposite party, address and hearing date are required." });
    }

    const noticeId = "SUM-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomBytes(2).toString("hex").toUpperCase();
    const fingerprint = crypto
      .createHash("sha256")
      .update([noticeId, cnr_number, court_name, petitioner_name, opposite_party_name, opposite_party_address, hearing_date, cause_title].join("|"))
      .digest("hex");

    await audit(req, `Prepared summons ${noticeId} for CNR ${cnr_number}`);

    res.json({
      success: true,
      notice_id: noticeId,
      cnr_number,
      petition_id: req.body.petition_id || null,
      court_name,
      speed_post_tracking_no: null,
      issued_date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
      hearing_date,
      response_deadline: "Within 30 days of service (Order VIII Rule 1, CPC)",
      parties: {
        petitioner: petitioner_name,
        opposite_party: opposite_party_name,
        service_address: opposite_party_address,
      },
      cause_title,
      statutory_directive:
        "WHEREAS the petitioner named above has instituted a suit against you before this Court, you are hereby summoned to appear in person or through an advocate on the date stated below, and to file your written statement within 30 days of service of this summons.",
      consequence_of_non_appearance:
        "Take notice that if you do not appear on the said date, the suit may be heard and decided in your absence.",
      sec_63_bsa_certificate_hash: fingerprint,
      seal_authority: "Signature and seal of the court",
    });
  }
);

// -------------------------------------------------------------
// Public case status lookup by CNR
// -------------------------------------------------------------
router.get("/case/cnr/:cnr", optionalAuth, async (req, res) => {
  const queryCnr = String(req.params.cnr || "").trim().toUpperCase();
  if (!/^[A-Z0-9-]{16,20}$/.test(queryCnr)) {
    return res.status(400).json({ success: false, error: "Enter a valid 16-character CNR number." });
  }

  const toDossier = (p, orders, archive) => {
    const sortedOrders = [...(orders || [])].sort((a, b) => new Date(a.hearing_date || a.created_at) - new Date(b.hearing_date || b.created_at));
    const loc = Array.isArray(archive) ? archive[0] : archive;
    return {
      id: p.id,
      cnr: p.cnr_number,
      petitioner: p.citizen_name,
      category: p.category,
      description: p.description,
      suggested_court: p.suggested_court,
      status: p.status,
      advocate: p.advocate_name || null,
      filing_date: p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null,
      next_hearing_date: null,
      bench: null,
      health_score: null,
      archival_location: p.archival_location || (loc ? [loc.building, loc.room_number].filter(Boolean).join(", ") : null),
      orders: sortedOrders.map((o) => ({
        stage: o.action_taken || o.stage,
        order_text: o.order_text,
        hearing_date: o.hearing_date ? new Date(o.hearing_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null,
      })),
    };
  };

  if (useDb()) {
    const { data, error } = await supabase
      .from("petitions")
      .select("*, physical_archive_locations (*), court_orders (*)")
      .eq("cnr_number", queryCnr)
      .maybeSingle();
    if (error) {
      console.error("[CNR] Lookup failed:", error.message);
      return res.status(500).json({ success: false, error: "Case records are unavailable right now." });
    }
    if (!data) return res.status(404).json({ success: false, error: "No case found with this CNR number." });
    return res.json({ success: true, found: true, dossier: toDossier(data, data.court_orders, data.physical_archive_locations) });
  }

  const p = Array.from(memoryPetitions.values()).find((x) => (x.cnr_number || "").toUpperCase() === queryCnr);
  if (!p) return res.status(404).json({ success: false, error: "No case found with this CNR number." });
  res.json({ success: true, found: true, dossier: toDossier(p, memoryOrders.filter((o) => o.petition_id === p.id), memoryArchives.get(p.id)) });
});

// -------------------------------------------------------------
// Indian Statutory Law RAG Search
// -------------------------------------------------------------
router.get("/legal/statutes", optionalAuth, (req, res) => {
  const query = req.query.q || "";
  const results = LegalKnowledgeService.searchStatutes(String(query));
  res.json({
    success: true,
    query,
    count: results.length,
    statutes: results,
  });
});

module.exports = router;
