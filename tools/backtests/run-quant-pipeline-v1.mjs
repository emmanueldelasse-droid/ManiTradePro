// tools/backtests/run-quant-pipeline-v1.mjs
//
// Orchestrateur offline qui relance les 7 moteurs d'analyse quant dans l'ordre :
//   1. asset-quality-engine-v1
//   2. asset-setup-matrix-v1
//   3. setup-variant-matrix-v1
//   4. variant-regime-matrix-v1
//   5. walk-forward-regime-validator-v1
//   6. tradable-universe-v1
//   7. allocation-engine-v1
//
// But : garantir que allocation-plan.json est généré à partir de sources
// fraîches et cohérentes. Stoppe net à la première erreur.
//
// IMPORTANT : l'orchestrateur ne relance PAS les backtests sources eux-mêmes
// (backtest-relative-strength-rotation-regime-v1.mjs,
//  backtest-pullback-yearly-walkforward.mjs,
//  backtest-multi-setup-grid.mjs).
// Ceux-ci prennent ~3 minutes au total et sont à relancer manuellement
// uniquement quand l'univers ou les paramètres de stratégie changent.
// L'orchestrateur couvre la couche d'analyse en aval des backtests, y compris
// le plan d'allocation théorique final.
//
// Sorties :
//   - tools/backtests/output/quant-pipeline-run-summary.json
//   - tools/backtests/output/quant-pipeline-run-summary.md
//
// Code de sortie : 0 si tous les outputs attendus existent ET ont été
// modifiés pendant le run, 1 sinon.
//
// Usage : node tools/backtests/run-quant-pipeline-v1.mjs

import { spawn } from "node:child_process";
import { stat, writeFile, mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..");
const OUTPUT_DIR = join(REPO_ROOT, "tools", "backtests", "output");
const SUMMARY_JSON = join(OUTPUT_DIR, "quant-pipeline-run-summary.json");
const SUMMARY_MD = join(OUTPUT_DIR, "quant-pipeline-run-summary.md");

// Définition du pipeline. Chaque étape : nom logique, script à exécuter,
// fichier de sortie principal à vérifier après l'étape.
const STEPS = [
  {
    name: "asset-quality-engine-v1",
    script: "tools/backtests/asset-quality-engine-v1.mjs",
    output: "tools/backtests/output/asset-quality-report.json",
  },
  {
    name: "asset-setup-matrix-v1",
    script: "tools/backtests/asset-setup-matrix-v1.mjs",
    output: "tools/backtests/output/asset-setup-matrix.json",
  },
  {
    name: "setup-variant-matrix-v1",
    script: "tools/backtests/setup-variant-matrix-v1.mjs",
    output: "tools/backtests/output/setup-variant-matrix.json",
  },
  {
    name: "variant-regime-matrix-v1",
    script: "tools/backtests/variant-regime-matrix-v1.mjs",
    output: "tools/backtests/output/variant-regime-matrix.json",
  },
  {
    name: "walk-forward-regime-validator-v1",
    script: "tools/backtests/walk-forward-regime-validator-v1.mjs",
    output: "tools/backtests/output/walk-forward-regime-validator.json",
  },
  {
    name: "tradable-universe-v1",
    script: "tools/backtests/tradable-universe-v1.mjs",
    output: "tools/backtests/output/tradable-universe.json",
  },
  {
    name: "allocation-engine-v1",
    script: "tools/backtests/allocation-engine-v1.mjs",
    output: "tools/backtests/output/allocation-plan.json",
  },
];

const FINAL_OUTPUT = "tools/backtests/output/allocation-plan.json";

// Récupère le mtime en ms d'un fichier, ou null si introuvable.
async function mtimeMs(path) {
  try {
    const s = await stat(path);
    return s.mtimeMs;
  } catch (_err) {
    return null;
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch (_err) {
    return false;
  }
}

// Exécute un script Node, streame stdout/stderr, retourne {code, stdout, stderr}.
function runNodeScript(scriptPath) {
  return new Promise((resolveRun) => {
    const child = spawn("node", [scriptPath], {
      cwd: REPO_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdoutBuf = "";
    let stderrBuf = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutBuf += text;
      // Réémet sur la sortie principale pour que l'utilisateur voie le live
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrBuf += text;
      process.stderr.write(text);
    });
    child.on("error", (err) => {
      resolveRun({ code: -1, stdout: stdoutBuf, stderr: stderrBuf + "\n" + String(err) });
    });
    child.on("close", (code) => {
      resolveRun({ code, stdout: stdoutBuf, stderr: stderrBuf });
    });
  });
}

function fmtMs(ms) {
  if (!Number.isFinite(ms)) return "n/a";
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const min = Math.floor(sec / 60);
  const remain = (sec - min * 60).toFixed(0);
  return `${min}m ${remain}s`;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push("# Quant Pipeline Run Summary");
  lines.push("");
  lines.push(`> Généré le ${report.generatedAt} par \`tools/backtests/run-quant-pipeline-v1.mjs\`.`);
  lines.push("");
  lines.push(`**Statut global : ${report.status === "ok" ? "✓ OK" : "✗ FAILED"}**`);
  lines.push("");
  lines.push(`Durée totale : ${fmtMs(report.totalDurationMs)}`);
  lines.push("");
  if (report.status !== "ok") {
    lines.push("Au moins une étape a échoué. Pipeline arrêté à la première erreur.");
    lines.push("");
  }
  lines.push("## Étapes");
  lines.push("");
  lines.push("| # | Moteur | Statut | Durée | Output | Output modifié |");
  lines.push("|---:|---|---|---:|---|---|");
  for (const [i, step] of report.steps.entries()) {
    const status = step.status === "ok" ? "✓ OK" : (step.status === "skipped" ? "— skipped" : "✗ FAIL");
    const dur = step.status === "skipped" ? "—" : fmtMs(step.durationMs);
    const modified = step.status === "skipped" ? "—" : (step.outputModified ? "✓" : "✗ pas modifié");
    lines.push(`| ${i + 1} | ${step.name} | ${status} | ${dur} | \`${step.output}\` | ${modified} |`);
  }
  lines.push("");
  lines.push("## Outputs vérifiés");
  lines.push("");
  for (const step of report.steps) {
    if (step.status === "ok") {
      lines.push(`- ✓ \`${step.output}\` (modifié pendant ce run : ${step.outputModified ? "oui" : "non"})`);
    } else if (step.status === "skipped") {
      lines.push(`- — \`${step.output}\` (étape sautée après échec amont)`);
    } else {
      lines.push(`- ✗ \`${step.output}\` (étape en erreur)`);
    }
  }
  lines.push("");

  const failedSteps = report.steps.filter((s) => s.status === "failed");
  if (failedSteps.length) {
    lines.push("## Erreurs");
    lines.push("");
    for (const step of failedSteps) {
      lines.push(`### ${step.name}`);
      lines.push("");
      lines.push(`Commande : \`${step.command}\``);
      lines.push("");
      lines.push(`Code de sortie : ${step.exitCode}`);
      lines.push("");
      if (step.errorMessage) {
        lines.push("Message :");
        lines.push("");
        lines.push("```text");
        lines.push(step.errorMessage.trim().slice(0, 2000));
        lines.push("```");
        lines.push("");
      }
    }
  }

  lines.push("## Prochaine étape recommandée");
  lines.push("");
  if (report.status === "ok") {
    lines.push(`Le tradable universe est à jour. Point d'entrée pour le futur allocation-engine :`);
    lines.push("");
    lines.push("```text");
    lines.push(report.finalOutput);
    lines.push("```");
    lines.push("");
    lines.push("Pour mettre à jour après un nouveau backtest : relancer ce même pipeline.");
  } else {
    lines.push("Corriger l'étape en erreur, puis relancer le pipeline. Tant que tradable-universe.json n'est pas régénéré, ne pas considérer son contenu comme représentatif des dernières données.");
  }
  lines.push("");
  return lines.join("\n");
}

async function main() {
  console.log("[run-quant-pipeline] démarrage");
  const overallStart = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    status: "ok",
    totalDurationMs: 0,
    steps: [],
    finalOutput: FINAL_OUTPUT,
  };

  let failedAlready = false;

  for (const [i, step] of STEPS.entries()) {
    const scriptAbs = join(REPO_ROOT, step.script);
    const outputAbs = join(REPO_ROOT, step.output);
    const command = `node ${step.script}`;

    if (failedAlready) {
      console.log(`\n[run-quant-pipeline] (${i + 1}/${STEPS.length}) ${step.name} — SAUTÉ (échec amont)`);
      report.steps.push({
        name: step.name,
        command,
        status: "skipped",
        durationMs: 0,
        output: step.output,
        outputExists: await fileExists(outputAbs),
        outputModified: false,
      });
      continue;
    }

    console.log(`\n[run-quant-pipeline] (${i + 1}/${STEPS.length}) ${step.name} — démarrage`);
    const mtimeBefore = await mtimeMs(outputAbs);
    const stepStart = Date.now();
    const run = await runNodeScript(scriptAbs);
    const durationMs = Date.now() - stepStart;
    const mtimeAfter = await mtimeMs(outputAbs);
    const outputExists = mtimeAfter !== null;
    const outputModified = outputExists && (mtimeBefore === null || mtimeAfter > mtimeBefore);

    const stepResult = {
      name: step.name,
      command,
      durationMs,
      output: step.output,
      outputExists,
      outputModified,
    };

    if (run.code !== 0) {
      stepResult.status = "failed";
      stepResult.exitCode = run.code;
      stepResult.errorMessage = run.stderr || run.stdout;
      console.error(`[run-quant-pipeline] ✗ ${step.name} a échoué (code ${run.code})`);
      failedAlready = true;
      report.status = "failed";
    } else if (!outputExists) {
      stepResult.status = "failed";
      stepResult.exitCode = run.code;
      stepResult.errorMessage = `Code 0 mais output manquant : ${step.output}`;
      console.error(`[run-quant-pipeline] ✗ ${step.name} a renvoyé OK mais ${step.output} est introuvable`);
      failedAlready = true;
      report.status = "failed";
    } else if (!outputModified) {
      stepResult.status = "failed";
      stepResult.exitCode = run.code;
      stepResult.errorMessage = `Code 0 mais output non modifié (mtime inchangé) : ${step.output}`;
      console.error(`[run-quant-pipeline] ✗ ${step.name} a renvoyé OK mais ${step.output} n'a pas été modifié pendant ce run`);
      failedAlready = true;
      report.status = "failed";
    } else {
      stepResult.status = "ok";
      console.log(`[run-quant-pipeline] ✓ ${step.name} OK en ${fmtMs(durationMs)}`);
    }
    report.steps.push(stepResult);
  }

  report.totalDurationMs = Date.now() - overallStart;

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(SUMMARY_JSON, JSON.stringify(report, null, 2), "utf8");
  await writeFile(SUMMARY_MD, buildMarkdown(report), "utf8");

  console.log("");
  console.log(`[run-quant-pipeline] résumé écrit :`);
  console.log(`  - ${relative(REPO_ROOT, SUMMARY_JSON)}`);
  console.log(`  - ${relative(REPO_ROOT, SUMMARY_MD)}`);
  console.log("");
  console.log(`Statut global : ${report.status === "ok" ? "✓ OK" : "✗ FAILED"} (durée totale ${fmtMs(report.totalDurationMs)})`);
  if (report.status === "ok") {
    console.log(`Final : ${FINAL_OUTPUT}`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[run-quant-pipeline] erreur fatale :", err?.message || err);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});
