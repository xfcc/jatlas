#!/bin/bash
# find_orphans.sh

# This script finds potential orphan files (.ts and .tsx) in the src directory.
# An orphan file is a file that is not imported or used by any other file in the project.

# Get the project root directory
ROOT_DIR=$(git rev-parse --show-toplevel)
SRC_DIR="$ROOT_DIR/src"

# Find all .ts and .tsx files in the src directory
FILES=$(find "$SRC_DIR" -type f \( -name "*.ts" -o -name "*.tsx" \))

for FILE in $FILES; do
    # Get the filename without the extension
    FILENAME=$(basename "$FILE")
    BASENAME="${FILENAME%.*}"

    # Don't check root layout and page files
    if [ "$BASENAME" == "layout" ] || [ "$BASENAME" == "page" ]; then
        continue
    fi
    
    # Don't check middleware file
    if [ "$BASENAME" == "middleware" ]; then
        continue
    fi
    
    # Don't check type definition files
    if [[ "$FILENAME" == *.d.ts ]]; then
        continue
    fi

    # Search for the usage of the file in the project
    # We exclude the file itself from the search
    # We search for the basename, which is the filename without extension
    COUNT=$(rg --files-with-matches --glob "!$FILENAME" "$BASENAME" "$SRC_DIR" | wc -l)

    if [ "$COUNT" -eq 0 ]; then
        echo "Potential orphan file: $FILE"
    fi
done
