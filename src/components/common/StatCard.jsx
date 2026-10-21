import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({ title, value, icon: Icon, color, trend, trendLabel }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  const accents = {
    blue: 'stat-card-blue',
    green: 'stat-card-green',
    yellow: 'stat-card-yellow',
    red: 'stat-card-red',
    purple: 'stat-card-purple',
  }

  return (
    <div className={`admin-stat-card ${accents[color] || accents.blue} bg-white rounded-2xl p-5 shadow-sm border border-gray-100`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
          {trendLabel && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
