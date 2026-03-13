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
    <aside
      className="w-56 flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #353A44 0%, #2B3038 50%, #222830 100%)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.4), 4px 0 16px rgba(0,0,0,0.3)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-5 py-5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
        }}
      >
        <Mic className="w-6 h-6" style={{ color: '#4FC3F7' }} />
        <span
          className="text-lg font-bold tracking-tight"
          style={{ color: '#F0F0F0', letterSpacing: '-0.02em' }}
        >
          MultiMeet
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex items-center gap-3 px-5 py-3 text-sm transition-all"
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'linear-gradient(90deg, #2C4F6A 0%, #355E82 50%, #3C6E96 100%)',
                    color: '#F0F0F0',
                    borderTop: '1px solid rgba(255,255,255,0.12)',
                    borderBottom: '1px solid rgba(0,0,0,0.3)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.2)',
                  }
                : {
                    color: '#A8B0BA',
                  }
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <button
        onClick={() => { logout(); navigate('/login') }}
        className="flex items-center gap-3 px-5 py-4 text-sm transition-all"
        style={{
          color: '#A8B0BA',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'transparent',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
          ;(e.currentTarget as HTMLElement).style.color = '#F0F0F0'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = '#A8B0BA'
        }}
      >
        <LogOut className="w-4 h-4" />
        로그아웃
      </button>
    </aside>
  )
}
