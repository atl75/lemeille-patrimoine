import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readJSON, writeJSON, uid } from "@/lib/utils";
import { CHAT_MODEL, SAVE_LEAD_TOOL, buildSystemPrompt } from "@/lib/chatbot";

const MAX_HISTORY = 16;
const MAX_MESSAGE_LENGTH = 2000;

type ChatMessage = { role: "user" | "assistant"; content: string };

async function saveLeadFromChat(input: any) {
  const leads = await readJSON("leads.json");
  const lead = {
    id: uid("chat"),
    category: input.category || "immobilier",
    name: input.name || "Visiteur du chat",
    email: input.email || "",
    phone: input.phone || "",
    message: input.summary || "",
    topic: input.topic || "Autre",
    source: "chatbot",
    status: "new",
    createdAt: new Date().toISOString(),
  };
  leads.push(lead);
  await writeJSON("leads.json", leads);
  return lead;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "L'assistant n'est pas configuré (ANTHROPIC_API_KEY manquante)." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const incoming: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

  if (!incoming.length) {
    return NextResponse.json({ error: "Aucun message fourni." }, { status: 400 });
  }

  const history = incoming
    .slice(-MAX_HISTORY)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  if (!history.length) {
    return NextResponse.json({ error: "Message invalide." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = await buildSystemPrompt();

  try {
    let messages: Anthropic.MessageParam[] = history;

    let response = await client.messages.create({
      model: CHAT_MODEL,
      max_tokens: 700,
      system,
      tools: [SAVE_LEAD_TOOL],
      messages,
    });

    let leadSaved = false;

    if (response.stop_reason === "tool_use") {
      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUse && toolUse.name === "save_lead") {
        await saveLeadFromChat(toolUse.input);
        leadSaved = true;

        messages = [
          ...messages,
          { role: "assistant", content: response.content },
          {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: "Lead enregistré avec succès dans le CRM.",
              },
            ],
          },
        ];

        response = await client.messages.create({
          model: CHAT_MODEL,
          max_tokens: 400,
          system,
          tools: [SAVE_LEAD_TOOL],
          messages,
        });
      }
    }

    const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text");
    const reply = textBlock?.text || "Je n'ai pas pu générer de réponse, pouvez-vous reformuler ?";

    return NextResponse.json({ reply, leadSaved });
  } catch (err) {
    console.error("Erreur chatbot:", err);
    if (err instanceof Anthropic.APIError && err.status === 400 && /credit balance/i.test(err.message)) {
      return NextResponse.json(
        { error: "L'assistant est temporairement indisponible (crédits API épuisés). Contactez-nous directement via le formulaire ou par téléphone." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Une erreur est survenue, réessayez dans un instant." }, { status: 500 });
  }
}
