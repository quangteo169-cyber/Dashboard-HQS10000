# HQS1000 Revenue Dashboard

Real-time dashboard built with **Next.js 14 + Recharts**, fetching data directly from Google Sheets.

## Tech Stack

- **Next.js 14** (App Router + ISR)
- **Recharts** for all charts
- **Tailwind CSS** for styling
- **Google Sheets CSV export** — no API key needed, just public sheet

## Architecture

```
Google Sheets (public)
    ↓ CSV export every 60s (Vercel ISR)
Next.js Server Component (page.tsx)
    ↓ fetchDashboard() in lib/sheets.ts
DashboardClient.tsx (React, Recharts)
    ↓ auto-refresh via /api/dashboard every 60s
Browser
```

---

## 🚀 Deploy to Vercel

### Step 1 — Get sheet GIDs

Open your Google Sheet. Click each tab and copy the `gid=XXXXXX` from the URL.

Example: `https://docs.google.com/.../edit?gid=905378624`  
→ GID for that tab = `905378624`

### Step 2 — Update `src/lib/sheets.ts`

```ts
export const SHEET_GIDS: Record<string, number> = {
  'Tổng hợp theo Sàn': 905378624,   // ← your real gid
  'TỔNG HỢP THEO BU':  123456789,   // ← your real gid
  'BU1': 111111111,                  // ← etc
  'BU2': 222222222,
  'BU3': 333333333,
  'BU4': 444444444,
  'BU5': 555555555,
  'Database': 666666666,
}
```

### Step 3 — Make Google Sheet public

File → Share → **Anyone with the link → Viewer**

### Step 4 — Deploy

**Option A: GitHub + Vercel (recommended)**

```bash
# 1. Create GitHub repo and push this folder
git init
git add .
git commit -m "init dashboard"
git remote add origin https://github.com/YOUR_USER/hqs-dashboard.git
git push -u origin main

# 2. Go to vercel.com → New Project → Import GitHub repo
# 3. Click Deploy — done!
```

**Option B: Vercel CLI**

```bash
npm install -g vercel
npm install
vercel deploy
```

**Option C: Local dev**

```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📊 Data Flow

The app reads **6 tabs** from your Google Sheet:

| Tab | Purpose |
|-----|---------|
| `Tổng hợp theo Sàn` | Overall daily GMV/RE2/RE1/PL1B + Sàn revenues |
| `TỔNG HỢP THEO BU` | BU1–BU5 totals (same row structure) |
| `BU1` – `BU5` | Per-BU daily breakdown |
| `Database` | Sàn code → name/BU mapping |

### Row mapping (sheets.ts ROW constants)

```
Row 7  = PL1B     (col 6 = Total, col 7+ = daily)
Row 8  = GMV
Row 9  = RE2 (Flip)
Row 10 = RE1 (DT dịch vụ)
Row 15 = KHO GIFTCARD
Row 17 = Kho Robux
Row 18 = KHO TOPUP
Row 19 = KHO NICK
Row 4  = dates (col 7 onwards)
```

These match the structure of your HQS1000 T02/T03 Excel files exactly.

---

## ⚡ Real-time mechanism

- **Vercel ISR** (`revalidate = 60`): the page and API route rebuild every 60 seconds in the background
- **Client-side poll** (`setInterval`): the browser calls `/api/dashboard` every 60 seconds for live updates without full page reload
- **Stale-while-revalidate**: users always see data instantly, with background refresh

---

## 🔧 Customisation

| Change | File |
|--------|------|
| Sheet ID or GIDs | `src/lib/sheets.ts` → `SHEET_ID`, `SHEET_GIDS` |
| Row indices (if your sheet changes) | `src/lib/sheets.ts` → `ROW` constants |
| Refresh interval | `src/components/DashboardClient.tsx` → `REFRESH_MS` |
| Colors | `src/lib/utils.ts` → `BU_COLORS`, `CHART` |
