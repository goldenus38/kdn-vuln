# KDN-VULN 취약점 진단 관리 시스템 구축

> **날짜**: 2026-05-26 ~ 05-27
> **작업자**: Claude Opus 4.7 (1M context)
> **사이트**: https://goldenus38.github.io/kdn-vuln/
> **리포**: https://github.com/goldenus38/kdn-vuln
> **대상**: 사이버안전센터(CSC) 내 Linux 자산 서버

---

## 개요

주요정보통신기반시설 보안상세가이드(2025.12) **Unix 서버 U-01~U-67** 기반으로,
Linux 서버 보안취약점 **점검·조치·모니터링**을 관리하는 웹 시스템을 구축했다.

```
점검 쉘(.sh) → 사이버안전센터 자산 서버 실행 → 결과 CSV → 웹 수동 업로드 → 자산·취약점 현황 관리
```

디자인은 `kdn-main`(= aebonlee/kdn, kdn.dreamitbiz.com)의 navy 디자인 시스템을 **참조 전용**으로 계승했고,
점검 로직은 작업 디렉터리의 점검/조치 쉘 2종(`security_vuln_scan_v1.0.sh`, `security_vuln_fix_v1.0.sh`)을 분석해 데이터 모델의 기준으로 삼았다.

---

## 핵심 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| 프론트 | React 19 + Vite 7 + TS 5.8 | kdn-main과 동일 계열, 디자인 재사용 |
| 백엔드 | Supabase (PG + Auth) | kdn-main과 동일, 호스팅 나중 지정 |
| 폴백 | localStorage 이중 추상화 | Supabase 미설정 시에도 완전 동작 |
| 수집 | 웹 CSV 수동 업로드 | 망 환경 단순·안전 |
| 네트워크 | 일반 인터넷 | (운영화 시 재검토) |
| 라우팅 | HashRouter | GitHub Pages 서브경로(`/kdn-vuln/`) 안정성 |
| 배포 | GitHub Pages (gh-pages 브랜치) | kdn-main 선례 |

---

## 작업 내역

### 1. 저장소 연결
- 원격(거의 빈 저장소, README만)을 작업 디렉터리에 연결 — temp clone의 `.git`을 이식
- `.gitignore`: `kdn-main/`(디자인 참조 전용), `node_modules`, `dist`, `.env`, `*.tsbuildinfo`, `security_vuln_*.sh`(내부 정보 보호) 제외

### 2. 점검 스크립트 분석 → 데이터 모델
- 점검 CSV 출력 형식 파악:
  `"event_time","host_name","log_type","check_item","check_result","check_detail","message"`
  (check_result = `Y`양호 / `N`취약 / `C`수동확인, `"`는 `""`로 이스케이프)
- U-01~U-67 항목명을 스크립트에서 추출 → `src/data/checkItems.ts` 마스터(분야·중요도) 구성
  - 분야: 계정관리(U-01~13) / 파일·디렉터리(U-14~33) / 서비스(U-34~63) / 패치(U-64) / 로그(U-65~67)

### 3. 디자인 시스템 이식
- kdn-main의 navy 토큰을 추려 `base.css`(156L) + `dashboard.css`(263L)로 경량 재구성
- 마케팅 사이트가 아닌 **관리자 대시보드 레이아웃**(사이드바+상단바)으로 재설계, 다크/라이트 토글

### 4. 핵심 로직
| 파일 | 역할 |
|------|------|
| `lib/csvParser.ts` | RFC4180형 파서 + 집계(양호율) |
| `lib/supabase.ts` | env 있을 때만 클라이언트 생성 |
| `lib/db.ts` | Supabase ↔ localStorage 동일 API 추상화 |

### 5. 화면 (7 페이지 / 6 라우트)
- 대시보드, 자산 관리, 점검 결과(업로드/이력), 점검 상세, 취약점 현황, 점검 항목 기준, 로그인

### 6. 배포 (GitHub Pages)
- vite `base: '/kdn-vuln/'`(build), `gh-pages` 브랜치로 `dist` 게시
- Pages 소스를 `main` → `gh-pages` 브랜치로 변경

### 7. 테스트 데이터
- 10개 서버 가상 점검결과 CSV 생성(서버별 보안수준 차등, 이력본 2건 포함 = 12파일)
- 자산 관리에 "샘플 자산 등록" 버튼(시드) 추가

### 8. Supabase 연동
- `supabase/schema.sql`(assets/scans + RLS) 적용, publishable 키(`sb_publishable_…`, 신형식)로 `.env` 구성
- 빌드 시 번들 포함 → gh-pages 배포 (RLS 전제 하 공개 안전)

### 9. 로고/브랜딩
- 좌측 상단에 `kdn-symbol.png`(흰 배경 칩) 적용, 파비콘 동일
- 사이드바를 navy → 심볼 색상에 맞춰 **화이트 톤 + KDN 레드(`#E2231A`) 강조**로 변경

### 10. 평가 보고서
- `docs/site-evaluation.md` 작성 (aebonlee/kdn 형식 참고)

---

## 데이터 파이프라인 검증

| 단계 | 결과 |
|------|------|
| 파싱 | 샘플 12개 전수 통과, `""`·콤마·한글 무손실 |
| 집계 | 양호율 = Y/(Y+N), 수기 계산 일치 |
| 저장 | Supabase `scans.results`(JSONB) 67항목 무결성 보존 |
| 대시보드 | 최신 점검 10대 / 취약 135건 / 평균 양호율 76.7% (저장 데이터와 일치) |

> 앱 업로드 파이프라인(parse→aggregate→insert)을 CLI에서 재현해 Supabase 적재까지 교차 검증.

---

## 추가 개발 (확장 기능, 05-27)

### 11. 조치(fix) 이력 관리
- 조치 로그(`_fix.log`) 파서(`fixLogParser`): `[FIX] U-xx` 블록·`[RESULT]` 파싱(REPORTED>MANUAL 우선순위)
- `fixes` 테이블 + 업로드/목록/상세(항목별 ACTION·BACKUP·SKIP 드릴다운)
- **점검↔조치 연계**: 직전 점검에서 취약(N)했던 항목을 `취약→조치`로 표시
- 대시보드 "조치 실행" 통계 카드

### 12. 점검결과서 출력
- 인쇄용 보고서 페이지(`ScanReport`, `window.print` → PDF, 한글 지원) + Excel(.xls) 다운로드
- **외부 의존성 0** — SheetJS는 알려진 CVE가 있어 제외, HTML 테이블→Excel 방식(audit 클린)

### 13. 시계열 추이 그래프
- 의존성 없는 SVG `TrendChart` 자체 제작
- 대시보드 "일자별 평균 양호율 추이", 점검 상세 "호스트별 양호율 추이"

### 14. 중요도 등급 확정
- best-effort → 표준 KISA Unix 상세가이드 기준 확정 (6개 항목 보정). 분포: 상 43 / 중 16 / 하 8

### 15. 게시판 (메인 메뉴 확장)
사이드바에 **"게시판" 섹션** 신설, 2종 추가:

| 게시판 | 테이블 | 역할 | 주요 필드 |
|--------|--------|------|-----------|
| **보안 공지사항** | `notices` | 일방 전달(점검일정·긴급경보·패치권고·정책 공지) | 분류 5종, 상단고정(pinned), 조회수 |
| **보안 동향·CVE** | `threats` | 위협 인텔 아카이브(KISA 권고·신규 CVE 공유) | CVE번호, 심각도(긴급/높음/중간/낮음), 출처·링크, 태그, **관련 점검항목(U-xx) 연계** |
| **자료실** | `resources` + Storage | 점검 스크립트·가이드·체크리스트·매뉴얼 **파일 보관** | 파일 업로드/다운로드, 분류 5종, 크기·타입 아이콘, 다운로드수 |

- 공통: 목록/상세/작성·삭제(공지·동향은 수정 포함), 검색·분류 필터, 조회수
- **페이징**: 재사용 `Pagination` 컴포넌트, **페이지당 10건**(공공기관 게시판 관행·가독성)
- 대시보드 상단 "보안 공지" 카드(최근 4건) 연동
- 테이블 미생성 시에도 다른 화면이 동작하도록 방어 처리
- **자료실**: Supabase **Storage(`resources` 공개 버킷)** 연동 — 업로드/공개 URL 다운로드/삭제(스토리지 파일 동반 제거), 로컬 모드는 data URL 폴백. 외부 의존성 0
- 샘플: 공지 35건 / CVE 동향 11건(regreSSHion·XZ백도어·PwnKit 등 실제 CVE↔U-항목) / 자료 3건(체크리스트·가이드·매뉴얼)

### 16. UI 개선
- 좌측 상단 KDN 로고/브랜드를 `NavLink`로 감싸 클릭 시 대시보드(`/`) 이동 (호버 피드백, 모바일 사이드바 자동 닫힘)

### 17. 컬러 팔레트 전환
- 상단바 팔레트 버튼 → 6색(KDN레드/네이비/블루/그린/퍼플/오렌지) 팝오버 선택
- `data-color`로 `--primary`(버튼)·`--kdn-red`(강조) 전환, **의미색(취약/양호/수동·CVE 심각도·공지 분류)은 유지**
- 선택 localStorage 저장(`ThemeContext`에 color 상태 추가), 사이드바 활성 배경은 `color-mix`로 팔레트·라이트/다크 자동 적응. 기본값 KDN레드 = 기존 화면 동일

### 18. 추이 데이터 보강 + 점검결과 목록 정리
- 대시보드 추이 차트가 2점(04-21, 05-26)뿐이라, 주간 점검 이력 40건(04-28·05-05·05-12·05-19 × 10호스트) 추가 → 6점 상승 곡선(34.5→51.8→59.1→65.7→72.0→76.7%)
- 늘어난 이력으로 점검 결과 목록이 52건이 되어, **"자산별 최신"(기본, 호스트별 1건)/"전체 이력" 토글** 추가 — 데이터(추이용)는 유지하고 목록만 정리

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `git push` 거부 (workflow scope) | OAuth 토큰에 `workflow` 권한 없음 | Actions 워크플로 제외, `gh-pages` 브랜치 직접 배포로 전환 |
| Pages가 빈 화면 | 소스가 `main` 루트로 설정됨 | Pages 소스를 `gh-pages` 브랜치로 변경 + 재빌드 |
| 로그인 "Invalid login credentials" | 이메일 인증 필수(`mailer_autoconfirm:false`) + 계정/RLS | (사용자 요청) 로그인 게이트 제거 |
| 로그인 제거 후 데이터 안 보임 | RLS가 anon 차단 | RLS 정책 개방 시도 → 미반영 → `disable row level security`로 해결 |
| 신형 키 호환 | `sb_publishable_…` (구 `eyJ…` 아님) | supabase-js v2.96 정상 동작 확인 |

---

## 현재 상태 (2026-05-27)

- ✅ 라이브 배포: https://goldenus38.github.io/kdn-vuln/
- ✅ Supabase 6개 테이블 + Storage: assets(10) / scans(52, 주간이력 포함·자산별 최신 10) / fixes(3) / notices(35) / threats(11) / resources(3, +Storage 버킷)
- ✅ 화면: 대시보드·자산·점검결과·점검상세·점검결과서·조치이력·취약점현황·점검항목 + 게시판(공지·CVE·자료실)
- ⚠️ **보안: 테스트용 완화 상태** — 로그인 게이트 제거 + RLS 비활성 + 공개 호스팅 (운영 직전 일괄 원복 예정)

---

## 알려진 이슈 / 다음 단계

1. **(필수)** 운영 전 보안 원복 — 로그인 인증 복구(`Login.tsx` 보존됨) + RLS 재활성 + Storage 정책 `authenticated`로 조이기 + 비공개/내부망 배포
2. 수집 자동화 (서버 → API push, 현재는 수동 업로드)
3. 코드 스플리팅(번들 540KB↑) · 단위 테스트(파서/집계) · 반응형 보강
4. (선택) 조치 Q&A 게시판

> 완료됨: ✅조치 이력 ✅점검결과서(PDF/Excel) ✅추이 그래프 ✅중요도 확정 ✅게시판 3종(공지·CVE·자료실)+페이징

---

## 커밋 이력 (주요)

| 커밋 | 내용 |
|------|------|
| `feat: 기초 골격 구축` | 데이터모델·디자인·CSV업로드·대시보드 등 전체 골격 |
| `feat: KDN 심볼 로고 + 사이드바 컬러, 로그인 게이트 제거(임시)` | 브랜딩·로그인 제거 |
| `docs: 평가 보고서 추가` | site-evaluation.md |
| `docs: 개발일지 추가` | 본 문서 |
| `feat: 조치(fix) 이력 관리` | fix 로그 파서·이력·점검↔조치 연계 |
| `feat: 점검결과서 출력 + 추이 그래프 + 브랜드 텍스트` | PDF/Excel·SVG TrendChart |
| `feat: 중요도 등급 확정` | 표준 KISA 기준 6개 보정 |
| `feat: 보안 공지사항 게시판` + `공지 페이징(10건)` | notices, Pagination |
| `feat: 보안 동향·CVE 게시판` | threats, CVE↔U-항목 연계 |
| `feat: 자료실 게시판 (Supabase Storage)` | resources, 파일 업로드/다운로드 |
| `feat: 사이드바 로고 클릭 시 대시보드 이동` | UI 개선 |
| `feat: 컬러 팔레트 전환 기능` | 6색 테마, data-color |
| `feat: 점검 결과 목록 자산별 최신/전체 이력 토글` | 주간 이력 보강 + 목록 정리 |
