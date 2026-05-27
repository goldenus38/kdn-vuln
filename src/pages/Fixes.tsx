import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import type { Asset, FixRun } from '../types'
import { parseFixLog, aggregateFix, FixParseError } from '../lib/fixLogParser'
import { useToast } from '../contexts/ToastContext'
import { Spinner, EmptyState, fmtDate } from '../components/ui'

export default function Fixes() {
  const { notify } = useToast()
  const [fixes, setFixes] = useState<FixRun[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [f, a] = await Promise.all([db.listFixes(), db.listAssets()])
    setFixes(f); setAssets(a); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const assetByHost = useMemo(() => {
    const m = new Map<string, Asset>()
    for (const a of assets) m.set(a.hostname.toLowerCase(), a)
    return m
  }, [assets])

  async function handleFiles(files: FileList | File[]) {
    setBusy(true)
    let ok = 0
    for (const file of Array.from(files)) {
      try {
        const text = await file.text()
        const parsed = parseFixLog(text)
        const agg = aggregateFix(parsed.items)
        const asset = assetByHost.get(parsed.hostname.toLowerCase())
        const fix: FixRun = {
          id: crypto.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          assetId: asset?.id ?? null,
          hostname: parsed.hostname,
          fixDate: parsed.fixDate,
          fileName: file.name,
          uploadedAt: new Date().toISOString(),
          itemsArg: parsed.itemsArg,
          ...agg,
          items: parsed.items,
        }
        await db.createFix(fix)
        ok++
      } catch (e) {
        notify(`${file.name}: ${e instanceof FixParseError ? e.message : '업로드 실패'}`, 'error')
      }
    }
    if (ok) notify(`${ok}개 조치 로그를 업로드했습니다.`, 'success')
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
    await load()
  }

  async function remove(f: FixRun) {
    if (!confirm(`조치 이력 '${f.hostname} / ${fmtDate(f.fixDate)}' 을(를) 삭제할까요?`)) return
    await db.deleteFix(f.id)
    notify('삭제되었습니다.', 'success')
    await load()
  }

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return fixes
    return fixes.filter((f) => f.hostname.toLowerCase().includes(k) || f.fileName.toLowerCase().includes(k))
  }, [fixes, q])

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div><h1>조치 이력</h1><div className="page-sub">조치 스크립트 로그(_fix.log) 업로드 및 이력 관리 · 총 {fixes.length}건</div></div>
      </div>

      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files) }}
        style={{ marginBottom: 22 }}
      >
        <input ref={fileRef} type="file" accept=".log,.txt,text/plain" multiple hidden
          onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files) }} />
        <div><i className={`fa-solid ${busy ? 'fa-spinner fa-spin' : 'fa-screwdriver-wrench'}`} /></div>
        <div className="dz-title">{busy ? '업로드 중…' : '조치 로그 업로드'}</div>
        <div className="dz-sub">파일을 끌어다 놓거나 클릭하여 선택 · 여러 개 동시 가능<br />형식: <code>YYYYMMDD_fix.log</code></div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="호스트명·파일명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="fa-screwdriver-wrench">{fixes.length === 0 ? '업로드된 조치 이력이 없습니다.' : '검색 결과가 없습니다.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>호스트</th><th>조치일시</th><th>파일명</th>
                  <th className="col-center">대상</th><th className="col-center">조치완료</th>
                  <th className="col-center">보고</th><th className="col-center">수동</th>
                  <th className="col-center">실패</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="mono" style={{ fontWeight: 600 }}>
                      {f.hostname}{!f.assetId && <span className="badge cat" style={{ marginLeft: 6 }} title="자산 미등록">미등록</span>}
                    </td>
                    <td>{fmtDate(f.fixDate)}</td>
                    <td className="mono" style={{ fontSize: 12, color: 'var(--text-light)' }}>{f.fileName}</td>
                    <td className="col-center">{f.total}</td>
                    <td className="col-center" style={{ color: 'var(--status-good)', fontWeight: 700 }}>{f.fixedCount}</td>
                    <td className="col-center" style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{f.reportedCount || '-'}</td>
                    <td className="col-center" style={{ color: 'var(--status-manual)', fontWeight: 600 }}>{f.manualCount || '-'}</td>
                    <td className="col-center" style={{ color: f.failCount ? 'var(--status-vuln)' : 'inherit', fontWeight: 700 }}>{f.failCount || '-'}</td>
                    <td className="col-right" style={{ whiteSpace: 'nowrap' }}>
                      <Link to={`/fixes/${f.id}`} className="btn btn-secondary btn-sm">상세</Link>{' '}
                      <button className="btn btn-secondary btn-sm" onClick={() => remove(f)}><i className="fa-solid fa-trash" /></button>
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
