import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Crown, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/studyzen/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getAccount } from "@/lib/studyzen.functions";
import { FREE_DAILY_QUESTIONS, LANGUAGES } from "@/lib/studyzen";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/classroom", label: { en: "Classroom", te: "క్లాస్‌రూమ్" } },
  { to: "/notes", label: { en: "Notes", te: "నోట్స్" } },
  { to: "/history", label: { en: "History", te: "చరిత్ర" } },
  { to: "/profile", label: { en: "Profile", te: "ప్రొఫైల్" } },
] as const;

export function useAccount() {
  const fn = useServerFn(getAccount);
  return useQuery({ queryKey: ["account"], queryFn: () => fn() });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const account = useAccount();
  const plan = account.data?.plan;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/classroom" className="shrink-0">
            <Logo size={40} withWordmark priority />
          </Link>

          <nav className="order-3 flex w-full gap-1 overflow-x-auto lg:order-none lg:ml-6 lg:w-auto">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-primary/15 text-primary" }}
              >
                {item.label[language]}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-full border border-border/70 p-0.5">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    language === l.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.native}
                </button>
              ))}
            </div>

            {plan ? (
              plan.isPro ? (
                <span className="hidden items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1 text-xs text-gold sm:inline-flex">
                  <Crown className="size-3.5" /> {plan.plan === "trial" ? "Trial" : "Pro"}
                </span>
              ) : (
                <span className="hidden rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground sm:inline-block">
                  {plan.questionsLeft}/{FREE_DAILY_QUESTIONS}{" "}
                  {language === "te" ? "ప్రశ్నలు మిగిలాయి" : "questions left"}
                </span>
              )
            ) : null}

            <Button asChild size="sm" variant="secondary" className="border border-gold/40 text-gold">
              <Link to="/pro">
                <Crown className="size-4" /> {language === "te" ? "ప్రో" : "Go Pro"}
              </Link>
            </Button>

            <Button
              size="icon"
              variant="ghost"
              title={user?.email ?? "Sign out"}
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await signOut();
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1400px] px-4 py-6">{children}</main>
    </div>
  );
}
