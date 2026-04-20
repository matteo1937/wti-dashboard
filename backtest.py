"""
WTI Oil — X Sentiment Strategie Backtest
==========================================

Features:
1. 90-Tage-Backtest (Jan–April 2026, simulierte realistische Daten)
2. Parameter-Optimierung (Sentiment-Threshold + ATR-Multiplier Grid Search)
3. JSON-Export für Dashboard

Usage:
    python3 backtest.py
"""

import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional

# ── KONFIGURATION ──
TICK_VALUE      = 100   # $100 / Punkt für MCL
MAX_HOLD_DAYS   = 5

# ── HISTORISCHE DATEN GENERIEREN ──
def generate_synthetic_data(days: int = 90) -> List[Dict]:
    """
    Generiert realistische WTI-Kursdaten basierend auf bekannten Q1/Q2 2026 Mustern.
    Sentiment korreliert lose mit Preisbewegung +/- Noise.
    """
    random.seed(42)
    data = []
    price = 68.00  # Start Anfang Januar 2026
    start_date = datetime(2026, 1, 13)

    # Realistische Event-Cluster (Geopolitik, OPEC, EIA Surprises)
    events = {
        15:  {"shock": +0.08, "sent": +0.55},  # OPEC+ Cut Signal
        22:  {"shock": -0.05, "sent": -0.40},  # Fed Hawkish
        35:  {"shock": +0.06, "sent": +0.50},  # Iran Tensions
        42:  {"shock": -0.04, "sent": -0.35},  # Strait Talks
        50:  {"shock": +0.07, "sent": +0.45},  # Cold Snap Demand
        58:  {"shock": -0.06, "sent": -0.45},  # Demand Concerns China
        65:  {"shock": +0.05, "sent": +0.40},  # Russia Sanctions
        72:  {"shock": -0.03, "sent": -0.30},  # Inventory Build
        78:  {"shock": +0.10, "sent": +0.55},  # Hormuz Eskalation
        82:  {"shock": -0.12, "sent": -0.50},  # Peace Talks Hope
        85:  {"shock": +0.06, "sent": +0.55},  # Iran refuses talks
    }

    for i in range(days):
        date = start_date + timedelta(days=i)
        # Wochenenden überspringen
        if date.weekday() >= 5:
            continue

        # Basis Drift + Noise
        daily_change_pct = random.gauss(0, 0.018)  # ~1.8% Vol
        sentiment = random.gauss(0, 0.20)

        # Event-Override
        if i in events:
            daily_change_pct = events[i]["shock"] + random.gauss(0, 0.01)
            sentiment = events[i]["sent"] + random.gauss(0, 0.05)

        # Clip sentiment
        sentiment = max(-1.0, min(1.0, sentiment))

        prev_close = price
        open_p = prev_close * (1 + random.gauss(0, 0.003))
        close_p = open_p * (1 + daily_change_pct)
        high_p = max(open_p, close_p) * (1 + abs(random.gauss(0, 0.008)))
        low_p  = min(open_p, close_p) * (1 - abs(random.gauss(0, 0.008)))

        # ATR Approximation (rolling)
        prev_atr = data[-1]["atr"] if data else 2.0
        true_range = max(high_p - low_p, abs(high_p - prev_close), abs(low_p - prev_close))
        atr = (prev_atr * 13 + true_range) / 14

        data.append({
            "date":      date.strftime("%Y-%m-%d"),
            "open":      round(open_p, 2),
            "high":      round(high_p, 2),
            "low":       round(low_p, 2),
            "close":     round(close_p, 2),
            "atr":       round(atr, 2),
            "sentiment": round(sentiment, 3),
        })
        price = close_p

    return data


HISTORICAL_DATA = generate_synthetic_data(days=98)


# ── BACKTEST ENGINE ──
class Trade:
    def __init__(self, date, direction, entry, stop, target, atr):
        self.entry_date = date
        self.direction  = direction
        self.entry      = round(entry, 2)
        self.stop       = round(stop, 2)
        self.target     = round(target, 2)
        self.atr        = atr
        self.exit_date  = None
        self.exit       = None
        self.pnl        = None
        self.reason     = None
        self.bars_held  = 0


def run_backtest(data: List[Dict],
                 sent_long: float = 0.30,
                 sent_short: float = -0.30,
                 atr_stop_mult: float = 1.5,
                 atr_target_mult: float = 2.5) -> Dict:
    trades: List[Trade] = []
    open_trade: Optional[Trade] = None

    for bar in data:
        # ── Open Trade Management ──
        if open_trade:
            open_trade.bars_held += 1
            hit_stop = bar["low"]  <= open_trade.stop   if open_trade.direction == "long" else bar["high"] >= open_trade.stop
            hit_tgt  = bar["high"] >= open_trade.target if open_trade.direction == "long" else bar["low"]  <= open_trade.target

            if hit_stop:
                open_trade.exit, open_trade.exit_date, open_trade.reason = open_trade.stop, bar["date"], "STOP"
            elif hit_tgt:
                open_trade.exit, open_trade.exit_date, open_trade.reason = open_trade.target, bar["date"], "TARGET"
            elif open_trade.bars_held >= MAX_HOLD_DAYS:
                open_trade.exit, open_trade.exit_date, open_trade.reason = bar["close"], bar["date"], "TIME"

            if open_trade.exit is not None:
                points = (open_trade.exit - open_trade.entry) if open_trade.direction == "long" else (open_trade.entry - open_trade.exit)
                open_trade.pnl = round(points * TICK_VALUE, 2)
                trades.append(open_trade)
                open_trade = None

        # ── Open New Trade ──
        if open_trade is None:
            sent, atr = bar["sentiment"], bar["atr"]
            if sent > sent_long:
                e = bar["open"]
                open_trade = Trade(bar["date"], "long",  e, e - atr_stop_mult*atr, e + atr_target_mult*atr, atr)
            elif sent < sent_short:
                e = bar["open"]
                open_trade = Trade(bar["date"], "short", e, e + atr_stop_mult*atr, e - atr_target_mult*atr, atr)

    # Stats
    closed = [t for t in trades if t.pnl is not None]
    wins   = [t for t in closed if t.pnl > 0]
    losses = [t for t in closed if t.pnl <= 0]
    total_pnl = sum(t.pnl for t in closed)
    win_rate  = (len(wins) / len(closed) * 100) if closed else 0
    avg_win   = (sum(t.pnl for t in wins)   / len(wins))   if wins   else 0
    avg_loss  = (sum(t.pnl for t in losses) / len(losses)) if losses else 0
    pf        = abs(sum(t.pnl for t in wins) / sum(t.pnl for t in losses)) if losses and sum(t.pnl for t in losses) < 0 else 999.0

    equity = []
    cum = 0
    for t in closed:
        cum += t.pnl
        equity.append({"date": t.exit_date, "equity": round(cum, 2)})
    max_dd = 0
    peak = 0
    for e in equity:
        peak = max(peak, e["equity"])
        max_dd = max(max_dd, peak - e["equity"])

    return {
        "params": {
            "sent_long": sent_long, "sent_short": sent_short,
            "atr_stop_mult": atr_stop_mult, "atr_target_mult": atr_target_mult,
        },
        "total_trades": len(closed),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": round(win_rate, 1),
        "total_pnl": round(total_pnl, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "profit_factor": round(pf, 2),
        "max_drawdown": round(max_dd, 2),
        "equity_curve": equity,
        "trades": [vars(t) for t in closed[-10:]],  # nur letzte 10 für Dashboard
        "open_trade": vars(open_trade) if open_trade else None,
    }


# ── PARAMETER OPTIMIERUNG ──
def optimize_parameters(data: List[Dict]) -> Dict:
    """Grid Search über Sentiment-Thresholds und ATR-Multiplier."""
    sent_thresholds = [0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50]
    stop_mults      = [1.0, 1.5, 2.0]
    target_mults    = [1.5, 2.0, 2.5, 3.0]

    results = []
    best = None
    best_score = -float('inf')

    for st in sent_thresholds:
        for sm in stop_mults:
            for tm in target_mults:
                if tm <= sm:  # R:R muss > 1 sein
                    continue
                r = run_backtest(data, sent_long=st, sent_short=-st,
                                 atr_stop_mult=sm, atr_target_mult=tm)
                if r["total_trades"] < 5:
                    continue
                # Score = PnL × Profit Factor / (1 + DD)
                score = r["total_pnl"] * r["profit_factor"] / (1 + r["max_drawdown"]/100)
                results.append({
                    "sent_threshold": st,
                    "stop_mult": sm,
                    "target_mult": tm,
                    "trades": r["total_trades"],
                    "win_rate": r["win_rate"],
                    "pnl": r["total_pnl"],
                    "pf": r["profit_factor"],
                    "dd": r["max_drawdown"],
                    "score": round(score, 2),
                })
                if score > best_score:
                    best_score = score
                    best = r
                    best["params"]["score"] = round(score, 2)

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"best": best, "top_10": results[:10], "all_count": len(results)}


# ── REPORT ──
def print_report(r: Dict, title: str = "BACKTEST RESULTS"):
    print("\n" + "═" * 70)
    print(f"  {title}")
    print("═" * 70)
    p = r.get("params", {})
    if p:
        print(f"  Params: sent={p.get('sent_long')}/{p.get('sent_short')}  stop={p.get('atr_stop_mult')}xATR  target={p.get('atr_target_mult')}xATR")
    print(f"  Trades:          {r['total_trades']}    Wins: {r['wins']}    Losses: {r['losses']}")
    print(f"  Win Rate:        {r['win_rate']}%")
    print(f"  Total PnL:       ${r['total_pnl']:+,.2f}")
    print(f"  Avg Win:         ${r['avg_win']:+,.2f}     Avg Loss: ${r['avg_loss']:+,.2f}")
    print(f"  Profit Factor:   {r['profit_factor']}")
    print(f"  Max Drawdown:    ${r['max_drawdown']:.2f}")
    print("═" * 70)


def print_optimization(opt: Dict):
    print("\n" + "═" * 70)
    print("  PARAMETER OPTIMIZATION — TOP 10 KOMBINATIONEN")
    print("═" * 70)
    print(f"  {'#':<3}{'Sent':<7}{'Stop':<7}{'Tgt':<7}{'Trd':<5}{'Win%':<7}{'PnL':<11}{'PF':<7}{'DD':<8}Score")
    print("  " + "-" * 65)
    for i, r in enumerate(opt["top_10"], 1):
        print(f"  {i:<3}{r['sent_threshold']:<7}{r['stop_mult']:<7}{r['target_mult']:<7}{r['trades']:<5}{r['win_rate']:<7}${r['pnl']:<10.0f}{r['pf']:<7}${r['dd']:<7.0f}{r['score']}")


# ── MAIN ──
if __name__ == "__main__":
    data = HISTORICAL_DATA
    print(f"\n  📊 Backtest-Periode: {data[0]['date']} → {data[-1]['date']}  ({len(data)} Trading Days)")

    # Default Backtest
    default_result = run_backtest(data)
    print_report(default_result, "DEFAULT STRATEGIE (Sent ±0.30, Stop 1.5xATR, Target 2.5xATR)")

    # Optimization
    opt = optimize_parameters(data)
    print_optimization(opt)

    # Best Strategy Details
    best = opt["best"]
    print_report(best, "🏆 BEST STRATEGIE (höchster Score)")

    # Export für Dashboard
    export = {
        "generated_at":    datetime.now().isoformat(),
        "data_period":     {"start": data[0]["date"], "end": data[-1]["date"], "days": len(data)},
        "default_strategy": default_result,
        "best_strategy":    best,
        "optimization_top10": opt["top_10"],
    }
    from pathlib import Path
    out_path = Path(__file__).parent / "public" / "backtest_results.json"
    with open(out_path, "w") as f:
        json.dump(export, f, indent=2, default=str)
    print("\n  → Ergebnisse exportiert nach backtest_results.json\n")
