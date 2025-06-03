
import type {Metadata} from 'next';
import { Roboto } from 'next/font/google'; // Import Roboto
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider

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
  icons: '/app_icon.png',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} antialiased`}>
        <AuthProvider> {/* Wrap children with AuthProvider */}
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
