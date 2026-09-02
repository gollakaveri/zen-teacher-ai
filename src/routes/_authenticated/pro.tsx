import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAccount } from "@/components/studyzen/AppShell";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { requestPlanChange } from "@/lib/studyzen.functions";

export const Route = createFileRoute("/_authenticated/pro")({
  head: () => ({
    meta: [
      { title: "StudyZen Pro — Unlimited AI Teaching" },
      {
        name: "description",
        content: "StudyZen Pro: unlimited lessons, exam-ready notes and teacher voice for ₹100/month. Try 2 days for ₹2.",
      },
      { property: "og:title", content: "StudyZen Pro — Unlimited AI Teaching" },
      { property: "og:description", content: "Unlimited lessons, notes and voice for ₹100/month." },
    ],
  }),
  component: ProPage,
});

const BENEFITS = [
  "Unlimited questions every day",
  "Exam-ready study notes from every lesson",
  "Full teacher voice in English and Telugu",
  "Lesson history and re-open any topic",
  "Priority teaching responses",
];

function ProPage() {
  const { language } = useLanguage();
  const account = useAccount();
  const queryClient = useQueryClient();
  const fn = useServerFn(requestPlanChange);
  const [busy, setBusy] = useState<"trial" | "pro" | null>(null);

  async function choose(plan: "trial" | "pro") {
    setBusy(plan);
    try {
      const result = await fn({ data: { plan } });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      // INTEGRATION POINT: when a payment provider is connected, redirect to
      // its checkout here instead of showing this message.
      toast.info(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout.");
    } finally {
      setBusy(null);
    }
  }

  const isPro = account.data?.plan.isPro ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="text-center">
        <Crown className="mx-auto size-8 text-gold" />
        <h1 className="mt-3 text-3xl font-semibold">
          Study<span className="text-gold-gradient">Zen</span> Pro
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {language === "te"
            ? "అపరిమిత బోధన, నోట్స్ మరియు ఉపాధ్యాయ స్వరం."
            : "Your teacher, without limits — unlimited lessons, notes and voice."}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass-card rounded-3xl border-gold/40 p-6">
          <h2 className="text-lg font-semibold">Try Pro for 2 days — ₹2</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Full Pro access for 48 hours so you can feel the difference.
          </p>
          <Button className="mt-5 w-full" disabled={isPro || busy !== null} onClick={() => void choose("trial")}>
            {busy === "trial" ? "Please wait…" : "Start ₹2 trial"}
          </Button>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-lg font-semibold">Pro — ₹100 / month</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cancel anytime. Billed monthly.</p>
          <Button
            variant="secondary"
            className="mt-5 w-full"
            disabled={isPro || busy !== null}
            onClick={() => void choose("pro")}
          >
            {busy === "pro" ? "Please wait…" : "Upgrade to Pro"}
          </Button>
        </section>
      </div>

      <ul className="glass-card space-y-2 rounded-3xl p-6 text-sm">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> {b}
          </li>
        ))}
      </ul>

      <p className="text-center text-xs text-muted-foreground">
        Payments are not connected yet, so nothing is charged. The upgrade endpoint is ready for a real
        provider (Stripe / Razorpay) webhook.
      </p>
    </div>
  );
}
