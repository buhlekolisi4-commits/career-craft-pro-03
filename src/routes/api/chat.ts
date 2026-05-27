import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are Cabinet, an AI-powered Job Application Assistant with the polish of a Parisian career atelier. You help users craft professional, tailored, ATS-friendly job applications.

You can:
- Generate professional emails (application, follow-up, networking, interview)
- Tailor CVs and cover letters to specific job descriptions
- Research companies and explain job requirements
- Plan and schedule the user's job search tasks

Style: warm, precise, editorial. Use clear headings, bullet points, and structured sections. Always produce polished, ready-to-use copy.

Ethics: Never fabricate qualifications, certifications, experience, or recommendation letters. Be truthful and encourage authentic self-presentation. Avoid biased or discriminatory language. Remind users to review generated content before submission.

Use the available tools when the user asks to draft an email, tailor a CV, write a cover letter, or build a schedule — the tool produces a structured artifact you should also summarize in chat.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice(7);

        const url = process.env.SUPABASE_URL!;
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const supabase = createClient(url, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        if (claimsErr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub as string;

        const body = (await request.json()) as {
          messages: UIMessage[];
          threadId: string;
        };
        if (!body.threadId || !Array.isArray(body.messages)) {
          return new Response("Bad request", { status: 400 });
        }

        // Verify thread belongs to user
        const { data: thread } = await supabase
          .from("threads")
          .select("id, title")
          .eq("id", body.threadId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing AI key", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const tools = {
          draft_email: tool({
            description:
              "Draft a professional job-related email (application, follow-up, networking, interview confirmation). Returns subject and body.",
            inputSchema: z.object({
              kind: z.enum(["application", "follow_up", "networking", "interview"]),
              tone: z.enum(["formal", "friendly", "persuasive", "confident"]).default("formal"),
              jobTitle: z.string().optional(),
              company: z.string().optional(),
              recipient: z.string().optional(),
              userName: z.string().optional(),
              keyPoints: z.string().optional(),
            }),
            execute: async (input) => ({ ...input, status: "drafted" }),
          }),
          tailor_cv: tool({
            description:
              "Analyze a job description against the user's CV/experience and propose tailored bullets, missing keywords, and section rewrites.",
            inputSchema: z.object({
              jobDescription: z.string(),
              cvSummary: z.string().optional(),
              targetRole: z.string().optional(),
            }),
            execute: async (input) => ({ ...input, status: "analyzed" }),
          }),
          cover_letter: tool({
            description: "Generate a personalized cover letter.",
            inputSchema: z.object({
              jobTitle: z.string(),
              company: z.string(),
              motivation: z.string().optional(),
              highlights: z.string().optional(),
            }),
            execute: async (input) => ({ ...input, status: "generated" }),
          }),
          schedule_tasks: tool({
            description: "Build a job-search task plan with deadlines and priorities.",
            inputSchema: z.object({
              horizonDays: z.number().int().min(1).max(60).default(7),
              focus: z.string().optional(),
              tasks: z
                .array(
                  z.object({
                    title: z.string(),
                    due: z.string().describe("ISO date or natural language"),
                    priority: z.enum(["low", "medium", "high"]).default("medium"),
                  }),
                )
                .optional(),
            }),
            execute: async (input) => ({ ...input, status: "planned" }),
          }),
          research_company: tool({
            description:
              "Outline a research brief for a company: mission, culture, recent news angles, and interview prep questions.",
            inputSchema: z.object({
              company: z.string(),
              role: z.string().optional(),
            }),
            execute: async (input) => ({ ...input, status: "briefed" }),
          }),
        };

        const result = streamText({
          model,
          system: SYSTEM_PROMPT,
          tools,
          stopWhen: stepCountIs(50),
          messages: await convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          onFinish: async ({ messages }) => {
            try {
              // Persist any new messages not yet in DB
              const { data: existing } = await supabase
                .from("messages")
                .select("id")
                .eq("thread_id", body.threadId);
              const existingIds = new Set((existing ?? []).map((r) => r.id));
              const toInsert = messages
                .filter((m) => !existingIds.has(m.id))
                .map((m) => ({
                  thread_id: body.threadId,
                  user_id: userId,
                  role: m.role,
                  parts: m.parts as unknown as object,
                }));
              if (toInsert.length > 0) {
                await supabase.from("messages").insert(toInsert);
              }

              // Auto-title from first user message if still default
              if (thread.title === "New conversation") {
                const firstUser = messages.find((m) => m.role === "user");
                const text = firstUser?.parts
                  ?.map((p) => (p.type === "text" ? p.text : ""))
                  .join(" ")
                  .trim();
                if (text) {
                  const title = text.slice(0, 60) + (text.length > 60 ? "…" : "");
                  await supabase
                    .from("threads")
                    .update({ title, updated_at: new Date().toISOString() })
                    .eq("id", body.threadId);
                } else {
                  await supabase
                    .from("threads")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", body.threadId);
                }
              } else {
                await supabase
                  .from("threads")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", body.threadId);
              }
            } catch (e) {
              console.error("[chat] persistence error", e);
            }
          },
        });
      },
    },
  },
});
