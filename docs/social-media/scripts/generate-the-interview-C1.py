#!/usr/bin/env python3
import os
import re
import subprocess
import requests
from pathlib import Path

# Configuration
API_KEY = "sk_8dcfcf324097bd59ff22eb0e2a1dbe0822ca19856d0012f3"
VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel
SCRIPT_FILE = os.path.expanduser("~/Desktop/the-interview-C1-script.txt")
OUTPUT_DIR = os.path.expanduser("~/Desktop/the-interview-C1-temp")
FINAL_OUTPUT = os.path.expanduser("~/Desktop/the-interview-C1.mp3")

Path(OUTPUT_DIR).mkdir(exist_ok=True)

print("🎙️ Starting audio generation for The Interview - C1 Level...")
print(f"📁 Temp directory: {OUTPUT_DIR}\n")

# Parse script
print("📝 Step 1: Parsing script...")
if not os.path.exists(SCRIPT_FILE):
    print(f"❌ Script file not found: {SCRIPT_FILE}")
    exit(1)

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove metadata lines
lines = content.split('\n')
text_lines = []
for line in lines:
    line = line.strip()
    if not line or line.startswith('**') or line.startswith('#') or line.startswith('---'):
        continue
    text_lines.append(line)

script_text = ' '.join(text_lines)
print(f"✅ Script text length: {len(script_text)} characters\n")

# Generate audio
print("🎙️ Step 2: Generating audio via ElevenLabs (Daniel voice, 0.85x speed)...")
url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": API_KEY
}
data = {
    "text": script_text,
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
        "stability": 0.45,
        "similarity_boost": 0.8,
        "style": 0.1,
        "use_speaker_boost": True
    },
    "speed": 0.85
}

response = requests.post(url, json=data, headers=headers)
if response.status_code == 200:
    temp_audio = f"{OUTPUT_DIR}/C1_original.mp3"
    with open(temp_audio, 'wb') as f:
        f.write(response.content)
    print(f"   ✅ Generated audio: {os.path.getsize(temp_audio) / (1024*1024):.2f} MB")
else:
    print(f"   ❌ API Error: {response.status_code}")
    print(f"   {response.text}")
    raise Exception("ElevenLabs API failed")

# Get original duration
print("\n⏱️  Step 3: Checking original duration...")
result = subprocess.run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    temp_audio
], capture_output=True, text=True)
original_duration = float(result.stdout.strip())
print(f"   Original duration: {original_duration:.2f}s ({int(original_duration//60)}m {int(original_duration%60)}s)")

# Apply 0.70x speed reduction
print("\n⏱️  Step 4: Applying 0.70x speed reduction...")
target_speed = 0.70 / 0.85
subprocess.run([
    'ffmpeg', '-i', temp_audio,
    '-filter:a', f'atempo={target_speed}',
    '-y', FINAL_OUTPUT
], capture_output=True, check=True)
print(f"   ✅ Applied FFmpeg atempo={target_speed:.3f}")

# Validate final audio
print("\n✅ Step 5: Validating final audio...")
result = subprocess.run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    FINAL_OUTPUT
], capture_output=True, text=True)

duration = float(result.stdout.strip())
minutes = int(duration // 60)
seconds = int(duration % 60)

print(f"📊 Final audio duration: {minutes}m {seconds}s ({duration:.2f}s)")
file_size = os.path.getsize(FINAL_OUTPUT)
print(f"📦 File size: {file_size / (1024*1024):.2f} MB")
print(f"\n✅ SUCCESS! C1 audio saved to: {FINAL_OUTPUT}")

