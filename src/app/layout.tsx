import type { Metadata } from "next";
import { Toaster } from "sonner";
import './globals.css';
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "AI Meal — Super Admin Dashboard",
  description: "Administrative console for managing AI Meal users, subscriptions, payments, sponsors, and meals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
