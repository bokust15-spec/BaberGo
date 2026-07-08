import React from 'react';

// lucide-react has no "foot with visible toes" icon (only the abstract "Footprints"
// blobs), so this custom icon fills that gap for the "Main et pied" category —
// drawn in the same 24x24 / currentColor / stroke style as the rest of the set.
interface FootToesProps extends Omit<React.SVGProps<SVGSVGElement>, 'color' | 'strokeWidth'> {
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
}

export default function FootToes({ size = 24, color = 'currentColor', strokeWidth = 2, ...rest }: FootToesProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <ellipse cx="12" cy="14.5" rx="5" ry="7.5" />
      <circle cx="7.3" cy="5.5" r="1.5" fill={color} stroke="none" />
      <circle cx="10.1" cy="4" r="1.25" fill={color} stroke="none" />
      <circle cx="12.9" cy="3.6" r="1.15" fill={color} stroke="none" />
      <circle cx="15.5" cy="4.1" r="1.05" fill={color} stroke="none" />
      <circle cx="17.7" cy="5.4" r="0.95" fill={color} stroke="none" />
    </svg>
  );
}
