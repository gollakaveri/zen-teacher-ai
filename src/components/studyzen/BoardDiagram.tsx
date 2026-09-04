import type { BoardItem } from "@/lib/studyzen";

/**
 * Chalk-style diagram drawn on the board from the teaching turn:
 * flow steps become boxes joined by arrows, formulas/labels sit underneath.
 * Each node draws itself in as the teacher explains it.
 */
export function BoardDiagram({ flow, labels }: { flow: string[]; labels: string[] }) {
  const boxH = 46;
  const gap = 26;
  const width = 300;
  const height = flow.length * boxH + Math.max(0, flow.length - 1) * gap + 24;

  return (
    <div className="animate-chalk rounded-xl border border-board-chalk/25 p-3">
      <p className="font-chalk mb-1 text-lg text-board-chalk/80">Diagram</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Lesson diagram">
        <defs>
          <marker id="sz-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <g className="text-board-chalk" stroke="currentColor" fill="none">
          {flow.map((step, i) => {
            const y = 12 + i * (boxH + gap);
            return (
              <g key={`${i}-${step}`} style={{ animation: `sz-chalk-write .6s ease-out ${i * 0.25}s both` }}>
                <rect
                  x="10"
                  y={y}
                  width={width - 20}
                  height={boxH}
                  rx="10"
                  strokeWidth="1.6"
                  strokeDasharray="3 2"
                  opacity="0.85"
                />
                <text
                  x={width / 2}
                  y={y + boxH / 2 + 7}
                  textAnchor="middle"
                  stroke="none"
                  fill="currentColor"
                  className="font-chalk"
                  style={{ fontSize: 19 }}
                >
                  {step.length > 30 ? `${step.slice(0, 29)}…` : step}
                </text>
                {i < flow.length - 1 ? (
                  <line
                    x1={width / 2}
                    y1={y + boxH}
                    x2={width / 2}
                    y2={y + boxH + gap - 4}
                    strokeWidth="2"
                    markerEnd="url(#sz-arrow)"
                  />
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>
      {labels.length ? (
        <ul className="font-chalk mt-2 space-y-1 text-lg text-gold">
          {labels.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function splitBoard(items: BoardItem[]) {
  const flow = items.filter((i) => i.kind === "flow").map((i) => i.text);
  const labels = items.filter((i) => i.kind === "diagram").map((i) => i.text);
  const text = items.filter((i) => i.kind !== "flow" && i.kind !== "diagram");
  return { flow, labels, text };
}
