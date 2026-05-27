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
- ✅ Supabase 연결: assets 10 / scans 12 저장 확인
- ✅ 코드 규모: TS/TSX 1,727L + CSS 421L, 번들 JS 486KB(gzip 140KB)
- ⚠️ **보안: 테스트용 완화 상태** — 로그인 게이트 제거 + RLS 비활성 + 공개 호스팅

---

## 알려진 이슈 / 다음 단계

1. **(필수)** 운영 전 보안 원복 — 로그인 인증 복구(`Login.tsx` 보존됨) + RLS 재활성 + 비공개/내부망 배포
2. 조치(fix) 이력 관리 (`_fix.log` 수집, 점검↔조치 연계)
3. 점검결과서 내보내기(PDF/Excel)
4. 시계열 추이/개선율 그래프
5. 수집 자동화(API push), 중요도(상/중/하) 가이드 실제 등급 확정
6. 코드 스플리팅 · 단위 테스트(파서/집계) · 반응형 보강

---

## 커밋 이력 (주요)

| 커밋 | 내용 |
|------|------|
| `feat: 기초 골격 구축` | 데이터모델·디자인·CSV업로드·대시보드 등 전체 골격 |
| `feat: KDN 심볼 로고 + 사이드바 컬러, 로그인 게이트 제거(임시)` | 브랜딩·로그인 제거 |
| `docs: 평가 보고서 추가` | site-evaluation.md |
| `docs: 개발일지 추가` | 본 문서 |
