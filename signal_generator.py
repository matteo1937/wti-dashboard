"""
WTI Daily Signal Generator
===========================

Generiert für JEDEN Tag automatisch:
- Entry Zone
- Stop Loss
- Take Profit 1 + 2
- Confidence Score
- Begründung

Basiert auf:
- Aktuellem Preis
- Sentiment (X / Social Media)
- ATR (Volatilität)
- Pivot Points (Support/Resistance)
- Tagesbias

Output: today_signal.json
"""

import json
from datetime import datetime
from pathlib import Path

DATA_PATH   = Path(__file__).parent / "public" / "data.json"
SIGNAL_PATH = Path(__file__).parent / "public" / "today_signal.json"

# Strategie-Parameter (basierend auf Backtest-Optimum)
ATR_STOP_MULT    = 1.5
ATR_TARGET1_MULT = 2.0
ATR_TARGET2_MULT = 3.0
PULLBACK_RATIO   = 0.4      # Entry = aktueller Preis - 40% des ATR (in Trend-Richtung pullback)
TICK_VALUE       = 100      # MCL = $100/Punkt


def generate_signal():
    if not DATA_PATH.exists():
        return {"error": "data.json nicht gefunden"}

    with open(DATA_PATH) as f:
        d = json.load(f)

    price = d.get("price")
    atr = d.get("atr") or 3.0
    sentiment = d.get("sentiment") or 0
    bias = d.get("bias", "neutral")
    levels = d.get("keyLevels", {})

    if price is None:
        return {"error": "Kein Preis in data.json"}

    # ── DIREKTION ──
    direction = None
    confidence = 0
    reasons = []

    if sentiment > 0.30 and bias in ("bullish", "neutral"):
        direction = "long"
        confidence += 40
        reasons.append(f"X-Sentiment bullish (+{sentiment:.2f})")
    elif sentiment < -0.30 and bias in ("bearish", "neutral"):
        direction = "short"
        confidence += 40
        reasons.append(f"X-Sentiment bearish ({sentiment:.2f})")
    elif bias == "bullish":
        direction = "long"
        confidence += 25
        reasons.append("Tagesbias bullish")
    elif bias == "bearish":
        direction = "short"
        confidence += 25
        reasons.append("Tagesbias bearish")
    else:
        return {
            "generated_at": datetime.now().isoformat(),
            "direction": None,
            "status": "NO_TRADE",
            "reason": "Sentiment & Bias zu schwach für klares Setup",
            "price": price,
            "sentiment": sentiment,
        }

    # ── BONUS POINTS ──
    pivot = levels.get("pivot")
    vwap = levels.get("vwap")
    ema200 = levels.get("ema200")

    if direction == "long":
        if pivot and price > pivot:
            confidence += 15
            reasons.append(f"Preis über Pivot (${pivot})")
        if vwap and price > vwap:
            confidence += 10
            reasons.append(f"Preis über VWAP (${vwap})")
        if ema200 and price > ema200:
            confidence += 10
            reasons.append(f"Über 200 EMA (${ema200})")
    else:
        if pivot and price < pivot:
            confidence += 15
            reasons.append(f"Preis unter Pivot (${pivot})")
        if vwap and price < vwap:
            confidence += 10
            reasons.append(f"Preis unter VWAP (${vwap})")
        if ema200 and price < ema200:
            confidence += 10
            reasons.append(f"Unter 200 EMA (${ema200})")

    confidence = min(100, confidence)

    # ── ENTRY / STOP / TARGET BERECHNUNG ──
    pullback = atr * PULLBACK_RATIO

    if direction == "long":
        entry      = round(price - pullback, 2)
        entry_high = round(price - pullback * 0.5, 2)
        stop       = round(entry - atr * ATR_STOP_MULT, 2)
        target1    = round(entry + atr * ATR_TARGET1_MULT, 2)
        target2    = round(entry + atr * ATR_TARGET2_MULT, 2)
    else:
        entry      = round(price + pullback, 2)
        entry_high = round(price + pullback * 0.5, 2)
        stop       = round(entry + atr * ATR_STOP_MULT, 2)
        target1    = round(entry - atr * ATR_TARGET1_MULT, 2)
        target2    = round(entry - atr * ATR_TARGET2_MULT, 2)

    # ── RISIKO IN $ ──
    risk_points  = abs(entry - stop)
    reward1_pts  = abs(target1 - entry)
    reward2_pts  = abs(target2 - entry)
    risk_usd     = round(risk_points * TICK_VALUE, 2)
    reward1_usd  = round(reward1_pts * TICK_VALUE, 2)
    reward2_usd  = round(reward2_pts * TICK_VALUE, 2)
    rr1          = round(reward1_pts / risk_points, 2) if risk_points > 0 else 0
    rr2          = round(reward2_pts / risk_points, 2) if risk_points > 0 else 0

    # ── CONFIDENCE LEVEL ──
    if confidence >= 75:
        conf_label = "HOCH"
    elif confidence >= 50:
        conf_label = "MITTEL"
    else:
        conf_label = "NIEDRIG"

    signal = {
        "generated_at":   datetime.now().isoformat(),
        "date":           datetime.now().strftime("%Y-%m-%d"),
        "status":         "ACTIVE",
        "direction":      direction,
        "current_price":  price,
        "entry":          entry,
        "entry_zone":     [entry, entry_high] if direction == "long" else [entry_high, entry],
        "stop":           stop,
        "target1":        target1,
        "target2":        target2,
        "atr":            atr,
        "risk_points":    round(risk_points, 2),
        "risk_usd":       risk_usd,
        "reward1_usd":    reward1_usd,
        "reward2_usd":    reward2_usd,
        "rr1":            rr1,
        "rr2":            rr2,
        "confidence":     confidence,
        "confidence_label": conf_label,
        "reasons":        reasons,
        "sentiment":      sentiment,
        "bias":           bias,
    }

    return signal


def print_signal(s):
    print("\n" + "═" * 60)
    print(f"  📊 WTI DAILY SIGNAL — {s.get('date', '—')}")
    print("═" * 60)
    if s.get("status") == "NO_TRADE":
        print(f"  ⚪ KEIN TRADE — {s.get('reason')}")
        print("═" * 60)
        return
    arrow = "▲" if s["direction"] == "long" else "▼"
    print(f"  {arrow} RICHTUNG:    {s['direction'].upper()}")
    print(f"  💰 PREIS NOW:    ${s['current_price']}")
    print(f"  🎯 ENTRY ZONE:   ${s['entry_zone'][0]} – ${s['entry_zone'][1]}")
    print(f"  🛑 STOP LOSS:    ${s['stop']}        (Risiko: ${s['risk_usd']})")
    print(f"  🟢 TARGET 1:     ${s['target1']}    (R:R 1:{s['rr1']}, Reward: ${s['reward1_usd']})")
    print(f"  🟢 TARGET 2:     ${s['target2']}    (R:R 1:{s['rr2']}, Reward: ${s['reward2_usd']})")
    print(f"  📊 ATR:          ${s['atr']}")
    print(f"  ⭐ CONFIDENCE:   {s['confidence']}% ({s['confidence_label']})")
    print(f"  📝 GRÜNDE:")
    for r in s["reasons"]:
        print(f"     • {r}")
    print("═" * 60)


if __name__ == "__main__":
    signal = generate_signal()
    print_signal(signal)

    with open(SIGNAL_PATH, "w") as f:
        json.dump(signal, f, indent=2)
    print(f"\n  → Signal gespeichert in {SIGNAL_PATH}\n")
