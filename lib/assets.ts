/**
 * Centralized asset manifest with real product photography from Unsplash.
 *
 * Design areas are positioned to match REAL print specifications:
 *  - T-shirt: 12.5"×16" print on a 22"×30" shirt (~30% of visible front)
 *  - Hoodie: 12"×14" front center chest print
 *  - Mug: print wraps around side (not on top of lid)
 *  - Canvas/Poster: design IS the whole canvas/poster
 *  - Phone case: print is back-of-phone area excluding camera
 *  - Tote bag: design centered in front face panel
 *  - Sticker: the sticker itself IS the design
 *
 * All Unsplash URLs use stable photo IDs and CDN transforms.
 * If you replace these with your own Printify mockup URLs later,
 * update this file only — all components read from here.
 */

const U = (id: string, w = 800, q = 80) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;

// Hero — real photograph that "lives" inside the phone, then transfers to the shirt
export const HERO_PHOTO = U('1583337130417-3346a1be7dee', 600, 85);

// Product mockup library — each entry has photo + precise print area coordinates
// designArea values are percentages of the container (top, left, width, height)
export const PRODUCT_PHOTOS = {
  tshirt: {
    image: U('1581655353564-df123a1eb820', 800, 80), // clean white tee on plain bg
    designArea: { top: '28%', left: '40%', width: '20%', height: '22%' },
    aspectRatio: '12/14', // matches real print area
    name: 'T-Shirt',
    from: '$24',
  },
  mug: {
    image: U('1514228742587-6b1558fcca3d', 800, 80), // white ceramic mug
    designArea: { top: '38%', left: '32%', width: '36%', height: '28%' },
    aspectRatio: '3/2', // mug wrap-around visible area
    name: 'Mug',
    from: '$14',
  },
  canvas: {
    image: U('1554188248-986adbb73be4', 800, 80), // single blank canvas on easel
    designArea: { top: '18%', left: '24%', width: '52%', height: '60%' },
    aspectRatio: '4/5',
    name: 'Canvas',
    from: '$39',
  },
  poster: {
    image: U('1582213782179-e0d53f98f2ca', 800, 80), // poster frame on wall
    designArea: { top: '15%', left: '22%', width: '56%', height: '70%' },
    aspectRatio: '2/3', // standard poster ratio
    name: 'Poster',
    from: '$12',
  },
  hoodie: {
    image: U('1620799140408-edc6dcb6d633', 800, 80), // blank front hoodie
    designArea: { top: '32%', left: '38%', width: '24%', height: '24%' },
    aspectRatio: '1/1', // front center chest print
    name: 'Hoodie',
    from: '$44',
  },
  phoneCase: {
    image: U('1567581935884-3349723552ca', 800, 80), // single phone back
    designArea: { top: '14%', left: '34%', width: '32%', height: '70%' },
    aspectRatio: '9/19', // phone back proportion
    name: 'Phone Case',
    from: '$19',
  },
  toteBag: {
    image: U('1544816155-12df9643f363', 800, 80), // plain canvas tote
    designArea: { top: '32%', left: '34%', width: '32%', height: '32%' },
    aspectRatio: '1/1',
    name: 'Tote Bag',
    from: '$18',
  },
  sticker: {
    image: U('1611195974226-a6a9be9dd763', 800, 80), // laptop with stickers
    designArea: { top: '34%', left: '36%', width: '28%', height: '28%' },
    aspectRatio: '1/1',
    name: 'Sticker',
    from: '$4',
  },
} as const;

// Before/After transformation examples for "See The Transformation"
export const TRANSFORMATION_EXAMPLES = [
  {
    label: 'Pet Portrait',
    style: 'Royal Renaissance',
    before: U('1543466835-00a7907e9de1', 700, 80),
    after: U('1583511655857-d19b40a7a54e', 700, 80),
  },
  {
    label: 'Family Memory',
    style: 'Oil Painting',
    before: U('1511895426328-dc8714191300', 700, 80),
    after: U('1578321272176-b7bbc0679853', 700, 80),
  },
  {
    label: 'Travel Moment',
    style: 'Watercolor',
    before: U('1506905925346-21bda4d32df4', 700, 80),
    after: U('1493246507139-91e8fad9978e', 700, 80),
  },
] as const;

// Hero phone screen content - real photograph that transfers to the shirt
export const HERO_IMAGES = {
  phoneScreen: U('1583337130417-3346a1be7dee', 500, 85),
  shirtBlank: U('1581655353564-df123a1eb820', 600, 85),
};
