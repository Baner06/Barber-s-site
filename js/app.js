import { supabase, formatCOP, todayISO, hoursForDate, buildSlots, timeToMinutes, minutesToTime, formatTime12h } from "./supabase-client.js";

const cfg = window.BARBER_CONFIG;

/* ---------------- Branding ---------------- */
document.getElementById("brandName").textContent = cfg.businessName;
document.getElementById("brandTagline").textContent = cfg.tagline;
document.getElementById("footerBrand").textContent = cfg.businessName;
document.getElementById("footerTagline").textContent = cfg.tagline;
document.title = `Reservar en ${cfg.businessName}`;
document.getElementById("addressLink").textContent = cfg.address;
document.getElementById("addressLink").href = cfg.mapsUrl;
document.getElementById("footerAddress").innerHTML = `<a href="${cfg.mapsUrl}" target="_blank" rel="noopener">${cfg.address}</a>`;

if (cfg.logoUrl) {
  document.getElementById("brandLogo").innerHTML = `<img src="${cfg.logoUrl}" alt="${cfg.businessName}" />`;
} else {
  document.getElementById("brandLogo").textContent = cfg.logoText;
}
if (cfg.coverUrl) {
  document.getElementById("heroCover").style.backgroundImage = `url('${cfg.coverUrl}')`;
}

/* ---------------- Estado de apertura ---------------- */
(function renderOpenStatus() {
  const today = hoursForDate(todayISO());
  const pill = document.getElementById("statusPill");
  const text = document.getElementById("statusText");
  if (today.closed) {
    text.textContent = "Cerrado hoy";
    return;
  }
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = nowMinutes >= timeToMinutes(today.open) && nowMinutes < timeToMinutes(today.close);
  pill.classList.toggle("open", isOpen);
  text.textContent = isOpen ? `Abierto · cierra ${formatTime12h(today.close)}` : `Cerrado · abre ${formatTime12h(today.open)}`;
})();

/* ---------------- Tabs ---------------- */
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
  ["servicios", "combos", "equipo", "resenas"].forEach((id) => {
    document.getElementById(`panel-${id}`).hidden = id !== btn.dataset.tab;
  });
});
document.querySelectorAll("[data-scroll]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelector(`.tab-btn[data-tab="${a.dataset.scroll.replace('panel-','')}"]`)?.click();
    document.getElementById(a.dataset.scroll).scrollIntoView({ behavior: "smooth" });
  });
});
document.getElementById("servicesSearch").addEventListener("input", (e) => {
  renderServices(filterByName(individualServices(), e.target.value));
});
document.getElementById("combosSearch").addEventListener("input", (e) => {
  renderCombos(filterByName(comboServices(), e.target.value));
});

/* ---------------- Carga de datos ---------------- */
let SERVICES = [];
let BARBERS = [];

async function loadData() {
  const [{ data: services, error: sErr }, { data: barbers, error: bErr }, { data: reviews, error: rErr }] = await Promise.all([
    supabase.from("services").select("*").eq("active", true).order("sort_order"),
    supabase.from("barbers").select("*").eq("active", true).order("sort_order"),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(20),
  ]);

  if (sErr) console.error(sErr);
  if (bErr) console.error(bErr);
  if (rErr) console.error(rErr);

  SERVICES = services || [];
  BARBERS = barbers || [];
  renderServices(individualServices());
  renderCombos(comboServices());
  renderStaff(BARBERS);
  renderReviews(reviews || []);
}

function individualServices() {
  return SERVICES.filter((s) => s.category !== "combo");
}
function comboServices() {
  return SERVICES.filter((s) => s.category === "combo");
}
function filterByName(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((s) => s.name.toLowerCase().includes(q));
}

function renderServices(list) {
  const host = document.getElementById("servicesList");
  if (!list.length) {
    host.innerHTML = individualServices().length
      ? `<div class="empty-state"><div class="icon">🔍</div>Ningún servicio coincide con la búsqueda.</div>`
      : `<div class="empty-state"><div class="icon">✂️</div>Todavía no hay servicios configurados.</div>`;
    return;
  }
  host.innerHTML = list.map((s) => `
    <div class="service-card">
      <div class="info">
        ${s.popular ? `<span class="badge">Popular</span>` : ""}
        <h3>${escapeHtml(s.name)}</h3>
        ${s.description ? `<p class="desc">${escapeHtml(s.description)}</p>` : ""}
        <div class="meta">${s.duration_minutes} min</div>
      </div>
      <div class="right">
        <span class="price">${formatCOP(s.price)}</span>
        <button class="btn btn-primary btn-sm" data-service="${s.id}">Reservar</button>
      </div>
    </div>
  `).join("");

  host.querySelectorAll("[data-service]").forEach((btn) => {
    btn.addEventListener("click", () => openBooking(btn.dataset.service));
  });
}

function renderCombos(list) {
  const host = document.getElementById("combosList");
  if (!list.length) {
    host.innerHTML = comboServices().length
      ? `<div class="empty-state"><div class="icon">🔍</div>Ningún combo coincide con la búsqueda.</div>`
      : `<div class="empty-state"><div class="icon">💈</div>Todavía no hay combos configurados.</div>`;
    return;
  }
  host.innerHTML = list.map((s) => `
    <div class="service-card">
      <div class="info">
        ${s.popular ? `<span class="badge">Popular</span>` : ""}
        <h3>${escapeHtml(s.name)}</h3>
        ${s.description ? `<p class="desc">${escapeHtml(s.description)}</p>` : ""}
        <div class="meta">${s.duration_minutes} min</div>
      </div>
      <div class="right">
        <span class="price">${formatCOP(s.price)}</span>
        <button class="btn btn-primary btn-sm" data-service="${s.id}">Reservar</button>
      </div>
    </div>
  `).join("");

  host.querySelectorAll("[data-service]").forEach((btn) => {
    btn.addEventListener("click", () => openBooking(btn.dataset.service));
  });
}

function renderStaff(list) {
  const host = document.getElementById("staffList");
  if (!list.length) {
    host.innerHTML = `<div class="empty-state"><div class="icon">💈</div>Todavía no hay colaboradores.</div>`;
    return;
  }
  host.innerHTML = list.map((b) => `
    <div class="staff-card">
      ${b.photo_url
        ? `<img src="${b.photo_url}" alt="${escapeHtml(b.name)}" />`
        : `<div class="staff-avatar">${initials(b.name)}</div>`}
      <h4>${escapeHtml(b.name)}</h4>
      <div class="role">${escapeHtml(b.role || "Barbero")}</div>
      <div class="rating">★ ${Number(b.rating).toFixed(1)}</div>
    </div>
  `).join("");
}

function renderReviews(list) {
  document.getElementById("reviewTotal").textContent = `${list.length} reseñas`;
  if (list.length) {
    const avg = list.reduce((sum, r) => sum + r.rating, 0) / list.length;
    document.getElementById("reviewAvg").textContent = avg.toFixed(1);
  }
  const host = document.getElementById("reviewsList");
  if (!list.length) {
    host.innerHTML = `<div class="empty-state"><div class="icon">⭐</div>Todavía no hay reseñas.</div>`;
    return;
  }
  host.innerHTML = list.map((r) => `
    <div class="review-card">
      <div class="who">${escapeHtml(r.client_name)}</div>
      <div class="when">${new Date(r.created_at).toLocaleDateString("es-CO", { month: "long", year: "numeric" })}</div>
      ${r.comment ? `<p>${escapeHtml(r.comment)}</p>` : ""}
    </div>
  `).join("");
}

function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
function escapeAttrJs(str) {
  return (str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/* ---------------- Flujo de reserva ---------------- */
const overlay = document.getElementById("sheetOverlay");
const sheetContent = document.getElementById("sheetContent");

const booking = { serviceId: null, barberId: null, date: null, time: null, name: "", phone: "", email: "" };

function openBooking(serviceId) {
  booking.barberId = null;
  booking.date = null;
  booking.time = null;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  if (serviceId) {
    // El cliente ya eligió el servicio desde su tarjeta: no volver a preguntar.
    booking.serviceId = serviceId;
    goToBarberOrDateTime();
  } else {
    booking.serviceId = SERVICES[0]?.id;
    stepService();
  }
}

function closeBooking() {
  overlay.hidden = true;
  document.body.style.overflow = "";
}

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeBooking();
});

function currentService() {
  return SERVICES.find((s) => s.id === booking.serviceId);
}
function currentBarber() {
  return BARBERS.find((b) => b.id === booking.barberId);
}

// Con un solo barbero activo no tiene sentido preguntar "¿con quién?".
function hasMultipleBarbers() {
  return BARBERS.length > 1;
}
function totalSteps() {
  return hasMultipleBarbers() ? 4 : 3;
}

function stepService(filter = "") {
  sheetContent.innerHTML = `
    <h2 id="sheetTitle">Elige un servicio</h2>
    <div class="step-label">Paso 1 de ${totalSteps()}</div>
    <div class="field">
      <input type="search" id="serviceSearch" placeholder="Buscar servicio…" value="${escapeAttrJs(filter)}" />
    </div>
    <div class="chip-grid" style="flex-direction:column;" id="serviceChoices">
      ${renderServiceChoices(filterServices(filter))}
    </div>
  `;
  bindServiceChoices();
  const search = sheetContent.querySelector("#serviceSearch");
  search.focus();
  search.setSelectionRange(filter.length, filter.length);
  search.addEventListener("input", (e) => {
    document.getElementById("serviceChoices").innerHTML = renderServiceChoices(filterServices(e.target.value));
    bindServiceChoices();
  });
}

function filterServices(query) {
  const q = query.trim().toLowerCase();
  if (!q) return SERVICES;
  return SERVICES.filter((s) => s.name.toLowerCase().includes(q));
}

function renderServiceChoices(list) {
  return list.length ? list.map((s) => `
    <button class="chip service-choice" style="width:100%; display:flex; justify-content:space-between; text-align:left;" data-id="${s.id}">
      <span>${s.category === "combo" ? "🔗 " : ""}${escapeHtml(s.name)} · ${s.duration_minutes} min</span>
      <span>${formatCOP(s.price)}</span>
    </button>
  `).join("") : `<span style="color:var(--text-muted); font-size:13px;">Ningún servicio coincide con la búsqueda.</span>`;
}

function bindServiceChoices() {
  sheetContent.querySelectorAll(".service-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      booking.serviceId = btn.dataset.id;
      goToBarberOrDateTime();
    });
  });
}

function goToBarberOrDateTime() {
  if (hasMultipleBarbers()) {
    stepBarber();
  } else {
    booking.barberId = BARBERS[0]?.id ?? null;
    stepDateTime();
  }
}

function stepBarber() {
  sheetContent.innerHTML = `
    <h2 id="sheetTitle">¿Con quién?</h2>
    <div class="step-label">Paso 2 de ${totalSteps()} · ${escapeHtml(currentService()?.name || "")}</div>
    <div class="chip-grid" style="flex-direction:column;">
      <button class="chip barber-choice" style="width:100%; text-align:left;" data-id="">Cualquiera disponible</button>
      ${BARBERS.map((b) => `
        <button class="chip barber-choice" style="width:100%; text-align:left;" data-id="${b.id}">${escapeHtml(b.name)}</button>
      `).join("")}
    </div>
    <div style="margin-top:16px;">
      <button class="btn btn-ghost btn-sm" id="backBtn">← Volver</button>
    </div>
  `;
  sheetContent.querySelectorAll(".barber-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      booking.barberId = btn.dataset.id || null;
      stepDateTime();
    });
  });
  sheetContent.querySelector("#backBtn").addEventListener("click", () => stepService());
}

async function stepDateTime() {
  booking.date = booking.date || todayISO();
  const dateStepNumber = hasMultipleBarbers() ? 3 : 2;
  sheetContent.innerHTML = `
    <h2 id="sheetTitle">Elige fecha y hora</h2>
    <div class="step-label">Paso ${dateStepNumber} de ${totalSteps()}</div>
    <div class="field">
      <label for="dateInput">Fecha</label>
      <input type="date" id="dateInput" min="${todayISO()}" value="${booking.date}" />
    </div>
    <div class="field">
      <label>Hora disponible</label>
      <div class="chip-grid" id="slotsGrid"><span style="color:var(--text-muted); font-size:13px;">Cargando horarios…</span></div>
    </div>
    <div style="margin-top:8px;">
      <button class="btn btn-ghost btn-sm" id="backBtn">← Volver</button>
    </div>
  `;
  sheetContent.querySelector("#backBtn").addEventListener("click", () => {
    hasMultipleBarbers() ? stepBarber() : stepService();
  });
  sheetContent.querySelector("#dateInput").addEventListener("change", (e) => {
    booking.date = e.target.value;
    renderSlots();
  });
  renderSlots();
}

async function renderSlots() {
  const grid = document.getElementById("slotsGrid");
  const service = currentService();
  const day = hoursForDate(booking.date);
  if (day.closed) {
    grid.innerHTML = `<span style="color:var(--text-muted); font-size:13px;">Cerrado ese día. Elige otra fecha.</span>`;
    return;
  }

  const allSlots = buildSlots(booking.date, service.duration_minutes);

  let query = supabase
    .from("appointments")
    .select("start_time,end_time,barber_id")
    .eq("appointment_date", booking.date)
    .neq("status", "cancelado");
  if (booking.barberId) query = query.eq("barber_id", booking.barberId);

  const { data: existing, error } = await query;
  if (error) console.error(error);

  const busyRanges = (existing || []).map((a) => [timeToMinutes(a.start_time), timeToMinutes(a.end_time)]);

  // Si la fecha elegida es hoy, no ofrecer horarios que ya pasaron (o que empiezan ahora mismo).
  const now = new Date();
  const nowMinutes = booking.date === todayISO() ? now.getHours() * 60 + now.getMinutes() : -1;

  const freeSlots = allSlots.filter((slot) => {
    const start = timeToMinutes(slot);
    if (start <= nowMinutes) return false;
    const end = start + service.duration_minutes;
    return !busyRanges.some(([bStart, bEnd]) => start < bEnd && end > bStart);
  });

  if (!freeSlots.length) {
    grid.innerHTML = `<span style="color:var(--text-muted); font-size:13px;">No hay horarios disponibles ese día.</span>`;
    return;
  }

  grid.innerHTML = freeSlots.map((s) => `<button class="chip slot-choice" data-time="${s}">${formatTime12h(s)}</button>`).join("");
  grid.querySelectorAll(".slot-choice").forEach((btn) => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".slot-choice").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      booking.time = btn.dataset.time;
      setTimeout(stepContact, 150);
    });
  });
}

function stepContact() {
  sheetContent.innerHTML = `
    <h2 id="sheetTitle">Tus datos</h2>
    <div class="step-label">Paso ${totalSteps()} de ${totalSteps()}</div>
    <div class="field">
      <label for="nameInput">Nombre completo</label>
      <input type="text" id="nameInput" placeholder="Ej. Juan Pérez" value="${escapeHtml(booking.name)}" />
    </div>
    <div class="field">
      <label for="phoneInput">Teléfono / WhatsApp</label>
      <input type="tel" id="phoneInput" placeholder="Ej. 3001234567" value="${escapeHtml(booking.phone)}" />
    </div>
    <div class="field">
      <label for="emailInput">Correo electrónico</label>
      <input type="email" id="emailInput" placeholder="Ej. juan@correo.com" value="${escapeHtml(booking.email)}" />
    </div>
    <div class="summary-box">
      <div class="row"><span>Servicio</span><strong>${escapeHtml(currentService()?.name)}</strong></div>
      <div class="row"><span>Barbero</span><strong>${currentBarber() ? escapeHtml(currentBarber().name) : "Cualquiera disponible"}</strong></div>
      <div class="row"><span>Fecha</span><strong>${formatDateEs(booking.date)}</strong></div>
      <div class="row"><span>Hora</span><strong>${formatTime12h(booking.time)}</strong></div>
      <div class="row"><span>Precio</span><strong>${formatCOP(currentService()?.price)}</strong></div>
    </div>
    <button class="btn btn-primary btn-block" id="confirmBtn">Confirmar turno</button>
    <button class="btn btn-ghost btn-block" id="backBtn" style="margin-top:8px;">← Volver</button>
  `;
  sheetContent.querySelector("#backBtn").addEventListener("click", stepDateTime);
  sheetContent.querySelector("#confirmBtn").addEventListener("click", submitBooking);
}

function formatDateEs(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

async function submitBooking() {
  const name = document.getElementById("nameInput").value.trim();
  const phone = document.getElementById("phoneInput").value.trim();
  const email = document.getElementById("emailInput").value.trim();
  if (!name || !phone || !email) {
    showToast("Completa tu nombre, teléfono y correo");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Escribe un correo válido");
    return;
  }
  const btn = document.getElementById("confirmBtn");
  btn.disabled = true;
  btn.textContent = "Reservando…";

  const service = currentService();
  const startMinutes = timeToMinutes(booking.time);
  const endTime = minutesToTime(startMinutes + service.duration_minutes);

  let barberId = booking.barberId;
  if (!barberId && BARBERS.length) {
    // "Cualquiera disponible": elige el primer barbero sin choque de horario
    for (const b of BARBERS) {
      const { data: clash } = await supabase
        .from("appointments")
        .select("id")
        .eq("appointment_date", booking.date)
        .eq("barber_id", b.id)
        .neq("status", "cancelado")
        .lt("start_time", endTime)
        .gt("end_time", booking.time);
      if (!clash || !clash.length) { barberId = b.id; break; }
    }
  }

  const { error } = await supabase.from("appointments").insert({
    client_name: name,
    client_phone: phone,
    client_email: email,
    barber_id: barberId,
    service_id: service.id,
    appointment_date: booking.date,
    start_time: booking.time,
    end_time: endTime,
    status: "pendiente",
  });

  if (error) {
    console.error(error);
    showToast("No se pudo reservar. Intenta de nuevo.");
    btn.disabled = false;
    btn.textContent = "Confirmar turno";
    return;
  }

  booking.name = name;
  booking.phone = phone;
  booking.email = email;
  stepSuccess();
}

function stepSuccess() {
  sheetContent.innerHTML = `
    <div class="confirm-check">
      <div class="icon">✓</div>
      <h2 id="sheetTitle" style="margin:0;">¡Turno reservado!</h2>
      <p style="color:var(--text-muted); font-size:14px; margin:0 0 6px;">
        Te esperamos el ${formatDateEs(booking.date)} a las ${formatTime12h(booking.time)}. Guarda esta confirmación: la reserva quedó a nombre de ${escapeHtml(booking.email)}.
      </p>
      <button class="btn btn-primary btn-block" id="doneBtn">Listo</button>
    </div>
  `;
  sheetContent.querySelector("#doneBtn").addEventListener("click", closeBooking);
}

function showToast(msg) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

loadData();
