// Cloudflare Pages Function: /price
// Proxies Stooq CSV to bypass CORS, returns JSON
export async function onRequest(context) {
  try {
    const r = await fetch('https://stooq.com/q/l/?s=cl.f&f=sd2t2ohlcv&h&e=csv', {
      cf: { cacheTtl: 5, cacheEverything: true }
    });
    const text = await r.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('No data');
    const cols = lines[1].split(',');
    const data = {
      symbol: cols[0],
      date:   cols[1],
      time:   cols[2],
      open:   parseFloat(cols[3]),
      high:   parseFloat(cols[4]),
      low:    parseFloat(cols[5]),
      close:  parseFloat(cols[6]),
      volume: parseInt(cols[7]) || 0,
    };
    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=5',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
