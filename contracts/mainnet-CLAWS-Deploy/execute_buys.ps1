# PowerShell script to execute 24 sequential buys using cast
$ErrorActionPreference = "Continue"

$TOKEN = "0xA601F2Ab2A3798A515Dff19267Fc988E5e680C00"
$RPC = "https://ethereum-sepolia-rpc.publicnode.com"
$BUY_AMOUNT = "0.0204ether"

# Mnemonic for wallet derivation
$MNEMONIC = "test test test test test test test test test test test junk"

# Cold storage addresses
$COLD_STORAGE = @(
    "0x27E030789043ef2Cf70F458018c85019b6A23399",
    "0x12AfE6d1386e8a9c678EcD2498e084D5848686db",
    "0x8299920cb9E3309Ff54153f98bE26A2D70f75e06",
    "0x7FfB51DcE75e1E389Fd10a18b53F88DEC8349ee9",
    "0xb7e57eB5cAF62b6175E36B3e637D5d0ef61a33c3",
    "0x7573b935A8aaEAbE90557883400Ed703f588cfbB",
    "0x1c42Cfad4DD004Af8D09c477274ff120Be591524",
    "0xDab5b76aE9729Ece81634d352E6Cd40b2DB01842",
    "0x9bbDcAd877E7B974a5266D8b29Cf48138231a65f",
    "0xe3cE63F4E736FF8D36aa0A7C64307b17790238B2",
    "0x8859Cd97D2953979BcCAEAde311A4f636b7901f7",
    "0x70c4522Afdbd0c243d1906FAAE6B197c30f4534F",
    "0x33f27Eb7282a432f892E70b04f76442CC364Ed7f",
    "0x290FEded52A84ce5F704cA6e2480c94Ed58080A4",
    "0xaf1edf3C7eFdA75D3C9973210043CC3FFb65a9aD",
    "0xE7FC64b19C11f24CE1aF35BC83Ad2dD3A4070B74",
    "0xa85Ea3ce7135F61E6e9b8Ccc7f24bb54C2861375",
    "0xfDFfbF4b934A3868826AD86e9F3Fbe5e4B419A23",
    "0x519679809164d7d5F9171405B562d4b8C67F9249",
    "0xfA696e24Ffce748B30E26c3C047A0dC3FbeCe824",
    "0xbE26eE9A06d36d50970106aA80E151118Ff0A169",
    "0xfcddBFc144283B3aaA721Bc5f554e23226f481a2",
    "0x49867915fBb071B4F7f5B50cfa7dF4B94EA15A40",
    "0x97e92fBB0cBE1d497De769E229EBE7E4ab6BD3fD"
)

Write-Host "=== CLAWS Sequential Buys ===" -ForegroundColor Green
Write-Host "Token: $TOKEN"
Write-Host "Buy amount: $BUY_AMOUNT per wallet"
Write-Host ""

# Derive wallet private keys
for ($i = 0; $i -lt 24; $i++) {
    Write-Host "--- Wallet $($i+1) of 24 ---" -ForegroundColor Cyan
    
    # Derive private key using cast wallet
    $pk = cast wallet derive-private-key "$MNEMONIC" $i
    $addr = cast wallet address --private-key $pk
    
    Write-Host "Address: $addr"
    Write-Host "Cold storage: $($COLD_STORAGE[$i])"
    
    # Check balance
    $balance = cast balance $addr --rpc-url $RPC
    Write-Host "Balance: $balance"
    
    # Buy tokens via Uniswap (manual implementation needed - using your Telegram bot or UI for now)
    Write-Host "ACTION NEEDED: Buy $BUY_AMOUNT of CLAWS with wallet $addr" -ForegroundColor Yellow
    Write-Host "Then transfer to cold storage: $($COLD_STORAGE[$i])" -ForegroundColor Yellow
    
    # Sleep 3 seconds
    if ($i -lt 23) {
        Write-Host "Waiting 3 seconds..."
        Start-Sleep -Seconds 3
    }
}

Write-Host ""
Write-Host "=== SUMMARY ===" -ForegroundColor Green
Write-Host "Token deployed and wallets funded"
Write-Host "Manual buys needed via Telegram bot or Uniswap UI"
Write-Host "Transfer to cold storage addresses listed above"
