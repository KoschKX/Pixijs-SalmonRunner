#!/bin/bash
echo "Starting local web server for Salmon Rush game..."
echo ""
echo "Server will run at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""
python3 -m http.server 8000
