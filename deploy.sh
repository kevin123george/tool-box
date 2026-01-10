#!/bin/bash
set -e

JAR_NAME="mongo-0.0.1-SNAPSHOT.jar"
BACKEND_LOG="backend.log"
FRONTEND_LOG="frontend.log"
VENV_DIR="venv"

echo "=============================="
echo "🚀 Deploying Toolbox"
echo "=============================="

echo "🔄 Updating source code..."
git reset --hard
git pull
echo "✓ Source code updated"
### Stop backend gracefully
echo "🔴 Stopping existing backend..."
PID=$(pgrep -f "java.*$JAR_NAME" || true)

if [ -n "$PID" ]; then
    echo "Found backend PID: $PID"
    kill $PID
    sleep 5

    if ps -p $PID > /dev/null 2>&1; then
        echo "Backend still running, force killing..."
        kill -9 $PID
    fi
else
    echo "No backend process found."
fi

### Stop frontend
echo "🔴 Stopping existing frontend..."
FRONTEND_PID=$(pgrep -f "bun.*dev" || true)

if [ -n "$FRONTEND_PID" ]; then
    echo "Found frontend PID: $FRONTEND_PID"
    kill $FRONTEND_PID
    sleep 2
else
    echo "No frontend process found."
fi

### Setup Python virtual environment
echo "🐍 Setting up Python environment..."
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv $VENV_DIR
fi

echo "Activating virtual environment..."
source $VENV_DIR/bin/activate

echo "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt --quiet
    echo "✓ Python dependencies installed"
else
    echo "⚠️  requirements.txt not found"
fi

### Check VAPID keys for push notifications
echo "🔑 Checking VAPID keys..."
PROPS_FILE="src/main/resources/application.properties"
if [ -f "$PROPS_FILE" ]; then
    PUBLIC_KEY=$(grep "^vapid.public.key=" "$PROPS_FILE" 2>/dev/null | cut -d'=' -f2 || echo "")
    if [ -z "$PUBLIC_KEY" ] || [ "$PUBLIC_KEY" = "YOUR_PUBLIC_KEY_FROM_GENERATOR" ]; then
        echo "⚠️  VAPID keys not configured!"
        echo "   Run VapidKeyGenerator.java to generate keys"
        echo "   Push notifications will not work!"
    else
        echo "✓ VAPID keys configured"
    fi
fi

### Verify service worker exists
if [ -f "toolbox-frontend/public/sw.js" ]; then
    echo "✓ Service worker (sw.js) found"
else
    echo "⚠️  Service worker (sw.js) not found in toolbox-frontend/public/"
    echo "   Push notifications will not work!"
fi

### Build backend (skip ALL spotless tasks)
echo "🔨 Building backend..."
./gradlew build -x test -x spotlessJava -x spotlessCheck -x spotlessApply

### Copy Python script to build directory
echo "📄 Copying Python stock fetcher..."
if [ -f "stock_fetcher.py" ]; then
    # Copy the script
    cp stock_fetcher.py build/libs/

    # Ensure it has execute permissions
    chmod +x build/libs/stock_fetcher.py

    echo "Python script copied to build/libs/"
    echo "✓ Execute permissions set"
else
    echo "⚠️  stock_fetcher.py not found"
fi

### Start backend
echo "▶️ Starting backend..."
cd build/libs
nohup java -jar $JAR_NAME > ../../$BACKEND_LOG 2>&1 &
cd ../..
echo "Backend started. Logs: $BACKEND_LOG"

### Start frontend
echo "▶️ Starting frontend..."
cd toolbox-frontend
nohup bun run dev > ../$FRONTEND_LOG 2>&1 &
cd ..

echo "Frontend started. Logs: $FRONTEND_LOG"

# Deactivate virtual environment
deactivate

echo ""
echo "✅ Done."
echo ""
echo "📊 Services running:"
echo "   - Backend:    http://localhost:9099 (logs: $BACKEND_LOG)"
echo "   - Frontend:   http://localhost:3000 (logs: $FRONTEND_LOG)"
echo ""
echo "🔔 Push Notifications:"
echo "   - Navigate to System Stats tab at http://localhost:3000"
echo "   - Click 'Enable Notifications' to subscribe"
echo ""
echo "📝 View logs:"
echo "   tail -f $BACKEND_LOG"
echo "   tail -f $FRONTEND_LOG"