import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../lib/db'
import type { Resource, ResourceCategory } from '../types'
import { useToast } from '../contexts/ToastContext'
import { Spinner, EmptyState, fmtDate, fmtBytes, fileIcon } from '../components/ui'
import Pagination from '../components/Pagination'

const CATS: ResourceCategory[] = ['점검스크립트', '가이드', '체크리스트', '조치매뉴얼', '기타']
const PAGE_SIZE = 10

interface UploadDraft { category: ResourceCategory; title: string; description: string; author: string; file: File | null }

export default function Resources() {
  const { notify } = useToast()
  const nav = useNavigate()
  const [items, setItems] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('ALL')
  const [page, setPage] = useState(1)
  const [draft, setDraft] = useState<UploadDraft | null>(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    try { setItems(await db.listResources()) }
    catch { notify('자료실 테이블이 아직 없습니다. Supabase 마이그레이션을 실행하세요.', 'error'); setItems([]) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    return items.filter((r) => {
      if (cat !== 'ALL' && r.category !== cat) return false
      if (k && !(r.title.toLowerCase().includes(k) || r.fileName.toLowerCase().includes(k) || r.description.toLowerCase().includes(k))) return false
      return true
    })
  }, [items, q, cat])
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page])
  useEffect(() => { setPage(1) }, [q, cat])

  function pickFile(f: File) {
    setDraft((d) => ({
      category: d?.category ?? '가이드',
      title: d?.title || f.name.replace(/\.[^.]+$/, ''),
      description: d?.description ?? '',
      author: d?.author ?? '관리자',
      file: f,
    }))
  }

  async function save() {
    if (!draft) return
    if (!draft.file) { notify('업로드할 파일을 선택하세요.', 'error'); return }
    if (!draft.title.trim()) { notify('제목을 입력하세요.', 'error'); return }
    setSaving(true)
    try {
      const { filePath, fileUrl } = await db.uploadResourceFile(draft.file)
      await db.createResource({
        category: draft.category, title: draft.title, description: draft.description,
        fileName: draft.file.name, filePath, fileUrl, fileSize: draft.file.size,
        mime: draft.file.type, author: draft.author,
      })
      notify('자료를 업로드했습니다.', 'success')
      setDraft(null)
      await load()
    } catch (e) {
      notify(e instanceof Error ? e.message : '업로드 실패', 'error')
    } finally { setSaving(false) }
  }

  async function download(r: Resource) {
    db.bumpResourceDownloads(r.id, r.downloads).catch(() => {})
    const a = document.createElement('a')
    a.href = r.fileUrl; a.download = r.fileName; a.target = '_blank'; a.rel = 'noopener'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  async function remove(r: Resource) {
    if (!confirm(`자료 '${r.title}' 을(를) 삭제할까요?`)) return
    await db.deleteResource(r)
    notify('삭제되었습니다.', 'success')
    await load()
  }

  if (loading) return <Spinner />

  return (
    <>
      <div className="page-head">
        <div><h1>자료실</h1><div className="page-sub">점검 스크립트·가이드·체크리스트·조치 매뉴얼 보관 · 총 {items.length}건</div></div>
        <button className="btn btn-primary" onClick={() => setDraft({ category: '가이드', title: '', description: '', author: '관리자', file: null })}>
          <i className="fa-solid fa-upload" /> 자료 등록
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <i className="fa-solid fa-magnifying-glass" />
          <input placeholder="제목·파일명·설명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="ALL">전체 분류</option>
          {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon="fa-folder-open">{items.length === 0 ? '등록된 자료가 없습니다. 자료를 등록하세요.' : '검색 결과가 없습니다.'}</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th style={{ width: 92 }}>분류</th><th>제목 / 파일</th><th style={{ width: 80 }}>크기</th><th style={{ width: 110 }}>등록일</th><th className="col-center" style={{ width: 64 }}>다운</th><th style={{ width: 120 }}></th></tr>
              </thead>
              <tbody>
                {pageItems.map((r) => (
                  <tr key={r.id} className="notice-row">
                    <td><span className="badge cat">{r.category}</span></td>
                    <td>
                      <div className="nt-title clickable" onClick={() => nav(`/resources/${r.id}`)}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-light)' }}><i className={`fa-solid ${fileIcon(r.fileName, r.mime)}`} /> {r.fileName}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>{fmtBytes(r.fileSize)}</td>
                    <td style={{ color: 'var(--text-light)', fontSize: 12.5 }}>{fmtDate(r.createdAt).slice(0, 10)}</td>
                    <td className="col-center" style={{ color: 'var(--text-light)' }}>{r.downloads}</td>
                    <td className="col-right" style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => download(r)} title="다운로드"><i className="fa-solid fa-download" /></button>{' '}
                      <button className="btn btn-secondary btn-sm" onClick={() => remove(r)} title="삭제"><i className="fa-solid fa-trash" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      {draft && (
        <div className="modal-overlay" onClick={() => !saving && setDraft(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>자료 등록</h2>
              <button className="icon-btn" onClick={() => setDraft(null)}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div
                  className="dropzone"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) pickFile(e.dataTransfer.files[0]) }}
                  style={{ padding: 24 }}
                >
                  <input ref={fileRef} type="file" hidden onChange={(e) => { if (e.target.files?.[0]) pickFile(e.target.files[0]) }} />
                  <div><i className={`fa-solid ${draft.file ? fileIcon(draft.file.name, draft.file.type) : 'fa-cloud-arrow-up'}`} /></div>
                  {draft.file
                    ? <><div className="dz-title">{draft.file.name}</div><div className="dz-sub">{fmtBytes(draft.file.size)} · 클릭하여 변경</div></>
                    : <><div className="dz-title">파일 선택</div><div className="dz-sub">클릭하거나 끌어다 놓기</div></>}
                </div>
                <div className="form-row">
                  <div className="field"><label>분류</label>
                    <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as ResourceCategory })}>
                      {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>작성자</label>
                    <input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} />
                  </div>
                </div>
                <div className="field"><label>제목 *</label>
                  <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="자료 제목" />
                </div>
                <div className="field"><label>설명</label>
                  <textarea rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setDraft(null)} disabled={saving}>취소</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '업로드 중…' : '업로드'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
