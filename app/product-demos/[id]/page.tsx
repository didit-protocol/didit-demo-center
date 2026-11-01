import { Metadata } from "next";
import { notFound } from "next/navigation";

import "@/styles/demos/live.css";
import "@/styles/demos/product-demos.css";

import { LiveDemo } from "@/components/product-demos/live-demo";
import { TopBar } from "@/components/product-demos/parts";
import { SampleDemo } from "@/components/product-demos/sample-demo";
import { PRODUCT_DEMOS, getProductDemo } from "@/lib/product-demos/demos";

/**
 * One page template for every product demo: a live demo runs a real session
 * on the demo application, a sample shows a fixture decision and sends
 * nothing. The config is in lib/product-demos/demos.ts.
 */

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PRODUCT_DEMOS.map((demo) => ({ id: demo.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const demo = getProductDemo((await params).id);

  if (!demo) return {};

  return {
    title: `${demo.title}: product demo`,
    description: demo.blurb,
    alternates: { canonical: `/product-demos/${demo.id}` },
  };
}

export default async function ProductDemoPage({ params }: Props) {
  const demo = getProductDemo((await params).id);

  if (!demo) notFound();

  return (
    <div className="pd">
      <TopBar />
      <main className="pd-main">
        {demo.mode === "live" ? (
          <LiveDemo demo={demo} />
        ) : (
          <SampleDemo demo={demo} />
        )}
      </main>
    </div>
  );
}
