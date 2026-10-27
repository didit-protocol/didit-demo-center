import type { LiveDemo } from "@/lib/product-demos/define";

import { Clock, Globe, Lock, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Glyph } from "./parts";

import { diditUrls } from "@/lib/didit/config";

/*
 * The first screen of the redesigned verification modal this demo opens,
 * drawn from its config. A preview: the real modal is Didit's web SDK, and
 * "Continue on this computer" starts the demo like "Start the demo" does.
 */
export function VerificationPreview({
  demo,
  disabled,
  onStart,
}: {
  demo: LiveDemo;
  disabled: boolean;
  onStart(): void;
}) {
  const host = diditUrls.verify.replace(/^https:\/\//, "");

  return (
    <figure aria-label="The verification this demo opens" className="pd-stage">
      <div className="pd-vm">
        <div className="pd-vm-top">
          <span className="pd-vm-app">
            <i aria-hidden>D</i>
            Didit demos
          </span>
          <span aria-hidden className="pd-vm-lang">
            <Globe size={12} /> EN
          </span>
          <span aria-hidden className="pd-vm-x">
            <X size={13} />
          </span>
        </div>
        <div className="pd-vm-body">
          <div className="pd-vm-l">
            <b className="pd-vm-title">{demo.preview.title}</b>
            <p>{demo.preview.body}</p>
            <span className="pd-vm-chips">
              <span>
                <Clock aria-hidden size={11} /> {demo.preview.duration}
              </span>
              <span>
                {demo.preview.items.length}{" "}
                {demo.preview.items.length === 1 ? "step" : "steps"}
              </span>
            </span>
            <ul>
              {demo.preview.items.map((item) => (
                <li key={item.title}>
                  <span className="pd-vm-ic">
                    <Glyph demo={{ ...demo, glyph: "data" }} size={14} />
                  </span>
                  <span>
                    <b>{item.title}</b>
                    <small>{item.detail}</small>
                  </span>
                </li>
              ))}
            </ul>
            <div className="pd-vm-foot">
              <button disabled={disabled} type="button" onClick={onStart}>
                Continue on this computer
              </button>
              <small>
                By continuing you accept the End User Terms. Didit demos uses
                facial recognition to check it is you.
              </small>
            </div>
          </div>
          <div aria-hidden className="pd-vm-r">
            <span className="pd-vm-qr">
              <QRCodeSVG
                level="M"
                size={132}
                value={`${diditUrls.site}/product-demos/${demo.id}`}
              />
            </span>
            <small>
              <Lock size={10} /> {host}
            </small>
          </div>
        </div>
      </div>
    </figure>
  );
}
