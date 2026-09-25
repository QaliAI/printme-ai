'use client';

import { createCartSnapshot, upsertCartItem, readLocalCart, writeLocalCart } from './local-cart';
import { upsertPersistentCartItem } from './persistent-cart-client';
import { createProductConfiguration } from './placement';
import { getPreviewTemplate } from './templates';
import type { CartConfigurationSnapshot, CuratedDesign, MerchProduct, ProductConfiguration } from './types';

export interface PersonalizationFields {
  // Haunted Household
  familyName?: string;
  householdSubtitle?: string;
  membersText?: string;
  petPhotoDataUrl?: string;

  // Library of Lost Hours
  patronName?: string;
  cardNumber?: string;
  dueDate?: string;
  specialSubject?: string;

  // Midnight Hayride
  locationName?: string;
  chapterNumber?: string;
  estYear?: string;

  // Field Notes
  woodlandAnimal?: string;
  fieldLocation?: string;
  observerName?: string;

  // Leftovers League
  leagueFamilyName?: string;
  leagueYear?: string;
  memberRole?: string;
}

export const defaultPersonalization: Record<string, PersonalizationFields> = {
  'haunted-household': {
    familyName: 'THE MILLER COVEN',
    householdSubtitle: 'ALL SOULS\' EVE • EST. 2026',
    membersText: 'SARAH • LIAM • MAYA • LUNA (PET)',
  },
  'library-of-lost-hours': {
    patronName: 'ELEANOR VANCE',
    cardNumber: '#1031-B',
    dueDate: 'OCT 31',
    specialSubject: 'SUPERNATURAL / VOL. VII',
  },
  'midnight-hayride': {
    locationName: 'SLEEPY HOLLOW, NY',
    chapterNumber: 'CHAPTER NO. 31',
    estYear: 'EST. 2026',
  },
  'field-notes-after-dark': {
    woodlandAnimal: 'TYTO ALBA (BARN OWL)',
    fieldLocation: 'WHITE MOUNTAIN WILDERNESS • NEW HAMPSHIRE',
    observerName: 'E. HEMINGWAY',
  },
  'leftovers-league': {
    leagueFamilyName: 'THE HENDERSON CLAN',
    leagueYear: '2026',
    memberRole: 'OFFICIAL PIE INSPECTOR',
  },
};

/**
 * Generates the customized SVG string with user-supplied text values.
 */
export function buildPersonalizedSvg(slug: string, fields: PersonalizationFields): string {
  switch (slug) {
    case 'haunted-household': {
      const family = (fields.familyName || 'THE MILLER COVEN').toUpperCase();
      const subtitle = (fields.householdSubtitle || 'ALL SOULS\' EVE • EST. 2026').toUpperCase();
      const members = (fields.membersText || 'SARAH • LIAM • MAYA • LUNA (PET)').toUpperCase();

      return `
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
  <text font-family="'Georgia', serif" font-size="210" font-weight="900" fill="#2E1065" letter-spacing="16" filter="url(#glow-hh)">
    <textPath href="#arch-top" startOffset="50%" text-anchor="middle">
      THE HAUNTED HOUSEHOLD
    </textPath>
  </text>

  <!-- Subtitle Ribbon -->
  <g transform="translate(1975, 1140)">
    <rect x="-850" y="-60" width="1700" height="120" rx="60" fill="#581C87" filter="url(#glow-hh)"/>
    <text x="0" y="24" font-family="'Arial Black', sans-serif" font-size="60" font-weight="900" fill="#FDE047" text-anchor="middle" letter-spacing="8">
      ${subtitle}
    </text>
  </g>

  <!-- Ghost Family Illustration -->
  <g filter="url(#glow-hh)">
    <!-- Left Ghost -->
    <path d="M 1200,2850 C 1150,2200 1350,1700 1600,1650 C 1850,1600 1950,2100 1920,2850 C 1870,2770 1780,2830 1700,2780 C 1620,2830 1530,2770 1450,2820 C 1370,2770 1280,2830 1200,2850 Z" fill="url(#ghost-grad)" stroke="#C4B5FD" stroke-width="24"/>
    <ellipse cx="1520" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="1680" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="1470" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="1730" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <path d="M 1570,2050 Q 1600,2090 1630,2050" stroke="#1E1B4B" stroke-width="16" fill="none" stroke-linecap="round"/>

    <!-- Right Ghost with witch hat -->
    <path d="M 2050,2850 C 2020,2100 2120,1600 2370,1650 C 2620,1700 2820,2200 2770,2850 C 2690,2830 2600,2770 2520,2820 C 2440,2770 2350,2830 2270,2780 C 2190,2830 2100,2770 2050,2850 Z" fill="url(#ghost-grad)" stroke="#C4B5FD" stroke-width="24"/>
    <path d="M 2150,1660 L 2590,1660 L 2420,1220 L 2440,1180 L 2350,1250 Z" fill="#3B0764"/>
    <ellipse cx="2370" cy="1660" rx="280" ry="60" fill="#4C1D95"/>
    <rect x="2240" y="1590" width="260" height="40" fill="#F59E0B"/>
    <ellipse cx="2300" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="2460" cy="1950" rx="28" ry="42" fill="#1E1B4B"/>
    <ellipse cx="2250" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="2510" cy="2020" rx="35" ry="18" fill="#F472B6" opacity="0.6"/>
    <path d="M 2350,2050 Q 2380,2090 2410,2050" stroke="#1E1B4B" stroke-width="16" fill="none" stroke-linecap="round"/>

    <!-- Center Pet Ghost -->
    <path d="M 1750,3050 C 1720,2550 1800,2300 1975,2300 C 2150,2300 2230,2550 2200,3050 C 2140,3010 2080,3040 2020,3000 C 1960,3040 1880,3010 1820,3040 Z" fill="url(#ghost-grad)" stroke="#C4B5FD" stroke-width="20"/>
    <path d="M 1830,2340 L 1780,2180 L 1900,2270 Z" fill="#C4B5FD"/>
    <path d="M 2120,2340 L 2170,2180 L 2050,2270 Z" fill="#C4B5FD"/>
    <ellipse cx="1920" cy="2470" rx="22" ry="32" fill="#1E1B4B"/>
    <ellipse cx="2030" cy="2470" rx="22" ry="32" fill="#1E1B4B"/>
    <polygon points="1975,2510 1960,2530 1990,2530" fill="#1E1B4B"/>
    <ellipse cx="1870" cy="2510" rx="25" ry="14" fill="#F472B6" opacity="0.6"/>
    <ellipse cx="2080" cy="2510" rx="25" ry="14" fill="#F472B6" opacity="0.6"/>
  </g>

  <!-- Glowing Jack-O-Lanterns -->
  <g filter="url(#glow-hh)">
    <g transform="translate(1000, 3100)">
      <ellipse cx="0" cy="0" rx="280" ry="230" fill="url(#pumpkin-grad)"/>
      <polygon points="-80,-40 -50,-90 -20,-40" fill="#FEF08A"/>
      <polygon points="80,-40 50,-90 20,-40" fill="#FEF08A"/>
      <path d="M -110,60 Q 0,140 110,60 Z" fill="#FEF08A"/>
    </g>
    <g transform="translate(2951, 3100)">
      <ellipse cx="0" cy="0" rx="260" ry="220" fill="url(#pumpkin-grad)"/>
      <polygon points="-70,-30 -40,-80 -10,-30" fill="#FEF08A"/>
      <polygon points="70,-30 40,-80 10,-30" fill="#FEF08A"/>
      <path d="M -90,70 Q 0,140 90,70 Z" fill="#FEF08A"/>
    </g>
  </g>

  <!-- Bottom Personalized Family Name -->
  <g transform="translate(1975, 3750)" filter="url(#glow-hh)">
    <rect x="-1150" y="-80" width="2300" height="160" rx="30" fill="#2E1065"/>
    <text x="0" y="24" font-family="'Georgia', serif" font-size="80" font-weight="bold" fill="#FFF7ED" text-anchor="middle" letter-spacing="6">
      ${family}
    </text>
  </g>

  <!-- Bottom Individual Members -->
  <text x="1975" y="4050" font-family="'Arial', sans-serif" font-size="50" font-weight="700" fill="#6B21A8" text-anchor="middle" letter-spacing="8">
    ${members}
  </text>
</svg>`;
    }

    case 'library-of-lost-hours': {
      const patron = (fields.patronName || 'ELEANOR VANCE').toUpperCase();
      const cardNo = (fields.cardNumber || '#1031-B').toUpperCase();
      const due = (fields.dueDate || 'OCT 31').toUpperCase();
      const subject = (fields.specialSubject || 'SUPERNATURAL / VOL. VII').toUpperCase();

      return `
<svg width="1275" height="1155" viewBox="0 0 1275 1155" xmlns="http://www.w3.org/2000/svg">
  <rect x="85" y="65" width="1105" height="1025" rx="24" fill="#FBF7EE" stroke="#44403C" stroke-width="12"/>
  <rect x="115" y="95" width="1045" height="965" rx="16" fill="none" stroke="#78716C" stroke-width="4" stroke-dasharray="12 6"/>

  <text x="637" y="190" font-family="'Courier New', monospace" font-size="54" font-weight="900" fill="#1C1917" text-anchor="middle" letter-spacing="6">
    LIBRARY OF LOST HOURS
  </text>
  <text x="637" y="240" font-family="'Georgia', serif" font-size="28" font-style="italic" fill="#78716C" text-anchor="middle" letter-spacing="3">
    Nocturnal Archives &amp; Gothic Literature Society
  </text>

  <line x1="140" y1="275" x2="1135" y2="275" stroke="#1C1917" stroke-width="6"/>

  <g font-family="'Courier New', monospace" font-size="28" fill="#292524">
    <text x="160" y="325" font-weight="bold">PATRON:</text>
    <text x="310" y="325" fill="#7C2D12" font-weight="bold">${patron}</text>

    <text x="720" y="325" font-weight="bold">CARD NO:</text>
    <text x="870" y="325" fill="#7C2D12" font-weight="bold">${cardNo}</text>

    <text x="160" y="380" font-weight="bold">CLASS:</text>
    <text x="310" y="380" fill="#1C1917">${subject}</text>
  </g>

  <line x1="140" y1="415" x2="1135" y2="415" stroke="#1C1917" stroke-width="6"/>

  <g font-family="'Courier New', monospace" font-size="26" font-weight="bold" fill="#1C1917">
    <text x="240" y="465" text-anchor="middle">DATE DUE</text>
    <line x1="380" y1="415" x2="380" y2="920" stroke="#1C1917" stroke-width="4"/>
    <text x="560" y="465" text-anchor="middle">BORROWER</text>
    <line x1="740" y1="415" x2="740" y2="920" stroke="#1C1917" stroke-width="4"/>
    <text x="935" y="465" text-anchor="middle">STATUS</text>
  </g>

  <line x1="140" y1="495" x2="1135" y2="495" stroke="#1C1917" stroke-width="4"/>

  <!-- Rows -->
  <g font-family="'Courier New', monospace">
    <text x="240" y="555" text-anchor="middle" font-size="30" font-weight="bold" fill="#991B1B" transform="rotate(-3 240 555)">OCT 13 1926</text>
    <text x="410" y="555" font-size="26" fill="#44403C">R. W. Chambers</text>
    <text x="935" y="555" text-anchor="middle" font-size="24" font-weight="bold" fill="#15803D">RETURNED</text>
  </g>
  <line x1="140" y1="585" x2="1135" y2="585" stroke="#D6D3D1" stroke-width="2"/>

  <!-- Featured Stamp -->
  <g font-family="'Courier New', monospace">
    <rect x="155" y="700" width="180" height="65" rx="8" fill="none" stroke="#DC2626" stroke-width="5" transform="rotate(-6 245 732)"/>
    <text x="245" y="745" text-anchor="middle" font-size="34" font-weight="900" fill="#DC2626" transform="rotate(-6 245 745)">${due}</text>
    <text x="410" y="735" font-size="26" font-weight="bold" fill="#1C1917">${patron}</text>
    <text x="935" y="735" text-anchor="middle" font-size="26" font-weight="bold" fill="#DC2626">OVERDUE</text>
  </g>
  <line x1="140" y1="785" x2="1135" y2="785" stroke="#D6D3D1" stroke-width="2"/>

  <line x1="140" y1="920" x2="1135" y2="920" stroke="#1C1917" stroke-width="6"/>
  <text x="637" y="975" font-family="'Georgia', serif" font-size="26" font-style="italic" fill="#57534E" text-anchor="middle" letter-spacing="4">
    "Books borrowed after dark must be returned before dawn."
  </text>
</svg>`;
    }

    case 'midnight-hayride': {
      const location = (fields.locationName || 'SLEEPY HOLLOW, NY').toUpperCase();
      const chapter = (fields.chapterNumber || 'CHAPTER NO. 31').toUpperCase();

      return `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-mh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#451a03" flood-opacity="0.3"/>
    </filter>
  </defs>

  <ellipse cx="1975" cy="2350" rx="1600" ry="1750" fill="none" stroke="#D97706" stroke-width="28" stroke-dasharray="80 30" filter="url(#shadow-mh)"/>
  <ellipse cx="1975" cy="2350" rx="1530" ry="1680" fill="none" stroke="#78350F" stroke-width="12"/>

  <path id="arch-top-mh" d="M 600,1050 Q 1975,480 3351,1050" fill="none"/>
  <text font-family="'Impact', sans-serif" font-size="230" fill="#92400E" letter-spacing="18" filter="url(#shadow-mh)">
    <textPath href="#arch-top-mh" startOffset="50%" text-anchor="middle">
      MIDNIGHT HAYRIDE
    </textPath>
  </text>

  <g transform="translate(1975, 1380)" filter="url(#shadow-mh)">
    <rect x="-950" y="-75" width="1900" height="150" rx="30" fill="#B45309"/>
    <text x="0" y="30" font-family="'Georgia', serif" font-size="96" font-weight="900" fill="#FEF3C7" text-anchor="middle" letter-spacing="16">
      ★ SOCIAL CLUB ★
    </text>
  </g>

  <!-- Wagon & Cowboy Ghost -->
  <g filter="url(#shadow-mh)">
    <rect x="1100" y="2750" width="1751" height="360" rx="30" fill="#78350F"/>
    <circle cx="1400" cy="3200" r="220" fill="#451A03" stroke="#D97706" stroke-width="36"/>
    <circle cx="2551" cy="3200" r="220" fill="#451A03" stroke="#D97706" stroke-width="36"/>

    <!-- Ghost -->
    <path d="M 1750,2600 C 1700,2000 1820,1650 1975,1650 C 2130,1650 2250,2000 2200,2600 Z" fill="#FFFBEB" stroke="#D97706" stroke-width="20"/>
    <path d="M 1700,1680 C 1800,1580 1975,1520 2150,1580 C 2250,1680 2350,1690 2380,1700 C 2350,1680 2200,1400 1975,1400 C 1750,1400 1600,1680 1570,1700 Z" fill="#78350F"/>
    <ellipse cx="1930" cy="1820" rx="24" ry="36" fill="#451A03"/>
    <ellipse cx="2020" cy="1820" rx="24" ry="36" fill="#451A03"/>
    <polygon points="1900,1950 2050,1950 1975,2080" fill="#DC2626"/>
  </g>

  <!-- Custom Location Banner -->
  <g transform="translate(1975, 3850)" filter="url(#shadow-mh)">
    <rect x="-1050" y="-70" width="2100" height="140" rx="24" fill="#451A03"/>
    <text x="0" y="24" font-family="'Georgia', serif" font-size="76" font-weight="bold" fill="#FEF3C7" text-anchor="middle" letter-spacing="10">
      ${location} • ${chapter}
    </text>
  </g>
</svg>`;
    }

    case 'field-notes-after-dark': {
      const animal = (fields.woodlandAnimal || 'TYTO ALBA (BARN OWL)').toUpperCase();
      const location = (fields.fieldLocation || 'WHITE MOUNTAIN WILDERNESS • NEW HAMPSHIRE').toUpperCase();
      const observer = (fields.observerName || 'E. HEMINGWAY').toUpperCase();

      return `
<svg width="5400" height="7200" viewBox="0 0 5400 7200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-fn" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="30" flood-color="#1c1917" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect x="250" y="250" width="4900" height="6700" rx="20" fill="#FDFBF7" stroke="#44403C" stroke-width="20" filter="url(#shadow-fn)"/>
  <rect x="320" y="320" width="4760" height="6560" fill="none" stroke="#A8A29E" stroke-width="6"/>

  <text x="2700" y="920" font-family="'Georgia', serif" font-size="240" font-weight="900" fill="#1C1917" text-anchor="middle" letter-spacing="18">
    FIELD NOTES AFTER DARK
  </text>
  <text x="2700" y="1120" font-family="'Georgia', serif" font-size="74" font-style="italic" fill="#7C2D12" text-anchor="middle" letter-spacing="10">
    An Autumnal Study of Woodland Nightlife &amp; Nocturnal Habitation
  </text>

  <line x1="450" y1="1240" x2="4950" y2="1240" stroke="#1C1917" stroke-width="8"/>

  <!-- Owl & Branch -->
  <g filter="url(#shadow-fn)">
    <path d="M 600,4300 Q 1800,4000 2700,4100 Q 3800,4200 4800,3800" fill="none" stroke="#78350F" stroke-width="60" stroke-linecap="round"/>
    <ellipse cx="2700" cy="3000" rx="650" ry="1050" fill="#FFFBEB" stroke="#92400E" stroke-width="20"/>
    <circle cx="2500" cy="2350" r="90" fill="#1C1917" stroke="#D97706" stroke-width="18"/>
    <circle cx="2900" cy="2350" r="90" fill="#1C1917" stroke="#D97706" stroke-width="18"/>
    <polygon points="2700,2450 2670,2600 2730,2600" fill="#B45309"/>
  </g>

  <!-- Specimen Label Box -->
  <g transform="translate(2700, 5200)" filter="url(#shadow-fn)">
    <rect x="-1900" y="-200" width="3800" height="400" rx="20" fill="#F5F5F4" stroke="#1C1917" stroke-width="12"/>
    <text x="-1800" y="-80" font-family="'Courier New', monospace" font-size="52" font-weight="bold" fill="#78716C">FIG. 1: ${animal}</text>
    <text x="-1800" y="0" font-family="'Georgia', serif" font-size="70" font-weight="900" fill="#1C1917">
      LOCATION: ${location}
    </text>
    <text x="-1800" y="90" font-family="'Courier New', monospace" font-size="46" fill="#44403C">
      OBSERVER: ${observer} • ELEVATION: 3,420 FT • TIME: 23:45 HRS
    </text>
  </g>
</svg>`;
    }

    case 'leftovers-league': {
      const family = (fields.leagueFamilyName || 'THE HENDERSON CLAN').toUpperCase();
      const year = (fields.leagueYear || '2026').toUpperCase();
      const role = (fields.memberRole || 'OFFICIAL PIE INSPECTOR').toUpperCase();

      return `
<svg width="3951" height="4800" viewBox="0 0 3951 4800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="shadow-ll" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#451a03" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Shield -->
  <path d="M 800,900 L 3151,900 L 3151,2600 C 3151,3400 1975,4100 1975,4100 C 1975,4100 800,3400 800,2600 Z" fill="none" stroke="#7C2D12" stroke-width="36" filter="url(#shadow-ll)"/>

  <text x="1975" y="750" font-family="'Impact', sans-serif" font-size="200" fill="#7C2D12" text-anchor="middle" letter-spacing="14" filter="url(#shadow-ll)">
    THE ANNUAL
  </text>
  <text x="1975" y="1320" font-family="'Impact', sans-serif" font-size="310" fill="#991B1B" text-anchor="middle" letter-spacing="12" filter="url(#shadow-ll)">
    LEFTOVERS LEAGUE
  </text>

  <!-- Turkey Platter -->
  <ellipse cx="1975" cy="2250" rx="650" ry="420" fill="#F59E0B" stroke="#78350F" stroke-width="24"/>
  <ellipse cx="1500" cy="2050" rx="200" ry="120" fill="#D97706" transform="rotate(-30 1500 2050)"/>
  <ellipse cx="2450" cy="2050" rx="200" ry="120" fill="#D97706" transform="rotate(30 2450 2050)"/>

  <!-- Championship Ribbon -->
  <g transform="translate(1975, 3350)" filter="url(#shadow-ll)">
    <rect x="-1050" y="-80" width="2100" height="160" rx="30" fill="#7C2D12"/>
    <text x="0" y="28" font-family="'Arial Black', sans-serif" font-size="80" font-weight="900" fill="#FEF08A" text-anchor="middle" letter-spacing="10">
      ${family} • ${year}
    </text>
  </g>

  <!-- Member Role Banner -->
  <g transform="translate(1975, 3700)" filter="url(#shadow-ll)">
    <rect x="-850" y="-60" width="1700" height="120" rx="24" fill="#991B1B"/>
    <text x="0" y="22" font-family="'Impact', sans-serif" font-size="70" fill="#FFF7ED" text-anchor="middle" letter-spacing="8">
      ROLE: ${role}
    </text>
  </g>
</svg>`;
    }

    default:
      return '';
  }
}

/**
 * Saves a personalized design as a full product configuration and adds it directly to the customer's cart.
 */
export async function addPersonalizedDesignToCart({
  slug,
  fields,
  product,
  design,
}: {
  slug: string;
  fields: PersonalizationFields;
  product: MerchProduct;
  design: CuratedDesign;
}): Promise<CartConfigurationSnapshot> {
  const customizedSvg = buildPersonalizedSvg(slug, fields);
  // Create an SVG Data URL representation of the customer's customized artwork
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(customizedSvg)}`;
  const customLabel =
    fields.familyName ||
    fields.patronName ||
    fields.locationName ||
    fields.leagueFamilyName ||
    'Customized';

  const customizedAsset = {
    ...design.asset,
    id: design.asset.id,
    version: design.asset.version,
    url: svgDataUrl,
    productionUrl: design.asset.productionUrl ?? design.asset.url,
    alt: `${design.title} (${customLabel})`,
    hasTransparency: true,
    sourceType: 'text-personalized' as const,
  };

  const template = getPreviewTemplate(product.previewTemplateId);
  const configuration: ProductConfiguration = createProductConfiguration({
    designId: design.id,
    design: customizedAsset,
    product,
    template,
  });

  const snapshot = createCartSnapshot({
    id: `cart-item-personalized-${slug}-${Date.now()}`,
    configuration,
    design: {
      ...design,
      title: `${design.title} (${customLabel})`,
      asset: customizedAsset,
    },
    product,
    createdAt: new Date().toISOString(),
  });

  // Persist to local cart storage
  const currentItems = readLocalCart(window.localStorage);
  const updatedItems = upsertCartItem(currentItems, snapshot);
  writeLocalCart(window.localStorage, updatedItems);

  // Attempt to persist to database cart if enabled
  try {
    await upsertPersistentCartItem(snapshot);
  } catch {
    // Non-blocking fallback to local cart
  }

  return snapshot;
}
