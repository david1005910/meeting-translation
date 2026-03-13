import { useNavigate } from 'react-router-dom'
import { FileText, Mic, Trash2 } from 'lucide-react'
import { Meeting } from '../../types'
import { useDeleteMeeting } from '../../hooks/useMeetings'

const langLabel: Record<string, string> = { ko: '🇰🇷 한국어', en: '🇺🇸 영어', zh: '🇨🇳 중국어', vi: '🇻🇳 베트남어' }

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  preparing:   { label: '준비중', bg: '#f1f5f9', color: '#a0aec0' },
  in_progress: { label: '진행중', bg: '#fffbeb', color: '#d97706' },
  completed:   { label: '완료',   bg: '#f0fdf4', color: '#16a34a' },
}

interface Props {
  meeting: Meeting
}

export default function MeetingCard({ meeting }: Props) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteMeeting()
  const status = statusStyle[meeting.status] || statusStyle.preparing

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
    <div
      className="p-5 transition-all"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        borderRadius: '16px',
        boxShadow: '0px 4px 12px rgba(149, 157, 165, 0.1)',
      }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold truncate" style={{ color: '#4a5568' }}>{meeting.title}</h3>
          {meeting.company && (
            <p className="text-sm mt-0.5" style={{ color: '#a0aec0' }}>{meeting.company}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: '#a0aec0' }}>
              {langLabel[meeting.language] || meeting.language}
            </span>
            <span style={{ color: '#cbd5e0' }}>·</span>
            <span
              className="text-xs px-2 py-0.5 font-medium"
              style={{
                background: status.bg,
                color: status.color,
                borderRadius: '8px',
              }}
            >
              {status.label}
            </span>
            <span style={{ color: '#cbd5e0' }}>·</span>
            <span className="text-xs" style={{ color: '#a0aec0' }}>
              {new Date(meeting.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
        <div className="flex gap-1 ml-3">
          <button
            onClick={handleOpen}
            className="p-2 transition-all"
            style={{ color: '#8b5cf6', borderRadius: '10px' }}
            title={meeting.mode === 'interpret' ? '통역 시작' : '회의록 보기'}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(139,92,246,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {meeting.mode === 'interpret' ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
          <button
            onClick={() => deleteMutation.mutate(meeting.id)}
            className="p-2 transition-all"
            style={{ color: '#a0aec0', borderRadius: '10px' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(245,101,101,0.08)'
              ;(e.currentTarget as HTMLElement).style.color = '#f56565'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#a0aec0'
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
