import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Belle Careers — AI Job Application Atelier" },
      { name: "description", content: "An elegant AI atelier for tailored CVs, cover letters, outreach emails, planning, and company research." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/app" });
      else setChecking(false);
    });
  }, [navigate]);

  if (checking) return <div className="min-h-screen bg-background" />;

  return (
    <div className="relative min-h-screen bg-background">
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-auto" />
          <span className="font-display text-xl tracking-wide">Belle Careers</span>
        </div>
        <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-8 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">The art of the application</p>
        <div className="gold-rule mx-auto my-6 w-24" />
        <h1 className="font-display text-6xl leading-[1.05] md:text-7xl">
          Apply with <em>Belle</em> — your AI atelier for the job search.
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-base text-muted-foreground">
          Belle composes cover letters, tailors your CV to any role, drafts the perfect email,
          and orchestrates your week. Elegant tools for a confident career.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="px-8">Begin</Button>
          </Link>
        </div>

        <div className="mt-24 grid gap-8 text-left md:grid-cols-2">
          {[
            ["Smart Email Generator", "Polished outreach, follow-ups, and thank-you notes — drafted in your voice."],
            ["CV Tailoring", "Reshape your CV to mirror any role, optimised for both recruiters and ATS."],
            ["Cover Letter Atelier", "Bespoke letters that read like you wrote them on your best day."],
            ["AI Task Planner", "A weekly application schedule, kept on tempo with quiet discipline."],
            ["Research Assistant", "Concise briefs on any company, prepared before your interview."],
            ["One Cabinet", "Every conversation and draft, kept across devices."],
          ].map(([title, body]) => (
            <div key={title} className="border-l border-border pl-4">
              <h3 className="font-display text-2xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
