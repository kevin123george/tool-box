#!/bin/bash

echo "=============================="
echo "🛑 Stopping ToolBox Services"
echo "=============================="
echo ""

### Stop Backend
echo "🔴 Stopping backend..."
BACKEND_PID=$(pgrep -f "java.*mongo-0.0.1-SNAPSHOT.jar" || true)
if [ -n "$BACKEND_PID" ]; then
    echo "Found backend PID: $BACKEND_PID"
    kill $BACKEND_PID
    sleep 3
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "Force killing backend..."
        kill -9 $BACKEND_PID
    fi
    echo "✅ Backend stopped"
else
    echo "Backend not running"
fi
echo ""

### Stop Stock API
echo "🔴 Stopping stock API..."
STOCK_PID=$(pgrep -f "python.*stock_api.py" || true)
if [ -n "$STOCK_PID" ]; then
    echo "Found stock API PID: $STOCK_PID"
    kill $STOCK_PID
    sleep 2
    if ps -p $STOCK_PID > /dev/null 2>&1; then
        echo "Force killing stock API..."
        kill -9 $STOCK_PID
    fi
    echo "✅ Stock API stopped"
else
    echo "Stock API not running"
fi
echo ""

### Stop Frontend
echo "🔴 Stopping frontend..."
FRONTEND_PID=$(pgrep -f "bun.*dev" || true)
if [ -n "$FRONTEND_PID" ]; then
    echo "Found frontend PID: $FRONTEND_PID"
    kill $FRONTEND_PID
    sleep 2
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "Force killing frontend..."
        kill -9 $FRONTEND_PID
    fi
    echo "✅ Frontend stopped"
else
    echo "Frontend not running"
fi
echo ""

echo "✅ All services stopped"