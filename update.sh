#!/bin/bash
# Pull latest code then run deploy.
# This is a separate tiny script so bash never buffers stale deploy.sh content.
set -e
cd "$(dirname "$0")"
echo "🔄 Updating source code..."
git reset --hard
git pull
echo "✓ Done — running deploy..."
exec bash deploy.sh "$@"
