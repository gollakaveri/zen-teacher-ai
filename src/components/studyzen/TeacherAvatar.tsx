import { useEffect, useState } from "react";

export type Gesture = "rest" | "emphasize" | "point" | "explain" | "count";

/**
 * Vector teacher rig. Every part is a real SVG group, so the mouth, eyes, head,
 * torso and BOTH arms actually move — the mouth opening is driven by the live
 * amplitude of the teacher's voice, the arms by a rotating set of gestures.
 */
export function TeacherAvatar({
  level,
  speaking,
  gesture,
  blink,
}: {
  level: number;
  speaking: boolean;
  gesture: Gesture;
  blink: boolean;
}) {
  const open = speaking ? Math.max(0.06, Math.min(1, level * 3.4)) : 0;
  const mouthRy = 1.6 + open * 7.5;
  const mouthRx = 8 - open * 2;
  const jaw = open * 2.4;

  return (
    <svg
      viewBox="0 0 320 400"
      className="size-full"
      role="img"
      aria-label="Zen, your StudyZen AI teacher, explaining at the board"
    >
      <defs>
        <linearGradient id="sz-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b48c" />
          <stop offset="100%" stopColor="#cf9068" />
        </linearGradient>
        <linearGradient id="sz-kurta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.32 0.06 165)" />
          <stop offset="100%" stopColor="oklch(0.24 0.05 200)" />
        </linearGradient>
        <linearGradient id="sz-dupatta" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.78 0.12 85)" />
          <stop offset="100%" stopColor="oklch(0.62 0.13 70)" />
        </linearGradient>
        <radialGradient id="sz-room" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="oklch(0.30 0.03 250)" />
          <stop offset="100%" stopColor="oklch(0.17 0.02 250)" />
        </radialGradient>
      </defs>

      <rect width="320" height="400" fill="url(#sz-room)" />
      {/* Classroom hints */}
      <rect x="18" y="150" width="54" height="130" rx="6" fill="oklch(0.24 0.03 250)" />
      <rect x="24" y="166" width="42" height="6" rx="3" fill="oklch(0.45 0.08 60)" />
      <rect x="24" y="206" width="42" height="6" rx="3" fill="oklch(0.42 0.07 160)" />
      <rect x="24" y="246" width="42" height="6" rx="3" fill="oklch(0.40 0.06 250)" />
      <circle cx="272" cy="120" r="34" fill="oklch(0.26 0.04 90)" opacity="0.6" />

      {/* Whole figure: breathing / subtle body motion */}
      <g style={{ transformOrigin: "160px 380px", animation: `sz-body-${speaking ? "teach" : "idle"} 6s ease-in-out infinite` }}>
        {/* Torso + dupatta */}
        <path d="M96 400 C100 300 122 258 160 254 C198 258 220 300 224 400 Z" fill="url(#sz-kurta)" />
        <path d="M150 256 C168 300 176 350 178 400 L206 400 C204 340 192 292 172 254 Z" fill="url(#sz-dupatta)" opacity="0.9" />

        {/* LEFT arm (viewer left) */}
        <g
          style={{
            transformOrigin: "116px 282px",
            animation: speaking ? `sz-arm-l-${gesture} 2.6s ease-in-out infinite` : "sz-arm-l-rest 7s ease-in-out infinite",
          }}
        >
          <path d="M116 276 C96 300 88 330 90 356" stroke="url(#sz-kurta)" strokeWidth="26" strokeLinecap="round" fill="none" />
          <path d="M116 276 C98 298 92 322 92 342" stroke="url(#sz-skin)" strokeWidth="17" strokeLinecap="round" fill="none" opacity="0" />
          <circle cx="90" cy="358" r="12" fill="url(#sz-skin)" />
        </g>

        {/* RIGHT arm (viewer right) — the one that points at the board */}
        <g
          style={{
            transformOrigin: "204px 282px",
            animation: speaking ? `sz-arm-r-${gesture} 2.6s ease-in-out infinite` : "sz-arm-r-rest 7s ease-in-out infinite",
          }}
        >
          <path d="M204 276 C226 296 236 322 236 348" stroke="url(#sz-kurta)" strokeWidth="26" strokeLinecap="round" fill="none" />
          <g>
            <circle cx="237" cy="350" r="12.5" fill="url(#sz-skin)" />
            {/* index finger, visible when pointing */}
            <rect
              x="245"
              y="345"
              width="16"
              height="6"
              rx="3"
              fill="url(#sz-skin)"
              opacity={gesture === "point" ? 1 : 0}
            />
          </g>
        </g>

        {/* Neck */}
        <rect x="148" y="228" width="24" height="34" rx="12" fill="url(#sz-skin)" />

        {/* HEAD group: nods and tilts while talking */}
        <g
          style={{
            transformOrigin: "160px 240px",
            animation: speaking ? "sz-head-talk 4.2s ease-in-out infinite" : "sz-head-idle 9s ease-in-out infinite",
          }}
        >
          {/* hair back */}
          <path d="M118 190 C112 128 132 96 160 96 C188 96 208 128 202 190 C214 214 210 246 198 250 L122 250 C110 246 106 214 118 190 Z" fill="oklch(0.18 0.02 40)" />
          {/* face */}
          <ellipse cx="160" cy="176" rx="42" ry="50" fill="url(#sz-skin)" />
          {/* fringe */}
          <path d="M120 160 C126 118 142 104 160 104 C178 104 194 118 200 160 C186 138 174 132 160 132 C146 132 134 138 120 160 Z" fill="oklch(0.16 0.02 40)" />
          {/* bindi */}
          <circle cx="160" cy="140" r="3" fill="oklch(0.55 0.19 20)" />
          {/* eyes */}
          <g>
            <ellipse cx="144" cy="172" rx="7" ry={blink ? 0.9 : 4.6} fill="#26201d" />
            <ellipse cx="176" cy="172" rx="7" ry={blink ? 0.9 : 4.6} fill="#26201d" />
            <path d="M136 163 q8 -5 16 -1" stroke="oklch(0.2 0.02 40)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <path d="M168 162 q8 -4 16 1" stroke="oklch(0.2 0.02 40)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </g>
          {/* nose */}
          <path d="M160 178 q4 10 -3 12" stroke="oklch(0.55 0.06 50)" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* MOUTH — height follows the real voice amplitude */}
          <g style={{ transform: `translateY(${jaw}px)` }}>
            <ellipse cx="160" cy="203" rx={mouthRx} ry={mouthRy} fill="oklch(0.28 0.07 20)" />
            <ellipse cx="160" cy={203 - mouthRy * 0.45} rx={mouthRx * 0.8} ry={Math.max(0.6, mouthRy * 0.3)} fill="#f4e6e2" opacity={open > 0.25 ? 0.9 : 0} />
            <path
              d={`M${160 - mouthRx - 2} 203 q${mouthRx + 2} ${3 + open * 2} ${mouthRx * 2 + 4} 0`}
              stroke="oklch(0.42 0.08 20)"
              strokeWidth="1.6"
              fill="none"
            />
          </g>
          {/* cheeks warm up when she is speaking energetically */}
          <ellipse cx="132" cy="192" rx="9" ry="6" fill="oklch(0.62 0.10 30)" opacity={0.1 + open * 0.2} />
          <ellipse cx="188" cy="192" rx="9" ry="6" fill="oklch(0.62 0.10 30)" opacity={0.1 + open * 0.2} />

          {/* hair front strands */}
          <path d="M118 186 C112 224 118 244 124 250 L112 250 C104 236 104 208 110 184 Z" fill="oklch(0.17 0.02 40)" />
          <path d="M202 186 C208 224 202 244 196 250 L208 250 C216 236 216 208 210 184 Z" fill="oklch(0.17 0.02 40)" />
        </g>
      </g>
    </svg>
  );
}

/** Cycles teaching gestures so the teacher never repeats one motion for a whole lesson. */
export function useGestureCycle(speaking: boolean, pointing: boolean): Gesture {
  const [gesture, setGesture] = useState<Gesture>("rest");

  useEffect(() => {
    if (!speaking) {
      setGesture("rest");
      return;
    }
    const pool: Gesture[] = ["explain", "emphasize", "count", "explain", "point"];
    let i = 0;
    setGesture(pointing ? "point" : "explain");
    const id = setInterval(() => {
      i += 1;
      setGesture(pointing && i % 2 === 0 ? "point" : (pool[i % pool.length] as Gesture));
    }, 2600);
    return () => clearInterval(id);
  }, [speaking, pointing]);

  return gesture;
}
