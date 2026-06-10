# Gated Evergreen Secondary Pricing Tool

Chapter 9 / Section 9.10 decision-support website for the thesis *Liquidity Engineering in Private Equity Funds: A Focus on the Swiss Ecosystem*. Implements the bifurcated framework in `../../PricingModel.md`.

## Run locally

```bash
cd tools/pricing-tool
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No install required — or open `index.html` directly in a browser.

Alternative:

```bash
python3 -m http.server 3000
```

## Deploy on Vercel

### Option A — Vercel dashboard

1. Push this repository to GitHub.
2. [vercel.com/new](https://vercel.com/new) → Import the repo.
3. Set **Root Directory** to `tools/pricing-tool`.
4. Leave **Build Command** empty and **Output Directory** as `.` (static site).
5. Deploy.

### Option B — Vercel CLI

```bash
cd tools/pricing-tool
npx vercel
```

Follow prompts; use this folder as the project root.

Your site will be served at the generated `*.vercel.app` URL.

## Features

- **Hard gating gate** — returns *Redeem at NAV* when redemption works normally.
- **Model A (annuity)** / **Model B (bullet)** regime toggle.
- **Scenario presets** — Partners Group 2026 and distressed REIT (Annex C).
- **Live Optimal Clearing Frontier** — P_target, P_final, P_base, implied discount.
- **Visual range bar** and diagnostics (T_q, g_adj, k).

## When to use

| Use the tool | Do not use |
|---|---|
| Redemption gated, queued or suspended | Normal quarterly redemption at NAV |
| Secondary sale of a gated evergreen LP interest | Closed-end CV or classical LP stake |

## Formulas

See `../../PricingModel.md` and the in-app formula reference.

## Files

| File | Role |
|---|---|
| `index.html` | Page structure |
| `styles.css` | Layout and theme |
| `app.js` | Model logic and UI |
| `vercel.json` | Vercel static deployment config |
| `package.json` | Local dev script |

## Reference

- `../../09_PricingFramework.md` — Chapter 9
- `../../ANNEX_B_SurveyCalibration.md` — calibration grids
- `../../ANNEX_C_ToolWalkthrough.md` — worked scenarios
