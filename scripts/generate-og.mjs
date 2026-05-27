// OG 카드 이미지(1200×630) 생성 — kdn-symbol 로고 + 한글 타이틀
// 실행: node scripts/generate-og.mjs  (결과: public/og-image.png)
import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'node:fs'

const W = 1200, H = 630
const logo = readFileSync(new URL('../public/kdn-symbol.png', import.meta.url)).toString('base64')
const logoHref = `data:image/png;base64,${logo}`
const FONT = "'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic','AppleGothic',sans-serif"

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F4F6FB"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="16" height="${H}" fill="#E2231A"/>
  <rect x="0" y="${H - 12}" width="${W}" height="12" fill="#1B2A4A"/>

  <!-- 우측 워터마크 로고 (옅게) -->
  <image href="${logoHref}" x="690" y="150" width="540" height="361" opacity="0.06" preserveAspectRatio="xMidYMid meet"/>

  <!-- 로고 -->
  <image href="${logoHref}" x="84" y="74" width="300" height="200" preserveAspectRatio="xMidYMid meet"/>

  <!-- 타이틀 -->
  <text x="86" y="408" font-family="${FONT}" font-size="92" font-weight="800" fill="#0F1B33" letter-spacing="-2">KDN-VULN</text>
  <rect x="90" y="430" width="250" height="7" rx="3" fill="#E2231A"/>
  <text x="86" y="500" font-family="${FONT}" font-size="42" font-weight="700" fill="#1B2A4A">취약점 진단 관리 시스템</text>
  <text x="86" y="552" font-family="${FONT}" font-size="25" font-weight="500" fill="#4A5A7C">주요정보통신기반시설 보안상세가이드(2025.12) · Linux 점검·조치·모니터링</text>
  <text x="86" y="592" font-family="${FONT}" font-size="22" font-weight="600" fill="#9FA0A0">바이브코딩 과정 실습</text>
</svg>`

const out = new URL('../public/og-image.png', import.meta.url)
await sharp(Buffer.from(svg)).png().toFile(out.pathname)
writeFileSync(new URL('../scripts/.og-debug.svg', import.meta.url), svg)
console.log('생성 완료: public/og-image.png (1200x630)')
