# AI Meeting Assistant - Quick Start (5 Minutes)

## TL;DR

1. Get API key from https://console.groq.com
2. Configure environment
3. Start backend
4. Start audio capture
5. Open browser and start meeting

## 1️⃣ Get Groq API Key (30 seconds)

1. Go to https://console.groq.com
2. Sign up (free)
3. Create an API key
4. Copy it

## 2️⃣ Setup Backend (1 minute)

```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your Groq API key
# GROQ_API_KEY=gsk_your_key_here

# Install dependencies (if not done)
pnpm install

# Start dev server
pnpm dev
```

Server is ready when you see:
```
✅ Server listening on port 8080
✅ MongoDB connected (or using in-memory storage)
```

Browser opens automatically to http://localhost:8080

## 3️⃣ Setup Python Audio Service (1 minute)

In a **new terminal**:

```bash
cd python

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set API key
export GROQ_API_KEY="gsk_your_key_here"  # Linux/macOS
# Windows: set GROQ_API_KEY=gsk_your_key_here
```

## 4️⃣ Start a Meeting (2 minutes)

1. Open http://localhost:8080/meeting in browser
2. Enter meeting title (optional)
3. Click **"Start Meeting"**
4. **Copy the Meeting ID** displayed

## 5️⃣ Capture Audio

In the Python terminal:

```bash
python audio_service.py --meeting-id YOUR_MEETING_ID
```

Replace `YOUR_MEETING_ID` with ID from step 4.

**Watch the transcript appear in real-time!** ✨

## 6️⃣ Use AI Features

### Generate Summary
- Click **"📝 Generate Summary"**
- Get summary + key points + action items

### Ask Questions
- Click **"💬 Ask Question"**
- Type: "What was the budget?"
- Get AI answer from transcript

### Copy Transcript
- Click **"Copy"** to copy all text
- Paste into notes app or email

## Troubleshooting

### "No transcript appearing"
```bash
# 1. Verify Python service is running
# 2. Check Meeting ID matches
# 3. Look at browser console for errors
```

### "GROQ_API_KEY not found"
```bash
# Verify it's in .env file
cat .env | grep GROQ_API_KEY

# Or set it in terminal
export GROQ_API_KEY="gsk_..."
python audio_service.py --meeting-id ID
```

### "Connection refused on localhost:8080"
```bash
# Backend not running
# Try: pnpm dev
# Check terminal for errors
```

### "sounddevice not found" (Python)
```bash
pip install sounddevice
pip install -r requirements.txt
```

## Next Steps

- **Full Setup**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **API Docs**: Check [SETUP_GUIDE.md#api-endpoints](./SETUP_GUIDE.md#api-endpoints)
- **Production**: See [SETUP_GUIDE.md#production-deployment](./SETUP_GUIDE.md#production-deployment)

## Features

✅ Real-time audio transcription
✅ Live transcript display
✅ AI summaries
✅ Q&A about meeting
✅ Search & export
✅ Mobile responsive

---

**Total setup time: ~5 minutes**

Ready to transcribe? Start with Step 4! 🎉
