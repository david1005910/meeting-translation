import { useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'
import { TranslationItem } from '../types'

const CHUNK_INTERVAL_MS = 3000
// RMS 0~1 범위에서 이 값 이상이면 유효한 발화로 판단
const AUDIO_RMS_THRESHOLD = 0.015

function sendBlob(socket: Socket, blob: Blob, meetingId: string, language: string, targetLanguage?: string) {
  if (blob.size < 500) return
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = (reader.result as string).split(',')[1]
    socket.emit('audio-chunk', {
      meetingId,
      language,
      audioBase64: base64,
      timestamp: Date.now(),
      ...(targetLanguage && { targetLanguage }),
    })
  }
  reader.readAsDataURL(blob)
}

export function useRealtimeInterpret(meetingId: string, language: string, targetLanguage?: string) {
  const [isActive, setIsActive] = useState(false)
  const [items, setItems] = useState<TranslationItem[]>([])
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // 현재 5초 윈도우에 유효한 발화가 있었는지
  const windowHasAudioRef = useRef(false)
  // onstop 시점에 실제 전송 여부를 전달하는 ref
  const shouldSendRef = useRef(true)

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
      if (!shouldSendRef.current) return // 무음 윈도우 → 전송 건너뜀
      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
      sendBlob(socket, blob, meetingId, language, targetLanguage)
    }

    recorder.start()
    return recorder
  }, [meetingId, language, targetLanguage])

  const start = useCallback(async () => {
    setError(null)
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
    const token = useAuthStore.getState().token
    const socket = io(apiUrl, { auth: { token } })
    socketRef.current = socket

    socket.emit('join-session', meetingId)

    socket.on('translation-result', (data: Omit<TranslationItem, 'id'>) => {
      setItems((prev) => [...prev, { ...data, id: `${Date.now()}-${Math.random()}` }])
    })

    socket.on('translation-error', (data: { message: string }) => {
      setError(data.message)
      setTimeout(() => setError(null), 3000)
    })

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.current = stream

    // AnalyserNode로 실시간 음량 모니터링
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    audioCtxRef.current = audioCtx
    analyserRef.current = analyser
    windowHasAudioRef.current = false

    // 100ms마다 RMS 측정 → 유효 발화 감지
    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    audioPollRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(dataArray)
      const rms = Math.sqrt(
        dataArray.reduce((s, v) => s + Math.pow((v - 128) / 128, 2), 0) / dataArray.length
      )
      if (rms > AUDIO_RMS_THRESHOLD) windowHasAudioRef.current = true
    }, 100)

    startChunkRecorder(stream, socket)

    intervalRef.current = setInterval(() => {
      // 이번 윈도우 전송 여부 확정 후 플래그 리셋
      shouldSendRef.current = windowHasAudioRef.current
      windowHasAudioRef.current = false

      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }
      setTimeout(() => {
        if (streamRef.current && socketRef.current) {
          startChunkRecorder(streamRef.current, socketRef.current)
        }
      }, 100)
    }, CHUNK_INTERVAL_MS)

    setIsActive(true)
  }, [meetingId, startChunkRecorder])

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (audioPollRef.current) { clearInterval(audioPollRef.current); audioPollRef.current = null }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    analyserRef.current = null
    socketRef.current?.emit('leave-session', meetingId)
    socketRef.current?.disconnect()
    setIsActive(false)
  }, [meetingId])

  const clearItems = useCallback(() => setItems([]), [])

  return { isActive, items, error, start, stop, clearItems }
}
