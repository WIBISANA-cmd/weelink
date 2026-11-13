"use client";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
}

/** A sunken track with a raised knob; the knob turns blue when on, so state never relies on position alone. */
export function Switch({ checked, onChange, disabled, labelledBy, describedBy }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="neu-switch"
    >
      <span className="neu-switch-knob" aria-hidden="true" />
    </button>
  );
}
