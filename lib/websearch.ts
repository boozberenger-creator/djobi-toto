// Recherche web — Wikipedia (gratuit/illimité) + Serper.dev (Google, 2500 gratuits)

// ── WIKIPEDIA ─────────────────────────────────────────────────────────────────

interface WikiSearchResult { title: string; snippet: string }
interface WikiSearchResponse { query?: { search?: WikiSearchResult[] } }
interface WikiSummaryResponse { extract?: string; title?: string }

async function searchWikipedia(query: string): Promise<string> {
  try {
    const searchRes = await fetch(
      "https://fr.wikipedia.org/w/api.php?" +
        new URLSearchParams({
          action: "query", list: "search",
          srsearch: query, format: "json",
          srlimit: "2", origin: "*",
        }),
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!searchRes.ok) return "";

    const data: WikiSearchResponse = await searchRes.json();
    const results = data.query?.search ?? [];
    if (results.length === 0) return "";

    const title = results[0].title;
    const sumRes = await fetch(
      `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!sumRes.ok) return "";

    const sum: WikiSummaryResponse = await sumRes.json();
    const sentences = (sum.extract ?? "").split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    if (!sentences) return "";

    return `\n\nWikipedia — "${title}" :\n${sentences}`;
  } catch { return ""; }
}

// ── SERPER (Google Search) ────────────────────────────────────────────────────

interface SerperResult { title: string; snippet: string; link: string }
interface SerperResponse { organic?: SerperResult[] }

async function searchSerper(query: string): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return "";

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, gl: "bf", hl: "fr", num: 3 }),
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return "";

    const data: SerperResponse = await res.json();
    const results = data.organic?.slice(0, 3) ?? [];
    if (results.length === 0) return "";

    return (
      "\n\nRésultats Google :\n" +
      results.map((r) => `- ${r.title} : ${r.snippet}`).join("\n")
    );
  } catch { return ""; }
}

// ── FONCTION PRINCIPALE ───────────────────────────────────────────────────────

// Détecte si la question concerne l'actualité (Serper) ou le savoir (Wikipedia)
function isCurrentEvent(message: string): boolean {
  const keywords = [
    "aujourd'hui", "maintenant", "actuellement", "récent", "dernier",
    "prix", "coût", "combien coûte", "actualité", "nouvelles", "news",
    "résultat", "match", "élection", "météo", "température",
  ];
  const lower = message.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export async function searchWeb(query: string): Promise<string> {
  // Actualités et prix → Serper (Google) en priorité
  if (isCurrentEvent(query)) {
    const serper = await searchSerper(query);
    if (serper) return serper;
  }

  // Savoir factuel → Wikipedia en priorité
  const wiki = await searchWikipedia(query);
  if (wiki) return wiki;

  // Fallback → Serper si Wikipedia ne trouve rien
  return await searchSerper(query);
}

export function buildWebQuery(message: string): string {
  const lower = message.toLowerCase();
  const hasBF =
    lower.includes("burkina") || lower.includes("ouaga") ||
    lower.includes("bobo") || lower.includes("mossi") || lower.includes("mooré");

  const cleaned = message.replace(/[^\w\sÀ-ɏḀ-ỿ]/g, " ").trim();
  return hasBF ? cleaned : `${cleaned} Burkina Faso`;
}
