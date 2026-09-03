import { Mic, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import teacher from "@/assets/teacher.jpg";
import { cn } from "@/lib/utils";
import type { LanguageCode } from "@/lib/studyzen";

export type TeacherState = "idle" | "thinking" | "speaking" | "listening";

const LABEL: Record<TeacherState, Record<LanguageCode, string>> = {
  idle: { en: "Ready to teach", te: "బోధించడానికి సిద్ధం" },
  thinking: { en: "Thinking…", te: "ఆలోచిస్తోంది…" },
  speaking: { en: "Teaching…", te: "బోధిస్తోంది…" },
  listening: { en: "Listening to you…", te: "మీరు చెప్పేది వింటోంది…" },
};

export function Waveform({ active, level = 0 }: { active: boolean; level?: number }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <span
          key={i}
          className={cn("w-1 rounded-full bg-primary transition-all duration-75", !active && "opacity-40")}
          style={{
            height: active
              ? `${Math.max(6, Math.min(32, 8 + level * 90 * (0.55 + Math.abs(Math.sin(i * 1.7)) * 0.8)))}px`
              : "6px",
          }}
        />
      ))}
    </div>
  );
}

/**
 * Animated teacher stage.
 *
 * Honest capability note: no talking-head / lip-sync model is connected to this
 * project, so this is NOT model-driven lip sync. Instead the teacher's motion is
 * driven live by the real amplitude of the generated teacher voice: the mouth
 * region opens with the waveform, the head nods and sways, she breathes, blinks
 * and gestures while speaking, and everything stops when the audio stops.
 */
export function AnimatedTeacher({
  state,
  level,
  caption,
  language,
}: {
  state: TeacherState;
  level: number;
  caption: string | null;
  language: LanguageCode;
}) {
  const speaking = state === "speaking";
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(
        () => {
          setBlink(true);
          setTimeout(() => setBlink(false), 130);
          loop();
        },
        2200 + Math.random() * 3200,
      );
    };
    loop();
    return () => clearTimeout(timer);
  }, []);

  const open = speaking ? Math.min(1, level * 3.2) : 0;

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden rounded-3xl">
      <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[5/6] lg:aspect-[4/5]">
        {/* Body / base layer: breathing + gentle sway while teaching */}
        <div
          className="absolute inset-0"
          style={{
            transformOrigin: "50% 90%",
            transform: speaking
              ? `translateY(${Math.sin(Date.now() / 400) * 0}px) scale(${1.01 + open * 0.006})`
              : "none",
            animation: speaking
              ? "sz-teach-sway 5.5s ease-in-out infinite, sz-teach-nod 3.1s ease-in-out infinite"
              : "sz-breathe 5.5s ease-in-out infinite",
            transition: "transform 90ms linear",
          }}
        >
          <img src={teacher} alt="Zen, your StudyZen AI teacher" className="size-full object-cover object-top" />

          {/* Mouth region: stretched live by the amplitude of her voice */}
          <img
            src={teacher}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full object-cover object-top"
            style={{
              clipPath: "inset(46% 30% 38% 30%)",
              transformOrigin: "50% 46%",
              transform: `scaleY(${1 + open * 0.055}) translateY(${open * 1.2}px)`,
              transition: "transform 70ms linear",
              filter: `brightness(${1 - open * 0.05})`,
            }}
          />

          {/* Eyelid blink */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[32%] right-[32%] top-[30%] h-[3.5%] rounded-full bg-black/70 transition-opacity duration-100"
            style={{ opacity: blink ? 0.55 : 0, filter: "blur(2px)" }}
          />
        </div>

        {/* Warm classroom light + gesture glow that pulses with speech */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: speaking
              ? `radial-gradient(60% 40% at 50% 70%, color-mix(in oklab, var(--gold) ${8 + open * 14}%, transparent), transparent 70%)`
              : undefined,
            transition: "background 120ms linear",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-card to-transparent" />

        <div
          className={cn(
            "absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium backdrop-blur",
            speaking && "animate-glow",
          )}
        >
          {state === "listening" ? (
            <Mic className="size-3.5 text-gold" />
          ) : (
            <Volume2 className="size-3.5 text-primary" />
          )}
          {LABEL[state][language]}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">
              Zen <span className="text-gold-gradient">•</span>{" "}
              {language === "te" ? "మీ ఉపాధ్యాయురాలు" : "Your teacher"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {language === "te" ? "స్టడీజెన్ లైవ్ క్లాస్‌రూమ్" : "StudyZen live classroom"}
            </p>
          </div>
          <Waveform active={speaking || state === "listening"} level={state === "listening" ? 0.25 : level} />
        </div>
      </div>

      <div className="p-4">
        <div className="min-h-20 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed">
          {caption ? (
            <p key={caption} className="animate-rise">
              {caption}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {language === "te"
                ? "ఏదైనా అడగండి — నేను మాట్లాడుతూ బోర్డు మీద రాస్తాను."
                : "Ask me anything — I'll teach out loud and write on the board."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
