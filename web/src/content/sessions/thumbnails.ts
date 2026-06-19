const APPLE_THUMBNAIL_BASE = "https://devimages-cdn.apple.com/wwdc-services/images";

export function getAppleSessionThumbnailUrl(
  year: string,
  contentId: string,
  thumbnailUuids: Record<string, string>,
): string | null {
  const uuid = thumbnailUuids[year];
  if (!uuid) return null;
  return `${APPLE_THUMBNAIL_BASE}/${uuid}/${contentId}/${contentId}_wide_900x506_2x.jpg`;
}

export function resolveSessionThumbnailUrl(
  thumbnail: string | undefined,
  thumbnailUuids: Record<string, string>,
): string | undefined {
  if (!thumbnail) return undefined;

  const localSessionImage = thumbnail.match(/^\/images\/sessions\/(\d{4})\/([^/?#]+)\.jpg$/);
  if (!localSessionImage) return thumbnail;

  const [, year, contentId] = localSessionImage;
  return getAppleSessionThumbnailUrl(year, contentId, thumbnailUuids) ?? undefined;
}
