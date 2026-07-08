#!/bin/bash

# Port settings
PORT=8080

echo "------------------------------------------------------------"
echo "Initializing Portfolio Launcher..."
echo "------------------------------------------------------------"

# Check if port is in use and clean it up safely
PID=$(lsof -t -i:$PORT)
if [ ! -z "$PID" ]; then
    echo "Port $PORT is currently occupied (PID: $PID). Releasing port..."
    kill -9 $PID
    sleep 0.5
fi

# Start python3 HTTP server in the background
echo "Starting local Python HTTP server on port $PORT..."
python3 -m http.server $PORT &
SERVER_PID=$!

# Capture exit signals to kill python on exit
trap "echo 'Stopping portfolio server...'; kill $SERVER_PID; exit" INT TERM EXIT

# Wait a moment for server to bind
sleep 1.2

# Open default system web browser
echo "Launching browser..."
open "http://localhost:$PORT"

echo "------------------------------------------------------------"
echo "Portfolio is running live at: http://localhost:$PORT"
echo "Minimize this terminal window to keep it running."
echo "To shut down the server, press Ctrl+C in this window."
echo "------------------------------------------------------------"

# Keep script alive
wait $SERVER_PID
