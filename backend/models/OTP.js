const { supabase, isSupabaseConfigured } = require("../config/supabase");

// In-memory fallback if Supabase is not configured
const memoryOTPs = new Map();

function mapFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    contact: row.contact,
    otpHash: row.otp_hash,
    hashedOtp: row.otp_hash,
    role: row.role,
    expiresAt: row.expires_at,
    used: row.used,
    attempts: row.attempts || 0,
    maxAttempts: 3,
    createdAt: row.created_at,
  };
}

const OTPModel = {
  async updateMany(query = {}, update = {}) {
    if (isSupabaseConfigured() && supabase) {
      const updatePayload = {};
      if (update.used !== undefined) updatePayload.used = update.used;

      let q = supabase.from("otp_verifications").update(updatePayload);
      if (query.contact) q = q.eq("contact", query.contact.toLowerCase());
      if (query.used !== undefined) q = q.eq("used", query.used);

      await q;
    }

    // Memory Fallback
    for (const [id, record] of memoryOTPs.entries()) {
      let matches = true;
      if (query.contact && record.contact !== query.contact.toLowerCase()) matches = false;
      if (query.used !== undefined && record.used !== query.used) matches = false;

      if (matches) {
        memoryOTPs.set(id, { ...record, ...update });
      }
    }
  },

  async create(data) {
    const otpHash = data.otpHash || data.hashedOtp || "";

    if (isSupabaseConfigured() && supabase) {
      const insertPayload = {
        contact: data.contact.toLowerCase(),
        otp_hash: otpHash,
        role: data.role || "citizen",
        expires_at: data.expiresAt,
        used: data.used || false,
        attempts: data.attempts || 0,
      };

      const { data: created, error } = await supabase
        .from("otp_verifications")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.warn("[OTPModel] Supabase create OTP error:", error.message);
      } else if (created) {
        return mapFromSupabase(created);
      }
    }

    // Memory Fallback
    const id = "otp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const newDoc = {
      id,
      _id: id,
      contact: data.contact.toLowerCase(),
      otpHash,
      hashedOtp: otpHash,
      role: data.role || "citizen",
      expiresAt: data.expiresAt,
      used: data.used || false,
      attempts: data.attempts || 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    };
    memoryOTPs.set(id, newDoc);
    return newDoc;
  },

  async findOne(query = {}) {
    if (isSupabaseConfigured() && supabase) {
      let q = supabase
        .from("otp_verifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (query.contact) q = q.eq("contact", query.contact.toLowerCase());
      if (query.used !== undefined) q = q.eq("used", query.used);

      const { data, error } = await q.limit(1).maybeSingle();
      if (!error && data) {
        return mapFromSupabase(data);
      }
    }

    // Memory Fallback
    const records = Array.from(memoryOTPs.values())
      .filter((r) => {
        if (query.contact && r.contact !== query.contact.toLowerCase()) return false;
        if (query.used !== undefined && r.used !== query.used) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return records[0] || null;
  },

  async findLatest(contact) {
    if (!contact) return null;
    const cleanContact = contact.toLowerCase().trim();

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("otp_verifications")
        .select("*")
        .eq("contact", cleanContact)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return mapFromSupabase(data);
      }
    }

    // Memory Fallback
    const records = Array.from(memoryOTPs.values())
      .filter((r) => r.contact === cleanContact)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return records[0] || null;
  },

  async findByIdAndUpdate(id, update = {}) {
    if (isSupabaseConfigured() && supabase) {
      const updatePayload = {};
      if (update.used !== undefined) updatePayload.used = update.used;
      if (update.attempts !== undefined) updatePayload.attempts = update.attempts;
      if (update.$inc && update.$inc.attempts) {
        const current = await this.findOne({ id });
        updatePayload.attempts = (current?.attempts || 0) + update.$inc.attempts;
      }

      const { data, error } = await supabase
        .from("otp_verifications")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (!error && data) {
        return mapFromSupabase(data);
      }
    }

    // Memory Fallback
    const current = memoryOTPs.get(id);
    if (!current) return null;
    let newAttempts = current.attempts || 0;
    if (update.$inc && update.$inc.attempts) {
      newAttempts += update.$inc.attempts;
    } else if (update.attempts !== undefined) {
      newAttempts = update.attempts;
    }
    const merged = { ...current, ...update, attempts: newAttempts };
    memoryOTPs.set(id, merged);
    return merged;
  },
};

module.exports = OTPModel;
