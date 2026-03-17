import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GEO Monitor',
  description: 'Track brand visibility across LLMs',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${inter.className} bg-[#f5f5f3] min-h-screen`}>{children}</body>
    </html>
  );
}
