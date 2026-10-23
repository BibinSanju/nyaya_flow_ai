const { supabase, isSupabaseConfigured } = require("../config/supabase");

// In-memory fallback if Supabase credentials are not yet entered in .env
const memoryUsers = new Map();

// Initial demo users for memory fallback
[
  {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "adv.abhishek@nyayaflow.in",
    full_name: "Adv. Abhishek Deshmukh",
    fullName: "Adv. Abhishek Deshmukh",
    role: "advocate",
    phone: "+91 98220 11223",
    identifier: "BCI/MAH/4921-2015",
    verified_contact: true,
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    email: "adv.meera@nyayaflow.in",
    full_name: "Adv. Meera Sen",
    fullName: "Adv. Meera Sen",
    role: "advocate",
    phone: "+91 98110 33445",
    identifier: "BCI/DEL/3109-2017",
    verified_contact: true,
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    email: "adv.rohan@nyayaflow.in",
    full_name: "Adv. Rohan Malhotra",
    fullName: "Adv. Rohan Malhotra",
    role: "advocate",
    phone: "+91 98770 55667",
    identifier: "BCI/PUN/2180-2012",
    verified_contact: true,
  },
].forEach((u) => memoryUsers.set(u.id, u));

const UserModel = {
  async findOne(query = {}) {
    if (isSupabaseConfigured() && supabase) {
      let q = supabase.from("users").select("*");

      if (query.$or && Array.isArray(query.$or)) {
        // e.g. [{ email: ... }, { phone: ... }, { identifier: ... }]
        const conditions = [];
        for (const sub of query.$or) {
          if (sub.email) conditions.push(`email.eq.${sub.email}`);
          if (sub.phone) conditions.push(`phone.eq.${sub.phone}`);
          if (sub.identifier) conditions.push(`identifier.eq.${sub.identifier}`);
        }
        if (conditions.length > 0) {
          q = q.or(conditions.join(","));
        }
      } else {
        if (query.email) q = q.eq("email", query.email.toLowerCase());
        if (query.phone) q = q.eq("phone", query.phone);
        if (query.role) q = q.eq("role", query.role);
        if (query.id) q = q.eq("id", query.id);
      }

      const { data, error } = await q.maybeSingle();
      if (error && error.code !== "PGRST116") {
        console.warn("[UserModel] Supabase findOne error:", error.message);
      }
      if (data) {
        return {
          ...data,
          fullName: data.full_name || data.fullName,
          verifiedContact: data.verified_contact,
        };
      }
    }

    // Memory Fallback
    for (const user of memoryUsers.values()) {
      if (query.$or) {
        const matches = query.$or.some(
          (sub) =>
            (sub.email && user.email === sub.email.toLowerCase()) ||
            (sub.phone && user.phone === sub.phone) ||
            (sub.identifier && user.identifier === sub.identifier)
        );
        if (matches) return user;
      } else {
        let match = true;
        if (query.email && user.email !== query.email.toLowerCase()) match = false;
        if (query.phone && user.phone !== query.phone) match = false;
        if (query.role && user.role !== query.role) match = false;
        if (match) return user;
      }
    }
    return null;
  },

  async findById(id) {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.warn("[UserModel] Supabase findById error:", error.message);
      }
      if (data) {
        return {
          ...data,
          fullName: data.full_name || data.fullName,
          verifiedContact: data.verified_contact,
        };
      }
    }

    return memoryUsers.get(id) || null;
  },

  async create(userData) {
    const fullName = userData.fullName || userData.full_name || "Verified Citizen";
    const role = userData.role || "citizen";

    if (isSupabaseConfigured() && supabase) {
      const insertData = {
        email: userData.email ? userData.email.toLowerCase() : null,
        phone: userData.phone || null,
        full_name: fullName,
        role: role,
        identifier: userData.identifier || null,
        verified_contact: userData.verifiedContact ?? true,
        last_login: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("users")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("[UserModel] Supabase create user error:", error.message);
        throw new Error(`Failed to create user in Supabase: ${error.message}`);
      }

      return {
        ...data,
        fullName: data.full_name,
        verifiedContact: data.verified_contact,
      };
    }

    // Memory Fallback
    const id = "u_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const newDoc = {
      id,
      _id: id,
      email: userData.email ? userData.email.toLowerCase() : null,
      phone: userData.phone || null,
      fullName: fullName,
      full_name: fullName,
      role: role,
      identifier: userData.identifier || null,
      verifiedContact: true,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    memoryUsers.set(id, newDoc);
    return newDoc;
  },

  async findByIdAndUpdate(id, updateData) {
    if (isSupabaseConfigured() && supabase) {
      const updatePayload = {
        updated_at: new Date().toISOString(),
      };
      if (updateData.fullName) updatePayload.full_name = updateData.fullName;
      if (updateData.full_name) updatePayload.full_name = updateData.full_name;
      if (updateData.role) updatePayload.role = updateData.role;
      if (updateData.verifiedContact !== undefined) updatePayload.verified_contact = updateData.verifiedContact;
      if (updateData.lastLogin) updatePayload.last_login = updateData.lastLogin;

      const { data, error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.warn("[UserModel] Supabase update user error:", error.message);
      }
      if (data) {
        return {
          ...data,
          fullName: data.full_name,
          verifiedContact: data.verified_contact,
        };
      }
    }

    const existing = memoryUsers.get(id);
    if (!existing) return null;
    const merged = { ...existing, ...updateData, updatedAt: new Date().toISOString() };
    memoryUsers.set(id, merged);
    return merged;
  },

  async find(query = {}) {
    if (isSupabaseConfigured() && supabase) {
      let q = supabase.from("users").select("*");
      if (query.role) q = q.eq("role", query.role);
      const { data, error } = await q;
      if (!error && data) {
        return data.map((d) => ({
          ...d,
          fullName: d.full_name,
          verifiedContact: d.verified_contact,
        }));
      }
    }
    return Array.from(memoryUsers.values());
  },
};

module.exports = UserModel;
