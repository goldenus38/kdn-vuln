import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import type { CveSeverity, Threat } from '../types'
import { useToast } from '../contexts/ToastContext'
import { CveSeverityBadge, Spinner, EmptyState, fmtDate } from '../components/ui'
import Pagination from '../components/Pagination'
import ThreatModal, { emptyThreatDraft, splitCsv, type ThreatDraft } from '../components/ThreatModal'

const SEVS: CveSeverity[] = ['긴급', '높음', '중간', '낮음']
const PAGE_SIZE = 10

export default function Threats() {
  const { notify } = useToast()
  const nav = useNavigate()
  const [threats, setThreats] = useState<Threat[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [sev, setSev] = useState('ALL')
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<ThreatDraft | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    try { setThreats(await db.listThreats()) }
    catch { notify('보안 동향 테이블이 아직 없습니다. Supabase 마이그레이션을 실행하세요.', 'error'); setThreats([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    return threats.filter((t) => {
      if (sev !== 'ALL' && t.severity !== sev) return false
      if (k && !(t.title.toLowerCase().includes(k) || t.cve.toLowerCase().includes(k) || t.tags.join(' ').toLowerCase().includes(k))) return false
      return true
    })
  }, [threats, q, sev])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  useEffect(() => { setPage(1) }, [q, sev])

  async function save() {
    if (!draft) return
    if (!draft.title.trim()) { notify('제목을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      await db.createThreat({
        title: draft.title, cve: draft.cve.trim(), severity: draft.severity, source: draft.source,
        sourceUrl: draft.sourceUrl.trim(), publishedDate: draft.publishedDate,
        tags: splitCsv(draft.tagsText), relatedItems: splitCsv(draft.itemsText).map((s) => s.toUpperCase()),
        body: draft.body, author: draft.author,
      })
      notify('보안 동향을 등록했습니다.', 'success')
      setDraft(null)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div><h1>보안 동향 · CVE</h1><div className="page-sub">KISA 권고·신규 CVE·위협 정보 공유 · 총 {threats.length}건</div></div>
        <button className="btn btn-primary" onClick={() => setDraft(emptyThreatDraft())}><i className="fa-solid fa-plus" /> 동향 등록</button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="제목·CVE·태그 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={sev} onChange={(e) => setSev(e.target.value)}>
          <option value="ALL">전체 심각도</option>
          {SEVS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="fa-shield-virus">{threats.length === 0 ? '등록된 보안 동향이 없습니다.' : '검색 결과가 없습니다.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th style={{ width: 70 }}>심각도</th><th>제목</th><th style={{ width: 140 }}>CVE</th><th style={{ width: 90 }}>출처</th><th style={{ width: 110 }}>등록일</th><th className="col-center" style={{ width: 60 }}>조회</th></tr>
              </thead>
              <tbody>
                {pageItems.map((t) => (
                  <tr key={t.id} className="clickable notice-row" onClick={() => nav(`/threats/${t.id}`)}>
                    <td><CveSeverityBadge severity={t.severity} /></td>
                    <td className="nt-title">{t.title}</td>
                    <td><span className="cve-code">{t.cve || '-'}</span></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{t.source || '-'}</td>
                    <td style={{ color: 'var(--text-light)', fontSize: 12.5 }}>{fmtDate(t.createdAt).slice(0, 10)}</td>
                    <td className="col-center" style={{ color: 'var(--text-light)' }}>{t.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {draft && <ThreatModal mode="create" draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} saving={saving} />}
    </>
  )
}
