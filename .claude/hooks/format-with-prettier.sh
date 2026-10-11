#!/usr/bin/env bash
# PostToolUse-hook: formaterer filen Claude nettopp skrev eller redigerte med Prettier.
# Registrert i .claude/settings.json for Edit og Write. Hooken får et JSON-objekt
# på stdin; filen ligger i tool_input.file_path.

set -u

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file="$(jq -r '.tool_input.file_path // empty')"

# Ingen fil, eller filen er borte (for eksempel slettet etter redigering).
[ -n "$file" ] && [ -f "$file" ] || exit 0

# Bare filer inne i prosjektet. Minne, scratchpad og lignende ligger utenfor.
case "$file" in
  "$project_dir"/*) ;;
  *) exit 0 ;;
esac

# Bare filtypene prosjektet formaterer. Alt annet lar vi stå.
case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.css | *.json | *.md) ;;
  *) exit 0 ;;
esac

prettier="$project_dir/node_modules/.bin/prettier"
if [ ! -x "$prettier" ]; then
  echo "format-with-prettier: fant ikke $prettier. Kjør «npm install»." >&2
  exit 1
fi

# Prettier leser .prettierignore i prosjektroten og hopper over ignorerte filer
# (seed.json, package-lock.json og så videre) uten støy.
cd "$project_dir" || exit 0
if ! "$prettier" --write --log-level warn "$file" >&2; then
  echo "format-with-prettier: Prettier klarte ikke å formatere $file" >&2
  exit 1
fi
