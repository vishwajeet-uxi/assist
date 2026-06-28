#!/usr/bin/env python3
"""
Audio Capture Service for AI Meeting Assistant
Captures system audio and sends to Groq API for transcription
"""

import sounddevice as sd
import numpy as np
from scipy import signal
import requests
import json
import os
from dotenv import load_dotenv
import asyncio
import websockets
import threading
import queue
import time
from datetime import datetime

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
WEBSOCKET_URL = os.getenv("WEBSOCKET_URL", "ws://localhost:8080/socket.io")
SAMPLE_RATE = 16000
CHUNK_DURATION = 4  # seconds
CHANNELS = 1

audio_queue = queue.Queue()


def audio_callback(indata, frames, time_info, status):
    """Callback for audio stream"""
    if status:
        print(f"Audio status: {status}")
    audio_queue.put(indata.copy())


def capture_audio():
    """Capture audio from system audio output"""
    print("🎤 Starting audio capture...")
    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=CHANNELS,
            blocksize=int(SAMPLE_RATE * CHUNK_DURATION),
            callback=audio_callback,
            latency="low",
        ):
            print("✅ Audio capture initialized. Waiting for audio...")
            while True:
                time.sleep(0.1)
    except Exception as e:
        print(f"❌ Audio capture error: {e}")


async def transcribe_with_groq(audio_data):
    """Send audio to Groq Whisper API for transcription"""
    try:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
        }

        # Convert numpy array to bytes
        audio_bytes = (audio_data * 32767).astype(np.int16).tobytes()

        files = {
            "file": ("audio.wav", audio_bytes, "audio/wav"),
            "model": (None, "whisper-large-v3"),
            "language": (None, "en"),
        }

        response = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers=headers,
            files=files,
        )

        if response.status_code == 200:
            result = response.json()
            return result.get("text", "")
        else:
            print(f"❌ Groq API error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Transcription error: {e}")
        return None


async def send_to_websocket(text, duration):
    """Send transcribed text to backend via WebSocket"""
    try:
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            payload = {
                "type": "transcript-chunk",
                "text": text,
                "duration": duration,
                "timestamp": datetime.now().isoformat(),
            }
            await websocket.send(json.dumps(payload))
            print(f"✅ Sent: {text[:50]}...")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")


async def process_audio():
    """Process audio chunks and send for transcription"""
    print("🔄 Starting audio processing loop...")
    chunk_buffer = []

    while True:
        try:
            audio_chunk = audio_queue.get(timeout=1)
            chunk_buffer.append(audio_chunk)

            # When we have enough audio for CHUNK_DURATION
            total_samples = sum(len(c) for c in chunk_buffer)
            if total_samples >= SAMPLE_RATE * CHUNK_DURATION:
                # Concatenate all buffers
                audio_data = np.concatenate(chunk_buffer)
                duration = len(audio_data) / SAMPLE_RATE

                print(f"📦 Processing {duration:.1f}s audio chunk...")

                # Transcribe
                text = await transcribe_with_groq(audio_data)

                if text and text.strip():
                    print(f"📝 Transcribed: {text}")
                    await send_to_websocket(text, duration)

                chunk_buffer = []

        except queue.Empty:
            continue
        except Exception as e:
            print(f"❌ Processing error: {e}")


def main():
    """Main entry point"""
    print("=" * 50)
    print("🎙️  AI Meeting Assistant - Audio Capture Service")
    print("=" * 50)
    print(f"Sample Rate: {SAMPLE_RATE} Hz")
    print(f"Chunk Duration: {CHUNK_DURATION}s")
    print(f"WebSocket URL: {WEBSOCKET_URL}")
    print("=" * 50)

    # Check for Groq API key
    if not GROQ_API_KEY:
        print("❌ Error: GROQ_API_KEY not set in environment")
        return

    # Start audio capture in a separate thread
    audio_thread = threading.Thread(target=capture_audio, daemon=True)
    audio_thread.start()

    # Start the processing loop
    try:
        asyncio.run(process_audio())
    except KeyboardInterrupt:
        print("\n🛑 Shutting down audio capture service...")


if __name__ == "__main__":
    main()
