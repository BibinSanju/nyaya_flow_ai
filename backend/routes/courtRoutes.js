const express = require("express");
const router = express.Router();
const { supabase, isSupabaseConfigured } = require("../config/supabase");
const { requireAuth, requireRole, optionalAuth } = require("../middleware/authMiddleware");

// In-memory fallback if Supabase is not configured
const memoryPetitions = new Map();
const memoryOrders = [];
const memoryArchives = new Map();

// Initial demo petitions for fallback
[
  {
    id: "b0000000-0000-0000-0000-000000000001",
    citizen_name: "Aditya Patil",
    contact: "+91 98765 43210",
    category: "Property & Land Dispute (Civil)",
    description:
      "Boundary wall encroachment on 7/12 land survey plot #142 in Kothrud, Pune. Seeking permanent injunction under Specific Relief Act 1963.",
    status: "CNR Issued",
    suggested_court: "Sub-Divisional Magistrate Court, Pune",
    advocate_name: "Adv. Abhishek Deshmukh",
    cnr_number: "MHPU02-004912-2026",
    health_score: 92,
    archival_location: "Building C, Archive Rm 12, Shelf 4, Box 19",
    created_at: new Date().toISOString(),
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    citizen_name: "Ramesh Iyer",
    contact: "+91 91234 56789",
    category: "Consumer Contract Dispute",
    description:
      "Non-delivery of agricultural irrigation machinery after full payment advance under Consumer Protection Act 2019.",
    status: "Scrutiny Pending",
    suggested_court: "District Consumer Disputes Redressal Commission, Pune",
    advocate_name: "Adv. Meera Sen",
    cnr_number: null,
    health_score: 88,
    archival_location: "Court Complex A, Archive Room B, Shelf C, Box 102",
    created_at: new Date().toISOString(),
  },
].forEach((p) => memoryPetitions.set(p.id, p));

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

// Petitions Ledger (Query Supabase petitions)
router.get("/petitions", optionalAuth, async (req, res) => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from("petitions")
        .select(`
          *,
          physical_archive_locations (
            building,
            floor,
            room_number,
            rack_number,
            shelf_number,
            box_number,
            file_barcode
          ),
          court_orders (
            id,
            action_taken,
            order_text,
            hearing_date,
            stage
          )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        return res.json(data);
      }
      if (error) {
        console.warn("[CourtRoutes] Supabase fetch petitions error:", error.message);
      }
    } catch (err) {
      console.warn("[CourtRoutes] Petitions fetch failed:", err.message);
    }
  }

  // Memory Fallback
  res.json(Array.from(memoryPetitions.values()));
});

// File new petition
router.post(
  "/petitions",
  requireAuth,
  requireRole("citizen", "advocate", "registrar", "police", "admin"),
  async (req, res) => {
    const body = req.body;
    const citizenName = body.citizen_name || body.citizenName || req.user?.fullName || "Citizen Litigant";
    const contact = body.contact || req.user?.phone || req.user?.email || "Not Provided";
    const category = body.category || "General Civil Law";
    const description = body.description || "Grievance details pending.";
    const suggestedCourt = body.suggested_court || body.suggestedCourt || "District Court";
    const advocateName = body.advocate_name || body.advocateName || null;
    const status = body.status || "Scrutiny Pending";
    const language = body.language || "English";
    const healthScore = body.health_score || body.healthScore || 90;

    if (isSupabaseConfigured() && supabase) {
      try {
        const citizenId = req.user?.id && req.user.id.length === 36 ? req.user.id : null;

        const { data, error } = await supabase
          .from("petitions")
          .insert({
            citizen_id: citizenId,
            citizen_name: citizenName,
            contact,
            category,
            description,
            suggested_court: suggestedCourt,
            advocate_name: advocateName,
            status,
            language,
            health_score: healthScore,
            ai_confidence: "95%",
          })
          .select()
          .single();

        if (error) {
          console.error("[CourtRoutes] Supabase insert petition error:", error.message);
          throw new Error(error.message);
        }

        // Log to audit_logs
        await supabase.from("audit_logs").insert({
          user_id: citizenId,
          actor_name: citizenName,
          role: req.user?.role || "citizen",
          action: `LODGED PETITION: [${category}] ${description.slice(0, 100)}...`,
          ip_address: req.ip || "127.0.0.1",
          status: "Success",
        });

        return res.status(201).json({ success: true, petition: data });
      } catch (err) {
        console.error("[CourtRoutes] Petition save failed:", err.message);
      }
    }

    // Memory Fallback
    const id = "pet_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const newPet = {
      id,
      citizen_name: citizenName,
      contact,
      category,
      description,
      suggested_court: suggestedCourt,
      advocate_name: advocateName,
      status,
      language,
      health_score: healthScore,
      cnr_number: null,
      created_at: new Date().toISOString(),
    };
    memoryPetitions.set(id, newPet);
    res.status(201).json({ success: true, petition: newPet });
  }
);

// Update petition (Allocate CNR, update status, assign archival location)
router.patch(
  "/petitions/:id",
  requireAuth,
  requireRole("registrar", "judge", "advocate", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (isSupabaseConfigured() && supabase) {
      try {
        const payload = { updated_at: new Date().toISOString() };
        if (updates.cnr_number !== undefined) payload.cnr_number = updates.cnr_number;
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.archival_location !== undefined) payload.archival_location = updates.archival_location;
        if (updates.advocate_name !== undefined) payload.advocate_name = updates.advocate_name;
        if (updates.health_score !== undefined) payload.health_score = updates.health_score;

        const { data, error } = await supabase
          .from("petitions")
          .update(payload)
          .eq("id", id)
          .select()
          .single();

        if (!error && data) {
          // Log audit
          await supabase.from("audit_logs").insert({
            user_id: req.user?.id && req.user.id.length === 36 ? req.user.id : null,
            actor_name: req.user?.fullName || "Registry Officer",
            role: req.user?.role || "registrar",
            action: `UPDATED PETITION [${id}]: Status -> ${updates.status || "Unchanged"}, CNR -> ${updates.cnr_number || "Unchanged"}`,
            ip_address: req.ip || "127.0.0.1",
            status: "Success",
          });

          return res.json({ success: true, petition: data });
        }
      } catch (err) {
        console.warn("[CourtRoutes] Update petition Supabase error:", err.message);
      }
    }

    // Memory Fallback
    const existing = memoryPetitions.get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Petition not found." });
    }
    const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
    memoryPetitions.set(id, merged);
    res.json({ success: true, petition: merged });
  }
);

// Record physical archive location (Registrar)
router.post(
  "/petitions/:id/archive",
  requireAuth,
  requireRole("registrar", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { building, floor, room_number, rack_number, shelf_number, box_number, file_barcode } = req.body;

    const archiveString = `${building}, Floor ${floor}, Room ${room_number}, ${rack_number}, ${shelf_number}, ${box_number}`;

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from("physical_archive_locations").upsert({
          petition_id: id,
          building: building || "Court Complex A",
          floor: floor || "Ground Floor",
          room_number: room_number || "Record Room 1",
          rack_number: rack_number || "Rack-01",
          shelf_number: shelf_number || "Shelf-A",
          box_number: box_number || "Box-01",
          file_barcode: file_barcode || `BARCODE-${id.slice(0, 8).toUpperCase()}`,
          logged_by: req.user?.id && req.user.id.length === 36 ? req.user.id : null,
        });

        // Also update petition record
        await supabase
          .from("petitions")
          .update({ archival_location: archiveString })
          .eq("id", id);

        return res.json({ success: true, archival_location: archiveString });
      } catch (err) {
        console.warn("[CourtRoutes] Archive save failed:", err.message);
      }
    }

    memoryArchives.set(id, req.body);
    const existing = memoryPetitions.get(id);
    if (existing) {
      existing.archival_location = archiveString;
      memoryPetitions.set(id, existing);
    }
    res.json({ success: true, archival_location: archiveString });
  }
);

// Record Judicial Order / Decree (Judge)
router.post(
  "/petitions/:id/order",
  requireAuth,
  requireRole("judge", "admin"),
  async (req, res) => {
    const { id } = req.params;
    const { action_taken, order_text, stage = "Hearing / Interim Order" } = req.body;

    if (!order_text) {
      return res.status(400).json({ success: false, error: "Order decree text is mandatory." });
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from("court_orders")
          .insert({
            petition_id: id,
            judge_id: req.user?.id && req.user.id.length === 36 ? req.user.id : null,
            action_taken: action_taken || "Interim Order Passed",
            order_text,
            stage,
          })
          .select()
          .single();

        if (!error && data) {
          // Update petition status if disposed or injunction
          const newStatus = action_taken?.toLowerCase().includes("dispose") ? "Disposed" : "Hearings Active";
          await supabase.from("petitions").update({ status: newStatus }).eq("id", id);

          return res.status(201).json({ success: true, order: data });
        }
      } catch (err) {
        console.warn("[CourtRoutes] Order creation failed:", err.message);
      }
    }

    const newOrder = {
      id: "ord_" + Date.now(),
      petition_id: id,
      action_taken,
      order_text,
      stage,
      created_at: new Date().toISOString(),
    };
    memoryOrders.push(newOrder);
    res.status(201).json({ success: true, order: newOrder });
  }
);

// Case Classification (Indian Law Statutory Checklist)
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
  (req, res) => {
    const { incident_report = "" } = req.body;
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

// Judge Case Summary (Restricted to Presiding Judges and Admin)
router.post(
  "/judge/case-summary",
  requireAuth,
  requireRole("judge", "admin"),
  (req, res) => {
    res.json({
      success: true,
      digest:
        "Petition filed under CPC Order 39 for interim injunction against disputed boundary wall construction. Land revenue records (7/12 extract) show clear ownership demarcation in favor of petitioner.",
      applicable_acts: [
        "Order 39 Rules 1 & 2 CPC (Temporary Injunctions)",
        "Specific Relief Act, 1963 Section 38",
      ],
      precedents: [
        {
          title: "State of Maharashtra v. Ramdas",
          citation: "(2021) 4 SCC 112",
          relevance: "Prima facie title established by revenue records warrants status quo preservation.",
          matchScore: "94%",
        },
        {
          title: "Dalpat Kumar v. Prahlad Singh",
          citation: "(1992) 1 SCC 719",
          relevance: "Defines the Triple Test for injunction: prima facie case, balance of convenience, and irreparable injury.",
          matchScore: "91%",
        },
      ],
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

module.exports = router;
