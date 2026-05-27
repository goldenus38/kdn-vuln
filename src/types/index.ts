// ============================================
// KDN-VULN 도메인 타입
// 주요정보통신기반시설 보안상세가이드(2025.12) - Unix 서버
// ============================================

/** 점검 결과 코드: Y=양호, N=취약, C=수동확인 */
export type CheckResult = 'Y' | 'N' | 'C'

/** 중요도 (KISA 가이드 상/중/하) */
export type Severity = '상' | '중' | '하'

/** 점검 분야 */
export type Category = '계정관리' | '파일및디렉터리관리' | '서비스관리' | '패치관리' | '로그관리'

/** U-01 ~ U-67 점검 항목 마스터 */
export interface CheckItem {
  code: string            // 'U-01'
  name: string            // 'root 계정 원격 접속 제한'
  category: Category
  severity: Severity
  manualOnly: boolean     // 수동확인 항목 여부
}

/** 자산(점검 대상 서버) */
export interface Asset {
  id: string
  hostname: string
  ip: string
  osType: string          // CentOS / Rocky / Ubuntu ...
  osVersion: string
  department: string      // 소속/부서
  owner: string           // 담당자
  location: string        // 위치/구역
  note: string
  createdAt: string
}

/** CSV 한 줄 = 점검 항목 1건의 결과 */
export interface ScanResultRow {
  checkItem: string       // 'U-01'
  result: CheckResult     // Y/N/C
  detail: string          // check_detail
  message: string         // 항목 설명
  eventTime: string
}

/** 점검 세션 1건 (= CSV 파일 1개) */
export interface Scan {
  id: string
  assetId: string | null  // 매칭된 자산 (없으면 미등록 호스트)
  hostname: string        // CSV 의 host_name
  scanDate: string        // event_time (점검 일시)
  fileName: string
  uploadedAt: string
  uploadedBy: string
  total: number
  vulnCount: number       // N 개수
  goodCount: number       // Y 개수
  manualCount: number     // C 개수
  score: number           // 양호율 = Y / (Y+N) * 100 (C 제외)
  results: ScanResultRow[]
}

/** CSV 파싱 결과 */
export interface ParsedCsv {
  hostname: string
  scanDate: string
  rows: ScanResultRow[]
}

// ── 조치(fix) ──
/** 조치 결과 코드 */
export type FixResult = 'FIXED' | 'REPORTED' | 'MANUAL' | 'FAIL' | 'UNKNOWN'

/** 조치 항목의 상세 액션 1줄 */
export interface FixActionLine {
  tag: string        // ACTION/BACKUP/SKIP/WARN/RESULT/MANUAL/REPORT/INFO/FAIL
  message: string
  time: string
}

/** 조치 항목 1건 (U-xx 블록) */
export interface FixItem {
  code: string        // 'U-01'
  title: string       // FIX 헤더 제목
  result: FixResult
  actions: FixActionLine[]
}

/** 조치 실행 세션 1건 (= fix 로그 파일 1개) */
export interface FixRun {
  id: string
  assetId: string | null
  hostname: string
  fixDate: string         // 세션 시작 시각
  fileName: string
  uploadedAt: string
  itemsArg: string        // 'Items: ...' (대상 항목)
  total: number
  fixedCount: number      // FIXED
  reportedCount: number   // REPORTED
  manualCount: number     // MANUAL
  failCount: number       // FAIL
  items: FixItem[]
}

/** fix 로그 파싱 결과 */
export interface ParsedFix {
  hostname: string
  fixDate: string
  itemsArg: string
  items: FixItem[]
}

// ── 보안 공지사항 게시판 ──
export type NoticeCategory = '긴급' | '점검일정' | '패치권고' | '정책' | '일반'

export interface Notice {
  id: string
  category: NoticeCategory
  title: string
  body: string
  author: string
  pinned: boolean       // 상단 고정
  views: number
  createdAt: string
  updatedAt: string
}

// ── 보안 동향 · CVE 게시판 ──
export type CveSeverity = '긴급' | '높음' | '중간' | '낮음'

export interface Threat {
  id: string
  title: string
  cve: string             // 'CVE-2026-1234' (없으면 '')
  severity: CveSeverity
  source: string          // KISA / NVD / 벤더 등
  sourceUrl: string       // 출처 링크
  publishedDate: string   // 발표일 'YYYY-MM-DD' (없으면 '')
  tags: string[]
  relatedItems: string[]  // 관련 점검 항목 ['U-01', ...]
  body: string
  author: string
  views: number
  createdAt: string
  updatedAt: string
}

// ── 자료실 게시판 ──
export type ResourceCategory = '점검스크립트' | '가이드' | '체크리스트' | '조치매뉴얼' | '기타'

export interface Resource {
  id: string
  category: ResourceCategory
  title: string
  description: string
  fileName: string
  filePath: string      // Supabase Storage object path ('' = 로컬 data URL)
  fileUrl: string        // 공개 URL 또는 data URL
  fileSize: number
  mime: string
  author: string
  downloads: number
  createdAt: string
  updatedAt: string
}

export interface Toast {
  id: string
  type: 'info' | 'success' | 'error'
  message: string
}
