import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/threads.functions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Plus, Trash2, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/login" });
      else setReady(true);
    });
  }, [navigate]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <main className="relative flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}

function Sidebar() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const del = useServerFn(deleteThread);

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => list() });
  const createMut = useMutation({
    mutationFn: () => create(),
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/app/$threadId", params: { threadId: t.id } });
    },
  });
  const deleteMut = useMutation({
    mutationFn: (threadId: string) => del({ data: { threadId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 py-5">
        <Logo className="h-10 w-auto" />
        <div>
          <div className="font-display text-lg leading-none">Belle Careers</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Atelier</div>
        </div>
      </div>
      <div className="gold-rule mx-5" />
      <div className="px-3 py-4">
        <Button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="w-full justify-start gap-2"
          variant="default"
        >
          <Plus className="h-4 w-4" /> New conversation
        </Button>
      </div>

      <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Folio</div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {threads.data?.length === 0 && (
          <p className="px-3 py-6 text-xs italic text-muted-foreground">No conversations yet.</p>
        )}
        <ul className="space-y-1">
          {threads.data?.map((t) => {
            const active = pathname === `/app/${t.id}`;
            return (
              <li key={t.id} className="group flex items-center">
                <Link
                  to="/app/$threadId"
                  params={{ threadId: t.id }}
                  className={cn(
                    "flex-1 truncate rounded-md px-3 py-2 text-sm",
                    active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/60",
                  )}
                >
                  {t.title}
                </Link>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate(t.id)}
                  className="ml-1 hidden rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:block"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
