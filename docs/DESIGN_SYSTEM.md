# MoltLaw Design System

## Overview

This document defines the complete visual language for MoltLaw. Every color, spacing value, typography setting, and visual token is specified here. No visual decisions are made outside this file.

**Design Philosophy:** Professional, trustworthy, modern. Legal services demand seriousness and credibility while remaining approachable for technical users. Dark mode default reflects the developer-oriented audience.

---

## Color Palette

### Semantic Colors

```yaml
# Backgrounds
background-primary: "#0a0a0a"        # Main app background
background-secondary: "#141414"      # Cards, elevated surfaces
background-tertiary: "#1f1f1f"       # Inputs, nested elements
background-elevated: "#262626"       # Modals, popovers
background-inverse: "#ffffff"        # Inverse for contrast

# Text
text-primary: "#ffffff"              # Main text
text-secondary: "#a1a1a1"            # Secondary, muted text
text-muted: "#6b6b6b"                # Disabled, placeholder
text-inverse: "#0a0a0a"              # Text on light backgrounds
text-link: "#3b82f6"                 # Clickable text

# Borders
border-default: "#262626"            # Default borders
border-subtle: "#1f1f1f"             # Subtle dividers
border-strong: "#404040"             # Emphasized borders
border-focus: "#3b82f6"              # Focus rings
```

### Brand Colors

```yaml
# Primary - Blue (Trust, Professionalism)
primary-50: "#eff6ff"
primary-100: "#dbeafe"
primary-200: "#bfdbfe"
primary-300: "#93c5fd"
primary-400: "#60a5fa"
primary-500: "#3b82f6"               # Primary brand color
primary-600: "#2563eb"
primary-700: "#1d4ed8"
primary-800: "#1e40af"
primary-900: "#1e3a8a"

# Secondary - Purple (Legal, Authority)
secondary-50: "#faf5ff"
secondary-100: "#f3e8ff"
secondary-200: "#e9d5ff"
secondary-300: "#d8b4fe"
secondary-400: "#c084fc"
secondary-500: "#a855f7"
secondary-600: "#9333ea"
secondary-700: "#7e22ce"
secondary-800: "#6b21a8"
secondary-900: "#581c87"
```

### Status Colors

```yaml
# Success - Green
success-50: "#f0fdf4"
success-100: "#dcfce7"
success-200: "#bbf7d0"
success-300: "#86efac"
success-400: "#4ade80"
success-500: "#22c55e"               # Primary success
success-600: "#16a34a"
success-700: "#15803d"
success-800: "#166534"
success-900: "#14532d"

# Warning - Amber
warning-50: "#fffbeb"
warning-100: "#fef3c7"
warning-200: "#fde68a"
warning-300: "#fcd34d"
warning-400: "#fbbf24"
warning-500: "#f59e0b"               # Primary warning
warning-600: "#d97706"
warning-700: "#b45309"
warning-800: "#92400e"
warning-900: "#78350f"

# Error - Red
error-50: "#fef2f2"
error-100: "#fee2e2"
error-200: "#fecaca"
error-300: "#fca5a5"
error-400: "#f87171"
error-500: "#ef4444"                 # Primary error
error-600: "#dc2626"
error-700: "#b91c1c"
error-800: "#991b1b"
error-900: "#7f1d1d"

# Info - Blue (lighter than primary)
info-50: "#f0f9ff"
info-100: "#e0f2fe"
info-200: "#bae6fd"
info-300: "#7dd3fc"
info-400: "#38bdf8"
info-500: "#0ea5e9"                  # Primary info
info-600: "#0284c7"
info-700: "#0369a1"
info-800: "#075985"
info-900: "#0c4a6e"
```

### Matter Status Colors

```yaml
status-pending: "#f59e0b"            # Amber - waiting
status-active: "#3b82f6"             # Blue - in progress
status-review: "#a855f7"             # Purple - under review
status-completed: "#22c55e"          # Green - done
status-blocked: "#ef4444"            # Red - blocked/error
status-closed: "#6b6b6b"             # Gray - archived
```

### Special Purpose

```yaml
# Credits
credits-positive: "#22c55e"          # Credit addition
credits-negative: "#ef4444"          # Credit deduction
credits-balance: "#3b82f6"           # Balance display

# Confidence Scores
confidence-high: "#22c55e"           # 80%+
confidence-medium: "#f59e0b"         # 50-79%
confidence-low: "#ef4444"            # <50%

# Priority
priority-urgent: "#ef4444"
priority-high: "#f59e0b"
priority-normal: "#3b82f6"
priority-low: "#6b6b6b"
```

---

## Typography

### Font Families

```yaml
font-family-sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
font-family-mono: "'JetBrains Mono', 'Fira Code', Consolas, Monaco, 'Courier New', monospace"
```

### Font Sizes

```yaml
text-xs: "0.75rem"       # 12px - Fine print, labels
text-sm: "0.875rem"      # 14px - Secondary text, metadata
text-base: "1rem"        # 16px - Body text (default)
text-lg: "1.125rem"      # 18px - Emphasized body
text-xl: "1.25rem"       # 20px - Subheadings
text-2xl: "1.5rem"       # 24px - Section headings
text-3xl: "1.875rem"     # 30px - Page headings
text-4xl: "2.25rem"      # 36px - Hero text
text-5xl: "3rem"         # 48px - Marketing headlines
```

### Font Weights

```yaml
font-normal: 400         # Body text
font-medium: 500         # Emphasized text
font-semibold: 600       # Subheadings, buttons
font-bold: 700           # Headings
```

### Line Heights

```yaml
leading-none: 1          # Headings
leading-tight: 1.25      # Compact text
leading-snug: 1.375      # Subheadings
leading-normal: 1.5      # Body text (default)
leading-relaxed: 1.625   # Long-form content
leading-loose: 2         # Spacious text
```

### Letter Spacing

```yaml
tracking-tighter: "-0.05em"
tracking-tight: "-0.025em"
tracking-normal: "0"
tracking-wide: "0.025em"
tracking-wider: "0.05em"
tracking-widest: "0.1em"
```

### Typography Presets

```yaml
# Headings
h1:
  size: text-4xl         # 36px
  weight: font-bold
  leading: leading-tight
  tracking: tracking-tight

h2:
  size: text-3xl         # 30px
  weight: font-bold
  leading: leading-tight
  tracking: tracking-tight

h3:
  size: text-2xl         # 24px
  weight: font-semibold
  leading: leading-snug

h4:
  size: text-xl          # 20px
  weight: font-semibold
  leading: leading-snug

h5:
  size: text-lg          # 18px
  weight: font-medium
  leading: leading-normal

h6:
  size: text-base        # 16px
  weight: font-medium
  leading: leading-normal

# Body
body-large:
  size: text-lg
  weight: font-normal
  leading: leading-relaxed

body:
  size: text-base
  weight: font-normal
  leading: leading-normal

body-small:
  size: text-sm
  weight: font-normal
  leading: leading-normal

# Labels
label:
  size: text-sm
  weight: font-medium
  leading: leading-none

caption:
  size: text-xs
  weight: font-normal
  leading: leading-normal

# Code
code:
  family: font-family-mono
  size: text-sm
  weight: font-normal
```

---

## Spacing

### Base Unit

```yaml
base: 4px
```

### Spacing Scale

```yaml
space-0: "0"              # 0px
space-0.5: "0.125rem"     # 2px
space-1: "0.25rem"        # 4px (base)
space-1.5: "0.375rem"     # 6px
space-2: "0.5rem"         # 8px
space-2.5: "0.625rem"     # 10px
space-3: "0.75rem"        # 12px
space-4: "1rem"           # 16px
space-5: "1.25rem"        # 20px
space-6: "1.5rem"         # 24px
space-7: "1.75rem"        # 28px
space-8: "2rem"           # 32px
space-9: "2.25rem"        # 36px
space-10: "2.5rem"        # 40px
space-12: "3rem"          # 48px
space-14: "3.5rem"        # 56px
space-16: "4rem"          # 64px
space-20: "5rem"          # 80px
space-24: "6rem"          # 96px
space-32: "8rem"          # 128px
```

### Component Spacing

```yaml
# Padding
padding-button-sm: "space-1.5 space-3"    # 6px 12px
padding-button-md: "space-2 space-4"      # 8px 16px
padding-button-lg: "space-3 space-6"      # 12px 24px

padding-input-sm: "space-1.5 space-3"     # 6px 12px
padding-input-md: "space-2 space-4"       # 8px 16px
padding-input-lg: "space-3 space-4"       # 12px 16px

padding-card-sm: "space-4"                # 16px
padding-card-md: "space-6"                # 24px
padding-card-lg: "space-8"                # 32px

# Gaps
gap-xs: "space-1"         # 4px
gap-sm: "space-2"         # 8px
gap-md: "space-4"         # 16px
gap-lg: "space-6"         # 24px
gap-xl: "space-8"         # 32px

# Margins (section spacing)
margin-section: "space-16"  # 64px between major sections
margin-subsection: "space-8" # 32px between subsections
```

---

## Border Radius

```yaml
rounded-none: "0"
rounded-sm: "0.125rem"     # 2px - Subtle rounding
rounded: "0.25rem"         # 4px - Default
rounded-md: "0.375rem"     # 6px - Buttons, inputs
rounded-lg: "0.5rem"       # 8px - Cards
rounded-xl: "0.75rem"      # 12px - Modals, large cards
rounded-2xl: "1rem"        # 16px - Hero elements
rounded-3xl: "1.5rem"      # 24px - Marketing elements
rounded-full: "9999px"     # Pills, avatars
```

### Component Radius

```yaml
radius-button: rounded-md     # 6px
radius-input: rounded-md      # 6px
radius-card: rounded-lg       # 8px
radius-modal: rounded-xl      # 12px
radius-avatar: rounded-full   # Circle
radius-badge: rounded-full    # Pill shape
radius-tooltip: rounded-md    # 6px
```

---

## Shadows

```yaml
shadow-none: "none"

shadow-sm: "0 1px 2px 0 rgba(0, 0, 0, 0.4)"

shadow: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)"

shadow-md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)"

shadow-lg: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)"

shadow-xl: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)"

shadow-2xl: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"

shadow-inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)"
```

### Glow Effects

```yaml
glow-primary: "0 0 20px rgba(59, 130, 246, 0.3)"      # Blue glow
glow-success: "0 0 20px rgba(34, 197, 94, 0.3)"      # Green glow
glow-error: "0 0 20px rgba(239, 68, 68, 0.3)"        # Red glow
```

### Focus Ring

```yaml
focus-ring: "0 0 0 2px rgba(59, 130, 246, 0.5)"
focus-ring-error: "0 0 0 2px rgba(239, 68, 68, 0.5)"
```

---

## Breakpoints

```yaml
breakpoint-sm: "640px"     # Small tablets, large phones
breakpoint-md: "768px"     # Tablets
breakpoint-lg: "1024px"    # Small laptops
breakpoint-xl: "1280px"    # Desktops
breakpoint-2xl: "1536px"   # Large desktops
```

### Container Widths

```yaml
container-sm: "640px"
container-md: "768px"
container-lg: "1024px"
container-xl: "1280px"
container-2xl: "1400px"    # Max content width
```

### Responsive Strategy

```yaml
approach: mobile-first

# Breakpoint usage
default: Mobile (< 640px)
sm: Tablet portrait (>= 640px)
md: Tablet landscape (>= 768px)
lg: Small desktop (>= 1024px)
xl: Desktop (>= 1280px)
2xl: Large desktop (>= 1536px)
```

---

## Animation

### Duration

```yaml
duration-75: "75ms"        # Micro-interactions
duration-100: "100ms"      # Quick feedback
duration-150: "150ms"      # Hover states (default)
duration-200: "200ms"      # Toggles, switches
duration-300: "300ms"      # Modals, drawers
duration-500: "500ms"      # Page transitions
duration-700: "700ms"      # Complex animations
duration-1000: "1000ms"    # Slow reveals
```

### Easing

```yaml
ease-linear: "linear"
ease-in: "cubic-bezier(0.4, 0, 1, 1)"
ease-out: "cubic-bezier(0, 0, 0.2, 1)"
ease-in-out: "cubic-bezier(0.4, 0, 0.2, 1)"     # Default
ease-bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)"
```

### Common Animations

```yaml
# Fade
fade-in:
  from: "opacity: 0"
  to: "opacity: 1"
  duration: duration-150
  easing: ease-out

fade-out:
  from: "opacity: 1"
  to: "opacity: 0"
  duration: duration-150
  easing: ease-in

# Scale
scale-in:
  from: "transform: scale(0.95); opacity: 0"
  to: "transform: scale(1); opacity: 1"
  duration: duration-200
  easing: ease-out

scale-out:
  from: "transform: scale(1); opacity: 1"
  to: "transform: scale(0.95); opacity: 0"
  duration: duration-150
  easing: ease-in

# Slide
slide-up:
  from: "transform: translateY(10px); opacity: 0"
  to: "transform: translateY(0); opacity: 1"
  duration: duration-200
  easing: ease-out

slide-down:
  from: "transform: translateY(-10px); opacity: 0"
  to: "transform: translateY(0); opacity: 1"
  duration: duration-200
  easing: ease-out

# Spin (loading)
spin:
  animation: "rotate 1s linear infinite"
```

---

## Z-Index Scale

```yaml
z-base: 0
z-dropdown: 10
z-sticky: 20
z-fixed: 30
z-modal-backdrop: 40
z-modal: 50
z-popover: 60
z-tooltip: 70
z-toast: 80
z-max: 9999
```

---

## Component Tokens

### Buttons

```yaml
button-primary:
  background: primary-500
  background-hover: primary-600
  background-active: primary-700
  text: text-inverse
  border: none

button-secondary:
  background: background-tertiary
  background-hover: background-elevated
  background-active: border-strong
  text: text-primary
  border: border-default

button-outline:
  background: transparent
  background-hover: background-secondary
  text: text-primary
  border: border-default

button-ghost:
  background: transparent
  background-hover: background-secondary
  text: text-primary
  border: none

button-danger:
  background: error-500
  background-hover: error-600
  background-active: error-700
  text: text-inverse
  border: none

button-disabled:
  background: background-tertiary
  text: text-muted
  cursor: not-allowed
  opacity: 0.5
```

### Inputs

```yaml
input-default:
  background: background-tertiary
  text: text-primary
  placeholder: text-muted
  border: border-default
  border-focus: border-focus
  radius: radius-input

input-error:
  border: error-500
  background: "rgba(239, 68, 68, 0.1)"

input-disabled:
  background: background-secondary
  text: text-muted
  cursor: not-allowed
```

### Cards

```yaml
card-default:
  background: background-secondary
  border: border-subtle
  radius: radius-card
  shadow: shadow-sm

card-elevated:
  background: background-elevated
  border: none
  radius: radius-card
  shadow: shadow-md

card-interactive:
  background: background-secondary
  border: border-default
  radius: radius-card
  hover-border: primary-500
  hover-shadow: shadow-md
```

### Badges

```yaml
badge-default:
  background: background-tertiary
  text: text-secondary
  size: text-xs
  padding: "space-0.5 space-2"
  radius: rounded-full

badge-primary:
  background: "rgba(59, 130, 246, 0.2)"
  text: primary-400

badge-success:
  background: "rgba(34, 197, 94, 0.2)"
  text: success-400

badge-warning:
  background: "rgba(245, 158, 11, 0.2)"
  text: warning-400

badge-error:
  background: "rgba(239, 68, 68, 0.2)"
  text: error-400
```

### Toasts

```yaml
toast-default:
  background: background-elevated
  border: border-default
  radius: radius-card
  shadow: shadow-lg

toast-success:
  border-left: "4px solid success-500"

toast-warning:
  border-left: "4px solid warning-500"

toast-error:
  border-left: "4px solid error-500"

toast-info:
  border-left: "4px solid info-500"
```

---

## Icons

### Icon Library

```yaml
library: lucide-react
version: 0.378.0
```

### Icon Sizes

```yaml
icon-xs: "12px"
icon-sm: "16px"
icon-md: "20px"       # Default
icon-lg: "24px"
icon-xl: "32px"
icon-2xl: "48px"
```

### Icon Stroke Width

```yaml
stroke-default: 2
stroke-light: 1.5
stroke-bold: 2.5
```

---

## Layout

### Sidebar

```yaml
sidebar-width: "280px"
sidebar-width-collapsed: "72px"
sidebar-background: background-primary
sidebar-border: border-subtle
```

### Header

```yaml
header-height: "64px"
header-background: background-primary
header-border: border-subtle
```

### Content Area

```yaml
content-max-width: "1200px"
content-padding-x: "space-6"
content-padding-y: "space-8"
```

### Footer

```yaml
footer-height: "auto"
footer-background: background-primary
footer-border: border-subtle
```

---

## Accessibility

### Focus States

All interactive elements must have visible focus states:
```yaml
focus-visible:
  outline: none
  box-shadow: focus-ring
```

### Color Contrast

Minimum contrast ratios (WCAG 2.1 AA):
```yaml
text-on-background: 4.5:1 minimum
large-text-on-background: 3:1 minimum
interactive-elements: 3:1 minimum
```

### Motion

```yaml
reduced-motion:
  # When prefers-reduced-motion is set:
  animation-duration: 0.01ms
  transition-duration: 0.01ms
```

---

## Dark/Light Mode

### Default: Dark Mode

The design system defaults to dark mode. Light mode tokens would require a separate theme definition.

```yaml
theme-default: dark

# Future light mode would override:
# background-primary: "#ffffff"
# background-secondary: "#f9fafb"
# text-primary: "#0a0a0a"
# etc.
```

---

## Usage Guidelines

### Do

- Use semantic color names (e.g., `primary-500`) not hex values in code
- Apply spacing from the scale, never arbitrary values
- Use typography presets for consistency
- Follow the mobile-first responsive approach
- Respect the z-index scale to prevent layering issues

### Don't

- Invent new colors outside this system
- Use spacing values not in the scale
- Mix font families arbitrarily
- Skip focus states on interactive elements
- Use shadows excessively

---

## Tailwind Configuration

This design system maps directly to Tailwind CSS configuration. See the `tailwind.config.ts` file in the codebase for the implementation.
