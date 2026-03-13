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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'linear-gradient(135deg, #fafbfc 0%, #f1f5f9 100%)',
    border: '1px solid rgba(149,157,165,0.2)',
    borderRadius: '12px',
    padding: '10px 14px',
    color: '#4a5568',
    fontSize: '14px',
    outline: 'none',
    boxShadow: '0px 4px 12px rgba(149, 157, 165, 0.1)',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #f0f4f8 0%, #e8eef5 100%)' }}
    >
      <div
        className="w-full max-w-sm p-8"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderRadius: '24px',
          boxShadow: '0px 8px 24px rgba(149, 157, 165, 0.15)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-6">
          <Mic className="w-6 h-6" style={{ color: '#8b5cf6' }} />
          <span className="text-xl font-semibold" style={{ color: '#4a5568' }}>
            MultiMeet
          </span>
        </div>

        <h1 className="text-xl font-medium text-center mb-6" style={{ color: '#4a5568' }}>
          로그인
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#a0aec0' }}>
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
            <label className="block text-sm font-medium mb-1" style={{ color: '#a0aec0' }}>
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
          {error && <p className="text-sm" style={{ color: '#f56565' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0px 6px 20px rgba(139, 92, 246, 0.25)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: '#a0aec0' }}>
          계정이 없으신가요?{' '}
          <Link to="/register" style={{ color: '#8b5cf6' }}>회원가입</Link>
        </p>
      </div>
    </div>
  )
}
