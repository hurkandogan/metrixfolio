import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'MetrixFolio',
  description: 'Private portfolio analytics dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/assets/favicon.png" sizes="any" />
        <title>MetrixFolio</title>
      </head>
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
