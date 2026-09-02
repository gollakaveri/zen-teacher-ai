import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAccount } from "@/components/studyzen/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { FREE_DAILY_QUESTIONS, LANGUAGES } from "@/lib/studyzen";
import { savePreferences } from "@/lib/studyzen.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — StudyZen" },
      { name: "description", content: "Your StudyZen account: name, teaching language, plan and daily usage." },
      { property: "og:title", content: "Profile — StudyZen" },
      { property: "og:description", content: "Your StudyZen account, teaching language and plan." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { language, setLanguage } = useLanguage();
  const account = useAccount();
  const queryClient = useQueryClient();
  const saveFn = useServerFn(savePreferences);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (account.data?.profile.displayName) setName(account.data.profile.displayName);
  }, [account.data?.profile.displayName]);

  const plan = account.data?.plan;

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: { displayName: name, language } });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <section className="glass-card space-y-4 rounded-3xl p-6">
        <div className="space-y-1.5">
          <Label htmlFor="pname">Display name</Label>
          <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <p className="text-sm text-muted-foreground">{user?.email ?? "—"}</p>
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

      <section className="glass-card space-y-3 rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Plan</h2>
            <p className="text-sm text-muted-foreground">
              {plan?.isPro
                ? plan.plan === "trial"
                  ? `Trial active${plan.trialEndsAt ? ` until ${new Date(plan.trialEndsAt).toLocaleDateString()}` : ""}`
                  : "Pro — unlimited teaching, notes and voice"
                : `Free — ${plan?.questionsLeft ?? FREE_DAILY_QUESTIONS} of ${FREE_DAILY_QUESTIONS} questions left today`}
            </p>
          </div>
          {plan?.isPro ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">
              <Crown className="size-3.5" /> {plan.plan === "trial" ? "Trial" : "Pro"}
            </span>
          ) : (
            <Button asChild size="sm">
              <Link to="/pro">Go Pro</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
