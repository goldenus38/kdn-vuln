import { useState } from 'react'
import { useAuth, isSupabaseMode, LOCAL_ADMIN } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  // 테스트 사이트: 로컬 모드에서는 기본 계정을 미리 채워 로그인 버튼만 누르면 진입
  const [email, setEmail] = useState(isSupabaseMode() ? '' : LOCAL_ADMIN.email)
  const [password, setPassword] = useState(isSupabaseMode() ? '' : LOCAL_ADMIN.password)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--hero-bg)', padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 36 }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{ fontSize: 34, color: 'var(--primary-light)', marginBottom: 10 }}>
            <i className="fa-solid fa-shield-halved" />
          </div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>KDN-VULN</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            취약점 진단 관리 시스템
          </p>
        </div>
        <form onSubmit={submit} className="form-grid">
          <div className="field">
            <label>이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kdn-vuln.local" autoComplete="username" required />
          </div>
          <div className="field">
            <label>비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password" required />
          </div>
          {error && <div style={{ color: 'var(--status-vuln)', fontSize: 13 }}><i className="fa-solid fa-triangle-exclamation" /> {error}</div>}
          <button className="btn btn-primary" disabled={busy} style={{ width: '100%', padding: 12 }}>
            {busy ? '로그인 중…' : '로그인'}
          </button>
        </form>
        {!isSupabaseMode() && (
          <p style={{ fontSize: 12, color: 'var(--text-light)', textAlign: 'center', marginTop: 18, lineHeight: 1.6 }}>
            로컬 미리보기 모드 기본 계정<br />
            <code>{LOCAL_ADMIN.email}</code> / <code>{LOCAL_ADMIN.password}</code>
          </p>
        )}
      </div>
    </div>
  )
}
