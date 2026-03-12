import { Download } from 'lucide-react'
import { audioApi } from '../../services/api'

interface Props {
  meetingId: string
  content: string
}

export default function DownloadButton({ meetingId, content }: Props) {
  const download = async (format: 'docx' | 'md') => {
    try {
      const res = await audioApi.downloadMinutes(meetingId, format)
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `minutes-${meetingId}.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('다운로드 실패:', err)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    alert('클립보드에 복사되었습니다.')
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => download('docx')}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        <Download className="w-4 h-4" />
        DOCX
      </button>
      <button
        onClick={() => download('md')}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
      >
        <Download className="w-4 h-4" />
        Markdown
      </button>
      <button
        onClick={copyToClipboard}
        className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm transition-colors"
      >
        클립보드 복사
      </button>
    </div>
  )
}
