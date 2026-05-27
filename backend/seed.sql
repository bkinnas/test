-- =============================================================================
-- LOCALS App — Sample Data
-- All demo accounts use password: locals2024
-- Run this in your Supabase SQL Editor (or any Postgres client)
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clear existing demo data (safe to re-run)
DELETE FROM services
  WHERE local_id IN (
    SELECT lp.id FROM local_profiles lp
    JOIN users u ON u.id = lp.user_id
    WHERE u.email LIKE '%@locals-demo.com'
  );
DELETE FROM local_profiles
  WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@locals-demo.com');
DELETE FROM users WHERE email LIKE '%@locals-demo.com';

-- =============================================================================
-- Users  (role = 'local')
-- Password hash = bcrypt('locals2024', 12)
-- =============================================================================
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('11111111-0000-0000-0000-000000000001', 'maria.santos@locals-demo.com',  '$2b$12$Q6OFAKX1dg9llVTL/cze0.cN9zG/xFEzO.BiCfYOJ1o9kNTzWiAX.', 'Maria Santos',  'local'),
  ('11111111-0000-0000-0000-000000000002', 'james.park@locals-demo.com',    '$2b$12$Q6OFAKX1dg9llVTL/cze0.cN9zG/xFEzO.BiCfYOJ1o9kNTzWiAX.', 'James Park',    'local'),
  ('11111111-0000-0000-0000-000000000003', 'aisha.mohammed@locals-demo.com','$2b$12$Q6OFAKX1dg9llVTL/cze0.cN9zG/xFEzO.BiCfYOJ1o9kNTzWiAX.', 'Aisha Mohammed','local'),
  ('11111111-0000-0000-0000-000000000004', 'carlos.rivera@locals-demo.com', '$2b$12$Q6OFAKX1dg9llVTL/cze0.cN9zG/xFEzO.BiCfYOJ1o9kNTzWiAX.', 'Carlos Rivera', 'local'),
  ('11111111-0000-0000-0000-000000000005', 'priya.chen@locals-demo.com',    '$2b$12$Q6OFAKX1dg9llVTL/cze0.cN9zG/xFEzO.BiCfYOJ1o9kNTzWiAX.', 'Priya Chen',    'local'),
  ('11111111-0000-0000-0000-000000000006', 'marcus.johnson@locals-demo.com','$2b$12$Q6OFAKX1dg9llVTL/cze0.cN9zG/xFEzO.BiCfYOJ1o9kNTzWiAX.', 'Marcus Johnson','local');

-- =============================================================================
-- Local Profiles
-- =============================================================================
INSERT INTO local_profiles (id, user_id, bio, tagline, city, location_text, lat, lng, avg_rating, total_reviews) VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'Born and raised in Teaneck, I know every corner of Bergen County. From the best halal spots to tucked-away parks, let me show you what makes this area truly special.',
    'Your insider guide to Bergen County''s hidden gems',
    'Teaneck', 'Teaneck, NJ (Bergen County)', 40.8973, -74.0098, 4.9, 34
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000002',
    'High school history teacher and weekend hiker. I lead walks through Teaneck''s historic districts and Overpeck County Park. Perfect for families, students, and nature lovers.',
    'Explore Bergen County''s history and green spaces',
    'Teaneck', 'Teaneck, NJ', 40.8950, -74.0120, 4.7, 21
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000003',
    'Teaneck is one of America''s most diverse towns, and I love sharing its multicultural heart with visitors. From synagogues to mosques to incredible international restaurants.',
    'Experience Teaneck''s vibrant multicultural community',
    'Teaneck', 'Teaneck, NJ (Bergen County)', 40.8990, -74.0075, 4.8, 28
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000004',
    'Grew up in Pilsen and have lived all over Chicago. As an architecture enthusiast and urban history buff, I know the story behind every skyscraper and corner neighborhood.',
    'Chicago''s skyline through the eyes of a born-and-raised local',
    'Chicago', 'Chicago, IL (Pilsen / Downtown)', 41.8781, -87.6298, 4.9, 87
  ),
  (
    '22222222-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000005',
    'Food blogger and Chicago native. From deep dish to dim sum, from Logan Square to Chinatown, I know where locals actually eat — not just where tourists go.',
    'Eat your way through Chicago''s incredible food scene',
    'Chicago', 'Chicago, IL (Logan Square / Chinatown)', 41.8850, -87.6750, 4.8, 62
  ),
  (
    '22222222-0000-0000-0000-000000000006',
    '11111111-0000-0000-0000-000000000006',
    'Musician and South Side native. Let me take you through the neighborhoods that gave birth to Chicago blues and show you the city''s thriving live music and street art scene.',
    'Chicago''s blues, jazz, and street art scene',
    'Chicago', 'Chicago, IL (South Side / Bronzeville)', 41.8650, -87.6270, 4.9, 45
  );

-- =============================================================================
-- Services
-- =============================================================================
INSERT INTO services (local_id, type, title, description, price, duration_minutes) VALUES

  -- Maria Santos (Teaneck)
  ('22222222-0000-0000-0000-000000000001', 'tour',    'Bergen County Food Tour',             'A 3-hour guided walk hitting Teaneck''s best halal eateries, Middle Eastern bakeries, and diverse local restaurants that you''d never find on your own.', 85.00, 180),
  ('22222222-0000-0000-0000-000000000001', 'message', 'Neighborhood Advice & Recommendations','Chat with a true local — get personalized tips on food, shopping, schools, or anything else about Teaneck and Bergen County.', 25.00, NULL),
  ('22222222-0000-0000-0000-000000000001', 'email',   'Relocation Tips & Local Insights',    'Thinking of moving to Teaneck? I''ll send you a detailed written guide covering neighborhoods, schools, commute options, and community life.', 15.00, NULL),

  -- James Park (Teaneck)
  ('22222222-0000-0000-0000-000000000002', 'tour',    'Historic Teaneck Walking Tour',        'A 2-hour walk covering Teaneck''s storied civil-rights history, architecture highlights, and the stories behind this uniquely diverse community.', 65.00, 120),
  ('22222222-0000-0000-0000-000000000002', 'tour',    'Overpeck Park Nature Walk',            'A 90-minute easy walk through Overpeck County Park — birdwatching, wetlands, and skyline views of Manhattan. Great for all ages.', 45.00, 90),
  ('22222222-0000-0000-0000-000000000002', 'email',   'Custom Day-Trip Itinerary (Bergen County)', 'Tell me your interests and I''ll craft a personalized day-trip plan covering the best of Bergen County — parks, museums, dining, and more.', 20.00, NULL),

  -- Aisha Mohammed (Teaneck)
  ('22222222-0000-0000-0000-000000000003', 'tour',    'Multicultural Teaneck Tour',           'A 2.5-hour immersive walk through Teaneck''s diverse cultural landscape — visit houses of worship, ethnic markets, and community gathering spots.', 75.00, 150),
  ('22222222-0000-0000-0000-000000000003', 'message', 'Community & Cultural Questions',       'Ask me anything about Teaneck''s community life, cultural events, or what it''s like to live in one of America''s most integrated towns.', 20.00, NULL),

  -- Carlos Rivera (Chicago)
  ('22222222-0000-0000-0000-000000000004', 'tour',    'Chicago Architecture Walk',            'A 3-hour downtown tour covering the Loop, Millennium Park, and the riverfront — with deep dives into the architecture that made Chicago world-famous.', 120.00, 180),
  ('22222222-0000-0000-0000-000000000004', 'tour',    'Neighborhoods Deep Dive',              'A 2.5-hour tour through 2–3 Chicago neighborhoods (Pilsen, Wicker Park, or Bronzeville) — street art, local eats, and stories you won''t find in guidebooks.', 95.00, 150),
  ('22222222-0000-0000-0000-000000000004', 'message', 'Chicago Trip Planning',                'Chat with me to build the perfect Chicago itinerary based on your interests, budget, and travel dates.', 35.00, NULL),

  -- Priya Chen (Chicago)
  ('22222222-0000-0000-0000-000000000005', 'tour',    'Chicago Food Tour: Beyond Deep Dish',  'A 3.5-hour food crawl hitting taquerias in Pilsen, a dim sum spot in Chinatown, and a craft brewery in Logan Square. Budget for tastings included in the price.', 110.00, 210),
  ('22222222-0000-0000-0000-000000000005', 'email',   'Chicago Restaurant & Bar Guide',       'I''ll put together a personalized dining guide — neighborhood by neighborhood — based on your tastes, dietary needs, and budget.', 20.00, NULL),
  ('22222222-0000-0000-0000-000000000005', 'message', 'Weekend Itinerary Planning',           'Tell me your dates and vibe and I''ll help you plan the perfect Chicago weekend, hour by hour.', 40.00, NULL),

  -- Marcus Johnson (Chicago)
  ('22222222-0000-0000-0000-000000000006', 'tour',    'Blues & Jazz History Tour',            'A 3-hour South Side tour hitting the landmarks of Chicago blues — Chess Records, Muddy Waters'' home block, Rosa''s Lounge, and more.', 90.00, 180),
  ('22222222-0000-0000-0000-000000000006', 'tour',    'Street Art & Murals Walk',             'A 2-hour walk through Pilsen and Bronzeville''s world-class outdoor murals and community art projects.', 70.00, 120),
  ('22222222-0000-0000-0000-000000000006', 'message', 'Music Scene Recommendations',          'Ask me about the best live music venues, upcoming shows, and where to find authentic Chicago blues any night of the week.', 25.00, NULL);
