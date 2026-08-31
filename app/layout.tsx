import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Lord Sri Venkateshwara | Tirumala Balaji Virtual Darshan";
const description =
  "A cinematic scroll-driven virtual pilgrimage through temple doors, mandapam, sanctum darshan, history, festivals, and the final Govinda Govinda blessing.";

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
    applicationName: "Tirumala Balaji Virtual Darshan",
    keywords: [
      "Lord Sri Venkateshwara",
      "Tirumala Balaji",
      "Govinda Govinda",
      "virtual darshan",
      "Tirupati",
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
          alt: "Cinematic Tirumala Balaji virtual darshan social preview",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
