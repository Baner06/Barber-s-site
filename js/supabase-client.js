// Inicializa el cliente de Supabase usando la configuración de config.js
// Se carga como módulo ES desde un CDN, sin necesidad de build tools.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cfg = window.BARBER_CONFIG;

export const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

export const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export function formatCOP(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function hoursForDate(dateStr) {
  const dayIndex = new Date(dateStr + "T00:00:00").getDay();
  const key = DIAS[dayIndex];
  return { key, ...window.BARBER_CONFIG.hours[key] };
}

// Genera los slots de horario posibles para un día dado, respetando
// el horario configurado y la duración de cada servicio.
export function buildSlots(dateStr, durationMinutes) {
  const cfg = window.BARBER_CONFIG;
  const day = hoursForDate(dateStr);
  if (day.closed) return [];

  const slots = [];
  const [openH, openM] = day.open.split(":").map(Number);
  const [closeH, closeM] = day.close.split(":").map(Number);
  let cursor = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  const step = cfg.slotSizeMinutes;

  while (cursor + durationMinutes <= closeMinutes) {
    const h = Math.floor(cursor / 60).toString().padStart(2, "0");
    const m = (cursor % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    cursor += step;
  }
  return slots;
}

export function minutesToTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
  const m = (totalMinutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Los clientes siempre son colombianos: agrega el indicativo +57 si el
// número no lo trae ya, para armar enlaces de wa.me que abran el chat
// correcto sin que el barbero tenga que escribirlo a mano.
export function coWhatsappDigits(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length > 10) return digits;
  return `57${digits}`;
}

// "14:05" (o "14:05:00") -> "2:05 PM"
export function formatTime12h(t) {
  const [hStr, mStr] = t.split(":");
  let h = Number(hStr);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mStr} ${period}`;
}
