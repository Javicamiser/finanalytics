/**
 * FinAnalytics — Design Tokens
 * ─────────────────────────────────────────────────────────────────
 * Cambiar el color principal del sistema: editar PRIMARY_* abajo.
 * Cambiar fondo: editar BG_*.
 * Todos los componentes importan desde aquí — un cambio = todo cambia.
 */

// ── Color principal ────────────────────────────────────────────────
export const PRIMARY = {
  50:  '#E8EEF6',
  100: '#C5D4E9',
  200: '#9FB8D9',
  300: '#6E93C4',
  400: '#3D6FAB',
  500: '#1F4E8C',   // ← color base
  600: '#1A4278',
  700: '#143263',
  800: '#0E224F',
  900: '#08143B',
}

// ── Colores de acento y estado ─────────────────────────────────────
export const SUCCESS  = { light: '#D5F5E3', base: '#27AE60', dark: '#1E8449' }
export const WARNING  = { light: '#FEF9E7', base: '#F39C12', dark: '#B7770D' }
export const DANGER   = { light: '#FDEDEC', base: '#E74C3C', dark: '#C0392B' }
export const INFO     = { light: '#EBF5FB', base: '#2E86C1', dark: '#1A5276' }

// ── Grises neutros ─────────────────────────────────────────────────
export const GRAY = {
  50:  '#FAFAF8',   // ← fondo general (crema cálido)
  100: '#F0EFEB',
  200: '#E2E0DA',
  300: '#C8C6BD',
  400: '#9E9C93',
  500: '#75736A',
  600: '#5A5851',
  700: '#403E39',
  800: '#2A2925',
  900: '#16150F',
}

// ── Sidebar ────────────────────────────────────────────────────────
export const SIDEBAR = {
  bg:          PRIMARY[500],
  bgHover:     'rgba(255,255,255,0.10)',
  bgActive:    'rgba(255,255,255,0.18)',
  text:        'rgba(255,255,255,0.70)',
  textActive:  '#FFFFFF',
  border:      'rgba(255,255,255,0.10)',
  width:       '220px',
  widthCollapsed: '56px',
}

// ── Tipografía ─────────────────────────────────────────────────────
export const FONT = {
  sans: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', ui-monospace, monospace",
}

// ── Espaciado y bordes ─────────────────────────────────────────────
export const RADIUS = {
  sm:  '6px',
  md:  '10px',
  lg:  '14px',
  xl:  '20px',
}

export const SHADOW = {
  sm:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md:  '0 4px 12px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
  lg:  '0 8px 24px rgba(0,0,0,0.09), 0 4px 8px rgba(0,0,0,0.06)',
}

// ── Paletas para gráficas (personalizables por el usuario) ─────────
export const CHART_PALETTES = {
  default: {
    name: 'Corporativo',
    barActiva:  PRIMARY[500],
    barNormal:  PRIMARY[200],
    linea:      WARNING.base,
    referencia: DANGER.base,
  },
  ocean: {
    name: 'Océano',
    barActiva:  '#0077B6',
    barNormal:  '#90E0EF',
    linea:      '#F77F00',
    referencia: '#D62828',
  },
  forest: {
    name: 'Bosque',
    barActiva:  '#2D6A4F',
    barNormal:  '#95D5B2',
    linea:      '#E9C46A',
    referencia: '#E76F51',
  },
  slate: {
    name: 'Pizarra',
    barActiva:  '#2C3E50',
    barNormal:  '#95A5A6',
    linea:      '#E67E22',
    referencia: '#E74C3C',
  },
  wine: {
    name: 'Vino',
    barActiva:  '#6D2B6D',
    barNormal:  '#C9A0C9',
    linea:      '#F4A261',
    referencia: '#E63946',
  },
  carbon: {
    name: 'Carbón',
    barActiva:  '#1A1A2E',
    barNormal:  '#8B8FA8',
    linea:      '#FFB347',
    referencia: '#FF6B6B',
  },
}

// ── Helper: genera clases Tailwind desde los tokens ────────────────
// Uso: className={cn('base-class', condition && 'conditional-class')}
export const cn = (...classes) => classes.filter(Boolean).join(' ')