
// Admin / Read-only control
const READ_ONLY_DEFAULT = true; // lecture seule par défaut
const ADMIN_PIN_SHA256 = "a1fb4e703a9ef1fa4936801721ff285a97ac85330856674412e054892afe6972";

function isAdmin() { return sessionStorage.getItem('admin') === '1'; }
function setAdmin(v) { if (v) sessionStorage.setItem('admin','1'); else sessionStorage.removeItem('admin'); updateAdminUI(); dispatchEvent(new Event('admin-change')); }
function isReadOnly() { return READ_ONLY_DEFAULT && !isAdmin(); }

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function promptAdminUnlock() {
  const pin = prompt('Entrez le PIN Admin:');
  if (!pin) return false;
  const h = await sha256Hex(pin);
  if (h === ADMIN_PIN_SHA256) { setAdmin(true); alert('Mode Admin activé'); return true; }
  alert('PIN invalide'); return false;
}

function updateAdminUI() {
  const btn = document.getElementById('adminToggle');
  const badge = document.getElementById('adminStatus');
  if (!btn) return;
  if (isAdmin()) { btn.textContent = '🔓 Admin'; badge && (badge.style.display='inline-block'); }
  else { btn.textContent = '🔒 Admin'; badge && (badge.style.display='none'); }
}

// Wire button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('adminToggle');
  if (btn) btn.addEventListener('click', async () => {
    if (isAdmin()) setAdmin(false);
    else await promptAdminUnlock();
  });
  updateAdminUI();
});
