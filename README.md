# 🍫 Chill & Choc — Modern Confectionery Retail POS System

> **Cool Vibes, Sweet Bites**  
> A high-performance, keyboard-driven Point of Sale (POS) and cashier terminal management system crafted specifically for high-speed confectionery and retail checkout environments.

---

[![React 19](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## 📖 Table of Contents
- [✨ Key Features](#-key-features)
- [🖥️ Workstation Screens](#️-workstation-screens)
  - [1. POS Billing Terminal (`/cashier/pos`)](#1-pos-billing-terminal-cashierpos)
  - [2. Parked & Held Bills Modal (`F7`)](#2-parked--held-bills-modal-f7)
  - [3. Sales History & Receipt Reprint (`/cashier/sales-history`)](#3-sales-history--receipt-reprint-cashiersales-history)
  - [4. Returns & Refunds Engine (`/cashier/returns`)](#4-returns--refunds-engine-cashierreturns)
  - [5. Cash Session & Drawer Float (`/cashier/cash-session`)](#5-cash-session--drawer-float-cashiercash-session)
  - [6. Persistent Terminal Lock & Security](#6-persistent-terminal-lock--security)
- [⌨️ Keyboard Shortcuts Cheat-Sheet](#️-keyboard-shortcuts-cheat-sheet)
- [🏗️ Project Architecture & Structure](#️-project-architecture--structure)
- [🚀 Getting Started](#-getting-started)
- [🔐 Demo Credentials](#-demo-credentials)
- [🎨 Design Language & Mascot Assets](#-design-language--mascot-assets)

---

## ✨ Key Features

- **⚡ Sub-Millisecond Ergonomics**: Designed for retail cashiers who rely exclusively on physical barcode scanners and keyboard numpads without touching a mouse.
- **⌨️ 100% Keyboard-Driven Workflow**: Comprehensive Function key mapping (<kbd>F1</kbd>–<kbd>F12</kbd>), instant bill parking (<kbd>F6</kbd>), 1-key resuming (<kbd>1</kbd>–<kbd>9</kbd>), and line item quantity adjustments (<kbd>+</kbd>/<kbd>-</kbd>).
- **🔒 Refresh-Persistent Terminal Locking**: High-security lock screen overlay with PIN authentication that persists across browser reloads (<kbd>F5</kbd>) via synchronized storage.
- **🧾 Thermal Slip Preview & 80mm Printing**: Instant pixel-perfect thermal receipt generation for completed, reprinted, and parked orders.
- **📊 Real-Time Cash Drawer Float Reconciliation**: Active tracking of drawer cash sales, refunds, expenses, and bank drops with automated over/short calculations.
- **🎨 Custom Mascot Visual Design**: Branded illustrations featuring the *Chill & Choc* confectionery panda mascot for warnings, parking, locking, and transaction analytics.

---

## 🖥️ Workstation Screens

### 1. POS Billing Terminal (`/cashier/pos`)
- **3-Section High-Efficiency Grid**:
  - **Left Section**: Interactive product catalog with categories (Chocolates, Gifting Boxes, Wafers, Candies, Ice Cream), barcode search, and stock badges.
  - **Center Section**: Real-time cart calculation table, customer loyalty tags, line discounts, note annotations, and per-item salesperson commission assignment.
  - **Right Section**: Amount entering, quick cash denominations (Rs. 500, 1000, 5000), real-time change calculation, and multi-tender completion (Cash, Card, Split).
- **Header Workstation Strip**:
  - Live clock, store outlet, cashier identifier, active cash drawer float, fullscreen toggle, lock terminal, and cash-out settlement.

### 2. Parked & Held Bills Modal (`F7`)
- Two-column pop-up displaying parked customer carts with [`helt.png`](public/helt.png).
- **1-to-9 Quick Resume**: Cashiers can press keys <kbd>1</kbd> through <kbd>9</kbd> to resume held bills by display order instantly.
- Compact confirmation alerts with [`warning.png`](public/warning.png) for bill deletion or active cart replacement.

### 3. Sales History & Receipt Reprint (`/cashier/sales-history`)
- Dedicated full-viewport workstation layout (100vh) with mascot [`histry.png`](public/histry.png) and real-time revenue analytics.
- **Compact Records Table ("Small Perfectly")**: Tight ~38px row height, sticky header, invoice codes, timestamps, tender pills, and item counts.
- **Custom Designed Calendar Picker**: Interactive month-by-month calendar with quick preset chips (`Today`, `Yesterday`, `This Month`, `All`).
- Instant <kbd>Backspace</kbd> shortcut to return straight to the POS terminal when no text field is active.

### 4. Returns & Refunds Engine (`/cashier/returns`)
- Scan or type past invoice numbers (`INV-001829`) to pull itemized historical sales.
- Line-by-line return item selection, quantity adjustment, return reason categorization, stock return toggle, and multi-tender refund processing.

### 5. Cash Session & Drawer Float (`/cashier/cash-session`)
- Comprehensive cashier shift management:
  - Opening float declaration.
  - Mid-shift cash movements: Cash In, Cash Out, Drawer Float, Petty Cash, and Bank Drops with manager authorization.
  - End-of-shift drawer reconciliation: Counted cash vs expected cash difference calculations and discrepancy logging.

### 6. Persistent Terminal Lock & Security
- Lock terminal at any moment using <kbd>Shift</kbd> + <kbd>L</kbd> or the top header lock icon.
- Clean modal card featuring [`lock.png`](public/lock.png), PIN indicator dots, and physical keyboard entry (no onscreen keypad clutter).
- **Guaranteed Persistence**: Stored in `localStorage` — refreshing the browser will keep the terminal securely locked until the correct 4-digit PIN is entered.

---

## ⌨️ Keyboard Shortcuts Cheat-Sheet

### 1. Function Keys (<kbd>F1</kbd> – <kbd>F12</kbd>)
| Key | Action | Description |
| :---: | :--- | :--- |
| <kbd>F1</kbd> | **Search / Scan** | Focuses the barcode scanner and product search input. |
| <kbd>F2</kbd> | **Quantity** | Opens quantity adjustment modal for the selected line item. |
| <kbd>F3</kbd> | **Discount** | Opens percentage or fixed discount modal (item or entire bill). |
| <kbd>F4</kbd> | **Salesperson** | Opens team member selector for sales commission tracking. |
| <kbd>F5</kbd> | **Payment** | Opens multi-tender payment modal (Cash, Card, Split). |
| <kbd>F6</kbd> | **Hold Bill** | Parks current customer cart with 3-step chained <kbd>Enter</kbd> flow. |
| <kbd>F7</kbd> | **Held Bills** | Opens parked bills list to review or resume orders. |
| <kbd>F8</kbd> | **Customer** | Opens loyalty customer search and registration modal. |
| <kbd>F9</kbd> | **Returns** | Navigates to the Returns & Refunds screen. |
| <kbd>F10</kbd>| **Cash Movement**| Opens Cash In, Cash Out, Petty Cash & Bank Drop modal. |
| <kbd>F12</kbd>| **Quick Pay** | Settles transaction with exact tender immediately. |

### 2. Cart & Navigation Keys
| Key | Action | Description |
| :---: | :--- | :--- |
| <kbd>↑</kbd> | **Select Previous Item** | Navigates up through the cart items list. |
| <kbd>↓</kbd> | **Select Next Item** | Navigates down through the cart items list. |
| <kbd>+</kbd> or <kbd>=</kbd> | **Increase Quantity (+1)** | Adds 1 to the selected cart item quantity. |
| <kbd>-</kbd> or <kbd>_</kbd> | **Decrease Quantity (-1)** | Decrements 1 from the selected cart item quantity. |
| <kbd>@</kbd> *(Shift+2)* | **Assign Salesperson** | Quick shortcut to assign staff member to line item. |
| <kbd>Shift</kbd> + <kbd>C</kbd> | **Clear Cart** | Prompts confirmation to clear all active cart items. |
| <kbd>Shift</kbd> + <kbd>L</kbd> | **Lock Terminal** | Instantly prompts to lock register anywhere in the application. |
| <kbd>Enter</kbd> | **Focus / Tender** | Focuses Amount Received input; inside input, completes sale. |
| <kbd>?</kbd> | **Keyboard Help** | Opens interactive modal showing all system shortcuts. |
| <kbd>Escape</kbd> | **Close / Dismiss** | Closes any open modal or dismisses confirmation dialogs. |

### 3. Context-Specific Shortcuts
- **Held Bills Modal**: Keys <kbd>1</kbd>–<kbd>9</kbd> resume the corresponding held bill in display order.
- **Hold Bill Modal**: <kbd>1st Enter</kbd> (Customer) → <kbd>2nd Enter</kbd> (Reason) → <kbd>3rd Enter</kbd> (Hold bill).
- **Sales History Page**: Pressing <kbd>Backspace</kbd> returns straight to POS terminal when no input field is active.
- **Lock Screen**: Physical digits <kbd>0</kbd>–<kbd>9</kbd> fill PIN dots; 4th digit or <kbd>Enter</kbd> unlocks.

---

## 🏗️ Project Architecture & Structure

```
SYS/
├── public/
│   ├── logo.png               # Brand logo (panda & confection cone)
│   ├── lock.png               # Mascot holding lock (terminal lock screen)
│   ├── helt.png               # Mascot holding bill (parked bills modal)
│   ├── hold.png               # Mascot parking cart (hold bill modal)
│   ├── histry.png             # Mascot at desk with receipts (sales history)
│   └── warning.png            # Mascot with warning triangle (dialogs)
├── src/
│   ├── components/
│   │   ├── common/            # AppFooter, Modal, CustomDatePicker, ToastContainer
│   │   ├── modals/            # PaymentModal, HoldBillModal, HeldBillsModal,
│   │   │                      # ReceiptPreviewModal, CashMovementModal, etc.
│   │   └── pos/               # CashierHeader, CenterCartView, ProductListView,
│   │                          # RightBillingPanel, POSLockScreen, POSShortcutBar
│   ├── data/
│   │   ├── mockProducts.ts    # Confectionery catalog with barcodes & weights
│   │   ├── mockEmployees.ts   # Cashiers and sales team members
│   │   ├── mockSales.ts       # Completed sales history with multi-tenders
│   │   └── mockHeldBills.ts   # Parked orders
│   ├── hooks/
│   │   └── usePosShortcuts.ts # Core global keyboard event dispatcher
│   ├── pages/cashier/
│   │   ├── PosScreen.tsx          # Main POS terminal (/cashier/pos)
│   │   ├── SalesHistoryScreen.tsx # Sales history workstation
│   │   ├── ReturnsScreen.tsx      # Return & refund processing
│   │   ├── CashSessionScreen.tsx  # Shift open/close and drawer reconciliation
│   │   ├── CashierLogin.tsx       # Cashier login screen
│   │   └── CashierPin.tsx         # Quick PIN entry screen
│   ├── stores/                # Typed reactive Context providers:
│   │   ├── cashierStore.tsx   # Shift sessions, float, and persistent lock
│   │   ├── cartStore.tsx      # Cart items, discounts, line calculations
│   │   ├── salesStore.tsx     # Completed transactions & invoices
│   │   ├── heldBillsStore.tsx # Parked bill state & resume handlers
│   │   ├── returnsStore.tsx   # Return requests & refund tracking
│   │   └── toastStore.tsx     # Toast notification manager
│   ├── types/
│   │   └── index.ts           # Shared TypeScript interfaces & types
│   ├── App.tsx                # Client-side router configuration
│   └── main.tsx               # Application root entry point
├── tailwind.config.js         # Curated confectionery theme tokens
├── vite.config.ts             # Vite 8 build & bundler configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm** or **pnpm** / **yarn**

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/chill-and-choc-pos.git
   cd chill-and-choc-pos
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser and navigate to:
   ```
   http://localhost:5173/cashier/pos
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build locally**:
   ```bash
   npm run preview
   ```

---

## 🔐 Demo Credentials

The application is loaded with realistic mock confectionery data for immediate testing:

| Role | Username / ID | PIN / Password | Notes |
| :--- | :--- | :--- | :--- |
| **Cashier** | Nimal Perera | `1234` *(or any 4-digit PIN)* | Active register `POS-01` |
| **Manager Auth** | Manager / Admin | `1234` or `admin` | Used for Cash Out, Drawer Drops & Expenses |

---

## 🎨 Design Language & Mascot Assets

Chill & Choc features a bespoke retail confectionery visual language:

- **Warm Cream Background (`#FAF8F5`)**: High contrast, glare-free aesthetic for 8+ hour cashier shifts.
- **Brand Accent Orange (`#FF5500` / `#E04B00`)**: Primary actions, totals, and invoice badges.
- **Chocolate Brown (`#4A2B20`)**: Deep typography and rich branding accents.
- **Fresh Emerald (`#10B981` / `#059669`)**: Payment success states and completed status tags.
- **Mascot Illustration Suite**:
  - `logo.png`: Main panda mascot with confection cone.
  - `ks.png`: Panda typing on mechanical keyboard for the shortcuts modal.
  - `lock.png`: Panda holding yellow security lock.
  - `helt.png`: Panda holding receipt slip for parked bills.
  - `hold.png`: Panda parking shopping basket.
  - `histry.png`: Panda with register workstation, reports, and receipts.
  - `warning.png`: Panda holding warning triangle for critical alerts.

---

## 📄 License

This project is licensed under the **MIT License** — feel free to use and adapt for commercial or personal point-of-sale projects.

Developed with ❤️ for **Chill & Choc Retail Management**.
