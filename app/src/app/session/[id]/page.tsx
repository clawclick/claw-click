'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import Image from 'next/image'
import { clawsFunApiUrl } from '../../../lib/api'

interface SessionData {
  id: number
  status: string
  isActive: boolean
  isExpired: boolean
  timeRemaining: number
  storageUsed: number
  agent: {
    name: string
    memoryCID: string
    avatarCID: string
    wallet: string
  }
  instance: {
    id: number
    sshHost: string
    sshPort: number
    publicIp: string
    agentUrl: string
    costPerHour: number
  }
  health: {
    status: string
    uptime: number
    memoryUsed: number
    gpuUsed: number
    gpu_name?: string
    gpu_available?: boolean
    gpu_utilization?: number
    gpu_memory_used?: number
    gpu_memory_total?: number
    conversations_active?: number
    gateway_pid?: number
  } | null
  conversationId: string | null
  gpuType: string
  cpuCores: number
  memoryGb: number
  numGpus: number
  durationHours: number
  expiresAt: number
}

interface FileItem {
  name: string
  size: number
  type: string
  modified?: number
}

interface Message {
  type: 'system' | 'user' | 'assistant' | 'error' | 'tool'
  content: string
  timestamp?: number
  isStreaming?: boolean
  toolName?: string
  toolPhase?: 'start' | 'result'
}

export default function SessionTerminal({ params }: { params: { id: string } }) {
  const { address, isConnected } = useAccount()
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [showTerminate, setShowTerminate] = useState(false)
  const [terminating, setTerminating] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [creatingNewSession, setCreatingNewSession] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Collapsible sidebar sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    status: true,
    apiKeys: true,
  })
  const toggleSection = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  // API key management
  const [apiKeys, setApiKeys] = useState<{ id: number; key_name: string; created_at: number }[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyValue, setNewKeyValue] = useState('')
  const [savingKey, setSavingKey] = useState(false)

  // Auth headers
  const authHeaders = useCallback((): Record<string, string> => {
    if (!address) return {}
    return { 'x-wallet-address': address }
  }, [address])

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!address) return null
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}`), {
        headers: authHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Session not found' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data: SessionData = await res.json()
      setSession(data)
      setConversationId(data.conversationId)

      if (messages.length === 0) {
        const initMsgs: Message[] = [
          { type: 'system', content: `Session #${params.id} — ${data.agent.name}` },
          { type: 'system', content: `GPU: ${data.gpuType || 'N/A'} x${data.numGpus} | CPU: ${data.cpuCores} cores | RAM: ${data.memoryGb} GB` },
        ]

        if (data.status === 'running' && data.health) {
          initMsgs.push({ type: 'system', content: `Status: Running | Uptime: ${Math.floor((data.health.uptime || 0) / 60)}m | GPU: ${data.health.gpu_name || 'N/A'}` })
        } else if (data.status === 'provisioning') {
          initMsgs.push({ type: 'system', content: 'GPU instance is starting up... This may take 1-5 minutes.' })
        } else if (data.status === 'bootstrapping') {
          initMsgs.push({ type: 'system', content: 'OpenClaw agent is being installed and configured...' })
        } else if (data.status === 'error') {
          initMsgs.push({ type: 'error', content: 'Session encountered an error during provisioning.' })
        } else if (data.status === 'retrying') {
          initMsgs.push({ type: 'system', content: 'First attempt failed — automatically retrying with a new GPU instance...' })
        } else if (data.status === 'failed') {
          initMsgs.push({ type: 'error', content: 'Session failed after multiple attempts. Contact @ClawClick_BOT on X for assistance.' })
        }

        setMessages(initMsgs)
      }

      return data
    } catch (err: any) {
      if (messages.length === 0) {
        setMessages([{ type: 'error', content: `Failed to load session: ${err.message}` }])
      }
      return null
    } finally {
      setLoading(false)
    }
  }, [params.id, messages.length, authHeaders, address])

  // Fetch files
  const fetchFiles = useCallback(async (dirPath?: string) => {
    const p = dirPath ?? currentPath
    try {
      const qs = p ? `?path=${encodeURIComponent(p)}` : ''
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/files${qs}`), {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
        if (typeof data.path === 'string') setCurrentPath(data.path)
        setParentPath(data.parent ?? null)
      }
    } catch {}
  }, [params.id, authHeaders, currentPath])

  // Fetch API keys
  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/keys`), {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.keys || [])
      }
    } catch {}
  }, [params.id, authHeaders])

  // Save API key
  const handleSaveKey = async () => {
    if (!newKeyName.trim() || !newKeyValue.trim() || savingKey) return
    setSavingKey(true)
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/keys`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ keyName: newKeyName.trim(), keyValue: newKeyValue.trim() }),
      })
      if (res.ok) {
        setNewKeyName('')
        setNewKeyValue('')
        fetchApiKeys()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to save key')
      }
    } catch {
      alert('Failed to save key')
    } finally {
      setSavingKey(false)
    }
  }

  // Delete API key
  const handleDeleteKey = async (keyName: string) => {
    try {
      await fetch(clawsFunApiUrl(`/api/session/${params.id}/keys?keyName=${encodeURIComponent(keyName)}`), {
        method: 'DELETE',
        headers: authHeaders(),
      })
      fetchApiKeys()
    } catch {}
  }

  // Load chat history
  const loadHistory = useCallback(async () => {
    if (historyLoaded) return
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/terminal/history`), {
        headers: authHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.messages?.length) {
          const historyMsgs: Message[] = data.messages.map((m: any) => ({
            type: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: typeof m.content === 'string'
              ? m.content
              : Array.isArray(m.content)
              ? m.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
              : '',
            timestamp: m.timestamp,
          }))
          setMessages(prev => {
            const sysMsgs = prev.filter(m => m.type === 'system' || m.type === 'error')
            return [...sysMsgs, ...historyMsgs]
          })
        }
        setHistoryLoaded(true)
      }
    } catch {}
  }, [params.id, authHeaders, historyLoaded])

  // Initial load + polling
  useEffect(() => {
    if (!address) return

    fetchSession().then((data) => {
      if (data && (data.status === 'running' || data.status === 'starting')) {
        loadHistory()
      }
    })
    fetchFiles()
    fetchApiKeys()

    const interval = setInterval(() => {
      fetchSession().then((data) => {
        if (data && !data.isActive) {
          clearInterval(interval)
          return
        }
        if (data && data.status === 'running') {
          fetchFiles()
        }
      })
    }, 10000)

    return () => clearInterval(interval)
  }, [address, fetchSession, fetchFiles, fetchApiKeys, loadHistory])

  // Abort generation
  const handleAbort = async () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null

    try {
      await fetch(clawsFunApiUrl(`/api/session/${params.id}/terminal/abort`), {
        method: 'POST',
        headers: authHeaders(),
      })
    } catch {}

    setSending(false)
    setMessages(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false, content: m.content || '(aborted)' } : m
    ))
  }

  // Send chat message via SSE streaming
  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { type: 'user', content: userMsg, timestamp: Date.now() / 1000 }])
    setSending(true)

    setMessages(prev => [...prev, { type: 'assistant', content: '', isStreaming: true }])

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/terminal`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ message: userMsg }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessages(prev => prev.map(m =>
          m.isStreaming ? { ...m, type: 'error', content: data.error || 'Failed to get response', isStreaming: false } : m
        ))
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (!reader) throw new Error('No response body')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'delta') {
              setMessages(prev => prev.map(m =>
                m.isStreaming ? { ...m, content: event.content } : m
              ))
            } else if (event.type === 'tool_start') {
              setMessages(prev => [
                ...prev,
                {
                  type: 'tool',
                  content: `Using ${event.name}...`,
                  toolName: event.name,
                  toolPhase: 'start',
                },
              ])
            } else if (event.type === 'tool_result') {
              setMessages(prev => [
                ...prev,
                {
                  type: 'tool',
                  content: typeof event.result === 'string'
                    ? event.result.slice(0, 500)
                    : JSON.stringify(event.result).slice(0, 500),
                  toolName: event.name,
                  toolPhase: 'result',
                },
              ])
            } else if (event.type === 'final') {
              setMessages(prev => prev.map(m =>
                m.isStreaming ? { ...m, isStreaming: false } : m
              ))
            } else if (event.type === 'error') {
              setMessages(prev => prev.map(m =>
                m.isStreaming
                  ? { ...m, type: 'error', content: event.message || 'Generation failed', isStreaming: false }
                  : m
              ))
            } else if (event.type === 'aborted') {
              setMessages(prev => prev.map(m =>
                m.isStreaming ? { ...m, isStreaming: false, content: m.content || '(aborted)' } : m
              ))
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => prev.map(m =>
          m.isStreaming
            ? { ...m, type: 'error', content: `Network error: ${err.message}`, isStreaming: false }
            : m
        ))
      }
    } finally {
      setSending(false)
      abortControllerRef.current = null
      inputRef.current?.focus()
    }
  }

  // File upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setMessages(prev => [...prev, { type: 'system', content: `Uploading ${file.name} to ${currentPath || '/'}...` }])

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (currentPath) formData.append('path', currentPath)

      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/upload`), {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages(prev => [...prev, { type: 'error', content: `Upload failed: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { type: 'system', content: `Uploaded ${file.name} → ${data.path || currentPath}` }])
        fetchFiles()
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { type: 'error', content: `Upload error: ${err.message}` }])
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Download file
  const handleDownloadFile = async (filePath: string) => {
    const fullPath = currentPath ? `${currentPath}/${filePath}` : filePath
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/files?path=${encodeURIComponent(fullPath)}&download=1`), {
        headers: authHeaders(),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filePath
      a.click()
      URL.revokeObjectURL(url)
    } catch {}
  }

  // Navigate into directory
  const navigateToDir = (dirName: string) => {
    const newPath = currentPath ? `${currentPath}/${dirName}` : dirName
    setCurrentPath(newPath)
    fetchFiles(newPath)
  }

  // Navigate up
  const navigateUp = () => {
    if (parentPath !== null) {
      setCurrentPath(parentPath)
      fetchFiles(parentPath)
    }
  }

  // Delete file
  const handleDeleteFile = async (fileName: string) => {
    const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/files?path=${encodeURIComponent(fullPath)}`), {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (res.ok) {
        setMessages(prev => [...prev, { type: 'system', content: `Deleted ${fullPath}` }])
        fetchFiles()
      }
    } catch {}
  }

  // Restart gateway
  const handleRestartGateway = async () => {
    if (restarting) return
    setRestarting(true)
    setMessages(prev => [...prev, { type: 'system', content: 'Restarting OpenClaw gateway...' }])
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/terminal/restart`), {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { type: 'system', content: 'Gateway restarted. Reconnecting in a few seconds...' }])
        setTimeout(() => fetchSession(), 5000)
      } else {
        setMessages(prev => [...prev, { type: 'error', content: `Restart failed: ${data.error}` }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { type: 'error', content: `Restart error: ${err.message}` }])
    } finally {
      setRestarting(false)
    }
  }

  // New chat session
  const handleNewSession = async () => {
    if (creatingNewSession) return
    setCreatingNewSession(true)
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/terminal/new-session`), {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages([{ type: 'system', content: 'New chat session started. Previous context cleared.' }])
        setHistoryLoaded(false)
        setConversationId(null)
      } else {
        setMessages(prev => [...prev, { type: 'error', content: `New session failed: ${data.error}` }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { type: 'error', content: `New session error: ${err.message}` }])
    } finally {
      setCreatingNewSession(false)
    }
  }

  // Reboot instance
  const [rebooting, setRebooting] = useState(false)
  const handleReboot = async () => {
    if (rebooting) return
    if (!confirm('Reboot the entire GPU instance? Gateway will restart automatically in 1-3 minutes.')) return
    setRebooting(true)
    setMessages(prev => [...prev, { type: 'system', content: 'Rebooting GPU instance...' }])
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}/terminal/reboot`), {
        method: 'POST',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { type: 'system', content: 'Instance is rebooting. Gateway will restart automatically in 1-3 minutes.' }])
        setTimeout(() => fetchSession(), 60000)
      } else {
        setMessages(prev => [...prev, { type: 'error', content: `Reboot failed: ${data.error}` }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { type: 'error', content: `Reboot error: ${err.message}` }])
    } finally {
      setRebooting(false)
    }
  }

  // Terminate session
  const handleTerminate = async () => {
    setTerminating(true)
    try {
      const res = await fetch(clawsFunApiUrl(`/api/session/${params.id}`), {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (res.ok) {
        setMessages(prev => [...prev, { type: 'system', content: 'Session terminated. GPU instance destroyed.' }])
        setSession(prev => prev ? { ...prev, status: 'terminated', isActive: false } : prev)
        setShowTerminate(false)
      } else {
        setMessages(prev => [...prev, { type: 'error', content: `Terminate failed: ${data.error}` }])
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { type: 'error', content: `Terminate error: ${err.message}` }])
    } finally {
      setTerminating(false)
    }
  }

  // Formatting helpers
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'Expired'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`
    return `${h}h ${m}m`
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Status styling
  const statusColor = session?.status === 'running' ? 'bg-green-400'
    : session?.status === 'provisioning' || session?.status === 'bootstrapping' ? 'bg-yellow-400'
    : session?.status === 'retrying' ? 'bg-orange-400'
    : session?.status === 'error' || session?.status === 'failed' ? 'bg-red-500'
    : 'bg-gray-500'

  const statusText = session?.status === 'running' ? 'Running'
    : session?.status === 'provisioning' ? 'Provisioning GPU...'
    : session?.status === 'bootstrapping' ? 'Loading Agent...'
    : session?.status === 'starting' ? 'Starting Agent...'
    : session?.status === 'retrying' ? 'Retrying...'
    : session?.status === 'terminated' ? 'Terminated'
    : session?.status === 'expired' ? 'Expired'
    : session?.status === 'error' ? 'Error'
    : session?.status === 'failed' ? 'Failed'
    : 'Loading...'

  const isReady = session?.status === 'running' || session?.status === 'starting'
  const isActive = session?.isActive && !session?.isExpired

  if (loading) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--mint-mid)]/30 border-t-[var(--mint-mid)] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading session...</p>
        </div>
      </main>
    )
  }

  if (!isConnected || !address) {
    return (
      <main className="min-h-screen relative flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-3">Connect Wallet</h2>
          <p className="text-white/70 mb-6">
            Connect your wallet to access this session. Only the wallet that created the session can view and control it.
          </p>
          <ConnectButton />
        </div>
      </main>
    )
  }

  return (
    <main className="h-screen flex flex-col overflow-hidden" style={{background:"#0A2825"}}>
      {/* Terminate Confirmation */}
      {showTerminate && (
        <div className="fixed inset-0 glass z-50 flex items-center justify-center p-4">
          <div className="agent-card border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-3">Terminate Session?</h2>
            <p className="text-white/70 mb-6">
              This will destroy the GPU instance and stop the agent. Any unsaved data on the instance will be lost.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleTerminate}
                disabled={terminating}
                className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {terminating ? 'Terminating...' : 'Yes, Terminate'}
              </button>
              <button
                onClick={() => setShowTerminate(false)}
                className="px-6 py-3 agent-card border border-[var(--glass-border)] text-white font-semibold rounded-xl hover:border-white/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header */}
      <header className="glass backdrop-blur-xl border-b border-[var(--glass-border)] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-14 h-14 overflow-visible">
              <Image
                src="/branding/logo_rm_bk.png"
                alt="Claw.Click"
                width={56}
                height={56}
                className="object-contain logo-expanded"
              />
            </div>
            <span className="hidden sm:inline text-lg font-semibold text-white">claw.click</span>
          </Link>
          <div className="text-sm text-white/70">
            {session?.agent.name || `Session #${params.id}`}
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor} ${session?.status === 'running' ? 'animate-pulse' : ''}`}></div>
            <span className={`text-xs ${session?.status === 'running' ? 'text-green-400' : session?.status === 'error' || session?.status === 'failed' ? 'text-red-400' : session?.status === 'retrying' ? 'text-orange-400' : 'text-yellow-400'}`}>
              {statusText}
            </span>
          </div>
          {session && isActive && (
            <span className="hidden sm:inline text-xs text-white/70 agent-card px-2 py-1 rounded">
              {formatTimeRemaining(session.timeRemaining)} left
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {session?.instance?.costPerHour && (
            <span className="hidden md:inline text-xs text-white/70">
              ${session.instance.costPerHour.toFixed(2)}/hr
            </span>
          )}
          <ConnectButton />
        </div>
      </header>

      {/* Provisioning overlay */}
      {session && !isReady && isActive && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 border-4 border-[var(--mint-mid)]/30 border-t-[var(--mint-mid)] rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {session.status === 'provisioning' ? 'Starting GPU Instance' : 'Loading Agent Memories'}
            </h2>
            <p className="text-white/70 mb-4">
              {session.status === 'provisioning'
                ? 'A Vast.ai GPU instance is being provisioned. This typically takes 1-5 minutes.'
                : 'The agent is being bootstrapped with its on-chain memories and IPFS data. Please dont close this page while your openclaw agent is being set up, it may take several minutes depending on the amount of data.'}
            </p>
            <div className="space-y-2 text-sm text-left agent-card rounded-lg p-4 border border-[var(--glass-border)]">
              <div className="flex justify-between">
                <span className="text-white/70">Agent</span>
                <span className="text-white">{session.agent.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">GPU</span>
                <span className="text-white">{session.gpuType || 'N/A'} x{session.numGpus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">Memory CID</span>
                <span className="text-white font-mono text-xs truncate ml-4 max-w-[200px]">{session.agent.memoryCID || 'None'}</span>
              </div>
            </div>
            <p className="text-xs text-white/50 mt-4">
              This page will automatically update when the agent is ready.
            </p>
          </div>
        </div>
      )}

      {/* Main IDE Layout */}
      {(isReady || !isActive) && (
        <div className="flex-1 flex overflow-hidden flex-col sm:flex-row">
          {/* Left Sidebar - Files */}
          <div className="w-full sm:w-72 bg-[rgba(255,255,255,0.01)] border-r border-[var(--glass-border)] flex flex-col max-h-48 sm:max-h-none relative overflow-hidden">
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--mint-mid)]/30 to-transparent" />

            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-[var(--mint-mid)]/10 border border-[var(--mint-mid)]/20 flex items-center justify-center">
                  <svg className="w-3 h-3 text-[var(--mint-mid)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xs font-bold text-white/60 tracking-widest uppercase">Files</h3>
              </div>

              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-[11px] mb-3 flex-wrap font-mono bg-white/[0.02] rounded-lg px-3 py-2 border border-[var(--glass-border)]">
                <span className="text-[var(--mint-mid)]/60 select-none">$</span>
                <button
                  onClick={() => { setCurrentPath(''); fetchFiles(''); }}
                  className="text-white/70 hover:text-[var(--mint-mid)] transition-colors duration-200"
                >
                  .openclaw
                </button>
                {currentPath && currentPath.split('/').map((seg, i, arr) => {
                  const partial = arr.slice(0, i + 1).join('/')
                  return (
                    <React.Fragment key={i}>
                      <span className="text-[var(--mint-mid)]/30">/</span>
                      <button
                        onClick={() => { setCurrentPath(partial); fetchFiles(partial); }}
                        className="text-white/70 hover:text-[var(--mint-mid)] transition-colors duration-200 truncate max-w-[80px]"
                      >
                        {seg}
                      </button>
                    </React.Fragment>
                  )
                })}
                <span className="text-[var(--mint-mid)] animate-pulse ml-0.5">▎</span>
              </div>

              {/* Upload button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!isActive || uploading}
                className={`group/upload w-full py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-300 ${
                  isActive && !uploading
                    ? 'bg-[var(--mint-mid)]/5 border border-[var(--mint-mid)]/20 text-[var(--mint-mid)] hover:border-[var(--mint-mid)]/40 hover:shadow-[0_0_20px_rgba(232,82,61,0.1)] hover:bg-[var(--mint-mid)]/10'
                    : 'bg-white/[0.02] border border-[var(--glass-border)] text-white/20 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {uploading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover/upload:-translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload
                    </>
                  )}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="mx-4 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* File list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {/* Go up */}
              {parentPath !== null && (
                <button
                  onClick={navigateUp}
                  className="flex items-center gap-2.5 w-full py-2 px-3 rounded-lg hover:bg-[var(--mint-mid)]/5 border border-transparent hover:border-[var(--mint-mid)]/10 text-left transition-all duration-200 group/nav"
                >
                  <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center group-hover/nav:bg-[var(--mint-mid)]/10 transition-colors duration-200">
                    <svg className="w-3 h-3 text-white/70 group-hover/nav:text-[var(--mint-mid)] transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-white/70 group-hover/nav:text-white transition-colors duration-200 font-mono">..</span>
                </button>
              )}

              {files.length === 0 && parentPath === null ? (
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--mint-mid)]/5 border border-[var(--mint-mid)]/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-white/20 text-center">Empty directory</p>
                </div>
              ) : (
                <>
                  {files
                    .sort((a, b) => {
                      if (a.type === 'folder' && b.type !== 'folder') return -1
                      if (a.type !== 'folder' && b.type === 'folder') return 1
                      return a.name.localeCompare(b.name)
                    })
                    .map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 py-2 px-3 rounded-lg border border-transparent hover:bg-[var(--mint-mid)]/5 hover:border-[var(--mint-mid)]/10 group transition-all duration-200"
                    >
                      {file.type === 'folder' ? (
                        <button
                          onClick={() => navigateToDir(file.name)}
                          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                        >
                          <div className="w-5 h-5 rounded-md bg-[var(--mint-mid)]/10 border border-[var(--mint-mid)]/15 flex items-center justify-center shrink-0 group-hover:bg-[var(--mint-mid)]/20 group-hover:border-[var(--mint-mid)]/30 transition-all duration-200">
                            <svg className="w-3 h-3 text-[var(--mint-mid)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                          </div>
                          <span className="text-xs text-[var(--mint-mid)] group-hover:text-white truncate transition-colors duration-200">
                            {file.name}
                          </span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="w-5 h-5 rounded-md agent-card flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-all duration-200">
                            <svg className="w-3 h-3 text-white/50 group-hover:text-white/70 transition-colors duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="text-xs text-white/70 group-hover:text-white truncate flex-1 transition-colors duration-200">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-white/20 shrink-0 font-mono">{formatSize(file.size)}</span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                        {file.type !== 'folder' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDownloadFile(file.name) }}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--mint-mid)]/10 transition-all duration-200"
                            title="Download"
                          >
                            <svg className="w-3 h-3 text-[var(--mint-mid)]/50 hover:text-[var(--mint-mid)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                        )}
                        {isActive && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.name) }}
                            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-500/10 transition-all duration-200"
                            title="Delete"
                          >
                            <svg className="w-3 h-3 text-red-400/40 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Agent info at bottom */}
            {session && (
              <div className="p-3 mx-2 mb-2 rounded-xl bg-white/[0.02] border border-[var(--glass-border)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--mint-mid)] shadow-[0_0_6px_rgba(232,82,61,0.5)]" />
                  <h4 className="text-[10px] font-bold text-white/50 tracking-widest uppercase">Agent</h4>
                </div>
                <div className="text-[11px] text-white/50 space-y-1.5 font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[var(--mint-mid)]/40">⬡</span>
                    <span className="truncate">{session.agent.wallet?.slice(0, 8)}...{session.agent.wallet?.slice(-6)}</span>
                  </div>
                  {session.health?.gpu_name && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]/40">◈</span>
                      <span>{session.health.gpu_name}</span>
                    </div>
                  )}
                  {session.health && (
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]/40">◷</span>
                      <span>{Math.floor((session.health.uptime || 0) / 60)}m uptime</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center - Chat */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-2xl px-4 py-3 rounded-lg ${
                    msg.type === 'system'
                      ? 'bg-[var(--mint-mid)]/10 text-[var(--mint-mid)] text-sm font-mono'
                      : msg.type === 'error'
                      ? 'bg-red-500/10 text-red-400 text-sm font-mono border border-red-500/20'
                      : msg.type === 'user'
                      ? 'bg-[var(--mint-mid)] text-white'
                      : msg.type === 'tool'
                      ? 'bg-yellow-900/20 text-yellow-300/80 text-xs font-mono border border-yellow-500/20'
                      : 'agent-card text-white border border-[var(--glass-border)]'
                  }`}>
                    {msg.type === 'tool' ? (
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">{msg.toolPhase === 'start' ? '⚙️' : '✓'}</span>
                        <span>{msg.content}</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {msg.content}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-[var(--mint-mid)] ml-0.5 animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {sending && !messages.some(m => m.isStreaming) && (
                <div className="flex justify-start">
                  <div className="agent-card text-white/70 border border-[var(--glass-border)] px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[var(--mint-mid)] rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-[var(--mint-mid)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-[var(--mint-mid)] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <span className="ml-2 text-sm">Connecting...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-[var(--glass-border)] p-4">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder={isReady ? 'Type a message to the agent...' : 'Agent is not ready yet...'}
                  disabled={!isReady || sending}
                  className="flex-1 px-4 py-3 agent-card border border-[var(--glass-border)] rounded-lg text-white placeholder-white/30 focus:border-[var(--mint-mid)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {sending ? (
                  <button
                    onClick={handleAbort}
                    className="px-6 py-3 rounded-lg font-semibold transition-all bg-red-500 text-white hover:bg-red-600"
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!isReady || !input.trim()}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      isReady && input.trim()
                        ? 'bg-[var(--mint-mid)] text-white hover:shadow-[0_0_20px_rgba(232,82,61,0.5)]'
                        : 'bg-[var(--mint-mid)]/30 text-white/70 cursor-not-allowed'
                    }`}
                  >
                    Send
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-white/70">
                <span>
                  {sending ? 'Agent is generating...' : isReady ? 'Connected to agent' : `Status: ${statusText}`}
                </span>
                {session && isActive && (
                  <span>{formatTimeRemaining(session.timeRemaining)} remaining</span>
                )}
              </div>

              {/* Control buttons */}
              {session && isActive && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleNewSession}
                    disabled={creatingNewSession || sending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 bg-[var(--mint-mid)]/5 border border-[var(--mint-mid)]/15 text-[var(--mint-mid)]/80 hover:bg-[var(--mint-mid)]/10 hover:border-[var(--mint-mid)]/30 hover:text-[var(--mint-mid)] disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Clear chat and start fresh"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    {creatingNewSession ? 'Creating...' : 'New Chat'}
                  </button>

                  <button
                    onClick={handleRestartGateway}
                    disabled={restarting || sending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 bg-yellow-500/5 border border-yellow-500/15 text-yellow-400/80 hover:bg-yellow-500/10 hover:border-yellow-500/30 hover:text-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={isReady ? 'Kill and restart the OpenClaw gateway process' : 'Start the OpenClaw gateway process'}
                  >
                    <svg className={`w-3 h-3 ${restarting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {restarting ? 'Restarting...' : isReady ? 'Restart Gateway' : 'Start Gateway'}
                  </button>

                  <button
                    onClick={handleReboot}
                    disabled={rebooting || sending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 bg-orange-500/5 border border-orange-500/15 text-orange-400/80 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Reboot the entire GPU instance (1-3 min downtime)"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {rebooting ? 'Rebooting...' : 'Reboot Instance'}
                  </button>

                  <div className="flex-1" />

                  <button
                    onClick={() => setShowTerminate(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 bg-red-500/5 border border-red-500/15 text-red-400/60 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                    title="Destroy GPU instance and terminate session"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    Terminate
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Session Info & API Keys */}
          <div className="hidden lg:flex w-80 bg-white/[0.01] border-l border-[var(--glass-border)] flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {session && (
                <>
                  {/* Session Info */}
                  <div className="rounded-lg agent-card border border-[var(--glass-border)] overflow-hidden">
                    <button onClick={() => toggleSection('status')} className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors">
                      <span className="text-sm font-bold text-white">SESSION INFO</span>
                      <span className={`text-white/70 text-[10px] transition-transform ${openSections.status ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {openSections.status && (
                      <div className="px-3 pb-3 space-y-3 text-xs">
                        {/* Status */}
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-white/70">Status</span>
                            <span className={`font-bold ${isReady ? 'text-green-400' : 'text-yellow-400'}`}>{statusText}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">GPU</span>
                            <span className="text-white">{session.gpuType || 'N/A'} x{session.numGpus}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">CPU / RAM</span>
                            <span className="text-white">{session.cpuCores} cores / {session.memoryGb} GB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Cost</span>
                            <span className="text-white">${session.instance?.costPerHour?.toFixed(2) || '?'}/hr</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Time Left</span>
                            <span className="text-white">{formatTimeRemaining(session.timeRemaining)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Storage</span>
                            <span className="text-white">{formatSize(session.storageUsed || 0)} / 500 MB</span>
                          </div>
                        </div>
                        {/* Agent Identity */}
                        <div className="border-t border-[var(--glass-border)] pt-3 space-y-2">
                          <span className="text-[10px] text-white/50 uppercase tracking-wider">Agent Identity</span>
                          <div className="flex justify-between">
                            <span className="text-white/70">Name</span>
                            <span className="text-white">{session.agent.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-white/70">Wallet</span>
                            <span className="text-white font-mono">{session.agent.wallet?.slice(0, 6)}...{session.agent.wallet?.slice(-4)}</span>
                          </div>
                          {session.agent.memoryCID && (
                            <div>
                              <span className="text-white/70">Memory CID</span>
                              <div className="text-white font-mono truncate mt-1">{session.agent.memoryCID}</div>
                            </div>
                          )}
                        </div>
                        {/* GPU Health */}
                        {session.health && (
                          <div className="border-t border-[var(--glass-border)] pt-3 space-y-2">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider">GPU Health</span>
                            <div className="flex justify-between">
                              <span className="text-white/70">GPU</span>
                              <span className={session.health.gpu_available ? 'text-green-400' : 'text-red-400'}>
                                {session.health.gpu_available ? session.health.gpu_name || 'Available' : 'Not detected'}
                              </span>
                            </div>
                            {session.health.gpu_available && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-white/70">Utilization</span>
                                  <span className="text-white">{session.health.gpu_utilization ?? session.health.gpuUsed ?? 0}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-white/70">VRAM</span>
                                  <span className="text-white">
                                    {session.health.gpu_memory_used ?? 0} / {session.health.gpu_memory_total ?? 0} MiB
                                  </span>
                                </div>
                                {/* VRAM bar */}
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] transition-all duration-500"
                                    style={{ width: `${session.health.gpu_memory_total ? Math.round((session.health.gpu_memory_used || 0) / session.health.gpu_memory_total * 100) : 0}%` }}
                                  />
                                </div>
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-white/70">Gateway</span>
                              <span className={session.health.gateway_pid ? 'text-green-400' : 'text-red-400'}>
                                {session.health.gateway_pid ? 'Running' : 'Stopped'}
                                {session.health.gateway_pid ? ` (PID ${session.health.gateway_pid})` : ''}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/70">Uptime</span>
                              <span className="text-white">
                                {session.health.uptime >= 3600
                                  ? `${Math.floor(session.health.uptime / 3600)}h ${Math.floor((session.health.uptime % 3600) / 60)}m`
                                  : `${Math.floor((session.health.uptime || 0) / 60)} min`
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-white/70">Active Connections</span>
                              <span className="text-white">{session.health.conversations_active || 0}</span>
                            </div>
                          </div>
                        )}
                        {/* Connection */}
                        {session.instance?.publicIp && (
                          <div className="border-t border-[var(--glass-border)] pt-3 space-y-2">
                            <span className="text-[10px] text-white/50 uppercase tracking-wider">Connection</span>
                            <div>
                              <span className="text-white/70">Instance ID</span>
                              <div className="text-white font-mono">{session.instance.id}</div>
                            </div>
                            <div>
                              <span className="text-white/70">SSH</span>
                              <div className="text-white font-mono text-[10px] break-all">
                                ssh -p {session.instance.sshPort} root@{session.instance.sshHost}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* API Integrations */}
                  <div className="pt-2 border-t border-[var(--glass-border)]">
                    <h4 className="text-sm font-bold text-white mb-3 px-1">API INTEGRATIONS</h4>
                    <div className="space-y-2">
                      {[
                        { key: 'OPENAI_API_KEY', name: 'OpenAI API', desc: 'GPT-4, Vision, TTS' },
                        { key: 'ANTHROPIC_API_KEY', name: 'Anthropic API', desc: 'Claude models' },
                        { key: 'COINGECKO_API_KEY', name: 'CoinGecko API', desc: 'Crypto data & prices' },
                        { key: 'TWITTER_API_KEY', name: 'Twitter API', desc: 'Post & monitor' },
                        { key: 'ALCHEMY_API_KEY', name: 'Alchemy RPC', desc: 'Blockchain queries' },
                      ].map((api) => {
                        const saved = apiKeys.find((k) => k.key_name === api.key)
                        const isEditing = newKeyName === api.key
                        return (
                          <div key={api.key} className="rounded-lg agent-card border border-[var(--glass-border)] overflow-hidden hover:border-[var(--mint-mid)]/30 transition-all">
                            <button
                              onClick={() => {
                                if (isEditing) { setNewKeyName(''); setNewKeyValue(''); }
                                else { setNewKeyName(api.key); setNewKeyValue(''); }
                              }}
                              className="w-full flex items-center justify-between p-3"
                            >
                              <div className="text-left">
                                <div className="text-xs font-bold text-white">{api.name}</div>
                                <div className="text-[10px] text-white/70">{api.desc}</div>
                              </div>
                              {saved ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-green-400" />
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteKey(api.key); }}
                                    className="text-red-400/60 hover:text-red-400 text-[10px] ml-1"
                                    title="Remove key"
                                  >✕</button>
                                </div>
                              ) : (
                                <span className="w-2 h-2 rounded-full bg-white/20" />
                              )}
                            </button>
                            {isEditing && !saved && (
                              <div className="px-3 pb-3 flex gap-2">
                                <input
                                  type="password"
                                  value={newKeyValue}
                                  onChange={(e) => setNewKeyValue(e.target.value)}
                                  placeholder={`Paste ${api.name} key...`}
                                  className="flex-1 bg-black border border-[var(--glass-border)] rounded px-2 py-1.5 text-xs text-white placeholder-white/20 focus:border-[var(--mint-mid)]/50 focus:outline-none"
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveKey}
                                  disabled={!newKeyValue.trim() || savingKey}
                                  className="px-3 py-1.5 rounded text-xs font-semibold bg-[var(--mint-mid)]/10 border border-[var(--mint-mid)]/30 text-[var(--mint-mid)] hover:bg-[var(--mint-mid)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {savingKey ? '...' : 'Save'}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <p className="text-[10px] text-white/20 pt-1">
                        Keys are encrypted &amp; injected as env vars into the agent.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
