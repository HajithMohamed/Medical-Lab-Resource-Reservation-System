import * as React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground flex flex-col">{children}</div>;
}
