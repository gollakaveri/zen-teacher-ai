import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LanguageCode } from "@/lib/studyzen";

const languageSchema = z.enum(["en", "te"]);
const intentSchema = z.enum([
  "new_question",
  "answer",
  "explain_again",
  "another_example",
  "simpler",
  "quiz_me",
  "understood",
]);

type ProfileRow = {
  id: string;
  display_name: string | null;
  language: string;
  plan: string;
  trial_ends_at: string | null;
  questions_used: number;
  questions_date: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadProfile(supabase: any, userId: string): Promise<ProfileRow> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data as ProfileRow;
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("*")
    .single();
  if (insertError) throw new Error(insertError.message);
  return created as ProfileRow;
}

/** Learning progress shown on the dashboard and profile. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function learningStats(supabase: any, userId: string) {
  const [{ data: lessons }, { data: notes }, { data: profile }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, topic, subject, updated_at, turns")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase.from("notes").select("id").eq("user_id", userId),
    supabase.from("profiles").select("questions_used").eq("id", userId).maybeSingle(),
  ]);
  const rows = (lessons ?? []) as Record<string, unknown>[];
  return {
    topicsStudied: rows.length,
    questionsAsked: (profile?.questions_used as number) ?? 0,
    notesCount: (notes ?? []).length,
    recent: rows.slice(0, 5).map((l) => ({
      id: l["id"] as string,
      topic: l["topic"] as string,
      subject: (l["subject"] as string) ?? null,
      updatedAt: l["updated_at"] as string,
    })),
  };
}

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await loadProfile(context.supabase, context.userId);
    return {
      profile: {
        displayName: profile.display_name,
        language: (profile.language as LanguageCode) ?? "en",
      },
      stats: await learningStats(context.supabase, context.userId),
    };
  });

export const savePreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ language: languageSchema.optional(), displayName: z.string().max(80).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await loadProfile(context.supabase, context.userId);
    const patch: { updated_at: string; language?: string; display_name?: string } = {
      updated_at: new Date().toISOString(),
    };
    if (data.language) patch.language = data.language;
    if (data.displayName !== undefined) patch.display_name = data.displayName;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const teach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        message: z.string().min(1).max(2000),
        language: languageSchema,
        boardLanguage: languageSchema.optional(),
        intent: intentSchema,
        lessonId: z.string().uuid().nullable().optional(),
        topic: z.string().max(200).nullable().optional(),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
          .max(24)
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { teachTurn, GatewayError } = await import("@/lib/teacher.server");
    await loadProfile(context.supabase, context.userId);

    let turn;
    try {
      turn = await teachTurn({
        language: data.language,
        boardLanguage: data.boardLanguage ?? data.language,
        intent: data.intent,
        message: data.message,
        history: data.history,
        topic: data.topic ?? null,
      });
    } catch (error) {
      if (error instanceof GatewayError) {
        throw new Error(error.message);
      }
      throw error;
    }

    // Everything is free: we only keep a lifetime counter for the progress cards.
    const { data: counted } = await context.supabase
      .from("profiles")
      .select("questions_used")
      .eq("id", context.userId)
      .maybeSingle();
    await context.supabase
      .from("profiles")
      .update({
        questions_used: ((counted?.questions_used as number) ?? 0) + 1,
        questions_date: today(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId);

    // Persist lesson history.
    let lessonId = data.lessonId ?? null;
    const studentTurn = { role: "student", text: data.message, at: new Date().toISOString() };
    const teacherTurn = { role: "teacher", text: turn.segments.map((s) => s.say).join(" "), turn, at: new Date().toISOString() };

    if (!lessonId) {
      const { data: created, error } = await context.supabase
        .from("lessons")
        .insert({
          user_id: context.userId,
          topic: turn.topic || data.message.slice(0, 120),
          subject: turn.subject,
          language: data.language,
          turns: [studentTurn, teacherTurn],
        })
        .select("id")
        .single();
      if (error) console.error("[studyzen] lesson insert failed", error.message);
      else lessonId = created.id as string;
    } else {
      const { data: existing } = await context.supabase
        .from("lessons")
        .select("turns")
        .eq("id", lessonId)
        .maybeSingle();
      const turns = Array.isArray(existing?.turns) ? existing.turns : [];
      const { error } = await context.supabase
        .from("lessons")
        .update({ turns: [...turns, studentTurn, teacherTurn], updated_at: new Date().toISOString() })
        .eq("id", lessonId);
      if (error) console.error("[studyzen] lesson update failed", error.message);
    }

    return { turn, lessonId };
  });

export const speakText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ text: z.string().min(1).max(1200), language: languageSchema }).parse(d),
  )
  .handler(async ({ data }) => {
    const { speak } = await import("@/lib/teacher.server");
    return { audio: await speak(data.text, data.language) };
  });

export const transcribeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ audio: z.string().min(100), mimeType: z.string().max(80) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { transcribe } = await import("@/lib/teacher.server");
    return { text: await transcribe(data.audio, data.mimeType) };
  });

export const makeNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lessonId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { generateNotes } = await import("@/lib/teacher.server");

    const { data: lesson, error } = await context.supabase
      .from("lessons")
      .select("id, topic, language, turns")
      .eq("id", data.lessonId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw new Error("Lesson not found.");

    const transcript = ((Array.isArray(lesson.turns) ? lesson.turns : []) as { role?: string; text?: string }[])
      .map((t) => `${t?.role ?? ""}: ${t?.text ?? ""}`)
      .join("\n");

    const notes = await generateNotes({
      topic: lesson.topic,
      language: (lesson.language as LanguageCode) ?? "en",
      lessonSummary: transcript,
    });

    const { data: saved, error: saveError } = await context.supabase
      .from("notes")
      .insert({
        user_id: context.userId,
        lesson_id: lesson.id,
        topic: lesson.topic,
        language: lesson.language,
        content: notes,
      })
      .select("id")
      .single();
    if (saveError) throw new Error(saveError.message);

    return { notes, id: saved.id as string };
  });

export const listLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lessons")
      .select("id, topic, subject, language, created_at, updated_at, turns")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((l: Record<string, unknown>) => ({
      id: l["id"] as string,
      topic: l["topic"] as string,
      subject: (l["subject"] as string) ?? null,
      language: l["language"] as string,
      updatedAt: l["updated_at"] as string,
      turnCount: Array.isArray(l["turns"]) ? (l["turns"] as unknown[]).length : 0,
    }));
  });

export const getLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: lesson, error } = await context.supabase
      .from("lessons")
      .select("id, topic, subject, language, turns")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!lesson) throw new Error("Lesson not found.");
    const row = lesson as {
      id: string;
      topic: string;
      subject: string | null;
      language: string;
      turns: unknown;
    };
    return {
      id: row.id,
      topic: row.topic,
      subject: row.subject,
      language: row.language,
      turns: JSON.stringify(Array.isArray(row.turns) ? row.turns : []),
    };
  });

export const listNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notes")
      .select("id, topic, language, content, created_at, lesson_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((n: Record<string, unknown>) => ({
      id: n["id"] as string,
      topic: n["topic"] as string,
      language: n["language"] as string,
      createdAt: n["created_at"] as string,
      lessonId: (n["lesson_id"] as string) ?? null,
      content: JSON.stringify(n["content"] ?? {}),
    }));
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ lessonId: z.string().uuid(), value: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lessons")
      .update({ bookmarked: data.value })
      .eq("id", data.lessonId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, bookmarked: data.value };
  });

export const listBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lessons")
      .select("id, topic, subject, language, updated_at")
      .eq("user_id", context.userId)
      .eq("bookmarked", true)
      .order("updated_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return (data ?? []).map((l: Record<string, unknown>) => ({
      id: l["id"] as string,
      topic: l["topic"] as string,
      subject: (l["subject"] as string) ?? null,
      language: l["language"] as string,
      updatedAt: l["updated_at"] as string,
    }));
  });
