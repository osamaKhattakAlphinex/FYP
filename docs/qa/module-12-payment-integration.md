# Module 12 — Payment Integration · QA Test Plan

**Scope.** Verification of the `/api/payments/*` surface added in Module 12:
payments from the owning company to the student on an internship, the
compensation / stipend-cap rules, the sandbox hosted checkout with Stripe's
test cards, the Stripe Checkout provider and its signed webhook, cancellations
and refunds with the audit trail, the student payout method (masked), receipts,
emails, the money figures on the Module 11 dashboards, and the security
guarantees (no full card or account number stored or logged).

> **How the Status column was filled.** Every status reflects a run that was
> actually observed:
>
> - **Pass — jest**: `backend/tests/payment.rules.test.js` (no database, no network).
> - **Pass — harness (SQLite)**: the real Express routes, controllers, models
>   and validators booted over an **in-memory SQLite** database with email
>   sending recorded and the console captured (scratch integration harness
>   `m12.flow.test.js`, not part of the repo). Strong evidence, but **not** MySQL.
> - **Not run — needs live stack**: UI walk-throughs, real MySQL
>   (`sync({ alter: true })`, `SELECT … FOR UPDATE`), real SMTP, and **live
>   Stripe** (no API keys in this environment). Do not treat these as passing.

**Assumed fixtures.**

| Alias | Role | Notes |
|---|---|---|
| `COMPANY_A` | company | owns `TASK_FIXED` (fixed 300 USD), `TASK_UNPAID`, `TASK_HOURLY` (15–20 USD/h), `TASK_LATER` |
| `COMPANY_B` | company | unrelated |
| `STUDENT_A` | student | `PROGRESS_1` on `TASK_FIXED` (proposed rate 250, in progress); active mentor `MENTOR_M` |
| `STUDENT_B` | student | `PROGRESS_2` on `TASK_UNPAID`; `PROGRESS_3` on `TASK_HOURLY` (10 h logged); no payout method |
| `STUDENT_C` | student | `PROGRESS_4` on `TASK_LATER`, status `not_started` |
| `ADMIN` | admin | |

---

## A. Functional

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| A1 | Compensation for a fixed task | `PROGRESS_1` | `GET /payments/progress/PROGRESS_1` as `COMPANY_A` | `agreedAmount 250` (proposed rate beats the 300 max), `outstanding 250`, `feePercent 5`, `canPay true` | Pass — harness (SQLite) |
| A2 | Compensation for an hourly task | `PROGRESS_3` | same for `PROGRESS_3` | `hourlyRate 20` (max over min), `agreedAmount 200` (20 × 10 h) | Pass — harness (SQLite) |
| A3 | Create a payment | payout method on file | `POST /payments/progress/PROGRESS_1 {amount:200}` | 201, `pending`, `PAY-XXXXXXXXXX`, fee 10, net 190, snapshots set | Pass — harness (SQLite) |
| A4 | Checkout (sandbox) | A3 | `POST /payments/:id/checkout` | 200, `processing`, `checkoutUrl = <FRONTEND_URL>/payments/checkout/:id`, `sbx_…` id | Pass — harness (SQLite) |
| A5 | Pay with 4242 | A4 | `POST /payments/:id/sandbox/confirm` with `4242 4242 4242 4242` | `succeeded`, `visa`/`4242`, `paidAt` set; events `null→pending→processing→succeeded` | Pass — harness (SQLite) |
| A6 | Receipt | A5 | `GET /payments/:id/receipt` as student, company, admin | 200; amount 200, fee 10, net 190, `visa •••• 4242` | Pass — harness (SQLite) |
| A7 | Cancel an open payment | pending payment | `POST /payments/:id/cancel` | `cancelled`, `cancelledAt` set, event written | Pass — harness (SQLite) |
| A8 | Refund (company) | succeeded payment | `POST /payments/:id/refund {reason}` | `refunded`, `sbx_re_…`, `refundedByUserId` = company user | Pass — harness (SQLite) |
| A9 | Refund (admin) | succeeded payment | same as `ADMIN` | `refunded`, last event `actorRole admin` | Pass — harness (SQLite) |
| A10 | Payout method save / replace / delete | — | `PUT /payments/payout-method` twice, `DELETE` | 201 then 200 (one row), masked value returned; after delete `GET` → `null` | Pass — harness (SQLite) |
| A11 | Role lists + summaries | after the flows | `GET /payments/student`, `/company`, `/admin?provider=stripe` | exact totals (student net 95, refunded 228; company paid 200, fees 10, refunded 240; admin by provider `sandbox 5, stripe 2, none 3`) | Pass — harness (SQLite) |
| A12 | Emails | A5, failures, refunds, nudge | inspect recorded emails | student "You have been paid 190.00 USD…", company "Payment receipt PAY-…", company "Payment … failed", both "…was refunded", student "Add your payout details…" | Pass — harness (SQLite) |
| A13 | State machine | — | jest | exactly 7 allowed transitions; terminal states go nowhere | Pass — jest |
| A14 | Fee maths | — | jest | half-up to the cent, fee + net = amount, clamped 0..amount | Pass — jest |
| A15 | Sandbox UI walk-through | live stack | Internship → Payments tab → New payment → Pay now → checkout page → test card → receipt → Print | Works end to end; banner visible | Not run — needs live stack |

## B. Positive

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| B1 | Bonus beyond the agreement | stipend fully committed | create `{kind:'bonus', amount:60}` | 201 (bonuses are not capped) | Pass — harness (SQLite) |
| B2 | Checkout is idempotent | processing payment | `POST /checkout` twice | same `checkoutUrl` both times | Pass — harness (SQLite) |
| B3 | Refund frees the stipend cap | refunded 200 | `GET /payments/progress/PROGRESS_1` | `paidToDate 0`, `outstanding 250` | Pass — harness (SQLite) |
| B4 | Mastercard test number | processing | confirm with `5555 5555 5555 4444` | `succeeded`, brand `mastercard` | Pass — harness (SQLite) |
| B5 | Current-month expiry accepted | — | jest `expiryValid(9, 2026)` on 2026-09-18 | valid; August 2026 invalid | Pass — jest |
| B6 | Stripe webhook success | `STRIPE_WEBHOOK_SECRET` set; processing Stripe payment | signed `checkout.session.completed` (paid, 10000 usd) | 200, `succeeded`, `providerPaymentId = pi_…`, event `source webhook`, `providerEventId evt_1` | Pass — harness (SQLite) |
| B7 | Stripe session expired | processing Stripe payment | signed `checkout.session.expired` | `cancelled` | Pass — harness (SQLite) |
| B8 | Live Stripe test mode | `sk_test_…`, `stripe listen` | pay with 4242 on Stripe's page | webhook marks it `succeeded`; refund via `/v1/refunds` | Not run — needs live stack (no keys) |

## C. Negative

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| C1 | Unpaid task | `PROGRESS_2` | create | 400 "This task is unpaid" | Pass — harness (SQLite) |
| C2 | Not started | `PROGRESS_4` | create | 400 "…once the internship has started" | Pass — harness (SQLite) |
| C3 | Amount limits | — | amounts `0`, `0.5`, `-5`, `1000001`, `'abc'`, `null`, `10.555`, kind `tip` | 400 each; nothing created | Pass — harness (SQLite) |
| C4 | Over the stipend cap | agreed 250 | create 300 | 400 "…at most 250.00 USD remains…" | Pass — harness (SQLite) |
| C5 | Cap after a payment | 200 committed | create stipend 60 | 400 "…at most 50.00 USD remains…" | Pass — harness (SQLite) |
| C6 | Second open payment | a pending/processing payment | create | 409 | Pass — harness (SQLite) |
| C7 | Checkout without payout method | `STUDENT_B` has none | checkout | 400 "The student has not added payout details yet…", payment stays `pending`, nudge email sent | Pass — harness (SQLite) |
| C8 | Invalid card data | processing | confirm with bad Luhn, expired, month 13, 2-digit CVC, 1-char name, missing fields | 400 each, status still `processing`, response never contains the number | Pass — harness (SQLite) |
| C9 | Declined card | processing | confirm `4000 0000 0000 0002` | `failed`, "Your card was declined.", company email | Pass — harness (SQLite) |
| C10 | Insufficient funds | processing | confirm `4000 0000 0000 9995` | `failed`, "Insufficient funds." | Pass — harness (SQLite) |
| C11 | Refund without / short reason | succeeded | refund `{}` / `{reason:'no'}` | 400 | Pass — harness (SQLite) |
| C12 | Refund a failed payment | failed | refund | 409 | Pass — harness (SQLite) |
| C13 | Refund twice | refunded | refund | 409 | Pass — harness (SQLite) |
| C14 | Receipt for a failed payment | failed | `GET /receipt` | 409 | Pass — harness (SQLite) |
| C15 | Pay / checkout a settled payment | succeeded / failed / cancelled | confirm / checkout / cancel | 409 | Pass — harness (SQLite) |
| C16 | Invalid payout details | — | short bank account, wallet not starting 03, bad email, unknown method | 400; message never echoes the account | Pass — harness (SQLite) |
| C17 | Webhook: no secret configured | `STRIPE_WEBHOOK_SECRET` unset | signed event | 400 | Pass — harness (SQLite) |
| C18 | Webhook: missing header / wrong secret / tampered body / stale timestamp | secret set | send each | 400 each; payment unchanged | Pass — harness (SQLite) |
| C19 | Refund a Stripe payment without Stripe configured | `STRIPE_SECRET_KEY` unset | refund | 503; still `succeeded` | Pass — harness (SQLite) |

## D. Edge cases

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| D1 | Webhook replay | B6 done | resend the same signed event | 200 `duplicate:true`; still one event row | Pass — harness (SQLite) |
| D2 | Unknown event type | secret set | signed `customer.created` | 200 `ignored` | Pass — harness (SQLite) |
| D3 | Session not ours | secret set | signed completed event for `cs_other` naming our payment id | 200 `ignored: no matching payment`; nothing changes | Pass — harness (SQLite) |
| D4 | Multiple `v1` signatures (secret rotation), `v0` ignored | — | jest | accepted when any `v1` matches; `v0` alone rejected | Pass — jest |
| D5 | Tolerance boundary | — | jest | 300 s old accepted, 301 s rejected (past and future) | Pass — jest |
| D6 | Zero-decimal currency | — | jest `toMinorUnits(1500,'JPY')`, `amountError(1500.5,'JPY')` | 1500; "JPY amounts must be whole numbers" | Pass — jest |
| D7 | Mixed currencies | — | jest summaries / analytics builders | never summed; primary currency + `byCurrency` | Pass — jest |
| D8 | `proposedRate` hidden by `Application.toJSON` | — | jest with a built `Application` | still read (275) | Pass — jest |
| D9 | Internship deleted | payments on `PROGRESS_1` | delete the progress row (FKs on) | payments kept, `progressId NULL`, receipt still shows the task title | Pass — harness (SQLite) |
| D10 | Hourly task with 0 hours | — | jest | `agreedAmount 0` → stipends refused, bonuses allowed | Pass — jest |
| D11 | `PLATFORM_FEE_PERCENT` garbage / out of range | — | jest | default 5; clamped to 0–50 | Pass — jest |
| D12 | Concurrent creates on MySQL | two simultaneous `POST /progress/:id` | — | one 201, one 409 (row lock) | Not run — needs live stack (SQLite ignores `FOR UPDATE`) |

## E. Integration

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| E1 | Student analytics earnings | after the flows | `GET /analytics/student` | `earnings {currency USD, totalNet 95, refunded 228, pending 0, payments 1}`, `byMonth[11].net 95` | Pass — harness (SQLite) |
| E2 | Company analytics spend | same | `GET /analytics/company` | `spend {totalPaid 200, totalFees 10, refunded 240, open 0, payments 2}` | Pass — harness (SQLite) |
| E3 | Admin analytics payments | same | `GET /analytics/admin` | `payments` exactly: total 10, byStatus, byProvider `{sandbox 5, stripe 2}`, volume 200, fees 10, refunded 240 | Pass — harness (SQLite) |
| E4 | Earnings hidden from viewers | — | `GET /analytics/students/:id` as the company / as admin | no `earnings` for the company; present for admin | Pass — harness (SQLite) |
| E5 | Payments tab in the workspace | live stack | open an internship as company / student / mentor | tab visible for company and student only; `?tab=payments` opens it | Not run — needs live stack |
| E6 | Navbar entry | live stack | "Me" menu and mobile drawer | "Payments" for student, company, admin; not for mentor | Not run — needs live stack |
| E7 | Real MySQL schema | MySQL | boot with `DB_SYNC=alter` twice | three tables created, no duplicate indexes on the second boot | Not run — needs live stack |
| E8 | Real SMTP delivery | SMTP | trigger A12 | emails arrive, links open the right pages | Not run — needs live stack |

## F. Permission / security

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| F1 | Mentor refused compensation | `MENTOR_M` active on `PROGRESS_1` | `GET /payments/progress/PROGRESS_1` | 403 "Compensation is private…" | Pass — harness (SQLite) |
| F2 | Stranger company | `COMPANY_B` | view internship payments / a payment / receipt / cancel / refund | 403 each | Pass — harness (SQLite) |
| F3 | Other student | `STUDENT_B` | view `PROGRESS_1` payments / a payment | 403 | Pass — harness (SQLite) |
| F4 | Student cannot move money | `STUDENT_A` | create, checkout, confirm, cancel, refund | 403 each | Pass — harness (SQLite) |
| F5 | Admin cannot pay for a company | `ADMIN` | create, confirm | 403 (refund allowed) | Pass — harness (SQLite) |
| F6 | Student JSON hides gateway data | — | student `GET /payments/:id`, `/progress/:id`, `/student` | no `checkoutUrl`, `providerPaymentId`, `providerRefundId` | Pass — harness (SQLite) |
| F7 | **No full card number stored** | after every card flow | dump every row of every table | `4242424242424242` / `4242 4242 4242 4242` absent; no cvc/exp/number column; no column equals the CVC | Pass — harness (SQLite) |
| F8 | **No full account number stored** | after payout saves | dump every table | IBAN, its compact form and the PayPal address absent | Pass — harness (SQLite) |
| F9 | **Nothing sensitive logged** | whole run | capture all console output | no card number (any test card, plain or formatted), IBAN, wallet number, PayPal address or webhook secret | Pass — harness (SQLite) |
| F10 | Sandbox disabled | `PAYMENTS_SANDBOX_ENABLED=false` | checkout (also with `PAYMENT_PROVIDER=stripe` but no key) | 503, payment stays `pending` | Pass — harness (SQLite) |
| F11 | Provider selection | — | jest | Stripe only with provider=stripe **and** a key | Pass — jest |
| F12 | Emails escape user text | refund reason `<wrong>` | inspect the email | `&lt;wrong&gt;` | Pass — harness (SQLite) |
| F13 | Unauthenticated | — | `GET /payments/progress/:id` with no token | 401 | Pass — harness (SQLite) |
| F14 | HTTPS in production | deployment | check API/frontend URLs and Stripe webhook endpoint | `https://` only | Not run — needs live stack |

## G. Regression

| # | Scenario | Pre-condition | Steps | Expected result | Status |
|---|---|---|---|---|---|
| G1 | Backend unit suites | — | `cd backend && npx jest` | all pass (257 before → 312 with 55 new) | Pass — jest |
| G2 | AI service | — | `cd ai-service && python -m pytest -q` | 144 passed (no AI change) | Pass — pytest |
| G3 | Module 8 smoke | — | harness `m8.smoke.test.js` | 1/1 | Pass — harness (SQLite) |
| G4 | Module 9 flow | — | harness `m9.flow.test.js` | 7/7 | Pass — harness (SQLite) |
| G5 | Module 10 flow | — | harness `m10.flow.test.js` | 10/10 | Pass — harness (SQLite) |
| G6 | Module 11 flow (analytics shapes unchanged) | — | harness `m11.flow.test.js` | 9/9 | Pass — harness (SQLite) |
| G7 | Frontend types / build | — | `npx tsc --noEmit`, `npx next build` | clean; build succeeded (38 pages incl. the 5 payment routes) | Pass — tsc / next build |
| G8 | Raw-body parser change | — | every harness flow uses `express.json({ verify })` like `server.js` | all JSON endpoints unaffected | Pass — harness (SQLite) |

---

## How to run (curl)

```bash
API=http://localhost:5000/api
# 1. Student saves payout details (only the masked form is stored)
curl -X PUT $API/payments/payout-method -H "Authorization: Bearer $STUDENT" -H 'Content-Type: application/json' \
  -d '{"method":"bank_transfer","accountTitle":"Sara Khan","account":"PK36SCBL0000001123456702","bankName":"Standard Chartered"}'

# 2. Company checks the compensation and creates a payment
curl $API/payments/progress/$PROGRESS -H "Authorization: Bearer $COMPANY"
curl -X POST $API/payments/progress/$PROGRESS -H "Authorization: Bearer $COMPANY" -H 'Content-Type: application/json' \
  -d '{"amount":200,"kind":"stipend","description":"First half"}'

# 3. Checkout, then pay on the sandbox with a Stripe test card
curl -X POST $API/payments/$PAYMENT/checkout -H "Authorization: Bearer $COMPANY"
curl -X POST $API/payments/$PAYMENT/sandbox/confirm -H "Authorization: Bearer $COMPANY" -H 'Content-Type: application/json' \
  -d '{"cardNumber":"4242 4242 4242 4242","expMonth":12,"expYear":2030,"cvc":"123","cardholderName":"Acme Finance"}'

# 4. Receipt, audit trail, refund
curl $API/payments/$PAYMENT/receipt -H "Authorization: Bearer $STUDENT"
curl $API/payments/$PAYMENT -H "Authorization: Bearer $COMPANY"
curl -X POST $API/payments/$PAYMENT/refund -H "Authorization: Bearer $COMPANY" -H 'Content-Type: application/json' \
  -d '{"reason":"Paid against the wrong milestone"}'

# 5. Lists
curl "$API/payments/company?status=succeeded" -H "Authorization: Bearer $COMPANY"
curl "$API/payments/admin?provider=sandbox" -H "Authorization: Bearer $ADMIN"

# 6. Stripe test mode (needs STRIPE_SECRET_KEY + PAYMENT_PROVIDER=stripe + STRIPE_WEBHOOK_SECRET)
stripe listen --forward-to localhost:5000/api/payments/webhooks/stripe
stripe trigger checkout.session.completed   # generic events are acknowledged and ignored (no matching payment)
```

## Automated coverage (observed)

```bash
cd backend    && npx jest            # 312 passed — 9 suites (55 new in payment.rules.test.js; baseline 257)
cd ai-service && python -m pytest -q # 144 passed (unchanged; no AI work in this module)
cd frontend   && npx tsc --noEmit    # clean
cd frontend   && npx next build      # succeeded — /student/payments, /company/payments, /admin/payments,
                                     #   /payments/checkout/[paymentId], /payments/receipt/[paymentId] built
```

Integration harness (scratch, in-memory SQLite, not in the repo):
`m12.flow.test.js` — 14 tests, 14 passed (sandbox flow, card outcomes, cap,
refunds, access matrix, sandbox guard, Stripe webhook with real HMAC
signatures, lists, analytics, SET NULL retention, DB scans and a console-log
scan for card/account data). Regression: Module 8 smoke 1/1, Module 9 flow
7/7, Module 10 flow 10/10, Module 11 flow 9/9. Live Stripe (test keys), real
MySQL, SMTP and the UI walk-throughs remain **Not run — needs live stack**.
