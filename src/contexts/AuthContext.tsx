import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseMode } from '../lib/supabase'

interface User { email: string }
interface AuthCtx {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, loading: true, login: async () => {}, logout: async () => {},
})

const LS_SESSION = 'kdnvuln_session'
// 로컬 폴백 모드 기본 관리자 계정 (Supabase 연결 전 임시)
const LOCAL_ADMIN = { email: 'admin@kdn-vuln.local', password: 'admin1234' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function init() {
      if (supabase) {
        const { data } = await supabase.auth.getSession()
        if (active) setUser(data.session?.user ? { email: data.session.user.email ?? '' } : null)
        supabase.auth.onAuthStateChange((_e, session) => {
          setUser(session?.user ? { email: session.user.email ?? '' } : null)
        })
      } else {
        const saved = localStorage.getItem(LS_SESSION)
        if (active) setUser(saved ? { email: saved } : null)
      }
      if (active) setLoading(false)
    }
    init()
    return () => { active = false }
  }, [])

  async function login(email: string, password: string) {
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
    } else {
      if (email !== LOCAL_ADMIN.email || password !== LOCAL_ADMIN.password) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.')
      }
      localStorage.setItem(LS_SESSION, email)
      setUser({ email })
    }
  }

  async function logout() {
    if (supabase) await supabase.auth.signOut()
    else { localStorage.removeItem(LS_SESSION); setUser(null) }
  }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx)
// eslint-disable-next-line react-refresh/only-export-components
export { isSupabaseMode, LOCAL_ADMIN }
