import { getDb } from './db';
import { generateLocalEmbedding } from './embeddings';
import { hashUrl } from './feed-parser';

export interface SeedSource {
  id: string;
  siteName: string;
  siteUrl: string;
  feedUrl: string;
}

export const SEED_SOURCES: SeedSource[] = [
  {
    id: 'source-danluu',
    siteName: 'Dan Luu',
    siteUrl: 'https://danluu.com',
    feedUrl: 'https://danluu.com/atom.xml',
  },
  {
    id: 'source-cloudflare',
    siteName: 'Cloudflare Engineering',
    siteUrl: 'https://blog.cloudflare.com',
    feedUrl: 'https://blog.cloudflare.com/rss/',
  },
  {
    id: 'source-mitchellh',
    siteName: 'Mitchell Hashimoto',
    siteUrl: 'https://mitchellh.com',
    feedUrl: 'https://mitchellh.com/feed.xml',
  },
  {
    id: 'source-flyio',
    siteName: 'Fly.io Phoenix & Infra',
    siteUrl: 'https://fly.io/blog',
    feedUrl: 'https://fly.io/blog/feed.xml',
  },
  {
    id: 'source-netflix',
    siteName: 'Netflix TechBlog',
    siteUrl: 'https://netflixtechblog.com',
    feedUrl: 'https://netflixtechblog.com/feed',
  },
];

export const INITIAL_POSTS = [
  {
    title: 'Optimizing Raft Consensus in High-Throughput Scenarios',
    sourceId: 'source-danluu',
    author: 'Dan Luu',
    canonicalUrl: 'https://danluu.com/raft-opt',
    hoursAgo: 4,
    tags: ['distributed-systems', 'raft', 'concurrency', 'low-latency'],
    summary: 'A deep dive into reducing log synchronization overhead across distributed clusters. Examines pipelined replication, batching strategies, and reducing tail latency in Raft state machines.',
    content: `# Optimizing Raft Consensus in High-Throughput Scenarios

In distributed storage systems, consensus algorithms like Raft and Multi-Paxos are foundational to maintaining a consistent replicated state machine. However, standard textbook implementations often suffer from performance bottlenecks under high write volume.

## Pipelined AppendEntries

In naive Raft, a leader issues an \`AppendEntries\` RPC to followers and waits for round-trip acknowledgment before submitting the next batch. In high-throughput settings, this serialized handshake wastes precious network bandwidth.

\`\`\`go
type RaftNode struct {
    mu         sync.Mutex
    currentTerm int
    log        []LogEntry
    nextIndex  []int
    matchIndex []int
}

func (r *RaftNode) sendAppendEntriesPipelined(peer int, entries []LogEntry) {
    // Non-blocking pipeline dispatch
    go func() {
        reply := r.rpcClient.CallAppend(peer, entries)
        r.handleAppendReply(peer, reply)
    }()
}
\`\`\`

By decoupling RPC dispatch from heartbeat verification, we achieve near wire-speed write throughput without compromising linearizability guarantees.

## Memory Footprint & Zero-Copy Batching

State machine entries should be memory mapped and serialized using zero-copy byte buffers. Passing raw slices through channels directly to the network socket eliminates double buffering.
`,
  },
  {
    title: 'Building a Lock-Free Ring Buffer in Go: Cache Lines and False Sharing',
    sourceId: 'source-danluu',
    author: 'Dan Luu',
    canonicalUrl: 'https://danluu.com/lockfree-ring-buffer',
    hoursAgo: 14,
    tags: ['golang', 'concurrency', 'low-latency', 'architecture'],
    summary: 'Explores hardware cache coherence protocols (MESI) and how improper struct padding in Go leads to false sharing across CPU cores in concurrent queues.',
    content: `# Building a Lock-Free Ring Buffer in Go

Modern x86-64 and ARM64 CPUs communicate through cache coherency protocols. When two goroutines running on separate CPU cores access distinct variables that reside within the same 64-byte cache line, the CPU hardware invalidates the cache line continuously.

\`\`\`go
type FastRingQueue struct {
    head     uint64
    _pad0    [56]byte // Prevents false sharing with tail
    tail     uint64
    _pad1    [56]byte
    buffer   []unsafe.Pointer
}
\`\`\`

By introducing explicit padding to span across cache line boundaries, atomic CAS operations execute 4.8x faster under 16-core contention tests.
`,
  },
  {
    title: 'How Cloudflare Mitigated a 3.8 Tbps DDoS Attack with eBPF and XDP',
    sourceId: 'source-cloudflare',
    author: 'Cloudflare Radar Team',
    canonicalUrl: 'https://blog.cloudflare.com/mitigating-3-8tbps-ddos-ebpf',
    hoursAgo: 26,
    tags: ['linux-kernel', 'networking', 'security', 'low-latency'],
    summary: 'An architectural review of L4 packet filtering directly in the Linux network driver using extended Berkeley Packet Filters (eBPF) and eXpress Data Path (XDP).',
    content: `# Mitigating a 3.8 Tbps DDoS Attack with eBPF and XDP

Recently, Cloudflare edge servers absorbed and deflected a hyper-volumetric 3.8 Tbps UDP flood attack. In traditional Linux network stacks, processing 400 million packets per second would exhaust kernel socket buffer ring buffers.

## The Power of XDP (eXpress Data Path)

With XDP, BPF bytecodes run inside the network interface card driver before the kernel allocates \`sk_buff\` descriptors:

\`\`\`c
SEC("xdp")
int xdp_drop_ddos(struct xdp_md *ctx) {
    void *data = (void *)(long)ctx->data;
    void *data_end = (void *)(long)ctx->data_end;
    
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;
        
    if (eth->h_proto == bpf_htons(ETH_P_IP)) {
        // Inspect payload and perform sub-microsecond rate limit
        return XDP_DROP;
    }
    return XDP_PASS;
}
\`\`\`

Dropping malicious packets at wire-speed protected upstream origin servers with zero noticeable packet jitter.
`,
  },
  {
    title: 'Inside LSM Tree Compaction: Levelled vs Size-Tiered Storage Internals',
    sourceId: 'source-mitchellh',
    author: 'Mitchell Hashimoto',
    canonicalUrl: 'https://mitchellh.com/writing/lsm-tree-compaction',
    hoursAgo: 48,
    tags: ['database', 'distributed-systems', 'architecture'],
    summary: 'A comprehensive study of Log-Structured Merge (LSM) trees, write amplification tradeoffs, Bloom filters, and compaction algorithms in high-write transactional databases.',
    content: `# Inside LSM Tree Compaction: Levelled vs Size-Tiered

Log-Structured Merge trees are the storage backbone behind RocksDB, Cassandra, Pebble, and CockroachDB. By converting random writes into sequential disk flushes, they optimize for NVMe write characteristics.

## Write Amplification vs Read Amplification

When SSTables multiply on disk, point queries require checking multiple levels. Bloom filters minimize unnecessary disk seeks:

1. Size-Tiered Compaction: Groups SSTables of similar sizes. Excellent write performance, higher disk space overhead.
2. Levelled Compaction (RocksDB style): Strict non-overlapping keys per level. Lower read amplification, higher write amplification during background compaction merges.
`,
  },
  {
    title: 'Designing Resilient Distributed Workflows with Saga Orchestration',
    sourceId: 'source-netflix',
    author: 'Netflix Studio Engineering',
    canonicalUrl: 'https://netflixtechblog.com/designing-resilient-saga-workflows',
    hoursAgo: 72,
    tags: ['architecture', 'distributed-systems'],
    summary: 'How Netflix orchestrates long-running multi-region asynchronous media encoding pipelines using compensation transactions and event-driven state machines.',
    content: `# Designing Resilient Distributed Workflows

When coordinating media processing across hundreds of microservices, distributed 2-Phase Commit (2PC) does not scale across network boundaries.

We leverage the Saga pattern with dedicated orchestrator state machines:
- Forward actions transition steps sequentially
- Compensating transactions rollback state upon failure
- Idempotency tokens guarantee safe retries across intermittent network partitions.
`,
  },
  {
    title: 'Zero-Allocation JSON Parsing and SIMD Acceleration in Go',
    sourceId: 'source-flyio',
    author: 'Fly.io Engineering',
    canonicalUrl: 'https://fly.io/blog/zero-alloc-json-simd',
    hoursAgo: 96,
    tags: ['golang', 'low-latency', 'architecture'],
    summary: 'Benchmarking AVX-512 vector instructions and structural indexing to parse multi-gigabyte JSON log streams with zero heap allocations.',
    content: `# Zero-Allocation JSON Parsing with SIMD

In our log shipping agent, parsing JSON events consumed 35% of total CPU cycles in garbage collection sweeps. Standard \`encoding/json\` reflects over interface types and allocates small memory buffers for each field.

By adopting SIMD-accelerated bitmask scanning (simdjson), the parser locates quotes, braces, and colons in 64-byte chunks simultaneously, bypassing standard string heap allocation entirely.
`,
  },
];

export async function seedInitialData() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const alreadySeeded = db.prepare('SELECT value FROM app_state WHERE key = ?').get('has_seeded');
  if (alreadySeeded) {
    return;
  }

  db.prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)').run('has_seeded', '1');

  // 1. Insert seed sources
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO sources (id, site_name, site_url, feed_url, is_active, last_polled_at, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
  `);

  for (const src of SEED_SOURCES) {
    insertSource.run(src.id, src.siteName, src.siteUrl, src.feedUrl);
  }

  // 2. Insert initial sample posts
  const insertPost = db.prepare(`
    INSERT OR IGNORE INTO posts (
      id, source_id, title, canonical_url, author, content_raw, content_cleaned,
      summary, reading_time_minutes, tags, published_at, embedding, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  for (const p of INITIAL_POSTS) {
    const postId = hashUrl(p.canonicalUrl);
    const pubDate = new Date(Date.now() - p.hoursAgo * 60 * 60 * 1000).toISOString();
    const textToEmbed = `${p.title}. ${p.summary}`;
    const embedding = generateLocalEmbedding(textToEmbed);

    insertPost.run(
      postId,
      p.sourceId,
      p.title,
      p.canonicalUrl,
      p.author,
      p.content,
      p.content,
      p.summary,
      Math.max(3, Math.ceil(p.content.split(/\s+/).length / 200)),
      JSON.stringify(p.tags),
      pubDate,
      JSON.stringify(embedding)
    );
  }
}
