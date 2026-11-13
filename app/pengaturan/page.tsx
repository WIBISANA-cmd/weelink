import type { Metadata } from "next";
import { Screen } from "@/components/app/screen";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Tema, getar, notifikasi, pemasangan, dan data WeeLink di perangkat ini.",
};

export default function SettingsPage() {
  return (
    <Screen className="mx-auto w-full max-w-2xl">
      <SettingsScreen />
    </Screen>
  );
}
