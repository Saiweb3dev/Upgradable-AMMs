#!/bin/bash

# Store the root directory
ROOT_DIR=$(pwd)

# Function to check if a port is in use
check_port() {
    netstat -ano | grep "LISTENING" | grep ":$1" > /dev/null 2>&1
}

# Function to kill process on a port
kill_port_process() {
    local port=$1
    local pid=$(netstat -ano | grep "LISTENING" | grep ":$port" | awk '{print $5}')
    if [ ! -z "$pid" ]; then
        taskkill //F //PID $pid > /dev/null 2>&1
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local port=$1
    local service=$2
    local count=0
    local max_tries=50

    while ! check_port $port; do
        if [ $count -ge $max_tries ]; then
            echo "Timeout waiting for $service to start"
            exit 1
        fi
        echo "Waiting for $service to start..."
        sleep 1
        count=$((count + 1))
    done
    echo "$service is ready!"
}

# Create logs directory if it doesn't exist
mkdir -p logs

# Kill any existing processes on relevant ports
echo "Cleaning up existing processes..."
kill_port_process 8545
kill_port_process 8080

# Start Hardhat node in the background
echo "Starting Hardhat node..."
npx hardhat node > logs/hardhat.log 2>&1 &
HARDHAT_PID=$!

# Wait for Hardhat node to be ready
wait_for_service 8545 "Hardhat node"

# Deploy the contracts
echo "Deploying contracts..."
npx hardhat run scripts/deploy_Token.ts --network localhost

# Check if deployment files exist
if [ ! -f "deployments/hardhat/Token1.json" ] || [ ! -f "deployments/hardhat/Token2.json" ]; then
    echo "Error: Deployment files not found!"
    cleanup
    exit 1
fi

# Start the Go server in the background
echo "Starting Go server..."
cd src
go run cmd/api/main.go > "$ROOT_DIR/logs/server.log" 2>&1 &
GO_PID=$!
cd "$ROOT_DIR"

# Wait for Go server to be ready
wait_for_service 8080 "Go server"

# Run the test transactions
echo "Running test transactions..."
npx hardhat run scripts/test_token_transactions.ts --network localhost

# Function to cleanup processes
cleanup() {
    echo "Cleaning up processes..."
    taskkill //F //PID $HARDHAT_PID > /dev/null 2>&1
    taskkill //F //PID $GO_PID > /dev/null 2>&1
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT

# Keep the script running until manually terminated
echo "Environment is ready and running. Press Ctrl+C to stop..."
wait