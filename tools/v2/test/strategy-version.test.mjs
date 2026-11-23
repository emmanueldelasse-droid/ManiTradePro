import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PAPER_VERSION } from "../../../cloudflare-worker/paper-engine.mjs";
import { journalBinding } from "../../../cloudflare-worker/paper-journal.mjs";

// Published prospectively. Retain these modules and the original journal when
// adding another model; each new arm gets its own lock and its own test.
const version = "paper-eur-mr-1";
const journal = "prospective-v1";
const root = new URL("../../../", import.meta.url);
const fingerprints = {
  "tools/v2/lib/engine-v2.mjs": "7bc9a09f15eecab7fe2eed59877615be7abdaf3a73946b34e1789116447b4234",
  "cloudflare-worker/paper-feed.mjs": "5a645a138165606544375398a0eaf539376fa91c3afb6d001486e55bf07e33a4",
  "cloudflare-worker/paper-engine.mjs": "15e98137feef5010c54999f474f0bec90dac85b3d3bfbc55a69d28914f3d0daf",
};
const migration = `Protocole ${version} gelé. Conserver le moteur et le journal historique ${journal}. Isoler la modification dans un nouveau bras versionné et son propre journal immuable avant de la tester prospectivement. Le recalcul des anciennes observations doit continuer d’utiliser ces versions.`;

test("le protocole économique publié et son journal restent identifiables", () => {
  assert.equal(PAPER_VERSION, version, migration);
  // The binding stub returns the actual object name selected by production.
  const name = journalBinding({ PAPER_JOURNAL: { idFromName: value => value, get: id => id } });
  assert.equal(name, journal, migration);
});

for (const [path, expected] of Object.entries(fingerprints)) {
  test(`${version} conserve la source publiée de ${path}`, async () => {
    const code = await readFile(new URL(path, root), "utf8");
    const actual = createHash("sha256").update(code.replaceAll("\r\n", "\n")).digest("hex");
    assert.equal(actual, expected, `${path} a changé. ${migration}`);
  });
}
