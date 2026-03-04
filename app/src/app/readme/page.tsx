'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'

export default function ReadmePage() {
  const [readme, setReadme] = useState('')

  useEffect(() => {
    fetch('/README.md')
      .then(res => res.text())
      .then(text => setReadme(text))
      .catch(() => setReadme('# README\n\nFailed to load README.md'))
  }, [])

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
              README
            </span>
          </h1>
          <p className="text-xl text-white/60">
            Project overview and getting started guide
          </p>
        </motion.div>

        {/* Markdown Content */}
        <article className="prose prose-invert prose-lg max-w-none">
          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-3xl font-bold mt-12 mb-4 text-white">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-2xl font-semibold mt-8 mb-3 text-white">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-white/70 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-2 mb-4 text-white/70">
                    {children}
                  </ul>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.includes('language-')
                  return isBlock ? (
                    <code className="block bg-black/50 border border-white/10 rounded-lg p-4 text-sm text-[#E8523D] font-mono overflow-x-auto">
                      {children}
                    </code>
                  ) : (
                    <code className="bg-black/50 px-2 py-1 rounded text-[#E8523D] font-mono text-sm">
                      {children}
                    </code>
                  )
                },
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {readme}
            </ReactMarkdown>
          </div>
        </article>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-white font-semibold rounded-lg hover:shadow-xl hover:shadow-[#E8523D]/50 transition-all"
            >
              Back to Home
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  )
}
