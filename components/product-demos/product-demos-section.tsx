"use client";

import type { Family } from "@/lib/product-demos/define";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Glyph } from "./parts";

import {
  AVAILABILITY_LABEL,
  FAMILIES,
  availability,
  familyCounts,
  productDemoRoute,
} from "@/lib/product-demos/define";
import { PRODUCT_DEMOS } from "@/lib/product-demos/demos";

/*
 * The hub's Product demos section (the Main board): a segmented filter by
 * family and the grid of all 18, each card opening its page on the product
 * demo template.
 */

type Filter = Family | "all";

const COUNTS = familyCounts(PRODUCT_DEMOS);
const OPTIONS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  ...FAMILIES,
];

export function ProductDemosSection() {
  const [filter, setFilter] = React.useState<Filter>("all");
  const shown = PRODUCT_DEMOS.filter(
    (demo) => filter === "all" || demo.family === filter,
  );

  // A breadcrumb links here with ?family=<id>.
  React.useEffect(() => {
    const family = new URLSearchParams(window.location.search).get("family");

    if (OPTIONS.some((option) => option.id === family))
      setFilter(family as Filter);
  }, []);

  return (
    <section
      aria-labelledby="product-demos-title"
      className="pdh"
      data-testid="product-demos"
      id="product-demos"
    >
      <p className="pdh-eyebrow">Product demos</p>
      <h2 id="product-demos-title">One product at a time.</h2>
      <p className="pdh-lead">
        Live demos run a real session on the Didit sandbox. Samples show a real
        decision without sending anything.
      </p>
      <div aria-label="Filter by family" className="pdh-seg" role="group">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            aria-pressed={filter === option.id}
            type="button"
            onClick={() => setFilter(option.id)}
          >
            {option.label}
            <em>{COUNTS[option.id]}</em>
          </button>
        ))}
      </div>
      <ul className="pdh-grid">
        {shown.map((demo) => (
          <li key={demo.id}>
            <Link className="pdh-card" href={productDemoRoute(demo)}>
              <span className="pdh-tile">
                <Glyph demo={demo} />
              </span>
              <span className="pdh-x">
                <b>{demo.title}</b>
                <span className="pdh-blurb">{demo.blurb}</span>
                <span className="pdh-foot">
                  <span
                    className={`pd-status is-${AVAILABILITY_LABEL[availability(demo)].kind}`}
                  >
                    {AVAILABILITY_LABEL[availability(demo)].card}
                  </span>
                  {availability(demo) === "live" && demo.mode === "live" ? (
                    <span className="pdh-time">{demo.time.short}</span>
                  ) : null}
                  <span className="pdh-go">
                    {availability(demo) === "live" ? "Try it" : "See it"}
                    <ArrowRight aria-hidden size={15} />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
