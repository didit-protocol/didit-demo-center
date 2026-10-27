"use client";

import type { TransactionSummary } from "@/lib/marketplace/summaries";

import * as React from "react";
import {
  AlertTriangle,
  Apple,
  Ban,
  ChevronDown,
  CircleCheck,
  CreditCard,
  KeyRound,
  MessageCircle,
  Monitor,
  Package,
  Plus,
  ScanFace,
  Search,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  Timer,
} from "lucide-react";

import { DiditRing } from "@/components/didit-live/icons";
import { ruleName } from "@/lib/marketplace/live-events";
import {
  CATEGORIES,
  CHECKOUT,
  HIGH_VALUE_THRESHOLD,
  ORDER_TOTAL,
  OUTLET_LISTINGS,
  PHOTOS,
  RECENT_ORDERS,
  SELLER,
  SHOP_LISTINGS,
  SHOP_STATS,
  type ShopItem,
  eur,
} from "@/lib/marketplace/northmarket";

/* ── The storefront around every screen ─────────────────────────── */

export type Visitor = "guest" | "seller" | "buyer";

export function Store({
  visitor,
  category = "All",
  toast,
  bodyClass = "",
  onSellerHub,
  onLogIn,
  children,
}: {
  visitor: Visitor;
  category?: string;
  toast: { tone: "info" | "error"; text: string } | null;
  bodyClass?: string;
  onSellerHub(): void;
  onLogIn(): void;
  children: React.ReactNode;
}) {
  return (
    <div className="nm" data-testid="northmarket-app">
      <header className="nm-head">
        <span className="nm-logo">
          <i aria-hidden />
          northmarket
        </span>
        <span className="nm-search">
          <Search aria-hidden size={18} />
          Search vintage, design and more
        </span>
        <div className="nm-head-r">
          <button
            className="nm-link border-0 bg-transparent p-0"
            type="button"
            onClick={onSellerHub}
          >
            {visitor === "buyer" ? "Sell" : "Seller hub"}
          </button>
          <MessageCircle aria-hidden className="nm-ic nm-desk-ic" />
          <Star aria-hidden className="nm-ic nm-desk-ic" />
          <Search aria-hidden className="nm-ic nm-phone-only" />
          <Package aria-hidden className="nm-ic" />
          {visitor === "guest" ? (
            <button className="nm-btn" type="button" onClick={onLogIn}>
              Log in
            </button>
          ) : visitor === "seller" ? (
            <img
              alt={SELLER.name}
              className="nm-ava"
              data-callout="account"
              src={PHOTOS.seller}
            />
          ) : (
            <span aria-label={CHECKOUT.buyer.name} className="nm-ini">
              {CHECKOUT.buyer.initials}
            </span>
          )}
        </div>
      </header>
      <nav aria-label="Categories" className="nm-cats">
        {CATEGORIES.map((item) => (
          <span key={item} className={item === category ? "is-on" : undefined}>
            {item}
          </span>
        ))}
      </nav>
      <main className={`nm-body ${bodyClass}`}>{children}</main>
      {toast ? (
        <div
          className={`nm-toast${toast.tone === "error" ? " is-error" : ""}`}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.text}
        </div>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden height="16" viewBox="0 0 24 24" width="16">
      <path
        d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.82h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.33Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.98-.9 6.64-2.43l-3.24-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.58A10 10 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.06a10 10 0 0 0 0 8.96L6.4 13.9Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ── 1. Sign up: open your shop ─────────────────────────────────── */

export interface SignUpProps {
  authEnabled: boolean;
  busy: boolean;
  error: string | null;
  /** The shop already opened on this device, for the second-shop step. */
  previous: string | null;
  /** Hosted Didit sign-up: passkey first, Google and Apple there too. */
  onHosted(shop: string): void;
  onEmailStart(email: string, shop: string): Promise<boolean>;
  onEmailVerify(code: string): void;
  /** Without Authentication: Northmarket's own form opens the shop. */
  onJoin(shop: string): void;
}

export function SignUpScreen({
  authEnabled,
  busy,
  error,
  previous,
  onHosted,
  onEmailStart,
  onEmailVerify,
  onJoin,
}: SignUpProps) {
  const [email, setEmail] = React.useState("");
  const [shop, setShop] = React.useState<string>(
    previous ? SELLER.secondShop : SELLER.shop,
  );
  const [code, setCode] = React.useState("");
  const [codeSent, setCodeSent] = React.useState(false);

  React.useEffect(() => {
    setShop(previous ? SELLER.secondShop : SELLER.shop);
  }, [previous]);

  return (
    <div className="nm-signup">
      <div className="nm-hero">
        <span className="nm-badge">For sellers</span>
        <h1>Your shop on Northmarket, open today.</h1>
        <p>
          6% per sale and nothing to list. Paid out two days after delivery,
          protected against lost parcels and fake claims.
        </p>
        <div aria-hidden className="nm-shots">
          {[PHOTOS.camera, PHOTOS.lamp, PHOTOS.bag].map((src) => (
            <span
              key={src}
              className="nm-shot"
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>
      </div>
      <form
        aria-label="Open your shop"
        className="nm-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!authEnabled) return onJoin(shop.trim());
          if (codeSent) return onEmailVerify(code.trim());
          void onEmailStart(email.trim(), shop.trim()).then(setCodeSent);
        }}
      >
        <h2>{previous ? "Open another shop" : "Open your shop"}</h2>
        <p>
          {authEnabled
            ? "Sell to 4 million buyers in Europe. Sign in with a passkey."
            : "Sell to 4 million buyers in Europe. Open your shop in a minute."}
        </p>
        {previous ? (
          <p className="nm-note">
            This is a second shop on the same device as {previous}. Open it to
            see what Didit does.
          </p>
        ) : null}
        {authEnabled && !codeSent ? (
          <>
            <button
              className="nm-btn is-pri"
              data-callout="passkey"
              disabled={busy || shop.trim().length < 2}
              type="button"
              onClick={() => onHosted(shop.trim())}
            >
              <KeyRound aria-hidden size={18} />
              Create a passkey
            </button>
            <span className="nm-socs">
              <button
                className="nm-btn"
                disabled={busy || shop.trim().length < 2}
                type="button"
                onClick={() => onHosted(shop.trim())}
              >
                <GoogleMark />
                Google
              </button>
              <button
                className="nm-btn"
                disabled={busy || shop.trim().length < 2}
                type="button"
                onClick={() => onHosted(shop.trim())}
              >
                <Apple aria-hidden fill="currentColor" size={16} />
                Apple
              </button>
            </span>
          </>
        ) : null}
        {authEnabled && codeSent ? (
          <label className="nm-field">
            The 6-digit code we sent to {email}
            <span className="nm-input">
              <input
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]{6}"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </span>
          </label>
        ) : null}
        {authEnabled && !codeSent ? (
          <label className="nm-field">
            Email
            <span className="nm-input">
              <input
                autoComplete="email"
                placeholder={SELLER.email}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </span>
          </label>
        ) : null}
        {!codeSent ? (
          <>
            <label className="nm-field">
              Shop name
              <span className="nm-input">
                <input
                  required
                  maxLength={40}
                  minLength={2}
                  value={shop}
                  onChange={(event) => setShop(event.target.value)}
                />
              </span>
            </label>
            <label className="nm-field">
              Selling as
              <span className="nm-input is-select">
                <select defaultValue="business">
                  <option value="business">A registered business</option>
                  <option value="sole-trader">A sole trader</option>
                </select>
                <ChevronDown aria-hidden size={16} />
              </span>
            </label>
          </>
        ) : null}
        {error ? (
          <p className="nm-err" role="alert">
            {error}
          </p>
        ) : null}
        {!authEnabled ? (
          <button
            className="nm-btn is-pri"
            data-callout="open-shop"
            disabled={busy}
            type="submit"
          >
            {busy ? "Opening your shop…" : "Open my shop"}
          </button>
        ) : codeSent || email.trim() ? (
          <button className="nm-btn is-ink" disabled={busy} type="submit">
            {codeSent ? "Confirm the code" : "Continue with email"}
          </button>
        ) : null}
        <span className="nm-secured">
          <DiditRing />
          {authEnabled ? "Sign-in secured by" : "Protected by"} <b>Didit</b>
        </span>
      </form>
    </div>
  );
}

/* ── 2 and 3. The seller hub ────────────────────────────────────── */

function Listing({ item }: { item: ShopItem }) {
  return (
    <div className="nm-item">
      <div
        className="nm-photo"
        style={{ backgroundImage: `url(${item.photo})` }}
      >
        <span aria-hidden className="nm-heart">
          <Star size={16} />
        </span>
        {item.tag ? <span className="nm-tag">{item.tag}</span> : null}
      </div>
      <b>{eur(item.price)}</b>
      <span>{item.title}</span>
      <small>{item.shop}</small>
    </div>
  );
}

export interface HubProps {
  shop: string;
  company: string;
  /** The KYB's status, null before it starts. */
  kyb: string | null;
  canContinue: boolean;
  busy: boolean;
  payoutDay: string;
  onVerify(): void;
  onBuyerView(): void;
}

export function HubScreen({
  shop,
  company,
  kyb,
  canContinue,
  busy,
  payoutDay,
  onVerify,
  onBuyerView,
}: HubProps) {
  const status = (kyb ?? "").toLowerCase();
  const approved = status === "approved";
  const declined = status === "declined";

  return (
    <>
      <div className="nm-title">
        <h1 className="nm-h1">{shop}</h1>
        {approved ? (
          <span className="nm-badge is-ok" data-callout="verified">
            <ShieldCheck aria-hidden size={15} />
            Verified business
          </span>
        ) : kyb ? (
          <span className={`nm-badge ${declined ? "is-no" : "is-hold"}`}>
            Business check {status}
          </span>
        ) : (
          <span className="nm-badge">Not verified yet</span>
        )}
        <span className="nm-acts nm-desk-only">
          <button className="nm-btn" type="button" onClick={onBuyerView}>
            Shop page
          </button>
          <button className="nm-btn is-pri" type="button">
            <Plus aria-hidden size={16} />
            New listing
          </button>
        </span>
      </div>
      {approved ? (
        <div className="nm-banner is-ok" data-testid="nm-payouts">
          <CircleCheck aria-hidden className="text-[#2F7D4F]" size={22} />
          <span>
            <b>Payouts are on</b>
            {company} is verified. Your next payout of {eur(SHOP_STATS.payout)}{" "}
            arrives on {payoutDay}.
          </span>
        </div>
      ) : (
        <div
          className={`nm-banner ${declined ? "is-no" : "is-hold"}`}
          data-testid="nm-payouts"
        >
          <Timer aria-hidden className="text-[#9A5200]" size={22} />
          <span>
            <b>
              {declined
                ? "Your business was not verified"
                : kyb
                  ? "Your business check is not finished"
                  : "Verify your business to get paid"}
            </b>
            {declined
              ? "Payouts stay off for this shop."
              : `We check ${company} in the company registry, then each owner confirms their ID. Payouts start once it is approved.`}
          </span>
          {!declined && (!kyb || canContinue) ? (
            <button
              className="nm-btn is-ink"
              data-callout="verify"
              disabled={busy}
              type="button"
              onClick={onVerify}
            >
              {busy
                ? "Opening…"
                : kyb
                  ? "Continue the check"
                  : "Verify my business"}
            </button>
          ) : null}
        </div>
      )}
      <div className="nm-kpis">
        <div className="nm-kpi">
          <small>Sales this month</small>
          <b>{eur(SHOP_STATS.sales)}</b>
          <span>{SHOP_STATS.orders} orders</span>
        </div>
        <div className="nm-kpi">
          <small>Available for payout</small>
          <b>{eur(SHOP_STATS.payout)}</b>
          <span>
            {approved ? `Next payout ${payoutDay}` : "Waits for the business check"}
          </span>
        </div>
        <div className="nm-kpi">
          <small>Rating</small>
          <b>{SHOP_STATS.rating}</b>
          <span className="nm-stars">★★★★★</span>
        </div>
        <div className="nm-kpi">
          <small>Listings</small>
          <b>{SHOP_STATS.listings}</b>
          <span>{SHOP_STATS.soldThisWeek} sold this week</span>
        </div>
      </div>
      <div className="nm-split">
        <section className="nm-card">
          <h2 className="nm-h2">
            Recent orders <a href="#orders">All orders</a>
          </h2>
          {RECENT_ORDERS.map((order) => (
            <div key={order.id} className="nm-row">
              <span
                aria-hidden
                className="nm-th"
                style={{ backgroundImage: `url(${order.photo})` }}
              />
              <span className="x">
                <b>
                  Order {order.id} · {order.title}
                </b>
                <span>{order.buyer}</span>
              </span>
              <span className="amt">{eur(order.amount)}</span>
              <span
                className={`nm-badge ${order.status === "Paid" ? "is-ok" : "is-hold"}`}
              >
                {order.status}
              </span>
            </div>
          ))}
        </section>
        <section className="nm-card">
          <h2 className="nm-h2">
            Your listings
            <a
              href="#checkout"
              onClick={(event) => {
                event.preventDefault();
                onBuyerView();
              }}
            >
              See it as a buyer
            </a>
          </h2>
          <div className="nm-listings">
            {SHOP_LISTINGS.map((item) => (
              <Listing key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

/* ── 3. Transact: the buyer's checkout ──────────────────────────── */

export interface CheckoutProps {
  order: TransactionSummary | null;
  busy: "order" | "age" | null;
  /** The seller's verified company, once its KYB is approved. */
  verifiedSeller: string | null;
  sellerShop: string;
  onPlace(): void;
  onSelfie(): void;
  onChange(): void;
}

export function CheckoutScreen({
  order,
  busy,
  verifiedSeller,
  sellerShop,
  onPlace,
  onSelfie,
  onChange,
}: CheckoutProps) {
  const held = order?.status === "AWAITING_USER";
  const approved = order?.status === "APPROVED";
  const stopped = order && !held && !approved;
  const { item } = CHECKOUT;

  return (
    <>
      <h1 className="nm-h1">Checkout</h1>
      <div className="nm-checkout">
        <div className="nm-checkout-l">
          <section className="nm-card is-form">
            <h3>Delivery</h3>
            <div className="nm-pair">
              <label className="nm-field">
                Name
                <span className="nm-input">
                  <input
                    autoComplete="off"
                    defaultValue={CHECKOUT.buyer.name}
                  />
                </span>
              </label>
              <label className="nm-field">
                Address
                <span className="nm-input">
                  <input
                    autoComplete="off"
                    defaultValue={CHECKOUT.buyer.address}
                  />
                </span>
              </label>
            </div>
            <h3>Payment</h3>
            <label className="nm-field">
              Card
              <span className="nm-input nm-card-row">
                <span className="inline-flex items-center gap-2.5">
                  <CreditCard aria-hidden size={18} />
                  {CHECKOUT.buyer.card}
                </span>
                <em>Buyer protection included</em>
              </span>
            </label>
          </section>
          {held ? (
            <div className="nm-hold" data-testid="nm-hold">
              <Timer aria-hidden className="text-[#9A5200]" size={22} />
              <b>Confirm your age to finish this order</b>
              <p>
                Orders of {eur(HIGH_VALUE_THRESHOLD)} or more need a quick
                selfie check. It takes about a minute, then your order goes
                through.
              </p>
              <span className="nm-acts">
                <button
                  className="nm-btn is-ink"
                  data-callout="selfie"
                  disabled={busy !== null}
                  type="button"
                  onClick={onSelfie}
                >
                  <ScanFace aria-hidden size={18} />
                  {busy === "age" ? "Checking…" : "Take a selfie"}
                </button>
                <button className="nm-btn" type="button" onClick={onChange}>
                  Change the order
                </button>
              </span>
            </div>
          ) : approved ? (
            <div className="nm-hold is-ok" data-testid="nm-hold">
              <CircleCheck aria-hidden className="text-[#2F7D4F]" size={22} />
              <b>Order placed</b>
              <p>
                {eur(order.amount)} to {sellerShop}.{" "}
                {order.rules.length
                  ? "Your age is confirmed and the seller ships within two days."
                  : "The seller ships within two days."}
              </p>
            </div>
          ) : stopped ? (
            <div className="nm-hold is-no" data-testid="nm-hold">
              <AlertTriangle aria-hidden className="text-[#B42318]" size={22} />
              <b>This order did not go through</b>
              <p>
                Didit answered {order.status.toLowerCase().replace(/_/g, " ")}.
                Nothing was charged.
              </p>
            </div>
          ) : null}
        </div>
        <aside className="nm-summary">
          <div
            aria-hidden
            className="nm-hero-photo"
            style={{ backgroundImage: `url(${item.photo})` }}
          >
            <span>1 / 6</span>
          </div>
          <div className="nm-sum-item">
            <span
              aria-hidden
              className="nm-photo"
              style={{ backgroundImage: `url(${item.photo})` }}
            />
            <span>
              <b className="nm-price">{eur(item.price)}</b>
              <b>{item.title}</b>
              <p>{item.detail}</p>
              {verifiedSeller ? (
                <span className="nm-badge is-ok" data-callout="seller">
                  <ShieldCheck aria-hidden size={14} />
                  Verified business
                </span>
              ) : null}
              <small>
                Sold by {sellerShop} · Madrid{" "}
                <span className="text-[#E9A23B]">★ {SHOP_STATS.rating}</span>
              </small>
            </span>
          </div>
          <div className="nm-lines">
            <div>
              Item <b>{eur(item.price, true)}</b>
            </div>
            <div>
              Shipping, insured <b>{eur(CHECKOUT.shipping, true)}</b>
            </div>
            <div>
              Buyer protection <b>{eur(CHECKOUT.protection, true)}</b>
            </div>
            <div className="is-total">
              Total <b>{eur(ORDER_TOTAL, true)}</b>
            </div>
          </div>
          <button
            className="nm-btn is-pri"
            data-callout="place"
            disabled={busy !== null || held || approved}
            type="button"
            onClick={onPlace}
          >
            {busy === "order"
              ? "Placing the order…"
              : approved
                ? "Order placed"
                : `Place order · ${eur(ORDER_TOTAL)}`}
          </button>
        </aside>
      </div>
    </>
  );
}

/* ── 4. Stop fraud: the second shop ─────────────────────────────── */

export interface OutletProps {
  shop: string;
  previous: string;
  signup: TransactionSummary | null;
  device: string | null;
  firstVisit: boolean | null;
  opened: string;
}

export function OutletScreen({
  shop,
  previous,
  signup,
  device,
  firstVisit,
  opened,
}: OutletProps) {
  const paused = signup !== null && signup.status !== "APPROVED";

  return (
    <>
      <div className="nm-title">
        <h1 className="nm-h1">{shop}</h1>
        {paused ? (
          <span className="nm-badge is-no" data-callout="paused">
            <Ban aria-hidden size={15} />
            Payouts paused
          </span>
        ) : (
          <span className="nm-badge">New shop</span>
        )}
      </div>
      {paused ? (
        <div className="nm-banner is-no" data-testid="nm-paused">
          <AlertTriangle aria-hidden className="text-[#B42318]" size={22} />
          <span>
            <b>Payouts are paused for this shop</b>
            This shop was opened on a device that already runs another shop,
            {` ${previous}`}. Our team is reviewing it. Your listings stay
            online.
          </span>
        </div>
      ) : (
        <div className="nm-banner is-hold" data-testid="nm-paused">
          <Timer aria-hidden className="text-[#9A5200]" size={22} />
          <span>
            <b>
              {signup ? "Payouts wait for the business check" : "Checking…"}
            </b>
            {signup
              ? "Didit did not link this shop to another one. Verify the business to start payouts."
              : "Didit is checking the new shop's sign-up."}
          </span>
        </div>
      )}
      <div className="nm-split">
        <section className="nm-card nm-details">
          <h2 className="nm-h2">New shop details</h2>
          <div className="nm-row">
            <span className="nm-tile">
              <StoreIcon aria-hidden size={20} />
            </span>
            <span className="x">
              <b>Shop</b>
              <span>
                {shop} · opened {opened}
              </span>
            </span>
            <span className="nm-badge">New</span>
          </div>
          <div className="nm-row">
            <span className="nm-tile">
              <Monitor aria-hidden size={20} />
            </span>
            <span className="x">
              <b>Device</b>
              <span>{device ?? "This browser"}</span>
            </span>
            <span className="nm-badge is-hold">
              {firstVisit === false || paused ? "Seen before" : "This device"}
            </span>
          </div>
          <div className="nm-row">
            <span className="nm-tile">
              <ShieldCheck aria-hidden size={20} />
            </span>
            <span className="x">
              <b>Sign-up review</b>
              <span>
                {signup
                  ? signup.rules[0]
                    ? `Rule: ${ruleName(signup.rules[0].title).toLowerCase()}`
                    : "No rule matched"
                  : "Waiting for Didit"}
              </span>
            </span>
            <span className={`nm-badge ${paused ? "is-no" : "is-ok"}`}>
              {signup
                ? signup.status.charAt(0) +
                  signup.status.slice(1).toLowerCase().replace(/_/g, " ")
                : "Pending"}
            </span>
          </div>
        </section>
        <section className="nm-card">
          <h2 className="nm-h2">
            Listings <a href="#listings">{OUTLET_LISTINGS.length} items</a>
          </h2>
          <div className="nm-listings">
            {OUTLET_LISTINGS.map((item) => (
              <Listing key={item.title} item={item} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
