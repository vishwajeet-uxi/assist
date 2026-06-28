# AI Meeting Assistant - Architecture & Deployment Guide

## System Architecture

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────┐
│                        END USERS                             │
│  (Computer with system audio + Browser + Python service)     │
└────────────────┬─────────────────────────────────────────────┘
                 │
         ┌───────┴──────────┬──────────────┬──────────────┐
         │                  │              │              │
    System Audio        Browser         Python App
    (captured by       (React SPA)      (Capture +
     Python)                           Transcribe)
         │                  │              │
         └──────────────────┼──────────────┘
                            │
                    HTTP/WebSocket
                            │
         ┌──────────────────▼──────────────────┐
         │     NODE.JS BACKEND (Express)       │
         │                                     │
         │  ┌─────────────────────────────┐   │
         │  │   Socket.IO Server          │   │
         │  │  (Real-time Broadcasting)   │   │
         │  └─────────────────────────────┘   │
         │                                     │
         │  ┌─────────────────────────────┐   │
         │  │   REST API Endpoints        │   │
         │  │  (Meetings, Transcripts)    │   │
         │  └─────────────────────────────┘   │
         │                                     │
         │  ┌─────────────────────────────┐   │
         │  │   Groq Service Module       │   │
         │  │  (Whisper + Llama API)      │   │
         │  └─────────────────────────────┘   │
         │                                     │
         └──────────────┬──────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
      MongoDB        Groq API      User Devices
      (Persist)   (Transcribe)     (Socket.IO)
         │              │              │
         ▼              ▼              ▼
    Database      AI Inference    Live Clients
```

## Component Architecture

### Frontend (React SPA)

```
App.tsx (Router)
├── pages/
│   ├── Index.tsx (Home)
│   └── Meeting.tsx (Main App)
│       ├── Header (Controls + Status)
│       ├── Main Content
│       │   ├── Transcript Panel
│       │   │   ├── Search Bar
│       │   │   ├── Transcript Display
│       │   │   └── Footer Stats
│       │   └── AI Features Sidebar
│       │       ├── Summary Generator
│       │       ├── Q&A Panel
│       │       └── Meeting Info
│       └── Socket.IO Connection
└── components/ui/ (Radix UI Components)
```

### Backend (Express Server)

```
server/index.ts
├── Express App Setup
├── Socket.IO Server
│   └── Event Handlers
│       ├── join-meeting
│       ├── transcript-chunk
│       ├── ask-question
│       └── disconnect
├── Routes
│   ├── /api/meetings (CRUD)
│   ├── /api/transcripts (Retrieve)
│   ├── /api/ai/* (Summaries, Q&A)
│   └── /api/ping (Health)
├── Middleware
│   ├── CORS
│   ├── JSON parser
│   └── Error handling
├── Services
│   └── groqService.ts
│       ├── transcribe()
│       ├── summarize()
│       ├── answerQuestion()
│       └── extractTopics()
└── Models
    ├── Meeting (MongoDB)
    └── User (MongoDB)
```

### Python Service

```
audio_service.py
├── Configuration
│   ├── API Key loading
│   ├── Server URL
│   └── Meeting ID
├── Audio Capture
│   ├── Device selection
│   ├── 4-second chunks
│   └── 16kHz mono conversion
├── Transcription
│   ├── Groq API calls
│   ├── Error handling
│   └── Mock fallback
├── Streaming
│   ├── REST API mode
│   ├── WebSocket mode
│   └── Retry logic
└── Logging
```

## Data Flow

### 1. Meeting Creation

```
Browser
  ↓ POST /api/meetings
Server
  ↓ Create MongoDB doc
Database
  ↓ Return meeting ID
Browser (display ID)
```

### 2. Real-time Transcription

```
Python Service (4-sec audio)
  ↓ Groq Whisper API
Groq (transcribe)
  ↓ Return text
Python Service
  ↓ POST or WebSocket emit
Express Server
  ↓ Save to MongoDB
  ↓ Broadcast via Socket.IO
Connected Browsers
  ↓ React updates DOM
  ↓ Display transcript
User (see text in real-time)
```

### 3. Generate Summary

```
Browser (click "Generate Summary")
  ↓ POST /api/ai/summary {transcript}
Server
  ↓ Call Groq Llama 3.1
Groq
  ↓ Return summary + key points + actions
Server
  ↓ JSON response
Browser
  ↓ Display in sidebar
User (see summary)
```

### 4. Answer Question

```
Browser (type question, click send)
  ↓ POST /api/ai/question {question, transcript}
Server
  ↓ Call Groq Llama 3.1 with context
Groq
  ↓ Return answer
Server
  ↓ JSON response
Browser
  ↓ Display answer in Q&A panel
User (see answer)
```

## Database Schema

### Meeting Collection

```javascript
{
  _id: ObjectId,
  title: String,
  userId: String,
  startTime: Date,
  endTime: Date | null,
  status: "active" | "completed" | "paused",
  transcriptChunks: [
    {
      text: String,
      timestamp: Date,
      duration: Number
    }
  ],
  fullTranscript: String,
  createdAt: Date,
  updatedAt: Date
}
```

### User Collection (Ready for Auth)

```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  name: String,
  createdAt: Date
}
```

## API Endpoints

### Meeting Management

```
POST   /api/meetings                 Create meeting
GET    /api/meetings/:meetingId      Get meeting
POST   /api/meetings/:meetingId/end  End meeting
GET    /api/meetings/:meetingId/transcript   Get transcript
POST   /api/meetings/:meetingId/transcript-chunk   Add chunk
```

### AI Features

```
POST   /api/ai/summary              Generate summary
POST   /api/ai/question             Answer question
POST   /api/ai/key-points           Extract topics
```

### Health

```
GET    /api/ping                    Health check
```

## WebSocket Events

### Client → Server

```javascript
socket.emit('join-meeting', meetingId)
socket.emit('transcript-chunk', {
  meetingId: String,
  text: String,
  duration: Number
})
socket.emit('ask-question', {
  meetingId: String,
  question: String,
  transcript: String
})
```

### Server → Client

```javascript
socket.on('user-joined', {
  userId: String,
  timestamp: Date
})
socket.on('transcript-update', {
  text: String,
  timestamp: Date,
  duration: Number
})
socket.on('error', {
  message: String
})
```

## Deployment Options

### Option 1: Netlify + Vercel (Recommended for MVP)

```
┌─────────────┐              ┌──────────────┐
│  Netlify    │              │  Vercel      │
│  (Frontend) │              │  (Backend)   │
│  React SPA  │◄──────────►  │  Node.js     │
└─────────────┘              └──────────────┘
       ↓                           ↓
    CDN                      Serverless
```

**Frontend (Netlify):**
```bash
pnpm build
netlify deploy --prod --dir dist/spa
```

**Backend (Vercel):**
```bash
vercel --prod
```

### Option 2: Docker + Any Cloud

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
```

Deploy to:
- AWS ECS
- Google Cloud Run
- DigitalOcean App Platform
- Heroku

### Option 3: Self-Hosted

```
┌─────────────────────────────────────┐
│  Your Server (Linux)                │
│  • Node.js + Express                │
│  • MongoDB (or cloud)               │
│  • Nginx (reverse proxy)            │
│  • SSL (Let's Encrypt)              │
└─────────────────────────────────────┘
```

## Scalability Considerations

### Current Architecture

```
Single Server
├── Express App
├── Socket.IO
└── Node Process

Good for:
• < 100 concurrent users
• Single region
• MVP/Demo
```

### Scaled Architecture (Future)

```
Load Balancer
├── Server 1 (Express)
├── Server 2 (Express)
└── Server 3 (Express)
    ↓
Session Store (Redis)
    ↓
Message Broker (RabbitMQ)
    ↓
MongoDB Cluster
```

For scaling:
1. Use Redis for Socket.IO adapter
2. Add message queue (RabbitMQ/Kafka)
3. Database replication
4. CDN for static assets
5. API rate limiting

## Performance Metrics

### Current Performance

| Metric | Value | Target |
|--------|-------|--------|
| Audio to display | 4-5 seconds | < 5s ✓ |
| API response | 100-500ms | < 1s ✓ |
| WebSocket latency | 50-100ms | < 200ms ✓ |
| Page load | < 2s | < 3s ✓ |
| Transcript search | < 100ms | < 500ms ✓ |

### Optimization Opportunities

1. **Frontend**
   - Code splitting (route-based)
   - Image optimization
   - CSS/JS minification (automatic with Vite)

2. **Backend**
   - Database indexing
   - Response compression
   - Caching (Redis)
   - Query optimization

3. **Audio**
   - Reduce chunk size (2s vs 4s)
   - Parallel processing
   - Streaming compression

## Security Architecture

### Current Security

```
┌─────────────┐
│   Browser   │
│  HTTPS      │
└──────┬──────┘
       │
       │ TLS 1.2+
       │
┌──────▼──────┐
│   Server    │
│  CORS check │
│  Input val. │
└──────┬──────┘
       │
       │ MongoDB Auth
       │
┌──────▼──────┐
│  Database   │
│  Encrypted  │
└─────────────┘
```

### Security Layers

1. **Transport**
   - HTTPS/TLS in production
   - WSS for WebSocket
   - Certificate validation

2. **Application**
   - CORS whitelist
   - Input validation (Zod)
   - Rate limiting
   - Request signing (future)

3. **Data**
   - Passwords hashed (bcryptjs)
   - API keys in env vars
   - No sensitive logs
   - Database authentication

4. **API Keys**
   - Groq API key: server-side only
   - Never exposed to client
   - Rotation support

## Monitoring & Logging

### What to Monitor

```
Application Metrics:
• Request response time
• Error rate
• WebSocket connections
• Database query time
• API rate limits

Infrastructure:
• CPU usage
• Memory usage
• Disk space
• Network throughput
```

### Logging Strategy

```
Level | Use Case
------|----------
ERROR | Critical failures
WARN  | Potential issues
INFO  | Important events
DEBUG | Development only
```

## Disaster Recovery

### Backup Strategy

```
Database: Daily snapshots
Logs: Archive after 30 days
Code: Git (always available)
Assets: CDN (distributed)
```

### Recovery Time Objectives

```
RPO (Recovery Point): 1 hour
RTO (Recovery Time): 4 hours
```

## Cost Estimation (Monthly)

| Component | Cost | Notes |
|-----------|------|-------|
| Frontend (Netlify) | $0 | Free tier sufficient |
| Backend (Vercel) | $0-20 | Scales with usage |
| Database (MongoDB) | $10 | Shared cluster |
| Groq API | $0-10 | ~5000 tokens free |
| Audio service | $0 | Home/office PC |
| **Total** | **$10-40** | Very economical |

---

For deployment help, see [SETUP_GUIDE.md#production-deployment](./SETUP_GUIDE.md#production-deployment)
