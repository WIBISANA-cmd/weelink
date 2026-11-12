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
