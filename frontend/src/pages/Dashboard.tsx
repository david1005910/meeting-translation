import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'
import { useAuthStore } from '../stores/authStore'
import MeetingCard from '../components/meeting/MeetingCard'

const metalCard = {
  background: 'linear-gradient(180deg, #353A44 0%, #2B3038 60%, #252930 100%)',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.08)',
  borderTop: '1px solid rgba(255,255,255,0.14)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.3)',
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
          <h1 className="text-2xl font-bold" style={{ color: '#F0F0F0', letterSpacing: '-0.02em' }}>
            안녕하세요, {user?.name || user?.email}님
          </h1>
          <p className="mt-1" style={{ color: '#A8B0BA' }}>오늘도 성공적인 미팅 되세요.</p>
        </div>
        <Link
          to="/meetings/new"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(180deg, #3C6E96 0%, #355E82 50%, #2C4F6A 100%)',
            color: '#F0F0F0',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.12)',
            borderTop: '1px solid rgba(255,255,255,0.22)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)',
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
          <div key={stat.label} style={{ ...metalCard, padding: '20px' }}>
            <p className="text-sm" style={{ color: '#A8B0BA' }}>{stat.label}</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#F0F0F0' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#D1D5DB' }}>최근 회의</h2>
        {isLoading ? (
          <p style={{ color: '#A8B0BA' }}>불러오는 중...</p>
        ) : recent.length === 0 ? (
          <div className="text-center py-12" style={metalCard}>
            <p className="mb-4" style={{ color: '#A8B0BA' }}>아직 회의가 없습니다.</p>
            <Link to="/meetings/new" style={{ color: '#4FC3F7', fontSize: '14px' }}>
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
