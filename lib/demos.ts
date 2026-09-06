import { docs } from "./docs";

/**
 * The demo catalogue.
 *
 * Two kinds of demo live here and the difference drives the whole UI:
 *
 * - `hosted` demos are REAL. "Start demo" calls this app's own
 *   /api/verification route, which creates a live Didit session with the
 *   server-side API key, and opens the hosted flow in the Didit web SDK modal.
 *   The modules run and the workflow's checks are billed like any other
 *   session. This is the behaviour the demo centre has always had and it is
 *   deliberately untouched by the redesign.
 * - `api` demos are server-to-server surfaces with no hosted flow to open
 *   (KYB, UBO, transaction monitoring, wallet screening, standalone AML, face
 *   search, IP analysis). They open a playground that shows the real request
 *   shape and replays a FIXTURE response. Nothing is sent, nothing is billed.
 *
 * Every `docsPath` is a page that exists on docs.didit.me, every `request.url`
 * is the endpoint the API reference documents, and every `response` uses the
 * field names a v3 decision actually returns - the snippets a developer copies
 * out of here have to work when they paste them.
 */

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

/** Website module glyphs, synced from fe-didit-website-v4. Never edited here. */
const M = (name: string) => `/icons/modules/${name}.svg`;
/** Demo-centre-owned glyphs the website does not ship - see public/icons/demo. */
const D = (name: string) => `/icons/demo/${name}.svg`;
const FLAG = (code: string) => `/icons/demo/flags/${code}.svg`;

export const VERIFICATION_API_BASE = isStaging
  ? "https://verification.staging.didit.me"
  : "https://verification.didit.me";

const V3 = `${VERIFICATION_API_BASE}/v3`;

/** The URL the hosted flow redirects back to, used in every copyable snippet. */
export const CALLBACK_URL = isStaging
  ? "https://demos.staging.didit.me/verification/callback"
  : "https://demos.didit.me/verification/callback";

export type DemoCategory = "KYC" | "KYB" | "Monitoring" | "Fraud";
export type DemoMode = "hosted" | "api";
export type VerdictTone = "approved" | "review" | "declined";

export type DemoModule = { icon: string; label: string };
export type DemoStat = { value: string; label: string };
export type DemoStep = { title: string; body: string };

export type SampleRow = {
  key: string;
  value: string;
  tone?: VerdictTone;
  strong?: boolean;
};

export type SampleItem = {
  name: string;
  meta: string;
  tag: string;
  tone: VerdictTone | "neutral";
  score: string;
  avatar: string;
  detail: string;
  tags: string[];
};

export type SampleDecision = {
  verdict: string;
  summary: string;
  score: string;
  scoreLabel: string;
  tone: VerdictTone;
  sections: { title: string; rows: SampleRow[] }[];
  listTitle: string;
  items: SampleItem[];
};

export type TraceEntry = {
  label: string;
  detail: string;
  ms: string;
  ok: boolean;
};

export type ApiRequest = {
  method: "GET" | "POST";
  url: string;
  body: string;
  note: string;
  docsPath: string;
};

export type Demo = {
  id: string;
  category: DemoCategory;
  mode: DemoMode;
  icon: string;
  title: string;
  subtitle: string;
  blurb: string;
  longDescription: string;
  chips: string[];
  price: string;
  cta: string;
  /**
   * The workflow this demo launches. `null` for API demos, which have no hosted
   * flow. `workflowPlaceholder` means the workflow is not published on this
   * environment yet - the runner says so instead of failing on a 400 from the
   * session endpoint.
   */
  workflowId: string | null;
  workflowPlaceholder?: boolean;
  stats: DemoStat[];
  steps: DemoStep[];
  modules: DemoModule[];
  bestFor: string;
  useCases: string[];
  docsPath: string;
  /** Trimmed decision payload, field names matching the live v3 API. */
  response: string;
  request?: ApiRequest;
  sample?: SampleDecision;
  trace?: TraceEntry[];
  /** Biometric auth needs a reference portrait before the session opens. */
  requiresPortrait?: boolean;
  /**
   * Backend-only features this flow would run (AML Screening, Database
   * Validation). They execute automatically once their dependencies are met -
   * the user never sees a step for them - and they are billed from the first
   * check with no free tier. A demo that runs one spends money on every
   * completed session with nothing on screen to warn you, which is why the
   * public catalogue shows their result as a sample decision instead.
   * See docs.didit.me/console/workflows#feature-node-categories.
   */
  backendChecks?: string[];
  /** Shown under the workflow id when the environment needs explaining. */
  note?: string;
};

const pick = (production: string, staging: string) =>
  isStaging ? staging : production;

export const DEMOS: Demo[] = [
  {
    id: "core-kyc",
    category: "KYC",
    mode: "hosted",
    icon: M("id-scan"),
    title: "Core KYC",
    subtitle: "ID + liveness + face match",
    blurb:
      "The free plan. Scan a government ID, pass a passive liveness check, get a decision in under 10 seconds.",
    longDescription:
      "Our foundational onboarding flow and the core of the Free KYC plan - a fast, compliant way to verify new users with no cost for the essential checks.",
    chips: ["ID Verification", "Passive Liveness", "Face Match 1:1"],
    price: "Free · 500 checks / month, then $0.33",
    cta: "Launch session",
    workflowId: pick(
      "7c1e467d-fe91-4ade-aa72-ec022fc67971",
      "2db28cd2-7713-405f-89ad-144613b7086e",
    ),
    stats: [
      { value: "220+", label: "Countries" },
      { value: "<10s", label: "Avg decision" },
      { value: "Free", label: "Core plan" },
    ],
    steps: [
      {
        title: "Scan an ID document",
        body: "The user captures their government-issued ID. Our AI extracts and validates every field on the document.",
      },
      {
        title: "Take a quick selfie",
        body: "A passive liveness check confirms the user is real - no awkward movements, under 2 seconds.",
      },
      {
        title: "Get verified in seconds",
        body: "We match the selfie to the ID portrait and return a decision in real time.",
      },
    ],
    modules: [
      { icon: M("id-scan"), label: "ID Verification" },
      { icon: M("liveness"), label: "Passive Liveness" },
      { icon: M("face-match"), label: "Face Match 1:1" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Standard user onboarding for any industry.",
    useCases: ["Fintech", "E-commerce", "Marketplaces", "SaaS platforms"],
    docsPath: "core-technology/id-verification/overview",
    response: `{
  "session_id": "b0a1c2d3-…",
  "session_kind": "user",
  "status": "Approved",
  "features": ["ID_VERIFICATION", "LIVENESS", "FACE_MATCH", "IP_ANALYSIS"],
  "id_verifications": [
    {
      "status": "Approved",
      "document_type": "Identity Card",
      "issuing_state_name": "Spain",
      "age": 34,
      "warnings": []
    }
  ]
}`,
  },
  {
    id: "kyc-aml",
    category: "KYC",
    mode: "api",
    icon: M("aml-screening"),
    title: "KYC + AML",
    subtitle: "Enhanced compliance",
    blurb:
      "Active liveness plus real-time screening against sanctions, PEP and adverse-media datasets.",
    longDescription:
      "Built for regulated industries that need the highest assurance: robust KYC, higher-security active liveness, and real-time AML screening in one session. AML runs as a backend-only check - there is no step for it in the flow - and it is billed per screening with no free tier, so this demo shows the decision it produces rather than screening a real person every time someone opens the page. Run the Core KYC demo to see the live half.",
    chips: ["Active Liveness", "AML Screening", "Face Match 1:1"],
    price: "$0.38 KYC · AML $0.20 when you add it",
    cta: "Open sample decision",
    // Deliberately not launchable: see `backendChecks`. The workflow ids are
    // kept here so re-enabling is a one-line change if the demo organisation
    // moves to a sandbox application, where nothing is billed.
    workflowId: null,
    backendChecks: ["AML Screening"],
    stats: [
      { value: "1,000+", label: "Sanction lists" },
      { value: "99.9%", label: "Accuracy" },
      { value: "Real-time", label: "Screening" },
    ],
    steps: [
      {
        title: "Scan an ID document",
        body: "Capture and validate the document with AI-powered fraud detection.",
      },
      {
        title: "Perform a simple action",
        body: "Active liveness requires a specific movement to prove physical presence.",
      },
      {
        title: "Automated AML check",
        body: "We screen against global sanctions, PEP lists and adverse media in the background.",
      },
    ],
    modules: [
      { icon: M("id-scan"), label: "ID Verification" },
      { icon: M("liveness"), label: "Active Liveness" },
      { icon: M("aml-screening"), label: "AML Screening" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Fintech, banking and crypto exchanges.",
    useCases: [
      "Crypto exchanges",
      "Banking",
      "Cross-border payments",
      "Lending",
    ],
    docsPath: "core-technology/aml-screening/overview",
    request: {
      method: "POST",
      url: `${V3}/session/`,
      docsPath: "sessions-api/create-session",
      note: "The same session endpoint as any hosted flow - only the workflow_id changes. AML is a backend-only node inside that workflow: it runs automatically after ID Verification, with no step for the user, and is billed per screening with no free tier.",
      body: `{
  "workflow_id": "<your-kyc-aml-workflow-id>",
  "vendor_data": "550e8400-e29b-41d4-a716-446655440000",
  "callback": "https://demos.didit.me/verification/callback"
}`,
    },
    sample: {
      verdict: "In review · 2 AML hits to adjudicate",
      summary:
        "ID and liveness approved · screening raised a PEP match above the threshold",
      score: "71.4",
      scoreLabel: "Top match",
      tone: "review",
      sections: [
        {
          title: "Session · what each module returned",
          rows: [
            {
              key: "id_verification.status",
              value: "Approved · Identity Card, Spain",
              tone: "approved",
              strong: true,
            },
            { key: "liveness.status", value: "Approved · ACTIVE · 98.7" },
            { key: "face_match.status", value: "Approved · 96.2" },
            {
              key: "aml.status",
              value: "In Review · 2 hits",
              tone: "review",
              strong: true,
            },
            { key: "aml.score", value: "71.4 against a 60 threshold" },
          ],
        },
      ],
      listTitle: "AML hits",
      items: [
        {
          name: "Ivan Petrov",
          meta: "PEP · regional office · 2019-2024",
          tag: "Match",
          tone: "review",
          score: "71.4",
          avatar: FLAG("ru"),
          detail:
            "Name, date of birth and nationality align. Listed as a politically exposed person through a regional public office; no sanctions designation. The session lands In Review for an analyst rather than being declined outright.",
          tags: ["peps", "name 0.94", "dob exact", "no sanctions"],
        },
        {
          name: "Ivan Petrow",
          meta: "Adverse media · 2021 reporting",
          tag: "Weak",
          tone: "neutral",
          score: "38.2",
          avatar: FLAG("de"),
          detail:
            "Transliteration variant with no date of birth on record. Below the threshold - auto-discounted, kept for the audit trail.",
          tags: ["adverse-media", "name 0.71", "below threshold"],
        },
      ],
    },
    trace: [
      {
        label: "Session created",
        detail: "workflow resolved to 5 modules",
        ms: "110ms",
        ok: true,
      },
      {
        label: "ID Verification",
        detail: "Spanish identity card · every field extracted and validated",
        ms: "1,320ms",
        ok: true,
      },
      {
        label: "Active liveness + face match",
        detail: "liveness 98.7 · portrait match 96.2",
        ms: "2,140ms",
        ok: true,
      },
      {
        label: "AML screening · backend-only",
        detail:
          "ran automatically after ID Verification, with no step for the user - 1,043 datasets",
        ms: "780ms",
        ok: false,
      },
      {
        label: "Decision",
        detail: "In Review - top match 71.4 above the 60 threshold",
        ms: "40ms",
        ok: false,
      },
    ],
    response: `{
  "status": "In Review",
  "features": ["ID_VERIFICATION", "LIVENESS", "AML", "IP_ANALYSIS"],
  "aml_screenings": [
    {
      "status": "In Review",
      "total_hits": 2,
      "score": 71.4,
      "screened_data": { "full_name": "Ivan Petrov", "nationality": "RUS" }
    }
  ]
}`,
  },
  {
    id: "liveness",
    category: "KYC",
    mode: "hosted",
    icon: M("liveness"),
    title: "Liveness only",
    subtitle: "No document required",
    blurb:
      "Prove a real, live person is behind an action - password resets, step-up auth, high-risk transactions.",
    longDescription:
      "Confirm that a real, live person is performing a specific action without verifying identity against a document. A powerful tool against bots, deepfakes and injection attacks.",
    chips: ["Active Liveness", "Passive Liveness", "iBeta L2"],
    price: "Free · 500 checks / month, then $0.10",
    cta: "Launch session",
    workflowId: pick(
      "b5d5523f-bd45-4aa3-9ec5-0490172a22c1",
      "8aa86809-5156-4a73-8b09-cb3d6f882d27",
    ),
    stats: [
      { value: "2s", label: "Check duration" },
      { value: "99.8%", label: "Spoof detection" },
      { value: "SDK + Web", label: "Integration" },
    ],
    steps: [
      {
        title: "Take a selfie",
        body: "Works in any modern browser or mobile device - no app install.",
      },
      {
        title: "Follow on-screen instructions",
        body: "Active prompts detect sophisticated attacks including deepfakes and camera injection.",
      },
    ],
    modules: [
      { icon: M("liveness"), label: "Liveness" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Securing password resets or high-risk transactions.",
    useCases: [
      "Password resets",
      "Step-up auth",
      "Account recovery",
      "High-risk payouts",
    ],
    docsPath: "core-technology/liveness/overview",
    response: `{
  "status": "Approved",
  "features": ["LIVENESS", "IP_ANALYSIS"],
  "liveness_checks": [
    { "status": "Approved", "method": "ACTIVE", "score": 98.7 }
  ]
}`,
  },
  {
    id: "face-auth",
    category: "KYC",
    mode: "hosted",
    icon: M("biometric-authentication"),
    title: "Biometric auth",
    subtitle: "Passwordless re-entry",
    blurb:
      "Match a fresh selfie against the portrait from an approved verification. Needs a reference photo.",
    longDescription:
      "A fast, passwordless way to re-verify returning users: we biometrically match a new live selfie against the trusted photo from their approved KYC verification, preventing account takeover.",
    chips: ["Face Match 1:1", "Liveness", "Reference photo"],
    price: "$0.10 per authentication",
    cta: "Upload photo & launch",
    workflowId: pick(
      "d1972e27-eeb8-4543-918b-6ac0846b7cc5",
      "9b610989-c77e-48ad-9c27-0668c6edd2be",
    ),
    requiresPortrait: true,
    stats: [
      { value: "<1s", label: "Auth time" },
      { value: "Biometric", label: "Factor" },
      { value: "Zero", label: "Passwords" },
    ],
    steps: [
      {
        title: "Take a new selfie",
        body: "Liveness detection ensures the returning user is physically present.",
      },
      {
        title: "Get authenticated in seconds",
        body: "We match the new selfie against the stored portrait and return a score.",
      },
    ],
    modules: [
      { icon: M("liveness"), label: "Liveness" },
      { icon: M("face-match"), label: "Face Match 1:1" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Passwordless login and securing existing accounts.",
    useCases: [
      "Passwordless login",
      "Transaction auth",
      "Account security",
      "Mobile apps",
    ],
    docsPath: "core-technology/biometric-auth/overview",
    response: `{
  "status": "Approved",
  "features": ["LIVENESS", "FACE_MATCH"],
  "face_matches": [{ "status": "Approved", "score": 96.2 }]
}`,
  },
  {
    id: "mfa",
    category: "KYC",
    mode: "hosted",
    icon: M("phone-verification"),
    title: "Multi-factor",
    subtitle: "Liveness + phone OTP",
    blurb:
      "Bind a live face to a phone number the user actually controls. Blocks bulk fake accounts.",
    longDescription:
      "Adds a layer of security by linking a biometric check to a verified communication channel - a real live person who also holds a specific phone number. Phone verification is a paid feature: it stays disabled until the organisation completes its first top-up.",
    chips: ["Liveness", "Phone Verification", "OTP"],
    price: "$0.10 liveness + $0.04 phone + carrier fee",
    cta: "Launch session",
    workflowId: pick(
      "dbdb51a9-3763-4dcf-a32d-8fe5f40a699d",
      "e4cecdd1-fb1d-4992-8fba-4175aaa2ba76",
    ),
    stats: [
      { value: "2-Factor", label: "Authentication" },
      { value: "SMS/Voice", label: "OTP delivery" },
      { value: "Global", label: "Coverage" },
    ],
    steps: [
      {
        title: "Take a selfie",
        body: "Confirm the user is a real person with AI liveness detection.",
      },
      {
        title: "Enter phone number",
        body: "The user provides a number to receive a one-time code.",
      },
      {
        title: "Validate the OTP",
        body: "Entering the code proves possession. Carrier and disposable-number checks run alongside.",
      },
    ],
    modules: [
      { icon: M("liveness"), label: "Liveness" },
      { icon: M("phone-verification"), label: "Phone Verification" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Preventing fake accounts and adding a second factor.",
    useCases: [
      "Account creation",
      "Social platforms",
      "Marketplaces",
      "Sensitive actions",
    ],
    docsPath: "core-technology/phone-verification/overview",
    response: `{
  "status": "Approved",
  "features": ["LIVENESS", "PHONE"],
  "phone_verifications": [
    {
      "status": "Approved",
      "country_name": "Spain",
      "carrier": { "name": "Movistar", "type": "mobile" },
      "is_disposable": false,
      "is_virtual": false
    }
  ]
}`,
  },
  {
    id: "age",
    category: "KYC",
    mode: "hosted",
    icon: M("age-estimation-18"),
    title: "Adaptive age check",
    subtitle: "Estimation with ID fallback",
    blurb:
      "Privacy-first age estimation for most users; a full ID check only inside the 15-25 buffer zone.",
    longDescription:
      "The smartest way to handle age-gated content: low-friction, privacy-first estimation for most users, with a seamless fallback to a full ID check only when the estimate lands in the buffer zone.",
    chips: ["Age Estimation", "Conditional ID", "GDPR"],
    price: "$0.10 estimate · $0.15 ID only when it falls back",
    cta: "Launch session",
    workflowId: pick(
      "0aa1d022-c1ee-47b0-8538-5c8c32515739",
      "8482aee5-38b8-46fd-914b-e1bc6edcadca",
    ),
    stats: [
      { value: "90%+", label: "Pass without ID" },
      { value: "Adaptive", label: "Branching logic" },
      { value: "GDPR", label: "Compliant" },
    ],
    steps: [
      {
        title: "Take a selfie",
        body: "Our model estimates age from the frame. Most users pass instantly with zero friction.",
      },
      {
        title: "Conditional ID check",
        body: "Only if the estimate falls between 15 and 25 do we request a document scan.",
      },
    ],
    modules: [
      { icon: M("age-estimation-18"), label: "Age Estimation" },
      { icon: M("liveness"), label: "Liveness" },
      { icon: M("id-scan"), label: "ID Verification" },
    ],
    bestFor: "Social media, iGaming and age-restricted e-commerce.",
    useCases: ["iGaming", "Social media", "E-commerce", "Streaming"],
    docsPath: "core-technology/age-estimation/overview",
    response: `{
  "status": "Approved",
  "features": ["AGE_ESTIMATION", "LIVENESS"],
  "age_estimations": [
    { "status": "Approved", "estimated_age": 31, "threshold": 18 }
  ]
}`,
  },
  {
    id: "accs-estimation",
    category: "KYC",
    mode: "hosted",
    icon: M("age-estimation-18"),
    title: "ACCS ISO 27566 · Age estimation",
    subtitle: "Certified facial age estimate",
    blurb:
      "Facial age estimation run to the ISO/IEC 27566 age-assurance model - an age band back, no document, no identity.",
    longDescription:
      "The age-assurance route for regulated age gates: a selfie is turned into an estimated age with a confidence band, evaluated under the ISO/IEC 27566 age-assurance framework and the ACCS certification scheme. Nothing identifying leaves the session - you receive an age decision, not a person.",
    chips: ["Age Estimation", "ISO/IEC 27566", "No ID required"],
    price: "$0.10 per estimate",
    cta: "Launch session",
    // ACCS conformance runs against the production engine, so this workflow has
    // no staging twin - the same id is used on both environments.
    workflowId: "2d958679-f3bf-4747-8a38-9a40a29a6098",
    note: "Production workflow - ACCS conformance runs against the production engine.",
    stats: [
      { value: "ISO 27566", label: "Standard" },
      { value: "ACCS", label: "Certification scheme" },
      { value: "No ID", label: "Data captured" },
    ],
    steps: [
      {
        title: "Take a selfie",
        body: "Passive liveness confirms a real, present person before any estimate is produced - the standard treats presentation attacks as part of the assurance question.",
      },
      {
        title: "Estimate the age",
        body: "The model returns an estimated age plus a confidence band, not a name, document or portrait to store.",
      },
      {
        title: "Compare to your threshold",
        body: "The workflow answers your gate - over 18, over 21, over 25 - and records which threshold was applied.",
      },
    ],
    modules: [
      { icon: M("age-estimation-18"), label: "Age Estimation" },
      { icon: M("liveness"), label: "Passive Liveness" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Age gates that must evidence a recognised age-assurance method.",
    useCases: ["iGaming", "Alcohol & vape retail", "Social media", "Streaming"],
    docsPath: "core-technology/age-estimation/overview",
    response: `{
  "status": "Approved",
  "features": ["AGE_ESTIMATION", "LIVENESS"],
  "age_estimations": [
    {
      "status": "Approved",
      "estimated_age": 31,
      "threshold": 18,
      "method": "FACIAL_AGE_ESTIMATION"
    }
  ]
}`,
  },
  {
    id: "accs-verification",
    category: "KYC",
    mode: "hosted",
    icon: M("id-scan"),
    title: "ACCS ISO 27566 · Age verification",
    subtitle: "Age proven from a document",
    blurb:
      "Age proven against an authoritative source, then shared as a single yes/no attribute rather than a date of birth.",
    longDescription:
      "Where estimation is not enough, this is the verification tier of the same ISO/IEC 27566 model: age is established from a government document - optionally read from the NFC chip - and returned to you as an age attribute. Your systems get the answer to the gate without holding the full date of birth.",
    chips: ["ID Verification", "NFC", "Age attribute only"],
    price: "$0.15 ID + $0.15 NFC + $0.05 face match",
    cta: "Launch session",
    workflowId: "a8942aa3-3bfe-4e1c-b322-d0d43e7ec31f",
    note: "Production workflow - ACCS conformance runs against the production engine.",
    stats: [
      { value: "ISO 27566", label: "Standard" },
      { value: "Age only", label: "Attribute returned" },
      { value: "220+", label: "Countries" },
    ],
    steps: [
      {
        title: "Scan the document",
        body: "The ID is captured and authenticated; on supported passports the chip is read over NFC for a signed date of birth.",
      },
      {
        title: "Confirm the holder",
        body: "Liveness and face match tie the document to the person at the gate, so a borrowed ID does not pass.",
      },
      {
        title: "Return the attribute",
        body: "You receive over-18 (or your configured threshold) with the method used - data minimisation is the point.",
      },
    ],
    modules: [
      { icon: M("id-scan"), label: "ID Verification" },
      { icon: M("nfc"), label: "NFC Chip Read" },
      { icon: M("liveness"), label: "Liveness" },
      { icon: M("face-match"), label: "Face Match 1:1" },
    ],
    bestFor:
      "Regulated age gates where an estimate will not satisfy the regulator.",
    useCases: [
      "iGaming",
      "Gambling",
      "Firearms & knives",
      "Age-restricted marketplaces",
    ],
    docsPath: "core-technology/id-verification/overview",
    response: `{
  "status": "Approved",
  "features": ["ID_VERIFICATION", "NFC", "LIVENESS", "FACE_MATCH"],
  "id_verifications": [
    { "status": "Approved", "document_type": "Passport", "age": 34 }
  ],
  "nfc_verifications": [
    { "status": "Approved", "chip_authentication": "Passed" }
  ]
}`,
  },
  {
    id: "poa",
    category: "KYC",
    mode: "hosted",
    icon: M("proof-of-address"),
    title: "Proof of address",
    subtitle: "Document + address parse",
    blurb:
      "Utility bill, bank statement or government letter - parsed, validated and tamper-checked.",
    longDescription:
      "Verify a user's residential address for enhanced due diligence - a critical step for high-level financial compliance and risk management.",
    chips: ["PoA", "Address parsing", "Tamper detection"],
    price: "$0.20 per document",
    cta: "Launch session",
    workflowId: pick(
      "94f9c776-4362-488e-93ff-9dd2921af3f2",
      "016aa374-1672-4f57-a227-3fa750a6977c",
    ),
    stats: [
      { value: "50+", label: "Document types" },
      { value: "AI", label: "Fraud detection" },
      { value: "EDD", label: "Ready" },
    ],
    steps: [
      {
        title: "Capture the document",
        body: "The user uploads or photographs a utility bill, bank statement or government letter.",
      },
      {
        title: "Automated AI analysis",
        body: "We extract and normalise the address, validate the document type, and check for tampering.",
      },
    ],
    modules: [
      { icon: M("proof-of-address"), label: "Proof of Address" },
      { icon: M("ip-analysis"), label: "IP Analysis" },
    ],
    bestFor: "Enhanced due diligence in banking and fintech.",
    useCases: ["Banking", "Fintech", "Cross-border", "Compliance"],
    docsPath: "core-technology/proof-of-address/overview",
    response: `{
  "status": "Approved",
  "features": ["POA"],
  "poa_verifications": [
    {
      "status": "Approved",
      "document_type": "utility_bill",
      "issuer": "Endesa",
      "issue_date": "2026-07-14",
      "poa_formatted_address": "Carrer de Mallorca 401, 08013 Barcelona, ES"
    }
  ]
}`,
  },
  {
    id: "questionnaires",
    category: "KYC",
    mode: "hosted",
    icon: M("questionnaires"),
    title: "Questionnaires",
    subtitle: "Declarations in-flow",
    blurb:
      "Collect source of funds, PEP self-declaration or risk questions inside the same verification session.",
    longDescription:
      "Ask the questions your policy requires without bolting on a second tool. Questions branch on earlier answers and on module results, and every answer lands in the same decision payload as an audit record.",
    chips: ["Questionnaires", "Conditional logic", "Audit trail"],
    price: "$0.10 per questionnaire",
    cta: "Launch session",
    workflowId: null,
    workflowPlaceholder: true,
    stats: [
      { value: "Any", label: "Question type" },
      { value: "Branching", label: "Logic" },
      { value: "1 payload", label: "Audit trail" },
    ],
    steps: [
      {
        title: "Verify identity first",
        body: "Run whichever modules your flow needs - the questionnaire node sits after them.",
      },
      {
        title: "Answer the declarations",
        body: "Single/multi choice, free text and file upload, branching on risk score or nationality.",
      },
      {
        title: "Answers join the decision",
        body: "Responses are returned with the session decision and shown in case management.",
      },
    ],
    modules: [
      { icon: M("questionnaires"), label: "Questionnaires" },
      { icon: M("id-scan"), label: "ID Verification" },
      { icon: D("case-management"), label: "Case Management" },
    ],
    bestFor: "Source-of-funds, PEP declarations and risk profiling.",
    useCases: ["Wealth onboarding", "iGaming", "Crypto", "Insurance"],
    docsPath: "core-technology/questionnaires/overview",
    response: `{
  "status": "Approved",
  "features": ["ID_VERIFICATION", "QUESTIONNAIRE"],
  "questionnaire_responses": [
    {
      "status": "Approved",
      "answers": [
        { "key": "source_of_funds", "value": "Salaried employment" },
        { "key": "is_pep", "value": false }
      ]
    }
  ]
}`,
  },
  {
    id: "kyb",
    category: "KYB",
    mode: "api",
    icon: M("kyb"),
    title: "Business verification",
    subtitle: "Registry + documents",
    blurb:
      "Pull the company straight from the official registry, validate documents, and score the entity.",
    longDescription:
      "KYB without the spreadsheet. We resolve the legal entity in the official registry, reconcile the documents you were given against it, and return a structured company profile with a risk verdict.",
    chips: ["Registry lookup", "Document AI", "Entity risk"],
    price: "From $2.00 · $4-5 with shareholders",
    cta: "Open sample case",
    workflowId: null,
    stats: [
      { value: "150+", label: "Registries" },
      { value: "~90s", label: "Median case" },
      { value: "$4.50", label: "Per company" },
    ],
    steps: [
      {
        title: "Submit the company",
        body: "Registration number and country, or a name search when the number is unknown.",
      },
      {
        title: "Registry resolution",
        body: "We fetch the filing: legal form, status, incorporation date, registered address, officers.",
      },
      {
        title: "Documents & verdict",
        body: "Uploaded articles or certificates are parsed and reconciled with the filing before scoring.",
      },
    ],
    modules: [
      { icon: M("kyb"), label: "Business Verification" },
      { icon: M("documents"), label: "Document AI" },
      { icon: M("aml-screening-business"), label: "Business AML" },
      { icon: D("case-management"), label: "Case Management" },
    ],
    bestFor:
      "Marketplaces, B2B fintech and payment providers onboarding merchants.",
    useCases: [
      "Merchant onboarding",
      "B2B fintech",
      "Payment providers",
      "Lending",
    ],
    docsPath: "business-verification/overview",
    request: {
      method: "POST",
      url: `${V3}/session/`,
      docsPath: "sessions-api/create-session",
      note: "Business verification runs on the same session endpoint as KYC - a KYB workflow returns session_kind: business. vendor_data must be the stable business id from your own system, never a per-attempt random, or every retry looks like a new entity.",
      body: `{
  "workflow_id": "<your-kyb-workflow-id>",
  "vendor_data": "b21f9c40-4d1e-4a77-9f0e-2c8ab5d31f04",
  "callback": "${CALLBACK_URL}",
  "contact_details": { "email": "compliance@northwind.example" },
  "expected_details": {
    "company_name": "Northwind Trading B.V.",
    "registry_country": "NL",
    "registration_number": "34567890"
  }
}`,
    },
    sample: {
      verdict: "Approved",
      summary:
        "Registry match on all 6 fields · no adverse filings · 2 UBOs resolved",
      score: "18",
      scoreLabel: "Entity risk",
      tone: "approved",
      sections: [
        {
          title: "Company · registry filing",
          rows: [
            {
              key: "legal_name",
              value: "Northwind Trading B.V.",
              strong: true,
            },
            {
              key: "registration_number",
              value: "34567890 · KvK Netherlands",
            },
            { key: "legal_form", value: "Besloten vennootschap (B.V.)" },
            {
              key: "status",
              value: "Active · filed 2019-03-11",
              tone: "approved",
              strong: true,
            },
            {
              key: "registered_address",
              value: "Keizersgracht 241, 1016 EA Amsterdam",
            },
            {
              key: "sic_activity",
              value: "46.90 - Non-specialised wholesale trade",
            },
          ],
        },
      ],
      listTitle: "Key people & UBO tree",
      items: [
        {
          name: "Marijke de Vries",
          meta: "UBO · 62% direct shareholding · Director",
          tag: "Clear",
          tone: "approved",
          score: "4",
          avatar: FLAG("nl"),
          detail:
            "Identity verified against a Dutch ID card. Screened across sanctions, PEP and adverse-media datasets with no hits above the 60 threshold.",
          tags: [
            "ID verified",
            "No sanctions hit",
            "No PEP",
            "Face match 97.1",
          ],
        },
        {
          name: "Holdco Cyprus Ltd",
          meta: "Corporate shareholder · 38% · via 2 layers",
          tag: "Review",
          tone: "review",
          score: "44",
          avatar: FLAG("cy"),
          detail:
            "Intermediate holding structure resolved two layers deep. Registry is current, but the ultimate individual owner behind the second layer could not be confirmed from public filings - case routed to manual review.",
          tags: ["Layer 2 resolved", "UBO unconfirmed", "Registry current"],
        },
        {
          name: "Thomas Berger",
          meta: "Officer · Managing Director · no shareholding",
          tag: "Clear",
          tone: "approved",
          score: "7",
          avatar: FLAG("de"),
          detail:
            "Appointed 2021-06-02. Matched to the registry officer list; identity verified with a German ID card and screened with no hits.",
          tags: ["ID verified", "Officer match", "No hits"],
        },
      ],
    },
    trace: [
      {
        label: "Session created",
        detail: "workflow resolved to 4 modules",
        ms: "120ms",
        ok: true,
      },
      {
        label: "Registry lookup · KvK Netherlands",
        detail: "6 of 6 fields matched the submitted data",
        ms: "1,240ms",
        ok: true,
      },
      {
        label: "Document AI",
        detail:
          "2 files parsed - articles of association, registry extract - reconciled with the filing",
        ms: "2,010ms",
        ok: true,
      },
      {
        label: "Ownership traversal",
        detail: "3 layers walked · 4 natural persons surfaced",
        ms: "1,860ms",
        ok: true,
      },
      {
        label: "Business AML",
        detail:
          "entity + 4 people screened · 1 review flag on the Cyprus layer",
        ms: "940ms",
        ok: false,
      },
      {
        label: "Decision",
        detail: "entity risk 18 · Approved with 1 person in review",
        ms: "60ms",
        ok: true,
      },
    ],
    response: `{
  "status": "Approved",
  "session_kind": "business",
  "features": ["BUSINESS_VERIFICATION", "KEY_PEOPLE", "BUSINESS_AML"],
  "business_verification": {
    "status": "Approved",
    "legal_name": "Northwind Trading B.V.",
    "registration_number": "34567890",
    "country": "NL",
    "entity_risk_score": 18
  },
  "key_people": [
    { "full_name": "Marijke de Vries", "role": "UBO", "ownership": 62.0, "status": "Approved" },
    { "name": "Holdco Cyprus Ltd", "role": "SHAREHOLDER", "ownership": 38.0, "status": "In Review" }
  ]
}`,
  },
  {
    id: "ubo",
    category: "KYB",
    mode: "api",
    icon: M("key-people"),
    title: "Key people & UBO",
    subtitle: "Ownership graph",
    blurb:
      "Walk the ownership chain to the humans, then run KYC and AML on each one of them.",
    longDescription:
      "Ownership rarely stops at the first layer. We traverse corporate shareholders until we reach natural persons, compute effective ownership through each path, and screen every person we surface.",
    chips: ["Ownership graph", "PEP & sanctions", "Per-person KYC"],
    price: "$5.00 - $9.00 registry UBOs + KYC per person",
    cta: "Open sample case",
    workflowId: null,
    stats: [
      { value: "5 layers", label: "Max depth" },
      { value: "25%", label: "Default UBO threshold" },
      { value: "Per person", label: "KYC + AML" },
    ],
    steps: [
      {
        title: "Resolve the entity",
        body: "Start from a verified company case or a registration number.",
      },
      {
        title: "Traverse the chain",
        body: "Corporate shareholders are expanded layer by layer with effective ownership computed per path.",
      },
      {
        title: "Verify each person",
        body: "Send every surfaced individual an ID + liveness link, and screen them against AML datasets.",
      },
    ],
    modules: [
      { icon: M("key-people"), label: "Key People" },
      { icon: M("aml-screening"), label: "AML Screening" },
      { icon: M("id-scan"), label: "ID Verification" },
      { icon: M("reusable-kyc"), label: "Reusable KYC" },
    ],
    bestFor:
      "Regulated entities that must evidence the ultimate beneficial owner.",
    useCases: [
      "Banking",
      "Crypto exchanges",
      "Corporate lending",
      "Trust & company services",
    ],
    docsPath: "business-verification/key-people",
    request: {
      method: "GET",
      url: `${V3}/session/{session_id}/decision/`,
      docsPath: "sessions-api/retrieve-session",
      note: "Ownership is not a separate call: key_people and the resolved tree come back on the business session decision (the business.data.updated / business.status.updated webhooks push the same payload).",
      body: "",
    },
    sample: {
      verdict: "1 of 4 people awaiting verification",
      summary: "Effective ownership resolved to 100% · 3 people cleared",
      score: "3/4",
      scoreLabel: "Verified",
      tone: "review",
      sections: [
        {
          title: "Ownership resolution",
          rows: [
            {
              key: "root_entity",
              value: "Northwind Trading B.V. · NL",
              strong: true,
            },
            { key: "layers_traversed", value: "3" },
            { key: "natural_persons_found", value: "4" },
            {
              key: "effective_ownership_total",
              value: "100.0%",
              tone: "approved",
              strong: true,
            },
            {
              key: "ubo_threshold",
              value: "25.0% (configurable per workflow)",
            },
          ],
        },
      ],
      listTitle: "Natural persons",
      items: [
        {
          name: "Marijke de Vries",
          meta: "62.0% effective · direct",
          tag: "Verified",
          tone: "approved",
          score: "4",
          avatar: FLAG("nl"),
          detail:
            "Direct shareholder and director. ID + liveness completed on 2026-08-30; AML screening clear.",
          tags: ["UBO", "ID verified", "AML clear"],
        },
        {
          name: "Andreas Georgiou",
          meta: "22.8% effective · via Holdco Cyprus Ltd",
          tag: "Verified",
          tone: "approved",
          score: "11",
          avatar: FLAG("cy"),
          detail:
            "Reached through the Cyprus holding company (60% of 38%). Verification link completed the same day.",
          tags: ["UBO", "Layer 2", "AML clear"],
        },
        {
          name: "Elena Sokolova",
          meta: "15.2% effective · via Holdco Cyprus Ltd",
          tag: "Awaiting",
          tone: "neutral",
          score: "—",
          avatar: FLAG("ru"),
          detail:
            "Below the 25% UBO threshold but flagged for enhanced screening on nationality risk. Verification link sent 2026-09-02, not yet opened.",
          tags: ["Below threshold", "Link sent", "Enhanced screening"],
        },
        {
          name: "Thomas Berger",
          meta: "0% · officer only",
          tag: "Verified",
          tone: "approved",
          score: "7",
          avatar: FLAG("de"),
          detail:
            "Managing director with no shareholding. Included because officers are screened by policy.",
          tags: ["Officer", "ID verified", "AML clear"],
        },
      ],
    },
    trace: [
      {
        label: "Root entity loaded",
        detail: "from company case cs_1187",
        ms: "90ms",
        ok: true,
      },
      {
        label: "Layer 1 expanded",
        detail: "2 shareholders - 1 individual (62%), 1 corporate (38%)",
        ms: "610ms",
        ok: true,
      },
      {
        label: "Layer 2 expanded",
        detail: "Holdco Cyprus Ltd resolved to 3 individuals",
        ms: "1,420ms",
        ok: true,
      },
      {
        label: "Effective ownership computed",
        detail: "per path · 100.0% of the cap table resolved",
        ms: "40ms",
        ok: true,
      },
      {
        label: "KYC links issued",
        detail: "4 people · 3 completed, 1 not yet opened",
        ms: "210ms",
        ok: false,
      },
      {
        label: "AML screening",
        detail: "4 subjects · no hits at or above the 60 threshold",
        ms: "820ms",
        ok: true,
      },
    ],
    response: `{
  "key_people": [
    {
      "full_name": "Andreas Georgiou",
      "role": "UBO",
      "effective_ownership": 22.8,
      "path": ["Northwind Trading B.V.", "Holdco Cyprus Ltd"],
      "kyc": { "status": "Approved", "session_id": "…" },
      "aml": { "status": "Approved", "total_hits": 0 }
    }
  ]
}`,
  },
  {
    id: "txn",
    category: "Monitoring",
    mode: "api",
    icon: M("transactions"),
    title: "Transaction monitoring",
    subtitle: "Rules + risk scoring",
    blurb:
      "Stream payment events, hit them with your rule set, and open a case when the score crosses the line.",
    longDescription:
      "Post every payment event to one endpoint and get a decision back synchronously. Rules combine amount, velocity, counterparty risk and the customer's KYC profile; anything above your threshold opens a case with the triggering evidence attached.",
    chips: ["Rule engine", "Case management", "Webhooks"],
    price: "$0.02 per screened transaction",
    cta: "Open sample feed",
    workflowId: null,
    stats: [
      { value: "<80ms", label: "P95 decision" },
      { value: "Any", label: "Rule combination" },
      { value: "Webhook", label: "Delivery" },
    ],
    steps: [
      {
        title: "Post the event",
        body: "Amount, currency, direction, counterparty and your customer id.",
      },
      {
        title: "Rules evaluate synchronously",
        body: "Velocity, structuring, geography and counterparty-risk rules run against the customer profile.",
      },
      {
        title: "Case or clear",
        body: "Below threshold the event clears; above it, a case opens with the rule hits and the transaction chain.",
      },
    ],
    modules: [
      { icon: M("transactions"), label: "Transaction Monitoring" },
      { icon: M("monitoring"), label: "Ongoing Monitoring" },
      { icon: D("case-management"), label: "Case Management" },
      { icon: D("webhooks"), label: "Webhooks" },
    ],
    bestFor:
      "Payment providers, neobanks and exchanges with a live money flow.",
    useCases: ["Neobanks", "PSPs", "Exchanges", "Remittance"],
    docsPath: "transaction-monitoring/overview",
    request: {
      method: "POST",
      url: `${V3}/transactions/`,
      docsPath: "management-api/transactions/create",
      note: "One synchronous call per event. transaction_id is your own idempotency key, and the same payload also arrives on your endpoint as transaction.created / transaction.status.updated webhooks.",
      body: `{
  "transaction_id": "evt_2291",
  "transaction_category": "finance",
  "transaction_details": {
    "direction": "outbound",
    "amount": 18400,
    "currency": "EUR",
    "currency_kind": "fiat",
    "action_type": "withdrawal"
  },
  "subject": {
    "vendor_data": "cus_8f21ab",
    "full_name": "Northwind Trading B.V.",
    "entity_type": "company"
  }
}`,
    },
    sample: {
      verdict: "1 case opened",
      summary: "4 events processed in this window · 1 above threshold",
      score: "82",
      scoreLabel: "Peak risk",
      tone: "declined",
      sections: [
        {
          title: "Customer profile in context",
          rows: [
            {
              key: "customer_id",
              value: "cus_8f21ab · KYC Approved 2026-04-02",
              strong: true,
            },
            {
              key: "expected_monthly_volume",
              value: "€8,000 (declared at onboarding)",
            },
            {
              key: "observed_30d_volume",
              value: "€41,900",
              tone: "declined",
              strong: true,
            },
            { key: "counterparty_countries", value: "NL, DE, CY, RU" },
          ],
        },
      ],
      listTitle: "Event feed · last 24h",
      items: [
        {
          name: "€18,400 outbound",
          meta: "14:02 · to Holdco Cyprus Ltd · SEPA",
          tag: "Case",
          tone: "declined",
          score: "82",
          avatar: FLAG("cy"),
          detail:
            "Three rules fired: amount 2.3x the declared monthly volume, first payment to this counterparty, and counterparty jurisdiction on the enhanced-diligence list. Case CS-2291 opened and the payout held.",
          tags: [
            "R-12 amount anomaly",
            "R-04 new counterparty",
            "R-19 jurisdiction",
          ],
        },
        {
          name: "€2,900 outbound",
          meta: "11:47 · to Marijke de Vries · SEPA",
          tag: "Cleared",
          tone: "approved",
          score: "21",
          avatar: FLAG("nl"),
          detail:
            "Known counterparty with 14 prior settled payments. Within the customer's normal pattern.",
          tags: ["Known counterparty", "In pattern"],
        },
        {
          name: "€9,500 inbound",
          meta: "09:15 · from Berger GmbH · SEPA",
          tag: "Cleared",
          tone: "approved",
          score: "34",
          avatar: FLAG("de"),
          detail:
            "Inbound from a verified business counterparty. Velocity rule evaluated and passed.",
          tags: ["Verified business", "Velocity ok"],
        },
        {
          name: "€1,050 outbound",
          meta: "08:03 · card payout · GB",
          tag: "Cleared",
          tone: "approved",
          score: "12",
          avatar: FLAG("gb"),
          detail: "Routine payout, no rule hits.",
          tags: ["No hits"],
        },
      ],
    },
    trace: [
      {
        label: "Event received",
        detail: "evt_2291 · idempotency key accepted",
        ms: "8ms",
        ok: true,
      },
      {
        label: "Customer profile joined",
        detail: "cus_8f21ab · KYC approved 2026-04-02 · declared €8,000/month",
        ms: "11ms",
        ok: true,
      },
      {
        label: "Rules evaluated",
        detail:
          "24 rules · 3 fired - R-12 amount anomaly, R-04 new counterparty, R-19 jurisdiction",
        ms: "39ms",
        ok: false,
      },
      {
        label: "Score composed",
        detail: "82 against a review threshold of 70",
        ms: "4ms",
        ok: false,
      },
      {
        label: "Case opened",
        detail: "CS-2291 · payout held pending review",
        ms: "12ms",
        ok: false,
      },
      {
        label: "Webhook delivered",
        detail: "transaction.status.updated reached your endpoint · 2xx",
        ms: "90ms",
        ok: true,
      },
    ],
    response: `{
  "transaction_id": "evt_2291",
  "decision": "REVIEW",
  "risk_score": 82,
  "rule_hits": [
    { "code": "R-12", "name": "Amount anomaly", "weight": 40 },
    { "code": "R-04", "name": "New counterparty", "weight": 22 },
    { "code": "R-19", "name": "Enhanced-diligence jurisdiction", "weight": 20 }
  ],
  "case": { "id": "CS-2291", "status": "Open", "assigned_to": null }
}`,
  },
  {
    id: "wallet",
    category: "Monitoring",
    mode: "api",
    icon: M("wallet-screening"),
    title: "Wallet screening (KYT)",
    subtitle: "On-chain exposure",
    blurb:
      "Score an address before you let value move - direct and indirect exposure, by hop.",
    longDescription:
      "Screen a wallet address against on-chain risk before accepting a deposit or signing a payout. We attribute counterparties, break exposure down by category and hop distance, and return a score you can threshold on - $0.02 bring-your-own-key, roughly 10x cheaper than going direct.",
    chips: ["Exposure by hop", "Sanctions addresses", "Multi-chain"],
    price: "$0.15 per screen · $0.02 with your own key",
    cta: "Open sample wallet",
    workflowId: null,
    stats: [
      { value: "$0.02", label: "BYOK per screen" },
      { value: "12", label: "Chains" },
      { value: "5 hops", label: "Indirect depth" },
    ],
    steps: [
      {
        title: "Submit the address",
        body: "Address plus chain; optionally the customer id to tie it to a KYC profile.",
      },
      {
        title: "Attribute and score",
        body: "Counterparties are attributed and exposure computed direct and indirect, by category.",
      },
      {
        title: "Threshold and act",
        body: "Approve, hold or decline on your own thresholds; rescreen on every subsequent deposit.",
      },
    ],
    modules: [
      { icon: M("wallet-screening"), label: "Wallet Screening" },
      { icon: D("networks"), label: "Chain Coverage" },
      { icon: M("monitoring"), label: "Rescreening" },
      { icon: D("case-management"), label: "Case Management" },
    ],
    bestFor: "Exchanges, custodians and on-ramps accepting crypto deposits.",
    useCases: ["Exchanges", "On-ramps", "Custody", "DeFi front-ends"],
    docsPath: "transaction-monitoring/wallet-screening",
    request: {
      method: "POST",
      url: `${V3}/wallet-screening/`,
      docsPath: "management-api/transactions/screen-wallet",
      note: "On-demand screening for a single address - nothing is written to the transactions table. One AML monitoring usage is billed per successful screening; sandbox applications are not billed.",
      body: `{
  "wallet_address": "bc1q…7f4d29",
  "blockchain": "BTC",
  "direction": "inbound"
}`,
    },
    sample: {
      verdict: "Hold for review",
      summary:
        "Indirect mixer exposure 12.4% at 2 hops · no direct sanctions match",
      score: "64",
      scoreLabel: "Wallet risk",
      tone: "review",
      sections: [
        {
          title: "Address",
          rows: [
            { key: "wallet_address", value: "bc1q…7f4d29", strong: true },
            { key: "blockchain", value: "BTC" },
            { key: "first_seen", value: "2024-11-02 · 318 transfers" },
            { key: "balance", value: "1.482 BTC" },
            {
              key: "sanctions_hit",
              value: "false",
              tone: "approved",
              strong: true,
            },
          ],
        },
      ],
      listTitle: "Exposure breakdown",
      items: [
        {
          name: "Mixer · 12.4%",
          meta: "Indirect · 2 hops · 0.184 BTC attributed",
          tag: "High",
          tone: "declined",
          score: "64",
          avatar: FLAG("us"),
          detail:
            "Funds traced through a coin-mixing service two hops upstream. Above the 10% indirect threshold configured for this workflow, so the deposit is held rather than declined.",
          tags: ["Indirect", "2 hops", "Above threshold"],
        },
        {
          name: "Centralised exchange · 71.2%",
          meta: "Direct · KYC-obliged venue",
          tag: "Low",
          tone: "approved",
          score: "8",
          avatar: FLAG("gb"),
          detail:
            "Majority of inflow arrives from a regulated exchange that performs its own KYC. Treated as low risk.",
          tags: ["Direct", "Regulated venue"],
        },
        {
          name: "P2P & self-custody · 16.4%",
          meta: "Mixed hops · unattributed",
          tag: "Medium",
          tone: "review",
          score: "35",
          avatar: FLAG("de"),
          detail:
            "Unattributed peer-to-peer flow. Not itself a risk signal, but it caps how much of the wallet's history can be evidenced.",
          tags: ["Unattributed", "Monitor"],
        },
      ],
    },
    trace: [
      {
        label: "Address parsed",
        detail: "bc1q…7f4d29 · chain BTC · 318 transfers on record",
        ms: "30ms",
        ok: true,
      },
      {
        label: "Counterparty attribution",
        detail: "direct counterparties resolved at 1 hop",
        ms: "640ms",
        ok: true,
      },
      {
        label: "Indirect exposure walk",
        detail: "upstream traversal to 5 hops",
        ms: "1,180ms",
        ok: true,
      },
      {
        label: "Category shares computed",
        detail: "mixer 12.4% · exchange 71.2% · p2p 16.4%",
        ms: "20ms",
        ok: false,
      },
      {
        label: "Sanctioned-address check",
        detail: "no direct match against designated addresses",
        ms: "210ms",
        ok: true,
      },
      {
        label: "Decision",
        detail: "risk 64 · severity MEDIUM · address enrolled for rescreening",
        ms: "15ms",
        ok: false,
      },
    ],
    response: `{
  "provider": "merklescience",
  "screening_type": "WALLET_SCREENING",
  "status": "SCREENED",
  "wallet_address": "bc1q…7f4d29",
  "blockchain": "BTC",
  "risk_score": 64,
  "severity": "MEDIUM",
  "sanctions_hit": false,
  "summary": "Indirect mixer exposure at 2 hops"
}`,
  },
  {
    id: "aml",
    category: "Monitoring",
    mode: "api",
    icon: M("aml-screening"),
    title: "AML screening",
    subtitle: "Standalone API",
    blurb:
      "Screen a name you already hold against sanctions, PEP and adverse media - no session needed.",
    longDescription:
      "Already have verified identity data? Screen it directly. One call returns scored hits across 1,000+ sanctions and PEP datasets plus adverse media, with the matching properties so an analyst can adjudicate - and optional ongoing monitoring that pushes a webhook when a subject's status changes.",
    chips: ["Sanctions", "PEP", "Adverse media", "Ongoing"],
    price: "$0.20 per screen",
    cta: "Open sample hits",
    workflowId: null,
    stats: [
      { value: "1,000+", label: "Datasets" },
      { value: "Daily", label: "Refresh" },
      { value: "Webhook", label: "Status change" },
    ],
    steps: [
      {
        title: "Submit the subject",
        body: "Full name, date of birth and nationality - or a whole verified session.",
      },
      {
        title: "Fuzzy match and score",
        body: "Transliteration and alias-aware matching returns every hit with a match score and a risk score.",
      },
      {
        title: "Adjudicate and monitor",
        body: "Analysts clear or confirm hits in case management; enrol the subject for daily rescreening.",
      },
    ],
    modules: [
      { icon: M("aml-screening"), label: "AML Screening" },
      { icon: M("monitoring"), label: "Ongoing Monitoring" },
      { icon: D("case-management"), label: "Case Management" },
      { icon: D("api"), label: "Direct API" },
    ],
    bestFor: "Compliance teams screening existing books of customers.",
    useCases: [
      "Bank remediation",
      "Periodic review",
      "Vendor screening",
      "Employee screening",
    ],
    docsPath: "standalone-apis/aml-screening",
    request: {
      method: "POST",
      url: `${V3}/aml/`,
      docsPath: "standalone-apis/aml-screening",
      note: "Standalone server-to-server API - no hosted flow, and priced outside the workflow free tier. nationality is ISO 3166-1 alpha-2; send an Idempotency-Key header when retrying so a timeout never bills twice.",
      body: `{
  "full_name": "Ivan Petrov",
  "entity_type": "person",
  "date_of_birth": "1979-04-12",
  "nationality": "RU",
  "include_adverse_media": true,
  "include_ongoing_monitoring": true
}`,
    },
    sample: {
      verdict: "In review · 2 hits to adjudicate",
      summary: "Screened Ivan Petrov (RU, 1979-04-12) across 1,043 datasets",
      score: "71.4",
      scoreLabel: "Top risk score",
      tone: "review",
      sections: [
        {
          title: "screened_data",
          rows: [
            { key: "full_name", value: "Ivan Petrov", strong: true },
            { key: "nationality", value: "RU" },
            { key: "date_of_birth", value: "1979-04-12" },
            { key: "document_number", value: "75•••••31" },
            {
              key: "total_hits",
              value: "2",
              tone: "review",
              strong: true,
            },
          ],
        },
      ],
      listTitle: "Hits",
      items: [
        {
          name: "Ivan Petrov",
          meta: "PEP · regional office · 2019-2024",
          tag: "Match",
          tone: "review",
          score: "71.4",
          avatar: FLAG("ru"),
          detail:
            "Name, date of birth and nationality align, so the match score clears the 93 identity threshold. Listed as a politically exposed person through a regional public office; no sanctions designation. Requires analyst adjudication before onboarding.",
          tags: ["peps", "match 96.2", "dob exact", "no sanctions"],
        },
        {
          name: "Ivan Petrow",
          meta: "Adverse media · 2021 fraud reporting",
          tag: "False positive",
          tone: "neutral",
          score: "38.2",
          avatar: FLAG("de"),
          detail:
            "Transliteration variant surfaced from adverse-media reporting in a different jurisdiction with no date of birth on record. Match score below the 93 threshold - tagged False Positive and excluded from the risk assessment, kept for the audit trail.",
          tags: ["adverse-media", "match 71.0", "no dob", "below threshold"],
        },
      ],
    },
    trace: [
      {
        label: "Subject normalised",
        detail: "transliteration and alias expansion applied",
        ms: "40ms",
        ok: true,
      },
      {
        label: "Datasets queried",
        detail: "1,043 sanctions, PEP and adverse-media lists",
        ms: "780ms",
        ok: true,
      },
      {
        label: "Match scored",
        detail: "name 0.94 · date of birth exact · nationality exact",
        ms: "120ms",
        ok: false,
      },
      {
        label: "Hits scored",
        detail: "2 returned · 1 above the 93 match threshold",
        ms: "30ms",
        ok: false,
      },
      {
        label: "Case queued",
        detail: "CS-2288 raised for analyst adjudication",
        ms: "18ms",
        ok: false,
      },
      {
        label: "Ongoing monitoring",
        detail: "subject enrolled · daily refresh, webhook on status change",
        ms: "25ms",
        ok: true,
      },
    ],
    response: `{
  "request_id": "c9f1a0e2-…",
  "aml": {
    "status": "In Review",
    "total_hits": 2,
    "score": 71.4,
    "screened_data": {
      "full_name": "Ivan Petrov",
      "nationality": "RU",
      "date_of_birth": "1979-04-12"
    },
    "hits": [
      {
        "caption": "Ivan Petrov",
        "match_score": 96.2,
        "risk_score": 71.4,
        "review_status": "Unreviewed",
        "datasets": ["peps"],
        "properties": { "topics": ["role.pep"], "country": ["ru"] }
      }
    ]
  }
}`,
  },
  {
    id: "face-search",
    category: "Fraud",
    mode: "api",
    icon: M("face-search"),
    title: "Face search 1:N",
    subtitle: "Duplicate & ban detection",
    blurb:
      "Check a new face against everyone you have already onboarded - catch duplicates and returning bans.",
    longDescription:
      "One person, many accounts is the cheapest fraud there is. Every new selfie is searched against your own index of previously verified faces, so duplicate signups and banned users trying to return are caught at the door.",
    chips: ["1:N search", "Duplicate accounts", "Ban evasion"],
    price: "$0.05 per search",
    cta: "Search sample gallery",
    workflowId: null,
    stats: [
      { value: "<1.8s", label: "P95 search" },
      { value: "5", label: "Matches returned" },
      { value: "1:N", label: "Mode" },
    ],
    steps: [
      {
        title: "Run a normal session",
        body: "Liveness (and ID, if you want it) exactly as in your onboarding flow - every approved face is enrolled in your index.",
      },
      {
        title: "Search the index",
        body: "The captured face is embedded and searched against your application's enrolled faces, block list and allow list.",
      },
      {
        title: "Decide on the match",
        body: "Up to 5 ranked matches come back with the originating session, its status and blocklist flags.",
      },
    ],
    modules: [
      { icon: M("face-search"), label: "Face Search 1:N" },
      { icon: M("liveness"), label: "Liveness" },
      { icon: M("face-match"), label: "Face Match 1:1" },
    ],
    bestFor: "Bonus abuse, duplicate accounts and ban evasion.",
    useCases: ["iGaming", "Marketplaces", "Ride-hailing", "Airdrops"],
    docsPath: "core-technology/face-search/overview",
    request: {
      method: "POST",
      url: `${V3}/face-search/`,
      docsPath: "standalone-apis/face-search",
      note: "multipart/form-data, not JSON - user_image is a file (max 5 MB). search_type=blocklisted_or_approved ranks blocklisted faces first when screening is the point rather than deduplication.",
      body: `# multipart/form-data
user_image=@selfie.jpg
search_type=blocklisted_or_approved
vendor_data=user-8821`,
    },
    sample: {
      verdict: "Declined · face on the blocklist",
      summary:
        "3 matches returned · the top one is a banned account, which declines the search",
      score: "97.8",
      scoreLabel: "Top similarity",
      tone: "declined",
      sections: [
        {
          title: "Search parameters",
          rows: [
            {
              key: "search_type",
              value: "blocklisted_or_approved",
              strong: true,
            },
            { key: "vendor_data", value: "user-8821" },
            { key: "total_matches", value: "3" },
            { key: "save_api_request", value: "true (face enrolled)" },
            {
              key: "warnings",
              value: "FACE_IN_BLOCKLIST",
              tone: "declined",
              strong: true,
            },
          ],
        },
      ],
      listTitle: "Matches · portraits withheld in the demo index",
      items: [
        {
          name: "user-4471",
          meta: "Enrolled 2026-03-14 · session Declined · blocklisted",
          tag: "Blocklist",
          tone: "declined",
          score: "97.8",
          avatar: FLAG("es"),
          detail:
            "Same face, different account. The prior account was declined for document fraud and added to the face blocklist, so FACE_IN_BLOCKLIST fires and the search is declined before any further module runs.",
          tags: ["is_blocklisted", "source: session", "same document country"],
        },
        {
          name: "user-1180",
          meta: "Enrolled 2025-11-02 · session Approved",
          tag: "Similar",
          tone: "review",
          score: "74.1",
          avatar: FLAG("es"),
          detail:
            "A family resemblance rather than the same person - returned so an analyst can see what the runner-up looked like. Advisory only; a duplicate match on its own never declines.",
          tags: ["source: session", "no warning"],
        },
        {
          name: "user-9902",
          meta: "Enrolled 2026-01-27 · session Approved",
          tag: "Similar",
          tone: "neutral",
          score: "61.5",
          avatar: FLAG("gb"),
          detail:
            "Distant neighbour, included only to show the similarity distribution the decision sits in.",
          tags: ["source: session", "no warning"],
        },
      ],
    },
    trace: [
      {
        label: "Probe embedded",
        detail: "largest detected face in user_image embedded",
        ms: "90ms",
        ok: true,
      },
      {
        label: "Index searched",
        detail:
          "application-scoped index · sessions, imported profiles and list entries",
        ms: "240ms",
        ok: true,
      },
      {
        label: "Candidates ranked",
        detail: "blocklisted entries first, then similarity",
        ms: "110ms",
        ok: true,
      },
      {
        label: "Warnings evaluated",
        detail: "FACE_IN_BLOCKLIST raised on the top match",
        ms: "5ms",
        ok: false,
      },
      {
        label: "Decision",
        detail:
          "Declined - blocklisted face, session persisted for the audit trail",
        ms: "8ms",
        ok: false,
      },
    ],
    response: `{
  "request_id": "7d2c81af-…",
  "face_search": {
    "status": "Declined",
    "total_matches": 3,
    "matches": [
      {
        "session_id": "…",
        "similarity_percentage": 97.8,
        "source": "session",
        "vendor_data": "user-4471",
        "status": "Declined",
        "is_blocklisted": true,
        "is_allowlisted": false
      }
    ],
    "warnings": [{ "risk": "FACE_IN_BLOCKLIST", "log_type": "error" }]
  }
}`,
  },
  {
    id: "captcha",
    category: "Fraud",
    mode: "hosted",
    icon: M("face-match"),
    title: "Didit CAPTCHA",
    subtitle: "Liveness instead of puzzles",
    blurb:
      "A bot wall users don't hate: one face check replaces the grid of blurry traffic lights.",
    longDescription:
      "A CAPTCHA powered by liveness verification. Users complete a quick face check instead of solving puzzles - better experience, and far harder to farm out than image grids. Requires a liveness-only workflow in the console.",
    chips: ["Bot resistance", "Drop-in widget", "Liveness-backed"],
    price: "Free · 500 liveness checks / month",
    cta: "Try the widget",
    workflowId: "82f7360c-276e-4525-b7b3-59d8051e973c",
    note: "The dedicated CAPTCHA liveness workflow, also used by /api/didit-captcha.",
    stats: [
      { value: "~3s", label: "To pass" },
      { value: "No puzzles", label: "For users" },
      { value: "Drop-in", label: "Component" },
    ],
    steps: [
      {
        title: "Drop in the component",
        body: "Mount the CAPTCHA where your form's submit gate lives.",
      },
      {
        title: "User passes a face check",
        body: "A passive liveness check runs in place of a puzzle, with a fallback for camera-less clients.",
      },
      {
        title: "Verify server-side",
        body: "Your backend confirms the returned token before accepting the form.",
      },
    ],
    modules: [
      { icon: M("liveness"), label: "Passive Liveness" },
      { icon: M("white-label"), label: "White Label" },
      { icon: D("api"), label: "Verify API" },
    ],
    bestFor: "Signup forms, giveaways and comment walls under bot pressure.",
    useCases: ["Signup forms", "Giveaways", "Ticketing", "Comment walls"],
    docsPath: "core-technology/liveness/overview",
    response: `{
  "status": "Approved",
  "features": ["LIVENESS"],
  "liveness_checks": [
    { "status": "Approved", "method": "PASSIVE", "score": 97.4 }
  ]
}`,
  },
  {
    id: "ip",
    category: "Fraud",
    mode: "api",
    icon: M("ip-analysis"),
    title: "IP & device analysis",
    subtitle: "Signals on every session",
    blurb:
      "VPN, data-centre and geo-distance signals attached to every verification you run.",
    longDescription:
      "Included with every workflow at no extra cost. We attach the network and device context of the session - VPN or Tor use, data-centre ranges, carrier, platform - plus the distance between the IP, the ID document's issuing state and the address on a proof-of-address document.",
    chips: ["VPN / Tor", "Data centre", "Geo distance"],
    price: "Free · 500 checks / month, then $0.03",
    cta: "Open sample signals",
    workflowId: null,
    stats: [
      { value: "Free", label: "With any flow" },
      { value: "3-point", label: "Geo distance" },
      { value: "Per session", label: "Attached" },
    ],
    steps: [
      {
        title: "Nothing to integrate",
        body: "Signals are collected during any session you already run.",
      },
      {
        title: "Read ip_analyses",
        body: "The block arrives with the decision payload - no second call.",
      },
      {
        title: "Threshold in your rules",
        body: "Use VPN, data-centre and distance flags in your own risk logic or in workflow branching.",
      },
    ],
    modules: [{ icon: M("ip-analysis"), label: "Device & IP Analysis" }],
    bestFor: "Any flow that needs cheap fraud context.",
    useCases: [
      "All industries",
      "Bonus abuse",
      "Account farming",
      "Geo compliance",
    ],
    docsPath: "core-technology/ip-analysis/overview",
    request: {
      method: "GET",
      url: `${V3}/session/{session_id}/decision/`,
      docsPath: "sessions-api/retrieve-session",
      note: "IP_ANALYSIS is a workflow feature on the free tier, not a separate call - the signals arrive inside ip_analyses on the session decision you already fetch.",
      body: "",
    },
    sample: {
      verdict: "2 signals raised",
      summary:
        "Session completed from a data-centre range 1,840 km from the document's issuing state",
      score: "2",
      scoreLabel: "Signals",
      tone: "review",
      sections: [
        {
          title: "ip_analyses[0]",
          rows: [
            { key: "ip_address", value: "185.•••.•••.42", strong: true },
            { key: "ip_city / ip_country", value: "Frankfurt, Germany" },
            { key: "isp", value: "Hetzner Online GmbH" },
            {
              key: "is_vpn_or_tor",
              value: "true",
              tone: "declined",
              strong: true,
            },
            {
              key: "is_data_center",
              value: "true",
              tone: "declined",
              strong: true,
            },
            { key: "device_brand / browser_family", value: "Apple · Safari" },
          ],
        },
      ],
      listTitle: "Location cross-check",
      items: [
        {
          name: "IP vs ID document",
          meta: "1,840 km apart · document issued in Spain",
          tag: "Signal",
          tone: "review",
          score: "1840",
          avatar: FLAG("es"),
          detail:
            "The session's IP resolves to Germany while the presented ID was issued in Spain. Not conclusive on its own - travel and remote work are ordinary - but paired with the data-centre flag it is worth a rule.",
          tags: ["locations_info.id_document", "1840 km"],
        },
        {
          name: "IP vs proof of address",
          meta: "No PoA in this workflow",
          tag: "N/A",
          tone: "neutral",
          score: "—",
          avatar: FLAG("nl"),
          detail:
            "The three-point cross-check needs a proof-of-address document in the same session. Add the PoA module to populate locations_info.poa_document.",
          tags: ["poa_document absent"],
        },
      ],
    },
    trace: [
      {
        label: "Session context captured",
        detail: "request headers, IP and device fingerprint",
        ms: "6ms",
        ok: true,
      },
      {
        label: "IP intelligence",
        detail: "Hetzner Online range · data centre true",
        ms: "90ms",
        ok: false,
      },
      {
        label: "VPN / Tor heuristics",
        detail: "true - commercial VPN exit",
        ms: "40ms",
        ok: false,
      },
      {
        label: "Geo cross-check",
        detail: "IP (Frankfurt) vs ID issuing state (Spain) · 1,840 km",
        ms: "15ms",
        ok: false,
      },
      {
        label: "Signals attached",
        detail: "2 signals written into ip_analyses on the decision",
        ms: "5ms",
        ok: true,
      },
    ],
    response: `{
  "ip_analyses": [
    {
      "status": "In Review",
      "ip_country": "Germany",
      "ip_city": "Frankfurt",
      "is_vpn_or_tor": true,
      "is_data_center": true,
      "device_brand": "Apple",
      "browser_family": "Safari",
      "locations_info": {
        "id_document": { "distance_from_ip": 1840 }
      }
    }
  ]
}`,
  },
];

export const CATEGORY_ORDER: DemoCategory[] = [
  "KYC",
  "KYB",
  "Monitoring",
  "Fraud",
];

export const CATEGORY_META: Record<
  DemoCategory,
  { label: string; title: string; meta: string }
> = {
  KYC: {
    label: "KYC",
    title: "User verification · KYC",
    meta: "Launch on this device - the session opens in the Didit SDK modal",
  },
  KYB: {
    label: "KYB",
    title: "Business verification · KYB",
    meta: "Server-side flows - click through a sample case",
  },
  Monitoring: {
    label: "Monitoring",
    title: "Monitoring & compliance",
    meta: "API-first - sample payloads with the real field names",
  },
  Fraud: {
    label: "Fraud & security",
    title: "Fraud & security",
    meta: "Signals and gates that sit around the flows",
  },
};

export const HERO_STATS: DemoStat[] = [
  { value: String(DEMOS.length), label: "Live demos" },
  { value: "25+", label: "Modules" },
  { value: "220+", label: "Countries" },
  { value: "1.8s", label: "P95 decision" },
];

/**
 * The adaptive-age workflow rendered as a node graph in the "compose any flow"
 * section - the same branching the `age` demo runs.
 */
export const FLOW_NODES = [
  {
    label: "Selfie · age estimation",
    condition: "always",
    icon: M("age-estimation-18"),
    tone: "neutral" as const,
  },
  {
    label: "Estimated age ≥ 26",
    condition: "→ approve",
    icon: M("workflows"),
    tone: "approved" as const,
  },
  {
    label: "Estimated age 15-25",
    condition: "→ ID scan",
    icon: M("id-scan"),
    tone: "info" as const,
  },
  {
    label: "Estimated age < 15",
    condition: "→ decline",
    icon: M("workflows"),
    tone: "declined" as const,
  },
  {
    label: "IP analysis",
    condition: "on every branch",
    icon: M("ip-analysis"),
    tone: "neutral" as const,
  },
];

export function getDemo(id: string | null): Demo | null {
  if (!id) return null;

  return DEMOS.find((demo) => demo.id === id) ?? null;
}

export function demoDocsUrl(demo: Demo): string {
  return docs(demo.docsPath);
}

export function requestDocsUrl(request: ApiRequest): string {
  return docs(request.docsPath);
}

/** Does this demo have a workflow we can actually create a session for? */
export function isLaunchable(demo: Demo): boolean {
  return demo.mode === "hosted" && !!demo.workflowId;
}

/** Free-text + category filter over the catalogue. */
export function filterDemos(
  category: DemoCategory | "All",
  query: string,
): Demo[] {
  const q = query.trim().toLowerCase();

  return DEMOS.filter((demo) => {
    if (category !== "All" && demo.category !== category) return false;
    if (!q) return true;

    const haystack = [
      demo.title,
      demo.subtitle,
      demo.blurb,
      demo.category,
      demo.chips.join(" "),
      demo.modules.map((m) => m.label).join(" "),
      demo.useCases.join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function countByCategory(): Record<DemoCategory | "All", number> {
  const counts = { All: DEMOS.length } as Record<DemoCategory | "All", number>;

  for (const category of CATEGORY_ORDER) {
    counts[category] = DEMOS.filter((d) => d.category === category).length;
  }

  return counts;
}

/** cURL snippet for the hosted session endpoint every hosted demo uses. */
export function hostedCurl(workflowId: string): string {
  return `curl -X POST ${V3}/session/ \\
  -H "x-api-key: $DIDIT_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow_id": "${workflowId}",
    "vendor_data": "550e8400-e29b-41d4-a716-446655440000",
    "callback": "${CALLBACK_URL}",
    "callback_method": "both",
    "language": "en"
  }'`;
}

/** Node snippet for the same call. */
export function hostedNode(workflowId: string): string {
  return `const res = await fetch("${V3}/session/", {
  method: "POST",
  headers: {
    "x-api-key": process.env.DIDIT_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    workflow_id: "${workflowId}",
    // stable id of the user (or business) in your system - never random per attempt
    vendor_data: "550e8400-e29b-41d4-a716-446655440000",
    callback: "${CALLBACK_URL}",
  }),
});

const { session_id, session_kind, url } = await res.json();
// send the user to url, or open it with @didit-protocol/sdk-web`;
}

export function apiCurl(request: ApiRequest): string {
  // multipart bodies are shown as field lines, not JSON - -F per field.
  if (request.body.startsWith("# multipart/form-data")) {
    const fields = request.body
      .split("\n")
      .slice(1)
      .filter(Boolean)
      .map((line) => ` \\\n  -F "${line}"`)
      .join("");

    return `curl -X ${request.method} "${request.url}" \\\n  -H "x-api-key: $DIDIT_API_KEY"${fields}`;
  }

  return (
    `curl -X ${request.method} "${request.url}" \\\n  -H "x-api-key: $DIDIT_API_KEY"` +
    (request.body
      ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${request.body}'`
      : "")
  );
}

export function apiNode(request: ApiRequest): string {
  if (request.body.startsWith("# multipart/form-data")) {
    return `const form = new FormData();

form.append("user_image", fileFromYourUpload);
form.append("search_type", "blocklisted_or_approved");
form.append("vendor_data", "user-8821");

const res = await fetch("${request.url}", {
  method: "${request.method}",
  headers: { "x-api-key": process.env.DIDIT_API_KEY },
  body: form,
});

const decision = await res.json();`;
  }

  return (
    `const res = await fetch("${request.url}", {\n  method: "${request.method}",\n  headers: {\n    "x-api-key": process.env.DIDIT_API_KEY,\n` +
    (request.body ? `    "Content-Type": "application/json",\n` : "") +
    "  },\n" +
    (request.body ? `  body: JSON.stringify(${request.body}),\n` : "") +
    "});\n\nconst decision = await res.json();"
  );
}

/** The snippet shown on a demo's Integrate tab, for the selected language. */
export function snippetFor(demo: Demo, language: "curl" | "node"): string {
  if (demo.request) {
    return language === "curl" ? apiCurl(demo.request) : apiNode(demo.request);
  }
  const workflowId = demo.workflowId ?? "<your-workflow-id>";

  return language === "curl" ? hostedCurl(workflowId) : hostedNode(workflowId);
}
