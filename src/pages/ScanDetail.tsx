import { Fragment, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Asset, CheckResult, Scan } from '../types'
import { CHECK_ITEM_MAP, CATEGORY_LABEL } from '../data/checkItems'
import { ResultBadge, SeverityBadge, ScorePill, Spinner, EmptyState, fmtDate } from '../components/ui'

type Filter = 'ALL' | CheckResult

export default function ScanDetail() {
  const { id = '' } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('ALL')
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    db.getScan(id).then(async (s) => {
      setScan(s)
      if (s?.assetId) setAsset(await db.getAsset(s.assetId))
      setLoading(false)
    })
  }, [id])

  const rows = useMemo(() => {
    if (!scan) return []
    const list = filter === 'ALL' ? scan.results : scan.results.filter((r) => r.result === filter)
    return [...list].sort((a, b) => a.checkItem.localeCompare(b.checkItem, undefined, { numeric: true }))
  }, [scan, filter])

  if (loading) return <Spinner />
  if (!scan) return <EmptyState icon="fa-triangle-exclamation">점검 결과를 찾을 수 없습니다. <Link to="/scans">목록으로</Link></EmptyState>

  return (
    <>
      <div className="page-head">
        <div>
          <h1><i className="fa-solid fa-file-csv" style={{ color: 'var(--primary-light)', marginRight: 8 }} />{scan.hostname}</h1>
          <div className="page-sub">{fmtDate(scan.scanDate)} 점검 · {scan.fileName}</div>
        </div>
        <Link to="/scans" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" /> 목록</Link>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="detail-grid">
          <div className="detail-item"><div className="dt-label">호스트명</div><div className="dt-value mono">{scan.hostname}</div></div>
          <div className="detail-item"><div className="dt-label">자산 정보</div><div className="dt-value">{asset ? `${asset.ip || '-'} · ${asset.osType} ${asset.osVersion}` : <span className="badge cat">미등록 자산</span>}</div></div>
          <div className="detail-item"><div className="dt-label">부서 / 담당자</div><div className="dt-value">{asset ? `${asset.department || '-'} / ${asset.owner || '-'}` : '-'}</div></div>
          <div className="detail-item"><div className="dt-label">양호율</div><div className="dt-value"><ScorePill score={scan.score} /></div></div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card accent-good"><span className="stat-label">양호 (Y)</span><span className="stat-value" style={{ color: 'var(--status-good)' }}>{scan.goodCount}</span></div>
        <div className="stat-card accent-vuln"><span className="stat-label">취약 (N)</span><span className="stat-value" style={{ color: 'var(--status-vuln)' }}>{scan.vulnCount}</span></div>
        <div className="stat-card accent-manual"><span className="stat-label">수동확인 (C)</span><span className="stat-value" style={{ color: 'var(--status-manual)' }}>{scan.manualCount}</span></div>
        <div className="stat-card accent-primary"><span className="stat-label">전체 항목</span><span className="stat-value">{scan.total}</span></div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>점검 항목 결과</h2>
          <div className="seg">
            {(['ALL', 'N', 'C', 'Y'] as Filter[]).map((f) => (
              <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
                {f === 'ALL' ? '전체' : f === 'N' ? '취약' : f === 'C' ? '수동확인' : '양호'}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th style={{ width: 70 }}>항목</th><th>점검 내용</th><th>분야</th><th className="col-center">중요도</th><th className="col-center">결과</th><th style={{ width: 40 }}></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6}><EmptyState icon="fa-circle-check">해당 결과의 항목이 없습니다.</EmptyState></td></tr>
              ) : rows.map((r) => {
                const meta = CHECK_ITEM_MAP[r.checkItem]
                const isOpen = open === r.checkItem
                return (
                  <Fragment key={r.checkItem}>
                    <tr className="clickable" onClick={() => setOpen(isOpen ? null : r.checkItem)}>
                      <td className="mono" style={{ fontWeight: 700 }}>{r.checkItem}</td>
                      <td>{meta?.name ?? r.message}</td>
                      <td>{meta ? <span className="badge cat">{CATEGORY_LABEL[meta.category]}</span> : '-'}</td>
                      <td className="col-center">{meta ? <SeverityBadge severity={meta.severity} /> : '-'}</td>
                      <td className="col-center"><ResultBadge result={r.result} /></td>
                      <td className="col-center" style={{ color: 'var(--text-light)' }}><i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} /></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} style={{ background: 'var(--surface-2)' }}>
                          <div className="dt-label" style={{ marginBottom: 6 }}>점검 상세 (check_detail)</div>
                          <div className="detail-pre">{r.detail || '(상세 내용 없음)'}</div>
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
