# Soldi — Personal Finance for Kenya

> Earn · Spend · Save

Soldi is a mobile app that automatically tracks your M-PESA, KCB Bank, and LOOP transactions. It reads your SMS messages to import transactions, analyzes your spending by channel, helps you budget, and gives you AI-powered financial advice via Claude.

---

## Features

- **Automatic SMS Import** — Reads M-PESA, KCB, and LOOP SMS on startup (Android)
- **CSV Import** — Import M-PESA statements from CSV files
- **Spending Channels** — Categorizes spending by Paybill, Buy Goods, Send Money, Withdrawal, Airtime & Data, and more
- **Budget Management** — Set and track monthly spending limits per channel
- **Savings Goals** — Create goals with targets and deadlines
- **People Tracking** — Monitor who you transact with most and set per-contact limits
- **AI Financial Advisor** — Chat with Claude about your actual spending data
- **Local-First** — All data stays on your device (SQLite)
- **Dark Mode** — Polished dark UI throughout

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS) |
| Database | Expo SQLite |
| Charts | Victory Native |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Native Module | Custom SMS Reader |

## Project Structure

```
pesasmart/
├── app/                  # Screens (Expo Router)
│   └── (tabs)/
│       ├── dashboard.tsx     # Financial overview
│       ├── transactions.tsx  # Transaction history
│       ├── budget.tsx        # Budget tracking
│       ├── savings.tsx       # Savings goals
│       ├── people.tsx        # Contact spending
│       └── advisor.tsx       # AI chat
├── lib/
│   ├── db.ts             # SQLite schema & queries
│   ├── sms.ts            # SMS reading & import
│   ├── parser.ts         # SMS parsing (M-PESA, KCB, LOOP)
│   └── claude.ts         # Claude AI integration
├── components/           # Reusable UI components
├── hooks/                # useTransactions, useBudget, useSavings
├── constants/            # Channels, categories, icons
└── modules/sms-reader/   # Custom native SMS module
```

## Getting Started

### Prerequisites

- Node.js
- Expo CLI (`npm install -g expo-cli`)
- Android SDK or Xcode
- Anthropic API key

### Install

```bash
npm install
```

### Configure

Create a `.env` file in the project root:

```env
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_key_here
```

### Run

```bash
npm run android   # Android
npm run ios       # iOS
npm start         # Expo dev server
```

## Supported Transaction Types

| Type | Description |
|---|---|
| Send Money | P2P M-PESA transfers |
| Paybill | Utility and business payments |
| Buy Goods | Till number payments |
| Withdrawal | Agent withdrawals |
| Airtime | Airtime and data purchases |
| Fuliza | M-PESA overdraft |
| Loop Advance | LOOP credit |
| KCB Loan | KCB bank loans |
| Bank Transfer | KCB transfers |

## Permissions

The app requires the following Android permissions:

- `READ_SMS` — To import transactions from messages
- `RECEIVE_SMS` — To detect new transactions in real time

## License

Private. All rights reserved.
