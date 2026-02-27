#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

JAR_NAME="toolbox-0.0.1-SNAPSHOT.jar"
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"

echo "=============================="
echo "🚀 Starting Toolbox"
echo "=============================="

### Stop existing processes
PID=$(pgrep -f "java.*$JAR_NAME" || true)
if [ -n "$PID" ]; then kill $PID; sleep 3; fi

FRONTEND_PID=$(pgrep -f "bun.*dev" || true)
if [ -n "$FRONTEND_PID" ]; then kill $FRONTEND_PID; sleep 1; fi

### Build backend
echo "🔨 Building backend..."
cd backend
./gradlew build -x test
cd ..

### Copy Python scripts next to jar
for script in stock_fetcher.py stock_history_fetcher.py stock_daemon.py fundamentals_fetcher.py market_data_fetcher.py stock_api.py; do
    [ -f "scripts/$script" ] && cp "scripts/$script" "backend/build/libs/"
done

### Start backend
echo "▶️ Starting backend..."
cd backend/build/libs
nohup java \
  -DJWT_SECRET="${JWT_SECRET}" \
  -DKEVIN_NAME="${KEVIN_NAME}" \
  -DKEVIN_EMAIL="${KEVIN_EMAIL}" \
  -DKEVIN_PASSWORD="${KEVIN_PASSWORD}" \
  -DALPHA_VANTAGE_API_KEY="${ALPHA_VANTAGE_API_KEY}" \
  -DMAILERSEND_API_KEY="${MAILERSEND_API_KEY}" \
  -DNOTIFICATION_FROM_EMAIL="${NOTIFICATION_FROM_EMAIL}" \
  -DNOTIFICATION_FROM_NAME="${NOTIFICATION_FROM_NAME}" \
  -jar $JAR_NAME > ../../../$BACKEND_LOG 2>&1 &
cd ../../..
echo "✓ Backend started"

### Start frontend
echo "▶️ Starting frontend..."
cd frontend
nohup bun run dev > ../$FRONTEND_LOG 2>&1 &
cd ..
echo "✓ Frontend started"

echo ""
echo "✅ Done."
echo "   Backend:  http://localhost:9099"
echo "   Frontend: http://localhost:3000"
