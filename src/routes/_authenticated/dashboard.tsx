import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, MessageCircleQuestion, NotebookPen, Sparkles } from "lucide-react";

import { useAccount } from "@/components/studyzen/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StudyZen" },
      {
        name: "description",
        content: "Your StudyZen learning dashboard: continue a lesson, see topics studied, questions asked and recent activity.",
      },
      { property: "og:title", content: "Dashboard — StudyZen" },
      { property: "og:description", content: "Continue learning with your personal AI teacher." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const account = useAccount();
  const stats = account.data?.stats;
  const name = account.data?.profile.displayName || user?.email?.split("@")[0] || "student";
  const last = stats?.recent?.[0];

  return (
    <div className="space-y-6">
      <header className="glass-card rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">
          {language === "te" ? "స్వాగతం" : "Welcome back"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
          {language === "te" ? `హాయ్, ${name}` : `Hi ${name}, ready for class?`}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {language === "te"
            ? "ఏదైనా అడగండి — మీ ఉపాధ్యాయురాలు మాట్లాడుతూ, బోర్డు మీద రాస్తూ నేర్పిస్తారు."
            : "Ask anything. Your teacher explains it out loud in simple English and writes the key points on the board."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/classroom">{language === "te" ? "క్లాస్ మొదలుపెట్టండి" : "Start a lesson"}</Link>
          </Button>
          {last ? (
            <Button asChild variant="secondary">
              <Link to="/classroom" search={{ lesson: last.id }}>
                {language === "te" ? "కొనసాగించండి" : `Continue: ${last.topic}`}
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      {account.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your progress…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              icon={<BookOpen className="size-4" />}
              label={language === "te" ? "అంశాలు" : "Topics studied"}
              value={stats?.topicsStudied ?? 0}
            />
            <Stat
              icon={<MessageCircleQuestion className="size-4" />}
              label={language === "te" ? "ప్రశ్నలు" : "Questions asked"}
              value={stats?.questionsAsked ?? 0}
            />
            <Stat
              icon={<NotebookPen className="size-4" />}
              label={language === "te" ? "నోట్స్" : "Notes made"}
              value={stats?.notesCount ?? 0}
            />
          </div>

          <section className="glass-card rounded-3xl p-6">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="size-4 text-gold" />
              {language === "te" ? "ఇటీవలి అభ్యాసం" : "Recent learning"}
            </h2>
            {stats?.recent?.length ? (
              <ul className="mt-3 divide-y divide-border/60">
                {stats.recent.map((lesson) => (
                  <li key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{lesson.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.subject ? `${lesson.subject} · ` : ""}
                        {new Date(lesson.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/classroom" search={{ lesson: lesson.id }}>
                        {language === "te" ? "తెరవండి" : "Open"}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                {language === "te"
                  ? "ఇంకా పాఠాలు లేవు — మొదటి ప్రశ్న అడగండి."
                  : "No lessons yet — ask your first question in the classroom."}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
