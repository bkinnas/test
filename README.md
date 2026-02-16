# Invoice Aggregator

Automated invoice collection from multiple advertising and service platforms.
Upload your monthly Brex export and the app matches each transaction to a
configured provider and fetches the corresponding invoice via API, email, or
portal scraping.

---

## Prerequisites

Before you begin, make sure you have **Node.js version 18 or higher** installed.

**Check if Node.js is installed** by opening a terminal and running:

```
node --version
```

If you see a version number like `v18.x.x` or higher, you're good. If you get
an error or see a version below 18, download and install Node.js from:

https://nodejs.org

(Choose the **LTS** version. The installer works on Windows, Mac, and Linux.)

---

## Getting Started (Step by Step)

### Step 1: Open a Terminal

- **Windows**: Press `Win + R`, type `cmd`, and press Enter. Or search for
  "Command Prompt" or "PowerShell" in the Start menu.
- **Mac**: Open the "Terminal" app (in Applications > Utilities).
- **Linux**: Open your terminal emulator.

### Step 2: Navigate to the Project Folder

Use the `cd` command to go to the folder where you downloaded/cloned this
project. For example:

```
cd C:\Users\YourName\Documents\invoice-aggregator
```

(Replace the path with wherever your project folder actually is.)

### Step 3: Install Dependencies

Run this command:

```
npm install
```

This downloads all the libraries the app needs. It may take a minute or two.
You'll see some progress output — wait until it finishes.

> **If you get an error about "execution policy" on Windows (PowerShell):**
> Run this first, then try `npm install` again:
> ```
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

> **If you get a "permission denied" error on Mac/Linux:**
> Try: `sudo npm install`

### Step 4: Run Setup

This creates your configuration file and required folders:

```
npm run setup
```

You should see output like:
```
===========================================
  Invoice Aggregator — Setup
===========================================

[OK] Node.js v20.x.x
[OK] Created .env from .env.example
[OK] Created directory: data
[OK] Created directory: data/invoices
[OK] Created directory: uploads

  Setup complete!
```

### Step 5: Start the App

```
npm run dev
```

This starts both the backend server and the frontend. You should see output
indicating both are running.

### Step 6: Open in Your Browser

Go to:

**http://localhost:3000**

You should see the Invoice Aggregator dashboard.

---

## How to Use

### 1. Configure Your Providers

Before uploading a Brex export, set up at least one provider:

1. Click **Providers** in the top navigation
2. You'll see the built-in providers (Google Ads, Meta Ads, etc.)
3. Click the **toggle switch** to enable a provider
4. Click **Configure** to enter your API credentials and settings
5. Make sure the **vendor patterns** match how the vendor appears in your
   Brex export (e.g., "google ads", "meta platforms")
6. Click **Save Configuration**

### 2. Upload Your Brex Export

1. Click **Upload** in the top navigation
2. Drag and drop your Brex CSV or XLSX file, or click to browse
3. The app parses your transactions and shows which ones matched a provider

### 3. Fetch Invoices

1. After uploading, you'll see a results page with matched transactions
2. Click **Fetch All Invoices** to start pulling invoices from each provider
3. Watch the progress bar as each provider is queried
4. Download individual invoices or view the status of each one

### 4. Add Custom Providers

For services not built-in (like TikTok Ads, Shopify, etc.):

1. Go to **Providers** and click **+ Add Custom Provider**
2. Enter the provider name and vendor patterns
3. Configure email sender patterns or a portal URL
4. Enable the provider and save

---

## Built-in Providers

| Provider    | API | Email | Portal Scraping |
|-------------|-----|-------|-----------------|
| Google Ads  | Yes | Yes   | Yes             |
| Meta Ads    | Yes | Yes   | Yes             |
| Criteo      | Yes | Yes   | Yes             |
| Amazon Ads  | Yes | Yes   | Yes             |
| AppLovin    | Yes | Yes   | Yes             |
| Custom      | --  | Yes   | Yes             |

---

## Invoice Fetch Methods

The app supports three ways to get invoices from each provider. You pick
which method to use per provider in the Providers settings.

### API (Direct)

Calls the provider's billing API directly. This is the fastest and most
reliable method, but requires API credentials for each service.

### Email (IMAP)

Connects to your email inbox and searches for invoice emails from the
provider (e.g., emails from `payments-noreply@google.com`). To use this
method, open the `.env` file in a text editor and fill in your email settings:

```
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=you@yourcompany.com
EMAIL_IMAP_PASSWORD=your-app-password
EMAIL_IMAP_TLS=true
```

> **Gmail users**: You need to create an "App Password" in your Google
> Account settings. Your regular Gmail password won't work.

### Portal Scraping

Uses a headless browser (Chrome) to log into the provider's billing portal
and download invoices automatically. To use this method, you need Chrome
or Chromium installed on your computer. Open the `.env` file and set the
path to your Chrome executable:

```
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

Common Chrome paths:
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`
- **Mac**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Linux**: `/usr/bin/google-chrome`

---

## Configuration File (.env)

The `.env` file stores your credentials and settings. It was created
automatically by `npm run setup`. Open it in any text editor (Notepad,
VS Code, etc.) to add your API keys.

**Where is it?** It's in the root of your project folder, named `.env`

> **Note on Windows**: Files starting with a dot may be hidden by default.
> In File Explorer, click View > Show > Hidden items to see it. Or just
> open it directly from your text editor using File > Open.

You only need to fill in the sections for the providers and methods you
plan to use. Leave the rest blank.

---

## Brex Export Format

The app automatically detects common column names from Brex exports:

| What the app looks for | Column names that work |
|------------------------|------------------------|
| Transaction date       | `Date`, `Posted Date`, `Transaction Date` |
| Vendor name            | `Merchant`, `Merchant Name`, `Vendor`, `Name` |
| Amount                 | `Amount`, `Amount (USD)`, `Total` |
| Category (optional)    | `Category`, `Expense Category` |
| Currency (optional)    | `Currency` (defaults to USD if missing) |

Both `.csv` and `.xlsx` files are supported.

---

## Troubleshooting

### "npm is not recognized" or "node is not recognized"

Node.js is not installed (or not in your PATH). Download and install it
from https://nodejs.org. After installing, **close and reopen** your
terminal, then try again.

### npm install shows errors

Try these in order:
1. Make sure you're in the correct project folder (`cd` to it first)
2. Delete the `node_modules` folder and `package-lock.json`, then run
   `npm install` again
3. On Windows, try running Command Prompt as Administrator

### "port 3000 already in use"

Another app is using port 3000. Either close that app, or change the
frontend port in `vite.config.ts` (look for `port: 3000`).

### "port 3001 already in use"

Change `PORT=3001` to a different number in your `.env` file.

### Can't see the .env file on Windows

Files starting with `.` are hidden by default. In File Explorer: View >
Show > Hidden items. Or open it from your text editor directly.

---

## Production Build

When you want to deploy this to a server:

```
npm run build
npm start
```

This builds an optimized version and serves everything on port 3001.

---

## Adding a New Provider via Code

To add support for a new service with full API integration:

1. Create a file in `src/server/providers/` (e.g., `tiktok-ads.ts`)
2. Extend `BaseProvider` and implement `fetchViaApi`, `fetchViaEmail`,
   or `fetchViaPortal` as needed
3. Register it with the provider registry
4. Import the file in `src/server/index.ts`

See any of the existing providers (like `google-ads.ts`) as a reference.

---

## Project Structure

```
invoice-aggregator/
  scripts/
    setup.js               # Setup script (npm run setup)
  src/
    server/                # Backend (Express API)
      index.ts             # Server entry point
      routes/              # API endpoints
      services/            # Business logic
      providers/           # Invoice provider plugins
    client/                # Frontend (React)
      App.tsx              # Main app
      components/          # UI components
    shared/
      types.ts             # Shared TypeScript types
  .env                     # Your local config (not committed to git)
  .env.example             # Template for .env
  package.json             # Dependencies and scripts
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Express, TypeScript, Node.js
- **Spreadsheet**: SheetJS (xlsx)
- **Email**: imap-simple + mailparser
- **Scraping**: puppeteer-core
