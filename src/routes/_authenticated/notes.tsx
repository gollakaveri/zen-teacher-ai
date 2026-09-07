import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAccount } from "@/components/studyzen/AppShell";
import { ConfirmDialog } from "@/components/studyzen/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import type { StudyNotes } from "@/lib/studyzen";
import { clearNotes, deleteNote, listNotes } from "@/lib/studyzen.functions";

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
  const fn = useServerFn(listNotes);
  const removeFn = useServerFn(deleteNote);
  const queryClient = useQueryClient();
  const notes = useQuery({ queryKey: ["notes"], queryFn: () => fn() });
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("Note deleted.");
    },
    onError: () => toast.error("Could not delete this note. Please try again."),
  });
  const clearAllFn = useServerFn(clearNotes);
  const clearAll = useMutation({
    mutationFn: () => clearAllFn(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("All notes deleted.");
    },
    onError: () => toast.error("Could not clear your notes. Please try again."),
  });

  if (account.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{language === "te" ? "నా నోట్స్" : "My study notes"}</h1>
        {notes.data?.length ? (
          <ConfirmDialog
            title="Delete all notes?"
            description="Every saved note will be permanently removed. Your lessons stay in history."
            confirmLabel="Delete all"
            onConfirm={() => clearAll.mutate()}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Delete all saved notes">
                <Trash2 className="mr-2 size-4" /> Clear all notes
              </Button>
            }
          />
        ) : null}
      </div>
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
              <header className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold">{c.topic || n.topic}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString()} ·{" "}
                    {n.language === "te" ? "తెలుగులో Notes రూపొందించబడ్డాయి" : "Notes generated in English"}
                  </p>
                </div>
                <ConfirmDialog
                  title="Delete this note?"
                  description="This note will be permanently removed from your account."
                  confirmLabel="Delete"
                  onConfirm={() => remove.mutate(n.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete note ${c.topic || n.topic}`}
                      title="Delete note"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
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
