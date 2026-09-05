import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAccount } from "@/components/studyzen/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/studyzen";
import { savePreferences } from "@/lib/studyzen.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — StudyZen" },
      { name: "description", content: "Your StudyZen account: name, teaching language, learning progress and recent activity." },
      { property: "og:title", content: "Profile — StudyZen" },
      { property: "og:description", content: "Your StudyZen account, learning progress and activity." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { language, setLanguage } = useLanguage();
  const account = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const saveFn = useServerFn(savePreferences);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (account.data?.profile.displayName) setName(account.data.profile.displayName);
  }, [account.data?.profile.displayName]);

  const stats = account.data?.stats;
  const email = user?.email ?? "—";
  const initials = (name || email).slice(0, 2).toUpperCase();

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: { displayName: name, language } });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("Profile updated.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    if (password.length < 6) {
      toast.error("Please use at least 6 characters for your new password.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
        ...(currentPassword ? { current_password: currentPassword } : {}),
      } as Parameters<typeof supabase.auth.updateUser>[0]);
      if (error) throw error;
      setPassword("");
      setCurrentPassword("");
      toast.success("Password changed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      toast.error(
        /current password/i.test(message)
          ? "Your current password is not correct."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setPwBusy(false);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="glass-card flex items-center gap-4 rounded-3xl p-6">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-xl font-semibold text-primary">
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{name || "Your profile"}</h1>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Topics studied", value: stats?.topicsStudied ?? 0 },
          { label: "Questions asked", value: stats?.questionsAsked ?? 0 },
          { label: "Notes made", value: stats?.notesCount ?? 0 },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="glass-card space-y-4 rounded-3xl p-6">
        <h2 className="font-semibold">Edit profile</h2>
        <div className="space-y-1.5">
          <Label htmlFor="pname">Display name</Label>
          <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-2">
          <Label>Teaching language</Label>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  language === l.code
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                {l.native}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </section>

      <section className="glass-card space-y-4 rounded-3xl p-6">
        <h2 className="font-semibold">Change password</h2>
        <div className="space-y-1.5">
          <Label htmlFor="cpw">Current password</Label>
          <Input
            id="cpw"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="npw">New password</Label>
          <Input
            id="npw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
          />
        </div>
        <Button variant="secondary" onClick={() => void changePassword()} disabled={pwBusy}>
          {pwBusy ? "Updating…" : "Update password"}
        </Button>
      </section>

      <section className="glass-card space-y-3 rounded-3xl p-6">
        <h2 className="font-semibold">Recent activity</h2>
        {stats?.recent?.length ? (
          <ul className="divide-y divide-border/60 text-sm">
            {stats.recent.map((lesson) => (
              <li key={lesson.id} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{lesson.topic}</span>
                <Link
                  to="/classroom"
                  search={{ lesson: lesson.id }}
                  className="shrink-0 text-xs text-primary hover:underline"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No lessons yet.</p>
        )}
      </section>

      <Button variant="ghost" className="w-full" onClick={() => void handleSignOut()}>
        <LogOut className="mr-2 size-4" /> Log out
      </Button>
    </div>
  );
}
