// Cloudflare Worker — handles /price (Stooq proxy), /analyze (Claude Vision), defaults to static assets
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/price')   return handlePrice();
    if (url.pathname === '/analyze') return handleAnalyze(request, env);

    // Fall through to static assets
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not Found', { status: 404 });
  },
};

async function handlePrice() {
  try {
    const r = await fetch('https://stooq.com/q/l/?s=cl.f&f=sd2t2ohlcv&h&e=csv', {
      cf: { cacheTtl: 5, cacheEverything: true },
    });
    const lines = (await r.text()).trim().split('\n');
    const c = lines[1].split(',');
    return j({
      symbol: c[0], date: c[1], time: c[2],
      open: +c[3], high: +c[4], low: +c[5], close: +c[6], volume: +c[7] || 0,
    });
  } catch (e) {
    return j({ error: String(e) }, 502);
  }
}

async function handleAnalyze(request, env) {
  if (request.method !== 'POST') return j({ error: 'POST only' }, 405);
  const body = await request.json().catch(() => ({}));
  const { password, image, mediaType, context } = body;

  if (!env.UPLOAD_PASSWORD || password !== env.UPLOAD_PASSWORD)
    return j({ error: 'Falsches Passwort' }, 401);
  if (!image || !mediaType) return j({ error: 'Kein Bild übergeben' }, 400);
  if (!env.ANTHROPIC_API_KEY) return j({ error: 'API Key nicht konfiguriert (Cloudflare Secret fehlt)' }, 500);

  const ctx = context || {};
  const sys = `Du bist ein professioneller Trading-Coach für WTI Crude Oil (MCL/CL Futures).
Analysiere den Saxo-Bank Trading-Screenshot und gib eine strukturierte Bewertung in deutscher Sprache.

AKTUELLER MARKT-KONTEXT:
- Preis: $${ctx.price ?? '?'}
- ATR: $${ctx.atr ?? '?'}
- Tagesbias: ${ctx.bias ?? '?'} — ${ctx.biasReason ?? ''}
- X-Sentiment: ${ctx.sentiment ?? '?'} (-1 bear, +1 bull)
- Pivot: $${ctx.pivot ?? '?'} | VWAP: $${ctx.vwap ?? '?'} | 200EMA: $${ctx.ema200 ?? '?'}
- R1 $${ctx.r1 ?? '?'} R2 $${ctx.r2 ?? '?'} | S1 $${ctx.s1 ?? '?'} S2 $${ctx.s2 ?? '?'}

REGELN für Stop/TP-Vorschlag:
- Stop = 1.5 × ATR vom Entry
- TP1 = 2.0 × ATR (R:R 1:1.33)
- TP2 = 3.0 × ATR (R:R 1:2.0)
- Quality 5 = Setup deckt sich mit Bias + über/unter Pivot/VWAP/EMA200 in Trade-Richtung
- Quality 3 = neutral
- Quality 1 = gegen Bias / gegen Trend

Antworte AUSSCHLIESSLICH mit gültigem JSON in genau diesem Format (kein Markdown-Codeblock, nur rohes JSON):
{
  "asset": "WTI",
  "direction": "long" oder "short",
  "entry": Zahl oder null,
  "size": "z.B. 1 Kontrakt" oder null,
  "quality_score": 1-5,
  "quality_label": "ausgezeichnet|gut|okay|schwach|schlecht",
  "stop_suggested": Zahl,
  "tp1_suggested": Zahl,
  "tp2_suggested": Zahl,
  "risk_reward": Zahl,
  "rationale": "1-2 Sätze warum dieser Trade gut/schlecht ist (deutsch)",
  "warnings": ["kurz", "kurz"] oder [],
  "tips": "Konkreter Verbesserungsvorschlag (deutsch)" oder ""
}`;

  try {
    const apiR = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 800,
        system: sys,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Bewerte diesen Trade-Screenshot. Antworte nur mit dem JSON-Objekt.' },
          ],
        }],
      }),
    });

    if (!apiR.ok) {
      const t = await apiR.text();
      return j({ error: 'Anthropic API: ' + t.slice(0, 500) }, 502);
    }
    const r = await apiR.json();
    const text = r.content?.[0]?.text || '';
    let parsed;
    try {
      parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return j({ error: 'AI Antwort kein JSON', raw: text }, 502);
    }
    return j(parsed);
  } catch (e) {
    return j({ error: String(e) }, 500);
  }
}

function j(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}
