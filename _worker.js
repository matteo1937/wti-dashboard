// Cloudflare Worker — /price, /multiprice, /analyze, /postmortem, /calendar, /eia, else static
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/price')      return handlePrice();
    if (url.pathname === '/multiprice') return handleMultiPrice(url);
    if (url.pathname === '/analyze')    return handleAnalyze(request, env);
    if (url.pathname === '/postmortem') return handlePostmortem(request, env);
    if (url.pathname === '/calendar')   return handleCalendar();
    if (url.pathname === '/eia')        return handleEIA();

    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Not Found', { status: 404 });
  },
};

async function stooq(symbol) {
  const r = await fetch(`https://stooq.com/q/l/?s=${symbol}&f=sd2t2ohlcv&h&e=csv`, {
    cf: { cacheTtl: 5, cacheEverything: true },
  });
  const lines = (await r.text()).trim().split('\n');
  const c = lines[1].split(',');
  return {
    symbol: c[0], date: c[1], time: c[2],
    open: +c[3], high: +c[4], low: +c[5], close: +c[6], volume: +c[7] || 0,
  };
}

async function handlePrice() {
  try { return j(await stooq('cl.f')); }
  catch (e) { return j({ error: String(e) }, 502); }
}

// /multiprice?s=cl.f,dx.f,^spx,gc.f
async function handleMultiPrice(url) {
  const syms = (url.searchParams.get('s') || 'cl.f,dx.f,^spx,gc.f').split(',').slice(0, 8);
  try {
    const out = {};
    await Promise.all(syms.map(async s => {
      try { out[s] = await stooq(s.trim()); } catch { out[s] = { error: 'n/a' }; }
    }));
    return j(out);
  } catch (e) { return j({ error: String(e) }, 502); }
}

async function handleAnalyze(request, env) {
  if (request.method !== 'POST') return j({ error: 'POST only' }, 405);
  const body = await request.json().catch(() => ({}));
  const { password, image, mediaType, context } = body;

  if (!env.UPLOAD_PASSWORD || password !== env.UPLOAD_PASSWORD) return j({ error: 'Falsches Passwort' }, 401);
  if (!image || !mediaType) return j({ error: 'Kein Bild übergeben' }, 400);
  if (!env.ANTHROPIC_API_KEY) return j({ error: 'API Key nicht konfiguriert' }, 500);

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

REGELN:
- Stop = 1.5 × ATR vom Entry | TP1 = 2.0 × ATR | TP2 = 3.0 × ATR
- Quality 5 = deckt sich mit Bias/Pivot/VWAP/EMA200 | 3 = neutral | 1 = gegen Bias

Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown-Codeblock):
{"asset":"WTI","direction":"long|short","entry":Zahl,"size":"text","quality_score":1-5,"quality_label":"text","stop_suggested":Zahl,"tp1_suggested":Zahl,"tp2_suggested":Zahl,"risk_reward":Zahl,"rationale":"1-2 Sätze","warnings":[],"tips":""}`;

  return callClaude(env, sys, [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
    { type: 'text', text: 'Bewerte diesen Trade-Screenshot. Antworte nur mit JSON.' },
  ], 800);
}

async function handlePostmortem(request, env) {
  if (request.method !== 'POST') return j({ error: 'POST only' }, 405);
  const body = await request.json().catch(() => ({}));
  const { password, trade } = body;
  if (!env.UPLOAD_PASSWORD || password !== env.UPLOAD_PASSWORD) return j({ error: 'Falsches Passwort' }, 401);
  if (!trade) return j({ error: 'Kein Trade' }, 400);
  if (!env.ANTHROPIC_API_KEY) return j({ error: 'API Key fehlt' }, 500);

  const sys = `Du bist ein professioneller Trading-Coach. Analysiere diesen geschlossenen WTI-Trade und gib Feedback.
Antworte AUSSCHLIESSLICH mit gültigem JSON:
{"grade":"A|B|C|D|F","summary":"1-2 Sätze Gesamtbewertung (deutsch)","good":["was lief gut","..."],"bad":["was lief schlecht","..."],"lesson":"1 konkrete Lektion für nächstes Mal (deutsch)"}`;

  const txt = `Trade: ${trade.direction?.toUpperCase()} ${trade.asset||'WTI'}
Entry: $${trade.entry} | Exit: $${trade.exit} | Stop: $${trade.stop||'–'} | TP1: $${trade.tp1||'–'}
Größe: ${trade.qty||1} Kontrakte | PnL: $${trade.pnl?.toFixed(2)||'–'}
Gehaltenz: ${trade.closedAt && trade.ts ? Math.round((trade.closedAt-trade.ts)/3600000)+'h' : '?'}
Quality beim Entry: ${trade.quality||'?'}/5`;

  return callClaude(env, sys, [{ type: 'text', text: txt }], 500);
}

async function callClaude(env, sys, content, maxTok) {
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
        max_tokens: maxTok,
        system: sys,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!apiR.ok) {
      const t = await apiR.text();
      return j({ error: 'Anthropic API: ' + t.slice(0, 500) }, 502);
    }
    const r = await apiR.json();
    const text = r.content?.[0]?.text || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); }
    catch { return j({ error: 'AI Antwort kein JSON', raw: text }, 502); }
    return j(parsed);
  } catch (e) { return j({ error: String(e) }, 500); }
}

// Hardcoded economic calendar (next 8 weeks of recurring events)
function handleCalendar() {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const events = [];
  // EIA weekly inventory — Wednesdays 14:30 UTC (10:30 ET)
  // FOMC 2026 dates
  const fomc = ['2026-01-28','2026-03-18','2026-04-29','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'];
  fomc.forEach(d => events.push({ date: d+'T18:00:00Z', type: 'FOMC', title: 'FOMC Zinsentscheid', impact: 'high' }));
  // OPEC+ 2026
  ['2026-01-15','2026-04-08','2026-06-04','2026-09-03','2026-12-03'].forEach(d =>
    events.push({ date: d+'T12:00:00Z', type: 'OPEC', title: 'OPEC+ Meeting', impact: 'high' }));
  // EIA — every Wednesday next 8 weeks
  for (let i = 0; i < 56; i++) {
    const d = new Date(now); d.setUTCDate(d.getUTCDate()+i);
    if (d.getUTCDay() === 3) {
      d.setUTCHours(14,30,0,0);
      events.push({ date: d.toISOString(), type: 'EIA', title: 'EIA Crude Oil Inventories', impact: 'high' });
    }
  }
  // NFP first Friday each month
  for (let off = 0; off < 3; off++) {
    const first = new Date(Date.UTC(y, m+off, 1));
    while (first.getUTCDay() !== 5) first.setUTCDate(first.getUTCDate()+1);
    first.setUTCHours(12,30,0,0);
    events.push({ date: first.toISOString(), type: 'NFP', title: 'Non-Farm Payrolls', impact: 'high' });
  }
  events.sort((a,b)=>new Date(a.date)-new Date(b.date));
  const upcoming = events.filter(e=>new Date(e.date) > now).slice(0,15);
  return j({ events: upcoming });
}

// EIA Crude Inventory — fetch via free proxy (EIA API needs key; stub with last known values)
async function handleEIA() {
  try {
    // Use EIA public RSS-ish endpoint via weekly series
    const r = await fetch('https://api.eia.gov/v2/petroleum/stoc/wstk/data/?frequency=weekly&data[0]=value&facets[series][]=WCESTUS1&sort[0][column]=period&sort[0][direction]=desc&offset=0&length=6&api_key=DEMO_KEY', {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (r.ok) {
      const d = await r.json();
      const rows = d?.response?.data || [];
      if (rows.length >= 2) {
        const last = rows[0], prev = rows[1];
        const delta = (+last.value - +prev.value);
        return j({
          period: last.period,
          value: +last.value,
          delta_wk: delta,
          unit: 'Thousand Barrels',
          bias: delta > 0 ? 'bearish' : 'bullish',
          series: rows.slice().reverse().map(x=>({ date: x.period, value: +x.value })),
        });
      }
    }
  } catch (e) {}
  // Fallback stub
  return j({ error: 'EIA feed nicht verfügbar — API-Key nötig', stub: true });
}

function j(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'content-type': 'application/json', ...CORS },
  });
}
