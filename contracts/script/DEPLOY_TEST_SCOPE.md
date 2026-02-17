🧠 What Needs to Be Fully Tested

Based on your actual core architecture:

🔹 A. Deployment Layer

Config deployed correctly

Hook deployed with correct permission bits

Factory wired into config

Hook factory reference correct

PositionManager set correctly

🔹 B. Launch Layer

createLaunch succeeds with valid params

createLaunch fails below 1 ETH MCAP

createLaunch fails above 10 ETH MCAP

TOTAL_SUPPLY minted to factory

Pool initialized

No liquidity minted yet

poolActivated == false

🔹 C. Public Activation

activatePool only once

activatePool reverts if called twice

activatePool mints tight LP

poolActivated becomes true

No swap executed

Price unchanged

🔹 D. Dev Activation

Only creator can call

Real swap executed

Price moves

Tax bypassed

MaxTx bypassed

15% cap enforced

activationInProgress resets

🔹 E. Tax Logic

Initial tax matches Config tier

Tax halves at 2x MCAP

Tax halves at 4x MCAP

Tax halves at 8x MCAP

Tax floor enforced

Graduation triggered at 16x

Tax zeroed post-graduation

🔹 F. Limits

maxTx enforced in PROTECTED

maxWallet enforced in PROTECTED

Limits removed in GRADUATED

MIN_SWAP_AMOUNT enforced

🔹 G. Fee Accounting

ETH fee accounted on buy

Token fee accounted on sell

Beneficiary split correct

Platform split correct

claimBeneficiaryFeesETH works

claimBeneficiaryFeesToken works

claimPlatformFeesETH works

claimPlatformFeesToken works

🔹 H. Liquidity & Range

Tight range minted correctly

positionTokenId stored

repositionByEpoch widens range

Cannot reposition before epoch threshold

Cannot reposition after graduation

Liquidity stage increments

🔹 I. Edge Cases

Exact output swap works

Small dust swap rejected

Sell without approval fails

activateAndSwapDev fails if over 15%

Non-creator dev activation fails

Beneficiary cannot steal platform fees