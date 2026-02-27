#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
    echo "✓ Loaded environment from .env"
else
    echo "⚠️  No .env file found — secrets must already be in environment"
fi

JAR_NAME="toolbox-0.0.1-SNAPSHOT.jar"
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"
VENV_DIR="scripts/venv"

echo "=============================="
echo "🚀 Deploying Toolbox"
echo "=============================="

echo "🔄 Updating source code..."
git reset --hard
git pull
echo "✓ Source code updated"

### Stop backend
echo "🔴 Stopping existing backend..."
PID=$(pgrep -f "java.*$JAR_NAME" || true)
if [ -n "$PID" ]; then
    kill $PID; sleep 5
    ps -p $PID > /dev/null 2>&1 && kill -9 $PID
    echo "✓ Backend stopped"
else
    echo "Backend not running"
fi

### Stop frontend
echo "🔴 Stopping existing frontend..."
FRONTEND_PID=$(pgrep -f "bun.*dev" || true)
if [ -n "$FRONTEND_PID" ]; then
    kill $FRONTEND_PID; sleep 2
    echo "✓ Frontend stopped"
else
    echo "Frontend not running"
fi

### Python environment
echo "🐍 Setting up Python environment..."
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv $VENV_DIR
fi
source $VENV_DIR/bin/activate
pip install -r scripts/requirements.txt --quiet
echo "✓ Python dependencies installed"

### Build backend
echo "🔨 Building backend..."
cd backend
./gradlew build -x test -x spotlessJava -x spotlessCheck -x spotlessApply
cd ..

### Copy Python scripts next to jar (so Java can find them at runtime)
echo "📄 Copying Python scripts..."
for script in stock_fetcher.py stock_history_fetcher.py stock_daemon.py fundamentals_fetcher.py market_data_fetcher.py stock_api.py; do
    if [ -f "scripts/$script" ]; then
        cp "scripts/$script" "backend/build/libs/"
        echo "✓ $script"
    else
        echo "⚠️  scripts/$script not found"
    fi
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
echo "✓ Backend started. Logs: $BACKEND_LOG"

### Start frontend
echo "▶️ Starting frontend..."
cd frontend
nohup bun run dev > ../$FRONTEND_LOG 2>&1 &
cd ..
echo "✓ Frontend started. Logs: $FRONTEND_LOG"

deactivate

echo ""
echo "✅ Done."
echo ""
echo "📊 Services:"
echo "   Backend:   http://localhost:9099  (logs: $BACKEND_LOG)"
echo "   Frontend:  http://localhost:3000  (logs: $FRONTEND_LOG)"
echo ""
echo "📝 View logs:"
echo "   tail -f $BACKEND_LOG"
echo "   tail -f $FRONTEND_LOG"
