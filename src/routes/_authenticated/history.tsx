import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { History as HistoryIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { listLessons } from "@/lib/studyzen.functions";

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
  const lessons = useQuery({ queryKey: ["lessons"], queryFn: () => fn() });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{language === "te" ? "నా పాఠాలు" : "My lessons"}</h1>
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
          <Link
            key={l.id}
            to="/classroom"
            search={{ lesson: l.id }}
            className="glass-card rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-gold">{l.subject ?? "Lesson"}</p>
            <h2 className="mt-1 line-clamp-2 font-medium">{l.topic}</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              {new Date(l.updatedAt).toLocaleString()} · {l.turnCount} turns · {l.language.toUpperCase()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
