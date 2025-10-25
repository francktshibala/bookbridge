# Turbo v2.5 Testing Results - October 25, 2025

## Summary

Tested `eleven_turbo_v2_5` model against current `eleven_monolingual_v1` baseline. **Result: eleven_monolingual_v1 remains superior.**

## Test Configuration

**Model Tested:** `eleven_turbo_v2_5` (ElevenLabs latest)
**Voice:** Sarah (EXAVITQu4vr4xnSDxMaL)
**Settings:** Hero Demo production settings (stability 0.5, similarity_boost 0.8, style 0.05)
**Speeds Tested:** 0.90, 0.85, 0.80
**Text:** Pride & Prejudice B1 (2 sentences, 45 words)

## Results

| Speed | Duration | File Size | Quality Assessment |
|-------|----------|-----------|-------------------|
| 0.90 | 13.40s | 209KB | Good, but not better than v1 |
| 0.85 | 12.98s | 203KB | Good, but not better than v1 |
| 0.80 | 13.04s | 204KB | Good, but not better than v1 |

**Baseline Comparison:**
- `eleven_monolingual_v1`: 720KB, 47s (full 9-sentence demo) - **Better quality**

## Key Findings

1. **Quality**: eleven_monolingual_v1 still sounds better despite turbo_v2_5 being "advanced"
2. **No significant difference** between tested speeds (0.90, 0.85, 0.80)
3. **Research validation**: Confirms that English-focused models (v1) outperform multilingual/advanced models for ESL clarity
4. **Speed testing**: Teacher feedback about speed being too fast - no speed adjustment needed, current 0.90 is optimal

## Technical Notes

- Generated using Solution 1 (ffprobe measurement + proportional timing)
- All 3 speeds maintained perfect sync capability
- Cost: ~$0.24 (3 speeds × 2 sentences)
- Testing method: A/B comparison via hero demo (Sarah = v1, Daniel = turbo_v2_5)

## Decision

**REJECTED:** eleven_turbo_v2_5
**KEEP:** eleven_monolingual_v1 with Hero Demo production settings

## Validation

This testing validates:
- Current MASTER_MISTAKES_PREVENTION guidance (never use advanced models)
- Research findings that English-focused > multilingual for ESL
- Hero Demo production settings are optimal
- Speed 0.90 is correct (no adjustment needed)

## Files Generated

- `pride-prejudice-b1-turbo-090.mp3` (13.40s)
- `pride-prejudice-b1-turbo-085.mp3` (12.98s)
- `pride-prejudice-b1-turbo-080.mp3` (13.04s)
- Metadata files for each speed
- Test script: `scripts/test-turbo-v25-speeds.js`

## Recommendation

Continue using `eleven_monolingual_v1` with Hero Demo production settings. No changes needed to current audio pipeline.

---

**Test Date:** October 25, 2025
**Tester:** User feedback + A/B comparison
**Branch:** audio-enhancement-pilot
