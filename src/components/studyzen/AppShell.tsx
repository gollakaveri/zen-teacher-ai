import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Logo } from "@/components/studyzen/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getAccount } from "@/lib/studyzen.functions";
import { LANGUAGES } from "@/lib/studyzen";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: { en: "Dashboard", te: "డాష్‌బోర్డ్" } },
  { to: "/classroom", label: { en: "Classroom", te: "క్లాస్‌రూమ్" } },
  { to: "/notes", label: { en: "Notes", te: "నోట్స్" } },
  { to: "/history", label: { en: "History", te: "చరిత్ర" } },
  { to: "/bookmarks", label: { en: "Bookmarks", te: "బుక్‌మార్క్‌లు" } },
  { to: "/profile", label: { en: "Profile", te: "ప్రొఫైల్" } },
] as const;

export function useAccount() {
  const fn = useServerFn(getAccount);
  return useQuery({ queryKey: ["account"], queryFn: () => fn() });
}

export function AppShell({ children }: { children: ReactNode }) {
  const { language, boardLanguage, setLanguage, setBoardLanguage, applyTeluguTeachingEnglishBoard } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="shrink-0">
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
            <div className="flex items-center gap-1.5">
              <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground xl:inline">
                Voice
              </span>
              <div className="flex rounded-full border border-border/70 p-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      language === l.code
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
              <span className="hidden text-[10px] uppercase tracking-wider text-muted-foreground xl:inline">
                Board
              </span>
              <div className="flex rounded-full border border-border/70 p-0.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setBoardLanguage(l.code)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                      boardLanguage === l.code
                        ? "bg-gold text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l.native}
                  </button>
                ))}
              </div>
              <button
                onClick={applyTeluguTeachingEnglishBoard}
                className="hidden rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground 2xl:inline-block"
                title="Telugu teaching + English board"
              >
                తెలుగు + English board
              </button>
            </div>

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
