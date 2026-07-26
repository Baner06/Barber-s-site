import { supabase, formatCOP, todayISO, formatTime12h, coWhatsappDigits } from "./supabase-client.js";

const cfg = window.BARBER_CONFIG;
document.getElementById("adminBrand").textContent = `${cfg.businessName} · Panel`;
document.title = `${cfg.businessName} · Panel del barbero`;

const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");

/* ---------------- Auth ---------------- */
async function checkSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
    initApp();
  } else {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
  }
}

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errEl.textContent = "Correo o contraseña incorrectos.";
    return;
  }
  checkSession();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await supabase.auth.signOut();
  checkSession();
});

checkSession();

/* ---------------- Navegación de tabs ---------------- */
let appInitialized = false;
document.querySelector(".admin-tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll(".admin-tabs .tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
  document.getElementById("panelAgenda").classList.toggle("hidden", btn.dataset.panel !== "agenda");
  document.getElementById("panelServicios").classList.toggle("hidden", btn.dataset.panel !== "servicios");
  document.getElementById("panelEquipo").classList.toggle("hidden", btn.dataset.panel !== "equipo");
});

let selectedDate = todayISO();

function initApp() {
  if (appInitialized) { loadAgenda(); loadServicesAdmin(); loadBarbersAdmin(); return; }
  appInitialized = true;

  document.getElementById("dateInput").value = selectedDate;
  updateDateLabel();
  loadAgenda();
  loadServicesAdmin();
  loadBarbersAdmin();

  document.getElementById("dateInput").addEventListener("change", (e) => {
    selectedDate = e.target.value;
    updateDateLabel();
    loadAgenda();
  });
  document.getElementById("prevDay").addEventListener("click", () => shiftDay(-1));
  document.getElementById("nextDay").addEventListener("click", () => shiftDay(1));

  document.getElementById("newServiceBtn").addEventListener("click", () => openServiceForm());
  document.getElementById("newBarberBtn").addEventListener("click", () => openBarberForm());
}

function shiftDay(delta) {
  const d = new Date(selectedDate + "T00:00:00");
  d.setDate(d.getDate() + delta);
  selectedDate = d.toISOString().slice(0, 10);
  document.getElementById("dateInput").value = selectedDate;
  updateDateLabel();
  loadAgenda();
}

function updateDateLabel() {
  const d = new Date(selectedDate + "T00:00:00");
  const label = selectedDate === todayISO() ? "Hoy · " : "";
  document.getElementById("dateLabel").textContent = label + d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}

/* ---------------- Mensajes de WhatsApp (envío manual) ---------------- */
function formatDateEsShort(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
}
function waLink(phone, message) {
  return `https://wa.me/${coWhatsappDigits(phone)}?text=${encodeURIComponent(message)}`;
}
function msgConfirmacionRecibida(a) {
  return `Hola ${a.client_name}, tu cita en ${cfg.businessName} quedó registrada para el ${formatDateEsShort(selectedDate)} a las ${formatTime12h(a.start_time)} (${a.services?.name || "servicio"}). Cualquier cambio, escríbenos por este medio. ¡Te esperamos!`;
}
function msgAceptada(a) {
  return `Estimado/a ${a.client_name},

Le confirmamos que su cita en ${cfg.businessName} ha sido agendada para el ${formatDateEsShort(selectedDate)} a las ${formatTime12h(a.start_time)}.

Agradecemos su preferencia y quedamos a su disposición ante cualquier cambio. ¡Será un placer atenderle!`;
}
function msgCancelada(a) {
  return `Hola, ${a.client_name}.

Lamentamos informarte que tu cita programada para el ${formatDateEsShort(selectedDate)} a las ${formatTime12h(a.start_time)} en ${cfg.businessName} ha sido cancelada debido a inconvenientes con nuestra disponibilidad.

Te ofrecemos una sincera disculpa por las molestias causadas. Si deseas programar una nueva fecha u horario, quedamos a tu entera disposición para ayudarte.`;
}
function msgYaCasi(a) {
  return `Hola ${a.client_name}, te contamos que tu barbero ya casi termina con el cliente anterior. Tu cita es a las ${formatTime12h(a.start_time)} en ${cfg.businessName}, así que puedes ir acercándote. ¡Nos vemos en un momento!`;
}

/* ---------------- Agenda ---------------- */
async function loadAgenda() {
  const host = document.getElementById("agendaList");
  host.innerHTML = `<div class="empty-state">Cargando turnos…</div>`;

  const { data, error } = await supabase
    .from("appointments")
    .select("id, client_name, client_phone, client_email, start_time, end_time, status, notes, services(name, price), barbers(name)")
    .eq("appointment_date", selectedDate)
    .order("start_time");

  if (error) {
    host.innerHTML = `<div class="empty-state">No se pudieron cargar los turnos.</div>`;
    console.error(error);
    return;
  }

  if (!data.length) {
    host.innerHTML = `<div class="empty-state"><div class="icon">🗓️</div>No hay turnos este día.</div>`;
    return;
  }

  host.innerHTML = data.map((a) => `
    <div class="agenda-item">
      <div class="time-col">${formatTime12h(a.start_time)}<br/>${formatTime12h(a.end_time)}</div>
      <div class="body">
        <h4>${escapeHtml(a.client_name)} <span class="status-tag status-${a.status}">${a.status}</span></h4>
        <div class="sub">${escapeHtml(a.services?.name || "Servicio eliminado")} · ${escapeHtml(a.barbers?.name || "Sin asignar")} · ${a.services ? formatCOP(a.services.price) : ""}</div>
        <div class="sub">📞 ${escapeHtml(a.client_phone)} · ✉️ ${escapeHtml(a.client_email || "sin correo")}</div>
        <div class="agenda-actions">
          ${a.status !== "confirmado" && a.status !== "cancelado" ? `<button class="btn btn-primary btn-sm" data-action="confirmado" data-id="${a.id}">Confirmar</button>` : ""}
          ${a.status !== "completado" && a.status !== "cancelado" ? `<button class="btn btn-ghost btn-sm" data-action="completado" data-id="${a.id}">Completar</button>` : ""}
          ${a.status !== "cancelado" ? `<button class="btn btn-danger btn-sm" data-action="cancelado" data-id="${a.id}">Cancelar</button>` : ""}
          ${a.status === "cancelado" ? `<button class="btn btn-danger btn-sm" data-delete-id="${a.id}">Borrar de la agenda</button>` : ""}
          <a class="btn btn-ghost btn-sm" href="${waLink(a.client_phone, msgConfirmacionRecibida(a))}" target="_blank" rel="noopener">Enviar confirmación</a>
          <a class="btn btn-ghost btn-sm" href="https://wa.me/${coWhatsappDigits(a.client_phone)}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    </div>
  `).join("");

  host.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.dataset.action;
      const appt = data.find((x) => x.id === btn.dataset.id);
      const { error } = await supabase.from("appointments").update({ status: action }).eq("id", btn.dataset.id);
      if (error) { showToast("No se pudo actualizar"); console.error(error); return; }

      // Abre WhatsApp con el mensaje correcto ya escrito; el barbero solo debe presionar enviar.
      if (appt) {
        if (action === "confirmado") {
          window.open(waLink(appt.client_phone, msgAceptada(appt)), "_blank");
        } else if (action === "cancelado") {
          window.open(waLink(appt.client_phone, msgCancelada(appt)), "_blank");
        } else if (action === "completado") {
          const next = data
            .filter((x) => x.id !== appt.id && x.status !== "cancelado" && x.status !== "completado" && x.start_time > appt.start_time)
            .sort((x, y) => x.start_time.localeCompare(y.start_time))[0];
          if (next) window.open(waLink(next.client_phone, msgYaCasi(next)), "_blank");
        }
      }
      loadAgenda();
    });
  });

  host.querySelectorAll("[data-delete-id]").forEach((btn) => {
    btn.addEventListener("click", () => deleteRow("appointments", btn.dataset.deleteId, loadAgenda));
  });
}

/* ---------------- Servicios (admin) ---------------- */
async function loadServicesAdmin() {
  const host = document.getElementById("servicesAdminList");
  const { data, error } = await supabase.from("services").select("*").order("sort_order");
  if (error) { console.error(error); return; }
  if (!data.length) { host.innerHTML = `<div class="empty-state">Aún no hay servicios.</div>`; return; }
  host.innerHTML = data.map((s) => `
    <div class="list-row">
      <div>
        <strong>${escapeHtml(s.name)}</strong> · ${formatCOP(s.price)} · ${s.duration_minutes} min
        ${s.category === "combo" ? ' <span class="status-tag status-pendiente">combo</span>' : ''}
        ${!s.active ? ' <span class="status-tag status-cancelado">inactivo</span>' : ''}
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-del="${s.id}">Eliminar</button>
      </div>
    </div>
  `).join("");
  host.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => openServiceForm(data.find(s => s.id === b.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => deleteRow("services", b.dataset.del, loadServicesAdmin)));
}

function openServiceForm(service) {
  const overlay = document.getElementById("formOverlay");
  const content = document.getElementById("formContent");
  overlay.hidden = false;
  content.innerHTML = `
    <h2>${service ? "Editar" : "Nuevo"} servicio</h2>
    <div class="field"><label>Nombre</label><input id="fName" value="${escapeAttr(service?.name)}" /></div>
    <div class="field"><label>Descripción</label><textarea id="fDesc">${escapeHtml(service?.description || "")}</textarea></div>
    <div class="form-grid">
      <div class="field"><label>Precio (COP)</label><input id="fPrice" type="number" value="${service?.price ?? ''}" /></div>
      <div class="field"><label>Duración (min)</label><input id="fDuration" type="number" value="${service?.duration_minutes ?? 30}" /></div>
    </div>
    <div class="field">
      <label>Tipo</label>
      <select id="fCategory">
        <option value="individual" ${service?.category !== "combo" ? "selected" : ""}>Servicio individual</option>
        <option value="combo" ${service?.category === "combo" ? "selected" : ""}>Combo (varios servicios)</option>
      </select>
    </div>
    <div class="field"><label><input type="checkbox" id="fPopular" ${service?.popular ? "checked" : ""} style="width:auto; margin-right:6px;" />Marcar como popular</label></div>
    <button class="btn btn-primary btn-block" id="saveBtn">Guardar</button>
    <button class="btn btn-ghost btn-block" id="cancelFormBtn" style="margin-top:8px;">Cancelar</button>
  `;
  content.querySelector("#cancelFormBtn").addEventListener("click", () => overlay.hidden = true);
  content.querySelector("#saveBtn").addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("fName").value.trim(),
      description: document.getElementById("fDesc").value.trim(),
      price: Number(document.getElementById("fPrice").value),
      duration_minutes: Number(document.getElementById("fDuration").value),
      category: document.getElementById("fCategory").value,
      popular: document.getElementById("fPopular").checked,
    };
    if (!payload.name || !payload.price || !payload.duration_minutes) { showToast("Completa nombre, precio y duración"); return; }
    const { error } = service
      ? await supabase.from("services").update(payload).eq("id", service.id)
      : await supabase.from("services").insert(payload);
    if (error) { showToast("No se pudo guardar"); console.error(error); return; }
    overlay.hidden = true;
    loadServicesAdmin();
  });
}

/* ---------------- Colaboradores (admin) ---------------- */
async function loadBarbersAdmin() {
  const host = document.getElementById("barbersAdminList");
  const { data, error } = await supabase.from("barbers").select("*").order("sort_order");
  if (error) { console.error(error); return; }
  if (!data.length) { host.innerHTML = `<div class="empty-state">Aún no hay colaboradores.</div>`; return; }
  host.innerHTML = data.map((b) => `
    <div class="list-row">
      <div><strong>${escapeHtml(b.name)}</strong> · ${escapeHtml(b.role || "Barbero")} · ★ ${Number(b.rating).toFixed(1)}
        ${!b.active ? ' <span class="status-tag status-cancelado">inactivo</span>' : ''}
      </div>
      <div style="display:flex; gap:6px;">
        <button class="btn btn-ghost btn-sm" data-edit="${b.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-del="${b.id}">Eliminar</button>
      </div>
    </div>
  `).join("");
  host.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => openBarberForm(data.find(b => b.id === btn.dataset.edit))));
  host.querySelectorAll("[data-del]").forEach((btn) => btn.addEventListener("click", () => deleteRow("barbers", btn.dataset.del, loadBarbersAdmin)));
}

function openBarberForm(barber) {
  const overlay = document.getElementById("formOverlay");
  const content = document.getElementById("formContent");
  overlay.hidden = false;
  content.innerHTML = `
    <h2>${barber ? "Editar" : "Nuevo"} colaborador</h2>
    <div class="field"><label>Nombre</label><input id="fName" value="${escapeAttr(barber?.name)}" /></div>
    <div class="field"><label>Rol</label><input id="fRole" value="${escapeAttr(barber?.role || 'Barbero')}" /></div>
    <div class="field"><label>URL de foto (opcional)</label><input id="fPhoto" value="${escapeAttr(barber?.photo_url || '')}" /></div>
    <button class="btn btn-primary btn-block" id="saveBtn">Guardar</button>
    <button class="btn btn-ghost btn-block" id="cancelFormBtn" style="margin-top:8px;">Cancelar</button>
  `;
  content.querySelector("#cancelFormBtn").addEventListener("click", () => overlay.hidden = true);
  content.querySelector("#saveBtn").addEventListener("click", async () => {
    const payload = {
      name: document.getElementById("fName").value.trim(),
      role: document.getElementById("fRole").value.trim(),
      photo_url: document.getElementById("fPhoto").value.trim() || null,
    };
    if (!payload.name) { showToast("Escribe un nombre"); return; }
    const { error } = barber
      ? await supabase.from("barbers").update(payload).eq("id", barber.id)
      : await supabase.from("barbers").insert(payload);
    if (error) { showToast("No se pudo guardar"); console.error(error); return; }
    overlay.hidden = true;
    loadBarbersAdmin();
  });
}

async function deleteRow(table, id, refresh) {
  if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) { showToast("No se pudo eliminar (puede tener turnos asociados)"); console.error(error); return; }
  refresh();
}

document.getElementById("formOverlay").addEventListener("click", (e) => {
  if (e.target.id === "formOverlay") e.target.hidden = true;
});

/* ---------------- Utilidades ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
function escapeAttr(str) {
  return (str ?? "").replace(/"/g, "&quot;");
}
function showToast(msg) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  host.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}
