import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getThreadMessages } from "@/lib/threads.functions";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ArrowUp, Mail, FileText, Calendar, Search, PenTool } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/app/$threadId")({
  component: ChatPage,
});

const SUGGESTIONS = [
  { icon: Mail, label: "Draft application email", prompt: "Help me draft a professional application email." },
  { icon: FileText, label: "Tailor my CV", prompt: "Tailor my CV for a job description I'll paste." },
  { icon: PenTool, label: "Write a cover letter", prompt: "Write a personalized cover letter for a role." },
  { icon: Calendar, label: "Plan my week", prompt: "Create a weekly job application schedule." },
  { icon: Search, label: "Research a company", prompt: "Research a company before my interview." },
];

function ChatPage() {
  const { threadId } = Route.useParams();
  return <ChatInstance key={threadId} threadId={threadId} />;
}

function ChatInstance({ threadId }: { threadId: string }) {
  const qc = useQueryClient();
  const fetchMessages = useServerFn(getThreadMessages);
  const initial = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => fetchMessages({ data: { threadId } }),
  });

  if (initial.isLoading || !initial.data) {
    return <div className="flex h-full items-center justify-center"><Logo className="h-8 w-8 animate-pulse" /></div>;
  }

  return (
    <ChatBody
      threadId={threadId}
      initialMessages={initial.data.messages as unknown as UIMessage[]}
      onTitleChange={() => qc.invalidateQueries({ queryKey: ["threads"] })}
    />
  );
}

function ChatBody({ threadId, initialMessages, onTitleChange }: {
  threadId: string; initialMessages: UIMessage[]; onTitleChange: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transport = new DefaultChatTransport({
    api: "/api/chat",
    body: { threadId },
    prepareSendMessagesRequest: async ({ messages }) => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      return { body: { messages, threadId }, headers };
    },
  });

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: () => onTitleChange(),
  });

  useEffect(() => { inputRef.current?.focus(); }, [threadId, status]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const submit = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");
    await sendMessage({ text: text.trim() });
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border px-6 py-4">
        <Logo className="h-6 w-6" />
        <span className="font-display text-lg">Cabinet</span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">— Atelier</span>
      </header>

      <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          {empty ? (
            <div className="py-12 text-center">
              <div className="mx-auto inline-flex"><Logo className="h-14 w-14" /></div>
              <div className="gold-rule mx-auto my-6 w-24" />
              <h2 className="font-display text-4xl">How may I help today?</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Tailor a CV, draft an email, write a cover letter — or plan your week.
              </p>
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => submit(s.prompt)}
                    className="group flex items-start gap-3 rounded-md border border-border bg-card p-4 text-left transition hover:border-[var(--gold)]"
                  >
                    <s.icon className="mt-0.5 h-4 w-4 text-[var(--gold)]" />
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.prompt}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((m) => (
                <MessageView key={m.id} message={m} />
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="text-sm italic text-muted-foreground">Composing…</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 border-t border-border bg-background/80 backdrop-blur">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(input); }}
          className="mx-auto flex max-w-3xl items-end gap-3 px-6 py-4"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); }
            }}
            placeholder="Write to Cabinet…"
            rows={1}
            className="min-h-[44px] max-h-40 flex-1 resize-none rounded-md border border-border bg-card px-4 py-3 text-sm outline-none focus:border-[var(--gold)]"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0">
            <ArrowUp className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageView({ message }: { message: UIMessage }) {
  const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const tools = message.parts.filter((p) => p.type.startsWith("tool-"));

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {tools.map((t, i) => (
        <div key={i} className="rounded-md border border-[var(--gold)]/30 bg-accent/30 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
          ✦ Using <span className="font-medium text-foreground">{t.type.replace("tool-", "").replace(/_/g, " ")}</span>
        </div>
      ))}
      {text && (
        <div className="prose prose-sm max-w-none text-foreground prose-headings:font-display prose-headings:font-normal prose-strong:text-foreground prose-a:text-[var(--gold)]">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
