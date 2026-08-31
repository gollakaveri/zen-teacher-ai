import { Mic, Volume2 } from "lucide-react";

import teacher from "@/assets/teacher.jpg";
import { cn } from "@/lib/utils";

export type TeacherState = "idle" | "thinking" | "speaking" | "listening";

const LABEL: Record<TeacherState, { en: string; te: string }> = {
  idle: { en: "Ready to teach", te: "బోధించడానికి సిద్ధం" },
  thinking: { en: "Thinking…", te: "ఆలోచిస్తోంది…" },
  speaking: { en: "Teaching…", te: "బోధిస్తోంది…" },
  listening: { en: "Listening to you…", te: "మీరు చెప్పేది వింటోంది…" },
};

export function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 rounded-full bg-primary transition-all",
            active ? "h-8 origin-bottom" : "h-1.5 opacity-40",
          )}
          style={
            active
              ? { animation: `sz-wave ${0.6 + (i % 4) * 0.14}s ease-in-out ${i * 0.06}s infinite` }
              : undefined
          }
        />
      ))}
    </div>
  );
}

export function TeacherStage({
  state,
  caption,
  language,
}: {
  state: TeacherState;
  caption: string | null;
  language: "en" | "te";
}) {
  const speaking = state === "speaking";
  return (
    <div className="glass-card flex h-full flex-col overflow-hidden rounded-3xl">
      <div className="relative">
        <img
          src={teacher}
          alt="Zen, your StudyZen AI teacher"
          className={cn(
            "h-64 w-full object-cover object-top lg:h-80",
            speaking && "animate-breathe",
          )}
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card to-transparent" />
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
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              Zen <span className="text-gold-gradient">•</span> {language === "te" ? "మీ ఉపాధ్యాయురాలు" : "Your teacher"}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "te" ? "స్టడీజెన్ లైవ్ క్లాస్‌రూమ్" : "StudyZen live classroom"}
            </p>
          </div>
          <Waveform active={state === "speaking" || state === "listening"} />
        </div>

        <div className="min-h-24 rounded-2xl border border-border/60 bg-background/40 p-4 text-sm leading-relaxed">
          {caption ? (
            <p key={caption} className="animate-rise">
              {caption}
            </p>
          ) : (
            <p className="text-muted-foreground">
              {language === "te"
                ? "ఏదైనా అడగండి — నేను బోర్డు మీద రాస్తూ వివరిస్తాను."
                : "Ask me anything — I'll explain out loud and write on the board."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
