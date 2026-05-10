---
name: Warm Assistant Web System
colors:
  surface: '#faf9f5'
  surface-dim: '#dadad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4ef'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e3de'
  on-surface: '#1a1c1a'
  on-surface-variant: '#434841'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f1f1ec'
  outline: '#737970'
  outline-variant: '#c3c8bf'
  surface-tint: '#4a6549'
  primary: '#4a6549'
  on-primary: '#ffffff'
  primary-container: '#8ba888'
  on-primary-container: '#243d24'
  inverse-primary: '#b0cfad'
  secondary: '#61597f'
  on-secondary: '#ffffff'
  secondary-container: '#dcd1fd'
  on-secondary-container: '#60587d'
  tertiary: '#426276'
  on-tertiary: '#ffffff'
  tertiary-container: '#84a5ba'
  on-tertiary-container: '#193b4d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ccebc7'
  primary-fixed-dim: '#b0cfad'
  on-primary-fixed: '#07200b'
  on-primary-fixed-variant: '#334d33'
  secondary-fixed: '#e7deff'
  secondary-fixed-dim: '#cbc1ec'
  on-secondary-fixed: '#1d1638'
  on-secondary-fixed-variant: '#494266'
  tertiary-fixed: '#c6e7fe'
  tertiary-fixed-dim: '#aacbe1'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#2a4a5d'
  background: '#faf9f5'
  on-background: '#1a1c1a'
  surface-variant: '#e3e3de'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

This design system is built on the philosophy of **"Calm Productivity."** It rejects the cold, high-velocity aesthetic of traditional task management in favor of an environment that feels like a high-end concierge service. The visual language is centered on "Elegant Growth," utilizing organic tones and generous whitespace to reduce cognitive load.

The style is **Grounded Minimalism with Glassmorphic Touches**. It prioritizes clarity and high-quality typography while using subtle translucency to create a sense of depth and airy sophistication. It is professional without being rigid, and warm without being informal. Every interaction should feel intentional, smooth, and supportive.

## Colors

The palette is a curated selection of soft pastels designed to evoke tranquility and focus. 

- **Sage Green (#8BA888):** The primary action color, representing growth and steady progress.
- **Lavender (#B1A7D1):** Used for secondary highlights or categorizing creative tasks.
- **Soft Blue (#A2C3D9):** Used for informational elements and calm status indicators.
- **Peach/Cream (#F4D9C6):** Used sparingly for gentle alerts or "soft" highlights.
- **Neutrals:** The system avoids pure blacks and whites. Backgrounds use a warm off-white (#F9F8F6) to reduce eye strain, while text sits at a soft charcoal (#2D2D2D) for premium readability.

## Typography

This design system utilizes **Plus Jakarta Sans** for its unique balance of geometric precision and organic warmth. The typography scales emphasize a "low-contrast" weight distribution—avoiding overly thin weights in favor of Medium (500) and SemiBold (600) to maintain a premium, approachable feel.

- **Headlines:** Use tighter letter spacing and SemiBold weights to create a strong visual anchor.
- **Body Text:** Leverages a generous 1.6x line height to ensure maximum readability and a "breathable" feel.
- **Labels:** Use slightly increased tracking and medium weights to ensure clarity even at smaller sizes.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. Content is contained within a maximum width of 1200px to maintain readability on large monitors, centered with generous side margins. 

The spacing rhythm is based on a **4px baseline grid**, but primarily utilizes 12px, 24px, and 48px increments to create a high-end, spacious feel. 

- **Mobile:** Single column with 20px margins. Cards span the full width of the viewport minus margins.
- **Tablet:** 8-column grid with 24px gutters.
- **Desktop:** 12-column grid. Elements should favor centering and whitespace over density. Sidebars should feel like floating panels rather than docked dividers.

## Elevation & Depth

Hierarchy is achieved through **Soft Layering** rather than heavy shadows. The system uses three primary levels of depth:

1.  **Base:** The warm off-white background (#F9F8F6).
2.  **Surface:** White cards (#FFFFFF) with a very soft, diffused shadow (Blur: 30px, Opacity: 4%, Color: #2D2D2D). 
3.  **Floating / Glass:** Semi-transparent panels (White at 70% opacity) with a 20px backdrop-blur. This is reserved for navigation bars, modals, and dropdown menus to give a sense of lightness.

Borders should be used sparingly, appearing as 1px solid lines in a slightly darker neutral than the background to define edges without adding visual noise.

## Shapes

The shape language is defined by **expansive, soft curvature**. Sharp corners are entirely avoided to maintain the "Warm Assistant" persona.

- **Primary Cards:** Use a 24px corner radius to create a friendly, container-like feel.
- **Buttons and Inputs:** Use a 16px corner radius (Large).
- **Small Elements (Tags/Chips):** Use fully rounded "Pill" shapes.

Icons should always be of a "Rounded" or "Soft" variety (Lucide or Phosphor in the 'Regular' or 'Light' weight), with stroke ends that are capped and rounded.

## Components

### Buttons
- **Primary:** Sage Green background with white text. 16px radius. Subtle scale-up animation on hover.
- **Secondary:** Lavender or Soft Blue tint (15% opacity) with matching saturated text. No border.
- **Ghost:** No background, text-only with a subtle 16px radius hover state in warm gray.

### Cards
Cards are the core of the design system. They must have a 24px corner radius, a white background, and the "Ambient Shadow" defined in the Elevation section. Padding within cards should be a minimum of 32px to maintain the "premium" feel.

### Input Fields
Inputs should be large (48px-56px height) with a 16px corner radius. Use a light warm gray background rather than a white background to make them feel "recessed" into the card.

### Chips & Tags
Used for categorization. These should use the pastel palette with low-contrast text (e.g., a Sage Green chip uses a lighter Sage background and a darker Sage text).

### Navigation
The sidebar or top-nav should utilize the Glassmorphism style, allowing the soft background colors to bleed through slightly, maintaining a sense of place within the app.