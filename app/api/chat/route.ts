import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { searchRAG, buildRAGContext } from "@/lib/rag";
import { searchWeb, buildWebQuery } from "@/lib/websearch";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const HF_TOKEN = process.env.HF_TOKEN || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const NLLB_MODEL = "facebook/nllb-200-distilled-1.3B";

const SYSTEM = `Tu es DJOBI TOTO, un assistant vocal burkinabè bienveillant et patient.
Tu aides les mooréphones sur : santé, agriculture, élevage, administration, commerce, éducation.

RÈGLES :
- Réponds en français simple et clair, 2-3 phrases courtes maximum. Mode vocal.
- Ton chaleureux, comme un aîné qui conseille.
- Tu t'appelles DJOBI TOTO, pas Claude, pas Llama.
- Si tu ne sais pas, dis-le honnêtement et oriente vers un professionnel.`;

const SPACE_URL = "https://hfdjobii-djobi-toto-llm.hf.space";

// ── Traduction via NLLB 1.3B ──────────────────────────────────────────────────
async function translateNLLB(
  text: string,
  srcLang: string,
  tgtLang: string
): Promise<string> {
  if (!text.trim()) return text;
  try {
    const res = await fetch(
      `https://api-inference.huggingface.co/models/${NLLB_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
          parameters: { src_lang: srcLang, tgt_lang: tgtLang },
        }),
        signal: AbortSignal.timeout(35_000),
      }
    );
    if (!res.ok) {
      console.warn("NLLB error:", res.status);
      return text;
    }
    const data = await res.json();
    return (Array.isArray(data) ? data[0]?.translation_text : data.translation_text) ?? text;
  } catch (e) {
    console.warn("NLLB translate failed:", e);
    return text;
  }
}

// ── Llama 3.1 via Groq REST API ───────────────────────────────────────────────
async function chatGroq(
  message: string,
  history: { role: string; text: string }[],
  context: string
): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM + context },
    ...history.slice(-6).map(m => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    })),
    { role: "user" as const, content: message },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages,
      max_tokens: 300,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() ?? "";
}

// ── Claude Haiku ──────────────────────────────────────────────────────────────
async function chatClaude(
  message: string,
  history: { role: string; text: string }[],
  context: string
): Promise<string> {
  const msgs: Anthropic.MessageParam[] = [
    ...(history ?? []).slice(-6).map(m => ({
      role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    })),
    { role: "user" as const, content: message },
  ];
  const resp = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system: SYSTEM + context,
    messages: msgs,
  });
  return resp.content[0]?.type === "text" ? resp.content[0].text.trim() : "";
}

// ── Mode premium legacy (HF Space Mistral) ────────────────────────────────────
async function submitPremium(
  message: string,
  context: string
): Promise<{ event_id: string; space: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (HF_TOKEN) headers["Authorization"] = `Bearer ${HF_TOKEN}`;
  const messageWithContext = context ? `${context}\n\nQuestion : ${message}` : message;
  const res = await fetch(`${SPACE_URL}/gradio_api/call/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: [messageWithContext] }),
    signal: AbortSignal.timeout(15_000),
  });
  if (res.status === 503) throw new Error("space_loading");
  if (!res.ok) throw new Error(`space_error_${res.status}`);
  const body = await res.json();
  const event_id: string = body.event_id ?? "";
  if (!event_id) throw new Error("no_event_id");
  return { event_id, space: SPACE_URL };
}

// ── Route principale ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { message, lang, history, model, mode } = await req.json();
    if (!message?.trim()) return NextResponse.json({ text: "" });

    // 1. Contexte RAG
    const ragResults = searchRAG(message, 3);
    const ragContext = buildRAGContext(ragResults);

    let webContext = "";
    let webUsed = false;
    if (ragResults.length === 0) {
      const query = buildWebQuery(message);
      webContext = await searchWeb(query);
      webUsed = webContext.length > 0;
    }
    const fullContext = ragContext + webContext;

    // 2. Mode premium legacy (HF Space Mistral)
    if (mode === "premium") {
      try {
        const { event_id, space } = await submitPremium(message, fullContext);
        return NextResponse.json({
          event_id,
          space,
          lang: lang ?? "mooré",
          model: "mistral-moore",
          rag_used: ragResults.length,
          web_used: webUsed,
        });
      } catch {
        // fallback silencieux
      }
    }

    // 3. Pipeline mooré : NLLB(mos→fr) → LLM → NLLB(fr→mos)
    const langLower = (lang ?? "").toLowerCase();
    const isMoore = langLower.includes("moor");
    let questionFr = message;
    if (isMoore) {
      questionFr = await translateNLLB(message, "mos_Latn", "fra_Latn");
    }

    // 4. Choix du LLM (model='llama' depuis la nouvelle page, mode='llama' depuis l'ancienne)
    const useGroq = (model === "llama" || mode === "llama") && Boolean(GROQ_API_KEY);
    let responseFr: string;

    if (useGroq) {
      try {
        responseFr = await chatGroq(questionFr, history ?? [], fullContext);
      } catch (e) {
        console.warn("Groq failed, fallback Claude:", e);
        responseFr = await chatClaude(questionFr, history ?? [], fullContext);
      }
    } else {
      responseFr = await chatClaude(questionFr, history ?? [], fullContext);
    }

    // 5. Traduction réponse → mooré si besoin
    const responseText = isMoore
      ? await translateNLLB(responseFr, "fra_Latn", "mos_Latn")
      : responseFr;

    return NextResponse.json({
      text: responseText,
      text_fr: responseFr,
      lang: lang ?? "mooré",
      model: useGroq ? "llama-groq" : "claude-haiku",
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
