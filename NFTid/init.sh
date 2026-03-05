#!/bin/bash
# NFTid Quick Init Script
# Run this to set up your environment in one command

set -e  # Exit on error

echo "🦞 Initializing NFTid System..."

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "📦 Installing Foundry..."
    curl -L https://foundry.paradigm.xyz | bash
    foundryup
else
    echo "✅ Foundry already installed"
fi

# Install OpenZeppelin contracts
echo "📦 Installing OpenZeppelin contracts..."
if [ ! -d "lib/openzeppelin-contracts" ]; then
    forge install OpenZeppelin/openzeppelin-contracts --no-commit
else
    echo "✅ OpenZeppelin already installed"
fi

# Create .env from example if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Edit .env with your credentials!"
else
    echo "✅ .env already exists"
fi

# Build contracts
echo "🔨 Building contracts..."
forge build

# Run tests
echo "🧪 Running tests..."
forge test

echo ""
echo "✅ NFTid system initialized!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials"
echo "2. Follow QUICKSTART.md for deployment"
echo ""
echo "🦞 Ready to ship!"
