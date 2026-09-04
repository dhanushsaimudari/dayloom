# Dayloom

> *Your days are threads. Your life is the pattern.*

Dayloom is a privacy-first personal reflection and progress intelligence platform built on Google Cloud, Firebase, and Google Gemini. It combines low-friction daily telemetry capture, voice and multimodal journaling, and deterministic analytics to help users recognize life patterns without toxic streak anxiety or generic chatbot hallucinations.

---

## Key Capabilities

- **Quick Daily Check-In (~10s)**: Log mood, micro-habits, and unstructured thoughts (Brain Dump) in seconds.
- **Append-Only Data Protection**: Once recorded, journal entries are strictly read-only. Subsequent evening check-ins or AI session summaries append cleanly as new paragraphs, preserving prior notes from being overwritten or lost.
- **Reflectra (AI Companion)**: Conversational partner powered by Google Gemini 2.5 Flash. Features real-time voice speech recognition, multimodal photo memory (Memento) analysis, and first-person session synthesis with full user review before persistence.
- **Diarium Timeline & Archive**: Interactive monthly calendar tracking habits, mood trajectory, and attached photo memories with a 7-day append policy and immutable version history (`/edits`).
- **Deterministic Progress Analytics**: Mathematical trend calculation for habit consistency, weekday vs. weekend performance, time-of-day distribution, and month-over-month trajectory paired with cached monthly reports.
- **Gentle Re-Engagement**: Empathetic, non-guilt prompts that acknowledge life disruptions rather than breaking streak motivation.
- **Komorebi Theme Engine**: Custom glassmorphism UI with curated palettes (Midnight Horizon, Forest Glade, Golden Hour, Obsidian Slate).

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Frontend                        │
│             React 18 · Vite · Context API · Vanilla CSS     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / Bearer ID Token
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  Google Cloud Run Backend                   │
│                     Express.js (Node 20+)                   │
│                                                             │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   authMiddleware.js   │ ───▶  │  inputValidation.js   │  │
│  │ (verifyIdToken / ADC) │       │ (Sanitize & Schemas)  │  │
│  └───────────────────────┘       └───────────────────────┘  │
│                              │                              │
│  ┌───────────────────────────┴───────────────────────────┐  │
│  │ Route Handlers:                                       │  │
│  │   /api/journal    - Check-in, Diarium & Append-Only   │  │
│  │   /api/gemini     - Reflectra Chat, Voice & Vision    │  │
│  │   /api/analytics  - Deterministic Trends & Reporting  │  │
│  │   /api/user       - Settings, Themes & Account Policy │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│       Cloud Firestore       │ │      Google Gemini API      │
│  Path: /users/{uid}/...     │ │      gemini-2.5-flash       │
│  - entries (Check-Ins)      │ │  - Grounded Chat Reflection │
│  - settings (Habits/Theme)  │ │  - Multimodal Vision Lens   │
│  - edits (Audit Versions)   │ │  - Audio Transcription      │
│  - analytics/monthly        │ └─────────────────────────────┘
└─────────────────────────────┘
```

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router v7, Lucide Icons, Canvas API |
| **Backend API** | Node.js (ES Modules), Express.js, Multer |
| **Cloud & Hosting** | Google Cloud Run, Google Cloud Build, Docker |
| **Data & Auth** | Cloud Firestore, Firebase Authentication, Firebase Admin SDK |
| **Generative AI** | Google Gemini 2.5 Flash via `@google/genai` SDK |

---

## Project Structure

```
.
├── src/                      # Express Backend API
│   ├── index.js              # Server entry point & static asset serving
│   ├── middleware/
│   │   ├── authMiddleware.js # Firebase ID token validation & tenant verification
│   │   └── inputValidation.js# Payload schemas & parameter constraints
│   ├── routes/
│   │   ├── analyticsRoutes.js# Monthly progress calculation & caching
│   │   ├── authRoutes.js     # User profile, preferences & data wipe
│   │   ├── geminiRoutes.js   # Reflectra chat, audio & image endpoints
│   │   ├── journalRoutes.js  # Check-in, append-only entries & Diarium index
│   │   └── notificationRoutes.js # Missed-day gentle reminder endpoints
│   └── services/
│       ├── analyticsService.js # Mathematical habit and telemetry calculations
│       ├── firebaseAdmin.js  # Firebase Admin SDK initialization
│       ├── geminiService.js  # Grounded Gemini prompt orchestration
│       ├── mediaService.js   # In-memory buffer management for uploads
│       └── notificationService.js # Non-punitive reminder copy generator
├── tests/                    # Native Node.js Test Suite
│   ├── api.test.js           # Analytics logic, date bounds & append-only assertions
│   └── auth_and_isolation.test.js # Tenant isolation & auth token verification
├── web/                      # React Frontend Application
│   ├── src/
│   │   ├── components/       # UI components (HabitChecklist, MoodPicker, Navbar)
│   │   ├── context/          # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/            # Dashboard, Chat, Calendar, Analytics, Auth, Onboarding
│   │   ├── services/         # API client with automatic token refresh
│   │   └── utils/            # Client-side image compression utility
│   ├── index.html
│   └── vite.config.js
├── Dockerfile                # Multi-stage production container build
├── cloudbuild.yaml           # Google Cloud Build configuration
├── firestore.rules           # Cloud Firestore security rules
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher
- Google Cloud Project with Firestore and Firebase Authentication enabled
- Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

---

### Environment Setup

#### 1. Backend Configuration (`.env`)

Copy the example file:
```bash
cp .env.example .env
```

Set the required environment variables:
```ini
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=dayloom-personal-journal
FIREBASE_STORAGE_BUCKET=dayloom-personal-journal.appspot.com

# Optional: Local service account credentials (not required on GCP with ADC)
# FIREBASE_CLIENT_EMAIL=...
# FIREBASE_PRIVATE_KEY="..."
```

#### 2. Frontend Configuration (`web/.env`)

Copy the frontend example file:
```bash
cp web/.env.example web/.env
```

Populate your Firebase web credentials:
```ini
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=dayloom-personal-journal.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dayloom-personal-journal
VITE_FIREBASE_STORAGE_BUCKET=dayloom-personal-journal.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_BASE_URL=/api
```

---

### Installation & Local Run

1. **Install dependencies**:
   ```bash
   npm install
   cd web && npm install && cd ..
   ```

2. **Start the development servers**:
   ```bash
   npm run dev
   ```
   - **Backend API**: `http://localhost:5000`
   - **Frontend App**: `http://localhost:5173` (Vite dev proxy forwards `/api/*` to `:5000`)

3. **Verify tests**:
   ```bash
   npm test
   ```

4. **Verify production bundle**:
   ```bash
   npm run build
   ```

---

## API Reference

All protected endpoints require `Authorization: Bearer <ID_TOKEN>`.

### Journal & Check-In (`/api/journal`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/journal/checkin` | Records check-in. Appends new text to existing entry without overwriting. |
| `GET` | `/api/journal/entry/:date` | Fetches entry and `/edits` audit history for `YYYY-MM-DD`. |
| `GET` | `/api/journal/entries` | Returns timeline index for Diarium calendar rendering. |
| `PUT` | `/api/journal/entry/:id` | Appends note or updates habits/mood within the 7-day edit window. |
| `POST` | `/api/journal/retroactive`| Records a non-punitive reflection for a missed day within the past 7 days. |

### Reflectra & Gemini (`/api/gemini`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/gemini/chat` | Multi-turn conversational reflection grounded in user context. |
| `POST` | `/api/gemini/summarize` | Synthesizes conversation into a first-person journal entry. |
| `POST` | `/api/gemini/caption` | Multimodal analysis of attached Memento photo memories. |
| `POST` | `/api/gemini/transcribe` | In-memory audio transcription for voice journaling. |

### Analytics (`/api/analytics`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/monthly/:monthId` | Returns deterministic monthly telemetry and cached reports (`YYYY-MM`). |

### User & Preferences (`/api/user`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/user/profile` | Fetches user profile, custom habits, and active theme. |
| `POST` | `/api/user/onboarding` | Initializes user habit baseline and timezone configuration. |
| `PUT` | `/api/user/settings` | Updates preferences (theme, wallpaper, habits). |
| `DELETE`| `/api/user/account` | Cascades permanent deletion across Auth and Firestore data. |

---

## Data Integrity & Security

1. **Tenant Isolation**: Every Firestore read and write is scoped under `/users/{uid}/...`. Backend requests verify the caller's UID against the token claims.
2. **Immutable Entries & Append-Only Flow**: Historical reflections cannot be silently replaced or erased. Updates append as distinct paragraphs and create timestamped version entries in `/edits`.
3. **Graceful Token Cycling**: The frontend API wrapper automatically detects token expiry and retrieves a fresh token via `auth.currentUser.getIdToken(true)` before retrying failed requests.
4. **Zero Client Secret Exposure**: All AI interactions and administrative credentials run exclusively on the backend; the client only receives public Firebase configuration.

---

## Deployment to Google Cloud Run

Dayloom includes a multi-stage [Dockerfile](file:///c:/Users/Hi/Desktop/GEN%20AI%20IDEATHON/Dockerfile) that builds the React application and serves it directly via Express in a production container.

### Deploy via Google Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Deploy via Cloud Run CLI

```bash
# 1. Build and push container image
docker build -t gcr.io/dayloom-personal-journal/dayloom:latest .
docker push gcr.io/dayloom-personal-journal/dayloom:latest

# 2. Deploy service
gcloud run deploy dayloom \
  --image gcr.io/dayloom-personal-journal/dayloom:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,FIREBASE_PROJECT_ID=dayloom-personal-journal \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

---

## License

This project is licensed under the [MIT License](LICENSE).
