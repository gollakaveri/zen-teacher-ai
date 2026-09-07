import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/studyzen/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { clearHistory, deleteLesson, listLessons } from "@/lib/studyzen.functions";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Lesson History — StudyZen" },
      { name: "description", content: "Reopen any past StudyZen lesson and continue learning where you stopped." },
      { property: "og:title", content: "Lesson History — StudyZen" },
      { property: "og:description", content: "Reopen any past lesson and continue where you stopped." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { language } = useLanguage();
  const fn = useServerFn(listLessons);
  const deleteFn = useServerFn(deleteLesson);
  const clearFn = useServerFn(clearHistory);
  const queryClient = useQueryClient();
  const lessons = useQuery({ queryKey: ["lessons"], queryFn: () => fn() });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["lessons"] });
    void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    void queryClient.invalidateQueries({ queryKey: ["account"] });
  }

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Lesson removed from history.");
    },
    onError: () => toast.error("Could not delete this lesson. Please try again."),
  });

  const clearAll = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      refresh();
      toast.success("History cleared.");
    },
    onError: () => toast.error("Could not clear your history. Please try again."),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{language === "te" ? "నా పాఠాలు" : "My lessons"}</h1>
        {lessons.data?.length ? (
          <ConfirmDialog
            title="Are you sure you want to clear your entire history?"
            description="All saved lessons will be permanently removed. Your notes stay saved."
            confirmLabel="Clear History"
            onConfirm={() => clearAll.mutate()}
            trigger={
              <Button variant="secondary" size="sm" aria-label="Clear all lesson history">
                <Trash2 className="mr-2 size-4" /> Clear history
              </Button>
            }
          />
        ) : null}
      </div>
      {lessons.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {lessons.data?.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <HistoryIcon className="mx-auto size-6 text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">No lessons yet. Your classroom awaits.</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link to="/classroom">Start a lesson</Link>
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {lessons.data?.map((l) => (
          <div key={l.id} className="glass-card group relative rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
            <Link to="/classroom" search={{ lesson: l.id }} className="block pr-9">
              <p className="text-xs uppercase tracking-[0.16em] text-gold">{l.subject ?? "Lesson"}</p>
              <h2 className="mt-1 line-clamp-2 font-medium">{l.topic}</h2>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(l.updatedAt).toLocaleString()} · {l.turnCount} turns · {l.language.toUpperCase()}
              </p>
            </Link>
            <div className="absolute right-2 top-2">
              <ConfirmDialog
                title="Delete this lesson?"
                description="It will be removed from your history and bookmarks."
                confirmLabel="Delete"
                onConfirm={() => remove.mutate(l.id)}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete lesson ${l.topic}`}
                    title="Delete lesson"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
