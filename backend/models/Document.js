const { supabase, isSupabaseConfigured } = require("../config/supabase");

// In-memory fallback if Supabase credentials are not set
const memoryDocs = new Map();

function mapFromSupabase(d) {
  if (!d) return null;
  return {
    id: d.id,
    _id: d.id,
    userId: d.user_id,
    petitionId: d.petition_id,
    filename: d.file_name,
    originalName: d.original_name,
    mimeType: d.mime_type,
    size: Number(d.file_size || 0),
    storagePath: d.storage_path,
    fileUrl: d.file_url,
    uploadStatus: d.upload_status || "completed",
    scanningStatus: d.scanning_status || "not_scanned",
    scanResult: {
      extractedText: d.ocr_text || "",
      textPreview: (d.ocr_text || "").slice(0, 300),
      detectedDocType: d.detected_doc_type || "General Legal Document",
      confidence: d.confidence || 0,
      wordCount: d.word_count || 0,
      pages: d.pages || 1,
      healthScore: d.health_score || 0,
    },
    createdAt: d.created_at,
  };
}

const DocumentModel = {
  async find(query = {}) {
    if (isSupabaseConfigured() && supabase) {
      let q = supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (query.petitionId) q = q.eq("petition_id", query.petitionId);
      if (query.userId) q = q.eq("user_id", query.userId);

      const { data, error } = await q;
      if (!error && data) {
        return data.map(mapFromSupabase);
      }
      if (error) {
        console.warn("[DocumentModel] Supabase find error:", error.message);
      }
    }

    // Memory Fallback
    const list = Array.from(memoryDocs.values());
    return list.filter((doc) => {
      if (query.petitionId && doc.petitionId !== query.petitionId) return false;
      if (query.userId && doc.userId !== query.userId) return false;
      return true;
    });
  },

  async findById(id) {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        return mapFromSupabase(data);
      }
    }
    return memoryDocs.get(id) || null;
  },

  async findOne(query = {}) {
    const list = await this.find(query);
    return list[0] || null;
  },

  async create(data) {
    if (isSupabaseConfigured() && supabase) {
      const insertPayload = {
        user_id: data.userId && data.userId.length === 36 ? data.userId : null,
        petition_id: data.petitionId && data.petitionId.length === 36 ? data.petitionId : null,
        file_name: data.filename,
        original_name: data.originalName,
        storage_path: data.storagePath,
        file_url: data.storagePath,
        mime_type: data.mimeType,
        file_size: data.size,
        upload_status: data.uploadStatus || "completed",
        scanning_status: data.scanningStatus || "not_scanned",
      };

      const { data: created, error } = await supabase
        .from("documents")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("[DocumentModel] Supabase create document error:", error.message);
        throw new Error(`Failed to store document in Supabase: ${error.message}`);
      }

      return mapFromSupabase(created);
    }

    // Memory Fallback
    const id = "doc_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6);
    const newDoc = {
      id,
      _id: id,
      ...data,
      uploadStatus: data.uploadStatus || "completed",
      scanningStatus: data.scanningStatus || "not_scanned",
      scanResult: data.scanResult || {},
      createdAt: new Date().toISOString(),
    };
    memoryDocs.set(id, newDoc);
    return newDoc;
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    if (isSupabaseConfigured() && supabase) {
      const updatePayload = {};

      if (updateData.scanningStatus) {
        updatePayload.scanning_status = updateData.scanningStatus;
      }
      if (updateData.uploadStatus) {
        updatePayload.upload_status = updateData.uploadStatus;
      }
      if (updateData.scanResult) {
        const sr = updateData.scanResult;
        if (sr.extractedText !== undefined) updatePayload.ocr_text = sr.extractedText;
        if (sr.detectedDocType) updatePayload.detected_doc_type = sr.detectedDocType;
        if (sr.confidence) updatePayload.confidence = sr.confidence;
        if (sr.wordCount) updatePayload.word_count = sr.wordCount;
        if (sr.pages) updatePayload.pages = sr.pages;
        if (sr.healthScore) updatePayload.health_score = sr.healthScore;
      }

      const { data: updated, error } = await supabase
        .from("documents")
        .update(updatePayload)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) {
        console.warn("[DocumentModel] Supabase update document error:", error.message);
      }
      if (updated) {
        return mapFromSupabase(updated);
      }
    }

    // Memory Fallback
    const existing = memoryDocs.get(id);
    if (!existing) return null;
    const merged = {
      ...existing,
      ...updateData,
      scanResult: { ...(existing.scanResult || {}), ...(updateData.scanResult || {}) },
      updatedAt: new Date().toISOString(),
    };
    memoryDocs.set(id, merged);
    return merged;
  },

  async findByIdAndDelete(id) {
    if (isSupabaseConfigured() && supabase) {
      await supabase.from("documents").delete().eq("id", id);
    }
    memoryDocs.delete(id);
    return true;
  },
};

module.exports = DocumentModel;
