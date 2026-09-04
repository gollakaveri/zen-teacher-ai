import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bookmark } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { listBookmarks } from "@/lib/studyzen.functions";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({
    meta: [
      { title: "Bookmarks — StudyZen" },
      { name: "description", content: "Your saved StudyZen lessons, ready to reopen and revise any time." },
      { property: "og:title", content: "Bookmarks — StudyZen" },
      { property: "og:description", content: "Saved lessons you can reopen in the AI classroom." },
    ],
  }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { language } = useLanguage();
  const fn = useServerFn(listBookmarks);
  const bookmarks = useQuery({ queryKey: ["bookmarks"], queryFn: () => fn() });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{language === "te" ? "బుక్‌మార్క్‌లు" : "Bookmarked lessons"}</h1>
      {bookmarks.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {bookmarks.data?.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <Bookmark className="mx-auto size-6 text-gold" />
          <p className="mt-2 text-sm text-muted-foreground">
            {language === "te"
              ? "క్లాస్‌రూమ్‌లో పాఠాన్ని బుక్‌మార్క్ చేయండి — ఇక్కడ కనిపిస్తుంది."
              : "Tap Bookmark during a lesson and it will show up here."}
          </p>
          <Button asChild variant="secondary" className="mt-4">
            <Link to="/classroom">{language === "te" ? "క్లాస్‌రూమ్" : "Go to classroom"}</Link>
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {bookmarks.data?.map((lesson) => (
          <div key={lesson.id} className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-gold">{lesson.subject ?? "Lesson"}</p>
            <h2 className="mt-1 font-semibold">{lesson.topic}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(lesson.updatedAt).toLocaleString()}
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-3">
              <Link to="/classroom" search={{ lesson: lesson.id }}>
                {language === "te" ? "మళ్ళీ తెరవండి" : "Reopen lesson"}
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
