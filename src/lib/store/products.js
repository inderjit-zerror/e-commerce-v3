// Product catalogue for the 3D store.
// `type` picks the procedural garment shape, `category` decides where it hangs.

export const STORE_NAME = 'THREADS';
export const CURRENCY = 'USD';

const C = {
  black: { name: 'Black', hex: '#1d1d1f' },
  white: { name: 'White', hex: '#f2f1ee' },
  ivory: { name: 'Ivory', hex: '#e9e2d3' },
  sand: { name: 'Sand', hex: '#cbb595' },
  camel: { name: 'Camel', hex: '#b5864f' },
  olive: { name: 'Olive', hex: '#5d6140' },
  sage: { name: 'Sage', hex: '#99ad86' },
  forest: { name: 'Forest', hex: '#2e4a3a' },
  navy: { name: 'Navy', hex: '#1f2a44' },
  sky: { name: 'Sky', hex: '#8fb3d9' },
  indigo: { name: 'Indigo', hex: '#2f4a73' },
  lightWash: { name: 'Light Wash', hex: '#7f9ec2' },
  rust: { name: 'Rust', hex: '#a2482b' },
  terracotta: { name: 'Terracotta', hex: '#c06a4a' },
  burgundy: { name: 'Burgundy', hex: '#6d1f2c' },
  blush: { name: 'Blush', hex: '#e3b7b0' },
  lilac: { name: 'Lilac', hex: '#b9a6d3' },
  mustard: { name: 'Mustard', hex: '#d4a23a' },
  charcoal: { name: 'Charcoal', hex: '#3a3b3f' },
  heather: { name: 'Heather Grey', hex: '#a7a9ac' },
};

export const CATEGORY_LABELS = {
  outerwear: 'Outerwear',
  bottoms: 'Denim & Trousers',
  knitwear: 'Knitwear',
  dresses: 'Dresses',
  hoodies: 'Hoodies',
  tees: 'Tees',
  new: 'New In',
  sale: 'Sale',
  looks: 'Featured Look',
};

const SIZES = {
  top: ['XS', 'S', 'M', 'L', 'XL'],
  bottom: ['28', '30', '32', '34', '36'],
  dress: ['XS', 'S', 'M', 'L'],
};

const DETAILS = {
  tee: ['240gsm organic cotton jersey', 'Relaxed fit, dropped shoulder', 'Machine wash cold'],
  sweater: ['Soft-touch knit', 'Ribbed cuffs and hem', 'Hand wash or dry flat'],
  hoodie: ['400gsm brushed-back fleece', 'Double-lined hood, kangaroo pocket', 'Machine wash cold'],
  jacket: ['Water-repellent outer shell', 'Two chest pockets, horn buttons', 'Dry clean only'],
  pants: ['Mid rise, straight through the leg', 'Five-pocket construction', 'Machine wash cold, inside out'],
  dress: ['Fluid woven fabric', 'Fitted bodice with a flowing skirt', 'Gentle machine wash'],
};

const BLURB = {
  tee: 'An everyday staple cut from dense, breathable cotton that softens with every wash.',
  sweater: 'A layering essential with a clean crew neckline and a comfortable, easy shape.',
  hoodie: 'Heavyweight comfort with structure, built to keep its shape season after season.',
  jacket: 'A considered outer layer with utility details and a sharp, modern silhouette.',
  pants: 'Versatile bottoms with a balanced fit that dresses up or down without effort.',
  dress: 'A graceful silhouette that moves beautifully, from daytime to evening.',
};

const p = (id, type, category, name, price, colors, extra = {}) => ({
  id,
  type,
  category,
  name,
  price,
  colors,
  sizes: type === 'pants' ? SIZES.bottom : type === 'dress' ? SIZES.dress : SIZES.top,
  description: extra.description ?? BLURB[type],
  details: DETAILS[type],
  ...extra,
});

export const PRODUCTS = [
  // Outerwear wall
  p('j1', 'jacket', 'outerwear', 'Field Utility Jacket', 189, [C.olive, C.black, C.sand]),
  p('j2', 'jacket', 'outerwear', 'Waxed Cotton Chore Coat', 165, [C.camel, C.forest, C.black], { long: true }),
  p('j3', 'jacket', 'outerwear', 'Technical Shell Jacket', 210, [C.black, C.navy, C.rust]),
  p('j4', 'jacket', 'outerwear', 'Cropped Denim Trucker', 140, [C.indigo, C.lightWash, C.black]),
  // Denim & trousers wall
  p('p1', 'pants', 'bottoms', 'Straight Selvedge Jean', 128, [C.indigo, C.black, C.lightWash]),
  p('p2', 'pants', 'bottoms', 'Relaxed Pleated Trouser', 115, [C.charcoal, C.sand, C.olive]),
  p('p3', 'pants', 'bottoms', 'Wide Leg Cargo Pant', 120, [C.olive, C.black, C.sand], { wide: true, cargo: true }),
  p('p4', 'pants', 'bottoms', 'Tapered Chino', 95, [C.camel, C.navy, C.ivory]),
  // Knitwear wall
  p('k1', 'sweater', 'knitwear', 'Merino Crewneck', 135, [C.burgundy, C.navy, C.ivory]),
  p('k2', 'sweater', 'knitwear', 'Cable Knit Sweater', 160, [C.ivory, C.forest, C.camel]),
  p('k3', 'sweater', 'knitwear', 'Brushed Mohair Crew', 175, [C.lilac, C.sage, C.charcoal]),
  p('k4', 'sweater', 'knitwear', 'Waffle Long Sleeve', 68, [C.heather, C.rust, C.black]),
  // Dresses wall
  p('d1', 'dress', 'dresses', 'Slip Midi Dress', 145, [C.blush, C.black, C.sage]),
  p('d2', 'dress', 'dresses', 'Linen Wrap Dress', 160, [C.ivory, C.terracotta, C.sky]),
  p('d3', 'dress', 'dresses', 'Pleated Maxi Dress', 175, [C.forest, C.burgundy, C.navy]),
  p('d4', 'dress', 'dresses', 'Ribbed Knit Dress', 120, [C.camel, C.charcoal, C.lilac]),
  // Hoodies wall
  p('h1', 'hoodie', 'hoodies', 'Heavyweight Hoodie', 98, [C.heather, C.black, C.forest]),
  p('h2', 'hoodie', 'hoodies', 'Garment Dyed Hoodie', 105, [C.terracotta, C.sage, C.navy]),
  p('h3', 'hoodie', 'hoodies', 'Zip Through Hoodie', 110, [C.charcoal, C.sand, C.burgundy]),
  p('h4', 'hoodie', 'hoodies', 'Loopback Fleece Hoodie', 92, [C.sky, C.ivory, C.black]),
  // Tees wall
  p('t1', 'tee', 'tees', 'Essential Cotton Tee', 35, [C.white, C.black, C.heather]),
  p('t2', 'tee', 'tees', 'Boxy Pocket Tee', 42, [C.sand, C.olive, C.navy]),
  p('t3', 'tee', 'tees', 'Graphic Studio Tee', 48, [C.black, C.ivory, C.mustard], { print: true }),
  p('t4', 'tee', 'tees', 'Striped Breton Tee', 55, [C.navy, C.rust, C.black], { pattern: 'stripes' }),
  // New In gondola
  p('n1', 'tee', 'new', 'Organic Heavy Tee', 45, [C.ivory, C.forest, C.rust], { badge: 'New' }),
  p('n2', 'jacket', 'new', 'Quilted Liner Jacket', 150, [C.olive, C.navy, C.black], { badge: 'New' }),
  p('n3', 'sweater', 'new', 'Half Zip Fleece', 110, [C.sand, C.forest, C.charcoal], { badge: 'New' }),
  p('n4', 'hoodie', 'new', 'Washed Oversized Hoodie', 115, [C.sage, C.lilac, C.charcoal], { badge: 'New' }),
  p('n5', 'pants', 'new', 'Carpenter Work Pant', 125, [C.camel, C.black, C.ivory], { badge: 'New', cargo: true }),
  p('n6', 'dress', 'new', 'Poplin Shirt Dress', 138, [C.sky, C.white, C.black], { badge: 'New' }),
  // Sale gondola
  p('s1', 'tee', 'sale', 'Ringer Tee', 25, [C.white, C.mustard, C.sky], { compareAt: 40, badge: 'Sale' }),
  p('s2', 'hoodie', 'sale', 'Classic Pullover Hoodie', 59, [C.navy, C.heather, C.rust], { compareAt: 90, badge: 'Sale' }),
  p('s3', 'jacket', 'sale', 'Nylon Coach Jacket', 89, [C.black, C.forest, C.burgundy], { compareAt: 140, badge: 'Sale' }),
  p('s4', 'pants', 'sale', 'Jogger Sweatpant', 49, [C.heather, C.black, C.navy], { compareAt: 75, badge: 'Sale' }),
  p('s5', 'sweater', 'sale', 'Lambswool Crew', 79, [C.mustard, C.forest, C.ivory], { compareAt: 120, badge: 'Sale' }),
  p('s6', 'dress', 'sale', 'Floral Tea Dress', 85, [C.blush, C.sage, C.navy], { compareAt: 130, badge: 'Sale' }),
  // Mannequin looks
  p('m1', 'jacket', 'looks', 'Signature Trench Coat', 245, [C.camel, C.black, C.navy], { long: true, badge: 'Featured' }),
  p('m2', 'dress', 'looks', 'Silk Evening Dress', 220, [C.burgundy, C.black, C.forest], { badge: 'Featured' }),
  p('m3', 'sweater', 'looks', 'Cashmere Rollneck', 195, [C.ivory, C.charcoal, C.camel], { badge: 'Featured', rollneck: true }),
  p('m4', 'hoodie', 'looks', 'Archive Logo Hoodie', 120, [C.rust, C.black, C.ivory], { badge: 'Featured' }),
  p('m5', 'dress', 'looks', 'Satin Column Dress', 198, [C.forest, C.blush, C.black], { badge: 'Featured' }),
];

export const PRODUCTS_BY_ID = Object.fromEntries(PRODUCTS.map((item) => [item.id, item]));

const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY, maximumFractionDigits: 0 });
export const formatPrice = (value) => formatter.format(value);
