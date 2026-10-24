# LedgerFlow — Fiscal Control, Cash Float & Expense Tracking PWA

**LedgerFlow** is a modern, responsive, installable Progressive Web App (PWA) designed for fast operational expense tracking, cash float / imprest management, live running balances, and one-click Excel (.xlsx) statement generation.

---

## 📱 Mobile-First & PWA Features

### 1. 📲 Installable on Phone (Android & iOS)
- **Home Screen Installation**: Install LedgerFlow directly onto your Android or iPhone home screen with customized app icons.
- **Standalone App Experience**: Launches without browser address bars, tabs, or navigation UI—behaves exactly like a native app.
- **Service Worker & 100% Offline Capability**: Core files, fonts, styles, and SheetJS Excel engine are cached locally. You can log expenses and check balances even with no internet connection!
- **Safe Area Support**: Automatically adapts to iPhone notch, Dynamic Island, and Android gesture navigation bars.
- **No-Zoom Inputs**: Prevents iOS Safari from annoying auto-zooming into fields on focus.

### 2. ⚡ Mobile Floating Action Button (FAB)
- A convenient floating `+` button in the bottom right corner on mobile.
- Tap to quickly pop up options for **Record Expense** or **Add Given Fund** without scrolling.

### 3. 💰 Cash Float (Inflow) Tracking & Live Deductions
- **Log Given Funds**: Capture initial cash floats or subsequent top-ups with dates, disbursement channels, and voucher tags.
- **Auto Deductions**: Every expense subtracts from the available balance in real time.
- **Prominent Balance Hero Metric**: Displays remaining balance, burn rate (% utilized), and visual progress bar.
- **Deficit Alert**: Turns soft red if expenses exceed funds received, highlighting out-of-pocket expenses for reimbursement.
- **Running Balance on Every Ledger Row**: See the resulting balance after every single transaction.

### 4. 📈 Audit-Ready Excel (.xlsx) & CSV Export
- Generates `.xlsx` spreadsheets offline with separate columns for **Fund Received (+)**, **Expense Deducted (-)**, and **Running Balance**.
- Calculated summary totals at the bottom.

---

## 🚀 Live Production URL
Your app is live on Vercel at:
👉 **[https://ledgerflow-flax.vercel.app](https://ledgerflow-flax.vercel.app)**

---

## 📲 How to Install on Your Phone

Because the app is hosted on Vercel with HTTPS, you can install it directly from your phone browser from anywhere in the world!

### Step 1: Open the Live URL on Your Phone
Visit:
```
https://ledgerflow-flax.vercel.app
```

### Step 2: Install as an App

#### On Android (Chrome / Brave / Edge / Samsung Internet):
1. A banner will appear: **"Install LedgerFlow App"** (or tap the **"Install"** button in the header).
2. Tap **"Install"** and confirm.
3. LedgerFlow will now appear on your home screen and app drawer!

#### On iPhone / iPad (Safari):
1. In Safari, tap the **Share** button <span class="material-symbols-outlined">ios_share</span> at the bottom of the screen.
2. Scroll down and tap **"Add to Home Screen"** <span class="material-symbols-outlined">add_box</span>.
3. Tap **"Add"** in the top-right corner.
4. LedgerFlow will appear on your home screen with its app icon and open full-screen!

---

## ⌨️ Keyboard Shortcuts (Desktop)
- <kbd>Alt</kbd> + <kbd>A</kbd>: Jump to Record Expense
- <kbd>Alt</kbd> + <kbd>F</kbd>: Open Add Given Fund modal
- <kbd>/</kbd>: Focus search bar
- <kbd>Escape</kbd>: Close open modals or cancel edit mode
