import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, NotebookPen } from "lucide-react";

import { useAccount } from "@/components/studyzen/AppShell";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { StudyNotes } from "@/lib/studyzen";
import { listNotes } from "@/lib/studyzen.functions";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Study Notes — StudyZen" },
      {
        name: "description",
        content: "Exam-ready study notes written from your StudyZen lessons: definitions, formulas, examples and revision.",
      },
      { property: "og:title", content: "Study Notes — StudyZen" },
      { property: "og:description", content: "Exam-ready notes generated from your live AI lessons." },
    ],
  }),
  component: NotesPage,
});

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="text-xs uppercase tracking-[0.16em] text-gold">{title}</h4>
      <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
        {items.map((t, i) => (
          <li key={i}>• {t}</li>
        ))}
      </ul>
    </div>
  );
}

function NotesPage() {
  const { language } = useLanguage();
  const account = useAccount();
  const isPro = account.data?.plan.isPro ?? false;
  const fn = useServerFn(listNotes);
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => fn(), enabled: isPro });

  if (account.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  if (!isPro) {
    return (
      <div className="glass-card mx-auto max-w-xl rounded-3xl border-gold/40 p-8 text-center">
        <Crown className="mx-auto size-8 text-gold" />
        <h1 className="mt-3 text-2xl font-semibold">
          {language === "te" ? "నోట్స్ ప్రో ఫీచర్" : "Study Notes is a Pro feature"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {language === "te"
            ? "మీ పాఠాల నుండి పరీక్షలకు సిద్ధంగా ఉండే నోట్స్ — నిర్వచనాలు, సూత్రాలు, ఉదాహరణలు, రివిజన్."
            : "Turn every lesson into clean, exam-ready notes — definitions, formulas, worked examples, flow and revision lists. Not a copy of the chat."}
        </p>
        <Button asChild className="mt-5">
          <Link to="/pro">Try Pro for 2 days — ₹2</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{language === "te" ? "నా నోట్స్" : "My study notes"}</h1>
      {notes.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {notes.data?.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <NotebookPen className="mx-auto size-6 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">
            Finish a lesson in the classroom, then tap “Make notes”.
          </p>
          <Button asChild variant="secondary" className="mt-4">
            <Link to="/classroom">Go to classroom</Link>
          </Button>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {notes.data?.map((n) => {
          const c = JSON.parse(n.content) as StudyNotes;
          return (
            <article key={n.id} className="glass-card space-y-4 rounded-3xl p-5">
              <header>
                <h2 className="text-lg font-semibold">{c.topic || n.topic}</h2>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()} · {n.language.toUpperCase()}
                </p>
              </header>
              <p className="text-sm">{c.summary}</p>
              {c.definitions?.length ? (
                <div>
                  <h4 className="text-xs uppercase tracking-[0.16em] text-gold">Definitions</h4>
                  <ul className="mt-1.5 space-y-1 text-sm text-muted-foreground">
                    {c.definitions.map((d, i) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">{d.term}</span> — {d.meaning}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Section title="Key points" items={c.keyPoints} />
              <Section title="Formulas" items={c.formulas} />
              <Section title="Examples" items={c.examples} />
              <Section title="Flow" items={c.flow} />
              <Section title="Quick revision" items={c.revision} />
              <Section title="Practice" items={c.practice} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
