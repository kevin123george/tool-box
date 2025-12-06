#!/bin/bash

BASE_URL="http://localhost:8080"

echo "=============================="
echo "🚀 TESTING CLIPBOARD API"
echo "=============================="

# Create item
CLIP_ID=$(curl -s -X POST "$BASE_URL/api/clipboard" \
-H "Content-Type: application/json" \
-d '{"content":"Clipboard test content"}' | jq -r '.id')

echo "📌 Created Clipboard Item ID: $CLIP_ID"

# Get all
echo -e "\n📄 All Clipboard Items:"
curl -s "$BASE_URL/api/clipboard" | jq

# Get by id
echo -e "\n🔍 Get Clipboard Item by ID:"
curl -s "$BASE_URL/api/clipboard/$CLIP_ID" | jq

# Update clipboard item
echo -e "\n✏ Updating Clipboard Item..."
curl -s -X PUT "$BASE_URL/api/clipboard/$CLIP_ID" \
-H "Content-Type: application/json" \
-d '{"content":"Updated clipboard text"}' | jq

# Delete clipboard item
echo -e "\n🗑 Deleting Clipboard Item..."
curl -s -X DELETE "$BASE_URL/api/clipboard/$CLIP_ID"

echo -e "\n🔍 Verify deletion:"
curl -s "$BASE_URL/api/clipboard" | jq


echo -e "\n\n=============================="
echo "🚀 TESTING MEMO API"
echo "=============================="

# Create Memo
MEMO_ID=$(curl -s -X POST "$BASE_URL/api/memos" \
-H "Content-Type: application/json" \
-d '{
  "title":"Test Memo",
  "content":"Hello memo world",
  "pinned":true,
  "category":"work"
}' | jq -r '.id')

echo "📌 Created Memo ID: $MEMO_ID"

# Get all memos
echo -e "\n📄 All memos:"
curl -s "$BASE_URL/api/memos" | jq

# Get memo by id
echo -e "\n🔍 Fetch memo by ID:"
curl -s "$BASE_URL/api/memos/$MEMO_ID" | jq

# Update memo
echo -e "\n✏ Updating memo..."
curl -s -X PUT "$BASE_URL/api/memos/$MEMO_ID" \
-H "Content-Type: application/json" \
-d '{
  "title":"Updated Memo Title",
  "content":"Updated memo content",
  "pinned":false,
  "category":"ideas"
}' | jq

# Delete memo
echo -e "\n🗑 Deleting Memo..."
curl -s -X DELETE "$BASE_URL/api/memos/$MEMO_ID"

# Show memos again to confirm
echo -e "\n🔍 Verify memo deletion:"
curl -s "$BASE_URL/api/memos" | jq

echo -e "\n=============================="
echo "🎉 TESTING COMPLETE!"
echo "=============================="
