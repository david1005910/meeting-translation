import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Edit3, Eye } from 'lucide-react'
import { audioApi } from '../../services/api'

interface Props {
  meetingId: string
  content: string
  onUpdate: (content: string) => void
}

export default function MinutesEditor({ meetingId, content, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [localContent, setLocalContent] = useState(content)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalContent(content)
  }, [content])

  const save = useCallback(async (text: string) => {
    setSaving(true)
    try {
      await audioApi.updateMinutes(meetingId, text)
      onUpdate(text)
    } finally {
      setSaving(false)
    }
  }, [meetingId, onUpdate])

  useEffect(() => {
    if (!isEditing) return
    const timer = setTimeout(() => save(localContent), 3000)
    return () => clearTimeout(timer)
  }, [localContent, isEditing, save])

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-700">회의록</h2>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-gray-400">저장 중...</span>}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              isEditing ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
            {isEditing ? '미리보기' : '편집'}
          </button>
        </div>
      </div>
      <div className="p-5">
        {isEditing ? (
          <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            className="w-full h-[60vh] font-mono text-sm border border-gray-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{localContent}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
