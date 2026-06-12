#!/bin/bash
set -e

FOLDER="$HOME/Desktop/Roastly images"
USED_FILE="$FOLDER/.used.txt"

mkdir -p "$FOLDER"

# Find all image files in the entire folder (including subfolders)
ALL_IMAGES=()
while IFS= read -r -d '' file; do
  ALL_IMAGES+=("$file")
done < <(find "$FOLDER" -type f \( -iname '*.jpg' -o -iname '*.png' -o -iname '*.jpeg' \) ! -name '.*' -print0 | sort -z)

if [ ${#ALL_IMAGES[@]} -eq 0 ]; then
  echo "No images found in $FOLDER"
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
  echo "All images have been used."
  exit 1
fi

# Pick random unused (using RANDOM)
RAND_INDEX=$(( RANDOM % ${#UNUSED[@]} ))
PICKED="${UNUSED[$RAND_INDEX]}"

# Add to used (store full path)
echo "$PICKED" >> "$USED_FILE"

echo "Picked: $PICKED"
echo "Basename: $(basename "$PICKED")"

# Determine category for vibe suggestion
if [[ "$PICKED" == *"/Animals/"* ]]; then
  CATEGORY="animal"
  SUGGESTED_VIBE="uplifting"
  NOTE="Animal photo from Animals subfolder. Use uplifting per instructions (especially for dogs: cute, funny, positive, never mean)."
else
  CATEGORY="person"
  SUGGESTED_VIBE="light_toast"
  NOTE="Person photo. Use light_toast or uplifting + strong safety custom prompt: no racist, off-putting, or targeting protected characteristics."
fi

echo ""
echo "Category: $CATEGORY"
echo "Suggested vibe: $SUGGESTED_VIBE"
echo "Note: $NOTE"

# Exact custom prompt to use for person photos (in addition to light_toast vibe):
# "Ensure the roast is funny, observational, and witty, but NEVER racist, sexist, ableist, homophobic, or off-putting in any way. Avoid any references to ethnicity, race, religion, nationality, disability, body type, gender, sexual orientation, or any protected characteristics. Keep it light-hearted, clever, personal to the visible details in the photo, and in good fun. No stereotypes, mean-spirited content, or anything that could make someone uncomfortable."
