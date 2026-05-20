import fs from "fs";
import "dotenv/config";

const API_KEY = process.env.EODHD_API_KEY;

if (!API_KEY) {
  throw new Error("EODHD_API_KEY missing in .env");
}

const SYMBOL_MAP = {
  SPY: "SPY.US",
  QQQ: "QQQ.US",
  TLT: "TLT.US",
  GLD: "GLD.US",

  BTC: "BTC-USD.CC",
  ETH: "ETH-USD.CC",
  SOL: "SOL-USD.CC",
  BNB: "BNB-USD.CC",
  AVAX: "AVAX-USD.CC",
  LINK: "LINK-USD.CC",

  NVDA: "NVDA.US",
  AAPL: "AAPL.US",
  MSFT: "MSFT.US",
  AMD: "AMD.US",
  META: "META.US",
  GOOGL: "GOOGL.US",
  AMZN: "AMZN.US",
  TSLA: "TSLA.US",
  JPM: "JPM.US",
  V: "V.US",
  MA: "MA.US",
  NFLX: "NFLX.US",
  COIN: "COIN.US",
VIX: "^VIX.INDX",

  ASML: "ASML.AS",
  AIR: "AIR.PA",
  LVMH: "MC.PA",
  TTE: "TTE.PA",
  SAP: "SAP.XETRA",
  NESN: "NESN.SW",
  RMS: "RMS.PA",
  SIE: "SIE.XETRA",

KLAC: "KLAC.US",
LRCX: "LRCX.US",
AMAT: "AMAT.US",
ADI: "ADI.US",
MCHP: "MCHP.US",
ON: "ON.US",

PANW: "PANW.US",
CRWD: "CRWD.US",
DDOG: "DDOG.US",
MDB: "MDB.US",
NET: "NET.US",

AXP: "AXP.US",
BKNG: "BKNG.US",
INTU: "INTU.US",

IYW: "IYW.US",
FTEC: "FTEC.US",

TXN: "TXN.US",
NXPI: "NXPI.US",
MPWR: "MPWR.US",
ENTG: "ENTG.US",
TER: "TER.US",
SWKS: "SWKS.US",
QCOM: "QCOM.US",
MRVL: "MRVL.US",
INTC: "INTC.US",

FTNT: "FTNT.US",
ZS: "ZS.US",
OKTA: "OKTA.US",
CYBR: "CYBR.US",
S: "S.US",

SNPS: "SNPS.US",
CDNS: "CDNS.US",
ORCL: "ORCL.US",
HUBS: "HUBS.US",
TEAM: "TEAM.US",
SHOP: "SHOP.US",
ADBE: "ADBE.US",

ANET: "ANET.US",
DELL: "DELL.US",
SMCI: "SMCI.US",

BOTZ: "BOTZ.US",
CIBR: "CIBR.US",
HACK: "HACK.US",
FDN: "FDN.US",
SKYY: "SKYY.US",
PSI: "PSI.US",
XSD: "XSD.US",

STM: "STM.US",
CAP: "CAP.PA",
DSY: "DSY.PA",

UBER: "UBER.US",
ABNB: "ABNB.US",
MELI: "MELI.US",

TTD: "TTD.US",
APP: "APP.US",
DUOL: "DUOL.US",

WDAY: "WDAY.US",
NOW: "NOW.US",
CRM: "CRM.US",

LIN: "LIN.US",
ROP: "ROP.US",
PH: "PH.US",

MSTR: "MSTR.US",
IBIT: "IBIT.US",

IWM: "IWM.US",
MDY: "MDY.US",
SPYG: "SPYG.US",
VUG: "VUG.US",

XLK: "XLK.US",
SMH: "SMH.US",
SOXX: "SOXX.US",
IGV: "IGV.US",
VGT: "VGT.US",

AVGO: "AVGO.US",
TSM: "TSM.US",
MU: "MU.US",
ARM: "ARM.US",

CRM: "CRM.US",
NOW: "NOW.US",
PLTR: "PLTR.US",
SNOW: "SNOW.US",

NVMI: "NVMI.US",
ASX: "ASX.US",
AEHR: "AEHR.US",
ACLS: "ACLS.US",
CAMT: "CAMT.US",
ONTO: "ONTO.US",
RMBS: "RMBS.US",
SLAB: "SLAB.US",
SYNA: "SYNA.US",
WOLF: "WOLF.US",

FTNT: "FTNT.US",
NET: "NET.US",
RBRK: "RBRK.US",
SENT: "SENT.US",
TENB: "TENB.US",
VRNS: "VRNS.US",
CHKP: "CHKP.US",
GEN: "GEN.US",

MDB: "MDB.US",
ESTC: "ESTC.US",
PATH: "PATH.US",
AI: "AI.US",
CFLT: "CFLT.US",
DOCN: "DOCN.US",
HCP: "HCP.US",
INTU: "INTU.US",
PAYC: "PAYC.US",

SNOW: "SNOW.US",
PLTR: "PLTR.US",
SOUN: "SOUN.US",
BBAI: "BBAI.US",
UPST: "UPST.US",
APP: "APP.US",

IGM: "IGM.US",
IYW: "IYW.US",
FTEC: "FTEC.US",
SOXQ: "SOXQ.US",
XSW: "XSW.US",
CLOU: "CLOU.US",
WCLD: "WCLD.US",
BUG: "BUG.US",

COST: "COST.US",
WM: "WM.US",
LLY: "LLY.US",
VRTX: "VRTX.US",
ELV: "ELV.US",
MSCI: "MSCI.US",

AVGO: "AVGO.US",
MU: "MU.US",
TXN: "TXN.US",
NXPI: "NXPI.US",
QRVO: "QRVO.US",
LSCC: "LSCC.US",
ALGM: "ALGM.US",
AMKR: "AMKR.US",
FORM: "FORM.US",
IPGP: "IPGP.US",

AKAM: "AKAM.US",
DT: "DT.US",
GTLB: "GTLB.US",
PD: "PD.US",
SPLK: "SPLK.US",
ZEN: "ZEN.US",

WDAY: "WDAY.US",
NOW: "NOW.US",
ADSK: "ADSK.US",
PAYX: "PAYX.US",
TYL: "TYL.US",
FICO: "FICO.US",

VGT: "VGT.US",
SOXL: "SOXL.US",
USD: "USD.US",
ROM: "ROM.US",
IGV: "IGV.US",

CRWV: "CRWV.US",
APLD: "APLD.US",
NBIS: "NBIS.US",

TTWO: "TTWO.US",
EA: "EA.US",
ROKU: "ROKU.US",

MELI: "MELI.US",
SE: "SE.US",
PDD: "PDD.US",

TT: "TT.US",
ETN: "ETN.US",
HUBB: "HUBB.US",

TTD: "TTD.US",
APP: "APP.US",
DUOL: "DUOL.US",

COST: "COST.US",
MSCI: "MSCI.US",
SPGI: "SPGI.US",

  EURUSD: "EURUSD.FOREX",
  GBPUSD: "GBPUSD.FOREX",
  USDJPY: "USDJPY.FOREX",

  // === ETF d'indice large manquants (ajoutés PR-R3B-v2, 2026-05-19) ===
  // Désynchronisation historique entre `universe-v2.mjs` (qui contenait
  // DIA, XLE/XLF/.../XLC) et ce SYMBOL_MAP : ces ETF n'étaient pas
  // téléchargés. PR-R3B a détecté le gap (11/15 ETF manquants pour
  // l'univers cible V1 Mean Reversion). Pour combler proprement :
  //
  //   1. Mettre la clé `EODHD_API_KEY=...` dans `.env`.
  //   2. Lancer `node tools/backtests/download-eodhd-2025.mjs`.
  //   3. Vérifier que `data/{DIA,XLE,XLF,...,XLC}_2025.json` sont créés.
  //   4. Relancer `node tools/backtests/meanrev-etf-range-v1.mjs` pour le
  //      rerun strict avec les MÊMES paramètres gelés.
  DIA: "DIA.US",
  XLE: "XLE.US",
  XLF: "XLF.US",
  XLV: "XLV.US",
  XLI: "XLI.US",
  XLP: "XLP.US",
  XLY: "XLY.US",
  XLB: "XLB.US",
  XLU: "XLU.US",
  XLRE: "XLRE.US",
  XLC: "XLC.US"
};

fs.mkdirSync("./data", { recursive: true });

async function download(symbol, eodhdSymbol) {
  const url =
    `https://eodhd.com/api/eod/${encodeURIComponent(eodhdSymbol)}` +
    `?from=2021-01-01&to=2025-12-31&period=d&fmt=json&api_token=${API_KEY}`;

  console.log(`Downloading ${symbol} from ${eodhdSymbol}`);

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`${symbol} HTTP ${res.status}`);
  }

  const rows = await res.json();

  if (!Array.isArray(rows)) {
    console.log(rows);
    throw new Error(`${symbol} invalid EODHD response`);
  }

  const candles = rows
    .map(r => ({
      time: r.date,
      open: Number(r.open),
      high: Number(r.high),
      low: Number(r.low),
      close: Number(r.close),
      volume: Number(r.volume || 0)
    }))
    .filter(c =>
      c.time &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close)
    );

  fs.writeFileSync(
    `./data/${symbol}_2025.json`,
    JSON.stringify(candles, null, 2)
  );

  console.log(`${symbol}: ${candles.length} candles saved`);
}

for (const [symbol, eodhdSymbol] of Object.entries(SYMBOL_MAP)) {
  await download(symbol, eodhdSymbol);
}