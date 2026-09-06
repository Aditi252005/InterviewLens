# InterviewLens

AI-powered, privacy-first interview preparation based on your resume, target role, and job description.

InterviewLens reads your resume, your target role, and an optional job description, then uses the
Gemini API to generate a personalized set of interview questions — grounded in what's actually on
your resume, not a generic question bank.

## Features

- Google authentication (no passwords to manage)
- Resume-based interview questions, grounded in your actual experience
- Project deep-dive questions
- Technical questions based on the languages/frameworks/tools on your resume
- Role-specific fundamentals, scaled to your target role
- Job-description-specific questions when a JD is provided
- Resume defense — questions that challenge specific claims and metrics on your resume
- Preparation history, so you can revisit any past session without another AI call
- Privacy-first: your resume is processed temporarily and never persisted

## Architecture

```text
                         ┌──────────────────┐
                         │     React        │
                         │    Frontend      │
                         └────────┬─────────┘
                                  │
                                  │ HTTPS (session cookie)
                                  ▼
                         ┌──────────────────┐
                         │  Node + Express  │
                         │     Backend      │
                         └───────┬──────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌─────────────┐    ┌─────────────┐    ┌──────────────┐
       │ Google OAuth│    │ Gemini API  │    │ MongoDB Atlas│
       └─────────────┘    └─────────────┘    └──────────────┘
                                                   │
                                             Users + Sessions
                                             + Questions
```

Resume flow:

```text
User → Resume PDF → Express backend (temp file) → Gemini API → Questions
                                                          │
                                                          ├──► MongoDB (session + questions saved)
                                                          │
                                                          ▼
                                              Temporary PDF deleted (always, via try/finally)
```

## Tech stack

```text
Frontend:  React, React Router, Axios, plain CSS (Vite)
Backend:   Node.js, Express.js
Database:  MongoDB Atlas (Mongoose)
Auth:      Google OAuth 2.0 (Passport), server-side sessions
AI:        Google Gemini API
```

## Project structure

```text
interviewlens/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB + Passport/Google OAuth setup
│   │   ├── middleware/      # auth, error handling, rate limiting, upload/validation
│   │   ├── models/          # User, InterviewSession (Mongoose schemas)
│   │   ├── routes/          # auth, interviews, health
│   │   ├── services/        # geminiService.js — the only place that calls Gemini
│   │   ├── tests/           # Jest + Supertest tests
│   │   ├── utils/           # asyncHandler
│   │   ├── app.js           # Express app wiring
│   │   └── server.js        # entry point
│   ├── tmp_uploads/         # ephemeral resume storage (cleared per-request)
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/             # axios instance
    │   ├── components/      # Navbar, QuestionCard, ProtectedRoute
    │   ├── context/         # AuthContext
    │   ├── pages/           # Landing, Dashboard, PrepareForm, Results, LoginFailed
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── .env.example
    └── package.json
```

## Local setup

### Prerequisites

- Node.js 18+
- A MongoDB Atlas cluster (or local MongoDB for development)
- A Google Cloud project with OAuth 2.0 credentials
- A Gemini API key

### 1. MongoDB Atlas setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with a username/password.
3. Under Network Access, allow your current IP (or `0.0.0.0/0` for development only).
4. Copy the connection string and use it as `MONGODB_URI` — include a database name, e.g.
   `.../interviewlens?retryWrites=true&w=majority`.

### 2. Google OAuth setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an OAuth 2.0 Client ID of type "Web application".
3. Add an authorized redirect URI:
   - Local: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://<your-backend-domain>/api/auth/google/callback`
4. Copy the Client ID and Client Secret into the backend `.env`.

### 3. Gemini API setup

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and create an API key.
2. Copy it into `GEMINI_API_KEY` in the backend `.env`.
3. `GEMINI_MODEL` defaults to `gemini-2.0-flash` (a free-tier model that accepts PDF input and
   structured JSON output). You can change this via the environment variable without code changes
   as newer models become available.

### 4. Backend

```bash
cd backend
cp .env.example .env   # fill in the values from steps 1-3, plus a SESSION_SECRET
npm install
npm run dev             # starts on http://localhost:5000
```

### 5. Frontend

```bash
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev              # starts on http://localhost:5173
```

Open `http://localhost:5173`, sign in with Google, and generate your first preparation session.

## Environment variables

### Backend (`backend/.env`)

```text
PORT=5000
NODE_ENV=development
MONGODB_URI=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=
CLIENT_URL=http://localhost:5173
MAX_RESUME_SIZE_MB=5
MAX_JOB_DESCRIPTION_CHARS=6000
```

### Frontend (`frontend/.env`)

```text
VITE_API_URL=http://localhost:5000/api
```

## API documentation

All endpoints are prefixed with `/api`. Session-authenticated endpoints require the browser session
cookie set during Google login (`withCredentials: true` on the frontend).

### Auth

| Method | Path                     | Description                                  |
|--------|--------------------------|-----------------------------------------------|
| GET    | `/auth/google`           | Starts the Google OAuth flow                  |
| GET    | `/auth/google/callback`  | OAuth callback; creates a session, redirects  |
| GET    | `/auth/me`               | Returns the current authenticated user        |
| POST   | `/auth/logout`           | Destroys the session                          |

### Interviews (all require authentication)

| Method | Path                     | Description                                              |
|--------|--------------------------|-----------------------------------------------------------|
| POST   | `/interviews/generate`   | Uploads a resume + role (+ optional JD), returns a session |
| GET    | `/interviews`            | Lists the authenticated user's own sessions (summaries)    |
| GET    | `/interviews/:id`        | Returns one session, only if owned by the requester         |
| DELETE | `/interviews/:id`        | Deletes one session, only if owned by the requester          |

`POST /interviews/generate` accepts `multipart/form-data`:

- `resume` (required) — a PDF file, max `MAX_RESUME_SIZE_MB`
- `targetRole` (required) — one of the supported role strings
- `jobDescription` (optional) — plain text, max `MAX_JOB_DESCRIPTION_CHARS`

### Health

| Method | Path      | Description         |
|--------|-----------|----------------------|
| GET    | `/health` | Liveness check        |

## Security & privacy design

- **Authentication**: Google OAuth 2.0 via Passport, with a server-side session (cookie is
  `httpOnly`, `secure` in production, and scoped with `sameSite`). No passwords are stored or
  handled anywhere in the app.
- **Authorization**: every interview route reads `req.user.id` from the authenticated session —
  never from the request body, query string, or URL. Ownership is enforced *inside* the database
  query itself (`{ _id, userId }`), not checked after the fact, so a user can never retrieve or
  delete another user's session by guessing or changing an ID.
- **User isolation**: `GET /interviews` always filters by `userId`; there is no code path that
  returns another user's sessions.
- **Temporary resume processing**: uploaded PDFs are written to a local temp directory, validated
  (file extension, MIME type, and PDF magic bytes), sent to Gemini, and deleted in a `finally`
  block — so the file is removed whether generation succeeds or fails. The resume PDF and its raw
  extracted text are never written to MongoDB or to application logs; only the filename and the
  generated questions are stored.
- **API key protection**: `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `MONGODB_URI`, and
  `SESSION_SECRET` live only in backend environment variables and are never sent to the frontend
  or included in client bundles.
- **Rate limiting**: `POST /interviews/generate` is rate-limited per authenticated user
  (in-memory, MVP-appropriate). The limiter is documented as needing a shared/distributed store if
  the backend is ever horizontally scaled.
- **Input validation**: target role is checked against an allow-list, job description length is
  capped, and uploaded files are checked for both PDF MIME type/extension and PDF magic bytes
  before being sent to Gemini.
- **Error handling**: a central error handler returns clean, generic messages for unexpected
  failures and never leaks stack traces, connection strings, API keys, or resume content to the
  client.

The UI states plainly: *"Your resume is processed temporarily and is not permanently stored."*
This is a factual description of what the backend does, not a broader guarantee — InterviewLens
does not claim to guarantee complete privacy or security against every possible threat.

## Design decisions

- **MongoDB** was chosen because the data is naturally document-shaped (a user, and a set of
  preparation sessions each embedding their own questions) and needs no relational joins — a
  single `find({ userId })` covers the main query pattern.
- **Gemini** was chosen because it accepts PDF documents directly as input (no separate PDF-to-text
  extraction step needed), supports structured JSON output matching a schema, and has a usable
  free tier for an MVP/portfolio project.
- **Resumes are not persisted** because a resume is sensitive personal data the app has no
  ongoing need for once questions have been generated; only the derived, useful artifact (the
  questions) is kept.
- **AI output is structured JSON** (via Gemini's `responseSchema`) rather than free-form text,
  so the backend can validate it and store it directly, without fragile prompt-based text parsing.
- **Interview sessions are persisted** so a user can revisit previous preparation without
  re-uploading their resume or spending another AI call — this also keeps the app within a free
  API tier's usage limits.

## Testing

```bash
cd backend
npm test
```

Covers:

- **Authentication** — unauthenticated requests are rejected; authenticated requests pass through.
- **Authorization** — a user can access their own session; a different user gets a 404 for the same
  ID; `GET /interviews` never returns another user's sessions.
- **Resume upload** — non-PDF files are rejected; missing target role is rejected.
- **Interview generation** — a successful (mocked) Gemini response is stored; a Gemini failure is
  handled gracefully; the temporary resume file is deleted after both success and failure.
- **Database** — a session with embedded questions saves correctly; sessions are correctly
  filtered by `userId`.

Tests use `mongodb-memory-server` for an isolated, ephemeral database — no real Atlas cluster is
needed to run the test suite. (The in-memory server downloads a MongoDB binary the first time it
runs, so it requires network access to `fastdl.mongodb.org` in whatever environment runs the tests.)

## Deployment

1. **Database**: Use the MongoDB Atlas cluster from local setup, with production network access
   rules (avoid `0.0.0.0/0` in production; allow list your backend host's IPs or use Atlas's
   PrivateLink/VPC peering if available).
2. **Backend → Render or Railway**:
   - Set the root directory to `backend/`.
   - Build command: `npm install`. Start command: `npm start`.
   - Set all backend environment variables from `.env.example` in the platform's dashboard,
     pointing `CLIENT_URL` at your deployed frontend URL and `GOOGLE_CALLBACK_URL` at your
     deployed backend's callback path.
3. **Frontend → Vercel**:
   - Set the root directory to `frontend/`.
   - Set `VITE_API_URL` to your deployed backend's `/api` URL.
   - Build command: `npm run build`. Output directory: `dist`.
4. **Google OAuth**: add the production callback URL to the OAuth client's authorized redirect
   URIs in the Google Cloud Console.
5. **Cookies across domains**: since the frontend and backend will be on different domains in
   production, the session cookie is set with `secure: true` and `sameSite: "none"` when
   `NODE_ENV=production` — both frontend and backend must be served over HTTPS for this to work.

## Do-not-over-engineer notes

This project intentionally excludes: voice/video interviews, a real-time AI interviewer, RAG,
vector databases, embeddings, Redis, microservices, custom ML models, resume rewriting, job
scraping, and code execution. The goal is a simple, secure, well-engineered full-stack AI
application that's easy to understand and explain end-to-end.
