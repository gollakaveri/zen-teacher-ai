import { Mic, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import { TeacherAvatar, useGestureCycle } from "@/components/studyzen/TeacherAvatar";
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
 * The teacher is a vector rig, so she genuinely moves: her mouth opens and closes
 * with the live amplitude of the generated voice, her head nods, she blinks, her
 * body shifts weight and BOTH arms cycle through teaching gestures — including
 * pointing at the board when new content is written. This is amplitude-driven
 * animation, not a lip-sync model, and it stops the moment the audio stops.
 */
export function AnimatedTeacher({
  state,
  level,
  caption,
  language,
  pointing = false,
}: {
  state: TeacherState;
  level: number;
  caption: string | null;
  language: LanguageCode;
  /** True while the board just received new content, so she points at it. */
  pointing?: boolean;
}) {
  const speaking = state === "speaking";
  const gesture = useGestureCycle(speaking, pointing);
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
      <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-square lg:aspect-[4/5]">
        <TeacherAvatar level={level} speaking={speaking} gesture={gesture} blink={blink} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />

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
