export default function SuperStatCard({ title, value, icon: Icon }) {
  return <div className="flex min-h-28 items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{title}</p><p className="mt-2 break-words text-2xl font-semibold tracking-tight text-slate-900">{value}</p></div>
    <div className="ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon size={18} strokeWidth={1.8} /></div>
  </div>
}
