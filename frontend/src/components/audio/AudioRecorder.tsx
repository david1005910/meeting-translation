import { Mic, Pause, Play, Square } from 'lucide-react'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'

function formatDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

interface Props {
  onRecordingComplete: (blob: Blob) => void
}

export default function AudioRecorder({ onRecordingComplete }: Props) {
  const { isRecording, isPaused, duration, audioLevel, start, pause, resume, stop } = useAudioRecorder()

  const handleStop = async () => {
    const blob = await stop()
    if (blob) onRecordingComplete(blob)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed border-gray-300 rounded-xl">
      {!isRecording ? (
        <button
          onClick={start}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
        >
          <Mic className="w-5 h-5" />
          녹음 시작
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-lg font-mono font-bold text-gray-800">
              {formatDuration(duration)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(audioLevel, 100)}%` }}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={isPaused ? resume : pause}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? '재개' : '일시정지'}
            </button>
            <button
              onClick={handleStop}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              <Square className="w-4 h-4" />
              녹음 완료
            </button>
          </div>
        </>
      )}
    </div>
  )
}
