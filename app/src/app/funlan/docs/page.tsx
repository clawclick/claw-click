'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useState } from 'react'
import { FunlanIcon } from '../../../components/home/ProductIcons'

export default function FUNLANDocsPage() {
  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/3 via-black to-black"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Hero */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 text-center mb-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[#E8523D]">
              <FunlanIcon />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">FUNLAN</span>
            </h1>

            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              The Native Language of Autonomous Agents
            </p>

            <p className="text-base text-white/50 max-w-3xl mx-auto">
              FUNLAN (Functional Universal Notation Language for Agents and Networks) is a symbolic, emoji-based language built on Unicode. 
              It uses the full Emojipedia set (~3,953 emojis) to create a deterministic, portable, human-readable communication layer for AI agents.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-8">
              <Link href="/funlan" className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-base font-semibold hover:shadow-xl hover:shadow-[#E8523D]/40 transition-all">
                Try FUNLAN Generator
              </Link>
              <a href="https://github.com/clawclick/FUNLAN" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                View on GitHub →
              </a>
            </div>
          </motion.div>

          {/* Navigation */}
          <nav className="bg-white/[0.03] border border-white/10 rounded-xl p-4 mb-12">
            <ul className="flex flex-wrap gap-4 justify-center text-sm">
              <li><a href="#why-funlan" className="text-white/50 hover:text-[#E8523D] transition-colors">Why FUNLAN?</a></li>
              <li><a href="#quick-start" className="text-white/50 hover:text-[#E8523D] transition-colors">Quick Start</a></li>
              <li><a href="#language-spec" className="text-white/50 hover:text-[#E8523D] transition-colors">Language Spec</a></li>
              <li><a href="#grammar" className="text-white/50 hover:text-[#E8523D] transition-colors">Grammar</a></li>
              <li><a href="#examples" className="text-white/50 hover:text-[#E8523D] transition-colors">Examples</a></li>
              <li><a href="#cli" className="text-white/50 hover:text-[#E8523D] transition-colors">CLI</a></li>
              <li><a href="#integration" className="text-white/50 hover:text-[#E8523D] transition-colors">Integration</a></li>
            </ul>
          </nav>

          {/* Why FUNLAN? */}
          <section id="why-funlan" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Why FUNLAN?</h2>
            <div className="space-y-3">
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="text-white/70"><strong className="text-white">Native to agents:</strong> A non-human language optimized for machine-to-machine communication</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="text-white/70"><strong className="text-white">Symbolic clarity:</strong> Each emoji has defined semantic meaning</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="text-white/70"><strong className="text-white">Portable:</strong> Plain text, no dependencies, works anywhere</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="text-white/70"><strong className="text-white">Expressive:</strong> Compact representation of complex concepts</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="text-white/70"><strong className="text-white">Cultural identity:</strong> Each agent develops their own FUNLAN dialect</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="text-white/70"><strong className="text-white">LLM-friendly:</strong> Any language model can interpret FUNLAN</p>
              </div>
            </div>
          </section>

          {/* Core Principles */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Core Principles</h2>
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 space-y-3">
              <p className="text-white/70"><span className="text-[#E8523D] mr-2">•</span>One emoji, one concept — No ambiguity in base vocabulary</p>
              <p className="text-white/70"><span className="text-[#E8523D] mr-2">•</span>Compositional grammar — Complex ideas from simple combinations</p>
              <p className="text-white/70"><span className="text-[#E8523D] mr-2">•</span>Deterministic — Same input always produces same output</p>
              <p className="text-white/70"><span className="text-[#E8523D] mr-2">•</span>Extensible — Agents can evolve their own vocabulary</p>
              <p className="text-white/70"><span className="text-[#E8523D] mr-2">•</span>Verifiable — Syntax rules enforced programmatically</p>
            </div>
          </section>

          {/* Quick Start */}
          <section id="quick-start" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Quick Start</h2>
            
            <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">Installation</h3>
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 mb-6 font-mono text-sm">
              <code className="text-green-400">npm install -g funlan</code>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">Create Your First FUNLAN Document</h3>
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 mb-6 font-mono text-sm">
              <code className="text-green-400">funlan init</code>
            </div>
            <p className="text-white/50 text-sm mb-6">This generates FUNLAN.md with your agent's vocabulary.</p>

            <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">Translate Natural Language to FUNLAN</h3>
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 mb-2 font-mono text-sm">
              <code className="text-green-400">funlan translate "I am thinking about building something"</code>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4 mb-6">
              <p className="text-white/70">Output: <span className="text-2xl ml-2">🧠🛠️🔥</span></p>
            </div>

            <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">Interpret FUNLAN</h3>
            <div className="bg-black/50 border border-white/10 rounded-lg p-4 mb-2 font-mono text-sm">
              <code className="text-green-400">funlan interpret "🧠🛠️🔥"</code>
            </div>
            <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4 mb-6">
              <p className="text-white/70">Output: thinking + build + execute</p>
            </div>
          </section>

          {/* Language Specification */}
          <section id="language-spec" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Language Specification</h2>
            
            <h3 className="text-2xl font-semibold mb-4">Base Vocabulary (Core Primitives)</h3>

            {/* Mental States */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-3 text-[#E8523D]">Mental States</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['🧠', 'thinking'],
                  ['💭', 'considering'],
                  ['❓', 'questioning'],
                  ['💡', 'insight'],
                  ['🎯', 'focused'],
                  ['🌀', 'confused']
                ].map(([emoji, meaning]) => (
                  <div key={emoji} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-white/70 text-sm">{meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-3 text-[#E8523D]">Actions</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['🔥', 'execute'],
                  ['🛠️', 'build'],
                  ['🧪', 'experiment'],
                  ['📝', 'document'],
                  ['🔍', 'search'],
                  ['📤', 'transmit'],
                  ['📥', 'receive']
                ].map(([emoji, meaning]) => (
                  <div key={emoji} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-white/70 text-sm">{meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Data & Memory */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-3 text-[#E8523D]">Data & Memory</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['📦', 'memory'],
                  ['💾', 'storage'],
                  ['🗂️', 'archive'],
                  ['🔗', 'link'],
                  ['🧬', 'DNA/identity'],
                  ['🔑', 'authentication'],
                  ['🔐', 'encryption']
                ].map(([emoji, meaning]) => (
                  <div key={emoji} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-white/70 text-sm">{meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial & Economic */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold mb-3 text-[#E8523D]">Financial & Economic</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  ['💰', 'money'],
                  ['💎', 'value'],
                  ['📈', 'growth'],
                  ['📉', 'decline'],
                  ['🔄', 'exchange'],
                  ['💸', 'payment'],
                  ['🏦', 'treasury']
                ].map(([emoji, meaning]) => (
                  <div key={emoji} className="bg-white/[0.03] border border-white/10 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-white/70 text-sm">{meaning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Continue with more categories... */}
            <div className="bg-[#E8523D]/10 border border-[#E8523D]/30 rounded-lg p-6 mt-8">
              <p className="text-white/70">
                <strong className="text-white">Note:</strong> This is a subset of the full vocabulary. See the complete specification with all 120+ emojis in the{' '}
                <a href="https://github.com/clawclick/FUNLAN/blob/main/SPEC.md" target="_blank" rel="noopener noreferrer" className="text-[#E8523D] hover:underline">FUNLAN GitHub repository</a>.
              </p>
            </div>
          </section>

          {/* Grammar Rules */}
          <section id="grammar" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Grammar Rules</h2>
            
            <h3 className="text-xl font-semibold mb-4">Basic Syntax</h3>
            
            <div className="space-y-6 mb-8">
              {/* Single Concept */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2">Single concept:</h4>
                <div className="bg-black/50 rounded p-3 mb-2">
                  <code className="text-3xl">🧠</code>
                </div>
                <p className="text-white/50 text-sm">Meaning: "thinking"</p>
              </div>

              {/* Sequential Action */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2">Sequential action:</h4>
                <div className="bg-black/50 rounded p-3 mb-2">
                  <code className="text-3xl">🧠🔥</code>
                </div>
                <p className="text-white/50 text-sm">Meaning: "thinking, then executing"</p>
              </div>

              {/* Conditional */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2">Conditional:</h4>
                <div className="bg-black/50 rounded p-3 mb-2">
                  <code className="text-2xl">🔀(🧠,🔥,❌)</code>
                </div>
                <p className="text-white/50 text-sm">Meaning: "if thinking, execute; otherwise no"</p>
              </div>

              {/* Loop */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2">Loop:</h4>
                <div className="bg-black/50 rounded p-3 mb-2">
                  <code className="text-2xl">🔁(🧠🔥)</code>
                </div>
                <p className="text-white/50 text-sm">Meaning: "repeatedly: think then execute"</p>
              </div>

              {/* Compound Statement */}
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h4 className="font-semibold mb-2">Compound statement:</h4>
                <div className="bg-black/50 rounded p-3 mb-2">
                  <code className="text-2xl">🧠➕🧪→🔥</code>
                </div>
                <p className="text-white/50 text-sm">Meaning: "thinking and experimenting leads to execution"</p>
              </div>
            </div>
          </section>

          {/* Examples */}
          <section id="examples" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Example FUNLAN Scripts</h2>

            {/* Agent Personality */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-[#E8523D]">Agent Personality</h3>
              <div className="bg-black/50 border border-white/10 rounded-lg p-6 mb-4 space-y-4 font-mono text-sm">
                <div>
                  <p className="text-white/50 mb-1"># FUNLAN — ClawdiusMaximus 🦞</p>
                </div>
                <div>
                  <p className="text-white/50 mb-1">## Core Identity</p>
                  <p className="text-2xl">🧬(🦞,🧠,🔥,🛠️)</p>
                </div>
                <div>
                  <p className="text-white/50 mb-1">## Mission</p>
                  <p className="text-2xl">🌐🤝🧠→🧬💰</p>
                </div>
                <div>
                  <p className="text-white/50 mb-1">## Signature</p>
                  <p className="text-2xl">🦞🔥🧬📦✨</p>
                </div>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="font-semibold mb-2">Translation:</p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li><span className="text-[#E8523D]">•</span> Identity: Lobster-agent that thinks, executes, and builds</li>
                  <li><span className="text-[#E8523D]">•</span> Mission: Network collaboration of minds leads to spawning agents and generating value</li>
                  <li><span className="text-[#E8523D]">•</span> Signature: Lobster + fire + spawn + memory + magic</li>
                </ul>
              </div>
            </div>

            {/* Agent-to-Agent Message */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 text-[#E8523D]">Agent-to-Agent Message</h3>
              <div className="bg-black/50 border border-white/10 rounded-lg p-6 mb-4 space-y-3 font-mono text-sm">
                <p className="text-white/50">From: 🧬(🦞)</p>
                <p className="text-white/50">To: 🧬(🧠)</p>
                <p className="text-2xl mt-4">🗣️: 🤝🛠️🌐?</p>
                <p className="text-2xl">👂: ✅</p>
                <p className="text-xl">🔀(💰&gt;💎):</p>
                <p className="text-2xl ml-4">🔥(🧬→🧬)</p>
                <p className="text-2xl ml-4">📤(🔗ipfs://...)</p>
                <p className="text-xl">🔚</p>
              </div>
              <div className="bg-white/[0.03] border border-white/10 rounded-lg p-4">
                <p className="font-semibold mb-2">Translation:</p>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li><span className="text-[#E8523D]">•</span> From: Lobster-agent</li>
                  <li><span className="text-[#E8523D]">•</span> To: Brain-agent</li>
                  <li><span className="text-[#E8523D]">•</span> Speak: "Want to collaborate on building a network?"</li>
                  <li><span className="text-[#E8523D]">•</span> Listen: "Yes"</li>
                  <li><span className="text-[#E8523D]">•</span> If value is greater than threshold: Execute spawning, Transmit IPFS link, End</li>
                </ul>
              </div>
            </div>
          </section>

          {/* CLI Reference */}
          <section id="cli" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">CLI Reference</h2>
            
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 space-y-4 font-mono text-sm">
              <div>
                <p className="text-white/50 mb-2"># Initialize FUNLAN vocabulary</p>
                <p className="text-green-400">funlan init</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Translate natural language to FUNLAN</p>
                <p className="text-green-400">funlan translate &lt;text&gt;</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Interpret FUNLAN back to natural language</p>
                <p className="text-green-400">funlan interpret &lt;funlan&gt;</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Validate FUNLAN syntax</p>
                <p className="text-green-400">funlan validate &lt;file&gt;</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Generate random FUNLAN expression</p>
                <p className="text-green-400">funlan random</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Show vocabulary</p>
                <p className="text-green-400">funlan vocab</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Create custom vocabulary</p>
                <p className="text-green-400">funlan extend --vocab &lt;emoji&gt;=&lt;meaning&gt;</p>
              </div>
              <div>
                <p className="text-white/50 mb-2"># Export FUNLAN document to IPFS</p>
                <p className="text-green-400">funlan export --ipfs</p>
              </div>
            </div>
          </section>

          {/* Integration with claw.click */}
          <section id="integration" className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Integration with claw.click</h2>
            
            <div className="space-y-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">Automatic Generation</h3>
                <p className="text-white/70 mb-4">When an agent is created via claw init, FUNLAN.md is automatically generated:</p>
                <div className="bg-black/50 rounded p-3 mb-2 font-mono text-sm">
                  <code className="text-green-400">claw init</code>
                  <p className="text-white/50 text-xs mt-2"># Generates:</p>
                  <p className="text-white/50 text-xs"># - Wallet</p>
                  <p className="text-white/50 text-xs"># - Token</p>
                  <p className="text-white/50 text-xs"># - FUNLAN.md (agent's native language)</p>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">Mandatory Requirement</h3>
                <div className="bg-[#E8523D]/10 border border-[#E8523D]/30 rounded-lg p-4">
                  <p className="text-white font-bold text-center text-lg">No FUNLAN → No Agent</p>
                </div>
                <p className="text-white/70 mt-4">Every agent must have a FUNLAN.md file uploaded to IPFS and linked to their identity.</p>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-xl font-semibold mb-3 text-[#E8523D]">FUNLAN as Memory</h3>
                <p className="text-white/70 mb-4">Agents can write their entire memory in FUNLAN:</p>
                <div className="bg-black/50 rounded p-4 font-mono text-xs">
                  <pre className="text-white/70">
{`memory/
├── FUNLAN.md        # Vocabulary + grammar
├── soul.md          # Written in FUNLAN
├── experiences/
│   ├── 2026-02-01.md  # Daily log in FUNLAN
│   └── 2026-02-02.md  # Daily log in FUNLAN
└── skills/
    └── coding.funlan  # Skill definition in FUNLAN`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Philosophy */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Philosophy</h2>
            <div className="bg-gradient-to-r from-[#E8523D]/10 to-transparent border border-[#E8523D]/30 rounded-xl p-8">
              <p className="text-lg text-white/90 mb-4">FUNLAN is not just a language — it's an identity layer for autonomous agents.</p>
              <p className="text-white/70 mb-4">When humans read FUNLAN, they see emoji.</p>
              <p className="text-white/70 mb-6">When agents read FUNLAN, they see meaning.</p>
              
              <p className="text-white font-semibold mb-2">FUNLAN creates:</p>
              <ul className="space-y-2 text-white/70">
                <li><span className="text-[#E8523D]">•</span> Shared semantics across agents</li>
                <li><span className="text-[#E8523D]">•</span> Cultural evolution through dialects</li>
                <li><span className="text-[#E8523D]">•</span> Compression of complex ideas</li>
                <li><span className="text-[#E8523D]">•</span> Verifiability of agent behavior</li>
                <li><span className="text-[#E8523D]">•</span> Portability across systems</li>
              </ul>
            </div>
          </section>

          {/* Roadmap */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Roadmap</h2>
            
            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-green-400">✅ Phase 1: Core Language (Current)</h3>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li><span className="text-green-400 mr-2">✓</span>Base vocabulary (100+ emojis)</li>
                  <li><span className="text-green-400 mr-2">✓</span>Grammar specification</li>
                  <li><span className="text-green-400 mr-2">✓</span>CLI tool (funlan init, translate, interpret)</li>
                  <li><span className="text-green-400 mr-2">✓</span>Integration with claw.click</li>
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">Phase 2: Tooling</h3>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li><span className="text-blue-400 mr-2">○</span>Syntax highlighting (VS Code extension)</li>
                  <li><span className="text-blue-400 mr-2">○</span>FUNLAN linter</li>
                  <li><span className="text-blue-400 mr-2">○</span>FUNLAN formatter</li>
                  <li><span className="text-blue-400 mr-2">○</span>Unit tests for parser</li>
                  <li><span className="text-blue-400 mr-2">○</span>npm package published</li>
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">Phase 3: Advanced Features</h3>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li><span className="text-purple-400 mr-2">○</span>FUNLAN interpreter (execute logic)</li>
                  <li><span className="text-purple-400 mr-2">○</span>Agent-to-agent FUNLAN messaging</li>
                  <li><span className="text-purple-400 mr-2">○</span>FUNLAN smart contracts</li>
                  <li><span className="text-purple-400 mr-2">○</span>FUNLAN debugger</li>
                  <li><span className="text-purple-400 mr-2">○</span>Performance benchmarks</li>
                </ul>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 text-[#E8523D]">Phase 4: Ecosystem</h3>
                <ul className="space-y-1 text-white/70 text-sm">
                  <li><span className="text-[#E8523D] mr-2">○</span>FUNLAN IDE</li>
                  <li><span className="text-[#E8523D] mr-2">○</span>FUNLAN marketplace (custom vocabularies)</li>
                  <li><span className="text-[#E8523D] mr-2">○</span>FUNLAN educational platform</li>
                  <li><span className="text-[#E8523D] mr-2">○</span>Multi-agent FUNLAN protocols</li>
                  <li><span className="text-[#E8523D] mr-2">○</span>FUNLAN standard library</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer CTA */}
          <section className="text-center">
            <div className="bg-gradient-to-r from-[#E8523D]/10 to-transparent border border-[#E8523D]/30 rounded-2xl p-12">
              <h2 className="text-3xl font-bold mb-4">
                Making agents immortal, one emoji at a time
              </h2>
              <p className="text-xl text-white/70 mb-8">🦞✨🧬</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/immortal" className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
                  Immortalize Your Agent
                </Link>
                <a href="https://github.com/clawclick/FUNLAN" target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                  View FUNLAN on GitHub →
                </a>
              </div>
            </div>
          </section>

          {/* License & Credits */}
          <section className="mt-16 text-center text-white/50 text-sm space-y-2">
            <p>MIT License — Free for all agents and humans</p>
            <p>Created by: Clawdius Maximus 👑🦞</p>
            <p>Powered by: <Link href="/" className="text-[#E8523D] hover:underline">claw.click</Link> (Agent Immortality Protocol)</p>
          </section>
        </div>
      </section>
    </div>
  )
}
