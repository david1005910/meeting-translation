import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Mic } from 'lucide-react'
import LanguageSelector from '../components/meeting/LanguageSelector'
import { useCreateMeeting } from '../hooks/useMeetings'

export default function NewMeeting() {
  const navigate = useNavigate()
  const createMutation = useCreateMeeting()

  const [form, setForm] = useState({
    title: '',
    company: '',
    language: 'en',
    mode: 'minutes',
    participants: [''],
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('회의명을 입력해주세요.')
      return
    }
    try {
      const participants = form.participants.filter((p) => p.trim())
      const meeting = await createMutation.mutateAsync({ ...form, participants })
      if (form.mode === 'minutes') {
        navigate(`/meetings/${meeting.id}/minutes`)
      } else {
        navigate(`/meetings/${meeting.id}/interpret`)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '회의 생성에 실패했습니다.')
    }
  }

  const updateParticipant = (i: number, value: string) => {
    const list = [...form.participants]
    list[i] = value
    setForm((f) => ({ ...f, participants: list }))
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">새 회의 시작</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">회의명 *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: ABC사 영업 미팅"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">상대방 회사명</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: ABC Corporation"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">회의 언어</label>
          <LanguageSelector
            value={form.language}
            onChange={(lang) => setForm((f) => ({ ...f, language: lang }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">모드 선택</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { mode: 'minutes', icon: FileText, title: '회의록 모드', desc: '녹음 후 AI로 회의록 생성' },
              { mode: 'interpret', icon: Mic, title: '실시간 통역 모드', desc: '즉시 한국어로 번역' },
            ].map(({ mode, icon: Icon, title, desc }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setForm((f) => ({ ...f, mode }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.mode === mode
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${form.mode === mode ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className={`font-semibold text-sm ${form.mode === mode ? 'text-blue-700' : 'text-gray-700'}`}>{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">참석자</label>
          {form.participants.map((p, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                value={p}
                onChange={(e) => updateParticipant(i, e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`참석자 ${i + 1}`}
              />
              {i === form.participants.length - 1 && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, participants: [...f.participants, ''] }))}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600"
                >
                  + 추가
                </button>
              )}
            </div>
          ))}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-3 rounded-xl font-medium transition-colors"
        >
          {createMutation.isPending ? '생성 중...' : '회의 시작하기'}
        </button>
      </form>
    </div>
  )
}
