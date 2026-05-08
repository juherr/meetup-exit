export const PRIVACY_MODES = ["full", "no-email", "pseudonymized", "public-archive"] as const;
export type PrivacyMode = (typeof PRIVACY_MODES)[number];
