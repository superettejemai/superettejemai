import "./globals.css";
import LayoutClient from "./layoutClient";
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';

const roboto = localFont({
  src: '../assets/fonts/roboto.ttf',
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: "ÆVE POS",
  description: "Point of Sale software - Powered by Afek Plus Technologies",
    icons: {
    icon: '/aeve.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="antialiased" style={{ fontFamily: 'var(--font-roboto)' }}>
        <LayoutClient>{children}<Analytics /></LayoutClient>
      </body>
    </html>
  );
}
