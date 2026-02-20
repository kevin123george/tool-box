#!/bin/bash
set -e

# Load environment variables from .env if present
if [ -f "$(dirname "$0")/.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/.env" | xargs)
fi

JAR_NAME="mongo-0.0.1-SNAPSHOT.jar"
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"

echo "=============================="
echo "🚀 Deploying Toolbox"
echo "=============================="

### Stop backend gracefully
echo "🔴 Stopping existing backend..."
PID=$(pgrep -f "java.*$JAR_NAME" || true)

if [ -n "$PID" ]; then
    echo "Found backend PID: $PID"
    kill $PID
    sleep 5

    if ps -p $PID > /dev/null; then
        echo "Backend still running, force killing..."
        kill -9 $PID
    fi
else
    echo "No backend process found."
fi

### Build backend
echo "🔨 Building backend..."
./gradlew build -x test

### Start backend
echo "▶️ Starting backend..."
nohup java \
  -DJWT_SECRET="$JWT_SECRET" \
  -DKEVIN_NAME="$KEVIN_NAME" \
  -DKEVIN_EMAIL="$KEVIN_EMAIL" \
  -DKEVIN_PASSWORD="$KEVIN_PASSWORD" \
  -DALPHA_VANTAGE_API_KEY="$ALPHA_VANTAGE_API_KEY" \
  -jar build/libs/$JAR_NAME > $BACKEND_LOG 2>&1 &
echo "Backend started. Logs: $BACKEND_LOG"

### Start frontend
echo "▶️ Starting frontend..."
cd toolbox-frontend
nohup bun run dev > ../$FRONTEND_LOG 2>&1 &
cd ..

echo "Frontend started. Logs: $FRONTEND_LOG"

echo "✅ Done."
