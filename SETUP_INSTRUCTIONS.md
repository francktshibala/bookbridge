# 🚀 Setup Instructions for Other Computers

## 📋 Step-by-Step Setup

### 1. **Pull Latest Changes**
```bash
git pull
```

### 2. **Reset Usage Limits** ⚠️ **IMPORTANT**
```bash
node scripts/reset-usage-limits.js
```
**This is critical** - without this, AI simplification will fail with "Daily user limit exceeded".

### 3. **Start Development Server**
```bash
npm run dev
```
**Expected output:**
```
✓ Ready in X.Xs
- Local: http://localhost:3000 (or 3001, 3002, etc.)
```
📝 **Note the port number** - each computer will get a different available port.

### 4. **Update Script Port (IMPORTANT)**
Before running any bulk processing script, you **MUST** update the port:

**Example:** If your server is on port 3001, edit the script:
```javascript
// In scripts/bulk-process-romeo-juliet.js (or any bulk script)
const BASE_URL = 'http://localhost:3001'  // Change 3005 to your port
```

### 5. **Start Bulk Processing**
```bash
# For Romeo & Juliet (recommended first):
node scripts/bulk-process-romeo-juliet.js

# For other books, use existing scripts:
node scripts/resume-bulk-processing.js  # Pride & Prejudice
```

## 🎯 **Available Books & Scripts**

| Book | Book ID | Script | Status |
|------|---------|--------|--------|
| Romeo & Juliet | gutenberg-1513 | `bulk-process-romeo-juliet.js` | ✅ Ready |
| Pride & Prejudice | gutenberg-1342 | `resume-bulk-processing.js` | ✅ Complete |
| Frankenstein | gutenberg-84 | `fix-bulk-processing-v2.js` | ⚠️ Needs reprocessing |
| Little Women | gutenberg-514 | `fix-bulk-processing-v2.js` | ⚠️ Needs reprocessing |
| Alice in Wonderland | gutenberg-11 | Create new script | 📝 Needs script |

## ⚠️ **Important Notes**

### **Port Configuration**
- Each computer gets a different port (3000, 3001, 3002, etc.)
- **ALWAYS** update `BASE_URL` in scripts to match your port
- Server shows port in startup message: `Local: http://localhost:XXXX`

### **Usage Limits**
- **MUST** run `reset-usage-limits.js` before processing
- Each computer shares the same `system-gutenberg` user
- If you see "Daily user limit exceeded", run reset script again

### **Quality Check**
- Romeo & Juliet script validates simplifications
- Look for: `source=ai_simplified` and `quality=modernized`
- If seeing `source=fallback_chunked`, check usage limits

## 📊 **Expected Processing Times**

| Book | Chunks | Total Simplifications | Est. Time |
|------|--------|---------------------|-----------|
| Romeo & Juliet | 56 | 336 | 1-2 hours |
| Alice in Wonderland | ~62 | 372 | 1.5-2.5 hours |
| Frankenstein | ~425 | 2,550 | 6-8 hours |
| Little Women | ~150 | 900 | 3-4 hours |

## 🔧 **Troubleshooting**

### "Server not running" Error
```bash
# Check what port your server is on:
lsof -i :3000  # Check if 3000 is in use
lsof -i :3001  # Check if 3001 is in use
# Update BASE_URL in script to match
```

### "Daily user limit exceeded"
```bash
node scripts/reset-usage-limits.js
```

### "All items in batch failed"
1. Check server is running: `curl http://localhost:XXXX/health`
2. Check usage limits: run reset script
3. Check port matches in script

## 🎯 **Recommended Workflow**

1. **Computer 1**: Romeo & Juliet (smallest, test everything works)
2. **Computer 2**: Alice in Wonderland (medium size)
3. **Computer 3**: Reprocess Frankenstein/Little Women (clear bad cache first)

## 📝 **Creating New Scripts**

To create a script for a new book:
1. Copy `bulk-process-romeo-juliet.js`
2. Update `BOOK_ID` (e.g., `gutenberg-11` for Alice)
3. Update script name in console logs
4. Test with a few chunks first