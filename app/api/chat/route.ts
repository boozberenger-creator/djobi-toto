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

// Notre Mistral mooré fine-tuné — avec retry sur cold start ZeroGPU
async function chatPremium(message: string, context: string): Promise<string> {
  const HF_TOKEN = process.env.HF_TOKEN || "";
  const authHeaders = HF_TOKEN ? { Authorization: `Bearer ${HF_TOKEN}` } : {};

  const messageWithContext = context
    ? `${context}\n\nQuestion : ${message}`
    : message;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${SPACE_URL}/gradio_api/call/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ data: [messageWithContext] }),
        signal: AbortSignal.timeout(20_000),
      });

      // 503 = Space en cold start → on attend et on réessaie
      if (res.status === 503) {
        if (attempt < 3) await new Promise(r => setTimeout(r, 8_000 * attempt));
        continue;
      }
      if (!res.ok) throw new Error(`Space POST ${res.status}`);

      const { event_id } = await res.json();

      const sse = await fetch(
        `${SPACE_URL}/gradio_api/call/generate/${event_id}`,
        {
          headers: authHeaders,
          signal: AbortSignal.timeout(90_000),
        }
      );
      if (!sse.ok) throw new Error(`Space SSE ${sse.status}`);

      const text = await sse.text();
      const match = text.match(/^data:\s*(.+)$/m);
      if (!match) throw new Error("SSE: pas de data");
      const data = JSON.parse(match[1]);
      return (Array.isArray(data) ? data[0] : data)?.toString().trim() ?? "";

    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise(r => setTimeout(r, 5_000 * attempt));
    }
  }
  throw new Error("Space indisponible après 3 tentatives");
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

    // 4. Appel LLM avec contexte enrichi
    let text = "";
    const isPremium = mode === "premium";

    if (isPremium) {
      text = await chatPremium(message, fullContext);
    } else {
      text = await chatGratuit(message, history ?? [], fullContext);
    }

    return NextResponse.json({
      text,
      lang: lang ?? "Français",
      model: isPremium ? "mistral-moore" : "claude-haiku",
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
