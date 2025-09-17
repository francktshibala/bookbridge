# Emma Sentence-Level Audio/Autoscroll Sync Plan (A1–B2)

Goal: Make the audio and page scroll stay in harmony using sentence timestamps from OpenAI Whisper. Skip word-level highlighting for now.

Book: Emma (gutenberg-158)
Scope: CEFR A1–B2 first

---

1) Extract real timings with Whisper
- Input: For each chunk (bookId=gutenberg-158, level ∈ {A1,B2}, chunkIndex), use existing audio + displayed text
- Action: Run OpenAI Whisper with word-level timestamps, then aggregate to sentence timings
- Output: Save per-chunk sentence timing array [{ sentenceIndex, startTime, endTime }]

2) Drive autoscroll from sentence timings
- On playback timeupdate, find active sentence by currentTime
- Gently scroll that sentence into view
- Keep existing “Stop Autoscroll” button behavior

3) Ensure chunk alignment
- Reader must display the same chunk text used to generate its audio
- If legacy offsets exist, apply temporary mapping during processing; aim to remove after validation

4) Rollout order
- A1 chunks → verify 3 chapters
- B1 chunks → verify 3 chapters
- B2 chunks → verify 3 chapters
- Expand to remaining chapters/levels after validation

5) QA checklist
- Smooth scroll at sentence boundaries (no jumps)
- Audio and text show the same sentences, in order
- Stop Autoscroll button works instantly
- Pause/resume does not desync
- Next/previous chunk transitions are <0.5s delay

6) Telemetry (optional)
- Log average scroll latency (ms)
- Log sentence boundary alignment offsets (ms)
- Track user usage of Stop Autoscroll to catch regressions

7) Future upgrades (when available)
- ElevenLabs WebSocket for character-level timings
- Re-enable word highlighting using true timings
- Cache timings/audio in IndexedDB for instant replays
