#!/usr/bin/env python3
"""
AI Meeting Assistant - Audio Capture Service

Captures system audio, sends to Groq Whisper API for transcription,
and streams results back to the Node.js backend via WebSocket.

Setup:
1. macOS: Install BlackHole (https://existential.audio/blackhole/)
2. Windows: Install VB-Audio Cable (https://vb-audio.com/Cable/)
3. Linux: Use PulseAudio or ALSA
4. pip install -r requirements.txt
5. Set GROQ_API_KEY environment variable
6. python audio_service.py --server http://localhost:8080 --meeting-id YOUR_MEETING_ID
"""

import os
import sys
import argparse
import asyncio
import logging
from datetime import datetime
from typing import Optional

import sounddevice as sd
import numpy as np
import requests
import websockets
import json

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
SAMPLE_RATE = 16000  # Groq Whisper expects 16kHz
CHUNK_DURATION = 4  # seconds
CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION


def transcribe_audio(audio_bytes: bytes) -> Optional[str]:
    """Send audio to Groq Whisper API and get transcription."""
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY not set")
        return None

    try:
        files = {
            "file": ("audio.wav", audio_bytes, "audio/wav"),
        }
        data = {
            "model": "whisper-large-v3",
            "language": "en",
        }
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
        }

        response = requests.post(
            f"{GROQ_BASE_URL}/audio/transcriptions",
            files=files,
            data=data,
            headers=headers,
            timeout=30,
        )

        if response.status_code == 200:
            result = response.json()
            return result.get("text", "").strip()
        else:
            logger.error(f"Groq API error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}")
        return None


def create_wav_header(num_samples: int) -> bytes:
    """Create a minimal WAV header for audio data."""
    num_channels = 1
    sample_rate = SAMPLE_RATE
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * bits_per_sample // 8
    block_align = num_channels * bits_per_sample // 8
    data_size = num_samples * num_channels * bits_per_sample // 8

    header = b"RIFF"
    header += (36 + data_size).to_bytes(4, byteorder="little")
    header += b"WAVE"
    header += b"fmt "
    header += (16).to_bytes(4, byteorder="little")
    header += (1).to_bytes(2, byteorder="little")  # Audio format (1 = PCM)
    header += num_channels.to_bytes(2, byteorder="little")
    header += sample_rate.to_bytes(4, byteorder="little")
    header += byte_rate.to_bytes(4, byteorder="little")
    header += block_align.to_bytes(2, byteorder="little")
    header += bits_per_sample.to_bytes(2, byteorder="little")
    header += b"data"
    header += data_size.to_bytes(4, byteorder="little")

    return header


def capture_audio_chunk() -> np.ndarray:
    """Capture audio chunk from system input device."""
    try:
        logger.info(f"Capturing {CHUNK_DURATION} seconds of audio...")
        audio = sd.rec(
            int(CHUNK_SIZE),
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype=np.int16,
            blocking=True,
        )
        return audio.flatten()
    except Exception as e:
        logger.error(f"Failed to capture audio: {e}")
        return np.array([])


def audio_to_wav(audio_data: np.ndarray) -> bytes:
    """Convert numpy audio array to WAV bytes."""
    if len(audio_data) == 0:
        return b""

    wav_header = create_wav_header(len(audio_data))
    audio_bytes = audio_data.astype(np.int16).tobytes()
    return wav_header + audio_bytes


async def send_to_backend(
    ws_uri: str, meeting_id: str, text: str, duration: float
):
    """Send transcribed text to backend via WebSocket."""
    try:
        async with websockets.connect(ws_uri) as websocket:
            payload = {
                "type": "transcript-chunk",
                "meetingId": meeting_id,
                "text": text,
                "duration": duration,
            }
            await websocket.send(json.dumps(payload))
            logger.info(f"Sent to backend: {text[:50]}...")
    except Exception as e:
        logger.error(f"Failed to send to backend: {e}")


def post_to_rest_api(server_url: str, meeting_id: str, text: str, duration: float):
    """Send transcribed text to backend via REST API (fallback)."""
    try:
        response = requests.post(
            f"{server_url}/api/meetings/{meeting_id}/transcript-chunk",
            json={"text": text, "duration": duration},
            timeout=10,
        )
        if response.status_code == 200:
            logger.info(f"Sent to backend: {text[:50]}...")
        else:
            logger.error(f"Backend error: {response.status_code}")
    except Exception as e:
        logger.error(f"Failed to send to backend: {e}")


async def main(
    server_url: str,
    meeting_id: str,
    use_websocket: bool = False,
    duration_seconds: Optional[int] = None,
):
    """Main event loop: capture audio and send transcriptions."""
    logger.info(f"Starting audio capture service")
    logger.info(f"Server: {server_url}")
    logger.info(f"Meeting ID: {meeting_id}")
    logger.info(f"Using {'WebSocket' if use_websocket else 'REST API'} for streaming")

    if not GROQ_API_KEY:
        logger.warning("GROQ_API_KEY not set - using mock transcriptions")

    start_time = datetime.now()
    chunk_count = 0

    try:
        while True:
            # Check duration limit
            if duration_seconds and (datetime.now() - start_time).total_seconds() > duration_seconds:
                logger.info("Duration limit reached. Stopping capture.")
                break

            # Capture audio
            audio_data = capture_audio_chunk()
            if len(audio_data) == 0:
                continue

            # Transcribe
            wav_data = audio_to_wav(audio_data)
            text = transcribe_audio(wav_data)

            if not text:
                # Mock response for testing
                chunk_count += 1
                text = f"[Mock transcription {chunk_count}] This is a test transcript chunk."
                logger.info(f"Using mock transcription: {text}")

            # Send to backend
            duration = CHUNK_DURATION
            if use_websocket:
                ws_uri = server_url.replace("http://", "ws://").replace("https://", "wss://")
                await send_to_backend(ws_uri, meeting_id, text, duration)
            else:
                post_to_rest_api(server_url, meeting_id, text, duration)

            chunk_count += 1

    except KeyboardInterrupt:
        logger.info("Received interrupt signal. Stopping.")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="AI Meeting Assistant - Audio Capture Service"
    )
    parser.add_argument(
        "--server",
        default="http://localhost:8080",
        help="Backend server URL (default: http://localhost:8080)",
    )
    parser.add_argument(
        "--meeting-id",
        required=True,
        help="Meeting ID to associate with this audio capture",
    )
    parser.add_argument(
        "--websocket",
        action="store_true",
        help="Use WebSocket instead of REST API for streaming",
    )
    parser.add_argument(
        "--duration",
        type=int,
        help="Duration in seconds to capture audio (default: infinite)",
    )

    args = parser.parse_args()

    asyncio.run(
        main(
            server_url=args.server,
            meeting_id=args.meeting_id,
            use_websocket=args.websocket,
            duration_seconds=args.duration,
        )
    )
