import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Belle Careers — Help With Job Applications" },
      { name: "description", content: "An easy AI helper for your CV, cover letters, emails, planning, and company research." },
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
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Help with your job search</p>
        <div className="gold-rule mx-auto my-6 w-24" />
        <h1 className="font-display text-6xl leading-[1.05] md:text-7xl">
          Apply for jobs with <em>Belle</em> — your AI helper.
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-base text-muted-foreground">
          Belle writes your cover letters, improves your CV for any job, drafts the right email,
          and helps you plan your week. Simple tools for everyone, anywhere.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login">
            <Button size="lg" className="px-8">Get started</Button>
          </Link>
        </div>

        <div className="mt-24 grid gap-8 text-left md:grid-cols-2">
          {[
            ["Write Job Emails", "Get a clear, polite email for any job — to apply, follow up, or say thank you."],
            ["Improve Your CV", "Make your CV match the job. Easy to read for people and for hiring software."],
            ["Make Cover Letters", "A friendly letter that fits the job and shows why you are a good match."],
            ["Plan Your Week", "A simple weekly plan so you never miss a deadline."],
            ["Research Companies", "A short, easy report about any company before your interview."],
            ["All In One Place", "All your chats and drafts saved on every device you use."],
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
