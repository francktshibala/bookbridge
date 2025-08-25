# Disk Space Cleanup Guide

## Emergency Cleanup Strategy
When git operations fail due to disk space (e.g., "No space left on device"):

### Step 1: Check Available Space
```bash
df -h
```

### Step 2: Clean Development Caches
```bash
# Next.js build cache (usually 500MB-1GB)
rm -rf .next

# npm cache
npm cache clean --force

# VSCode cache (can be 500MB+)
rm -rf ~/Library/Application\ Support/Code/Cache
```

### Step 3: Git Garbage Collection
```bash
# Clean up git objects (can free 1-4GB)
git gc --aggressive --prune=now

# Remove untracked files (if safe)
git clean -fd
```

### Step 4: Additional macOS Cleanup
```bash
# System logs
sudo rm -rf /var/log/*

# Trash
rm -rf ~/.Trash/*

# Downloads folder old files
find ~/Downloads -mtime +30 -delete
```

## Results from Real Cleanup (2025-08-25)
- **Before**: 94MB available (critical)
- **After**: 29GB available
- **Main culprits**: 
  - Git garbage: 3.6GB
  - .next cache: 583MB
  - VSCode cache: 583MB

## Prevention
- Run `git gc` weekly on large repos
- Clear `.next` after major changes
- Use `npm ci` instead of `npm install`
- Monitor space with `df -h` regularly

## Emergency Commands (Copy-Paste Ready)
```bash
# Quick cleanup sequence
rm -rf .next
npm cache clean --force
git gc --aggressive --prune=now
rm -rf ~/Library/Application\ Support/Code/Cache
df -h
```