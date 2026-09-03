import type { BoardItem } from "@/lib/studyzen";
import type { LanguageCode } from "@/lib/studyzen";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  definition: "Definition",
  formula: "Formula",
  step: "Step",
  example: "Example",
  practical: "Real life",
  keyword: "Key word",
  diagram: "Diagram",
  point: "",
  title: "",
  flow: "",
};

function ChalkItem({ item, index }: { item: BoardItem; index: number }) {
  const label = KIND_LABEL[item.kind] ?? "";

  if (item.kind === "flow") {
    return (
      <div className="animate-chalk flex flex-col items-start">
        <span className="font-chalk rounded-md border border-board-chalk/40 px-3 py-1 text-xl text-board-chalk">
          {item.text}
        </span>
        <span className="ml-6 text-lg leading-none text-board-chalk/70">↓</span>
      </div>
    );
  }

  if (item.kind === "formula" || item.kind === "diagram") {
    return (
      <pre className="animate-chalk font-chalk overflow-x-auto whitespace-pre-wrap rounded-lg border border-board-chalk/25 px-3 py-2 text-xl text-gold">
        {item.text}
      </pre>
    );
  }

  if (item.kind === "definition") {
    return (
      <p className="animate-chalk font-chalk text-2xl leading-snug text-board-foreground">
        <span className="mr-2 text-board-chalk underline decoration-board-chalk/60 underline-offset-4">
          {label}:
        </span>
        {item.text}
      </p>
    );
  }

  return (
    <p
      className={cn(
        "animate-chalk font-chalk flex gap-2 text-2xl leading-snug text-board-foreground",
        item.kind === "keyword" && "text-gold",
        item.kind === "example" && "text-board-chalk",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
    >
      <span className="text-board-chalk">{item.kind === "step" ? `${index + 1}.` : "→"}</span>
      <span>
        {label && item.kind !== "point" && item.kind !== "step" ? (
          <span className="mr-1.5 text-board-chalk/80">{label}:</span>
        ) : null}
        {item.text}
      </span>
    </p>
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
  language: LanguageCode;
}) {
  return (
    <section className="flex h-full min-h-[24rem] flex-col" aria-label="Digital blackboard">
      <div
        className="flex h-full flex-col rounded-2xl border-[12px] border-[oklch(0.34_0.055_60)] bg-board shadow-[inset_0_0_140px_rgba(0,0,0,0.65),0_30px_70px_-40px_rgba(0,0,0,0.9)]"
        style={{
          backgroundImage:
            "radial-gradient(80% 60% at 30% 20%, rgba(255,255,255,0.035), transparent 70%), radial-gradient(70% 50% at 80% 80%, rgba(255,255,255,0.025), transparent 70%)",
        }}
      >
        <header className="flex items-start justify-between gap-3 px-6 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-board-chalk/70">Digital board</p>
            <h2 className="font-chalk mt-1 text-3xl text-gold underline decoration-gold/50 underline-offset-8">
              {title || (language === "te" ? "బ్లాక్‌బోర్డ్" : "Today's lesson")}
            </h2>
            {subject ? (
              <p className="font-chalk mt-1 text-lg text-board-chalk/80">{subject}</p>
            ) : null}
          </div>
          <div className="flex gap-1.5 pt-1">
            <span className="size-3 rounded-full bg-gold/70" />
            <span className="size-3 rounded-full bg-board-chalk/60" />
            <span className="size-3 rounded-full bg-board-chalk/30" />
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <p className="font-chalk text-xl text-board-chalk/60">
              {language === "te"
                ? "పాఠం మొదలైనప్పుడు ముఖ్యాంశాలు ఇక్కడ రాయబడతాయి."
                : "Key points get written here while the teacher explains."}
            </p>
          ) : (
            items.map((item, i) => <ChalkItem key={`${i}-${item.text}`} item={item} index={i} />)
          )}
        </div>
      </div>
    </section>
  );
}
