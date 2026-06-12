#!/bin/bash
set -e

FOLDER="$HOME/Desktop/Roastly images"
SUBFOLDER="Animals"
USED_FILE="$FOLDER/.used.txt"

mkdir -p "$FOLDER"

# Find all image files in the subfolder
ALL_IMAGES=()
while IFS= read -r -d '' file; do
  ALL_IMAGES+=("$file")
done < <(find "$FOLDER/$SUBFOLDER" -type f \( -iname '*.jpg' -o -iname '*.png' -o -iname '*.jpeg' \) ! -name '.*' -print0 | sort -z)

if [ ${#ALL_IMAGES[@]} -eq 0 ]; then
  echo "No images found in $FOLDER/$SUBFOLDER"
  exit 1
fi

# Read used into array
USED_IMAGES=()
if [ -f "$USED_FILE" ]; then
  while IFS= read -r line; do
    [ -n "$line" ] && USED_IMAGES+=("$line")
  done < "$USED_FILE"
fi

# Find unused
UNUSED=()
for img in "${ALL_IMAGES[@]}"; do
  is_used=false
  for used in "${USED_IMAGES[@]}"; do
    if [ "$img" = "$used" ]; then
      is_used=true
      break
    fi
  done
  if [ "$is_used" = false ]; then
    UNUSED+=("$img")
  fi
done

if [ ${#UNUSED[@]} -eq 0 ]; then
  echo "All images in Animals have been used."
  exit 1
fi

# Pick random unused (using RANDOM)
RAND_INDEX=$(( RANDOM % ${#UNUSED[@]} ))
PICKED="${UNUSED[$RAND_INDEX]}"

# Add to used (store full path)
echo "$PICKED" >> "$USED_FILE"

echo "Picked: $PICKED"
echo "Basename: $(basename "$PICKED")"

echo ""
echo "Suggested vibe for generation: uplifting"
echo "(Per your instructions: for images in the Animals subfolder / dog photos, heavily favor uplifting — cute, funny, positive, never mean.)"
