/**
 * Homepage drop wall. Every image is an official Printify mockup of that exact
 * design on the product and colour named here (public/merch/provenance.json),
 * and every card is purchasable in that product and colour.
 */
export interface ShowcaseCard {
  slug: string;
  productId: string;
  color: string | null;
  main: { src: string; alt: string };
  hover: { src: string; alt: string };
  tag: string;
  size: 'feature' | 'tall' | 'wide' | 'regular';
}

export const dropShowcase: ShowcaseCard[] = [
  {
    slug: 'made-by-machines',
    productId: 'heavy-hoodie',
    color: 'Black',
    main: { src: '/merch/made-by-machines--lifestyle-2.webp', alt: 'Woman on a sofa wearing the black PrintMe robot stencil hoodie' },
    hover: { src: '/merch/made-by-machines--person-6-front.webp', alt: 'Man wearing the black robot stencil hoodie' },
    tag: 'Brand merch',
    size: 'feature',
  },
  {
    slug: 'second-helping-athletics',
    productId: 'cozy-crewneck',
    color: 'Sport Grey',
    main: { src: '/merch/second-helping-athletics--lifestyle-2.webp', alt: 'Woman holding an iced coffee in the grey Second Helping Athletics turkey crewneck' },
    hover: { src: '/merch/second-helping-athletics--folded-2.webp', alt: 'Folded grey turkey crewneck on a knit blanket' },
    tag: 'Thanksgiving',
    size: 'tall',
  },
  {
    slug: 'he-saw-the-group-chat',
    productId: 'gallery-poster',
    color: null,
    main: { src: '/merch/he-saw-the-group-chat--context-4.webp', alt: 'Krampus horror poster hanging above a mantel with Christmas stockings' },
    hover: { src: '/merch/he-saw-the-group-chat--front.webp', alt: 'He Saw the Group Chat poster, front view' },
    tag: 'Christmas',
    size: 'regular',
  },
  {
    slug: 'supervising-the-decorations',
    productId: 'everyday-tee',
    color: 'Natural',
    main: { src: '/merch/supervising-the-decorations--duo-3.webp', alt: 'Two friends wearing the natural Supervising the Decorations dog tee' },
    hover: { src: '/merch/supervising-the-decorations--hanging-3.webp', alt: 'Natural dog in Christmas lights tee hanging on a chair' },
    tag: 'Pet parents',
    size: 'wide',
  },
  {
    slug: 'soup-of-the-day',
    productId: 'keepsake-mug',
    color: null,
    main: { src: '/merch/soup-of-the-day--context-1.webp', alt: 'Soup of the Day mug beside candles and pine cones' },
    hover: { src: '/merch/soup-of-the-day--left.webp', alt: 'Soup of the Day mug, handle on the left' },
    tag: 'Cozy season',
    size: 'regular',
  },
  {
    slug: 'one-more-chapter-tour',
    productId: 'everyday-tee',
    color: 'Black',
    main: { src: '/merch/one-more-chapter-tour--lifestyle.webp', alt: 'Woman by a plant wearing the black One More Chapter World Tour tee' },
    hover: { src: '/merch/one-more-chapter-tour--hanging-2.webp', alt: 'Black reading skeleton tour tee on a hanger' },
    tag: 'Book club',
    size: 'regular',
  },
  {
    slug: 'low-power-mode',
    productId: 'everyday-tee',
    color: 'Heather Navy',
    main: { src: '/merch/low-power-mode--person-5.webp', alt: 'Smiling woman in the heather navy Low Power Mode capybara tee' },
    hover: { src: '/merch/low-power-mode--folded.webp', alt: 'Folded heather navy capybara tee' },
    tag: 'Funny animals',
    size: 'regular',
  },
  {
    slug: 'civilized-trash',
    productId: 'everyday-tee',
    color: 'Soft Cream',
    main: { src: '/merch/civilized-trash--person-2.webp', alt: 'Man in the soft cream Civilized Trash opossum tee' },
    hover: { src: '/merch/civilized-trash--hanging-1.webp', alt: 'Soft cream opossum tee hanging' },
    tag: 'Specimen Plates',
    size: 'regular',
  },
  {
    slug: 'professional-rummager',
    productId: 'everyday-tee',
    color: 'Athletic Heather',
    main: { src: '/merch/professional-rummager--duo-4.webp', alt: 'Two friends laughing in the heather grey Professional Rummager raccoon tee' },
    hover: { src: '/merch/professional-rummager--folded.webp', alt: 'Folded heather grey raccoon tee' },
    tag: 'Specimen Plates',
    size: 'wide',
  },
  {
    slug: 'carved-under-protest',
    productId: 'everyday-tee',
    color: 'White',
    main: { src: '/merch/carved-under-protest--hanging-3.webp', alt: 'White Carved Under Protest grumpy pumpkin tee on a chair' },
    hover: { src: '/merch/carved-under-protest--person-8-front.webp', alt: 'Man wearing the white grumpy pumpkin tee' },
    tag: 'Halloween',
    size: 'regular',
  },
];

/** Real blanks for the product strip: Printify flat mockups in different colours. */
export const canvasStrip = [
  { productId: 'everyday-tee', image: '/shop-v2/flat/tee-black-front.webp', alt: 'Black Bella+Canvas 3001 tee', note: '6 colours' },
  { productId: 'cozy-crewneck', image: '/shop-v2/flat/crewneck-sand-front.webp', alt: 'Sand Gildan 18000 crewneck', note: '3 colours' },
  { productId: 'heavy-hoodie', image: '/shop-v2/flat/hoodie-sport-grey-front.webp', alt: 'Sport grey Gildan 18500 hoodie', note: '2 colours' },
  { productId: 'keepsake-mug', image: '/shop-v2/mug-left-base.webp', alt: 'White 11 oz ceramic mug', note: 'Both sides' },
  { productId: 'gallery-poster', image: '/shop-v2/photo/poster-12x18.webp', alt: 'Archival matte poster', note: '12×18 or 18×24' },
];
