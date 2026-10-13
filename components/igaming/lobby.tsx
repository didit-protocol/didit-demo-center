"use client";

import Image from "next/image";
import { ArrowRight, ShieldCheck } from "lucide-react";

import {
  LICENSED_MARKETS,
  WELCOME_BONUS,
  formatMoney,
} from "@/lib/igaming/policy";

/**
 * The logged-out lobby: what a prospect's own player sees first. Every tile
 * leads to "Join now", because nothing at Aurora Play is playable before the
 * age check.
 */

const GAMES = [
  { name: "Northern Lights Roulette", kind: "Live casino", image: "05" },
  { name: "Polar Blackjack", kind: "Table games", image: "08" },
  { name: "Aurora Spins", kind: "Slots", image: "11" },
  { name: "Midnight Baccarat", kind: "Live casino", image: "14" },
  { name: "Glacier Poker", kind: "Poker", image: "17" },
  { name: "Madrid v Barcelona", kind: "Sportsbook", image: "23" },
];

export function Lobby({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="ig-promo relative overflow-hidden rounded-sm px-6 py-8 sm:px-8 sm:py-10">
        <p className="m-0 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
          Welcome offer
        </p>
        <h2 className="mt-3 max-w-[460px] text-balance text-[28px] font-display leading-[1.1] tracking-display text-white sm:text-[34px]">
          A {formatMoney(WELCOME_BONUS)} free bet when you join
        </h2>
        <p className="mt-3 max-w-[460px] text-sm leading-6 text-white/75">
          18+ only. A ten-second selfie confirms your age, and an ID is only
          needed if the estimate is close to 18.
        </p>
        <button
          className="ig-btn mt-6 bg-white pl-5 pr-3 text-black hover:bg-white/90"
          type="button"
          onClick={onJoin}
        >
          Join now
          <ArrowRight aria-hidden className="size-5" />
        </button>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h3 className="m-0 text-base font-semibold tracking-tight text-ink">
            Popular right now
          </h3>
          <span className="text-xs text-muted">Join to play</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3">
          {GAMES.map((game) => (
            <li key={game.name}>
              <button
                aria-label={`${game.name}: join to play`}
                className="group relative flex aspect-[16/10] w-full flex-col justify-end overflow-hidden rounded-sm border border-line p-3 text-left focus-visible:shadow-ring focus-visible:outline-none"
                type="button"
                onClick={onJoin}
              >
                <Image
                  fill
                  alt=""
                  className="object-cover transition-transform duration-slow ease-out group-hover:scale-[1.04]"
                  sizes="(min-width: 640px) 33vw, 50vw"
                  src={`/media/gradient-library/nature-blurred-${game.image}.webp`}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="relative font-mono text-[9px] font-medium uppercase tracking-[0.16em] text-white/80">
                  {game.kind}
                </span>
                <span className="relative mt-1 text-sm font-semibold leading-tight tracking-tight text-white">
                  {game.name}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="ig-card flex flex-wrap items-center gap-3 px-4 py-3.5">
        <ShieldCheck aria-hidden className="size-5 flex-none text-blue" />
        <p className="m-0 min-w-0 flex-1 text-[13px] leading-5 text-muted">
          Licensed in {LICENSED_MARKETS.map((market) => market.name).join(", ")}
          . Real-money play is only offered from these countries.
        </p>
      </section>
    </div>
  );
}
