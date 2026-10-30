import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { reportSchema } from "@/lib/validation";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function checkRateLimit(request: NextRequest): Promise<boolean> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!redisUrl || !redisToken || !process.env.RATE_LIMIT_SALT || process.env.RATE_LIMIT_SALT.length < 32) return false; // Fail closed: require Redis and a strong salt.

  // Vercel/known reverse proxies set this header. Do not use arbitrary client-supplied IP headers.
  const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const digest = createHash("sha256").update(`${process.env.RATE_LIMIT_SALT}:${ip}`).digest("hex");
  const key = `ha:report:${digest}`;
  const base = redisUrl.replace(/\/$/, "");
  const headers = { Authorization: `Bearer ${redisToken}` };
  const increment = await fetch(`${base}/incr/${key}`, { headers, cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!increment.ok) return false;
  const result = await increment.json() as { result?: number };
  if (result.result === 1) {
    const expiry = await fetch(`${base}/expire/${key}/3600`, { headers, cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!expiry.ok) return false;
  }
  return typeof result.result === "number" && result.result <= 5;
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.REPORT_INTAKE_ENABLED !== "true") {
      return jsonError("Report submissions are temporarily disabled while the platform completes its safety checks.", 503);
    }
    const origin = req.headers.get("origin");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!origin || !siteUrl || new URL(origin).origin !== new URL(siteUrl).origin) {
      return jsonError("Request origin could not be verified.", 403);
    }
    const lengthHeader = req.headers.get("content-length");
    const contentLength = Number(lengthHeader);
    if (!lengthHeader || !Number.isFinite(contentLength) || contentLength < 1 || contentLength > 12_000) return jsonError("Request size could not be verified or is too large.", 413);
    if (!(await checkRateLimit(req))) return jsonError("Report intake is unavailable or the hourly submission limit was reached. Please try again later.", 429);

    const raw = await req.json();
    if (typeof raw?.website === "string" && raw.website.trim()) return jsonError("Invalid submission.", 400);
    const parsed = reportSchema.safeParse(raw);
    if (!parsed.success) return jsonError("Please check the report fields.", 400);
    const x = parsed.data;

    const db = supabaseAdmin();
    const { data, error } = await db.from("reports").insert({
      title: x.title, country: x.country, region: x.region, category: x.category,
      original_language: x.language, original_text: x.details, anonymous: x.anonymous,
      status: "under_review", visibility: "private"
    }).select("id").single();
    if (error || !data) throw error || new Error("Report insert failed");

    // Translation is intentionally disabled by default. Do not send sensitive report text
    // to an external translation service until a reviewed data-processing agreement exists.
    return NextResponse.json({ id: data.id, translationStatus: "not_enabled" }, {
      status: 201, headers: { "Cache-Control": "no-store" }
    });
  } catch (e) {
    console.error("report submission error", e);
    return jsonError("Report could not be submitted. Please try again later.", 500);
  }
}
