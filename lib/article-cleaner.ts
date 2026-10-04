export interface CleanedArticle {
  cleanContent: string;
  summary: string;
  readingTimeMinutes: number;
  tags: string[];
}

const COMMON_TECH_TAGS = [
  { tag: 'distributed-systems', regex: /\b(distributed systems?|consensus|raft|paxos|partition|cap theorem|byzantine)\b/i },
  { tag: 'database', regex: /\b(databases?|sql|postgres|sqlite|lsm tree|b-tree|acid|indexing|replication|sharding)\b/i },
  { tag: 'concurrency', regex: /\b(concurrency|multithread\w*|goroutine|channels?|mutex|atomic|lock-free|async\w*)\b/i },
  { tag: 'low-latency', regex: /\b(low[- ]latency|cache coherence|cache-line|numa|zero-copy|profiling|latency)\b/i },
  { tag: 'linux-kernel', regex: /\b(linux kernel|ebpf|syscalls?|io_uring|memory management|cgroups|virtual memory)\b/i },
  { tag: 'networking', regex: /\b(networking|tcp|udp|http\/3|quic|load balancer|dns|bgp|sockets?)\b/i },
  { tag: 'rust', regex: /\b(rust|cargo|borrow checker|traits|ownership|lifetimes)\b/i },
  { tag: 'golang', regex: /\b(golang|go language|go routines|go runtime)\b/i },
  { tag: 'ml-infra', regex: /\b(ml infra|gpu|cuda|tensor|vllm|training cluster|inference|embeddings?|llms?)\b/i },
  { tag: 'architecture', regex: /\b(architecture|microservices|monolith|event-driven|cqrs|system design)\b/i },
  { tag: 'security', regex: /\b(security|cryptography|vulnerability|zero-day|auth|tls|encryption)\b/i },
  { tag: 'web-performance', regex: /\b(web performance|frontend|react|hydration|dom|browser rendering)\b/i },
];

/**
 * Strips HTML noise (scripts, styles, nav, ads, tracker pixels) and extracts clean readable markdown/text
 */
export function cleanHtmlBody(html: string): string {
  if (!html || typeof html !== 'string') return '';

  let cleaned = html
    // Remove unwanted blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Convert headings to markdown
  cleaned = cleaned.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n');
  cleaned = cleaned.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n');
  cleaned = cleaned.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n\n### $1\n\n');
  cleaned = cleaned.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n\n#### $1\n\n');

  // Convert code blocks
  cleaned = cleaned.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n\n```\n$1\n```\n\n');
  cleaned = cleaned.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n\n```\n$1\n```\n\n');
  cleaned = cleaned.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // Convert paragraphs and linebreaks
  cleaned = cleaned.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n\n$1\n\n');
  cleaned = cleaned.replace(/<br\s*[\/]?>/gi, '\n');
  cleaned = cleaned.replace(/<li[^>]*>(.*?)<\/li>/gi, '\n* $1');

  // Remove all other remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');

  // Clean excessive whitespace
  cleaned = cleaned
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned;
}

/**
 * Generates reading time, tags, and a 2-3 sentence technical summary.
 */
export function extractArticleMetadata(content: string, rawSummary?: string): CleanedArticle {
  const cleanContent = cleanHtmlBody(content);
  const words = cleanContent.split(/\s+/).filter(w => w.length > 0);
  const readingTimeMinutes = Math.max(1, Math.ceil(words.length / 220));

  // Determine summary: use cleaned rawSummary or generate from clean body
  let summary = '';
  if (rawSummary && rawSummary.trim().length > 30) {
    summary = cleanHtmlBody(rawSummary);
  }

  if (!summary || summary.length < 50) {
    // Extract first 2-3 substantial sentences from clean content
    const paragraphs = cleanContent.split('\n\n').map(p => p.trim()).filter(p => !p.startsWith('#') && p.length > 40);
    if (paragraphs.length > 0) {
      const sentences = paragraphs[0].match(/[^.!?]+[.!?]+(\s+|$)/g);
      if (sentences && sentences.length > 0) {
        summary = sentences.slice(0, 3).join(' ').trim();
      } else {
        summary = paragraphs[0].substring(0, 240) + '...';
      }
    }
  }

  // Cap summary to ~300 chars
  if (summary.length > 320) {
    summary = summary.substring(0, 317) + '...';
  }

  // Tag extraction
  const detectedTags: string[] = [];
  const fullTextToScan = `${cleanContent} ${summary}`;
  for (const { tag, regex } of COMMON_TECH_TAGS) {
    if (regex.test(fullTextToScan)) {
      detectedTags.push(tag);
    }
  }

  if (detectedTags.length === 0) {
    detectedTags.push('engineering', 'tech');
  }

  return {
    cleanContent,
    summary,
    readingTimeMinutes,
    tags: detectedTags.slice(0, 5),
  };
}

/**
 * Fetch full page body if the RSS feed supplies only an excerpt
 */
export async function fetchFullArticleBody(canonicalUrl: string): Promise<string> {
  try {
    const resp = await fetch(canonicalUrl, {
      headers: {
        'User-Agent': 'CuratePulseBot/1.0 (+https://curatepulse.app/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) return '';
    const html = await resp.text();

    // Look for article tag, main tag, or content container
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i) ||
                         html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ||
                         html.match(/<div\b[^>]*(?:post-content|entry-content|article-content|markdown)[^>]*>([\s\S]*?)<\/div>/i);

    if (articleMatch) {
      return articleMatch[1];
    }

    return html;
  } catch (err) {
    console.warn(`Failed to fetch full article body from ${canonicalUrl}:`, err);
    return '';
  }
}
