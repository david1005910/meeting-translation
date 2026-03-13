import { useNavigate } from 'react-router-dom'
import { FileText, Mic, Trash2 } from 'lucide-react'
import { Meeting } from '../../types'
import { useDeleteMeeting } from '../../hooks/useMeetings'

const langLabel: Record<string, string> = { en: '🇺🇸 영어', zh: '🇨🇳 중국어', vi: '🇻🇳 베트남어' }

const statusStyle: Record<string, { label: string; bg: string; color: string }> = {
  preparing:   { label: '준비중', bg: 'rgba(168,176,186,0.12)', color: '#A8B0BA' },
  in_progress: { label: '진행중', bg: 'rgba(251,191,36,0.12)',  color: '#FBD24C' },
  completed:   { label: '완료',   bg: 'rgba(38,194,129,0.15)',  color: '#26C281' },
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
        background: 'linear-gradient(180deg, #353A44 0%, #2B3038 60%, #252930 100%)',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderTop: '1px solid rgba(255,255,255,0.13)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.25)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.07), 0 4px 16px rgba(0,0,0,0.4)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.25)')}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold truncate" style={{ color: '#F0F0F0' }}>{meeting.title}</h3>
          {meeting.company && <p className="text-sm mt-0.5" style={{ color: '#A8B0BA' }}>{meeting.company}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: '#A8B0BA' }}>{langLabel[meeting.language] || meeting.language}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span
              className="text-xs px-2 py-0.5"
              style={{
                background: status.bg,
                color: status.color,
                borderRadius: '4px',
                border: `1px solid ${status.color}30`,
              }}
            >
              {status.label}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <span className="text-xs" style={{ color: '#A8B0BA' }}>
              {new Date(meeting.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
        <div className="flex gap-1 ml-3">
          <button
            onClick={handleOpen}
            className="p-2 transition-all"
            style={{ color: '#4FC3F7', borderRadius: '5px' }}
            title={meeting.mode === 'interpret' ? '통역 시작' : '회의록 보기'}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,195,247,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {meeting.mode === 'interpret' ? <Mic className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </button>
          <button
            onClick={() => deleteMutation.mutate(meeting.id)}
            className="p-2 transition-all"
            style={{ color: '#A8B0BA', borderRadius: '5px' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(252,129,129,0.1)'
              ;(e.currentTarget as HTMLElement).style.color = '#FC8181'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = '#A8B0BA'
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
