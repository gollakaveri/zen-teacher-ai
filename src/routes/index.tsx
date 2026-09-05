import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Mic, PenLine } from "lucide-react";
import { useEffect } from "react";

import { Logo } from "@/components/studyzen/Logo";
import teacher from "@/assets/teacher.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyZen — Your Personal AI Teacher, Live" },
      {
        name: "description",
        content:
          "StudyZen is a real AI classroom: a teacher who speaks, explains with real-life examples and writes on a digital blackboard. English and Telugu.",
      },
      { property: "og:title", content: "StudyZen — Your Personal AI Teacher, Live" },
      {
        property: "og:description",
        content: "A live AI teacher who speaks, questions you and writes on the board. English and Telugu.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: GraduationCap, title: "Taught, not typed", text: "Zen explains out loud, step by step, like a real class." },
  { icon: PenLine, title: "Living blackboard", text: "Key points appear progressively as she teaches them." },
  { icon: Mic, title: "Speak back", text: "Answer with your voice; she reacts and continues or re-explains." },
];

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo size={44} withWordmark priority />
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <section className="grid items-center gap-8 py-10 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              A real teacher. <span className="text-gold-gradient">Not a chatbot.</span>
            </h1>
            <p className="mt-4 text-muted-foreground">
              Ask anything. Zen starts teaching — speaking naturally, giving real-life examples, writing on the
              board and asking you questions until you truly understand. In English or తెలుగు.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Enter the classroom</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/auth">Create free account</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Every feature is free — unlimited questions, voice, board and notes.
            </p>
          </div>
          <img
            src={teacher}
            alt="Zen, the StudyZen AI teacher, in a dark classroom"
            className="animate-breathe rounded-3xl object-cover shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass-card rounded-3xl p-6">
              <f.icon className="size-6 text-primary" />
              <h2 className="mt-3 font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
