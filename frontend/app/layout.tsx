import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doctor Booking Demo",
  description: "Find a doctor and book an appointment (demo with dummy data)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav>
            <strong>Doctor Booking Demo</strong>
            <Link href="/">Find a doctor</Link>
            <Link href="/assistant">Clinic FAQ</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}