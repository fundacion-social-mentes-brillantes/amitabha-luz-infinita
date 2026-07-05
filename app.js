/* ============================================================
   Amitabha Luz Infinita — Gestión de velas artesanales
   SPA vanilla JS · Guarda siempre en localStorage; Firebase opcional.
   ============================================================ */

const $ = (q) => document.querySelector(q);
const esc = (v) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const pad = (n) => String(n).padStart(2,'0');
// Fechas en hora LOCAL (Colombia): toISOString usa UTC y corre la fecha después de las 7 p. m.
const localDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => localDate(new Date());
const parseDate = (s) => { const [y,m,d] = String(s || today()).split('-').map(Number); return new Date(y || 1970, (m || 1) - 1, d || 1); };
const addDays = (date, days) => { const d = parseDate(date); d.setDate(d.getDate() + num(days)); return localDate(d); };
// Acepta coma decimal (estilo colombiano) y nunca devuelve NaN
const num = (v) => { if (typeof v === 'string') v = v.trim().replace(',', '.'); if (v === '' || v == null) return 0; const n = Number(v); return Number.isFinite(n) ? n : 0; };
const money = (v) => { try { return new Intl.NumberFormat('es-CO', { style:'currency', currency: state.config.currency || 'COP', maximumFractionDigits: 0 }).format(num(v)); } catch { return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', maximumFractionDigits: 0 }).format(num(v)); } };
const perc = (v) => `${(num(v)*100).toFixed(1)}%`;
const pct = (v) => num(v)/100;
const qty1 = (v) => { const n = num(v); return Number.isInteger(n) ? String(n) : n.toFixed(1); };

const NAV = [['Dashboard','✨'],['Insumos','📦'],['Proveedores','🤝'],['Compras','🛍️'],['Productos','🕯️'],['Recetas','📖'],['Producción','🔥'],['Ventas','🏷️'],['Clientes','💕'],['Gastos','💸'],['Reportes','📊'],['Configuración','⚙️']];
const iconOf = (name) => (NAV.find(x => x[0] === name) || ['',''])[1];
const TIPS = {
  Dashboard:'Tu negocio de un vistazo: ventas del mes, alertas y accesos rápidos.',
  Insumos:'Tus materias primas: ceras, fragancias, mechas, envases y más.',
  Proveedores:'Tu directorio de proveedores de confianza.',
  Compras:'Cada compra suma stock y actualiza el costo promedio del insumo.',
  Productos:'Las velas que vendes, con su precio y stock terminado.',
  Recetas:'Fórmulas con costo real por unidad y precio sugerido.',
  Producción:'Lotes de fabricación: descuentan insumos y suman stock terminado.',
  Ventas:'Registra cada venta y mira tu ganancia real al instante.',
  Clientes:'Tus clientas y clientes frecuentes.',
  Gastos:'Gastos generales del negocio (arriendo, servicios, publicidad…).',
  Reportes:'Rentabilidad por producto, canal y evolución mensual.',
  Configuración:'Ajustes del negocio, respaldos y restauración de datos.',
};

const LS = 'amitabha-luz-infinita-v1';
const SESSION = 'amitabha-session';
let active = 'Dashboard';
let editing = null;            // {type, id} cuando se está editando un registro
let user = null;
let cloud = null;
let toastTimer = null;

function demoState(){return {config:{businessName:'Amitabha Luz Infinita',instagram:'amitabha.luzinfinita',currency:'COP',targetMargin:.55,paymentFeePct:.04,soyCureDays:10,paraffinCureDays:4,costingMethod:'Promedio ponderado móvil'},suppliers:[{id:'sup1',name:'Proveedor principal',phone:'',city:'Bogotá',notes:'Demo'}],supplies:[{id:'soy',name:'Cera de soya',category:'Cera',waxType:'Soya',unitBase:'g',supplierId:'sup1',averageCost:35,currentStock:5000,minimumStock:1000,technicalNotes:'Base principal. Curado 7 a 14 días.'},{id:'paraffin',name:'Parafina',category:'Cera',waxType:'Parafina',unitBase:'g',supplierId:'sup1',averageCost:15.9,currentStock:3000,minimumStock:800,technicalNotes:'Línea secundaria.'},{id:'frag',name:'Fragancia vainilla premium',category:'Fragancia',unitBase:'g',supplierId:'sup1',averageCost:284,currentStock:800,minimumStock:150,technicalNotes:'Verificar IFRA.'},{id:'wick',name:'Mecha de madera',category:'Mecha',unitBase:'und',supplierId:'sup1',averageCost:1200,currentStock:80,minimumStock:20,technicalNotes:'Probar por diámetro.'},{id:'jar',name:'Envase vidrio 200 g',category:'Envase',unitBase:'und',supplierId:'sup1',averageCost:2100,currentStock:60,minimumStock:12,technicalNotes:'Premium.'},{id:'label',name:'Etiqueta marca + seguridad',category:'Etiqueta',unitBase:'und',supplierId:'sup1',averageCost:110,currentStock:120,minimumStock:30,technicalNotes:'Incluir advertencia.'},{id:'box',name:'Caja empaque',category:'Empaque',unitBase:'und',supplierId:'sup1',averageCost:1200,currentStock:45,minimumStock:10,technicalNotes:'Regalo.'}],products:[{id:'prod1',sku:'ALI-SOY-200',name:'Vela de soya 200 g',category:'Recipiente',waxType:'Soya',targetWeightG:200,salePrice:69900,finishedStock:12,status:'Activo'}],recipes:[{id:'rec1',productId:'prod1',name:'Receta soya premium 200 g',version:1,waxType:'Soya',targetWeightG:200,fragrancePct:8,waxSupplyId:'soy',fragranceSupplyId:'frag',wickSupplyId:'wick',vesselSupplyId:'jar',labelSupplyId:'label',packageSupplyId:'box',laborCostUnit:1875,overheadCostUnit:500,wastePct:2,cureDays:10,status:'Aprobada',notes:'Soya-first.'}],purchases:[],productions:[],sales:[],customers:[],expenses:[],movements:[]}}

const COLLECTIONS = { supplier:'suppliers', supply:'supplies', product:'products', recipe:'recipes', purchase:'purchases', production:'productions', sale:'sales', customer:'customers', expense:'expenses' };

// Sanea cualquier estado cargado (localStorage, nube o respaldo pegado)
function normalizeState(raw){
  const base = demoState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const s = { ...base, ...raw, config: { ...base.config, ...(raw.config || {}) } };
  Object.values(COLLECTIONS).concat(['movements']).forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  if (!/^[A-Za-z]{3}$/.test(String(s.config.currency || ''))) s.config.currency = 'COP';
  s.config.currency = s.config.currency.toUpperCase();
  return s;
}
let state = (() => { try { return normalizeState(JSON.parse(localStorage.getItem(LS) || 'null')); } catch { return demoState(); } })();

/* ============ Nube (Firebase opcional) ============ */
async function initFirebase(){
  const cfg = window.AMITABHA_FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) return;
  const [appMod, authMod, fsMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js'),
  ]);
  const app = appMod.initializeApp(cfg); const auth = authMod.getAuth(app); const db = fsMod.getFirestore(app);
  cloud = { authMod, fsMod, auth, db };
  setSync('Nube lista');
  // Sesión persistente: si ya había iniciado sesión, entra directo sin pedir clave otra vez
  authMod.onAuthStateChanged(auth, async (u) => {
    if (u && !user) { user = u; try { await loadCloud(); } catch {} setSync('Sincronizado ✓'); enterApp(); }
  });
}
async function loadCloud(){ if (!cloud || !user?.uid) return; const { doc, getDoc } = cloud.fsMod; const snap = await getDoc(doc(cloud.db,'businesses',user.uid,'app','state')); if (snap.exists()) { state = normalizeState(snap.data().payload); localStorage.setItem(LS, JSON.stringify(state)); } }
function setSync(t){ const el = $('#syncStatus'); if (el) el.textContent = t; }

async function save(){
  localStorage.setItem(LS, JSON.stringify(state));
  render(); // la pantalla responde de inmediato; la nube sincroniza después
  if (cloud && user?.uid && user.uid !== 'local') {
    setSync('Guardando en la nube…');
    try {
      const { doc, setDoc, serverTimestamp } = cloud.fsMod;
      await Promise.race([
        setDoc(doc(cloud.db,'businesses',user.uid,'app','state'), { payload: state, updatedAt: serverTimestamp() }, { merge: true }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
      ]);
      setSync('Sincronizado ✓');
    } catch { setSync('Guardado local · nube pendiente'); }
  } else setSync('Guardado local ✓');
}

/* ============ Sesión ============ */
function enterApp(){ $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); render(); }
function showLogin(){ $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); }
function loginError(err){
  const code = err?.code || '';
  if (code.includes('invalid-email')) return 'El correo no es válido.';
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('email-already-in-use') || code.includes('wrong-password') || code.includes('invalid-credential')) return 'Contraseña incorrecta para ese correo.';
  if (code.includes('network-request-failed')) return 'Sin conexión. Intenta de nuevo.';
  return err?.message || 'No se pudo iniciar sesión.';
}

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('#email').value.trim() || 'demo@amitabha.local';
  const pass = $('#password').value || '123456';
  try {
    if (cloud) {
      const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = cloud.authMod;
      try { user = (await signInWithEmailAndPassword(cloud.auth, email, pass)).user; }
      catch { user = (await createUserWithEmailAndPassword(cloud.auth, email, pass)).user; }
      await loadCloud();
      $('#loginStatus').textContent = 'Conectada con la nube ✓';
    } else {
      user = { uid: 'local', email };
      localStorage.setItem(SESSION, 'local');
    }
    enterApp();
  } catch (err) { $('#loginStatus').textContent = loginError(err); }
});
$('#googleLogin')?.addEventListener('click', async () => {
  try {
    if (!cloud) { $('#loginStatus').textContent = 'Primero configura Firebase para usar Google.'; return; }
    const { GoogleAuthProvider, signInWithPopup } = cloud.authMod;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    user = (await signInWithPopup(cloud.auth, provider)).user;
    await loadCloud();
    $('#loginStatus').textContent = 'Conectada con Google ✓';
    enterApp();
  } catch (err) { $('#loginStatus').textContent = loginError(err); }
});
$('#logout').addEventListener('click', async () => {
  if (cloud) { try { await cloud.authMod.signOut(cloud.auth); } catch {} }
  user = null; editing = null; active = 'Dashboard';
  localStorage.removeItem(SESSION);
  showLogin();
});

/* ============ Cálculos ============ */
function supply(id){ return state.supplies.find(s => s.id === id) || {}; }
function product(id){ return state.products.find(p => p.id === id) || {}; }
function calcRecipe(r){
  const fr = pct(r.fragrancePct), target = num(r.targetWeightG);
  const waxG = target / (1 + fr), fragG = waxG * fr;
  const waxCost = waxG * num(supply(r.waxSupplyId).averageCost), fragCost = fragG * num(supply(r.fragranceSupplyId).averageCost);
  const fixed = ['wickSupplyId','vesselSupplyId','labelSupplyId','packageSupplyId'].reduce((a,k) => a + num(supply(r[k]).averageCost), 0);
  const materials = waxCost + fragCost + fixed, waste = materials * pct(r.wastePct);
  const productionCost = materials + waste + num(r.laborCostUnit) + num(r.overheadCostUnit);
  const fee = num(state.config.paymentFeePct), margin = num(state.config.targetMargin);
  return { waxG, fragG, waxCost, fragCost, materials, waste, productionCost, priceFloor: productionCost/Math.max(.01, 1-fee), suggestedPrice: productionCost/Math.max(.01, 1-fee-margin) };
}
const prodStatus = (p) => (p.readyToSellDate && p.readyToSellDate > today()) ? 'En curado' : 'Lista para venta';
function stats(){
  const month = today().slice(0,7);
  const s = state.sales.filter(x => String(x.date).startsWith(month));
  const sales = s.reduce((a,b) => a + num(b.netTotal), 0), profit = s.reduce((a,b) => a + num(b.profit), 0);
  return { sales, profit, units: s.reduce((a,b) => a + num(b.quantity), 0), low: state.supplies.filter(x => num(x.currentStock) <= num(x.minimumStock)).length, curing: state.productions.filter(x => prodStatus(x) === 'En curado').length, margin: sales ? profit/sales : 0 };
}
function alerts(){
  const out = [];
  state.supplies.forEach(s => { if (num(s.currentStock) <= num(s.minimumStock)) out.push(['Alta','Inventario crítico',`${s.name} está por debajo del stock mínimo (${qty1(s.currentStock)} ${s.unitBase || ''} / mín. ${qty1(s.minimumStock)}).`]); });
  state.recipes.forEach(r => {
    const c = calcRecipe(r), p = product(r.productId), m = p.salePrice ? (p.salePrice - c.productionCost)/p.salePrice : 0;
    if (p.salePrice && m < num(state.config.targetMargin) - .05) out.push(['Media','Margen bajo',`${p.name} tiene margen ${perc(m)} frente al objetivo ${perc(state.config.targetMargin)}.`]);
    if (c.fragCost/Math.max(1, c.materials) > .35) out.push(['Media','Fragancia costosa',`La fragancia supera el 35% del costo de materiales en ${r.name}.`]);
    if (num(r.fragrancePct) > 10) out.push(['Alta','Revisar IFRA',`${r.name} supera 10% de fragancia.`]);
  });
  state.productions.filter(p => prodStatus(p) === 'En curado').forEach(p => out.push(['Baja','Curado en proceso',`El lote ${p.batchCode} estará listo el ${p.readyToSellDate}.`]));
  return out;
}

/* ============ Componentes UI ============ */
function toast(msg, type = 'ok'){
  const t = $('#toast'); if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}
function kpis(){
  const s = stats();
  const items = [['💰','Ventas del mes',money(s.sales)],['💗','Ganancia del mes',money(s.profit)],['🕯️','Unidades del mes',s.units],['📈','Margen del mes',perc(s.margin)],['⚠️','Stock bajo',s.low],['⏳','Lotes en curado',s.curing]];
  return `<div class="kpis">${items.map(x => `<div class="kpi"><span class="kpi-ic">${x[0]}</span><span>${x[1]}</span><strong>${x[2]}</strong></div>`).join('')}</div>`;
}
function table(rows, cols, opts = {}){
  const extra = opts.type ? 1 : 0;
  const head = cols.map(c => `<th>${c[0]}</th>`).join('') + (extra ? '<th></th>' : '');
  const body = rows.length ? rows.map(r =>
    `<tr>${cols.map(c => `<td>${typeof c[1] === 'function' ? c[1](r) : esc(r[c[1]] ?? '')}</td>`).join('')}${extra ? `<td><span class="row-actions">${opts.editable ? `<button type="button" class="icon-btn" data-edit-row="${opts.type}:${r.id}" title="Editar" aria-label="Editar">✏️</button>` : ''}<button type="button" class="icon-btn del" data-del="${opts.type}:${r.id}" title="Eliminar" aria-label="Eliminar">🗑️</button></span></td>` : ''}</tr>`
  ).join('') : `<tr><td class="empty" colspan="${cols.length + extra}"><span>🕯️</span><br>${esc(opts.empty || 'Aún no hay registros. ¡Crea el primero aquí arriba!')}</td></tr>`;
  const wide = rows.length > 0 && (cols.length + extra) > 3;
  return `${wide ? '<p class="scroll-hint">Desliza la tabla para ver más →</p>' : ''}<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function form(fields, action, rec = null){
  const val = (f) => { const v = rec ? (rec[f.name] ?? '') : (f.value ?? ''); return v; };
  const controls = fields.map(f => {
    const v = val(f);
    let input;
    if (f.type === 'select') {
      input = `<select name="${f.name}">${f.options.map(o => { const ov = o.v ?? o, ot = o.t ?? o; return `<option value="${esc(ov)}"${String(ov) === String(v) ? ' selected' : ''}>${esc(ot === '' ? '—' : ot)}</option>`; }).join('')}</select>`;
    } else {
      const extra = f.type === 'number' ? ' step="any" inputmode="decimal"' : '';
      input = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder ?? '')}"${extra} />`;
    }
    return `<label>${esc(f.label)}${input}</label>`;
  }).join('');
  return `<form class="form-grid" data-action="${action}"${rec ? ` data-edit="${esc(rec.id)}"` : ''}>${controls}<div class="form-actions"><button>${rec ? 'Actualizar ✓' : 'Guardar'}</button>${rec ? '<button type="button" class="ghost" data-cancel-edit>Cancelar</button>' : ''}</div></form>`;
}
function formBox(title, fields, action, forceOpen = false){
  const rec = editing && editing.type === action ? (state[COLLECTIONS[action]] || []).find(x => x.id === editing.id) : null;
  const open = (rec || forceOpen) ? ' open' : '';
  return `<details class="new-box"${open}><summary>${rec ? '✏️ Editando — corrige y actualiza' : `➕ ${esc(title)}`}</summary>${form(fields, action, rec)}</details>`;
}
function alertHtml(a){
  return a.length
    ? `<div class="alerts">${a.map(x => `<div class="alert ${x[0].toLowerCase()}"><strong>${esc(x[1])}</strong><p>${esc(x[2])}</p><small>${esc(x[0])}</small></div>`).join('')}</div>`
    : `<p class="empty-note">🌸 Todo en orden. Sin alertas por ahora.</p>`;
}
function recipeCard(r){
  const c = calcRecipe(r), p = product(r.productId);
  return `<article class="recipe">
    <div class="recipe-head"><div><h3>${esc(r.name)}</h3><p>${esc(p.name || 'Sin producto')} · ${esc(r.waxType || '')} · v${esc(r.version ?? 1)}</p></div>
    <span class="row-actions"><button type="button" class="icon-btn" data-edit-row="recipe:${r.id}" title="Editar" aria-label="Editar">✏️</button><button type="button" class="icon-btn del" data-del="recipe:${r.id}" title="Eliminar" aria-label="Eliminar">🗑️</button></span></div>
    <div class="mini-grid">
      <span>Cera: <b>${c.waxG.toFixed(1)} g</b></span><span>Fragancia: <b>${c.fragG.toFixed(1)} g</b></span>
      <span>Costo unidad: <b>${money(c.productionCost)}</b></span><span>Precio mínimo: <b>${money(c.priceFloor)}</b></span>
      <span>Precio sugerido: <b>${money(c.suggestedPrice)}</b></span><span>Curado: <b>${num(r.cureDays)} días</b></span>
    </div>
    ${r.notes ? `<p class="recipe-notes">${esc(r.notes)}</p>` : ''}
  </article>`;
}
function badge(text, cls){ return `<span class="badge ${cls}">${esc(text)}</span>`; }

/* ============ Guardar / actualizar / eliminar ============ */
const parsers = {
  supplier: d => ({ ...d }),
  customer: d => ({ ...d }),
  expense: d => ({ ...d, amount: num(d.amount) }),
  supply: d => ({ ...d, averageCost: num(d.averageCost), currentStock: num(d.currentStock), minimumStock: num(d.minimumStock) }),
  product: d => ({ ...d, targetWeightG: num(d.targetWeightG), salePrice: num(d.salePrice), finishedStock: num(d.finishedStock) }),
  recipe: d => ({ ...d, version: num(d.version || 1), targetWeightG: num(d.targetWeightG), fragrancePct: num(d.fragrancePct), laborCostUnit: num(d.laborCostUnit), overheadCostUnit: num(d.overheadCostUnit), wastePct: num(d.wastePct), cureDays: num(d.cureDays) }),
};

const actions = {
  supplier: async d => { if (!d.name?.trim()) { toast('Escribe el nombre del proveedor', 'warn'); return; } state.suppliers.push({ id: uid(), ...parsers.supplier(d) }); await save(); toast('Proveedor guardado ✓'); },
  customer: async d => { if (!d.name?.trim()) { toast('Escribe el nombre del cliente', 'warn'); return; } state.customers.push({ id: uid(), ...parsers.customer(d) }); await save(); toast('Cliente guardado ✓'); },
  expense: async d => { state.expenses.push({ id: uid(), ...parsers.expense(d) }); await save(); toast('Gasto registrado ✓'); },
  supply: async d => { if (!d.name?.trim()) { toast('Escribe el nombre del insumo', 'warn'); return; } state.supplies.push({ id: uid(), ...parsers.supply(d) }); await save(); toast('Insumo guardado ✓'); },
  product: async d => { if (!d.name?.trim()) { toast('Escribe el nombre del producto', 'warn'); return; } state.products.push({ id: uid(), ...parsers.product(d), status: 'Activo' }); await save(); toast('Producto guardado ✓'); },
  recipe: async d => { if (!d.name?.trim()) { toast('Escribe el nombre de la receta', 'warn'); return; } state.recipes.push({ id: uid(), ...parsers.recipe(d), status: 'Aprobada' }); await save(); toast('Receta guardada ✓'); },
  purchase: async d => {
    const s = state.supplies.find(x => x.id === d.supplyId);
    if (!s) { toast('Primero crea el insumo en la pantalla Insumos', 'warn'); return; }
    const qty = num(d.quantity);
    if (qty <= 0) { toast('La cantidad debe ser mayor a cero', 'warn'); return; }
    const unit = num(d.unitCost);
    const total = qty * unit + num(d.shipping) + num(d.taxes) - num(d.discount);
    const landed = total / qty;
    const old = num(s.currentStock), avg = num(s.averageCost), newStock = old + qty;
    s.averageCost = newStock > 0 ? ((old * avg) + (qty * landed)) / newStock : landed;
    s.currentStock = newStock;
    if (d.lot) s.lot = d.lot;
    state.purchases.push({ id: uid(), ...d, quantity: qty, unitCost: unit, total, landedUnitCost: landed });
    await save(); toast(`Compra registrada ✓ Nuevo costo promedio: ${money(s.averageCost)}`);
  },
  production: async d => {
    const r = state.recipes.find(x => x.id === d.recipeId);
    if (!r) { toast('Primero crea una receta en la pantalla Recetas', 'warn'); return; }
    const units = num(d.plannedUnits);
    if (units <= 0) { toast('Las unidades deben ser mayores a cero', 'warn'); return; }
    const c = calcRecipe(r);
    const usos = [
      { id: r.waxSupplyId, q: c.waxG * units },
      { id: r.fragranceSupplyId, q: c.fragG * units },
      ...['wickSupplyId','vesselSupplyId','labelSupplyId','packageSupplyId'].map(k => ({ id: r[k], q: units })),
    ].filter(u => u.id);
    const faltantes = [];
    usos.forEach(u => { const s = state.supplies.find(x => x.id === u.id); if (!s) return; if (num(s.currentStock) < u.q) faltantes.push(s.name); s.currentStock = Math.max(0, num(s.currentStock) - u.q); });
    const p = state.products.find(x => x.id === r.productId);
    if (p) p.finishedStock = num(p.finishedStock) + units;
    const seq = state.productions.reduce((m, x) => { const n = Number(String(x.batchCode || '').split('-').pop()); return Number.isFinite(n) ? Math.max(m, n) : m; }, 0) + 1;
    const code = `ALI-${new Date().getFullYear()}-${String(seq).padStart(3,'0')}`;
    const ready = addDays(d.startDate, r.cureDays);
    state.productions.push({ id: uid(), startDate: d.startDate || today(), recipeId: r.id, batchCode: code, plannedUnits: units, goodUnits: units, wastedUnits: 0, status: 'En curado', readyToSellDate: ready, realCost: c.productionCost * units, notes: d.notes });
    await save();
    if (faltantes.length) toast(`Lote ${code} creado, pero faltó stock de: ${faltantes.join(', ')}`, 'warn');
    else toast(`Lote ${code} creado ✓ Listo para vender el ${ready}`);
  },
  sale: async d => {
    const p = state.products.find(x => x.id === d.productId);
    if (!p) { toast('Primero crea un producto en la pantalla Productos', 'warn'); return; }
    const qty = num(d.quantity);
    if (qty <= 0) { toast('La cantidad debe ser mayor a cero', 'warn'); return; }
    const r = state.recipes.find(x => x.productId === d.productId);
    const c = r ? calcRecipe(r) : { productionCost: 0 };
    const net = qty * num(d.unitPrice) - num(d.discount) - num(d.fees);
    const cost = c.productionCost * qty;
    const profit = net - cost;
    const before = num(p.finishedStock);
    p.finishedStock = Math.max(0, before - qty);
    state.sales.push({ id: uid(), ...d, quantity: qty, unitPrice: num(d.unitPrice), netTotal: net, costOfSale: cost, profit, margin: net ? profit/net : 0, status: 'Pagada' });
    await save();
    if (qty > before) toast(`Venta registrada, pero solo había ${qty1(before)} unidades en stock`, 'warn');
    else toast(`Venta registrada ✓ Ganancia: ${money(profit)}`);
  },
  config: async d => {
    const currency = /^[A-Za-z]{3}$/.test(String(d.currency || '').trim()) ? d.currency.trim().toUpperCase() : 'COP';
    state.config = { ...state.config, ...d, currency, targetMargin: pct(d.targetMargin), paymentFeePct: pct(d.paymentFeePct), soyCureDays: num(d.soyCureDays), paraffinCureDays: num(d.paraffinCureDays) };
    await save(); toast('Configuración guardada ✓');
  },
};

async function updateRecord(type, id, d){
  const list = state[COLLECTIONS[type]] || [];
  const rec = list.find(x => x.id === id);
  if (!rec || !parsers[type]) { editing = null; render(); return; }
  Object.assign(rec, parsers[type](d));
  editing = null;
  await save(); toast('Registro actualizado ✓');
}

const DELETE_NOTES = {
  sale: 'Se devolverá la cantidad al stock del producto.',
  purchase: 'Se restará del stock la cantidad de esta compra (el costo promedio no se recalcula).',
  production: 'Se devolverán los insumos usados y se restará el stock terminado.',
  supply: 'Las recetas que lo usen quedarán con ese costo en 0.',
  product: 'Sus recetas y ventas quedarán sin producto asociado.',
  recipe: 'Los lotes ya producidos no cambian.',
};
async function removeRecord(type, id){
  const list = state[COLLECTIONS[type]] || [];
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return;
  const rec = list[i];
  if (type === 'sale') { const p = state.products.find(x => x.id === rec.productId); if (p) p.finishedStock = num(p.finishedStock) + num(rec.quantity); }
  if (type === 'purchase') { const s = state.supplies.find(x => x.id === rec.supplyId); if (s) s.currentStock = Math.max(0, num(s.currentStock) - num(rec.quantity)); }
  if (type === 'production') {
    const r = state.recipes.find(x => x.id === rec.recipeId);
    if (r) {
      const c = calcRecipe(r), units = num(rec.plannedUnits);
      const p = state.products.find(x => x.id === r.productId);
      if (p) p.finishedStock = Math.max(0, num(p.finishedStock) - units);
      [{ id: r.waxSupplyId, q: c.waxG * units }, { id: r.fragranceSupplyId, q: c.fragG * units }, ...['wickSupplyId','vesselSupplyId','labelSupplyId','packageSupplyId'].map(k => ({ id: r[k], q: units }))]
        .filter(u => u.id).forEach(u => { const s = state.supplies.find(x => x.id === u.id); if (s) s.currentStock = num(s.currentStock) + u.q; });
    }
  }
  if (editing && editing.id === id) editing = null;
  list.splice(i, 1);
  await save(); toast('Registro eliminado');
}

/* ============ Pantallas ============ */
// 📷 REEMPLAZAR: cambia heroPhoto por la URL de tu foto real cuando la tengas
const heroPhoto = 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&q=75&auto=format&fit=crop';
const heroArt = `<span class="hero-art" aria-hidden="true"><svg viewBox="0 0 120 130" fill="none"><ellipse cx="60" cy="122" rx="44" ry="5" fill="#b76e79" opacity=".18"/><rect x="38" y="52" width="44" height="70" rx="10" fill="#fbe3ec"/><rect x="38" y="52" width="44" height="12" rx="6" fill="#f4b8cd"/><circle class="flame-glow" cx="60" cy="30" r="17" fill="#f7cfdd" opacity=".45"/><path class="flame" d="M60 38c-8.5-9.5-6-18 0-25 6 7 8.5 15.5 0 25z" fill="#f0b46a"/><path class="flame flame-inner" d="M60 37c-4.2-5.4-3-10 0-14 3 4 4.2 8.6 0 14z" fill="#fdedd2"/><line x1="60" y1="44" x2="60" y2="52" stroke="#b76e79" stroke-width="3" stroke-linecap="round"/><path d="M60 86c-3-3.2-7.4-2.8-7.4 1 0 2.8 4 5.7 7.4 7.9 3.4-2.2 7.4-5.1 7.4-7.9 0-3.8-4.4-4.2-7.4-1z" fill="#e8a8bf"/><path d="M22 30l2 4.8 4.8 2-4.8 2-2 4.8-2-4.8-4.8-2 4.8-2z" fill="#cdb8e6"/><path d="M98 24l1.6 3.9 3.9 1.6-3.9 1.6-1.6 3.9-1.6-3.9-3.9-1.6 3.9-1.6z" fill="#f7cfdd"/></svg></span>`;

const supplyFields = () => [
  { name:'name', label:'Nombre' },
  { name:'category', label:'Categoría', type:'select', options:['Cera','Fragancia','Mecha','Envase','Tapa','Etiqueta','Empaque','Colorante','Herramienta','Otro'] },
  { name:'waxType', label:'Tipo cera', type:'select', options:['','Soya','Parafina','Otra'] },
  { name:'unitBase', label:'Unidad', type:'select', options:['g','ml','und','m'] },
  { name:'supplierId', label:'Proveedor', type:'select', options: state.suppliers.map(s => ({ v:s.id, t:s.name })) },
  { name:'averageCost', label:'Costo unitario', type:'number' },
  { name:'currentStock', label:'Stock actual', type:'number' },
  { name:'minimumStock', label:'Stock mínimo', type:'number' },
  { name:'technicalNotes', label:'Notas' },
];
const recipeFields = () => [
  { name:'productId', label:'Producto', type:'select', options: state.products.map(p => ({ v:p.id, t:p.name })) },
  { name:'name', label:'Nombre receta' },
  { name:'version', label:'Versión', type:'number', value:1 },
  { name:'waxType', label:'Cera', type:'select', options:['Soya','Parafina'] },
  { name:'targetWeightG', label:'Peso final g', type:'number', value:200 },
  { name:'fragrancePct', label:'Fragancia %', type:'number', value:8 },
  { name:'waxSupplyId', label:'Insumo cera', type:'select', options: state.supplies.filter(s => s.category === 'Cera').map(s => ({ v:s.id, t:s.name })) },
  { name:'fragranceSupplyId', label:'Fragancia', type:'select', options: state.supplies.filter(s => s.category === 'Fragancia').map(s => ({ v:s.id, t:s.name })) },
  { name:'wickSupplyId', label:'Mecha', type:'select', options: state.supplies.filter(s => s.category === 'Mecha').map(s => ({ v:s.id, t:s.name })) },
  { name:'vesselSupplyId', label:'Envase', type:'select', options: state.supplies.filter(s => s.category === 'Envase').map(s => ({ v:s.id, t:s.name })) },
  { name:'labelSupplyId', label:'Etiqueta', type:'select', options: state.supplies.filter(s => s.category === 'Etiqueta').map(s => ({ v:s.id, t:s.name })) },
  { name:'packageSupplyId', label:'Empaque', type:'select', options: state.supplies.filter(s => s.category === 'Empaque').map(s => ({ v:s.id, t:s.name })) },
  { name:'laborCostUnit', label:'Mano obra', type:'number', value:1800 },
  { name:'overheadCostUnit', label:'Overhead', type:'number', value:500 },
  { name:'wastePct', label:'Merma %', type:'number', value:2 },
  { name:'cureDays', label:'Curado días', type:'number', value:10 },
  { name:'notes', label:'Notas' },
];

const screens = {
  Dashboard(){
    const a = alerts();
    const recent = [...state.sales].reverse().slice(0, 5);
    return `<div class="grid">
      <div class="hero card">
        <img class="hero-photo" src="${heroPhoto}" alt="" loading="lazy" onerror="this.style.display='none'"/>
        <div><span class="hero-eyebrow">Software especializado</span><h2>Controla costo, receta, lote, curado y utilidad de cada vela.</h2><p>Arquitectura soya-first con soporte para parafina. Funciona en computador y celular.</p>
        <div class="hero-cta"><button data-go="Ventas">🏷️ Registrar venta</button><button class="ghost" data-go="Recetas">📖 Crear receta</button></div></div>
        ${heroArt}
      </div>
      ${kpis()}
      <div class="two">
        <div class="card"><h2>Alertas inteligentes</h2>${alertHtml(a)}</div>
        <div class="card"><h2>Accesos rápidos</h2><div class="quick">${['Ventas','Producción','Recetas','Insumos','Compras','Reportes'].map(x => `<button data-go="${x}">${iconOf(x)} ${x}</button>`).join('')}</div></div>
      </div>
      <div class="card"><h2>Últimas ventas</h2>${table(recent, [['Fecha','date'],['Producto', r => esc(product(r.productId).name || '—')],['Cant.', r => qty1(r.quantity)],['Neto', r => money(r.netTotal)],['Ganancia', r => money(r.profit)],['Canal','channel']], { empty:'Cuando registres ventas, las verás aquí. 🌸' })}</div>
    </div>`;
  },
  Insumos(){
    return `<div class="card"><h2>Inventario de insumos</h2>
      ${formBox('Nuevo insumo', supplyFields(), 'supply', !state.supplies.length)}
      ${table(state.supplies, [
        ['Insumo','name'],['Categoría','category'],['Cera','waxType'],
        ['Stock', r => { const low = num(r.currentStock) <= num(r.minimumStock); return `<b${low ? ' class="txt-bad"' : ''}>${qty1(r.currentStock)} ${esc(r.unitBase || '')}</b>${low ? ' ' + badge('bajo','bad') : ''}`; }],
        ['Costo unit.', r => money(r.averageCost)],['Mínimo', r => qty1(r.minimumStock)],['Notas','technicalNotes'],
      ], { type:'supply', editable:true })}</div>`;
  },
  Proveedores(){
    return `<div class="card"><h2>Proveedores</h2>
      ${formBox('Nuevo proveedor', [{ name:'name', label:'Nombre' },{ name:'phone', label:'Teléfono' },{ name:'city', label:'Ciudad' },{ name:'notes', label:'Notas' }], 'supplier', !state.suppliers.length)}
      ${table(state.suppliers, [['Nombre','name'],['Teléfono','phone'],['Ciudad','city'],['Notas','notes']], { type:'supplier', editable:true })}</div>`;
  },
  Compras(){
    return `<div class="card"><h2>Compras y costo promedio</h2>
      ${formBox('Registrar compra', [
        { name:'date', label:'Fecha', type:'date', value: today() },
        { name:'supplyId', label:'Insumo', type:'select', options: state.supplies.map(s => ({ v:s.id, t:s.name })) },
        { name:'quantity', label:'Cantidad', type:'number' },
        { name:'unitCost', label:'Costo unitario', type:'number' },
        { name:'shipping', label:'Envío', type:'number', value:0 },
        { name:'taxes', label:'Impuestos', type:'number', value:0 },
        { name:'discount', label:'Descuento', type:'number', value:0 },
        { name:'lot', label:'Lote' },
      ], 'purchase', !state.purchases.length)}
      ${table([...state.purchases].reverse(), [['Fecha','date'],['Insumo', r => esc(supply(r.supplyId).name || '—')],['Cantidad', r => qty1(r.quantity)],['Costo unit.', r => money(r.unitCost)],['Costo aterrizado', r => money(r.landedUnitCost)],['Total', r => money(r.total)]], { type:'purchase' })}</div>`;
  },
  Productos(){
    return `<div class="card"><h2>Productos</h2>
      ${formBox('Nuevo producto', [
        { name:'sku', label:'SKU' },{ name:'name', label:'Nombre' },{ name:'category', label:'Tipo' },
        { name:'waxType', label:'Cera', type:'select', options:['Soya','Parafina','Otra'] },
        { name:'targetWeightG', label:'Peso g', type:'number' },{ name:'salePrice', label:'Precio', type:'number' },{ name:'finishedStock', label:'Stock terminado', type:'number' },
      ], 'product', !state.products.length)}
      ${table(state.products, [['SKU','sku'],['Producto','name'],['Cera','waxType'],['Peso g', r => qty1(r.targetWeightG)],['Precio', r => money(r.salePrice)],['Stock', r => { const s = num(r.finishedStock); return s > 0 ? `<b>${qty1(s)}</b>` : badge('agotado','bad'); }]], { type:'product', editable:true })}</div>`;
  },
  Recetas(){
    return `<div class="card"><h2>Recetas y costos</h2>
      ${formBox('Nueva receta', recipeFields(), 'recipe', !state.recipes.length)}
      <div class="cards">${state.recipes.map(r => recipeCard(r)).join('') || `<p class="empty-note">🕯️ Crea tu primera receta para ver el costo real y el precio sugerido.</p>`}</div></div>`;
  },
  Producción(){
    return `<div class="card"><h2>Producción por lote</h2>
      ${formBox('Nuevo lote', [
        { name:'startDate', label:'Fecha inicio', type:'date', value: today() },
        { name:'recipeId', label:'Receta', type:'select', options: state.recipes.map(r => ({ v:r.id, t:r.name })) },
        { name:'plannedUnits', label:'Unidades', type:'number', value:12 },
        { name:'notes', label:'Observaciones' },
      ], 'production', !state.productions.length)}
      ${table([...state.productions].reverse(), [
        ['Lote','batchCode'],['Inicio','startDate'],['Receta', r => esc(state.recipes.find(x => x.id === r.recipeId)?.name || '—')],
        ['Unidades', r => qty1(r.plannedUnits)],
        ['Estado', r => prodStatus(r) === 'En curado' ? badge('⏳ En curado','curing') : badge('✓ Lista para venta','ok')],
        ['Listo venta','readyToSellDate'],['Costo lote', r => money(r.realCost)],
      ], { type:'production' })}</div>`;
  },
  Ventas(){
    const m = today().slice(0,7);
    const hoy = state.sales.filter(s => s.date === today());
    const mes = state.sales.filter(s => String(s.date).startsWith(m));
    const sum = (arr) => arr.reduce((a,b) => a + num(b.netTotal), 0);
    const firstPrice = num(state.products[0]?.salePrice) || '';
    return `<div class="card"><h2>Ventas</h2>
      <div class="stat-chips"><span class="chip">Hoy: <b>${money(sum(hoy))}</b> · ${hoy.length} venta${hoy.length === 1 ? '' : 's'}</span><span class="chip">Este mes: <b>${money(sum(mes))}</b> · ${mes.length} venta${mes.length === 1 ? '' : 's'}</span></div>
      ${formBox('Registrar venta', [
        { name:'date', label:'Fecha', type:'date', value: today() },
        { name:'customerId', label:'Cliente', type:'select', options:[{ v:'', t:'Sin cliente' }, ...state.customers.map(c => ({ v:c.id, t:c.name }))] },
        { name:'channel', label:'Canal', type:'select', options:['Directo','WhatsApp','Instagram','Feria','Tienda','Marketplace','Otro'] },
        { name:'productId', label:'Producto', type:'select', options: state.products.map(p => ({ v:p.id, t:p.name })) },
        { name:'quantity', label:'Cantidad', type:'number', value:1 },
        { name:'unitPrice', label:'Precio unitario', type:'number', value: firstPrice },
        { name:'discount', label:'Descuento', type:'number', value:0 },
        { name:'fees', label:'Comisiones', type:'number', value:0 },
        { name:'paymentMethod', label:'Medio pago', type:'select', options:['Efectivo','Nequi','Daviplata','Transferencia','Tarjeta','Otro'] },
      ], 'sale', !state.sales.length)}
      ${table([...state.sales].reverse(), [['Fecha','date'],['Producto', r => esc(product(r.productId).name || '—')],['Cant.', r => qty1(r.quantity)],['Neto', r => money(r.netTotal)],['Ganancia', r => money(r.profit)],['Margen', r => perc(r.margin)],['Canal','channel']], { type:'sale' })}</div>`;
  },
  Clientes(){
    return `<div class="card"><h2>Clientes</h2>
      ${formBox('Nuevo cliente', [
        { name:'name', label:'Nombre' },{ name:'customerType', label:'Tipo' },{ name:'phone', label:'Teléfono' },{ name:'email', label:'Email' },{ name:'city', label:'Ciudad' },{ name:'instagram', label:'Instagram' },{ name:'notes', label:'Notas' },
      ], 'customer', !state.customers.length)}
      ${table(state.customers, [['Nombre','name'],['Tipo','customerType'],['Teléfono','phone'],['Ciudad','city'],['Instagram','instagram']], { type:'customer', editable:true })}</div>`;
  },
  Gastos(){
    return `<div class="card"><h2>Gastos</h2>
      ${formBox('Nuevo gasto', [
        { name:'date', label:'Fecha', type:'date', value: today() },{ name:'category', label:'Categoría' },{ name:'description', label:'Descripción' },{ name:'amount', label:'Monto', type:'number' },
      ], 'expense', !state.expenses.length)}
      ${table([...state.expenses].reverse(), [['Fecha','date'],['Categoría','category'],['Descripción','description'],['Monto', r => money(r.amount)]], { type:'expense', editable:true })}</div>`;
  },
  Reportes(){
    const months = [];
    { const d = new Date(); d.setDate(1); for (let i = 0; i < 6; i++) { months.push(`${d.getFullYear()}-${pad(d.getMonth()+1)}`); d.setMonth(d.getMonth()-1); } }
    const monthLabel = (m) => { const [y, mm] = m.split('-').map(Number); return new Date(y, mm-1, 1).toLocaleDateString('es-CO', { month:'long', year:'numeric' }); };
    const channels = [...new Set(state.sales.map(s => s.channel || 'Directo'))];
    return `<div class="grid">${kpis()}
      <div class="two">
        <div class="card"><h2>Rentabilidad por producto</h2>${table(state.products.map(p => { const ss = state.sales.filter(s => s.productId === p.id); return { id:p.id, name:p.name, units: ss.reduce((a,b) => a + num(b.quantity), 0), revenue: ss.reduce((a,b) => a + num(b.netTotal), 0), profit: ss.reduce((a,b) => a + num(b.profit), 0) }; }), [['Producto','name'],['Unidades','units'],['Ventas', r => money(r.revenue)],['Ganancia', r => money(r.profit)]], { empty:'Sin productos aún.' })}</div>
        <div class="card"><h2>Alertas</h2>${alertHtml(alerts())}</div>
      </div>
      <div class="two">
        <div class="card"><h2>Resumen mensual</h2>${table(months.map(m => { const ss = state.sales.filter(s => String(s.date).startsWith(m)); return { id:m, month: monthLabel(m), count: ss.length, revenue: ss.reduce((a,b) => a + num(b.netTotal), 0), profit: ss.reduce((a,b) => a + num(b.profit), 0) }; }), [['Mes','month'],['Ventas','count'],['Neto', r => money(r.revenue)],['Ganancia', r => money(r.profit)]])}</div>
        <div class="card"><h2>Ventas por canal</h2>${table(channels.map(ch => { const ss = state.sales.filter(s => (s.channel || 'Directo') === ch); return { id:ch, channel:ch, count: ss.length, revenue: ss.reduce((a,b) => a + num(b.netTotal), 0) }; }), [['Canal','channel'],['Ventas','count'],['Neto', r => money(r.revenue)]], { empty:'Cuando registres ventas verás los canales aquí.' })}</div>
      </div>
      <div class="card"><h2>Comparativo soya vs parafina</h2>${table(['Soya','Parafina'].map(t => ({ id:t, type:t, products: state.products.filter(p => p.waxType === t).length, sales: state.sales.filter(s => product(s.productId).waxType === t).reduce((x,y) => x + num(y.netTotal), 0) })), [['Tipo','type'],['Productos','products'],['Ventas', r => money(r.sales)]])}</div>
    </div>`;
  },
  Configuración(){
    return `<div class="card"><h2>Configuración</h2>
      ${form([
        { name:'businessName', label:'Negocio', value: state.config.businessName },
        { name:'instagram', label:'Instagram', value: state.config.instagram },
        { name:'currency', label:'Moneda', type:'select', options:['COP','USD','EUR','MXN','PEN','CLP','ARS'].map(c => ({ v:c, t:c })), value: state.config.currency },
        { name:'targetMargin', label:'Margen objetivo %', type:'number', value: num(state.config.targetMargin)*100 },
        { name:'paymentFeePct', label:'Fee pasarela %', type:'number', value: num(state.config.paymentFeePct)*100 },
        { name:'soyCureDays', label:'Curado soya (días)', type:'number', value: state.config.soyCureDays },
        { name:'paraffinCureDays', label:'Curado parafina (días)', type:'number', value: state.config.paraffinCureDays },
      ], 'config')}
      <h2>Respaldo de datos</h2>
      <p class="muted">Descarga un respaldo cada cierto tiempo para no perder tu información. Para restaurar, pega el contenido y presiona Importar.</p>
      <div class="actions"><button id="downloadJson">⬇️ Descargar respaldo</button><button id="exportJson" class="ghost">Ver JSON</button><button id="importJson" class="ghost">Importar JSON</button><button id="restoreDemo" class="ghost">Restaurar demo</button></div>
      <textarea id="backup" rows="10" placeholder="Aquí aparecerá o pega tu respaldo JSON"></textarea></div>`;
  },
};

/* ============ Render ============ */
function render(){
  $('#screenTitle').textContent = active;
  const tipEl = $('#screenTip'); if (tipEl) tipEl.textContent = TIPS[active] || '';
  const chip = $('#todayChip'); if (chip) chip.textContent = `🗓️ ${new Date().toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long' })}`;
  const pill = $('#pill'); if (pill) pill.textContent = `${state.config.currency} · ${state.config.costingMethod}`;
  $('#nav').innerHTML = NAV.map(([name, icon]) => `<button class="${active === name ? 'active' : ''}" data-nav="${name}"><span class="ic">${icon}</span>${name}</button>`).join('');
  $('#content').innerHTML = screens[active] ? screens[active]() : '';
  bindDynamic();
}

function bindDynamic(){
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => { active = b.dataset.nav; editing = null; render(); });
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { active = b.dataset.go; editing = null; render(); });
  document.querySelectorAll('form[data-action]').forEach(f => f.onsubmit = async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    if (f.dataset.edit) await updateRecord(f.dataset.action, f.dataset.edit, data);
    else if (actions[f.dataset.action]) await actions[f.dataset.action](data);
  });
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const [t, id] = b.dataset.del.split(':');
    const note = DELETE_NOTES[t] || '';
    if (confirm(`¿Eliminar este registro?${note ? ' ' + note : ''}`)) removeRecord(t, id);
  });
  document.querySelectorAll('[data-edit-row]').forEach(b => b.onclick = () => {
    const [t, id] = b.dataset.editRow.split(':');
    editing = { type: t, id };
    render();
    document.querySelector('.new-box[open]')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
  document.querySelectorAll('[data-cancel-edit]').forEach(b => b.onclick = () => { editing = null; render(); });
  // En Ventas: al elegir el producto se autocompleta su precio
  const saleForm = document.querySelector('form[data-action="sale"]');
  if (saleForm) {
    const sel = saleForm.querySelector('[name="productId"]'), price = saleForm.querySelector('[name="unitPrice"]');
    if (sel && price) sel.onchange = () => { const p = state.products.find(x => x.id === sel.value); if (p) price.value = num(p.salePrice); };
  }
  bindConfigButtons();
}

function bindConfigButtons(){
  const ex = $('#exportJson'); if (ex) ex.onclick = () => { $('#backup').value = JSON.stringify(state, null, 2); toast('Respaldo generado en el cuadro de abajo'); };
  const dl = $('#downloadJson'); if (dl) dl.onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `amitabha-respaldo-${today()}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Respaldo descargado ✓');
  };
  const im = $('#importJson'); if (im) im.onclick = async () => {
    let parsed;
    try { parsed = JSON.parse($('#backup').value); } catch { toast('El JSON pegado no es válido', 'warn'); return; }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { toast('El JSON pegado no es un respaldo válido', 'warn'); return; }
    if (!confirm('Esto reemplazará TODOS los datos actuales con el respaldo pegado. ¿Continuar?')) return;
    state = normalizeState(parsed);
    await save(); toast('Respaldo importado ✓');
  };
  const re = $('#restoreDemo'); if (re) re.onclick = async () => {
    if (!confirm('Esto borrará tus datos y restaurará la información de demostración. ¿Continuar?')) return;
    state = demoState();
    await save(); toast('Demo restaurada');
  };
}

/* ============ Arranque ============ */
(async () => {
  try { await initFirebase(); } catch { /* la app funciona igual en modo local */ }
  if (!cloud && localStorage.getItem(SESSION) === 'local') { user = { uid:'local' }; enterApp(); }
})();
