import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ecos de Equidad",
  description: "Sistema de gestión y control de asistencia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
      </body>
    </html>
  );
}