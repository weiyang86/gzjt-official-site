const directusUrl = process.env.DIRECTUS_URL?.replace(/\/+$/, '');

export class CmsRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'CmsRequestError';
  }
}

export const buildDirectusAssetUrl = (assetId?: string | null) => {
  if (!assetId || !directusUrl) return '';
  if (/^https?:\/\//i.test(assetId)) return assetId;
  return `${directusUrl}/assets/${encodeURIComponent(assetId)}`;
};

type NextRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

export async function cmsFetch<T>(pathname: string, init?: NextRequestInit): Promise<T> {
  if (!directusUrl) {
    throw new CmsRequestError('DIRECTUS_URL is not configured.', 500);
  }

  const response = await fetch(`${directusUrl}${pathname}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
    next: {
      revalidate: 300,
      ...init?.next,
    },
  });

  if (!response.ok) {
    throw new CmsRequestError(`Directus request failed: ${pathname}`, response.status);
  }

  return response.json() as Promise<T>;
}
