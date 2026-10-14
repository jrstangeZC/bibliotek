/**
 * Whether the demo data may be reset from the interface.
 *
 * On in development. Off in production unless deliberately switched on with
 * `ALLOW_DEMO_RESET=true` — deployed, this button lets any visitor wipe the
 * demo for everyone else, so it is not something to ship by accident.
 */
export const DEMO_RESET_ENABLED =
  process.env.NODE_ENV !== "production" ||
  process.env.ALLOW_DEMO_RESET === "true";
