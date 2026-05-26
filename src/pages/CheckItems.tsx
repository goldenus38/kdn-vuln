import { useMemo, useState } from 'react'
import { CHECK_ITEMS, CATEGORIES, CATEGORY_LABEL } from '../data/checkItems'
import type { Severity } from '../types'
import { SeverityBadge } from '../components/ui'

export default function CheckItems() {
  const [cat, setCat] = useState('ALL')
  const [sev, setSev] = useState('ALL')
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return CHECK_ITEMS.filter((it) => {
      if (cat !== 'ALL' && it.category !== cat) return false
      if (sev !== 'ALL' && it.severity !== sev) return false
      if (k && !(it.code.toLowerCase().includes(k) || it.name.toLowerCase().includes(k))) return false
      return true
    })
  }, [cat, sev, q])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>점검 항목 기준</h1>
          <div className="page-sub">주요정보통신기반시설 보안상세가이드(2025.12) Unix 서버 · 총 {CHECK_ITEMS.length}개 항목</div>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="항목코드·내용 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="ALL">전체 분야</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
        <select value={sev} onChange={(e) => setSev(e.target.value)}>
          <option value="ALL">전체 중요도</option>
          {(['상', '중', '하'] as Severity[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 70 }}>항목</th><th>점검 내용</th><th>분야</th><th className="col-center">중요도</th><th className="col-center">유형</th></tr>
            </thead>
            <tbody>
              {rows.map((it) => (
                <tr key={it.code}>
                  <td className="mono" style={{ fontWeight: 700 }}>{it.code}</td>
                  <td>{it.name.replace(' (수동확인)', '')}</td>
                  <td><span className="badge cat">{CATEGORY_LABEL[it.category]}</span></td>
                  <td className="col-center"><SeverityBadge severity={it.severity} /></td>
                  <td className="col-center">{it.manualOnly ? <span className="badge result-C">수동확인</span> : <span className="badge result-Y">자동</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
