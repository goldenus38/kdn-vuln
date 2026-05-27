import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
export type Palette = 'kdn' | 'navy' | 'blue' | 'green' | 'purple' | 'orange'

export const PALETTES: { key: Palette; label: string; color: string }[] = [
  { key: 'kdn', label: 'KDN 레드', color: '#E2231A' },
  { key: 'navy', label: '네이비', color: '#1B2A4A' },
  { key: 'blue', label: '블루', color: '#2563EB' },
  { key: 'green', label: '그린', color: '#00855A' },
  { key: 'purple', label: '퍼플', color: '#7C3AED' },
  { key: 'orange', label: '오렌지', color: '#D4760A' },
]

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  color: Palette
  setColor: (c: Palette) => void
}

const Ctx = createContext<ThemeCtx>({ theme: 'light', toggle: () => {}, color: 'kdn', setColor: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('kdnvuln_theme') as Theme) || 'light',
  )
  const [color, setColorState] = useState<Palette>(
    () => (localStorage.getItem('kdnvuln_color') as Palette) || 'kdn',
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('kdnvuln_theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-color', color)
    localStorage.setItem('kdnvuln_color', color)
  }, [color])

  return (
    <Ctx.Provider value={{
      theme,
      toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
      color,
      setColor: setColorState,
    }}>
      {children}
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(Ctx)
