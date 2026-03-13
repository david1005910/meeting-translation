import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'
import { useAuthStore } from '../stores/authStore'
import MeetingCard from '../components/meeting/MeetingCard'

const softCard = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  borderRadius: '16px',
  boxShadow: '0px 4px 14px rgba(149, 157, 165, 0.12)',
}

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)
  const { data: meetings, isLoading } = useMeetings()
  const recent = meetings?.slice(0, 5) || []

  const stats = {
    total: meetings?.length || 0,
    en: meetings?.filter((m) => m.language === 'en').length || 0,
    zh: meetings?.filter((m) => m.language === 'zh').length || 0,
    vi: meetings?.filter((m) => m.language === 'vi').length || 0,
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-medium" style={{ color: '#4a5568' }}>
            안녕하세요, {user?.name || user?.email}님 👋
          </h1>
          <p className="mt-1" style={{ color: '#a0aec0' }}>오늘도 성공적인 미팅 되세요.</p>
        </div>
        <Link
          to="/meetings/new"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
            color: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0px 6px 20px rgba(139, 92, 246, 0.25)',
          }}
        >
          <Plus className="w-4 h-4" />
          새 회의 시작
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: '전체 회의', value: stats.total },
          { label: '🇺🇸 영어', value: stats.en },
          { label: '🇨🇳 중국어', value: stats.zh },
          { label: '🇻🇳 베트남어', value: stats.vi },
        ].map((stat) => (
          <div key={stat.label} style={{ ...softCard, padding: '20px' }}>
            <p className="text-sm" style={{ color: '#a0aec0' }}>{stat.label}</p>
            <p className="text-3xl font-semibold mt-1" style={{ color: '#4a5568' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-medium mb-4" style={{ color: '#4a5568' }}>최근 회의</h2>
        {isLoading ? (
          <p style={{ color: '#a0aec0' }}>불러오는 중...</p>
        ) : recent.length === 0 ? (
          <div className="text-center py-12" style={softCard}>
            <p className="mb-4" style={{ color: '#a0aec0' }}>아직 회의가 없습니다.</p>
            <Link to="/meetings/new" style={{ color: '#8b5cf6', fontSize: '14px' }}>
              첫 번째 회의를 시작해보세요 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recent.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
