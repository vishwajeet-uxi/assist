# Python Audio Service - Detailed Guide

The Python audio service is the bridge between your system audio and the AI Meeting Assistant backend. It handles audio capture, transcription, and streaming.

## Overview

```
System Audio Input
       ↓
[sounddevice] Capture 4-second chunks
       ↓
[numpy] Convert to PCM format
       ↓
[Groq API] Transcribe (Whisper)
       ↓
[requests/websockets] Stream to backend
       ↓
[Backend] Broadcast to connected clients
       ↓
[Frontend] Display in real-time
```

## Installation

### 1. Python 3.8+

```bash
python3 --version  # Should be 3.8 or higher
```

### 2. Virtual Environment (Recommended)

```bash
cd python
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. Dependencies

```bash
pip install -r requirements.txt
```

Or install individually:
```bash
pip install sounddevice==0.4.6  # Audio capture
pip install numpy==1.24.0       # Array processing
pip install scipy==1.10.0       # Signal processing
pip install requests==2.31.0    # HTTP requests
pip install websockets==12.0    # WebSocket client
```

## Configuration

### Set API Key

```bash
# Linux / macOS
export GROQ_API_KEY="gsk_your_api_key_here"

# Windows (Command Prompt)
set GROQ_API_KEY=gsk_your_api_key_here

# Windows (PowerShell)
$env:GROQ_API_KEY="gsk_your_api_key_here"
```

Or add to `.env` file (create in project root):
```
GROQ_API_KEY=gsk_your_api_key_here
```

Then load it:
```python
from dotenv import load_dotenv
load_dotenv()
```

### Audio Device Configuration

#### macOS (BlackHole)

1. Download: https://existential.audio/blackhole/
2. Install and restart
3. Set as output in System Preferences → Sound
4. Verify device:
```python
import sounddevice
print(sounddevice.query_devices())
```

#### Windows (VB-Audio Cable)

1. Download: https://vb-audio.com/Cable/
2. Install and restart
3. Set VB-Audio Cable as output device
4. Verify:
```python
import sounddevice
print(sounddevice.query_devices())
```

#### Linux (PulseAudio)

Use default input or select specific device:
```bash
pactl list sources | grep -E "^[[:space:]]*Name:"
```

## Usage

### Basic Usage

```bash
python audio_service.py --meeting-id YOUR_MEETING_ID
```

### Advanced Options

```bash
# Custom server
python audio_service.py \
  --server https://api.yourdomain.com \
  --meeting-id YOUR_MEETING_ID

# Use WebSocket (faster)
python audio_service.py \
  --meeting-id YOUR_MEETING_ID \
  --websocket

# Limit duration (30 minutes = 1800 seconds)
python audio_service.py \
  --meeting-id YOUR_MEETING_ID \
  --duration 1800

# Combine options
python audio_service.py \
  --server http://localhost:8080 \
  --meeting-id meeting-123 \
  --websocket \
  --duration 3600
```

### Command-Line Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--server` | `http://localhost:8080` | Backend server URL |
| `--meeting-id` | (required) | Meeting ID from frontend |
| `--websocket` | False | Use WebSocket instead of REST API |
| `--duration` | None | Duration in seconds (infinite if not set) |

## How It Works

### 1. Audio Capture

```python
import sounddevice as sd
import numpy as np

SAMPLE_RATE = 16000  # Groq Whisper requires 16kHz
CHUNK_DURATION = 4   # seconds
CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION

# Capture 4 seconds of audio
audio = sd.rec(CHUNK_SIZE, samplerate=SAMPLE_RATE, channels=1, dtype=np.int16)
sd.wait()  # Wait for recording to finish
```

### 2. Convert to WAV Format

```python
def audio_to_wav(audio_data: np.ndarray) -> bytes:
    """Convert numpy array to WAV format"""
    # Create WAV header
    wav_header = create_wav_header(len(audio_data))
    # Convert audio to bytes
    audio_bytes = audio_data.astype(np.int16).tobytes()
    return wav_header + audio_bytes
```

### 3. Send to Groq API

```python
def transcribe_audio(audio_bytes: bytes) -> str:
    """Send to Groq Whisper for transcription"""
    response = requests.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        files={"file": ("audio.wav", audio_bytes, "audio/wav")},
        data={"model": "whisper-large-v3"},
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"}
    )
    return response.json()["text"]
```

### 4. Stream to Backend

#### REST API (Default)
```python
def post_to_rest_api(server_url: str, meeting_id: str, text: str):
    response = requests.post(
        f"{server_url}/api/meetings/{meeting_id}/transcript-chunk",
        json={"text": text, "duration": 4.0}
    )
```

#### WebSocket (Faster)
```python
async def send_to_backend(ws_uri: str, meeting_id: str, text: str):
    async with websockets.connect(ws_uri) as ws:
        await ws.send(json.dumps({
            "type": "transcript-chunk",
            "meetingId": meeting_id,
            "text": text
        }))
```

## Troubleshooting

### "No module named 'sounddevice'"

```bash
pip install sounddevice
# Or if using M1 Mac:
conda install -c conda-forge sounddevice
```

### "Failed to transcribe audio" / API Errors

```bash
# Check API key
echo $GROQ_API_KEY

# Test Groq API directly
curl -X POST https://api.groq.com/openai/v1/audio/transcriptions \
  -H "Authorization: Bearer $GROQ_API_KEY" \
  -F "file=@audio.wav" \
  -F "model=whisper-large-v3"

# Check rate limits (free tier: 30 requests/min)
```

### "ConnectionRefusedError: [Errno 111] Connection refused"

```bash
# Backend not running
# Make sure: pnpm dev is running on localhost:8080

# Or using custom server:
# Make sure server URL is correct
python audio_service.py --server http://correct-url:8080 --meeting-id ID
```

### Audio Not Being Captured

**macOS:**
```bash
# List audio devices
python -c "import sounddevice; print(sounddevice.query_devices())"

# Make sure BlackHole is output device (not input!)
# Input should be your mic or system audio
```

**Windows:**
```bash
# List devices and verify VB-Audio Cable
python -c "import sounddevice; print(sounddevice.query_devices())"

# Try specifying device explicitly:
audio = sd.rec(size, samplerate=16000, channels=1, device=2)  # device number
```

**Linux:**
```bash
# List sources
pactl list sources

# Set default input
pactl set-default-source <source-name>

# Verify PulseAudio/ALSA
aplay -l  # ALSA devices
pacmd list-sources  # PulseAudio
```

### "Audio file is not valid WAV"

Groq expects:
- Format: PCM, signed 16-bit
- Channels: Mono (1 channel)
- Sample rate: 16,000 Hz
- Duration: < 25 MB

Our service handles this automatically, but if you get this error:
```bash
# Verify audio capture settings in audio_service.py
SAMPLE_RATE = 16000  # Must be 16000
channels=1           # Must be 1 (mono)
dtype=np.int16       # Must be int16
```

### WebSocket Connection Failed

```bash
# REST API is default, use it instead:
python audio_service.py --meeting-id ID

# If you need WebSocket, check:
# 1. Server supports WebSocket
# 2. URL is correct (ws:// or wss://)
# 3. No firewall blocking
```

## Performance Optimization

### Reduce Latency

1. **Use WebSocket** (faster than REST):
   ```bash
   python audio_service.py --meeting-id ID --websocket
   ```

2. **Reduce chunk size** (edit audio_service.py):
   ```python
   CHUNK_DURATION = 2  # Instead of 4 seconds
   ```

3. **Close to backend** (geography matters):
   - Run backend and Python service on same network

### Reduce CPU Usage

1. **Increase chunk duration**:
   ```python
   CHUNK_DURATION = 6  # Fewer chunks = fewer API calls
   ```

2. **Disable logging**:
   ```python
   logging.getLogger().setLevel(logging.WARNING)
   ```

## Advanced Usage

### Custom Audio Device

```python
import sounddevice as sd

# List available devices
print(sd.query_devices())

# Use specific device (e.g., device 5)
audio = sd.rec(CHUNK_SIZE, samplerate=16000, device=5)
```

### Batch Processing (Audio File)

```python
import librosa

# Load audio file instead of capturing
audio, sr = librosa.load('meeting_recording.wav', sr=16000)

# Process in chunks
for i in range(0, len(audio), CHUNK_SIZE):
    chunk = audio[i:i+CHUNK_SIZE]
    wav_data = audio_to_wav(chunk)
    text = transcribe_audio(wav_data)
    # Send to backend...
```

### Custom Transcription Model

Groq supports multiple models:
- `whisper-large-v3` (default, recommended)
- `whisper-large-v3-turbo` (faster, less accurate)

Edit `audio_service.py`:
```python
def transcribe_audio(audio_bytes: bytes) -> Optional[str]:
    data = {
        "model": "whisper-large-v3-turbo",  # Change here
        "language": "en",
    }
```

## Integration with Backend

### REST API Integration

Backend receives:
```json
POST /api/meetings/{meetingId}/transcript-chunk
{
  "text": "transcribed text",
  "duration": 4.2
}
```

### WebSocket Integration

Backend receives:
```json
{
  "type": "transcript-chunk",
  "meetingId": "meeting-123",
  "text": "transcribed text",
  "duration": 4.2
}
```

## Security

- **API Key**: Never hardcode, use environment variables
- **HTTPS**: Use `--server https://...` in production
- **Authentication**: Backend can add JWT validation
- **Rate Limiting**: Groq free tier: 30 requests/min

## Monitoring

### Enable Debug Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Monitor API Usage

Check at https://console.groq.com/keys

## Examples

### Local Development
```bash
python audio_service.py --meeting-id dev-123
```

### 30-Minute Meeting
```bash
python audio_service.py --meeting-id meeting-456 --duration 1800
```

### Production Deployment
```bash
python audio_service.py \
  --server https://api.yourdomain.com \
  --meeting-id prod-789 \
  --websocket
```

### Background Process (Linux/macOS)
```bash
nohup python audio_service.py --meeting-id ID > audio.log 2>&1 &
```

---

**Questions?** See the main [SETUP_GUIDE.md](./SETUP_GUIDE.md) or [README.md](./README.md)
