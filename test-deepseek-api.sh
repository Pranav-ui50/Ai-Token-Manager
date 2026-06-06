#!/bin/bash
# Test DeepSeek API Endpoints
# Run this after starting the backend server

echo "=========================================="
echo "Testing DeepSeek Provider & Models API"
echo "=========================================="

# First, login to get token (update with your credentials)
echo ""
echo "1. Login to get token..."
echo "POST http://localhost:5000/api/auth/login"
echo "Body: { \"email\": \"superadmin@apitokenmanager.com\", \"password\": \"SuperAdmin@123\" }"
echo ""

# After getting token, test these endpoints:
echo "2. Get all providers:"
echo "   GET http://localhost:5000/api/providers?limit=100"
echo ""

echo "3. Get DeepSeek models (using provider ID from your data):"
echo "   GET http://localhost:5000/api/providers/6a195ea6f4dffa9ea8d061e4/models"
echo ""

echo "4. Get models using filter:"
echo "   GET http://localhost:5000/api/models?providerId=6a195ea6f4dffa9ea8d061e4&limit=100"
echo ""

echo "=========================================="
echo "Check your backend console for logs:"
echo "=========================================="
echo "[ModelService] getByProvider query: ..."
echo "[ModelService] getByProvider found: X models"
echo ""