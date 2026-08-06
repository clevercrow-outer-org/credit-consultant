import { NextResponse } from "next/server";

const API_KEY = process.env.CIBIL_PREFILL_API_KEY || process.env.NEXT_PUBLIC_CIBIL_PREFILL_API_KEY || process.env.CREDIT_API_TOKEN || process.env.NEXT_PUBLIC_CREDIT_API_TOKEN || "apikey";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mobile = String(body?.mobile || "").replace(/\D/g, "").slice(-10);

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return NextResponse.json({ status: false, message: "Invalid mobile number" }, { status: 400 });
    }

    const res = await fetch("https://apibackend.avmanagement.in/api/cibil/prefill-mobile/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({ mobile }),
    });

    const response = await res.json().catch(() => null);
    if (!response || response?.status === false) {
      return NextResponse.json({ status: false, message: response?.message || "Prefill failed" }, { status: res.status || 400 });
    }

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ status: false, message: error?.message || "Prefill failed" }, { status: 500 });
  }
}
