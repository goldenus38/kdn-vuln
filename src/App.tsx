import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Spinner } from './components/ui'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import Scans from './pages/Scans'
import ScanDetail from './pages/ScanDetail'
import Vulnerabilities from './pages/Vulnerabilities'
import CheckItems from './pages/CheckItems'

function Protected() {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Spinner /></div>
  if (!user) return <Login />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/scans/:id" element={<ScanDetail />} />
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
            <Protected />
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
