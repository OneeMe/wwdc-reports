const client = import.meta.env.PUBLIC_GOOGLE_ADSENSE_CLIENT?.trim();
const articleSlot = import.meta.env.PUBLIC_GOOGLE_ADSENSE_ARTICLE_SLOT?.trim();

interface DisabledGoogleAdsenseConfig {
  enabled: false;
}

interface EnabledGoogleAdsenseConfig {
  enabled: true;
  client: string;
  articleSlot: string;
}

export type GoogleAdsenseConfig =
  | DisabledGoogleAdsenseConfig
  | EnabledGoogleAdsenseConfig;

function isValidClient(value?: string): value is string {
  return /^ca-pub-\d+$/.test(value ?? "");
}

function isValidSlot(value?: string): value is string {
  return /^\d+$/.test(value ?? "");
}

export const googleAdsenseConfig: GoogleAdsenseConfig =
  import.meta.env.PROD &&
  import.meta.env.PUBLIC_GOOGLE_ADSENSE_ENABLED === "true" &&
  isValidClient(client) &&
  isValidSlot(articleSlot)
    ? { enabled: true, client, articleSlot }
    : { enabled: false };
