import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Maximize2, ArrowLeft, Save, Volume2, VolumeX, ArrowRightLeft, Play, Square } from 'lucide-react'
import { useRealtimeInterpret } from '../hooks/useRealtimeInterpret'
import { useMeeting } from '../hooks/useMeetings'
import { audioApi, meetingsApi } from '../services/api'
import { TranslationItem } from '../types'

const langLabel: Record<string, string> = {
  en: '🇺🇸 English',
  zh: '🇨🇳 中文',
  vi: '🇻🇳 Tiếng Việt',
}

type Direction = 'to-ko' | 'to-foreign'

export default function InterpretMode() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { data: meeting } = useMeeting(meetingId!)

  const [direction, setDirection] = useState<Direction>('to-ko')
  const [targetLang, setTargetLang] = useState<string>('zh')   // to-foreign 선택 언어
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [ttsVolume, setTtsVolume] = useState(3.0)   // 0.0 ~ 4.0 (GainNode)
  const [saving, setSaving] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const sourceLanguage = direction === 'to-ko' ? (meeting?.language || 'en') : 'ko'
  const resolvedTarget = direction === 'to-foreign' ? targetLang : undefined

  const { isActive, items, error: interpretError, start, stop, clearItems } = useRealtimeInterpret(
    meetingId!, sourceLanguage, resolvedTarget
  )

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const lastSpokenId = useRef<string>('')
  const ttsAudioCtxRef = useRef<AudioContext | null>(null)
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null)

  // 핵심 TTS 재생 함수 (itemId: null이면 자동재생, 있으면 수동재생)
  const playTts = useCallback(async (text: string, lang: string, itemId: string | null = null) => {
    try {
      ttsSourceRef.current?.stop()
      ttsAudioCtxRef.current?.close()
      ttsAudioCtxRef.current = null
      ttsSourceRef.current = null
      setIsSpeaking(true)
      if (itemId) setPlayingId(itemId)

      const res = await audioApi.tts(text, lang)
      const arrayBuffer = await (res.data as Blob).arrayBuffer()

      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      const source = audioCtx.createBufferSource()
      source.buffer = audioBuffer

      const gainNode = audioCtx.createGain()
      gainNode.gain.value = ttsVolume
      source.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      ttsAudioCtxRef.current = audioCtx
      ttsSourceRef.current = source

      source.onended = () => {
        audioCtx.close()
        ttsAudioCtxRef.current = null
        ttsSourceRef.current = null
        setIsSpeaking(false)
        setPlayingId(null)
      }
      source.start()
    } catch {
      setIsSpeaking(false)
      setPlayingId(null)
    }
  }, [ttsVolume])

  // 자동재생: to-foreign 모드에서 새 번역 도착 시
  const speak = useCallback((text: string, lang: string) => {
    if (!ttsEnabled || direction !== 'to-foreign') return
    playTts(text, lang, null)
  }, [ttsEnabled, direction, playTts])

  // 수동재생 중지
  const stopTts = useCallback(() => {
    ttsSourceRef.current?.stop()
    ttsAudioCtxRef.current?.close()
    ttsAudioCtxRef.current = null
    ttsSourceRef.current = null
    setIsSpeaking(false)
    setPlayingId(null)
  }, [])

  useEffect(() => {
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = leftPanelRef.current.scrollHeight
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = rightPanelRef.current.scrollHeight

    if (direction === 'to-foreign' && items.length > 0) {
      const last = items[items.length - 1]
      if (last.id !== lastSpokenId.current) {
        lastSpokenId.current = last.id
        speak(last.translated, targetLang)
      }
    }
  }, [items, direction, targetLang, speak])

  const handleEnd = async () => {
    stop()
    ttsSourceRef.current?.stop()
    ttsAudioCtxRef.current?.close()
    if (items.length > 0) {
      setSaving(true)
      try {
        await audioApi.saveInterpretLogs(meetingId!, items.map(item => ({
          timestamp: item.timestamp,
          original: item.original,
          translated: item.translated,
          targetLanguage: item.targetLanguage,
        })))
        await meetingsApi.update(meetingId!, { status: 'completed' })
      } finally {
        setSaving(false)
      }
    }
    navigate('/')
  }

  const handleToggleDirection = () => {
    if (!isActive) {
      setDirection(d => d === 'to-ko' ? 'to-foreign' : 'to-ko')
      clearItems()
      lastSpokenId.current = ''
    }
  }

  // to-foreign 모드에서 왼쪽 패널 원문 중복 제거
  const originItems: TranslationItem[] = direction === 'to-foreign'
    ? items.filter((item, idx, arr) =>
        arr.findIndex(i => i.original === item.original && i.timestamp === item.timestamp) === idx
      )
    : items

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
              {direction === 'to-ko'
                ? <>{meeting?.language && langLabel[meeting.language]} → 🇰🇷 한국어</>
                : <>🇰🇷 한국어 → {langLabel[targetLang]}</>
              }
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
          <button
            onClick={handleToggleDirection}
            disabled={isActive}
            title={isActive ? '통역 중에는 방향 변경 불가' : '통역 방향 전환'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: isActive ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.15)',
              color: isActive ? '#4b5563' : '#a78bfa',
              cursor: isActive ? 'not-allowed' : 'pointer',
            }}
          >
            <ArrowRightLeft className="w-4 h-4" />
            {direction === 'to-ko' ? '외국어→한국어' : '한국어→외국어'}
          </button>
          <button onClick={() => document.documentElement.requestFullscreen?.()}>
            <Maximize2 className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </header>

      {/* to-foreign 설정 바: 언어 선택 + TTS 토글 */}
      {direction === 'to-foreign' && (
        <div className="flex items-center gap-4 px-6 py-3 bg-gray-900 border-b border-gray-800">
          <span className="text-xs text-gray-500 shrink-0">번역 언어</span>
          <div className="flex gap-2">
            {(['en', 'zh', 'vi'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => { if (!isActive) setTargetLang(lang) }}
                disabled={isActive}
                className="text-sm px-4 py-1.5 rounded-lg font-medium transition-all"
                style={{
                  background: targetLang === lang ? 'linear-gradient(135deg,#a78bfa,#8b5cf6)' : 'rgba(255,255,255,0.05)',
                  color: targetLang === lang ? '#fff' : '#6b7280',
                  boxShadow: targetLang === lang ? '0 4px 12px rgba(139,92,246,0.35)' : 'none',
                  cursor: isActive ? 'not-allowed' : 'pointer',
                  opacity: isActive && targetLang !== lang ? 0.4 : 1,
                }}
              >
                {langLabel[lang]}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setTtsEnabled(e => !e)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors shrink-0"
              style={{
                background: ttsEnabled ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                color: ttsEnabled ? '#a78bfa' : '#6b7280',
              }}
            >
              {ttsEnabled
                ? isSpeaking
                  ? <><span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" /><span>출력 중</span></>
                  : <><Volume2 className="w-3.5 h-3.5" /><span>켜짐</span></>
                : <><VolumeX className="w-3.5 h-3.5" /><span>꺼짐</span></>
              }
            </button>
            {ttsEnabled && (
              <div className="flex items-center gap-2">
                <VolumeX className="w-3 h-3 text-gray-600" />
                <input
                  type="range"
                  min={0.5}
                  max={4.0}
                  step={0.1}
                  value={ttsVolume}
                  onChange={(e) => setTtsVolume(Number(e.target.value))}
                  className="w-24 accent-purple-500"
                  title={`볼륨 ${Math.round(ttsVolume * 100)}%`}
                />
                <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 w-9 text-right">{Math.round(ttsVolume * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 원문 */}
        <div ref={leftPanelRef} className="flex-1 overflow-y-auto p-4 border-r border-gray-800">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 sticky top-0 bg-gray-950 py-1">
            원문
          </h2>
          {originItems.length === 0 && !isActive && (
            <p className="text-gray-600 text-sm">통역 시작 버튼을 눌러 시작하세요.</p>
          )}
          {originItems.map((item) => (
            <div key={item.id} className="mb-4 p-3 rounded-lg bg-gray-900">
              <div className="text-xs text-gray-500 mb-1">
                {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
              </div>
              <p className="text-white leading-relaxed">{item.original}</p>
            </div>
          ))}
        </div>

        {/* 오른쪽: 번역 */}
        <div ref={rightPanelRef} className="flex-1 overflow-y-auto p-4">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 sticky top-0 bg-gray-950 py-1">
            {direction === 'to-ko' ? '🇰🇷 한국어 번역' : `${langLabel[targetLang]} 번역`}
          </h2>
          {items.map((item) => {
            const isPlaying = playingId === item.id
            const lang = direction === 'to-ko' ? 'ko' : targetLang
            const borderColor = direction === 'to-ko' ? 'border-blue-800' : 'border-purple-900'
            const bgColor = direction === 'to-ko' ? 'bg-blue-950' : 'bg-gray-900'
            const timeColor = direction === 'to-ko' ? 'text-blue-400' : 'text-purple-400'
            const textColor = direction === 'to-ko' ? 'text-blue-50' : 'text-white'
            return (
              <div key={item.id} className={`mb-4 p-3 rounded-lg ${bgColor} border ${borderColor}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${timeColor}`}>
                    {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
                  </span>
                  <button
                    onClick={() => isPlaying ? stopTts() : playTts(item.translated, lang, item.id)}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: isPlaying ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.07)',
                      color: isPlaying ? '#f87171' : '#6b7280',
                    }}
                    title={isPlaying ? '중지' : '다시 듣기'}
                  >
                    {isPlaying
                      ? <><Square className="w-3 h-3" /><span>중지</span></>
                      : <><Play className="w-3 h-3" /><span>재생</span></>
                    }
                  </button>
                </div>
                <p className={`${textColor} text-lg leading-relaxed`}>{item.translated}</p>
              </div>
            )
          })}
          {items.length === 0 && !isActive && direction === 'to-foreign' && (
            <p className="text-gray-600 text-sm">통역 시작 버튼을 눌러 시작하세요.</p>
          )}
        </div>
      </div>

      {interpretError && (
        <div className="flex items-center justify-center px-6 py-2 bg-red-950 border-t border-red-800">
          <span className="text-red-400 text-sm">⚠️ {interpretError}</span>
        </div>
      )}

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
            중지
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
