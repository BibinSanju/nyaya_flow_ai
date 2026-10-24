// Indian States, Union Territories, Districts, and Judicial Authority Directory
// NyayaFlow Sovereign Indian Judicial Platform

export interface StatutoryProvision {
  law_name: string;
  section_rule: string;
  plain_explanation: string;
  relevance: string;
  official_source_url: string;
  disclaimer: string;
}

export interface SuggestedCourt {
  name: string;
  distance: string;
  jurisdiction: string;
  forumType: string;
}

export const INDIAN_STATES_AND_DISTRICTS: Record<string, string[]> = {
  Maharashtra: [
    "Pune",
    "Mumbai City",
    "Mumbai Suburban",
    "Thane",
    "Nagpur",
    "Nashik",
    "Chhatrapati Sambhaji Nagar (Aurangabad)",
    "Solapur",
    "Kolhapur",
    "Satara",
    "Ahmednagar",
    "Amravati",
    "Nanded",
    "Jalgaon",
    "Raigad",
    "Ratnagiri",
    "Sindhudurg",
    "Sangli",
    "Latur",
    "Dhule",
    "Chandrapur",
    "Parbhani",
    "Jalna",
    "Buldhana",
    "Yavatmal",
    "Osmanabad (Dharashiv)",
    "Beed",
    "Bhandara",
    "Gondia",
    "Wardha",
    "Washim",
    "Hingoli",
    "Gadchiroli",
    "Palghar",
  ],
  "Tamil Nadu": [
    "Chennai",
    "Coimbatore",
    "Madurai",
    "Tiruchirappalli",
    "Salem",
    "Tirunelveli",
    "Chengalpattu",
    "Kanchipuram",
    "Vellore",
    "Erode",
    "Tiruppur",
    "Thanjavur",
    "Dindigul",
    "Cuddalore",
    "Ranipet",
    "Tirupathur",
    "Tiruvallur",
    "Tiruvannamalai",
    "Viluppuram",
    "Kallakurichi",
    "Dharmapuri",
    "Krishnagiri",
    "Namakkal",
    "Nilgiris",
    "Karur",
    "Perambalur",
    "Ariyalur",
    "Pudukkottai",
    "Sivaganga",
    "Ramanathapuram",
    "Virudhunagar",
    "Tenkasi",
    "Thoothukudi",
    "Kanniyakumari",
    "Nagapattinam",
    "Mayiladuthurai",
    "Tiruvarur",
  ],
  "Delhi (NCT)": [
    "Central Delhi",
    "New Delhi",
    "South Delhi",
    "South East Delhi",
    "South West Delhi",
    "North Delhi",
    "North West Delhi",
    "North East Delhi",
    "West Delhi",
    "East Delhi",
    "Shahdara",
  ],
  Karnataka: [
    "Bengaluru Urban",
    "Bengaluru Rural",
    "Mysuru",
    "Hubballi-Dharwad",
    "Dakshina Kannada (Mangaluru)",
    "Belagavi",
    "Kalaburagi",
    "Ballari",
    "Udupi",
    "Shivamogga",
    "Tumakuru",
    "Davanagere",
    "Bidar",
    "Vijayapura",
    "Raichur",
    "Bagalkote",
    "Hassan",
    "Mandya",
    "Chikkamagaluru",
    "Kolar",
    "Chikkaballapura",
    "Kodagu",
  ],
  "Uttar Pradesh": [
    "Lucknow",
    "Kanpur Nagar",
    "Varanasi",
    "Prayagraj (Allahabad)",
    "Gautam Buddha Nagar (Noida)",
    "Ghaziabad",
    "Agra",
    "Meerut",
    "Bareilly",
    "Aligarh",
    "Moradabad",
    "Gorakhpur",
    "Saharanpur",
    "Jhansi",
    "Mathura",
    "Ayodhya (Faizabad)",
    "Muzaffarnagar",
    "Firozabad",
  ],
  Gujarat: [
    "Ahmedabad",
    "Surat",
    "Vadodara",
    "Rajkot",
    "Gandhinagar",
    "Bhavnagar",
    "Jamnagar",
    "Junagadh",
    "Kutch",
    "Anand",
    "Bharuch",
    "Mehsana",
    "Navsari",
    "Valsad",
    "Patan",
    "Morbi",
  ],
  Kerala: [
    "Thiruvananthapuram",
    "Ernakulam (Kochi)",
    "Kozhikode",
    "Thrissur",
    "Kollam",
    "Palakkad",
    "Malappuram",
    "Kannur",
    "Kottayam",
    "Alappuzha",
    "Idukki",
    "Pathanamthitta",
    "Kasaragod",
    "Wayanad",
  ],
  Telangana: [
    "Hyderabad",
    "Ranga Reddy",
    "Medchal-Malkajgiri",
    "Warangal",
    "Karimnagar",
    "Nizamabad",
    "Khammam",
    "Nalgonda",
    "Sangareddy",
    "Siddipet",
    "Mahabubnagar",
  ],
  "Andhra Pradesh": [
    "Visakhapatnam",
    "Vijayawada (NTR)",
    "Guntur",
    "Tirupati",
    "Kurnool",
    "Nellore (SPSR Nellore)",
    "Kakinada",
    "Anantapur",
    "YSR Kadapa",
    "Prakasam",
    "East Godavari (Rajahmundry)",
    "West Godavari (Eluru)",
    "Chittoor",
  ],
  "West Bengal": [
    "Kolkata",
    "North 24 Parganas",
    "South 24 Parganas",
    "Howrah",
    "Hooghly",
    "Darjeeling",
    "Paschim Bardhaman",
    "Purba Bardhaman",
    "Siliguri",
    "Nadia",
    "Murshidabad",
    "Malda",
  ],
  Rajasthan: [
    "Jaipur",
    "Jodhpur",
    "Udaipur",
    "Kota",
    "Bikaner",
    "Ajmer",
    "Alwar",
    "Bhilwara",
    "Sikar",
    "Sri Ganganagar",
    "Bharatpur",
    "Pali",
  ],
  Punjab: [
    "Ludhiana",
    "Amritsar",
    "Jalandhar",
    "Patiala",
    "SAS Nagar (Mohali)",
    "Bathinda",
    "Hoshiarpur",
    "Pathankot",
    "Moga",
    "Firozpur",
  ],
  Haryana: [
    "Gurugram",
    "Faridabad",
    "Panipat",
    "Ambala",
    "Karnal",
    "Hisar",
    "Rohtak",
    "Panchkula",
    "Sonipat",
    "Yamunanagar",
    "Sirsa",
  ],
  "Madhya Pradesh": [
    "Bhopal",
    "Indore",
    "Jabalpur",
    "Gwalior",
    "Ujjain",
    "Sagar",
    "Dewas",
    "Satna",
    "Ratlam",
    "Rewa",
    "Katni",
  ],
  Bihar: [
    "Patna",
    "Gaya",
    "Bhagalpur",
    "Muzaffarpur",
    "Purnia",
    "Darbhanga",
    "Bihar Sharif",
    "Arrah (Bhojpur)",
    "Begusarai",
    "Katihar",
  ],
  Odisha: [
    "Khordha (Bhubaneswar)",
    "Cuttack",
    "Ganjam",
    "Sundargarh (Rourkela)",
    "Sambalpur",
    "Puri",
    "Balasore",
    "Bhadrak",
  ],
  Assam: ["Kamrup Metropolitan (Guwahati)", "Dibrugarh", "Silchar (Cachar)", "Jorhat", "Nagaon", "Tezpur (Sonitpur)"],
  Goa: ["North Goa (Panaji)", "South Goa (Margao)"],
  "Himachal Pradesh": ["Shimla", "Kangra (Dharamshala)", "Mandi", "Solan", "Kullu"],
  "Jammu & Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Udhampur"],
  Jharkhand: ["Ranchi", "East Singhbhum (Jamshedpur)", "Dhanbad", "Bokaro", "Hazaribagh"],
  Uttarakhand: ["Dehradun", "Haridwar", "Nainital", "Udham Singh Nagar"],
  Chandigarh: ["Chandigarh"],
  Puducherry: ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

export const COURT_AUTHORITY_OPTIONS = [
  {
    id: "dont_know",
    name: "I don't know — Suggest a court related to the case nearby (Recommended)",
    desc: "AI identifies candidate court hierarchy & closest jurisdiction based on your case facts",
  },
  {
    id: "sub_civil",
    name: "Subordinate Civil Court / Civil Judge Senior Division",
    desc: "Civil rights, title declaration, boundary disputes, permanent & temporary injunctions",
  },
  {
    id: "sdm_revenue",
    name: "Sub-Divisional Magistrate (SDM) / Revenue Court",
    desc: "Agricultural land, 7/12 land records, boundary demarcation, Section 145 BNSS",
  },
  {
    id: "dist_sessions",
    name: "District & Sessions Court",
    desc: "Principal civil & criminal court of original and appellate jurisdiction",
  },
  {
    id: "cjm_magistrate",
    name: "Chief Judicial Magistrate (CJM) / Metropolitan Magistrate",
    desc: "Criminal complaints, police FIR cognizance, bailable/non-bailable warrants",
  },
  {
    id: "family_court",
    name: "Family Court",
    desc: "Matrimonial disputes, divorce, child custody, maintenance, domestic relations",
  },
  {
    id: "consumer_forum",
    name: "District Consumer Disputes Redressal Commission (DCDRC)",
    desc: "Consumer complaints, defective products, deficiency in banking/real-estate service",
  },
  {
    id: "labour_court",
    name: "Labour Court / Industrial Tribunal",
    desc: "Employment termination, wage disputes, gratuity, statutory industrial disputes",
  },
  {
    id: "tribunal_nclt",
    name: "Specialized Tribunal (NCLT / DRT / MACT)",
    desc: "Company insolvency, bank debt recovery, motor accident compensation claims",
  },
  {
    id: "high_court",
    name: "High Court",
    desc: "Writ petitions under Article 226, first appeals, revision petitions",
  },
  {
    id: "custom",
    name: "Other Specific Authority / Departmental Forum",
    desc: "Enter custom specialized authority or tribunal name",
  },
];

export function getSuggestedNearbyCourts(
  state: string,
  district: string,
  category?: string
): SuggestedCourt[] {
  const dist = district?.trim() || "District Headquarter";
  const cat = (category || "").toLowerCase();

  if (cat.includes("property") || cat.includes("civil") || cat.includes("land")) {
    return [
      {
        name: `Subordinate Civil Court (Civil Judge Senior Division), ${dist}`,
        distance: "~2.8 km",
        jurisdiction: "Civil suits for declaration of title, perpetual injunction & easement rights",
        forumType: "Civil Judiciary",
      },
      {
        name: `Sub-Divisional Magistrate (SDM) & Revenue Office, ${dist}`,
        distance: "~3.4 km",
        jurisdiction: "Revenue demarcation, Record of Rights (7/12 / Patta), encroachment scrutiny",
        forumType: "Revenue & Administrative Authority",
      },
      {
        name: `District & Sessions Court, ${dist}`,
        distance: "~3.8 km",
        jurisdiction: "Principal civil court having pecuniary jurisdiction exceeding lower court limits",
        forumType: "District Bench",
      },
    ];
  }

  if (cat.includes("criminal")) {
    return [
      {
        name: `Court of Chief Judicial Magistrate (CJM), ${dist}`,
        distance: "~2.6 km",
        jurisdiction: "Trial of criminal offences under BNS 2023, inquiry & cognizance of police chargesheets",
        forumType: "Magisterial Bench",
      },
      {
        name: `Sessions Court, ${dist}`,
        distance: "~3.8 km",
        jurisdiction: "Sessions trial for grave offences, bail applications, revision petitions",
        forumType: "District Bench",
      },
    ];
  }

  if (cat.includes("family") || cat.includes("matrimonial")) {
    return [
      {
        name: `Principal Family Court, ${dist}`,
        distance: "~3.1 km",
        jurisdiction: "Exclusive jurisdiction over matrimonial dissolution, custody, and Section 125 BNSS maintenance",
        forumType: "Specialized Family Bench",
      },
    ];
  }

  if (cat.includes("consumer")) {
    return [
      {
        name: `District Consumer Disputes Redressal Commission (DCDRC), ${dist}`,
        distance: "~4.2 km",
        jurisdiction: "Pecuniary claims up to ₹50 Lakhs for defective goods or deficient services",
        forumType: "Consumer Commission",
      },
    ];
  }

  // Generic District Forum Fallback
  return [
    {
      name: `Civil Court Senior Division, ${dist}`,
      distance: "~3.0 km",
      jurisdiction: "Original civil suits & urgent interlocutory injunction applications",
      forumType: "Civil Judiciary",
    },
    {
      name: `Sub-Divisional Magistrate / Sub-Collector Office, ${dist}`,
      distance: "~3.6 km",
      jurisdiction: "Administrative remedies, revenue inspections, peace/order maintenance",
      forumType: "Executive Authority",
    },
    {
      name: `District & Sessions Court, ${dist}`,
      distance: "~3.8 km",
      jurisdiction: "Principal court of district jurisdiction for civil & criminal matters",
      forumType: "District Bench",
    },
  ];
}

export function getStructuredStatutoryProvisions(
  category: string,
  problemText?: string
): StatutoryProvision[] {
  const lowerCat = (category || "").toLowerCase();
  const lowerText = (problemText || "").toLowerCase();

  if (
    lowerCat.includes("property") ||
    lowerCat.includes("civil") ||
    lowerText.includes("land") ||
    lowerText.includes("plot") ||
    lowerText.includes("wall") ||
    lowerText.includes("boundary") ||
    lowerText.includes("encroach")
  ) {
    return [
      {
        law_name: "Specific Relief Act, 1963",
        section_rule: "Section 38 (Perpetual / Permanent Injunction)",
        plain_explanation:
          "Authorizes the civil court to grant a permanent injunction to prevent the breach of an obligation existing in favor of the applicant, especially where the defendant invades or threatens to invade the plaintiff's peaceful right to or enjoyment of property.",
        relevance:
          "Directly applies when an adjoining landowner, neighbor, or third party threatens unauthorized construction, fence demolition, or encroachment across registered boundary lines.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/1583",
        disclaimer:
          "Applicability requires independent verification based on registered title deeds, lawful possession, and absence of alternative efficacious remedies under Section 41.",
      },
      {
        law_name: "Code of Civil Procedure, 1908",
        section_rule: "Order XXXIX Rules 1 & 2 (Temporary Injunction & Interlocutory Relief)",
        plain_explanation:
          "Enables the court to pass an urgent interim order of injunction or maintain status quo during the pendency of the litigation to restrain the opposite party from altering the nature of the property.",
        relevance:
          "Crucial for obtaining immediate interim protection while the trial proceeds, preventing any irreversible construction or demolition on the disputed land.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/2191",
        disclaimer:
          "Applicability requires establishing a prima facie case, balance of convenience, and demonstration of irreparable loss if interim relief is refused.",
      },
      {
        law_name: "Transfer of Property Act, 1882",
        section_rule: "Section 54 (Transfer of Ownership & Conveyance)",
        plain_explanation:
          "Governs the statutory requirements for valid transfer of immovable property by registered conveyance sale deed and delivery of actual or constructive possession.",
        relevance:
          "Establishes lawful title priority of the petitioner's registered deed against rival or unauthenticated claims over the subject property.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/2338",
        disclaimer:
          "Applicability requires verification of registered chain of title documents, stamp-duty compliance, and revenue mutation entries (7/12 / Patta).",
      },
      {
        law_name: "Limitation Act, 1963",
        section_rule: "Article 65, Schedule I (Suits for Possession Based on Title)",
        plain_explanation:
          "Prescribes a 12-year statutory limitation period for filing a suit for possession of immovable property based on title, running from when the defendant's possession becomes adverse to the plaintiff.",
        relevance:
          "Governs whether the grievance is instituted well within statutory limitation timeframes from the date the encroachment or adverse claim arose.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/1566",
        disclaimer:
          "Applicability requires independent verification of the exact timeline when adverse construction or hostile assertion of rights first commenced.",
      },
    ];
  }

  if (lowerCat.includes("criminal") || lowerText.includes("theft") || lowerText.includes("assault")) {
    return [
      {
        law_name: "Bharatiya Nyaya Sanhita (BNS), 2023",
        section_rule: "Section 329 / Section 305 (Criminal Trespass & Theft)",
        plain_explanation:
          "Defines and penalizes criminal trespass into property in possession of another with intent to commit an offence, cause damage, or intimidate the lawful occupant.",
        relevance:
          "Applies when entry onto land or premises is accompanied by criminal intimidation, forceful breaking of locks/fences, or unlawful seizure.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/21199",
        disclaimer:
          "Applicability requires establishing criminal mens rea (intent) as distinguished from a purely civil boundary dispute over survey numbers.",
      },
      {
        law_name: "Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023",
        section_rule: "Section 173 (Information in Cognizable Cases / FIR)",
        plain_explanation:
          "Provides the statutory mechanism for recording First Information Reports (FIRs) and launching formal investigation by the station house officer.",
        relevance:
          "Governs formal registration of complaint with the jurisdictional police station for cognizable offences.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/21200",
        disclaimer:
          "Applicability requires verification whether the facts disclose a cognizable offence under the First Schedule of BNSS.",
      },
      {
        law_name: "Bharatiya Sakshya Adhiniyam (BSA), 2023",
        section_rule: "Section 63 (Admissibility of Electronic Records)",
        plain_explanation:
          "Specifies statutory admissibility and evidentiary certificate requirements for electronic photos, CCTV video recordings, and GPS coordinates.",
        relevance:
          "Mandatory for producing digital photos or mobile video proof of encroachment or incident on court record.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/21201",
        disclaimer:
          "Applicability requires statutory certificate under Section 63 signed by the person having lawful control over the recording device.",
      },
    ];
  }

  if (lowerCat.includes("consumer") || lowerText.includes("consumer") || lowerText.includes("defective")) {
    return [
      {
        law_name: "Consumer Protection Act, 2019",
        section_rule: "Section 35 (Manner in which Complaint shall be Made)",
        plain_explanation:
          "Prescribes procedure for an aggrieved consumer to institute a statutory complaint seeking compensation, product replacement, or refund of consideration.",
        relevance:
          "Direct statutory vehicle to sue manufacturers, sellers, or service providers for defective goods or unfair trade practices.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/15256",
        disclaimer:
          "Applicability requires establishing consumer status (not purchased for commercial resale) and filing within the 2-year limitation period from cause of action.",
      },
    ];
  }

  if (lowerCat.includes("family") || lowerText.includes("divorce") || lowerText.includes("custody")) {
    return [
      {
        law_name: "Family Courts Act, 1984",
        section_rule: "Section 7 (Jurisdiction of Family Courts)",
        plain_explanation:
          "Confers exclusive statutory jurisdiction on designated Family Courts for matrimonial suits, guardianship, custody of children, and maintenance.",
        relevance:
          "Directs family grievances to specialized conciliation and judicial benches rather than standard civil subordinate courts.",
        official_source_url: "https://www.indiacode.nic.in/handle/123456789/1594",
        disclaimer:
          "Applicability requires verifying whether a designated Family Court is operational within the jurisdictional revenue district.",
      },
    ];
  }

  // Default General Provisions
  return [
    {
      law_name: "Specific Relief Act, 1963",
      section_rule: "Section 38 (Perpetual Injunction)",
      plain_explanation:
        "Authorizes courts to grant permanent prohibitory injunctions to prevent the breach of an obligation existing in favor of the applicant.",
      relevance:
        "Standard statutory remedy for preventing unlawful interference with lawful rights and peaceful possession.",
      official_source_url: "https://www.indiacode.nic.in/handle/123456789/1583",
      disclaimer: "Applicability requires independent verification based on documented rights and facts.",
    },
    {
      law_name: "Code of Civil Procedure, 1908",
      section_rule: "Order XXXIX Rules 1 & 2 (Interim Relief)",
      plain_explanation:
        "Enables judicial courts to grant interim stay orders during the pendency of litigation to preserve the subject matter.",
      relevance: "Essential for urgent interim preservation of rights before hearing concluding arguments.",
      official_source_url: "https://www.indiacode.nic.in/handle/123456789/2191",
      disclaimer: "Applicability requires demonstration of prima facie merits and irreparable injury.",
    },
    {
      law_name: "Limitation Act, 1963",
      section_rule: "Schedule I (Limitation Period for Civil Actions)",
      plain_explanation:
        "Establishes statutory deadlines for instituting legal proceedings from the date the cause of action accrued.",
      relevance: "Ensures the grievance is filed within legally enforceable statutory timelines.",
      official_source_url: "https://www.indiacode.nic.in/handle/123456789/1566",
      disclaimer: "Applicability requires calculating the exact date on which the right to sue accrued.",
    },
  ];
}
