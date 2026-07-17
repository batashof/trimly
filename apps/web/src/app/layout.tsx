import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trimly',
  description: 'Book your next haircut in a few taps.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
