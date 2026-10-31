import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stepwell — Road to Devcon Indore Assurance Contract",
  description:
    "The meetup that only happens if we all chip in. Sixty students, one hall deposit, and a rule nobody has to trust Meera on.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#FBF7F4] text-[#1F1D1A]">
        {children}
      </body>
    </html>
  );
}
