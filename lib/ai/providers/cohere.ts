/**
 * Cohere Chat v2 adapter (https://docs.cohere.com/reference/chat) using plain fetch.
 *
 * Cohere's structured outputs support a SUBSET of JSON Schema. Nullable type arrays like
 * ["string","null"] aren't documented, so we send a converted schema where optional fields are
 * plain strings ("" = nothing), then turn "" back into null before zod validation.
 */

const COHERE_URL = "https://api.cohere.com/v2/chat";

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  [k: string]: unknown;
};

/** Remove null from type arrays / enums (Cohere-compatible). Pure — exported for tests. */
export function toCohereSchema(schema: JsonSchema): JsonSchema {
  const out: JsonSchema = { ...schema };
  if (Array.isArray(out.type)) {
    const types = out.type.filter((t) => t !== "null");
    out.type = types.length === 1 ? types[0] : types;
  }
  if (Array.isArray(out.enum)) out.enum = out.enum.filter((v) => v !== null);
  if (out.properties) {
    out.properties = Object.fromEntries(Object.entries(out.properties).map(([k, v]) => [k, toCohereSchema(v)]));
  }
  if (out.items) out.items = toCohereSchema(out.items);
  return out;
}

function allowsNull(schema: JsonSchema): boolean {
  return (Array.isArray(schema.type) && schema.type.includes("null")) || (Array.isArray(schema.enum) && schema.enum.includes(null));
}

/** Turn "" / "none" back into null wherever the ORIGINAL schema allowed null. Pure — exported for tests. */
export function restoreNulls(value: unknown, schema: JsonSchema): unknown {
  if (allowsNull(schema) && (value === "" || value === "none" || value === "null" || value === undefined)) return null;
  if (Array.isArray(value) && schema.items) return value.map((v) => restoreNulls(v, schema.items!));
  if (value && typeof value === "object" && schema.properties) {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(schema.properties).map(([k, s]) => [k, restoreNulls(obj[k], s)]).concat(
        Object.entries(obj).filter(([k]) => !(k in schema.properties!)),
      ),
    );
  }
  return value;
}

export class CohereError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call(apiKey: string, body: object, signal: AbortSignal) {
  return fetch(COHERE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Client-Name": "convoconfidence-ai" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function cohereCompleteJson(params: {
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  schema: object;
  timeoutMs?: number;
}): Promise<string> {
  const original = params.schema as JsonSchema;
  const schema = toCohereSchema(original);
  const messages = [
    {
      role: "system",
      content: `${params.instructions}\n\nReply ONLY with JSON matching the schema. For an optional field with nothing to say, use an empty string "".`,
    },
    { role: "user", content: params.input },
  ];
  const signal = AbortSignal.timeout(params.timeoutMs ?? 25_000);

  // The API reference names the schema field `json_schema`; some guide examples use `schema`.
  // Try the reference name first and fall back once if the API rejects the request shape.
  let res = await call(params.apiKey, { model: params.model, messages, response_format: { type: "json_object", json_schema: schema } }, signal);
  if (res.status === 400 || res.status === 422) {
    const detail = await res.text();
    if (/json_schema|schema|response_format/i.test(detail)) {
      res = await call(params.apiKey, { model: params.model, messages, response_format: { type: "json_object", schema } }, signal);
    } else {
      throw new CohereError(res.status, detail.slice(0, 300));
    }
  }
  if (res.status === 429) throw new CohereError(429, "rate limited");
  if (!res.ok) throw new CohereError(res.status, (await res.text()).slice(0, 300));

  const data = (await res.json()) as { message?: { content?: { type: string; text?: string }[] } };
  const text = data.message?.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text.trim()) return "";
  try {
    return JSON.stringify(restoreNulls(JSON.parse(text), original));
  } catch {
    return text; // let the caller's validator reject it (and retry)
  }
}
