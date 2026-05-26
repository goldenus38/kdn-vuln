// ============================================
// 점검 CSV 파서
// 형식: "event_time","host_name","log_type","check_item","check_result","check_detail","message"
// - 모든 필드 큰따옴표, 필드 내 " 는 "" 로 이스케이프
// - 필드 안에 콤마/개행 포함 가능
// ============================================

import type { CheckResult, ParsedCsv, ScanResultRow } from '../types'

/** RFC4180 류 CSV 를 2차원 배열로 파싱 */
function parseCsvText(text: string): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  // BOM 제거
  const s = text.replace(/^﻿/, '')

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n' || ch === '\r') {
        // CRLF 처리: \r 다음 \n 은 건너뜀
        if (ch === '\r' && s[i + 1] === '\n') i++
        row.push(field)
        field = ''
        rows.push(row)
        row = []
      } else {
        field += ch
      }
    }
  }
  // 마지막 필드/행 flush
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

const VALID_RESULTS: CheckResult[] = ['Y', 'N', 'C']

export class CsvParseError extends Error {}

/** 점검 CSV 문자열을 파싱하여 호스트명·점검일·결과 행으로 변환 */
export function parseScanCsv(text: string): ParsedCsv {
  const matrix = parseCsvText(text).filter((r) => r.some((c) => c.trim() !== ''))
  if (matrix.length === 0) throw new CsvParseError('빈 파일입니다.')

  // 헤더 판별 (첫 행에 event_time 등이 있으면 헤더로 간주)
  let startIdx = 0
  const first = matrix[0].map((c) => c.trim().toLowerCase())
  if (first.includes('event_time') || first.includes('check_item')) {
    startIdx = 1
  }

  const rows: ScanResultRow[] = []
  let hostname = ''
  let scanDate = ''

  for (let i = startIdx; i < matrix.length; i++) {
    const cols = matrix[i]
    if (cols.length < 7) continue
    const [eventTime, host, , checkItem, result, detail, message] = cols.map((c) => c.trim())

    if (!/^U-\d+/i.test(checkItem)) continue
    const res = result.toUpperCase() as CheckResult
    if (!VALID_RESULTS.includes(res)) continue

    if (!hostname && host) hostname = host
    if (!scanDate && eventTime) scanDate = eventTime

    rows.push({
      checkItem: checkItem.toUpperCase(),
      result: res,
      detail,
      message,
      eventTime,
    })
  }

  if (rows.length === 0) {
    throw new CsvParseError('유효한 점검 결과(U-xx) 행을 찾을 수 없습니다. 점검 스크립트 출력 CSV 인지 확인하세요.')
  }
  if (!hostname) hostname = 'unknown-host'
  if (!scanDate) scanDate = new Date().toISOString()

  return { hostname, scanDate, rows }
}

/** 결과 행 배열에서 집계치 계산 */
export function aggregate(rows: ScanResultRow[]) {
  const vulnCount = rows.filter((r) => r.result === 'N').length
  const goodCount = rows.filter((r) => r.result === 'Y').length
  const manualCount = rows.filter((r) => r.result === 'C').length
  const denom = goodCount + vulnCount
  const score = denom === 0 ? 100 : Math.round((goodCount / denom) * 1000) / 10
  return { total: rows.length, vulnCount, goodCount, manualCount, score }
}
