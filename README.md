# Mannu — farm to home

Mannu (ಮಣ್ಣು / மண் / మన్ను — "soil") is a marketplace where farmers sell vegetables, fruits, rice, pulses, oils and more directly to customers. Customers shop across many farms in one cart; each farm gets its own order, accepts it, packs it and delivers it (or the customer picks it up).

Built with **React + Tailwind CSS**, **Node.js + Express**, **MongoDB**, JWT auth with three roles (customer, farmer, admin) and Cloudinary image storage. The interface works in **English, ಕನ್ನಡ, தமிழ், తెలుగు**.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the design: stack, database schema, order lifecycle and workflows.

## Quick start (local)

You need **Node.js 20+** and **MongoDB** (local install, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. Install everything
npm install            # installs the dev runner
npm run install:all    # installs server/ and client/

# 2. Configure the API
cp server/.env.example server/.env     # then edit MONGODB_URI if needed

# 3. Load the demo farms, products, orders and accounts
npm run seed

# 4. Run API (port 5000) + React app (port 5173) together
npm run dev
```

Open http://localhost:5173.

No MongoDB installed? Start one with Docker: `docker run -d -p 27017:27017 --name mannu-db mongo:7`

### Demo accounts

All demo accounts use the password **`Mannu@2026`** (the login page has one-click buttons for them).

| Role | Email | What to try |
|---|---|---|
| Customer | `customer@mannu.in` | Shop from two farms, checkout, track orders, rate delivered products |
| Customer (bulk buyer) | `arun@mannu.in` | Mess owner buying rice and tomatoes in bulk |
| Farmer | `lakshmi@mannu.in` | Has 2 new orders waiting to be accepted; UI opens in Kannada |
| Farmer | `ramesh@mannu.in`, `murugan@mannu.in`, `venkata@mannu.in`, `savitha@mannu.in` | Other farms (Kolar, Thanjavur, Madanapalle, Sirsi) |
| Farmer (not verified yet) | `anjali@mannu.in` | Products hidden from the shop until an admin approves |
| Admin | `admin@mannu.in` | Approve Anjali's farm, handle the open complaint, change the platform fee |

## Features

**Real photography** — every demo product, farm and category has a real photo, and the home page, farm pages, harvest calendar, sign-in pages and farmer dashboard are built around full-bleed photos of farmers and fields. Farmers can upload their own product photos and a farm cover photo.

**Customers** — browse and search (also in Kannada/Tamil/Telugu names), filter by category, price, farm district, organic, in-season and bulk; see the farmer, village and stock on every product; bulk prices applied automatically; one cart across many farms with delivery or pickup chosen per farm; saved addresses; cash or UPI on delivery / pay at pickup; receipt; order tracking timeline; cancel before the farmer accepts; ratings after delivery; complaints; **"Order again"** on any past order (adds what is still available to the cart at today's prices); **harvest calendar** (`/season`) showing what each farm harvests month by month; **freshness labels** ("Picked today", "Picked 2 days ago") from the farmer's harvest date; **notifications** for every status change.

**Farmers** — register with farm name and location; dashboard with new orders, earnings received and money still to collect, 14-day sales chart, best sellers and low-stock alerts; add/edit products with up to 4 photos (phone camera supported), unit (kg, g, litre, ml, piece, dozen, bunch), price, stock, minimum order, bulk price tiers, season months, harvest date, organic flag; quick stock/price update; accept or reject orders (with a reason), mark packed → out for delivery / ready for pickup → delivered / picked up, record payment; a notification bell for new orders, cancellations, verification results and low stock; a farm cover photo shown on their farm page and dashboard; delivery fee, free-delivery threshold, pickup address and preparation time.

**Admin** — verify or reject farmer registrations; suspend or reactivate accounts (with reason); manage categories and their translations; block products; all orders and payments; complaints and reported accounts with replies; platform statistics; set the platform fee.

**Honest money handling** — there is no fake payment gateway. Orders are paid in cash/UPI to the farmer on delivery or at pickup, and show "Not paid yet" until the farmer records the payment. Every charge (items, farm delivery fee, platform fee) is calculated on the server and shown in the cart, at checkout and on the receipt. To add online payments later, integrate a gateway such as Razorpay at `POST /api/orders`.

**Stock** — checked when an order is placed, deducted atomically when the farmer accepts (never below zero), restored if an accepted order is cancelled.

## Security

- Passwords hashed with bcrypt (cost 12); sessions are JWTs in `httpOnly`, `SameSite=Lax` cookies (`Secure` in production)
- Role checks on every protected route, and ownership checks (a farmer can only touch their own products and orders; customers only see their own orders)
- All input validated with zod; Mongo operator injection stripped (`express-mongo-sanitize`)
- Rate limiting (stricter on login/register), `helmet` security headers with a Content Security Policy, cross-site POST guard
- Uploads limited to JPG/PNG/WebP up to 3 MB, verified by file signature, not just extension
- Suspended users are locked out immediately; unverified or suspended farmers' products are hidden and cannot be ordered

## Images

**Uploads** — set `CLOUDINARY_URL` in `server/.env` and photos farmers upload go to Cloudinary (resized to max 1200 px). Without it, photos are saved to `server/uploads/` — fine for development, but use Cloudinary in production because most hosts wipe local disks on redeploy.

**Demo photos** — the seed data uses free photos from [Unsplash](https://unsplash.com/license) (free for commercial use, no attribution required; the footer credits Unsplash anyway). They are listed in `server/src/seed/images.js` (products, farm covers, categories) and `client/src/lib/images.js` (hero and page backgrounds), and load from Unsplash's image CDN at the size each screen needs. To copy them into your own storage instead (recommended before going live):

```bash
npm run images:localize   # downloads every demo photo into Cloudinary or server/uploads and updates the database
```

The farm cover photos show the kind of land each farm works (paddy, orchard, vegetable rows); they are not photos of the fictional demo farms themselves. If a photo ever fails to load, the card falls back to an illustrated tile, so nothing breaks.

## Tests

```bash
# API tests — 13 end-to-end scenarios (needs MongoDB running; uses a separate mannu_test database)
npm test

# Browser test of the full journey (Python + Playwright, against a running app with demo data)
pip install playwright && playwright install chromium
python e2e/ui_flow.py
```

The browser test: farmer adds a product with a photo and bulk price → customer buys 6 kg (bulk price applied), chooses pickup and checks out → farmer accepts, packs, marks ready, records payment, marks picked up → stock drops from 30 to 24 kg → both sides see notifications → farmer uploads a farm cover photo → customer rates the product and uses "Order again" → harvest calendar opens → a new farmer registers and an admin approves them → language switch to Tamil.

## Deploy

The production build is **one service**: Express serves the API and the built React app from the same origin.

**Render.com (free)** — push this folder to GitHub, then in Render choose **New → Blueprint**, pick the repository, and enter `MONGODB_URI` (MongoDB Atlas, with Network Access allowing `0.0.0.0/0`) when asked. Add `CLOUDINARY_URL` later under the service's Environment tab so photos farmers upload survive redeploys. `render.yaml` does the rest: it builds the React app, generates `JWT_SECRET`, and sets `SEED_DEMO_DATA=true` so the demo farms and accounts load automatically the first time the database is empty (it never touches a database that already has users). Free Render services sleep after 15 minutes without visitors, so the first visit after a pause takes about a minute.

**Docker / any VPS**

```bash
docker build -t mannu .
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="$(openssl rand -hex 48)" \
  -e CLOUDINARY_URL="cloudinary://..." \
  mannu
```

Serve it behind HTTPS (secure cookies require it). To try a production build on plain `http://localhost`, add `-e COOKIE_SECURE=false`.

**Manual** — `npm run build`, then `NODE_ENV=production npm start` with the environment variables above.

## Project layout

```
server/src/
  config/       env + database
  models/       User, FarmerProfile, Category, Product, Order, Review, Complaint, Setting
  middleware/   auth & roles, validation, uploads, error handling
  routes/       auth, catalog, orders (cart quote + checkout), farmer, community (reviews, complaints), admin
  utils/        pricing (server-side cart quote), order flow (stock), helpers
  seed/         demo data
server/test/    API tests
client/src/
  i18n/         en, kn, ta, te
  context/      auth, cart
  components/   layout, product card, order timeline, dashboard shell, UI kit
  pages/        shop pages, cart/checkout, orders, account, help, farmer/*, admin/*
e2e/            browser journey test
```

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/logout`; `GET/PATCH /api/auth/me`; `PATCH /me/password`; `POST/PUT/DELETE /me/addresses` |
| Catalog | `GET /api/categories`, `/products` (q, category, district, minPrice, maxPrice, organic, inSeason, seasonal, bulk, ids, inStock, sort, page), `/products/:id`, `/farmers`, `/farmers/:id`, `/districts` |
| Orders | `POST /api/cart/quote`, `POST /api/orders`, `GET /api/orders/mine`, `/orders/group/:groupId`, `/orders/:id`, `POST /orders/:id/cancel` |
| Farmer | `GET/PUT /api/farmer/profile`, `POST /profile/photo`, `POST /profile/cover`, products CRUD + `/stock`, `/active`, `/images`; `GET /orders`, `PATCH /orders/:id/status`, `/orders/:id/payment`; `GET /stats` |
| Notifications | `GET /api/notifications`, `POST /api/notifications/read` |
| Community | `POST /api/reviews`, `GET /reviews/mine`, `POST /api/complaints`, `GET /complaints/mine` |
| Admin | `/api/admin/stats`, `/farmers` + `/verify`, `/users` + `/status`, `/categories`, `/products` + `/block`, `/orders`, `/complaints`, `/settings` |
