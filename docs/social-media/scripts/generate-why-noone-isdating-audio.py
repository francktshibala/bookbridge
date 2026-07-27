#!/usr/bin/env python3
import os
import re
import subprocess
import requests
from pathlib import Path

# Configuration
API_KEY = "sk_8dcfcf324097bd59ff22eb0e2a1dbe0822ca19856d0012f3"
VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel (calm, thoughtful, documentary-style)
# Get the project root (3 levels up from this script: docs/social-media/scripts/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
SCRIPT_FILE = os.path.join(PROJECT_ROOT, "docs", "social-media", "scripts", "why-noone-isdating.md")
OUTPUT_DIR = os.path.expanduser("~/Desktop/why_no_one_is_dating_full_audio-temp")
FINAL_OUTPUT = os.path.expanduser("~/Desktop/why_no_one_is_dating_full_audio.mp3")

Path(OUTPUT_DIR).mkdir(exist_ok=True)

print("🎙️ Starting audio generation for Why No One Is Dating Anymore...")
print(f"📁 Temp directory: {OUTPUT_DIR}\n")

# Parse script
print("📝 Step 1: Parsing script...")
if not os.path.exists(SCRIPT_FILE):
    print(f"❌ Script file not found: {SCRIPT_FILE}")
    exit(1)

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove metadata lines (markdown headers, timestamps, etc.)
lines = content.split('\n')
text_lines = []
skip_section = False

for line in lines:
    line_stripped = line.strip()
    
    # Stop at video specs section
    if '## VIDEO SPECS' in line or '## SHORTS TO CUT' in line:
        skip_section = True
        break
    
    # Skip markdown headers (##), metadata markers (---), and empty lines
    if not line_stripped or line_stripped.startswith('##') or line_stripped.startswith('---'):
        continue
    
    # Skip metadata lines (Target Length, Voice, Tone, etc.)
    if line_stripped.startswith('**') and ('Target' in line_stripped or 'Voice:' in line_stripped or 'Tone:' in line_stripped):
        continue
    
    # Skip END marker
    if line_stripped == '**END**':
        break
    
    # Keep all other content
    text_lines.append(line_stripped)

script_text = ' '.join(text_lines)
print(f"✅ Script text length: {len(script_text)} characters")
print(f"✅ Word count: ~{len(script_text.split())} words\n")

# Split into chunks (max 9000 chars to stay under 10k limit)
MAX_CHUNK_SIZE = 9000
chunks = []
if len(script_text) > MAX_CHUNK_SIZE:
    print(f"📦 Splitting text into chunks (max {MAX_CHUNK_SIZE} chars each)...")
    words = script_text.split()
    current_chunk = []
    current_size = 0
    
    for word in words:
        word_with_space = word + ' '
        if current_size + len(word_with_space) > MAX_CHUNK_SIZE and current_chunk:
            chunks.append(' '.join(current_chunk))
            current_chunk = [word]
            current_size = len(word)
        else:
            current_chunk.append(word)
            current_size += len(word_with_space)
    
    if current_chunk:
        chunks.append(' '.join(current_chunk))
    
    print(f"   ✅ Split into {len(chunks)} chunks")
else:
    chunks = [script_text]

# Generate audio for each chunk
print(f"\n🎙️ Step 2: Generating audio via ElevenLabs (Daniel voice)...")
url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": API_KEY
}

audio_files = []
for i, chunk in enumerate(chunks):
    print(f"   [{i+1}/{len(chunks)}] Generating chunk {i+1} ({len(chunk)} chars)...")
    data = {
        "text": chunk,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,  # ~50% for natural emotion
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }
    
    response = requests.post(url, json=data, headers=headers)
    if response.status_code == 200:
        chunk_audio = f"{OUTPUT_DIR}/chunk_{i+1:03d}.mp3"
        with open(chunk_audio, 'wb') as f:
            f.write(response.content)
        audio_files.append(chunk_audio)
        print(f"       ✅ Saved chunk {i+1}")
    else:
        print(f"       ❌ API Error: {response.status_code}")
        print(f"       {response.text}")
        raise Exception(f"ElevenLabs API failed for chunk {i+1}")

# Concatenate all chunks
print(f"\n🔗 Step 3: Concatenating {len(audio_files)} audio chunks...")
concat_list = f"{OUTPUT_DIR}/concat_list.txt"
with open(concat_list, 'w') as f:
    for audio_file in audio_files:
        f.write(f"file '{audio_file}'\n")

temp_audio = f"{OUTPUT_DIR}/why_no_one_is_dating_concatenated.mp3"
subprocess.run([
    'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_list,
    '-c', 'copy', '-y', temp_audio
], capture_output=True, check=True)
print(f"   ✅ Concatenated all chunks")

# Get original duration
print("\n⏱️  Step 4: Checking original duration...")
result = subprocess.run([
    'ffprobe', '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    temp_audio
], capture_output=True, text=True)
original_duration = float(result.stdout.strip())
print(f"   Original duration: {original_duration:.2f}s ({int(original_duration//60)}m {int(original_duration%60)}s)")

# Apply speed adjustment to 0.85x
print("\n⏱️  Step 5: Applying 0.85x speed reduction...")
target_speed = 0.85
subprocess.run([
    'ffmpeg', '-i', temp_audio,
    '-filter:a', f'atempo={target_speed}',
    '-y', FINAL_OUTPUT
], capture_output=True, check=True)
print(f"   ✅ Applied FFmpeg atempo={target_speed}")

# Validate final audio
print("\n✅ Step 6: Validating final audio...")
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
print(f"\n✅ SUCCESS! Audio saved to: {FINAL_OUTPUT}")

