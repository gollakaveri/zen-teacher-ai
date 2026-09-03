import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark, Crown, Mic, NotebookPen, Send, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AnimatedTeacher, type TeacherState } from "@/components/studyzen/AnimatedTeacher";
import { Blackboard } from "@/components/studyzen/Blackboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/useLanguage";
import {
  FREE_DAILY_QUESTIONS,
  QUICK_ACTIONS,
  type BoardItem,
  type PlanState,
  type StudentIntent,
  type TeachingTurn,
} from "@/lib/studyzen";
import {
  getLesson,
  makeNotes,
  speakText,
  teach,
  toggleBookmark,
  transcribeSpeech,
} from "@/lib/studyzen.functions";

export const Route = createFileRoute("/_authenticated/classroom")({
  validateSearch: z.object({ lesson: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Classroom — StudyZen AI Teacher" },
      {
        name: "description",
        content:
          "Learn with a live AI teacher who speaks, gestures, explains with real-life examples and writes progressively on a digital blackboard.",
      },
      { property: "og:title", content: "Classroom — StudyZen AI Teacher" },
      {
        property: "og:description",
        content: "A live AI teacher who speaks and writes on the board while you learn.",
      },
    ],
  }),
  component: Classroom,
});

type ChatLine = { role: "student" | "teacher"; text: string };

function Classroom() {
  const { language, boardLanguage } = useLanguage();
  const search = useSearch({ from: "/_authenticated/classroom" });
  const queryClient = useQueryClient();

  const teachFn = useServerFn(teach);
  const speakFn = useServerFn(speakText);
  const transcribeFn = useServerFn(transcribeSpeech);
  const notesFn = useServerFn(makeNotes);
  const getLessonFn = useServerFn(getLesson);
  const bookmarkFn = useServerFn(toggleBookmark);

  const [state, setState] = useState<TeacherState>("idle");
  const [level, setLevel] = useState(0);
  const [caption, setCaption] = useState<string | null>(null);
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [boardTitle, setBoardTitle] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [question, setQuestion] = useState<string | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [history, setHistory] = useState<ChatLine[]>([]);
  const [input, setInput] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [plan, setPlan] = useState<PlanState | null>(null);
  const [recording, setRecording] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const cancelRef = useRef(false);

  // Reopen a lesson from History / Bookmarks.
  useEffect(() => {
    if (!search.lesson) return;
    let live = true;
    getLessonFn({ data: { id: search.lesson } })
      .then((lesson) => {
        if (!live) return;
        const turns = JSON.parse(lesson.turns) as { role: string; text: string; turn?: TeachingTurn }[];
        setLessonId(lesson.id);
        setTopic(lesson.topic);
        setSubject(lesson.subject);
        setHistory(turns.map((t) => ({ role: t.role === "student" ? "student" : "teacher", text: t.text })));
        const last = [...turns].reverse().find((t) => t.turn);
        if (last?.turn) {
          setBoardTitle(last.turn.boardTitle);
          setBoard(last.turn.segments.flatMap((s) => s.board ?? []));
          setQuestion(last.turn.question);
          setCaption(last.turn.segments.at(-1)?.say ?? null);
        }
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Could not open lesson"));
    return () => {
      live = false;
    };
  }, [search.lesson, getLessonFn]);

  const stopAudio = useCallback(() => {
    cancelRef.current = true;
    audioRef.current?.pause();
    audioRef.current = null;
    setLevel(0);
    setState("idle");
  }, []);

  /** Plays one spoken beat and drives the teacher animation from its real amplitude. */
  const playSegment = useCallback(
    async (text: string) => {
      try {
        const { audio } = await speakFn({ data: { text: text.slice(0, 1200), language } });
        if (cancelRef.current) return;

        await new Promise<void>((resolve) => {
          const el = new Audio(`data:audio/mpeg;base64,${audio}`);
          el.crossOrigin = "anonymous";
          audioRef.current = el;

          let raf = 0;
          const finish = () => {
            cancelAnimationFrame(raf);
            setLevel(0);
            resolve();
          };
          el.onended = finish;
          el.onerror = finish;

          void el
            .play()
            .then(() => {
              try {
                const ctx = (ctxRef.current ??= new AudioContext());
                void ctx.resume().catch(() => {});
                const analyser = (analyserRef.current ??= ctx.createAnalyser());
                analyser.fftSize = 512;
                const source = ctx.createMediaElementSource(el);
                source.connect(analyser);
                analyser.connect(ctx.destination);
                const data = new Uint8Array(analyser.frequencyBinCount);
                const tick = () => {
                  analyser.getByteTimeDomainData(data);
                  let sum = 0;
                  for (const v of data) sum += (v - 128) ** 2;
                  setLevel(Math.sqrt(sum / data.length) / 60);
                  raf = requestAnimationFrame(tick);
                };
                tick();
              } catch {
                // Amplitude analysis unavailable — fall back to a gentle idle motion.
                setLevel(0.25);
              }
            })
            .catch(() => finish());
        });
      } catch {
        // Voice is a bonus; keep teaching visually if TTS fails.
        await new Promise((r) => setTimeout(r, Math.min(6000, text.length * 55)));
      }
    },
    [speakFn, language],
  );

  const performTurn = useCallback(
    async (turn: TeachingTurn) => {
      cancelRef.current = false;
      setBoardTitle(turn.boardTitle);
      setSubject(turn.subject);
      setTopic(turn.topic);
      setQuestion(null);
      setState("speaking");

      for (const segment of turn.segments) {
        if (cancelRef.current) break;
        setCaption(segment.say);
        setBoard((prev) => [...prev, ...(segment.board ?? [])]);
        await playSegment(segment.say);
      }

      if (!cancelRef.current && turn.question) {
        setCaption(turn.question);
        setQuestion(turn.question);
        await playSegment(turn.question);
      }
      setLevel(0);
      setState("idle");
    },
    [playSegment],
  );

  const send = useCallback(
    async (message: string, intent: StudentIntent) => {
      const text = message.trim();
      if (!text || state === "thinking" || state === "speaking") return;
      stopAudio();
      cancelRef.current = false;
      setInput("");
      setState("thinking");
      setHistory((h) => [...h, { role: "student", text }]);
      if (intent === "new_question") {
        setBoard([]);
        setBoardTitle(null);
        setBookmarked(false);
      }

      try {
        const result = await teachFn({
          data: {
            message: text,
            language,
            boardLanguage,
            intent,
            lessonId: intent === "new_question" ? null : lessonId,
            topic: intent === "new_question" ? null : topic,
            history: history.slice(-12).map((h) => ({
              role: h.role === "student" ? ("user" as const) : ("assistant" as const),
              content: h.text.slice(0, 4000),
            })),
          },
        });

        if (result.blocked) {
          setPlan(result.plan);
          setBlocked(true);
          setState("idle");
          return;
        }
        setPlan(result.plan);
        setLessonId(result.lessonId ?? null);
        setHistory((h) => [...h, { role: "teacher", text: result.turn.segments.map((s) => s.say).join(" ") }]);
        void queryClient.invalidateQueries({ queryKey: ["account"] });
        void queryClient.invalidateQueries({ queryKey: ["lessons"] });
        await performTurn(result.turn as TeachingTurn);
      } catch (error) {
        setState("idle");
        toast.error(error instanceof Error ? error.message : "The teacher could not respond.");
      }
    },
    [state, stopAudio, teachFn, language, boardLanguage, lessonId, topic, history, queryClient, performTurn],
  );

  async function toggleMic() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setState("thinking");
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const buffer = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < buffer.length; i += 0x8000) {
          binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
        }
        try {
          const { text } = await transcribeFn({
            data: { audio: btoa(binary), mimeType: recorder.mimeType || "audio/webm" },
          });
          if (!text) {
            setState("idle");
            toast.error("I couldn't hear that. Please try again.");
            return;
          }
          await send(text, question ? "answer" : "new_question");
        } catch (error) {
          setState("idle");
          toast.error(error instanceof Error ? error.message : "Speech could not be processed.");
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setState("listening");
    } catch {
      toast.error("Microphone permission is needed to speak to the teacher.");
    }
  }

  async function generateNotes() {
    if (!lessonId) return;
    setNotesBusy(true);
    try {
      const result = await notesFn({ data: { lessonId } });
      if (result.blocked) {
        toast.error("Notes Generator is a Pro feature.");
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Study notes are ready in the Notes page.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not make notes.");
    } finally {
      setNotesBusy(false);
    }
  }

  async function bookmark() {
    if (!lessonId) return;
    try {
      const next = !bookmarked;
      await bookmarkFn({ data: { lessonId, value: next } });
      setBookmarked(next);
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(next ? "Lesson bookmarked." : "Bookmark removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not bookmark.");
    }
  }

  const busy = state === "thinking" || state === "speaking";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,430px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <AnimatedTeacher state={state} level={level} caption={caption} language={language} />

        {blocked ? (
          <div className="glass-card rounded-3xl border-gold/40 p-5 text-center">
            <Crown className="mx-auto size-6 text-gold" />
            <h3 className="mt-2 font-semibold">
              {language === "te" ? "ఈరోజు ఉచిత ప్రశ్నలు అయిపోయాయి" : "Daily free questions used"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {language === "te"
                ? `ఉచిత ప్లాన్‌లో రోజుకు ${FREE_DAILY_QUESTIONS} ప్రశ్నలు. అపరిమిత బోధన కోసం ప్రో తీసుకోండి.`
                : `Free plan includes ${FREE_DAILY_QUESTIONS} questions per day. Go Pro for unlimited teaching.`}
            </p>
            <Button asChild className="mt-4 w-full">
              <Link to="/pro">Try StudyZen Pro for ₹2</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Blackboard title={boardTitle} items={board} subject={subject} language={boardLanguage} />

        <div className="glass-card sticky bottom-3 rounded-3xl p-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.intent}
                size="sm"
                variant="secondary"
                disabled={busy || !lessonId}
                onClick={() => void send(action.message[language], action.intent)}
              >
                {action.label[language]}
              </Button>
            ))}
          </div>

          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input, question ? "answer" : "new_question");
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                question
                  ? language === "te"
                    ? "మీ సమాధానం చెప్పండి…"
                    : "Answer your teacher…"
                  : language === "te"
                    ? "ఏదైనా అడగండి..."
                    : "Ask anything..."
              }
              disabled={busy}
            />
            <Button
              type="button"
              size="icon"
              variant={recording ? "destructive" : "secondary"}
              className={recording ? "animate-glow" : undefined}
              onClick={() => void toggleMic()}
              title={recording ? "Stop recording" : "Tap to speak"}
            >
              <Mic className="size-4" />
            </Button>
            <Button type="submit" size="icon" disabled={busy || !input.trim()} title="Send">
              <Send className="size-4" />
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {state === "speaking" ? (
              <button className="inline-flex items-center gap-1.5 text-foreground" onClick={stopAudio}>
                <Square className="size-3" /> {language === "te" ? "ఆపండి" : "Stop teaching"}
              </button>
            ) : (
              <span>
                {plan && !plan.isPro
                  ? `${plan.questionsLeft}/${FREE_DAILY_QUESTIONS} ${language === "te" ? "ప్రశ్నలు మిగిలాయి" : "questions left today"}`
                  : language === "te"
                    ? "మాట్లాడండి లేదా టైప్ చేయండి"
                    : "Tap to speak or type — no subject selection needed"}
              </span>
            )}
            <div className="flex items-center gap-4">
              <button
                className="inline-flex items-center gap-1.5 disabled:opacity-40"
                disabled={!lessonId}
                onClick={() => void bookmark()}
              >
                <Bookmark className={bookmarked ? "size-3.5 fill-gold text-gold" : "size-3.5"} />
                {bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              <button
                className="inline-flex items-center gap-1.5 disabled:opacity-40"
                disabled={!lessonId || notesBusy}
                onClick={() => void generateNotes()}
              >
                <NotebookPen className="size-3.5" /> {notesBusy ? "Making notes…" : "Make notes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
