import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'
import MeetingCard from '../components/meeting/MeetingCard'

export default function MeetingList() {
  const [search, setSearch] = useState('')
  const [language, setLanguage] = useState('')
  const { data: meetings, isLoading } = useMeetings({
    search: search || undefined,
    language: language || undefined,
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">회의 목록</h1>
        <Link
          to="/meetings/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 회의
        </Link>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="회의명 또는 회사명 검색"
            className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 언어</option>
          <option value="en">🇺🇸 영어</option>
          <option value="zh">🇨🇳 중국어</option>
          <option value="vi">🇻🇳 베트남어</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400">불러오는 중...</p>
      ) : !meetings?.length ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 mb-4">회의가 없습니다.</p>
          <Link to="/meetings/new" className="text-blue-600 hover:underline text-sm">
            첫 번째 회의를 시작해보세요 →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.id} meeting={meeting} />
          ))}
        </div>
      )}
    </div>
  )
}
