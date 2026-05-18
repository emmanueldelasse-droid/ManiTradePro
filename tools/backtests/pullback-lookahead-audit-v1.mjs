// tools/backtests/pullback-lookahead-audit-v1.mjs
//
// Audit offline du setup PULLBACK_MOMENTUM — recherche de look-ahead bias,
// temporal leakage, execution bias, survivorship bias.
//
// STRICTEMENT offline. Aucun ordre, aucun broker, aucun endpoint live.
// Aucun fichier amont modifié. Lecture seule de :
//   - tools/backtests/backtest-multi-setup-grid.mjs (référence code)
//   - tools/backtests/backtest-pullback-yearly-walkforward.mjs (référence code)
//   - tools/backtests/universe-v2.mjs (univers)
//   - data/*.json (OHLC quotidiens)
//
// Sorties :
//   - tools/backtests/output/pullback-lookahead-audit-v1.json
//   - tools/backtests/output/pullback-lookahead-audit-v1.md
//
// Le moteur fait :
//   1. Audit STATIQUE du code Pullback (identification des biais line-by-line).
//   2. RE-SIMULATION avec plusieurs modèles d'entrée alternatifs :
//      - CURRENT          : exactement comme aujourd'hui (entry=ema20, stop/tp
//                           calculés sur fenêtre incluant la bougie signal)
//      - CURRENT_NO_LEAK  : entry=ema20 mais stop/tp excluent la bougie signal
//                           (isole le look-ahead stop/tp uniquement)
//      - SIGNAL_CLOSE     : entry=close[i] (signal validé en fin de jour, on
//                           paie le close). Stop/tp excluent la bougie signal.
//      - NEXT_OPEN        : entry=open[i+1]. Stop/tp excluent la bougie signal.
//      - RETOUCH_EMA20    : entry=ema20[i] mais seulement si low[i+1..i+3]
//                           ≤ ema20[i] dans les 3 prochaines bougies.
//                           Si jamais touché, trade annulé.
//      - MID_NEXT_BAR     : entry=(open[i+1]+close[i+1])/2. Stop/tp excluent
//                           la bougie signal. Simul à partir de i+2.
//   3. Pour chaque modèle, recalcule : trades, wins, losses, winrate,
//      expectancy, profit factor, max drawdown.
//   4. Mesure l'inflation entre CURRENT et chaque modèle réaliste.
//   5. Produit un verdict de sévérité : CLEAN / LOW_RISK / MEDIUM_RISK /
//      HIGH_RISK / INVALID_BACKTEST.

import fs from "node:fs";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

import { UNIVERSE } from "./universe-v2.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const DATA_DIR = join(REPO_ROOT, "data");
const OUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const OUT_JSON = join(OUT_DIR, "pullback-lookahead-audit-v1.json");
const OUT_MD = join(OUT_DIR, "pullback-lookahead-audit-v1.md");

const SYMBOLS = [...new Set(Object.values(UNIVERSE).flat())];

const VARIANTS = [
  { name: "pullback_rsi42_58_chg20_5_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 0.1 },
  { name: "pullback_rsi42_58_chg20_3_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 0.1 },
  { name: "pullback_base_rsi42_58_chg20_0_stop0.1", rsiMin: 42, rsiMax: 58, chg20Min: 0, stopAtr: 0.1 },
  { name: "pullback_rsi42_58_chg20_5_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 5, stopAtr: 0.5 },
  { name: "pullback_rsi42_58_chg20_3_stop0.5", rsiMin: 42, rsiMax: 58, chg20Min: 3, stopAtr: 0.5 },
];

const ENTRY_MODELS = [
  "CURRENT",
  "CURRENT_NO_LEAK",
  "SIGNAL_CLOSE",
  "NEXT_OPEN",
  "RETOUCH_EMA20",
  "MID_NEXT_BAR",
];

// === Helpers (réimplémentés à l'identique du code source) ==================

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function ema(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = avg(values.slice(0, period));
  for (let i = 0; i < period - 1; i++) out.push(null);
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values, period = 14) {
  if (values.length < period + 1) return [];
  let gains = 0, losses = 0;
  const result = [];
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = 0; i < period; i++) result.push(null);
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

function pctChange(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return ((a - b) / b) * 100;
}

function trueRanges(candles) {
  const trs = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs;
}

function averageRange(candles, period = 14) {
  if (candles.length < period + 1) return null;
  return avg(trueRanges(candles).slice(-period));
}

function normalizeCandles(raw) {
  return raw
    .map((c) => ({
      time: c.time || c.date || c.datetime || c.timestamp,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || 0),
    }))
    .filter((c) => c.time && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function loadCandles(symbol) {
  const path = join(DATA_DIR, `${symbol}_2025.json`);
  if (!fs.existsSync(path)) return null;
  return normalizeCandles(JSON.parse(fs.readFileSync(path, "utf8")));
}

// === Signal Pullback (reproduit du code source) ============================
//
// Retourne les composantes utiles pour CHAQUE modèle d'entrée. signalIdx est
// l'indice de la bougie de signal.
//
// IMPORTANT : on calcule deux versions de swingHigh20/swingLow10 :
//   - withSignal     : fenêtre [signalIdx-19..signalIdx] (= code actuel)
//   - withoutSignal  : fenêtre [signalIdx-20..signalIdx-1] (sans la bougie i)
// Idem pour atr : avec ou sans la bougie i.

function detectPullbackComponents(candles, signalIdx, variant) {
  if (signalIdx < 60) return null;
  const slice = candles.slice(0, signalIdx + 1); // inclut la bougie i
  const closes = slice.map((c) => c.close);
  const ema20Series = ema(closes, 20);
  const ema50Series = ema(closes, 50);
  const rsiSeries = rsi(closes, 14);

  const last = closes.at(-1);
  const ema20 = ema20Series.at(-1);
  const ema50 = ema50Series.at(-1);
  const rsi14 = rsiSeries.at(-1);

  const distEma20 = pctChange(last, ema20);
  const chg5 = pctChange(last, closes[closes.length - 6]);
  const chg20 = pctChange(last, closes[closes.length - 21]);

  // Fenêtres INCLUANT la bougie signal (= code actuel = look-ahead potentiel)
  const recent20WithSignal = slice.slice(-20);
  const recent10WithSignal = slice.slice(-10);
  const swingHigh20_withSignal = Math.max(...recent20WithSignal.map((c) => c.high));
  const swingLow10_withSignal = Math.min(...recent10WithSignal.map((c) => c.low));

  // Fenêtres EXCLUANT la bougie signal (= versions "no leak")
  const recent20WithoutSignal = slice.slice(-21, -1);
  const recent10WithoutSignal = slice.slice(-11, -1);
  const swingHigh20_withoutSignal = Math.max(...recent20WithoutSignal.map((c) => c.high));
  const swingLow10_withoutSignal = Math.min(...recent10WithoutSignal.map((c) => c.low));

  // ATR avec et sans la bougie signal
  const atrWithSignal = averageRange(slice, 14);
  const atrWithoutSignal = averageRange(slice.slice(0, -1), 14);

  const validConditions =
    ema20 > ema50 &&
    distEma20 >= -1 &&
    distEma20 <= 2 &&
    rsi14 >= variant.rsiMin &&
    rsi14 <= variant.rsiMax &&
    chg5 < 0 &&
    chg20 > variant.chg20Min;

  if (!validConditions || !atrWithSignal) return null;

  return {
    signalIdx,
    signalCandle: candles[signalIdx],
    ema20,
    ema50,
    rsi14,
    distEma20,
    chg5,
    chg20,
    swingHigh20_withSignal,
    swingLow10_withSignal,
    swingHigh20_withoutSignal,
    swingLow10_withoutSignal,
    atrWithSignal,
    atrWithoutSignal,
  };
}

// === Construction du trade selon le modèle d'entrée =========================
//
// Retourne { entry, stop, tp, rr, simulStartIdx } ou null si modèle skip.
// simulStartIdx = bougie à partir de laquelle on commence à tester stop/tp.

function buildTradeForModel(model, comp, candles, variant) {
  const i = comp.signalIdx;
  const ema20 = comp.ema20;
  // Construction stop/tp selon le modèle
  // CURRENT = comme code source = avec bougie signal
  // sinon = sans bougie signal
  let swingHigh20, swingLow10, atr;
  if (model === "CURRENT") {
    swingHigh20 = comp.swingHigh20_withSignal;
    swingLow10 = comp.swingLow10_withSignal;
    atr = comp.atrWithSignal;
  } else {
    swingHigh20 = comp.swingHigh20_withoutSignal;
    swingLow10 = comp.swingLow10_withoutSignal;
    atr = comp.atrWithoutSignal;
  }
  if (!Number.isFinite(atr) || atr <= 0) return null;

  let entry;
  let simulStartIdx;

  switch (model) {
    case "CURRENT":
    case "CURRENT_NO_LEAK": {
      entry = ema20;
      simulStartIdx = i + 1; // simulation à partir de la bougie suivante
      break;
    }
    case "SIGNAL_CLOSE": {
      entry = comp.signalCandle.close;
      simulStartIdx = i + 1;
      break;
    }
    case "NEXT_OPEN": {
      if (i + 1 >= candles.length) return null;
      entry = candles[i + 1].open;
      simulStartIdx = i + 1;
      break;
    }
    case "MID_NEXT_BAR": {
      if (i + 1 >= candles.length) return null;
      const next = candles[i + 1];
      entry = (next.open + next.close) / 2;
      simulStartIdx = i + 2; // mid-bar implique qu'on regarde la bougie d'APRÈS pour stop/tp
      break;
    }
    case "RETOUCH_EMA20": {
      // Cherche dans les 3 bougies suivantes si low <= ema20[i]
      const lookforward = 3;
      let touchedIdx = -1;
      for (let j = i + 1; j <= Math.min(i + lookforward, candles.length - 1); j++) {
        if (candles[j].low <= ema20) {
          touchedIdx = j;
          break;
        }
      }
      if (touchedIdx === -1) return { skipped: true, reason: "EMA20 not retouched within 3 bars" };
      entry = ema20;
      simulStartIdx = touchedIdx;
      break;
    }
    default:
      throw new Error(`Unknown model: ${model}`);
  }

  const stop = swingLow10 - atr * variant.stopAtr;
  const tp = swingHigh20;
  const rr = (tp - entry) / (entry - stop);
  if (!Number.isFinite(rr) || rr < 1.6 || entry - stop <= 0) return { skipped: true, reason: "rr<1.6 or stop>=entry" };

  return { entry, stop, tp, rr, simulStartIdx };
}

// === Simulation du trade ====================================================
//
// Strictement identique à la logique du code source : 10 bougies max, LOSS si
// stop ET tp dans la même bougie, prioritaire LOSS, sinon TIMEOUT.

function simulateTrade(candles, trade) {
  const startIdx = trade.simulStartIdx;
  const endIdx = Math.min(startIdx + 10, candles.length);
  for (let j = startIdx; j < endIdx; j++) {
    const c = candles[j];
    const stopHit = c.low <= trade.stop;
    const tpHit = c.high >= trade.tp;
    if (stopHit && tpHit) return { result: "LOSS", pnl: -1 };
    if (stopHit) return { result: "LOSS", pnl: -1 };
    if (tpHit) return { result: "WIN", pnl: trade.rr };
  }
  return { result: "TIMEOUT", pnl: 0 };
}

// === Agrégation =============================================================

function summarizeTrades(trades) {
  const total = trades.length;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const timeouts = trades.filter((t) => t.pnl === 0).length;
  const grossWin = wins.reduce((a, b) => a + b.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b.pnl, 0));
  const totalPnl = trades.reduce((a, b) => a + b.pnl, 0);

  let equity = 0, peak = 0, maxDD = 0;
  for (const t of trades) {
    equity += t.pnl;
    if (equity > peak) peak = equity;
    maxDD = Math.max(maxDD, peak - equity);
  }

  return {
    trades: total,
    wins: wins.length,
    losses: losses.length,
    timeouts,
    winrate: total ? Number(((wins.length / total) * 100).toFixed(2)) : null,
    expectancy: total ? Number((totalPnl / total).toFixed(3)) : null,
    profitFactor: grossLoss === 0 ? (grossWin > 0 ? 999 : 0) : Number((grossWin / grossLoss).toFixed(3)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    totalPnl: Number(totalPnl.toFixed(2)),
  };
}

// === Simulation globale par (model, variant, symbol) ========================

function runSimulationForSymbol(symbol, candles) {
  // Indexation des signaux par variant — on calcule les composantes UNE fois
  // par (variant, i), puis on les utilise pour chaque modèle.
  const out = {};
  for (const variant of VARIANTS) {
    for (const model of ENTRY_MODELS) {
      out[`${variant.name}|${model}`] = [];
    }
  }

  for (let i = 220; i < candles.length - 11; i++) {
    for (const variant of VARIANTS) {
      const comp = detectPullbackComponents(candles, i, variant);
      if (!comp) continue;
      for (const model of ENTRY_MODELS) {
        const trade = buildTradeForModel(model, comp, candles, variant);
        if (!trade || trade.skipped) continue;
        const result = simulateTrade(candles, trade);
        out[`${variant.name}|${model}`].push({
          symbol,
          time: comp.signalCandle.time,
          pnl: result.pnl,
          result: result.result,
          rr: trade.rr,
        });
      }
    }
  }
  return out;
}

// === Audit statique du code source ==========================================

function staticAudit() {
  return {
    fileAudited: "tools/backtests/backtest-multi-setup-grid.mjs (et backtest-pullback-yearly-walkforward.mjs)",
    findings: [
      {
        id: "F1",
        category: "future_candle_leakage",
        component: "swingHigh20 (TP)",
        codeRef: "detectPullback : candles.slice(-20).map(c => c.high)",
        description: "swingHigh20 inclut la bougie signal elle-même (candles[i]). Si le high de la bougie i = swingHigh20, le TP est égal au high réalisé pendant la bougie i — un niveau qui peut avoir été touché AVANT que le trader puisse réagir.",
        severity: "MEDIUM",
        verdict: "RISKY",
        evidence: "Ligne `swingHigh20 = Math.max(...recent20.map(c => c.high))` avec recent20 = candles.slice(-20).",
      },
      {
        id: "F2",
        category: "future_candle_leakage",
        component: "swingLow10 (stop)",
        codeRef: "detectPullback : candles.slice(-10).map(c => c.low)",
        description: "swingLow10 inclut la bougie signal. Si le low de la bougie i fait un nouveau bas dans la fenêtre, le stop calculé est sous ce low — stop potentiellement déjà touché pendant la bougie i.",
        severity: "MEDIUM",
        verdict: "RISKY",
        evidence: "Ligne `swingLow10 = Math.min(...recent10.map(c => c.low))` avec recent10 = candles.slice(-10).",
      },
      {
        id: "F3",
        category: "execution_bias",
        component: "entry = ema20",
        codeRef: "detectPullback : const entry = ema20",
        description: "L'entrée est l'EMA20 calculée EN INCLUANT la close de la bougie signal. Or à la fin de la bougie i, le close peut être différent de l'EMA20. Le moteur suppose qu'on a réussi à acheter à EMA20 pendant la bougie i, sans vérifier que le low de la bougie i a touché EMA20.",
        severity: "HIGH",
        verdict: "RISKY",
        evidence: "Lignes `const ema20 = ema20Series.at(-1)` puis `const entry = ema20`. Aucun check `low[i] <= ema20`.",
      },
      {
        id: "F4",
        category: "indicator_recomputation",
        component: "EMA20, EMA50, RSI14",
        codeRef: "detectPullback : ema(closes, 20) etc.",
        description: "Les indicateurs sont recalculés sur la fenêtre incluant la bougie i. C'est nécessaire pour générer le signal en fin de jour, mais utiliser EMA20[i] comme PRIX d'entrée pose problème car cette EMA20 ne pouvait être connue qu'à 16h.",
        severity: "LOW",
        verdict: "RISKY",
        evidence: "Le calcul EMA est correct (causal). Le problème n'est pas le calcul, mais l'usage comme prix d'entrée.",
      },
      {
        id: "F5",
        category: "intraday_impossibility",
        component: "TP / stop sur même bougie",
        codeRef: "simulateTrade : `if (stopHit && tpHit) return LOSS`",
        description: "Si stop et TP sont touchés dans la même bougie, on assume LOSS (worst case). C'est CONSERVATEUR — bon point. Mais si l'entrée à EMA20 a eu lieu pendant la bougie i, et que stop/tp ont aussi pu être touchés pendant cette même bougie i, l'analyse n'en tient pas compte (simulation commence à i+1).",
        severity: "LOW",
        verdict: "SAFE (conservateur côté simulation, mais incohérent avec entry intraday)",
        evidence: "Simulation `simulateTrade(candles.slice(i + 1, i + 11), setup)` commence à i+1.",
      },
      {
        id: "F6",
        category: "timestamp_alignment",
        component: "timing du signal",
        codeRef: "boucle for(i=220; i<candles.length-11; i++) puis slice(0, i+1)",
        description: "Le signal est généré en utilisant TOUTES les données jusqu'à i inclus (close de la bougie i compris). Donc le signal n'est utilisable qu'EN FIN de bougie i. L'entrée à EMA20[i] (potentiellement < close[i]) suppose qu'on a pu se positionner à un prix vu plus tôt dans la journée — c'est de l'INTRADAY déguisé en daily.",
        severity: "HIGH",
        verdict: "RISKY",
        evidence: "Pas de séparation explicite entre `signal time` et `entry time` dans le code. Le rapport recommande de distinguer.",
      },
      {
        id: "F7",
        category: "survivorship_bias",
        component: "univers fixé via universe-v2.mjs",
        codeRef: "import { UNIVERSE } from './universe-v2.mjs'",
        description: "L'univers testé est celui actuellement défini dans universe-v2. Les actifs delistés ou ETFs retirés entre 2021 et 2025 ne sont pas dans le set. Risque de survivorship bias, à quantifier par audit séparé des sources data/*.json.",
        severity: "MEDIUM",
        verdict: "UNKNOWN (à mesurer)",
        evidence: "Le moteur ne charge que les symboles existant en `data/SYMBOL_2025.json`. Pas de liste de delistés.",
      },
      {
        id: "F8",
        category: "execution_bias",
        component: "rr (risk/reward)",
        codeRef: "const rr = (tp - entry) / (entry - stop)",
        description: "Le rr est calculé avec entry = ema20 (potentiellement < close). Si l'entry réelle est au close (modèle SIGNAL_CLOSE), le rr s'effondre car (tp - close) est plus petit et (close - stop) est plus grand. L'edge mesuré est donc tributaire de cette hypothèse d'entrée optimiste.",
        severity: "HIGH",
        verdict: "RISKY",
        evidence: "Aucune mesure de sensibilité du rr selon le modèle d'entrée dans le code source.",
      },
      {
        id: "F9",
        category: "data_completeness",
        component: "data/*.json",
        codeRef: "loadCandles : fs.readFileSync(`./data/${symbol}_2025.json`)",
        description: "Les fichiers data/ semblent complets (1255 candles par symbole sur 2021-2025). À vérifier en croisant avec la liste UNIVERSE — chaque symbole de UNIVERSE doit avoir son fichier OHLC. Symboles manquants signalent un possible biais (univers déclaré ≠ univers testé).",
        severity: "LOW",
        verdict: "UNKNOWN (à mesurer)",
        evidence: "Vérification dynamique faite par le moteur d'audit, voir section 8.",
      },
    ],
  };
}

// === Construction du rapport ================================================

function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "n/a";
  return Number(n).toFixed(d);
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Pullback Look-Ahead Audit v1 — ManiTradePro");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/pullback-lookahead-audit-v1.mjs\`.`);
  lines.push("");
  lines.push("**⚠ Audit offline uniquement.** Aucun ordre, aucun broker, aucun endpoint live. Lecture seule des données existantes. L'objectif est de détecter un faux edge, pas de sauver le setup.");
  lines.push("");

  lines.push("## 1. Scope");
  lines.push("");
  lines.push("Audit du setup PULLBACK_MOMENTUM tel qu'implémenté dans :");
  lines.push("");
  lines.push("- `tools/backtests/backtest-multi-setup-grid.mjs` (5 variantes)");
  lines.push("- `tools/backtests/backtest-pullback-yearly-walkforward.mjs` (10 variantes, même logique de signal)");
  lines.push("");
  lines.push("Objectif : détecter look-ahead bias, temporal leakage, execution bias, survivorship bias et mesurer leur impact réel par re-simulation avec plusieurs modèles d'entrée.");
  lines.push("");

  lines.push("## 2. Sources analysées");
  lines.push("");
  for (const s of report.sources) lines.push(`- ${s}`);
  lines.push("");

  lines.push("## 3. Méthodologie");
  lines.push("");
  lines.push("1. **Audit statique** : lecture line-by-line du code Pullback. Identification des composantes utilisant potentiellement de l'information future (EMA20 incluant le close de la bougie signal, swingHigh20/swingLow10 sur fenêtres incluant la bougie signal).");
  lines.push("");
  lines.push("2. **Re-simulation** sur les mêmes données OHLC quotidiens (`data/*.json`, 2021-2025, 182 symboles) avec **6 modèles d'entrée** :");
  lines.push("");
  lines.push("   | Modèle | Entrée | Stop/TP fenêtre | Description |");
  lines.push("   |---|---|---|---|");
  lines.push("   | CURRENT | EMA20[i] | inclut bougie i | Code actuel — baseline |");
  lines.push("   | CURRENT_NO_LEAK | EMA20[i] | exclut bougie i | Isole le look-ahead stop/TP |");
  lines.push("   | SIGNAL_CLOSE | close[i] | exclut bougie i | Réaliste : on paie le close |");
  lines.push("   | NEXT_OPEN | open[i+1] | exclut bougie i | Réaliste : entrée à l'open suivant |");
  lines.push("   | RETOUCH_EMA20 | EMA20[i] (si touché dans 3 bars) | exclut bougie i | Conserve l'entrée EMA20 mais conditionnée à un retouch réel |");
  lines.push("   | MID_NEXT_BAR | (open[i+1]+close[i+1])/2 | exclut bougie i | Hypothèse d'exécution moyenne |");
  lines.push("");
  lines.push("3. **Pour chaque modèle**, calcul de : trades, wins, losses, winrate, expectancy (R), profit factor, max drawdown (R), inflation vs CURRENT.");
  lines.push("");

  lines.push("## 4. Signal timing audit");
  lines.push("");
  lines.push("- Le signal Pullback est généré en utilisant `candles.slice(0, i + 1)` — donc inclut la bougie i. Le close de la bougie i est nécessaire pour calculer EMA20[i] et RSI[i].");
  lines.push("- **Conclusion** : le signal n'est utilisable qu'EN FIN de bougie i (après son close, daily = ~16h ET). Toute exécution intraday pendant la bougie i est impossible sauf à recalculer le signal à chaque tick — ce qui n'est PAS fait dans le code.");
  lines.push("- **Daily close only** : le signal devrait être utilisé pour une décision d'entrée à `i+1`, pas pendant `i`.");
  lines.push("");

  lines.push("## 5. Indicator audit");
  lines.push("");
  lines.push("| Indicateur | Calcul causal ? | Verdict |");
  lines.push("|---|---|---|");
  lines.push("| EMA20, EMA50 | Oui (récurrence avant) | SAFE |");
  lines.push("| RSI14 | Oui (récurrence avant) | SAFE |");
  lines.push("| ATR14 | Oui (TR sur bougies passées) | SAFE |");
  lines.push("| chg5, chg20 | Oui (close[i] vs close[i-5/20]) | SAFE |");
  lines.push("| swingHigh20 | Oui MAIS inclut high[i] | **RISKY** (cf. F1) |");
  lines.push("| swingLow10 | Oui MAIS inclut low[i] | **RISKY** (cf. F2) |");
  lines.push("");
  lines.push("Aucun indicateur n'utilise candle N+1 ou future. Les indicateurs eux-mêmes sont causaux. Le problème est l'USAGE de l'EMA20[i] comme prix d'entrée et les fenêtres incluant la bougie i pour le stop/TP.");
  lines.push("");

  lines.push("## 6. Entry realism audit (point central)");
  lines.push("");
  lines.push("Re-simulation par variant et modèle d'entrée, agrégée sur tous les symboles et toutes les années :");
  lines.push("");
  for (const v of report.variantResults) {
    lines.push(`### ${v.variant}`);
    lines.push("");
    lines.push("| Modèle | Trades | Wins | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation PF vs CURRENT |");
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
    for (const m of ENTRY_MODELS) {
      const r = v.byModel[m];
      const current = v.byModel.CURRENT;
      let inflation = "—";
      if (m !== "CURRENT" && r.trades > 0 && current.profitFactor > 0 && r.profitFactor > 0) {
        const ratio = current.profitFactor / r.profitFactor;
        inflation = `×${fmt(ratio, 2)}`;
      }
      lines.push(`| ${m} | ${r.trades.toLocaleString("fr-FR")} | ${r.wins} | ${r.winrate !== null ? fmt(r.winrate) + " %" : "n/a"} | ${fmt(r.expectancy, 3)} | ${fmt(r.profitFactor, 2)} | ${fmt(r.maxDrawdown, 1)} | ${inflation} |`);
    }
    lines.push("");
  }
  lines.push("**Lecture** : `Inflation PF vs CURRENT = PF_CURRENT / PF_modele` quantifie de combien le PF du modèle CURRENT est gonflé par rapport à ce modèle plus réaliste. Une inflation ×1.5 signifie que CURRENT affiche 50 % de profit factor en trop.");
  lines.push("");

  lines.push("### Synthèse globale (somme des trades de tous variants)");
  lines.push("");
  lines.push("| Modèle | Trades | Winrate | Expectancy (R) | Profit factor | Max DD (R) | Inflation vs CURRENT |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const m of ENTRY_MODELS) {
    const g = report.global.byModel[m];
    const current = report.global.byModel.CURRENT;
    let inflation = "—";
    if (m !== "CURRENT" && g.trades > 0 && current.profitFactor > 0 && g.profitFactor > 0) {
      const ratio = current.profitFactor / g.profitFactor;
      inflation = `×${fmt(ratio, 2)}`;
    }
    lines.push(`| ${m} | ${g.trades.toLocaleString("fr-FR")} | ${g.winrate !== null ? fmt(g.winrate) + " %" : "n/a"} | ${fmt(g.expectancy, 3)} | ${fmt(g.profitFactor, 2)} | ${fmt(g.maxDrawdown, 1)} | ${inflation} |`);
  }
  lines.push("");

  lines.push("## 7. Intraday impossibility audit");
  lines.push("");
  lines.push("Hypothèses de la simulation actuelle :");
  lines.push("- Stop et TP testés à partir de la bougie `i+1` (la bougie de signal n'est PAS testée).");
  lines.push("- Si stop ET TP sont touchés dans la même bougie post-signal, on assume LOSS (conservateur).");
  lines.push("");
  lines.push("Cas problématiques détectés :");
  lines.push("- **Entry à EMA20[i]** alors qu'aucune vérification `low[i] ≤ EMA20[i]` n'est faite. Si le prix n'est jamais redescendu à EMA20 pendant la bougie i, l'entrée est impossible — pourtant le code la valide.");
  lines.push("- **TP = swingHigh20 incluant high[i]** : si high[i] est le plus haut de la fenêtre, le TP a déjà été touché pendant la bougie i, avant même d'avoir pu prendre la position.");
  lines.push("- **Stop = swingLow10 incluant low[i] - atr*x** : symétrique. Si low[i] est le plus bas, le stop est sous un niveau déjà visité ce jour-là.");
  lines.push("");
  lines.push("Le modèle CURRENT du backtest n'audite aucune de ces incohérences intraday.");
  lines.push("");

  lines.push("## 8. Survivorship audit");
  lines.push("");
  lines.push(`- Univers déclaré (\`universe-v2.mjs\`) : **${report.survivorship.declaredUniverseSize}** symboles uniques.`);
  lines.push(`- Fichiers OHLC disponibles dans \`data/\` : **${report.survivorship.dataFilesAvailable}**.`);
  lines.push(`- Symboles déclarés SANS fichier OHLC : **${report.survivorship.missingDataSymbols.length}** (${report.survivorship.missingDataSymbols.slice(0, 12).join(", ") || "_aucun_"}${report.survivorship.missingDataSymbols.length > 12 ? "…" : ""}).`);
  lines.push(`- Fichiers OHLC pour symboles HORS univers : **${report.survivorship.dataFilesNotInUniverse.length}** (potentiels survivants à inclure ou résidus à nettoyer).`);
  lines.push("");
  lines.push("**Limites de l'audit survivorship** :");
  lines.push("- Aucune liste de tickers delistés 2021-2025 n'est disponible dans le repo. L'audit ne peut détecter QUE les symboles dans `UNIVERSE` sans fichier OHLC. Les actifs disparus AVANT entrée dans `UNIVERSE` ne sont pas comptés.");
  lines.push("- Les ETFs fermés (ARKK clones, thématiques arrêtées) ne sont pas dans la liste. Risque de biais positif modéré.");
  lines.push("");

  lines.push("## 9. Findings détaillés");
  lines.push("");
  for (const f of report.staticAudit.findings) {
    lines.push(`### ${f.id} — ${f.component} (${f.category})`);
    lines.push("");
    lines.push(`- Severity : **${f.severity}** · Verdict : **${f.verdict}**`);
    lines.push(`- Réf. code : \`${f.codeRef}\``);
    lines.push(`- Description : ${f.description}`);
    lines.push(`- Preuve : ${f.evidence}`);
    lines.push("");
  }

  lines.push("## 10. Severity grading");
  lines.push("");
  lines.push("Échelle : **CLEAN**, **LOW_RISK**, **MEDIUM_RISK**, **HIGH_RISK**, **INVALID_BACKTEST**.");
  lines.push("");
  lines.push(`Verdict global : **${report.severity.global}**`);
  lines.push("");
  lines.push("Décomposition :");
  lines.push("");
  lines.push("| Source de risque | Severity | Justification |");
  lines.push("|---|---|---|");
  for (const r of report.severity.breakdown) {
    lines.push(`| ${r.kind} | ${r.level} | ${r.justification} |`);
  }
  lines.push("");

  lines.push("## 11. Estimated performance inflation");
  lines.push("");
  const inflations = [];
  for (const m of ENTRY_MODELS) {
    if (m === "CURRENT") continue;
    const cur = report.global.byModel.CURRENT;
    const tar = report.global.byModel[m];
    if (cur.profitFactor > 0 && tar.profitFactor > 0) {
      inflations.push({ model: m, pfInflation: cur.profitFactor / tar.profitFactor, exInflation: cur.expectancy / (tar.expectancy || Number.EPSILON), curPF: cur.profitFactor, tarPF: tar.profitFactor, curE: cur.expectancy, tarE: tar.expectancy });
    }
  }
  lines.push("Comparaison du PF agrégé CURRENT vs chaque modèle réaliste :");
  lines.push("");
  lines.push("| Modèle réaliste | PF CURRENT | PF modèle | Inflation PF | Expectancy CURRENT | Expectancy modèle | Inflation E |");
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const inf of inflations) {
    lines.push(`| ${inf.model} | ${fmt(inf.curPF, 2)} | ${fmt(inf.tarPF, 2)} | ×${fmt(inf.pfInflation, 2)} | ${fmt(inf.curE, 3)} | ${fmt(inf.tarE, 3)} | ${fmt(inf.exInflation, 2)} |`);
  }
  lines.push("");
  if (inflations.length) {
    const max = inflations.reduce((a, b) => a.pfInflation > b.pfInflation ? a : b);
    const min = inflations.reduce((a, b) => a.pfInflation < b.pfInflation ? a : b);
    lines.push(`**Inflation PF estimée** : entre ×${fmt(min.pfInflation, 2)} (${min.model}) et ×${fmt(max.pfInflation, 2)} (${max.model}).`);
    lines.push("");
    lines.push("**Lecture pratique** :");
    lines.push("- Si CURRENT affiche PF 1.72, le PF réel après suppression du look-ahead est probablement entre " +
      `${fmt(report.global.byModel.CURRENT.profitFactor / max.pfInflation, 2)} et ${fmt(report.global.byModel.CURRENT.profitFactor / min.pfInflation, 2)} selon le modèle d'exécution choisi.`);
  }
  lines.push("");

  lines.push("## 12. Final verdict");
  lines.push("");
  lines.push(`**Severity globale : ${report.severity.global}**`);
  lines.push("");
  for (const line of report.verdictSummary) lines.push(`- ${line}`);
  lines.push("");
  lines.push("### Recommandations");
  lines.push("");
  for (const r of report.recommendations) lines.push(`- ${r}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("**Hypothèses** : tous les indicateurs sont causaux, l'OHLC daily est utilisé tel quel, pas de friction modélisée dans la simulation, simulation 10 bougies max, LOSS prioritaire si stop+TP même bougie. La simulation n'inclut PAS de slippage ni de fees.");
  lines.push("");
  lines.push("**Limites** : audit statique sur code source actuel uniquement, simulation limitée à 5 variantes principales de Pullback (les 5 de `backtest-multi-setup-grid.mjs`). Le moteur n'audite pas les versions différentes (`backtest-pullback-2025.mjs`, `backtest-pullback-grid-2025.mjs`) — mais elles partagent la même logique signal/entry et héritent donc des mêmes biais.");

  return lines.join("\n");
}

// === Severity model =========================================================

function computeSeverity(global, staticFindings, survivorship) {
  const breakdown = [];
  const cur = global.byModel.CURRENT;
  const sc = global.byModel.SIGNAL_CLOSE;
  const no = global.byModel.NEXT_OPEN;

  // Inflation par rapport à NEXT_OPEN (modèle le plus réaliste pour daily)
  const pfInflationNo = (cur.profitFactor > 0 && no.profitFactor > 0) ? cur.profitFactor / no.profitFactor : null;
  const pfInflationSc = (cur.profitFactor > 0 && sc.profitFactor > 0) ? cur.profitFactor / sc.profitFactor : null;

  let entryLevel;
  if (pfInflationNo === null) entryLevel = "UNKNOWN";
  else if (pfInflationNo < 1.1) entryLevel = "LOW_RISK";
  else if (pfInflationNo < 1.3) entryLevel = "MEDIUM_RISK";
  else if (pfInflationNo < 1.7) entryLevel = "HIGH_RISK";
  else entryLevel = "INVALID_BACKTEST";
  breakdown.push({ kind: "Entry execution bias (entry=ema20)", level: entryLevel, justification: pfInflationNo !== null ? `PF CURRENT ${cur.profitFactor.toFixed(2)} / PF NEXT_OPEN ${no.profitFactor.toFixed(2)} = inflation ×${pfInflationNo.toFixed(2)}` : "indéterminé" });

  // Stop/TP look-ahead : compare CURRENT vs CURRENT_NO_LEAK
  const cnl = global.byModel.CURRENT_NO_LEAK;
  const pfInflationCnl = (cur.profitFactor > 0 && cnl.profitFactor > 0) ? cur.profitFactor / cnl.profitFactor : null;
  let stopTpLevel;
  if (pfInflationCnl === null) stopTpLevel = "UNKNOWN";
  else if (pfInflationCnl < 1.05) stopTpLevel = "LOW_RISK";
  else if (pfInflationCnl < 1.15) stopTpLevel = "MEDIUM_RISK";
  else if (pfInflationCnl < 1.3) stopTpLevel = "HIGH_RISK";
  else stopTpLevel = "INVALID_BACKTEST";
  breakdown.push({ kind: "Stop/TP look-ahead (fenêtres incluant bougie signal)", level: stopTpLevel, justification: pfInflationCnl !== null ? `PF CURRENT ${cur.profitFactor.toFixed(2)} / PF CURRENT_NO_LEAK ${cnl.profitFactor.toFixed(2)} = inflation ×${pfInflationCnl.toFixed(2)}` : "indéterminé" });

  // Survivorship
  let survLevel;
  if (survivorship.missingDataSymbols.length === 0) survLevel = "LOW_RISK";
  else if (survivorship.missingDataSymbols.length < 5) survLevel = "MEDIUM_RISK";
  else survLevel = "HIGH_RISK";
  breakdown.push({ kind: "Survivorship bias", level: survLevel, justification: `${survivorship.missingDataSymbols.length} symboles UNIVERSE sans OHLC, ${survivorship.dataFilesNotInUniverse.length} fichiers OHLC hors univers. Pas de liste de delistés pour audit complet.` });

  // Indicator recomputation : on a montré que les indicateurs sont causaux
  breakdown.push({ kind: "Indicator recomputation / future leakage", level: "LOW_RISK", justification: "Tous les indicateurs (EMA, RSI, ATR, chg) sont causaux. Aucun usage de candle N+1 détecté. Le risque vient de l'USAGE (entry=EMA20[i]) pas du calcul." });

  // Verdict global = pire des composantes
  const levels = ["CLEAN", "LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "INVALID_BACKTEST"];
  let worstIdx = -1;
  for (const r of breakdown) {
    const idx = levels.indexOf(r.level);
    if (idx > worstIdx) worstIdx = idx;
  }
  const global_ = worstIdx >= 0 ? levels[worstIdx] : "UNKNOWN";

  return { global: global_, breakdown };
}

// === Verdict summary + recommendations ======================================

function buildVerdict(severity, global, recordedFindings) {
  const lines = [];
  const cur = global.byModel.CURRENT;
  const no = global.byModel.NEXT_OPEN;
  const sc = global.byModel.SIGNAL_CLOSE;
  const re = global.byModel.RETOUCH_EMA20;

  lines.push(`Le modèle CURRENT (code en place) affiche un profit factor agrégé de **${cur.profitFactor.toFixed(2)}** sur ${cur.trades.toLocaleString("fr-FR")} trades.`);
  if (no.trades > 0 && no.profitFactor > 0) {
    const inf = cur.profitFactor / no.profitFactor;
    lines.push(`Avec un modèle d'entrée réaliste (NEXT_OPEN, exécution à l'open de la bougie suivante), le PF tombe à **${no.profitFactor.toFixed(2)}** — inflation ×${inf.toFixed(2)}.`);
  }
  if (sc.trades > 0 && sc.profitFactor > 0) {
    const inf = cur.profitFactor / sc.profitFactor;
    lines.push(`Avec SIGNAL_CLOSE (entrée au close de la bougie signal), le PF tombe à **${sc.profitFactor.toFixed(2)}** — inflation ×${inf.toFixed(2)}.`);
  }
  if (re.trades > 0 && re.profitFactor > 0) {
    const dropTrades = cur.trades > 0 ? Math.round((1 - re.trades / cur.trades) * 100) : 0;
    lines.push(`Avec RETOUCH_EMA20 (entrée à EMA20 seulement si le low des 3 jours suivants y revient), ${dropTrades} % des trades CURRENT sont éliminés. Le PF restant est ${re.profitFactor.toFixed(2)} sur ${re.trades.toLocaleString("fr-FR")} trades.`);
  }
  lines.push(`Le code utilise EMA20[i], swingHigh20 et swingLow10 calculés sur une fenêtre INCLUANT la bougie signal — donc en partie postérieure au moment où le signal est censé être généré.`);
  lines.push(`Severity globale : **${severity.global}**. ${severity.breakdown.length} sources de risque identifiées, dont ${severity.breakdown.filter((b) => b.level === "HIGH_RISK" || b.level === "INVALID_BACKTEST").length} en HIGH_RISK ou pire.`);
  return lines;
}

function buildRecommendations(severity) {
  const recs = [];
  recs.push("**Corriger l'entrée** : utiliser `entry = open[i+1]` (NEXT_OPEN) ou conditionner `entry = ema20[i]` à un retouch explicite (`low[i+1..i+3] ≤ ema20[i]`).");
  recs.push("**Corriger stop/TP** : calculer swingHigh20 sur `candles[i-20..i-1]` et swingLow10 sur `candles[i-10..i-1]` — exclure la bougie signal de la fenêtre.");
  recs.push("**Recalculer toute la pipeline aval** : `tradable-universe-v1`, `rolling-walkforward-validator`, `tradable-universe-v2`, `allocation-engine-v3`, `setup-performance-summary` consomment toutes le PF gonflé. Les grades B actuels peuvent passer à C ou D après correction.");
  recs.push("**Audit symétrique sur Breakout, RS Rotation, Mean Reversion** : la même logique d'entrée intraday-déguisée-en-daily peut affecter d'autres setups (à vérifier par PR séparée).");
  recs.push("**Friction** : appliquer `friction-model-v1` sur le modèle réaliste pour mesurer l'edge effectif après coûts. Si PF post-friction < 1.1, le setup n'a plus d'edge.");
  if (severity.global === "INVALID_BACKTEST" || severity.global === "HIGH_RISK") {
    recs.push("**Ne pas trader Pullback Momentum en réel** tant que la correction du code source et la re-validation rolling walk-forward n'ont pas été faites.");
  }
  recs.push("**Audit survivorship** complémentaire : liste des tickers delistés 2021-2025 à recouper avec UNIVERSE pour quantifier le biais de survie.");
  return recs;
}

// === Main ===================================================================

async function main() {
  console.log("[pullback-lookahead-audit] démarrage");
  console.log(`[pullback-lookahead-audit] univers déclaré : ${SYMBOLS.length} symboles uniques`);

  // Charger candles
  const candlesBySymbol = new Map();
  const missingSymbols = [];
  for (const s of SYMBOLS) {
    const c = loadCandles(s);
    if (c && c.length) candlesBySymbol.set(s, c);
    else missingSymbols.push(s);
  }
  console.log(`[pullback-lookahead-audit] OHLC chargés pour ${candlesBySymbol.size} / ${SYMBOLS.length} symboles`);

  // Survivorship audit
  const allDataFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith("_2025.json")).map((f) => f.replace("_2025.json", ""));
  const dataFilesNotInUniverse = allDataFiles.filter((s) => !SYMBOLS.includes(s));
  const survivorship = {
    declaredUniverseSize: SYMBOLS.length,
    dataFilesAvailable: allDataFiles.length,
    missingDataSymbols: missingSymbols,
    dataFilesNotInUniverse,
  };

  // Simulation
  const aggregateByVariantModel = {};
  for (const v of VARIANTS) for (const m of ENTRY_MODELS) aggregateByVariantModel[`${v.name}|${m}`] = [];

  let processed = 0;
  for (const [symbol, candles] of candlesBySymbol) {
    const res = runSimulationForSymbol(symbol, candles);
    for (const [k, trades] of Object.entries(res)) {
      aggregateByVariantModel[k].push(...trades);
    }
    processed++;
    if (processed % 20 === 0) {
      console.log(`[pullback-lookahead-audit] simulé ${processed}/${candlesBySymbol.size} symboles…`);
    }
  }

  // Agrégation
  const variantResults = VARIANTS.map((v) => {
    const byModel = {};
    for (const m of ENTRY_MODELS) {
      byModel[m] = summarizeTrades(aggregateByVariantModel[`${v.name}|${m}`]);
    }
    return { variant: v.name, byModel };
  });

  // Global = somme des trades de tous variants
  const globalByModel = {};
  for (const m of ENTRY_MODELS) {
    const allTrades = [];
    for (const v of VARIANTS) {
      allTrades.push(...aggregateByVariantModel[`${v.name}|${m}`]);
    }
    globalByModel[m] = summarizeTrades(allTrades);
  }

  const staticReport = staticAudit();
  const severity = computeSeverity({ byModel: globalByModel }, staticReport.findings, survivorship);

  const report = {
    generatedAt: new Date().toISOString(),
    sources: [
      "tools/backtests/backtest-multi-setup-grid.mjs",
      "tools/backtests/backtest-pullback-yearly-walkforward.mjs",
      "tools/backtests/universe-v2.mjs",
      "data/*.json (OHLC quotidiens 2021-2025)",
      "tools/backtests/output/setup-performance-summary-v1.json (référence)",
      "tools/backtests/output/rolling-walkforward-validator.json (référence)",
      "tools/backtests/output/setup-variant-matrix.json (référence)",
    ],
    scope: "Audit look-ahead / temporal leakage / execution bias / survivorship du setup PULLBACK_MOMENTUM",
    entryModels: ENTRY_MODELS,
    variants: VARIANTS.map((v) => v.name),
    staticAudit: staticReport,
    survivorship,
    variantResults,
    global: { byModel: globalByModel },
    severity,
    verdictSummary: buildVerdict(severity, { byModel: globalByModel }, staticReport.findings),
    recommendations: buildRecommendations(severity),
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(OUT_MD, buildMarkdown(report), "utf8");

  console.log("[pullback-lookahead-audit] rapport écrit :");
  console.log(`  - ${relative(REPO_ROOT, OUT_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, OUT_MD)}`);
  console.log("");
  console.log(`Severity globale : ${severity.global}`);
  console.log("PF agrégé par modèle :");
  for (const m of ENTRY_MODELS) {
    const g = globalByModel[m];
    const inf = (m !== "CURRENT" && globalByModel.CURRENT.profitFactor > 0 && g.profitFactor > 0) ? `(×${(globalByModel.CURRENT.profitFactor / g.profitFactor).toFixed(2)})` : "";
    console.log(`  ${m.padEnd(20)} trades=${g.trades.toString().padStart(7)} PF=${(g.profitFactor || 0).toFixed(2).padStart(5)} E=${(g.expectancy || 0).toFixed(3).padStart(6)} WR=${(g.winrate || 0).toFixed(1).padStart(5)}% ${inf}`);
  }
}

main().catch((err) => {
  console.error("[pullback-lookahead-audit] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
