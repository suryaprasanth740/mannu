// Site photography (free Unsplash photos — https://unsplash.com/license).
const U = 'https://images.unsplash.com/';

export const SITE_PHOTOS = {
  hero: `${U}photo-1530507629858-e4977d30e9e0`, // woman harvesting rice
  farmerCta: `${U}photo-1559884743-74a57598c6c7`, // farmer carrying a basket through a rice field
  market: `${U}photo-1775677073681-194049b1a7d3`, // vegetables on display at a market
  auth: `${U}photo-1528693404014-b13ebe6e723e`, // farmer standing in a rice field
  calendar: `${U}photo-1782391657714-17256453cc9c`, // paddy field at sunset
};

/** Ask the image CDN for a size close to what is displayed. Other URLs are returned unchanged. */
export function sized(url, w) {
  if (!url || !url.includes('images.unsplash.com')) return url;
  const u = new URL(url);
  u.searchParams.set('w', String(w));
  u.searchParams.set('auto', 'format');
  u.searchParams.set('fit', 'crop');
  if (!u.searchParams.has('q')) u.searchParams.set('q', '70');
  return u.toString();
}

export function srcSet(url, widths = [320, 480, 720, 960]) {
  if (!url || !url.includes('images.unsplash.com')) return undefined;
  return widths.map((w) => `${sized(url, w)} ${w}w`).join(', ');
}

/** Inline style for a full-bleed photo background with a dark green wash for legible text. */
export function photoBg(url, w = 1800, wash = 'linear-gradient(90deg, rgba(11,46,26,.94) 0%, rgba(11,46,26,.78) 42%, rgba(11,46,26,.2) 100%)') {
  return { backgroundImage: `${wash}, url("${sized(url, w)}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
}
