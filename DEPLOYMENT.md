# Deploying NyayaFlow

Frontend on **Vercel**, backend on **Render**, database and file storage on **Supabase**.

Sign-in runs in **demo mode** by default: the one-time code is shown on the login page and no email is sent. To send real emails later, see "Switching to email codes" at the end.

Do the steps in this order. Each takes a few minutes.

---

## 1. Supabase

1. Open your project → **Project Settings → API**.
2. Copy the **Project URL** and the **`service_role` secret key**.
   - Not the `anon` / `public` key. The backend currently has the anon key in the
     `SUPABASE_SERVICE_ROLE_KEY` slot, which is why uploads can't be stored.
   - Never put the service role key in Vercel or any frontend code.
3. Open **SQL Editor**, paste the contents of [`backend/db/security.sql`](backend/db/security.sql) and run it.
   This blocks public access to your tables and creates the private `documents` storage bucket.
   **Run it only after step 2 is in place on Render** — with the anon key the backend loses access.
4. Create accounts for court staff (police, registry, judges) by adding rows to the `users` table
   (Table Editor → users → Insert row), with `role` set to `police`, `registrar` or `judge`.
   Citizens and advocates sign up on their own.

## 2. Render (backend)

Service → **Environment**. Set:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | a long random string (Render's "Generate" button works) |
| `SUPABASE_URL` | from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service_role** key from step 1 |
| `CORS_ORIGIN` | your exact Vercel URL, e.g. `https://nyayaflow.vercel.app` (no trailing slash; comma-separate several) |
| `GROQ_API_KEY` | your existing Groq key |
| `OTP_DELIVERY` | `screen` (demo mode: code shown on the login page) |
| `ADMIN_EMAILS` | your own email, to create your administrator account |

**Delete** these if present (unused in demo mode): `SUPABASE_ANON_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `RESEND_API_KEY`.

For a demo where anyone can try the police, registry and judge workspaces, also set `ALLOW_OFFICIAL_SIGNUP` = `true`. Leave it unset for real use.

Save — Render redeploys. Then open `https://<your-render-app>.onrender.com/health` and check:
- `database`: `Supabase connected`
- `emailService`: `Demo mode (codes shown on screen)`

The logs should **not** show `Could not verify bucket "documents"`.

## 3. Vercel (frontend)

Project → **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | your Render URL, e.g. `https://nyayaflow-backend.onrender.com` |

Delete `GROQ_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Vercel — the frontend doesn't use them.

Redeploy (Deployments → ⋯ → Redeploy) so the new value is built in.

## 4. Check it works

1. Open the site → **Log in** → Citizen → enter your email → **Send code**. The code appears on the page and is filled in; click **Log in**.
2. File a test petition and upload a PDF; open it from **Documents → View**.
3. Sign in with your `ADMIN_EMAILS` address as **Administrator** → the System overview should show all four services as OK.

## Notes

- Render's free tier sleeps after 15 minutes idle; the first request afterwards takes ~50 seconds.
- In demo mode anyone who knows an email address can sign in as that user. Switch to email codes before real use.

## Switching to email codes

Render's free tier blocks SMTP (Gmail/Nodemailer), so use Brevo, which sends over HTTPS and needs no domain:

1. Sign up at [brevo.com](https://www.brevo.com) (free: 300 emails/day).
2. **Settings → Senders → Add a sender**: add your email and click the confirmation link.
3. **SMTP & API → API keys → Generate** and copy the key.
4. On Render set `OTP_DELIVERY` = `email`, `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS` (the verified sender) and `EMAIL_FROM_NAME` = `NyayaFlow`.

`/health` should then show `emailService`: `Email via Brevo`.
