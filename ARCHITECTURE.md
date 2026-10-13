# Mannu — architecture and plan

*Mannu* (ಮಣ್ಣು / மண் / మన్ను — "soil") is a marketplace where farmers list what they grow and customers buy directly from them.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS v4, React Router | Fast dev server, small bundle, utility CSS |
| Backend | Node.js 20+ + Express 4 | Simple REST API |
| Database | MongoDB via Mongoose 8 | Flexible product/order documents |
| Auth | JWT in an `httpOnly` cookie, bcrypt password hashes, role middleware | Token never touches JS; roles: `customer`, `farmer`, `admin` |
| Images | Cloudinary (when `CLOUDINARY_URL` is set), local `/uploads` folder otherwise | Works offline in dev, cloud in production |
| Validation | `zod` on every request body | One schema = validation + clear error messages |
| Hardening | `helmet`, rate limiting on auth, `express-mongo-sanitize`, upload type/size limits | Common attack surface covered |

In production the Express server also serves the built React app, so the whole platform deploys as **one service on one origin** (no CORS or cross-site cookie problems).

```
mannu/
├── server/
│   └── src/
│       ├── config/        env, db, cloudinary
│       ├── models/        User, FarmerProfile, Category, Product, Order, Review, Complaint, Setting
│       ├── middleware/    auth (requireAuth, requireRole), validate, upload, errors
│       ├── routes/        auth, catalog, farmers, cart, orders, farmer/*, reviews, complaints, admin/*
│       ├── utils/         pricing, order numbers, async handler
│       └── seed/          realistic demo data
└── client/
    └── src/
        ├── api/           fetch wrapper
        ├── context/       Auth, Cart, Language
        ├── i18n/          en, kn, ta, te dictionaries
        ├── components/    Layout, ProductCard, ProductImage, Logo, StatusBadge…
        └── pages/         public, customer/, farmer/, admin/
```

## 2. Database structure

**User** — `name, email (unique), phone, passwordHash, role (customer|farmer|admin), status (active|suspended), language, addresses[{label, line1, line2, city, district, state, pincode, phone, isDefault}]`

**FarmerProfile** — `user → User (1:1), farmName, bio, location{village, district, state, pincode}, verification{status: pending|approved|rejected, note, reviewedAt}, fulfillment{offersDelivery, deliveryFee, freeDeliveryAbove, deliveryArea, offersPickup, pickupAddress, prepHours}, photo, coverPhoto`

**Category** — `name, slug, icon, image, localNames{kn,ta,te}, sortOrder, isActive`

**Product** — `farmer → User, category → Category, name, localNames{kn,ta,te}, description, images[{url, publicId}], icon, unit (kg|g|litre|ml|unit|dozen|bunch), price (per unit), stock, minOrderQty, bulkTiers[{minQty, price}], seasonal, seasonMonths[1-12], harvestedOn, isOrganic, isActive (farmer), isBlocked (admin), ratingAvg, ratingCount`

**Order** — one document **per farmer per checkout**; a checkout that spans 3 farmers creates 3 orders sharing a `groupId`.
`orderNumber, groupId, customer → User, farmer → User, items[{product, name, unit, price, qty, lineTotal}], fulfillment{method: delivery|pickup, address snapshot | pickupAddress}, charges{subtotal, deliveryFee, serviceFee, total}, payment{method: cash_on_delivery|upi_on_delivery|pay_at_pickup, status: unpaid|paid, paidAt}, status, statusHistory[{status, at, note}], estimatedReadyAt, rejectionReason, stockDeducted`

**Review** — `product, customer, order, rating 1-5, comment` (unique per product + customer)

**Complaint** — `raisedBy → User, against → User?, order → Order?, type (order|account|product|other), subject, message, status (open|in_review|resolved|dismissed), adminNote`

**Notification** — `user, type (order_new|order_status|order_cancelled|farm_verification|complaint_update|stock_low), params, link, read`. Only the type and values are stored; the app writes the sentence in the reader's language.

**Setting** — key/value; `serviceFeePercent` (default 2) and `serviceFeeCap`, editable by admin and shown to customers at checkout.

## 3. Order lifecycle

```
placed ──accept──▶ accepted ──▶ packed ──┬─(delivery)─▶ out_for_delivery ──▶ delivered
  │                   │                    └─(pickup)───▶ ready_for_pickup ──▶ picked_up
  │ reject            │ cancel (farmer, stock restored)
  ▼                   ▼
rejected          cancelled ◀── cancel (customer, only while "placed")
```

* Stock is **checked** when the order is placed and **deducted** atomically when the farmer accepts (`stock >= qty` guard), as the brief asks ("update product stock when orders are confirmed").
* Payment is never simulated. Methods are cash/UPI on delivery or pay at pickup. Payment shows **Unpaid** until the farmer records that they received the money. An online gateway (e.g. Razorpay) is an explicit future integration point, not a fake button.
* Charges are computed **on the server** from current prices: bulk tier price → line totals → farmer's delivery fee (waived above the farmer's free-delivery threshold, zero for pickup) → platform service fee (`%` of subtotal, capped). The same breakdown is shown in the cart, at checkout and on the receipt.

## 4. User workflows

**Customer**: browse/search/filter (category, price, district, organic, seasonal, bulk) → product page shows the farmer, farm location, stock and bulk prices → cart (multiple farmers, grouped by farmer) → checkout (address book, delivery or pickup per farmer, payment method, full charge breakdown) → receipt → track each farmer's order → rate products once delivered → raise a complaint if needed.

**Farmer**: register as farmer with farm name and location → awaiting admin verification (products stay hidden from the shop until approved) → add products with photos, unit, price, stock, bulk tiers, season → receive orders → accept / reject → packed → out for delivery or ready for pickup → delivered → record payment → see earnings and history.

**Admin**: approve/reject farmers → suspend/reactivate accounts → manage categories → block products → monitor all orders and payments → resolve complaints → set the service fee → platform statistics.

## 5. Languages

UI text in English, ಕನ್ನಡ, தமிழ், తెలుగు via dictionaries in `client/src/i18n`. Categories and products carry `localNames`, so "Tomato" shows as ಟೊಮೆಟೊ / தக்காளி / టమాటా.
