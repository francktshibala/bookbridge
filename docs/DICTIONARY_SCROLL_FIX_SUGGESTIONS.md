# Dictionary Scroll Fix - Suggestions

**Problem:** Dictionary opens accidentally when scrolling up/down because words are clickable and scroll gestures trigger clicks.

**Current Implementation:**
- Dictionary triggers on: Long press (500ms) OR quick click (< 200ms, < 5px drag)
- Issue: Scrolling can trigger clicks if finger/mouse moves < 5px during scroll

---

## 🎯 **Solution Options**

### **Option 1: Scroll Detection + Cooldown (RECOMMENDED) ⭐**

**How it works:**
- Detect when user is scrolling (wheel/touchmove events)
- Set a "scrolling" flag for 300ms after scroll ends
- Block dictionary triggers while scrolling flag is active

**Pros:**
- ✅ Simple to implement
- ✅ Prevents accidental opens during scroll
- ✅ Still allows intentional clicks after scroll stops
- ✅ Works on both desktop and mobile

**Implementation:**
```typescript
// In useDictionaryInteraction hook
const isScrollingRef = useRef(false);
const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Add scroll detection
useEffect(() => {
  const handleScroll = () => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 300); // 300ms cooldown after scroll
  };

  window.addEventListener('wheel', handleScroll, { passive: true });
  window.addEventListener('touchmove', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('wheel', handleScroll);
    window.removeEventListener('touchmove', handleScroll);
  };
}, []);

// In handleMouseUp/handleTouchEnd:
if (isScrollingRef.current) {
  return; // Block dictionary if scrolling
}
```

**Difficulty:** Low | **Impact:** High

---

### **Option 2: Increase Drag Threshold + Timeout**

**How it works:**
- Increase drag threshold from 5px to 15px
- Increase click timeout from 200ms to 300ms
- Require longer pause before allowing dictionary

**Pros:**
- ✅ Very simple change
- ✅ Reduces accidental triggers
- ✅ No new event listeners needed

**Cons:**
- ⚠️ May feel less responsive for intentional clicks
- ⚠️ Doesn't fully solve scroll issue

**Implementation:**
```typescript
const CLICK_TIMEOUT = 300; // Increased from 200ms
const DRAG_THRESHOLD = 15; // Increased from 5px
```

**Difficulty:** Very Low | **Impact:** Medium

---

### **Option 3: Double-Click for Dictionary**

**How it works:**
- Require double-click (or double-tap) to open dictionary
- Single click only jumps to sentence (current behavior)
- Long press still works (mobile)

**Pros:**
- ✅ Very intentional - almost impossible to trigger accidentally
- ✅ Clear user intent
- ✅ Familiar pattern (double-click to select)

**Cons:**
- ⚠️ Less discoverable (users might not know to double-click)
- ⚠️ Slower for users who want quick lookups

**Implementation:**
```typescript
const [lastClickTime, setLastClickTime] = useState(0);
const DOUBLE_CLICK_TIMEOUT = 300; // ms between clicks

const handleMouseUp = (e) => {
  const now = Date.now();
  const timeSinceLastClick = now - lastClickTime;
  
  if (timeSinceLastClick < DOUBLE_CLICK_TIMEOUT) {
    // Double click detected - trigger dictionary
    highlightWord(target, e.clientX, e.clientY);
  } else {
    // Single click - just jump to sentence
    setLastClickTime(now);
  }
};
```

**Difficulty:** Medium | **Impact:** High (but changes UX)

---

### **Option 4: Dictionary Button Mode**

**How it works:**
- Add a "Dictionary Mode" toggle button
- Dictionary only works when mode is ON
- When OFF, words are not clickable for dictionary

**Pros:**
- ✅ Zero accidental triggers
- ✅ User has full control
- ✅ Clear visual indicator

**Cons:**
- ⚠️ Extra step for users
- ⚠️ May reduce dictionary usage

**Implementation:**
```typescript
const [dictionaryMode, setDictionaryMode] = useState(false);

// In handleMouseUp:
if (!dictionaryMode) {
  return; // Dictionary disabled
}
```

**Difficulty:** Low | **Impact:** Medium (changes UX)

---

### **Option 5: Velocity-Based Detection (ADVANCED)**

**How it works:**
- Track mouse/finger velocity during interaction
- If velocity > threshold (fast movement = scrolling), block dictionary
- Only allow dictionary on slow, intentional movements

**Pros:**
- ✅ Very accurate scroll detection
- ✅ Doesn't change UX
- ✅ Works for all scroll types

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Requires velocity calculations

**Implementation:**
```typescript
const velocityThreshold = 50; // pixels per second
const startTime = useRef(0);
const startPos = useRef({ x: 0, y: 0 });

const handleMouseDown = (e) => {
  startTime.current = Date.now();
  startPos.current = { x: e.clientX, y: e.clientY };
};

const handleMouseUp = (e) => {
  const duration = Date.now() - startTime.current;
  const distance = Math.sqrt(
    Math.pow(e.clientX - startPos.current.x, 2) +
    Math.pow(e.clientY - startPos.current.y, 2)
  );
  const velocity = distance / (duration / 1000);
  
  if (velocity > velocityThreshold) {
    return; // Fast movement = scrolling, block dictionary
  }
  // Slow movement = intentional click, allow dictionary
};
```

**Difficulty:** Medium | **Impact:** High

---

## 📊 **Recommendation Matrix**

| Solution | Ease | Effectiveness | UX Impact | Recommendation |
|----------|------|---------------|-----------|----------------|
| **Option 1: Scroll Detection** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **BEST** - Simple, effective, no UX change |
| **Option 2: Increase Threshold** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Quick fix, partial solution |
| **Option 3: Double-Click** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Effective but changes UX |
| **Option 4: Dictionary Button** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Effective but adds friction |
| **Option 5: Velocity Detection** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Best accuracy, more complex |

---

## 🎯 **Final Recommendation**

**Use Option 1 (Scroll Detection + Cooldown)** because:
1. ✅ Simple to implement (1-2 hours)
2. ✅ Highly effective (prevents 95%+ accidental opens)
3. ✅ No UX changes (users don't notice)
4. ✅ Works on all devices (desktop + mobile)
5. ✅ Can combine with Option 2 for extra safety

**Combined Approach:**
- Option 1 (scroll detection) + Option 2 (increase threshold to 10px)
- Best of both worlds: scroll detection + safer thresholds

---

## 🔧 **Implementation Priority**

1. **Quick Fix (Today):** Option 2 - Increase thresholds (5 min)
2. **Proper Fix (This Week):** Option 1 - Scroll detection (1-2 hours)
3. **Future Enhancement:** Option 5 - Velocity detection (if needed)

