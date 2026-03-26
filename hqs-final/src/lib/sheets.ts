/**
 * lib/sheets.ts
 * ─────────────────────────────────────────────────────────────────
 * Fetches & parses Google Sheets (public CSV export).
 *
 * HQS1000 Sheet structure (matches both T02 and T03 files):
 *
 * "Tổng hợp theo Sàn" / "BU*" tabs — row layout (0-indexed):
 *   Row 0-5 : metadata / labels
 *   Row 6   : Tham Số header row
 *   Row 7   : PL1B   — col 6 = Total, col 7+ = daily values
 *   Row 8   : GMV
 *   Row 9   : RE2 (Flip)
 *   Row 10  : RE1 (DT dịch vụ)
 *   Row 11  : %CO/RE1
 *   Row 12  : %PT/RE2
 *   Row 13  : DOANH THU label
 *   Row 14  : RE1 detail (DOANH THU DỊCH VỤ) — same value as row 10
 *   Row 15  : KHO GIFTCARD
 *   Row 16  : Kho RB120h
 *   Row 17  : Kho Robux
 *   Row 18  : KHO TOPUP
 *   Row 19  : KHO NICK
 *   Row 20  : KHO Item
 *   ...
 *   Row 4   : actual dates start at col 7
 *
 * "TỔNG HỢP THEO BU" tab:
 *   Same row structure, but columns 7–11 = BU1–BU5 totals (not daily)
 *
 * "Database" tab:
 *   Row 2+  : Mã Hoá | Tên | BU | Team
 * ─────────────────────────────────────────────────────────────────
 */

export const SHEET_ID = '1GFnJWfRBdLw7KZSYxS1IaqlGvIZtJcAskjoVePS2kbM'

// Tab names → gid numbers
// These are the gid values visible in the URL when you click each tab.
// Fill in the real gid for each tab from your Google Sheet URL.
// Example: ...edit?gid=905378624 → "Tổng hợp theo Sàn" gid = 905378624
export const SHEET_GIDS: Record<string, number> = {
  'Tổng hợp theo Sàn':  434675767,
  'TỔNG HỢP THEO BU':   905378624,
  'BU1':               1376002362,
  'BU2':                461577657,
  'BU3':               1433088555,
  'BU4':               1189402625,
  'BU5':               1374910020,
  'Database':          1867994280,
}

// ── Types ──────────────────────────────────────────────────────────

export interface DailyPoint {
  date: string   // "01/03" format
  gmv:  number
  re2:  number
  re1:  number
  pl1b: number
}

export interface BUSummary {
  name:     string
  color:    string
  gmv:      number
  re2:      number
  re1:      number
  pl1b:     number
  giftcard: number
  robux:    number
  topup:    number
  nick:     number
  re2Pct:   number   // re2/gmv %
  re1Pct:   number   // re1/gmv %
  margin:   number   // pl1b/re1 %
}

export interface SanItem {
  code:    string
  name:    string
  bu:      string
  revenue: number
  share:   number  // % of total
}

export interface DashboardData {
  fetchedAt:   string   // ISO timestamp
  period:      string   // e.g. "Tháng 03/2026"
  overall: {
    gmv:    number
    re2:    number
    re1:    number
    pl1b:   number
    re2Pct: number
    re1Pct: number
    margin: number
    daily:  DailyPoint[]
  }
  buList:   BUSummary[]
  buDaily:  Record<string, DailyPoint[]>
  sanList:  SanItem[]
  error?:   string
}

// ── Constants ──────────────────────────────────────────────────────

const BU_COLORS: Record<string, string> = {
  BU1: '#818cf8',
  BU2: '#22d3ee',
  BU3: '#34d399',
  BU4: '#fb923c',
  BU5: '#c084fc',
}

// Row indices in each summary sheet (0-based after CSV parse)
const ROW = {
  DATES:    4,   // row with actual date values
  PL1B:     7,
  GMV:      8,
  RE2:      9,
  RE1:      10,
  DT_TOTAL: 14,  // = RE1 detail
  GIFTCARD: 15,
  RB120H:   16,
  ROBUX:    17,
  TOPUP:    18,
  NICK:     19,
} as const

const TOTAL_COL     = 6   // column index for "Total" value
const DAILY_START   = 7   // column index where daily dates begin

// ── CSV fetch ──────────────────────────────────────────────────────

export async function fetchCSV(gid: number): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`
  const res = await fetch(url, {
    next: { revalidate: 60 },   // Vercel ISR: refresh every 60 s
    headers: { 'Accept': 'text/csv' },
  })
  if (!res.ok) {
    throw new Error(`Sheet fetch failed gid=${gid} — HTTP ${res.status}`)
  }
  return res.text()
}

// ── CSV → 2-D array ────────────────────────────────────────────────

export function parseCSV(raw: string): string[][] {
  const rows: string[][] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ''
    let inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { cols.push(clean(cur)); cur = ''; continue }
      cur += ch
    }
    cols.push(clean(cur))
    rows.push(cols)
  }
  return rows
}

function clean(s: string): string {
  return s.trim().replace(/^\uFEFF/, '')
}

// ── Number parser ─────────────────────────────────────────────────
// Handles: "1.234.567", "1,234,567", "1234567", "(1234)", ""

function toNum(v: string | undefined): number {
  if (!v || v === '-' || v === '') return 0
  // Remove thousand separators (periods in Vietnamese style)
  const s = v.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.\-()]/g, '')
  // Parentheses = negative
  if (s.startsWith('(') && s.endsWith(')')) return -parseFloat(s.slice(1, -1)) || 0
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// ── Date detection & formatting ───────────────────────────────────

function isDateCell(v: string): boolean {
  return /\d{4}-\d{2}-\d{2}/.test(v) || /^\d{1,2}\/\d{2}$/.test(v)
}

function fmtDate(v: string): string {
  // "2026-03-01 00:00:00" → "01/03"
  const m = v.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}`
  // Already "01/03"
  if (/^\d{2}\/\d{2}$/.test(v)) return v
  return v.trim()
}

function extractPeriod(dates: string[]): string {
  const first = dates.find(d => d)
  if (!first) return ''
  const m = first.match(/(\d{4})-(\d{2})/)
  if (m) return `Tháng ${m[2]}/${m[1]}`
  const p = first.match(/(\d{2})\/(\d{4})/)
  if (p) return `Tháng ${p[1]}/${p[2]}`
  return ''
}

// ── Parse a summary tab (Tổng hợp / BU1-5) ───────────────────────

interface TabResult {
  gmv:      number
  re2:      number
  re1:      number
  pl1b:     number
  giftcard: number
  robux:    number
  topup:    number
  nick:     number
  daily:    DailyPoint[]
  rawDates: string[]
}

export function parseSummaryTab(rows: string[][]): TabResult {
  const get = (rowIdx: number, colIdx: number) => toNum(rows[rowIdx]?.[colIdx])

  // ── Extract dates & daily slices ────────────────────────────────
  const dateRow  = rows[ROW.DATES] || []
  const rawDates: string[] = []
  const dailyCols: number[] = []

  for (let c = DAILY_START; c < dateRow.length; c++) {
    const v = dateRow[c]
    if (v && (isDateCell(v) || v.match(/\d{4}-\d{2}-\d{2}/))) {
      rawDates.push(v)
      dailyCols.push(c)
    }
  }

  const daily: DailyPoint[] = dailyCols.map((c, i) => ({
    date: fmtDate(rawDates[i]),
    gmv:  get(ROW.GMV,  c),
    re2:  get(ROW.RE2,  c),
    re1:  get(ROW.RE1,  c),
    pl1b: get(ROW.PL1B, c),
  }))

  return {
    gmv:      get(ROW.GMV,      TOTAL_COL),
    re2:      get(ROW.RE2,      TOTAL_COL),
    re1:      get(ROW.RE1,      TOTAL_COL),
    pl1b:     get(ROW.PL1B,     TOTAL_COL),
    giftcard: get(ROW.GIFTCARD, TOTAL_COL),
    robux:    get(ROW.ROBUX,    TOTAL_COL),
    topup:    get(ROW.TOPUP,    TOTAL_COL),
    nick:     get(ROW.NICK,     TOTAL_COL),
    daily,
    rawDates,
  }
}

// ── Parse "TỔNG HỢP THEO BU" tab ─────────────────────────────────
// Columns 7–11 = BU1–BU5 (not daily)

export function parseBUTab(rows: string[][]): BUSummary[] {
  const BU_NAMES = ['BU1', 'BU2', 'BU3', 'BU4', 'BU5']
  const get = (rowIdx: number, colIdx: number) => toNum(rows[rowIdx]?.[colIdx])

  return BU_NAMES.map((name, i) => {
    const col = DAILY_START + i   // cols 7, 8, 9, 10, 11
    const gmv      = get(ROW.GMV,      col)
    const re2      = get(ROW.RE2,      col)
    const re1      = get(ROW.RE1,      col)
    const pl1b     = get(ROW.PL1B,     col)
    const giftcard = get(ROW.GIFTCARD, col)
    const robux    = get(ROW.ROBUX,    col)
    const topup    = get(ROW.TOPUP,    col)
    const nick     = get(ROW.NICK,     col)

    return {
      name,
      color:    BU_COLORS[name] || '#818cf8',
      gmv,  re2, re1, pl1b,
      giftcard, robux, topup, nick,
      re2Pct:  gmv ? +(re2 / gmv * 100).toFixed(1) : 0,
      re1Pct:  gmv ? +(re1 / gmv * 100).toFixed(1) : 0,
      margin:  re1 ? +(pl1b / re1 * 100).toFixed(1) : 0,
    }
  })
}

// ── Parse "Database" tab ──────────────────────────────────────────

export function parseDatabase(rows: string[][]): Record<string, { name: string; bu: string }> {
  const map: Record<string, { name: string; bu: string }> = {}
  // Find header row
  let start = 0
  for (let r = 0; r < Math.min(rows.length, 8); r++) {
    if (rows[r][0]?.trim() === 'Mã Hoá') { start = r + 1; break }
  }
  for (let r = start; r < rows.length; r++) {
    const code = rows[r][0]?.trim()
    const name = rows[r][1]?.trim()
    const bu   = rows[r][2]?.trim()
    if (code && name && bu) map[code] = { name, bu }
  }
  return map
}

// ── Parse Sàn revenue section ─────────────────────────────────────
// In "Tổng hợp theo Sàn": rows ~59-82, col 4 = san code, col 6 = total

export function parseSanRevenues(
  rows: string[][],
  dbMap: Record<string, { name: string; bu: string }>
): SanItem[] {
  const result: SanItem[] = []

  // Locate "DOANH THU THEO SÀN" section
  let sectionStart = -1
  for (let r = 0; r < rows.length; r++) {
    const joined = rows[r].join(' ').toUpperCase()
    if (joined.includes('DOANH THU THEO SÀN') || joined.includes('DOANH THU THEO SAN')) {
      sectionStart = r + 1; break
    }
  }
  if (sectionStart < 0) return result

  for (let r = sectionStart; r < Math.min(sectionStart + 35, rows.length); r++) {
    const code = rows[r][4]?.trim()
    if (!code || code === '') break
    const rev = toNum(rows[r][6])
    if (rev <= 0) continue
    const info = dbMap[code] || { name: code, bu: '?' }
    result.push({ code, name: info.name, bu: info.bu, revenue: rev, share: 0 })
  }

  // Compute share %
  const total = result.reduce((s, x) => s + x.revenue, 0)
  result.forEach(x => { x.share = total ? +(x.revenue / total * 100).toFixed(1) : 0 })

  return result.sort((a, b) => b.revenue - a.revenue)
}

// ── Master fetch: returns full DashboardData ──────────────────────

export async function fetchDashboard(): Promise<DashboardData> {
  // Fetch all tabs in parallel
  const [sanCSV, buSummCSV, bu1CSV, bu2CSV, bu3CSV, bu4CSV, bu5CSV, dbCSV] =
    await Promise.all([
      fetchCSV(SHEET_GIDS['Tổng hợp theo Sàn']),
      fetchCSV(SHEET_GIDS['TỔNG HỢP THEO BU']),
      fetchCSV(SHEET_GIDS['BU1']),
      fetchCSV(SHEET_GIDS['BU2']),
      fetchCSV(SHEET_GIDS['BU3']),
      fetchCSV(SHEET_GIDS['BU4']),
      fetchCSV(SHEET_GIDS['BU5']),
      fetchCSV(SHEET_GIDS['Database']),
    ])

  const sanRows  = parseCSV(sanCSV)
  const buSRows  = parseCSV(buSummCSV)
  const dbRows   = parseCSV(dbCSV)
  const sanTab   = parseSummaryTab(sanRows)
  const buList   = parseBUTab(buSRows)
  const dbMap    = parseDatabase(dbRows)
  const sanList  = parseSanRevenues(sanRows, dbMap)

  // BU daily
  const buDailyRaw = [bu1CSV, bu2CSV, bu3CSV, bu4CSV, bu5CSV].map(c => parseSummaryTab(parseCSV(c)))
  const buDaily: Record<string, DailyPoint[]> = {}
  ;['BU1','BU2','BU3','BU4','BU5'].forEach((name, i) => { buDaily[name] = buDailyRaw[i].daily })

  const { gmv, re2, re1, pl1b, daily, rawDates } = sanTab

  return {
    fetchedAt: new Date().toISOString(),
    period:    extractPeriod(rawDates),
    overall: {
      gmv, re2, re1, pl1b,
      re2Pct: gmv ? +(re2 / gmv * 100).toFixed(1) : 0,
      re1Pct: gmv ? +(re1 / gmv * 100).toFixed(1) : 0,
      margin: re1 ? +(pl1b / re1 * 100).toFixed(1) : 0,
      daily,
    },
    buList,
    buDaily,
    sanList,
  }
}
