"use client";

import { useCallback, useEffect, useId, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { ClearHistorySheet } from "@/components/history/clear-history-sheet";
import { applyUpdate, checkForUpdate, promptInstall, usePwa } from "@/components/pwa/pwa-store";
import {
  BellIcon,
  CheckIcon,
  CloudOffIcon,
  ContrastIcon,
  HistoryIcon,
  InstallIcon,
  MoonIcon,
  RetryIcon,
  SunIcon,
  VibrateIcon,
} from "@/components/ui/icons";
import { Switch } from "@/components/ui/switch";
import { formatBytes } from "@/lib/format";
import { historyStore } from "@/lib/history";
import { notifySupport } from "@/lib/notify";
import { APP_VERSION, BUILD_ID, SERVICE_WORKER_ENABLED, isIOS, isStandalone } from "@/lib/pwa";
import { canVibrate, haptic, settingsStore, updateSettings } from "@/lib/settings";
import { readThemeMode, setThemeMode, subscribeTheme, type ThemeMode } from "@/lib/theme";
import { showToast } from "@/lib/toast";

const noop = () => () => {};
const useIsClient = () => useSyncExternalStore(noop, () => true, () => false);

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="px-1 text-sm font-semibold text-muted">{title}</h2>
      <div className="neu-panel mt-3 rounded-[1.5rem] px-4 sm:px-5">{children}</div>
    </section>
  );
}

interface RowProps {
  Icon: ComponentType<{ size?: number }>;
  title: string;
  titleId?: string;
  hint?: ReactNode;
  hintId?: string;
  control?: ReactNode;
  children?: ReactNode;
}

function Row({ Icon, title, titleId, hint, hintId, control, children }: RowProps) {
  return (
    <div className="settings-row">
      <div className="flex items-center gap-3.5">
        <span className="neu-well grid size-11 shrink-0 place-items-center rounded-xl text-muted" aria-hidden="true">
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p id={titleId} className="font-semibold">
            {title}
          </p>
          {hint && (
            <p id={hintId} className="mt-0.5 text-sm text-muted">
              {hint}
            </p>
          )}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

const THEMES: { mode: ThemeMode; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { mode: "light", label: "Terang", Icon: SunIcon },
  { mode: "dark", label: "Gelap", Icon: MoonIcon },
  { mode: "system", label: "Sistem", Icon: ContrastIcon },
];

function ThemeRow() {
  const mode = useSyncExternalStore(subscribeTheme, readThemeMode, () => null);
  return (
    <Row Icon={ContrastIcon} title="Tema" hint="Sistem mengikuti mode terang atau gelap perangkat.">
      <fieldset>
        <legend className="sr-only">Tema</legend>
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map(({ mode: value, label, Icon }) => (
            <label key={value} className="block">
              <input
                type="radio"
                name="theme"
                value={value}
                checked={mode === value}
                onChange={() => {
                  haptic("tap");
                  setThemeMode(value);
                }}
                className="sr-only"
              />
              <span className="neu-key min-h-14 gap-1 text-sm font-semibold">
                <Icon size={18} />
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </Row>
  );
}

function BehaviorRows() {
  const settings = useSyncExternalStore(settingsStore.subscribe, settingsStore.get, () => null);
  const client = useIsClient();
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const hapticsId = useId();
  const notifyId = useId();
  const notifyHintId = useId();

  const vibrates = client && canVibrate();
  const support = client ? notifySupport(isIOS(), isStandalone()) : "unsupported";
  const currentPermission = permission ?? (client && support === "supported" ? Notification.permission : "default");

  async function toggleNotify(on: boolean) {
    if (!on) {
      updateSettings({ notify: false });
      return;
    }
    const result = currentPermission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      updateSettings({ notify: true });
      haptic("success");
    }
  }

  const notifyHint =
    support === "needs-install"
      ? "Di iPhone dan iPad, notifikasi hanya tersedia setelah WeeLink ditambahkan ke Layar Utama."
      : support === "unsupported"
        ? "Browser ini tidak mendukung notifikasi."
        : currentPermission === "denied"
          ? "Izin notifikasi diblokir. Izinkan lewat pengaturan situs di browser, lalu nyalakan lagi."
          : "Muncul kalau file selesai saat WeeLink sedang tidak dibuka, berguna untuk video panjang.";

  return (
    <>
      <Row
        Icon={VibrateIcon}
        title="Getar saat menekan"
        titleId={hapticsId}
        hint={client && !vibrates ? "Perangkat atau browser ini tidak mendukung getar." : "Getar singkat saat link terbaca, file tersimpan, atau ada error."}
        control={
          <Switch
            labelledBy={hapticsId}
            checked={Boolean(settings?.haptics && vibrates)}
            disabled={!vibrates}
            onChange={(on) => {
              updateSettings({ haptics: on });
              if (on) haptic("tap");
            }}
          />
        }
      />
      <Row
        Icon={BellIcon}
        title="Beri tahu saat file siap"
        titleId={notifyId}
        hint={notifyHint}
        hintId={notifyHintId}
        control={
          <Switch
            labelledBy={notifyId}
            describedBy={notifyHintId}
            checked={Boolean(settings?.notify && currentPermission === "granted")}
            disabled={support !== "supported" || currentPermission === "denied"}
            onChange={toggleNotify}
          />
        }
      />
    </>
  );
}

function InstallRow() {
  const { install } = usePwa();
  const statusText: Record<typeof install, string> = {
    unknown: "Memeriksa dukungan browser...",
    prompt: "Buka dari layar utama atau menu aplikasi, di jendelanya sendiri.",
    ios: "Tambahkan ke Layar Utama lewat menu Bagikan di Safari.",
    "mac-safari": "Tambahkan ke Dock lewat menu File di Safari.",
    installed: "Terpasang di perangkat ini.",
    unsupported: "Pemasangan tidak ditawarkan di browser ini, atau WeeLink sudah terpasang. Di Chrome dan Edge, cek ikon pasang di bilah alamat.",
  };
  const action =
    install === "prompt" ? "Pasang" : install === "ios" || install === "mac-safari" ? "Cara pasang" : null;

  return (
    <Row
      Icon={InstallIcon}
      title="Aplikasi WeeLink"
      hint={statusText[install]}
      control={
        action ? (
          <button type="button" onClick={() => promptInstall()} className="neu-btn px-4 text-sm">
            {action}
          </button>
        ) : install === "installed" ? (
          <CheckIcon size={20} className="text-accent" aria-label="Terpasang" />
        ) : null
      }
    />
  );
}

function UpdateRow() {
  const { update } = usePwa();
  const versionLabel = `Versi ${APP_VERSION} · build ${BUILD_ID}`;

  let control: ReactNode = null;
  let hint: string = versionLabel;
  if (update === "unsupported") {
    hint = `${versionLabel}. ${SERVICE_WORKER_ENABLED ? "Browser ini tidak mendukung pembaruan di latar belakang." : "Pembaruan otomatis hanya aktif di build produksi."}`;
  } else if (update === "ready") {
    hint = `${versionLabel}. Versi baru sudah diunduh.`;
    control = (
      <button type="button" onClick={applyUpdate} className="neu-primary min-h-11 px-4 text-sm">
        Muat ulang
      </button>
    );
  } else {
    if (update === "current") hint = `${versionLabel}. Sudah versi terbaru.`;
    control = (
      <button type="button" onClick={() => checkForUpdate()} disabled={update === "checking"} aria-busy={update === "checking"} className="neu-btn px-4 text-sm">
        {update === "checking" ? "Memeriksa..." : "Periksa"}
      </button>
    );
  }

  return <Row Icon={RetryIcon} title="Pembaruan" hint={hint} control={control} />;
}

function OfflineDataRow() {
  const client = useIsClient();
  const [usage, setUsage] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const measure = useCallback(() => {
    navigator.storage
      ?.estimate?.()
      .then((estimate) => setUsage(estimate.usage ?? null))
      .catch(() => setUsage(null));
  }, []);

  useEffect(measure, [measure]);

  if (client && !("caches" in window)) return null;

  async function clear() {
    setBusy(true);
    try {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith("weelink-")).map((n) => caches.delete(n)));
      showToast({ message: "Data offline dihapus. Layar akan diunduh ulang saat dibuka.", tone: "success" });
    } catch {
      showToast({ message: "Data offline gagal dihapus. Coba lagi.", tone: "danger" });
    } finally {
      setBusy(false);
      measure();
    }
  }

  return (
    <Row
      Icon={CloudOffIcon}
      title="Data offline"
      hint={
        usage !== null
          ? `${formatBytes(Math.max(usage, 1024))} dipakai di perangkat ini, supaya layar tetap terbuka tanpa internet.`
          : "Salinan layar supaya WeeLink tetap terbuka tanpa internet."
      }
      control={
        <button type="button" onClick={clear} disabled={busy} aria-busy={busy} className="neu-btn px-4 text-sm">
          {busy ? "Menghapus..." : "Hapus"}
        </button>
      }
    />
  );
}

function HistoryRowSetting() {
  const items = useSyncExternalStore(historyStore.subscribe, historyStore.get, () => null);
  const [open, setOpen] = useState(false);
  const count = items?.length ?? 0;
  return (
    <>
      <Row
        Icon={HistoryIcon}
        title="Riwayat"
        hint={items === null ? "Memuat..." : count ? `${count} link tersimpan di perangkat ini.` : "Belum ada link yang tersimpan."}
        control={
          <button type="button" onClick={() => setOpen(true)} disabled={!count} className="neu-btn px-4 text-sm text-danger hover:text-danger disabled:text-muted">
            Hapus
          </button>
        }
      />
      <ClearHistorySheet open={open} onClose={() => setOpen(false)} count={count} />
    </>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="neu-btn pointer-events-none inline-flex min-h-8 min-w-8 rounded-lg px-2 font-sans text-xs">{children}</kbd>;
}

export function SettingsScreen() {
  return (
    <div className="grid gap-8 pt-2 pb-12 sm:pt-6 lg:pt-12">
      <div>
        <h1 className="text-[clamp(1.75rem,7vw,2.25rem)] leading-tight font-extrabold tracking-tight">Pengaturan</h1>
        <p className="mt-1 text-sm text-muted">Semua pilihan di sini hanya berlaku di perangkat ini.</p>
      </div>

      <Group title="Tampilan">
        <ThemeRow />
      </Group>

      <Group title="Perilaku">
        <BehaviorRows />
      </Group>

      <Group title="Aplikasi">
        <InstallRow />
        <UpdateRow />
        <OfflineDataRow />
      </Group>

      <Group title="Data">
        <HistoryRowSetting />
      </Group>

      {/* Keyboard shortcuts only matter where there is a keyboard and a precise pointer. */}
      <section aria-label="Pintasan keyboard" className="hidden pointer-fine:block">
        <h2 className="px-1 text-sm font-semibold text-muted">Pintasan keyboard</h2>
        <dl className="neu-panel mt-3 grid gap-4 rounded-[1.5rem] p-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <dt>Tempel dan baca link di layar Unduh (⌘ V di Mac)</dt>
            <dd className="flex items-center gap-1.5">
              <Kbd>Ctrl</Kbd>
              <Kbd>V</Kbd>
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <dt>Pindah ke Unduh, Riwayat, Pengaturan (Option di Mac)</dt>
            <dd className="flex items-center gap-1.5">
              <Kbd>Alt</Kbd>
              <Kbd>1</Kbd>
              <Kbd>2</Kbd>
              <Kbd>3</Kbd>
            </dd>
          </div>
        </dl>
      </section>

      <section aria-label="Tentang" className="px-1 text-sm text-muted">
        <p>Hanya untuk konten publik. Hormati hak cipta kreatornya.</p>
        <p className="mt-1">
          Tanpa akun dan tanpa database. File diproses sementara di server lalu langsung dihapus. Riwayat dan pengaturan hanya ada di perangkat ini.
        </p>
      </section>
    </div>
  );
}
