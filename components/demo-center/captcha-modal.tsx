"use client";

import * as React from "react";

import { Modal, ModalCloseButton } from "./modal";

import { DiditCaptcha } from "@/components/didit-captcha";

/**
 * The CAPTCHA demo is the one hosted flow that is not a full verification
 * session: it is a drop-in widget you mount next to a form's submit gate. So
 * "Start demo" opens the widget itself, wired to the same
 * /api/didit-captcha/* routes production uses - a real liveness session, not a
 * mock.
 */
export function CaptchaModal({
  open,
  onClose,
  onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: (sessionId: string) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setArmed(false);
    }
  }, [open]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Modal
      label="Didit CAPTCHA demo"
      open={open}
      width="max-w-[520px]"
      z="z-[90]"
      onClose={onClose}
    >
      <div className="flex items-start gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-xl font-display tracking-display text-ink">
            Didit CAPTCHA
          </h2>
          <p className="mt-1 text-[13px] leading-[18px] text-muted">
            A signup form, minus the traffic lights. Enter an email the way a
            visitor would, then pass the face check to unlock submit.
          </p>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <div className="flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow eyebrow-muted">Email</span>
          <input
            autoComplete="email"
            className="h-10 w-full rounded-sm border border-line bg-canvas px-3 text-sm text-ink outline-none transition-colors duration-fast placeholder:text-table-head focus:border-blue"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setArmed(false);
            }}
          />
        </label>

        {armed ? (
          <DiditCaptcha
            email={email.trim()}
            onVerified={(result) => onVerified(result.sessionId)}
          />
        ) : (
          <button
            className="btn-primary h-10 px-4 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!valid}
            type="button"
            onClick={() => setArmed(true)}
          >
            {valid ? "Show the CAPTCHA" : "Enter an email to continue"}
          </button>
        )}

        <p className="m-0 text-[11px] leading-4 text-table-head">
          The widget remembers a passed check for 48 hours per email, exactly as
          it does in production - use a different address to see the full flow
          again.
        </p>
      </div>
    </Modal>
  );
}
