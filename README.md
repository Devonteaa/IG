# Inventory Guardian (Teams Tab) — StockPilot-style clone

This is a **ready-to-export** Teams Tab web app (React + TypeScript) that recreates the StockPilot UI you shared:
- Overview dashboard (KPIs, Top 5 attention, category distribution, summary)
- Inventory management table + filters
- Stock adjustments + recent adjustments
- Trends charts
- Alerts + acknowledge
- Reports + Export CSV
- Settings (theme, notifications, forecasting, etc.)
- Global Office filter (scopes all pages)

## 1) Run locally
```bash
npm install
npm run dev
```
Open: http://localhost:5173/#/overview

## 2) Build (exportable)
```bash
npm run build
```
Output: `dist/`

Host the `dist/` folder on any HTTPS web host (Azure Static Web Apps is ideal).

## 3) Package as a Teams app (exportable)
1. Update `teams/manifest.json`:
   - Replace `YOUR_DOMAIN` with your host (example: `myapp.azurestaticapps.net`)
   - Replace the app `id` with a real GUID
   - Ensure `validDomains` matches your host

2. Zip the Teams package:
   - Include:
     - `teams/manifest.json`
     - `teams/color.png`
     - `teams/outline.png`

   Example zip structure:
   ```
   manifest.json
   color.png
   outline.png
   ```

3. Upload in Teams:
   - Teams → Apps → Manage your apps → Upload a custom app

## 4) Connect to your SharePoint Lists (next step)
Right now this project runs on **mock data**.
To wire it to your SharePoint site:
- Use Teams SSO + Microsoft Graph
- Read/write your lists:
  - InventoryItems
  - StockAdjustments
  - Categories
  - Locations

If you want, I can generate the Graph client + Azure Function API layer and swap the store to live data.
