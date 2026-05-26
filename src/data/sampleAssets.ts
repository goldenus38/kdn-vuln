// ============================================
// 테스트용 샘플 자산 (samples/*.csv 의 host_name 과 일치)
// 자산 관리 화면의 '샘플 자산 등록' 버튼에서 사용 (개발/시연용)
// ============================================

import type { Asset } from '../types'

type SeedAsset = Omit<Asset, 'id' | 'createdAt'>

export const SAMPLE_ASSETS: SeedAsset[] = [
  { hostname: 'web-prod-01',  ip: '10.10.1.11', osType: 'Rocky',  osVersion: '8.10',  department: '대외서비스팀', owner: '김민수', location: '본관 IDC A-01', note: '대외 웹 프론트' },
  { hostname: 'web-prod-02',  ip: '10.10.1.12', osType: 'Rocky',  osVersion: '8.10',  department: '대외서비스팀', owner: '김민수', location: '본관 IDC A-02', note: '대외 웹 프론트(이중화)' },
  { hostname: 'db-prod-01',   ip: '10.10.2.21', osType: 'CentOS', osVersion: '7.9',   department: 'DB운영팀',    owner: '이정훈', location: '본관 IDC B-01', note: '운영 DB 주(主)' },
  { hostname: 'db-prod-02',   ip: '10.10.2.22', osType: 'CentOS', osVersion: '7.9',   department: 'DB운영팀',    owner: '이정훈', location: '본관 IDC B-02', note: '운영 DB 대기' },
  { hostname: 'app-prod-01',  ip: '10.10.3.31', osType: 'Ubuntu', osVersion: '22.04', department: '시스템개발팀', owner: '박서연', location: '본관 IDC A-11', note: '애플리케이션 서버' },
  { hostname: 'app-prod-02',  ip: '10.10.3.32', osType: 'Ubuntu', osVersion: '22.04', department: '시스템개발팀', owner: '박서연', location: '본관 IDC A-12', note: '애플리케이션 서버(이중화)' },
  { hostname: 'mail-prod-01', ip: '10.10.4.41', osType: 'Ubuntu', osVersion: '22.04', department: '인프라운영팀', owner: '최우진', location: '본관 IDC C-01', note: '메일 릴레이' },
  { hostname: 'dns-prod-01',  ip: '10.10.4.42', osType: 'Rocky',  osVersion: '8.10',  department: '인프라운영팀', owner: '최우진', location: '본관 IDC C-02', note: '내부 DNS' },
  { hostname: 'log-mgmt-01',  ip: '10.10.9.91', osType: 'Ubuntu', osVersion: '22.04', department: '보안관제팀',   owner: '정해린', location: '관제센터 D-01', note: '로그 수집/관제' },
  { hostname: 'bastion-01',   ip: '10.10.0.10', osType: 'Rocky',  osVersion: '8.10',  department: '보안관제팀',   owner: '정해린', location: '관제센터 D-02', note: '점프 호스트(Bastion)' },
]
