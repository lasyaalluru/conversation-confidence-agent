import { afterEach, describe, expect, it, vi } from "vitest";
import { FEEDBACK_JSON_SCHEMA, FeedbackResult, TURN_JSON_SCHEMA, TurnResult } from "@/lib/ai/contract";
import { CohereError, cohereCompleteJson, restoreNulls, toCohereSchema } from "@/lib/ai/providers/cohere";

const turnSchema = TURN_JSON_SCHEMA(["greeting", "ordering", "completed"], ["make_request"]);

function reply(obj: unknown, status = 200) {
  return new Response(JSON.stringify(status === 200 ? { message: { role: "assistant", content: [{ type: "text", text: JSON.stringify(obj) }] } } : obj), {
    status,
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("Cohere schema conversion", () => {
  it("removes null from type arrays and enums, deeply", () => {
    const s = toCohereSchema(turnSchema as never) as { properties: Record<string, { type: unknown; enum?: unknown[] }> };
    expect(s.properties.hint.type).toBe("string");
    expect(s.properties.learningObjective.enum).toEqual(["make_request"]);
    const f = toCohereSchema(FEEDBACK_JSON_SCHEMA as never) as never as { properties: { wentWell: { items: { properties: { quote: { type: unknown } } } } } };
    expect(f.properties.wentWell.items.properties.quote.type).toBe("string");
    expect(JSON.stringify(f)).not.toContain('"null"');
  });

  it("restores empty strings to null only where the original schema allowed null", () => {
    const out = restoreNulls({ reply: "", scenarioStage: "ordering", isComplete: false, hint: "", learningObjective: "none" }, turnSchema as never);
    expect(out).toEqual({ reply: "", scenarioStage: "ordering", isComplete: false, hint: null, learningObjective: null });
  });
});

describe("cohereCompleteJson", () => {
  it("sends the v2 chat request and returns JSON that passes our turn validator", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      reply({ reply: "Hey! What can I get you?", scenarioStage: "ordering", isComplete: false, hint: "A latte, please.", learningObjective: "make_request" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const raw = await cohereCompleteJson({ apiKey: "test-key", model: "command-a-03-2025", instructions: "Be a barista", input: "LEARNER: hi", schema: turnSchema });
    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(url).toBe("https://api.cohere.com/v2/chat");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(body.model).toBe("command-a-03-2025");
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
    expect(body.response_format.type).toBe("json_object");
    expect(body.response_format.json_schema.properties.hint.type).toBe("string");
    expect(TurnResult.safeParse(JSON.parse(raw)).success).toBe(true);
  });

  it("falls back to the `schema` key if the API rejects `json_schema`", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"message":"unknown field json_schema"}', { status: 400 }))
      .mockResolvedValueOnce(reply({ reply: "Hi!", scenarioStage: "greeting", isComplete: false, hint: "", learningObjective: "" }));
    vi.stubGlobal("fetch", fetchMock);
    const raw = await cohereCompleteJson({ apiKey: "k", model: "m", instructions: "i", input: "x", schema: turnSchema });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).response_format.schema).toBeDefined();
    expect(JSON.parse(raw)).toMatchObject({ hint: null, learningObjective: null });
  });

  it("surfaces rate limits as status 429 (trial quota)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(cohereCompleteJson({ apiKey: "k", model: "m", instructions: "i", input: "x", schema: turnSchema })).rejects.toMatchObject({
      status: 429,
    } satisfies Partial<CohereError>);
  });

  it("produces feedback that passes the feedback validator (nullable quotes restored)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        reply({
          summary: "Nice work.",
          wentWell: [{ title: "Returned the question", detail: "You asked back.", quote: "" }],
          improve: [],
          alternatives: [{ context: "Greeting", youSaid: "", alternative: "Pretty good, you?", why: "Warm and short." }],
          reflection: { title: "Small talk", body: "It's a greeting." },
        }),
      ),
    );
    const raw = await cohereCompleteJson({ apiKey: "k", model: "m", instructions: "i", input: "x", schema: FEEDBACK_JSON_SCHEMA });
    const parsed = FeedbackResult.safeParse(JSON.parse(raw));
    expect(parsed.success).toBe(true);
    expect(parsed.data!.wentWell[0].quote).toBeNull();
  });
});
