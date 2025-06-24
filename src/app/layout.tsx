
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { isFirebaseConfigured } from '@/lib/firebase/clientApp';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'LEO Portal | Athugalpura',
  description: 'Leo Club Member Portal',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://i.imgur.com/MP1YFNf.png',
    apple: 'https://i.imgur.com/MP1YFNf.png',
  }
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
};

const FirebaseNotConfigured = () => (
  <div className="flex h-screen w-screen flex-col items-center justify-center bg-background p-4">
    <div className="flex max-w-lg flex-col items-center rounded-lg border border-destructive/50 bg-card p-8 text-center shadow-lg">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="mt-4 text-2xl font-bold text-destructive-foreground">Firebase Not Configured</h1>
      <p className="mt-2 text-muted-foreground">
        Your Firebase environment variables are missing. The app cannot connect to backend services.
      </p>
      <div className="mt-6 w-full rounded-md bg-muted p-4 text-left text-sm">
        <p className="font-semibold">How to fix:</p>
        <ol className="mt-2 list-inside list-decimal space-y-2">
          <li>Create a file named <strong><code>.env.local</code></strong> in the root of your project.</li>
          <li>Copy your Firebase configuration variables into it. You can get these from your Firebase project settings.</li>
          <pre className="mt-2 overflow-x-auto rounded-md bg-background p-2 text-xs">
            <code>
              {`NEXT_PUBLIC_FIREBASE_API_KEY="..."\n`}
              {`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."\n`}
              {`NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."\n`}
              {`NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."\n`}
              {`NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."\n`}
              {`NEXT_PUBLIC_FIREBASE_APP_ID="..."\n`}
              {`GOOGLE_API_KEY="..."`}
            </code>
          </pre>
          <li><strong>Important:</strong> Restart the development server for the changes to apply.</li>
        </ol>
      </div>
    </div>
  </div>
);


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        {!isFirebaseConfigured ? (
          <FirebaseNotConfigured />
        ) : (
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        )}
      </body>
    </html>
  );
}
