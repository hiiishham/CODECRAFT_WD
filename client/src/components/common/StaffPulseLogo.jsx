import React from 'react';
import { Link } from 'react-router-dom';
import logoFullLight from '../../assets/staffpulse-logo.png';
import logoFullDark from '../../assets/staffpulse-logo-white.png';
import logoIcon from '../../assets/staffpulse-icon.png';

/**
 * StaffPulse Official Brand Logo Component
 * 
 * Supports:
 * - variant: 'full' (complete mark + typography) | 'compact' (ribbon mark only)
 * - theme: 'light' (default, for white/light surfaces) | 'dark' (for dark charcoal/black surfaces)
 * - size: 'sm' | 'md' | 'lg' | 'xl' (or pass explicit `height`)
 * - to: optional path to wrap with react-router-dom <Link>
 * - className & style: for custom layout positioning
 */
export const StaffPulseLogo = ({
  variant = 'full',
  theme = 'light',
  size = 'md',
  height,
  width,
  to,
  className = '',
  style = {},
  alt = 'StaffPulse — HR Management',
  onClick,
  ...rest
}) => {
  // Determine standard height based on variant & size preset
  const getHeight = () => {
    if (height !== undefined) return height;
    if (variant === 'compact') {
      switch (size) {
        case 'sm': return 24;
        case 'lg': return 44;
        case 'xl': return 56;
        case 'md':
        default: return 34;
      }
    } else {
      switch (size) {
        case 'sm': return 28;
        case 'lg': return 48;
        case 'xl': return 60;
        case 'md':
        default: return 38;
      }
    }
  };

  const computedHeight = getHeight();

  // Select appropriate logo asset
  let src = logoFullLight;
  if (variant === 'compact') {
    src = logoIcon;
  } else if (theme === 'dark') {
    src = logoFullDark;
  }

  const imageElement = (
    <img
      src={src}
      alt={alt}
      height={computedHeight}
      width={width}
      className={`staffpulse-brand-logo staffpulse-logo-${variant} staffpulse-logo-theme-${theme} ${className}`.trim()}
      style={{
        height: typeof computedHeight === 'number' ? `${computedHeight}px` : computedHeight,
        width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
        maxWidth: '100%',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        userSelect: 'none',
        ...style,
      }}
      loading="eager"
      decoding="async"
      {...rest}
    />
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="staffpulse-logo-link"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          textDecoration: 'none',
          cursor: 'pointer',
        }}
        aria-label={alt}
      >
        {imageElement}
      </Link>
    );
  }

  return imageElement;
};

export default StaffPulseLogo;
