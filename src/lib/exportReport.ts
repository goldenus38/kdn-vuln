// ============================================
// 점검결과서 Excel(.xls) 출력 — 외부 의존성 없음
// HTML 테이블을 application/vnd.ms-excel Blob 으로 다운로드 (UTF-8 BOM, 한글 지원)
// ============================================

import type { Asset, Scan } from '../types'
import { CHECK_ITEM_MAP, CATEGORY_LABEL } from '../data/checkItems'
import { fmtDate } from '../components/ui'

const RESULT_LABEL: Record<string, string> = { Y: '양호', N: '취약', C: '수동확인' }

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 점검 1건을 .xls 로 다운로드 */
export function downloadScanExcel(scan: Scan, asset: Asset | null) {
  const rows = [...scan.results].sort((a, b) =>
    a.checkItem.localeCompare(b.checkItem, undefined, { numeric: true }),
  )

  const meta = `
    <tr><td colspan="6" style="font-size:16pt;font-weight:bold;">Linux 보안취약점 점검결과서</td></tr>
    <tr><td colspan="6">주요정보통신기반시설 보안상세가이드(2025.12) Unix U-01~U-67</td></tr>
    <tr></tr>
    <tr><th>호스트명</th><td>${esc(scan.hostname)}</td><th>IP</th><td>${esc(asset?.ip || '-')}</td><th>OS</th><td>${esc(asset ? `${asset.osType} ${asset.osVersion}` : '-')}</td></tr>
    <tr><th>부서</th><td>${esc(asset?.department || '-')}</td><th>담당자</th><td>${esc(asset?.owner || '-')}</td><th>점검일시</th><td>${esc(fmtDate(scan.scanDate))}</td></tr>
    <tr><th>전체</th><td>${scan.total}</td><th>취약</th><td>${scan.vulnCount}</td><th>양호율</th><td>${scan.score}%</td></tr>
    <tr><th>양호</th><td>${scan.goodCount}</td><th>수동확인</th><td>${scan.manualCount}</td><td colspan="2"></td></tr>
    <tr></tr>
  `

  const head = `<tr style="background:#1B2A4A;color:#fff;font-weight:bold;">
    <th>항목</th><th>점검 내용</th><th>분야</th><th>중요도</th><th>결과</th><th>상세</th></tr>`

  const body = rows.map((r) => {
    const m = CHECK_ITEM_MAP[r.checkItem]
    const color = r.result === 'N' ? '#C8102E' : r.result === 'C' ? '#D4760A' : '#00855A'
    return `<tr>
      <td>${esc(r.checkItem)}</td>
      <td>${esc(m?.name ?? r.message)}</td>
      <td>${esc(m ? CATEGORY_LABEL[m.category] : '-')}</td>
      <td>${esc(m?.severity ?? '-')}</td>
      <td style="color:${color};font-weight:bold;">${esc(RESULT_LABEL[r.result] ?? r.result)}</td>
      <td>${esc(r.detail)}</td>
    </tr>`
  }).join('')

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta http-equiv="content-type" content="text/plain; charset=UTF-8"/></head>
    <body><table border="1" cellspacing="0" cellpadding="4">${meta}${head}${body}</table></body></html>`

  const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${scan.hostname}_점검결과서_${scan.scanDate.slice(0, 10)}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
