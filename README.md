# LOCALS — Community Experience App

LOCALS is a mobile app connecting travelers with local community members who offer authentic experiences, advice, and guided tours.

---

## Overview

Think Airbnb, but for **people** — not places. Travelers can find verified locals who offer:
- **Email consultations** — Get advice before or during your trip
- **In-app messaging** — Chat directly with a local
- **Guided tours** — Book a local-led experience with date/time scheduling

Locals set their own prices, availability, and service offerings. Users can search by location, browse profiles, read reviews, and pay directly in-app.

---

## Tech Stack

### Frontend
- **React Native** (Expo) — Cross-platform iOS & Android
- **React Navigation** — Stack + Tab navigation
- **Zustand** — Lightweight state management
- **Stripe React Native SDK** — Payments including Apple Pay / Google Pay
- **React Native Maps** — Location-based search
- **date-fns** — Date formatting and calendar logic

### Backend
- **Node.js + Express** — REST API
- **PostgreSQL** — Primary database (via `pg`)
- **JWT** — Authentication
- **Stripe** — Payment processing + webhooks
- **Multer + Cloudinary** — Photo uploads for service listings
- **Socket.io** — Real-time in-app messaging
- **bcrypt** — Password hashing

---

## Project Structure

```
locals/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── models/       # DB models (User, Local, Service, Booking, Review, Message)
│   │   ├── routes/       # REST route handlers
│   │   ├── middleware/   # Auth, error handling
│   │   ├── services/     # Stripe, Cloudinary, Socket.io
│   │   └── utils/        # Helpers
│   ├── config/           # DB config, env
│   └── package.json
│
└── frontend/             # React Native (Expo)
    └── src/
        ├── screens/
        │   ├── auth/     # Login, Register (User or Local)
        │   ├── user/     # Search, LocalList, LocalProfile, BookingConfirm
        │   ├── local/    # ServiceDetail
        │   ├── admin/    # LocalDashboard, ManageServices, ManageCalendar
        │   └── shared/   # Messages, Reviews
        ├── components/   # Reusable UI components
        ├── navigation/   # App navigator
        ├── store/        # Zustand state
        ├── services/     # API client
        ├── hooks/        # Custom hooks
        └── theme/        # Colors, typography, spacing
```

---

## Core Features

### For Travelers (Users)
- Search locals by city/location with ratings summary
- Browse local profiles — bio, services, photos, star ratings
- Read full reviews from past customers
- Book services with in-app payment (Apple Pay, Google Pay, credit card via Stripe)
- Pick date + time for tour bookings via calendar
- Message locals through the app
- Leave reviews after a service

### For Locals
- Create a profile with bio, photos, and location
- List services: Email, In-App Message, or Tour
  - Set price, duration, description
  - Upload photos for tour listings
- Manage availability calendar (block dates, set hours for tours)
- Dashboard: upcoming bookings, earnings, messages
- Respond to messages from users

---

## Data Models

### User
```
id, email, password_hash, name, avatar_url, role (user|local), created_at
```

### LocalProfile
```
id, user_id, bio, location, city, lat, lng, cover_photo_url, avg_rating, total_reviews
```

### Service
```
id, local_id, type (email|message|tour), title, description, price, duration_minutes,
photos (json array), is_active, created_at
```

### Availability
```
id, local_id, date, start_time, end_time, is_blocked
```

### Booking
```
id, user_id, service_id, scheduled_date, scheduled_time, status (pending|confirmed|completed|cancelled),
stripe_payment_intent_id, total_amount, created_at
```

### Review
```
id, booking_id, user_id, local_id, rating (1-5), comment, created_at
```

### Message
```
id, booking_id, sender_id, receiver_id, content, is_read, created_at
```

---

## Getting Started

### Backend
```bash
cd backend
npm install
cp .env.example .env    # Fill in DB, Stripe, Cloudinary credentials
npm run db:migrate      # Run PostgreSQL migrations
npm run dev             # Start dev server on :3000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env    # Fill in API URL, Stripe publishable key
npx expo start          # Start Expo dev server
```

---

## Environment Variables

### Backend `.env`
```
DATABASE_URL=postgresql://user:pass@localhost:5432/locals_db
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=3000
```

### Frontend `.env`
```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
