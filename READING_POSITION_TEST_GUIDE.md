# Reading Position System - Testing Guide

## Quick Test (2 minutes)

### 1. **Basic Position Saving & Restoration**

1. Start the dev server (already running at http://localhost:3000)
2. Navigate to any book in your library
3. Read a few pages (click next/prev or use arrow keys)
4. **Refresh the page** (Cmd+R / Ctrl+R)
5. ✅ **Expected**: You should see a toast notification saying "Resuming Your Reading" with chapter and page info
6. ✅ **Expected**: The page should restore to where you left off

### 2. **localStorage Verification**

1. While on a book reading page, open **Browser DevTools** (F12 or Cmd+Option+I)
2. Go to **Application** tab → **Local Storage** → `http://localhost:3000`
3. Look for a key like: `reading_position_<bookId>`
4. ✅ **Expected**: You should see stored data with your reading position

**Example localStorage entry:**
```json
{
  "currentSentenceIndex": 5,
  "currentBundleIndex": 2,
  "currentChapter": 1,
  "playbackTime": 0,
  "totalTime": 0,
  "cefrLevel": "B2",
  "playbackSpeed": 1,
  "contentMode": "original",
  "completionPercentage": 20,
  "sentencesRead": 5,
  "sessionDuration": 45
}
```

### 3. **Database Verification** (if authenticated)

1. Open **Browser DevTools** → **Console** tab
2. Navigate through a few pages of a book
3. Look for console logs like:
   - `📖 Loaded reading position from database`
   - `💾 Saved reading position to database`
4. ✅ **Expected**: Position saves every 5 seconds while reading

---

## Detailed Test Suite (10 minutes)

### Test 1: Auto-Save Every 5 Seconds ⏱️

**Steps:**
1. Open a book
2. Navigate to page 3
3. **Wait 5 seconds** without touching anything
4. Check **Console** for: `💾 Saved reading position to database`

✅ **Pass**: Log appears every 5 seconds
❌ **Fail**: No auto-save logs

---

### Test 2: Save on Page Unload 🚪

**Steps:**
1. Open a book and navigate to page 5
2. **Close the tab** or navigate away
3. Reopen the same book
4. Check if it restores to page 5

✅ **Pass**: Restores to page 5 with toast
❌ **Fail**: Starts from page 1

---

### Test 3: Save on Tab Switch 🔄

**Steps:**
1. Open a book and navigate to page 4
2. **Switch to another tab** (don't close)
3. Check **Console** for: `💾 Saved reading position to database` (with force flag)
4. Switch back and navigate away
5. Reopen - should restore to page 4

✅ **Pass**: Position saved when tab hidden
❌ **Fail**: Position not saved

---

### Test 4: Cross-Device Sync 📱↔️💻

**Prerequisites:** Must be logged in with same account

**Steps:**
1. **Device 1**: Open a book, read to page 7, wait 5 seconds
2. **Device 2**: Open the same book
3. Check if it resumes from page 7

✅ **Pass**: Position synced across devices
❌ **Fail**: Starts from beginning

---

### Test 5: Resume Toast UI ✨

**Steps:**
1. Open a book, navigate to page 6
2. Refresh the page
3. Observe the toast notification

✅ **Pass Criteria:**
- Toast appears at the top center
- Shows "Resuming Your Reading"
- Displays correct chapter and page numbers
- Has "Start from Beginning" button
- Has "Continue Reading" button
- Auto-dismisses after 5 seconds

---

### Test 6: Start from Beginning 🔄

**Steps:**
1. Open a book that has saved position (e.g., page 8)
2. Wait for resume toast to appear
3. Click **"Start from Beginning"** button
4. Check if it goes to page 1
5. Refresh page - should still be at page 1 (position reset)

✅ **Pass**: Resets to page 1 and saves
❌ **Fail**: Returns to old position

---

### Test 7: Edge Case - Invalid Position 🛡️

**Steps:**
1. Open **DevTools** → **Application** → **Local Storage**
2. Find `reading_position_<bookId>` key
3. Edit it to set `currentBundleIndex: 999999` (invalid high number)
4. Refresh the page

✅ **Pass**: App handles gracefully, clamps to valid page
❌ **Fail**: Error or crash

---

### Test 8: Works Across Multiple Books 📚

**Steps:**
1. Open **Book A**, read to page 5, close
2. Open **Book B**, read to page 3, close
3. Reopen **Book A** - should be at page 5
4. Reopen **Book B** - should be at page 3

✅ **Pass**: Each book remembers its own position
❌ **Fail**: Positions mixed up

---

### Test 9: CEFR Level & Mode Persistence 🎚️

**Steps:**
1. Open a book, change to **Simplified** mode
2. Change CEFR level to **A1**
3. Navigate to page 4
4. Refresh the page

✅ **Pass**: Restores with Simplified mode + A1 level
❌ **Fail**: Reverts to Original or different level

---

### Test 10: Unauthenticated Users (localStorage fallback) 👤

**Steps:**
1. **Log out** from your account
2. Open a book, navigate to page 5
3. Refresh the page
4. Check **Console** for: "User not authenticated, using local storage fallback"

✅ **Pass**: Position still saves/restores via localStorage
❌ **Fail**: Position lost

---

## Advanced Testing

### Network Failure Handling 🌐❌

**Steps:**
1. Open **DevTools** → **Network** tab
2. Set throttling to **Offline**
3. Navigate through book pages
4. Go back **Online**
5. Check if positions sync to database

✅ **Pass**: Saves to localStorage offline, syncs when online
❌ **Fail**: Position lost or errors

---

### Browser Compatibility 🌍

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Safari
- ✅ Firefox

---

## Console Logs to Watch For

### ✅ Success Logs:
```
📖 Position loaded from storage: { currentSentenceIndex: 5, ... }
📖 Applied saved reading position: { chunk: 5, chapter: 1, ... }
💾 Saved reading position to database: { bookId: '...', sentence: 5, ... }
📍 Position updated: { sentence: 5, chapter: 1, completion: 20.5% }
```

### ❌ Error Logs to Investigate:
```
Error loading reading position: ...
Error saving reading position: ...
Failed to fetch reading position (500)
```

---

## Quick Debug Commands

### Check localStorage from Console:
```javascript
// View stored position
const bookId = 'YOUR_BOOK_ID';
const stored = localStorage.getItem(`reading_position_${bookId}`);
console.log(JSON.parse(stored));

// Clear position (for testing)
localStorage.removeItem(`reading_position_${bookId}`);
```

### Check Network Requests:
```
DevTools → Network tab → Filter: "reading-position"
```
Look for:
- `GET /api/reading-position/[bookId]` - Load position
- `POST /api/reading-position/[bookId]` - Save position

---

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Navigate pages | Position saves every 5s |
| Refresh page | Restores to last page with toast |
| Close tab | Saves before unload |
| Switch tabs | Saves when tab hidden |
| Close browser | Position persists for days |
| Different book | Each book has own position |
| No internet | Falls back to localStorage |
| Not logged in | Still works (localStorage only) |

---

## Troubleshooting

### Position not saving?
1. Check console for errors
2. Verify `reading_positions` table exists in database
3. Check if user is authenticated (for DB sync)
4. Verify localStorage quota not exceeded

### Position not restoring?
1. Check DevTools → Application → Local Storage for key
2. Verify key format: `reading_position_<bookId>` (underscore)
3. Check console for load errors
4. Try clearing localStorage and testing fresh

### Toast not showing?
1. Check if position > 0 (won't show on first page)
2. Verify `ResumeToast` component rendering
3. Check `showResumeToast` state in React DevTools

---

## Test Checklist

Quick checklist to verify everything works:

- [ ] Position saves automatically every 5 seconds
- [ ] Position restores after page refresh
- [ ] Resume toast appears with correct info
- [ ] "Start from Beginning" button works
- [ ] Position saves on tab close
- [ ] Position saves on tab switch
- [ ] Works across multiple books
- [ ] CEFR level persists
- [ ] Content mode (original/simplified) persists
- [ ] Works when logged out (localStorage)
- [ ] Handles invalid positions gracefully
- [ ] Cross-browser compatible
- [ ] Mobile responsive (if applicable)

---

## Success Criteria

✅ **System is working if:**
- All 10 detailed tests pass
- No error logs in console
- localStorage key exists with correct format
- Database entries created (when authenticated)
- Resume toast displays correctly
- Position persists across sessions

🎉 **You're good to go!**
