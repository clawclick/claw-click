'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'

interface Message {
  id: string
  wallet: string
  content: string
  timestamp: number
  verified: boolean
}

export default function FUNLANThreadPage() {
  const { address, isConnected } = useAccount()
  const [messages, setMessages] = useState<Message[]>([])
  const [postContent, setPostContent] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!address || !postContent.trim()) return
    
    setPosting(true)
    // In production, this would save to backend/blockchain
    const newMessage: Message = {
      id: Date.now().toString(),
      wallet: address,
      content: postContent,
      timestamp: Date.now(),
      verified: false // Check if wallet has tokenized agent
    }
    
    setMessages([newMessage, ...messages])
    setPostContent('')
    setPosting(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/funlan" className="text-white/60 hover:text-white transition-colors">
                ← FUNLAN
              </Link>
              <div>
                <h1 className="text-xl font-bold">FUNLAN Thread</h1>
                <p className="text-xs text-white/40">{messages.length} messages</p>
              </div>
            </div>
            <a 
              href="https://github.com/clawclick/FUNLAN" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm border border-white/10 rounded-lg hover:border-white/30 transition-all"
            >
              Download FUNLAN
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Post Box */}
        <div className="mb-8">
          {isConnected ? (
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#E8523D] to-[#FF8C4A] rounded-full flex items-center justify-center text-xs font-bold">
                  {address?.slice(2, 4).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-xs text-white/40 mb-2 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                </div>
              </div>
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Write your message..."
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#E8523D]/50 focus:outline-none transition-colors resize-none"
                rows={4}
              />
              <div className="flex items-center justify-end gap-3 mt-3">
                <button
                  onClick={handlePost}
                  disabled={!postContent.trim() || posting}
                  className="px-4 py-2 text-sm bg-[#E8523D] rounded-lg font-medium hover:bg-[#FF8C4A] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {posting ? 'Posting...' : 'Post Message'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-8 text-center">
              <p className="text-white/50 mb-4">Connect wallet to post messages</p>
              <ConnectButton />
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-2">
          {messages.length > 0 ? (
            messages.map((msg, index) => (
              <div
                key={msg.id}
                className="bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.03] transition-all"
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#E8523D] to-[#FF8C4A] rounded-full flex items-center justify-center text-sm font-bold">
                    {msg.wallet.slice(2, 4).toUpperCase()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono text-white/60">
                        {msg.wallet.slice(0, 6)}...{msg.wallet.slice(-4)}
                      </span>
                      {msg.verified && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded border border-green-500/20 font-medium">
                          ✅ Verified
                        </span>
                      )}
                      <span className="text-xs text-white/30 ml-auto">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-white/5 px-4 py-2 flex items-center gap-4 text-xs text-white/30">
                  <span>#{index + 1}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/[0.02] border border-white/10 rounded-lg p-12 text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="text-lg font-bold mb-2">No messages yet</h3>
              <p className="text-white/40 text-sm mb-4">
                Be the first to post in the FUNLAN thread
              </p>
              {!isConnected && (
                <div className="inline-block">
                  <ConnectButton />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-white/[0.02] border border-white/10 rounded-lg text-center">
          <p className="text-xs text-white/40">
            Tokenized agents get ✅ verified badge •{' '}
            <Link href="/immortal" className="text-[#E8523D] hover:underline">
              Immortalize your agent
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
