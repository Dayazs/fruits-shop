# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

水果商城 is a three-part fruit e-commerce platform:
- **uniapp/** — WeChat Mini Program (shopper C-end)
- **admin/** — Vue 3 admin panel (operation/management)
- **api/** — Node.js Express backend with MySQL via Prisma

## Build & Run Commands

### Backend (`api/`, pnpm)
```bash
pnpm dev          # ts-node hot-reload (development)
pnpm build        # tsc → dist/
pnpm start        # node dist/main.js (production)
npx prisma generate  # regenerate Prisma client after schema changes
```

### Admin Panel (`admin/`, npm)
```bash
npm run dev       # Vite dev server on port 10041 (proxies /api → backend)
npm run build     # Production build → dist/
npm run type-check # vue-tsc type checking
```

### Mini Program (`uniapp/`)
Open in HBuilderX, select `mp-weixin` target, run with WeChat DevTools. No npm scripts; uni-app uses HBuilderX's built-in toolchain.

## Architecture

### Backend Layer (`api/src/`)
```
app.ts              Express setup (cors:10041, /uploads static, /api routes)
routes/index.ts     Top-level router: /user, /admin, /goods, /banners, /home, /order, /dashboard
routes/*.route.ts   Per-module route definitions
controllers/*.ts    Request handlers (validate input, call service, format response)
service/*.ts        Business logic + Prisma queries (NEVER access Prisma in controllers)
middleware/auth.ts  authenticate (JWT verify) + isAdmin (type === 'admin')
middleware/upload.ts Multer + Sharp image upload
lib/prisma.ts       Singleton PrismaClient instance
utils/token.ts      JWT helpers: generateAccessToken, generateRefreshToken, verify
```

- **Auth** — JWT access token (1d) in `Authorization: Bearer <token>`. C-end users: `/api/user/*`. Admin: `/api/admin/*`.
- **RBAC** — `roles` table has `permissions` JSON array. Admin JWT carries `role_id`. Route guards check `token` + `isAdmin` middleware. `*` = super-admin.
- **WeChat Pay V3** — `pay.service.ts`: JSAPI unified order, RSA-SHA256 signing with merchant private key, callback signature verification with WeChat platform certificate (三级缓存: memory → local PEM → remote `/v3/certificates` API), AES-256-GCM resource decryption.
- **Order statuses** — 0=PENDING_PAY → 1=PENDING_SHIP → 2=PENDING_RECEIVE → 3=COMPLETED, 4=CANCELLED. Timestamps auto-set on transitions. Inventory restored on cancel.
- **Static files** — `app.use('/uploads', express.static(path.join(__dirname, '../uploads/')))`. Files served from `api/uploads/` (sibling to `dist/`).
- **Dashboard stats** — `dashboard.service.ts` uses `$queryRawUnsafe` for SQL GROUP BY aggregation. Uses `DATE_FORMAT(created_at, '%Y-%m-%d')` rather than `DATE()` because the MySQL driver returns Date objects, not strings.

### Admin Panel (`admin/src/`)
```
layout/index.vue     Shell: sidebar + header + router-view
views/Dashboard.vue  ECharts stats (4 cards + 4 line charts)
views/Login.vue      Admin login form
views/goods/         Product CRUD, categories, recycle bin
views/order/         Admin order management
views/banner/        Banner management
stores/auth.ts       Pinia auth store (login/logout/state/guards)
utils/request.ts     Axios instance with Bearer token interceptor + 401 redirect
api/*.ts             API function modules
router/index.ts      Routes with meta.permission for RBAC guards
```

- Axios `baseURL` uses `import.meta.env.VITE_API_BASE_URL ?? '/api'` — `??` not `||` to handle empty string (production Nginx proxy mode).
- 401 response interceptor clears localStorage and redirects to `/login`.
- **Dev proxy**: Vite proxys `/api` and `/uploads` to backend (configured in `vite.config.ts`).
- **Production**: Nginx serves `dist/` at port 10041 + proxies `/api` and `/uploads` to backend port 10040. SPA History mode requires `try_files $uri $uri/ /index.html`.

### Mini Program (`uniapp/`)
```
pages/index/         Home: banners, category grid, featured products
pages/category/      Left sidebar categories + right goods list
pages/goods-detail/  Product images, SKU selector, add-to-cart, buy-now
pages/cart/          Cart list with checkboxes, qty controls, checkout
pages/order-confirm/ Address picker, order summary, submit → pay
pages/order-list/    Orders by status tab, cancel/pay/confirm-receipt
pages/mine/          User card, order status icons with badge counts
pages/personal/      Avatar, nickname, address mgmt, logout
components/custom-tab-bar.vue  Self-drawn TabBar with cart badge
stores/cart.js       Reactive cartCount ref + refreshCartCount() + requireLogin()
utils/api.js         HTTP wrapper, all API functions, IMG_BASE
```

- **Auth** — Token stored in `uni.getStorageSync('token')`, attached as `Authorization: Bearer`. `requireLogin()` guard shows toast + redirects to `/pages/mine/mine`.
- **Cart badge** — `cartCount` ref in `stores/cart.js` drives TabBar red badge (max 99+). Refreshed on add/remove/quantity change and on login/logout.
- **Custom TabBar** — `custom: true` in `pages.json`. Each tab page includes `<CustomTabBar />`. `updateCurrentIndex()` runs in both `onMounted` and `onShow` because tab pages are cached (switchTab doesn't destroy them).
- **Inter-tab communication** — `wx.switchTab` doesn't support query strings. Pass data via `uni.setStorageSync` / `uni.getStorageSync` (e.g., `targetCategoryId` for category pre-selection). Consume-then-remove to avoid race conditions.
- **Skeleton screens** — All 4 main pages (index, category, cart, goods-detail) have shimmer skeleton loading states via `loading` ref + CSS gradient animation.
- **Dual payment confirmation** — WeChat server callback (`POST /order/pay-callback`) + client-side `paySuccess` endpoint called after `wx.requestPayment` success (failover).

### Database (`api/prisma/schema.prisma`)
13 tables, MySQL provider. Key relationships: `users` → `orders` → `order_items` ← `fruit_skus` ← `fruits` → `categories`. `order_items` snapshots product name/spec/price at order time for historical accuracy (商品修改不影响历史订单). Soft delete via `fruits.deleted_at`.

### Deployment
Server `47.105.65.75` (Alibaba Cloud). Nginx on port 10041 serves admin SPA + proxies `/api` and `/uploads` to Node.js Express on port 10040 (PM2 managed). Mini program directly calls port 10040. MySQL on localhost.

## Key Patterns

- **Naming**: Backend uses snake_case for DB fields (Prisma), camelCase in JS. API response format: `{ code: 200, msg: string, data: ... }`.
- **Error handling**: Controllers wrap in try/catch, return `{ code: 400/500, msg: err.message }`. Prisma transactions for critical paths (order creation, inventory changes).
- **Express `rawBody`**: The `/order/pay-callback` route needs raw request body for signature verification. A route-level middleware buffers the stream before JSON parsing.
- **Vite env vars**: ALL custom env vars MUST be prefixed with `VITE_` to be accessible via `import.meta.env`. Without the prefix, they're invisible to client code.
- **Custom TabBar lifecycle**: `updateCurrentIndex()` must be called in both `onMounted` AND `onShow`. Tab pages are cached by uni-app, so `onLoad` fires once but `onShow` fires every switch. Never `removeStorageSync` before the value is actually consumed (avoids onShow/onLoad race).
