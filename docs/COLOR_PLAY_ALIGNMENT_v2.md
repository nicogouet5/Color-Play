# Color-Play — Strategy Alignment v2 (Pitch Deck Refactor)

- **Date:** 22 Nov 2026
- **Authors:** Nicolas Inostrosa · Valeria Ravanal · Rocio Torres (Simple Tech / UDD MTN)
- **Supersedes in part:** `MERCHANT_FOCUS_STRATEGY_REFACTOR.md` (Draft for Review). Where this file and that one disagree, **this file wins**.
- **Deck:** "Color-Play × Ripley — Pitch Deck v2" (10 slides, English, Claude Slides artifact)
- **Evidence key:** `[O]` observed (survey) · `[S]` public source · `[A]` assumption to validate · `[V]` validated = **none yet**

---

## 1. One-line definition (agreed)

**Color-Play is a computer-vision kiosk at Ripley's physical stores.** It analyses each shopper's colorimetry, learns her clothing tastes, and recommends in real time the best garments for her in that store. The data goes into Ripley's databases and is crossed with the CRM, so Ripley can **forecast supplier buys more accurately** (colors, sizes, styles) and **build loyalty** by solving the shopper's recommendation pain.

## 2. What changed vs. `MERCHANT_FOCUS_STRATEGY_REFACTOR.md`

| Topic | Before (refactor draft) | Now (v2, agreed) |
|---|---|---|
| Product framing | "Merchant Color-Intelligence & Full-Price Conversion System", drapes-first, camera optional | **Computer-vision colorimetry system** (camera under calibrated 5000K light) + taste survey + CRM data |
| Mode 1 entry | Anonymous by default; RUT optional *after* the result | **Shopper enters her RUT first** (like taking a number at Salcobrand), then CV color test → taste survey → live in-store map → ticket |
| Mode 2 | Phase 3 only, previewed as roadmap | Returning shoppers type **RUT only** → saved colors, sizes and tastes → sent straight to the aisle. Enabled store by store |
| Checkout | Single-use slip `CP-ALC-84920`, progressive perk 3% → 5% → 8% | **Paper ticket or QR** scanned at caja → **cumulative discount** (3% → 5% → 8% kept as working values `[A]`) + **sign-up to Ripley Puntos Go** |
| Economic buyer | Ripley Merchants | **Unchanged: Ripley Merchants.** Pain = low accuracy in supplier buys → liquidaciones + lost sales |
| Evidence display | `n=9` shown with every figure | **Percentages on slides** (89%, 78%, 100%, 89%), labeled "exploratory survey, small sample". `n=9` kept in speaker notes |
| Business model | B2B station licence + Merchant intelligence fee (SaaS) | **Sell the system + IP to Ripley**, then the team **joins Ripley (UX/UI/data) for a monthly fee** |
| Financials | Retired S6 model (−CLP 442,200/mo) + net-value equation, no projections | **5-year illustrative projection** with 3 scenarios and a break-even condition (section 5) |

**Kept from the earlier draft:** Merchants as economic buyer, the DMU, no photos stored, Law 21.719 compliance (in force from 1 Dec 2026), the 4-week discovery before any IT work, honest `[O]`/`[A]` separation.

## 3. Product flow (agreed)

**Mode 1 — first visit**
1. Shopper enters her RUT at the kiosk (explicit consent).
2. Computer-vision colorimetry under 5000K CRI 95+ light (no photo stored).
3. Short taste survey (style, usual garments, occasion, colors to avoid).
4. Real-time recommendation in the UI: which garments in this store suit her and **where they are**.
5. Ticket / QR printed → scanned at caja → cumulative discount + Ripley Puntos Go sign-up.

**Mode 2 — returning shopper (store by store)**
1. RUT only.
2. Kiosk uses saved colorimetry + sizes + tastes (+ recent Ripley purchases).
3. Shows floor, aisle and in-stock size (size editable/hideable on screen).
4. Same ticket / QR at caja.

**Data loop:** kiosk session (RUT-linked) → caja scan (what she actually bought) → Ripley CRM (color × size × taste) → Merchants (better buys to suppliers, per store).

## 4. Evidence used on slides

| Figure | Meaning | Type |
|---|---|---|
| 89% | stick to colors they already know (8/9) | `[O]` |
| 78% | have dropped a garment over color doubt (7/9) | `[O]` |
| 100% | would try the garments it suggests (9/9) | `[O]` |
| 89% | find the guidance useful (8/9) | `[O]` |
| 6.8% | of retail sales lost to inventory distortion (overstock + stockouts) | `[S]` IHL Group, Worldwide Inventory Distortion Study 2024 |
| 41 | Ripley stores in Chile (Sep 2026) | `[S]` Modaes, Ripley Q3 2026 results |
| 6–9 months | lead time of supplier buys (OTB) | `[A]` retail benchmark |

Survey: Google Forms, 21 Oct 2026, 9 qualifying fast-fashion shoppers aged 18–28, self-report. Not behavioral proof.

## 5. Business model and financial projection

### Deal structure `[A]` — proposals to negotiate
1. **Pilot, 6 months, 1 store, 1 category:** CLP 25 MM (bay hardware + team time).
2. **Ripley buys the system + IP:** CLP 200 MM = **80 upfront + 120 earn-out** when pilot KPIs are met.
3. **Embedded team:** CLP 12 MM / month (3 people in Ripley's UX/UI/data area) to run and scale it.

### Model inputs `[A]` unless sourced
| Input | Value |
|---|---|
| Stores (Chile) | 41 `[S]` |
| Apparel sales per store | ≈ CLP 9,756 MM/yr (50% apparel × ≈ CLP 800 bn Chile retail) |
| Inventory distortion | 6.8% of sales `[S]` |
| Share of distortion Color-Play trims (covered stores) | 2% conservative · **5% base** · 8% optimistic |
| Gross margin | 40% |
| Sessions / conversion / ticket | 30 per day × 360 days · 20% · CLP 30,000 |
| Incremental share of kiosk purchases | 25% |
| Average cumulative discount | 5% |
| Hardware per bay / upkeep | CLP 4.5 MM one-time · CLP 1.8 MM/yr |
| Rollout (stores live) | Y1 1 · Y2 10 · Y3 25 · Y4 41 · Y5 41 |

### Results (Ripley's view, after paying the team) — CLP MM
| Year | Y1 | Y2 | Y3 | Y4 | Y5 |
|---|---|---|---|---|---|
| Net value, base | −15 | −117 | +36 | +387 | +459 |
| Cumulative, base | −15 | −132 | −96 | +291 | **+750** |

| Scenario | 5-year cumulative for Ripley |
|---|---|
| Conservative | **−189** (does not pay back → the pilot gate and earn-out protect Ripley) |
| Base | **+750** (payback in year 4) |
| Optimistic | **+1,689** |

- **Break-even:** Color-Play must trim **≥ 2.6%** of apparel inventory distortion (≈ 0.2% of apparel sales).
- **Per bay (base):** ≈ CLP 14.7 MM net per year → hardware payback < 4 months.
- **Team revenue:** CLP 801 MM over 5 years (25 + 200 + 144/yr from Y2).

### Research still pending
- Ripley's real apparel share of sales, markdown rate and inventory turns.
- Hardware quotes in Chile (kiosk 21–24" + camera + 5000K light + thermal printer + rack).
- Ripley Puntos Go mechanics and cost of the cumulative discount.
- Market comparables for the sale price (IP / retail-tech acquisitions in Chile).

## 6. IP note (important)

Chile's **Ley 19.039, Art. 37** excludes mathematical methods and economic/commercial/business methods from patents. The CV algorithm alone is hard to patent. Plan:
- **Software + CV engine:** copyright registration (Ley 17.336).
- **Rack-kiosk hardware:** industrial design and/or utility model at INAPI.
- **Data model, UI and brand:** transferred in the sale contract (and the brand registered).
- **Action:** confirm patent viability with INAPI / an IP lawyer before saying "patents" in the pitch.

## 7. Deck v2 — slide map

| # | Slide | Message | Visual |
|---|---|---|---|
| 1 | Cover | Color clarity at the rack. Better buys for Ripley. | 3D store render |
| 2 | Problem | Ripley buys 6–9 months ahead, blind to what shoppers almost bought. | 4-step chain + 89% / 78% / 6.8% |
| 3 | Value proposition | Clarity for her. Data for Ripley. | Kiosk close-up + 100% / 89% badges + data loop |
| 4 | How it works | Two modes. One ticket at checkout. | Real kiosk UI + Mode 2 concept + QR ticket |
| 5 | Business model | Sell the system, then run it from inside. | 25 → 200 → 12/mo + IP card |
| 6 | Go-to-market | One store first. Then all 41. | Portable rack render + rollout bars + DMU |
| 7 | Competition | Others help the shopper or the Merchant. Not both. | 2×2 matrix + 3 differentiators |
| 8 | Team | Retail economics, shopper trust and kiosk engineering. | 3 profiles |
| 9 | Financials | Base case: payback in year 4. | Yearly bars + 3 scenarios |
| 10 | Status & ask | Next: discovery, pilot, decision. | 3D model + roadmap (CLP 1.2 MM → 25 MM → 200 MM → 41 stores) |

## 8. Repo / prototype items to align next

The live prototype (`nicogouet5.github.io/Color-Play`) still reflects the older anonymous-first flow. To match v2:

1. **`work/src/vision-kiosk.ts` (Welcome screen):** replace "No account and no photo stored" with a **RUT entry + consent** step; add the Mode 1 / Mode 2 fork.
2. **Mode 2 screen:** build "Welcome back" (saved palette, editable size, floor/aisle list); it is a concept only in the deck.
3. **Result screen:** add the printable **ticket with QR** (`CP-ALC-84920`) and the cumulative-discount line.
4. **`PRODUCT.md` / `README.md`:** update the one-line definition, the RUT-first flow, the sell-then-embed model and the IP note.
5. **`MERCHANT_FOCUS_STRATEGY_REFACTOR.md`:** mark sections 3, 5 and 6 as superseded by this file (Mode 1 anonymity, the B2B licensing model, the economics).
6. **Privacy:** with RUT-first, write down the Law 21.719 consent text and data retention for the kiosk before any live test.

## 9. Open decisions

- Deck language: English (current) or Spanish for a Ripley-facing version.
- Final sale price and earn-out KPIs (sell-through lift, ticket uptake, in-stock accuracy).
- Whether to keep the 3% → 5% → 8% discount ladder or let Ripley Puntos Go define it.
- Which store and category for the pilot.
