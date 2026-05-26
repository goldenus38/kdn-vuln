# kdn-vuln — 취약점 진단 관리 시스템

주요정보통신기반시설 보안상세가이드(2025.12) **Unix 서버(U-01~U-67)** 기반 Linux 서버 보안취약점
**점검 · 조치 · 모니터링** 관리 웹 시스템.

```
점검 쉘(.sh) → 대상 Linux 서버에서 실행 → 결과 CSV → 웹 업로드 → 자산·취약점 현황 관리
```

## 구성

| 구분 | 내용 |
|---|---|
| 프런트 | React 19 + TypeScript + Vite |
| 백엔드 | Supabase (Postgres + Auth) — *미설정 시 브라우저 localStorage 폴백* |
| 수집 | 웹 UI에서 점검 CSV 수동 업로드 → 파싱 → 저장 |
| 점검 스크립트 | `security_vuln_scan_v1.0.sh` (점검), `security_vuln_fix_v1.0.sh` (조치) |

## 점검 CSV 형식

점검 스크립트가 `/var/log/vulncheck/YYYY/MM/HOST/HOST-security_check-YYYYMMDD.csv` 로 출력:

```
"event_time","host_name","log_type","check_item","check_result","check_detail","message"
```

`check_result` = `Y`(양호) / `N`(취약) / `C`(수동확인)

## 실행

```bash
npm install
npm run dev      # http://localhost:5175
npm run build    # 타입체크 + 프로덕션 빌드
```

샘플 점검 CSV: `samples/` — 점검 결과 화면에서 업로드해 동작을 확인할 수 있습니다.

### 로컬 미리보기 모드 (Supabase 미설정)

env가 없으면 데이터가 브라우저 localStorage 에만 저장됩니다. 기본 관리자 계정:

```
admin@kdn-vuln.local / admin1234
```

## Supabase 연결 (호스팅 확정 후)

1. Supabase 프로젝트 생성 후 `supabase/schema.sql` 을 SQL Editor 에서 실행
2. `.env.example` → `.env` 복사 후 값 입력
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Authentication > Users 에서 운영자 계정(이메일/비밀번호) 추가
4. 재시작하면 자동으로 Supabase 모드로 전환

## 화면

- **대시보드** — 자산/취약점 집계, 취약 다발 항목·분야별 분포, 최근 점검
- **자산 관리** — 서버 등록/수정/삭제, 최근 점검 양호율
- **점검 결과** — CSV 업로드(드래그&드롭, 다중), 점검 이력, 항목별 상세
- **취약점 현황** — U-항목별 취약 자산 분포 (중요도/분야 필터)
- **점검 항목 기준** — U-01~67 마스터(분야·중요도)

## 프로젝트 구조

```
src/
  data/checkItems.ts   U-01~67 마스터 (항목명·분야·중요도)
  lib/csvParser.ts     점검 CSV 파서 + 집계
  lib/supabase.ts      Supabase 클라이언트(env 있을 때만)
  lib/db.ts            데이터 레이어 (Supabase ↔ localStorage 추상화)
  contexts/            Theme / Auth / Toast
  components/          Layout, 공용 UI
  pages/               Dashboard, Assets, Scans, ScanDetail, Vulnerabilities, CheckItems, Login
supabase/schema.sql    DB 스키마
```

> `kdn-main/` 은 디자인 참조용이며 저장소에 포함하지 않습니다(.gitignore).
