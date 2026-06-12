import { NextRequest, NextResponse } from "next/server";

const TTS_SPACE = "https://hfdjobii-djobi-tts-demo.hf.space";

export async function POST(req: NextRequest) {
  const HF_TOKEN = process.env.HF_TOKEN || "";

  try {
    const { text, voice } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "Texte vide" }, { status: 400 });
    }

    // 1. Soumettre la tâche de synthèse
    const submitRes = await fetch(`${TTS_SPACE}/gradio_api/call/synthesize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(HF_TOKEN && { Authorization: `Bearer ${HF_TOKEN}` }),
      },
      body: JSON.stringify({ data: [text, voice || "Djobi (Voix 1)"] }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!submitRes.ok) {
      throw new Error(`Soumission échouée (${submitRes.status})`);
    }

    const { event_id } = await submitRes.json();

    // 2. Lire le stream SSE jusqu'à event: complete
    const streamRes = await fetch(
      `${TTS_SPACE}/gradio_api/call/synthesize/${event_id}`,
      {
        headers: {
          ...(HF_TOKEN && { Authorization: `Bearer ${HF_TOKEN}` }),
        },
        signal: AbortSignal.timeout(120_000),
      }
    );

    if (!streamRes.ok) {
      throw new Error(`Stream échoué (${streamRes.status})`);
    }

    const reader = streamRes.body!.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let audioUrl: string | null = null;

    outer: while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "null") continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed[0]?.url) {
            audioUrl = parsed[0].url;
            break outer;
          }
        } catch (_) {}
      }
    }

    if (!audioUrl) {
      throw new Error("Aucune URL audio dans la réponse du Space");
    }

    // 3. Télécharger le fichier audio et le retourner au client
    const audioRes = await fetch(audioUrl, {
      headers: {
        ...(HF_TOKEN && { Authorization: `Bearer ${HF_TOKEN}` }),
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!audioRes.ok) {
      throw new Error(`Téléchargement audio échoué (${audioRes.status})`);
    }

    const audioData = await audioRes.arrayBuffer();

    return new Response(audioData, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("[synthesize]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
