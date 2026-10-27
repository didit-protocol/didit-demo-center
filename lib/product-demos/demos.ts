/**
 * The 18 product demos of demos.didit.me, in the order of the hub's grid:
 * 10 live (a real session on the demo application) and 8 samples (a fixture
 * decision; nothing is sent), the same split as the website's /demos.
 *
 * Live demos keep the workflows they always ran. The ones an industry demo
 * also uses come from that demo's config, so there is one id per workflow.
 *
 * No `@/` imports: `npm test` loads it straight from Node.
 */

import { ACCS_ESTIMATION_WORKFLOW_ID, ACCS_VERIFICATION_WORKFLOW_ID } from "../accs-workflows";
import { pick } from "../didit/config";
import { alder, auroraPlay, kestrel } from "../didit/demos";

import { type ProductDemo, defineProductDemo } from "./define";

const SANDBOX = "sandbox";

export const coreKyc = defineProductDemo({
  id: "core-kyc",
  legacyId: "core-kyc",
  family: "identity",
  area: "Onboarding",
  mode: "live",
  title: "Core KYC",
  blurb: "ID, passive liveness and face match, decided in seconds.",
  lede: "Scan an ID, take a selfie and get a decision: the document is read and checked, the selfie is a live person and the face matches the ID portrait.",
  icon: "id-scan",
  glyph: "identity",
  workflow: auroraPlay.workflows.kyc,
  time: { short: "1 min", long: "About a minute" },
  check: "Core KYC",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Scan your ID and take a selfie", body: "On this computer, or scan the code with your phone." },
    { title: "See the decision", body: "The document, the checks and the console view." },
  ],
  tags: ["ID verification", "Passive liveness", "Face match 1:1", "IP analysis"],
  preview: {
    title: "Verify your identity",
    body: "Scan an ID document, then take a selfie so we can check it is you.",
    duration: "About 2 minutes",
    items: [
      { title: "Your ID document", detail: "Passport, ID card or driving licence" },
      { title: "One selfie", detail: "Passive: no gestures, no head turns" },
    ],
  },
  docsPath: "core-technology/id-verification/overview",
});

export const kycAndAml = defineProductDemo({
  id: "kyc-and-aml",
  legacyId: "kyc-aml",
  family: "identity",
  area: "Onboarding",
  mode: "live",
  title: "KYC and AML",
  blurb: "Core KYC plus sanctions, PEP and adverse media.",
  lede: "Core KYC, then the person on the ID is screened against sanctions, PEP and adverse media in the background, with no extra step for them.",
  icon: "aml-screening",
  glyph: "txn",
  // The KYC and AML onboarding workflow the Alder demo runs.
  workflow: alder.workflows.onboarding,
  time: { short: "2 min", long: "About 2 minutes" },
  check: "KYC and AML",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Scan your ID and take a selfie", body: "AML screening runs on the name from the document." },
    { title: "See the decision", body: "The checks, the screening and the console view." },
  ],
  tags: ["ID verification", "Liveness", "Face match 1:1", "AML screening"],
  preview: {
    title: "Verify your identity",
    body: "Scan an ID document, then take a selfie so we can check it is you.",
    duration: "About 2 minutes",
    items: [
      { title: "Your ID document", detail: "Passport, ID card or driving licence" },
      { title: "One selfie", detail: "We check it is you and that you are present" },
    ],
  },
  docsPath: "core-technology/aml-screening/overview",
});

export const liveness = defineProductDemo({
  id: "liveness",
  legacyId: "liveness",
  family: "identity",
  area: "Biometrics",
  mode: "live",
  title: "Liveness",
  blurb: "A selfie and nothing else, for resets and step-ups.",
  lede: "A selfie and nothing else: passive liveness tells a real, present person from a photo, a screen, a mask or an injected video, in about two seconds.",
  icon: "liveness",
  glyph: "data",
  workflow: pick("b5d5523f-bd45-4aa3-9ec5-0490172a22c1", "8aa86809-5156-4a73-8b09-cb3d6f882d27"),
  time: { short: "30 s", long: "About 30 seconds" },
  check: "Liveness",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Take a selfie", body: "On this computer, or scan the code with your phone." },
    { title: "See the decision", body: "The score, the checks and the console view." },
  ],
  tags: ["Passive liveness", "IP analysis"],
  preview: {
    title: "Take a selfie",
    body: "Look at the camera for a moment. We check it is a real, live person.",
    duration: "About 2 minutes",
    items: [{ title: "One selfie", detail: "Passive: no gestures, no head turns" }],
  },
  docsPath: "core-technology/liveness/overview",
});

export const adaptiveAge = defineProductDemo({
  id: "adaptive-age-check",
  legacyId: "age",
  family: "identity",
  area: "Age assurance",
  mode: "live",
  title: "Adaptive age check",
  blurb: "A selfie first; an ID only inside the buffer zone.",
  lede: "A selfie estimates the age. Clearly over the line passes at once, clearly under is declined, and only the buffer zone in between is asked for an ID.",
  icon: "age-estimation-18",
  glyph: "identity",
  workflow: auroraPlay.workflows.age,
  time: { short: "1 min", long: "About a minute" },
  check: "Age check",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Take a selfie", body: "An ID scan follows only if the estimate is close to the line." },
    { title: "See the decision", body: "The estimate, the branch it took and the console view." },
  ],
  tags: ["Age estimation", "ID verification", "IP analysis"],
  preview: {
    title: "Confirm your age",
    body: "Take a selfie and we estimate your age. We only ask for an ID if we need to.",
    duration: "About a minute",
    items: [
      { title: "One selfie", detail: "Your age is estimated, not stored as a birthday" },
      { title: "An ID, only if needed", detail: "When the estimate is close to the limit" },
    ],
  },
  docsPath: "core-technology/age-estimation/overview",
});

export const ageEstimation = defineProductDemo({
  id: "age-estimation",
  legacyId: "accs-estimation",
  family: "identity",
  area: "Age assurance",
  mode: "live",
  title: "Age estimation, ISO 27566",
  blurb: "An age band from a selfie. No document, no identity.",
  lede: "Facial age estimation to ISO/IEC 27566: a selfie gives an age band with passive liveness, and no document or identity is collected.",
  icon: "age-estimation-18",
  glyph: "identity",
  workflow: ACCS_ESTIMATION_WORKFLOW_ID,
  time: { short: "30 s", long: "About 30 seconds" },
  check: "Age estimation",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Take a selfie", body: "On this computer, or scan the code with your phone." },
    { title: "See the decision", body: "The age band, liveness and the console view." },
  ],
  tags: ["Age estimation", "Passive liveness"],
  preview: {
    title: "Confirm your age",
    body: "Take a selfie. We estimate your age band and keep nothing else.",
    duration: "About a minute",
    items: [{ title: "One selfie", detail: "No document, no name" }],
  },
  docsPath: "core-technology/age-estimation/overview",
});

export const ageVerification = defineProductDemo({
  id: "age-verification",
  legacyId: "accs-verification",
  family: "identity",
  area: "Age assurance",
  mode: "live",
  title: "Age verification, ISO 27566",
  blurb: "Age proven by a trusted source, shared as yes or no.",
  lede: "Age verification to ISO/IEC 27566: the age comes from an ID document, matched to a live selfie, and your service only learns whether the person is over the limit.",
  icon: "id-scan",
  glyph: "data",
  workflow: ACCS_VERIFICATION_WORKFLOW_ID,
  time: { short: "1 min", long: "About a minute" },
  check: "Age verification",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Scan your ID and take a selfie", body: "On this computer, or scan the code with your phone." },
    { title: "See the decision", body: "Over the limit or not, and the console view." },
  ],
  tags: ["ID verification", "Passive liveness", "Face match 1:1"],
  preview: {
    title: "Prove your age",
    body: "Scan an ID and take a selfie. Only the answer to the age question is shared.",
    duration: "About 2 minutes",
    items: [
      { title: "Your ID document", detail: "The date of birth proves the age" },
      { title: "One selfie", detail: "Matched to the ID portrait" },
    ],
  },
  docsPath: "core-technology/age-estimation/overview",
});

export const proofOfAddress = defineProductDemo({
  id: "proof-of-address",
  legacyId: "poa",
  family: "identity",
  area: "Documents",
  mode: "live",
  title: "Proof of address",
  blurb: "A bill or statement, parsed and tamper-checked.",
  lede: "Upload a utility bill or bank statement: the address, the issuer and the date are read from it, and the document is checked for edits.",
  icon: "proof-of-address",
  glyph: "identity",
  workflow: pick("94f9c776-4362-488e-93ff-9dd2921af3f2", "016aa374-1672-4f57-a227-3fa750a6977c"),
  time: { short: "1 min", long: "About a minute" },
  check: "Proof of address",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Upload a document", body: "A recent bill or statement, as a photo or a PDF." },
    { title: "See the decision", body: "The parsed address, the checks and the console view." },
  ],
  tags: ["Proof of address", "IP analysis"],
  preview: {
    title: "Confirm your address",
    body: "Upload a recent utility bill or bank statement with your name and address.",
    duration: "About a minute",
    items: [{ title: "One document", detail: "Photo or PDF, from the last three months" }],
  },
  docsPath: "core-technology/proof-of-address/overview",
});

export const questionnaires = defineProductDemo({
  id: "questionnaires",
  legacyId: "questionnaires",
  family: "identity",
  area: "Declarations",
  mode: "live",
  title: "Questionnaires",
  blurb: "Source of funds or risk questions in the same session.",
  lede: "Ask the questions your policy needs, such as source of funds or a PEP declaration, inside the same session; the answers come back with the decision.",
  icon: "questionnaires",
  glyph: "identity",
  // Not published on the demo application yet; the page says so.
  workflow: null,
  time: { short: "2 min", long: "About 2 minutes" },
  check: "Questionnaire",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Answer the questions", body: "They branch on your earlier answers." },
    { title: "See the decision", body: "Your answers with the decision, and the console view." },
  ],
  tags: ["Questionnaires", "ID verification"],
  preview: {
    title: "A few questions",
    body: "Tell us where your funds come from and whether you hold a public role.",
    duration: "About 2 minutes",
    items: [{ title: "Short questionnaire", detail: "Single choice and free text" }],
  },
  docsPath: "core-technology/questionnaires/overview",
});

export const faceSearch = defineProductDemo({
  id: "face-search",
  legacyId: "face-search",
  family: "identity",
  area: "Biometrics",
  mode: "sample",
  title: "Face search 1:N",
  blurb: "A new face against everyone you onboarded.",
  lede: "Search a new selfie against every face your application has approved or blocked, to catch duplicate accounts and returning banned users. This sample shows a decision without sending anything.",
  icon: "face-search",
  glyph: "data",
  industry: null,
  steps: [
    { title: "Read the request", body: "A selfie searched against your blocklist first." },
    { title: "See the matches", body: "The closest face is on the blocklist." },
    { title: "Build it", body: "One call, with the selfie as a file." },
  ],
  tags: ["Face search 1:N", "Blocklist"],
  fixture: {
    ref: "FS-30417",
    headline: "Match on the blocklist",
    verdict: "declined",
    score: { label: "Top similarity", value: "97.8 / 100" },
    rules: [
      { state: "declined", title: "Blocklisted face", detail: "similarity 97.8" },
      { state: "passed", title: "Approved users", detail: "no other account" },
      { state: "passed", title: "Liveness of the selfie", detail: "passive, passed" },
    ],
    request: {
      method: "POST",
      path: "/v3/face-search/",
      body: "user_image=@selfie.jpg  search_type=blocklisted_or_approved  vendor_data=user-8821",
    },
    response: '{ "status": "Declined", "total_matches": 1, "matches": [{ "similarity_percentage": 97.8, "is_blocklisted": true }] }',
  },
  docsPath: "core-technology/face-search/overview",
});

export const ipAndDevice = defineProductDemo({
  id: "ip-and-device",
  legacyId: "ip",
  family: "identity",
  area: "Signals",
  mode: "sample",
  title: "IP and device",
  blurb: "VPN, data centre and distance signals on every check.",
  lede: "Every session reads the network and the device: VPN or Tor, data centre ranges, and how far the IP is from the document's country. This sample shows a decision without sending anything; the Aurora Play demo runs signals live.",
  icon: "ip-analysis",
  glyph: "data",
  industry: {
    name: "Aurora Play",
    route: "/igaming",
    note: "The Aurora Play casino demo reads the device live.",
  },
  steps: [
    { title: "Read the request", body: "The decision of a finished session." },
    { title: "See the signals", body: "A data centre range far from the document's country." },
    { title: "Run it live", body: "The Aurora Play casino demo reads the device live." },
  ],
  tags: ["IP analysis", "Device signals"],
  fixture: {
    ref: "S-58210",
    headline: "Two signals raised",
    verdict: "review",
    rules: [
      { state: "hit", title: "Data centre IP", detail: "hosting range" },
      { state: "hit", title: "Distance from the document", detail: "outside the issuing country" },
      { state: "passed", title: "VPN or Tor", detail: "not detected" },
      { state: "passed", title: "Device", detail: "first seen today" },
    ],
    request: { method: "GET", path: "/v3/session/{session_id}/decision/" },
    response: '{ "status": "In Review", "ip_analyses": [{ "is_data_center": true, "is_vpn_or_tor": false, "ip_country_code": "DE" }] }',
  },
  docsPath: "core-technology/ip-analysis/overview",
});

export const biometricAuth = defineProductDemo({
  id: "biometric-authentication",
  legacyId: "face-auth",
  family: "authentication",
  area: "Re-authentication",
  mode: "live",
  title: "Biometric authentication",
  blurb: "A fresh selfie against the verified portrait.",
  lede: "Confirm it is still the same person: a fresh selfie with liveness, matched against the portrait you verified before. Choose a photo of yourself to stand in for that portrait.",
  icon: "biometric-authentication",
  glyph: "auth",
  // The selfie step-up the Kestrel demo runs.
  workflow: kestrel.workflows.stepUp,
  requiresPortrait: true,
  time: { short: "30 s", long: "About 30 seconds" },
  check: "Face match",
  steps: [
    { title: "Choose a reference photo", body: "It stands in for the portrait you verified before." },
    { title: "Take a selfie", body: "Liveness first, then the match to that photo." },
    { title: "See the decision", body: "The match score and the console view." },
  ],
  tags: ["Passive liveness", "Face match 1:1"],
  preview: {
    title: "Confirm it is you",
    body: "Take a selfie. We match it to the photo on your account.",
    duration: "About 30 seconds",
    items: [{ title: "One selfie", detail: "Matched to your verified portrait" }],
  },
  docsPath: "core-technology/biometric-auth/overview",
});

export const multiFactor = defineProductDemo({
  id: "multi-factor",
  legacyId: "mfa",
  family: "authentication",
  area: "Re-authentication",
  mode: "live",
  title: "Multi-factor",
  blurb: "A live face bound to a phone the user controls.",
  lede: "Two factors in one session: a live selfie, then a code sent to a phone number the person controls.",
  icon: "phone-verification",
  glyph: "auth",
  workflow: pick("dbdb51a9-3763-4dcf-a32d-8fe5f40a699d", "e4cecdd1-fb1d-4992-8fba-4175aaa2ba76"),
  time: { short: "1 min", long: "About a minute" },
  check: "Multi-factor",
  steps: [
    { title: "Start the demo", body: "We create a real session on the Didit sandbox." },
    { title: "Take a selfie, then enter a code", body: "The code goes to the phone number you give." },
    { title: "See the decision", body: "Both factors and the console view." },
  ],
  tags: ["Passive liveness", "Phone verification"],
  preview: {
    title: "Confirm it is you",
    body: "Take a selfie, then enter the code we send to your phone.",
    duration: "About a minute",
    items: [
      { title: "One selfie", detail: "Passive: no gestures, no head turns" },
      { title: "Your phone", detail: "A one-time code by text message" },
    ],
  },
  docsPath: "core-technology/phone-verification/overview",
});

export const captcha = defineProductDemo({
  id: "didit-captcha",
  legacyId: "captcha",
  family: "authentication",
  area: "Bot protection",
  mode: "sample",
  title: "Didit CAPTCHA",
  blurb: "One face check instead of a grid of traffic lights.",
  lede: "A bot wall people do not mind: one passive face check instead of a puzzle, verified by your server before the form is accepted. This sample shows a decision without sending anything.",
  icon: "liveness",
  glyph: "auth",
  industry: {
    name: "Aurora Play",
    route: "/igaming",
    note: "The Aurora Play sign-up has bot protection on the form.",
  },
  steps: [
    { title: "Read the request", body: "Your server checks the token from the widget." },
    { title: "See the checks", body: "A live person on a known browser." },
    { title: "Run it live", body: "The Aurora Play sign-up has bot protection on the form." },
  ],
  tags: ["Passive liveness", "Bot protection"],
  fixture: {
    ref: "CP-11920",
    headline: "Human",
    verdict: "approved",
    rules: [
      { state: "passed", title: "Liveness", detail: "passive, passed" },
      { state: "passed", title: "Automation", detail: "no headless browser" },
      { state: "passed", title: "Token", detail: "single use, not expired" },
    ],
    request: { method: "POST", path: "/api/didit-captcha/verify", body: '{ "token": "<from the widget>" }' },
    response: '{ "success": true, "status": "Approved", "liveness": { "status": "Approved", "method": "PASSIVE" } }',
  },
  docsPath: "core-technology/liveness/overview",
});

export const businessVerification = defineProductDemo({
  id: "business-verification",
  legacyId: "kyb",
  family: "business",
  area: "KYB",
  mode: "sample",
  title: "Business verification",
  blurb: "The company from the registry, documents and a score.",
  lede: "The company is read from its registry, its documents are checked and it gets a risk score, in one session. This sample shows a decision without sending anything; the Northmarket demo runs it live.",
  icon: "kyb",
  glyph: "business",
  industry: {
    name: "Northmarket",
    route: "/marketplace",
    note: "The Northmarket marketplace demo verifies sellers live.",
  },
  steps: [
    { title: "Read the request", body: "A company by name, country and number." },
    { title: "See the checks", body: "The registry, the documents and the score." },
    { title: "Run it live", body: "The Northmarket marketplace demo verifies sellers live." },
  ],
  tags: ["Business verification", "Documents", "AML screening"],
  fixture: {
    ref: "B-20931",
    headline: "Northwind Trading B.V.",
    verdict: "approved",
    score: { label: "Risk", value: "Low" },
    rules: [
      { state: "passed", title: "Registry", detail: "active, name and number match" },
      { state: "passed", title: "Company documents", detail: "certificate of incorporation" },
      { state: "passed", title: "Sanctions screening", detail: "no matches" },
    ],
    request: {
      method: "POST",
      path: "/v3/session/",
      body: '{ "workflow_id": "<your KYB workflow>", "vendor_data": "northwind", "expected_details": { "company_name": "Northwind Trading B.V.", "registry_country": "NL" } }',
    },
    response: '{ "session_kind": "business", "status": "Approved", "registry": { "status": "Active" } }',
  },
  docsPath: "business-verification/overview",
});

export const keyPeople = defineProductDemo({
  id: "key-people-and-ubos",
  legacyId: "ubo",
  family: "business",
  area: "KYB",
  mode: "sample",
  title: "Key people and UBOs",
  blurb: "The ownership chain to the people, then KYC on each.",
  lede: "Follow the ownership chain to the people who own and run the company, then verify each of them. This sample shows a decision without sending anything; the Northmarket demo runs it live.",
  icon: "key-people",
  glyph: "business",
  industry: {
    name: "Northmarket",
    route: "/marketplace",
    note: "The Northmarket marketplace demo verifies a seller and its owners live.",
  },
  steps: [
    { title: "Read the request", body: "The decision of a business session." },
    { title: "See the people", body: "Two owners found; one still has to verify." },
    { title: "Run it live", body: "The Northmarket marketplace demo verifies a seller and its owners." },
  ],
  tags: ["Key people", "ID verification", "AML screening"],
  fixture: {
    ref: "B-20931",
    headline: "2 owners, 1 director",
    verdict: "review",
    rules: [
      { state: "passed", title: "Owner, 60%", detail: "KYC approved" },
      { state: "hit", title: "Owner, 40%", detail: "KYC link sent, not finished" },
      { state: "passed", title: "Director", detail: "KYC approved" },
    ],
    request: { method: "GET", path: "/v3/session/{session_id}/decision/" },
    response: '{ "session_kind": "business", "status": "In Review", "key_people": [{ "role": "UBO", "ownership": 60, "kyc_status": "Approved" }, { "role": "UBO", "ownership": 40, "kyc_status": "Not Started" }] }',
  },
  docsPath: "business-verification/key-people",
});

export const transactionMonitoring = defineProductDemo({
  id: "transaction-monitoring",
  legacyId: "txn",
  family: "transactions",
  area: "Monitoring",
  mode: "sample",
  title: "Transaction monitoring",
  blurb: "Your rules on every payment, a case past the line.",
  lede: "Rules and risk scores on every payment, deposit, withdrawal and payout. This sample shows a real decision without sending anything; the Alder demo runs it live.",
  icon: "transactions",
  glyph: "txn",
  industry: {
    name: "Alder",
    route: "/fintech",
    note: "The Alder fintech demo sends real transactions.",
  },
  steps: [
    { title: "Read the request", body: "A 5,000 EUR transfer to a new payee." },
    { title: "See what the rules did", body: "One rule held it; the others passed." },
    { title: "Run it live", body: "The Alder fintech demo sends real transactions." },
  ],
  tags: ["Transaction monitoring", "AML screening", "Device signals"],
  fixture: {
    ref: "TX-81204",
    headline: "5,000.00 EUR",
    verdict: "review",
    score: { label: "Risk score", value: "38 / 100" },
    rules: [
      { state: "passed", title: "Velocity", detail: "3 payments in 24 hours" },
      { state: "hit", title: "New payee, 5,000 EUR or more", detail: "action: hold for review" },
      { state: "passed", title: "Sanctions screening of the payee", detail: "no matches" },
      { state: "passed", title: "Device and network", detail: "known device, residential" },
    ],
    request: {
      method: "POST",
      path: "/v3/transactions/",
      body: '{ "type": "outgoing_transfer", "amount": 5000, "currency": "EUR", "counterparty": { "name": "Jonas Koch" } }',
    },
    response: '{ "status": "IN_REVIEW", "risk_score": 38, "rules_hit": ["new_payee_over_5000"] }',
  },
  docsPath: "transaction-monitoring/overview",
});

export const walletScreening = defineProductDemo({
  id: "wallet-screening",
  legacyId: "wallet",
  family: "transactions",
  area: "Crypto",
  mode: "sample",
  title: "Wallet screening",
  blurb: "Direct and indirect exposure of an address, by hop.",
  lede: "Screen a wallet before you accept its funds: direct and indirect exposure to risky sources, hop by hop. This sample shows a decision without sending anything; the Kestrel demo runs it live.",
  icon: "wallet-screening",
  glyph: "txn",
  industry: {
    name: "Kestrel",
    route: "/crypto-exchange",
    note: "The Kestrel crypto exchange demo screens every deposit live.",
  },
  steps: [
    { title: "Read the request", body: "An incoming deposit's sending address." },
    { title: "See the exposure", body: "Indirect exposure two hops away held it." },
    { title: "Run it live", body: "The Kestrel crypto exchange demo screens every deposit." },
  ],
  tags: ["Wallet screening", "Transaction monitoring"],
  fixture: {
    ref: "TX-77310",
    headline: "0.25 BTC in",
    verdict: "review",
    score: { label: "Risk score", value: "64 / 100" },
    rules: [
      { state: "passed", title: "Direct sanctions exposure", detail: "none" },
      { state: "hit", title: "Indirect mixer exposure", detail: "2 hops away" },
      { state: "passed", title: "Address age", detail: "active for over a year" },
    ],
    request: {
      method: "POST",
      path: "/v3/wallet-screening/",
      body: '{ "wallet_address": "bc1q…7f4d29", "blockchain": "BTC", "direction": "inbound" }',
    },
    response: '{ "status": "IN_REVIEW", "risk_score": 64, "exposure": { "indirect": [{ "category": "mixer", "hops": 2 }] } }',
  },
  docsPath: "transaction-monitoring/wallet-screening",
});

export const amlScreening = defineProductDemo({
  id: "aml-screening",
  legacyId: "aml",
  family: "transactions",
  area: "AML",
  mode: "sample",
  title: "AML screening",
  blurb: "A name you hold against sanctions, PEP and media.",
  lede: "Screen a name you already hold against sanctions, PEP and adverse media, without a verification session. This sample shows a decision without sending anything; the Kestrel demo runs screening live.",
  icon: "aml-screening",
  glyph: "txn",
  industry: {
    name: "Kestrel",
    route: "/crypto-exchange",
    note: "The Kestrel crypto exchange demo screens every new customer live.",
  },
  steps: [
    { title: "Read the request", body: "A name, a date of birth and a nationality." },
    { title: "See the hits", body: "Two possible matches to review." },
    { title: "Run it live", body: "The Kestrel crypto exchange demo screens every new customer." },
  ],
  tags: ["AML screening", "Ongoing monitoring"],
  fixture: {
    ref: "AML-40128",
    headline: "Ivan Petrov",
    verdict: "review",
    score: { label: "Hits", value: "2" },
    rules: [
      { state: "hit", title: "Sanctions list", detail: "name and year of birth match" },
      { state: "hit", title: "Adverse media", detail: "one article to review" },
      { state: "passed", title: "PEP", detail: "no matches" },
    ],
    request: {
      method: "POST",
      path: "/v3/aml/",
      body: '{ "full_name": "Ivan Petrov", "entity_type": "person", "date_of_birth": "1979-04-12", "nationality": "RU" }',
    },
    response: '{ "status": "In Review", "total_hits": 2, "hits": [{ "match_score": 92, "datasets": ["sanctions"] }, { "datasets": ["adverse_media"] }] }',
  },
  docsPath: "standalone-apis/aml-screening",
});

/** All 18, in the hub's order. */
export const PRODUCT_DEMOS: ProductDemo[] = [
  coreKyc,
  kycAndAml,
  liveness,
  adaptiveAge,
  ageEstimation,
  ageVerification,
  proofOfAddress,
  questionnaires,
  faceSearch,
  ipAndDevice,
  biometricAuth,
  multiFactor,
  captcha,
  businessVerification,
  keyPeople,
  transactionMonitoring,
  walletScreening,
  amlScreening,
];

export function getProductDemo(id: string | null | undefined): ProductDemo | null {
  return PRODUCT_DEMOS.find((demo) => demo.id === id) ?? null;
}

/** The new route for an old catalogue id (`/?demo=<legacyId>`). */
export function routeForLegacy(legacyId: string | null | undefined): string | null {
  const demo = PRODUCT_DEMOS.find((item) => item.legacyId === legacyId);

  return demo ? `/product-demos/${demo.id}` : null;
}

/** Where every live demo's sessions say they come from. */
export const ENVIRONMENT_LABEL = SANDBOX;
