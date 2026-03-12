import { useNavigate } from 'react-router-dom'
import { FileText, Mic, Trash2 } from 'lucide-react'
import { Meeting } from '../../types'
import { useDeleteMeeting } from '../../hooks/useMeetings'

const langLabel: Record<string, string> = { en: '🇺🇸 영어', zh: '🇨🇳 중국어', vi: '🇻🇳 베트남어' }
const statusLabel: Record<string, { label: string; color: string }> = {
  preparing: { label: '준비중', color: 'bg-gray-100 text-gray-600' },
  in_progress: { label: '진행중', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
}

interface Props {
  meeting: Meeting
}

export default function MeetingCard({ meeting }: Props) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteMeeting()
  const status = statusLabel[meeting.status] || statusLabel.preparing

  const handleOpen = () => {
    if (meeting.mode === 'interpret') {
      navigate(`/meetings/${meeting.id}/interpret`)
    } else {
      if (meeting.minutes) {
        navigate(`/meetings/${meeting.id}/minutes/view`)
      } else {
        navigate(`/meetings/${meeting.id}/minutes`)
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{meeting.title}</h3>
          {meeting.company && <p className="text-sm text-gray-500 mt-0.5">{meeting.company}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">{langLabel[meeting.language] || meeting.language}</span>
            <span className="text-gray-300">·</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">
              {new Date(meeting.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
        <div className="flex gap-2 ml-3">
          <button
            onClick={handleOpen}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title={meeting.mode === 'interpret' ? '통역 시작' : '회의록 보기'}
          >
            {meeting.mode === 'interpret' ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
          <button
            onClick={() => deleteMutation.mutate(meeting.id)}
            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
