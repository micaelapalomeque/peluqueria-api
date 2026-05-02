// ─────────────────────────────────────────────
// TEMA CENTRAL todos los colores de la app
// ─────────────────────────────────────────────

export const TEMA = {

  // ── Colores principales ──
  primario:       "#CC0000",
  primarioBg:     "#2a0a0a",
  primarioBorder: "#5a1010",
  primarioHover:  "#ff3333",

  // ── Fondos ──
  fondo:          "#1a1a1a",
  superficie:     "#242424",
  superficieAlta: "#1e1e1e",
  sidebar:        "#111111",

  // ── Bordes ──
  borde:          "#444444",
  bordeSuave:     "#333333",

  // ── Textos ──
  textoPrimario:    "#ffffff",
  textoSecundario:  "#bbbbbb",
  textoTerciario:   "#777777",
  textoDeshabilitado: "#444444",

  // ── Tipografía ──
  fontSize: {
    xs:   "11px",
    sm:   "13px",
    md:   "15px",
    lg:   "17px",
    xl:   "20px",
  },

  // ── Espaciado ──
  padding: {
    card:   "16px",
    btn:    "10px 16px",
    badge:  "3px 10px",
  },

  // ── Estados de turno ──
  estados: {
    reservado: {
      bg:          "#1f1a0a",
      border:      "#5a4a10",
      hora:        "#f0b429",
      badge:       "#2a2010",
      badgeBorder: "#5a4a10",
      texto:       "#f0b429",
      label:       "Reservado",
    },
    confirmado: {
      bg:          "#1a0a2a",
      border:      "#5a1a8a",
      hora:        "#cc66ff",
      badge:       "#2a1040",
      badgeBorder: "#5a1a8a",
      texto:       "#cc66ff",
      label:       "Confirmado",
    },
    asistido: {
      bg:          "#0a1f0a",
      border:      "#1a5a1a",
      hora:        "#44cc44",
      badge:       "#102010",
      badgeBorder: "#1a5a1a",
      texto:       "#44cc44",
      label:       "Asistido",
    },
    completado: {
      bg:          "#0a1f0a",
      border:      "#1a5a1a",
      hora:        "#44cc44",
      badge:       "#102010",
      badgeBorder: "#1a5a1a",
      texto:       "#44cc44",
      label:       "Completado",
    },
    ausente: {
      bg:          "#1e1e1e",
      border:      "#555555",
      hora:        "#999999",
      badge:       "#2a2a2a",
      badgeBorder: "#555555",
      texto:       "#999999",
      label:       "Ausente",
    },
    cancelado: {
      bg:          "#1e1e1e",
      border:      "#444444",
      hora:        "#666666",
      badge:       "#2a2a2a",
      badgeBorder: "#444444",
      texto:       "#666666",
      label:       "Cancelado",
    },
  },
}