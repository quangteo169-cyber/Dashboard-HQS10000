import { NextResponse } from 'next/server'
import { fetchDashboard } from '@/lib/sheets'

export const dynamic   = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  try {
    const data = await fetchDashboard()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
