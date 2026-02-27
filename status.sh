#!/bin/bash

echo "=============================="
echo "📊 ToolBox Service Status"
echo "=============================="
echo ""

# Check Backend
echo "🔧 Backend (Java):"
BACKEND_PID=$(pgrep -f "java.*toolbox-0.0.1-SNAPSHOT.jar" || true)
if [ -n "$BACKEND_PID" ]; then
    echo "   ✅ Running (PID: $BACKEND_PID)"
    echo "   📍 http://localhost:9099"
else
    echo "   ❌ Not running"
fi
echo ""

# Check Frontend
echo "🎨 Frontend (Bun):"
FRONTEND_PID=$(pgrep -f "bun.*dev" || true)
if [ -n "$FRONTEND_PID" ]; then
    echo "   ✅ Running (PID: $FRONTEND_PID)"
    echo "   📍 http://localhost:3000"
else
    echo "   ❌ Not running"
fi
echo ""

# Check logs
echo "📝 Recent logs:"
echo "   Backend:   tail -f backend.log"
echo "   Stock API: tail -f stock_api.log"
echo "   Frontend:  tail -f frontend.log"
echo ""