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
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '4px 0px 24px rgba(149, 157, 165, 0.12)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2 px-5 py-5"
        style={{ borderBottom: '1px solid rgba(149,157,165,0.15)' }}
      >
        <Mic className="w-6 h-6" style={{ color: '#8b5cf6' }} />
        <span className="text-lg font-semibold" style={{ color: '#4a5568', letterSpacing: '-0.01em' }}>
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
                    background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
                    color: '#ffffff',
                    borderRadius: '12px',
                    margin: '2px 8px',
                    padding: '10px 16px',
                    boxShadow: '0px 6px 20px rgba(139, 92, 246, 0.25)',
                  }
                : {
                    color: '#a0aec0',
                    borderRadius: '12px',
                    margin: '2px 8px',
                    padding: '10px 16px',
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
        className="flex items-center gap-3 mx-2 mb-3 px-4 py-3 text-sm transition-all"
        style={{
          color: '#a0aec0',
          borderRadius: '12px',
          background: 'transparent',
          border: 'none',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)'
          ;(e.currentTarget as HTMLElement).style.color = '#4a5568'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = '#a0aec0'
        }}
      >
        <LogOut className="w-4 h-4" />
        로그아웃
      </button>
    </aside>
  )
}
