import "~/styles/globals.css";

import { type Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "PCBuilder EU — Configuratore PC",
  description:
    "Componi il tuo PC con controllo di compatibilità e consumo stimato.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

// Plex: sans tecnica ma leggibile per l'interfaccia, mono solo per misure e dati.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-bg text-fg font-sans">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
