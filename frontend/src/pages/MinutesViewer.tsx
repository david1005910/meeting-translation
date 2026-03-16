import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { audioApi } from '../services/api'
import { Minutes } from '../types'
import MinutesEditor from '../components/minutes/MinutesEditor'
import DownloadButton from '../components/minutes/DownloadButton'

export default function MinutesViewer() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const [content, setContent] = useState('')

  const { data: minutes, isLoading } = useQuery<Minutes>({
    queryKey: ['minutes', meetingId],
    queryFn: () => audioApi.getMinutes(meetingId!).then((r) => {
      setContent(r.data.content)
      return r.data
    }),
    enabled: !!meetingId,
  })

  if (isLoading) return <div className="p-8" style={{ color: 'rgba(255,255,255,0.5)' }}>불러오는 중...</div>
  if (!minutes) return <div className="p-8" style={{ color: 'rgba(255,255,255,0.5)' }}>회의록을 찾을 수 없습니다.</div>

  return (
    <div className="p-8 max-w-4xl" style={{ background: 'transparent' }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>회의록</h1>
        </div>
        <DownloadButton meetingId={meetingId!} content={content || minutes.content} />
      </div>
      <MinutesEditor
        meetingId={meetingId!}
        content={content || minutes.content}
        onUpdate={setContent}
      />
    </div>
  )
}
