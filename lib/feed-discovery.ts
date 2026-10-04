export interface DiscoveredFeed {
  feedUrl: string;
  siteUrl: string;
  siteName: string;
  feedType: 'rss' | 'atom' | 'direct';
}

/**
 * Auto-discovers RSS/Atom feed from a root URL or direct feed link.
 */
export async function discoverFeed(inputUrl: string): Promise<DiscoveredFeed> {
  let url = inputUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  const parsedUrl = new URL(url);
  const siteUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const siteName = parsedUrl.hostname.replace(/^www\./, '');

  // 1. First test if the URL itself is already a direct RSS/Atom feed
  try {
    const directResp = await fetch(url, {
      headers: {
        'User-Agent': 'CuratePulseBot/1.0 (+https://curatepulse.app/bot)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });

    if (directResp.ok) {
      const contentType = directResp.headers.get('content-type') || '';
      const text = await directResp.text();

      if (
        contentType.includes('xml') ||
        text.includes('<rss') ||
        text.includes('<feed') ||
        text.includes('xmlns="http://www.w3.org/2005/Atom"')
      ) {
        // Extract site name from feed if possible
        const titleMatch = text.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].trim() : '';
        const discoveredTitle = rawTitle.length > 0 ? rawTitle : siteName;

        return {
          feedUrl: url,
          siteUrl,
          siteName: discoveredTitle || siteName,
          feedType: text.includes('<feed') ? 'atom' : 'rss',
        };
      }

      // If it returned HTML, inspect for <link rel="alternate" type="application/rss+xml" ...>
      const feedLinkMatch = text.match(
        /<link[^>]+(?:type=["']application\/(rss\+xml|atom\+xml)["'][^>]+href=["']([^"']+)["']|href=["']([^"']+)["'][^>]+type=["']application\/(rss\+xml|atom\+xml)["'])[^>]*>/i
      );

      if (feedLinkMatch) {
        const discoveredHref = feedLinkMatch[2] || feedLinkMatch[3];
        const absoluteFeedUrl = new URL(discoveredHref, url).toString();
        const titleMatch = text.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
        const rawTitle = titleMatch ? titleMatch[1].trim() : '';
        const discoveredTitle = rawTitle.length > 0 ? rawTitle : siteName;

        return {
          feedUrl: absoluteFeedUrl,
          siteUrl,
          siteName: discoveredTitle || siteName,
          feedType: (feedLinkMatch[1] || feedLinkMatch[4]).includes('atom') ? 'atom' : 'rss',
        };
      }
    }
  } catch (err) {
    console.warn(`Direct fetch failed for ${url}, probing standard paths:`, err);
  }

  // 2. Fallback: probe common feed suffixes
  const commonCandidates = [
    '/feed',
    '/rss',
    '/atom.xml',
    '/rss.xml',
    '/feed.xml',
    '/index.xml',
  ];

  for (const candidate of commonCandidates) {
    try {
      const candidateUrl = new URL(candidate, siteUrl).toString();
      const resp = await fetch(candidateUrl, {
        headers: {
          'User-Agent': 'CuratePulseBot/1.0 (+https://curatepulse.app/bot)',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(4000),
      });

      if (resp.ok) {
        const text = await resp.text();
        if (text.includes('<rss') || text.includes('<feed')) {
          const titleMatch = text.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
          return {
            feedUrl: candidateUrl,
            siteUrl,
            siteName: titleMatch ? titleMatch[1].trim() : siteName,
            feedType: text.includes('<feed') ? 'atom' : 'rss',
          };
        }
      }
    } catch {
      // Continue probing next candidate
    }
  }

  // If no feed candidate succeeded, return input URL with direct type attempt
  return {
    feedUrl: url,
    siteUrl,
    siteName,
    feedType: 'direct',
  };
}
