import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Notice } from '../types'
import { useToast } from '../contexts/ToastContext'
import { NoticeCategoryBadge, Spinner, EmptyState, fmtDate } from '../components/ui'
import NoticeModal, { draftFrom, type NoticeDraft } from '../components/NoticeModal'

export default function NoticeDetail() {
  const { id = '' } = useParams()
  const { notify } = useToast()
  const nav = useNavigate()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<NoticeDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const bumped = useRef(false)

  useEffect(() => {
    db.getNotice(id).then((n) => {
      setNotice(n)
      if (n && !bumped.current) {
        bumped.current = true
        db.bumpNoticeViews(n.id, n.views).catch(() => {})
      }
    }).catch(() => setNotice(null)).finally(() => setLoading(false))
  }, [id])

  async function save() {
    if (!draft || !notice) return
    if (!draft.title.trim()) { notify('제목을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      await db.updateNotice(notice.id, draft)
      notify('수정했습니다.', 'success')
      setDraft(null)
      setNotice(await db.getNotice(notice.id))
    } catch (e) {
      notify(e instanceof Error ? e.message : '저장 실패', 'error')
    } finally { setSaving(false) }
  }

  async function remove() {
    if (!notice) return
    if (!confirm(`공지 '${notice.title}' 을(를) 삭제할까요?`)) return
    await db.deleteNotice(notice.id)
    notify('삭제되었습니다.', 'success')
    nav('/notices')
  }

  if (loading) return <Spinner />
  if (!notice) return <EmptyState icon="fa-triangle-exclamation">공지를 찾을 수 없습니다. <Link to="/notices">목록으로</Link></EmptyState>

  return (
    <>
      <div className="page-head">
        <div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setDraft(draftFrom(notice))}><i className="fa-solid fa-pen" /> 수정</button>
          <button className="btn btn-secondary" onClick={remove}><i className="fa-solid fa-trash" /> 삭제</button>
          <Link to="/notices" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" /> 목록</Link>
        </div>
      </div>

      <div className="card card-pad">
        <div className="notice-detail-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NoticeCategoryBadge category={notice.category} />
            {notice.pinned && <span className="badge cat"><i className="fa-solid fa-thumbtack" style={{ color: 'var(--kdn-red)' }} /> 고정</span>}
          </div>
          <h1>{notice.title}</h1>
          <div className="notice-meta">
            <span><i className="fa-solid fa-user" /> {notice.author}</span>
            <span><i className="fa-solid fa-clock" /> {fmtDate(notice.createdAt)}</span>
            {notice.updatedAt !== notice.createdAt && <span>(수정 {fmtDate(notice.updatedAt)})</span>}
            <span><i className="fa-solid fa-eye" /> {notice.views}</span>
          </div>
        </div>
        <div className="notice-body">{notice.body || '(내용 없음)'}</div>
      </div>

      {draft && (
        <NoticeModal mode="edit" draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} saving={saving} />
      )}
    </>
  )
}
