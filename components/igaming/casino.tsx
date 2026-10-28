"use client";

import * as React from "react";
import {
  Bell,
  CalendarClock,
  Dices,
  Gamepad2,
  Gift,
  History,
  Home,
  Layers,
  LogOut,
  Medal,
  Radio,
  Search,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";

import { formatMoney } from "@/lib/igaming/policy";

/*
 * Aurora Play: a fictional casino and sportsbook with its own brand. The game
 * art and the lobby copy are the casino's own content; nothing on this screen
 * is Didit data. Didit's part is the sign-up, the age check, the monitored
 * cashier and the bonus check, and the live layer above shows each one.
 */

export const GAMES = [
  {
    id: "pharaoh",
    name: "Pharaoh's Gold",
    studio: "Aurora Originals",
    rtp: "96.5%",
    badge: "hot",
  },
  {
    id: "aurora",
    name: "Aurora Crystals",
    studio: "Aurora Originals",
    rtp: "96.2%",
    badge: "jp",
  },
  {
    id: "fruits",
    name: "Neon Fruits",
    studio: "Lumen Games",
    rtp: "96.8%",
    badge: null,
  },
  {
    id: "dragon",
    name: "Dragon Pearl",
    studio: "Jade Studio",
    rtp: "96.1%",
    badge: "new",
  },
  {
    id: "viking",
    name: "Viking Storm",
    studio: "Northwind",
    rtp: "96.4%",
    badge: null,
  },
  {
    id: "reef",
    name: "Reef Riches",
    studio: "Lumen Games",
    rtp: "96.3%",
    badge: null,
  },
] as const;

const BADGE = { hot: "HOT", jp: "JACKPOT", new: "NEW" } as const;

const LIVE_TABLES = [
  { id: "roulette", name: "Aurora Roulette", info: "1 to 5,000 EUR" },
  { id: "blackjack", name: "Blackjack VIP", info: "25 to 10,000 EUR" },
  { id: "baccarat", name: "Baccarat Royale", info: "5 to 7,500 EUR" },
] as const;

export type NavId = "lobby" | "cashier" | "promotions" | "history";

function Logo() {
  return (
    <span aria-hidden className="ap-logo">
      <Sparkles fill="#FFFFFF" size={18} strokeWidth={1.5} />
    </span>
  );
}

export function Brand() {
  return (
    <span className="ap-brand">
      <Logo />
      <span>
        Aurora <em>Play</em>
      </span>
    </span>
  );
}

function Sidebar({
  onNav,
  onResponsible,
}: {
  onNav(nav: NavId): void;
  onResponsible(): void;
}) {
  const item = (
    label: string,
    Icon: React.ComponentType<{ "aria-hidden": boolean }>,
    extra?: React.ReactNode,
    on?: boolean,
    onClick?: () => void,
  ) => (
    <button
      aria-current={on ? "page" : undefined}
      className={`ap-nav${on ? " is-on" : ""}`}
      type="button"
      onClick={onClick ?? (() => onNav("lobby"))}
    >
      <Icon aria-hidden />
      <span>{label}</span>
      {extra}
    </button>
  );

  return (
    <aside className="ap-side">
      <Brand />
      {item("Lobby", Home, null, true)}
      {item("Slots", Gamepad2)}
      {item("Live casino", Radio, <i className="ap-live-dot" />)}
      {item("Table games", Layers)}
      {item("Jackpots", Medal)}
      {item("Sports", Dices)}
      {item("Promotions", Gift, <b>3</b>, false, () => onNav("promotions"))}
      {item("VIP club", Star)}
      <span className="ap-sec">Your account</span>
      {item("Cashier", Wallet, null, false, () => onNav("cashier"))}
      {item("History", History)}
      <button className="ap-rg" type="button" onClick={onResponsible}>
        <b>Play responsibly</b>
        Set deposit limits or take a break any time. 18+ only.
      </button>
    </aside>
  );
}

export interface Account {
  initial: string;
  name: string;
  email: string | null;
  /** Null until the age check opens the cashier. */
  balance: number | null;
}

/** The signed-in player's avatar and its menu, with Sign out. */
function AccountMenu({
  account,
  onSignOut,
}: {
  account: Account;
  onSignOut(): void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !ref.current?.contains(event.target as Node)
      )
        setOpen(false);
    };

    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);

    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`ap-me${account.balance === null ? " is-solo" : ""}`}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${account.name}`}
        className="ap-ava"
        data-testid="aurora-account"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        {account.initial}
      </button>
      {open ? (
        <span aria-label="Account" className="ap-menu" role="menu">
          <span className="ap-menu-who">
            <b>{account.name}</b>
            {account.email && account.email !== account.name ? (
              <small>{account.email}</small>
            ) : null}
          </span>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut aria-hidden size={16} />
            Sign out
          </button>
        </span>
      ) : null}
    </span>
  );
}

function TopBar({
  account,
  onSignUp,
  onSignIn,
  onSignOut,
  onDeposit,
}: {
  account: Account | null;
  onSignUp(): void;
  onSignIn(): void;
  onSignOut(): void;
  onDeposit(): void;
}) {
  return (
    <div className="ap-top">
      <span className="ap-phone-only">
        <Brand />
      </span>
      <label className="ap-search">
        <Search aria-hidden size={17} />
        <input aria-label="Search games" placeholder="Search 2,400 games" />
      </label>
      <span className="ap-chips">
        <span className="ap-chip is-on">Casino</span>
        <span className="ap-chip">Sports</span>
      </span>
      <span className="ap-top-r">
        {account ? (
          <>
            {account.balance !== null ? (
              <span className="ap-bal" data-callout="balance">
                <span>
                  <small>Balance</small>
                  <span data-testid="aurora-balance">
                    {formatMoney(account.balance)}
                  </span>
                </span>
                <button className="ap-dep" type="button" onClick={onDeposit}>
                  <span className="ap-desk-only">Deposit</span>
                  <span aria-label="Deposit" className="ap-phone-only">
                    +
                  </span>
                </button>
              </span>
            ) : null}
            <span aria-hidden className="ap-bell">
              <Bell size={17} />
            </span>
            <AccountMenu account={account} onSignOut={onSignOut} />
          </>
        ) : (
          <>
            <button
              className="ap-btn is-ghost ap-desk-only"
              type="button"
              onClick={onSignIn}
            >
              Log in
            </button>
            <button
              className="ap-btn is-grad"
              data-callout="signup"
              type="button"
              onClick={onSignUp}
            >
              Sign up
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function Lobby({
  signedIn,
  onClaim,
  onTerms,
  onGame,
}: {
  signedIn: boolean;
  onClaim(): void;
  onTerms(): void;
  onGame(name: string): void;
}) {
  return (
    <>
      <section className="ap-hero">
        <div className="ap-hero-x">
          <small>Welcome offer</small>
          <h1>
            {signedIn ? (
              <>
                <span className="ap-desk-only">
                  Your 100 free spins are ready
                </span>
                <span className="ap-phone-only">100 free spins ready</span>
              </>
            ) : (
              "100 free spins on your first deposit"
            )}
          </h1>
          <p>
            Plus a 100% match up to 200 EUR. Wagering 30x. 18+, play
            responsibly.
          </p>
          <span className="ap-hero-cta flex gap-2.5">
            <button
              className="ap-btn is-gold"
              data-callout="claim"
              type="button"
              onClick={onClaim}
            >
              {signedIn ? "Claim now" : "Join and claim"}
            </button>
            <button className="ap-btn is-ghost" type="button" onClick={onTerms}>
              Terms
            </button>
          </span>
        </div>
        <span aria-hidden className="ap-hero-dots">
          <i />
          <i />
          <i />
        </span>
      </section>
      <section className="ap-jack">
        <Medal aria-hidden color="#FFC24B" size={22} />
        <span className="flex flex-col">
          <small>Aurora mega jackpot</small>
          <b>1,284,551.20 EUR</b>
        </span>
        <span>
          Last win <em>48,210 EUR</em> on Aurora Crystals
        </span>
      </section>
      <section className="flex flex-col gap-3.5">
        <div className="ap-row-h">
          <h2>Popular slots</h2>
          <span className="ap-chips">
            <span className="ap-chip is-on">All</span>
            <span className="ap-chip">New</span>
            <span className="ap-chip">Jackpots</span>
            <span className="ap-chip">Megaways</span>
          </span>
          <a className="ap-phone-only" href="#slots">
            See all
          </a>
        </div>
        <div className="ap-games">
          {GAMES.map((game) => (
            <button
              key={game.id}
              className="ap-game"
              type="button"
              onClick={() => onGame(game.name)}
            >
              <span
                className="ap-game-img"
                style={{
                  backgroundImage: `url(/demos/aurora/ap-slot-${game.id}.webp)`,
                }}
              >
                {game.badge ? (
                  <span className={`ap-badge is-${game.badge}`}>
                    {BADGE[game.badge]}
                  </span>
                ) : null}
              </span>
              <b>{game.name}</b>
              <span>
                {game.studio} · {game.rtp}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="ap-lives-sec flex flex-col gap-3.5">
        <div className="ap-row-h">
          <h2>Live casino</h2>
          <a href="#live">See all</a>
        </div>
        <div className="ap-lives">
          {LIVE_TABLES.map((table) => (
            <div
              key={table.id}
              className="ap-live"
              style={{
                backgroundImage: `url(/demos/aurora/ap-live-${table.id}.webp)`,
              }}
            >
              <span className="ap-onair">LIVE</span>
              <span className="ap-live-x">
                <b>{table.name}</b>
                <span>{table.info}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="ap-lives-sec flex flex-col gap-3.5">
        <div className="ap-row-h">
          <h2>Sportsbook</h2>
          <a href="#sports">
            <CalendarClock aria-hidden className="mr-1 inline" size={14} />
            Today
          </a>
        </div>
        <div
          className="ap-live"
          style={{
            backgroundImage: "url(/demos/aurora/ap-sports.webp)",
            height: 160,
          }}
        >
          <span className="ap-live-x">
            <b>Live odds on 1,200 matches a day</b>
            <span>Football, tennis, basketball and esports</span>
          </span>
        </div>
      </section>
    </>
  );
}

/** The casino: sidebar, top bar and the lobby; modals render on top of it. */
export function Casino({
  account,
  toast,
  onSignUp,
  onSignIn,
  onDeposit,
  onNav,
  onClaim,
  onTerms,
  onGame,
  onResponsible,
  onSignOut,
  children,
}: {
  account: Account | null;
  toast: { tone: "info" | "error"; text: string } | null;
  onSignUp(): void;
  onSignIn(): void;
  onDeposit(): void;
  onNav(nav: NavId): void;
  onClaim(): void;
  onTerms(): void;
  onGame(name: string): void;
  onResponsible(): void;
  onSignOut(): void;
  children?: React.ReactNode;
}) {
  return (
    <div className="ap" data-testid="aurora-app">
      <Sidebar onNav={onNav} onResponsible={onResponsible} />
      <div className="ap-main">
        <TopBar
          account={account}
          onDeposit={onDeposit}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onSignUp={onSignUp}
        />
        {toast ? (
          <div
            className={`ap-toast${toast.tone === "error" ? " is-error" : ""}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            {toast.text}
          </div>
        ) : null}
        <div className="ap-content">
          <Lobby
            signedIn={account !== null && account.balance !== null}
            onClaim={onClaim}
            onGame={onGame}
            onTerms={onTerms}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
