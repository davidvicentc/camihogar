import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { FavoritesHydration } from "@/components/layout/favorites-hydration";
import { WhatsAppSettingsProvider } from "@/components/layout/whatsapp-settings-provider";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <WhatsAppSettingsProvider><div className="flex min-h-screen flex-col">
      <FavoritesHydration />
      <Navbar />
      {/* pb en móvil deja espacio para la Bottom App Bar fija */}
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
    </div></WhatsAppSettingsProvider>
  );
}
