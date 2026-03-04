'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { useState, useEffect } from 'react'
import remarkGfm from 'remark-gfm'

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
      <div className="max-w-6xl mx-auto px-4">
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
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold mb-6 mt-8 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-3xl font-bold mt-12 mb-4 text-white border-b border-white/10 pb-3">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-2xl font-semibold mt-8 mb-3 text-white">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-xl font-semibold mt-6 mb-2 text-white/90">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-white/70 leading-relaxed mb-4">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-none space-y-2 mb-4 text-white/70">
                    {children}
                  </ul>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2">
                    <span className="text-[#E8523D] mt-1.5">•</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-2 mb-4 text-white/70 ml-4">
                    {children}
                  </ol>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="w-full border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/[0.03] border-b-2 border-[#E8523D]/30">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-white/10">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-white/10 last:border-r-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-3 text-sm text-white/70 border-r border-white/10 last:border-r-0">
                    {children}
                  </td>
                ),
                code: ({ inline, className, children }) => {
                  return inline ? (
                    <code className="bg-black/50 px-2 py-1 rounded text-[#E8523D] font-mono text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-black/50 border border-white/10 rounded-lg p-4 text-sm text-[#E8523D] font-mono overflow-x-auto">
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="bg-black/50 border border-white/10 rounded-lg p-4 overflow-x-auto my-4">
                    {children}
                  </pre>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-[#E8523D] hover:text-[#FF8C4A] transition-colors underline decoration-[#E8523D]/30 hover:decoration-[#FF8C4A]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                hr: () => (
                  <hr className="my-8 border-t border-white/10" />
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-[#E8523D] pl-4 italic text-white/60 my-4">
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-white">
                    {children}
                  </strong>
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
