import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cabinet — AI Job Application Atelier" },
      { name: "description", content: "Tailor CVs, draft application emails, plan your search — with editorial polish." },
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
          <Logo className="h-9 w-9" />
          <span className="font-display text-xl tracking-wide">Cabinet</span>
        </div>
        <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-8 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">An editorial AI atelier</p>
        <div className="gold-rule mx-auto my-6 w-24" />
        <h1 className="font-display text-6xl leading-[1.05] md:text-7xl">
          Apply with the calm of a <em>Parisian</em> studio.
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-base text-muted-foreground">
          Cabinet drafts tailored cover letters, sharpens your CV against any job description,
          composes the perfect application email, and quietly keeps your calendar in order.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="px-8">Begin your folio</Button>
          </Link>
        </div>

        <div className="mt-24 grid gap-8 text-left md:grid-cols-2">
          {[
            ["Smart Email", "Application, follow-up, networking — phrased with the right tone for every recipient."],
            ["CV Tailoring", "ATS-friendly rewrites that mirror the role's language and surface your strongest work."],
            ["Cover Letters", "Unique, motivated letters that align your story with each company's voice."],
            ["Plan & Research", "A weekly schedule of deadlines and a quiet brief on every company before you interview."],
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
