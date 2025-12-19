#!/usr/bin/env python3
import os
import re
import json
import subprocess
import requests
from pathlib import Path

API_KEY = "sk_8dcfcf324097bd59ff22eb0e2a1dbe0822ca19856d0012f3"
VOICE_ID = "RILOU7YmBhvwJGDGjNmP"  # Jane
SCRIPT_FILE = os.path.expanduser("~/Desktop/romantic-love-shadowing-part2-script.txt")
OUTPUT_DIR = os.path.expanduser("~/Desktop/part2-audio-temp/shadowing-part2")
FINAL_OUTPUT = os.path.expanduser("~/Desktop/romantic-love-shadowing-part2.mp3")

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

print("🎙️ Generating shadowing-part2...

with open(SCRIPT_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

segments = []
for line in content.split('\n'):
    line = line.strip()
    if line.startswith('**Total Duration:') or line.startswith('AUDIO SPECS:'):
        break
    if not line or line.startswith('#') or line.startswith('**[') or line.startswith('---') or line.startswith('AUDIO') or line.startswith('OUTPUT') or line.startswith('NOTE'):
        continue
    if line.startswith('[PAUSE'):
        match = re.search(r'\[PAUSE (\d+(?:\.\d+)?)s\]', line)
        if match:
            segments.append({"type": "pause", "duration": float(match.group(1))})
    else:
        segments.append({"type": "text", "content": line})

print(f"✅ Found {len([s for s in segments if s['type'] == 'text'])} text segments\n")

silence_files = {}
pause_durations = set(s['duration'] for s in segments if s['type'] == 'pause')
for duration in pause_durations:
    silence_file = f"{OUTPUT_DIR}/silence_{duration}s.mp3"
    if not os.path.exists(silence_file):
        subprocess.run(['ffmpeg', '-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=mono', '-t', str(duration), '-y', silence_file], capture_output=True, check=True)
    silence_files[duration] = silence_file

audio_files = []
text_index = 0
for i, segment in enumerate(segments):
    if segment['type'] == 'pause':
        audio_files.append(silence_files[segment['duration']])
    else:
        text_index += 1
        text = segment['content']
        audio_file = f"{OUTPUT_DIR}/segment_{text_index:03d}.mp3"

        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
            json={"text": text, "model_id": "eleven_multilingual_v2", "voice_settings": {"stability": 0.75, "similarity_boost": 0.85, "style": 0.0, "use_speaker_boost": True}},
            headers={"Accept": "audio/mpeg", "Content-Type": "application/json", "xi-api-key": API_KEY}
        )
        if response.status_code == 200:
            with open(audio_file, 'wb') as f:
                f.write(response.content)
            audio_files.append(audio_file)
            print(f"  ✅ {text[:60]}...")

concat_file = f"{OUTPUT_DIR}/concat_list.txt"
with open(concat_file, 'w') as f:
    for audio_file in audio_files:
        f.write(f"file '{audio_file}'\n")

temp_concat = f"{OUTPUT_DIR}/concatenated.mp3"
subprocess.run(['ffmpeg', '-f', 'concat', '-safe', '0', '-i', concat_file, '-c', 'copy', '-y', temp_concat], capture_output=True, check=True)
subprocess.run(['ffmpeg', '-i', temp_concat, '-filter:a', 'atempo=0.70', '-y', FINAL_OUTPUT], capture_output=True, check=True)

result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', FINAL_OUTPUT], capture_output=True, text=True)
duration = float(result.stdout.strip())
file_size = os.path.getsize(FINAL_OUTPUT)

print(f"\n✅ Cold Open Part 2 Complete!")
print(f"Duration: {int(duration // 60)}m {int(duration % 60)}s ({duration:.2f}s)")
print(f"Size: {file_size / (1024*1024):.2f} MB")
print(f"File: {FINAL_OUTPUT}")
