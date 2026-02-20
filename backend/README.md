# Claw.Click Backend

Event indexer and REST API for Claw.Click platform.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Required environment variables:
- `INFURA_PROJECT_ID` - Get from https://infura.io
- `DATABASE_URL` - PostgreSQL connection string
- `FACTORY_ADDRESS` - Deployed factory contract (from deployment)
- `HOOK_ADDRESS` - Deployed hook contract (from deployment)

### 3. Initialize Database

```bash
npm run db:migrate
```

This creates all tables and indexes.

### 4. Start Services

**Terminal 1: API Server**
```bash
npm run dev
```

**Terminal 2: Event Indexer**
```bash
npm run indexer
```

## 📡 API Endpoints

### Platform Stats
```
GET /api/stats
```

Response:
```json
{
  "total_tokens": 42,
  "total_volume_eth": "123.45",
  "total_volume_24h": "12.34",
  "total_txs": 1234,
  "total_txs_24h": 56
}
```

### Tokens List
```
GET /api/tokens?sort=new&limit=20&offset=0
```

Query params:
- `sort`: `new` | `hot` | `mcap` | `volume`
- `limit`: Number of results (default 20)
- `offset`: Pagination offset (default 0)
- `search`: Filter by name/symbol/address

### Single Token
```
GET /api/token/:address
```

### Trending Tokens
```
GET /api/tokens/trending
```

## 🗄️ Database Schema

**Tables:**
- `tokens` - All launched tokens
- `swaps` - All swap transactions
- `stats` - Platform-wide statistics

See `db/schema.sql` for full schema.

## 🔧 Development

**Watch mode (auto-reload):**
```bash
npm run dev
```

**Build:**
```bash
npm run build
```

**Production:**
```bash
npm start
```

## 📊 Monitoring

**Health Check:**
```
GET /health
```

**Logs:**
```bash
# View indexer logs
npm run indexer

# View API logs
npm run dev
```

## 🐛 Troubleshooting

**"Cannot connect to database"**
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Run migrations: `npm run db:migrate`

**"No events being indexed"**
- Check FACTORY_ADDRESS and HOOK_ADDRESS in .env
- Verify Infura WebSocket connection
- Check deployer has launched a test token

**"API returns empty data"**
- Ensure indexer is running
- Check database has data: `SELECT COUNT(*) FROM tokens;`
- Verify API is querying correct database
