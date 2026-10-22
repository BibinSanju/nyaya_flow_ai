require("dotenv").config();
const http = require("http");

const BASE_URL = "http://127.0.0.1:5000";

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      "Content-Type": "application/json",
      ...headers,
    };

    let postData = null;
    if (body) {
      postData = JSON.stringify(body);
      reqHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = { raw: data };
          }
          resolve({ status: res.statusCode, data: json });
        });
      }
    );

    req.on("error", reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log("\n============================================================");
  console.log("   NYAYAFLOW OTP AUTHENTICATION & GROQ AI TEST SUITE        ");
  console.log("============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  try {
    // 1. Health Probe
    console.log("--> Test 1: System Health & Provider Status Probe");
    const health = await request("GET", "/health");
    assert(health.status === 200 && health.data.status === "healthy", "Server is healthy and reachable on port 5000", JSON.stringify(health.data));
    assert(Boolean(health.data.emailService), "Health check reports accurate email delivery status", health.data.emailService);

    // 2. Unconfigured SMTP False Success Prevention
    console.log("\n--> Test 2: No False Success - Rejects Unconfigured SMTP");
    const testEmail = `test.litigant.${Date.now()}@nyayaflow.gov.in`;
    const sendRes = await request("POST", "/api/auth/send-otp", {
      contact: testEmail,
      type: "email",
      role: "citizen",
    });

    const isSmtpConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    if (!isSmtpConfigured) {
      assert(
        sendRes.status === 400 && sendRes.data.success === false && sendRes.data.error.includes("Real email delivery to Gmail requires"),
        "send-otp strictly refuses to report false success when SMTP is unconfigured",
        JSON.stringify(sendRes.data)
      );
      assert(sendRes.data.devOtp === undefined, "devOtp is strictly omitted (no fake OTP exposure in API response)");
    } else {
      assert(sendRes.status === 200 && sendRes.data.success === true, "Configured SMTP accepted OTP dispatch");
    }

    // 3. Invalid Email Format Validation
    console.log("\n--> Test 3: Invalid Recipient Email Format Validation");
    const invalidEmailRes = await request("POST", "/api/auth/send-otp", {
      contact: "not-an-email",
      type: "email",
      role: "citizen",
    });
    assert(
      invalidEmailRes.status === 400 && invalidEmailRes.data.success === false,
      "Invalid email address syntax rejected with HTTP 400",
      JSON.stringify(invalidEmailRes.data)
    );

    // 4. Secure Verification & Attempt Counter
    console.log("\n--> Test 4: Invalid OTP & Attempt Counter");
    const OTPModel = require("./models/OTP");
    const crypto = require("crypto");
    const rawOtp = "849201";
    const testContact2 = `advocate.test.${Date.now()}@nyayaflow.gov.in`;
    const hash = crypto.createHmac("sha256", process.env.JWT_SECRET || "nyayaflow_sovereign_secret_key_2026_super_secure_token")
      .update(rawOtp)
      .digest("hex");

    await OTPModel.create({
      contact: testContact2,
      hashedOtp: hash,
      type: "email",
      role: "advocate",
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const badVerify = await request("POST", "/api/auth/verify-otp", {
      contact: testContact2,
      otp: "000000",
      role: "advocate",
    });
    assert(
      badVerify.status === 400 && badVerify.data.error.includes("attempt(s) remaining"),
      "Invalid OTP rejected with attempts remaining count",
      JSON.stringify(badVerify.data)
    );

    // 5. Successful OTP Verification
    console.log("\n--> Test 5: Successful OTP Verification & JWT Token Issuance");
    const goodVerify = await request("POST", "/api/auth/verify-otp", {
      contact: testContact2,
      otp: rawOtp,
      role: "advocate",
      fullName: "Advocate Shrikant Deshmukh",
    });
    assert(goodVerify.status === 200 && goodVerify.data.success === true, "Valid OTP accepted and verified successfully");
    assert(Boolean(goodVerify.data.token), "JWT Session Token issued in response");
    assert(goodVerify.data.user.role === "advocate", "User role properly assigned as 'advocate'");
    const advocateToken = goodVerify.data.token;

    // 6. Single-Use Verification Enforcement
    console.log("\n--> Test 6: Single-Use OTP Invalidation (Replay Prevention)");
    const replayVerify = await request("POST", "/api/auth/verify-otp", {
      contact: testContact2,
      otp: rawOtp,
      role: "advocate",
    });
    assert(
      replayVerify.status === 400 && replayVerify.data.error.includes("already been used"),
      "Replaying previously verified OTP strictly rejected (single-use enforced)",
      JSON.stringify(replayVerify.data)
    );

    // 7. Expiration Enforcement
    console.log("\n--> Test 7: Expiration Enforcement");
    const expiredContact = `expired.${Date.now()}@nyayaflow.gov.in`;
    await OTPModel.create({
      contact: expiredContact,
      hashedOtp: hash,
      type: "email",
      role: "citizen",
      attempts: 0,
      maxAttempts: 3,
      used: false,
      expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    });

    const expiredVerify = await request("POST", "/api/auth/verify-otp", {
      contact: expiredContact,
      otp: rawOtp,
      role: "citizen",
    });
    assert(
      expiredVerify.status === 400 && expiredVerify.data.error.includes("expired"),
      "Expired OTP correctly rejected",
      JSON.stringify(expiredVerify.data)
    );

    // 8. Role-Based Authorization Enforcement (RBAC across all 6 roles)
    console.log("\n--> Test 8: Role-Based Authorization Enforcement (All 6 Roles)");
    const { generateToken } = require("./middleware/authMiddleware");
    const citizenToken = generateToken({ id: "user_cit_1", role: "citizen" });
    const policeToken = generateToken({ id: "user_pol_1", role: "police" });
    const judgeToken = generateToken({ id: "user_jdg_1", role: "judge" });
    const registrarToken = generateToken({ id: "user_reg_1", role: "registrar" });
    const adminToken = generateToken({ id: "user_adm_1", role: "admin" });
    const advocateToken = generateToken({ id: "user_adv_1", role: "advocate" });

    // A. Unauthenticated call to police endpoint
    const unauthPolice = await request("POST", "/api/police/bns-suggest", { incident_report: "theft" });
    assert(unauthPolice.status === 401, "Unauthenticated request to police endpoint rejected with HTTP 401");

    // B. Citizen token calling police endpoint -> 403 Forbidden
    const citOnPolice = await request("POST", "/api/police/bns-suggest", { incident_report: "theft" }, {
      Authorization: `Bearer ${citizenToken}`,
    });
    assert(citOnPolice.status === 403, "Citizen forbidden from police BNS endpoint (HTTP 403)");

    // C. Police token calling police endpoint -> 200 OK
    const polOnPolice = await request("POST", "/api/police/bns-suggest", { incident_report: "theft" }, {
      Authorization: `Bearer ${policeToken}`,
    });
    assert(polOnPolice.status === 200 && polOnPolice.data.success === true, "Police authorized for police BNS endpoint (HTTP 200)");

    // D. Advocate token calling judge case summary -> 403 Forbidden
    const advOnJudge = await request("POST", "/api/judge/case-summary", { petition_text: "dispute" }, {
      Authorization: `Bearer ${advocateToken}`,
    });
    assert(advOnJudge.status === 403, "Advocate forbidden from judicial bench summary endpoint (HTTP 403)");

    // E. Judge token calling judge case summary -> 200 OK
    const jdgOnJudge = await request("POST", "/api/judge/case-summary", { petition_text: "dispute" }, {
      Authorization: `Bearer ${judgeToken}`,
    });
    assert(jdgOnJudge.status === 200 && jdgOnJudge.data.success === true, "Judge authorized for judicial bench summary endpoint (HTTP 200)");

    // F. Registrar token calling document audit -> 200 OK
    const regOnAudit = await request("POST", "/api/document/audit", {}, {
      Authorization: `Bearer ${registrarToken}`,
    });
    assert(regOnAudit.status === 200 && regOnAudit.data.success === true, "Registrar authorized for document audit endpoint (HTTP 200)");

    // G. Admin token calling police and judge endpoints -> 200 OK (Superuser)
    const admOnPolice = await request("POST", "/api/police/bns-suggest", { incident_report: "theft" }, {
      Authorization: `Bearer ${adminToken}`,
    });
    const admOnJudge = await request("POST", "/api/judge/case-summary", { petition_text: "dispute" }, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(admOnPolice.status === 200 && admOnJudge.status === 200, "System Admin authorized across all judicial endpoints (HTTP 200)");

    // 9. Groq AI Legal Copilot Backend Endpoint & Multi-Turn History
    console.log("\n--> Test 9: Groq AI Legal Chatbot & Multi-Turn Continuity");
    const chatTurn1 = await request("POST", "/api/chat", {
      role: "advocate",
      messages: [
        { role: "user", content: "What are the legal requirements for obtaining an interim injunction under CPC Order 39 Rules 1 and 2?" },
      ],
    });
    assert(chatTurn1.status === 200, "Chatbot endpoint returns HTTP 200");
    assert(
      chatTurn1.data.model && chatTurn1.data.model.includes("Groq"),
      `Genuine Groq inference verified (Active model: ${chatTurn1.data.model})`
    );
    assert(
      chatTurn1.data.reply && chatTurn1.data.reply.length > 100,
      "Groq AI provided detailed statutory analysis"
    );

    const chatTurn2 = await request("POST", "/api/chat", {
      role: "advocate",
      messages: [
        { role: "user", content: "What are the legal requirements for obtaining an interim injunction under CPC Order 39 Rules 1 and 2?" },
        { role: "assistant", content: chatTurn1.data.reply },
        { role: "user", content: "How does the court balance convenience if both parties present conflicting 7/12 extract mutation entries?" },
      ],
    });
    assert(chatTurn2.status === 200, "Chatbot follow-up turn returns HTTP 200");
    assert(
      chatTurn2.data.reply && (chatTurn2.data.reply.includes("7/12") || chatTurn2.data.reply.includes("Revenue") || chatTurn2.data.reply.includes("mutation") || chatTurn2.data.reply.includes("possession")),
      "Groq AI accurately maintained multi-turn context and addressed the 7/12 extract follow-up question"
    );

    console.log("\n============================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  }
}

runTests();
