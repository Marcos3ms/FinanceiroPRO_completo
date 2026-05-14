"use client";

import { useState } from "react";

type Props = {
  ariaLabel?: string;
} & (
  | {
      on: boolean;
      onChange: (on: boolean) => void;
      defaultOn?: never;
    }
  | {
      defaultOn?: boolean;
      on?: never;
      onChange?: (on: boolean) => void;
    }
);

export default function ToggleSwitch(props: Props) {
  const isControlled = props.on !== undefined;
  const [internal, setInternal] = useState(props.defaultOn ?? false);
  const value = isControlled ? props.on! : internal;

  const handleClick = () => {
    const next = !value;
    if (!isControlled) setInternal(next);
    props.onChange?.(next);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={props.ariaLabel}
      onClick={handleClick}
      className={`relative h-[26px] w-12 flex-shrink-0 rounded-[13px] border transition-colors ${
        value
          ? "border-brand-blue bg-brand-blue"
          : "border-border bg-bg-elevated"
      }`}
    >
      <span
        className={`absolute top-[3px] h-[18px] w-[18px] rounded-full transition-transform ${
          value ? "translate-x-[22px] bg-white" : "translate-x-[3px] bg-fg-muted"
        }`}
      />
    </button>
  );
}
