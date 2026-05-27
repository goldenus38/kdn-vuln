import type { Notice, NoticeCategory } from '../types'

const CATEGORIES: NoticeCategory[] = ['긴급', '점검일정', '패치권고', '정책', '일반']

export interface NoticeDraft {
  category: NoticeCategory
  title: string
  body: string
  author: string
  pinned: boolean
}

export function emptyDraft(): NoticeDraft {
  return { category: '일반', title: '', body: '', author: '관리자', pinned: false }
}
export function draftFrom(n: Notice): NoticeDraft {
  return { category: n.category, title: n.title, body: n.body, author: n.author, pinned: n.pinned }
}

export default function NoticeModal({
  mode, draft, onChange, onClose, onSave, saving,
}: {
  mode: 'create' | 'edit'
  draft: NoticeDraft
  onChange: (d: NoticeDraft) => void
  onClose: () => void
  onSave: () => void
  saving: boolean
}) {
  const set = (p: Partial<NoticeDraft>) => onChange({ ...draft, ...p })
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-head">
          <h2>{mode === 'create' ? '공지 작성' : '공지 수정'}</h2>
          <button className="icon-btn" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-row">
              <div className="field"><label>분류</label>
                <select value={draft.category} onChange={(e) => set({ category: e.target.value as NoticeCategory })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>작성자</label>
                <input value={draft.author} onChange={(e) => set({ author: e.target.value })} />
              </div>
            </div>
            <div className="field"><label>제목 *</label>
              <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="공지 제목" />
            </div>
            <div className="field"><label>내용</label>
              <textarea rows={9} value={draft.body} onChange={(e) => set({ body: e.target.value })} placeholder="공지 내용을 입력하세요" />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.pinned} onChange={(e) => set({ pinned: e.target.checked })} /> 상단 고정
            </label>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </div>
    </div>
  )
}
