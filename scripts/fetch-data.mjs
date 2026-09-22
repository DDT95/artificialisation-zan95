#!/usr/bin/env node
// Récupère côté serveur (pas de CORS ici) les données Cerema utilisées par la carte,
// et les fige en JSON statique dans data/. Exécuté par .github/workflows/update-data.yml.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CEREMA_API = "https://apidf-preprod.cerema.fr";
const DEPT = "95";
const IDF_DEPARTEMENTS = ["75", "77", "78", "91", "92", "93", "94", "95"];
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data");

async function fetchJson(url, attempts = 3, timeoutMs = 15000) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!r.ok) throw new Error(`${url} → ${r.status}`);
      return await r.json();
    } catch (e) {
      lastError = e;
      if (i < attempts - 1) await new Promise(res => setTimeout(res, 800 * (i + 1)));
    }
  }
  throw lastError;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
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

  console.log("Liste des communes du Val-d’Oise…");
  const communeCodes = await fetchCommuneCodes();
  console.log(`${communeCodes.length} communes.`);

  console.log("Consommation d’espace communale (Cerema)…");
  let done = 0;
  const communeRows = await mapWithConcurrency(communeCodes, 10, async code => {
    try {
      const rows = await fetchConsoEspace("communes", code);
      done++;
      if (done % 20 === 0) console.log(`  ${done}/${communeCodes.length} communes…`);
      return [code, rows];
    } catch (e) {
      done++;
      console.error(`Échec commune ${code} : ${e.message}`);
      return [code, []];
    }
  });
  const consoCommunes = Object.fromEntries(communeRows);

  console.log("Consommation d’espace départementale (Île-de-France)…");
  const deptRows = await mapWithConcurrency(IDF_DEPARTEMENTS, 4, async code => {
    try {
      return [code, await fetchConsoEspace("departements", code)];
    } catch (e) {
      console.error(`Échec département ${code} : ${e.message}`);
      return [code, []];
    }
  });
  const consoDepartements = Object.fromEntries(deptRows);

  console.log("Friches recensées (Cartofriches)…");
  const friches = await fetchJson(`${CEREMA_API}/cartofriches/geofriches/?coddep=${DEPT}&page_size=500&fields=all`);

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
