import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public/designs/fall-2026');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 9 Fall 2026 Designs with Product-Specific Print Areas
// Tees: 3951x4800 (Bella+Canvas 3001)
// Mugs: 1275x1155 (11oz Ceramic Mug)
// Posters: 5400x7200 (18x24 Archival Matte Poster @ 300 DPI)
const designs = [
  // ==========================================
  // TEES: 3951 x 4800 px
  // ==========================================

  // 1. Halloween: Boo Crew (Tee)
  {
    slug: 'boo-crew',
    title: 'Boo Crew',
    category: 'tee',
    width: 3951,
    height: 4800,
    previewWidth: 988,
    previewHeight: 1200,
    svg: `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-boo" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#2e1065" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="pumpkin-grad-1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF9233"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
    <linearGradient id="text-grad-boo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF7ED"/>
      <stop offset="100%" stop-color="#FED7AA"/>
    </linearGradient>
  </defs>

  <!-- Stars & Bats -->
  <g fill="#FBBF24" opacity="0.95">
    <path d="M 650,900 L 685,995 L 780,1030 L 685,1065 L 650,1160 L 615,1065 L 520,1030 L 615,995 Z" />
    <path d="M 3300,950 L 3330,1020 L 3410,1050 L 3330,1080 L 3300,1150 L 3270,1080 L 3190,1050 L 3270,1020 Z" />
    <path d="M 1975,420 L 1995,480 L 2055,500 L 1995,520 L 1975,580 L 1955,520 L 1895,500 L 1955,480 Z" />
    <circle cx="880" cy="1300" r="22" />
    <circle cx="3080" cy="1350" r="26" />
    <circle cx="1100" cy="720" r="18" />
    <circle cx="2850" cy="750" r="20" />
  </g>

  <!-- Flying Bats -->
  <g fill="#4338CA">
    <path d="M 820,620 Q 900,560 980,630 Q 940,655 900,645 Q 865,655 820,620 Z" />
    <path d="M 2970,570 Q 3060,500 3150,580 Q 3105,605 3060,595 Q 3015,605 2970,570 Z" />
  </g>

  <!-- Main "BOO CREW" Typography -->
  <g filter="url(#shadow-boo)">
    <text x="1975" y="980" font-family="'Impact', 'Arial Black', sans-serif" font-size="390" font-weight="900" fill="#3B0764" text-anchor="middle" letter-spacing="18">BOO CREW</text>
    <text x="1975" y="960" font-family="'Impact', 'Arial Black', sans-serif" font-size="390" font-weight="900" fill="#EA580C" text-anchor="middle" letter-spacing="18">BOO CREW</text>
    <text x="1975" y="940" font-family="'Impact', 'Arial Black', sans-serif" font-size="390" font-weight="900" fill="url(#text-grad-boo)" text-anchor="middle" letter-spacing="18" stroke="#431407" stroke-width="14">BOO CREW</text>
  </g>

  <!-- Ghost Trio -->
  <!-- Ghost 1 (Left) -->
  <g transform="translate(680, 1300) rotate(-10)" filter="url(#shadow-boo)">
    <path d="M 330,110 C 160,110 110,330 110,600 C 110,820 160,930 220,880 C 270,830 300,940 370,880 C 440,830 490,940 550,880 C 600,830 640,710 640,600 C 640,330 500,110 330,110 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="12" />
    <ellipse cx="310" cy="440" rx="30" ry="46" fill="#1E293B" />
    <ellipse cx="440" cy="440" rx="30" ry="46" fill="#1E293B" />
    <circle cx="300" cy="425" r="11" fill="#FFFFFF" />
    <circle cx="430" cy="425" r="11" fill="#FFFFFF" />
    <ellipse cx="270" cy="495" rx="26" ry="16" fill="#FDA4AF" opacity="0.85" />
    <ellipse cx="485" cy="495" rx="26" ry="16" fill="#FDA4AF" opacity="0.85" />
    <path d="M 350,495 Q 375,540 400,495" fill="none" stroke="#1E293B" stroke-width="14" stroke-linecap="round" />
  </g>

  <!-- Ghost 2 (Center Hero Ghost) -->
  <g transform="translate(1580, 1200)" filter="url(#shadow-boo)">
    <path d="M 390,90 C 200,90 130,360 130,690 C 130,950 200,1060 270,1000 C 340,950 390,1070 460,1000 C 530,940 580,1070 650,1000 C 715,940 760,840 760,690 C 760,360 580,90 390,90 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="14" />
    <ellipse cx="350" cy="470" rx="38" ry="56" fill="#0F172A" />
    <ellipse cx="510" cy="470" rx="38" ry="56" fill="#0F172A" />
    <circle cx="336" cy="448" r="13" fill="#FFFFFF" />
    <circle cx="496" cy="448" r="13" fill="#FFFFFF" />
    <ellipse cx="295" cy="540" rx="34" ry="18" fill="#FDA4AF" opacity="0.9" />
    <ellipse cx="570" cy="540" rx="34" ry="18" fill="#FDA4AF" opacity="0.9" />
    <path d="M 380,540 Q 430,620 480,540 Z" fill="#0F172A" />
  </g>

  <!-- Ghost 3 (Right) -->
  <g transform="translate(2470, 1340) rotate(12)" filter="url(#shadow-boo)">
    <path d="M 330,110 C 160,110 110,330 110,600 C 110,820 160,930 220,880 C 270,830 300,940 370,880 C 440,830 490,940 550,880 C 600,830 640,710 640,600 C 640,330 500,110 330,110 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="12" />
    <ellipse cx="300" cy="440" rx="30" ry="46" fill="#1E293B" />
    <ellipse cx="430" cy="440" rx="30" ry="46" fill="#1E293B" />
    <circle cx="290" cy="425" r="11" fill="#FFFFFF" />
    <circle cx="420" cy="425" r="11" fill="#FFFFFF" />
    <ellipse cx="255" cy="495" rx="26" ry="16" fill="#FDA4AF" opacity="0.85" />
    <ellipse cx="475" cy="495" rx="26" ry="16" fill="#FDA4AF" opacity="0.85" />
    <path d="M 280,440 Q 300,410 320,440" fill="none" stroke="#1E293B" stroke-width="16" stroke-linecap="round" />
    <path d="M 350,495 Q 375,540 400,495" fill="none" stroke="#1E293B" stroke-width="14" stroke-linecap="round" />
  </g>

  <!-- Big Jack-o-Lantern Center Foreground -->
  <g transform="translate(1480, 2450)" filter="url(#shadow-boo)">
    <path d="M 460,165 Q 440,45 530,22 Q 520,135 495,165 Z" fill="#15803D" stroke="#14532D" stroke-width="9" />
    <ellipse cx="495" cy="530" rx="465" ry="375" fill="url(#pumpkin-grad-1)" stroke="#9A3412" stroke-width="16" />
    <ellipse cx="350" cy="530" rx="285" ry="355" fill="url(#pumpkin-grad-1)" opacity="0.7" />
    <ellipse cx="640" cy="530" rx="285" ry="355" fill="url(#pumpkin-grad-1)" opacity="0.7" />
    <polygon points="310,455 385,365 420,465" fill="#FEF08A" stroke="#B45309" stroke-width="7" />
    <polygon points="575,465 610,365 685,455" fill="#FEF08A" stroke="#B45309" stroke-width="7" />
    <polygon points="495,495 460,550 530,550" fill="#FEF08A" />
    <path d="M 275,630 Q 495,795 715,630 Q 640,730 605,665 L 585,710 L 530,655 L 465,710 L 410,655 L 375,710 Z" fill="#FEF08A" stroke="#B45309" stroke-width="9" />
  </g>

  <!-- Banner at Bottom: "SPOOKY SEASON • 2026" -->
  <g transform="translate(1975, 4100)">
    <rect x="-800" y="-90" width="1600" height="180" rx="90" fill="#3B0764" stroke="#FBBF24" stroke-width="10" filter="url(#shadow-boo)" />
    <text x="0" y="28" font-family="'Trebuchet MS', 'Segoe UI', sans-serif" font-size="88" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="10">SPOOKY SEASON • 2026</text>
  </g>
</svg>
`
  },

  // 2. Fall: Sweater Weather (Tee)
  {
    slug: 'sweater-weather',
    title: 'Sweater Weather',
    category: 'tee',
    width: 3951,
    height: 4800,
    previewWidth: 988,
    previewHeight: 1200,
    svg: `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-sw" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#064e3b" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Cable-knit Border Ring -->
  <g filter="url(#shadow-sw)">
    <circle cx="1975" cy="2250" r="1550" fill="none" stroke="#E2E8F0" stroke-width="45" stroke-dasharray="32 22" opacity="0.8" />
    <circle cx="1975" cy="2250" r="1470" fill="none" stroke="#047857" stroke-width="18" />
  </g>

  <!-- Cozy Mittens Illustration Center -->
  <g transform="translate(1975, 2100)" filter="url(#shadow-sw)">
    <!-- Left Mitten -->
    <g transform="translate(-260, 0) rotate(-18)" fill="#D97706" stroke="#92400E" stroke-width="14">
      <rect x="-150" y="240" width="300" height="150" rx="32" fill="#B45309" />
      <line x1="-100" y1="240" x2="-100" y2="390" stroke="#78350F" stroke-width="9" />
      <line x1="0" y1="240" x2="0" y2="390" stroke="#78350F" stroke-width="9" />
      <line x1="100" y1="240" x2="100" y2="390" stroke="#78350F" stroke-width="9" />
      <path d="M -140,240 C -160,55 -110,-270 0,-300 C 110,-270 160,55 140,240 Z" />
      <path d="M -120,85 C -240,55 -260,-90 -200,-130 C -130,-160 -100,-45 -100,85 Z" />
      <path d="M 0,-65 Q -55,-140 -110,-65 Q -55,55 0,110 Q 55,55 110,-65 Q 55,-140 0,-65 Z" fill="#FFFBEB" stroke="#B45309" stroke-width="7" />
    </g>

    <!-- Right Mitten -->
    <g transform="translate(260, 0) rotate(18)" fill="#059669" stroke="#064E3B" stroke-width="14">
      <rect x="-150" y="240" width="300" height="150" rx="32" fill="#047857" />
      <line x1="-100" y1="240" x2="-100" y2="390" stroke="#064E3B" stroke-width="9" />
      <line x1="0" y1="240" x2="0" y2="390" stroke="#064E3B" stroke-width="9" />
      <line x1="100" y1="240" x2="100" y2="390" stroke="#064E3B" stroke-width="9" />
      <path d="M -140,240 C -160,55 -110,-270 0,-300 C 110,-270 160,55 140,240 Z" />
      <path d="M 120,85 C 240,55 260,-90 200,-130 C 130,-160 100,-45 100,85 Z" />
      <path d="M 0,-65 Q -55,-140 -110,-65 Q -55,55 0,110 Q 55,55 110,-65 Q 55,-140 0,-65 Z" fill="#FFFBEB" stroke="#064E3B" stroke-width="7" />
    </g>
  </g>

  <!-- Curved / Script Top "SWEATER" -->
  <g filter="url(#shadow-sw)">
    <text x="1975" y="980" font-family="'Impact', 'Arial Black', sans-serif" font-size="390" font-weight="900" fill="#064E3B" text-anchor="middle" letter-spacing="22">SWEATER</text>
    <text x="1975" y="960" font-family="'Impact', 'Arial Black', sans-serif" font-size="390" font-weight="900" fill="#059669" text-anchor="middle" letter-spacing="22">SWEATER</text>
    <text x="1975" y="940" font-family="'Impact', 'Arial Black', sans-serif" font-size="390" font-weight="900" fill="#ECFDF5" text-anchor="middle" letter-spacing="22" stroke="#064E3B" stroke-width="12">SWEATER</text>
  </g>

  <!-- Big Cursive Bottom "Weather" -->
  <g filter="url(#shadow-sw)">
    <text x="1975" y="3550" font-family="'Brush Script MT', 'Palatino', cursive" font-size="490" font-style="italic" font-weight="bold" fill="#78350F" text-anchor="middle">Weather</text>
    <text x="1975" y="3530" font-family="'Brush Script MT', 'Palatino', cursive" font-size="490" font-style="italic" font-weight="bold" fill="#D97706" text-anchor="middle">Weather</text>
    <text x="1975" y="3510" font-family="'Brush Script MT', 'Palatino', cursive" font-size="490" font-style="italic" font-weight="bold" fill="#FEF3C7" text-anchor="middle">Weather</text>
  </g>

  <!-- Subtitle -->
  <text x="1975" y="4150" font-family="'Trebuchet MS', sans-serif" font-size="90" font-weight="900" fill="#047857" text-anchor="middle" letter-spacing="16">COZY UP &amp; STAY WARM • AUTUMN 2026</text>
</svg>
`
  },

  // 3. Thanksgiving: Feast Mode (Tee)
  {
    slug: 'feast-mode',
    title: 'Feast Mode',
    category: 'tee',
    width: 3951,
    height: 4800,
    previewWidth: 988,
    previewHeight: 1200,
    svg: `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-fm" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#451A03" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="turkey-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>

  <!-- Top Banner: "THANKSGIVING DAY CHAMPIONSHIP" -->
  <g transform="translate(1975, 620)">
    <rect x="-820" y="-80" width="1640" height="160" rx="80" fill="#991B1B" />
    <text x="0" y="24" font-family="'Impact', 'Arial Black', sans-serif" font-size="88" font-weight="900" fill="#FEF2F2" text-anchor="middle" letter-spacing="14">THANKSGIVING DAY CHAMPIONSHIP</text>
  </g>

  <!-- Giant Athletic "FEAST" -->
  <g filter="url(#shadow-fm)">
    <text x="1975" y="1150" font-family="'Impact', 'Arial Black', sans-serif" font-size="480" font-weight="900" fill="#450A0A" text-anchor="middle" letter-spacing="28">FEAST</text>
    <text x="1975" y="1125" font-family="'Impact', 'Arial Black', sans-serif" font-size="480" font-weight="900" fill="#DC2626" text-anchor="middle" letter-spacing="28">FEAST</text>
    <text x="1975" y="1100" font-family="'Impact', 'Arial Black', sans-serif" font-size="480" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="28" stroke="#450A0A" stroke-width="14">FEAST</text>
  </g>

  <!-- Central Roasted Turkey Platter -->
  <g transform="translate(1975, 2250)" filter="url(#shadow-fm)">
    <g stroke="#94A3B8" stroke-width="26" stroke-linecap="round">
      <line x1="-550" y1="-500" x2="550" y2="500" />
      <line x1="550" y1="-500" x2="-550" y2="500" />
    </g>

    <ellipse cx="0" cy="240" rx="820" ry="260" fill="#E2E8F0" stroke="#94A3B8" stroke-width="18" />
    <ellipse cx="0" cy="240" rx="720" ry="210" fill="#F8FAFC" />

    <path d="M -350,200 C -460,55 -380,-200 -200,-275 C 0,-330 200,-275 350,55 C 380,200 220,260 0,260 C -220,260 -330,240 -350,200 Z" fill="url(#turkey-grad)" stroke="#451A03" stroke-width="16" />

    <g transform="translate(-275, -55) rotate(-35)">
      <ellipse cx="0" cy="0" rx="150" ry="240" fill="url(#turkey-grad)" stroke="#451A03" stroke-width="11" />
      <rect x="-26" y="-330" width="52" height="165" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="7" />
      <circle cx="-18" cy="-340" r="30" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="7" />
      <circle cx="18" cy="-340" r="30" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="7" />
    </g>

    <g transform="translate(275, -55) rotate(35)">
      <ellipse cx="0" cy="0" rx="150" ry="240" fill="url(#turkey-grad)" stroke="#451A03" stroke-width="11" />
      <rect x="-26" y="-330" width="52" height="165" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="7" />
      <circle cx="-18" cy="-340" r="30" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="7" />
      <circle cx="18" cy="-340" r="30" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="7" />
    </g>

    <path d="M -490,240 Q -415,175 -330,260" fill="none" stroke="#15803D" stroke-width="16" stroke-linecap="round" />
    <path d="M 490,240 Q 415,175 330,260" fill="none" stroke="#15803D" stroke-width="16" stroke-linecap="round" />
  </g>

  <!-- Giant Athletic "MODE" -->
  <g filter="url(#shadow-fm)">
    <text x="1975" y="3400" font-family="'Impact', 'Arial Black', sans-serif" font-size="480" font-weight="900" fill="#450A0A" text-anchor="middle" letter-spacing="28">MODE</text>
    <text x="1975" y="3375" font-family="'Impact', 'Arial Black', sans-serif" font-size="480" font-weight="900" fill="#F59E0B" text-anchor="middle" letter-spacing="28">MODE</text>
    <text x="1975" y="3350" font-family="'Impact', 'Arial Black', sans-serif" font-size="480" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="28" stroke="#450A0A" stroke-width="14">MODE</text>
  </g>

  <text x="1975" y="4150" font-family="'Trebuchet MS', sans-serif" font-size="90" font-weight="900" fill="#78350F" text-anchor="middle" letter-spacing="16">UNBUTTON THE PANTS • IT'S GAME TIME</text>
</svg>
`
  },

  // ==========================================
  // MUGS: 1275 x 1155 px
  // ==========================================

  // 4. Halloween: Here for the Boos (Mug)
  {
    slug: 'here-for-the-boos',
    title: 'Here for the Boos',
    category: 'mug',
    width: 1275,
    height: 1155,
    previewWidth: 1275,
    previewHeight: 1155,
    svg: `
<svg width="1275" height="1155" viewBox="0 0 1275 1155" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-boos-mug" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#1e1b4b" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="cocktail-grad-mug" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="50%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#EAB308"/>
    </linearGradient>
  </defs>

  <!-- Stars -->
  <g fill="#FDE047" opacity="0.9">
    <circle cx="200" cy="200" r="8" />
    <circle cx="1080" cy="220" r="10" />
    <circle cx="280" cy="480" r="7" />
    <circle cx="980" cy="490" r="9" />
  </g>

  <!-- Top Script: "I'M JUST" -->
  <text x="637.5" y="160" font-family="'Georgia', serif" font-style="italic" font-size="52" font-weight="700" fill="#A855F7" text-anchor="middle" letter-spacing="6">I'M JUST</text>

  <!-- Main "HERE FOR THE" -->
  <g filter="url(#shadow-boos-mug)">
    <text x="637.5" y="270" font-family="'Impact', 'Arial Black', sans-serif" font-size="105" font-weight="900" fill="#1E1B4B" text-anchor="middle" letter-spacing="6">HERE FOR THE</text>
    <text x="637.5" y="265" font-family="'Impact', 'Arial Black', sans-serif" font-size="105" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="6">HERE FOR THE</text>
  </g>

  <!-- Cocktail Coupe + Friendly Floating Ghost -->
  <g transform="translate(637.5, 600)" filter="url(#shadow-boos-mug)">
    <!-- Little Ghost Floating above Glass -->
    <g transform="translate(-65, -280)">
      <path d="M 65,18 C 32,18 22,65 22,115 C 22,160 32,180 43,170 C 54,160 65,185 76,170 C 87,155 98,185 109,170 C 120,155 127,137 127,115 C 127,65 98,18 65,18 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" />
      <ellipse cx="50" cy="72" rx="6" ry="9" fill="#1E1B4B" />
      <ellipse cx="80" cy="72" rx="6" ry="9" fill="#1E1B4B" />
      <ellipse cx="42" cy="83" rx="6" ry="3" fill="#FDA4AF" />
      <ellipse cx="88" cy="83" rx="6" ry="3" fill="#FDA4AF" />
      <path d="M 60,81 Q 65,90 70,81" fill="none" stroke="#1E1B4B" stroke-width="3" stroke-linecap="round" />
    </g>

    <!-- Glass Bowl Liquid -->
    <polygon points="0,0 -180,-170 180,-170" fill="url(#cocktail-grad-mug)" opacity="0.9" />
    <!-- Glass Outline -->
    <polygon points="0,0 -195,-180 195,-180" fill="none" stroke="#CBD5E1" stroke-width="7" stroke-linejoin="round" />
    <!-- Stem -->
    <rect x="-5" y="0" width="10" height="150" fill="#CBD5E1" />
    <!-- Base -->
    <ellipse cx="0" cy="155" rx="110" ry="14" fill="#CBD5E1" />

    <!-- Eyeball Garnish -->
    <line x1="-140" y1="-210" x2="40" y2="-100" stroke="#78350F" stroke-width="5" stroke-linecap="round" />
    <circle cx="-60" cy="-165" r="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="3" />
    <circle cx="-60" cy="-165" r="11" fill="#10B981" />
    <circle cx="-60" cy="-165" r="5" fill="#000000" />

    <!-- Bubbles -->
    <circle cx="-45" cy="-130" r="7" fill="#FDE047" opacity="0.8" />
    <circle cx="30" cy="-145" r="9" fill="#FDE047" opacity="0.8" />
    <circle cx="75" cy="-135" r="5" fill="#FDE047" opacity="0.8" />
  </g>

  <!-- Big "BOOS" Callout -->
  <g filter="url(#shadow-boos-mug)">
    <text x="637.5" y="930" font-family="'Impact', 'Arial Black', sans-serif" font-size="170" font-weight="900" fill="#3B0764" text-anchor="middle" letter-spacing="8">BOOS</text>
    <text x="637.5" y="922" font-family="'Impact', 'Arial Black', sans-serif" font-size="170" font-weight="900" fill="#A855F7" text-anchor="middle" letter-spacing="8">BOOS</text>
    <text x="637.5" y="915" font-family="'Impact', 'Arial Black', sans-serif" font-size="170" font-weight="900" fill="#FDE047" text-anchor="middle" letter-spacing="8" stroke="#451A03" stroke-width="5">BOOS</text>
  </g>

  <!-- Bottom Subtitle -->
  <text x="637.5" y="1040" font-family="'Trebuchet MS', sans-serif" font-size="34" font-weight="900" fill="#94A3B8" text-anchor="middle" letter-spacing="6">HALLOWEEN SPIRITS CO. • EST. 2026</text>
</svg>
`
  },

  // 5. Fall: Powered by Pumpkin Spice (Mug)
  {
    slug: 'powered-by-pumpkin-spice',
    title: 'Powered by Pumpkin Spice',
    category: 'mug',
    width: 1275,
    height: 1155,
    previewWidth: 1275,
    previewHeight: 1155,
    svg: `
<svg width="1275" height="1155" viewBox="0 0 1275 1155" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-pps-mug" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#451A03" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="cup-sleeve-mug" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="50%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
  </defs>

  <!-- Header: "POWERED BY" -->
  <g filter="url(#shadow-pps-mug)">
    <text x="637.5" y="210" font-family="'Impact', 'Arial Black', sans-serif" font-size="95" font-weight="900" fill="#451A03" text-anchor="middle" letter-spacing="8">POWERED BY</text>
    <text x="637.5" y="204" font-family="'Impact', 'Arial Black', sans-serif" font-size="95" font-weight="900" fill="#F59E0B" text-anchor="middle" letter-spacing="8">POWERED BY</text>
    <text x="637.5" y="198" font-family="'Impact', 'Arial Black', sans-serif" font-size="95" font-weight="900" fill="#FFFBEB" text-anchor="middle" letter-spacing="8" stroke="#451A03" stroke-width="4">POWERED BY</text>
  </g>

  <!-- Big Latte Coffee Cup Center -->
  <g transform="translate(637.5, 590)" filter="url(#shadow-pps-mug)">
    <!-- Steam Swirls -->
    <path d="M -40,-290 C -70,-350 -30,-390 -50,-430" fill="none" stroke="#FED7AA" stroke-width="6" stroke-linecap="round" opacity="0.85" />
    <path d="M 0,-310 C 25,-370 -15,-410 10,-450" fill="none" stroke="#FED7AA" stroke-width="8" stroke-linecap="round" opacity="0.95" />
    <path d="M 40,-290 C 70,-350 30,-390 50,-430" fill="none" stroke="#FED7AA" stroke-width="6" stroke-linecap="round" opacity="0.85" />

    <!-- Whipped Cream Mountain -->
    <path d="M -140,-160 C -155,-220 -110,-270 -55,-280 C -20,-310 30,-310 60,-280 C 110,-270 155,-220 140,-160 Z" fill="#FFFBEB" stroke="#D97706" stroke-width="5" />
    <!-- Cinnamon Stick -->
    <rect x="30" y="-320" width="22" height="140" rx="11" transform="rotate(25 30 -320)" fill="#78350F" stroke="#451A03" stroke-width="3" />
    <circle cx="-30" cy="-225" r="5" fill="#78350F" />
    <circle cx="10" cy="-240" r="6" fill="#78350F" />
    <circle cx="-60" cy="-205" r="4" fill="#78350F" />
    <circle cx="40" cy="-215" r="5" fill="#78350F" />

    <!-- Cup Body -->
    <polygon points="-155,-160 -120,200 120,200 155,-160" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="6" />

    <!-- Sleeve -->
    <polygon points="-145,-60 -125,120 125,120 145,-60" fill="url(#cup-sleeve-mug)" stroke="#78350F" stroke-width="4" />
    <!-- Mini Pumpkin on Sleeve -->
    <ellipse cx="0" cy="25" rx="52" ry="40" fill="#EA580C" stroke="#7C2D12" stroke-width="3" />
    <path d="M -4,-15 Q 4,-30 11,-22" fill="none" stroke="#15803D" stroke-width="4" stroke-linecap="round" />
  </g>

  <!-- Big "PUMPKIN SPICE" Footer -->
  <g filter="url(#shadow-pps-mug)">
    <text x="637.5" y="930" font-family="'Impact', 'Arial Black', sans-serif" font-size="125" font-weight="900" fill="#451A03" text-anchor="middle" letter-spacing="6">PUMPKIN SPICE</text>
    <text x="637.5" y="922" font-family="'Impact', 'Arial Black', sans-serif" font-size="125" font-weight="900" fill="#EA580C" text-anchor="middle" letter-spacing="6">PUMPKIN SPICE</text>
    <text x="637.5" y="915" font-family="'Impact', 'Arial Black', sans-serif" font-size="125" font-weight="900" fill="#FEF3C7" text-anchor="middle" letter-spacing="6" stroke="#451A03" stroke-width="4">PUMPKIN SPICE</text>
  </g>

  <!-- Subtext Pill -->
  <g transform="translate(637.5, 1030)">
    <rect x="-280" y="-30" width="560" height="60" rx="30" fill="#78350F" />
    <text x="0" y="9" font-family="'Trebuchet MS', sans-serif" font-size="28" font-weight="900" fill="#FEF3C7" text-anchor="middle" letter-spacing="4">EXTRA WHIP &amp; DOUBLE SHOT • 2026</text>
  </g>
</svg>
`
  },

  // 6. Thanksgiving: Thankful, Grateful, Caffeinated (Mug)
  {
    slug: 'thankful-grateful-caffeinated',
    title: 'Thankful, Grateful, Caffeinated',
    category: 'mug',
    width: 1275,
    height: 1155,
    previewWidth: 1275,
    previewHeight: 1155,
    svg: `
<svg width="1275" height="1155" viewBox="0 0 1275 1155" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-tgc-mug" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#3f2e23" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Botanical Laurel / Wheat Stalks -->
  <g filter="url(#shadow-tgc-mug)" fill="#D97706" opacity="0.85">
    <path d="M 270,580 C 230,380 290,260 380,190" fill="none" stroke="#D97706" stroke-width="6" stroke-linecap="round" />
    <ellipse cx="320" cy="240" rx="12" ry="24" transform="rotate(-30 320 240)" />
    <ellipse cx="290" cy="310" rx="12" ry="24" transform="rotate(-40 290 310)" />
    <ellipse cx="270" cy="390" rx="12" ry="24" transform="rotate(-45 270 390)" />
    <ellipse cx="265" cy="470" rx="12" ry="24" transform="rotate(-50 265 470)" />

    <path d="M 1005,580 C 1045,380 985,260 895,190" fill="none" stroke="#D97706" stroke-width="6" stroke-linecap="round" />
    <ellipse cx="955" cy="240" rx="12" ry="24" transform="rotate(30 955 240)" />
    <ellipse cx="985" cy="310" rx="12" ry="24" transform="rotate(40 985 310)" />
    <ellipse cx="1005" cy="390" rx="12" ry="24" transform="rotate(45 1005 390)" />
    <ellipse cx="1010" cy="470" rx="12" ry="24" transform="rotate(50 1010 470)" />
  </g>

  <!-- Word 1: "thankful." -->
  <g filter="url(#shadow-tgc-mug)">
    <text x="637.5" y="230" font-family="'Georgia', serif" font-size="110" font-style="italic" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="4">thankful.</text>
    <text x="637.5" y="225" font-family="'Georgia', serif" font-size="110" font-style="italic" font-weight="700" fill="#FEF3C7" text-anchor="middle" letter-spacing="4" stroke="#78350F" stroke-width="3">thankful.</text>
  </g>

  <!-- Word 2: "GRATEFUL." -->
  <g filter="url(#shadow-tgc-mug)">
    <text x="637.5" y="380" font-family="'Arial Black', sans-serif" font-size="95" font-weight="900" fill="#92400E" text-anchor="middle" letter-spacing="10">GRATEFUL.</text>
    <text x="637.5" y="374" font-family="'Arial Black', sans-serif" font-size="95" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="10">GRATEFUL.</text>
    <text x="637.5" y="368" font-family="'Arial Black', sans-serif" font-size="95" font-weight="900" fill="#FFFBEB" text-anchor="middle" letter-spacing="10" stroke="#78350F" stroke-width="3">GRATEFUL.</text>
  </g>

  <!-- Artisanal Coffee Mug Illustration Center -->
  <g transform="translate(637.5, 590)" filter="url(#shadow-tgc-mug)">
    <!-- Steaming Hearts -->
    <path d="M 0,-130 C 15,-160 -8,-190 8,-215" fill="none" stroke="#D97706" stroke-width="6" stroke-linecap="round" />
    <path d="M -30,-115 C -15,-145 -38,-175 -23,-200" fill="none" stroke="#D97706" stroke-width="5" stroke-linecap="round" />
    <path d="M 30,-115 C 45,-145 22,-175 37,-200" fill="none" stroke="#D97706" stroke-width="5" stroke-linecap="round" />

    <!-- Mug Body -->
    <rect x="-95" y="-95" width="190" height="165" rx="28" fill="#FFFBEB" stroke="#78350F" stroke-width="6" />
    <!-- Mug Handle -->
    <path d="M 95,-45 C 165,-45 165,45 95,45" fill="none" stroke="#FFFBEB" stroke-width="22" stroke-linecap="round" />
    <path d="M 95,-45 C 165,-45 165,45 95,45" fill="none" stroke="#78350F" stroke-width="6" stroke-linecap="round" />

    <!-- Surface -->
    <ellipse cx="0" cy="-85" rx="85" ry="20" fill="#451A03" />
    <!-- Heart on mug -->
    <path d="M 0,-25 Q -20,-48 -35,-25 Q -20,12 0,32 Q 20,12 35,-25 Q 20,-48 0,-25 Z" fill="#D97706" />
  </g>

  <!-- Word 3: "caffeinated." -->
  <g filter="url(#shadow-tgc-mug)">
    <text x="637.5" y="910" font-family="'Brush Script MT', 'Palatino', cursive" font-size="160" font-style="italic" font-weight="bold" fill="#451A03" text-anchor="middle">caffeinated.</text>
    <text x="637.5" y="902" font-family="'Brush Script MT', 'Palatino', cursive" font-size="160" font-style="italic" font-weight="bold" fill="#EA580C" text-anchor="middle">caffeinated.</text>
    <text x="637.5" y="895" font-family="'Brush Script MT', 'Palatino', cursive" font-size="160" font-style="italic" font-weight="bold" fill="#FEF3C7" text-anchor="middle">caffeinated.</text>
  </g>

  <text x="637.5" y="1035" font-family="'Trebuchet MS', sans-serif" font-size="32" font-weight="900" fill="#78350F" text-anchor="middle" letter-spacing="6">THE HOLIDAY MORNING SURVIVAL KIT</text>
</svg>
`
  },

  // ==========================================
  // POSTERS: 5400 x 7200 px (18x24" @ 300 DPI)
  // ==========================================

  // 7. Halloween: Little Pumpkin (Poster)
  {
    slug: 'little-pumpkin',
    title: 'Little Pumpkin',
    category: 'poster',
    width: 5400,
    height: 7200,
    previewWidth: 900,
    previewHeight: 1200,
    svg: `
<svg width="5400" height="7200" viewBox="0 0 5400 7200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-lp-poster" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#431407" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="grad-lp-pumpkin-p" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="100%" stop-color="#C2410C"/>
    </linearGradient>
  </defs>

  <!-- Botanical Wreath Ring -->
  <g filter="url(#shadow-lp-poster)">
    <circle cx="2700" cy="3700" r="2100" fill="none" stroke="#FED7AA" stroke-width="36" stroke-dasharray="30 60" opacity="0.65" />

    <!-- Oak Leaves Left -->
    <g transform="translate(1000, 3100) rotate(-35) scale(1.6)" fill="#B45309">
      <path d="M 0,0 C -50,50 -80,150 0,220 C -40,280 0,360 80,380 C 120,440 200,420 220,360 C 280,360 300,280 260,220 C 320,150 260,60 180,60 Z" />
    </g>
    <!-- Oak Leaves Right -->
    <g transform="translate(4200, 3100) rotate(35) scale(1.6)" fill="#B45309">
      <path d="M 0,0 C -50,50 -80,150 0,220 C -40,280 0,360 80,380 C 120,440 200,420 220,360 C 280,360 300,280 260,220 C 320,150 260,60 180,60 Z" />
    </g>

    <!-- Sunflowers -->
    <g transform="translate(1350, 2400) scale(1.5)">
      <circle cx="0" cy="0" r="140" fill="#EAB308" />
      <circle cx="0" cy="0" r="70" fill="#78350F" />
    </g>
    <g transform="translate(4050, 2400) scale(1.5)">
      <circle cx="0" cy="0" r="140" fill="#EAB308" />
      <circle cx="0" cy="0" r="70" fill="#78350F" />
    </g>
  </g>

  <!-- Top Title: "OUR" -->
  <text x="2700" y="1500" font-family="'Georgia', serif" font-style="italic" font-size="220" font-weight="700" fill="#9A3412" text-anchor="middle" letter-spacing="24">OUR</text>

  <!-- Main Title: "LITTLE" -->
  <g filter="url(#shadow-lp-poster)">
    <text x="2700" y="2100" font-family="'Impact', 'Arial Black', sans-serif" font-size="520" font-weight="900" fill="#431407" text-anchor="middle" letter-spacing="20">LITTLE</text>
    <text x="2700" y="2075" font-family="'Impact', 'Arial Black', sans-serif" font-size="520" font-weight="900" fill="#EA580C" text-anchor="middle" letter-spacing="20">LITTLE</text>
    <text x="2700" y="2050" font-family="'Impact', 'Arial Black', sans-serif" font-size="520" font-weight="900" fill="#FED7AA" text-anchor="middle" letter-spacing="20" stroke="#431407" stroke-width="16">LITTLE</text>
  </g>

  <!-- Cute Baby Pumpkin Illustration Center -->
  <g transform="translate(2700, 3750) scale(1.3)" filter="url(#shadow-lp-poster)">
    <path d="M -30,-420 Q 30,-580 140,-540 Q 80,-440 20,-400 Z" fill="#15803D" stroke="#14532D" stroke-width="10" />
    <path d="M 30,-480 Q 120,-480 180,-420 Q 140,-380 200,-350" fill="none" stroke="#15803D" stroke-width="14" stroke-linecap="round" />

    <ellipse cx="0" cy="0" rx="580" ry="460" fill="url(#grad-lp-pumpkin-p)" stroke="#7C2D12" stroke-width="18" />
    <ellipse cx="-250" cy="0" rx="400" ry="430" fill="url(#grad-lp-pumpkin-p)" opacity="0.6" />
    <ellipse cx="250" cy="0" rx="400" ry="430" fill="url(#grad-lp-pumpkin-p)" opacity="0.6" />

    <!-- Cute Eyes -->
    <ellipse cx="-170" cy="-30" rx="36" ry="52" fill="#1E293B" />
    <ellipse cx="170" cy="-30" rx="36" ry="52" fill="#1E293B" />
    <circle cx="-155" cy="-46" r="15" fill="#FFFFFF" />
    <circle cx="185" cy="-46" r="15" fill="#FFFFFF" />

    <!-- Cheeks -->
    <ellipse cx="-240" cy="42" rx="46" ry="26" fill="#FDA4AF" opacity="0.85" />
    <ellipse cx="240" cy="42" rx="46" ry="26" fill="#FDA4AF" opacity="0.85" />

    <!-- Smile -->
    <path d="M -75,32 Q 0,95 75,32" fill="none" stroke="#1E293B" stroke-width="18" stroke-linecap="round" />
  </g>

  <!-- Bottom Title: "PUMPKIN" -->
  <g transform="translate(2700, 5350)" filter="url(#shadow-lp-poster)">
    <text x="0" y="0" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#431407" text-anchor="middle" letter-spacing="22">PUMPKIN</text>
    <text x="0" y="-18" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#F97316" text-anchor="middle" letter-spacing="22">PUMPKIN</text>
    <text x="0" y="-36" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#FFF7ED" text-anchor="middle" letter-spacing="22" stroke="#431407" stroke-width="12">PUMPKIN</text>
  </g>

  <text x="2700" y="6050" font-family="'Georgia', serif" font-style="italic" font-size="120" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="14">SWEETEST IN THE PATCH • AUTUMN HARVEST</text>
</svg>
`
  },

  // 8. Fall: Autumn State of Mind (Poster)
  {
    slug: 'autumn-state-of-mind',
    title: 'Autumn State of Mind',
    category: 'poster',
    width: 5400,
    height: 7200,
    previewWidth: 900,
    previewHeight: 1200,
    svg: `
<svg width="5400" height="7200" viewBox="0 0 5400 7200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-autumn-poster" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#431407" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="foliage-grad-p" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EA580C"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>

  <!-- Cascading Maple & Oak Leaves Graphic -->
  <g filter="url(#shadow-autumn-poster)">
    <g transform="translate(2700, 3600) scale(2.4)" fill="url(#foliage-grad-p)" opacity="0.95">
      <path d="M 0,-400 Q 80,-300 120,-320 Q 200,-150 150,-100 Q 320,-80 340,50 Q 250,150 180,120 Q 150,260 80,240 L 40,400 L -40,400 L -80,240 Q -150,260 -180,120 Q -250,150 -340,50 Q -320,-80 -150,-100 Q -200,-150 -120,-320 Q -80,-300 0,-400 Z" stroke="#7C2D12" stroke-width="9" />
    </g>

    <g transform="translate(1300, 2600) rotate(-25) scale(1.6)" fill="#B45309">
      <path d="M 0,0 C -60,60 -90,160 0,240 C -50,300 0,380 90,400 C 130,460 210,440 230,380 C 290,380 310,300 270,240 C 330,160 270,70 190,70 Z" />
    </g>
    <g transform="translate(4100, 2600) rotate(25) scale(1.6)" fill="#D97706">
      <path d="M 0,0 C -60,60 -90,160 0,240 C -50,300 0,380 90,400 C 130,460 210,440 230,380 C 290,380 310,300 270,240 C 330,160 270,70 190,70 Z" />
    </g>
  </g>

  <!-- Large Flourish Script: "Autumn" -->
  <g filter="url(#shadow-autumn-poster)">
    <text x="2700" y="1750" font-family="'Brush Script MT', 'Palatino', 'Georgia', cursive" font-size="640" font-style="italic" font-weight="bold" fill="#7C2D12" text-anchor="middle">Autumn</text>
    <text x="2700" y="1720" font-family="'Brush Script MT', 'Palatino', 'Georgia', cursive" font-size="640" font-style="italic" font-weight="bold" fill="#F97316" text-anchor="middle">Autumn</text>
    <text x="2700" y="1700" font-family="'Brush Script MT', 'Palatino', 'Georgia', cursive" font-size="640" font-style="italic" font-weight="bold" fill="#FEF3C7" text-anchor="middle">Autumn</text>
  </g>

  <!-- Serif Block: "STATE OF MIND" -->
  <g filter="url(#shadow-autumn-poster)" transform="translate(2700, 5450)">
    <line x1="-1400" y1="-120" x2="-900" y2="-120" stroke="#CA8A04" stroke-width="14" />
    <circle cx="-850" cy="-120" r="20" fill="#CA8A04" />
    <line x1="900" y1="-120" x2="1400" y2="-120" stroke="#CA8A04" stroke-width="14" />
    <circle cx="850" cy="-120" r="20" fill="#CA8A04" />

    <text x="0" y="0" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#431407" text-anchor="middle" letter-spacing="34">STATE OF MIND</text>
    <text x="0" y="-20" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="34">STATE OF MIND</text>
    <text x="0" y="-40" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#FFFBEB" text-anchor="middle" letter-spacing="34" stroke="#431407" stroke-width="8">STATE OF MIND</text>

    <text x="0" y="360" font-family="'Georgia', serif" font-size="120" font-style="italic" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="18">GOLDEN LEAVES &amp; CRISP BREEZES • 2026</text>
  </g>
</svg>
`
  },

  // 9. Thanksgiving: Thanksgiving Social Club (Poster)
  {
    slug: 'thanksgiving-social-club',
    title: 'Thanksgiving Social Club',
    category: 'poster',
    width: 5400,
    height: 7200,
    previewWidth: 900,
    previewHeight: 1200,
    svg: `
<svg width="5400" height="7200" viewBox="0 0 5400 7200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-tsc-poster" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#0f172a" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Heritage Circular Seal -->
  <g filter="url(#shadow-tsc-poster)">
    <circle cx="2700" cy="3600" r="2250" fill="none" stroke="#1E293B" stroke-width="36" stroke-dasharray="36 24" />
    <circle cx="2700" cy="3600" r="2170" fill="none" stroke="#D97706" stroke-width="18" />
    <circle cx="2700" cy="3600" r="1800" fill="none" stroke="#1E293B" stroke-width="24" />
  </g>

  <!-- Top Arch Text: "THANKSGIVING" -->
  <g filter="url(#shadow-tsc-poster)">
    <text x="2700" y="1650" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#1E293B" text-anchor="middle" letter-spacing="34">THANKSGIVING</text>
    <text x="2700" y="1625" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="34">THANKSGIVING</text>
    <text x="2700" y="1600" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="34" stroke="#1E293B" stroke-width="9">THANKSGIVING</text>
  </g>

  <!-- Central Cornucopia & Harvest Bounty -->
  <g transform="translate(2700, 3500) scale(1.5)" filter="url(#shadow-tsc-poster)">
    <path d="M -200,200 C -450,200 -600,-50 -450,-250 C -350,-380 -100,-350 150,-250 C 400,-150 500,50 450,250 C 300,300 -100,250 -200,200 Z" fill="#92400E" stroke="#451A03" stroke-width="16" />
    <ellipse cx="380" cy="120" rx="160" ry="240" fill="#451A03" stroke="#78350F" stroke-width="12" />

    <ellipse cx="280" cy="150" rx="200" ry="160" fill="#EA580C" stroke="#7C2D12" stroke-width="12" />
    <circle cx="160" cy="240" r="75" fill="#DC2626" stroke="#7F1D1D" stroke-width="7" />
    <circle cx="380" cy="280" r="85" fill="#B91C1C" stroke="#7F1D1D" stroke-width="7" />
    <ellipse cx="450" cy="80" rx="70" ry="110" fill="#EAB308" stroke="#854D0E" stroke-width="7" />
    <circle cx="280" cy="-20" r="45" fill="#6B21A8" />
    <circle cx="350" cy="-40" r="45" fill="#581C87" />
    <circle cx="320" cy="30" r="45" fill="#7E22CE" />

    <g transform="translate(0, 390)">
      <rect x="-360" y="-60" width="720" height="120" rx="32" fill="#1E293B" stroke="#D97706" stroke-width="7" />
      <text x="0" y="22" font-family="'Georgia', serif" font-size="70" font-weight="700" fill="#FDE68A" text-anchor="middle" letter-spacing="12">• EST. 1621 •</text>
    </g>
  </g>

  <!-- Big Serif "SOCIAL CLUB" -->
  <g filter="url(#shadow-tsc-poster)">
    <text x="2700" y="5550" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="36">SOCIAL CLUB</text>
    <text x="2700" y="5525" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="36">SOCIAL CLUB</text>
    <text x="2700" y="5500" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="36" stroke="#0F172A" stroke-width="12">SOCIAL CLUB</text>
  </g>

  <!-- Motto Banner -->
  <g transform="translate(2700, 6100)">
    <text x="0" y="0" font-family="'Georgia', serif" font-style="italic" font-size="120" font-weight="700" fill="#1E293B" text-anchor="middle" letter-spacing="18">GATHER • FEAST • GIVE THANKS</text>
  </g>
</svg>
`
  }
];

async function generateAssets() {
  console.log(`Generating product-specific production assets for ${designs.length} designs...`);

  for (const design of designs) {
    const svgPath = path.join(outputDir, `${design.slug}.svg`);
    const pngPath = path.join(outputDir, `${design.slug}.png`);
    const webpPath = path.join(outputDir, `${design.slug}.webp`);

    // Clean and trim SVG
    const svgClean = design.svg.trim();
    fs.writeFileSync(svgPath, svgClean, 'utf8');

    // Render exact product-specific PNG (Production Print Area Asset)
    await sharp(Buffer.from(svgClean))
      .resize(design.width, design.height)
      .png({ compressionLevel: 9 })
      .toFile(pngPath);

    // Render WebP Preview (Preserving exact aspect ratio)
    await sharp(Buffer.from(svgClean))
      .resize(design.previewWidth, design.previewHeight)
      .webp({ quality: 90 })
      .toFile(webpPath);

    const pngStat = fs.statSync(pngPath);
    const webpStat = fs.statSync(webpPath);

    console.log(`[OK] ${design.title} (${design.slug}) [${design.category.toUpperCase()}]:`);
    console.log(`     Dimensions: ${design.width} × ${design.height} px`);
    console.log(`     PNG Size:   ${pngStat.size} bytes`);
    console.log(`     WebP Size:  ${webpStat.size} bytes (${design.previewWidth} × ${design.previewHeight})`);
  }

  console.log('\nAll 9 Fall 2026 product-specific production assets generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
