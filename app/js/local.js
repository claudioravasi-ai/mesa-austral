/* Modo prueba: el servidor (worker/worker.js) corre dentro del navegador, con una base SQLite propia
 * (sql.js) guardada en este navegador. Varias pestañas comparten la base: una traba ordena los pedidos.
 * Nada sale de esta computadora. Cuando exista el Worker en Cloudflare, config.js apunta a él y esto no se usa. */
import worker, { tareas } from '../../worker/worker.js';

const SQLJS = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/';
const CLAVE_V = 'ma_prueba_version', CLAVE_RELOJ = 'ma_prueba_reloj', CLAVE_SECRETO = 'ma_prueba_secreto';
let SQL = null, db = null, versionCargada = -1, sucio = false;
const canal = 'BroadcastChannel' in self ? new BroadcastChannel('mesa-austral-prueba') : null;
const leerLS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e){ return d; } };
const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e){} };

/* ---------- reloj de prueba ---------- */
const TZ = -180;
export function relojOffset(){ return Number(leerLS(CLAVE_RELOJ, 'NaN')); }
export function relojFijar(fecha, min){ const ms = Date.parse(fecha + 'T00:00:00Z') - TZ * 60000 + min * 60000; guardarLS(CLAVE_RELOJ, String(ms - Date.now())); canal?.postMessage('reloj'); }
export function relojReal(){ guardarLS(CLAVE_RELOJ, '0'); canal?.postMessage('reloj'); }
function ahora(){ let o = relojOffset(); if (!Number.isFinite(o)){ const hoy = new Date(Date.now() + TZ * 60000).toISOString().slice(0, 10); relojFijar(hoy, 20 * 60 + 40); o = relojOffset(); } return Date.now() + o; }

/* ---------- base guardada en IndexedDB ---------- */
function abrirIDB(){ return new Promise((ok, mal) => { const r = indexedDB.open('mesa-austral-prueba', 1); r.onupgradeneeded = () => r.result.createObjectStore('b'); r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); }); }
async function leerBase(){ const d = await abrirIDB(); return new Promise(ok => { const t = d.transaction('b').objectStore('b').get('db'); t.onsuccess = () => ok(t.result || null); t.onerror = () => ok(null); }); }
async function escribirBase(bytes){ const d = await abrirIDB(); return new Promise((ok, mal) => { const t = d.transaction('b', 'readwrite'); if (bytes) t.objectStore('b').put(bytes, 'db'); else t.objectStore('b').delete('db'); t.oncomplete = ok; t.onerror = () => mal(t.error); }); }

/* ---------- una base D1 hecha con sql.js ---------- */
const valor = v => v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v;
class Sentencia {
  constructor(sql, args = []){ this.sql = sql; this.args = args; }
  bind(...a){ return new Sentencia(this.sql, a.map(valor)); }
  filas(){ const st = db.prepare(this.sql); try { st.bind(this.args); const out = []; while (st.step()) out.push(st.getAsObject()); return out; } finally { st.free(); } }
  async all(){ return { results:this.filas(), success:true }; }
  async first(col){ const f = this.filas()[0]; return f ? (col ? f[col] : f) : null; }
  async run(){ this.filas(); sucio = true; return { success:true, meta:{ changes:db.getRowsModified() } }; }
  async raw(){ return this.filas().map(Object.values); }
}
const D1 = {
  prepare:sql => new Sentencia(sql),
  async batch(lista){ db.exec('BEGIN'); try { const out = lista.map(s => ({ results:s.filas(), success:true })); db.exec('COMMIT'); sucio = true; return out; } catch (e){ try { db.exec('ROLLBACK'); } catch (x){} throw e; } },
  async exec(sql){ db.exec(sql); sucio = true; },
};
function secreto(){ let s = leerLS(CLAVE_SECRETO, ''); if (!s){ s = [...crypto.getRandomValues(new Uint8Array(24))].map(b => b.toString(16).padStart(2, '0')).join(''); guardarLS(CLAVE_SECRETO, s); } return s; }
const ENV = { DB:D1, AHORA:ahora, MODO_PRUEBA:'1', SIN_LIMITES:true, SECRETO:secreto(), APP_URL:new URL('.', location.href).href.replace(/\/$/, '') };

function cargarScript(src){ return new Promise((ok, mal) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar la base de prueba. Revisá la conexión a internet.')); document.head.appendChild(s); }); }
async function asegurar(){
  if (!SQL){ if (!self.initSqlJs) await cargarScript(SQLJS + 'sql-wasm.js'); SQL = await self.initSqlJs({ locateFile:f => SQLJS + f }); }
  const v = Number(leerLS(CLAVE_V, '0'));
  if (db && v === versionCargada) return;
  const bytes = await leerBase();
  if (db) db.close();
  if (bytes){ db = new SQL.Database(bytes); }
  else {
    db = new SQL.Database();
    const esquema = await (await fetch(new URL('../../worker/esquema.sql', import.meta.url))).text();
    db.exec(esquema);
    await worker.fetch(new Request('https://prueba.local/api/sembrar', { method:'POST' }), ENV);
    sucio = true; await guardar();
  }
  versionCargada = Number(leerLS(CLAVE_V, '0'));
}
async function guardar(){
  if (!sucio) return; sucio = false;
  await escribirBase(db.export());
  versionCargada = Number(leerLS(CLAVE_V, '0')) + 1; guardarLS(CLAVE_V, String(versionCargada));
  canal?.postMessage('cambio');
}
const trabar = f => navigator.locks ? navigator.locks.request('mesa-austral-prueba', f) : f();

/* El mismo pedido que se le haría al Worker, resuelto acá. */
export async function pedir(metodo, ruta, cuerpo, headers = {}){
  return trabar(async () => {
    await asegurar();
    const init = { method:metodo, headers:{ 'content-type':'application/json', ...headers } };
    if (cuerpo !== undefined && metodo !== 'GET') init.body = JSON.stringify(cuerpo);
    const res = await worker.fetch(new Request('https://prueba.local' + ruta, init), ENV);
    await guardar();
    return res;
  });
}
/* Los avisos automáticos (recordatorios, «¿vienen?», plantones, ofertas vencidas) corren cada 20 segundos. */
async function tic(){ try { await trabar(async () => { await asegurar(); await tareas(ENV); await guardar(); }); } catch (e){ console.warn('tareas', e); } }
setTimeout(tic, 1500); setInterval(tic, 20000);

export function alCambiar(f){ canal?.addEventListener('message', ev => f(ev.data)); }
export async function borrarTodo(){ await trabar(async () => { if (db){ db.close(); db = null; } await escribirBase(null); guardarLS(CLAVE_V, String(Number(leerLS(CLAVE_V, '0')) + 1)); }); relojReal(); try { localStorage.removeItem(CLAVE_RELOJ); } catch (e){} canal?.postMessage('cambio'); }
export const ahoraPrueba = ahora;
/* Solo para revisar la base de prueba desde la consola del navegador. */
export async function consulta(sql, ...args){ return trabar(async () => { await asegurar(); return new Sentencia(sql, args).filas(); }); }
/* Para el robot de pruebas: sacar una foto de la base y volver a ella antes de cada toque. */
export async function instantanea(){ return trabar(async () => { await asegurar(); return db.export(); }); }
export async function restaurar(bytes){ return trabar(async () => { await asegurar(); db.close(); db = new SQL.Database(bytes); sucio = true; await guardar(); }); }
