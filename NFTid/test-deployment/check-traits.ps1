$env:Path += ";C:\Users\ClawdeBot\Desktop\foundry"
$env:FOUNDRY_DISABLE_NIGHTLY_WARNING = "1"
cd C:\Users\ClawdeBot\AI_WORKSPACE\claw.click\NFTid

Write-Host "`n=== CHECKING ALL NFT TRAITS ===" -ForegroundColor Cyan
Write-Host "`nNFTid Contract: 0x95CcC0d0Ad74FdA0826adF4358653CF7f8A28E9C" -ForegroundColor Yellow
Write-Host "Network: Sepolia Testnet`n" -ForegroundColor Yellow

for ($i=0; $i -lt 6; $i++) {
    $traits = cast call 0x95CcC0d0Ad74FdA0826adF4358653CF7f8A28E9C "getTraits(uint256)((uint8,uint8,uint8,uint8,uint8))" $i --rpc-url https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J
    Write-Host "NFT #$i : $traits" -ForegroundColor Green
}

Write-Host "`n=== ALL TRAITS CHECKED ===" -ForegroundColor Cyan
