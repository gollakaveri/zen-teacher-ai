import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FREE_DAILY_QUESTIONS, type LanguageCode, type PlanState } from "@/lib/studyzen";

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

function planStateOf(profile: ProfileRow): PlanState {
  const trialActive = !!profile.trial_ends_at && new Date(profile.trial_ends_at).getTime() > Date.now();
  const isPro = profile.plan === "pro" || (profile.plan === "trial" && trialActive);
  const used = profile.questions_date === today() ? profile.questions_used : 0;
  return {
    plan: isPro ? (profile.plan === "pro" ? "pro" : "trial") : "free",
    isPro,
    questionsLeft: isPro ? Number.POSITIVE_INFINITY : Math.max(0, FREE_DAILY_QUESTIONS - used),
    trialEndsAt: profile.trial_ends_at,
  };
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

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const profile = await loadProfile(context.supabase, context.userId);
    return {
      profile: {
        displayName: profile.display_name,
        language: (profile.language as LanguageCode) ?? "en",
      },
      plan: planStateOf(profile),
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

/**
 * INTEGRATION POINT — subscriptions.
 * No payment provider is connected yet, so this only records the *intent* to
 * start a trial / upgrade. Wire a real gateway (Stripe/Razorpay) webhook to
 * this same profile update before treating a plan as paid.
 */
export const requestPlanChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan: z.enum(["trial", "pro"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await loadProfile(context.supabase, context.userId);
    return {
      ok: false as const,
      requiresPayment: true as const,
      plan: data.plan,
      message:
        data.plan === "trial"
          ? "Payments are not connected yet, so the ₹2 trial cannot be charged. Connect a payment provider to activate it."
          : "Payments are not connected yet, so ₹100/month Pro cannot be charged. Connect a payment provider to activate it.",
    };
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
    const profile = await loadProfile(context.supabase, context.userId);
    const state = planStateOf(profile);
    const isNewQuestion = data.intent === "new_question";

    if (isNewQuestion && !state.isPro && state.questionsLeft <= 0) {
      return { blocked: true as const, plan: state };
    }

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

    let plan = state;
    if (isNewQuestion && !state.isPro) {
      const used = profile.questions_date === today() ? profile.questions_used + 1 : 1;
      const { error } = await context.supabase
        .from("profiles")
        .update({ questions_used: used, questions_date: today(), updated_at: new Date().toISOString() })
        .eq("id", context.userId);
      if (error) console.error("[studyzen] counter update failed", error.message);
      plan = { ...state, questionsLeft: Math.max(0, FREE_DAILY_QUESTIONS - used) };
    }

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

    return { blocked: false as const, turn, plan, lessonId };
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
    const profile = await loadProfile(context.supabase, context.userId);
    const state = planStateOf(profile);
    if (!state.isPro) return { blocked: true as const };

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

    return { blocked: false as const, notes, id: saved.id as string };
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
