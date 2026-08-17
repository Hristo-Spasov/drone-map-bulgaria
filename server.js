import express from "express";
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import { writeFileSync, existsSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const DATA_PATH = join(__dirname, "src/data/zones.json");
const STATUS_PATH = join(__dirname, "status.json");
const DIST_PATH = join(__dirname, "dist");
const FETCH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours


const CAA_PAGE_URL = "https://www.caa.bg/bg/category/633/7062";
const CAA_BASE = "https://www.caa.bg";

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const next = res.headers.location.startsWith("http")
            ? res.headers.location
            : `${CAA_BASE}${res.headers.location}`;
          return fetchUrl(next).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function findLatestZipUrl() {
  console.log("Scraping CAA page for ZIP link...");
  try {
    const html = (await fetchUrl(CAA_PAGE_URL)).toString();

    // Find all .zip links in the page
    const zipRegex = /href="([^"]*\.zip)"/gi;
    const matches = [...html.matchAll(zipRegex)];

    if (matches.length === 0) {
      console.log("No ZIP links found on CAA page");
      return null;
    }

    // Use the last ZIP link (most recent)
    const href = matches[matches.length - 1][1];
    const zipUrl = href.startsWith("http") ? href : `${CAA_BASE}${href}`;
    console.log(`Found ZIP link: ${zipUrl}`);

    const data = await fetchUrl(zipUrl);
    if (data.length > 1000) {
      return { url: zipUrl, data };
    }

    console.log("ZIP file too small, skipping");
    return null;
  } catch (e) {
    console.error("Failed to scrape CAA page:", e.message);
    return null;
  }
}

function updateStatus(source) {
  const status = {
    lastChecked: new Date().toISOString(),
    lastUpdated: existsSync(DATA_PATH) ? new Date(statSync(DATA_PATH).mtime).toISOString() : null,
    source: source || null,
  };
  writeFileSync(STATUS_PATH, JSON.stringify(status, null, 2), "utf-8");
}

async function fetchAndExtractZones() {
  console.log("Fetching latest zones from CAA...");
  try {
    const result = await findLatestZipUrl();
    if (!result) {
      console.log("No new zones found, keeping existing data");
      updateStatus(null);
      return false;
    }

    const zip = new AdmZip(result.data);
    const entries = zip.getEntries();
    const jsonEntry = entries.find((e) => e.entryName.endsWith(".json"));
    if (!jsonEntry) {
      console.error("No JSON file found in ZIP");
      return false;
    }

    const jsonContent = zip.readAsText(jsonEntry);
    writeFileSync(DATA_PATH, jsonContent, "utf-8");
    console.log(`Updated zones.json from ${result.url}`);
    updateStatus(result.url);
    return true;
  } catch (e) {
    console.error("Failed to fetch zones:", e.message);
    return false;
  }
}

function buildApp() {
  console.log("Building Vue app...");
  try {
    execSync("npm run build-only", { cwd: __dirname, stdio: "inherit" });
    console.log("Build complete");
  } catch (e) {
    console.error("Build failed:", e.message);
    throw e;
  }
}

async function startServer() {
  // Initial fetch
  const updated = await fetchAndExtractZones();
  if (updated) {
    buildApp();
  } else if (!existsSync(DIST_PATH)) {
    buildApp();
  }

  const app = express();
  app.use(express.static(DIST_PATH));

  // API endpoint for status
  app.get("/api/status", (req, res) => {
    try {
      if (existsSync(STATUS_PATH)) {
        const status = JSON.parse(readFileSync(STATUS_PATH, "utf-8"));
        res.json(status);
      } else {
        res.json({ lastChecked: null, lastUpdated: null, source: null });
      }
    } catch {
      res.json({ lastChecked: null, lastUpdated: null, source: null });
    }
  });

  app.get("/{*splat}", (req, res) => {
    res.sendFile(join(DIST_PATH, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Schedule periodic updates
  setInterval(async () => {
    try {
      const updated = await fetchAndExtractZones();
      if (updated) {
        try {
          buildApp();
          console.log("App rebuilt with new zones data");
        } catch (e) {
          console.error("Build failed after update:", e.message);
        }
      }
    } catch (e) {
      console.error("Update check failed:", e.message);
    }
  }, FETCH_INTERVAL);
}

startServer();
