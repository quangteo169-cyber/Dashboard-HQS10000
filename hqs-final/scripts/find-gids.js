#!/usr/bin/env node
/**
 * scripts/find-gids.js
 *
 * Automatically fetches your Google Sheet and extracts all tab names + GIDs.
 * Run: node scripts/find-gids.js
 *
 * Requires: sheet must be public (Anyone with link → Viewer)
 */

const SHEET_ID = '1GFnJWfRBdLw7KZSYxS1IaqlGvIZtJcAskjoVePS2kbM'

async function main() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`
  console.log('🔍 Fetching sheet to detect tab GIDs...\n')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
  })

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status} — Make sure the sheet is PUBLIC (Anyone with link → Viewer)`)
    process.exit(1)
  }

  const html = await res.text()

  // Sheets stores tab info in JSON blobs — try multiple patterns
  const found = {}

  // Pattern 1: JSON like {"gid":12345,"name":"Tab Name",...}
  for (const m of html.matchAll(/"gid":(\d+)[^}]*?"name":"([^"]+)"/g)) {
    found[m[2]] = parseInt(m[1])
  }

  // Pattern 2: gid= in anchor tags
  if (!Object.keys(found).length) {
    for (const m of html.matchAll(/gid=(\d+)[^>]*?>([^<]{2,40})</g)) {
      const name = m[2].trim()
      if (name && !name.includes('<') && !name.includes('{')) {
        found[name] = parseInt(m[1])
      }
    }
  }

  if (!Object.keys(found).length) {
    console.log('⚠️  Could not auto-detect GIDs from HTML.')
    console.log('Please find them manually: click each tab → copy gid=XXXXX from URL\n')
    printManualInstructions()
    return
  }

  console.log('✅ Detected tabs:\n')
  for (const [name, gid] of Object.entries(found)) {
    console.log(`  ${String(gid).padEnd(15)} → "${name}"`)
  }

  const TARGET = [
    'Tổng hợp theo Sàn',
    'TỔNG HỢP THEO BU',
    'BU1', 'BU2', 'BU3', 'BU4', 'BU5',
    'Database',
  ]

  console.log('\n\n// ── Paste this block into src/lib/sheets.ts ──────────────')
  console.log('export const SHEET_GIDS: Record<string, number> = {')
  for (const tab of TARGET) {
    const gid = found[tab]
    if (gid !== undefined) {
      console.log(`  '${tab}': ${gid},`)
    } else {
      console.log(`  '${tab}': 0,  // ⚠️  NOT FOUND — find this GID manually`)
    }
  }
  console.log('}')
}

function printManualInstructions() {
  console.log('Manual steps:')
  console.log('1. Open your Google Sheet')
  console.log('2. Click on "Tổng hợp theo Sàn" tab')
  console.log('3. The URL will show: ...edit?gid=XXXXXXXXX')
  console.log('4. Copy that number and update SHEET_GIDS in src/lib/sheets.ts')
  console.log('5. Repeat for each tab: TỔNG HỢP THEO BU, BU1–BU5, Database\n')
}

main().catch(e => { console.error(e); process.exit(1) })
