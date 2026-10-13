import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lab Resource Reservations",
  description: "Book shared lab instruments, cabinets, rooms and vans without clashes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
