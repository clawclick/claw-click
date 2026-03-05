@echo off
REM NFTid Quick Init Script (Windows)
REM Run this to set up your environment in one command

echo 🦞 Initializing NFTid System...

REM Check if Foundry is installed
where forge >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 📦 Installing Foundry...
    echo Please run: curl -L https://foundry.paradigm.xyz | bash
    echo Then run foundryup
    echo After that, re-run this script.
    pause
    exit /b 1
) else (
    echo ✅ Foundry already installed
)

REM Install OpenZeppelin contracts
echo 📦 Installing OpenZeppelin contracts...
if not exist "lib\openzeppelin-contracts" (
    forge install OpenZeppelin/openzeppelin-contracts --no-commit
) else (
    echo ✅ OpenZeppelin already installed
)

REM Create .env from example if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ⚠️  Edit .env with your credentials!
) else (
    echo ✅ .env already exists
)

REM Build contracts
echo 🔨 Building contracts...
forge build

REM Run tests
echo 🧪 Running tests...
forge test

echo.
echo ✅ NFTid system initialized!
echo.
echo Next steps:
echo 1. Edit .env with your credentials
echo 2. Follow QUICKSTART.md for deployment
echo.
echo 🦞 Ready to ship!
pause
