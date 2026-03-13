import { useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'
import { TranslationItem } from '../types'

const CHUNK_INTERVAL_MS = 5000 // 5초마다 완전한 WebM 파일로 전송

function sendBlob(socket: Socket, blob: Blob, meetingId: string, language: string) {
  if (blob.size < 1000) return // 너무 작은 청크 무시
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1]
    socket.emit('audio-chunk', {
      meetingId,
      language,
      audioBase64: base64,
      timestamp: Date.now(),
    })
  }
  reader.readAsDataURL(blob)
}

export function useRealtimeInterpret(meetingId: string, language: string) {
  const [isActive, setIsActive] = useState(false)
  const [items, setItems] = useState<TranslationItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  // 새 MediaRecorder를 시작하고 CHUNK_INTERVAL_MS 후 완성된 파일을 전송
  const startChunkRecorder = useCallback((stream: MediaStream, socket: Socket) => {
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const chunks: Blob[] = []
    recorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
      sendBlob(socket, blob, meetingId, language)
    }

    recorder.start()
    return recorder
  }, [meetingId, language])

  const start = useCallback(async () => {
    setError(null)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    // 항상 최신 토큰 사용 (토큰 갱신 후 stale closure 방지)
    const token = useAuthStore.getState().token
    const socket = io(apiUrl, { auth: { token } })
    socketRef.current = socket

    socket.emit('join-session', meetingId)

    socket.on('translation-result', (data: Omit<TranslationItem, 'id'>) => {
      setItems((prev) => [...prev, { ...data, id: `${Date.now()}-${Math.random()}` }])
    })

    socket.on('translation-error', (data: { message: string }) => {
      setError(data.message)
      // 3초 후 자동 소거
      setTimeout(() => setError(null), 3000)
    })

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    // 첫 번째 청크 레코더 시작
    startChunkRecorder(stream, socket)

    // CHUNK_INTERVAL_MS마다 레코더를 재시작해 완전한 WebM 파일 생성
    intervalRef.current = setInterval(() => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop() // onstop에서 전송됨
      }
      // 잠깐 후 새 레코더 시작
      setTimeout(() => {
        if (streamRef.current && socketRef.current) {
          startChunkRecorder(streamRef.current, socketRef.current)
        }
      }, 100)
    }, CHUNK_INTERVAL_MS)

    setIsActive(true)
  }, [meetingId, startChunkRecorder])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    socketRef.current?.emit('leave-session', meetingId)
    socketRef.current?.disconnect()
    setIsActive(false)
  }, [meetingId])

  return { isActive, items, error, start, stop }
}
