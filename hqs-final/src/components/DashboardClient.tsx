'use client'
/**
 * DashboardClient.tsx
 * Full interactive dashboard — 3 tabs, all charts, real-time poll
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ComposedChart, LineChart, BarChart, PieChart,
  Line, Bar, Area, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { fmt, fmtFull, pct, BU_COLORS, BU_TAG, CHART } from '@/lib/utils'
import type { DashboardData, BUSummary } from '@/lib/sheets'

// ─── Custom Tooltip ───────────────────────────────────────────────

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#111827] border border-[#374151] rounded-xl p-3 shadow-2xl min-w-[160px]">
      <p className="text-[11px] font-bold text-gray-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-gray-400 text-[11px]">{p.name}:</span>
          <span className="text-white font-bold text-[11px]">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const AX = { fill: '#4b5563', fontSize: 10 }
const GRID_C = '#111827'
const REFRESH_MS = 60_000

// ─── KPI Card ─────────────────────────────────────────────────────

function KPI({
  label, value, sub, delta, deltaUp, accent,
}: {
  label: string; value: string; sub?: string
  delta?: string; deltaUp?: boolean; accent?: string
}) {
  const tops: Record<string, string> = {
    gmv:  'before:from-cyan-400',
    re2:  'before:from-orange-400',
    re1:  'before:from-indigo-400',
    pl1b: 'before:from-emerald-400',
    neu:  'before:from-gray-600',
  }
  const top = tops[accent || 'neu'] || tops.neu
  return (
    <div className={`
      relative bg-[#0d1117] border border-[#1f2937] rounded-xl p-4 overflow-hidden
      before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px]
      before:bg-gradient-to-r ${top} before:to-transparent
      hover:border-[#374151] transition-colors
    `}>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 leading-none">{label}</div>
      <div className="text-[22px] font-extrabold text-gray-50 leading-none tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-gray-600 mt-1.5">{sub}</div>}
      {delta && (
        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg mt-2 ${
          deltaUp === true  ? 'bg-emerald-500/10 text-emerald-400' :
          deltaUp === false ? 'bg-red-500/10 text-red-400' :
                              'bg-gray-600/10 text-gray-500'
        }`}>{delta}</span>
      )}
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────

function Card({ title, badge, badgeColor, children, footer }: {
  title: string; badge?: string; badgeColor?: string
  children: React.ReactNode; footer?: React.ReactNode
}) {
  const bc = badgeColor === 're2'
    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    : badgeColor === 'pl1b'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    : 'bg-gray-600/10 text-gray-500 border-gray-600/20'
  return (
    <div className="bg-[#0d1117] border border-[#1f2937] rounded-xl p-4 hover:border-[#2d3748] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${bc}`}>{badge}</span>}
      </div>
      {children}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}

// ─── Formula bar ──────────────────────────────────────────────────

function FormulaBar() {
  const pills = [
    { label: 'GMV', color: '#22d3ee', bg: 'rgba(34,211,238,0.1)', border: 'rgba(34,211,238,0.25)', desc: 'Tổng doanh thu thô' },
    { label: 'RE2 (Flip)', color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)', desc: 'Doanh thu Flip/Provider', op: '−' },
    { label: 'RE1', color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)', desc: 'Dịch vụ thuần', op: '=' },
    { label: 'PL1B', color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', desc: 'Lợi nhuận gộp', op: '→' },
  ]
  return (
    <div className="bg-[#080c12] border-b border-[#1f2937] px-6 py-2 flex items-center gap-2 flex-wrap text-xs">
      <span className="text-gray-600 font-bold uppercase tracking-widest text-[9px] mr-1">Công thức:</span>
      {pills.map((p) => (
        <span key={p.label} className="flex items-center gap-1.5">
          {p.op && <span className="text-gray-600 font-bold">{p.op}</span>}
          <span className="px-2.5 py-0.5 rounded-md font-bold text-[11px]"
            style={{ color: p.color, background: p.bg, border: `1px solid ${p.border}` }}>
            {p.label}
          </span>
          <span className="text-gray-600 text-[10px] hidden md:inline">{p.desc}</span>
        </span>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────

export default function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData]       = useState<DashboardData>(initialData)
  const [tab, setTab]         = useState<'san' | 'bu' | 'detail'>('san')
  const [buSel, setBuSel]     = useState('BU1')
  const [lastRefresh, setLR]  = useState<Date>(new Date())
  const [loading, setLoading] = useState(false)

  // ── Auto-refresh every 60 s ──────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (res.ok) {
        const next: DashboardData = await res.json()
        if (!next.error) { setData(next); setLR(new Date()) }
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const { overall, buList, buDaily, sanList, period } = data

  const buData  = buList.find(b => b.name === buSel) as BUSummary
  const buDRows = buDaily[buSel] || []

  const totalSanRev = sanList.reduce((s, x) => s + x.revenue, 0)

  const buCompare = buList.map(b => ({
    name: b.name,
    'GMV':        b.gmv,
    'RE2 (Flip)': b.re2,
    'RE1 (DT DV)':b.re1,
    'PL1B':       b.pl1b,
    re2Pct:       b.re2Pct,
  }))

  // Tabs
  const TABS = [
    { id: 'san',    label: '🏪 Tổng hợp theo Sàn' },
    { id: 'bu',     label: '📦 Tổng hợp theo BU'  },
    { id: 'detail', label: '🔍 Từng BU riêng'      },
  ] as const

  return (
    <div className="min-h-screen flex flex-col font-sans">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#07090f]/95 backdrop-blur border-b border-[#1f2937] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-indigo-500/25">
            H
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-white leading-none tracking-tight">
              HQS<span className="text-indigo-400">1000</span>
              <span className="text-gray-600 font-normal ml-2 text-[13px]">Revenue Dashboard</span>
            </h1>
            <p className="text-[10px] text-gray-600 mt-0.5">
              {period} · Google Sheets · ISR 60s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300 bg-[#111827] border border-[#1f2937] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            <span className={loading ? 'animate-spin' : ''}>↻</span>
            Refresh
          </button>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse inline-block" />
            LIVE · {lastRefresh.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* ── FORMULA BAR ────────────────────────────────────────── */}
      <FormulaBar />

      {/* ── TABS ───────────────────────────────────────────────── */}
      <nav className="bg-[#07090f] border-b-2 border-[#1f2937] px-6 flex gap-1 pt-3">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-[13px] font-semibold rounded-t-lg border-b-2 -mb-0.5 transition-all ${
              tab === t.id
                ? 'text-indigo-400 border-indigo-500 bg-[#0d1117]'
                : 'text-gray-600 border-transparent hover:text-gray-400 hover:bg-[#0d1117]/60'
            }`}>{t.label}</button>
        ))}
      </nav>

      {/* ── CONTENT ────────────────────────────────────────────── */}
      <main className="flex-1 px-6 py-5">

        {/* ══════════════════════════════════════════════════════
            TAB 1 — TỔNG HỢP THEO SÀN
        ══════════════════════════════════════════════════════ */}
        {tab === 'san' && (
          <div className="space-y-4">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <KPI label="💹 GMV"          value={fmt(overall.gmv)}    sub="Tổng doanh thu thô"     accent="gmv"  delta="Baseline" />
              <KPI label="🔄 RE2 — Flip"   value={fmt(overall.re2)}    sub="Doanh thu Flip/Provider" accent="re2"  delta={`${overall.re2Pct}% GMV`} />
              <KPI label="📈 RE1 — DT DV"  value={fmt(overall.re1)}    sub="Dịch vụ thuần"           accent="re1"  delta={`${overall.re1Pct}% GMV`} />
              <KPI label="💎 PL1B"         value={fmt(overall.pl1b)}   sub="Lợi nhuận gộp"           accent="pl1b" delta={`Margin ${overall.margin}%`} deltaUp />
              <KPI label="🏪 Sàn hoạt động" value={String(sanList.filter(s=>s.revenue>0).length)} sub="đang có doanh thu" />
            </div>

            {/* Triple daily chart */}
            <Card title="📈 Diễn biến hàng ngày — GMV · RE2 · RE1" badge="RE2 INCLUDED" badgeColor="re2">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={overall.daily} margin={{ top:4, right:8, left:0, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                  <XAxis dataKey="date" tick={AX} />
                  <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#9ca3af' }} />
                  <Area type="monotone" dataKey="gmv"  name="GMV"         stroke={CHART.gmv}  fill="rgba(34,211,238,0.05)"   strokeWidth={1.5} strokeDasharray="5 3" />
                  <Area type="monotone" dataKey="re2"  name="RE2 (Flip)"  stroke={CHART.re2}  fill="rgba(251,146,60,0.07)"   strokeWidth={2}   />
                  <Line type="monotone" dataKey="re1"  name="RE1 (DT DV)" stroke={CHART.re1}  strokeWidth={2.5} dot={false}  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>

            {/* Stacked bar + Pie */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Card title="📊 RE1 + RE2 stacked theo ngày" badge="STACKED" badgeColor="re2">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={overall.daily} margin={{ top:4, right:8, left:0, bottom:4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                      <XAxis dataKey="date" tick={AX} />
                      <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                      <Tooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize:11, color:'#9ca3af' }} />
                      <Bar dataKey="re1" name="RE1 (DT DV)" stackId="a" fill="rgba(129,140,248,0.7)" radius={[0,0,3,3]} />
                      <Bar dataKey="re2" name="RE2 (Flip)"  stackId="a" fill="rgba(251,146,60,0.7)"  radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
              <Card title="🥧 Cơ cấu GMV">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={[
                      { name: 'RE1 (DT DV)', value: overall.re1, fill: CHART.re1 },
                      { name: 'RE2 (Flip)',  value: overall.re2, fill: CHART.re2 },
                    ]} cx="50%" cy="50%" innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {[CHART.re1, CHART.re2].map((c, i) => <Cell key={i} fill={c} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
                {[
                  { label: 'RE1 (DT DV)', v: overall.re1, c: CHART.re1 },
                  { label: 'RE2 (Flip)',  v: overall.re2, c: CHART.re2 },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between text-[11px] mt-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: r.c }} />
                      <span className="text-gray-500">{r.label}</span>
                    </span>
                    <span className="font-bold text-gray-300">{pct(r.v, overall.gmv)}</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* San table */}
            <Card title="📋 Bảng xếp hạng — Doanh thu theo Sàn">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#1f2937]">
                      {['#','Sàn','Mã','BU','Doanh thu GMV','Thị phần','Bar'].map(h => (
                        <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider first:w-8">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sanList.filter(s => s.revenue > 0).map((s, i) => (
                      <tr key={s.code} className="border-b border-[#1f2937]/40 hover:bg-[#111827]/40 transition-colors">
                        <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-200">{s.name}</td>
                        <td className="py-2.5 px-3">
                          <code className="text-indigo-300 bg-indigo-900/25 px-1.5 py-0.5 rounded text-[10px] font-mono">{s.code}</code>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${BU_TAG[s.bu] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
                            {s.bu}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-cyan-300 font-mono text-[12px]">{fmtFull(s.revenue)}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500 text-[11px]">{s.share.toFixed(1)}%</td>
                        <td className="py-2.5 px-3">
                          <div className="w-20 bg-[#1f2937] rounded-full h-1.5 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                              style={{ width: `${Math.min((s.revenue / (sanList[0]?.revenue || 1)) * 100, 100)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2 — TỔNG HỢP THEO BU
        ══════════════════════════════════════════════════════ */}
        {tab === 'bu' && (
          <div className="space-y-4">

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {buList.map(b => (
                <KPI key={b.name} label={`${b.name} — PL1B`}
                  value={fmt(b.pl1b)}
                  sub={`${pct(b.pl1b, buList.reduce((s,x)=>s+x.pl1b,0))} tổng LN`}
                  deltaUp />
              ))}
            </div>

            {/* GMV / RE2 / RE1 grouped */}
            <Card title="📊 GMV · RE2 · RE1 từng BU (so sánh)" badge="GROUPED" badgeColor="re2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={buCompare} margin={{ top:4, right:8, left:0, bottom:4 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                  <XAxis dataKey="name" tick={{ fill:'#9ca3af', fontSize:12 }} />
                  <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#9ca3af' }} />
                  <Bar dataKey="GMV"          fill="rgba(34,211,238,0.55)"  radius={[4,4,0,0]} />
                  <Bar dataKey="RE2 (Flip)"   fill="rgba(251,146,60,0.65)"  radius={[4,4,0,0]} />
                  <Bar dataKey="RE1 (DT DV)"  fill="rgba(129,140,248,0.65)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RE2/GMV ratio */}
              <Card title="📉 Tỷ lệ RE2/GMV từng BU (%)" badge="RE2 RATIO" badgeColor="re2">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={buCompare} margin={{ top:4, right:8, left:0, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                    <XAxis dataKey="name" tick={{ fill:'#9ca3af', fontSize:12 }} />
                    <YAxis tickFormatter={v=>`${v}%`} tick={AX} />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Bar dataKey="re2Pct" name="RE2/GMV %" radius={[6,6,0,0]}>
                      {buCompare.map((_, i) => <Cell key={i} fill={Object.values(BU_COLORS)[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* PL1B */}
              <Card title="💎 Lợi nhuận PL1B từng BU" badge="PROFIT" badgeColor="pl1b">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={buCompare} margin={{ top:4, right:8, left:0, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                    <XAxis dataKey="name" tick={{ fill:'#9ca3af', fontSize:12 }} />
                    <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="PL1B" name="PL1B" radius={[6,6,0,0]}>
                      {buCompare.map((_, i) => <Cell key={i} fill={Object.values(BU_COLORS)[i]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* All BU daily RE1 multi-line */}
            <Card title="📈 RE1 hàng ngày — Tất cả BU">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart margin={{ top:4, right:8, left:0, bottom:4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                  <XAxis dataKey="date" type="category" allowDuplicatedCategory={false} tick={AX} />
                  <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#9ca3af' }} />
                  {buList.map(b => (
                    <Line key={b.name} data={buDaily[b.name] || []}
                      type="monotone" dataKey="re1" name={b.name}
                      stroke={b.color} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* BU table */}
            <Card title="📋 Bảng tổng hợp — tất cả BU">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#1f2937]">
                      {['BU','GMV','RE2 (Flip)','RE1 (DT DV)','PL1B','RE2/GMV','RE1/GMV','Margin'].map(h => (
                        <th key={h} className="text-right first:text-left py-2 px-3 text-[10px] font-bold text-gray-600 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {buList.map(b => (
                      <tr key={b.name} className="border-b border-[#1f2937]/40 hover:bg-[#111827]/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${BU_TAG[b.name]}`}>{b.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-300">{fmtFull(b.gmv)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-300">{fmtFull(b.re2)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-300">{fmtFull(b.re1)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">{fmtFull(b.pl1b)}</td>
                        <td className="py-2.5 px-3 text-right text-orange-400">{b.re2Pct}%</td>
                        <td className="py-2.5 px-3 text-right text-indigo-400">{b.re1Pct}%</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">{b.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3 — TỪNG BU RIÊNG
        ══════════════════════════════════════════════════════ */}
        {tab === 'detail' && (
          <div className="space-y-4">

            {/* BU selector */}
            <div className="flex gap-2 flex-wrap">
              {buList.map(b => (
                <button key={b.name} onClick={() => setBuSel(b.name)}
                  className={`px-5 py-2 rounded-lg text-[13px] font-bold border transition-all ${
                    buSel === b.name ? 'border-current' : 'border-[#1f2937] text-gray-600 hover:border-[#374151] hover:text-gray-400'
                  }`}
                  style={buSel === b.name ? { color: b.color, background: `${b.color}18`, borderColor: b.color } : {}}>
                  {b.name}
                </button>
              ))}
            </div>

            {/* BU KPIs — 6 cards */}
            {buData && (
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <KPI label="GMV"         value={fmt(buData.gmv)}      sub="Tổng thô" accent="gmv" />
                <KPI label="RE2 (Flip)"  value={fmt(buData.re2)}      sub={`${buData.re2Pct}% GMV`} accent="re2" />
                <KPI label="RE1 (DT DV)" value={fmt(buData.re1)}      sub={`${buData.re1Pct}% GMV`} accent="re1" />
                <KPI label="PL1B"        value={fmt(buData.pl1b)}     sub={`Margin ${buData.margin}%`} accent="pl1b" deltaUp />
                <KPI label="Gift Card"   value={fmt(buData.giftcard)} sub="DT dịch vụ GC" />
                <KPI label="Robux"       value={fmt(buData.robux)}    sub="DT dịch vụ Robux" />
              </div>
            )}

            {/* Triple daily + RE2 daily */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title={`📈 ${buSel} — GMV · RE2 · RE1 theo ngày`} badge="RE2 VISIBLE" badgeColor="re2">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={buDRows} margin={{ top:4, right:8, left:0, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                    <XAxis dataKey="date" tick={AX} />
                    <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                    <Tooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize:11, color:'#9ca3af' }} />
                    <Bar dataKey="re2" name="RE2 (Flip)" fill="rgba(251,146,60,0.45)" radius={[3,3,0,0]} />
                    <Line type="monotone" dataKey="gmv" name="GMV"   stroke={CHART.gmv} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="re1" name="RE1"   stroke={buData?.color || CHART.re1} strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card title={`🔄 ${buSel} — RE2 Flip theo ngày`}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={buDRows} margin={{ top:4, right:8, left:0, bottom:4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} />
                    <XAxis dataKey="date" tick={AX} />
                    <YAxis tickFormatter={v=>fmt(v)} tick={AX} width={60} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="re2" name="RE2 (Flip)" radius={[4,4,0,0]}>
                      {buDRows.map((d, i) => (
                        <Cell key={i} fill={d.re2 < 0 ? 'rgba(239,68,68,0.6)' : 'rgba(251,146,60,0.65)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Kho pie + Sàn bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {buData && (() => {
                const kho = [
                  { name: 'Gift Card', value: buData.giftcard, fill: '#a855f7' },
                  { name: 'Robux',     value: buData.robux,    fill: '#6366f1' },
                  { name: 'Topup',     value: buData.topup,    fill: '#10b981' },
                  { name: 'Nick',      value: buData.nick,     fill: '#f97316' },
                ].filter(k => k.value > 0)
                return (
                  <Card title="🥧 Cơ cấu loại sản phẩm">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={kho} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                          dataKey="value" paddingAngle={3}
                          label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                          labelLine={false}>
                          {kho.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                )
              })()}

              <Card title={`🏪 Sàn thuộc ${buSel}`}>
                {(() => {
                  const buSans = sanList.filter(s => s.bu === buSel && s.revenue > 0)
                  if (!buSans.length) return (
                    <div className="h-40 flex items-center justify-center text-gray-600 text-sm">Không có dữ liệu</div>
                  )
                  return (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={buSans} layout="vertical" margin={{ top:0, right:8, left:8, bottom:0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID_C} horizontal={false} />
                        <XAxis type="number" tickFormatter={v=>fmt(v)} tick={AX} />
                        <YAxis type="category" dataKey="name" tick={{ fill:'#9ca3af', fontSize:10 }} width={80} />
                        <Tooltip formatter={(v: any) => fmtFull(v)} />
                        <Bar dataKey="revenue" name="Doanh thu" fill={buData?.color || '#818cf8'} radius={[0,4,4,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                })()}
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="border-t border-[#1f2937] px-6 py-3 flex items-center justify-between text-[11px] text-gray-600">
        <span>HQS1000 · {period} · Built with Next.js + Recharts</span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse inline-block" />
          Auto-refresh 60s · Google Sheets ISR
        </span>
      </footer>
    </div>
  )
}
