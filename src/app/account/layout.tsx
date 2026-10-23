import type { Metadata } from "next";

/** Account area is private — never compete with product pages in search. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
