import type { ReactNode } from 'react';

export const metadata = {
  title: 'AI Persona',
  description: 'A RAG-grounded AI representative you can chat with.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          background: '#0b0c10',
          color: '#e8e8ea',
        }}
      >
        {children}
      </body>
    </html>
  );
}
