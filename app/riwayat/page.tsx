import type { Metadata } from "next";
import { Screen } from "@/components/app/screen";
import { HistoryScreen } from "@/components/history/history-screen";

export const metadata: Metadata = {
  title: "Riwayat",
  description: "Link yang pernah dibaca WeeLink di perangkat ini.",
};

export default function HistoryPage() {
  return (
    <Screen className="mx-auto w-full max-w-2xl">
      <HistoryScreen />
    </Screen>
  );
}
