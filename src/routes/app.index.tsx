import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createThread, listThreads } from "@/lib/threads.functions";
import { Logo } from "@/components/logo";

export const Route = createFileRoute("/app/")({
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();
  const list = useServerFn(listThreads);
  const create = useServerFn(createThread);

  useEffect(() => {
    (async () => {
      const existing = await list();
      if (existing.length > 0) {
        navigate({ to: "/app/$threadId", params: { threadId: existing[0].id }, replace: true });
      } else {
        const t = await create();
        navigate({ to: "/app/$threadId", params: { threadId: t.id }, replace: true });
      }
    })();
  }, [navigate, list, create]);

  return (
    <div className="flex h-full items-center justify-center">
      <Logo className="h-10 w-10 animate-pulse" />
    </div>
  );
}
