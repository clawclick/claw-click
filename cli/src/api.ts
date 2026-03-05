/**
 * ClawClick SDK — HTTP API Client
 *
 * Wraps both the claws-fun backend (sessions, compute) and
 * the claw-click backend (token data, stats).
 */

export interface ClawClickApiConfig {
  /** claws-fun backend URL (sessions, compute, terminal, files, keys, payment) */
  backendUrl: string;
  /** claw-click backend URL (token data, agent data, platform stats) */
  clawclickUrl: string;
  /** Optional wallet address for auth headers */
  walletAddress?: string;
}

const DEFAULT_CONFIG: ClawClickApiConfig = {
  backendUrl: 'https://claws-fun-backend-764a4f25b49e.herokuapp.com',
  clawclickUrl: 'https://claw-click-backend-5157d572b2b6.herokuapp.com',
};

// ── Types ──────────────────────────────────────────────────────────────────

export interface SessionCreateParams {
  agentAddress: string;
  nftId?: number;
  userAddress: string;
  cpuCores?: number;
  memoryGb?: number;
  gpuType?: string;
  numGpus?: number;
  durationHours: number;
  diskGb?: number;
  paymentTx: string;
  apiKeys?: { openai?: string; anthropic?: string };
}

export interface SessionInfo {
  id: number;
  agentName: string;
  status: string;
  isActive: boolean;
  isExpired: boolean;
  gpuType: string;
  numGpus: number;
  cpuCores: number;
  memoryGb: number;
  costPerHour: number;
  createdAt: number;
  expiresAt: number;
  timeRemaining: number;
  sshHost?: string;
  sshPort?: number;
}

export interface EstimateResult {
  offers: Array<{
    id: number;
    gpuName: string;
    numGpus: number;
    cpuCores: number;
    ramGb: number;
    diskGb: number;
    costPerHour: number;
    totalCost: number;
    location: string;
  }>;
}

export interface AgentInfo {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  agent_wallet: string;
  current_price: string | null;
  current_mcap: string;
  volume_24h: string;
  graduated: boolean;
  current_epoch: number;
  launched_at: string;
}

export interface TokenStats {
  token: {
    current_price: string | null;
    current_mcap: string;
    volume_24h: string;
    volume_total: string;
    graduated: boolean;
    current_epoch: number;
    tx_count_24h: number;
    buys_24h: number;
    sells_24h: number;
    creator_earnings: string;
    launched_at: string;
    pool_id: string;
  };
  recentSwaps: Array<{
    type: string;
    amount_eth: string;
    amount_token: string;
    wallet: string;
    tx_hash: string;
    timestamp: string;
  }>;
  eth_price_usd: number;
}

export interface PlatformStats {
  total_tokens: number;
  total_volume_eth: string;
  total_volume_24h: string;
  total_market_cap_eth: string;
  total_fees_eth: string;
  eth_price_usd: number;
}

export interface PaymentInfo {
  treasuryAddress: string;
  ethPriceUsd: number;
  network: string;
  chainId: number;
  minPaymentEth: number;
}

// ── Client ─────────────────────────────────────────────────────────────────

export class ClawClickApiClient {
  private config: ClawClickApiConfig;

  constructor(config: Partial<ClawClickApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async fetch(base: 'backend' | 'clawclick', path: string, options?: RequestInit): Promise<any> {
    const url = base === 'backend' ? this.config.backendUrl : this.config.clawclickUrl;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };
    if (this.config.walletAddress) {
      headers['x-wallet-address'] = this.config.walletAddress;
    }
    const res = await globalThis.fetch(`${url}${path}`, { ...options, headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`API ${res.status}: ${body || res.statusText}`);
    }
    return res.json();
  }

  // ── Payment ──

  async getPaymentInfo(): Promise<PaymentInfo> {
    return this.fetch('backend', '/api/payment');
  }

  // ── Sessions ──

  async createSession(params: SessionCreateParams): Promise<{ sessionId: string; status: string; expiresAt: number; gpu: string; costPerHour: number }> {
    return this.fetch('backend', '/api/session/create', { method: 'POST', body: JSON.stringify(params) });
  }

  async estimateSession(params: { cpuCores?: number; memoryGb?: number; gpuType?: string; numGpus?: number; durationHours: number; diskGb?: number }): Promise<EstimateResult> {
    return this.fetch('backend', '/api/session/estimate', { method: 'POST', body: JSON.stringify(params) });
  }

  async listSessions(opts: { agent?: string; user?: string } = {}): Promise<SessionInfo[]> {
    const qs = new URLSearchParams();
    if (opts.agent) qs.set('agent', opts.agent);
    if (opts.user) qs.set('user', opts.user);
    const suffix = qs.toString() ? `?${qs}` : '';
    return this.fetch('backend', `/api/session/list${suffix}`);
  }

  async getSession(id: number): Promise<SessionInfo> {
    return this.fetch('backend', `/api/session/${id}`);
  }

  async deleteSession(id: number): Promise<{ success: boolean }> {
    return this.fetch('backend', `/api/session/${id}`, { method: 'DELETE' });
  }

  // ── Terminal (Chat) ──

  async sendMessage(sessionId: number, message: string): Promise<ReadableStream<Uint8Array> | null> {
    const url = `${this.config.backendUrl}/api/session/${sessionId}/terminal`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.walletAddress) headers['x-wallet-address'] = this.config.walletAddress;
    const res = await globalThis.fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error(`Chat API ${res.status}`);
    return res.body;
  }

  async getChatHistory(sessionId: number, limit = 50): Promise<any[]> {
    return this.fetch('backend', `/api/session/${sessionId}/terminal/history?limit=${limit}`);
  }

  async abortGeneration(sessionId: number): Promise<void> {
    await this.fetch('backend', `/api/session/${sessionId}/terminal/abort`, { method: 'POST', body: '{}' });
  }

  async newChatSession(sessionId: number): Promise<void> {
    await this.fetch('backend', `/api/session/${sessionId}/terminal/new-session`, { method: 'POST', body: '{}' });
  }

  // ── Files ──

  async listFiles(sessionId: number, path = '.'): Promise<any[]> {
    return this.fetch('backend', `/api/session/${sessionId}/files?path=${encodeURIComponent(path)}`);
  }

  async deleteFile(sessionId: number, path: string): Promise<void> {
    await this.fetch('backend', `/api/session/${sessionId}/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
  }

  // ── API Keys ──

  async listKeys(sessionId: number): Promise<Array<{ keyName: string; createdAt: number }>> {
    return this.fetch('backend', `/api/session/${sessionId}/keys`);
  }

  async addKey(sessionId: number, keyName: string, keyValue: string): Promise<void> {
    await this.fetch('backend', `/api/session/${sessionId}/keys`, {
      method: 'POST',
      body: JSON.stringify({ keyName, keyValue }),
    });
  }

  async deleteKey(sessionId: number, keyName: string): Promise<void> {
    await this.fetch('backend', `/api/session/${sessionId}/keys?keyName=${encodeURIComponent(keyName)}`, { method: 'DELETE' });
  }

  // ── Token / Agent Data (claw-click backend) ──

  async getAgents(limit = 100): Promise<AgentInfo[]> {
    return this.fetch('clawclick', `/api/agents/recent?limit=${limit}`);
  }

  async getTokenStats(tokenAddress: string): Promise<TokenStats> {
    return this.fetch('clawclick', `/api/token/${tokenAddress}`);
  }

  async getPlatformStats(): Promise<PlatformStats> {
    return this.fetch('clawclick', '/api/stats');
  }
}
