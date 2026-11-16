/* Mesa Austral · lo que comparten todas las pantallas */
import { CONFIG } from '../config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
export const pesos = n => '$ ' + Math.round(n || 0).toLocaleString('es-AR');
export const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
export const aMin = t => { const [a, b] = String(t).split(':').map(Number); return a * 60 + (b || 0); };
export const sumarDias = (f, n) => { const d = new Date(f + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const fechaLarga = (f, idioma = 'es') => new Date(f + 'T12:00:00Z').toLocaleDateString({ es:'es-AR', en:'en-GB', pt:'pt-BR' }[idioma] || 'es-AR', { weekday:'long', day:'numeric', month:'long', timeZone:'UTC' });
export const fechaCorta = f => new Date(f + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday:'short', day:'numeric', timeZone:'UTC' });
export const MODO_PRUEBA = !CONFIG.API_URL;
if (!MODO_PRUEBA && 'serviceWorker' in navigator) navigator.serviceWorker.register(new URL('../sw.js', import.meta.url)).catch(() => {});
export { CONFIG };

/* ---------- servidor ---------- */
let local = null;
export async function api(metodo, ruta, cuerpo, { token, tablet } = {}){
  const headers = {};
  if (token) headers.authorization = 'Bearer ' + token;
  if (tablet) headers['x-tablet'] = tablet;
  let res;
  if (MODO_PRUEBA){ local = local || await import('./local.js'); res = await local.pedir(metodo, ruta, cuerpo, headers); }
  else res = await fetch(CONFIG.API_URL + ruta, { method:metodo, headers:{ 'content-type':'application/json', ...headers }, body:cuerpo !== undefined && metodo !== 'GET' ? JSON.stringify(cuerpo) : undefined });
  let datos = {}; try { datos = await res.json(); } catch (e){}
  if (!res.ok){ const e = new Error(datos.error || 'No se pudo completar. Probá de nuevo.'); e.status = res.status; e.datos = datos; throw e; }
  return datos;
}
export async function prueba(){ return MODO_PRUEBA ? (local = local || await import('./local.js')) : null; }
export function alCambiarPrueba(f){ if (MODO_PRUEBA) prueba().then(l => l.alCambiar(f)); }

/* ---------- guardado en este equipo (solo comodidades: sesión, tablet, idioma) ---------- */
export const ls = {
  get:(k, d = null) => { try { const v = localStorage.getItem('ma_' + k); return v == null ? d : v; } catch (e){ return d; } },
  set:(k, v) => { try { v == null ? localStorage.removeItem('ma_' + k) : localStorage.setItem('ma_' + k, v); } catch (e){} },
};

/* ---------- avisos en pantalla ---------- */
let tToast = null;
export function toast(msg, tipo = ''){
  $$('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast ' + tipo; t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); clearTimeout(tToast); tToast = setTimeout(() => t.remove(), 3600);
}
export function hoja(html, { alCerrar } = {}){
  const fondo = document.createElement('div'); fondo.className = 'hoja-fondo';
  fondo.innerHTML = `<div class="hoja" role="dialog" aria-modal="true"><button class="hoja-x" aria-label="Cerrar">×</button>${html}</div>`;
  const cerrar = () => { fondo.remove(); document.removeEventListener('keydown', tecla); alCerrar && alCerrar(); };
  const tecla = e => { if (e.key === 'Escape') cerrar(); };
  fondo.addEventListener('click', e => { if (e.target === fondo || e.target.closest('.hoja-x')) cerrar(); });
  document.addEventListener('keydown', tecla); document.body.appendChild(fondo);
  const f = fondo.querySelector('input, select, button:not(.hoja-x)'); if (f) f.focus();
  return { el:fondo.querySelector('.hoja'), cerrar };
}
export function sonar(){ try { const ac = new (window.AudioContext || window.webkitAudioContext)(), t0 = ac.currentTime;
  [[880, 0, .3], [660, .16, .35]].forEach(([f, t, d]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t0 + t); g.gain.linearRampToValueAtTime(.12, t0 + t + .02); g.gain.exponentialRampToValueAtTime(.001, t0 + t + d); o.connect(g).connect(ac.destination); o.start(t0 + t); o.stop(t0 + t + d + .05); }); } catch (e){} }

/* ---------- el plano ---------- */
export const COLORES = {
  libre:{ f:'#2FA36B', t:'#fff', n:'Libre' }, elegida:{ f:'#1789A6', t:'#fff', n:'Tu mesa' }, ocupada:{ f:'#D9481F', t:'#fff', n:'Ocupada' },
  pronto:{ f:'#E9A23B', t:'#2E1E04', n:'Se libera pronto' }, reservada:{ f:'#3E6FA8', t:'#fff', n:'Reservada' }, llega:{ f:'#3E6FA8', t:'#fff', n:'Llega pronto' },
  espera:{ f:'#E9A23B', t:'#2E1E04', n:'No llegó' }, no:{ f:'#AEBAC1', t:'#fff', n:'No es para tu grupo' }, neutra:{ f:'#6B8492', t:'#fff', n:'Mesa' },
  ofrecida:{ f:'#8E6BC2', t:'#fff', n:'Ofrecida a la espera' },
};
function sillas(m){
  const out = [], cap = Math.min(m.cap || m.cap_max || 2, 16), r = 5.5;
  if (m.forma === 'redonda'){ const rx = m.w / 2 + 9, ry = m.h / 2 + 9, cx = m.x + m.w / 2, cy = m.y + m.h / 2;
    for (let i = 0; i < cap; i++){ const a = i / cap * Math.PI * 2 - Math.PI / 2; out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } }
  else { const lados = m.w >= m.h ? ['arr', 'aba'] : ['izq', 'der'], n1 = Math.ceil(cap / 2), n2 = cap - n1;
    const pon = (lado, n) => { for (let i = 0; i < n; i++){ const t = (i + .5) / n;
      if (lado === 'arr') out.push([m.x + m.w * t, m.y - 9]); if (lado === 'aba') out.push([m.x + m.w * t, m.y + m.h + 9]);
      if (lado === 'izq') out.push([m.x - 9, m.y + m.h * t]); if (lado === 'der') out.push([m.x + m.w + 9, m.y + m.h * t]); } };
    pon(lados[0], n1); pon(lados[1], n2); }
  return out.map(([x, y]) => `<circle class="silla" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"/>`).join('');
}
function elemento(e, edit){
  const d = edit ? ` data-el="${esc(e.id)}"` : '', t = esc(e.texto || '');
  const lbl = (fill, extra = '') => t ? `<text x="${e.x + e.w / 2}" y="${e.y + e.h / 2}" text-anchor="middle" dominant-baseline="central" class="el-t" fill="${fill}" ${extra}>${t}</text>` : '';
  const vert = e.h > e.w * 1.6 ? `transform="rotate(90 ${e.x + e.w / 2} ${e.y + e.h / 2})"` : '';
  switch (e.tipo){
    case 'pared': return `<rect${d} class="el pared" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="2"/>`;
    case 'ventana': return `<g${d} class="el"><rect class="ventana" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="3"/>${t ? `<text x="${e.x + e.w / 2}" y="${e.y + e.h + 13}" text-anchor="middle" class="el-t sutil">${t}</text>` : ''}</g>`;
    case 'puerta': return `<g${d} class="el"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="3" fill="#A87B4F"/>${lbl('#fff')}</g>`;
    case 'entrada': return `<g${d} class="el"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="3" fill="#2FA36B"/>${lbl('#fff')}</g>`;
    case 'barra': return `<g${d} class="el"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="8" fill="#8A6A45"/>${lbl('#fff', vert)}</g>`;
    case 'hogar': return `<g${d} class="el"><rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="4" fill="#D9481F" opacity=".85"/>${lbl('#fff')}</g>`;
    case 'columna': return `<rect${d} class="el pared" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="3"/>`;
    case 'planta': return `<g${d} class="el"><ellipse cx="${e.x + e.w / 2}" cy="${e.y + e.h / 2}" rx="${e.w / 2}" ry="${e.h / 2}" fill="#4E8F5A" opacity=".8"/></g>`;
    case 'zona': return `<g${d} class="el"><rect class="zona" x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" rx="14"/>${t ? `<text x="${e.x + 12}" y="${e.y + 18}" class="el-t sutil">${t.toUpperCase()}</text>` : ''}</g>`;
    default: return '';
  }
}
/* estado(m) → { c:'libre'|…, nota:'22:15', aria:'…' } */
export function plano({ plano:P, mesas, estado = () => ({ c:'neutra' }), sel = null, edit = false, extra = '', colores = {} }){
  const PAL = Object.fromEntries(Object.keys({ ...COLORES, ...colores }).map(k => [k, { ...(COLORES[k] || COLORES.neutra), ...(colores[k] || {}) }]));
  const ancho = P?.ancho || 800, alto = P?.alto || 520;
  const els = (P?.elementos || []).slice().sort((a, b) => (a.tipo === 'zona' ? -1 : 0) - (b.tipo === 'zona' ? -1 : 0)).map(e => elemento(e, edit)).join('');
  const ms = mesas.map(m => {
    const e = estado(m) || { c:'neutra' }, c = PAL[e.c] || PAL.neutra, marca = sel != null && String(sel) === String(m.id);
    const cx = m.x + m.w / 2, cy = m.y + m.h / 2, cap = m.cap || m.cap_max;
    const borde = marca ? 'stroke="var(--pl-sel)" stroke-width="4"' : '';
    const pinta = `style="fill:${c.f}${c.b ? ';stroke:' + c.b + ';stroke-width:1.5' : ''}"`;
    const forma = m.forma === 'redonda' ? `<ellipse cx="${cx}" cy="${cy}" rx="${m.w / 2}" ry="${m.h / 2}" ${pinta} ${borde}/>` : `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" rx="8" ${pinta} ${borde}/>`;
    const tam = Math.max(11, Math.min(18, Math.min(m.w, m.h) / 3.4));
    return `<g class="mesa-g" data-mesa="${m.id}" tabindex="0" role="button" aria-label="Mesa ${esc(m.codigo)}, ${cap} lugares, ${esc(e.aria || c.n)}">${sillas({ ...m, cap })}${forma}
      <text x="${cx}" y="${cy - 1}" text-anchor="middle" class="m-cod" font-size="${tam}" style="fill:${c.t}">${esc(m.codigo)}</text>
      <text x="${cx}" y="${cy + tam * .85}" text-anchor="middle" class="m-cap" font-size="${Math.max(9, tam * .62)}" style="fill:${c.t}">${cap} p.</text>
      ${e.nota ? `<text x="${cx}" y="${m.y + m.h + (m.forma === 'redonda' ? 24 : 26)}" text-anchor="middle" class="m-nota" style="fill:${c.nota || (e.c === 'pronto' || e.c === 'espera' ? '#B26F06' : '#C23E17')}">${esc(e.nota)}</text>` : ''}</g>`;
  }).join('');
  return `<svg class="plano-svg" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Plano del salón"><rect class="suelo" x="0" y="0" width="${ancho}" height="${alto}" rx="18"/>${els}${ms}${extra}</svg>`;
}
export const leyenda = claves => `<div class="leyenda">${claves.map(k => `<span><i style="background:${COLORES[k].f}"></i>${COLORES[k].n}</span>`).join('')}</div>`;

/* ---------- arranque del motor local ---------- */
/* Ya no se muestra ninguna barra: la app se ve como la de verdad. Solo arranca el motor local
 * (avisos automáticos cada 20 s) mientras no haya servidor en Cloudflare. */
export async function barraPrueba(){
  if (MODO_PRUEBA) await prueba();
}
