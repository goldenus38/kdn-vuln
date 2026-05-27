import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../lib/db'
import type { Resource } from '../types'
import { useToast } from '../contexts/ToastContext'
import { Spinner, EmptyState, fmtDate, fmtBytes, fileIcon } from '../components/ui'

export default function ResourceDetail() {
  const { id = '' } = useParams()
  const { notify } = useToast()
  const nav = useNavigate()
  const [r, setR] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    db.getResource(id).then(setR).catch(() => setR(null)).finally(() => setLoading(false))
  }, [id])

  function download() {
    if (!r) return
    db.bumpResourceDownloads(r.id, r.downloads).catch(() => {})
    const a = document.createElement('a')
    a.href = r.fileUrl; a.download = r.fileName; a.target = '_blank'; a.rel = 'noopener'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  async function remove() {
    if (!r) return
    if (!confirm(`자료 '${r.title}' 을(를) 삭제할까요?`)) return
    await db.deleteResource(r)
    notify('삭제되었습니다.', 'success')
    nav('/resources')
  }

  if (loading) return <Spinner />
  if (!r) return <EmptyState icon="fa-triangle-exclamation">자료를 찾을 수 없습니다. <Link to="/resources">목록으로</Link></EmptyState>

  return (
    <>
      <div className="page-head">
        <div></div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={download}><i className="fa-solid fa-download" /> 다운로드</button>
          <button className="btn btn-secondary" onClick={remove}><i className="fa-solid fa-trash" /> 삭제</button>
          <Link to="/resources" className="btn btn-secondary"><i className="fa-solid fa-arrow-left" /> 목록</Link>
        </div>
      </div>

      <div className="card card-pad">
        <div className="notice-detail-head">
          <span className="badge cat">{r.category}</span>
          <h1>{r.title}</h1>
          <div className="notice-meta">
            <span><i className="fa-solid fa-user" /> {r.author}</span>
            <span><i className="fa-solid fa-clock" /> {fmtDate(r.createdAt)}</span>
            <span><i className="fa-solid fa-download" /> {r.downloads}회</span>
          </div>
        </div>

        <div
          onClick={download}
          className="card-pad"
          style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', cursor: 'pointer', marginBottom: 18 }}
        >
          <i className={`fa-solid ${fileIcon(r.fileName, r.mime)}`} style={{ fontSize: 30, color: 'var(--kdn-red)' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{r.fileName}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-light)' }}>{fmtBytes(r.fileSize)}{r.mime ? ` · ${r.mime}` : ''}</div>
          </div>
          <span className="btn btn-secondary btn-sm"><i className="fa-solid fa-download" /> 받기</span>
        </div>

        {r.description && <div className="notice-body">{r.description}</div>}
      </div>
    </>
  )
}
