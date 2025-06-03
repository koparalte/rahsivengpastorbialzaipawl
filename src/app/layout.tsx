
import type {Metadata} from 'next';
import { Roboto } from 'next/font/google'; // Import Roboto
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Configure Roboto
const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['400', '700'], // Specify desired weights
  subsets: ['latin'],
  display: 'swap', // Improves font loading behavior
});

export const metadata: Metadata = {
  title: 'Rahsiveng Pastor Bial Zaipawl',
  description: 'Zaipawl info',
  manifest: '/manifest.json',
  themeColor: '#98D2C0',
  icons: '/app_icon.png', // Added this line to reference the new icon
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply Roboto font variable to the body */}
      <body className={`${roboto.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
