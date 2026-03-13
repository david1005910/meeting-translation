import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mic } from 'lucide-react'
import { authApi } from '../services/api'
import { useAuthStore } from '../stores/authStore'

export default function Login() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      setAuth(data.user, data.token, data.refreshToken)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'linear-gradient(180deg, #1A1E24 0%, #1E2228 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderTop: '1px solid rgba(0,0,0,0.4)',
    borderRadius: '6px',
    padding: '9px 12px',
    color: '#F0F0F0',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'transparent' }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{
          background: 'linear-gradient(180deg, #353A44 0%, #2B3038 60%, #252930 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderTop: '1px solid rgba(255,255,255,0.2)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <Mic className="w-6 h-6" style={{ color: '#4FC3F7' }} />
          <span
            className="text-xl font-bold tracking-tight"
            style={{ color: '#F0F0F0', letterSpacing: '-0.02em' }}
          >
            MultiMeet
          </span>
        </div>

        <h1
          className="text-xl font-bold text-center mb-6"
          style={{ color: '#F0F0F0' }}
        >
          로그인
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#A8B0BA' }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#A8B0BA' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm" style={{ color: '#FC8181' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: loading
                ? 'linear-gradient(180deg, #2C4F6A 0%, #2C4F6A 100%)'
                : 'linear-gradient(180deg, #3C6E96 0%, #355E82 50%, #2C4F6A 100%)',
              color: '#F0F0F0',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              borderTop: '1px solid rgba(255,255,255,0.25)',
              borderBottom: '1px solid rgba(0,0,0,0.3)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.3)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#A8B0BA' }}>
          계정이 없으신가요?{' '}
          <Link to="/register" style={{ color: '#4FC3F7' }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
