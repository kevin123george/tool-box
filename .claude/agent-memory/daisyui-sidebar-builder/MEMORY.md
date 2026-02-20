# DaisyUI Sidebar Builder Memory

## Project Context
- Spring Boot 3.5.6 + MongoDB, port 9099.
- TWO frontends: (1) `src/main/resources/static/index.html` (single-file SPA), (2) `toolbox-frontend/public/` (multi-page Bun frontend).
- DaisyUI 5 + Tailwind CDN. No build step for public/ pages. Icons: emoji in sidebar, inline SVG in theme picker.

## Sidebar Implementation Pattern (multi-page Bun frontend)
- `nav.js` uses DOM restructuring: collects all body children (except `#toastContainer`/`#loadingOverlay`), builds drawer, moves children into `#pageContentWrapper`.
- Root div: `<div class="drawer lg:drawer-open is-drawer-open" id="drawerRoot">`
- Toggle state via `is-drawer-open` / `is-drawer-close` classes on `#drawerRoot` (NOT the checkbox)
- `.sidebar-aside` class controls width: 240px open, 64px closed — CSS targets `.is-drawer-close .sidebar-aside`
- `.menu-label-text` spans hidden (opacity:0, width:0) in closed mode — used on ALL nav text
- Child menu items hidden in closed mode via `.is-drawer-close details > ul { display:none !important }`
- `<details>` + `<summary>` used for parent-child accordion menus (native HTML, no JS needed)
- Mobile: standard DaisyUI checkbox drawer overlay (`<label for="sidebar-toggle">`)
- Desktop toggle: `toggleSidebar()` JS global persists state in `localStorage.sidebarOpen`
- Chevron: `#sidebarChevronWrap` gets `transform:rotate(180deg)` when closed, `''` when open
- Theme picker: rendered in `#themePickerContainer` (sidebar footer) AND `#themePickerContainerMobile` (mobile topbar)

## Menu Hierarchy (multi-page Bun frontend — toolbox-frontend/public/)
```
[no group]
  Home  →  /
[PRODUCTIVITY]
  Memos  →  /memos.html
[FINANCE]
  Finance  →  /finance.html  (expandable)
    Accounts, Budget, Subscriptions, Calendar, Analytics  → ?tab=...
  Investments  →  /investments.html  (expandable)
    Portfolio, History, Research, Fundamentals, DCF, Screener  → ?tab=...
[HEALTH]
  Fitness  →  /fitness.html
[SYSTEM]
  System  →  /system.html
```
- Active key from `data-active` on `#nav-placeholder` — each HTML page sets its own key.

## Page Navigation Pattern (multi-page Bun frontend)
- Multi-page: each page is a separate .html file with `<div id="nav-placeholder" data-active="pagekey">`
- nav.js reads `data-active` to highlight the correct sidebar item
- No `navigateTo()` or section toggling — standard browser href navigation

## API Endpoints in Use
- `/api/dashboard` → DashboardDTO (netWorth, portfolioValue, budgetIncome, budgetExpenses, fitnessCurrentStreak)
- `/api/finance/summary` → FinanceSummaryDTO (totalBalance, totalByMode, totalByBank)
- `/api/finance` → list or Page<BankAccount> — handle BOTH array and `{content:[]}` shapes
- `/api/memos` → list or Page<Memo> — handle BOTH shapes
- `/api/clipboard` → list or page — handle BOTH shapes
- `/api/goal` → list of FinancialGoal
- `/api/goal/{id}` + `/api/goal/{id}/projection` → goal details + projection text
- `/api/system/stats` → SystemStatsDTO

## Theme
- DaisyUI `data-theme` attribute on `<html>` — "dark" default, "light" on toggle
- Persisted in `localStorage.theme`. Swap component used for sun/moon toggle button.
- `applyTheme(isDark)` sets `data-theme` and updates localStorage.
- DO NOT use custom CSS `--bg`/`--text` vars — use DaisyUI semantic tokens (`hsl(var(--p))`, etc.)

## Key Patterns
- `fmtEur(n)` helper: `new Intl.NumberFormat("de-DE", { style:"currency", currency:"EUR" }).format(n)`
- `fmtPct(n)` helper for percentage formatting
- Modals use `<dialog>` element with `.showModal()` / `.close()` — not old `style.display` approach
- Paginated API responses: always handle both array and `{content: [...]}` shapes
- Toast: `showToast(msg, type)` — dynamically inserts `.toast-custom.alert.alert-{type}`, removes after 2.5s
- Rich editor: contenteditable divs with paste/drop image support via `setupEditor(id)`
- Canvas goal chart: always set `canvas.width = canvas.offsetWidth` before drawing for responsive sizing
