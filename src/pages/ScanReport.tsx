import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Asset, Scan } from '../types'
import { CHECK_ITEM_MAP, CATEGORY_LABEL } from '../data/checkItems'
import { downloadScanExcel } from '../lib/exportReport'
import { ResultBadge, SeverityBadge, ScorePill, Spinner, EmptyState, fmtDate } from '../components/ui'

export default function ScanReport() {
  const { id = '' } = useParams()
  const [scan, setScan] = useState<Scan | null>(null)
  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getScan(id).then(async (s) => {
      setScan(s)
      if (s?.assetId) setAsset(await db.getAsset(s.assetId))
      setLoading(false)
    })
  }, [id])

  const rows = useMemo(() => {
    if (!scan) return []
    return [...scan.results].sort((a, b) => a.checkItem.localeCompare(b.checkItem, undefined, { numeric: true }))
  }, [scan])

  if (loading) return <Spinner />
  if (!scan) return <EmptyState icon="fa-triangle-exclamation">점검 결과를 찾을 수 없습니다. <Link to="/scans">목록으로</Link></EmptyState>

  return (
    <>
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Link to={`/scans/${scan.id}`} className="btn btn-secondary"><i className="fa-solid fa-arrow-left" /> 상세로</Link>
        <button className="btn btn-primary" onClick={() => window.print()}><i className="fa-solid fa-print" /> 인쇄 / PDF 저장</button>
        <button className="btn btn-secondary" onClick={() => downloadScanExcel(scan, asset)}><i className="fa-solid fa-file-excel" /> Excel 다운로드</button>
      </div>

      <div className="print-report">
        <div className="report-head">
          <h1>Linux 보안취약점 점검결과서</h1>
          <p>주요정보통신기반시설 보안상세가이드(2025.12) · Unix 서버 U-01 ~ U-67</p>
        </div>

        <table className="report-meta">
          <tbody>
            <tr><th>호스트명</th><td>{scan.hostname}</td><th>IP 주소</th><td>{asset?.ip || '-'}</td></tr>
            <tr><th>OS</th><td>{asset ? `${asset.osType} ${asset.osVersion}` : '-'}</td><th>점검일시</th><td>{fmtDate(scan.scanDate)}</td></tr>
            <tr><th>부서</th><td>{asset?.department || '-'}</td><th>담당자</th><td>{asset?.owner || '-'}</td></tr>
            <tr><th>위치</th><td>{asset?.location || '-'}</td><th>점검 파일</th><td>{scan.fileName}</td></tr>
          </tbody>
        </table>

        <div className="report-summary">
          <div className="rs-item"><span className="rs-label">전체 항목</span><span className="rs-val">{scan.total}</span></div>
          <div className="rs-item good"><span className="rs-label">양호</span><span className="rs-val">{scan.goodCount}</span></div>
          <div className="rs-item vuln"><span className="rs-label">취약</span><span className="rs-val">{scan.vulnCount}</span></div>
          <div className="rs-item manual"><span className="rs-label">수동확인</span><span className="rs-val">{scan.manualCount}</span></div>
          <div className="rs-item"><span className="rs-label">양호율</span><span className="rs-val"><ScorePill score={scan.score} /></span></div>
        </div>

        <table className="report-table">
          <thead>
            <tr><th>항목</th><th>점검 내용</th><th>분야</th><th>중요도</th><th>결과</th><th>상세</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = CHECK_ITEM_MAP[r.checkItem]
              return (
                <tr key={r.checkItem}>
                  <td className="mono">{r.checkItem}</td>
                  <td>{m?.name ?? r.message}</td>
                  <td>{m ? CATEGORY_LABEL[m.category] : '-'}</td>
                  <td className="col-center">{m ? <SeverityBadge severity={m.severity} /> : '-'}</td>
                  <td className="col-center"><ResultBadge result={r.result} /></td>
                  <td className="report-detail">{r.detail}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="report-foot">
          본 결과서는 KDN-VULN 취약점 진단 관리 시스템에서 자동 생성되었습니다. · 출력일 {fmtDate(new Date().toISOString())}
        </div>
      </div>
    </>
  )
}
