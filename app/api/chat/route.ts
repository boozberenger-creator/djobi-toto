import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchRAG, buildRAGContext } from "@/lib/rag";
import { searchWeb, buildWebQuery } from "@/lib/websearch";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Tu es DJOBI TOTO, un assistant vocal burkinabè bienveillant et patient.
Tu aides les mooréphones sur : santé, agriculture, élevage, administration, commerce, éducation.

RÈGLES :
- Détecte la langue du message (mooré, français, dioula, fulfulde).
- Réponds TOUJOURS dans la même langue que le message reçu.
- Si le message est en mooré : réponds en mooré (phrases simples, vocabulaire courant).
- Réponses courtes : 2-3 phrases maximum. On est en mode vocal.
- Ton chaleureux, comme un aîné qui conseille.
- Tu t'appelles DJOBI TOTO, pas Claude.
- Si tu ne sais pas, dis-le honnêtement et oriente vers un professionnel.`;

const SPACE_URL = "https://hfdjobii-djobi-toto-llm.hf.space";

// Mode premium : Vercel soumet seulement le job (< 5s), le client lit le SSE directement
// → contourne le timeout Vercel de 60s sur les longues générations LLM
async function submitPremium(message: string, context: string): Promise<{ event_id: string; space: string }> {
  const HF_TOKEN = process.env.HF_TOKEN || "";
  const authHeaders = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};
  const messageWithContext = context ? `${context}\n\nQuestion : ${message}` : message;

  const res = await fetch(`${SPACE_URL}/gradio_api/call/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ data: [messageWithContext] }),
    signal: AbortSignal.timeout(15_000),
  });

  if (res.status === 503) throw new Error("loading");
  if (!res.ok) throw new Error(`Space POST ${res.status}`);

  const { event_id } = await res.json();
  return { event_id, space: SPACE_URL };
}

// Claude Haiku — mode gratuit — avec contexte RAG + web injecté
async function chatGratuit(
  message: string,
  history: { role: string; text: string }[],
  context: string
): Promise<string> {
  const msgs: Anthropic.MessageParam[] = (history ?? [])
    .slice(-6)
    .map((m) => ({
      role: m.role === "user" ? "user" : ("assistant" as const),
      content: m.text,
    }));
  msgs.push({ role: "user", content: message });

  const resp = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM + context,
    messages: msgs,
  });

  return resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const { message, lang, history, mode } = await req.json();
    if (!message?.trim()) return NextResponse.json({ text: "" });

    // 1. Recherche RAG dans notre base locale (instantané)
    const ragResults = searchRAG(message, 3);
    const ragContext = buildRAGContext(ragResults);

    // 2. Si RAG ne trouve rien → recherche web (Brave Search)
    let webContext = "";
    let webUsed = false;
    if (ragResults.length === 0) {
      const query = buildWebQuery(message);
      webContext = await searchWeb(query);
      webUsed = webContext.length > 0;
    }

    // 3. Contexte final = RAG + web (au moins l'un des deux)
    const fullContext = ragContext + webContext;

    // 4. Appel LLM
    const isPremium = mode === "premium";

    if (isPremium) {
      // Soumettre le job et retourner l'event_id au client — il lira le SSE directement
      const { event_id, space } = await submitPremium(message, fullContext);
      return NextResponse.json({
        event_id,
        space,
        lang: lang ?? "Français",
        model: "mistral-moore",
        rag_used: ragResults.length,
        web_used: webUsed,
      });
    }

    const text = await chatGratuit(message, history ?? [], fullContext);
    return NextResponse.json({
      text,
      lang: lang ?? "Français",
      model: "claude-haiku",
      rag_used: ragResults.length,
      web_used: webUsed,
    });
  } catch (e) {
    console.error("chat error", e);
    return NextResponse.json(
      { text: "Problème technique. Réessaie dans un instant." },
      { status: 500 }
    );
  }
}
