#!/usr/bin/env node
// Récupère côté serveur (pas de CORS ici) les données Cerema utilisées par la carte,
// et les fige en JSON statique dans data/. Exécuté par .github/workflows/update-data.yml.
//
// L'API apidf-preprod.cerema.fr peut répondre en 503 de façon massive et prolongée
// (instabilité côté Cerema, pas seulement une question de charge de notre part). On
// se donne donc une échéance interne : passé ce délai, on arrête de solliciter l'API
// et on écrit immédiatement ce qui a été récupéré (le reste garde sa dernière valeur
// connue). Ainsi un commit a toujours lieu, même si l'API reste indisponible tout du
// long — contrairement à un timeout de job GitHub Actions, qui tue le process avant
// toute écriture et perd donc l'intégralité de la progression.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CEREMA_API = "https://apidf-preprod.cerema.fr";
const DEPT = "95";
const IDF_DEPARTEMENTS = ["75", "77", "78", "91", "92", "93", "94", "95"];
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");
const START = Date.now();
const DEADLINE_MS = 8 * 60 * 1000; // 8 min : laisse de la marge sous le timeout-minutes du job.

function timeLeft() {
  return DEADLINE_MS - (Date.now() - START);
}

async function fetchJson(url, attempts = 3, timeoutMs = 8000) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    if (timeLeft() <= 0) throw new Error("échéance dépassée");
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return await r.json();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise(res => setTimeout(res, 500 * (i + 1)));
    }
  }
  throw lastError;
}

async function mapWithDeadline(items, limit, worker, fallback) {
  const results = new Array(items.length);
  let i = 0, skipped = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      if (timeLeft() <= 0) {
        skipped++;
        results[idx] = fallback(items[idx]);
        continue;
      }
      if (idx > 0) await new Promise(res => setTimeout(res, 100));
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return { results, skipped };
}

async function readExistingJson(file) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return null;
  }
}

async function fetchCommuneCodes() {
  const r = await fetchJson(`https://geo.api.gouv.fr/departements/${DEPT}/communes?fields=nom,code&format=json`);
  return r.map(c => c.code);
}

async function fetchConsoEspace(echelle, code) {
  const d = await fetchJson(`${CEREMA_API}/indicateurs/conso_espace/${echelle}/${code}/?ordering=annee`);
  return d.results || [];
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  const previousCommunes = (await readExistingJson("conso-espace-communes.json")) || {};
  const previousDepartements = (await readExistingJson("conso-espace-departements.json")) || {};

  console.log("Liste des communes du Val-d’Oise…");
  const communeCodes = await fetchCommuneCodes();
  console.log(`${communeCodes.length} communes.`);

  console.log("Consommation d’espace communale (Cerema)…");
  let done = 0, failed = 0;
  const { results: communeRows, skipped: communesSkipped } = await mapWithDeadline(
    communeCodes,
    5,
    async code => {
      try {
        const rows = await fetchConsoEspace("communes", code);
        done++;
        if (done % 20 === 0) console.log(`  ${done}/${communeCodes.length} communes…`);
        return [code, rows];
      } catch (e) {
        done++; failed++;
        console.error(`Échec commune ${code} : ${e.message}`);
        return [code, previousCommunes[code] || []];
      }
    },
    code => [code, previousCommunes[code] || []],
  );
  console.log(`Communes : ${done - failed}/${done} récupérées, ${failed} conservées, ${communesSkipped} jamais tentées (échéance dépassée).`);
  const consoCommunes = Object.fromEntries(communeRows);

  console.log("Consommation d’espace départementale (Île-de-France)…");
  const { results: deptRows } = await mapWithDeadline(
    IDF_DEPARTEMENTS,
    2,
    async code => {
      try {
        return [code, await fetchConsoEspace("departements", code)];
      } catch (e) {
        console.error(`Échec département ${code} : ${e.message}`);
        return [code, previousDepartements[code] || []];
      }
    },
    code => [code, previousDepartements[code] || []],
  );
  const consoDepartements = Object.fromEntries(deptRows);

  console.log("Friches recensées (Cartofriches)…");
  let friches = null;
  if (timeLeft() > 0) {
    try {
      friches = await fetchJson(`${CEREMA_API}/cartofriches/geofriches/?coddep=${DEPT}&page_size=500&fields=all`);
    } catch (e) {
      console.error(`Échec friches : ${e.message}`);
    }
  }
  if (!friches) {
    friches = await readExistingJson("friches-95.json");
    console.log(friches ? "Friches : conservation de la précédente version." : "Friches : aucune donnée disponible.");
  }
  friches = friches || { type: "FeatureCollection", features: [] };

  await writeFile(path.join(DATA_DIR, "conso-espace-communes.json"), JSON.stringify(consoCommunes));
  await writeFile(path.join(DATA_DIR, "conso-espace-departements.json"), JSON.stringify(consoDepartements));
  await writeFile(path.join(DATA_DIR, "friches-95.json"), JSON.stringify(friches));
  await writeFile(path.join(DATA_DIR, "meta.json"), JSON.stringify({ updatedAt: new Date().toISOString() }));

  console.log("Terminé.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
