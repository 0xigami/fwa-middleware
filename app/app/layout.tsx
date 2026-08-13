import type { Metadata } from "next";
import { Londrina_Solid } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const londrina = Londrina_Solid({ weight: ["300", "400", "900"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fake World Assets",
  description: "24 Nouns live on fwa.fun. Every exit path hardcoded back to the treasury.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={londrina.className}>
        <Providers>{children}</Providers>
        <footer className="footer">
          <span className="noggles">⌐◨-◨</span> FWA.WTF is a Nouns DAO experiment. Not financial advice, obviously.
        </footer>
      </body>
    </html>
  );
}
