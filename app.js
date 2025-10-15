// scripts/app.js
/* Simple single-file app: storage, validators, UI, settings toggle, search, dashboard */
const KEY = 'finance:records_v1';

/* ------------------ Helpers ------------------ */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const escapeHtml = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid = () => 'txn_' + Date.now().toString(36);

/* Safe regex compile */
function safeRegex(pattern, flags='') {
  if (!pattern) return null;
  try { return new RegExp(pattern, flags); } catch { return null; }
}
function highlightHtml(text, re) {
  const t = escapeHtml(text);
  if (!re) return t;
  return t.replace(re, m => `<mark>${escapeHtml(m)}</mark>`);
}

/* ------------------ Storage ------------------ */
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function saveRecords(records) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

/* ------------------ Validators ------------------ */
const PATTERNS = {
  description: /^\S(?:.*\S)?$/,
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/
};
const duplicateWords = /\b(\w+)\s+\1\b/i;

function validate(tx) {
  const errors = {};
  if (!PATTERNS.description.test(tx.description || '')) errors.description = 'No leading/trailing spaces allowed.';
  if (!PATTERNS.amount.test(String(tx.amount || ''))) errors.amount = 'Amount must be integer or up to 2 decimals.';
  if (!PATTERNS.date.test(tx.date || '')) errors.date = 'Date must be YYYY-MM-DD.';
  if (!PATTERNS.category.test(tx.category || '')) errors.category = 'Letters, spaces and hyphens only.';
  return errors;
}

/* ------------------ UI state ------------------ */
let records = loadRecords();

/* Elements */
const settingsToggle = $('#settingsToggle');
const settingsPanel = $('#settingsPanel');
const overlay = $('#overlay');
const settingsClose = $('#settingsClose');
const settingsStatus = $('#settingsStatus');
const exportBtn = $('#exportBtn');
const importFile = $('#importFile');
const currencyInput = $('#currencyInput');

const addForm = $('#addForm');
const recordsGrid = $('#records');
const dashboard = $('#dashboard');
const searchSection = $('#search');
const searchInput = $('#searchInput');
const caseInsensitive = $('#caseInsensitive');
const totalCountEl = $('#totalCount');
const totalAmountEl = $('#totalAmount');
const topCategoryEl = $('#topCategory');
const capInput = $('#capInput');
const capStatus = $('#capStatus');

/* Ensure the UI starts with only the add form visible */
function initVisibility() {
  dashboard.classList.add('hidden');
  searchSection.classList.add('hidden');
  recordsGrid.classList.add('hidden');
  settingsPanel.classList.remove('active');
  overlay.classList.add('hidden');
  settingsPanel.setAttribute('aria-hidden', 'true');
  settingsToggle.setAttribute('aria-expanded', 'false');
}

/* ------------------ Settings toggle behavior ------------------ */
function openSettings() {
  settingsPanel.classList.add('active');
  overlay.classList.remove('hidden');
  settingsPanel.setAttribute('aria-hidden', 'false');
  settingsToggle.setAttribute('aria-expanded', 'true');
}
function closeSettings() {
  settingsPanel.classList.remove('active');
  overlay.classList.add('hidden');
  settingsPanel.setAttribute('aria-hidden', 'true');
  settingsToggle.setAttribute('aria-expanded', 'false');
}
settingsToggle.addEventListener('click', () => {
  const active = settingsPanel.classList.toggle('active');
  if (active) overlay.classList.remove('hidden');
  else overlay.classList.add('hidden');
  settingsPanel.setAttribute('aria-hidden', String(!active));
  settingsToggle.setAttribute('aria-expanded', String(active));
});
settingsClose?.addEventListener('click', closeSettings);
overlay.addEventListener('click', closeSettings);
window.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') closeSettings();
});
window.addEventListener('resize', () => {
  // ensure settings not left visible erroneously on resize: keep current logic but ensure overlay hidden on desktop
  if (window.innerWidth >= 1024 && settingsPanel.classList.contains('active')) {
    overlay.classList.add('hidden');
  }
});

/* ------------------ Render functions ------------------ */
function renderRecords(filterPattern = '') {
  const flags = caseInsensitive.checked ? 'gi' : 'g';
  const re = safeRegex(filterPattern, flags);
  const list = records.slice().reverse(); // newest first
  const filtered = re ? list.filter(r => (re.test(r.description) || re.test(r.category) || re.test(String(r.amount)))) : list;
  recordsGrid.innerHTML = '';
  if (filtered.length === 0) {
    recordsGrid.innerHTML = `<div class="card">No transactions yet.</div>`;
    return;
  }
  for (const r of filtered) {
    const card = document.createElement('article');
    card.className = 'record-card';
    card.dataset.id = r.id;
    const title = document.createElement('h3');
    title.innerHTML = highlightHtml(r.description, re);
    const meta = document.createElement('div');
    meta.className = 'record-meta';
    meta.innerHTML = `<div>Amount: $${highlightHtml(String(r.amount), re)}</div>
                      <div>Category: ${highlightHtml(r.category, re)}</div>
                      <div>Date: ${escapeHtml(r.date)}</div>`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const edit = document.createElement('button');
    edit.className = 'edit-btn';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => startEdit(r.id));
    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = 'Delete';
    del.addEventListener('click', () => {
      if (confirm('Delete this record?')) {
        records = records.filter(x => x.id !== r.id);
        saveRecords(records);
        renderRecords(searchInput.value.trim());
        updateDashboard();
      }
    });
    actions.appendChild(edit);
    actions.appendChild(del);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(actions);
    recordsGrid.appendChild(card);
  }
}

function updateDashboard() {
  const total = records.reduce((s, r) => s + Number(r.amount || 0), 0);
  totalCountEl.textContent = records.length;
  totalAmountEl.textContent = total.toFixed(2);
  // top category
  const counts = {};
  for (const r of records) counts[r.category] = (counts[r.category] || 0) + 1;
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
  topCategoryEl.textContent = top;
  // cap
  const cap = parseFloat(capInput.value) || 0;
  if (cap > 0) {
    const rem = cap - total;
    if (rem >= 0) {
      capStatus.textContent = `Remaining: $${rem.toFixed(2)}`;
      capStatus.style.color = '#8fe78f';
    } else {
      capStatus.textContent = `Over cap by $${(-rem).toFixed(2)}`;
      capStatus.style.color = '#ff8080';
    }
  } else {
    capStatus.textContent = '';
  }
}

/* ------------------ Edit flow ------------------ */
function startEdit(id) {
  const rec = records.find(r => r.id === id);
  if (!rec) return;
  const card = document.querySelector(`.record-card[data-id="${id}"]`);
  if (!card) return;
  card.innerHTML = `
    <form class="edit-form">
      <label>Description <input name="description" value="${escapeHtml(rec.description)}" required /></label>
      <label>Amount <input name="amount" type="number" step="0.01" value="${escapeHtml(String(rec.amount))}" required /></label>
      <label>Category <input name="category" value="${escapeHtml(rec.category)}" required /></label>
      <label>Date <input name="date" type="date" value="${escapeHtml(rec.date)}" required /></label>
      <div class="actions">
        <button type="submit">Save</button>
        <button type="button" class="secondary cancel-edit">Cancel</button>
      </div>
    </form>`;
  const form = card.querySelector('.edit-form');
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const upd = {
      description: fd.get('description').trim(),
      amount: fd.get('amount'),
      category: fd.get('category').trim(),
      date: fd.get('date')
    };
    const errors = validate(upd);
    if (Object.keys(errors).length) {
      alert('Fix: ' + Object.values(errors).join(', '));
      return;
    }
    // apply
    records = records.map(r => r.id === id ? ({ ...r,
      description: upd.description.replace(/\s{2,}/g,' '),
      amount: parseFloat(upd.amount),
      category: upd.category,
      date: upd.date,
      updatedAt: new Date().toISOString()
    }) : r);
    saveRecords(records);
    renderRecords(searchInput.value.trim());
    updateDashboard();
  });
  card.querySelector('.cancel-edit').addEventListener('click', () => renderRecords(searchInput.value.trim()));
}

/* ------------------ Form submit (Add) ------------------ */
addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const fd = new FormData(addForm);
  const tx = {
    description: (fd.get('description') || '').trim(),
    amount: fd.get('amount'),
    category: (fd.get('category') || '').trim(),
    date: fd.get('date')
  };
  // collapse multiple spaces
  tx.description = tx.description.replace(/\s{2,}/g,' ');
  // validate
  const errors = validate(tx);
  // show inline errors
  ['description','amount','category','date'].forEach(k => {
    const el = $(`#err_${k}`);
    if (errors[k]) { el.textContent = errors[k]; } else { el.textContent = ''; }
  });
  if (Object.keys(errors).length) return;
  // create record
  const rec = {
    id: uid(),
    description: tx.description,
    amount: parseFloat(tx.amount),
    category: tx.category,
    date: tx.date,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  records.push(rec);
  saveRecords(records);

  // After successful add: reveal dashboard, search, records
  dashboard.classList.remove('hidden');
  searchSection.classList.remove('hidden');
  recordsGrid.classList.remove('hidden');

  // reset form
  addForm.reset();
  // render
  renderRecords('');
  updateDashboard();

  // move focus to dashboard for keyboard users
  dashboard.focus();
});

/* clear button */
$('#clearBtn').addEventListener('click', () => addForm.reset());

/* ------------------ Search ------------------ */
searchInput.addEventListener('input', (e) => {
  renderRecords(e.target.value.trim());
});
caseInsensitive.addEventListener('change', () => renderRecords(searchInput.value.trim()));

/* ------------------ Settings import/export ------------------ */
exportBtn.addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'finance_records.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  settingsStatus.textContent = 'Exported!';
});
importFile.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      if (!Array.isArray(parsed)) throw new Error('Invalid structure');
      // basic validation of each record and add
      for (const rec of parsed) {
        if (rec.id && rec.description && rec.amount != null && rec.category && rec.date) {
          records.push(rec);
        }
      }
      saveRecords(records);
      settingsStatus.textContent = 'Imported!';
      // reveal UI if not visible
      dashboard.classList.remove('hidden');
      searchSection.classList.remove('hidden');
      recordsGrid.classList.remove('hidden');
      renderRecords('');
      updateDashboard();
    } catch (err) {
      settingsStatus.textContent = 'Import failed: invalid JSON';
    }
  };
  r.readAsText(f);
});

/* Cap input live */
capInput.addEventListener('input', updateDashboard);

/* ------------------ Startup ------------------ */
initVisibility();
renderRecords('');
updateDashboard();
