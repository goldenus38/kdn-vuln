import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, latestScanPerAsset } from '../lib/db'
import type { Asset, Scan } from '../types'
import { CHECK_ITEM_MAP, CATEGORIES, CATEGORY_LABEL } from '../data/checkItems'
import { ScorePill, Spinner, EmptyState, fmtDate } from '../components/ui'

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([db.listAssets(), db.listScans()])
      .then(([a, s]) => { setAssets(a); setScans(s) })
      .finally(() => setLoading(false))
  }, [])

  const latest = useMemo(() => latestScanPerAsset(scans), [scans])

  const stats = useMemo(() => {
    const totalVuln = latest.reduce((sum, s) => sum + s.vulnCount, 0)
    const totalManual = latest.reduce((sum, s) => sum + s.manualCount, 0)
    const avgScore = latest.length
      ? Math.round((latest.reduce((sum, s) => sum + s.score, 0) / latest.length) * 10) / 10
      : 0
    const riskyAssets = latest.filter((s) => s.vulnCount > 0).length
    return { totalVuln, totalManual, avgScore, riskyAssets }
  }, [latest])

  // 항목별 취약 발생 건수 (최신 점검 기준) TOP
  const topItems = useMemo(() => {
    const count = new Map<string, number>()
    for (const s of latest) {
      for (const r of s.results) {
        if (r.result === 'N') count.set(r.checkItem, (count.get(r.checkItem) ?? 0) + 1)
      }
    }
    return [...count.entries()]
      .map(([code, n]) => ({ code, n, name: CHECK_ITEM_MAP[code]?.name ?? code }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8)
  }, [latest])
  const topMax = Math.max(1, ...topItems.map((t) => t.n))

  // 분야별 취약 건수
  const byCategory = useMemo(() => {
    const count: Record<string, number> = {}
    for (const s of latest) {
      for (const r of s.results) {
        if (r.result !== 'N') continue
        const cat = CHECK_ITEM_MAP[r.checkItem]?.category
        if (cat) count[cat] = (count[cat] ?? 0) + 1
      }
    }
    return CATEGORIES.map((c) => ({ category: c, label: CATEGORY_LABEL[c], n: count[c] ?? 0 }))
  }, [latest])
  const catMax = Math.max(1, ...byCategory.map((c) => c.n))

  const recent = scans.slice(0, 6)

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div>
          <h1>대시보드</h1>
          <div className="page-sub">최신 점검 결과 기준 전체 자산·취약점 현황</div>
        </div>
        <Link to="/scans" className="btn btn-primary"><i className="fa-solid fa-upload" /> 점검결과 업로드</Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card accent-primary">
          <i className="fa-solid fa-server stat-icon" />
          <span className="stat-label">등록 자산</span>
          <span className="stat-value">{assets.length}</span>
          <span className="stat-meta">점검 완료 {latest.length} · 미점검 {Math.max(0, assets.length - latest.filter(s => s.assetId).length)}</span>
        </div>
        <div className="stat-card accent-vuln">
          <i className="fa-solid fa-circle-exclamation stat-icon" />
          <span className="stat-label">취약 항목 (건)</span>
          <span className="stat-value" style={{ color: 'var(--status-vuln)' }}>{stats.totalVuln}</span>
          <span className="stat-meta">취약 자산 {stats.riskyAssets}대</span>
        </div>
        <div className="stat-card accent-manual">
          <i className="fa-solid fa-circle-question stat-icon" />
          <span className="stat-label">수동확인 필요 (건)</span>
          <span className="stat-value" style={{ color: 'var(--status-manual)' }}>{stats.totalManual}</span>
          <span className="stat-meta">담당자 확인 필요</span>
        </div>
        <div className="stat-card accent-good">
          <i className="fa-solid fa-gauge-high stat-icon" />
          <span className="stat-label">평균 양호율</span>
          <span className="stat-value"><ScorePill score={stats.avgScore} /></span>
          <span className="stat-meta">양호 / (양호+취약)</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>취약 다발 항목 TOP 8</h2><span className="card-sub">최신 점검 기준</span></div>
          <div className="card-pad">
            {topItems.length === 0 ? <EmptyState icon="fa-circle-check">취약 항목이 없습니다.</EmptyState> : (
              <div className="bar-list">
                {topItems.map((t) => (
                  <div className="bar-row" key={t.code}>
                    <span className="bar-label" title={t.name}>{t.code} {t.name}</span>
                    <div className="bar-track"><span className="bar-fill" style={{ width: `${(t.n / topMax) * 100}%` }} /></div>
                    <span className="bar-val">{t.n}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h2>분야별 취약 건수</h2></div>
          <div className="card-pad">
            <div className="bar-list">
              {byCategory.map((c) => (
                <div className="bar-row" key={c.category}>
                  <span className="bar-label">{c.label}</span>
                  <div className="bar-track"><span className="bar-fill" style={{ width: `${(c.n / catMax) * 100}%` }} /></div>
                  <span className="bar-val">{c.n}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2>최근 점검 이력</h2><Link to="/scans" className="card-sub">전체 보기 →</Link></div>
        {recent.length === 0 ? (
          <EmptyState icon="fa-file-csv">아직 업로드된 점검 결과가 없습니다. 점검 CSV를 업로드하세요.</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>호스트</th><th>점검일시</th><th className="col-center">취약</th><th className="col-center">수동</th><th>양호율</th><th></th></tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.hostname}{!s.assetId && <span className="badge cat" style={{ marginLeft: 6 }}>미등록</span>}</td>
                    <td>{fmtDate(s.scanDate)}</td>
                    <td className="col-center" style={{ color: 'var(--status-vuln)', fontWeight: 700 }}>{s.vulnCount}</td>
                    <td className="col-center" style={{ color: 'var(--status-manual)', fontWeight: 700 }}>{s.manualCount}</td>
                    <td><ScorePill score={s.score} /></td>
                    <td className="col-right"><Link to={`/scans/${s.id}`} className="btn btn-secondary btn-sm">상세</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
