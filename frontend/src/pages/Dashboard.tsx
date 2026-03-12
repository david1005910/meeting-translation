import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'
import { useAuthStore } from '../stores/authStore'
import MeetingCard from '../components/meeting/MeetingCard'

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
          <h1 className="text-2xl font-bold text-gray-900">
            안녕하세요, {user?.name || user?.email}님 👋
          </h1>
          <p className="text-gray-500 mt-1">오늘도 성공적인 미팅 되세요.</p>
        </div>
        <Link
          to="/meetings/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
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
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">최근 회의</h2>
        {isLoading ? (
          <p className="text-gray-400">불러오는 중...</p>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-400 mb-4">아직 회의가 없습니다.</p>
            <Link to="/meetings/new" className="text-blue-600 hover:underline text-sm">
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
