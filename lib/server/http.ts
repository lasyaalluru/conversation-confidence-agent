import "server-only";
import { NextResponse } from "next/server";
import type { ApiError, ApiErrorCode } from "@/lib/ai/contract";
import { rateLimit } from "./rate-limit";

const STATUS: Record<ApiErrorCode, number> = {
  invalid_request: 400,
  empty_audio: 400,
  too_large: 413,
  rate_limited: 429,
  ai_malformed: 502,
  ai_unavailable: 502,
  timeout: 504,
};

export function apiError(code: ApiErrorCode, message: string, headers?: HeadersInit) {
  return NextResponse.json<ApiError>({ error: { code, message } }, { status: STATUS[code], headers });
}

export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

/** Returns an error response if the caller is over the limit, otherwise null. */
export function checkRateLimit(request: Request, bucket: string, limit: number, windowMs = 60_000) {
  const result = rateLimit(`${bucket}:${clientKey(request)}`, limit, windowMs);
  if (result.ok) return null;
  return apiError("rate_limited", "You're going a little fast — please wait a moment and try again.", {
    "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
  });
}

/** Reject oversized JSON bodies before parsing. */
export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new TooLargeError();
  const text = await request.text();
  if (text.length > maxBytes) throw new TooLargeError();
  return JSON.parse(text);
}

export class TooLargeError extends Error {}

/** Map provider/SDK errors to a safe, user-friendly API error. Never leak provider details. */
export function aiFailure(err: unknown, context: string) {
  console.error(`[${context}]`, err);
  const name = (err as { name?: string })?.name ?? "";
  if (name.includes("Timeout") || name === "AbortError") {
    return apiError("timeout", "The AI partner took too long to respond. Please try again.");
  }
  if (err instanceof MalformedAiOutput) {
    return apiError("ai_malformed", "The AI partner gave an unexpected response. Please try again.");
  }
  return apiError("ai_unavailable", "The AI partner is unavailable right now. Please try again.");
}

export class MalformedAiOutput extends Error {}
