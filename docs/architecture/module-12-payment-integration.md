# Module 12 — Payment Integration

> **Requirement (FYP documentation §1.2.0.12 / §2.2.0.7).** *"The system shall
> support secure payment processing for tasks and internships that offer
> compensation. It shall integrate with a trusted digital payment gateway to
> handle transactions between organizations and students. The system shall
> record payment details and statuses so that both parties have a clear and
> transparent record of every transaction. Sensitive financial information
> shall be handled securely and in line with standard payment-security
> practices."*
>
> §2.3.0.2: *"Sensitive information, including passwords, personal details, and
> payment data, shall be protected through encryption and secure communication
> protocols such as HTTPS."* §3 (constraints): third-party services such as
> payment gateways are limited to options that offer a free or sandbox tier.

This document explains how a company pays the student on one of its
internships, how the gateway is abstracted (a built-in sandbox and real Stripe
Checkout, with no new dependency), how every status change is recorded, what
is and is not stored, and how the module hooks into Modules 8 and 11.

**There is no AI requirement for payments** in the documentation, so this
module adds no AI endpoint and no `aiService` mapper. Every rule here is plain,
deterministic backend code.

---

## 1. Where the module sits

```
company (owning the internship)                       student
   │ POST /payments/progress/:id  (pending)              │ PUT /payments/payout-method (masked)
   │ POST /payments/:id/checkout  (processing) ──► provider.createCheckout
   │                                                  ├─ sandbox: /payments/checkout/:id (our page)
   │                                                  └─ stripe:  checkout.stripe.com (Stripe's page)
   │ sandbox: POST /payments/:id/sandbox/confirm ─┐
   │ stripe:  POST /payments/webhooks/stripe  ────┴─► transition() ──► payments.status
   │                                                              └─► payment_events (audit)
   ▼                                                              └─► emails (student + company)
 receipts, lists, analytics (Module 11: earnings / spend / platform volume)
```

A payment always hangs off an **internship** (`InternshipProgress`, Module 8):
the accepted (student, task, company) triple. That is what "tasks and
internships that offer compensation" maps to in this codebase.

## 2. Code layout

| Layer | File |
|---|---|
| Models | `backend/src/models/Payment.js`, `PaymentEvent.js`, `StudentPayoutMethod.js` (registered in `models/index.js`) |
| Gateway abstraction | `backend/src/services/payments/index.js` (`getProvider`, `providerByName`), `sandboxProvider.js`, `stripeProvider.js` |
| Money rules (pure) + `transition()` | `backend/src/services/paymentService.js` |
| HTTP | `backend/src/controllers/paymentController.js`, `backend/src/routes/paymentRoutes.js` (`/api/payments`) |
| Validation | `backend/src/middleware/validation.js` — "Payment validation rules (Module 12)" |
| Email | `backend/src/utils/paymentNotifications.js` + `emailTemplates.js` (Module 12 section) |

## 3. Data model

Three new tables, created by `sequelize.sync({ alter: true })`. Uniqueness is
declared once in `indexes` (never column-level — Module 9 found that a
column-level `unique` adds a duplicate index on every boot under MySQL).

### 3.1 `payments` (`Payment`)

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | |
| `reference` | STRING(24) | `PAY-` + 10 uppercase hex (40 random bits); **unique index** |
| `progressId`, `applicationId`, `taskId`, `studentId`, `companyId` | BIGINT, nullable | FKs with **`ON DELETE SET NULL`** — never CASCADE: deleting an internship, task or account must not erase money history |
| `studentName`, `companyName`, `taskTitle` | STRING | snapshots taken at creation, so a receipt still reads correctly after the rows are gone |
| `kind` | ENUM `stipend`,`bonus` | default `stipend` |
| `description` | STRING(500) | shown on the receipt |
| `amount`, `platformFee`, `netAmount` | DECIMAL(12,2) | `amount = platformFee + netAmount`, to the cent |
| `feePercent` | DECIMAL(5,2) | the fee rate at the time, so later env changes do not rewrite history |
| `currency` | STRING(3) | the task's `budgetCurrency`, upper-cased |
| `status` | ENUM | `pending`,`processing`,`succeeded`,`failed`,`cancelled`,`refunded` |
| `provider` | STRING(20) | `sandbox` / `stripe`; null until checkout |
| `providerPaymentId` | STRING(255) | sandbox `sbx_…`; Stripe Checkout Session id, replaced by the PaymentIntent id when the webhook confirms payment (refunds are made against it) |
| `checkoutUrl` | STRING(1000) | company/admin only — stripped for students |
| `providerRefundId` | STRING(255) | |
| `cardBrand`, `cardLast4` | STRING(20) / STRING(4) | **sandbox only, and nothing else about the card** |
| `failureReason`, `refundReason` | STRING(500) | |
| `initiatedByUserId`, `refundedByUserId` | FK users, SET NULL | |
| `processingAt`, `paidAt`, `failedAt`, `cancelledAt`, `refundedAt` | DATE | stamped by `transition()` |

Indexes: unique `reference`; `(progressId,status)`, `(studentId,status)`,
`(companyId,status)`, `providerPaymentId`.

Statics: `STATUSES`, `OPEN_STATUSES = ['pending','processing']`,
`COMMITTED_STATUSES` (+`succeeded`), `TRANSITIONS`, `canTransition(from,to)`,
`computeFee(amount, percent)` (integer cents, half-up, clamped so the fee is
never negative or above the amount), `generateReference()`.

### 3.2 `payment_events` (`PaymentEvent`) — the audit trail

`paymentId` (FK CASCADE), `fromStatus` (null for creation), `toStatus`,
`source` ENUM `user`/`webhook`/`system`, `actorUserId`, `actorRole`
(`gateway` for webhooks), `note`, `providerEventId`, `createdAt`.
`providerEventId` has a **unique index** — a replayed webhook can never be
applied twice, even if two deliveries race (NULLs do not collide).

### 3.3 `student_payout_methods` (`StudentPayoutMethod`)

`studentId` (unique via `indexes`; FK CASCADE), `method` ENUM
`bank_transfer`/`jazzcash`/`easypaisa`/`paypal`, `accountTitle`,
**`accountMasked`** (e.g. `•••• 4821`, `a•••@gmail.com`), `bankName`.

The full account number / wallet number / PayPal address is validated by the
pure `StudentPayoutMethod.validateInput()` and then **discarded**; only the
masked form is stored. In a real deployment the payout destination lives at
the gateway (e.g. a Stripe Connect account) — the platform only needs to know
that one exists and how to display it. Validation:

| Method | Rule | Masked as |
|---|---|---|
| `bank_transfer` | 6–34 letters/digits after removing spaces/dashes (account number or IBAN); bank name 2–150 | `•••• ` + last 4 |
| `jazzcash`, `easypaisa` | 11 digits starting `03` (Pakistani mobile wallet) | `•••• ` + last 4 |
| `paypal` | valid email | first letter + `•••@domain` |

### Associations

`InternshipProgress`, `Application`, `Task`, `Student`, `Company` each
`hasMany(Payment, as 'payments', SET NULL)`, and `Payment.belongsTo` each
(`progress`, `application`, `task`, `student`, `company`).
`Payment.hasMany(PaymentEvent, as 'events')`.
`Student.hasOne(StudentPayoutMethod, as 'payoutMethod')`.

## 4. Lifecycle

```
          create                 checkout                 card / webhook
 (none) ─────────► pending ───────────────► processing ─────────────────► succeeded ──refund──► refunded
                     │ │                       │  │
                     │ └─ cancel ─► cancelled ◄─┘  └─► failed   (declined, insufficient funds,
                     └─► failed                                 async failure)
                                 cancelled ◄── checkout.session.expired (webhook)
```

`TRANSITIONS`:

| From | To |
|---|---|
| `pending` | `processing`, `cancelled`, `failed` |
| `processing` | `succeeded`, `failed`, `cancelled` |
| `succeeded` | `refunded` |
| `failed`, `cancelled`, `refunded` | — (terminal) |

Every status change goes through **one helper**,
`paymentService.transition(payment, to, { source, actor, note, providerEventId, transaction })`.
It refuses anything not in `TRANSITIONS` (409), stamps the matching timestamp,
saves the payment and writes the `PaymentEvent` **in the same transaction** —
so the audit trail can never contain an impossible jump, and a change without
its record (or vice versa) cannot be committed. The creation is also recorded
(`null → pending`). Mutating endpoints load the payment (or, for create, the
internship row) with `transaction.LOCK.UPDATE` (`SELECT … FOR UPDATE` on MySQL;
a no-op on SQLite) so concurrent requests are serialised.

## 5. Business rules

| Rule | Where | Behaviour |
|---|---|---|
| Paid tasks only | `isPaidTask` | task `budgetType` ∈ {`fixed`,`hourly`}; `unpaid` → **400** "This task is unpaid" |
| Internship started | controller | any status except `not_started` (paying a `completed` or `abandoned` internship is allowed — pro-rata settlement) → else 400 |
| Agreed compensation | `suggestCompensation` (pure) | fixed → `application.proposedRate ?? task.budgetAmountMax ?? task.budgetAmountMin`; hourly → that rate × `progress.totalHoursLogged` (Module 8); `null` when unknown. `proposedRate` is read with `get()` because `Application.toJSON` deletes it |
| Stipend cap | `stipendCapError` | Σ stipends in `pending`/`processing`/`succeeded` + new amount ≤ agreed (when known) → else **400** naming what remains ("at most 50.00 USD remains"). Failed/cancelled/refunded free their share. **Bonuses are not capped** |
| Hard limits | validator + `amountError` | 1 ≤ amount ≤ 1,000,000; max 2 decimals; whole numbers for zero-decimal currencies (JPY, KRW, VND …) |
| One open payment per internship | controller, under the row lock | a `pending`/`processing` payment exists → **409** |
| Currency | `currencyOf` | the task's `budgetCurrency`, upper-cased; must be 3 letters |
| Platform fee | `platformFeePercent` + `computeFee` | `PLATFORM_FEE_PERCENT` (default 5, clamped 0–50) deducted from the student's payout; rate stored on the row |
| Payout details | checkout | no `StudentPayoutMethod` → **400** "The student has not added payout details yet…" and a best-effort reminder email to the student |

## 6. Authorisation

| Action | Student (own) | Owning company | Other company | Mentor | Admin |
|---|---|---|---|---|---|
| View an internship's payments + compensation | ✅ | ✅ | ❌ 403 | ❌ **403** ("Compensation is private…") | ✅ |
| View a payment / its events / receipt | ✅ (no `checkoutUrl`, `providerPaymentId`, `providerRefundId`, `providerEventId`) | ✅ | ❌ 403 | ❌ 403 | ✅ |
| Create / checkout / sandbox confirm / cancel | ❌ 403 | ✅ | ❌ 403 | ❌ 403 | ❌ 403 — admins do not spend a company's money |
| Refund (`succeeded` only) | ❌ 403 | ✅ | ❌ 403 | ❌ 403 | ✅ (e.g. dispute settlement) |
| Payout method | ✅ own only | ❌ | ❌ | ❌ | ❌ |
| Lists | `/student` | `/company` | — | — | `/admin` |

Predicates live on the model (`canBeViewedBy`, `canBeManagedBy`,
`canBeRefundedBy`), taking the Module 8 actor from
`progressController.resolveActor`. `authorize()` in the router only rules out
roles that can never reach an endpoint. Mentors are refused even though Module
8 lets them read the internship: compensation is between the company, the
student and the platform. A student's analytics **earnings** are likewise shown
only to the student and admins, never to a company or mentor viewing the
student (`audience: 'viewer'`).

## 7. Gateway integration

`services/payments/index.js` chooses the provider **at call time**:

- `PAYMENT_PROVIDER=stripe` **and** `STRIPE_SECRET_KEY` set → Stripe;
- otherwise → the sandbox.
- `PAYMENTS_SANDBOX_ENABLED` (default `true`): when `false`, the sandbox
  refuses to create checkouts and confirm cards (**503**), so a production
  server that lost its Stripe key cannot silently "pay" with simulated money.

Existing payments always go back to the gateway that handled them
(`providerByName`) for cancel and refund; a Stripe payment on a server without
a Stripe key is refused (503) rather than refunded in the wrong place.

### 7.1 Sandbox (`sandboxProvider.js`)

A simulated hosted checkout for development, demos and the FYP evaluation.
`createCheckout` returns `sbx_<24 hex>` and
`<FRONTEND_URL>/payments/checkout/<paymentId>`; `refund` returns
`sbx_re_<24 hex>`. The checkout page posts the card to
`POST /api/payments/:id/sandbox/confirm`, where `validateCard()` checks it in
memory (Luhn, 12–19 digits, expiry — the current month is still valid — CVC 3–4
digits, cardholder name) and applies **Stripe's published test cards**:

| Card | Outcome |
|---|---|
| `4242 4242 4242 4242` | succeeded |
| `4000 0000 0000 0002` | failed — "Your card was declined." |
| `4000 0000 0000 9995` | failed — "Insufficient funds." |
| any other Luhn-valid number | succeeded |

Invalid card data → **400 with the payment unchanged** (the company can fix a
typo). Only `brand` and `last4` are kept.

### 7.2 Stripe Checkout (`stripeProvider.js`)

Real Stripe over its REST API with the **existing `axios`** and Node `crypto`
(no SDK, no new dependency):

- `createCheckout` → `POST https://api.stripe.com/v1/checkout/sessions`
  (form-encoded, `Authorization: Bearer <secret>`), fields from the pure
  `buildCheckoutForm`: `mode=payment`, one line item with
  `price_data[currency]`, `unit_amount` in **minor units** (`toMinorUnits`:
  ×100, or whole units for the 16 zero-decimal currencies), product name,
  `success_url`/`cancel_url` (back to the internship's Payments tab),
  `client_reference_id=<reference>`, `metadata[paymentId]`, and the same
  metadata on the PaymentIntent. An `Idempotency-Key` of `checkout-<reference>`
  makes a retried request return the same session.
- `refund` → `POST /v1/refunds` with `payment_intent` (idempotency key
  `refund-<reference>`); `cancelCheckout` → `POST /v1/checkout/sessions/:id/expire`
  so a cancelled payment cannot still be paid on Stripe's page (if the expire
  call fails, the payment stays open).
- Gateway errors are re-thrown as `PaymentGatewayError` (502) with a safe
  message. The original axios error is dropped on purpose — its
  `config.headers` contains the secret key and the global error handler logs
  whatever it receives.

### 7.3 Webhook — `POST /api/payments/webhooks/stripe`

Declared before `protect`; authenticated by the `Stripe-Signature` header:

1. `STRIPE_WEBHOOK_SECRET` unset → 400 (never accept unsigned events).
2. `verifyWebhook(rawBody, header, secret, { tolerance: 300 })` parses
   `t=…,v1=…[,v1=…]`, computes `HMAC-SHA256(secret, "<t>.<raw body>")`,
   compares with `crypto.timingSafeEqual` against **every** `v1` (secret
   rotation), ignores `v0`, then rejects timestamps more than 300 s from now.
   The raw bytes come from `req.rawBody`, captured by the global
   `express.json({ verify })` in `server.js`, because re-serialised JSON would
   not match the signature. Any failure → **400**.
3. Unknown event types → **200** `{ignored}` (so Stripe stops retrying).
4. An event id already in `payment_events.providerEventId` → **200**
   `{duplicate:true}`, no-op (a racing duplicate hits the unique index and gets
   the same answer).
5. The payment is found by `metadata.paymentId` (or `client_reference_id`) and
   must have `provider = 'stripe'` and `providerPaymentId = session.id` —
   a session this server did not create for that payment is ignored.
6. `checkout.session.completed` / `async_payment_succeeded` with
   `payment_status = 'paid'` **and** `amount_total`/`currency` equal to the
   payment's → `succeeded` (PaymentIntent id stored); `async_payment_failed` →
   `failed`; `expired` → `cancelled`. A payment already settled some other way
   is left alone (200).

## 8. Security

**What is stored.** Payments: amounts, currency, status, references, gateway
ids, and — for sandbox payments only — card **brand and last four digits**.
Payout methods: method, account title, bank name and a **masked** account.

**What is never stored or logged.** Full card numbers, expiry dates, CVCs, full
bank/IBAN/wallet numbers, full PayPal addresses, the Stripe secret key, the
webhook secret. Concretely:

- Card fields are read from `req.body` and **deleted from it** at the top of the
  confirm handler, before any other code runs; `validateCard` returns only
  `{brand, last4}`; validation messages never repeat what was typed (the
  project validator returns `{field, message}` only, never the value).
- The raw payout account is deleted from `req.body` right after validation.
- Stripe errors are replaced by a sanitised `PaymentGatewayError` (no headers);
  webhook and gateway log lines contain the payment id and HTTP status only.
- The harness proves it: after every card and payout flow it dumps **every
  row of every table** and asserts the full card numbers, formatted card
  numbers, IBAN, wallet number and PayPal address appear nowhere; it also
  captures everything the backend wrote to the console during the run and
  asserts none of those values (nor the webhook secret) was logged.

**PCI scope reduction via hosted checkout.** With Stripe, the card is typed
on Stripe's hosted Checkout page and goes straight to Stripe — it never
reaches this server, which keeps the platform in the lightest PCI DSS category
(SAQ A). The sandbox page is the only place card-like data reaches the
backend, and it is fenced: test mode only, validated in memory, brand + last4
kept, disabled with `PAYMENTS_SANDBOX_ENABLED=false`, and bannered "Sandbox —
no real money moves. Never enter a real card here."

**Webhook integrity.** HMAC-SHA256 signature over the raw body, constant-time
comparison, 5-minute replay window, event-id idempotency (unique index), a
session-to-payment binding check and an amount/currency check before money is
marked as received.

**Sandbox guard.** Stripe is used only when explicitly configured; otherwise
the sandbox, which production turns off with `PAYMENTS_SANDBOX_ENABLED=false` —
checkouts are then refused (503) instead of faked.

**Authorisation and integrity.** Only the owning company can move money; the
state machine and the transactional audit trail make every status change
explainable; row locks serialise concurrent requests; financial rows use
`SET NULL` so they outlive deleted internships/accounts; the reference is
random (not guessable from the id).

**HTTPS in production.** Card and account data must only travel over TLS:
deploy the frontend and API behind HTTPS (`FRONTEND_URL` / API URL `https://…`),
and register an `https://` webhook endpoint with Stripe (Stripe requires it in
live mode). The existing `helmet()` headers and `secure` session cookies in
production (`server.js`) apply unchanged. Keys live only in the environment
(`backend/.env`, never committed); `.env.example` documents them empty.

## 9. API — `/api/payments`

| Method | Path | Roles | Behaviour |
|---|---|---|---|
| POST | `/webhooks/stripe` | public (signed) | see §7.3 |
| GET | `/student` | student | own payments (paginated, `?status`) + `summary {currency, totalReceivedNet, totalRefunded, pending, byCurrency, byStatus}` + masked `payoutMethod` |
| GET | `/company` | company | own payments + `summary {currency, totalPaid, totalFees, refunded, open, byCurrency, byStatus}` |
| GET | `/admin` | admin | all payments, `?status&provider&companyId&studentId`; `summary {volume, fees, refunded, open, byStatus, byProvider, byCurrency, activeProvider, sandboxEnabled}` |
| GET / PUT / DELETE | `/payout-method` | student | own payout method (masked); PUT 201 on first save, 200 on replace |
| GET | `/progress/:progressId` | company, student, admin (mentor → 403) | `{payments, compensation {budgetType, currency, agreedAmount, hourlyRate, hoursLogged, paidToDate, committedStipend, outstanding, feePercent}, payoutMethodOnFile, hasOpenPayment, provider, permissions {canPay, canRefund}}` |
| POST | `/progress/:progressId` | company (owner) | `{amount, kind?, description?}` → **201** `pending` |
| GET | `/:id` | viewers | payment + `events` + `permissions` |
| GET | `/:id/receipt` | viewers | receipt DTO — `succeeded`/`refunded` only (else 409) |
| POST | `/:id/checkout` | company (owner) | `pending → processing`, `{checkoutUrl, provider, payment}`; called again while processing returns the **same** URL |
| POST | `/:id/sandbox/confirm` | company (owner) | sandbox + `processing` only; `{cardNumber, expMonth, expYear, cvc, cardholderName}` |
| POST | `/:id/cancel` | company (owner) | open → `cancelled` (`reason?`) |
| POST | `/:id/refund` | company (owner), admin | `{reason}` 5–500 chars required; `succeeded → refunded` via the original gateway |

Errors follow the project shape: `{success:false, message}` or
`{success:false, errors:[{field, message}]}`.

## 10. Notifications

`backend/src/utils/paymentNotifications.js`, templates in `emailTemplates.js`
(Module 12 section, `interviewShell`). Best-effort: never throw, never block
the response. All user text (names, titles, descriptions, reasons) is
HTML-escaped.

| Event | To | Template |
|---|---|---|
| Payment succeeded | student | `paymentReceivedStudent` — gross, fee, **net received** |
| Payment succeeded | company | `paymentReceiptCompany` — receipt link, masked card |
| Payment failed | company | `paymentFailedCompany` — reason, "no money was taken" |
| Payment refunded | student and company | `paymentRefunded` — reason |
| Checkout without payout details | student | `payoutDetailsNeeded` — link to `/student/payments` |

## 11. Frontend

| File | Purpose |
|---|---|
| `types/payment.types.ts`, `services/paymentService.ts` | API client, labels, `formatMoney`, fee preview (mirrors `computeFee`), test-card list |
| `components/payments/PaymentStatusBadge.tsx` | status badge |
| `components/payments/PaymentsTable.tsx` | ledger rows with Pay now / Resume checkout / Cancel / Refund / Receipt per `permissions` |
| `components/payments/CompensationSummary.tsx` | agreed / paid / outstanding + basis |
| `components/payments/CreatePaymentModal.tsx` | amount prefilled with the outstanding stipend, kind, note, live fee preview, over-cap hint |
| `components/payments/RefundPaymentModal.tsx` | reason-required refund dialog |
| `components/payments/usePaymentActions.tsx` | shared checkout/cancel/refund handling (sandbox → our page, Stripe → `https://` checkout URL only) |
| `components/payments/PaymentsPanel.tsx` | the **Payments** tab in `ProgressWorkspace`, shown only for the `company` and `student` perspectives |
| `components/payments/PayoutMethodForm.tsx` | student payout details; after save only the masked value is shown |
| `components/payments/PaymentsAnalyticsCard.tsx` | money card on the three Module 11 dashboards |
| `app/(dashboard)/student/payments/page.tsx` | earnings tiles, history, payout method |
| `app/(dashboard)/company/payments/page.tsx` | spend tiles, status filter, actions |
| `app/(dashboard)/admin/payments/page.tsx` | platform totals, status + gateway filters, refunds |
| `app/(dashboard)/payments/checkout/[paymentId]/page.tsx` | sandbox hosted checkout (company only): banner, card form, clickable test cards; returns to `/company/progress/:id?tab=payments` |
| `app/(dashboard)/payments/receipt/[paymentId]/page.tsx` | printable receipt (`window.print()`, print-hidden toolbar) for company, student, admin |

The shared `/payments/...` routes sit in the `(dashboard)` group (Navbar +
footer) and protect themselves with `useRoleProtection` per page (company-only
checkout; company/student/admin receipt); the API enforces the same rules.
Navigation: an optional `payments` entry on `RoleNav` for student, company and
admin, rendered in the Navbar "Me" dropdown and the mobile drawer (no seventh
top icon).

## 12. Hooks into completed modules

| File | Change | Why |
|---|---|---|
| `backend/src/models/index.js` | require + associations + export `Payment`, `PaymentEvent`, `StudentPayoutMethod` | register the models |
| `backend/src/server.js` | global `express.json({ verify })` keeps `req.rawBody`; mount `/api/payments` | webhook signature needs the raw body |
| `backend/src/middleware/validation.js` | appended "Payment validation rules (Module 12)" | validation chains |
| `backend/src/utils/emailTemplates.js` | appended 5 payment templates + exports | notifications |
| `backend/src/services/analyticsService.js` | appended `buildStudentEarnings`, `buildCompanySpend`, `buildAdminPayments` + 3 loaders (Module 11 builders untouched) | money on the dashboards |
| `backend/src/controllers/analyticsController.js` | adds `earnings` (audience `self` only), `spend`, `payments` to the three responses | money on the dashboards |
| `backend/.env.example` | 5 payment variables | configuration |
| `frontend/src/lib/roleRoutes.ts` | optional `payments` nav entry | navigation |
| `frontend/src/components/shared/Navbar.tsx` | "Payments" item in the Me menu and the mobile drawer | navigation |
| `frontend/src/components/progress/ProgressWorkspace.tsx` | Payments tab (company/student only) + `?tab=` deep link | internship entry point |
| `frontend/src/types/analytics.types.ts` | optional `earnings` / `spend` / `payments` | types |
| `frontend/.../{student,company,admin}/analytics/page.tsx` | one `PaymentsAnalyticsCard` each | money on the dashboards |

No existing rule, model or response field of Modules 1–11 changed; the
analytics responses only gained keys.

### Design decisions / deviations from the spec

- **Payout-method validation split.** The spec lists "bank/jazzcash/easypaisa
  account 6–34 alphanumerics" and "mobile wallets 11 digits starting 03";
  JazzCash and Easypaisa *are* mobile wallets, so bank transfers take the
  6–34 rule and the two wallets the `03XXXXXXXXX` rule.
- **Analytics money is not inside `summary`.** Module 11's `summary` objects are
  pinned exactly by its tests, so `earnings`, `spend` and `payments` are new
  top-level keys; student earnings are omitted for the `viewer` audience
  (privacy, safer default).
- **Mixed currencies.** Headline totals are in the *primary* currency (most
  paid volume) with a `byCurrency` breakdown, rather than one sum across
  currencies, which would be meaningless.
- **`providerPaymentId` holds the Checkout Session id until payment, then the
  PaymentIntent id** (the spec asks to store the payment_intent; the table
  has one column, and the session id stays in the event note).
- **Extra safety checks** beyond the spec: webhook session↔payment binding and
  amount/currency match; `async_payment_succeeded` handled; Stripe session
  expired on cancel; refunds only through the original gateway (503
  otherwise); card fields removed from `req.body`; zero-decimal currencies must
  be whole amounts; `committedStipend` added to the compensation block;
  sandbox-disabled returns 503 (server configuration) rather than 400.
- **Confirm returns 200 for a declined card** (the request was processed; the
  payment is `failed` with its reason). Invalid card *data* is the 400.

## 13. Configuration (`backend/.env.example`)

| Variable | Default | Meaning |
|---|---|---|
| `PAYMENT_PROVIDER` | `sandbox` | `stripe` to use Stripe (needs the key) |
| `PAYMENTS_SANDBOX_ENABLED` | `true` | set `false` in production |
| `PLATFORM_FEE_PERCENT` | `5` | fee deducted from payouts (0–50) |
| `STRIPE_SECRET_KEY` | empty | `sk_test_…` in development |
| `STRIPE_WEBHOOK_SECRET` | empty | `whsec_…`; webhooks rejected while empty |

To try Stripe test mode: set the first and the last two, run
`stripe listen --forward-to localhost:5000/api/payments/webhooks/stripe` and
use the printed `whsec_…`. This has **not** been run in this environment (no
keys) — see the QA plan.

## 14. Testing

| Layer | File | Count |
|---|---|---|
| State machine, predicates, JSON shaping, fees, references, compensation, cap, limits, Luhn / brand / expiry / test cards, payout validation + masking, Stripe minor units + form + webhook verification, provider selection, summaries, receipts, analytics money builders | `backend/tests/payment.rules.test.js` | 55 jest tests |
| HTTP flows on in-memory SQLite (scratch harness, not in repo) | `m12.flow.test.js` | 14 scenarios |

See `docs/qa/module-12-payment-integration.md` for the scenario table and the
observed counts.
