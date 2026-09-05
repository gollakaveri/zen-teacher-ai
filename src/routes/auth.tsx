import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/studyzen/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to StudyZen — AI Classroom" },
      {
        name: "description",
        content: "Log in or create your StudyZen account to learn with a live AI teacher in English or Telugu.",
      },
      { property: "og:title", content: "Sign in to StudyZen — AI Classroom" },
      {
        property: "og:description",
        content: "Log in or create your StudyZen account to learn with a live AI teacher.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to StudyZen!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-md rounded-3xl p-7">
        <Link to="/" className="mb-6 flex justify-center">
          <Logo size={64} withWordmark priority />
        </Link>
        <h1 className="text-center text-2xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Your personal AI teacher is waiting in the classroom.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="secondary" className="w-full" onClick={google}>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "New to StudyZen?" : "Already have an account?"}{" "}
          <button
            className="font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Create an account" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
