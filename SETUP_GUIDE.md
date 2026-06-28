# AI Meeting Assistant - Complete Setup Guide

A full-stack, production-ready AI Meeting Assistant that captures system audio, transcribes it in real-time using Groq Whisper API, and streams results to a mobile-friendly web application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  • Real-time transcript display with auto-scroll            │
│  • AI-powered Q&A panel                                     │
│  • Meeting summary & action items                           │
│  • Search & export functionality                            │
│  • Mobile-responsive design                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │ Socket.IO / REST API
┌──────────────────────▼──────────────────────────────────────┐
│                Backend (Express + Node.js)                  │
│  • WebSocket server for real-time collaboration             │
│  • MongoDB storage for transcripts & meetings               │
│  • Groq API integration (Whisper + Llama)                  │
│  • JWT authentication                                       │
│  • REST + Socket.IO endpoints                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket / REST API
┌──────────────────────▼──────────────────────────────────────┐
│              Python Audio Service                           │
│  • Captures system audio (4-second chunks)                  │
│  • Sends to Groq Whisper for transcription                 │
│  • Streams back to backend via WebSocket/REST              │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **Node.js**: v18+
- **Python**: 3.8+
- **MongoDB**: Running locally or cloud (optional - will fallback to in-memory)
- **Groq API Key**: Get from https://console.groq.com
- **Audio Device**: System audio input configured

### System-Specific Setup

#### macOS
```bash
# Install BlackHole (virtual audio cable)
# Download from: https://existential.audio/blackhole/
# Then set BlackHole as system audio output in Sound preferences
```

#### Windows
```bash
# Install VB-Audio Cable
# Download from: https://vb-audio.com/Cable/
# Set VB-Audio Cable as system audio output in Sound settings
```

#### Linux (PulseAudio)
```bash
# Use default system input - works with PulseAudio/ALSA
pactl list sources  # List available input devices
```

## Installation & Setup

### 1. Backend Setup

```bash
# Install dependencies
pnpm install

# Create .env file with your configuration
cat > .env << EOF
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=mongodb://localhost:27017/meeting-assistant
NODE_ENV=development
PORT=8080
EOF

# Start dev server (includes frontend + backend)
pnpm dev
```

The server will start on **http://localhost:8080**

### 2. Frontend Access

Once the backend is running:
- **Home**: http://localhost:8080/
- **Meeting Assistant**: http://localhost:8080/meeting

### 3. Python Audio Service Setup

```bash
# Navigate to python directory
cd python

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Set your Groq API key
export GROQ_API_KEY="your_groq_api_key_here"  # Linux/macOS
# On Windows: set GROQ_API_KEY=your_groq_api_key_here
```

## Usage

### Step 1: Start the Meeting

1. Open http://localhost:8080/meeting in your browser
2. Enter a meeting title (optional)
3. Click **"Start Meeting"**
4. Note the **Meeting ID** (displayed after starting)

### Step 2: Capture Audio

In a separate terminal, run the Python audio service:

```bash
python python/audio_service.py \
  --server http://localhost:8080 \
  --meeting-id YOUR_MEETING_ID \
  --duration 300

# Arguments:
# --server: Backend URL (default: http://localhost:8080)
# --meeting-id: Meeting ID from Step 1 (required)
# --websocket: Use WebSocket instead of REST API (optional)
# --duration: Capture duration in seconds (optional)
```

### Step 3: Monitor in Real-Time

- **Transcript** appears live in the browser as audio is transcribed
- Use **Search** to find specific topics
- Toggle **Auto-scroll** to keep up with new text
- **Pause** recording without ending the meeting

### Step 4: Generate AI Insights

Once transcription is running:

#### Generate Summary
- Click **"📝 Generate Summary"**
- Get: Summary + Key Points + Action Items + Decisions

#### Ask Questions
- Click **"💬 Ask Question"**
- Type any question about the meeting content
- AI answers using only the transcript as context

#### Export Transcript
- Click **"Copy"** to copy full transcript to clipboard
- Click **"📎 Export as PDF"** (coming soon)

## API Endpoints

### Meeting Management

```bash
# Create a new meeting
POST /api/meetings
{
  "title": "Q3 Planning",
  "userId": "user-123"
}

# Get meeting details
GET /api/meetings/:meetingId

# End a meeting
POST /api/meetings/:meetingId/end

# Get transcript
GET /api/meetings/:meetingId/transcript

# Add transcript chunk
POST /api/meetings/:meetingId/transcript-chunk
{
  "text": "transcribed text here",
  "duration": 4.5
}
```

### AI Features

```bash
# Generate summary
POST /api/ai/summary
{
  "transcript": "full meeting transcript text"
}
Response:
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "actionItems": ["...", "..."],
  "decisions": ["...", "..."]
}

# Ask question
POST /api/ai/question
{
  "question": "What was discussed about budget?",
  "transcript": "full meeting transcript text"
}
Response:
{
  "answer": "Based on the transcript, ..."
}

# Extract key topics
POST /api/ai/key-points
{
  "transcript": "full meeting transcript text"
}
Response:
{
  "keyPoints": ["Topic 1", "Topic 2", ...]
}
```

### WebSocket Events

```javascript
// Client-side Socket.IO example
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080');

// Join a meeting
socket.emit('join-meeting', 'meeting-123');

// Listen for transcript updates
socket.on('transcript-update', (data) => {
  console.log('New text:', data.text);
  console.log('Timestamp:', data.timestamp);
  console.log('Duration:', data.duration);
});

// Send transcript chunk (from Python service)
socket.emit('transcript-chunk', {
  meetingId: 'meeting-123',
  text: 'transcribed text',
  duration: 4.2
});
```

## Advanced Configuration

### MongoDB Setup

For production, use a managed MongoDB service:

```bash
# MongoDB Atlas (Cloud)
export MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/meeting-assistant?retryWrites=true&w=majority"

# Local MongoDB
# Install: brew install mongodb-community (macOS)
# Start: brew services start mongodb-community
# URL: mongodb://localhost:27017/meeting-assistant
```

### Environment Variables

```env
# Required
GROQ_API_KEY=gsk_your_api_key_here

# Optional
MONGODB_URI=mongodb://localhost:27017/meeting-assistant
NODE_ENV=development
PORT=8080
PING_MESSAGE=pong
```

### Python Service Options

```bash
# REST API mode (default)
python python/audio_service.py --meeting-id 123

# WebSocket mode (faster)
python python/audio_service.py --meeting-id 123 --websocket

# Limited duration (30 minutes)
python python/audio_service.py --meeting-id 123 --duration 1800

# Custom server
python python/audio_service.py --server https://myserver.com --meeting-id 123
```

## Troubleshooting

### Python Service Won't Connect

```bash
# Check backend is running
curl http://localhost:8080/api/ping

# Verify GROQ_API_KEY
echo $GROQ_API_KEY

# Check network connectivity
python -c "import requests; requests.get('https://api.groq.com')"
```

### No Audio Captured

**macOS**: Verify BlackHole is selected as system output
```bash
# List audio devices
python -c "import sounddevice; print(sounddevice.query_devices())"
```

**Windows**: Check VB-Audio Cable is output device

**Linux**: List and select input device
```bash
pactl list sources | grep "Name:"
```

### Groq API Errors

- Verify API key: https://console.groq.com
- Check rate limits (free tier: 30 requests/minute)
- Ensure audio is 16kHz mono WAV format

### MongoDB Connection Issues

```bash
# If MONGODB_URI not set, the app uses in-memory storage
# For development, this is fine
# For production, configure MONGODB_URI

# Test connection
mongosh "mongodb://localhost:27017/meeting-assistant"
```

### Transcript Not Appearing

1. Verify Python service is running
2. Check browser console for WebSocket errors
3. Verify meeting ID matches between browser and Python service
4. Check backend logs for errors

## Production Deployment

### Deploy to Netlify

```bash
# Build
pnpm build

# Deploy
netlify deploy --prod --dir dist/spa
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy Python Service

Run on a dedicated machine or cloud instance:

```bash
# AWS EC2 / DigitalOcean / Linode
python audio_service.py \
  --server https://yourdomain.com \
  --meeting-id auto \
  --duration 28800  # 8 hours
```

## Performance Optimization

- **Frontend**: Uses React hooks for efficient re-renders
- **Backend**: MongoDB indexing for fast transcript search
- **Python**: Async WebSocket for low-latency streaming
- **Audio**: 4-second chunks minimize latency (end-to-end < 5s)

## Security

- **Authentication**: JWT tokens (ready to implement)
- **Encryption**: HTTPS/WSS in production
- **API Keys**: Stored in environment variables
- **Database**: Mongoose schema validation
- **CORS**: Configured for your domain

## Features Implemented

✅ Real-time audio transcription
✅ Live transcript display with auto-scroll
✅ Meeting management (create, end, retrieve)
✅ AI summaries (with Groq Llama)
✅ Q&A about meeting content
✅ Transcript search
✅ Copy to clipboard
✅ Connection status indicator
✅ Meeting timer
✅ Pause/Resume recording
✅ Responsive mobile UI

## Features Coming Soon

- PDF/DOCX export
- Speaker diarization
- Translation
- Sentiment analysis
- Meeting history
- Share meeting notes
- Offline caching
- Dark mode toggle
- PWA support
- Push notifications

## Architecture Files

```
.
├── client/                    # React SPA frontend
│   ├── pages/
│   │   ├── Index.tsx         # Home page
│   │   ├── Meeting.tsx       # Main meeting interface
│   │   └── NotFound.tsx      # 404 page
│   ├── components/ui/        # Pre-built UI library
│   ├── App.tsx               # Router setup
│   └── global.css            # Tailwind + theme
│
├── server/                    # Express backend
│   ├── index.ts              # Main server + Socket.IO
│   ├── routes/
│   │   ├── transcript.ts     # Meeting & transcript endpoints
│   │   └── ai.ts             # AI feature endpoints
│   ├── models/
│   │   ├── Meeting.ts        # MongoDB schema
│   │   └── User.ts           # User schema
│   ├── services/
│   │   └── groqService.ts    # Groq API integration
│   └── middleware/           # Auth, validation
│
├── python/
│   ├── audio_service.py      # Audio capture + transcription
│   └── requirements.txt      # Python dependencies
│
├── shared/                   # Shared types
│   └── api.ts                # API interfaces
│
├── package.json              # Node dependencies
├── .env                      # Configuration
└── README.md                 # This file
```

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS, Socket.IO Client |
| **Backend** | Express 5, Node.js, TypeScript, Socket.IO, MongoDB, Mongoose |
| **AI/ML** | Groq API (Whisper Large V3, Llama 3.1) |
| **Audio** | sounddevice, numpy, scipy |
| **Database** | MongoDB + Mongoose ODM |
| **Testing** | Vitest |
| **Deployment** | Netlify/Vercel (Frontend), Any Node.js host (Backend) |

## Support & Resources

- **Groq Docs**: https://console.groq.com/docs
- **Socket.IO Docs**: https://socket.io/docs/v4/
- **MongoDB Docs**: https://docs.mongodb.com/
- **React Docs**: https://react.dev/
- **Express Docs**: https://expressjs.com/

## License

MIT
