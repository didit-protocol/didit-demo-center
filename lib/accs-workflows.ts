/**
 * The two ACCS ISO/IEC 27566 workflows, read by the catalogue cards and by the
 * /accs assessor page, so both always launch the same workflow.
 *
 * ACCS conformance runs against the production engine. Staging cannot create a
 * session on a production workflow id (the API answers "Invalid workflow_id."),
 * so each one has a staging twin in the staging demo application with the same
 * steps, thresholds and actions.
 *
 * It deliberately has no runtime imports: `npm test` loads it straight from
 * Node, which strips the types but does not resolve paths.
 */

const isStaging = process.env.NEXT_PUBLIC_IS_STAGING === "true";

const pick = (production: string, staging: string) =>
  isStaging ? staging : production;

/** Facial age estimation, Challenge 25, passive liveness, no document fallback. */
export const ACCS_ESTIMATION_WORKFLOW_ID = pick(
  "2d958679-f3bf-4747-8a38-9a40a29a6098",
  "d444046b-af0d-4e5b-b3ca-95d08419e654",
);

/** Document age verification at 18, passive liveness and 1:1 face match. */
export const ACCS_VERIFICATION_WORKFLOW_ID = pick(
  "a8942aa3-3bfe-4e1c-b322-d0d43e7ec31f",
  "5f4d97b5-4d09-470c-836a-181c2db3d565",
);

/** The verification engine these sessions run on, named in the copy around them. */
export const ACCS_ENGINE = pick("production", "staging");

/** Shown under the workflow id in the catalogue, so a tester knows which engine ran. */
export const ACCS_WORKFLOW_NOTE = pick(
  "Production workflow - ACCS conformance runs against the production engine.",
  "Staging twin of the production ACCS workflow - same steps and thresholds.",
);
