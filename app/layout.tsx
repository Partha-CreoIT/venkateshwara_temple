import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { fontClassName } from "./fonts";
import "./globals.css";

const title = "Sri Lakshmi Venkataramana Devamandira | Shivamogga";
const description =
  "A cinematic scroll journey into Sri Lakshmi Venkataramana Devamandira, Panchavathi Colony, Shivamogga — from the street, under the festival arch, through the mantapa and main hall, to the sanctum darshan.";

async function metadataBaseFromRequest() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? "https";

  return new URL(`${protocol}://${host}`);
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await metadataBaseFromRequest();

  return {
    metadataBase,
    title,
    description,
    applicationName: "Sri Lakshmi Venkataramana Devamandira",
    keywords: [
      "Sri Lakshmi Venkataramana Devamandira",
      "Venkataramana temple Shivamogga",
      "Panchavathi Colony",
      "Gowda Saraswatha Samaja",
      "virtual darshan",
      "Shivamogga temple",
    ],
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Sri Lakshmi Venkataramana Devamandira scroll darshan preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
  };
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07060a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontClassName}>
      <body>{children}</body>
    </html>
  );
}
