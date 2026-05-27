import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Scans from './pages/Scans'
import ScanDetail from './pages/ScanDetail'
import Fixes from './pages/Fixes'
import FixDetail from './pages/FixDetail'
import Vulnerabilities from './pages/Vulnerabilities'
import CheckItems from './pages/CheckItems'

// 로그인 비활성화 (임시) — 인증 게이트 없이 바로 진입
// 다시 켜려면 user 체크 후 <Login /> 반환하도록 복구 (Login.tsx 보존됨)
function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/scans/:id" element={<ScanDetail />} />
        <Route path="/fixes" element={<Fixes />} />
        <Route path="/fixes/:id" element={<FixDetail />} />
        <Route path="/vulnerabilities" element={<Vulnerabilities />} />
        <Route path="/items" element={<CheckItems />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
