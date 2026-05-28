/**
 * Centralized asset manifest.
 *
 * All product photography and lifestyle imagery comes from Unsplash's CDN
 * (free for commercial use under the Unsplash License — no attribution
 * required, but credit is appreciated).
 *
 * URLs use Unsplash's image transformation params:
 *   - w=  : width in pixels
 *   - q=  : quality 0-100
 *   - auto=format : serves WebP/AVIF where supported
 *   - fit=crop : crop to dimensions
 *
 * When swapping for your own/Printify product photos later, just update
 * the URLs here — all components read from this one file.
 */

const U = (id: string, w = 800, q = 80) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=${q}&auto=format&fit=crop`;

// Hero — real photograph that "lives" inside the phone, then transfers to the shirt
export const HERO_PHOTO = U('1583337130417-3346a1be7dee', 600, 85); // golden hour landscape

// Product lifestyle photography for "Print On Anything" section
// Each shows the product in a real-world setting with space for design overlay
export const PRODUCT_PHOTOS = {
  tshirt: {
    image: U('1521572163474-6864f9cf17ab', 800, 80), // white tee on hanger
    designArea: { top: '38%', left: '34%', width: '32%', height: '32%' },
    name: 'T-Shirt',
    from: '$24',
  },
  mug: {
    image: U('1577937927133-66ef06acdf18', 800, 80), // white mug on wood
    designArea: { top: '32%', left: '28%', width: '40%', height: '40%' },
    name: 'Mug',
    from: '$14',
  },
  canvas: {
    image: U('1513519245088-0e12902e5a38', 800, 80), // framed art on wall
    designArea: { top: '12%', left: '14%', width: '72%', height: '76%' },
    name: 'Canvas',
    from: '$39',
  },
  poster: {
    image: U('1545063914-a1a6ec821ee5', 800, 80), // poster on bedroom wall
    designArea: { top: '18%', left: '22%', width: '56%', height: '64%' },
    name: 'Poster',
    from: '$12',
  },
  hoodie: {
    image: U('1556821840-3a63f95609a7', 800, 80), // hoodie flat lay
    designArea: { top: '35%', left: '32%', width: '36%', height: '30%' },
    name: 'Hoodie',
    from: '$44',
  },
  phoneCase: {
    image: U('1556656793-08538906a9f8', 800, 80), // phone in hand
    designArea: { top: '22%', left: '32%', width: '36%', height: '56%' },
    name: 'Phone Case',
    from: '$19',
  },
  toteBag: {
    image: U('1591561954557-26941169b49e', 800, 80), // tote bag
    designArea: { top: '38%', left: '32%', width: '36%', height: '34%' },
    name: 'Tote Bag',
    from: '$18',
  },
  sticker: {
    image: U('1583394838336-acd977736f90', 800, 80), // laptop with stickers
    designArea: { top: '30%', left: '30%', width: '40%', height: '40%' },
    name: 'Sticker',
    from: '$4',
  },
} as const;

// Before/After transformation examples for the "See The Transformation" section
// Each pair shows a real photo and the AI-stylized output
export const TRANSFORMATION_EXAMPLES = [
  {
    label: 'Pet Portrait',
    style: 'Royal Renaissance',
    before: U('1543466835-00a7907e9de1', 700, 80), // real dog photo
    after: U('1583511655857-d19b40a7a54e', 700, 80),  // stylized art
  },
  {
    label: 'Family Memory',
    style: 'Oil Painting',
    before: U('1511895426328-dc8714191300', 700, 80), // family photo
    after: U('1578321272176-b7bbc0679853', 700, 80),  // painterly
  },
  {
    label: 'Travel Moment',
    style: 'Watercolor',
    before: U('1506905925346-21bda4d32df4', 700, 80), // mountain landscape
    after: U('1493246507139-91e8fad9978e', 700, 80),  // watercolor mountain
  },
] as const;

// Hero phone screen content - real photograph that transfers to the shirt
export const HERO_IMAGES = {
  phoneScreen: U('1583337130417-3346a1be7dee', 500, 85), // golden hour photo
  shirtBlank: U('1521572163474-6864f9cf17ab', 600, 85),  // white tee
};
