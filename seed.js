/**
 * =============================================================================
 *  Cozy Loops — Database Seed Script
 * =============================================================================
 *  Populates the database with realistic demo data for local development.
 *
 *  Usage:   node seed.js
 *
 *  - Connects exactly like the app (src/config/database.js -> MONGODB_URI).
 *  - WIPES all 8 collections, then seeds in dependency order.
 *  - Uses Model.create()/.save() (never insertMany) so every pre-save hook runs:
 *      * User password hashing (bcryptjs)  -> pass PLAIN passwords here.
 *      * Product/Category/Maker slug generation.
 *      * Order orderNumber generation.
 *      * Cart/Wishlist total recalculation.
 *
 *  Dev login for every seeded user:  Password123!
 * =============================================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./src/config/database');

// Register all 8 models (connectDB only requires 4 via src/models/index.js).
const User = require('./src/models/User');
const Category = require('./src/models/Category');
const Maker = require('./src/models/Maker');
const Product = require('./src/models/Product');
const Review = require('./src/models/Review');
const Cart = require('./src/models/Cart');
const Wishlist = require('./src/models/Wishlist');
const Order = require('./src/models/Order');

// ---------------------------------------------------------------------------
// Small helpers (no faker dependency — curated data + a little randomness)
// ---------------------------------------------------------------------------
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const money = (n) => Math.round(n * 100) / 100;

/** Pick `n` distinct elements from `arr`. */
const sampleMany = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};

/** Stripe-style PaymentIntent id, e.g. pi_3Rk8x2Bb... */
const stripeIntentId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 24; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'pi_3' + s;
};

/** Build an Unsplash CDN url from a photo id. */
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// Curated pools of Unsplash photo ids per category (representative home/decor imagery).
const CATEGORY_IMAGES = {
  Furniture: ['1586023492125-27b2c045efd7', '1567538096630-e0c55bd6374c', '1538688525198-9b88f6f53126', '1503602642458-232111445657'],
  Lighting: ['1507473885765-e6ed057f782c', '1524484485831-a92ffc0de03f', '1513506003901-1e6a229e2d15', '1565374395542-0ce18882c857'],
  'Ceramics & Pottery': ['1610701596007-11502861dcfa', '1578749556568-bc2c40e68b61', '1493106641515-6b5631de4bb9', '1565193566173-7a0ee3dbe261'],
  'Textiles & Rugs': ['1522771739844-6a9f6d5f14af', '1616627561839-074385245ff6', '1600166898405-da9535204843', '1631679706909-1844bbd07221'],
  'Wall Art & Decor': ['1493809842364-78817add7ffb', '1545558014-8692077e9b5c', '1502005229762-cf1b2da7c5d6', '1531913764164-f85c52e6e654'],
  'Kitchen & Dining': ['1556910103-1c02745aae4d', '1590794056226-79ef3a8147e1', '1607330289024-1535c6b4e1c1', '1556909212-d5b604d0c90d'],
};

const COLORS = ['Natural Oak', 'Walnut', 'Charcoal', 'Ivory', 'Sage Green', 'Terracotta', 'Dusty Blue', 'Cream', 'Matte Black'];
const MATERIALS = ['Solid Wood', 'Hand-Blown Glass', 'Stoneware', 'Wool', 'Linen', 'Brass', 'Rattan', 'Cotton'];
const SIZES = ['Small', 'Medium', 'Large'];

// ---------------------------------------------------------------------------
// 1) Categories (6)
// ---------------------------------------------------------------------------
const categoriesData = [
  {
    name: 'Furniture',
    description: 'Handcrafted tables, chairs, and storage built from solid, sustainably sourced wood.',
    image: img(CATEGORY_IMAGES.Furniture[0]),
    heroTitle: 'Furniture That Tells a Story',
    heroDescription: 'Timeless pieces shaped by hand to anchor every room with warmth and character.',
    heroImage: img(CATEGORY_IMAGES.Furniture[1]),
    featured: true,
    sortOrder: 1,
  },
  {
    name: 'Lighting',
    description: 'Hand-blown glass, woven shades, and warm brass fixtures to set the perfect mood.',
    image: img(CATEGORY_IMAGES.Lighting[0]),
    heroTitle: 'Light, Reimagined by Hand',
    heroDescription: 'Sculptural lamps and pendants that cast a soft, inviting glow.',
    heroImage: img(CATEGORY_IMAGES.Lighting[1]),
    featured: true,
    sortOrder: 2,
  },
  {
    name: 'Ceramics & Pottery',
    description: 'Wheel-thrown mugs, bowls, vases, and planters with one-of-a-kind glazes.',
    image: img(CATEGORY_IMAGES['Ceramics & Pottery'][0]),
    heroTitle: 'Earth, Fire & Patience',
    heroDescription: 'Functional pottery made the slow way, glazed to perfection.',
    heroImage: img(CATEGORY_IMAGES['Ceramics & Pottery'][1]),
    featured: false,
    sortOrder: 3,
  },
  {
    name: 'Textiles & Rugs',
    description: 'Naturally dyed throws, pillows, and hand-knotted rugs woven from pure fibers.',
    image: img(CATEGORY_IMAGES['Textiles & Rugs'][0]),
    heroTitle: 'Layers of Comfort',
    heroDescription: 'Soft, durable textiles that bring texture and calm to your space.',
    heroImage: img(CATEGORY_IMAGES['Textiles & Rugs'][1]),
    featured: true,
    sortOrder: 4,
  },
  {
    name: 'Wall Art & Decor',
    description: 'Original prints, macramé, mirrors, and accents to give your walls a voice.',
    image: img(CATEGORY_IMAGES['Wall Art & Decor'][0]),
    heroTitle: 'Walls Worth Looking At',
    heroDescription: 'Curated art and decor from independent makers around the world.',
    heroImage: img(CATEGORY_IMAGES['Wall Art & Decor'][1]),
    featured: false,
    sortOrder: 5,
  },
  {
    name: 'Kitchen & Dining',
    description: 'Serving boards, hand-painted tableware, and heirloom cookware for the table.',
    image: img(CATEGORY_IMAGES['Kitchen & Dining'][0]),
    heroTitle: 'Gather & Savor',
    heroDescription: 'Beautiful, useful pieces made to be passed around and passed down.',
    heroImage: img(CATEGORY_IMAGES['Kitchen & Dining'][1]),
    featured: false,
    sortOrder: 6,
  },
];

// ---------------------------------------------------------------------------
// 2) Makers / Brands (5)
// ---------------------------------------------------------------------------
const makersData = [
  {
    name: 'Oakhaven Woodworks',
    location: 'Portland, Oregon, USA',
    image: img('1503602642458-232111445657'),
    specialties: ['Solid Wood Furniture', 'Live-Edge Tables', 'Joinery'],
    aboutMe: 'A small family workshop crafting heirloom furniture from reclaimed and sustainably harvested hardwoods. Every joint is cut by hand.',
    website: 'https://oakhavenwoodworks.example.com',
    rating: 4.8,
    message: 'Built to be loved for generations.',
  },
  {
    name: 'Lumen & Clay',
    location: 'Asheville, North Carolina, USA',
    image: img('1524484485831-a92ffc0de03f'),
    specialties: ['Hand-Blown Glass', 'Ceramic Lighting', 'Brass Fixtures'],
    aboutMe: 'We blend molten glass and stoneware into warm, sculptural lighting. Each fixture is finished and wired by hand in our Blue Ridge studio.',
    website: 'https://lumenandclay.example.com',
    rating: 4.6,
    message: 'Light that feels handmade.',
  },
  {
    name: 'Terra Mesa Ceramics',
    location: 'Santa Fe, New Mexico, USA',
    image: img('1578749556568-bc2c40e68b61'),
    specialties: ['Wheel-Thrown Pottery', 'Reactive Glazes', 'Tableware'],
    aboutMe: 'High-desert pottery studio specializing in speckled stoneware and reactive glazes inspired by the New Mexico landscape.',
    website: 'https://terramesa.example.com',
    rating: 4.9,
    message: 'No two pieces are ever alike.',
  },
  {
    name: 'Willow & Weft',
    location: 'Brooklyn, New York, USA',
    image: img('1540730930991-a9286a5f5020'),
    specialties: ['Hand-Knotted Rugs', 'Natural Dyes', 'Woven Textiles'],
    aboutMe: 'A textile atelier weaving rugs, throws, and pillows from organic wool and cotton, colored with plant-based dyes.',
    website: 'https://willowandweft.example.com',
    rating: 4.5,
    message: 'Slow textiles for a softer home.',
  },
  {
    name: 'Copper Fox Studio',
    location: 'Burlington, Vermont, USA',
    image: img('1590794056226-79ef3a8147e1'),
    specialties: ['Hammered Copper', 'Serveware', 'Wall Decor'],
    aboutMe: 'Metalsmiths and makers crafting hammered copper cookware, serving boards, and decor with old-world techniques.',
    website: 'https://copperfox.example.com',
    rating: 4.7,
    message: 'Handmade metalware with soul.',
  },
];

// ---------------------------------------------------------------------------
// 3) Products (24) — templates; category + maker + images resolved at seed time
// ---------------------------------------------------------------------------
const productTemplates = [
  // Furniture (5)
  { name: 'Handwoven Rattan Accent Chair', category: 'Furniture', price: 289, blurb: 'A breezy rattan lounge chair with a solid teak frame and woven seat.' },
  { name: 'Reclaimed Oak Coffee Table', category: 'Furniture', price: 415, before: 499, blurb: 'Low-profile coffee table built from reclaimed oak with hand-rubbed oil finish.' },
  { name: 'Walnut Live-Edge Side Table', category: 'Furniture', price: 235, blurb: 'A compact side table showcasing the natural live edge of black walnut.' },
  { name: 'Mid-Century Velvet Armchair', category: 'Furniture', price: 379, before: 449, blurb: 'Tapered solid-wood legs and a plush velvet seat in a timeless silhouette.' },
  { name: 'Solid Pine Bookshelf', category: 'Furniture', price: 198, blurb: 'A sturdy five-tier bookshelf in knot-free pine with adjustable shelves.' },

  // Lighting (4)
  { name: 'Hand-Blown Glass Pendant Light', category: 'Lighting', price: 165, blurb: 'A single hand-blown glass globe pendant with a warm brass canopy.' },
  { name: 'Brass Articulating Desk Lamp', category: 'Lighting', price: 119, before: 149, blurb: 'An adjustable brass task lamp with a weighted base and linen-warm bulb.' },
  { name: 'Woven Wicker Floor Lamp', category: 'Lighting', price: 142, blurb: 'A tall floor lamp wrapped in hand-woven wicker for a soft, dappled glow.' },
  { name: 'Ceramic Table Lamp with Linen Shade', category: 'Lighting', price: 98, blurb: 'A speckled ceramic base paired with a natural linen drum shade.' },

  // Ceramics & Pottery (4)
  { name: 'Stoneware Dinner Plate Set', category: 'Ceramics & Pottery', price: 88, blurb: 'A set of four wheel-thrown stoneware plates with a matte reactive glaze.' },
  { name: 'Hand-Thrown Ceramic Vase', category: 'Ceramics & Pottery', price: 54, blurb: 'A sculptural bud vase with a speckled glaze, perfect for dried stems.' },
  { name: 'Speckled Glaze Mug Set', category: 'Ceramics & Pottery', price: 46, before: 58, blurb: 'Four generous mugs with comfortable handles and a one-of-a-kind glaze.' },
  { name: 'Matte Black Ceramic Planter', category: 'Ceramics & Pottery', price: 38, blurb: 'A minimalist matte planter with drainage and a matching saucer.' },

  // Textiles & Rugs (4)
  { name: 'Hand-Knotted Wool Area Rug', category: 'Textiles & Rugs', price: 489, blurb: 'A 5x8 hand-knotted wool rug with a subtle geometric motif.' },
  { name: 'Chunky Knit Throw Blanket', category: 'Textiles & Rugs', price: 79, before: 99, blurb: 'An oversized chunky-knit throw in undyed merino wool.' },
  { name: 'Linen Throw Pillow Cover Set', category: 'Textiles & Rugs', price: 42, blurb: 'A pair of stonewashed linen pillow covers with hidden zippers.' },
  { name: 'Moroccan Berber Wool Rug', category: 'Textiles & Rugs', price: 365, before: 420, blurb: 'A plush ivory Berber rug hand-woven with traditional diamond patterns.' },

  // Wall Art & Decor (4)
  { name: 'Abstract Canvas Wall Art', category: 'Wall Art & Decor', price: 129, blurb: 'A hand-finished abstract canvas in warm, earthy tones.' },
  { name: 'Macramé Wall Hanging', category: 'Wall Art & Decor', price: 64, blurb: 'A hand-knotted cotton macramé hanging on a driftwood dowel.' },
  { name: 'Framed Botanical Print Set', category: 'Wall Art & Decor', price: 72, before: 89, blurb: 'A trio of archival botanical prints in solid oak frames.' },
  { name: 'Carved Wooden Wall Mirror', category: 'Wall Art & Decor', price: 156, blurb: 'A round mirror framed in hand-carved mango wood.' },

  // Kitchen & Dining (3)
  { name: 'Acacia Wood Serving Board', category: 'Kitchen & Dining', price: 48, blurb: 'A live-edge acacia board with a juice groove and leather hang loop.' },
  { name: 'Hand-Painted Ceramic Bowl Set', category: 'Kitchen & Dining', price: 68, before: 85, blurb: 'Four hand-painted serving bowls, each with a unique brushed pattern.' },
  { name: 'Hammered Copper Cookware Set', category: 'Kitchen & Dining', price: 320, blurb: 'A three-piece hammered copper cookware set with tin lining.' },
];

// Realistic user identities (first is the admin).
const usersData = [
  { firstName: 'Admin', lastName: 'Cozy', email: 'admin@cozyloops.com', role: 'admin' },
  { firstName: 'Olivia', lastName: 'Bennett', email: 'olivia.bennett@example.com' },
  { firstName: 'Liam', lastName: 'Carter', email: 'liam.carter@example.com' },
  { firstName: 'Sophia', lastName: 'Nguyen', email: 'sophia.nguyen@example.com' },
  { firstName: 'Noah', lastName: 'Martinez', email: 'noah.martinez@example.com' },
  { firstName: 'Emma', lastName: 'Thompson', email: 'emma.thompson@example.com' },
  { firstName: 'Ethan', lastName: 'Rivera', email: 'ethan.rivera@example.com' },
  { firstName: 'Ava', lastName: 'Patel', email: 'ava.patel@example.com' },
  { firstName: 'Mason', lastName: 'Walker', email: 'mason.walker@example.com' },
  { firstName: 'Isabella', lastName: 'Murphy', email: 'isabella.murphy@example.com' },
  { firstName: 'James', lastName: 'Foster', email: 'james.foster@example.com' },
  { firstName: 'Mia', lastName: 'Coleman', email: 'mia.coleman@example.com' },
];

const ADDRESSES = [
  { street: '128 Maplewood Ave', city: 'Portland', state: 'OR', zipCode: '97205', country: 'USA' },
  { street: '47 Birchwood Ln', city: 'Asheville', state: 'NC', zipCode: '28801', country: 'USA' },
  { street: '903 Cedar St', city: 'Santa Fe', state: 'NM', zipCode: '87501', country: 'USA' },
  { street: '12 Willow Way', city: 'Brooklyn', state: 'NY', zipCode: '11201', country: 'USA' },
  { street: '560 Hillcrest Dr', city: 'Burlington', state: 'VT', zipCode: '05401', country: 'USA' },
  { street: '218 Lakeview Blvd', city: 'Austin', state: 'TX', zipCode: '78701', country: 'USA' },
];

const REVIEW_COMMENTS = [
  'Absolutely beautiful craftsmanship — even better in person. Worth every penny.',
  'Arrived well packaged and exactly as pictured. The quality is outstanding.',
  'Lovely piece, though it took a little longer to ship than expected.',
  'The finish is gorgeous and feels incredibly sturdy. Highly recommend this maker.',
  'Great value for a handmade item. It has become the centerpiece of our living room.',
  'Solid and well made. Color is slightly different from the photos but still stunning.',
  'You can tell this was made with care. I will definitely be ordering again.',
  'Perfect size and the texture is wonderful. So happy with this purchase.',
  'Good quality overall, but I wish it came with more setup instructions.',
  'Exceeded my expectations. The attention to detail is remarkable.',
  'Cozy, warm, and exactly what our space needed. Five stars.',
  'A real conversation starter. Friends keep asking where I found it.',
];

// Realistic (orderStatus, paymentStatus) combinations.
const ORDER_STATUS_COMBOS = [
  { orderStatus: 'delivered', paymentStatus: 'completed', tracked: true },
  { orderStatus: 'shipped', paymentStatus: 'completed', tracked: true },
  { orderStatus: 'processing', paymentStatus: 'completed', tracked: false },
  { orderStatus: 'pending', paymentStatus: 'pending', tracked: false },
  { orderStatus: 'pending', paymentStatus: 'processing', tracked: false },
  { orderStatus: 'cancelled', paymentStatus: 'refunded', tracked: false },
  { orderStatus: 'cancelled', paymentStatus: 'failed', tracked: false },
];

const DEV_PASSWORD = 'Password123!';

// ---------------------------------------------------------------------------
// Seeders
// ---------------------------------------------------------------------------
async function clearCollections() {
  console.log('🧹 Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Maker.deleteMany({}),
    Product.deleteMany({}),
    Review.deleteMany({}),
    Cart.deleteMany({}),
    Wishlist.deleteMany({}),
    Order.deleteMany({}),
  ]);
}

async function seedCategories() {
  const categories = await Category.create(categoriesData); // pre-save -> slug, level
  console.log(`   ✓ Categories: ${categories.length}`);
  return categories;
}

async function seedMakers() {
  const makers = await Maker.create(makersData); // pre-save -> slug
  console.log(`   ✓ Makers: ${makers.length}`);
  return makers;
}

async function seedProducts(categories, makers) {
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c]));
  const docs = productTemplates.map((t, i) => {
    const category = catByName[t.category];
    const maker = rand(makers);
    const pool = CATEGORY_IMAGES[t.category];
    const images = sampleMany(pool, 3).map(img);
    const product = {
      name: t.name,
      description: `${t.blurb} Made to order by ${maker.name} in ${maker.location}, this piece celebrates natural materials and traditional technique.`,
      shortDescription: t.blurb,
      price: money(t.price),
      category: category._id,
      maker: maker._id,
      tags: [t.category.toLowerCase().split(' ')[0], 'handmade', 'artisan'],
      images,
      mainImage: images[0],
      sku: `CL-${String(1001 + i)}`,
      stock: randInt(0, 60),
      attributes: [
        { name: 'Color', value: rand(COLORS) },
        { name: 'Material', value: rand(MATERIALS) },
        { name: 'Size', value: rand(SIZES) },
      ],
      featured: i % 5 === 0,
    };
    if (t.before && t.before >= t.price) product.priceBeforeDiscount = money(t.before); // hook computes discount %
    return product;
  });

  const products = await Product.create(docs); // pre-save -> slug + discountPercentage
  console.log(`   ✓ Products: ${products.length}`);
  return products;
}

async function seedUsers() {
  const docs = usersData.map((u, i) => ({
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    password: DEV_PASSWORD, // pre-save hook hashes with bcryptjs — keep PLAIN here
    role: u.role || 'user',
    phoneNumber: `+1${randInt(200, 989)}${randInt(200, 989)}${randInt(1000, 9999)}`,
    emailVerified: true,
    authProvider: 'local',
    addresses: [{ ...rand(ADDRESSES), type: 'shipping', isDefault: true }],
  }));

  // create() runs the save hook per document, so passwords get hashed.
  const users = await User.create(docs);
  console.log(`   ✓ Users: ${users.length} (1 admin: ${usersData[0].email})`);
  return users;
}

async function seedReviews(users, products) {
  const docs = [];
  for (let i = 0; i < 15; i++) {
    docs.push({
      user: users[i % users.length]._id,
      product: products[i]._id, // products[0..14] are distinct -> unique (user, product) pairs
      comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
      rating: randInt(3, 5) >= 4 ? randInt(4, 5) : randInt(1, 5), // weighted toward higher, full 1-5 range possible
    });
  }
  const reviews = await Review.create(docs);

  // Recompute each reviewed product's rating stats + reviews[] so the catalog is coherent.
  const byProduct = new Map();
  reviews.forEach((r) => {
    const key = r.product.toString();
    if (!byProduct.has(key)) byProduct.set(key, []);
    byProduct.get(key).push(r);
  });
  for (const [productId, productReviews] of byProduct) {
    const product = products.find((p) => p._id.toString() === productId);
    if (!product) continue;
    product.reviews = productReviews.map((r) => r._id);
    product.numReviews = productReviews.length;
    product.averageRating = money(
      productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
    );
    await product.save();
  }

  console.log(`   ✓ Reviews: ${reviews.length} (across ${byProduct.size} products)`);
  return reviews;
}

async function seedCarts(users, products) {
  const carts = [];
  for (const user of users) {
    const chosen = sampleMany(products, randInt(1, 4));
    const items = chosen.map((p) => {
      const quantity = randInt(1, 3);
      const price = money(p.price);
      return { product: p._id, variant: null, quantity, price, totalPrice: money(price * quantity) };
    });
    // create() runs the pre-save hook -> totalItems / totalAmount recalculated.
    carts.push(await Cart.create({ user: user._id, items, status: 'active' }));
  }
  console.log(`   ✓ Carts: ${carts.length} (one active cart per user)`);
  return carts;
}

async function seedWishlists(users, products) {
  const wishlists = [];
  for (const user of users) {
    const chosen = sampleMany(products, randInt(2, 6));
    const items = chosen.map((p) => ({ product: p._id }));
    wishlists.push(await Wishlist.create({ user: user._id, items }));
  }
  console.log(`   ✓ Wishlists: ${wishlists.length} (one per user)`);
  return wishlists;
}

async function seedOrders(users, products) {
  const orders = [];
  for (let i = 0; i < 18; i++) {
    const user = users[i % users.length];
    const chosen = sampleMany(products, randInt(1, 4));
    const items = chosen.map((p) => {
      const quantity = randInt(1, 2);
      const price = money(p.price);
      return { product: p._id, quantity, price, totalPrice: money(price * quantity), variant: null };
    });

    const subtotal = money(items.reduce((sum, it) => sum + it.totalPrice, 0));
    const shippingCost = subtotal > 250 ? 0 : 14.99;
    const tax = money(subtotal * 0.08);
    const totalAmount = money(subtotal + shippingCost + tax);

    const combo = ORDER_STATUS_COMBOS[i % ORDER_STATUS_COMBOS.length];
    const paid = combo.paymentStatus === 'completed' || combo.paymentStatus === 'refunded' || combo.paymentStatus === 'processing';
    const addr = rand(ADDRESSES);

    orders.push(
      await Order.create({
        user: user._id,
        items,
        subtotal,
        shippingCost,
        tax,
        totalAmount,
        orderStatus: combo.orderStatus,
        paymentStatus: combo.paymentStatus,
        paymentIntentId: paid ? stripeIntentId() : null,
        trackingNumber: combo.tracked ? `1Z${randInt(100, 999)}${randInt(100000000, 999999999)}` : null,
        shippingAddress: { street: addr.street, city: addr.city, state: addr.state, zipCode: addr.zipCode, country: addr.country },
        notes: i % 4 === 0 ? 'Please leave the package at the front porch.' : null,
      })
    );
  }
  console.log(`   ✓ Orders: ${orders.length}`);
  return orders;
}

// ---------------------------------------------------------------------------
// Summary + verification
// ---------------------------------------------------------------------------
async function printSummary() {
  const [categories, makers, products, users, reviews, carts, wishlists, orders] = await Promise.all([
    Category.countDocuments(),
    Maker.countDocuments(),
    Product.countDocuments(),
    User.countDocuments(),
    Review.countDocuments(),
    Cart.countDocuments(),
    Wishlist.countDocuments(),
    Order.countDocuments(),
  ]);

  console.log('\n📊 Seed Summary (documents per collection):');
  console.table([
    { Collection: 'Categories', Count: categories },
    { Collection: 'Makers', Count: makers },
    { Collection: 'Products', Count: products },
    { Collection: 'Users', Count: users },
    { Collection: 'Reviews', Count: reviews },
    { Collection: 'Carts', Count: carts },
    { Collection: 'Wishlists', Count: wishlists },
    { Collection: 'Orders', Count: orders },
  ]);

  // Sanity check #1: a product populated with its category + maker.
  const sampleProduct = await Product.findOne().populate('category', 'name').populate('maker', 'name');
  if (sampleProduct) {
    console.log(
      `\n🔎 Sample product: "${sampleProduct.name}" — $${sampleProduct.price} | ` +
        `category: ${sampleProduct.category?.name} | maker: ${sampleProduct.maker?.name} | ` +
        `rating: ${sampleProduct.averageRating} (${sampleProduct.numReviews} reviews)`
    );
  }

  // Sanity check #2: admin exists and the password verifies (no double-hash).
  const admin = await User.findOne({ email: 'admin@cozyloops.com' }).select('+password');
  if (admin) {
    const ok = await bcrypt.compare(DEV_PASSWORD, admin.password);
    console.log(`🔐 Admin login check: ${admin.email} / "${DEV_PASSWORD}" -> ${ok ? 'VALID ✅' : 'INVALID ❌'}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function run() {
  try {
    await connectDB();

    await clearCollections();

    console.log('🌱 Seeding...');
    const categories = await seedCategories();
    const makers = await seedMakers();
    const products = await seedProducts(categories, makers);
    const users = await seedUsers();
    await seedReviews(users, products);
    await seedCarts(users, products);
    await seedWishlists(users, products);
    await seedOrders(users, products);

    await printSummary();

    console.log('\n✅ Database seeded successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    try { await mongoose.connection.close(); } catch (_) { /* ignore */ }
    process.exit(1);
  }
}

run();
