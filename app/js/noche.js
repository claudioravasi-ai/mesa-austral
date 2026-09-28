/* Lo que comparten la sala y el dueño para leer la noche: el estado de cada mesa a una hora dada. */
import { esc, hhmm, pesos } from './comun.js';

export const VIVAS = ['confirmada', 'sentada', 'finalizada', 'ofrecida', 'pendiente'];
export const deMesa = (N, id) => N.reservas.filter(r => r.mesas.includes(id) && VIVAS.includes(r.estado));
/* ¿Qué pasa en la mesa m a la hora t? */
export function estadoMesa(N, m, t){
  const lim = N.resto.politica.limpieza, vivo = N.fecha === N.ahora.fecha, rs = deMesa(N, m.id);
  const en = rs.find(r => r.inicio <= t && t < r.fin);
  if (en){
    if (en.estado === 'ofrecida') return { c:'ofrecida', r:en, nota:'ofrecida' };
    if (en.estado === 'confirmada' && vivo && t >= en.inicio && t <= N.ahora.min + 1) return { c:'espera', r:en, nota:'no llegó' };
    return { c:en.fin - t <= 20 ? 'pronto' : 'ocupada', r:en, nota:hhmm(en.fin + lim), aria:'se libera ' + hhmm(en.fin + lim) };
  }
  const prox = rs.filter(r => r.inicio > t).sort((a, b) => a.inicio - b.inicio)[0];
  if (prox && prox.inicio - t <= 40) return { c:prox.estado === 'ofrecida' ? 'ofrecida' : 'llega', r:prox, nota:hhmm(prox.inicio), aria:(prox.estado === 'ofrecida' ? 'ofrecida para las ' : 'llega ') + hhmm(prox.inicio) };
  return { c:'libre', prox };
}
export function personasEn(N, t){
  const vivo = N.fecha === N.ahora.fecha;
  return N.reservas.filter(r => ['sentada', 'finalizada', 'confirmada'].includes(r.estado) && r.inicio <= t && t < r.fin && !(r.estado === 'confirmada' && vivo && t <= N.ahora.min + 1 && t >= r.inicio)).reduce((s, r) => s + r.pax, 0);
}
export const codigos = (N, r) => r.mesas.map(id => N.mesas.find(m => m.id === id)?.codigo || '?').join(' + ');
export const ESTADO_RES = { confirmada:['Confirmada', 'ok'], pendiente:['Falta seña', 'warn'], sentada:['En la mesa', 'info'], finalizada:['Se fue', ''], cancelada:['Cancelada', ''], cancelada_tarde:['Canceló tarde', 'warn'], planton:['Plantón', 'mal'], ofrecida:['Ofrecida', 'lila'] };
const BANDERA = { en:'🇬🇧 Inglés', pt:'🇧🇷 Portugués' };
export function etiquetas(r){
  const e = [];
  if (r.ocasion) e.push(`<span class="etq">🎉 ${esc(r.ocasion)}</span>`);
  if (r.alergias) e.push(`<span class="etq alergia">⚠ ${esc(r.alergias === 'sí' ? 'Alergias' : r.alergias)}</span>`);
  if (BANDERA[r.idioma]) e.push(`<span class="etq">${BANDERA[r.idioma]}</span>`);
  if (r.credito) e.push(`<span class="etq credito">Crédito ${pesos(r.credito)}</span>`);
  if (r.sena) e.push(`<span class="etq credito">Seña ${pesos(r.sena)}</span>`);
  if (r.al_liberarse) e.push(`<span class="etq">Pidió la mesa al liberarse</span>`);
  if (r.visitas >= 3) e.push(`<span class="etq">Vino ${r.visitas} veces</span>`);
  if (r.canal === 'puerta') e.push(`<span class="etq">Sin reserva</span>`);
  if (r.canal === 'espera') e.push(`<span class="etq">Desde la espera</span>`);
  if (r.notas) e.push(`<span class="etq">📝 ${esc(r.notas)}</span>`);
  if (r.incidente) e.push(`<span class="etq ${r.incidente.estado === 'pendiente' ? 'alergia' : ''}">Compromiso ${pesos(r.incidente.monto)} · ${esc(r.incidente.estado)}</span>`);
  return e.length ? `<div class="etiquetas">${e.join('')}</div>` : '';
}
/* Pill según la hora actual: además del estado, si no confirmó o si no llegó. */
export function pillDe(N, r){
  const vivo = N.fecha === N.ahora.fecha;
  if (r.estado === 'confirmada' && vivo && N.ahora.min >= r.inicio) return ['No llegó · ' + (N.ahora.min - r.inicio) + ' min', 'warn'];
  if (r.estado === 'confirmada' && !r.confirmo) return ['Sin confirmar', 'warn'];
  return ESTADO_RES[r.estado] || [r.estado, ''];
}
