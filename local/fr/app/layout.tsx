import "./globals.css";
import LayoutClient from "./layoutClient";
import localFont from 'next/font/local';

const roboto = localFont({
  src: '../assets/fonts/roboto.ttf',
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata = {
  title: "ÆVE POS",
  description: "Point of Sale software - Powered by Afek Plus Technologies",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="antialiased" style={{ fontFamily: 'var(--font-roboto)' }}>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
