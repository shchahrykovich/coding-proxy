import type { Metadata } from "next";
import "./globals.css";
import {SessionProvider} from "next-auth/react";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import '@ant-design/v5-patch-for-react-19';

export const metadata: Metadata = {
  title: "Coding Proxy",
  description: "Coding Proxy",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <SessionProvider>
          <AntdRegistry>{children}</AntdRegistry>
        </SessionProvider>
      </body>
    </html>
  );
}
