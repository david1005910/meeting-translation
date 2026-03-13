import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex h-screen" style={{ background: 'transparent' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
