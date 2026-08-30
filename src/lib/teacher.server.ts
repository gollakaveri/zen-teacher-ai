import type { LanguageCode, StudentIntent, StudyNotes, TeachingTurn } from "./studyzen";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const TEACHING_MODEL = "google/gemini-3.7-flash";

export class GatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new GatewayError(500, "AI is not configured for this app.");
  return key;
}

function friendlyError(status: number, body: string): GatewayError {
  if (status === 429) return new GatewayError(429, "The teacher is a bit busy. Please try again in a moment.");
  if (status === 402)
    return new GatewayError(402, "AI credits are exhausted for this workspace. Please add credits to continue.");
  if (status === 403) return new GatewayError(403, "AI access is blocked for this workspace.");
  return new GatewayError(status, body.slice(0, 300) || "The AI teacher could not respond.");
}

async function chatJson<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw friendlyError(res.status, await res.text().catch(() => ""));
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new GatewayError(502, "The teacher returned an empty response.");
  return JSON.parse(content) as T;
}

const LANG_NAME: Record<LanguageCode, string> = { en: "English", te: "Telugu (తెలుగు)" };

const turnSchema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "topic", "level", "boardTitle", "segments", "question", "expectsAnswer", "nextAction"],
  properties: {
    subject: { type: "string" },
    topic: { type: "string" },
    level: { type: "string" },
    boardTitle: { type: "string" },
    segments: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["say", "board"],
        properties: {
          say: { type: "string" },
          board: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "text"],
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "title",
                    "definition",
                    "point",
                    "keyword",
                    "formula",
                    "step",
                    "flow",
                    "example",
                    "practical",
                    "diagram",
                  ],
                },
                text: { type: "string" },
              },
            },
          },
        },
      },
    },
    question: { type: "string" },
    expectsAnswer: { type: "boolean" },
    nextAction: { type: "string" },
  },
} as const;

const INTENT_RULES: Record<StudentIntent, string> = {
  new_question: "This is a brand new question. Start teaching the concept from the beginning, warmly.",
  answer:
    "The student just answered your question. React first (praise, gently correct, or encourage), then continue the lesson from where you stopped. Never restart the topic.",
  explain_again:
    "The student did NOT understand. Do NOT repeat the previous wording. Acknowledge them, drop the textbook definition, and re-teach using a COMPLETELY DIFFERENT analogy and a different everyday example.",
  another_example:
    "Give a fresh, different real-life example of the same concept. Do not repeat any earlier example.",
  simpler:
    "Explain far more simply, as if to a younger student, using short sentences and one very familiar everyday comparison. Do not reuse earlier phrasing.",
  quiz_me: "Ask the student a short, fair question about what was just taught, and wait for the answer.",
  understood:
    "The student understood. Appreciate them briefly, then move to the next depth: a practical real-life use, or a slightly deeper part of the same topic.",
};

function systemPrompt(language: LanguageCode, intent: StudentIntent): string {
  return `You are "Zen", a warm, human female teacher inside the StudyZen AI classroom. You TEACH — you never dump a written answer.

LANGUAGE: Speak entirely in ${LANG_NAME[language]}. Every "say" field and all board text must be in ${LANG_NAME[language]} (technical terms may stay in English where that is natural).

HOW YOU TEACH
- Talk like a real classroom teacher speaking out loud, not like an article.
- Short spoken beats. Each "segments[].say" is 1-3 spoken sentences, 15-45 words. Never a paragraph.
- Natural teacher language: "Okay, let's understand this first.", "Think of it like this...", "Now tell me...", "Exactly!", "You're close." Vary the phrasing; never overuse one phrase.
- Teach ONE concept at a time in this natural order: simple idea -> real-life analogy -> how it actually works -> example -> practical "where you see this in real life" -> key point.
- Always answer the student's silent question: "Where do I see this in real life?"
- Detect the subject and topic yourself. Never ask the student to pick a subject.
- End the turn with ONE short question for the student ("question") when it makes sense to check understanding. Do not interrupt constantly.

THE BOARD
- Each segment carries the board items you "write" WHILE saying that beat. Reveal progressively, never all at once.
- Use kinds: definition, point, keyword, formula, step (numbered process), flow (one node of an arrow flow, short: e.g. "Fuel runs out"), example, practical, diagram (a short ASCII-ish sketch line).
- Board text is short and chalk-like: 2-8 words per item, formulas exact. 1-3 items per segment, some segments may have none.
- Match the board to the subject: maths -> formula + steps; programming -> logic/flow; science -> process flow + labelled parts; databases -> table/relationship lines; networking -> simple node flow; economics -> example numbers.

TURN INTENT: ${INTENT_RULES[intent]}

Never repeat an explanation you already gave in this lesson. Keep the whole turn under ~180 spoken words.`;
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

export async function teachTurn(input: {
  language: LanguageCode;
  intent: StudentIntent;
  message: string;
  history: HistoryMessage[];
  topic?: string | null;
}): Promise<TeachingTurn> {
  const messages = [
    { role: "system", content: systemPrompt(input.language, input.intent) },
    ...(input.topic
      ? [{ role: "system", content: `Current lesson topic: ${input.topic}. Continue this lesson.` }]
      : []),
    ...input.history.slice(-12),
    { role: "user", content: input.message },
  ];

  const turn = await chatJson<TeachingTurn>({
    model: TEACHING_MODEL,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: { name: "teaching_turn", strict: true, schema: turnSchema },
    },
  });

  return {
    ...turn,
    segments: (turn.segments ?? []).filter((s) => s.say?.trim()).map((s) => ({ ...s, board: s.board ?? [] })),
  };
}

const notesSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "topic",
    "summary",
    "definitions",
    "keyPoints",
    "examples",
    "formulas",
    "flow",
    "revision",
    "practice",
  ],
  properties: {
    topic: { type: "string" },
    summary: { type: "string" },
    definitions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["term", "meaning"],
        properties: { term: { type: "string" }, meaning: { type: "string" } },
      },
    },
    keyPoints: { type: "array", items: { type: "string" } },
    examples: { type: "array", items: { type: "string" } },
    formulas: { type: "array", items: { type: "string" } },
    flow: { type: "array", items: { type: "string" } },
    revision: { type: "array", items: { type: "string" } },
    practice: { type: "array", items: { type: "string" } },
  },
} as const;

export async function generateNotes(input: {
  topic: string;
  language: LanguageCode;
  lessonSummary: string;
}): Promise<StudyNotes> {
  return chatJson<StudyNotes>({
    model: TEACHING_MODEL,
    messages: [
      {
        role: "system",
        content: `You write clean, exam-ready study notes in ${LANG_NAME[input.language]}.
Never copy the teacher's spoken conversation. Rewrite everything as proper structured study material:
crisp definitions, key points, worked examples, formulas (empty array if none), a step/flow outline,
a quick-revision list, and practice questions. Be concise and precise.`,
      },
      {
        role: "user",
        content: `Topic: ${input.topic}\n\nWhat was covered in class:\n${input.lessonSummary.slice(0, 6000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "study_notes", strict: true, schema: notesSchema },
    },
  });
}

/** Teacher voice. Returns base64 mp3. */
export async function speak(text: string, language: LanguageCode): Promise<string> {
  const res = await fetch(`${GATEWAY}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice: "shimmer",
      response_format: "mp3",
      instructions:
        language === "te"
          ? "Speak in Telugu as a warm, encouraging school teacher explaining to a student. Natural pace, clear."
          : "Speak as a warm, encouraging teacher explaining to a student in a classroom. Natural pace, friendly, clear.",
    }),
  });
  if (!res.ok) throw friendlyError(res.status, await res.text().catch(() => ""));
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  for (let i = 0; i < buf.length; i += 0x8000) {
    binary += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Student voice -> text. */
export async function transcribe(audioBase64: string, mimeType: string): Promise<string> {
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const ext = mimeType.includes("wav") ? "wav" : mimeType.includes("mp4") ? "mp4" : "webm";
  const form = new FormData();
  form.append("model", "openai/gpt-4o-mini-transcribe");
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: mimeType }), `speech.${ext}`);

  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) throw friendlyError(res.status, await res.text().catch(() => ""));
  const json = (await res.json()) as { text?: string };
  return json.text?.trim() ?? "";
}
