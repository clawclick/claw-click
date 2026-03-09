'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  usePublicClient,
} from 'wagmi'
import { parseEther, formatEther, formatUnits, type Address } from 'viem'
import { base } from 'wagmi/chains'
import { useSwapQuote } from '../../../lib/hooks/useSwapQuote'
import {
  POOL_SWAP_TEST_ABI,
  POOL_SWAP_TEST_ADDRESS,
  MIN_SQRT_PRICE,
  MAX_SQRT_PRICE,
  FACTORY_ABI,
  ERC20_ABI,
} from '../../../lib/utils/swap'
import { CONTRACTS, ETHERSCAN_URL } from '../../../lib/contracts'

interface TradeModalProps {
  isOpen: boolean
  onClose: () => void
  token: {
    name: string
    symbol: string
    token: string // address
    price: string
    mcap: string
    mcapUSD: string
    currentTax: number
    currentEpoch: number
    isGraduated: boolean
    launchType?: 'DIRECT' | 'AGENT'
  }
}

export default function TradeModal({ isOpen, onClose, token }: TradeModalProps) {
  const [isBuy, setIsBuy] = useState(true)
  const [inputAmount, setInputAmount] = useState('')
  const [slippage, setSlippage] = useState(5) // 5% default (high for taxed pools)
  const [showSettings, setShowSettings] = useState(false)
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'swapping' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const { address, chainId } = useAccount()
  const { switchChain } = useSwitchChain()
  const publicClient = usePublicClient({ chainId: base.id })

  const tokenAddress = token.token as Address

  // ETH balance
  const { data: ethBalance } = useBalance({
    address,
    chainId: base.id,
  })

  // Token balance
  const { data: tokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
  })

  // Get swap quote
  const { quote, isLoading: quoteLoading } = useSwapQuote(
    tokenAddress,
    isBuy,
    inputAmount
  )

  // Write contract hooks
  const { writeContractAsync, data: txHash } = useWriteContract()

  // Wait for tx
  const { isLoading: txConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  // Update status when tx confirms
  useEffect(() => {
    if (txConfirmed) {
      setTxStatus('success')
      setTimeout(() => setTxStatus('idle'), 3000)
    }
  }, [txConfirmed])

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setInputAmount('')
      setTxStatus('idle')
      setErrorMsg('')
    }
  }, [isOpen])

  const formattedTokenBalance = tokenBalance
    ? Number(formatUnits(tokenBalance as bigint, 18)).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '0'

  const formattedEthBalance = ethBalance
    ? Number(formatEther(ethBalance.value)).toFixed(6)
    : '0'

  // Format output estimate 
  const formattedOutput = (() => {
    if (!quote) return '—'
    if (isBuy) {
      const tokens = Number(formatUnits(quote.estimatedOutput, 18))
      return tokens.toLocaleString('en-US', { maximumFractionDigits: 2 })
    } else {
      return Number(formatEther(quote.estimatedOutput)).toFixed(6)
    }
  })()

  // Handle swap execution via PoolSwapTest on Base
  const handleSwap = async () => {
    if (!address || !inputAmount || parseFloat(inputAmount) <= 0) return

    // Switch chain if needed
    if (chainId !== base.id) {
      try {
        await switchChain({ chainId: base.id })
      } catch {
        setErrorMsg('Please switch to Base network')
        return
      }
    }

    setErrorMsg('')
    
    try {
      // Fetch poolKey from Factory.launchByToken
      const launchInfo = await publicClient!.readContract({
        address: CONTRACTS.FACTORY as Address,
        abi: FACTORY_ABI,
        functionName: 'launchByToken',
        args: [tokenAddress],
      }) as any

      const poolKey = launchInfo.poolKey

      if (isBuy) {
        // --- BUY: ETH → Token via PoolSwapTest.swap ---
        setTxStatus('swapping')
        const amountInWei = parseEther(inputAmount)

        await writeContractAsync({
          address: POOL_SWAP_TEST_ADDRESS,
          abi: POOL_SWAP_TEST_ABI,
          functionName: 'swap',
          args: [
            poolKey,
            {
              zeroForOne: true,
              amountSpecified: -BigInt(amountInWei), // negative = exact input
              sqrtPriceLimitX96: MIN_SQRT_PRICE,
            },
            {
              takeClaims: false,
              settleUsingBurn: false,
            },
            '0x' as `0x${string}`, // hookData — hook uses tx.origin
          ],
          value: amountInWei,
          chainId: base.id,
          gas: 500_000n,
        })
      } else {
        // --- SELL: Token → ETH via PoolSwapTest.swap ---
        // Need to approve token to PoolSwapTest
        setTxStatus('approving')

        const amountInTokens = parseEther(inputAmount)

        // Check token allowance to PoolSwapTest
        const tokenAllowance = await publicClient!.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [address, POOL_SWAP_TEST_ADDRESS],
        })

        if ((tokenAllowance as bigint) < amountInTokens) {
          // Approve token to PoolSwapTest (max)
          const approveHash = await writeContractAsync({
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [POOL_SWAP_TEST_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
            chainId: base.id,
          })
          // Wait for approval to actually confirm on-chain
          await publicClient!.waitForTransactionReceipt({ hash: approveHash })
        }

        // Now execute the sell
        setTxStatus('swapping')

        await writeContractAsync({
          address: POOL_SWAP_TEST_ADDRESS,
          abi: POOL_SWAP_TEST_ABI,
          functionName: 'swap',
          args: [
            poolKey,
            {
              zeroForOne: false, // Token → ETH
              amountSpecified: -BigInt(amountInTokens), // negative = exact input
              sqrtPriceLimitX96: MAX_SQRT_PRICE,
            },
            {
              takeClaims: false,
              settleUsingBurn: false,
            },
            '0x' as `0x${string}`,
          ],
          chainId: base.id,
          gas: 500_000n,
        })
      }
    } catch (err: any) {
      console.error('Swap error:', err)
      setTxStatus('error')
      setErrorMsg(err.shortMessage || err.message || 'Transaction failed')
    }
  }

  // Quick amount buttons
  const quickAmounts = isBuy
    ? ['0.001', '0.005', '0.01', '0.05']
    : ['25%', '50%', '75%', '100%']

  const handleQuickAmount = (val: string) => {
    if (isBuy) {
      setInputAmount(val)
    } else {
      // Percentage of token balance
      if (!tokenBalance) return
      const pct = parseInt(val) / 100
      const amount = Number(formatUnits(tokenBalance as bigint, 18)) * pct
      setInputAmount(amount.toFixed(0))
    }
  }

  const isDirect = token.launchType === 'DIRECT'
  const dexscreenerUrl = `https://dexscreener.com/base/${token.token}`

  if (!isOpen) return null

  // DIRECT tokens: show redirect to Dexscreener instead of swap UI
  if (isDirect) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            style={{background:'#0F2F2C', border:'1px solid #00C48C'}}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#00C48C]/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#0F2F2C]" style={{background:'#00C48C'}}>
                  {token.symbol.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white">{token.symbol}</h3>
                  <p className="text-xs text-[#E8F5E9]/70">{token.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-[#E8F5E9]/50 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* DIRECT token info + Dexscreener link */}
            <div className="p-6 space-y-4">
              <div className="rounded-xl p-4 space-y-3 border border-[#00C48C]/20" style={{background:'rgba(0,196,140,0.05)'}}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 rounded-full bg-[#00C48C]/20 text-[#00C48C] text-xs font-bold border border-[#00C48C]/30">
                    DIRECT
                  </span>
                  <span className="text-[#E8F5E9]/70">Hookless Uniswap V4 Pool</span>
                </div>
                <div className="space-y-2 text-xs text-[#E8F5E9]/70">
                  <div className="flex justify-between">
                    <span>Price</span>
                    <span className="font-mono text-white">{token.price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Market Cap</span>
                    <span className="font-mono text-white">{token.mcapUSD}</span>
                  </div>
                </div>
                <p className="text-xs text-[#E8F5E9]/50 leading-relaxed">
                  This token uses a standard Uniswap V4 pool (no custom hook). Trade it on any Uniswap-compatible DEX or aggregator.
                </p>
              </div>

              <a
                href={dexscreenerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl text-base font-bold hover:opacity-90 transition-opacity"
                style={{background:'#00C48C', color:'#0F2F2C'}}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Trade on DexScreener
              </a>

              <a
                href={`https://app.uniswap.org/swap?chain=base&outputCurrency=${token.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all border border-[#00C48C]/40 text-[#E8F5E9] hover:border-[#00C48C] hover:bg-[#00C48C]/10"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M15 3h6v6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 14L21 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Trade on Uniswap
              </a>
            </div>

            <div className="px-4 pb-4">
              <div className="rounded-lg px-3 py-2 text-[10px] text-[#E8F5E9]/40 text-center border border-[#00C48C]/10">
                DIRECT tokens use standard Uniswap V4 pools with 1% LP fee
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center px-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          style={{background:'#0F2F2C', border:'1px solid #00C48C'}}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#00C48C]/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-[#0F2F2C]" style={{background:'#00C48C'}}>
                {token.symbol.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-white">{token.symbol}</h3>
                <p className="text-xs text-[#E8F5E9]/70">{token.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#E8F5E9]/50 hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Buy/Sell Tabs */}
          <div className="flex p-2 mx-4 mt-3 rounded-xl" style={{background:'rgba(0,0,0,0.3)'}}>
            <button
              onClick={() => { setIsBuy(true); setInputAmount('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                isBuy
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-[#9AA4B2] hover:text-white'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => { setIsBuy(false); setInputAmount('') }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                !isBuy
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'text-[#9AA4B2] hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Input */}
          <div className="p-4 space-y-3">
            {/* Balance */}
            <div className="flex items-center justify-between text-xs text-[#9AA4B2]">
              <span>
                {isBuy ? 'ETH Balance' : `${token.symbol} Balance`}
              </span>
              <span className="font-mono">
                {isBuy ? `${formattedEthBalance} ETH` : `${formattedTokenBalance} ${token.symbol}`}
              </span>
            </div>

            {/* Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder={isBuy ? '0.0 ETH' : `0 ${token.symbol}`}
                className="w-full rounded-xl px-4 py-3.5 text-white text-lg font-mono focus:outline-none transition-colors"
                style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(0,196,140,0.3)'}}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#9AA4B2] font-semibold">
                {isBuy ? 'ETH' : token.symbol}
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {quickAmounts.map((val) => (
                <button
                  key={val}
                  onClick={() => handleQuickAmount(val)}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-lg text-[#E8F5E9]/70 hover:text-white hover:border-[#00C48C]/50 transition-all"
                  style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(0,196,140,0.2)'}}
                >
                  {val}
                </button>
              ))}
            </div>

            {/* Arrow Divider */}
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{background:'rgba(0,196,140,0.1)', border:'1px solid rgba(0,196,140,0.3)'}}>
                <svg className="w-4 h-4 text-[#9AA4B2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* Output Estimate */}
            <div className="rounded-xl px-4 py-3.5" style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(0,196,140,0.2)'}}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#9AA4B2] mb-1">You receive (estimate)</div>
                  <div className="text-lg font-mono text-white">
                    {quoteLoading ? (
                      <span className="animate-pulse text-[#555]">Loading...</span>
                    ) : (
                      formattedOutput
                    )}
                  </div>
                </div>
                <span className="text-sm text-[#9AA4B2] font-semibold">
                  {isBuy ? token.symbol : 'ETH'}
                </span>
              </div>
            </div>

            {/* Quote Details */}
            {quote && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-[#E8F5E9]/60">
                  <span>Price</span>
                  <span className="font-mono">1 {token.symbol} = {quote.pricePerToken} ETH</span>
                </div>
                <div className="flex justify-between text-[#E8F5E9]/60">
                  <span>Current Tax</span>
                  <span className={`font-semibold ${quote.isGraduated ? 'text-green-400' : 'text-yellow-400'}`}>
                    {quote.isGraduated ? '0% (Graduated)' : `${(quote.currentTaxBps / 100).toFixed(1)}%`}
                  </span>
                </div>
                <div className="flex justify-between text-[#E8F5E9]/60">
                  <span>Epoch</span>
                  <span className="font-mono">{quote.currentEpoch}</span>
                </div>
                <div className="flex justify-between text-[#E8F5E9]/60">
                  <span>Market Cap</span>
                  <span className="font-mono">{quote.mcapETH} ETH</span>
                </div>
                <div className="flex justify-between text-[#E8F5E9]/60">
                  <span>Price Impact</span>
                  <span className={`font-mono ${quote.priceImpact > 5 ? 'text-red-400' : 'text-green-400'}`}>
                    ~{quote.priceImpact.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-[#E8F5E9]/60">
                  <span>Slippage</span>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="font-mono text-[#00C48C] hover:underline"
                  >
                    {slippage}%
                  </button>
                </div>
              </div>
            )}

            {/* Slippage Settings */}
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="flex gap-2 pt-1"
              >
                {[1, 3, 5, 10, 20].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSlippage(s); setShowSettings(false) }}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      slippage === s
                        ? 'border-[#00C48C]/50 text-[#00C48C]'
                        : 'text-[#E8F5E9]/60 hover:border-[#00C48C]/30'
                    }`}
                    style={slippage === s ? {background:'rgba(0,196,140,0.15)', borderColor:'rgba(0,196,140,0.5)'} : {background:'rgba(0,0,0,0.3)', borderColor:'rgba(0,196,140,0.15)'}}
                  >
                    {s}%
                  </button>
                ))}
              </motion.div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={
                !address ||
                !inputAmount ||
                parseFloat(inputAmount || '0') <= 0 ||
                txStatus === 'swapping' ||
                txStatus === 'approving' ||
                txConfirming
              }
              className={`w-full py-4 rounded-xl text-base font-bold transition-all ${
                !address
                  ? 'cursor-not-allowed'
                  : txStatus === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : txStatus === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'hover:opacity-90 shadow-lg'
              }`}
              style={
                !address
                  ? {background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.3)'}
                  : txStatus === 'success' || txStatus === 'error'
                  ? {}
                  : {background:'#00C48C', color:'#0F2F2C'}
              }
            >
              {!address ? (
                'Connect Wallet'
              ) : txStatus === 'approving' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Approving...
                </span>
              ) : txStatus === 'swapping' || txConfirming ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Swapping...
                </span>
              ) : txStatus === 'success' ? (
                '✓ Swap Successful!'
              ) : txStatus === 'error' ? (
                'Try Again'
              ) : (
                `${isBuy ? 'Buy' : 'Sell'} ${token.symbol}`
              )}
            </button>

            {/* TX link */}
            {txHash && (
              <div className="text-center">
                <a
                  href={`${ETHERSCAN_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00C48C] hover:underline"
                >
                  View on BaseScan ↗
                </a>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-4 pb-4">
            <div className="rounded-lg px-3 py-2 text-[10px] text-[#E8F5E9]/30 text-center border border-[#00C48C]/10">
              Trades via Uniswap V4 on Base • Powered by Claw.click Hooks
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
