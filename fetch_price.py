"""
WTI Price Fetcher
=================
Holt aktuellen WTI-Preis von Stooq, updatet data.json.
Läuft via GitHub Actions alle 30 Minuten.
"""
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

DATA_PATH = Path(__file__).parent / "data.json"
STOOQ_URL = "https://stooq.com/q/l/?s=cl.f&f=sd2t2ohlcv&h&e=csv"


def fetch_price():
    req = urllib.request.Request(STOOQ_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as r:
        text = r.read().decode("utf-8").strip().splitlines()
    # Header,Row
    headers = [h.strip().lower() for h in text[0].split(",")]
    row = text[1].split(",")
    rec = dict(zip(headers, row))
    return {
        "open":  float(rec["open"]),
        "high":  float(rec["high"]),
        "low":   float(rec["low"]),
        "close": float(rec["close"]),
        "date":  rec["date"],
        "time":  rec["time"],
    }


def update_data():
    if not DATA_PATH.exists():
        data = {}
    else:
        with open(DATA_PATH) as f:
            data = json.load(f)

    try:
        p = fetch_price()
    except Exception as e:
        print(f"Fetch failed: {e}")
        return

    prev_close = data.get("price")
    new_price  = p["close"]

    data["price"] = new_price
    data["lastUpdated"] = datetime.now(timezone.utc).isoformat()
    data["date"] = p["date"]

    if prev_close:
        change = new_price - prev_close
        data["change"] = round(change, 2)
        data["changePercent"] = round(change / prev_close * 100, 2)

    # Day range for ATR-ish update
    data["dayHigh"] = p["high"]
    data["dayLow"]  = p["low"]

    with open(DATA_PATH, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Updated price: ${new_price} ({data.get('changePercent', 0):+.2f}%)")


if __name__ == "__main__":
    update_data()
