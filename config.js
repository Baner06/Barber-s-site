// ============================================
// CONFIGURACIÓN DEL NEGOCIO
// Edita estos valores con los datos de tu barbería.
// No necesitas tocar ningún otro archivo para personalizar la marca.
// ============================================
window.BARBER_CONFIG = {
  // --- Identidad ---
  businessName: "💈Luis Barber's💈",
  tagline: "Barbería de Luis Felipe Galvis",
  logoText: "LB", // Se usa si no hay logoUrl
  logoUrl: "icons/icon-512.png", // logo oficial de Luis Barber's
  coverUrl: "", // opcional: URL de una foto de portada
  address: "TODO: escribe aquí tu dirección real",
  mapsUrl: "https://maps.google.com/?q=TU-DIRECCION-AQUI",
  whatsapp: "573000000000", // TODO: reemplaza por el WhatsApp real, sin '+', con indicativo de país

  // --- Horario ---
  // open/close en formato 24h "HH:MM", closed: true si no abre ese día
  hours: {
    lunes:     { open: "08:00", close: "19:00", closed: false },
    martes:    { open: "08:00", close: "19:00", closed: false },
    miercoles: { open: "08:00", close: "19:00", closed: false },
    jueves:    { open: "08:00", close: "19:00", closed: false },
    viernes:   { open: "08:00", close: "19:00", closed: false },
    sabado:    { open: "08:00", close: "19:00", closed: false },
    domingo:   { open: "09:30", close: "15:00", closed: true },
  },

  // --- Duración de cada slot de la agenda (minutos) ---
  slotSizeMinutes: 20,

  // --- Conexión a Supabase (ver README para crear tu proyecto gratis) ---
  supabaseUrl: "https://ovzzkwtyizzkjgstjezd.supabase.co",
  supabaseAnonKey: "sb_publishable_n1sxc5EWmP1STjiLS8vM_g_-QRPjbE2",
};
