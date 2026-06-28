# 🎙️ AI Meeting Assistant

A **production-ready**, full-stack AI Meeting Assistant that captures system audio in real-time, transcribes it using Groq Whisper API, and streams results to a beautiful, mobile-friendly web application with AI-powered insights.

## ✨ Features

### Core Features ✅
- **Real-time Transcription**: Capture system audio and transcribe using Groq Whisper (< 5s latency)
- **Live Display**: Transcript appears in real-time as you speak
- **AI Summaries**: Generate meeting summaries, key points, action items, and decisions
- **Smart Q&A**: Ask questions about meeting content - AI answers using only the transcript
- **Search**: Full-text search through transcripts
- **Transcript Management**: Copy, export, and organize meetings
- **Connection Status**: Live indicator for server/WebSocket connection
- **Mobile Responsive**: Works perfectly on phones, tablets, and desktops
- **Auto-scroll**: Automatically follow new transcript as it arrives
- **Pause/Resume**: Control recording without ending the meeting

### Advanced Features 🚀
- **WebSocket Broadcasting**: Real-time updates to multiple connected clients
- **MongoDB Storage**: Persistent transcript storage with full audit trail
- **Meeting History**: Retrieve and review past meetings
- **JWT Authentication**: Ready for multi-user support
- **Error Handling**: Automatic reconnection with exponential backoff
- **Graceful Degradation**: Mock responses when API is unavailable

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  React SPA (Vite)                                       │
│  • Real-time transcript with auto-scroll               │
│  • AI summary & Q&A panel                              │
│  • Search, copy, export                                │
│  • Mobile-responsive UI                                │
└──────────────┬──────────────────────────────────────────┘
               │ Socket.IO + REST API
┌──────────────▼──────────────────────────────────────────┐
│  Express Server (Node.js)                              │
│  • WebSocket server for real-time updates              │
│  • REST API endpoints                                  │
│  • Groq API integration (Whisper + Llama)             │
│  • MongoDB ODM with Mongoose                          │
└──────────────┬──────────────────────────────────────────┘
               │ WebSocket + REST
┌──────────────▼──────────────────────────────────────────┐
│  Python Audio Service                                  │
│  • Captures 4-second audio chunks                      │
│  • Sends to Groq Whisper API                          │
│  • Streams back to backend                             │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone <repo>
cd meeting-assistant

# 2. Copy env example
cp .env.example .env
# Edit .env and add your Groq API key

# 3. Install dependencies
pnpm install

# 4. Start backend
pnpm dev
# Server runs on http://localhost:8080

# 5. In another terminal, start Python service
cd python
pip install -r requirements.txt
export GROQ_API_KEY="your_key_here"  # or set in .env

# 6. Start meeting in browser
# Open http://localhost:8080/meeting
# Click "Start Meeting"
# Copy the Meeting ID

# 7. Capture audio
python audio_service.py --meeting-id YOUR_MEETING_ID
```

See **[QUICKSTART.md](./QUICKSTART.md)** for detailed 5-minute setup.

## 📖 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Complete configuration guide
- **[API Endpoints](./SETUP_GUIDE.md#api-endpoints)** - REST & WebSocket API docs

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS 3, Socket.IO Client |
| **Backend** | Express 5, Node.js 18+, TypeScript, Socket.IO, Mongoose |
| **Database** | MongoDB (optional - uses in-memory storage for dev) |
| **AI** | Groq API (Whisper Large V3 for transcription, Llama 3.1 for reasoning) |
| **Audio** | sounddevice, numpy, scipy |
| **Deployment** | Netlify/Vercel (frontend), Any Node.js host (backend) |

## 📁 Project Structure

```
.
├── client/                      # React SPA Frontend
│   ├── pages/
│   │   ├── Index.tsx           # Home page
│   │   ├── Meeting.tsx         # Main meeting interface
│   │   └── NotFound.tsx        # 404 page
│   ├── components/ui/          # Pre-built UI components
│   ├── hooks/                  # Custom React hooks
│   ├── App.tsx                 # Router setup
│   └── global.css              # TailwindCSS + theme
│
├── server/                      # Express Backend
│   ├── index.ts                # Main server, Socket.IO setup
│   ├── routes/
│   │   ├── transcript.ts       # Meeting & transcript APIs
│   │   ├── ai.ts               # AI feature APIs
│   │   └── demo.ts             # Demo endpoint
│   ├── models/
│   │   ├── Meeting.ts          # Meeting MongoDB schema
│   │   └── User.ts             # User schema
│   ├── services/
│   │   └── groqService.ts      # Groq API integration
│   ├── middleware/             # Auth, validation
│   └── node-build.ts           # Build configuration
│
├── python/
│   ├── audio_service.py        # Audio capture + transcription
│   └── requirements.txt        # Python dependencies
│
├── shared/                      # Shared Types
│   └── api.ts                  # API interfaces
│
├── QUICKSTART.md               # 5-minute setup guide
├── SETUP_GUIDE.md              # Complete documentation
├── .env.example                # Environment variables template
├── package.json                # Node dependencies
└── README.md                   # This file
```

## 🔧 Configuration

### Environment Variables

```env
# Required
GROQ_API_KEY=gsk_your_api_key_here

# Optional
MONGODB_URI=mongodb://localhost:27017/meeting-assistant
NODE_ENV=development
PORT=8080
```

Get your Groq API key from: https://console.groq.com

## 📡 API Endpoints

### Meetings
- `POST /api/meetings` - Create a new meeting
- `GET /api/meetings/:meetingId` - Get meeting details
- `POST /api/meetings/:meetingId/end` - End a meeting
- `GET /api/meetings/:meetingId/transcript` - Get transcript
- `POST /api/meetings/:meetingId/transcript-chunk` - Add transcript text

### AI Features
- `POST /api/ai/summary` - Generate meeting summary
- `POST /api/ai/question` - Answer questions about meeting
- `POST /api/ai/key-points` - Extract key topics

### Health
- `GET /api/ping` - Health check

## 🔌 WebSocket Events

```javascript
// Join meeting
socket.emit('join-meeting', meetingId);

// Receive transcript updates
socket.on('transcript-update', (data) => {
  console.log(data.text);      // Transcribed text
  console.log(data.timestamp); // When it was transcribed
  console.log(data.duration);  // Duration of audio chunk
});

// Send transcript chunk
socket.emit('transcript-chunk', {
  meetingId: '123',
  text: 'transcribed text',
  duration: 4.2
});
```

## 🧪 Development

### Run Dev Server
```bash
pnpm dev
```
Starts both frontend (Vite) and backend (Express) on http://localhost:8080

### Type Checking
```bash
pnpm typecheck
```

### Build for Production
```bash
pnpm build
```

Generates:
- `dist/spa/` - Frontend SPA
- `dist/server/` - Backend code

### Run Tests
```bash
pnpm test
```

## 🚀 Production Deployment

### Netlify (Frontend)
```bash
pnpm build
netlify deploy --prod --dir dist/spa
```

### Vercel (Frontend)
```bash
vercel --prod
```

### Heroku / Railway (Backend)
```bash
pnpm build
# Deploy dist/server to your platform
```

See **[SETUP_GUIDE.md#production-deployment](./SETUP_GUIDE.md#production-deployment)** for detailed instructions.

## 🔐 Security

- **API Keys**: Stored in environment variables (never in code)
- **Authentication**: JWT support (ready to implement)
- **CORS**: Configured for your domain
- **Validation**: Zod schemas for request validation
- **Database**: MongoDB schema validation

## 📊 Performance

- **End-to-end Latency**: < 5 seconds (audio capture → transcription → display)
- **Transcript Display**: Smooth scrolling with React hooks optimization
- **WebSocket Broadcasting**: Efficient room-based messaging
- **Database**: Indexed queries for fast transcript search

## 🐛 Troubleshooting

### Python Service Won't Connect
```bash
# Check backend is running
curl http://localhost:8080/api/ping

# Verify API key
echo $GROQ_API_KEY

# Check network
python -c "import requests; requests.get('https://api.groq.com')"
```

### No Audio Captured
- **macOS**: Install [BlackHole](https://existential.audio/blackhole/), set as output
- **Windows**: Install [VB-Audio Cable](https://vb-audio.com/Cable/), set as output
- **Linux**: Verify PulseAudio/ALSA configuration

### Transcript Not Appearing
1. Check Python service is running
2. Verify Meeting ID matches
3. Check browser console for errors
4. Check server logs: `pnpm dev`

See **[SETUP_GUIDE.md#troubleshooting](./SETUP_GUIDE.md#troubleshooting)** for more help.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT

## 🙏 Acknowledgments

- [Groq](https://www.groq.com/) - Fast AI inference
- [Socket.IO](https://socket.io/) - Real-time communication
- [Whisper](https://openai.com/research/whisper) - Speech recognition
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS

## 📞 Support

- **Groq Docs**: https://console.groq.com/docs
- **Socket.IO Docs**: https://socket.io/docs/v4/
- **MongoDB Docs**: https://docs.mongodb.com/
- **React Docs**: https://react.dev/

---

**Ready to start?** → See [QUICKSTART.md](./QUICKSTART.md)

**Want details?** → See [SETUP_GUIDE.md](./SETUP_GUIDE.md)

**Have questions?** → Check [Troubleshooting](./SETUP_GUIDE.md#troubleshooting)
