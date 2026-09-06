"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@website/components/ui/container";

import { ApiPlaygroundModal } from "./api-playground-modal";
import { CaptchaModal } from "./captcha-modal";
import { ComposeSection } from "./compose-section";
import { DemoDetailModal } from "./demo-detail-modal";
import { DemoGrid } from "./demo-grid";
import { FilterBar } from "./filter-bar";
import { Hero } from "./hero";
import { ResultsModal, type ResultsState } from "./results-modal";

import { useVerification } from "@/app/hooks/useVerification";
import {
  type Demo,
  type DemoCategory,
  countByCategory,
  filterDemos,
  getDemo,
} from "@/lib/demos";

type SdkModule = typeof import("@didit-protocol/sdk-web").DiditSdk;

/**
 * The demo centre.
 *
 * Everything below the chrome lives in one client component because the whole
 * page is one interaction: pick a demo, read it, run it, read the decision, run
 * another. Splitting it would only move the state up a level.
 *
 * The one thing the redesign deliberately did NOT change is how a hosted demo
 * starts. "Start demo" still calls /api/verification (the server route that
 * holds the API key), gets a real session back, and opens the real hosted flow
 * in the Didit web SDK modal. The SDK's onComplete then opens the results
 * modal in place - which is why the callback no longer navigates away.
 */
export function Catalogue() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createSession } = useVerification();
  const sdkRef = React.useRef<SdkModule | null>(null);

  const [category, setCategory] = React.useState<DemoCategory | "All">("All");
  const [query, setQuery] = React.useState("");
  const [openDemo, setOpenDemo] = React.useState<Demo | null>(null);
  const [playgroundDemo, setPlaygroundDemo] = React.useState<Demo | null>(null);
  const [captchaOpen, setCaptchaOpen] = React.useState(false);
  const [results, setResults] = React.useState<ResultsState | null>(null);
  const [starting, setStarting] = React.useState(false);
  const [startError, setStartError] = React.useState<string | null>(null);

  const demos = React.useMemo(
    () => filterDemos(category, query),
    [category, query],
  );
  const counts = React.useMemo(() => countByCategory(), []);

  // Two things arrive in the query string, and they are handled here so both
  // deep links and the hosted flow land on the right surface:
  //
  //  - `verificationSessionId` - the hosted flow finished on another device and
  //    /verification/callback forwarded the session here. Open the results
  //    modal and fetch that decision.
  //  - `demo` on its own - someone followed a deep link (didit.me/demos links
  //    every module row at `?demo=<id>`). Open that demo's detail modal.
  //
  // Either way the query string is dropped afterwards, so a refresh does not
  // silently reopen the same modal.
  React.useEffect(() => {
    const sessionId = searchParams.get("verificationSessionId");
    const demoId = searchParams.get("demo");

    if (sessionId) {
      setResults({
        sessionId,
        status: searchParams.get("status") ?? "In Review",
        demo: getDemo(demoId),
      });
      router.replace("/", { scroll: false });

      return;
    }

    const deepLinked = getDemo(demoId);

    if (deepLinked) {
      setOpenDemo(deepLinked);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  React.useEffect(() => {
    let disposed = false;

    const initSdk = async () => {
      const { DiditSdk } = await import("@didit-protocol/sdk-web");

      if (disposed) return;
      sdkRef.current = DiditSdk;

      DiditSdk.shared.onComplete = (result) => {
        switch (result.type) {
          case "completed": {
            const session = result.session;

            if (session) {
              setOpenDemo(null);
              setResults((current) => ({
                sessionId: session.sessionId,
                status: session.status,
                demo: current?.demo ?? null,
              }));
            }
            break;
          }
          case "cancelled":
            // The user closed the flow. Nothing to report; the catalogue is
            // still open behind the SDK modal.
            break;
          case "failed":
            setStartError(
              result.error?.message ?? "The verification flow could not start.",
            );
            break;
        }
      };
    };

    initSdk();

    return () => {
      disposed = true;
      if (sdkRef.current) sdkRef.current.shared.onComplete = undefined;
    };
  }, []);

  const handleStart = React.useCallback(
    async (demo: Demo, portraitImage?: string) => {
      setStartError(null);

      if (demo.mode === "api") {
        setPlaygroundDemo(demo);

        return;
      }

      if (demo.id === "captcha") {
        setOpenDemo(null);
        setCaptchaOpen(true);

        return;
      }

      if (!demo.workflowId) {
        setStartError(
          "This workflow is not published on this environment yet - create it in the console and drop its id into lib/demos.ts.",
        );

        return;
      }

      if (!sdkRef.current) {
        setStartError("The verification SDK is still loading - try again.");

        return;
      }

      setStarting(true);
      try {
        const session = await createSession(
          demo.workflowId,
          `demo-${demo.id}-${Date.now()}`,
          `${window.location.origin}/verification/callback?demo=${demo.id}`,
          portraitImage,
        );

        if (!session?.url) {
          setStartError(
            session?.error ??
              "The session could not be created. Check the workflow id and the application's balance.",
          );

          return;
        }

        // Remember which demo produced this session so the results modal can
        // name it, then hand over to the real hosted flow.
        setResults({ sessionId: session.session_id ?? "", status: "", demo });
        setOpenDemo(null);
        sdkRef.current.shared.startVerification({
          url: session.url,
          configuration: {
            showCloseButton: false,
            showExitConfirmation: false,
            closeModalOnComplete: true,
          },
        });
      } catch (error) {
        setStartError(
          error instanceof Error
            ? error.message
            : "The session could not be created.",
        );
      } finally {
        setStarting(false);
      }
    },
    [createSession],
  );

  const resultsOpen = Boolean(results?.status);

  return (
    <>
      <Hero onStartFirst={() => setOpenDemo(getDemo("core-kyc"))} />

      <FilterBar
        category={category}
        counts={counts}
        query={query}
        onCategoryChange={setCategory}
        onQueryChange={setQuery}
      />

      <Container className="pb-16 pt-8" size="xl">
        <DemoGrid demos={demos} query={query} onOpen={setOpenDemo} />
      </Container>

      <ComposeSection />

      <DemoDetailModal
        demo={openDemo}
        isStarting={starting}
        startError={startError}
        onClose={() => {
          setOpenDemo(null);
          setStartError(null);
        }}
        onStart={handleStart}
      />

      <ApiPlaygroundModal
        demo={playgroundDemo}
        open={Boolean(playgroundDemo)}
        onClose={() => setPlaygroundDemo(null)}
        onOpenSample={() => {
          setOpenDemo(playgroundDemo);
          setPlaygroundDemo(null);
        }}
      />

      <CaptchaModal
        open={captchaOpen}
        onClose={() => setCaptchaOpen(false)}
        onVerified={(sessionId) => {
          setCaptchaOpen(false);
          setResults({
            sessionId,
            status: "Approved",
            demo: getDemo("captcha"),
          });
        }}
      />

      <ResultsModal
        open={resultsOpen}
        state={results}
        onClose={() => setResults(null)}
        onRunAnother={() => {
          setResults(null);
          setOpenDemo(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </>
  );
}
