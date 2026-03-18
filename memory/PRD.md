# ConstructConnect - Product Requirements Document

## Overview
ConstructConnect is a contractor finder mobile app built with Expo (React Native) and FastAPI. Clients find trusted contractors nearby, communicate via real-time chat, and generate AI-powered service contracts.

## Tech Stack
- **Frontend**: Expo SDK 54, React Native, Expo Router (file-based routing), Socket.IO Client
- **Backend**: FastAPI, Python Socket.IO, MongoDB (Motor), JWT Auth
- **AI**: OpenAI GPT-5.2 via Emergent Integrations (contract generation)
- **Map**: Leaflet.js via WebView (OpenStreetMap tiles)

## User Roles
1. **Client** — Free registration. Can search contractors, view profiles, message, review.
2. **Contractor** — $25/month subscription. Can set live/recent locations, manage portfolio, generate contracts.

## Core Features

### Authentication (JWT)
- Email/password registration (client & contractor roles)
- Contractor registration shows $25/mo subscription notice
- Contractor type selection from 30 trade categories
- Demo login: `client@demo.com` / `demo123`

### Contractor Discovery
- Category filter (Electrician, Plumber, Handyman, Carpenter, Painter, Roofer, HVAC, General Contractor, etc.)
- Search by name
- Map view with contractor markers (Leaflet/WebView)
- Live vs Recent location indicators
- Distance-sorted results (Haversine formula)
- 20 seeded demo contractors in NYC area

### Contractor Profiles
- Star ratings & review count
- Hourly rate display
- Bio and work description
- Portfolio gallery (previous jobs)
- Contact options: Call, Email, In-App Message

### Real-Time Chat (WebSocket)
- Socket.IO implementation (python-socketio + socket.io-client)
- Room-based conversations
- Message persistence in MongoDB
- Typing indicators
- Optimistic UI updates with deduplication

### AI Contract Generation
- GPT-5.2 powered contract creation
- Form inputs: contractor/client names, job description, location, dates, amounts, payment terms
- Generates legally formatted service agreement
- Contract storage and retrieval

### Location System
- Live location toggle (GPS-based)
- Set 1-3 work locations as alternatives
- Location permissions handling (iOS & Android)
- Fallback to NYC coordinates when GPS unavailable

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/contractors | List/search contractors |
| GET | /api/contractors/:id | Contractor detail |
| PUT | /api/contractors/location | Update location settings |
| PUT | /api/contractors/profile | Update profile |
| GET | /api/contractor-types | List all trade types |
| POST | /api/reviews | Create review |
| GET | /api/reviews/:id | Get contractor reviews |
| POST | /api/portfolio | Add portfolio item |
| GET | /api/portfolio/:id | Get portfolio |
| POST | /api/conversations | Create/get conversation |
| GET | /api/conversations | List conversations |
| GET | /api/messages/:id | Get messages |
| POST | /api/contracts/generate | AI contract generation |
| GET | /api/contracts | List contracts |

## WebSocket Events
- `authenticate` — Link socket to user
- `join_room` — Join conversation room
- `send_message` — Send chat message
- `new_message` — Receive message broadcast
- `typing` / `user_typing` — Typing indicator

## Design
- Light theme with Safety Orange (#FF9500) + Slate (#1C1C1E)
- Professional construction aesthetic
- 8pt grid spacing system
- StyleSheet.create() for all styles
- SafeAreaView + KeyboardAvoidingView
- Min 44px touch targets

## Pending / Future
- **Stripe Integration**: $25/mo contractor subscription payment (UI ready, payment processing pending)
- **Push Notifications**: Message alerts
- **Image Upload**: Portfolio photo uploads
- **Advanced Map**: Google Maps native integration
- **Review Moderation**: Admin panel for review management
