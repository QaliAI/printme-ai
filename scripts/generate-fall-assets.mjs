import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const outputDir = path.resolve('public/designs/fall-2026');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 9 Fall 2026 Designs
const designs = [
  // 1. Halloween: Boo Crew
  {
    slug: 'boo-crew',
    title: 'Boo Crew',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-boo" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#2e1065" flood-opacity="0.25"/>
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

  <!-- Decorative Stars & Bats -->
  <g fill="#FBBF24" opacity="0.9">
    <path d="M 600,800 L 630,880 L 710,910 L 630,940 L 600,1020 L 570,940 L 490,910 L 570,880 Z" />
    <path d="M 3000,850 L 3025,910 L 3090,935 L 3025,960 L 3000,1025 L 2975,960 L 2910,935 L 2975,910 Z" />
    <path d="M 1800,450 L 1820,500 L 1870,520 L 1820,540 L 1800,590 L 1780,540 L 1730,520 L 1780,500 Z" />
    <circle cx="800" cy="1150" r="18" />
    <circle cx="2800" cy="1200" r="22" />
    <circle cx="1000" cy="650" r="14" />
    <circle cx="2600" cy="680" r="16" />
  </g>

  <!-- Bats -->
  <g fill="#4338CA">
    <path d="M 750,550 Q 820,500 890,560 Q 850,580 820,570 Q 790,580 750,550 Z" />
    <path d="M 2700,500 Q 2780,440 2860,510 Q 2820,530 2780,520 Q 2740,530 2700,500 Z" />
  </g>

  <!-- Main "BOO CREW" arched typography -->
  <g filter="url(#shadow-boo)">
    <!-- Outline / Drop layer -->
    <text x="1800" y="850" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#3B0764" text-anchor="middle" letter-spacing="15">BOO CREW</text>
    <text x="1800" y="835" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#EA580C" text-anchor="middle" letter-spacing="15">BOO CREW</text>
    <text x="1800" y="820" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="url(#text-grad-boo)" text-anchor="middle" letter-spacing="15" stroke="#431407" stroke-width="12">BOO CREW</text>
  </g>

  <!-- Ghost 1 (Left Friendly Ghost) -->
  <g transform="translate(650, 1050) rotate(-10)" filter="url(#shadow-boo)">
    <path d="M 300,100 C 150,100 100,300 100,550 C 100,750 150,850 200,800 C 250,750 280,850 340,800 C 400,750 450,850 500,800 C 550,750 580,650 580,550 C 580,300 450,100 300,100 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="10" />
    <!-- Eyes -->
    <ellipse cx="280" cy="400" rx="28" ry="42" fill="#1E293B" />
    <ellipse cx="400" cy="400" rx="28" ry="42" fill="#1E293B" />
    <circle cx="270" cy="385" r="10" fill="#FFFFFF" />
    <circle cx="390" cy="385" r="10" fill="#FFFFFF" />
    <!-- Cheeks -->
    <ellipse cx="240" cy="450" rx="24" ry="14" fill="#FDA4AF" opacity="0.8" />
    <ellipse cx="440" cy="450" rx="24" ry="14" fill="#FDA4AF" opacity="0.8" />
    <!-- Smile -->
    <path d="M 315,450 Q 340,490 365,450" fill="none" stroke="#1E293B" stroke-width="12" stroke-linecap="round" />
  </g>

  <!-- Ghost 2 (Center Hero Ghost) -->
  <g transform="translate(1450, 950)" filter="url(#shadow-boo)">
    <path d="M 350,80 C 180,80 120,320 120,620 C 120,850 180,950 240,900 C 300,850 350,960 410,900 C 470,840 520,960 580,900 C 640,840 680,750 680,620 C 680,320 520,80 350,80 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="12" />
    <!-- Eyes -->
    <ellipse cx="310" cy="420" rx="34" ry="50" fill="#0F172A" />
    <ellipse cx="460" cy="420" rx="34" ry="50" fill="#0F172A" />
    <circle cx="298" cy="400" r="12" fill="#FFFFFF" />
    <circle cx="448" cy="400" r="12" fill="#FFFFFF" />
    <!-- Cheeks -->
    <ellipse cx="260" cy="480" rx="30" ry="16" fill="#FDA4AF" opacity="0.85" />
    <ellipse cx="510" cy="480" rx="30" ry="16" fill="#FDA4AF" opacity="0.85" />
    <!-- Big Open Smile -->
    <path d="M 340,480 Q 385,550 430,480 Z" fill="#0F172A" />
  </g>

  <!-- Ghost 3 (Right Friendly Ghost) -->
  <g transform="translate(2250, 1080) rotate(12)" filter="url(#shadow-boo)">
    <path d="M 300,100 C 150,100 100,300 100,550 C 100,750 150,850 200,800 C 250,750 280,850 340,800 C 400,750 450,850 500,800 C 550,750 580,650 580,550 C 580,300 450,100 300,100 Z" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="10" />
    <!-- Eyes -->
    <ellipse cx="270" cy="400" rx="28" ry="42" fill="#1E293B" />
    <ellipse cx="390" cy="400" rx="28" ry="42" fill="#1E293B" />
    <circle cx="260" cy="385" r="10" fill="#FFFFFF" />
    <circle cx="380" cy="385" r="10" fill="#FFFFFF" />
    <!-- Cheeks -->
    <ellipse cx="230" cy="450" rx="24" ry="14" fill="#FDA4AF" opacity="0.8" />
    <ellipse cx="430" cy="450" rx="24" ry="14" fill="#FDA4AF" opacity="0.8" />
    <!-- Wink Eye -->
    <path d="M 250,400 Q 270,370 290,400" fill="none" stroke="#1E293B" stroke-width="14" stroke-linecap="round" />
    <!-- Smile -->
    <path d="M 315,450 Q 340,490 365,450" fill="none" stroke="#1E293B" stroke-width="12" stroke-linecap="round" />
  </g>

  <!-- Big Jack-o-Lantern in Foreground Center -->
  <g transform="translate(1350, 2050)" filter="url(#shadow-boo)">
    <!-- Pumpkin stem -->
    <path d="M 420,150 Q 400,40 480,20 Q 470,120 450,150 Z" fill="#15803D" stroke="#14532D" stroke-width="8" />
    <!-- Pumpkin Body Lobes -->
    <ellipse cx="450" cy="480" rx="420" ry="340" fill="url(#pumpkin-grad-1)" stroke="#9A3412" stroke-width="14" />
    <ellipse cx="320" cy="480" rx="260" ry="320" fill="url(#pumpkin-grad-1)" opacity="0.7" />
    <ellipse cx="580" cy="480" rx="260" ry="320" fill="url(#pumpkin-grad-1)" opacity="0.7" />
    <!-- Carved Face Glowing Yellow -->
    <!-- Eyes -->
    <polygon points="280,410 350,330 380,420" fill="#FEF08A" stroke="#B45309" stroke-width="6" />
    <polygon points="520,420 550,330 620,410" fill="#FEF08A" stroke="#B45309" stroke-width="6" />
    <!-- Nose -->
    <polygon points="450,450 420,500 480,500" fill="#FEF08A" />
    <!-- Tooth Smile -->
    <path d="M 250,570 Q 450,720 650,570 Q 580,660 550,600 L 530,640 L 480,590 L 420,640 L 370,590 L 340,640 Z" fill="#FEF08A" stroke="#B45309" stroke-width="8" />
  </g>

  <!-- Banner at Bottom: "SPOOKY SEASON • 2026" -->
  <g transform="translate(1800, 3150)">
    <rect x="-700" y="-80" width="1400" height="160" rx="80" fill="#3B0764" stroke="#FBBF24" stroke-width="8" filter="url(#shadow-boo)" />
    <text x="0" y="24" font-family="'Trebuchet MS', 'Segoe UI', sans-serif" font-size="75" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="8">SPOOKY SEASON • 2026</text>
  </g>
</svg>
`
  },

  // 2. Halloween: Here for the Boos
  {
    slug: 'here-for-the-boos',
    title: 'Here for the Boos',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-boos" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#1e1b4b" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="cocktail-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#A855F7"/>
      <stop offset="50%" stop-color="#EC4899"/>
      <stop offset="100%" stop-color="#EAB308"/>
    </linearGradient>
  </defs>

  <!-- Stars and sparkles -->
  <g fill="#FDE047" opacity="0.9">
    <path d="M 500,900 L 525,970 L 595,995 L 525,1020 L 500,1090 L 475,1020 L 405,995 L 475,970 Z" />
    <path d="M 3100,1100 L 3125,1160 L 3185,1185 L 3125,1210 L 3100,1270 L 3075,1210 L 3015,1185 L 3075,1160 Z" />
    <circle cx="850" cy="1400" r="16" />
    <circle cx="2750" cy="900" r="20" />
    <circle cx="700" cy="650" r="14" />
  </g>

  <!-- Top Curved / Script Header: "I'M JUST" -->
  <text x="1800" y="550" font-family="'Georgia', serif" font-style="italic" font-size="120" font-weight="700" fill="#A855F7" text-anchor="middle" letter-spacing="12">I'M JUST</text>

  <!-- Main "HERE FOR THE" -->
  <g filter="url(#shadow-boos)">
    <text x="1800" y="850" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#1E1B4B" text-anchor="middle" letter-spacing="14">HERE FOR THE</text>
    <text x="1800" y="840" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="14">HERE FOR THE</text>
  </g>

  <!-- Central Martini / Potion Glass with Ghost Inside -->
  <g transform="translate(1800, 1900)" filter="url(#shadow-boos)">
    <!-- Little Ghost Floating above Glass -->
    <g transform="translate(-180, -780)">
      <path d="M 180,50 C 90,50 60,180 60,320 C 60,450 90,500 120,470 C 150,440 180,510 210,470 C 240,430 270,510 300,470 C 330,430 350,380 350,320 C 350,180 270,50 180,50 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="8" />
      <ellipse cx="140" cy="200" rx="16" ry="24" fill="#1E1B4B" />
      <ellipse cx="220" cy="200" rx="16" ry="24" fill="#1E1B4B" />
      <ellipse cx="115" cy="230" rx="16" ry="8" fill="#FDA4AF" />
      <ellipse cx="245" cy="230" rx="16" ry="8" fill="#FDA4AF" />
      <path d="M 165,225 Q 180,250 195,225" fill="none" stroke="#1E1B4B" stroke-width="8" stroke-linecap="round" />
      <!-- Ghost arms cheering with cocktail pick -->
      <path d="M 70,250 Q 0,220 30,160" fill="none" stroke="#FFFFFF" stroke-width="30" stroke-linecap="round" />
      <path d="M 290,250 Q 360,220 330,160" fill="none" stroke="#FFFFFF" stroke-width="30" stroke-linecap="round" />
    </g>

    <!-- Cocktail Coupe / Martini Glass -->
    <!-- Liquid in bowl -->
    <polygon points="0,0 -480,-450 480,-450" fill="url(#cocktail-grad)" opacity="0.9" />
    <!-- Glass bowl outline -->
    <polygon points="0,0 -520,-480 520,-480" fill="none" stroke="#CBD5E1" stroke-width="18" stroke-linejoin="round" />
    <!-- Cocktail Stem -->
    <rect x="-14" y="0" width="28" height="420" fill="#CBD5E1" />
    <!-- Glass Base -->
    <ellipse cx="0" cy="430" rx="300" ry="36" fill="#CBD5E1" />

    <!-- Cocktail Garnish: Eyeball on a pick! -->
    <line x1="-380" y1="-560" x2="100" y2="-280" stroke="#78350F" stroke-width="12" stroke-linecap="round" />
    <circle cx="-160" cy="-440" r="65" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="6" />
    <circle cx="-160" cy="-440" r="30" fill="#10B981" />
    <circle cx="-160" cy="-440" r="14" fill="#000000" />

    <!-- Bubbles rising -->
    <circle cx="-120" cy="-350" r="18" fill="#FDE047" opacity="0.8" />
    <circle cx="80" cy="-390" r="24" fill="#FDE047" opacity="0.8" />
    <circle cx="200" cy="-360" r="14" fill="#FDE047" opacity="0.8" />
  </g>

  <!-- Big "BOOS" Callout -->
  <g filter="url(#shadow-boos)">
    <text x="1800" y="2780" font-family="'Impact', 'Arial Black', sans-serif" font-size="460" font-weight="900" fill="#3B0764" text-anchor="middle" letter-spacing="20">BOOS</text>
    <text x="1800" y="2760" font-family="'Impact', 'Arial Black', sans-serif" font-size="460" font-weight="900" fill="#A855F7" text-anchor="middle" letter-spacing="20">BOOS</text>
    <text x="1800" y="2740" font-family="'Impact', 'Arial Black', sans-serif" font-size="460" font-weight="900" fill="#FDE047" text-anchor="middle" letter-spacing="20" stroke="#451A03" stroke-width="12">BOOS</text>
  </g>

  <!-- Bottom Subtitle: "HALLOWEEN SPIRITS CO." -->
  <text x="1800" y="3150" font-family="'Trebuchet MS', sans-serif" font-size="75" font-weight="900" fill="#CBD5E1" text-anchor="middle" letter-spacing="16">HALLOWEEN SPIRITS CO. • EST. 2026</text>
</svg>
`
  },

  // 3. Halloween: Little Pumpkin
  {
    slug: 'little-pumpkin',
    title: 'Little Pumpkin',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-lp" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#431407" flood-opacity="0.2"/>
    </filter>
    <linearGradient id="grad-lp-pumpkin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="100%" stop-color="#C2410C"/>
    </linearGradient>
  </defs>

  <!-- Botanical Wreath / Foliage behind -->
  <g filter="url(#shadow-lp)">
    <!-- Autumn Leaves Wreath -->
    <path d="M 600,1800 C 600,1050 1100,600 1800,600 C 2500,600 3000,1050 3000,1800 C 3000,2550 2500,3000 1800,3000 C 1100,3000 600,2550 600,1800 Z" fill="none" stroke="#FED7AA" stroke-width="24" stroke-dasharray="20 40" opacity="0.6" />

    <!-- Oak Leaves Left -->
    <g transform="translate(680, 1400) rotate(-35)" fill="#B45309">
      <path d="M 0,0 C -50,50 -80,150 0,220 C -40,280 0,360 80,380 C 120,440 200,420 220,360 C 280,360 300,280 260,220 C 320,150 260,60 180,60 Z" />
    </g>
    <!-- Oak Leaves Right -->
    <g transform="translate(2650, 1400) rotate(35)" fill="#B45309">
      <path d="M 0,0 C -50,50 -80,150 0,220 C -40,280 0,360 80,380 C 120,440 200,420 220,360 C 280,360 300,280 260,220 C 320,150 260,60 180,60 Z" />
    </g>

    <!-- Sunflowers -->
    <g transform="translate(900, 950)">
      <circle cx="0" cy="0" r="140" fill="#EAB308" />
      <circle cx="0" cy="0" r="70" fill="#78350F" />
    </g>
    <g transform="translate(2700, 950)">
      <circle cx="0" cy="0" r="140" fill="#EAB308" />
      <circle cx="0" cy="0" r="70" fill="#78350F" />
    </g>
  </g>

  <!-- Top Title: "OUR" -->
  <text x="1800" y="700" font-family="'Georgia', serif" font-style="italic" font-size="140" font-weight="700" fill="#9A3412" text-anchor="middle" letter-spacing="16">OUR</text>

  <!-- Main Title: "LITTLE PUMPKIN" -->
  <g filter="url(#shadow-lp)">
    <text x="1800" y="1050" font-family="'Impact', 'Arial Black', sans-serif" font-size="320" font-weight="900" fill="#431407" text-anchor="middle" letter-spacing="12">LITTLE</text>
    <text x="1800" y="1035" font-family="'Impact', 'Arial Black', sans-serif" font-size="320" font-weight="900" fill="#EA580C" text-anchor="middle" letter-spacing="12">LITTLE</text>
    <text x="1800" y="1020" font-family="'Impact', 'Arial Black', sans-serif" font-size="320" font-weight="900" fill="#FED7AA" text-anchor="middle" letter-spacing="12" stroke="#431407" stroke-width="10">LITTLE</text>
  </g>

  <!-- The Baby Pumpkin Illustration Center -->
  <g transform="translate(1800, 1950)" filter="url(#shadow-lp)">
    <!-- Curly Stem -->
    <path d="M -30,-420 Q 30,-580 140,-540 Q 80,-440 20,-400 Z" fill="#15803D" stroke="#14532D" stroke-width="8" />
    <path d="M 30,-480 Q 120,-480 180,-420 Q 140,-380 200,-350" fill="none" stroke="#15803D" stroke-width="12" stroke-linecap="round" />

    <!-- Pumpkin Lobes -->
    <ellipse cx="0" cy="0" rx="550" ry="440" fill="url(#grad-lp-pumpkin)" stroke="#7C2D12" stroke-width="16" />
    <ellipse cx="-240" cy="0" rx="380" ry="410" fill="url(#grad-lp-pumpkin)" opacity="0.6" />
    <ellipse cx="240" cy="0" rx="380" ry="410" fill="url(#grad-lp-pumpkin)" opacity="0.6" />

    <!-- Cute Eyes -->
    <ellipse cx="-160" cy="-30" rx="34" ry="48" fill="#1E293B" />
    <ellipse cx="160" cy="-30" rx="34" ry="48" fill="#1E293B" />
    <circle cx="-145" cy="-45" r="14" fill="#FFFFFF" />
    <circle cx="175" cy="-45" r="14" fill="#FFFFFF" />

    <!-- Rosy Cheeks -->
    <ellipse cx="-230" cy="40" rx="44" ry="24" fill="#FDA4AF" opacity="0.85" />
    <ellipse cx="230" cy="40" rx="44" ry="24" fill="#FDA4AF" opacity="0.85" />

    <!-- Gentle Baby Smile -->
    <path d="M -70,30 Q 0,90 70,30" fill="none" stroke="#1E293B" stroke-width="16" stroke-linecap="round" />
  </g>

  <!-- Bottom Ribbon: "SWEETEST IN THE PATCH" -->
  <g transform="translate(1800, 2850)" filter="url(#shadow-lp)">
    <text x="0" y="0" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#431407" text-anchor="middle" letter-spacing="14">PUMPKIN</text>
    <text x="0" y="-12" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#F97316" text-anchor="middle" letter-spacing="14">PUMPKIN</text>
    <text x="0" y="-24" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#FFF7ED" text-anchor="middle" letter-spacing="14" stroke="#431407" stroke-width="8">PUMPKIN</text>
  </g>

  <text x="1800" y="3180" font-family="'Georgia', serif" font-style="italic" font-size="80" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="8">SWEETEST IN THE PATCH • AUTUMN HARVEST</text>
</svg>
`
  },

  // 4. Fall: Autumn State of Mind
  {
    slug: 'autumn-state-of-mind',
    title: 'Autumn State of Mind',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-autumn" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#431407" flood-opacity="0.25"/>
    </filter>
    <linearGradient id="foliage-grad-1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#EA580C"/>
      <stop offset="50%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
  </defs>

  <!-- Cascading Maple & Oak Leaves Graphic -->
  <g filter="url(#shadow-autumn)">
    <!-- Big Maple Leaf Center-Left -->
    <g transform="translate(1800, 1750) scale(1.6)" fill="url(#foliage-grad-1)" opacity="0.95">
      <path d="M 0,-400 Q 80,-300 120,-320 Q 200,-150 150,-100 Q 320,-80 340,50 Q 250,150 180,120 Q 150,260 80,240 L 40,400 L -40,400 L -80,240 Q -150,260 -180,120 Q -250,150 -340,50 Q -320,-80 -150,-100 Q -200,-150 -120,-320 Q -80,-300 0,-400 Z" stroke="#7C2D12" stroke-width="8" />
    </g>

    <!-- Floating Acorns & Oak Leaves -->
    <g transform="translate(850, 1100) rotate(-25)" fill="#B45309">
      <path d="M 0,0 C -60,60 -90,160 0,240 C -50,300 0,380 90,400 C 130,460 210,440 230,380 C 290,380 310,300 270,240 C 330,160 270,70 190,70 Z" />
    </g>
    <g transform="translate(2750, 1100) rotate(25)" fill="#D97706">
      <path d="M 0,0 C -60,60 -90,160 0,240 C -50,300 0,380 90,400 C 130,460 210,440 230,380 C 290,380 310,300 270,240 C 330,160 270,70 190,70 Z" />
    </g>
  </g>

  <!-- Large Flourish Script: "Autumn" -->
  <g filter="url(#shadow-autumn)">
    <text x="1800" y="850" font-family="'Brush Script MT', 'Palatino', 'Georgia', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#7C2D12" text-anchor="middle">Autumn</text>
    <text x="1800" y="830" font-family="'Brush Script MT', 'Palatino', 'Georgia', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#F97316" text-anchor="middle">Autumn</text>
    <text x="1800" y="815" font-family="'Brush Script MT', 'Palatino', 'Georgia', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#FEF3C7" text-anchor="middle">Autumn</text>
  </g>

  <!-- Serif Block: "STATE OF MIND" -->
  <g filter="url(#shadow-autumn)" transform="translate(1800, 2750)">
    <!-- Decorative Frame Lines -->
    <line x1="-950" y1="-80" x2="-600" y2="-80" stroke="#CA8A04" stroke-width="10" />
    <circle cx="-570" cy="-80" r="14" fill="#CA8A04" />
    <line x1="600" y1="-80" x2="950" y2="-80" stroke="#CA8A04" stroke-width="10" />
    <circle cx="570" cy="-80" r="14" fill="#CA8A04" />

    <text x="0" y="0" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#431407" text-anchor="middle" letter-spacing="24">STATE OF MIND</text>
    <text x="0" y="-14" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="24">STATE OF MIND</text>
    <text x="0" y="-28" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#FFFBEB" text-anchor="middle" letter-spacing="24" stroke="#431407" stroke-width="6">STATE OF MIND</text>

    <!-- Subtext -->
    <text x="0" y="240" font-family="'Georgia', serif" font-size="75" font-style="italic" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="12">GOLDEN LEAVES &amp; CRISP BREEZES • 2026</text>
  </g>
</svg>
`
  },

  // 5. Fall: Powered by Pumpkin Spice
  {
    slug: 'powered-by-pumpkin-spice',
    title: 'Powered by Pumpkin Spice',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-pps" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#451A03" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="cup-sleeve" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="50%" stop-color="#B45309"/>
      <stop offset="100%" stop-color="#92400E"/>
    </linearGradient>
  </defs>

  <!-- Header Banner: "POWERED BY" -->
  <g filter="url(#shadow-pps)">
    <text x="1800" y="650" font-family="'Impact', 'Arial Black', sans-serif" font-size="240" font-weight="900" fill="#451A03" text-anchor="middle" letter-spacing="20">POWERED BY</text>
    <text x="1800" y="635" font-family="'Impact', 'Arial Black', sans-serif" font-size="240" font-weight="900" fill="#F59E0B" text-anchor="middle" letter-spacing="20">POWERED BY</text>
    <text x="1800" y="620" font-family="'Impact', 'Arial Black', sans-serif" font-size="240" font-weight="900" fill="#FFFBEB" text-anchor="middle" letter-spacing="20" stroke="#451A03" stroke-width="8">POWERED BY</text>
  </g>

  <!-- Big Latte Coffee Cup Center -->
  <g transform="translate(1800, 1850)" filter="url(#shadow-pps)">
    <!-- Steam Swirls & Hearts -->
    <path d="M -120,-800 C -200,-950 -80,-1080 -140,-1200" fill="none" stroke="#FED7AA" stroke-width="16" stroke-linecap="round" opacity="0.8" />
    <path d="M 0,-850 C 60,-1000 -40,-1120 20,-1250" fill="none" stroke="#FED7AA" stroke-width="20" stroke-linecap="round" opacity="0.9" />
    <path d="M 120,-800 C 200,-950 80,-1080 140,-1200" fill="none" stroke="#FED7AA" stroke-width="16" stroke-linecap="round" opacity="0.8" />

    <!-- Whipped Cream Mountain -->
    <path d="M -380,-450 C -420,-600 -300,-750 -150,-780 C -50,-850 80,-850 160,-780 C 300,-750 420,-600 380,-450 Z" fill="#FFFBEB" stroke="#D97706" stroke-width="12" />
    <!-- Cinnamon Stick poking out -->
    <rect x="80" y="-880" width="60" height="380" rx="30" transform="rotate(25 80 -880)" fill="#78350F" stroke="#451A03" stroke-width="8" />
    <!-- Star Anise / Cinnamon sprinkle dots -->
    <circle cx="-80" cy="-620" r="12" fill="#78350F" />
    <circle cx="20" cy="-660" r="16" fill="#78350F" />
    <circle cx="-160" cy="-560" r="10" fill="#78350F" />
    <circle cx="100" cy="-590" r="14" fill="#78350F" />

    <!-- Cup Body -->
    <polygon points="-420,-450 -320,550 320,550 420,-450" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="14" />

    <!-- Kraft Corrugated Sleeve -->
    <polygon points="-395,-180 -340,320 340,320 395,-180" fill="url(#cup-sleeve)" stroke="#78350F" stroke-width="10" />
    <!-- Little Pumpkin Icon on Sleeve -->
    <ellipse cx="0" cy="70" rx="140" ry="110" fill="#EA580C" stroke="#7C2D12" stroke-width="6" />
    <path d="M -10,-40 Q 10,-80 30,-60" fill="none" stroke="#15803D" stroke-width="10" stroke-linecap="round" />
  </g>

  <!-- Big "PUMPKIN SPICE" Footer -->
  <g filter="url(#shadow-pps)">
    <text x="1800" y="2850" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#451A03" text-anchor="middle" letter-spacing="14">PUMPKIN SPICE</text>
    <text x="1800" y="2830" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#EA580C" text-anchor="middle" letter-spacing="14">PUMPKIN SPICE</text>
    <text x="1800" y="2810" font-family="'Impact', 'Arial Black', sans-serif" font-size="340" font-weight="900" fill="#FEF3C7" text-anchor="middle" letter-spacing="14" stroke="#451A03" stroke-width="10">PUMPKIN SPICE</text>
  </g>

  <!-- Subtext Pill -->
  <g transform="translate(1800, 3180)">
    <rect x="-650" y="-70" width="1300" height="140" rx="70" fill="#78350F" />
    <text x="0" y="20" font-family="'Trebuchet MS', sans-serif" font-size="65" font-weight="900" fill="#FEF3C7" text-anchor="middle" letter-spacing="10">EXTRA WHIP &amp; DOUBLE SHOT • 2026</text>
  </g>
</svg>
`
  },

  // 6. Fall: Sweater Weather
  {
    slug: 'sweater-weather',
    title: 'Sweater Weather',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-sw" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#064e3b" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Cable-knit Border Ring -->
  <g filter="url(#shadow-sw)">
    <circle cx="1800" cy="1800" r="1450" fill="none" stroke="#E2E8F0" stroke-width="40" stroke-dasharray="30 20" opacity="0.8" />
    <circle cx="1800" cy="1800" r="1380" fill="none" stroke="#047857" stroke-width="16" />
  </g>

  <!-- Cozy Mittens Illustration Center -->
  <g transform="translate(1800, 1650)" filter="url(#shadow-sw)">
    <!-- Left Mitten -->
    <g transform="translate(-240, 0) rotate(-18)" fill="#D97706" stroke="#92400E" stroke-width="12">
      <!-- Cuff with ribbing -->
      <rect x="-140" y="220" width="280" height="140" rx="30" fill="#B45309" />
      <line x1="-90" y1="220" x2="-90" y2="360" stroke="#78350F" stroke-width="8" />
      <line x1="0" y1="220" x2="0" y2="360" stroke="#78350F" stroke-width="8" />
      <line x1="90" y1="220" x2="90" y2="360" stroke="#78350F" stroke-width="8" />
      <!-- Hand body -->
      <path d="M -130,220 C -150,50 -100,-250 0,-280 C 100,-250 150,50 130,220 Z" />
      <!-- Thumb -->
      <path d="M -110,80 C -220,50 -240,-80 -180,-120 C -120,-150 -90, -40 -90,80 Z" />
      <!-- Knit heart detail on mitten -->
      <path d="M 0,-60 Q -50,-130 -100,-60 Q -50,50 0,100 Q 50,50 100,-60 Q 50,-130 0,-60 Z" fill="#FFFBEB" stroke="#B45309" stroke-width="6" />
    </g>

    <!-- Right Mitten -->
    <g transform="translate(240, 0) rotate(18)" fill="#059669" stroke="#064E3B" stroke-width="12">
      <!-- Cuff with ribbing -->
      <rect x="-140" y="220" width="280" height="140" rx="30" fill="#047857" />
      <line x1="-90" y1="220" x2="-90" y2="360" stroke="#064E3B" stroke-width="8" />
      <line x1="0" y1="220" x2="0" y2="360" stroke="#064E3B" stroke-width="8" />
      <line x1="90" y1="220" x2="90" y2="360" stroke="#064E3B" stroke-width="8" />
      <!-- Hand body -->
      <path d="M -130,220 C -150,50 -100,-250 0,-280 C 100,-250 150,50 130,220 Z" />
      <!-- Thumb -->
      <path d="M 110,80 C 220,50 240,-80 180,-120 C 120,-150 90, -40 90,80 Z" />
      <!-- Knit snowflake/heart detail on mitten -->
      <path d="M 0,-60 Q -50,-130 -100,-60 Q -50,50 0,100 Q 50,50 100,-60 Q 50,-130 0,-60 Z" fill="#FFFBEB" stroke="#064E3B" stroke-width="6" />
    </g>
  </g>

  <!-- Curved / Script Top "SWEATER" -->
  <g filter="url(#shadow-sw)">
    <text x="1800" y="850" font-family="'Impact', 'Arial Black', sans-serif" font-size="360" font-weight="900" fill="#064E3B" text-anchor="middle" letter-spacing="20">SWEATER</text>
    <text x="1800" y="830" font-family="'Impact', 'Arial Black', sans-serif" font-size="360" font-weight="900" fill="#059669" text-anchor="middle" letter-spacing="20">SWEATER</text>
    <text x="1800" y="810" font-family="'Impact', 'Arial Black', sans-serif" font-size="360" font-weight="900" fill="#ECFDF5" text-anchor="middle" letter-spacing="20" stroke="#064E3B" stroke-width="10">SWEATER</text>
  </g>

  <!-- Big Cursive Bottom "WEATHER" -->
  <g filter="url(#shadow-sw)">
    <text x="1800" y="2750" font-family="'Brush Script MT', 'Palatino', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#78350F" text-anchor="middle">Weather</text>
    <text x="1800" y="2730" font-family="'Brush Script MT', 'Palatino', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#D97706" text-anchor="middle">Weather</text>
    <text x="1800" y="2710" font-family="'Brush Script MT', 'Palatino', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#FEF3C7" text-anchor="middle">Weather</text>
  </g>

  <text x="1800" y="3150" font-family="'Trebuchet MS', sans-serif" font-size="80" font-weight="900" fill="#047857" text-anchor="middle" letter-spacing="14">COZY UP &amp; STAY WARM • AUTUMN 2026</text>
</svg>
`
  },

  // 7. Thanksgiving: Feast Mode
  {
    slug: 'feast-mode',
    title: 'Feast Mode',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-fm" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#451A03" flood-opacity="0.3"/>
    </filter>
    <linearGradient id="turkey-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>
  </defs>

  <!-- Top Banner: "THANKSGIVING DAY" -->
  <g transform="translate(1800, 550)">
    <rect x="-750" y="-70" width="1500" height="140" rx="70" fill="#991B1B" />
    <text x="0" y="20" font-family="'Impact', 'Arial Black', sans-serif" font-size="80" font-weight="900" fill="#FEF2F2" text-anchor="middle" letter-spacing="12">THANKSGIVING DAY CHAMPIONSHIP</text>
  </g>

  <!-- Giant Athletic "FEAST" -->
  <g filter="url(#shadow-fm)">
    <text x="1800" y="980" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#450A0A" text-anchor="middle" letter-spacing="25">FEAST</text>
    <text x="1800" y="955" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#DC2626" text-anchor="middle" letter-spacing="25">FEAST</text>
    <text x="1800" y="930" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="25" stroke="#450A0A" stroke-width="12">FEAST</text>
  </g>

  <!-- Central Roasted Turkey on Platter + Crossed Fork & Knife -->
  <g transform="translate(1800, 1850)" filter="url(#shadow-fm)">
    <!-- Crossed Fork & Carving Knife in background -->
    <g stroke="#94A3B8" stroke-width="24" stroke-linecap="round">
      <line x1="-500" y1="-450" x2="500" y2="450" />
      <line x1="500" y1="-450" x2="-500" y2="450" />
    </g>

    <!-- Silver Platter -->
    <ellipse cx="0" cy="220" rx="750" ry="240" fill="#E2E8F0" stroke="#94A3B8" stroke-width="16" />
    <ellipse cx="0" cy="220" rx="660" ry="190" fill="#F8FAFC" />

    <!-- Golden Roast Turkey Body -->
    <path d="M -320,180 C -420,50 -350,-180 -180,-250 C 0,-300 180,-250 320,50 C 350,180 200,240 0,240 C -200,240 -300,220 -320,180 Z" fill="url(#turkey-grad)" stroke="#451A03" stroke-width="14" />

    <!-- Drumsticks -->
    <!-- Left Drumstick -->
    <g transform="translate(-250, -50) rotate(-35)">
      <ellipse cx="0" cy="0" rx="140" ry="220" fill="url(#turkey-grad)" stroke="#451A03" stroke-width="10" />
      <!-- Bone & Chef Frill -->
      <rect x="-24" y="-300" width="48" height="150" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6" />
      <circle cx="-16" cy="-310" r="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6" />
      <circle cx="16" cy="-310" r="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6" />
    </g>

    <!-- Right Drumstick -->
    <g transform="translate(250, -50) rotate(35)">
      <ellipse cx="0" cy="0" rx="140" ry="220" fill="url(#turkey-grad)" stroke="#451A03" stroke-width="10" />
      <!-- Bone & Chef Frill -->
      <rect x="-24" y="-300" width="48" height="150" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6" />
      <circle cx="-16" cy="-310" r="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6" />
      <circle cx="16" cy="-310" r="28" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="6" />
    </g>

    <!-- Rosemary Garnish Sprigs on Platter -->
    <path d="M -450,220 Q -380,160 -300,240" fill="none" stroke="#15803D" stroke-width="14" stroke-linecap="round" />
    <path d="M 450,220 Q 380,160 300,240" fill="none" stroke="#15803D" stroke-width="14" stroke-linecap="round" />
  </g>

  <!-- Giant Athletic "MODE" -->
  <g filter="url(#shadow-fm)">
    <text x="1800" y="2780" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#450A0A" text-anchor="middle" letter-spacing="25">MODE</text>
    <text x="1800" y="2755" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#F59E0B" text-anchor="middle" letter-spacing="25">MODE</text>
    <text x="1800" y="2730" font-family="'Impact', 'Arial Black', sans-serif" font-size="440" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="25" stroke="#450A0A" stroke-width="12">MODE</text>
  </g>

  <text x="1800" y="3150" font-family="'Trebuchet MS', sans-serif" font-size="80" font-weight="900" fill="#78350F" text-anchor="middle" letter-spacing="14">UNBUTTON THE PANTS • IT'S GAME TIME</text>
</svg>
`
  },

  // 8. Thanksgiving: Thankful, Grateful, Caffeinated
  {
    slug: 'thankful-grateful-caffeinated',
    title: 'Thankful, Grateful, Caffeinated',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-tgc" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#3f2e23" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Botanical Wheat & Laurel Stalks Framing Left & Right -->
  <g filter="url(#shadow-tgc)" fill="#D97706" opacity="0.85">
    <!-- Left Stalk -->
    <path d="M 750,1800 C 650,1200 800,800 1050,600" fill="none" stroke="#D97706" stroke-width="14" stroke-linecap="round" />
    <ellipse cx="880" cy="750" rx="30" ry="60" transform="rotate(-30 880 750)" />
    <ellipse cx="800" cy="950" rx="30" ry="60" transform="rotate(-40 800 950)" />
    <ellipse cx="750" cy="1200" rx="30" ry="60" transform="rotate(-45 750 1200)" />
    <ellipse cx="740" cy="1450" rx="30" ry="60" transform="rotate(-50 740 1450)" />
    <ellipse cx="760" cy="1700" rx="30" ry="60" transform="rotate(-55 760 1700)" />

    <!-- Right Stalk -->
    <path d="M 2850,1800 C 2950,1200 2800,800 2550,600" fill="none" stroke="#D97706" stroke-width="14" stroke-linecap="round" />
    <ellipse cx="2720" cy="750" rx="30" ry="60" transform="rotate(30 2720 750)" />
    <ellipse cx="2800" cy="950" rx="30" ry="60" transform="rotate(40 2800 950)" />
    <ellipse cx="2850" cy="1200" rx="30" ry="60" transform="rotate(45 2850 1200)" />
    <ellipse cx="2860" cy="1450" rx="30" ry="60" transform="rotate(50 2860 1450)" />
    <ellipse cx="2840" cy="1700" rx="30" ry="60" transform="rotate(55 2840 1700)" />
  </g>

  <!-- Word 1: "thankful." (Italic Serif) -->
  <g filter="url(#shadow-tgc)">
    <text x="1800" y="800" font-family="'Georgia', serif" font-size="280" font-style="italic" font-weight="700" fill="#78350F" text-anchor="middle" letter-spacing="8">thankful.</text>
    <text x="1800" y="785" font-family="'Georgia', serif" font-size="280" font-style="italic" font-weight="700" fill="#FEF3C7" text-anchor="middle" letter-spacing="8" stroke="#78350F" stroke-width="6">thankful.</text>
  </g>

  <!-- Word 2: "GRATEFUL." (Wide Clean Sans) -->
  <g filter="url(#shadow-tgc)">
    <text x="1800" y="1250" font-family="'Arial Black', sans-serif" font-size="240" font-weight="900" fill="#92400E" text-anchor="middle" letter-spacing="24">GRATEFUL.</text>
    <text x="1800" y="1235" font-family="'Arial Black', sans-serif" font-size="240" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="24">GRATEFUL.</text>
    <text x="1800" y="1220" font-family="'Arial Black', sans-serif" font-size="240" font-weight="900" fill="#FFFBEB" text-anchor="middle" letter-spacing="24" stroke="#78350F" stroke-width="6">GRATEFUL.</text>
  </g>

  <!-- Artisanal Coffee Mug Illustration Center -->
  <g transform="translate(1800, 1850)" filter="url(#shadow-tgc)">
    <!-- Steaming Hearts -->
    <path d="M 0,-340 C 40,-420 -20,-500 20,-560" fill="none" stroke="#D97706" stroke-width="14" stroke-linecap="round" />
    <path d="M -80,-300 C -40,-380 -100,-460 -60,-520" fill="none" stroke="#D97706" stroke-width="12" stroke-linecap="round" />
    <path d="M 80,-300 C 120,-380 60,-460 100,-520" fill="none" stroke="#D97706" stroke-width="12" stroke-linecap="round" />

    <!-- Ceramic Mug Body -->
    <rect x="-240" y="-240" width="480" height="420" rx="70" fill="#FFFBEB" stroke="#78350F" stroke-width="14" />
    <!-- Mug Handle -->
    <path d="M 240,-120 C 420,-120 420,120 240,120" fill="none" stroke="#FFFBEB" stroke-width="55" stroke-linecap="round" />
    <path d="M 240,-120 C 420,-120 420,120 240,120" fill="none" stroke="#78350F" stroke-width="14" stroke-linecap="round" />

    <!-- Coffee inside surface -->
    <ellipse cx="0" cy="-220" rx="220" ry="50" fill="#451A03" />

    <!-- Warm heart icon on mug body -->
    <path d="M 0,-60 Q -50,-120 -90,-60 Q -50,30 0,80 Q 50,30 90,-60 Q 50,-120 0,-60 Z" fill="#D97706" />
  </g>

  <!-- Word 3: "caffeinated." (Flowing Modern Calligraphy) -->
  <g filter="url(#shadow-tgc)">
    <text x="1800" y="2750" font-family="'Brush Script MT', 'Palatino', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#451A03" text-anchor="middle">caffeinated.</text>
    <text x="1800" y="2730" font-family="'Brush Script MT', 'Palatino', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#EA580C" text-anchor="middle">caffeinated.</text>
    <text x="1800" y="2710" font-family="'Brush Script MT', 'Palatino', cursive" font-size="440" font-style="italic" font-weight="bold" fill="#FEF3C7" text-anchor="middle">caffeinated.</text>
  </g>

  <text x="1800" y="3150" font-family="'Trebuchet MS', sans-serif" font-size="75" font-weight="900" fill="#78350F" text-anchor="middle" letter-spacing="14">THE HOLIDAY MORNING SURVIVAL KIT</text>
</svg>
`
  },

  // 9. Thanksgiving: Thanksgiving Social Club
  {
    slug: 'thanksgiving-social-club',
    title: 'Thanksgiving Social Club',
    svg: `
<svg width="3600" height="3600" viewBox="0 0 3600 3600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-tsc" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Heritage Circular Seal / Crest -->
  <g filter="url(#shadow-tsc)">
    <!-- Outer Rope / Beaded Circle -->
    <circle cx="1800" cy="1800" r="1450" fill="none" stroke="#1E293B" stroke-width="24" stroke-dasharray="24 16" />
    <circle cx="1800" cy="1800" r="1400" fill="none" stroke="#D97706" stroke-width="12" />
    <circle cx="1800" cy="1800" r="1150" fill="none" stroke="#1E293B" stroke-width="16" />
  </g>

  <!-- Circular Arch Top Text -->
  <g filter="url(#shadow-tsc)">
    <text x="1800" y="720" font-family="'Impact', 'Arial Black', sans-serif" font-size="200" font-weight="900" fill="#1E293B" text-anchor="middle" letter-spacing="22">THANKSGIVING</text>
    <text x="1800" y="705" font-family="'Impact', 'Arial Black', sans-serif" font-size="200" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="22">THANKSGIVING</text>
    <text x="1800" y="690" font-family="'Impact', 'Arial Black', sans-serif" font-size="200" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="22" stroke="#1E293B" stroke-width="6">THANKSGIVING</text>
  </g>

  <!-- Central Cornucopia & Harvest Bounty -->
  <g transform="translate(1800, 1750)" filter="url(#shadow-tsc)">
    <!-- Woven Cornucopia Horn -->
    <path d="M -200,200 C -450,200 -600,-50 -450,-250 C -350,-380 -100,-350 150,-250 C 400,-150 500,50 450,250 C 300,300 -100,250 -200,200 Z" fill="#92400E" stroke="#451A03" stroke-width="14" />
    <ellipse cx="380" cy="120" rx="160" ry="240" fill="#451A03" stroke="#78350F" stroke-width="10" />

    <!-- Harvest Fruit Spilling Out -->
    <!-- Giant Pumpkin -->
    <ellipse cx="280" cy="150" rx="200" ry="160" fill="#EA580C" stroke="#7C2D12" stroke-width="10" />
    <!-- Red Apples -->
    <circle cx="160" cy="240" r="75" fill="#DC2626" stroke="#7F1D1D" stroke-width="6" />
    <circle cx="380" cy="280" r="85" fill="#B91C1C" stroke="#7F1D1D" stroke-width="6" />
    <!-- Golden Pears -->
    <ellipse cx="450" cy="80" rx="70" ry="110" fill="#EAB308" stroke="#854D0E" stroke-width="6" />
    <!-- Purple Grapes -->
    <circle cx="280" cy="-20" r="45" fill="#6B21A8" />
    <circle cx="350" cy="-40" r="45" fill="#581C87" />
    <circle cx="320" cy="30" r="45" fill="#7E22CE" />

    <!-- Est. 1621 Ribbon -->
    <g transform="translate(0, 380)">
      <rect x="-350" y="-55" width="700" height="110" rx="30" fill="#1E293B" stroke="#D97706" stroke-width="6" />
      <text x="0" y="20" font-family="'Georgia', serif" font-size="65" font-weight="700" fill="#FDE68A" text-anchor="middle" letter-spacing="10">• EST. 1621 •</text>
    </g>
  </g>

  <!-- Big Serif "SOCIAL CLUB" -->
  <g filter="url(#shadow-tsc)">
    <text x="1800" y="2780" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#0F172A" text-anchor="middle" letter-spacing="24">SOCIAL CLUB</text>
    <text x="1800" y="2760" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#D97706" text-anchor="middle" letter-spacing="24">SOCIAL CLUB</text>
    <text x="1800" y="2740" font-family="'Impact', 'Arial Black', sans-serif" font-size="280" font-weight="900" fill="#F8FAFC" text-anchor="middle" letter-spacing="24" stroke="#0F172A" stroke-width="8">SOCIAL CLUB</text>
  </g>

  <!-- Motto Banner -->
  <g transform="translate(1800, 3120)">
    <text x="0" y="0" font-family="'Georgia', serif" font-style="italic" font-size="80" font-weight="700" fill="#1E293B" text-anchor="middle" letter-spacing="12">GATHER • FEAST • GIVE THANKS</text>
  </g>
</svg>
`
  }
];

async function generateAssets() {
  console.log(`Generating production assets for ${designs.length} designs...`);

  for (const design of designs) {
    const svgPath = path.join(outputDir, `${design.slug}.svg`);
    const pngPath = path.join(outputDir, `${design.slug}.png`);
    const webpPath = path.join(outputDir, `${design.slug}.webp`);

    // Clean and trim SVG
    const svgClean = design.svg.trim();
    fs.writeFileSync(svgPath, svgClean, 'utf8');

    // Render 3600x3600 PNG (Production Asset: print-resolution, transparent)
    await sharp(Buffer.from(svgClean))
      .png({ compressionLevel: 9 })
      .toFile(pngPath);

    // Render 1200x1200 WebP (Web Preview)
    await sharp(Buffer.from(svgClean))
      .resize(1200, 1200)
      .webp({ quality: 90 })
      .toFile(webpPath);

    const pngStat = fs.statSync(pngPath);
    const webpStat = fs.statSync(webpPath);

    console.log(`[OK] ${design.title} (${design.slug}):`);
    console.log(`     PNG:  ${pngStat.size} bytes (${pngPath})`);
    console.log(`     WebP: ${webpStat.size} bytes (${webpPath})`);
  }

  console.log('All 9 Fall 2026 production assets generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Failed to generate assets:', err);
  process.exit(1);
});
