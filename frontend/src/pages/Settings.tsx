import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../services/api'

export default function Settings() {
  const qc = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data: object) => settingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const [form, setForm] = useState({
    defaultLanguage: settings?.defaultLanguage || 'en',
    autoDeleteAudio: settings?.autoDeleteAudio || false,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">설정</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">기본 회의 언어</label>
          <select
            value={form.defaultLanguage}
            onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">🇺🇸 영어</option>
            <option value="zh">🇨🇳 중국어</option>
            <option value="vi">🇻🇳 베트남어</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">오디오 파일 자동 삭제</p>
            <p className="text-xs text-gray-400">회의록 생성 후 오디오 파일 자동 삭제</p>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, autoDeleteAudio: !f.autoDeleteAudio }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              form.autoDeleteAudio ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.autoDeleteAudio ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium transition-colors"
          >
            {mutation.isPending ? '저장 중...' : saved ? '✓ 저장됨' : '설정 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
