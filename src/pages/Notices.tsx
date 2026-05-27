import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import type { Notice, NoticeCategory } from '../types'
import { useToast } from '../contexts/ToastContext'
import { NoticeCategoryBadge, Spinner, EmptyState, fmtDate } from '../components/ui'
import NoticeModal, { emptyDraft, type NoticeDraft } from '../components/NoticeModal'
import Pagination from '../components/Pagination'

const CATS: NoticeCategory[] = ['긴급', '점검일정', '패치권고', '정책', '일반']
const PAGE_SIZE = 10

export default function Notices() {
  const { notify } = useToast()
  const nav = useNavigate()
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('ALL')
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<NoticeDraft | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    try {
      setNotices(await db.listNotices())
    } catch {
      notify('공지 테이블이 아직 없습니다. Supabase 마이그레이션을 실행하세요.', 'error')
      setNotices([])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    return notices.filter((n) => {
      if (cat !== 'ALL' && n.category !== cat) return false
      if (k && !(n.title.toLowerCase().includes(k) || n.body.toLowerCase().includes(k))) return false
      return true
    })
  }, [notices, q, cat])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  )
  // 검색/필터 변경 시 1페이지로
  useEffect(() => { setPage(1) }, [q, cat])

  async function save() {
    if (!draft) return
    if (!draft.title.trim()) { notify('제목을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      await db.createNotice(draft)
      notify('공지를 등록했습니다.', 'success')
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
        <div><h1>보안 공지사항</h1><div className="page-sub">점검 일정·취약점 경보·패치 권고·정책 공지 · 총 {notices.length}건</div></div>
        <button className="btn btn-primary" onClick={() => setDraft(emptyDraft())}><i className="fa-solid fa-pen" /> 공지 작성</button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="제목·내용 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="ALL">전체 분류</option>
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="fa-bullhorn">{notices.length === 0 ? '등록된 공지가 없습니다. 공지를 작성하세요.' : '검색 결과가 없습니다.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th style={{ width: 96 }}>분류</th><th>제목</th><th style={{ width: 110 }}>작성자</th><th style={{ width: 140 }}>작성일</th><th className="col-center" style={{ width: 70 }}>조회</th></tr>
              </thead>
              <tbody>
                {pageItems.map((n) => (
                  <tr key={n.id} className="clickable notice-row" onClick={() => nav(`/notices/${n.id}`)}>
                    <td><NoticeCategoryBadge category={n.category} /></td>
                    <td className="nt-title">{n.pinned && <i className="fa-solid fa-thumbtack pin" title="고정" />}{n.title}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{n.author}</td>
                    <td style={{ color: 'var(--text-light)', fontSize: 12.5 }}>{fmtDate(n.createdAt)}</td>
                    <td className="col-center" style={{ color: 'var(--text-light)' }}>{n.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {draft && (
        <NoticeModal mode="create" draft={draft} onChange={setDraft} onClose={() => setDraft(null)} onSave={save} saving={saving} />
      )}
    </>
  )
}
