import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata = {
  title: 'SUS — Smart Utility Sentinel',
  description: 'Monitor dan kontrol AC pintar berbasis IoT. Real-time energy monitoring, scheduling, dan cost tracking.',
  keywords: 'smart home, AC monitoring, IoT, energy, PZEM, ESP32',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
