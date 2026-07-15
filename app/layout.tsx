import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Octa Document OS Migration Portal";
const description =
  "A deployable, read-only migration portal for Octa Local Web App operations.";

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const metadataBase = host ? new URL(`${protocol}://${host}`) : undefined;

  return {
    title,
    description,
    metadataBase,
    openGraph: {
      title,
      description,
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Octa Document OS Migration Portal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
