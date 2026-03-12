import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, List, Plus, Settings, LogOut, Mic } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드', end: true },
  { to: '/meetings', icon: List, label: '회의 목록' },
  { to: '/meetings/new', icon: Plus, label: '새 회의' },
  { to: '/settings', icon: Settings, label: '설정' },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  return (
    <aside className="w-56 bg-gray-900 text-white flex flex-col">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-700">
        <Mic className="w-6 h-6 text-blue-400" />
        <span className="text-lg font-bold">MultiMeet</span>
      </div>
      <nav className="flex-1 py-4">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={() => { logout(); navigate('/login') }}
        className="flex items-center gap-3 px-5 py-4 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors border-t border-gray-700"
      >
        <LogOut className="w-4 h-4" />
        로그아웃
      </button>
    </aside>
  )
}
