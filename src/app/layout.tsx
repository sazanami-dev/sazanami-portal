"use client";

import { SessionProvider } from "next-auth/react";
import './globals.css';
import {Providers} from "./providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <html lang="ja">
        <body>
          <Providers>
            {children}
          </Providers>
        </body>
      </html>
    </SessionProvider>
  );
}
