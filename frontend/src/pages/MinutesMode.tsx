import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import { useMeeting } from '../hooks/useMeetings'
import { audioApi, meetingsApi } from '../services/api'
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
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      // Read the latest token from the store (may have been refreshed during upload)
      const currentToken = useAuthStore.getState().token
      const socket = io(apiUrl, { auth: { token: currentToken }, reconnection: false })
      socketRef.current = socket

      socket.on('connect_error', (err) => {
        reject(new Error(`소켓 연결 실패: ${err.message}`))
      })

      socket.emit('join-session', meetingId)

      // 진행률 애니메이션
      const progressTimer = setInterval(() => {
        setProgress((p) => Math.min(p + 3, 85))
      }, 1500)

      socket.on('transcribe:complete', () => {
        clearInterval(progressTimer)
        setProgress(100)
        socket.disconnect()
        resolve()
      })

      socket.on('transcribe:error', (data: { error: string }) => {
        clearInterval(progressTimer)
        socket.disconnect()
        reject(new Error(data.error || 'STT 처리 실패'))
      })

      // 타임아웃 5분
      const timeout = setTimeout(() => {
        clearInterval(progressTimer)
        socket.disconnect()
        // 타임아웃 시 DB에서 직접 확인
        meetingsApi.get(meetingId!).then((res) => {
          if (res.data.transcript) resolve()
          else reject(new Error('STT 처리 시간이 초과되었습니다.'))
        }).catch(() => reject(new Error('STT 처리 시간이 초과되었습니다.')))
      }, 5 * 60 * 1000)

      socket.on('disconnect', () => clearTimeout(timeout))
    })
  }

  const generateMinutes = async (): Promise<void> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">회의록 모드</h1>
      {meeting && <p className="text-gray-500 mb-6">{meeting.title}</p>}

      {step !== 'input' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-700 font-semibold mb-1">{statusMsg}</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">{progress}%</p>
          {step === 'transcribing' && (
            <p className="text-gray-400 text-xs mt-3">
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  inputMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
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
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
