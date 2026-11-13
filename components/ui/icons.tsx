import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function PasteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 2.5h6a1.5 1.5 0 0 1 1.5 1.5v.5H18A2.5 2.5 0 0 1 20.5 7v12a2.5 2.5 0 0 1-2.5 2.5H6A2.5 2.5 0 0 1 3.5 19V7A2.5 2.5 0 0 1 6 4.5h1.5V4A1.5 1.5 0 0 1 9 2.5Zm0 1.75v1.5h6v-1.5H9Z" />
      <rect x="7" y="10" width="10" height="2" rx="1" fill="var(--surface)" />
      <rect x="7" y="14" width="7" height="2" rx="1" fill="var(--surface)" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.7 5.3 12 10.6l5.3-5.3a1 1 0 0 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4l5.3-5.3-5.3-5.3a1 1 0 0 1 1.4-1.4Z" />
    </Svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <rect key={deg} x="11" y="1.5" width="2" height="3.5" rx="1" transform={`rotate(${deg} 12 12)`} />
      ))}
    </Svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14.5 2.6a.8.8 0 0 1 .9-.2A10 10 0 1 1 3 15.6a.8.8 0 0 1 1.1-.9A7.5 7.5 0 0 0 14.5 2.6Z" />
    </Svg>
  );
}

export function SaveIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5a1.3 1.3 0 0 1 1.3 1.3v8.6l2.8-2.8a1.3 1.3 0 0 1 1.8 1.8l-5 5a1.3 1.3 0 0 1-1.8 0l-5-5a1.3 1.3 0 1 1 1.8-1.8l2.8 2.8V3.8A1.3 1.3 0 0 1 12 2.5Z" />
      <path d="M4 15.5a1.3 1.3 0 0 1 1.3 1.3v1.7c0 .3.2.5.5.5h12.4c.3 0 .5-.2.5-.5v-1.7a1.3 1.3 0 0 1 2.6 0v1.7a3.1 3.1 0 0 1-3.1 3.1H5.8a3.1 3.1 0 0 1-3.1-3.1v-1.7A1.3 1.3 0 0 1 4 15.5Z" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.2 6.3a1.3 1.3 0 0 1 0 1.8l-10 10a1.3 1.3 0 0 1-1.8 0l-4.6-4.6a1.3 1.3 0 0 1 1.8-1.8l3.7 3.7 9.1-9.1a1.3 1.3 0 0 1 1.8 0Z" />
    </Svg>
  );
}

export function RetryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4.5a7.5 7.5 0 0 1 6.9 4.5H16a1.25 1.25 0 0 0 0 2.5h5.25c.7 0 1.25-.56 1.25-1.25V5a1.25 1.25 0 0 0-2.5 0v1.6A10 10 0 1 0 22 13.2a1.25 1.25 0 0 0-2.5-.4A7.5 7.5 0 1 1 12 4.5Z" />
    </Svg>
  );
}

export function FilmIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5Zm5 5.3v6.4c0 .6.6.9 1.1.6l5.2-3.2a.7.7 0 0 0 0-1.2l-5.2-3.2c-.5-.3-1.1 0-1.1.6Z" />
    </Svg>
  );
}

export function NoteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 3.2v12.3a3.5 3.5 0 1 1-2.5-3.35V7.6l-8 1.8v8.1A3.5 3.5 0 1 1 7 14.15V6.2c0-.6.4-1.1 1-1.2l10.8-2.6a1 1 0 0 1 1.2.8Z" />
    </Svg>
  );
}

export function PictureIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 3.5h14A2.5 2.5 0 0 1 21.5 6v12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 18V6A2.5 2.5 0 0 1 5 3.5Zm1.2 13.8h11.6c.6 0 .9-.7.5-1.2l-3.4-4.3a.8.8 0 0 0-1.2 0l-2.4 3-1.5-1.8a.8.8 0 0 0-1.2 0l-2.9 3.1c-.4.5-.1 1.2.5 1.2ZM8.5 6.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
    </Svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.6 6.2 12 4.8a5 5 0 0 1 7.1 7.1l-2.1 2.1a5 5 0 0 1-7.1 0 1.25 1.25 0 0 1 1.8-1.8 2.5 2.5 0 0 0 3.5 0l2.1-2.1a2.5 2.5 0 0 0-3.5-3.5L12.4 8a1.25 1.25 0 0 1-1.8-1.8Z" />
      <path d="M13.4 17.8 12 19.2a5 5 0 0 1-7.1-7.1L7 10a5 5 0 0 1 7.1 0 1.25 1.25 0 0 1-1.8 1.8 2.5 2.5 0 0 0-3.5 0l-2.1 2.1a2.5 2.5 0 0 0 3.5 3.5l1.4-1.4a1.25 1.25 0 0 1 1.8 1.8Z" />
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 4.5a1.3 1.3 0 0 0-1.3 1.3v4.4a1.3 1.3 0 0 0 2.6 0V8.3A1.3 1.3 0 0 0 12 7Zm0 8.2a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z" />
    </Svg>
  );
}

/** Clock face: the Riwayat tab, links read earlier. */
export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm1.25 4.75a1.25 1.25 0 0 0-2.5 0V12c0 .4.19.77.5 1l3.2 2.4a1.25 1.25 0 0 0 1.5-2l-2.7-2.02V7.25Z"
      />
    </Svg>
  );
}

/** Two sliders: the Pengaturan tab, echoing the switches inside it. */
export function SettingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6" width="19" height="2.5" rx="1.25" />
      <circle cx="8.5" cy="7.25" r="3.25" />
      <rect x="2.5" y="15.5" width="19" height="2.5" rx="1.25" />
      <circle cx="15.5" cy="16.75" r="3.25" />
    </Svg>
  );
}

/** Phone with an arrow into it: put the app on this device. */
export function InstallIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d="M7.5 1.5h9A2.5 2.5 0 0 1 19 4v16a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 20V4a2.5 2.5 0 0 1 2.5-2.5ZM12 6a1.1 1.1 0 0 0-1.1 1.1v4.7l-1.4-1.4a1.1 1.1 0 1 0-1.55 1.55l3.27 3.27a1.1 1.1 0 0 0 1.56 0l3.27-3.27a1.1 1.1 0 1 0-1.55-1.55l-1.4 1.4V7.1A1.1 1.1 0 0 0 12 6Zm-2 12.25a.75.75 0 0 0 0 1.5h4a.75.75 0 0 0 0-1.5h-4Z"
      />
    </Svg>
  );
}

/** The share glyph iPhone and Mac users look for in Safari. */
export function ShareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 1.8a1.3 1.3 0 0 1 .92.38l4 4a1.3 1.3 0 0 1-1.84 1.84L13.3 6.24v8.46a1.3 1.3 0 0 1-2.6 0V6.24L8.92 8.02a1.3 1.3 0 0 1-1.84-1.84l4-4A1.3 1.3 0 0 1 12 1.8Z" />
      <path d="M7 10.2a1.3 1.3 0 0 1 0 2.6h-.7a.5.5 0 0 0-.5.5v6.4c0 .28.22.5.5.5h11.4a.5.5 0 0 0 .5-.5v-6.4a.5.5 0 0 0-.5-.5H17a1.3 1.3 0 0 1 0-2.6h.7a3.1 3.1 0 0 1 3.1 3.1v6.4a3.1 3.1 0 0 1-3.1 3.1H6.3a3.1 3.1 0 0 1-3.1-3.1v-6.4a3.1 3.1 0 0 1 3.1-3.1H7Z" />
    </Svg>
  );
}

/** Square with a plus: Safari's "Add to Home Screen" item. */
export function AddSquareIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        fillRule="evenodd"
        d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm6 4.5a1.25 1.25 0 0 0-1.25 1.25v2h-2a1.25 1.25 0 0 0 0 2.5h2v2a1.25 1.25 0 0 0 2.5 0v-2h2a1.25 1.25 0 0 0 0-2.5h-2v-2A1.25 1.25 0 0 0 12 7.5Z"
      />
    </Svg>
  );
}

/** Cloud with a cut: no connection. The cut is painted in the surface color, like PasteIcon's lines. */
export function CloudOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 19.5a5 5 0 0 1-.6-9.96A6.5 6.5 0 0 1 18.9 9.6a5 5 0 0 1-1.4 9.9H7Z" />
      <rect x="10.4" y="-0.5" width="3.2" height="25" rx="1.6" transform="rotate(-45 12 12)" fill="var(--surface)" />
      <rect x="11.1" y="0.5" width="1.8" height="23" rx="0.9" transform="rotate(-45 12 12)" />
    </Svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 2.5h5A1.5 1.5 0 0 1 16 4v1h3.75a1.25 1.25 0 0 1 0 2.5H4.25a1.25 1.25 0 0 1 0-2.5H8V4a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M5.5 9h13l-.8 10.6a2.5 2.5 0 0 1-2.5 2.4H8.8a2.5 2.5 0 0 1-2.5-2.4L5.5 9Z" />
    </Svg>
  );
}

export function MoreIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="5" cy="12" r="2.1" />
      <circle cx="12" cy="12" r="2.1" />
      <circle cx="19" cy="12" r="2.1" />
    </Svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 2.5h9.5A2.5 2.5 0 0 1 21 5v9.5a2.5 2.5 0 0 1-2.5 2.5H9a2.5 2.5 0 0 1-2.5-2.5V5A2.5 2.5 0 0 1 9 2.5Z" />
      <path d="M4.25 7a1.25 1.25 0 0 1 1.25 1.25V18.5c0 .55.45 1 1 1h10.25a1.25 1.25 0 0 1 0 2.5H6.5A3.5 3.5 0 0 1 3 18.5V8.25A1.25 1.25 0 0 1 4.25 7Z" />
    </Svg>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3h5.75c.69 0 1.25.56 1.25 1.25V10a1.25 1.25 0 0 1-2.5 0V7.27l-6.87 6.86a1.25 1.25 0 0 1-1.76-1.76l6.86-6.87H14A1.25 1.25 0 0 1 14 3Z" />
      <path d="M6 5.5h3.5a1.25 1.25 0 0 1 0 2.5H6a.5.5 0 0 0-.5.5V18c0 .28.22.5.5.5h9.5a.5.5 0 0 0 .5-.5v-3.5a1.25 1.25 0 0 1 2.5 0V18a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.5a3 3 0 0 1 3-3Z" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.5a1.25 1.25 0 0 1 1.25 1.25v.6a6.5 6.5 0 0 1 5.25 6.4v3.4l1.6 2.4a1.2 1.2 0 0 1-1 1.85H4.9a1.2 1.2 0 0 1-1-1.85l1.6-2.4v-3.4a6.5 6.5 0 0 1 5.25-6.4v-.6A1.25 1.25 0 0 1 12 2.5Z" />
      <path d="M9.5 19.6h5a2.5 2.5 0 0 1-5 0Z" />
    </Svg>
  );
}

/** Phone with a bar on each side: vibration. */
export function VibrateIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8.5 3h7A2.5 2.5 0 0 1 18 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 18.5v-13A2.5 2.5 0 0 1 8.5 3Z" />
      <rect x="1.5" y="8" width="2" height="8" rx="1" />
      <rect x="20.5" y="8" width="2" height="8" rx="1" />
    </Svg>
  );
}

/** Half-filled circle: "follow the system", between light and dark. */
export function ContrastIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path fillRule="evenodd" d="M12 2.5a9.5 9.5 0 1 1 0 19 9.5 9.5 0 0 1 0-19Zm0 2.5v14a7 7 0 0 0 0-14Z" />
    </Svg>
  );
}
