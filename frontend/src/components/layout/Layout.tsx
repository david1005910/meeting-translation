import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen" style={{ background: 'transparent' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, rgba(30,34,40,0.6) 0%, rgba(24,28,34,0.8) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
