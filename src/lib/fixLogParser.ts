// ============================================
// 조치(fix) 로그 파서
// security_vuln_fix_v1.0.sh 출력 형식:
//   ============================================================
//   [YYYY-MM-DD HH:MM:SS] Fix session started
//   OS: Rocky 8.10, Host: web-prod-01
//   Items: U-01 U-02 ...   (또는 all)
//   ============================================================
//   [YYYY-MM-DD HH:MM:SS] [FIX] U-01: root 원격 접속 제한
//   [YYYY-MM-DD HH:MM:SS]   [ACTION] Set PermitRootLogin no ...
//   [YYYY-MM-DD HH:MM:SS]   [RESULT] FIXED
// ============================================

import type { FixItem, FixResult, ParsedFix } from '../types'

export class FixParseError extends Error {}

// [time] [TAG] message  (FIX 헤더는 들여쓰기 없음, 상세는 들여쓰기 — \s+ 로 모두 수용)
const ENTRY_RE = /^\[([^\]]+)\]\s+\[([A-Z]+)\]\s*(.*)$/

function resultFromMessage(tag: string, msg: string): FixResult | null {
  if (tag === 'FAIL') return 'FAIL'
  if (tag !== 'RESULT' && tag !== 'MANUAL') return null
  // "REPORTED (manual action required)" 는 REPORTED 로 — REPORT 를 MANUAL 보다 먼저 판정
  const u = msg.toUpperCase()
  if (u.includes('FIXED')) return 'FIXED'
  if (u.includes('REPORT')) return 'REPORTED'
  if (u.includes('MANUAL')) return 'MANUAL'
  return null
}

export function parseFixLog(text: string): ParsedFix {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  let hostname = ''
  let fixDate = ''
  let itemsArg = ''
  const items: FixItem[] = []
  let current: FixItem | null = null

  for (const line of lines) {
    // 배너 정보
    if (!hostname) {
      const hm = line.match(/Host:\s*([^\s,]+)/)
      if (hm) hostname = hm[1]
    }
    if (!fixDate) {
      const sm = line.match(/^\[([^\]]+)\]\s+Fix session started/)
      if (sm) fixDate = sm[1]
    }
    if (!itemsArg) {
      const im = line.match(/^Items:\s*(.*)$/)
      if (im) itemsArg = im[1].trim()
    }

    const m = line.match(ENTRY_RE)
    if (!m) continue
    const [, time, tag, msg] = m

    if (tag === 'FIX') {
      const cm = msg.match(/^(U-\d+)\s*:?\s*(.*)$/i)
      current = {
        code: cm ? cm[1].toUpperCase() : msg.trim(),
        title: cm ? cm[2].trim() : '',
        result: 'UNKNOWN',
        actions: [],
      }
      items.push(current)
    } else if (current) {
      current.actions.push({ tag, message: msg, time })
      const r = resultFromMessage(tag, msg)
      if (r) current.result = r
    }
  }

  if (items.length === 0) {
    throw new FixParseError('유효한 조치 항목([FIX] U-xx)을 찾을 수 없습니다. 조치 스크립트 로그(_fix.log)인지 확인하세요.')
  }
  if (!hostname) hostname = 'unknown-host'
  if (!fixDate) fixDate = new Date().toISOString()

  return { hostname, fixDate, itemsArg, items }
}

/** 조치 항목 결과 집계 */
export function aggregateFix(items: FixItem[]) {
  const fixedCount = items.filter((i) => i.result === 'FIXED').length
  const reportedCount = items.filter((i) => i.result === 'REPORTED').length
  const manualCount = items.filter((i) => i.result === 'MANUAL').length
  const failCount = items.filter((i) => i.result === 'FAIL').length
  return { total: items.length, fixedCount, reportedCount, manualCount, failCount }
}
