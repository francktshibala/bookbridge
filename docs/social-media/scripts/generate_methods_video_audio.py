#!/usr/bin/env python3
import os
import re
import json
import subprocess
import requests
from pathlib import Path

# Configuration
API_KEY = "sk_8dcfcf324097bd59ff22eb0e2a1dbe0822ca19856d0012f3"
VOICE_ID = "onwK4e9ZLuTAKqWW03F9"  # Daniel for educational content
SCRIPT_FILE = os.path.join(os.path.dirname(__file__), "methods-video-script.txt")
OUTPUT_DIR = os.path.expanduser("~/Desktop/methods-video-audio-temp")
FINAL_OUTPUT = os.path.expanduser("~/Desktop/methods-video-audio.mp3")
DEMO_GAP_DURATION = 75  # 60-90 seconds, using 75 as middle

# Create temp directory
Path(OUTPUT_DIR).mkdir(exist_ok=True)

print("🎙️ Starting audio generation for Methods Video...")
print(f"📁 Temp directory: {OUTPUT_DIR}\n")

# Step 1: Parse script
print("📝 Step 1: Parsing script...")
with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract text segments, pauses, and demo gap
segments = []
lines = content.split('\n')
in_demo_section = False

for line in lines:
    line = line.strip()

    # Skip empty lines
    if not line:
        continue

    # Check for demo section markers
    if '[VOICE STOPS' in line:
        in_demo_section = True
        # Extract demo duration if specified
        match = re.search(r'DEMO PLAYS FOR (\d+)-(\d+) SECONDS', line)
        if match:
            # Use average of range
            min_dur = int(match.group(1))
            max_dur = int(match.group(2))
            demo_duration = (min_dur + max_dur) / 2
        else:
            demo_duration = DEMO_GAP_DURATION
        segments.append({"type": "demo_gap", "duration": demo_duration})
        continue
    
    if '[VOICE RESUMES]' in line:
        in_demo_section = False
        continue
    
    # Skip lines that are demo instructions (screen recording notes)
    if in_demo_section or line.startswith('[Screen recording:') or line.startswith('[') and 'DEMO' in line:
        continue

    # Check if it's a pause marker
    if line.startswith('[PAUSE'):
        match = re.search(r'\[PAUSE (\d+(?:\.\d+)?)s\]', line)
        if match:
            duration = float(match.group(1))
            segments.append({"type": "pause", "duration": duration})
    else:
        # It's text to speak
        segments.append({"type": "text", "content": line})

print(f"✅ Found {len([s for s in segments if s['type'] == 'text'])} text segments")
print(f"✅ Found {len([s for s in segments if s['type'] == 'pause'])} pause markers")
print(f"✅ Found {len([s for s in segments if s['type'] == 'demo_gap'])} demo gap(s)\n")

# Step 2: Generate silence files
print("🔇 Step 2: Generating silence files...")
silence_files = {}
pause_durations = set(s['duration'] for s in segments if s['type'] == 'pause')
demo_durations = set(s['duration'] for s in segments if s['type'] == 'demo_gap')

all_durations = pause_durations.union(demo_durations)

for duration in all_durations:
    silence_file = f"{OUTPUT_DIR}/silence_{duration}s.mp3"
    if not os.path.exists(silence_file):
        subprocess.run([
            'ffmpeg', '-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=mono',
            '-t', str(duration), '-y', silence_file
        ], capture_output=True, check=True)
        print(f"  ✅ Created {duration}s silence file")
    silence_files[duration] = silence_file

print()

# Step 3: Generate audio for text segments
print("🎙️ Step 3: Generating audio via ElevenLabs (Daniel voice)...")
audio_files = []
text_index = 0

for i, segment in enumerate(segments):
    if segment['type'] == 'pause':
        audio_files.append(silence_files[segment['duration']])
        print(f"  [{i+1}/{len(segments)}] Pause: {segment['duration']}s")
    elif segment['type'] == 'demo_gap':
        audio_files.append(silence_files[segment['duration']])
        print(f"  [{i+1}/{len(segments)}] Demo gap: {segment['duration']}s (for screen recording)")
    else:
        text_index += 1
        text = segment['content']
        audio_file = f"{OUTPUT_DIR}/segment_{text_index:03d}.mp3"

        # Generate audio via ElevenLabs API
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": API_KEY
        }
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.75,
                "similarity_boost": 0.85,
                "style": 0.0,
                "use_speaker_boost": True
            }
        }

        print(f"  [{i+1}/{len(segments)}] Generating: {text[:50]}...")

        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            with open(audio_file, 'wb') as f:
                f.write(response.content)
            audio_files.append(audio_file)
            print(f"       ✅ Saved to segment_{text_index:03d}.mp3")
        else:
            print(f"       ❌ API Error: {response.status_code}")
            print(f"       {response.text}")
            raise Exception(f"ElevenLabs API failed for segment {text_index}")

print()

# Step 4: Create concat list
print("📋 Step 4: Creating concatenation list...")
concat_file = f"{OUTPUT_DIR}/concat_list.txt"
with open(concat_file, 'w') as f:
    for audio_file in audio_files:
        f.write(f"file '{audio_file}'\n")
print(f"✅ Created concat list with {len(audio_files)} files\n")

# Step 5: Concatenate all segments
print("🔗 Step 5: Concatenating audio segments...")
temp_concat = f"{OUTPUT_DIR}/concatenated.mp3"
subprocess.run([
    'ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file,
    '-c', 'copy', '-y', temp_concat
], capture_output=True, check=True)
print("✅ All segments concatenated\n")

# Step 6: Apply 0.70x speed reduction
print("⏱️  Step 6: Applying 0.70x speed reduction...")
subprocess.run([
    'ffmpeg', '-i', temp_concat,
    '-filter:a', 'atempo=0.70',
    '-y', FINAL_OUTPUT
], capture_output=True, check=True)
print("✅ Speed reduction applied\n")

# Step 7: Validate final audio
print("✅ Step 7: Validating final audio...")
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

# Verify format
format_result = subprocess.run([
    'ffprobe', '-v', 'error',
    '-select_streams', 'a:0',
    '-show_entries', 'stream=codec_name,sample_rate,channels',
    '-of', 'json',
    FINAL_OUTPUT
], capture_output=True, text=True)

format_info = json.loads(format_result.stdout)
stream = format_info['streams'][0]
print(f"🎵 Format: {stream['codec_name']}, {stream['sample_rate']}Hz, {stream['channels']} channel(s)")

print(f"\n✅ SUCCESS! Audio saved to: {FINAL_OUTPUT}")
print(f"\n📝 Next steps:")
print(f"   1. Record screen demo showing 'Teaching Dad to Read' (A1 → A2)")
print(f"   2. Insert screen recording into the {DEMO_GAP_DURATION}s gap in final video")
print(f"   3. Add text overlays during demo section")
print(f"\n🗑️  Temp files kept at: {OUTPUT_DIR}")
print("    (You can delete this folder when done)")

