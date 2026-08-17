import express from 'express'
import AdmZip from 'adm-zip'
import { execSync } from 'child_process'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import http from 'http'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3000
const DATA_PATH = join(__dirname, 'src/data/zones.json')
const DIST_PATH = join(__dirname, 'dist')
const FETCH_INTERVAL = 24 * 60 * 60 * 1000 // 24 hours

// CAA base URL pattern
const CAA_BASE = 'https://www.caa.bg/sites/default/files/upload/documents'

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`))
        return
      }
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function findLatestZipUrl() {
  // Try to scrape the CAA documents page for the latest bgr_zones ZIP
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${day}${month}${year}`

  // Try current month first, then previous months
  for (let offset = 0; offset < 6; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const url = `${CAA_BASE}/${y}-${m}/bgr_zones_${dateStr}.zip`
    try {
      const res = await fetchUrl(url)
      if (res.length > 1000) {
        console.log(`Found zones at: ${url}`)
        return { url, data: res }
      }
    } catch {
      // Try with different date formats
    }
  }

  return null
}

async function fetchAndExtractZones() {
  console.log('Fetching latest zones from CAA...')
  try {
    const result = await findLatestZipUrl()
    if (!result) {
      console.log('No new zones found, keeping existing data')
      return false
    }

    const zip = new AdmZip(result.data)
    const entries = zip.getEntries()
    const jsonEntry = entries.find((e) => e.entryName.endsWith('.json'))
    if (!jsonEntry) {
      console.error('No JSON file found in ZIP')
      return false
    }

    const jsonContent = zip.readAsText(jsonEntry)
    writeFileSync(DATA_PATH, jsonContent, 'utf-8')
    console.log(`Updated zones.json from ${result.url}`)
    return true
  } catch (e) {
    console.error('Failed to fetch zones:', e.message)
    return false
  }
}

function buildApp() {
  console.log('Building Vue app...')
  try {
    execSync('npm run build-only', { cwd: __dirname, stdio: 'inherit' })
    console.log('Build complete')
  } catch (e) {
    console.error('Build failed:', e.message)
    throw e
  }
}

async function startServer() {
  // Initial fetch
  const updated = await fetchAndExtractZones()
  if (updated) {
    buildApp()
  } else if (!existsSync(DIST_PATH)) {
    // First run, no dist yet
    buildApp()
  }

  const app = express()
  app.use(express.static(DIST_PATH))

  // SPA fallback (Express 5 syntax)
  app.get('/{*splat}', (req, res) => {
    res.sendFile(join(DIST_PATH, 'index.html'))
  })

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })

  // Schedule periodic updates
  setInterval(async () => {
    const updated = await fetchAndExtractZones()
    if (updated) {
      buildApp()
      console.log('App rebuilt with new zones data')
    }
  }, FETCH_INTERVAL)
}

startServer()