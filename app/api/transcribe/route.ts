import { NextRequest, NextResponse } from "next/server";

const HF_TOKEN = process.env.HF_TOKEN || "";

const MOORE_MODELS: Record<string, string> = {
  whisper: "hfdjobii/whisper-small-moore",
  mms: "hfdjobii/mms-moore-savane-ab",
};

async function callHFInference(
  modelId: string,
  buffer: ArrayBuffer,
  contentType: string
): Promise<{ text?: string; loading?: boolean; waitTime?: number; error?: string }> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${modelId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        "Content-Type": contentType,
      },
      body: buffer,
      signal: AbortSignal.timeout(55_000),
    }
  );

  if (res.status === 503) {
    const body = await res.json().catch(() => ({}));
    return { loading: true, waitTime: body.estimated_time ?? 20 };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { error: `HF API ${res.status}: ${body.slice(0, 200)}` };
  }

  const data = await res.json();
  const text = Array.isArray(data)
    ? (data[0]?.text ?? "")
    : (data.text ?? "");

  return { text: text.trim() };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio") as File | null;
    const asrModel = (form.get("asr_model") as string) || "whisper";
    // Accepte "input_lang" (nouvelle page) ou "lang" (page statique legacy)
    const rawLang = (form.get("input_lang") || form.get("lang") || "moore") as string;
    const inputLang = rawLang.toLowerCase().startsWith("fr") ? "francais" : "moore";

    if (!audio || audio.size < 500) {
      return NextResponse.json({ text: "", error: "audio trop court" });
    }

    const buffer = await audio.arrayBuffer();
    const contentType = audio.type || "audio/webm";

    // Sélection du modèle selon la langue d'entrée
    const modelId =
      inputLang === "francais"
        ? "openai/whisper-small"
        : (MOORE_MODELS[asrModel] ?? MOORE_MODELS.whisper);

    const result = await callHFInference(modelId, buffer, contentType);

    if (result.loading) {
      // Cold start — on retente après attente (max 25s)
      const wait = Math.min((result.waitTime ?? 20) * 1000, 25_000);
      await new Promise(r => setTimeout(r, wait));
      const retry = await callHFInference(modelId, buffer, contentType);
      if (retry.loading) {
        return NextResponse.json({ loading: true, waitTime: retry.waitTime ?? 20 });
      }
      if (retry.error) throw new Error(retry.error);
      return NextResponse.json({ text: retry.text ?? "" });
    }

    if (result.error) throw new Error(result.error);

    return NextResponse.json({ text: result.text ?? "" });

  } catch (e) {
    console.error("transcribe error", e);
    return NextResponse.json({ text: "", error: String(e) }, { status: 500 });
  }
}
