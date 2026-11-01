"use client";

import * as React from "react";
import { preconnect } from "react-dom";

import { warmVerification } from "./browser";
import { diditUrls } from "./config";

/**
 * On a page that can open a hosted flow: connects to the flow's origin from
 * the server-rendered HTML (DNS, TCP and TLS are done before Start), and
 * downloads the web SDK once the page is idle.
 */
export function WarmFlow() {
  preconnect(diditUrls.verify);
  React.useEffect(() => warmVerification(), []);

  return null;
}
