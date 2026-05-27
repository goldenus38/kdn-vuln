import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, latestScanPerAsset } from '../lib/db'
import type { Asset, Scan } from '../types'
import { parseScanCsv, aggregate, CsvParseError } from '../lib/csvParser'
import { useToast } from '../contexts/ToastContext'
import { ScorePill, Spinner, EmptyState, fmtDate } from '../components/ui'

export default function Scans() {
  const { notify } = useToast()
  const [scans, setScans] = useState<Scan[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [view, setView] = useState<'latest' | 'all'>('latest')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [s, a] = await Promise.all([db.listScans(), db.listAssets()])
    setScans(s); setAssets(a); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const assetByHost = useMemo(() => {
    const m = new Map<string, Asset>()
    for (const a of assets) m.set(a.hostname.toLowerCase(), a)
    return m
  }, [assets])

  async function handleFiles(files: FileList | File[]) {
    setBusy(true)
    let ok = 0, fail = 0
    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        const parsed = parseScanCsv(text)
        const agg = aggregate(parsed.rows)
        const asset = assetByHost.get(parsed.hostname.toLowerCase())
        const scan: Scan = {
          id: crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          assetId: asset?.id ?? null,
          hostname: parsed.hostname,
          scanDate: parsed.scanDate,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          uploadedBy: '',
          ...agg,
          results: parsed.rows,
        }
        await db.createScan(scan)
        ok++
      } catch (e) {
        fail++
        notify(`${file.name}: ${e instanceof CsvParseError ? e.message : '업로드 실패'}`, 'error')
      }
    }
    if (ok) notify(`${ok}개 점검 결과를 업로드했습니다.`, 'success')
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
    await load()
  }

  async function remove(s: Scan) {
    if (!confirm(`점검 결과 '${s.hostname} / ${fmtDate(s.scanDate)}' 을(를) 삭제할까요?`)) return
    await db.deleteScan(s.id)
    notify('삭제되었습니다.', 'success')
    await load()
  }

  const base = useMemo(
    () => (view === 'latest' ? latestScanPerAsset(scans) : scans),
    [scans, view],
  )
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return base
    return base.filter((s) => s.hostname.toLowerCase().includes(k) || s.fileName.toLowerCase().includes(k))
  }, [base, q])

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div><h1>점검 결과</h1><div className="page-sub">점검 CSV 업로드 및 이력 관리 · 자산별 최신 {latestScanPerAsset(scans).length}건 / 전체 {scans.length}건</div></div>
      </div>

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
        style={{ marginBottom: 22 }}
      >
        <input ref={fileRef} type="file" accept=".csv,text/csv" multiple hidden
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files) }} />
        <div><i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-up'}`} /></div>
        <div className="dz-title">{busy ? '업로드 중…' : '점검 결과 CSV 업로드'}</div>
        <div className="dz-sub">파일을 끌어다 놓거나 클릭하여 선택 · 여러 개 동시 가능<br />형식: <code>HOST-security_check-YYYYMMDD.csv</code></div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="호스트명·파일명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="seg">
          <button className={view === 'latest' ? 'active' : ''} onClick={() => setView('latest')}>자산별 최신</button>
          <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>전체 이력</button>
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="fa-file-csv">{scans.length === 0 ? '업로드된 점검 결과가 없습니다.' : '검색 결과가 없습니다.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>호스트</th><th>점검일시</th><th>파일명</th>
                  <th className="col-center">전체</th><th className="col-center">취약</th>
                  <th className="col-center">수동</th><th>양호율</th><th>업로드</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {s.hostname}{!s.assetId && <span className="badge cat" style={{ marginLeft: 6 }} title="자산 미등록">미등록</span>}
                    </td>
                    <td>{fmtDate(s.scanDate)}</td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-light)' }}>{s.fileName}</td>
                    <td className="col-center">{s.total}</td>
                    <td className="col-center" style={{ color: 'var(--status-vuln)', fontWeight: 700 }}>{s.vulnCount}</td>
                    <td className="col-center" style={{ color: 'var(--status-manual)', fontWeight: 700 }}>{s.manualCount}</td>
                    <td><ScorePill score={s.score} /></td>
                    <td style={{ fontSize: 12, color: 'var(--text-light)' }}>{fmtDate(s.uploadedAt)}</td>
                    <td className="col-right" style={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/scans/${s.id}`} className="btn btn-secondary btn-sm">상세</Link>{' '}
                      <button className="btn btn-secondary btn-sm" onClick={() => remove(s)}><i className="fa-solid fa-trash" /></button>
                    </td>
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
