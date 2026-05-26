import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, latestScanPerAsset } from '../lib/db'
import type { Scan, Severity } from '../types'
import { CHECK_ITEMS, CATEGORIES, CATEGORY_LABEL } from '../data/checkItems'
import { SeverityBadge, Spinner, EmptyState, fmtDate } from '../components/ui'

export default function Vulnerabilities() {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState<string>('ALL')
  const [sev, setSev] = useState<string>('ALL')
  const [onlyVuln, setOnlyVuln] = useState(true)
  const [expand, setExpand] = useState<string | null>(null)

  useEffect(() => { db.listScans().then((s) => { setScans(s); setLoading(false) }) }, [])

  const latest = useMemo(() => latestScanPerAsset(scans), [scans])
  const assetCount = latest.length

  // U-항목별 취약/수동 자산 목록 집계 (최신 점검 기준)
  const perItem = useMemo(() => {
    const map = new Map<string, { vuln: Scan[]; manual: Scan[] }>()
    for (const item of CHECK_ITEMS) map.set(item.code, { vuln: [], manual: [] })
    for (const s of latest) {
      for (const r of s.results) {
        const e = map.get(r.checkItem)
        if (!e) continue
        if (r.result === 'N') e.vuln.push(s)
        else if (r.result === 'C') e.manual.push(s)
      }
    }
    return CHECK_ITEMS.map((item) => ({ item, ...map.get(item.code)! }))
  }, [latest])

  const rows = useMemo(() => {
    return perItem.filter(({ item, vuln }) => {
      if (cat !== 'ALL' && item.category !== cat) return false
      if (sev !== 'ALL' && item.severity !== sev) return false
      if (onlyVuln && vuln.length === 0) return false
      return true
    }).sort((a, b) => b.vuln.length - a.vuln.length)
  }, [perItem, cat, sev, onlyVuln])

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div><h1>취약점 현황</h1><div className="page-sub">점검 항목(U-01~67)별 취약 자산 분포 · 최신 점검 {assetCount}대 기준</div></div>
      </div>

      {assetCount === 0 ? (
        <div className="card"><EmptyState icon="fa-shield-halved">점검 데이터가 없습니다. 점검 결과를 먼저 업로드하세요.</EmptyState></div>
      ) : (
        <>
          <div className="filter-bar">
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="ALL">전체 분야</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
            <select value={sev} onChange={(e) => setSev(e.target.value)}>
              <option value="ALL">전체 중요도</option>
              {(['상', '중', '하'] as Severity[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyVuln} onChange={(e) => setOnlyVuln(e.target.checked)} /> 취약 발생 항목만
            </label>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th style={{ width: 70 }}>항목</th><th>점검 내용</th><th>분야</th><th className="col-center">중요도</th><th className="col-center">취약 자산</th><th style={{ width: 160 }}>취약 비율</th><th className="col-center">수동확인</th></tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={7}><EmptyState icon="fa-circle-check">조건에 맞는 항목이 없습니다.</EmptyState></td></tr>
                  ) : rows.map(({ item, vuln, manual }) => {
                    const pct = assetCount ? Math.round((vuln.length / assetCount) * 100) : 0
                    const isOpen = expand === item.code
                    return (
                      <Fragment key={item.code}>
                        <tr className="clickable" onClick={() => setExpand(isOpen ? null : item.code)}>
                          <td className="mono" style={{ fontWeight: 700 }}>{item.code}</td>
                          <td>{item.name}</td>
                          <td><span className="badge cat">{CATEGORY_LABEL[item.category]}</span></td>
                          <td className="col-center"><SeverityBadge severity={item.severity} /></td>
                          <td className="col-center" style={{ fontWeight: 700, color: vuln.length ? 'var(--status-vuln)' : 'inherit' }}>{vuln.length}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className="progress"><span className="bad" style={{ width: `${pct}%` }} /></div>
                              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{pct}%</span>
                            </div>
                          </td>
                          <td className="col-center" style={{ color: manual.length ? 'var(--status-manual)' : 'inherit', fontWeight: manual.length ? 700 : 400 }}>{manual.length || '-'}</td>
                        </tr>
                        {isOpen && (vuln.length > 0 || manual.length > 0) && (
                          <tr>
                            <td colSpan={7} style={{ background: 'var(--surface-2)' }}>
                              {vuln.length > 0 && <ScanChips title="취약 자산" tone="vuln" scans={vuln} />}
                              {manual.length > 0 && <ScanChips title="수동확인 필요" tone="manual" scans={manual} />}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  )
}

function ScanChips({ title, tone, scans }: { title: string; tone: 'vuln' | 'manual'; scans: Scan[] }) {
  const color = tone === 'vuln' ? 'var(--status-vuln)' : 'var(--status-manual)'
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="dt-label" style={{ marginBottom: 6, color }}>{title} ({scans.length})</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {scans.map((s) => (
          <Link key={s.id} to={`/scans/${s.id}`} className="badge cat" style={{ textDecoration: 'none' }} title={fmtDate(s.scanDate)}>
            <i className="fa-solid fa-server" /> {s.hostname}
          </Link>
        ))}
      </div>
    </div>
  )
}
