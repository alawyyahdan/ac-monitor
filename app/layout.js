import { Outfit } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata = {
  title: 'AC Monitor — Smart Climate Control',
  description: 'Monitor dan kontrol AC pintar berbasis IoT. Real-time energy monitoring, scheduling, dan cost tracking.',
  keywords: 'AC monitor, smart home, AC control, IoT, energy, PZEM, ESP32',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
