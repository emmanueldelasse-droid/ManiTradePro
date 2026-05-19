#!/usr/bin/env node
// scripts/check-doc-impact.mjs
//
// Aide anti-oubli documentaire pour ManiTradePro.
//
// Lit les fichiers modifies dans la branche courante par rapport a origin/main
// (fallback : working tree) et affiche les fichiers memoire a verifier selon
// les domaines touches, en se basant sur docs/project/DOC_IMPACT_MATRIX.md.
//
// Contraintes :
// - aucun appel reseau ;
// - aucune dependance externe ;
// - ne modifie aucun fichier ;
// - exit code 0 (non bloquant) ;
// - aide, pas garantie. Ne remplace ni la matrice, ni la revue ChatGPT,
//   ni CHECKLIST_MERGE.md.

import { execSync } from 'node:child_process';

function safeGit(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function listChangedFiles() {
  const diff = safeGit('git diff --name-only origin/main...HEAD');
  if (diff) return diff.split('\n').filter(Boolean);
  const workingDiff = safeGit('git diff --name-only');
  const staged = safeGit('git diff --name-only --cached');
  const both = [...new Set([...workingDiff.split('\n'), ...staged.split('\n')].filter(Boolean))];
  return both;
}

const DOMAINS = [
  {
    name: 'Worker / routes API',
    match: (f) => f.startsWith('cloudflare-worker/') || f === 'worker.js',
    docs: ['ARCHITECTURE.md', 'DATA_PIPELINE.md', 'SESSION.md', 'CHECKLIST_MERGE.md'],
  },
  {
    name: 'Front / UI / PWA',
    match: (f) => f.startsWith('assets/') || f === 'index.html' || f === 'sw.js',
    docs: ['ARCHITECTURE.md', 'DATA_PIPELINE.md', 'SESSION.md', 'KNOWN_ISSUES.md'],
  },
  {
    name: 'Provider / prix / quote / TTL / fallback',
    match: (f) => /provider|quote|price|eodhd|yahoo|binance|twelve|finnhub|coingecko/i.test(f),
    docs: ['PROVIDERS_MATRIX.md', 'DATA_PIPELINE.md', 'PROJECT_RULES.md', 'SESSION.md', 'KNOWN_ISSUES.md'],
  },
  {
    name: 'Supabase / DB / migration',
    match: (f) => f.startsWith('cloudflare-worker/migrations/') || f.endsWith('.sql'),
    docs: ['ARCHITECTURE.md', 'DATA_PIPELINE.md', 'CHECKLIST_MERGE.md', 'SESSION.md'],
  },
  {
    name: 'Trading logic / scoring',
    match: (f) => /trading|score|setup|signal|strategy/i.test(f) && !f.startsWith('docs/'),
    docs: ['TRADING_LOGIC.md', 'SETUPS_REGISTRY.md', 'ASSET_REGISTRY.md', 'SESSION.md', 'CHECKLIST_MERGE.md'],
  },
  {
    name: 'Recherche quant / backtest / walk-forward',
    match: (f) => f.startsWith('docs/research/') || /backtest|walk[-_]?forward/i.test(f),
    docs: [
      'docs/research/RESEARCH_FRAMEWORK_FREEZE_V1.md',
      'docs/research/SETUP_VALIDATION_CHECKLIST.md',
      'docs/research/ANTI_LOOKAHEAD_RULES.md',
      'docs/research/DATASET_GOVERNANCE.md',
      'SETUPS_REGISTRY.md',
      'SESSION.md',
    ],
  },
  {
    name: 'Gouvernance / process',
    match: (f) => ['GOVERNANCE.md', 'CLAUDE.md', 'CHECKLIST_MERGE.md', 'GPT_ROLE.md'].includes(f),
    docs: ['SESSION.md'],
  },
  {
    name: 'Setups registry',
    match: (f) => f === 'SETUPS_REGISTRY.md' || f === 'docs/quant/SETUPS_REGISTRY.md',
    docs: ['TRADING_LOGIC.md', 'docs/research/SETUP_VALIDATION_CHECKLIST.md', 'SESSION.md'],
  },
  {
    name: 'Asset registry',
    match: (f) => f === 'ASSET_REGISTRY.md' || f === 'docs/quant/ASSET_REGISTRY.md',
    docs: ['SETUPS_REGISTRY.md', 'SESSION.md'],
  },
];

function main() {
  const changed = listChangedFiles();
  console.log('check-doc-impact — aide anti-oubli documentaire (non bloquant)');
  console.log('Reference : docs/project/DOC_IMPACT_MATRIX.md');
  console.log('');

  if (!changed.length) {
    console.log('Aucun fichier modifie detecte.');
    console.log('Astuce : lance ce script apres tes commits, sur une branche feature.');
    process.exit(0);
  }

  console.log(`Fichiers modifies (${changed.length}) :`);
  for (const f of changed) console.log(`  - ${f}`);
  console.log('');

  const expected = new Map();
  const matchedDomains = new Set();

  for (const f of changed) {
    for (const d of DOMAINS) {
      if (d.match(f)) {
        matchedDomains.add(d.name);
        for (const doc of d.docs) {
          if (!expected.has(doc)) expected.set(doc, new Set());
          expected.get(doc).add(d.name);
        }
      }
    }
  }

  if (!matchedDomains.size) {
    console.log('Aucun domaine connu detecte automatiquement.');
    console.log('Verifie manuellement la matrice : docs/project/DOC_IMPACT_MATRIX.md');
    console.log('Rappel : SESSION.md doit etre mis a jour avant chaque GO MERGE.');
    process.exit(0);
  }

  console.log(`Domaines detectes : ${[...matchedDomains].join(', ')}`);
  console.log('');
  console.log('Fichiers memoire a verifier (mettre a jour ou justifier la non-modification) :');

  const changedSet = new Set(changed);
  for (const [doc, domains] of expected) {
    const status = changedSet.has(doc) ? '[ok]' : '[a verifier]';
    console.log(`  ${status} ${doc}  (cause : ${[...domains].join(', ')})`);
  }
  console.log('');

  if (!changedSet.has('SESSION.md')) {
    console.log('Rappel obligatoire : SESSION.md doit etre mis a jour avant chaque GO MERGE.');
  }

  console.log('');
  console.log('Section a inclure dans le body de PR :');
  console.log('');
  console.log('## Documentation impact');
  console.log('- Type de modification : ' + [...matchedDomains].join(', '));
  console.log('- Fichiers memoire attendus : ' + [...expected.keys()].join(', '));
  console.log('- Fichiers mis a jour : <liste>');
  console.log('- Fichiers verifies mais non modifies : <liste>');
  console.log('- Justification des non-modifications : <raison par fichier>');
  console.log('');
  console.log('Ce script est une aide anti-oubli, pas une garantie. Il ne remplace pas la matrice');
  console.log('officielle (docs/project/DOC_IMPACT_MATRIX.md), CHECKLIST_MERGE.md, ni la revue ChatGPT.');

  process.exit(0);
}

main();
