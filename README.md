# ToolBox — Personal Finance, Investment & Fitness Dashboard

A self-hosted, full-stack personal management platform built for one purpose: keeping everything that matters in one place. Stocks, bank accounts, budgets, workouts, notes, PDFs, and a calendar — all behind a single login, running on your own server, with no subscription fees and no third-party data sharing.

---

## Table of Contents

1. [What It Does](#what-it-does)
2. [Quick Start — Local Setup](#quick-start--local-setup)
3. [Architecture Overview](#architecture-overview)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Features In Depth](#features-in-depth)
   - [Investment Portfolio](#investment-portfolio)
   - [Finance & Banking](#finance--banking)
   - [Calendar](#calendar)
   - [Fitness Tracker](#fitness-tracker)
   - [Memos](#memos)
   - [PDF Manager](#pdf-manager)
   - [System & Admin](#system--admin)
7. [Backend — Spring Boot](#backend--spring-boot)
   - [REST Controllers](#rest-controllers)
   - [Services](#services)
   - [Scheduled Jobs (Crons)](#scheduled-jobs-crons)
   - [Models & Repositories](#models--repositories)
   - [Security & Auth](#security--auth)
8. [Frontend — Vanilla JS SPA](#frontend--vanilla-js-spa)
   - [SPA Router](#spa-router)
   - [Sidebar Navigation](#sidebar-navigation)
   - [Pages](#pages)
9. [Python Price Engine](#python-price-engine)
   - [stock_daemon.py — Persistent Daemon](#stock_daemonpy--persistent-daemon)
   - [stock_fetcher.py](#stock_fetcherpy)
   - [stock_history_fetcher.py](#stock_history_fetcherpy)
   - [fundamentals_fetcher.py](#fundamentals_fetcherpy)
   - [market_data_fetcher.py](#market_data_fetcherpy)
10. [Real-Time Price Updates](#real-time-price-updates)
    - [PythonPricePool — Daemon Process Pool](#pythonpricepool--daemon-process-pool)
    - [Parallel Fetching](#parallel-fetching)
    - [How a Price Update Cycle Works](#how-a-price-update-cycle-works)
11. [Email Notifications](#email-notifications)
12. [Data Models](#data-models)
13. [API Reference](#api-reference)
14. [Configuration](#configuration)
15. [Deployment](#deployment)
    - [Prerequisites](#prerequisites)
    - [Environment Variables](#environment-variables)
    - [Running deploy.sh](#running-deploysh)
    - [Build Commands](#build-commands)
16. [Design Decisions & Engineering Notes](#design-decisions--engineering-notes)

---

## What It Does

ToolBox is a personal dashboard that replaces a half-dozen scattered apps. At its core it has six domains:

| Domain | What you get |
|--------|-------------|
| **Investments** | Live portfolio with 5-second price updates, historical charts, DCF valuation, company fundamentals, stock screener, dividend tracking, price alerts, capital gains estimate |
| **Finance** | Bank accounts, monthly budget, recurring transactions, expense analytics, subscription tracker, net worth history |
| **Calendar** | Combined view of financial events (dividends, subscriptions, salary) and personal events (vacation, appointments, birthdays) |
| **Fitness** | Workout logging, weight tracking, workout templates, analytics |
| **Memos** | Quick-capture notes with search |
| **PDFs** | Upload, annotate, and highlight documents stored in MongoDB |

Everything runs on a single server. Data never leaves your machine.

---

## Quick Start — Local Setup

### 1. Prerequisites

Install these before anything else:

| Tool | Min version | Install |
|------|-------------|---------|
| Java JDK | **21** | `sdk install java 21` or [adoptium.net](https://adoptium.net) |
| MongoDB | 6.x | `brew install mongodb-community` (macOS) / `apt install mongodb` (Linux) |
| Python | 3.10+ | Usually pre-installed — check with `python3 --version` |
| Bun | 1.x | `curl -fsSL https://bun.sh/install \| bash` |

Gradle is bundled in the repo — run it via `./gradlew`, no install needed.

---

### 2. Clone the repo

```bash
git clone <your-repo-url>
cd tool-box
```

---

### 3. Create your `.env` file

Create a file called `.env` in the project root. It is git-ignored — never commit it.

```bash
# .env

# Required — signs all JWT tokens (use any long random string, 32+ chars)
JWT_SECRET=change-me-to-something-long-and-random

# Required — your admin account, auto-created on first boot
KEVIN_NAME=Your Name
KEVIN_EMAIL=you@example.com
KEVIN_PASSWORD=your-secure-password

# Optional — needed for Stock Research (news & technicals)
# Free key at https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=your-key-here

# Optional — email notifications via MailerSend (price alerts, subscription reminders, password reset)
# Free account at https://www.mailersend.com — use the trial domain they provide
MAILERSEND_API_KEY=your-mailersend-api-key
NOTIFICATION_FROM_EMAIL=noreply@your-verified-domain.mlsender.net
NOTIFICATION_FROM_NAME=ToolBox
```

---

### 4. Set up the Python environment

```bash
python3 -m venv scripts/venv
source scripts/venv/bin/activate    # macOS/Linux

pip install -r scripts/requirements.txt
```

This installs `yfinance` and `pandas` — the only Python dependencies. They handle all stock price and fundamentals fetching.

---

### 5. Build & run

**Option A — one command (recommended)**

```bash
./deploy.sh
```

This does everything: loads `.env`, sets up the Python venv, builds the JAR, copies Python scripts, and starts both services in the background.

| Service | URL | Logs |
|---------|-----|------|
| Backend (Spring Boot) | http://localhost:9099 | `tail -f backend.log` |
| Frontend (Bun) | http://localhost:3000 | `tail -f frontend.log` |

---

**Option B — manual (3 terminals)**

```bash
# Terminal 1 — Spring Boot backend (from project root)
cd backend
JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew bootRun

# Terminal 2 — Bun frontend
cd frontend
bun run dev
```

MongoDB must already be running (`brew services start mongodb-community` on macOS).

---

### 6. First login

1. Open **http://localhost:3000**
2. You'll be redirected to the login page
3. Log in with the `KEVIN_EMAIL` and `KEVIN_PASSWORD` from your `.env`
4. The dashboard will be empty — start by adding a bank account or a stock holding

---

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `JWT_SECRET not set` on startup | Make sure `.env` exists in the project root and `deploy.sh` sources it before starting Java |
| Stock prices fail immediately | Python venv not set up. Run: `source scripts/venv/bin/activate && pip install yfinance` |
| `Daemon stdout closed unexpectedly` | `stock_daemon.py` not in `backend/build/libs/`. Re-run `./deploy.sh` |
| `Unsupported class file major version 68` | Wrong Java version for Gradle. Prefix: `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew ...` |
| MongoDB connection refused | MongoDB not running. `brew services start mongodb-community` (macOS) or `sudo systemctl start mongod` (Linux) |
| Port 9099 already in use | Kill old process: `./stop.sh` or `pkill -f toolbox` |
| Emails not sending | Check `backend.log` for `Sending email from=...` — the from address must match a verified domain in your MailerSend account |

---

### Useful commands

```bash
./update.sh          # Pull latest code from git, then redeploy
./deploy.sh          # Full build + restart everything
./stop.sh            # Stop backend and frontend
./status.sh          # Check what's running

tail -f backend.log  # Live backend logs
tail -f frontend.log # Live frontend logs

# Quick compile check (no tests, fast)
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew compileJava -x test -x spotlessCheck
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:3000)                                  │
│  Vanilla JS SPA — DaisyUI v5 + TailwindCSS v4 + Chart.js        │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP / REST (same-origin proxy)
┌────────────────────────▼────────────────────────────────────────┐
│  Bun Frontend Server (port 3000)                                  │
│  Serves static files + proxies /api/* to localhost:9099           │
└────────────────────────┬────────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────────┐
│  Spring Boot Backend (port 9099)                                  │
│  Java 21 · Spring Security · JWT auth · REST controllers          │
│                                                                   │
│   ┌─────────────────┐    ┌─────────────────┐   ┌─────────────┐  │
│   │  PythonPricePool│    │  Scheduled Crons │   │ EmailService│  │
│   │  (4 daemons)    │    │  StockUpdater 5s │   │ MailerSend  │  │
│   └────────┬────────┘    └────────┬─────────┘   └──────┬──────┘  │
│            │ stdin/stdout          │                     │         │
└────────────┼───────────────────────┼─────────────────────┼────────┘
             │                       │                     │
┌────────────▼───────┐   ┌──────────▼──────────────────┐  │
│  stock_daemon.py   │   │  MongoDB (localhost:27017)    │  │
│  (×4 persistent   │   │  Collections: users,          │  │
│   Python processes)│   │  stock_holdings, expenses...  │  └── MailerSend API
└────────────────────┘   └───────────────────────────────┘
        │
        └── yfinance (Yahoo Finance API)
            Exchange rates · OHLC · Fundamentals
```

The Bun server is a thin static file server with a one-liner `/api/*` proxy. All business logic lives in Spring Boot. Python subprocesses handle market data because yfinance is the most reliable free source for international stocks with currency conversion.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend framework | Spring Boot | 3.5.6 |
| Language | Java | 21 |
| Database | MongoDB | local |
| Auth | JWT (jjwt) | 0.12.6 |
| Security | Spring Security | (Boot managed) |
| Email | MailerSend Java SDK | 1.4.1 |
| Code style | Spotless / Google Java Format | 6.25.0 |
| Build tool | Gradle | 8.x |
| Frontend server | Bun | latest |
| Frontend language | Vanilla JavaScript | ES2023 |
| UI framework | DaisyUI | v5 |
| CSS | TailwindCSS | v4 |
| Charts | Chart.js | 4.4.1 |
| Advanced charts | TradingView LightweightCharts | v4 |
| Market data | yfinance | ≥0.2.28 |
| Python runtime | CPython | 3.x |

---

## Project Structure

```
tool-box/
│
├── backend/                           # Spring Boot application
│   ├── build.gradle
│   ├── gradlew
│   ├── settings.gradle
│   └── src/main/java/dev/toolbox/
│       ├── MongoApplication.java      # Entry point
│       ├── config/                    # Security, JWT, scheduling, auditing
│       ├── controller/                # REST endpoints (~28 controllers)
│       ├── converter/                 # YearMonth ↔ String converters
│       ├── crons/                     # @Scheduled background jobs
│       ├── exception/                 # Global exception handler
│       ├── models/                    # MongoDB documents + DTOs
│       ├── repos/                     # MongoRepository interfaces
│       └── services/                  # Business logic
│
├── frontend/                          # Bun frontend server
│   ├── src/server.ts                  # Bun HTTP server + /api/* proxy
│   └── public/
│       ├── *.html                     # 13 pages
│       ├── *.js                       # Page scripts + router + nav
│       └── styles.css
│
├── scripts/                           # Python price engine
│   ├── stock_daemon.py                # Persistent price daemon (stdin/stdout)
│   ├── stock_fetcher.py               # Single price lookup
│   ├── stock_history_fetcher.py       # Historical OHLC data
│   ├── fundamentals_fetcher.py        # Company fundamentals via yfinance
│   ├── market_data_fetcher.py         # Market OHLC candles
│   ├── requirements.txt               # yfinance, pandas
│   └── venv/                          # Python virtual environment (git-ignored)
│
├── settings.gradle                    # Root Gradle settings (includes backend/)
├── gradlew                            # Root wrapper — delegates to backend/gradlew
├── deploy.sh                          # Full production deploy
├── update.sh                          # git pull + deploy (safe self-update)
├── stop.sh                            # Stop all services
├── status.sh                          # Check running services
└── .env                               # Secrets (git-ignored)
```

---

## Features In Depth

### Investment Portfolio

The investment module is the most technically involved part of the project.

**Holdings table**
Each row shows: symbol, quantity, buy price, current price, daily change (vs previous close), P&L in €, P&L %. The current price column updates live every 5 seconds in the browser.

**Price update pipeline**
1. A Spring `@Scheduled` job fires every 5 seconds.
2. It collects all unique `SYMBOL|CURRENCY` pairs from the database.
3. Each pair is fetched in parallel using `CompletableFuture.supplyAsync()` across a dedicated 4-thread executor.
4. Each thread borrows a Python daemon process from a `BlockingQueue` pool, sends a JSON request over stdin, and reads the JSON response from stdout.
5. If the price changed by more than €0.01, the holding is updated in MongoDB and a history record is written.

**Historical chart**
On the History tab, each holding's price history is plotted from buy date to today using Chart.js. History is backfilled asynchronously when a holding is added, fetching daily closes back to either the buy date or 3 months ago (whichever is earlier), using `stock_history_fetcher.py`.

**Daily change**
The "Day" column shows change vs the previous trading day's close. This comes from yfinance's `fast_info.previous_close`. The frontend also shows a live countdown ("next update in 4s") that ticks down alongside the server-side cron cycle.

**Portfolio allocation**
A donut chart shows current allocation by symbol. You can set target allocations and the app will show how far each position is from target, with "Consider buying / selling" suggestions when drift exceeds 5%.

**Capital gains**
For each holding, the app estimates unrealized gains and the applicable German capital gains tax (Abgeltungssteuer, 26.375%). Total estimated tax is shown alongside total unrealized gain.

**DCF Valuation**
A Discounted Cash Flow calculator lets you plug in revenue growth rate, operating margin, discount rate, and terminal growth rate to derive an intrinsic value estimate. Results are shown alongside the current market price for a quick over/undervalued indicator.

**Company Fundamentals**
Fetched via `fundamentals_fetcher.py` (yfinance), the fundamentals tab shows P/E ratio, EPS, debt-to-equity, revenue, net income, operating margin, and quarterly earnings history as a Chart.js bar chart. Fundamental data is cached in MongoDB and refreshed on a schedule.

**Stock Screener**
Filter stocks by P/E ratio, market cap, dividend yield, sector, and other criteria. Results are stored and can be added to the watchlist or portfolio directly.

**Watchlist**
Separate from holdings — a list of symbols to track without owning. Prices update every 4 minutes via a separate cron cycle. Each symbol records a price history so you can see how a watched stock moves over time.

**Dividend Tracker**
Log dividend payments per holding. The calendar automatically marks upcoming dividend dates. Annual dividend yield is calculated and shown per position.

**Price Alerts**
Set alert conditions on portfolio holdings or watchlist symbols. A 1-minute cron evaluates all active alerts and emails you when a condition is met. Alerts auto-deactivate after triggering.

Eight condition types are supported:

| Condition | Triggers when | Works on |
|-----------|--------------|----------|
| Price above | Price rises above a target value | Portfolio + Watchlist |
| Price below | Price drops below a target value | Portfolio + Watchlist |
| Daily gain % | Stock gains ≥ X% in a single day | Portfolio |
| Daily loss % | Stock loses ≥ X% in a single day | Portfolio |
| P&L gain % | Unrealized gain from buy price ≥ X% | Portfolio |
| P&L loss % | Unrealized loss from buy price ≥ X% | Portfolio |
| 52-week high | Price hits new high over the last 365 days | Portfolio |
| 52-week low | Price hits new low over the last 365 days | Portfolio |

**Advanced Charting**
TradingView's LightweightCharts library powers a full candlestick chart with volume bars and optional overlays: 20-day SMA, 50-day EMA, Bollinger Bands. OHLC data comes from `market_data_fetcher.py`.

---

### Finance & Banking

**Bank Accounts**
Add accounts with balance, bank name, currency, and account type (checking, savings, investment). Balances roll up to the dashboard's "Total Balance" KPI.

**Monthly Budget**
Set a budget for each expense category per month. The budget page shows actual spend vs budget as a progress bar for each category. Remaining budget is highlighted green/red.

**Expense Tracking**
Log expenses with amount, category, date, and notes. The analytics view shows monthly spend by category as a stacked bar chart, top spending categories as a pie chart, and month-over-month trend lines.

**Recurring Transactions**
Define transactions that repeat on a schedule (daily / weekly / monthly / yearly). A cron job automatically creates the actual expense or income records on the due date.

**Subscription Tracker**
Track recurring subscriptions (Netflix, Spotify, etc.) with name, amount, billing cycle, and renewal date. The dashboard shows total monthly subscription cost. The calendar marks upcoming renewal dates. A reminder email is sent before renewals.

**Net Worth**
The net worth page aggregates bank account balances + portfolio value − known liabilities. A `NetWorthSnapshotCron` saves a monthly snapshot so you can chart wealth growth over time.

**Financial Goals**
Set savings goals with a name, target amount, deadline, and linked bank account. Progress is shown as a percentage with estimated completion date.

---

### Calendar

The calendar is a standalone page that combines two event sources:

1. **Financial events** — auto-generated from your data:
   - Subscription renewal dates
   - Dividend payment dates
   - Salary / recurring income dates
   - Recurring expense dates

2. **Personal events** — CRUD events you create:
   - Vacation
   - Holiday
   - Appointment
   - Reminder
   - Birthday
   - Other

The calendar renders as a 7-column CSS grid (Sun–Sat). Day cells show color-coded chips (up to 3 visible, "+N more" for overflow). Clicking a day opens an "Add Event" modal. Clicking a chip opens a detail modal — financial events are read-only; personal events have a Delete button. Month navigation and a "Today" button are included.

**Event type colors:**
- Income → green
- Expense → red
- Subscription → yellow
- Dividend → blue
- Vacation → violet
- Appointment → sky blue
- Reminder → amber
- Birthday → rose

---

### Fitness Tracker

**Workout Logging**
Log workouts with type (strength, cardio, yoga, etc.), duration, exercises, sets, reps, and notes. Workouts can be created from reusable templates or from scratch.

**Weight Tracking**
Log body weight with date. The weight chart shows trend over time using Chart.js, with a moving average line.

**Analytics**
Workout frequency by week, total volume by muscle group, personal records, and streak tracking.

**Templates**
Save workout templates (e.g., "Push Day", "5×5 Strength") that can be loaded and logged with one click.

---

### Memos

A minimal note-taking app. Create, edit, search, and delete memos. Memos support plain text. The list is searchable by title and content. Each memo shows creation date and a truncated preview.

---

### PDF Manager

Upload PDF documents (up to 500MB per file, configurable). Documents are stored in MongoDB as binary data. The viewer renders the PDF in-browser. Annotations and highlights can be added and are stored separately, overlaid on the PDF when viewed.

---

### System & Admin

**System Stats** (accessible to all users)
- Server uptime, JVM memory usage, MongoDB connection status

**Admin Panel** (ADMIN role only)
- List all users with role badges
- Change user roles (USER / ADMIN)
- Toggle per-user email notifications (✉️ enabled / 🔕 disabled)
- Send password reset link to any user via email
- Deactivate / delete accounts
- MongoDB export (mongodump) triggered via the UI

---

## Backend — Spring Boot

### REST Controllers

| Controller | Base Path | Key Endpoints |
|-----------|-----------|---------------|
| `AuthController` | `/api/auth` | `POST /login`, `POST /register`, `POST /forgot-password`, `POST /reset-password` |
| `StockController` | `/api/stocks` | `GET /`, `POST /`, `DELETE /{id}`, `GET /stats`, `GET /capital-gains`, `GET /allocation`, `POST /backfill` |
| `StockWatchController` | `/api/watchlist` | `GET /`, `POST /`, `DELETE /{id}`, `GET /history/{symbol}` |
| `StockResearchController` | `/api/research` | `GET /report/{symbol}`, `POST /generate/{symbol}` |
| `FundamentalController` | `/api/fundamentals` | `GET /{symbol}`, `POST /refresh/{symbol}` |
| `MarketDataController` | `/api/market` | `GET /ohlc/{symbol}` |
| `DividendController` | `/api/dividends` | `GET /`, `POST /`, `DELETE /{id}`, `GET /summary` |
| `PriceAlertController` | `/api/alerts` | `GET /`, `POST /`, `DELETE /{id}` |
| `ScreenerController` | `/api/screener` | `GET /`, `POST /run`, `DELETE /{id}` |
| `FinanceController` | `/api/finance` | `GET /summary` |
| `BankAccountController` | `/api/accounts` | Full CRUD |
| `ExpenseController` | `/api/expenses` | Full CRUD + analytics |
| `MonthlyBudgetController` | `/api/budget` | `GET /{year}/{month}`, `POST /` |
| `RecurringTransactionController` | `/api/recurring` | Full CRUD |
| `SubscriptionController` | `/api/subscriptions` | Full CRUD |
| `FinancialGoalController` | `/api/goals` | Full CRUD |
| `NetWorthController` | `/api/networth` | `GET /`, `GET /history` |
| `FinancialCalendarController` | `/api/calendar` | `GET /{year}/{month}` |
| `CalendarEventsController` | `/api/events` | `POST /`, `DELETE /{id}` |
| `FitnessController` | `/api/fitness` | Workouts, weight, analytics, templates |
| `MemoController` | `/api/memos` | Full CRUD |
| `PdfController` | `/api/pdfs` | Upload, download, annotate |
| `DashboardController` | `/api/dashboard` | `GET /summary` |
| `SystemStatsController` | `/api/system` | Stats, user management, email notification toggle, password reset |
| `MongoDumpController` | `/api/admin/dump` | `POST /export` |

---

### Services

| Service | Responsibility |
|---------|---------------|
| `StockService` | Holdings CRUD, portfolio stats, capital gains, allocation, backfill |
| `StockPriceService` | Delegates to `PythonPricePool` for live prices; spawns subprocesses for history |
| `PythonPricePool` | Manages pool of 4 persistent Python daemon processes |
| `StockWatchService` | Watchlist price recording |
| `StockResearchService` | Fetches news + technicals via Alpha Vantage |
| `PriceAlertService` | Checks all active alerts, sends email on breach |
| `FundamentalDataService` | Stores and retrieves company fundamentals |
| `DCFService` | Discounted cash flow calculation |
| `ScreenerService` | Runs screener queries |
| `DividendService` | Dividend record management |
| `BankAccountService` | Account balances |
| `ExpenseAnalyticsService` | Expense trend analysis, category breakdown |
| `MonthlyBudgetService` | Budget vs actual calculations |
| `RecurringTransactionService` | Recurring transaction processing |
| `SubscriptionService` | Subscription management, renewal reminders |
| `NetWorthSnapshotService` | Monthly wealth snapshots |
| `FinancialCalendarService` | Aggregates all financial event sources for the calendar |
| `CalendarEventService` | Personal event CRUD |
| `FitnessService` | Workout and weight analytics |
| `MemoService` | Memo CRUD |
| `PdfService` | PDF upload/download/annotation |
| `EmailService` | Sends transactional emails via MailerSend |
| `BudgetAlertService` | Checks monthly budget thresholds, emails user on breach |
| `DataMigrationService` | Seeds initial user on first boot |
| `AlphaVantageService` | Alpha Vantage API client (fundamentals) |
| `MarketDataService` | OHLC data for TradingView charts |

---

### Scheduled Jobs (Crons)

```
StockUpdater
  ├── updateStock()           fixedDelay=5000ms    Live price update for all holdings
  ├── updatedWatcher()        fixedDelay=240000ms  Watchlist price recording
  └── checkPriceAlerts()      fixedDelay=60000ms   Evaluate all active price alerts → email

FundamentalDataRefresher                           Refresh company fundamentals
NetWorthSnapshotCron                               Monthly net worth snapshot
RecurringTransactionCron                           Create due recurring transactions
SubscriptionReminderCron                           Email reminders before renewals
BudgetAlertCron                                    Email user when monthly budget thresholds are exceeded
```

**`fixedDelay` vs `fixedRate`:** All crons use `fixedDelay`, meaning the timer starts after the previous execution completes. With price fetches taking ~0.5–1s per cycle (daemon pool + parallel fetches), the effective cadence is roughly every 5–6 seconds.

---

### Models & Repositories

Every model follows the pattern:

```java
@Data
@NoArgsConstructor
@Document(collection = "collection_name")
public class ModelName {
    @Id private String id;
    @Indexed private String userId;   // tenant isolation
    // ... fields
    @CreatedDate private Instant createdAt;
}
```

Every repository follows:

```java
public interface ModelRepository extends MongoRepository<ModelName, String> {
    List<ModelName> findByUserId(String userId);
    // ... custom queries
}
```

**Key collections:**

| Collection | Model | Purpose |
|-----------|-------|---------|
| `users` | `UsersEntity` | Accounts, roles, hashed passwords, email notification flag |
| `stock_holdings` | `StockHolding` | Portfolio positions |
| `stock_holding_history` | `StockHoldingHistory` | Price history per position |
| `stock_watch` | `StockWatch` | Watchlist entries |
| `stock_watch_price_history` | `StockWatchPriceHistory` | Watchlist price records |
| `dividends` | `DividendRecord` | Dividend payments |
| `price_alerts` | `PriceAlert` | Alert definitions (condition type, target price/%, symbol) |
| `portfolio_targets` | `PortfolioTarget` | Target allocation map |
| `company_overviews` | `CompanyOverview` | Cached fundamentals |
| `expense_records` | `ExpenseRecord` | Transactions |
| `monthly_budgets` | `MonthlyBudget` | Budget entries |
| `recurring_transactions` | `RecurringTransaction` | Auto-transaction templates |
| `subscriptions` | `Subscription` | Subscription definitions |
| `net_worth_snapshots` | `NetWorthSnapshot` | Monthly wealth records |
| `financial_goals` | `FinancialGoal` | Savings targets |
| `bank_accounts` | `BankAccount` | Account balances |
| `calendar_events` | `CalendarEvent` | Personal calendar events |
| `workout_logs` | `WorkoutLog` | Workout records |
| `weight_entries` | `WeightEntry` | Body weight records |
| `workout_templates` | `WorkoutTemplate` | Reusable workout plans |
| `memos` | `Memo` | Notes |
| `pdf_documents` | `PdfDocument` | Uploaded PDFs |
| `pdf_annotations` | `PdfAnnotation` | PDF annotations |

---

### Security & Auth

**JWT Authentication**

All API endpoints except `/api/auth/*` require a `Bearer` token in the `Authorization` header. Tokens are signed with a secret from the `JWT_SECRET` environment variable and expire after 7 days (604,800,000 ms).

```
Client                     JwtAuthFilter              SecurityConfig
  │──── POST /api/auth/login ──────────────────────────────▶│
  │◀──── { token: "eyJ..." } ──────────────────────────────│
  │                                                          │
  │──── GET /api/stocks (Authorization: Bearer eyJ...) ──▶│
  │                │                                         │
  │      JwtUtil.validateToken()                             │
  │      Sets SecurityContext with userId + roles            │
  │                │                                         │
  │◀──── 200 OK ──────────────────────────────────────────│
```

**Role-Based Access Control**

Two roles: `USER` and `ADMIN`. The admin panel (`/api/system/**`) is restricted to `ADMIN` role. Regular users can only access their own data — all service methods filter by `authUtils.getCurrentUserId()`.

**Multi-Tenancy**

Every document has a `userId` field. All repository queries are scoped to the current user's ID. A user cannot read or modify another user's data even if they know the document ID.

**Password Storage**

Passwords are hashed with BCrypt before storage. Password reset flow:
1. User visits `/reset-info.html` and submits their email
2. Backend checks if the email exists (returns 400 if not)
3. A UUID reset token is stored in the user record with a 24-hour expiry
4. A reset link is emailed via MailerSend
5. User clicks the link → `/reset-password.html?token=...`
6. Backend validates the token and updates the password

Admins can also trigger a password reset email for any user from the admin panel.

---

## Frontend — Vanilla JS SPA

No framework. No build step. No `node_modules` of 200MB. Every page is plain HTML + vanilla JavaScript served as static files.

### SPA Router

`router.js` intercepts all in-page navigation and loads pages without a full browser reload:

1. Clicks on `<a href="...html">` inside the drawer are caught by a delegated event listener.
2. The router fetches the target HTML via `fetch()`.
3. It parses the response with `DOMParser`, extracts the `<main>` content, and replaces the current `<main>` in the DOM.
4. Page-specific `<script src="...">` tags are identified and loaded dynamically (once per session — already-loaded scripts are skipped).
5. Head scripts (CDN libraries like Chart.js, LightweightCharts) are loaded before body scripts to respect dependency order.
6. The current page's `__pageCleanup()` function is called before switching to destroy charts, clear intervals, and free event listeners.
7. `window.history.pushState()` updates the URL bar.

**Page cleanup contract:** Each page that has stateful resources (Chart.js instances, `setInterval`, TradingView charts) exposes a `window.__pageCleanup` function. The router calls it before navigating away. This prevents memory leaks and stale intervals from accumulating across navigation.

### Sidebar Navigation

`nav.js` renders a DaisyUI v5 drawer sidebar. On desktop it's always-open; on mobile it's a slide-in drawer triggered by a hamburger button. Navigation items are grouped into sections (Workspace, Finance, Health). Each item has an SVG icon (inline Heroicons) and a label. The active page is highlighted by matching `data-active` on `<body>` against the nav item's `key`.

### Pages

| Page | File | Key JS behaviour |
|------|------|-----------------|
| **Dashboard** | `index.html` | Aggregates KPIs from `/api/dashboard/summary`. Shows bank totals, portfolio value, recent expenses, upcoming subscriptions. |
| **Finance** | `finance.html` / `finance.js` | Tab-switched: Accounts, Budget, Subscriptions, Expenses, Analytics, Goals. Inline forms for all CRUD. |
| **Investments** | `investments.html` / `investments.js` | Tab-switched: Stocks, History, Allocation, Capital Gains, Dividends, Watchlist, Screener, Fundamentals, DCF. 5-second refresh interval with countdown. Page cleanup destroys Chart.js instances and TradingView charts. |
| **Calendar** | `calendar.html` / `calendar.js` | 7-column CSS grid. Add Event and Event Detail modals. Loads `/api/calendar/{y}/{m}` (financial events) + `/api/events` custom events. |
| **Fitness** | `fitness.html` / `fitness.js` | Log workouts, track weight, view analytics. Template library. |
| **Memos** | `memos.html` / `memos.js` | Searchable note list with inline create/delete. |
| **PDFs** | `pdfs.html` / `pdfs.js` | File picker upload, PDF viewer, annotation overlay. |
| **System** | `system.html` / `system.js` | JVM stats, database management. |
| **Admin** | `admin.html` / `admin.js` | User list, role management, email notification toggle, password reset. ADMIN only. |
| **Login** | `login.html` / `login.js` | Login + register forms. Stores JWT in localStorage. |
| **Forgot Password** | `reset-info.html` | Email form — calls `POST /api/auth/forgot-password`, shows server error/success. |

**Shared utilities (`shared.js`)**

- `authFetch(url, options)` — wraps `fetch()` with `Authorization: Bearer <token>` header; redirects to login on 401.
- `showToast(message, type)` — DaisyUI toast notification (success / error / info).
- `showLoading() / hideLoading()` — global loading overlay.
- `requireAuth()` — redirects to login if no token in localStorage.
- `openModal(id) / closeModal(id)` — DaisyUI modal helpers.
- `escHtml(str)` — XSS-safe HTML escaping.
- Privacy mode toggle — masks all monetary values on screen with `***`.

---

## Python Price Engine

Market data is fetched via Python subprocesses using the `yfinance` library. This approach was chosen over the Alpha Vantage REST API because:
- No rate limits for price data
- No API key required
- Supports international exchanges (Frankfurt `.DE`, London `.L`, Helsinki `.HE`, Korean `.KS`, Milan `.MI`, etc.)
- Built-in currency conversion via FX pair tickers

All scripts handle:
- **GBp normalization** — London-listed stocks trade in pence (GBp). Scripts detect `fast_info.currency == 'GBp'` and divide by 100 to get GBP.
- **Currency conversion** — fetches the FX rate (e.g. `EURUSD=X`) and applies it to convert native currency to the target currency.
- **Market-closed fallback** — when intraday data (`period=1d, interval=1m`) is empty (market closed), scripts fall back to `period=5d, interval=1d` and take the last close.

All scripts live in `scripts/` and are copied to `backend/build/libs/` alongside the JAR by `deploy.sh`. The Java services find them either next to the JAR (production) or via `scripts/` relative to the project root (development).

### stock_daemon.py — Persistent Daemon

The most important optimization. Instead of spawning a new Python process for every price fetch (which costs ~0.5–1s of Python interpreter startup), `stock_daemon.py` runs as a long-lived process that reads JSON requests from stdin and writes JSON responses to stdout in a loop:

```python
# One request per line: {"ticker": "AAPL", "currency": "EUR"}
# One response per line: {"ticker": "AAPL", "price": 180.50, ...}

for line in sys.stdin:
    req = json.loads(line.strip())
    result = fetch_price(req['ticker'], req['currency'])
    print(json.dumps(result), flush=True)
```

Four of these run permanently. The JVM sends a request and gets a response in ~0.3–0.5s instead of 1.5–2.5s.

### stock_fetcher.py

One-shot price lookup. Used by `addStock()` to get an initial price immediately when a holding is created. Arguments: `ticker [currency]`. Prints a single JSON object and exits.

```json
{
  "ticker": "AAPL",
  "timestamp": "2025-02-25 14:30:00 UTC",
  "price": 180.50,
  "currency": "EUR",
  "base_price_usd": 195.30,
  "exchange_rate": 0.9241,
  "previous_close": 179.85
}
```

### stock_history_fetcher.py

Fetches daily close prices from a start date to today. Used to backfill historical chart data. Arguments: `ticker start_date [currency]`. Output: JSON array of `{date, price}` objects.

### fundamentals_fetcher.py

Fetches company fundamentals from yfinance. Accepts a mode argument (`overview`, `income`, `balance_sheet`, `cash_flow`, `earnings`, or `all`). Returns normalized JSON with camelCase keys (yfinance returns keys with spaces like `"Total Revenue"`, these are mapped to `totalRevenue`).

### market_data_fetcher.py

Fetches OHLC candlestick data for TradingView charts. Arguments: `ticker ohlc period interval`. Returns a JSON array of `{time, open, high, low, close, volume}` objects.

---

## Real-Time Price Updates

### PythonPricePool — Daemon Process Pool

`PythonPricePool` is a Spring `@Service` that manages a fixed pool of persistent Python daemon processes using a `BlockingQueue<DaemonHandle>`.

```text
private final BlockingQueue<DaemonHandle> pool = new ArrayBlockingQueue<>(POOL_SIZE); // 4 daemons
```

Each `DaemonHandle` wraps:
- `Process process` — the OS process
- `BufferedWriter stdin` — write JSON requests to the daemon
- `BufferedReader stdout` — read JSON responses from the daemon

**Lifecycle:**
- `@PostConstruct init()` — spawns 4 daemons at application startup
- `getPrice(ticker, currency)` — `pool.take()` (blocks if all busy), sends request, reads response, `pool.put()` to return
- `@PreDestroy destroy()` — `destroyForcibly()` on all daemons at shutdown

**Error separation — the critical design point:**

The pool distinguishes between two failure modes:

| Failure | Meaning | Action |
|---------|---------|--------|
| `responseLine == null` (stdout closed) | Daemon crashed — I/O broken | Kill daemon, spawn replacement, return new daemon to pool |
| `node.has("error")` (error JSON returned) | Logical failure (market closed, bad symbol) | Return daemon to pool immediately — it is healthy |

Without this distinction, a single "market closed" error for one ticker would kill a daemon every 5 seconds, continuously spawning replacements.

**Stderr draining:**
Each daemon's stderr is drained by a dedicated background thread at `WARN` log level. This prevents the stderr pipe from filling up (which would block the Python process), and surfaces Python tracebacks in the application log.

**Python `-u` flag:**
Daemons are started with `python3 -u stock_daemon.py`. The `-u` flag disables Python's internal I/O buffering, ensuring that both stdout and stderr are written immediately even if the process crashes mid-fetch.

**Python executable resolution:**
The pool checks for the venv Python in this order:
1. `../../../scripts/venv/bin/python3` — relative to `backend/build/libs/` (production)
2. `scripts/venv/bin/python3` — relative to project root (development / `bootRun`)
3. `python3` — system fallback

### Parallel Fetching

`StockService.updateHoldingCurrentPrice()` fetches all symbol+currency pairs in parallel:

```text
// One CompletableFuture per unique SYMBOL|CURRENCY pair
Map<String, CompletableFuture<Map<String, Object>>> futures = new ConcurrentHashMap<>();

for (String key : symbolCurrencyKeys) {
    futures.put(key, CompletableFuture.supplyAsync(
        () -> stockPriceService.getStockPrice(symbol, currency),
        priceExecutor   // dedicated 4-thread executor, matches pool size
    ));
}

// Wait for all fetches to complete
CompletableFuture.allOf(futures.values().toArray(new CompletableFuture[0])).join();
```

With 4 daemon slots and 4 executor threads, up to 4 price fetches happen simultaneously. For a portfolio of 10 stocks, the total time goes from ~15s (sequential) to ~2–3s (parallel, limited by daemon pool) to ~0.5s per group of 4.

### How a Price Update Cycle Works

```
StockUpdater.updateStock() fires (fixedDelay=5s after previous completes)
    │
    ▼
StockService.updateHoldingCurrentPrice()
    │
    ├── Query MongoDB for all unsold holdings → collect unique SYMBOL|CURRENCY pairs
    │
    ├── For each pair, submit CompletableFuture to priceExecutor (4 threads)
    │       │
    │       ▼
    │   PythonPricePool.getPrice(symbol, currency)
    │       ├── pool.take()  [blocks if all 4 daemons busy]
    │       ├── Write {"ticker":"AAPL","currency":"EUR"}\n to daemon stdin
    │       ├── Read response line from daemon stdout
    │       ├── If response has "error" → pool.put(daemon), throw RuntimeException
    │       ├── If stdout closed → destroyForcibly(), spawn replacement, throw IOException
    │       └── pool.put(daemon), return price map
    │
    ├── CompletableFuture.allOf().join()  [wait for all]
    │
    ├── For each holding whose price changed by >€0.01:
    │       ├── setCurrentPrice(newPrice), setPreviousClose(prevClose)
    │       ├── Write StockHoldingHistory record
    │       └── log "[StockUpdater] AAPL price updated: €179.85 → €180.50"
    │
    └── stockRepository.saveAll(allHoldings)
```

---

## Email Notifications

Transactional emails are sent via the [MailerSend](https://www.mailersend.com) API (free tier available). All emails are sent from the address configured in `NOTIFICATION_FROM_EMAIL` — this must be a domain verified in your MailerSend account.

**Email types:**

| Trigger | Recipients | Content |
|---------|-----------|---------|
| Price alert fires | The user who set the alert | Symbol, condition triggered, current price |
| Budget threshold exceeded | The user whose budget it is | Category, spend vs budget |
| Subscription renewal approaching | The subscription owner | Name, amount, renewal date |
| Password reset (self-service) | The requesting user | Reset link (expires 24h) |
| Password reset (admin-triggered) | The target user | Reset link (expires 24h) |
| System alerts | All ADMIN-role users | Alert message |

**Per-user toggle:**
Each user has an `emailNotificationsEnabled` flag (default: true). Admins can toggle this per-user from the admin panel. When disabled, budget, price, and subscription emails are skipped for that user. System alerts always go to all admins regardless of this flag.

**Logging:**
Every send attempt logs `from`, `to`, and `subject` before calling the API. Success logs the MailerSend response status, message ID, and rate limit. Failures log the HTTP status code, the full response body, and the error message.

---

## Data Models

### StockHolding

```java
@Document(collection = "stock_holdings")
public class StockHolding {
    @Id String id;
    String userId;
    String symbol;          // e.g. "AAPL", "SAP.DE", "VOD.L"
    String currency;        // target display currency, e.g. "EUR"
    double quantity;
    double buyPrice;
    LocalDate buyDate;
    double currentPrice;
    double previousClose;   // for daily change calculation
    boolean sold;
    boolean backfilled;     // true after full history has been fetched
}
```

### CalendarEvent

```java
@Document(collection = "calendar_events")
public class CalendarEvent {
    @Id String id;
    String userId;
    LocalDate date;
    String title;
    String description;
    EventType eventType;    // VACATION, HOLIDAY, APPOINTMENT, REMINDER, BIRTHDAY, OTHER
    @CreatedDate Instant createdAt;
}
```

### CalendarEventDTO (unified calendar response)

```java
public class CalendarEventDTO {
    String id;              // null for financial events, populated for personal events
    int day;
    String title;
    String type;            // INCOME, EXPENSE, SUBSCRIPTION, DIVIDEND, VACATION, etc.
    double amount;
    String source;          // "Bank", "Subscription", "Personal", etc.
    String description;
}
```

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/auth/*`.

### Authentication

```
POST /api/auth/login              { email, password } → { token }
POST /api/auth/register           { name, email, password } → { token }
POST /api/auth/forgot-password    { email } → 200 | 400
POST /api/auth/reset-password     { token, newPassword } → 200
```

### Stocks & Portfolio

```
GET    /api/stocks                       → List<StockHolding>
POST   /api/stocks                       { symbol, quantity, buyPrice, buyDate, currency } → StockHolding
DELETE /api/stocks/{id}                  → 204
GET    /api/stocks/stats                 → { invested, current, profitLoss }
GET    /api/stocks/capital-gains         → { gains[], totalUnrealizedGain, totalEstimatedTax }
GET    /api/stocks/allocation            → { allocations[], totalValue, suggestions{} }
POST   /api/stocks/allocation/target     { allocations{symbol: pct} } → PortfolioTarget
POST   /api/stocks/backfill              → 200 (triggers async backfill for all holdings)
```

### Calendar

```
GET    /api/calendar/{year}/{month}      → List<CalendarEventDTO>  (financial + personal events)
POST   /api/events                       { date, title, eventType, description } → CalendarEvent
DELETE /api/events/{id}                  → 204
```

### Finance

```
GET    /api/accounts                     → List<BankAccount>
POST   /api/accounts                     → BankAccount
GET    /api/budget/{year}/{month}        → MonthlyBudget
GET    /api/expenses                     → List<ExpenseRecord>
POST   /api/expenses                     → ExpenseRecord
GET    /api/subscriptions               → List<Subscription>
GET    /api/networth                    → current net worth
GET    /api/networth/history            → List<NetWorthSnapshot>
```

### Fitness

```
GET    /api/fitness/workouts             → List<WorkoutLog>
POST   /api/fitness/workouts            → WorkoutLog
GET    /api/fitness/weight              → List<WeightEntry>
POST   /api/fitness/weight              { date, weight } → WeightEntry
GET    /api/fitness/analytics           → FitnessAnalyticsDTO
GET    /api/fitness/templates           → List<WorkoutTemplate>
```

### Admin

```
GET    /api/system/users                              → List<UserSummaryDTO>  (ADMIN)
PATCH  /api/system/users/{id}/role                   { role } → 200  (ADMIN)
PATCH  /api/system/users/{id}/email-notifications    { enabled } → 200  (ADMIN)
POST   /api/system/users/{id}/reset-password         → 200  (ADMIN, sends email)
DELETE /api/system/users/{id}                        → 204  (ADMIN)
```

---

## Configuration

### application.properties

```properties
server.port=9099
spring.data.mongodb.uri=mongodb://localhost:27017/tool-box

# JWT
jwt.secret=${JWT_SECRET}
jwt.expiration-ms=604800000        # 7 days

# File uploads (for PDFs)
spring.servlet.multipart.max-file-size=500MB
spring.servlet.multipart.max-request-size=500MB

# Alpha Vantage (news & technicals)
alpha.vantage.api.key=${ALPHA_VANTAGE_API_KEY:}

# Email notifications (MailerSend)
mailersend.api.key=${MAILERSEND_API_KEY:}
app.notification.from.email=${NOTIFICATION_FROM_EMAIL:noreply@toolbox.local}
app.notification.from.name=${NOTIFICATION_FROM_NAME:ToolBox}

# Request timeouts
server.tomcat.connection-timeout=120000
spring.mvc.async.request-timeout=120000

# Seed user
app.seed.kevin.name=${KEVIN_NAME}
app.seed.kevin.email=${KEVIN_EMAIL}
app.seed.kevin.password=${KEVIN_PASSWORD}
```

---

## Deployment

### Prerequisites

| Tool | Minimum version | Purpose |
|------|----------------|---------|
| Java (JDK) | 21 | Backend runtime |
| Gradle | 8.x | Build tool (wrapper included) |
| MongoDB | 6.x | Database |
| Python | 3.10+ | Price fetching |
| Bun | 1.x | Frontend server |
| pip packages | — | `yfinance>=0.2.28`, `pandas>=2.0.0` |

### Environment Variables

Create a `.env` file in the project root (never commit this):

```bash
# Required
JWT_SECRET=your-very-long-random-secret-string
KEVIN_NAME=Your Name
KEVIN_EMAIL=you@example.com
KEVIN_PASSWORD=your-password

# Optional — stock news & technicals
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key

# Optional — email notifications
# Get a free account at https://www.mailersend.com
# Use the trial domain they provide (e.g. trial-xxx.mlsender.net)
MAILERSEND_API_KEY=your-mailersend-api-key
NOTIFICATION_FROM_EMAIL=noreply@your-trial-domain.mlsender.net
NOTIFICATION_FROM_NAME=ToolBox
```

### Running deploy.sh

The `deploy.sh` script handles everything in one command:

```bash
./deploy.sh
```

It performs these steps in order:

1. Loads `.env` from the project root
2. Stops any running backend (`java.*toolbox-0.0.1-SNAPSHOT.jar` or legacy `mongo-0.0.1-SNAPSHOT.jar`) and frontend (`bun.*dev`) processes
3. Sets up (or reuses) a Python virtual environment at `scripts/venv/`
4. Installs Python dependencies from `scripts/requirements.txt`
5. Builds the backend JAR: `cd backend && ./gradlew bootJar -x spotlessCheck`
6. Copies Python scripts from `scripts/` to `backend/build/libs/` (alongside the JAR)
7. Starts the backend: `nohup java -DJWT_SECRET=... -DMAILERSEND_API_KEY=... -jar toolbox-0.0.1-SNAPSHOT.jar`
8. Starts the Bun frontend: `nohup bun run dev`

To update from git and redeploy in one step:

```bash
./update.sh
```

This runs `git reset --hard && git pull`, then hands off to `deploy.sh`. It's a separate script so that bash never runs a stale cached version of `deploy.sh` after the pull.

Logs:
```bash
tail -f backend.log    # Spring Boot logs
tail -f frontend.log   # Bun server logs
```

### Build Commands

```bash
# Quick compile check (no tests, no spotless)
cd backend && JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew compileJava -x test -x spotlessCheck

# Build JAR only
cd backend && ./gradlew bootJar -x spotlessCheck

# Stop everything
./stop.sh

# Check what's running
./status.sh
```

---

## Design Decisions & Engineering Notes

**Why vanilla JS instead of React/Vue?**
The app is a single-user personal tool. It doesn't need component trees, virtual DOM diffing, or a 2MB JavaScript bundle. Vanilla JS with DaisyUI gives a production-quality UI with zero build tooling and zero framework lock-in. The SPA router handles navigation without a full page reload. Pages are fast to write and easy to debug.

**Why MongoDB instead of PostgreSQL?**
Schema flexibility for heterogeneous data (workout exercises, PDF annotations, stock fundamentals all have very different shapes). MongoDB's document model maps naturally to the way this data is used — always by userId, often as a full document fetch. No joins needed anywhere.

**Why Python for price data instead of a Java HTTP client?**
yfinance is the best free international stock data source. Its Python API is maintained, handles authentication with Yahoo Finance internally, supports hundreds of exchanges, and returns clean data. Rewriting this in Java (or using a third-party Java wrapper) would sacrifice reliability. The subprocess bridge adds ~1s latency per call — but the daemon pool eliminates that.

**Why a daemon pool instead of spawning a process per call?**
Python interpreter startup costs ~0.5–1s regardless of what the script does. With 5-second update cycles and ~10 stocks, sequential spawning would consume the entire update window. The daemon pool reduces per-call overhead to essentially the yfinance network round-trip time (~0.3–0.5s).

**Why MailerSend instead of SMTP?**
MailerSend has a generous free tier (3,000 emails/month), a clean Java SDK, and handles deliverability (SPF, DKIM, DMARC) automatically through their trial domain. No SMTP server to manage. The SDK wraps all API calls and exposes response status, message ID, and rate limit info directly on the response object.

**GBp pence handling**
London Stock Exchange prices in yfinance are in pence (GBp), not pounds (GBP). A stock priced at 1500 GBp is £15.00. This trips up most integrations. All Python scripts explicitly check `fast_info.currency == 'GBp'` and divide by 100 before any conversion.

**Backfill strategy**
When a stock is added, the full price history is fetched asynchronously (non-blocking). The start date is `min(buyDate, 3 months ago)` — so a stock bought today still gets 3 months of context for charting. A `backfilled` boolean field on `StockHolding` tracks completion. The backfill cron also retriggers for any holding with fewer than 30 history records, catching edge cases where history was sparse.

**Multi-tenancy**
All documents are tagged with `userId`. All service methods call `authUtils.getCurrentUserId()` from the JWT security context. There is no shared state between users. The admin role can manage accounts but cannot read other users' financial data.

**Self-updating deploy script**
`update.sh` is intentionally separate from `deploy.sh`. When bash starts executing a script, it reads ahead in 512-byte chunks. If `git pull` updates `deploy.sh` mid-execution, bash would run a mix of old and new commands. The solution: `update.sh` does the pull, then hands off with `exec bash deploy.sh` — starting a fresh bash process that reads the newly-pulled file from the beginning.

**Privacy mode**
A toggle in the nav hides all monetary values behind `***`. This is purely client-side — it applies a CSS class that blanks out values. Useful when working in a public place or sharing your screen.
