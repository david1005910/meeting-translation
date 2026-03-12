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

  if (isLoading) return <div className="p-8 text-gray-400">불러오는 중...</div>
  if (!minutes) return <div className="p-8 text-gray-400">회의록을 찾을 수 없습니다.</div>

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">회의록</h1>
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
