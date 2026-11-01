const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// The backend must use the service role key: tables are protected by RLS and
// the anon key (which is public) has no access once db/security.sql is applied.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NODE_ENV === "production" ? "" : process.env.SUPABASE_ANON_KEY);

let supabase = null;
let isConfigured = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes("your-project-url")) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    isConfigured = true;
    console.log(`[Supabase] Successfully initialized client for: ${supabaseUrl}`);
  } catch (err) {
    console.error(`[Supabase] Initialization error:`, err.message);
  }
} else {
  console.warn(`[Supabase] Credentials not configured or placeholder detected.`);
  console.warn(`[Supabase] Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env`);
}

/**
 * Returns health status for the /health probe
 */
const getSupabaseStatus = () => {
  return {
    configured: isConfigured,
    url: supabaseUrl ? supabaseUrl.replace(/:\/\/.*@/, "://***@") : "Not Set",
    provider: "Supabase Cloud (PostgreSQL)",
  };
};

module.exports = {
  supabase,
  isSupabaseConfigured: () => isConfigured,
  getSupabaseStatus,
};
