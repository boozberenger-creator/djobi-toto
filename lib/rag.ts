import qrData from "@/public/rag/qr_data.json";

interface QRPair {
  q: string;
  a: string;
}

const data = qrData as QRPair[];

// Normalise le texte : minuscules, sans accents, sans ponctuation
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

// Similarité de Jaccard entre deux ensembles de mots
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter);
}

// Cherche les Q&R les plus pertinentes pour une question donnée
export function searchRAG(query: string, topK = 3): QRPair[] {
  const queryTokens = tokenize(query);
  if (queryTokens.size === 0) return [];

  return data
    .map((pair) => ({ pair, score: jaccard(queryTokens, tokenize(pair.q)) }))
    .filter((s) => s.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.pair);
}

// Formate les résultats en bloc de contexte pour le prompt
export function buildRAGContext(results: QRPair[]): string {
  if (results.length === 0) return "";
  return (
    "\n\nContexte utile (exemples de réponses correctes) :\n" +
    results.map((r) => `Q: ${r.q}\nR: ${r.a}`).join("\n\n")
  );
}
