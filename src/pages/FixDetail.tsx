import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Asset, FixResult, FixRun, Scan } from '../types'
import { CHECK_ITEM_MAP } from '../data/checkItems'
import { FixBadge, Spinner, EmptyState, fmtDate } from '../components/ui'

type Filter = 'ALL' | FixResult

export default function FixDetail() {
  const { id = '' } = useParams()
  const [fix, setFix] = useState<FixRun | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [hostScans, setHostScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    db.getFix(id).then(async (f) => {
      setFix(f)
      if (f) {
        if (f.assetId) setAsset(await db.getAsset(f.assetId))
        const scans = await db.listScans()
        setHostScans(scans.filter((s) => s.hostname.toLowerCase() === f.hostname.toLowerCase()))
      }
      setLoading(false)
    })
  }, [id])

  const rows = useMemo(() => {
    if (!fix) return []
    const list = filter === 'ALL' ? fix.items : fix.items.filter((i) => i.result === filter)
    return [...list].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  }, [fix, filter])

  // 직전 점검(조치일 이전 최신)과 연계 — 조치 대상이 점검에서 취약(N)이었는지
  const priorVulnSet = useMemo(() => {
    if (!fix) return new Set<string>()
    const prior = hostScans
      .filter((s) => s.scanDate <= fix.fixDate)
      .sort((a, b) => b.scanDate.localeCompare(a.scanDate))[0]
    const set = new Set<string>()
    if (prior) for (const r of prior.results) if (r.result === 'N') set.add(r.checkItem)
    return set
  }, [fix, hostScans])

  if (loading) return <Spinner />
  if (!fix) return <EmptyState icon="fa-triangle-exclamation">조치 이력을 찾을 수 없습니다. <Link to="/fixes">목록으로</Link></EmptyState>

  return (
    <>
      <div className="page-head">
        <div>
          <h1><i className="fa-solid fa-screwdriver-wrench" style={{ color: 'var(--kdn-red)', marginRight: 8 }} />{fix.hostname}</h1>
          <div className="page-sub">{fmtDate(fix.fixDate)} 조치 · {fix.fileName} · 대상: {fix.itemsArg || '전체'}</div>
        </div>
        <Link to="/fixes" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" /> 목록</Link>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="detail-grid">
          <div className="detail-item"><div className="dt-label">호스트명</div><div className="dt-value mono">{fix.hostname}</div></div>
          <div className="detail-item"><div className="dt-label">자산 정보</div><div className="dt-value">{asset ? `${asset.ip || '-'} · ${asset.osType} ${asset.osVersion}` : <span className="badge cat">미등록 자산</span>}</div></div>
          <div className="detail-item"><div className="dt-label">부서 / 담당자</div><div className="dt-value">{asset ? `${asset.department || '-'} / ${asset.owner || '-'}` : '-'}</div></div>
          <div className="detail-item"><div className="dt-label">연계 점검</div><div className="dt-value">{hostScans.length ? <Link to={`/scans/${hostScans.sort((a,b)=>b.scanDate.localeCompare(a.scanDate))[0].id}`} className="btn-link" style={{ fontSize: 13 }}>최근 점검 보기 →</Link> : '점검 이력 없음'}</div></div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card accent-good"><span className="stat-label">조치완료 (FIXED)</span><span className="stat-value" style={{ color: 'var(--status-good)' }}>{fix.fixedCount}</span></div>
        <div className="stat-card accent-primary"><span className="stat-label">보고 (REPORTED)</span><span className="stat-value" style={{ color: 'var(--primary-light)' }}>{fix.reportedCount}</span></div>
        <div className="stat-card accent-manual"><span className="stat-label">수동조치 (MANUAL)</span><span className="stat-value" style={{ color: 'var(--status-manual)' }}>{fix.manualCount}</span></div>
        <div className="stat-card accent-vuln"><span className="stat-label">실패 (FAIL)</span><span className="stat-value" style={{ color: 'var(--status-vuln)' }}>{fix.failCount}</span></div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>조치 항목 ({fix.total})</h2>
          <div className="seg">
            {(['ALL', 'FIXED', 'REPORTED', 'MANUAL', 'FAIL'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'ALL' ? '전체' : f === 'FIXED' ? '완료' : f === 'REPORTED' ? '보고' : f === 'MANUAL' ? '수동' : '실패'}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 70 }}>항목</th><th>조치 내용</th><th className="col-center">점검 취약</th><th className="col-center">조치 결과</th><th style={{ width: 40 }}></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5}><EmptyState icon="fa-circle-check">해당 결과의 항목이 없습니다.</EmptyState></td></tr>
              ) : rows.map((it) => {
                const meta = CHECK_ITEM_MAP[it.code]
                const isOpen = open === it.code
                const wasVuln = priorVulnSet.has(it.code)
                return (
                  <Fragment key={it.code}>
                    <tr className="clickable" onClick={() => setOpen(isOpen ? null : it.code)}>
                      <td className="mono" style={{ fontWeight: 700 }}>{it.code}</td>
                      <td>{meta?.name ?? it.title}</td>
                      <td className="col-center">{wasVuln ? <span className="badge result-N" title="직전 점검에서 취약했던 항목"><i className="fa-solid fa-arrow-trend-down" />취약→조치</span> : <span style={{ color: 'var(--text-light)' }}>-</span>}</td>
                      <td className="col-center"><FixBadge result={it.result} /></td>
                      <td className="col-center" style={{ color: 'var(--text-light)' }}><i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} /></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={5} style={{ background: 'var(--surface-2)' }}>
                          {it.actions.length === 0 ? <span style={{ color: 'var(--text-light)', fontSize: 13 }}>상세 액션 없음</span> : (
                            <div>
                              {it.actions.map((a, i) => (
                                <div className="act-line" key={i}>
                                  <span className={`act-tag act-${a.tag}`}>{a.tag}</span>
                                  <span className="act-msg">{a.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
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
  )
}
