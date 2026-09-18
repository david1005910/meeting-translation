import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { useMeeting } from '../hooks/useMeetings'
import { audioApi, meetingsApi } from '../services/api'
import { API_BASE_URL } from '../services/apiBase'
import { useAuthStore } from '../stores/authStore'
import AudioRecorder from '../components/audio/AudioRecorder'
import AudioUploader from '../components/audio/AudioUploader'

type Step = 'input' | 'uploading' | 'transcribing' | 'generating' | 'done'

export default function MinutesMode() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { data: meeting } = useMeeting(meetingId!)


  const [step, setStep] = useState<Step>('input')
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState('')
  const [inputMode, setInputMode] = useState<'record' | 'upload'>('record')
  const [error, setError] = useState('')
  const socketRef = useRef<Socket | null>(null)

  // WebSocket으로 STT 진행상황 수신
  const waitForTranscript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const apiUrl = API_BASE_URL
      // Read the latest token from the store (may have been refreshed during upload)
      const currentToken = useAuthStore.getState().token
      const socket = io(apiUrl, { auth: { token: currentToken }, reconnection: false })
      socketRef.current = socket

      let settled = false

      // 진행률 애니메이션 (서버의 실제 진행률 이벤트가 올 때까지 유지)
      const progressTimer = setInterval(() => {
        setProgress((p) => Math.min(p + 3, 82))
      }, 1500)

      // 리젝/리졸브를 한 번만 실행하도록 가드 (전체 리소스 정리 포함)
      const settle = (fn: () => void) => {
        if (settled) return
        settled = true
        clearInterval(progressTimer)
        clearTimeout(timeout)
        socket.disconnect()
        fn()
      }

      // 타임아웃 — 최대 3시간 회의(수 시간 녹음) 대비 180분. 완료 후에도 DB에서 직접 확인
      const timeout = setTimeout(() => {
        settle(() => {
          meetingsApi.get(meetingId!).then((res) => {
            if (res.data.transcript) resolve()
            else reject(new Error('STT 처리 시간이 초과되었습니다.'))
          }).catch(() => reject(new Error('STT 처리 시간이 초과되었습니다.')))
        })
      }, 180 * 60 * 1000)

      socket.on('connect_error', (err) => {
        settle(() => reject(new Error(`소켓 연결 실패: ${err.message}`)))
      })

      socket.emit('join-session', meetingId)

      // 서버가 보내는 실제 진행률 반영 (10 → 80 단계)
      socket.on('transcribe:progress', (data: { progress: number }) => {
        setProgress((p) => Math.max(p, Math.min(Math.round(data.progress), 85)))
      })

      socket.on('transcribe:complete', () => {
        settle(() => {
          setProgress(100)
          resolve()
        })
      })

      socket.on('transcribe:error', (data: { error: string }) => {
        settle(() => reject(new Error(data.error || 'STT 처리 실패')))
      })

      // 연결이 끊기면 DB에서 최종 상태를 직접 확인 (무한 대기 방지)
      socket.on('disconnect', () => {
        settle(() => {
          meetingsApi.get(meetingId!).then((res) => {
            if (res.data.transcript) resolve()
            else reject(new Error('STT 서버 연결이 끊어졌습니다. 다시 시도해주세요.'))
          }).catch(() => reject(new Error('STT 서버 연결이 끊어졌습니다. 다시 시도해주세요.')))
        })
      })
    })
  }

  const generateMinutes = async (): Promise<void> => {
    const apiUrl = API_BASE_URL
    const response = await fetch(`${apiUrl}/api/meetings/${meetingId}/minutes/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error || '회의록 생성에 실패했습니다.')
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      const text = decoder.decode(value)
      for (const line of text.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const json = JSON.parse(line.slice(6))
            if (json.done) return
          } catch { /* partial chunk */ }
        }
      }
      setProgress((p) => Math.min(p + 2, 95))
    }
  }

  const processFile = async (file: File | Blob) => {
    if (!meetingId) return
    setError('')

    try {
      // 1. 업로드
      setStep('uploading')
      setProgress(0)
      setStatusMsg('파일 업로드 중...')
      const fileToUpload = file instanceof File
        ? file
        : new File([file], 'recording.webm', { type: 'audio/webm' })
      try {
        await audioApi.upload(meetingId, fileToUpload, setProgress)
      } catch (err: any) {
        throw new Error(`[업로드 실패] ${err.message}`)
      }

      // 2. STT (WebSocket으로 완료 수신)
      setStep('transcribing')
      setProgress(0)
      setStatusMsg('음성을 텍스트로 변환 중... (Whisper AI)')
      try {
        await audioApi.transcribe(meetingId)
        await waitForTranscript()
      } catch (err: any) {
        throw new Error(`[STT 실패] ${err.message}`)
      }

      // 3. 회의록 생성 (SSE 스트림)
      setStep('generating')
      setProgress(0)
      setStatusMsg('AI가 한국어 회의록을 작성 중...')
      try {
        await generateMinutes()
      } catch (err: any) {
        throw new Error(`[회의록 생성 실패] ${err.message}`)
      }

      setStep('done')
      navigate(`/meetings/${meetingId}/minutes/view`)
    } catch (err: any) {
      setError(err.message || '처리 중 오류가 발생했습니다.')
      setStep('input')
      socketRef.current?.disconnect()
    }
  }

  // 페이지 벗어날 때 소켓 정리
  useEffect(() => {
    return () => { socketRef.current?.disconnect() }
  }, [])

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#ffffff' }}>회의록 모드</h1>
      {meeting && <p className="mb-6" style={{ color: 'rgba(255,255,255,0.6)' }}>{meeting.title}</p>}

      {step !== 'input' ? (
        <div
          className="p-8 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.20), inset 0 0 12px rgba(255,255,255,0.06)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full animate-spin mx-auto mb-4"
            style={{
              border: '4px solid rgba(255,255,255,0.2)',
              borderTopColor: '#ffffff',
            }}
          />
          <p className="font-semibold mb-1" style={{ color: '#ffffff' }}>{statusMsg}</p>
          <div
            className="w-full rounded-full h-2 mt-4"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #a78bfa, #6366f1)',
              }}
            />
          </div>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{progress}%</p>
          {step === 'transcribing' && (
            <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
              음성 길이에 따라 수 분이 소요될 수 있습니다
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-3">
            {(['record', 'upload'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setInputMode(mode)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: inputMode === mode ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                  color: inputMode === mode ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  border: inputMode === mode ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              >
                {mode === 'record' ? '🎙️ 직접 녹음' : '📁 파일 업로드'}
              </button>
            ))}
          </div>

          {inputMode === 'record' ? (
            <AudioRecorder onRecordingComplete={processFile} />
          ) : (
            <AudioUploader onFileSelected={processFile} />
          )}

          {error && (
            <div
              className="p-3 text-sm rounded-lg"
              style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
