const fs = require("fs");
const path = require("path");
const { supabase, isSupabaseConfigured } = require("../config/supabase");

/*
 * File storage for uploaded documents.
 * With Supabase configured, files go to a private Storage bucket so they survive
 * restarts (Render's free-tier disk is wiped on every deploy/sleep).
 * Without Supabase (local dev), files are kept in backend/uploads.
 */

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "documents";
const localDir = path.join(__dirname, "..", "uploads");

const useSupabase = () => isSupabaseConfigured() && supabase;

async function ensureStorageBucket() {
  if (!useSupabase()) {
    fs.mkdirSync(localDir, { recursive: true });
    return;
  }
  try {
    const { data, error } = await supabase.storage.getBucket(BUCKET);
    if (data && !error) return;
    const { error: createError } = await supabase.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 15 * 1024 * 1024,
    });
    if (createError && !/already exists/i.test(createError.message)) throw createError;
    console.log(`[Storage] Created private bucket "${BUCKET}"`);
  } catch (err) {
    console.error(`[Storage] Could not verify bucket "${BUCKET}": ${err.message}. Create it in Supabase → Storage.`);
  }
}

/** Saves a file and returns the key used to read it back. */
async function saveFile(key, buffer, contentType) {
  if (useSupabase()) {
    const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, { contentType, upsert: false });
    if (error) throw new Error(`Could not store the file: ${error.message}`);
    return key;
  }
  const target = path.join(localDir, key);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buffer);
  return key;
}

/** Reads a stored file into a Buffer. */
async function readFile(key) {
  if (useSupabase()) {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error) throw new Error(`Could not read the file: ${error.message}`);
    return Buffer.from(await data.arrayBuffer());
  }
  const target = path.join(localDir, key);
  if (!target.startsWith(localDir) || !fs.existsSync(target)) throw new Error("File not found.");
  return fs.readFileSync(target);
}

async function deleteFile(key) {
  if (useSupabase()) {
    await supabase.storage.from(BUCKET).remove([key]);
    return;
  }
  const target = path.join(localDir, key);
  if (target.startsWith(localDir) && fs.existsSync(target)) fs.unlinkSync(target);
}

module.exports = { ensureStorageBucket, saveFile, readFile, deleteFile, BUCKET };
