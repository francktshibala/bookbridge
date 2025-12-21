#!/usr/bin/env python3
import os
import re
import json
import subprocess
import requests
from pathlib import Path

# Configuration
API_KEY = "sk_8dcfcf324097bd59ff22eb0e2a1dbe0822ca19856d0012f3"  # Update with your API key if needed

VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel (for consistency)
SCRIPT_FILE = os.path.expanduser("~/Desktop/he-arrived-20-dream-part1-main-story-script.txt")
OUTPUT_DIR = os.path.expanduser("~/Desktop/he-arrived-20-dream-part1-main-story-temp")
FINAL_OUTPUT = os.path.expanduser("~/Desktop/he-arrived-20-dream-part1-main-story.mp3")

# Create temp directory
Path(OUTPUT_DIR).mkdir(exist_ok=True)

print("🎙️ Starting audio generation for Part 1 Main Story...")
print(f"📁 Temp directory: {OUTPUT_DIR}\n")

# Step 1: Parse script
print("📝 Step 1: Parsing script...")
if not os.path.exists(SCRIPT_FILE):
    print(f"❌ Script file not found: {SCRIPT_FILE}")
    print(f"   Please create the script file first.")
    exit(1)

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract text segments (main story doesn't have pauses in script, but we'll generate whole text)
# Remove metadata lines
lines = content.split('\n')
text_lines = []
for line in lines:
    line = line.strip()
    if not line or line.startswith('**') or line.startswith('#') or line.startswith('---'):
        continue
    if line.startswith('PART') or line.startswith('CLIFFHANGER'):
        continue
    text_lines.append(line)

script_text = ' '.join(text_lines)

print(f"✅ Script text length: {len(script_text)} characters\n")

# Step 2: Generate audio via ElevenLabs API
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
    "speed": 0.85  # Generate at 0.85x, will slow to 0.70x with FFmpeg
}

print(f"   Generating audio for main story...")

response = requests.post(url, json=data, headers=headers)
if response.status_code == 200:
    temp_audio = f"{OUTPUT_DIR}/main_story_original.mp3"
    with open(temp_audio, 'wb') as f:
        f.write(response.content)
    print(f"   ✅ Generated audio: {os.path.getsize(temp_audio) / (1024*1024):.2f} MB")
else:
    print(f"   ❌ API Error: {response.status_code}")
    print(f"   {response.text}")
    raise Exception("ElevenLabs API failed")

# Step 3: Get original duration
print("\n⏱️  Step 3: Checking original duration...")
result = subprocess.run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    temp_audio
], capture_output=True, text=True)
original_duration = float(result.stdout.strip())
print(f"   Original duration: {original_duration:.2f}s ({int(original_duration//60)}m {int(original_duration%60)}s)")

# Step 4: Apply 0.70x speed reduction (0.70/0.85 = 0.8235)
print("\n⏱️  Step 4: Applying 0.70x speed reduction...")
target_speed = 0.70 / 0.85  # Additional slowdown needed
subprocess.run([
    'ffmpeg', '-i', temp_audio,
    '-filter:a', f'atempo={target_speed}',
    '-y', FINAL_OUTPUT
], capture_output=True, check=True)
print(f"   ✅ Applied FFmpeg atempo={target_speed:.3f}")

# Step 5: Validate final audio
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

# Check file size
file_size = os.path.getsize(FINAL_OUTPUT)
print(f"📦 File size: {file_size / (1024*1024):.2f} MB")

print(f"\n✅ SUCCESS! Main story audio saved to: {FINAL_OUTPUT}")
print(f"\n🗑️  Temp files kept at: {OUTPUT_DIR}")
print("    (You can delete this folder when done)")

