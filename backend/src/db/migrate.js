require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const migrations = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

  -- Users (both traveler users and locals share this table; role distinguishes them)
  CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    avatar_url    TEXT,
    role          TEXT NOT NULL CHECK (role IN ('user', 'local')) DEFAULT 'user',
    created_at    TIMESTAMPTZ DEFAULT NOW()
  );

  -- Extended profile for users who are locals
  CREATE TABLE IF NOT EXISTS local_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio             TEXT,
    tagline         TEXT,
    city            TEXT NOT NULL,
    location_text   TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    cover_photo_url TEXT,
    avg_rating      NUMERIC(3,2) DEFAULT 0,
    total_reviews   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
  );

  -- Services offered by a local
  CREATE TABLE IF NOT EXISTS services (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id         UUID NOT NULL REFERENCES local_profiles(id) ON DELETE CASCADE,
    type             TEXT NOT NULL CHECK (type IN ('email', 'message', 'tour')),
    title            TEXT NOT NULL,
    description      TEXT,
    price            NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER,
    photos           JSONB DEFAULT '[]',
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT NOW()
  );

  -- Availability windows set by a local (for tours)
  CREATE TABLE IF NOT EXISTS availability (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    local_id     UUID NOT NULL REFERENCES local_profiles(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    start_time   TIME,
    end_time     TIME,
    is_blocked   BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
  );

  -- Bookings by users for a service
  CREATE TABLE IF NOT EXISTS bookings (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id              UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    scheduled_date          DATE,
    scheduled_time          TIME,
    status                  TEXT NOT NULL CHECK (status IN ('pending','confirmed','completed','cancelled')) DEFAULT 'pending',
    stripe_payment_intent_id TEXT,
    total_amount            NUMERIC(10,2) NOT NULL,
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
  );

  -- Reviews left by users after a completed booking
  CREATE TABLE IF NOT EXISTS reviews (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    local_id   UUID NOT NULL REFERENCES local_profiles(id) ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- In-app messages tied to a booking conversation
  CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
  );

  -- Indexes for common queries
  CREATE INDEX IF NOT EXISTS idx_local_profiles_city ON local_profiles(city);
  CREATE INDEX IF NOT EXISTS idx_local_profiles_location ON local_profiles(lat, lng);
  CREATE INDEX IF NOT EXISTS idx_services_local_id ON services(local_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_local_id ON reviews(local_id);
  CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);
  CREATE INDEX IF NOT EXISTS idx_availability_local_date ON availability(local_id, date);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(migrations);
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
