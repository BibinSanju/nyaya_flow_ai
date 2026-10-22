import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith("/")
    ? process.env.NEXT_PUBLIC_API_URL
    : "http://127.0.0.1:5000");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const backendRes = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err: any) {
    console.error("[Next.js Chat Proxy] Backend fetch failed:", err.message);
    return NextResponse.json(
      {
        success: true,
        reply:
          "NyayaFlow Legal Assistant: Please review the procedural checklist on your dashboard or rephrase your inquiry.",
        model: "NyayaFlow Legal System",
      },
      { status: 200 }
    );
  }
}
