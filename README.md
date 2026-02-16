# Invoice Aggregator

Automated invoice collection from multiple advertising and service platforms.
Upload your monthly Brex export, and the app matches each transaction to a
configured provider and fetches the corresponding invoice via API, email, or
portal scraping.

## Built-in Providers

| Provider    | API | Email | Portal Scraping |
|------------|-----|-------|-----------------|
| Google Ads  | Yes | Yes   | Yes             |
| Meta Ads    | Yes | Yes   | Yes             |
| Criteo      | Yes | Yes   | Yes             |
| Amazon Ads  | Yes | Yes   | Yes             |
| AppLovin    | Yes | Yes   | Yes             |
| Custom      | --  | Yes   | Yes             |

You can add unlimited custom providers through the UI for any other service.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your API credentials, email IMAP settings, etc.

# 3. Run in development mode (frontend + backend)
npm run dev
```

The app runs at:
- **Frontend**: http://localhost:3000 (Vite dev server)
- **Backend API**: http://localhost:3001/api

## Production Build

```bash
npm run build
npm start
# Serves both API and frontend on http://localhost:3001
```

## How It Works

1. **Upload** — Drop a Brex CSV or XLSX export into the upload page
2. **Match** — The app parses transactions and matches vendor names against
   configured provider patterns (e.g. "google ads" matches the Google Ads provider)
3. **Fetch** — Click "Fetch All Invoices" to pull invoices from each provider
   using your preferred method (API, email parsing, or portal scraping)
4. **Download** — View status per invoice and download PDFs from the results page

## Configuration

### Provider Setup

Go to the **Providers** tab in the UI to:
- Enable/disable providers
- Enter API credentials
- Set vendor name patterns (how Brex transactions are matched)
- Choose fetch method (API, email, or portal scraping)
- Add custom providers for any service

### Fetch Methods

**API** — Direct integration with the provider's billing API. Requires
API credentials (OAuth tokens, API keys, etc.) configured per provider.

**Email** — Connects to your IMAP inbox and searches for invoice emails
from the provider. Requires IMAP settings in `.env`:
```
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_IMAP_USER=you@company.com
EMAIL_IMAP_PASSWORD=your-app-password
EMAIL_IMAP_TLS=true
```

**Portal Scraping** — Uses Puppeteer (headless Chrome) to log into the
provider's billing portal and download invoices. Requires:
- Chrome/Chromium installed on the system
- Set `PUPPETEER_EXECUTABLE_PATH` in `.env` to the Chrome binary path
- Portal login credentials in the provider config

### Brex Export Format

The parser handles common Brex CSV/XLSX column names:
- **Date**: `Date`, `Posted Date`, `Transaction Date`
- **Vendor**: `Merchant`, `Merchant Name`, `Vendor`, `Name`
- **Amount**: `Amount`, `Amount (USD)`, `Total`
- **Category**: `Category`, `Expense Category` (optional)
- **Currency**: `Currency` (defaults to USD)

### Adding a New Provider (Code)

1. Create a new file in `src/server/providers/`:

```typescript
import { BaseProvider } from "./base-provider.js";
import { registry } from "./provider-registry.js";

class MyProvider extends BaseProvider {
  readonly id = "my-provider";
  readonly name = "My Provider";

  async fetchViaApi(transaction, config) {
    // Your API integration logic
  }
}

const provider = new MyProvider();
registry.register(provider, {
  id: "my-provider",
  name: "My Provider",
  description: "Fetch invoices from My Provider",
  icon: "custom",
  supportedMethods: ["api", "email", "portal"],
  defaultVendorPatterns: ["my provider"],
  requiredSettings: [
    { key: "apiKey", label: "API Key", type: "password", required: true },
  ],
});
```

2. Import the file in `src/server/index.ts`:
```typescript
import "./providers/my-provider.js";
```

## Project Structure

```
src/
  server/                  # Express backend
    index.ts               # Server entry point
    routes/
      upload.ts            # POST /api/upload
      invoices.ts          # Invoice job management
      providers.ts         # Provider CRUD
      settings.ts          # Health check and settings
    services/
      spreadsheet-parser.ts  # Brex CSV/XLSX parser
      invoice-aggregator.ts  # Orchestration engine
      email-fetcher.ts       # IMAP email search
      portal-scraper.ts      # Puppeteer portal scraper
      config-store.ts        # Persistent config storage
    providers/
      base-provider.ts       # Abstract base class
      provider-registry.ts   # Plugin registry
      google-ads.ts
      meta-ads.ts
      criteo.ts
      amazon-ads.ts
      applovin.ts
      custom-provider.ts     # Template for custom providers
  client/                  # React frontend
    App.tsx                # Main app with navigation
    components/
      Dashboard.tsx        # Job list and overview
      FileUpload.tsx       # Drag-and-drop upload
      JobViewer.tsx        # Invoice results and progress
      ProviderManager.tsx  # Provider configuration
  shared/
    types.ts               # Shared TypeScript types
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/upload` | Upload Brex CSV/XLSX |
| GET    | `/api/invoices/jobs` | List all jobs |
| GET    | `/api/invoices/jobs/:id` | Get job details |
| POST   | `/api/invoices/jobs/:id/fetch` | Start fetching invoices |
| GET    | `/api/invoices/download/:jobId/:invoiceId` | Download invoice file |
| GET    | `/api/providers/definitions` | List provider templates |
| GET    | `/api/providers/configs` | List configured providers |
| PUT    | `/api/providers/configs/:id` | Update provider config |
| POST   | `/api/providers/configs` | Add custom provider |
| DELETE | `/api/providers/configs/:id` | Remove provider |

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS
- **Backend**: Express, TypeScript, Node.js
- **Spreadsheet**: SheetJS (xlsx)
- **Email**: imap-simple + mailparser
- **Scraping**: puppeteer-core
