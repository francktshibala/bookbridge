#!/bin/bash

# Fix error.message TypeScript issues
find app -name "*.tsx" -type f | while read file; do
  # Check if file has error.message without instanceof check
  if grep -q "error\.message" "$file" && ! grep -q "error instanceof Error" "$file"; then
    echo "Fixing $file"
    
    # Replace simple error.message with type-safe version
    sed -i '' 's/error\.message/error instanceof Error ? error.message : "Unknown error"/g' "$file"
    
    # Fix cases where it's already partially there but broken
    sed -i '' 's/error instanceof Error ? error instanceof Error ? error\.message : "Unknown error" : "Unknown error"/error instanceof Error ? error.message : "Unknown error"/g' "$file"
  fi
done

echo "Done fixing error handling"