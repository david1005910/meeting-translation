import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Mic, MicOff, Maximize2, ArrowLeft, Save, Volume2, VolumeX, ArrowRightLeft } from 'lucide-react'
import { useRealtimeInterpret } from '../hooks/useRealtimeInterpret'
import { useMeeting } from '../hooks/useMeetings'
import { audioApi } from '../services/api'
import { TranslationItem } from '../types'

const langLabel: Record<string, string> = {
  en: '🇺🇸 English',
  zh: '🇨🇳 中文',
  vi: '🇻🇳 Tiếng Việt',
}

const ttsLang: Record<string, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  vi: 'vi-VN',
}

type Direction = 'to-ko' | 'to-foreign'

export default function InterpretMode() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { data: meeting } = useMeeting(meetingId!)

  const [direction, setDirection] = useState<Direction>('to-ko')
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [ttsTargetLang, setTtsTargetLang] = useState<string>('zh')
  const [saving, setSaving] = useState(false)

  const sourceLanguage = direction === 'to-ko' ? (meeting?.language || 'en') : 'ko'

  const { isActive, items, start, stop } = useRealtimeInterpret(meetingId!, sourceLanguage)

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const lastSpokenId = useRef<string>('')

  // TTS: speak new translations in to-foreign mode
  const speak = useCallback((text: string, lang: string) => {
    if (!ttsEnabled || direction !== 'to-foreign') return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = ttsLang[lang] || 'en-US'
    window.speechSynthesis.speak(utterance)
  }, [ttsEnabled, direction])

  useEffect(() => {
    if (leftPanelRef.current) {
      leftPanelRef.current.scrollTop = leftPanelRef.current.scrollHeight
    }
    if (rightPanelRef.current) {
      rightPanelRef.current.scrollTop = rightPanelRef.current.scrollHeight
    }

    // Speak the latest translation for the selected target language
    if (direction === 'to-foreign' && items.length > 0) {
      const last = items[items.length - 1]
      if (last.id !== lastSpokenId.current && last.targetLanguage === ttsTargetLang) {
        lastSpokenId.current = last.id
        speak(last.translated, ttsTargetLang)
      }
    }
  }, [items, direction, ttsTargetLang, speak])

  const handleEnd = async () => {
    stop()
    window.speechSynthesis.cancel()
    if (items.length > 0) {
      setSaving(true)
      try {
        await audioApi.saveInterpretLogs(meetingId!, items.map(item => ({
          timestamp: item.timestamp,
          original: item.original,
          translated: item.translated,
          targetLanguage: item.targetLanguage,
        })))
      } finally {
        setSaving(false)
      }
    }
    navigate('/')
  }

  const handleToggleDirection = () => {
    if (!isActive) setDirection(d => d === 'to-ko' ? 'to-foreign' : 'to-ko')
  }

  // In to-foreign mode, group items by targetLanguage
  const foreignItems = direction === 'to-foreign'
    ? (['en', 'zh', 'vi'] as const).map(lang => ({
        lang,
        items: items.filter(i => i.targetLanguage === lang),
      }))
    : []

  // Original items for left panel (unique by timestamp+original)
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
                : <>🇰🇷 한국어 → {langLabel.en} / {langLabel.zh} / {langLabel.vi}</>
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
          {/* Direction toggle */}
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

      {/* TTS controls (to-foreign mode only) */}
      {direction === 'to-foreign' && (
        <div className="flex items-center gap-4 px-6 py-2 bg-gray-900 border-b border-gray-800">
          <span className="text-xs text-gray-500">음성 출력</span>
          <button
            onClick={() => setTtsEnabled(e => !e)}
            className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-colors"
            style={{
              background: ttsEnabled ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: ttsEnabled ? '#a78bfa' : '#6b7280',
            }}
          >
            {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {ttsEnabled ? '켜짐' : '꺼짐'}
          </button>
          {ttsEnabled && (
            <div className="flex gap-1">
              {(['en', 'zh', 'vi'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setTtsTargetLang(lang)}
                  className="text-xs px-3 py-1 rounded-lg font-medium transition-colors"
                  style={{
                    background: ttsTargetLang === lang ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                    color: ttsTargetLang === lang ? '#c4b5fd' : '#6b7280',
                    border: ttsTargetLang === lang ? '1px solid rgba(139,92,246,0.5)' : '1px solid transparent',
                  }}
                >
                  {langLabel[lang]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: original */}
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

        {/* Right panel */}
        {direction === 'to-ko' ? (
          <div ref={rightPanelRef} className="flex-1 overflow-y-auto p-4">
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
        ) : (
          <div ref={rightPanelRef} className="flex-1 overflow-y-auto p-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 sticky top-0 bg-gray-950 py-1">
              번역 결과
            </h2>
            {foreignItems.map(({ lang, items: langItems }) => (
              <div key={lang} className="mb-6">
                <div
                  className="text-xs font-semibold mb-2 px-2 py-1 rounded inline-flex items-center gap-1"
                  style={{
                    background: ttsTargetLang === lang && ttsEnabled ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                    color: ttsTargetLang === lang && ttsEnabled ? '#a78bfa' : '#6b7280',
                  }}
                >
                  {langLabel[lang]}
                  {ttsEnabled && ttsTargetLang === lang && <Volume2 className="w-3 h-3 ml-1" />}
                </div>
                {langItems.length === 0 && (
                  <p className="text-gray-700 text-xs ml-2">대기 중...</p>
                )}
                {langItems.map((item) => (
                  <div key={item.id} className="mb-3 p-3 rounded-lg bg-gray-900 border border-gray-800">
                    <div className="text-xs text-gray-600 mb-1">
                      {new Date(item.timestamp).toLocaleTimeString('ko-KR')}
                    </div>
                    <p className="text-white leading-relaxed">{item.translated}</p>
                  </div>
                ))}
              </div>
            ))}
            {items.length === 0 && !isActive && (
              <p className="text-gray-600 text-sm">통역 시작 버튼을 눌러 시작하세요.</p>
            )}
          </div>
        )}
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
