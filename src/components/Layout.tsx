import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTheme, PALETTES } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../lib/db'

const NAV = [
  { to: '/', icon: 'fa-gauge-high', label: '대시보드', end: true },
  { to: '/assets', icon: 'fa-server', label: '자산 관리' },
  { to: '/scans', icon: 'fa-file-csv', label: '점검 결과' },
  { to: '/fixes', icon: 'fa-screwdriver-wrench', label: '조치 이력' },
  { to: '/vulnerabilities', icon: 'fa-shield-halved', label: '취약점 현황' },
  { to: '/items', icon: 'fa-list-check', label: '점검 항목 (U-01~67)' },
]

const BOARD = [
  { to: '/notices', icon: 'fa-bullhorn', label: '공지사항' },
  { to: '/threats', icon: 'fa-shield-virus', label: '보안 동향·CVE' },
  { to: '/resources', icon: 'fa-folder-open', label: '자료실' },
]

const TITLES: Record<string, string> = {
  '/': '대시보드',
  '/assets': '자산 관리',
  '/scans': '점검 결과',
  '/fixes': '조치 이력',
  '/vulnerabilities': '취약점 현황',
  '/items': '점검 항목 기준',
  '/notices': '보안 공지사항',
  '/threats': '보안 동향 · CVE',
  '/resources': '자료실',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle, color, setColor } = useTheme()
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const baseKey = '/' + (pathname.split('/')[1] || '')
  const title = TITLES[baseKey === '/' ? '/' : baseKey] ?? '취약점 진단 관리'

  return (
    <div className="app-shell">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <NavLink to="/" className="sidebar-brand" onClick={() => setOpen(false)} title="대시보드로 이동">
          <span className="brand-logo-chip">
            <img src={`${import.meta.env.BASE_URL}kdn-symbol.png`} alt="KDN" />
          </span>
          <span className="brand-text">
            <span className="brand-name">KDN-VULN</span>
            <span className="brand-sub">취약점 진단 관리</span>
            <span className="brand-tag">(바이브코딩 과정 실습)</span>
          </span>
        </NavLink>
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">메뉴</div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <i className={`fa-solid ${n.icon}`} />
              {n.label}
            </NavLink>
          ))}
          <div className="sidebar-section-label">게시판</div>
          {BOARD.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <i className={`fa-solid ${n.icon}`} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          주요정보통신기반시설<br />보안상세가이드 2025.12<br />Unix U-01 ~ U-67
        </div>
      </aside>

      <div className="main-area">
        {db.mode() === 'local' && (
          <div className="mode-banner">
            <i className="fa-solid fa-circle-info" /> 로컬 미리보기 모드 — 데이터가 브라우저에만 저장됩니다. Supabase 연결 시 자동 전환됩니다.
          </div>
        )}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="icon-btn sidebar-toggle" onClick={() => setOpen((o) => !o)} aria-label="메뉴">
              <i className="fa-solid fa-bars" />
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-actions">
            <div className="palette-wrap">
              <button className="icon-btn" onClick={() => setPaletteOpen((o) => !o)} aria-label="컬러 팔레트" title="컬러 팔레트">
                <i className="fa-solid fa-palette" />
              </button>
              {paletteOpen && (
                <>
                  <div className="palette-backdrop" onClick={() => setPaletteOpen(false)} />
                  <div className="palette-popover">
                    <div className="palette-title">컬러 팔레트</div>
                    <div className="palette-grid">
                      {PALETTES.map((p) => (
                        <button
                          key={p.key}
                          className={`palette-swatch ${color === p.key ? 'active' : ''}`}
                          onClick={() => { setColor(p.key); setPaletteOpen(false) }}
                          title={p.label}
                        >
                          <span className="sw-dot" style={{ background: p.color }}>{color === p.key && <i className="fa-solid fa-check" />}</span>
                          <span className="sw-label">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button className="icon-btn" onClick={toggle} aria-label="테마 전환">
              <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`} />
            </button>
            {user && (
              <>
                <div className="topbar-user">
                  <span className="user-avatar">{(user.email?.[0] ?? 'A').toUpperCase()}</span>
                  <span className="hide-sm">{user.email}</span>
                </div>
                <button className="icon-btn" onClick={logout} aria-label="로그아웃" title="로그아웃">
                  <i className="fa-solid fa-right-from-bracket" />
                </button>
              </>
            )}
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  )
}
