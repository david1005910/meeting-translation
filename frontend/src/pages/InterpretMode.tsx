import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Maximize2, ArrowLeft, Save } from 'lucide-react'
import { useRealtimeInterpret } from '../hooks/useRealtimeInterpret'
import { useMeeting } from '../hooks/useMeetings'
import { audioApi } from '../services/api'

const langLabel: Record<string, string> = {
  en: '🇺🇸 English',
  zh: '🇨🇳 中文',
  vi: '🇻🇳 Tiếng Việt',
}

export default function InterpretMode() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { data: meeting } = useMeeting(meetingId!)
  const { isActive, items, start, stop } = useRealtimeInterpret(
    meetingId!,
    meeting?.language || 'en'
  )
  const bottomRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [items])

  const handleEnd = async () => {
    stop()
    if (items.length > 0) {
      setSaving(true)
      try {
        await audioApi.saveInterpretLogs(meetingId!, items.map(item => ({
          timestamp: item.timestamp,
          original: item.original,
          translated: item.translated,
        })))
      } finally {
        setSaving(false)
      }
    }
    navigate('/')
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      <header className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold">{meeting?.title || '실시간 통역'}</h1>
            <span className="text-sm text-gray-400">
              {meeting?.language && langLabel[meeting.language]} → 🇰🇷 한국어
            </span>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {isActive && (
            <span className="flex items-center gap-2 text-red-400 text-sm">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              통역 중
            </span>
          )}
          <button onClick={() => document.documentElement.requestFullscreen?.()}>
            <Maximize2 className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 border-r border-gray-800">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 sticky top-0 bg-gray-950 py-1">
            원문
          </h2>
          {items.length === 0 && !isActive && (
            <p className="text-gray-600 text-sm">통역 시작 버튼을 눌러 시작하세요.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="mb-4 p-3 rounded-lg bg-gray-900">
              <div className="text-xs text-gray-500 mb-1">
                {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
              </div>
              <p className="text-white leading-relaxed">{item.original}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 sticky top-0 bg-gray-950 py-1">
            🇰🇷 한국어 번역
          </h2>
          {items.map((item) => (
            <div key={item.id} className="mb-4 p-3 rounded-lg bg-blue-950 border border-blue-800">
              <div className="text-xs text-blue-400 mb-1">
                {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
              </div>
              <p className="text-blue-50 text-lg leading-relaxed">{item.translated}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center items-center gap-4 py-6 bg-gray-900 border-t border-gray-800">
        {!isActive ? (
          <button
            onClick={start}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-8 py-3 rounded-full font-semibold transition-colors"
          >
            <Mic className="w-5 h-5" />
            통역 시작
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 px-8 py-3 rounded-full font-semibold transition-colors"
          >
            <MicOff className="w-5 h-5" />
            일시정지
          </button>
        )}
        <button
          onClick={handleEnd}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-3 rounded-full font-semibold transition-colors"
        >
          <Save className="w-5 h-5" />
          {saving ? '저장 중...' : '종료 및 저장'}
        </button>
      </div>
    </div>
  )
}
