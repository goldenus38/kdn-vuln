import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Threat } from '../types'
import { CHECK_ITEM_MAP } from '../data/checkItems'
import { useToast } from '../contexts/ToastContext'
import { CveSeverityBadge, Spinner, EmptyState, fmtDate } from '../components/ui'
import ThreatModal, { threatDraftFrom, splitCsv, type ThreatDraft } from '../components/ThreatModal'

export default function ThreatDetail() {
  const { id = '' } = useParams()
  const { notify } = useToast()
  const nav = useNavigate()
  const [threat, setThreat] = useState<Threat | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<ThreatDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const bumped = useRef(false)

  useEffect(() => {
    db.getThreat(id).then((t) => {
      setThreat(t)
      if (t && !bumped.current) { bumped.current = true; db.bumpThreatViews(t.id, t.views).catch(() => {}) }
    }).catch(() => setThreat(null)).finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!draft || !threat) return
    if (!draft.title.trim()) { notify('제목을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      await db.updateThreat(threat.id, {
        title: draft.title, cve: draft.cve.trim(), severity: draft.severity, source: draft.source,
        sourceUrl: draft.sourceUrl.trim(), publishedDate: draft.publishedDate,
        tags: splitCsv(draft.tagsText), relatedItems: splitCsv(draft.itemsText).map((s) => s.toUpperCase()),
        body: draft.body, author: draft.author,
      })
      notify('수정했습니다.', 'success')
      setDraft(null)
      setThreat(await db.getThreat(threat.id))
    } catch (e) {
      notify(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!threat) return
    if (!confirm(`'${threat.title}' 을(를) 삭제할까요?`)) return
    await db.deleteThreat(threat.id)
    notify('삭제되었습니다.', 'success')
    nav('/threats')
  }

  if (loading) return <Spinner />
  if (!threat) return <EmptyState icon="fa-triangle-exclamation">보안 동향을 찾을 수 없습니다. <Link to="/threats">목록으로</Link></EmptyState>

  return (
    <>
      <div className="page-head">
        <div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setDraft(threatDraftFrom(threat))}><i className="fa-solid fa-pen" /> 수정</button>
          <button className="btn btn-secondary" onClick={remove}><i className="fa-solid fa-trash" /> 삭제</button>
          <Link to="/threats" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" /> 목록</Link>
        </div>
      </div>

      <div className="card card-pad">
        <div className="notice-detail-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <CveSeverityBadge severity={threat.severity} />
            {threat.cve && <span className="cve-code">{threat.cve}</span>}
          </div>
          <h1>{threat.title}</h1>
          <div className="notice-meta">
            <span><i className="fa-solid fa-building-shield" /> {threat.source || '-'}</span>
            {threat.publishedDate && <span><i className="fa-solid fa-calendar" /> 발표 {threat.publishedDate}</span>}
            <span><i className="fa-solid fa-user" /> {threat.author}</span>
            <span><i className="fa-solid fa-clock" /> {fmtDate(threat.createdAt)}</span>
            <span><i className="fa-solid fa-eye" /> {threat.views}</span>
          </div>
        </div>

        {(threat.tags.length > 0 || threat.relatedItems.length > 0 || threat.sourceUrl) && (
          <div className="detail-grid" style={{ marginBottom: 18 }}>
            {threat.relatedItems.length > 0 && (
              <div className="detail-item">
                <div className="dt-label">관련 점검 항목</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {threat.relatedItems.map((c) => (
                    <span key={c} className="badge cat" title={CHECK_ITEM_MAP[c]?.name ?? ''}>{c}{CHECK_ITEM_MAP[c] ? ` · ${CHECK_ITEM_MAP[c].name}` : ''}</span>
                  ))}
                </div>
              </div>
            )}
            {threat.tags.length > 0 && (
              <div className="detail-item">
                <div className="dt-label">태그</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {threat.tags.map((t) => <span key={t} className="tag-chip">#{t}</span>)}
                </div>
              </div>
            )}
            {threat.sourceUrl && (
              <div className="detail-item">
                <div className="dt-label">출처 링크</div>
                <div className="dt-value"><a href={threat.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-link" style={{ fontSize: 13 }}>{threat.source || '원문'} 바로가기 <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: 11 }} /></a></div>
              </div>
            )}
          </div>
        )}

        <div className="notice-body">{threat.body || '(내용 없음)'}</div>
      </div>

      {draft && <ThreatModal mode="edit" draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} saving={saving} />}
    </>
  )
}
