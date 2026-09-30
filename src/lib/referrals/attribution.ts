export type Attribution = {
  source?: string;
  ref?: string;
  utm: Record<string, string>;
};

const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

export function attributionFromSearchParams(searchParams: URLSearchParams): Attribution {
  const utm: Record<string, string> = {};

  for (const key of utmKeys) {
    const value = searchParams.get(key);
    if (value) {
      utm[key] = value;
    }
  }

  return {
    source: searchParams.get("source") ?? searchParams.get("utm_source") ?? undefined,
    ref: searchParams.get("ref") ?? undefined,
    utm,
  };
}

