import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public/designs/seasonal-edit');
const mockupDir = path.resolve('public/designs/seasonal-edit/mockups');

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
if (!fs.existsSync(mockupDir)) fs.mkdirSync(mockupDir, { recursive: true });

const designs = [
  // 1. The Haunted Household (Tee: 3951x4800)
  {
    slug: 'haunted-household',
    title: 'The Haunted Household',
    productKind: 'tee',
    width: 3951,
    height: 4800,
    previewWidth: 988,
    previewHeight: 1200,
    mockupFile: 'haunted-household-tee.webp',
    baseMockup: 'public/landing/mockups/product-tshirt.webp',
    mockupPlacement: { left: 300, top: 280, width: 360, height: 440 },
    svg: `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow-hh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#3b0764" flood-opacity="0.35"/>
    </filter>
    <linearGradient id="pumpkin-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FF9E3B"/>
      <stop offset="100%" stop-color="#E65100"/>
    </linearGradient>
    <linearGradient id="ghost-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#EDE9FE"/>
    </linearGradient>
  </defs>

  <!-- Stars and sparkles -->
  <g fill="#F59E0B">
    <path d="M 750,950 L 780,1030 L 860,1060 L 780,1090 L 750,1170 L 720,1090 L 640,1060 L 720,1030 Z"/>
    <path d="M 3200,980 L 3230,1050 L 3300,1080 L 3230,1110 L 3200,1180 L 3170,1110 L 3100,1080 L 3170,1050 Z"/>
    <circle cx="950" cy="1350" r="24"/>
    <circle cx="3000" cy="1380" r="28"/>
    <circle cx="1200" cy="780" r="18"/>
    <circle cx="2750" cy="800" r="22"/>
  </g>

  <!-- Bats -->
  <g fill="#4C1D95">
    <path d="M 880,720 Q 950,660 1020,730 Q 980,750 950,740 Q 920,750 880,720 Z"/>
    <path d="M 2920,680 Q 3000,620 3080,690 Q 3040,710 3000,700 Q 2960,710 2920,680 Z"/>
  </g>

  <!-- Header Banner Arch -->
  <path id="arch-top" d="M 500,880 Q 1975,460 3451,880" fill="none"/>
  <text font-family="'Georgia', 'Times New Roman', serif" font-size="210" font-weight="900" fill="#2E1065" letter-spacing="16" filter="url(#glow-hh)">
    <textPath href="#arch-top" startOffset="50%" text-anchor="middle">
      THE HAUNTED HOUSEHOLD
    </textPath>
  </text>

  <!-- Subtitle Ribbon -->
  <g transform="translate(1975, 1140)">
    <rect x="-850" y="-60" width="1700" height="120" rx="60" fill="#581C87" filter="url(#glow-hh)"/>
    <text x="0" y="24" font-family="'Arial Black', sans-serif" font-size="64" font-weight="900" fill="#FDE047" text-anchor="middle" letter-spacing="8">
      SPOOKY SEASON • EST. 2026
    </text>
  </g>

  <!-- Center Ghost Family Illustration -->
  <g filter="url(#glow-hh)">
    <!-- Parent Ghost Left -->
    <path d="M 1200,2850 C 1150,2200 1350,1700 1600,1650 C 1850,1600 1950,2100 1920,2850 C 1870,2770 1780,2830 1700,2780 C 1620,2830 1530,2770 1450,2820 C 1370,2770 1280,2830 1200,2850 Z" fill="url(#ghost-grad)" stroke="#C4B5FD" stroke-width="24"/>
    <!-- Parent Ghost Eyes & Blush -->
    <ellipse cx="1520" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="1680" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="1470" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="1730" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <path d="M 1570,2050 Q 1600,2090 1630,2050" stroke="#1E1B4B" stroke-width="16" fill="none" stroke-linecap="round"/>

    <!-- Parent Ghost Right (with witch hat) -->
    <path d="M 2050,2850 C 2020,2100 2120,1600 2370,1650 C 2620,1700 2820,2200 2770,2850 C 2690,2830 2600,2770 2520,2820 C 2440,2770 2350,2830 2270,2780 C 2190,2830 2100,2770 2050,2850 Z" fill="url(#ghost-grad)" stroke="#C4B5FD" stroke-width="24"/>
    <!-- Witch Hat -->
    <path d="M 2150,1660 L 2590,1660 L 2420,1220 L 2440,1180 L 2350,1250 Z" fill="#3B0764"/>
    <ellipse cx="2370" cy="1660" rx="280" ry="60" fill="#4C1D95"/>
    <rect x="2240" y="1590" width="260" height="40" fill="#F59E0B"/>
    <!-- Ghost Right Eyes & Smile -->
    <ellipse cx="2300" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="2460" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="2250" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="2510" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <path d="M 2350,2050 Q 2380,2090 2410,2050" stroke="#1E1B4B" stroke-width="16" fill="none" stroke-linecap="round"/>

    <!-- Pet Ghost Center (with dog/cat ears) -->
    <path d="M 1750,3050 C 1720,2550 1800,2300 1975,2300 C 2150,2300 2230,2550 2200,3050 C 2140,3010 2080,3040 2020,3000 C 1960,3040 1880,3010 1820,3040 Z" fill="url(#ghost-grad)" stroke="#C4B5FD" stroke-width="20"/>
    <!-- Pet Ears -->
    <path d="M 1830,2340 L 1780,2180 L 1900,2270 Z" fill="#C4B5FD"/>
    <path d="M 2120,2340 L 2170,2180 L 2050,2270 Z" fill="#C4B5FD"/>
    <!-- Pet Face -->
    <ellipse cx="1920" cy="2470" rx="22" ry="32" fill="#1E1B4B"/>
    <ellipse cx="2030" cy="2470" rx="22" ry="32" fill="#1E1B4B"/>
    <polygon points="1975,2510 1960,2530 1990,2530" fill="#1E1B4B"/>
    <ellipse cx="1870" cy="2510" rx="25" ry="14" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="2080" cy="2510" rx="25" ry="14" fill="#F472B6" opacity="0.6"/>
  </g>

  <!-- Glowing Jack-O-Lanterns along bottom -->
  <g filter="url(#glow-hh)">
    <!-- Pumpkin Left -->
    <g transform="translate(1000, 3100)">
      <path d="M 0,-60 Q 20,-110 50,-130" stroke="#15803D" stroke-width="24" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="0" rx="280" ry="230" fill="url(#pumpkin-grad)"/>
      <ellipse cx="-120" cy="0" rx="160" ry="220" fill="url(#pumpkin-grad)"/>
      <ellipse cx="120" cy="0" rx="160" ry="220" fill="url(#pumpkin-grad)"/>
      <!-- Glowing Face -->
      <polygon points="-80,-40 -50,-90 -20,-40" fill="#FEF08A"/>
      <polygon points="80,-40 50,-90 20,-40" fill="#FEF08A"/>
      <polygon points="0,-10 -18,20 18,20" fill="#FEF08A"/>
      <path d="M -110,60 Q 0,140 110,60 Q 70,80 0,70 Q -70,80 -110,60 Z" fill="#FEF08A"/>
    </g>

    <!-- Pumpkin Right -->
    <g transform="translate(2951, 3100)">
      <path d="M 0,-60 Q -20,-110 -50,-130" stroke="#15803D" stroke-width="24" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="0" rx="260" ry="220" fill="url(#pumpkin-grad)"/>
      <ellipse cx="-110" cy="0" rx="150" ry="210" fill="url(#pumpkin-grad)"/>
      <ellipse cx="110" cy="0" rx="150" ry="210" fill="url(#pumpkin-grad)"/>
      <!-- Glowing Face -->
      <polygon points="-70,-30 -40,-80 -10,-30" fill="#FEF08A"/>
      <polygon points="70,-30 40,-80 10,-30" fill="#FEF08A"/>
      <path d="M -90,70 Q 0,140 90,70 Q 50,85 0,75 Q -50,85 -90,70 Z" fill="#FEF08A"/>
    </g>
  </g>

  <!-- Bottom Custom Banner (Personalizable Text Area) -->
  <g transform="translate(1975, 3750)" filter="url(#glow-hh)">
    <rect x="-1150" y="-80" width="2300" height="160" rx="30" fill="#2E1065"/>
    <text x="0" y="24" font-family="'Georgia', serif" font-size="88" font-weight="bold" fill="#FFF7ED" text-anchor="middle" letter-spacing="6">
      THE MILLER COVEN • ALL SOULS' EVE
    </text>
  </g>

  <!-- Bottom Details -->
  <text x="1975" y="4050" font-family="'Arial', sans-serif" font-size="52" font-weight="700" fill="#6B21A8" text-anchor="middle" letter-spacing="10">
    SARAH • LIAM • MAYA • LUNA (PET)
  </text>
</svg>
`
  },

  // 2. Library of Lost Hours (Mug: 1275x1155)
  {
    slug: 'library-of-lost-hours',
    title: 'Library of Lost Hours',
    productKind: 'mug',
    width: 1275,
    height: 1155,
    previewWidth: 638,
    previewHeight: 578,
    mockupFile: 'library-of-lost-hours-mug.webp',
    baseMockup: 'public/landing/mockups/product-mug.webp',
    mockupPlacement: { left: 290, top: 320, width: 320, height: 290 },
    svg: `
<svg width="1275" height="1155" viewBox="0 0 1275 1155" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-lib" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#1c1917" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Antique Card Background -->
  <g filter="url(#shadow-lib)">
    <rect x="85" y="65" width="1105" height="1025" rx="24" fill="#FBF7EE" stroke="#44403C" stroke-width="12"/>
    <!-- Inner Fine Border -->
    <rect x="115" y="95" width="1045" height="965" rx="16" fill="none" stroke="#78716C" stroke-width="4" stroke-dasharray="12 6"/>
  </g>

  <!-- Library Header -->
  <text x="637" y="190" font-family="'Courier New', monospace" font-size="54" font-weight="900" fill="#1C1917" text-anchor="middle" letter-spacing="6">
    LIBRARY OF LOST HOURS
  </text>
  <text x="637" y="240" font-family="'Georgia', serif" font-size="28" font-style="italic" fill="#78716C" text-anchor="middle" letter-spacing="3">
    Nocturnal Archives &amp; Gothic Literature Society
  </text>

  <!-- Card Catalog Details Line -->
  <line x1="140" y1="275" x2="1135" y2="275" stroke="#1C1917" stroke-width="6"/>

  <!-- Metadata Grid -->
  <g font-family="'Courier New', monospace" font-size="28" fill="#292524">
    <text x="160" y="325" font-weight="bold">PATRON:</text>
    <text x="310" y="325" fill="#7C2D12" font-weight="bold">ELEANOR VANCE</text>

    <text x="720" y="325" font-weight="bold">CARD NO:</text>
    <text x="870" y="325" fill="#7C2D12" font-weight="bold">#1031-B</text>

    <text x="160" y="380" font-weight="bold">CLASS:</text>
    <text x="310" y="380" fill="#1C1917">SUPERNATURAL / VOL. VII</text>
  </g>

  <line x1="140" y1="415" x2="1135" y2="415" stroke="#1C1917" stroke-width="6"/>

  <!-- Column Headers for Checkout Log -->
  <g font-family="'Courier New', monospace" font-size="26" font-weight="bold" fill="#1C1917">
    <text x="240" y="465" text-anchor="middle">DATE DUE</text>
    <line x1="380" y1="415" x2="380" y2="920" stroke="#1C1917" stroke-width="4"/>
    <text x="560" y="465" text-anchor="middle">BORROWER</text>
    <line x1="740" y1="415" x2="740" y2="920" stroke="#1C1917" stroke-width="4"/>
    <text x="935" y="465" text-anchor="middle">STATUS</text>
  </g>

  <line x1="140" y1="495" x2="1135" y2="495" stroke="#1C1917" stroke-width="4"/>

  <!-- Stamped Rows -->
  <!-- Row 1 -->
  <g font-family="'Courier New', monospace">
    <text x="240" y="555" text-anchor="middle" font-size="30" font-weight="bold" fill="#991B1B" transform="rotate(-3 240 555)">OCT 13 1926</text>
    <text x="410" y="555" font-size="26" fill="#44403C">R. W. Chambers</text>
    <text x="935" y="555" text-anchor="middle" font-size="24" font-weight="bold" fill="#15803D">RETURNED</text>
  </g>
  <line x1="140" y1="585" x2="1135" y2="585" stroke="#D6D3D1" stroke-width="2"/>

  <!-- Row 2 -->
  <g font-family="'Courier New', monospace">
    <text x="240" y="645" text-anchor="middle" font-size="30" font-weight="bold" fill="#991B1B" transform="rotate(2 240 645)">OCT 24 1926</text>
    <text x="410" y="645" font-size="26" fill="#44403C">Shirley Jackson</text>
    <text x="935" y="645" text-anchor="middle" font-size="24" font-weight="bold" fill="#15803D">RETURNED</text>
  </g>
  <line x1="140" y1="675" x2="1135" y2="675" stroke="#D6D3D1" stroke-width="2"/>

  <!-- Row 3 (Featured Stamp) -->
  <g font-family="'Courier New', monospace">
    <rect x="155" y="700" width="180" height="65" rx="8" fill="none" stroke="#DC2626" stroke-width="5" transform="rotate(-6 245 732)"/>
    <text x="245" y="745" text-anchor="middle" font-size="34" font-weight="900" fill="#DC2626" transform="rotate(-6 245 745)">OCT 31</text>
    <text x="410" y="735" font-size="26" font-weight="bold" fill="#1C1917">MIDNIGHT CLUB</text>
    <text x="935" y="735" text-anchor="middle" font-size="26" font-weight="bold" fill="#DC2626">OVERDUE</text>
  </g>
  <line x1="140" y1="785" x2="1135" y2="785" stroke="#D6D3D1" stroke-width="2"/>

  <!-- Row 4 -->
  <g font-family="'Courier New', monospace">
    <text x="240" y="855" text-anchor="middle" font-size="30" font-weight="bold" fill="#991B1B" transform="rotate(-1 240 855)">NOV 01 2026</text>
    <text x="410" y="855" font-size="26" fill="#44403C">Patron #1031</text>
    <text x="935" y="855" text-anchor="middle" font-size="24" font-weight="bold" fill="#B45309">HOLD</text>
  </g>

  <!-- Bottom Stamp & Mottos -->
  <line x1="140" y1="920" x2="1135" y2="920" stroke="#1C1917" stroke-width="6"/>
  <text x="637" y="975" font-family="'Georgia', serif" font-size="26" font-style="italic" fill="#57534E" text-anchor="middle" letter-spacing="4">
    "Books borrowed after dark must be returned before dawn."
  </text>
  <text x="637" y="1025" font-family="'Courier New', monospace" font-size="20" font-weight="bold" fill="#A8A29E" text-anchor="middle" letter-spacing="5">
    PRINTME SPECIAL ARCHIVES • ITEM ID: PM-LOH-1031
  </text>
</svg>
`
  },

  // 3. Midnight Hayride Social Club (Tee: 3951x4800)
  {
    slug: 'midnight-hayride',
    title: 'Midnight Hayride Social Club',
    productKind: 'tee',
    width: 3951,
    height: 4800,
    previewWidth: 988,
    previewHeight: 1200,
    mockupFile: 'midnight-hayride-tee.webp',
    baseMockup: 'public/landing/mockups/product-tshirt.webp',
    mockupPlacement: { left: 300, top: 280, width: 360, height: 440 },
    svg: `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-mh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#451a03" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Western Lasso Oval Frame -->
  <ellipse cx="1975" cy="2350" rx="1600" ry="1750" fill="none" stroke="#D97706" stroke-width="28" stroke-dasharray="80 30" filter="url(#shadow-mh)"/>
  <ellipse cx="1975" cy="2350" rx="1530" ry="1680" fill="none" stroke="#78350F" stroke-width="12"/>

  <!-- Top Arched Header -->
  <path id="arch-top-mh" d="M 600,1050 Q 1975,480 3351,1050" fill="none"/>
  <text font-family="'Impact', 'Arial Black', sans-serif" font-size="230" fill="#92400E" letter-spacing="18" filter="url(#shadow-mh)">
    <textPath href="#arch-top-mh" startOffset="50%" text-anchor="middle">
      MIDNIGHT HAYRIDE
    </textPath>
  </text>

  <!-- Ribbon for "SOCIAL CLUB" -->
  <g transform="translate(1975, 1380)" filter="url(#shadow-mh)">
    <rect x="-950" y="-75" width="1900" height="150" rx="30" fill="#B45309"/>
    <text x="0" y="30" font-family="'Georgia', serif" font-size="96" font-weight="900" fill="#FEF3C7" text-anchor="middle" letter-spacing="16">
      ★ SOCIAL CLUB ★
    </text>
  </g>

  <!-- Cowboy Ghost & Wagon Illustration -->
  <g filter="url(#shadow-mh)">
    <!-- Hay Wagon Silhouette -->
    <rect x="1100" y="2750" width="1751" height="360" rx="30" fill="#78350F"/>
    <!-- Wagon Slats -->
    <line x1="1150" y1="2850" x2="2800" y2="2850" stroke="#B45309" stroke-width="20"/>
    <line x1="1150" y1="2970" x2="2800" y2="2970" stroke="#B45309" stroke-width="20"/>
    <!-- Wagon Wheels -->
    <circle cx="1400" cy="3200" r="220" fill="#451A03" stroke="#D97706" stroke-width="36"/>
    <circle cx="1400" cy="3200" r="70" fill="#FEF3C7"/>
    <circle cx="2551" cy="3200" r="220" fill="#451A03" stroke="#D97706" stroke-width="36"/>
    <circle cx="2551" cy="3200" r="70" fill="#FEF3C7"/>

    <!-- Hay Bales inside wagon -->
    <ellipse cx="1500" cy="2700" rx="280" ry="140" fill="#F59E0B"/>
    <ellipse cx="1975" cy="2650" rx="340" ry="160" fill="#D97706"/>
    <ellipse cx="2450" cy="2700" rx="280" ry="140" fill="#F59E0B"/>

    <!-- Cowboy Ghost Center -->
    <path d="M 1750,2600 C 1700,2000 1820,1650 1975,1650 C 2130,1650 2250,2000 2200,2600 Z" fill="#FFFBEB" stroke="#D97706" stroke-width="20"/>
    <!-- Cowboy Hat -->
    <path d="M 1700,1680 C 1800,1580 1975,1520 2150,1580 C 2250,1680 2350,1690 2380,1700 C 2350,1680 2200,1400 1975,1400 C 1750,1400 1600,1680 1570,1700 C 1600,1690 1650,1680 1700,1680 Z" fill="#78350F"/>
    <path d="M 1820,1580 L 1850,1430 L 2100,1430 L 2130,1580 Z" fill="#92400E"/>
    <rect x="1840" y="1530" width="270" height="30" fill="#D97706"/>
    <!-- Friendly Ghost Eyes & Bandana -->
    <ellipse cx="1930" cy="1820" rx="24" ry="36" fill="#451A03"/>
    <ellipse cx="2020" cy="1820" rx="24" ry="36" fill="#451A03"/>
    <!-- Bandana -->
    <polygon points="1900,1950 2050,1950 1975,2080" fill="#DC2626"/>
    <line x1="1900" y1="1950" x2="2050" y2="1950" stroke="#FEF2F2" stroke-width="10"/>

    <!-- Banjo held by ghost -->
    <circle cx="2170" cy="2200" r="140" fill="#FDE68A" stroke="#78350F" stroke-width="22"/>
    <rect x="2145" y="1850" width="50" height="280" fill="#B45309" stroke="#78350F" stroke-width="10" transform="rotate(30 2170 2000)"/>
  </g>

  <!-- Stars & Western Embellishments -->
  <g fill="#D97706">
    <polygon points="900,1750 930,1830 1010,1860 930,1890 900,1970 870,1890 790,1860 870,1830"/>
    <polygon points="3051,1750 3081,1830 3161,1860 3081,1890 3051,1970 3021,1890 2941,1860 3021,1830"/>
  </g>

  <!-- Bottom Location Banner (Personalizable) -->
  <g transform="translate(1975, 3850)" filter="url(#shadow-mh)">
    <rect x="-1050" y="-70" width="2100" height="140" rx="24" fill="#451A03"/>
    <text x="0" y="24" font-family="'Georgia', serif" font-size="76" font-weight="bold" fill="#FEF3C7" text-anchor="middle" letter-spacing="10">
      SLEEPY HOLLOW, NY • CHAPTER NO. 31
    </text>
  </g>

  <!-- Bottom Catchphrase -->
  <text x="1975" y="4150" font-family="'Impact', sans-serif" font-size="64" fill="#B45309" text-anchor="middle" letter-spacing="8">
    "BEST HAUNTED SEATS UNDER THE FULL HARVEST MOON"
  </text>
</svg>
`
  },

  // 4. Night Garden Society (Poster: 5400x7200)
  {
    slug: 'night-garden-society',
    title: 'Night Garden Society',
    productKind: 'poster',
    width: 5400,
    height: 7200,
    previewWidth: 900,
    previewHeight: 1200,
    mockupFile: 'night-garden-society-poster.webp',
    baseMockup: 'public/landing/mockups/product-poster.webp',
    mockupPlacement: { left: 240, top: 180, width: 480, height: 640 },
    svg: `
<svg width="5400" height="7200" viewBox="0 0 5400 7200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-ng" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="32" flood-color="#022c22" flood-opacity="0.4"/>
    </filter>
    <linearGradient id="gold-ng" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <linearGradient id="moth-wing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#065F46"/>
      <stop offset="60%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#022C22"/>
    </linearGradient>
  </defs>

  <!-- Outer Fine Botanical Border -->
  <rect x="250" y="250" width="4900" height="6700" rx="30" fill="none" stroke="#D97706" stroke-width="16" filter="url(#shadow-ng)"/>
  <rect x="300" y="300" width="4800" height="6600" rx="20" fill="none" stroke="#065F46" stroke-width="8"/>

  <!-- Corner Botanical Vignettes -->
  <g fill="#D97706">
    <circle cx="300" cy="300" r="36"/>
    <circle cx="5100" cy="300" r="36"/>
    <circle cx="300" cy="6900" r="36"/>
    <circle cx="5100" cy="6900" r="36"/>
  </g>

  <!-- Top Title -->
  <text x="2700" y="850" font-family="'Didot', 'Bodoni MT', 'Georgia', serif" font-size="280" font-weight="900" fill="#064E3B" text-anchor="middle" letter-spacing="24" filter="url(#shadow-ng)">
    NIGHT GARDEN SOCIETY
  </text>
  <text x="2700" y="1100" font-family="'Georgia', serif" font-size="80" font-style="italic" fill="#B45309" text-anchor="middle" letter-spacing="14">
    Nocturnal Botanicals &amp; Sacred Flora • Anno 2026
  </text>

  <!-- Moon Phases Row -->
  <g transform="translate(2700, 1400)" fill="url(#gold-ng)">
    <circle cx="-500" cy="0" r="45" fill="none" stroke="#D97706" stroke-width="12"/>
    <path d="M -260,-45 A 45 45 0 0 1 -260,45 A 45 45 0 0 0 -260,-45 Z"/>
    <circle cx="0" cy="0" r="55"/>
    <path d="M 260,-45 A 45 45 0 0 0 260,45 A 45 45 0 0 1 260,-45 Z"/>
    <circle cx="500" cy="0" r="45" fill="none" stroke="#D97706" stroke-width="12"/>
  </g>

  <!-- Central Botanical & Luna Moth Illustration -->
  <g filter="url(#shadow-ng)">
    <!-- Surrounding Botanical Circle (Ferns & Night Jasmine) -->
    <circle cx="2700" cy="3600" r="1650" fill="none" stroke="#065F46" stroke-width="12" stroke-dasharray="24 16"/>

    <!-- Luna Moth Body -->
    <path d="M 2700,2900 C 2670,3300 2660,3700 2700,4300 C 2740,3700 2730,3300 2700,2900 Z" fill="#FEF3C7" stroke="#B45309" stroke-width="16"/>
    <!-- Antennae -->
    <path d="M 2700,2920 Q 2550,2650 2350,2700" fill="none" stroke="#B45309" stroke-width="20" stroke-linecap="round"/>
    <path d="M 2700,2920 Q 2850,2650 3050,2700" fill="none" stroke="#B45309" stroke-width="20" stroke-linecap="round"/>

    <!-- Left Forewing -->
    <path d="M 2680,3100 C 2100,2400 1300,2650 1100,3200 C 950,3600 1400,4200 2660,3800 Z" fill="url(#moth-wing)" stroke="url(#gold-ng)" stroke-width="24"/>
    <!-- Left Eyespot -->
    <circle cx="1850" cy="3300" r="130" fill="#FEF3C7" stroke="#D97706" stroke-width="24"/>
    <circle cx="1850" cy="3300" r="60" fill="#064E3B"/>

    <!-- Right Forewing -->
    <path d="M 2720,3100 C 3300,2400 4100,2650 4300,3200 C 4450,3600 4000,4200 2740,3800 Z" fill="url(#moth-wing)" stroke="url(#gold-ng)" stroke-width="24"/>
    <!-- Right Eyespot -->
    <circle cx="3550" cy="3300" r="130" fill="#FEF3C7" stroke="#D97706" stroke-width="24"/>
    <circle cx="3550" cy="3300" r="60" fill="#064E3B"/>

    <!-- Hindwings & Tails -->
    <path d="M 2670,3700 C 2200,4100 1700,4500 1900,5300 C 1950,5500 1750,5800 1700,6000 C 1800,5800 2100,5200 2680,4300 Z" fill="url(#moth-wing)" stroke="url(#gold-ng)" stroke-width="20"/>
    <path d="M 2730,3700 C 3200,4100 3700,4500 3500,5300 C 3450,5500 3650,5800 3700,6000 C 3600,5800 3300,5200 2720,4300 Z" fill="url(#moth-wing)" stroke="url(#gold-ng)" stroke-width="20"/>

    <!-- Botanical Foliage Flanking Moth -->
    <!-- Left Fern fronds -->
    <path d="M 2000,2600 Q 1500,2200 1200,2350" fill="none" stroke="#047857" stroke-width="20"/>
    <path d="M 1900,4600 Q 1300,4800 1100,5100" fill="none" stroke="#047857" stroke-width="20"/>
    <!-- Right Fern fronds -->
    <path d="M 3400,2600 Q 3900,2200 4200,2350" fill="none" stroke="#047857" stroke-width="20"/>
    <path d="M 3500,4600 Q 4100,4800 4300,5100" fill="none" stroke="#047857" stroke-width="20"/>
  </g>

  <!-- Bottom Botanical Motto -->
  <text x="2700" y="6350" font-family="'Didot', 'Bodoni MT', 'Georgia', serif" font-size="110" font-weight="bold" fill="#064E3B" text-anchor="middle" letter-spacing="16">
    ACTAEA RACEMOSA • DATURA INOXIA
  </text>
  <text x="2700" y="6580" font-family="'Georgia', serif" font-size="60" font-style="italic" fill="#B45309" text-anchor="middle" letter-spacing="10">
    "Bloom in the quiet hours when the sun gives way to stars."
  </text>
</svg>
`
  },

  // 5. Field Notes After Dark (Poster: 5400x7200)
  {
    slug: 'field-notes-after-dark',
    title: 'Field Notes After Dark',
    productKind: 'poster',
    width: 5400,
    height: 7200,
    previewWidth: 900,
    previewHeight: 1200,
    mockupFile: 'field-notes-after-dark-poster.webp',
    baseMockup: 'public/landing/mockups/product-poster.webp',
    mockupPlacement: { left: 240, top: 180, width: 480, height: 640 },
    svg: `
<svg width="5400" height="7200" viewBox="0 0 5400 7200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-fn" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#1c1917" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Parchment Journal Plate Background -->
  <rect x="250" y="250" width="4900" height="6700" rx="20" fill="#FDFBF7" stroke="#44403C" stroke-width="20" filter="url(#shadow-fn)"/>
  <rect x="320" y="320" width="4760" height="6560" fill="none" stroke="#A8A29E" stroke-width="6"/>

  <!-- Field Journal Plate Header -->
  <g font-family="'Courier New', monospace">
    <text x="500" y="550" font-size="64" font-weight="bold" fill="#78716C">PLATE NO. 1031</text>
    <text x="4900" y="550" font-size="64" font-weight="bold" fill="#78716C" text-anchor="end">AUTUMN SERIES • 2026</text>
  </g>
  <line x1="450" y1="620" x2="4950" y2="620" stroke="#1C1917" stroke-width="12"/>

  <!-- Main Title -->
  <text x="2700" y="920" font-family="'Georgia', serif" font-size="240" font-weight="900" fill="#1C1917" text-anchor="middle" letter-spacing="18">
    FIELD NOTES AFTER DARK
  </text>
  <text x="2700" y="1120" font-family="'Georgia', serif" font-size="74" font-style="italic" fill="#7C2D12" text-anchor="middle" letter-spacing="10">
    An Autumnal Study of Woodland Nightlife &amp; Nocturnal Habitation
  </text>

  <line x1="450" y1="1240" x2="4950" y2="1240" stroke="#1C1917" stroke-width="8"/>

  <!-- Specimen Illustration: Barn Owl (Tyto alba) perched on Autumn Oak -->
  <g filter="url(#shadow-fn)">
    <!-- Branch with Autumn Leaves -->
    <path d="M 600,4300 Q 1800,4000 2700,4100 Q 3800,4200 4800,3800" fill="none" stroke="#78350F" stroke-width="60" stroke-linecap="round"/>
    <path d="M 1200,4150 Q 1400,4400 1600,4500" fill="none" stroke="#78350F" stroke-width="30"/>
    <path d="M 3600,4150 Q 3900,4500 4200,4400" fill="none" stroke="#78350F" stroke-width="30"/>

    <!-- Oak Leaves -->
    <g fill="#D97706">
      <ellipse cx="1450" cy="4350" rx="90" ry="180" transform="rotate(40 1450 4350)"/>
      <ellipse cx="1700" cy="4450" rx="90" ry="180" transform="rotate(70 1700 4450)"/>
      <ellipse cx="3800" cy="4350" rx="90" ry="180" transform="rotate(-40 3800 4350)"/>
      <ellipse cx="4050" cy="4450" rx="90" ry="180" transform="rotate(-65 4050 4450)"/>
    </g>

    <!-- Barn Owl Body -->
    <ellipse cx="2700" cy="3000" rx="650" ry="1050" fill="#FFFBEB" stroke="#92400E" stroke-width="20"/>
    <!-- Owl Wing Shading -->
    <path d="M 2150,2500 C 2000,3100 2050,3800 2500,4150 C 2350,3700 2300,3100 2400,2600 Z" fill="#B45309" stroke="#78350F" stroke-width="16"/>
    <path d="M 3250,2500 C 3400,3100 3350,3800 2900,4150 C 3050,3700 3100,3100 3000,2600 Z" fill="#B45309" stroke="#78350F" stroke-width="16"/>

    <!-- Owl Heart-Shaped Facial Disc -->
    <path d="M 2700,2100 C 2450,1750 2200,1950 2200,2300 C 2200,2650 2550,2850 2700,2900 C 2850,2850 3200,2650 3200,2300 C 3200,1950 2950,1750 2700,2100 Z" fill="#FEF3C7" stroke="#78350F" stroke-width="20"/>

    <!-- Owl Eyes & Beak -->
    <circle cx="2500" cy="2350" r="90" fill="#1C1917" stroke="#D97706" stroke-width="18"/>
    <circle cx="2900" cy="2350" r="90" fill="#1C1917" stroke="#D97706" stroke-width="18"/>
    <polygon points="2700,2450 2670,2600 2730,2600" fill="#B45309"/>

    <!-- Owl Talons clutching branch -->
    <ellipse cx="2520" cy="4050" rx="60" ry="30" fill="#451A03"/>
    <ellipse cx="2880" cy="4050" rx="60" ry="30" fill="#451A03"/>
  </g>

  <!-- Specimen Label Box (Personalizable Area) -->
  <g transform="translate(2700, 5200)" filter="url(#shadow-fn)">
    <rect x="-1900" y="-200" width="3800" height="400" rx="20" fill="#F5F5F4" stroke="#1C1917" stroke-width="12"/>
    <text x="-1800" y="-80" font-family="'Courier New', monospace" font-size="52" font-weight="bold" fill="#78716C">FIG. 1: TYTO ALBA (BARN OWL)</text>
    <text x="-1800" y="0" font-family="'Georgia', serif" font-size="70" font-weight="900" fill="#1C1917">
      LOCATION: WHITE MOUNTAIN WILDERNESS • NEW HAMPSHIRE
    </text>
    <text x="-1800" y="90" font-family="'Courier New', monospace" font-size="46" fill="#44403C">
      OBSERVER: E. HEMINGWAY • ELEVATION: 3,420 FT • TIME: 23:45 HRS
    </text>
  </g>

  <!-- Footer Technical Notes -->
  <g font-family="'Courier New', monospace" font-size="40" fill="#78716C">
    <text x="500" y="6300">HABITAT: MATURE OAK CANOPY &amp; UNMOWED MEADOWS</text>
    <text x="500" y="6380">STATUS: NOCTURNAL FORAGING / ACTIVE CALL DETECTED</text>
    <text x="4900" y="6380" text-anchor="end">PRINTME NATURAL HISTORY SERIES</text>
  </g>
</svg>
`
  },

  // 6. The Annual Leftovers League (Tee: 3951x4800)
  {
    slug: 'leftovers-league',
    title: 'The Annual Leftovers League',
    productKind: 'tee',
    width: 3951,
    height: 4800,
    previewWidth: 988,
    previewHeight: 1200,
    mockupFile: 'leftovers-league-tee.webp',
    baseMockup: 'public/landing/mockups/product-tshirt.webp',
    mockupPlacement: { left: 300, top: 280, width: 360, height: 440 },
    svg: `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-ll" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#451a03" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Outer Athletic Shield -->
  <path d="M 800,900 L 3151,900 L 3151,2600 C 3151,3400 1975,4100 1975,4100 C 1975,4100 800,3400 800,2600 Z" fill="none" stroke="#7C2D12" stroke-width="36" filter="url(#shadow-ll)"/>
  <path d="M 860,960 L 3091,960 L 3091,2570 C 3091,3320 1975,3990 1975,3990 C 1975,3990 860,3320 860,2570 Z" fill="none" stroke="#D97706" stroke-width="16"/>

  <!-- Top Header -->
  <text x="1975" y="750" font-family="'Impact', 'Arial Black', sans-serif" font-size="200" fill="#7C2D12" text-anchor="middle" letter-spacing="14" filter="url(#shadow-ll)">
    THE ANNUAL
  </text>
  <text x="1975" y="1320" font-family="'Impact', 'Arial Black', sans-serif" font-size="310" fill="#991B1B" text-anchor="middle" letter-spacing="12" filter="url(#shadow-ll)">
    LEFTOVERS LEAGUE
  </text>

  <!-- Laurel Wreath & Crossed Fork / Knife -->
  <g filter="url(#shadow-ll)">
    <!-- Crossed Carving Knife and Fork -->
    <path d="M 1250,1550 L 2700,3000 L 2600,3100 L 1150,1650 Z" fill="#78716C"/>
    <path d="M 2700,1550 L 1250,3000 L 1350,3100 L 2800,1650 Z" fill="#78716C"/>

    <!-- Roasted Turkey Platter Centerpiece -->
    <ellipse cx="1975" cy="2250" rx="650" ry="420" fill="#F59E0B" stroke="#78350F" stroke-width="24"/>
    <!-- Turkey Drumsticks -->
    <ellipse cx="1500" cy="2050" rx="200" ry="120" fill="#D97706" transform="rotate(-30 1500 2050)"/>
    <circle cx="1320" cy="1950" r="60" fill="#FEF3C7"/>
    <ellipse cx="2450" cy="2050" rx="200" ry="120" fill="#D97706" transform="rotate(30 2450 2050)"/>
    <circle cx="2630" cy="1950" r="60" fill="#FEF3C7"/>

    <!-- Slice of Pumpkin Pie with Whipped Cream -->
    <g transform="translate(1975, 2750)">
      <polygon points="-220,100 220,100 0,-150" fill="#EA580C" stroke="#78350F" stroke-width="16"/>
      <ellipse cx="0" cy="100" rx="220" ry="40" fill="#C2410C"/>
      <circle cx="0" cy="-30" r="55" fill="#FFFFFF"/>
    </g>
  </g>

  <!-- Stars & Championship Ribbon -->
  <g transform="translate(1975, 3350)" filter="url(#shadow-ll)">
    <rect x="-1050" y="-80" width="2100" height="160" rx="30" fill="#7C2D12"/>
    <text x="0" y="28" font-family="'Arial Black', sans-serif" font-size="80" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="10">
      THE HENDERSON CLAN • 2026
    </text>
  </g>

  <!-- Configurable Member Role Banner -->
  <g transform="translate(1975, 3700)" filter="url(#shadow-ll)">
    <rect x="-850" y="-60" width="1700" height="120" rx="24" fill="#991B1B"/>
    <text x="0" y="22" font-family="'Impact', sans-serif" font-size="70" fill="#FFF7ED" text-anchor="middle" letter-spacing="8">
      ROLE: OFFICIAL PIE INSPECTOR
    </text>
  </g>

  <!-- Bottom Catchphrase -->
  <text x="1975" y="4450" font-family="'Georgia', serif" font-size="64" font-style="italic" fill="#78350F" text-anchor="middle" letter-spacing="6">
    "Undefeated Champions of the Post-Feast Couch Nap"
  </text>
</svg>
`
  }
];

async function generateAll() {
  console.log('Generating 6 Seasonal Edit artwork and mockup assets...');

  for (const item of designs) {
    const pngPath = path.join(outputDir, `${item.slug}.png`);
    const webpPath = path.join(outputDir, `${item.slug}.webp`);
    const svgPath = path.join(outputDir, `${item.slug}.svg`);
    const mockupPath = path.join(mockupDir, item.mockupFile);

    // Save SVG
    fs.writeFileSync(svgPath, item.svg.trim(), 'utf-8');

    // Render High-Res Production PNG
    console.log(`Rendering ${item.slug}.png (${item.width}x${item.height})...`);
    await sharp(Buffer.from(item.svg))
      .resize(item.width, item.height)
      .png({ compressionLevel: 9 })
      .toFile(pngPath);

    // Render Fast WebP Preview
    console.log(`Rendering ${item.slug}.webp (${item.previewWidth}x${item.previewHeight})...`);
    await sharp(Buffer.from(item.svg))
      .resize(item.previewWidth, item.previewHeight)
      .webp({ quality: 90 })
      .toFile(webpPath);

    // Generate Realistic Mockup
    if (fs.existsSync(item.baseMockup)) {
      console.log(`Compositing realistic mockup for ${item.slug}...`);
      const artworkOverlay = await sharp(Buffer.from(item.svg))
        .resize(item.mockupPlacement.width, item.mockupPlacement.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      await sharp(item.baseMockup)
        .composite([
          {
            input: artworkOverlay,
            top: item.mockupPlacement.top,
            left: item.mockupPlacement.left,
            blend: 'multiply'
          }
        ])
        .webp({ quality: 90 })
        .toFile(mockupPath);
    } else {
      console.warn(`Base mockup not found: ${item.baseMockup}, falling back to direct preview.`);
      fs.copyFileSync(webpPath, mockupPath);
    }
  }

  console.log('All 6 Seasonal Edit assets generated successfully!');
}

generateAll().catch((err) => {
  console.error('Failed to generate seasonal edit assets:', err);
  process.exit(1);
});
