require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Demo password for all seed accounts
const DEMO_PASSWORD = 'locals2024';
const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const locals = [
  // ── Teaneck, NJ ──────────────────────────────────────────────────────────
  {
    email: 'maria.santos@locals-demo.com',
    name: 'Maria Santos',
    city: 'Teaneck',
    lat: 40.8973,
    lng: -74.0098,
    tagline: "Your insider guide to Bergen County's hidden gems",
    bio: "Born and raised in Teaneck, I know every corner of Bergen County. From the best halal spots to tucked-away parks, let me show you what makes this area truly special.",
    location_text: 'Teaneck, NJ (Bergen County)',
    avg_rating: 4.9,
    total_reviews: 34,
    services: [
      {
        type: 'tour',
        title: 'Bergen County Food Tour',
        description:
          "A 3-hour guided walk hitting Teaneck's best halal eateries, Middle Eastern bakeries, and diverse local restaurants that you'd never find on your own.",
        price: 85.0,
        duration_minutes: 180,
      },
      {
        type: 'message',
        title: 'Neighborhood Advice & Recommendations',
        description:
          'Chat with a true local — get personalized tips on food, shopping, schools, or anything else about Teaneck and Bergen County.',
        price: 25.0,
        duration_minutes: null,
      },
      {
        type: 'email',
        title: 'Relocation Tips & Local Insights',
        description:
          'Thinking of moving to Teaneck? I\'ll send you a detailed written guide covering neighborhoods, schools, commute options, and community life.',
        price: 15.0,
        duration_minutes: null,
      },
    ],
  },
  {
    email: 'james.park@locals-demo.com',
    name: 'James Park',
    city: 'Teaneck',
    lat: 40.8950,
    lng: -74.0120,
    tagline: "Explore Bergen County's history and green spaces",
    bio: "High school history teacher and weekend hiker. I lead walks through Teaneck's historic districts and Overpeck County Park. Perfect for families, students, and nature lovers.",
    location_text: 'Teaneck, NJ',
    avg_rating: 4.7,
    total_reviews: 21,
    services: [
      {
        type: 'tour',
        title: 'Historic Teaneck Walking Tour',
        description:
          "A 2-hour walk covering Teaneck's storied civil-rights history, architecture highlights, and the stories behind this uniquely diverse community.",
        price: 65.0,
        duration_minutes: 120,
      },
      {
        type: 'tour',
        title: 'Overpeck Park Nature Walk',
        description:
          "A 90-minute easy walk through Overpeck County Park — birdwatching, wetlands, and skyline views of Manhattan. Great for all ages.",
        price: 45.0,
        duration_minutes: 90,
      },
      {
        type: 'email',
        title: 'Custom Day-Trip Itinerary (Bergen County)',
        description:
          "Tell me your interests and I'll craft a personalized day-trip plan covering the best of Bergen County — parks, museums, dining, and more.",
        price: 20.0,
        duration_minutes: null,
      },
    ],
  },
  {
    email: 'aisha.mohammed@locals-demo.com',
    name: 'Aisha Mohammed',
    city: 'Teaneck',
    lat: 40.8990,
    lng: -74.0075,
    tagline: "Experience Teaneck's vibrant multicultural community",
    bio: "Teaneck is one of America's most diverse towns, and I love sharing its multicultural heart with visitors. From synagogues to mosques to incredible international restaurants — there's something for everyone.",
    location_text: 'Teaneck, NJ (Bergen County)',
    avg_rating: 4.8,
    total_reviews: 28,
    services: [
      {
        type: 'tour',
        title: 'Multicultural Teaneck Tour',
        description:
          "A 2.5-hour immersive walk through Teaneck's diverse cultural landscape — visit houses of worship, ethnic markets, and community gathering spots.",
        price: 75.0,
        duration_minutes: 150,
      },
      {
        type: 'message',
        title: 'Community & Cultural Questions',
        description:
          "Ask me anything about Teaneck's community life, cultural events, or what it's like to live in one of America's most integrated towns.",
        price: 20.0,
        duration_minutes: null,
      },
    ],
  },

  // ── Chicago, IL ──────────────────────────────────────────────────────────
  {
    email: 'carlos.rivera@locals-demo.com',
    name: 'Carlos Rivera',
    city: 'Chicago',
    lat: 41.8781,
    lng: -87.6298,
    tagline: "Chicago's skyline through the eyes of a born-and-raised local",
    bio: "Grew up in Pilsen and have lived all over Chicago. As an architecture enthusiast and urban history buff, I know the story behind every skyscraper and corner neighborhood.",
    location_text: 'Chicago, IL (Pilsen / Downtown)',
    avg_rating: 4.9,
    total_reviews: 87,
    services: [
      {
        type: 'tour',
        title: 'Chicago Architecture Walk',
        description:
          "A 3-hour downtown tour covering the Loop, Millennium Park, and the riverfront — with deep dives into the architecture that made Chicago world-famous.",
        price: 120.0,
        duration_minutes: 180,
      },
      {
        type: 'tour',
        title: 'Neighborhoods Deep Dive',
        description:
          "A 2.5-hour tour through 2–3 Chicago neighborhoods (Pilsen, Wicker Park, or Bronzeville) — street art, local eats, and stories you won't find in guidebooks.",
        price: 95.0,
        duration_minutes: 150,
      },
      {
        type: 'message',
        title: 'Chicago Trip Planning',
        description:
          "Chat with me to build the perfect Chicago itinerary based on your interests, budget, and travel dates.",
        price: 35.0,
        duration_minutes: null,
      },
    ],
  },
  {
    email: 'priya.chen@locals-demo.com',
    name: 'Priya Chen',
    city: 'Chicago',
    lat: 41.8850,
    lng: -87.6750,
    tagline: "Eat your way through Chicago's incredible food scene",
    bio: "Food blogger and Chicago native. From deep dish to dim sum, from Logan Square to Chinatown, I know where locals actually eat — not just where tourists go.",
    location_text: 'Chicago, IL (Logan Square / Chinatown)',
    avg_rating: 4.8,
    total_reviews: 62,
    services: [
      {
        type: 'tour',
        title: 'Chicago Food Tour: Beyond Deep Dish',
        description:
          "A 3.5-hour food crawl hitting taquerias in Pilsen, a dim sum spot in Chinatown, and a craft brewery in Logan Square. Budget for tastings included in the price.",
        price: 110.0,
        duration_minutes: 210,
      },
      {
        type: 'email',
        title: 'Chicago Restaurant & Bar Guide',
        description:
          "I'll put together a personalized dining guide — neighborhood by neighborhood — based on your tastes, dietary needs, and budget.",
        price: 20.0,
        duration_minutes: null,
      },
      {
        type: 'message',
        title: 'Weekend Itinerary Planning',
        description:
          "Tell me your dates and vibe and I'll help you plan the perfect Chicago weekend, hour by hour.",
        price: 40.0,
        duration_minutes: null,
      },
    ],
  },
  {
    email: 'marcus.johnson@locals-demo.com',
    name: 'Marcus Johnson',
    city: 'Chicago',
    lat: 41.8650,
    lng: -87.6270,
    tagline: "Chicago's blues, jazz, and street art scene",
    bio: "Musician and South Side native. Let me take you through the neighborhoods that gave birth to Chicago blues and show you the city's thriving live music and street art scene.",
    location_text: 'Chicago, IL (South Side / Bronzeville)',
    avg_rating: 4.9,
    total_reviews: 45,
    services: [
      {
        type: 'tour',
        title: 'Blues & Jazz History Tour',
        description:
          "A 3-hour South Side tour hitting the landmarks of Chicago blues — Chess Records, Muddy Waters' home block, Rosa's Lounge, and more.",
        price: 90.0,
        duration_minutes: 180,
      },
      {
        type: 'tour',
        title: 'Street Art & Murals Walk',
        description:
          "A 2-hour walk through Pilsen and Bronzeville's world-class outdoor murals and community art projects.",
        price: 70.0,
        duration_minutes: 120,
      },
      {
        type: 'message',
        title: 'Music Scene Recommendations',
        description:
          "Ask me about the best live music venues, upcoming shows, and where to find authentic Chicago blues any night of the week.",
        price: 25.0,
        duration_minutes: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Seeding logic
// ---------------------------------------------------------------------------

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding demo locals...\n');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

    for (const local of locals) {
      // Skip if this email already exists
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [local.email]);
      if (existing.rows.length > 0) {
        console.log(`  Skipping ${local.name} — already exists.`);
        continue;
      }

      // Insert user
      const { rows: [user] } = await client.query(
        `INSERT INTO users (email, password_hash, name, role)
         VALUES ($1, $2, $3, 'local')
         RETURNING id`,
        [local.email, passwordHash, local.name]
      );

      // Insert local profile
      const { rows: [profile] } = await client.query(
        `INSERT INTO local_profiles
           (user_id, bio, tagline, city, location_text, lat, lng, avg_rating, total_reviews)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          user.id,
          local.bio,
          local.tagline,
          local.city,
          local.location_text,
          local.lat,
          local.lng,
          local.avg_rating,
          local.total_reviews,
        ]
      );

      // Insert services
      for (const svc of local.services) {
        await client.query(
          `INSERT INTO services (local_id, type, title, description, price, duration_minutes)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [profile.id, svc.type, svc.title, svc.description, svc.price, svc.duration_minutes]
        );
      }

      console.log(`  ✓ ${local.name} (${local.city}) — ${local.services.length} services`);
    }

    console.log(`\nDone! All demo accounts use password: ${DEMO_PASSWORD}`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
