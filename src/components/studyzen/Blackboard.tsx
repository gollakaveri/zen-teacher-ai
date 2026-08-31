import type { BoardItem } from "@/lib/studyzen";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  definition: "Definition",
  formula: "Formula",
  step: "Step",
  flow: "Flow",
  example: "Example",
  practical: "Real life",
  keyword: "Keyword",
  diagram: "Diagram",
  point: "",
  title: "",
};

function Item({ item }: { item: BoardItem }) {
  const label = KIND_LABEL[item.kind] ?? "";
  if (item.kind === "flow") {
    return (
      <div className="animate-rise flex items-center gap-2">
        <span className="rounded-lg border border-board-chalk/50 px-3 py-1 text-sm text-board-chalk">
          {item.text}
        </span>
        <span className="text-board-chalk/70">→</span>
      </div>
    );
  }
  if (item.kind === "formula" || item.kind === "diagram") {
    return (
      <pre className="animate-rise overflow-x-auto whitespace-pre-wrap rounded-lg border border-board-chalk/30 bg-board-chalk/5 px-3 py-2 font-mono text-sm text-board-chalk">
        {item.text}
      </pre>
    );
  }
  return (
    <div className="animate-rise flex gap-2 text-board-foreground">
      <span className="mt-1 text-board-chalk">•</span>
      <p className="text-[15px] leading-snug">
        {label ? <span className="mr-1.5 text-xs uppercase tracking-wider text-board-chalk">{label}:</span> : null}
        <span className={cn(item.kind === "keyword" && "font-semibold text-board-chalk")}>{item.text}</span>
      </p>
    </div>
  );
}

export function Blackboard({
  title,
  items,
  subject,
  language,
}: {
  title: string | null;
  items: BoardItem[];
  subject: string | null;
  language: "en" | "te";
}) {
  return (
    <section
      className="relative flex h-full min-h-[28rem] flex-col rounded-3xl border-[10px] border-[#4a3career]/0 p-0"
      aria-label="Digital blackboard"
    >
      <div className="flex h-full flex-col rounded-2xl border-[10px] border-[oklch(0.36_0.05_60)] bg-board shadow-[inset_0_0_120px_rgba(0,0,0,0.6)]">
        <header className="flex items-center justify-between border-b border-board-chalk/20 px-6 py-4">
          <div>
            <h2 className="font-[Sora] text-lg text-board-foreground">
              {title || (language === "te" ? "బ్లాక్‌బోర్డ్" : "Blackboard")}
            </h2>
            {subject ? (
              <p className="text-xs uppercase tracking-[0.2em] text-board-chalk/80">{subject}</p>
            ) : null}
          </div>
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-board-chalk/60" />
            <span className="size-3 rounded-full bg-gold/70" />
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <p className="text-sm text-board-chalk/60">
              {language === "te"
                ? "పాఠం మొదలైనప్పుడు ముఖ్యాంశాలు ఇక్కడ కనిపిస్తాయి."
                : "Key points will appear here as the teacher writes them."}
            </p>
          ) : (
            items.map((item, i) => <Item key={`${i}-${item.text}`} item={item} />)
          )}
        </div>
      </div>
    </section>
  );
}
