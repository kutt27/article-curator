import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CuratePulse | Personalized Content Aggregator & Semantic Reranker',
  description: 'AI-powered content aggregator and semantic reranker for technical engineering blogs.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Original+Surfer&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-ocean-950 text-ocean-100 antialiased selection:bg-surf-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
