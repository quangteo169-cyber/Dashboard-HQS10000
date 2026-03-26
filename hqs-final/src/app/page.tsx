// app/page.tsx — Server Component (ISR, revalidates every 60s)
import { fetchDashboard } from '@/lib/sheets'
import DashboardClient from '@/components/DashboardClient'

export const revalidate = 60   // Vercel ISR: rebuild this page every 60 seconds

export default async function Page() {
  let data
  let errorMsg: string | undefined

  try {
    data = await fetchDashboard()
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err)
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07090f]">
        <div className="text-center space-y-4 max-w-lg px-6">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-gray-200">Không thể tải dữ liệu</h2>
          <p className="text-gray-500 text-sm">{errorMsg}</p>
          <div className="bg-[#111827] border border-[#374151] rounded-lg p-4 text-left text-xs text-gray-400 space-y-2">
            <p className="font-bold text-gray-300">Kiểm tra:</p>
            <p>1. Google Sheet đã mở <strong>Anyone with link → Viewer</strong>?</p>
            <p>2. GID các tab trong <code className="text-indigo-300">src/lib/sheets.ts</code> đúng chưa?</p>
            <p>3. <code className="text-indigo-300">SHEET_ID</code> đúng chưa?</p>
          </div>
          <p className="text-xs text-gray-600">
            Sheet ID hiện tại: <code className="text-indigo-300">1GFnJWfRBdLw7KZSYxS1IaqlGvIZtJcAskjoVePS2kbM</code>
          </p>
        </div>
      </div>
    )
  }

  return <DashboardClient initialData={data} />
}
