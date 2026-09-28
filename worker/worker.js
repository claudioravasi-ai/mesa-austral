/* Mesa Austral · servidor
 * Corre en Cloudflare Workers (con una base D1 en env.DB) y también dentro del navegador en «modo prueba»
 * (app/js/local.js le da una base SQLite local). Todo lo que decide, cobra o habilita se resuelve acá, nunca en la pantalla.
 *
 * Variables del Worker (Cloudflare → Settings → Variables):
 *   SECRETO            obligatorio: firma de enlaces y sesiones (texto largo al azar)
 *   APP_URL            dirección de la app (p. ej. https://usuario.github.io/mesa-austral/app)
 *   API_URL            dirección de este Worker (para los avisos de Mercado Pago)
 *   ORIGEN             origen permitido para CORS (p. ej. https://usuario.github.io); vacío = cualquiera
 *   MODO_PRUEBA        '1' permite cargar los datos de prueba
 *   CLAVE_INSTALACION  permite crear el primer restaurante desde /instalar
 *   WA_TOKEN, WA_PHONE_ID, WA_VERIFY   WhatsApp Cloud API (si faltan, los mensajes quedan simulados o para enviar a mano)
 *   MP_TOKEN, MP_WEBHOOK_SECRET         Mercado Pago (si faltan, la pasarela es simulada)
 */
export const VERSION = '0.1.0';
const TZ_MIN = -180;            // Ushuaia: UTC-3 todo el año
const BLOQUE = 15;

/* ======================= utilidades ======================= */
class Falla extends Error { constructor(status, msg, extra){ super(msg); this.status = status; this.extra = extra || {}; } }
const falla = (s, m, e) => { throw new Falla(s, m, e); };
const ahoraMs = env => env.AHORA ? env.AHORA() : Date.now();
function local(env, ms = ahoraMs(env)){
  const d = new Date(ms + TZ_MIN * 60000);
  return { fecha:d.toISOString().slice(0, 10), min:d.getUTCHours() * 60 + d.getUTCMinutes(), dia:d.getUTCDay(), ms };
}
const sumarDias = (f, n) => { const d = new Date(f + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const diaSemana = f => new Date(f + 'T12:00:00Z').getUTCDay();
const msDe = (fecha, min) => Date.parse(fecha + 'T00:00:00Z') - TZ_MIN * 60000 + min * 60000;
const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const pesos = n => '$ ' + Math.round(n).toLocaleString('es-AR');
const fechaCorta = f => f.slice(8, 10) + '/' + f.slice(5, 7);
const esFecha = f => /^\d{4}-\d{2}-\d{2}$/.test(f || '');
const texto = (t, max = 120) => String(t ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);
const entero = (v, min, max) => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < min || n > max) falla(400, 'Dato fuera de rango'); return n; };
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const azar = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
const nuevoCodigo = () => { const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ', a = azar(6); return L[a[0] % 24] + L[a[1] % 24] + L[a[2] % 24] + '-' + (a[3] % 10) + (a[4] % 10) + (a[5] % 10); };
let _serie = 0;
const nuevoId = () => Date.now() * 1000 + (_serie = (_serie + 1) % 1000);
async function hmac(env, txt){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SECRETO || 'mesa-austral-prueba-local'), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
  return b64u((await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(txt))).slice(0, 18));
}
const sha = async t => b64u(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
async function hashClave(clave, sal = b64u(azar(16)), it = 100000){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt:new TextEncoder().encode(sal), iterations:it }, k, 256);
  return `pbkdf2$${it}$${sal}$${b64u(bits)}`;
}
async function claveOk(clave, guardado){ if (!guardado) return false; const [, it, sal] = guardado.split('$'); return (await hashClave(clave, sal, +it)) === guardado; }
/* Teléfono a E.164 sin «+». Los argentinos sin prefijo se asumen de celular. */
function telefono(t){
  let d = String(t || '').replace(/[^\d+]/g, '');
  const intl = d.startsWith('+'); d = d.replace(/\+/g, '');
  if (!intl){ d = d.replace(/^0/, ''); d = d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2'); if (d.length === 10) d = '549' + d; }
  if (d.startsWith('54') && !d.startsWith('549') && d.length === 12) d = '549' + d.slice(2);
  if (d.length < 11 || d.length > 15) falla(400, 'Revisá el teléfono: con código de área, por ejemplo 2901 15 555555');
  return d;
}
const idiomaDe = (tel, pedido) => ['es', 'en', 'pt'].includes(pedido) ? pedido : tel.startsWith('55') ? 'pt' : tel.startsWith('54') ? 'es' : 'en';

/* ======================= base de datos ======================= */
const q = (env, sql, ...a) => env.DB.prepare(sql).bind(...a);
const todas = async (env, sql, ...a) => (await q(env, sql, ...a).all()).results || [];
const una = (env, sql, ...a) => q(env, sql, ...a).first();
const correr = (env, sql, ...a) => q(env, sql, ...a).run();
const choque = e => /constraint|unique/i.test(String(e && e.message));

export const POLITICA = {
  horas:3, monto:10000, tope_personas:6, credito:true, dias_credito:90, tolerancia:15, grupo_desde:8, sena:15000,
  smn:true, limpieza:15, anticipacion:30, max_pax:12, oferta_min:10, recordatorio:720, sena_min:30,
  dur:{ 2:90, 4:105, 6:120, 99:135 }, wa_modo:'simulado',
  pagina:{ estilo:'canal', lema:'', destacados:[] },
};
const ESTILOS = ['canal', 'bistro', 'palermo', 'galeria'];
async function resto(env, slug){
  const r = await una(env, 'SELECT * FROM restaurantes WHERE slug = ?', slug);
  if (!r) falla(404, 'No encontramos ese restaurante');
  r.politica = { ...POLITICA, ...JSON.parse(r.politica || '{}') }; r.plano = JSON.parse(r.plano || '{}');
  return r;
}
async function restoPorId(env, id){ const r = await una(env, 'SELECT slug FROM restaurantes WHERE id = ?', id); return resto(env, r.slug); }
const subirVersion = (env, R) => q(env, 'UPDATE restaurantes SET version = version + 1 WHERE id = ?', R.id);
const auditar = (env, R, quien, accion, detalle = '') => q(env, 'INSERT INTO auditoria (resto, quien, accion, detalle, cuando) VALUES (?,?,?,?,?)', R.id, quien, accion, texto(detalle, 200), ahoraMs(env));
const mesasDe = async (env, R) => todas(env, 'SELECT * FROM mesas WHERE resto = ? AND activa = 1 ORDER BY codigo', R.id);
const grupoDe = pax => pax <= 2 ? 2 : pax <= 4 ? 4 : pax <= 6 ? 6 : 99;
async function duracion(env, R, pax, fecha){
  const g = grupoDe(pax), d = await una(env, 'SELECT promedio, n FROM duraciones WHERE resto = ? AND grupo = ? AND dia = ?', R.id, g, diaSemana(fecha));
  const base = R.politica.dur[g] || 105;
  return d && d.n >= 5 ? Math.max(60, Math.round(d.promedio / 15) * 15) : base;
}
const bloques = (ini, fin, limp) => { const out = []; for (let b = Math.floor(ini / BLOQUE); b < Math.ceil((fin + limp) / BLOQUE); b++) out.push(b); return out; };
async function mapaOcupacion(env, R, fecha, sin = 0){
  const filas = await todas(env, 'SELECT mesa, bloque, reserva FROM ocupacion WHERE resto = ? AND fecha = ? AND reserva != ?', R.id, fecha, sin);
  const m = new Map(); for (const f of filas){ if (!m.has(f.mesa)) m.set(f.mesa, new Map()); m.get(f.mesa).set(f.bloque, f.reserva); }
  return m;
}
const libreEn = (occ, mesaId, blq) => { const s = occ.get(mesaId); return !s || blq.every(b => !s.has(b)); };
const entra = (m, pax) => pax <= m.cap_max && pax >= m.cap_min;

/* Las mesas (o combinaciones) que sirven para ese grupo y horario, de la más justa a la más holgada. */
async function opciones(env, R, fecha, inicio, pax, sin = 0, durFija = 0){
  const dur = durFija || await duracion(env, R, pax, fecha), fin = inicio + dur, blq = bloques(inicio, fin, R.politica.limpieza);
  const [mesas, occ] = [await mesasDe(env, R), await mapaOcupacion(env, R, fecha, sin)];
  const sueltas = mesas.filter(m => entra(m, pax) && libreEn(occ, m.id, blq)).sort((a, b) => a.cap_max - b.cap_max).map(m => ({ mesas:[m.id], codigos:[m.codigo], cap:m.cap_max }));
  let combos = [];
  if (!sueltas.length && pax > Math.max(0, ...mesas.map(m => m.cap_max))){
    const grupos = {};
    mesas.filter(m => m.combina && libreEn(occ, m.id, blq)).forEach(m => (grupos[m.combina] = grupos[m.combina] || []).push(m));
    for (const g of Object.values(grupos)){
      const n = g.length;
      for (let mask = 1; mask < (1 << n); mask++){
        const sel = g.filter((_, i) => mask & (1 << i)); if (sel.length < 2) continue;
        const cap = sel.reduce((s, m) => s + m.cap_max, 0) - (sel.length - 1);   // al juntar se pierde un lugar por unión
        if (cap >= pax) combos.push({ mesas:sel.map(m => m.id), codigos:sel.map(m => m.codigo), cap });
      }
    }
    combos.sort((a, b) => a.cap - b.cap || a.mesas.length - b.mesas.length); combos = combos.slice(0, 5);
  }
  return { inicio, fin, dur, blq, opciones:[...sueltas, ...combos], mesas, occ };
}
function turnosDelDia(turnos, fecha){ const d = String(diaSemana(fecha)); return turnos.filter(t => t.dias.includes(d)); }
async function horariosDelDia(env, R, fecha, pax){
  const L = local(env), turnos = turnosDelDia(await todas(env, 'SELECT * FROM turnos WHERE resto = ? ORDER BY desde', R.id), fecha);
  const cerrado = await una(env, 'SELECT motivo FROM cierres WHERE resto = ? AND fecha = ?', R.id, fecha);
  if (cerrado) return { cerrado:cerrado.motivo || 'Cerrado', horarios:[] };
  const res = await todas(env, "SELECT inicio, pax FROM reservas WHERE resto = ? AND fecha = ? AND estado IN ('confirmada','sentada','pendiente','ofrecida')", R.id, fecha);
  const horarios = [];
  for (const t of turnos) for (let m = t.desde; m <= t.hasta; m += t.paso){
    if (fecha === L.fecha && m < L.min + 30) continue;
    const op = await opciones(env, R, fecha, m, pax);
    const enFranja = res.filter(r => r.inicio >= m && r.inicio < m + t.paso).reduce((s, r) => s + r.pax, 0);
    const lleno = t.tope_franja && enFranja + pax > t.tope_franja;
    horarios.push({ min:m, hora:hhmm(m), turno:t.nombre, libre:!!op.opciones.length && !lleno, mesas:op.opciones.length });
  }
  return { cerrado:null, horarios };
}
/* Estado de cada mesa para quien reserva: libre, no es para su grupo, u ocupada con la hora desde la que se puede pedir. */
async function planoPublico(env, R, fecha, inicio, pax){
  const op = await opciones(env, R, fecha, inicio, pax), L = local(env);
  const turnos = turnosDelDia(await todas(env, 'SELECT * FROM turnos WHERE resto = ?', R.id), fecha);
  const t = turnos.find(x => inicio >= x.desde - 60 && inicio <= x.hasta + 60), tope = t ? t.hasta + 60 : inicio + 180;
  const libres = new Set(op.opciones.filter(o => o.mesas.length === 1).map(o => o.mesas[0]));
  const mesas = op.mesas.map(m => {
    const base = { id:m.id, codigo:m.codigo, forma:m.forma, x:m.x, y:m.y, w:m.w, h:m.h, cap:m.cap_max, zona:m.zona };
    if (!entra(m, pax)) return { ...base, estado:'no' };
    if (libres.has(m.id)) return { ...base, estado:'libre' };
    for (let s = inicio + BLOQUE; s <= tope; s += BLOQUE){
      if (fecha === L.fecha && s < L.min) continue;
      if (libreEn(op.occ, m.id, bloques(s, s + op.dur, R.politica.limpieza))) return { ...base, estado:'ocupada', desde:s, desde_hora:hhmm(s) };
    }
    return { ...base, estado:'ocupada' };
  });
  return { fecha, inicio, fin:op.fin, dur:op.dur, mesas, combos:op.opciones.filter(o => o.mesas.length > 1), plano:R.plano };
}

/* ======================= mensajes (WhatsApp) ======================= */
const TXT = {
  es:{
    confirmada:v => `¡Listo, ${v.nombre}! Tu reserva en ${v.resto} está confirmada 🎉\n${v.dia} a las ${v.hora} · ${v.pax} ${v.pax == 1 ? 'persona' : 'personas'} · mesa ${v.mesa}.\nCódigo ${v.codigo}.\n\n${v.politica}\n\nPara cambiar o cancelar: ${v.link}`,
    al_liberarse:v => `¡Listo, ${v.nombre}! Te guardamos la mesa ${v.mesa} para ${v.dia} a las ${v.hora}, ${v.pax} personas. Ahora está ocupada: si se libera antes, te avisamos.\n\n${v.politica}\n\n${v.link}`,
    recordatorio:v => `¡Hola, ${v.nombre}! ${v.dia} te esperamos a las ${v.hora}, ${v.pax} personas, mesa ${v.mesa}. ¿Seguís viniendo?`,
    recordatorio2:v => `${v.nombre}, te esperamos a las ${v.hora} en ${v.resto}. ¿Confirmás?`,
    confirmo:v => `¡Genial! Te esperamos. Si algo cambia, avisanos desde acá.`,
    vienen:v => `${v.nombre}, te estamos esperando 🙂 ¿Vienen? Te guardamos la mesa hasta las ${v.hasta}.`,
    llegan:v => `¡Perfecto! Te guardamos la mesa. Avisamos en la sala.`,
    cancelada:v => `Cancelaste tu reserva de ${v.dia} a las ${v.hora}, sin cargo. ¡Gracias por avisar con tiempo!`,
    compromiso:v => `Hola, ${v.nombre}. Registramos ${v.motivo} de ${v.dia} a las ${v.hora}. Queda un compromiso de ${v.monto}.${v.credito ? ` Sabemos que a veces pasa: si lo pagás y volvés antes del ${v.vence}, te lo descontamos de la cuenta.` : ''} Si no lo pagás, tu próxima reserva online va a pedir una seña.\n\nPagar: ${v.pago}`,
    exento:v => `Hola, ${v.nombre}. Registramos ${v.motivo} de hoy. Como hay alerta meteorológica, no hay ningún cargo. ¡Cuidate!`,
    pago_ok:v => `Recibimos tu pago de ${v.monto}. ¡Gracias!${v.credito ? ` Tenés ese crédito para usar antes del ${v.vence}.` : ''}`,
    oferta:v => `¡Se liberó una mesa! Mesa ${v.mesa}, ${v.dia} a las ${v.hora}, ${v.pax} personas. ¿La querés? Te la guardamos ${v.min} minutos.`,
    oferta_ok:v => `¡Es tuya! Te esperamos a las ${v.hora}.\n\n${v.politica}\n\n${v.link}`,
    antes:v => `Buenas noticias: la mesa ${v.mesa} se liberó antes y ya está lista. ¿Querés venir ahora?`,
    demora:v => `${v.nombre}, la mesa ${v.mesa} se está demorando unos ${v.min} minutos. Te esperamos en la barra, o te buscamos otra mesa.`,
    sena:v => `Para confirmar tu reserva de ${v.dia} a las ${v.hora} (${v.pax} personas) falta la seña de ${v.monto}, que se descuenta de la cuenta. Pagala acá dentro de los próximos ${v.min} minutos: ${v.pago}`,
    sena_ok:v => `¡Seña recibida! Tu reserva de ${v.dia} a las ${v.hora} está confirmada. ${v.link}`,
    cierre:v => `${v.nombre}, por el temporal hoy cerramos. Perdón por el cambio. ¿Te guardamos la mesa otro día? ${v.link}`,
    cancelada_resto:v => `${v.nombre}, tuvimos que cancelar tu reserva de ${v.dia} a las ${v.hora}. Perdón. ${v.sena ? 'Te devolvemos la seña completa. ' : ''}Elegí otra fecha acá: ${v.link}`,
    politica:v => `Podés cancelar sin cargo hasta las ${v.limite}. Si cancelás después o no venís, queda un compromiso de ${v.monto} por persona${v.credito ? `, que te devolvemos como crédito si volvés en ${v.dias} días` : ''}.`,
    politica_ya:v => `Como reservaste con poca anticipación, podés cancelar sin cargo hasta las ${v.limite}. Si cancelás después o no venís, queda un compromiso de ${v.monto} por persona${v.credito ? `, que te devolvemos como crédito si volvés en ${v.dias} días` : ''}.`,
    b_confirmo:'✅ Confirmo', b_cambiar:'🕘 Cambiar', b_cancelar:'✖ Cancelar', b_llegamos:'Llegamos en 10', b_no_vamos:'No vamos a poder', b_quiero:'Sí, la quiero', b_no_gracias:'No, gracias', b_voy:'Voy ahora', b_mantengo:'Mantengo mi hora', b_pagar:'Pagar con Mercado Pago', b_emergencia:'Tuve una emergencia',
  },
  en:{
    confirmada:v => `All set, ${v.nombre}! Your table at ${v.resto} is confirmed 🎉\n${v.dia} at ${v.hora} · ${v.pax} people · table ${v.mesa}.\nCode ${v.codigo}.\n\n${v.politica}\n\nTo change or cancel: ${v.link}`,
    recordatorio:v => `Hi ${v.nombre}! We're expecting you ${v.dia} at ${v.hora}, ${v.pax} people. Still coming?`,
    vienen:v => `${v.nombre}, we're waiting for you 🙂 Are you coming? We'll hold the table until ${v.hasta}.`,
    oferta:v => `A table just opened up! Table ${v.mesa}, ${v.dia} at ${v.hora}, ${v.pax} people. Want it? We'll hold it for ${v.min} minutes.`,
    politica_ya:v => `Booked at short notice: free cancellation until ${v.limite}. Late cancellations or no-shows carry a ${v.monto} per person commitment.`,
    politica:v => `Free cancellation until ${v.limite}. Late cancellations or no-shows carry a ${v.monto} per person commitment${v.credito ? `, refunded as credit if you come back within ${v.dias} days` : ''}.`,
    al_liberarse:v => `All set, ${v.nombre}! We're holding table ${v.mesa} for you ${v.dia} at ${v.hora}, ${v.pax} people. It's taken right now: if it frees up earlier, we'll let you know.\n\n${v.politica}\n\n${v.link}`,
    recordatorio2:v => `${v.nombre}, we're expecting you at ${v.hora} at ${v.resto}. Can you confirm?`,
    confirmo:v => `Great! See you soon. If anything changes, just let us know here.`,
    llegan:v => `Perfect! We'll hold your table and let the staff know.`,
    cancelada:v => `Your booking for ${v.dia} at ${v.hora} has been cancelled at no cost. Thanks for letting us know in advance!`,
    compromiso:v => `Hi ${v.nombre}. We've recorded ${v.motivo} for ${v.dia} at ${v.hora}. A ${v.monto} commitment applies.${v.credito ? ` If you pay it and come back before ${v.vence}, we'll deduct it from your bill.` : ''} If it's unpaid, your next online booking will require a deposit.\n\nPay: ${v.pago}`,
    exento:v => `Hi ${v.nombre}. We've recorded ${v.motivo} today. Since there is a weather alert, there is no charge. Stay safe!`,
    pago_ok:v => `We received your ${v.monto} payment. Thank you!${v.credito ? ` You can use it as credit before ${v.vence}.` : ''}`,
    oferta_ok:v => `It's yours! See you at ${v.hora}.\n\n${v.politica}\n\n${v.link}`,
    antes:v => `Good news: table ${v.mesa} is free earlier and ready. Would you like to come now?`,
    demora:v => `${v.nombre}, table ${v.mesa} is running about ${v.min} minutes late. You're welcome to wait at the bar, or we'll find you another table.`,
    sena:v => `To confirm your booking for ${v.dia} at ${v.hora} (${v.pax} people), a ${v.monto} deposit is due, deducted from the bill. Please pay within ${v.min} minutes: ${v.pago}`,
    sena_ok:v => `Deposit received! Your booking for ${v.dia} at ${v.hora} is confirmed. ${v.link}`,
    cierre:v => `${v.nombre}, because of the storm we're closed today. Sorry for the change. Shall we hold a table for another day? ${v.link}`,
    cancelada_resto:v => `${v.nombre}, we had to cancel your booking for ${v.dia} at ${v.hora}. We're sorry. ${v.sena ? 'Your deposit will be refunded in full. ' : ''}Choose another date here: ${v.link}`,
    b_voy:'Coming now', b_mantengo:'Keep my time', b_pagar:'Pay with Mercado Pago', b_emergencia:'I had an emergency',
    b_confirmo:'✅ Yes', b_cambiar:'🕘 Change', b_cancelar:'✖ Cancel', b_llegamos:'10 min away', b_no_vamos:"We can't make it", b_quiero:'Yes, I want it', b_no_gracias:'No, thanks',
  },
  pt:{
    confirmada:v => `Tudo certo, ${v.nombre}! Sua reserva no ${v.resto} está confirmada 🎉\n${v.dia} às ${v.hora} · ${v.pax} pessoas · mesa ${v.mesa}.\nCódigo ${v.codigo}.\n\n${v.politica}\n\nPara mudar ou cancelar: ${v.link}`,
    recordatorio:v => `Olá, ${v.nombre}! Esperamos você ${v.dia} às ${v.hora}, ${v.pax} pessoas. Continua de pé?`,
    vienen:v => `${v.nombre}, estamos esperando 🙂 Vocês vêm? Guardamos a mesa até ${v.hasta}.`,
    oferta:v => `Uma mesa ficou livre! Mesa ${v.mesa}, ${v.dia} às ${v.hora}, ${v.pax} pessoas. Quer? Guardamos por ${v.min} minutos.`,
    politica_ya:v => `Reserva em cima da hora: cancelamento sem custo até ${v.limite}. Depois disso, ou se não vier, fica um compromisso de ${v.monto} por pessoa.`,
    politica:v => `Cancelamento sem custo até ${v.limite}. Depois disso, ou se não vier, fica um compromisso de ${v.monto} por pessoa${v.credito ? `, devolvido como crédito se voltar em ${v.dias} dias` : ''}.`,
    al_liberarse:v => `Tudo certo, ${v.nombre}! Guardamos a mesa ${v.mesa} para ${v.dia} às ${v.hora}, ${v.pax} pessoas. Agora está ocupada: se liberar antes, avisamos.\n\n${v.politica}\n\n${v.link}`,
    recordatorio2:v => `${v.nombre}, esperamos você às ${v.hora} no ${v.resto}. Confirma?`,
    confirmo:v => `Ótimo! Esperamos vocês. Se algo mudar, avise por aqui.`,
    llegan:v => `Perfeito! Guardamos a mesa e avisamos o salão.`,
    cancelada:v => `Sua reserva de ${v.dia} às ${v.hora} foi cancelada sem custo. Obrigado por avisar com antecedência!`,
    compromiso:v => `Olá, ${v.nombre}. Registramos ${v.motivo} de ${v.dia} às ${v.hora}. Fica um compromisso de ${v.monto}.${v.credito ? ` Se pagar e voltar antes de ${v.vence}, descontamos da conta.` : ''} Se não pagar, sua próxima reserva online vai pedir um sinal.\n\nPagar: ${v.pago}`,
    exento:v => `Olá, ${v.nombre}. Registramos ${v.motivo} de hoje. Como há alerta meteorológico, não há nenhuma cobrança. Cuide-se!`,
    pago_ok:v => `Recebemos seu pagamento de ${v.monto}. Obrigado!${v.credito ? ` Você pode usá-lo como crédito até ${v.vence}.` : ''}`,
    oferta_ok:v => `É sua! Esperamos você às ${v.hora}.\n\n${v.politica}\n\n${v.link}`,
    antes:v => `Boa notícia: a mesa ${v.mesa} liberou antes e já está pronta. Quer vir agora?`,
    demora:v => `${v.nombre}, a mesa ${v.mesa} vai atrasar uns ${v.min} minutos. Você pode esperar no bar, ou buscamos outra mesa.`,
    sena:v => `Para confirmar sua reserva de ${v.dia} às ${v.hora} (${v.pax} pessoas) falta o sinal de ${v.monto}, descontado da conta. Pague em até ${v.min} minutos: ${v.pago}`,
    sena_ok:v => `Sinal recebido! Sua reserva de ${v.dia} às ${v.hora} está confirmada. ${v.link}`,
    cierre:v => `${v.nombre}, por causa da tempestade hoje fechamos. Desculpe a mudança. Guardamos uma mesa para outro dia? ${v.link}`,
    cancelada_resto:v => `${v.nombre}, tivemos que cancelar sua reserva de ${v.dia} às ${v.hora}. Desculpe. ${v.sena ? 'Devolvemos o sinal completo. ' : ''}Escolha outra data aqui: ${v.link}`,
    b_voy:'Vou agora', b_mantengo:'Mantenho meu horário', b_pagar:'Pagar com Mercado Pago', b_emergencia:'Tive uma emergência',
    b_confirmo:'✅ Confirmo', b_cambiar:'🕘 Mudar', b_cancelar:'✖ Cancelar', b_llegamos:'Chegamos em 10', b_no_vamos:'Não vamos conseguir', b_quiero:'Sim, quero', b_no_gracias:'Não, obrigado',
  },
};
const tx = (idioma, clave) => (TXT[idioma] && TXT[idioma][clave]) || TXT.es[clave];
const diaTexto = (env, fecha, idioma = 'es') => { const L = local(env); if (fecha === L.fecha) return { es:'hoy', en:'today', pt:'hoje' }[idioma] || 'hoy'; if (fecha === sumarDias(L.fecha, 1)) return { es:'mañana', en:'tomorrow', pt:'amanhã' }[idioma] || 'mañana'; return fechaCorta(fecha); };
async function linkReserva(env, codigo){ return `${env.APP_URL || '.'}/mi.html?c=${codigo}&k=${await hmac(env, 'r:' + codigo)}`; }
/* Hasta cuándo se cancela sin cargo: X horas antes, o 15 minutos después de reservar si se reservó sobre la hora. */
const GRACIA = 15;
function limiteSinCargo(R, r){ const lim = msDe(r.fecha, r.inicio) - R.politica.horas * 3600000; return Math.max(lim, (r.creado || 0) + GRACIA * 60000); }
function varsPolitica(env, R, r, idioma){ const P = R.politica, lim = limiteSinCargo(R, r), gracia = lim > msDe(r.fecha, r.inicio) - P.horas * 3600000;
  return tx(idioma, gracia ? 'politica_ya' : 'politica')({ limite:hhmm(local(env, lim).min), monto:pesos(P.monto), credito:P.credito, dias:P.dias_credito }); }
async function mandar(env, R, { reserva = null, espera = null, tel, idioma = 'es', plantilla, vars = {}, botones = [] }){
  const txt = tx(idioma, plantilla)({ resto:R.nombre, ...vars });
  const bt = botones.map(b => ({ id:b, texto:tx(idioma, 'b_' + b) }));
  const modo = env.WA_TOKEN && env.WA_PHONE_ID ? 'cloud' : R.politica.wa_modo === 'manual' ? 'manual' : 'simulado';
  let estado = modo === 'manual' ? 'pendiente' : 'simulado', error = '';
  if (modo === 'cloud'){
    try {
      const r = await fetch(`https://graph.facebook.com/v21.0/${env.WA_PHONE_ID}/messages`, { method:'POST', headers:{ 'authorization':'Bearer ' + env.WA_TOKEN, 'content-type':'application/json' },
        body:JSON.stringify({ messaging_product:'whatsapp', to:tel, type:'template', template:{ name:'ma_' + plantilla, language:{ code:{ es:'es_AR', en:'en', pt:'pt_BR' }[idioma] }, components:[{ type:'body', parameters:Object.values(vars).slice(0, 8).map(v => ({ type:'text', text:String(v).slice(0, 200) })) }] } }) });
      estado = r.ok ? 'enviado' : 'error'; if (!r.ok) error = (await r.text()).slice(0, 200);
    } catch (e){ estado = 'error'; error = String(e.message).slice(0, 200); }
  }
  await correr(env, 'INSERT INTO mensajes (resto, reserva, espera, tel, plantilla, texto, botones, estado, error, creado, enviado) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    R.id, reserva, espera, tel, plantilla, txt, JSON.stringify(bt), estado, error, ahoraMs(env), estado === 'enviado' ? ahoraMs(env) : null);
}
async function datosMensaje(env, R, r){
  const c = r.cliente ? await una(env, 'SELECT * FROM clientes WHERE id = ?', r.cliente) : null;
  const idioma = c ? c.idioma : 'es';
  const cods = (await todas(env, `SELECT codigo FROM mesas WHERE id IN (${r.mesas.split(',').map(Number).join(',') || 0})`)).map(m => m.codigo).join(' + ');
  return { c, idioma, tel:c ? c.tel : '', vars:{ nombre:(r.nombre || '').split(' ')[0], dia:diaTexto(env, r.fecha, idioma), hora:hhmm(r.inicio), pax:r.pax, mesa:cods, codigo:r.codigo, link:await linkReserva(env, r.codigo), politica:varsPolitica(env, R, r, idioma) } };
}
async function avisar(env, R, r, plantilla, extra = {}, botones = []){
  const d = await datosMensaje(env, R, r); if (!d.tel) return;
  await mandar(env, R, { reserva:r.id, tel:d.tel, idioma:d.idioma, plantilla, vars:{ ...d.vars, ...extra }, botones });
}

/* ======================= pagos (Mercado Pago o simulado) ======================= */
async function crearPago(env, R, { tipo, reserva = null, incidente = null, monto, titulo, codigo }){
  const id = nuevoId(), k = await hmac(env, 'p:' + id), proveedor = env.MP_TOKEN ? 'mercadopago' : 'simulado';
  let enlace = `${env.APP_URL || '.'}/pago.html?p=${id}&k=${k}`;
  if (proveedor === 'mercadopago'){
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', { method:'POST', headers:{ authorization:'Bearer ' + env.MP_TOKEN, 'content-type':'application/json' },
      body:JSON.stringify({ items:[{ title:titulo, quantity:1, unit_price:monto, currency_id:'ARS' }], external_reference:'pago-' + id, notification_url:(env.API_URL || '') + '/api/mp/webhook',
        back_urls:{ success:`${env.APP_URL}/mi.html?c=${codigo}&k=${await hmac(env, 'r:' + codigo)}&pago=ok` }, auto_return:'approved' }) });
    if (!r.ok) falla(502, 'Mercado Pago no respondió. Probá de nuevo en un rato.');
    enlace = (await r.json()).init_point;
  }
  await correr(env, 'INSERT INTO pagos (id, resto, tipo, reserva, incidente, monto, estado, proveedor, enlace, creado, actualizado) VALUES (?,?,?,?,?,?,?,?,?,?,?)', id, R.id, tipo, reserva, incidente, monto, 'pendiente', proveedor, enlace, ahoraMs(env), ahoraMs(env));
  return { id, enlace };
}
async function aplicarPago(env, pagoId, externo = null){
  const p = await una(env, 'SELECT * FROM pagos WHERE id = ?', pagoId); if (!p || p.estado === 'aprobado') return p;
  const R = await restoPorId(env, p.resto), L = local(env);
  await correr(env, 'UPDATE pagos SET estado = ?, externo = COALESCE(?, externo), actualizado = ? WHERE id = ?', 'aprobado', externo, ahoraMs(env), p.id);
  if (p.tipo === 'sena'){
    const r = await una(env, 'SELECT * FROM reservas WHERE id = ?', p.reserva);
    if (r && r.estado === 'pendiente'){ await correr(env, "UPDATE reservas SET estado = 'confirmada', sena = ?, actualizado = ? WHERE id = ?", p.monto, ahoraMs(env), r.id); await avisar(env, R, r, 'sena_ok'); }
  } else if (p.tipo === 'compromiso'){
    const inc = await una(env, 'SELECT * FROM incidentes WHERE id = ?', p.incidente);
    await correr(env, "UPDATE incidentes SET estado = 'pagado' WHERE id = ?", inc.id);
    const c = await una(env, 'SELECT * FROM clientes WHERE id = ?', inc.cliente);
    const vence = sumarDias(L.fecha, R.politica.dias_credito);
    const otros = (await una(env, "SELECT COUNT(*) n FROM incidentes WHERE cliente = ? AND creado > ? AND estado != 'condonado'", c.id, ahoraMs(env) - 365 * 864e5)).n;
    await correr(env, 'UPDATE clientes SET credito = credito + ?, credito_vence = ?, pide_sena_hasta = ? WHERE id = ?', R.politica.credito ? p.monto : 0, R.politica.credito ? vence : c.credito_vence, otros >= 2 ? sumarDias(L.fecha, 180) : '', c.id);
    await mandar(env, R, { tel:c.tel, idioma:c.idioma, reserva:inc.reserva, plantilla:'pago_ok', vars:{ monto:pesos(p.monto), credito:R.politica.credito, vence:fechaCorta(vence) } });
  }
  await subirVersion(env, R).run(); await auditar(env, R, 'pagos', 'Pago aprobado', `${p.tipo} ${pesos(p.monto)}`).run();
  return p;
}

/* ======================= reservas ======================= */
async function insertarReserva(env, R, d){
  const id = nuevoId(), codigo = nuevoCodigo(), ahora = ahoraMs(env);
  const stmts = [q(env, `INSERT INTO reservas (id, resto, codigo, cliente, nombre, fecha, inicio, fin, pax, mesas, estado, confirmo, canal, ocasion, alergias, notas, al_liberarse, sentada_en, idem, creado, actualizado)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, id, R.id, codigo, d.cliente || null, d.nombre, d.fecha, d.inicio, d.fin, d.pax, d.mesas.join(','), d.estado, d.confirmo ? 1 : 0, d.canal, d.ocasion || '', d.alergias || '', d.notas || '', d.al_liberarse ? 1 : 0, d.sentada_en || null, d.idem || null, ahora, ahora)];
  for (const m of d.mesas) for (const b of bloques(d.inicio, d.fin, R.politica.limpieza)) stmts.push(q(env, 'INSERT INTO ocupacion (resto, mesa, fecha, bloque, reserva) VALUES (?,?,?,?,?)', R.id, m, d.fecha, b, id));
  stmts.push(subirVersion(env, R));
  try { await env.DB.batch(stmts); } catch (e){ if (choque(e)) falla(409, 'Esa mesa se acaba de ocupar. Elegí otra.', { recalcular:true }); throw e; }
  return { id, codigo };
}
/* Reubica una reserva (otra hora, otras mesas o más tiempo) en una sola operación: si choca, no cambia nada. */
async function reubicar(env, R, r, cambios){
  const n = { ...r, ...cambios }, mesas = String(n.mesas).split(',').map(Number);
  const stmts = [q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id),
    q(env, 'UPDATE reservas SET fecha = ?, inicio = ?, fin = ?, pax = ?, mesas = ?, actualizado = ? WHERE id = ?', n.fecha, n.inicio, n.fin, n.pax, mesas.join(','), ahoraMs(env), r.id)];
  for (const m of mesas) for (const b of bloques(n.inicio, n.fin, R.politica.limpieza)) stmts.push(q(env, `INSERT ${cambios.forzar ? 'OR IGNORE ' : ''}INTO ocupacion (resto, mesa, fecha, bloque, reserva) VALUES (?,?,?,?,?)`, R.id, m, n.fecha, b, r.id));
  stmts.push(subirVersion(env, R));
  try { await env.DB.batch(stmts); } catch (e){ if (choque(e)) falla(409, 'En ese horario no hay lugar en esa mesa.'); throw e; }
}
async function liberarDesde(env, R, r, desdeMin){
  const desde = Math.ceil((desdeMin + R.politica.limpieza) / BLOQUE);
  await correr(env, 'DELETE FROM ocupacion WHERE reserva = ? AND bloque >= ?', r.id, desde);
}
async function clienteDe(env, R, { nombre, tel, email = '', idioma, promos = false }){
  const t = telefono(tel), id = idiomaDe(t, idioma), ahora = ahoraMs(env);
  await correr(env, 'INSERT OR IGNORE INTO clientes (resto, nombre, tel, email, idioma, acepta_promos, creado) VALUES (?,?,?,?,?,?,?)', R.id, nombre, t, email, id, promos ? 1 : 0, ahora);
  await correr(env, 'UPDATE clientes SET nombre = ?, email = CASE WHEN ? != \'\' THEN ? ELSE email END, idioma = ?, acepta_promos = MAX(acepta_promos, ?) WHERE resto = ? AND tel = ?', nombre, email, email, id, promos ? 1 : 0, R.id, t);
  return una(env, 'SELECT * FROM clientes WHERE resto = ? AND tel = ?', R.id, t);
}
async function crearReservaPublica(env, R, b, ip){
  await limitar(env, 'res:' + ip, 12, 3600);
  const L = local(env), P = R.politica;
  if (b.idem){ const ya = await una(env, 'SELECT codigo FROM reservas WHERE idem = ?', String(b.idem).slice(0, 64)); if (ya) return { codigo:ya.codigo, k:await hmac(env, 'r:' + ya.codigo), repetida:true }; }
  if (!b.acepta_politica) falla(400, 'Tenés que aceptar las condiciones de la reserva');
  const fecha = esFecha(b.fecha) ? b.fecha : falla(400, 'Fecha inválida'), inicio = entero(b.inicio, 0, 1439), pax = entero(b.pax, 1, 40);
  if (fecha < L.fecha || fecha > sumarDias(L.fecha, P.anticipacion)) falla(400, `Se puede reservar hasta ${P.anticipacion} días antes`);
  if (fecha === L.fecha && inicio < L.min + 15) falla(400, 'Ese horario ya pasó');
  if (pax > P.max_pax) falla(400, `Para más de ${P.max_pax} personas escribinos por WhatsApp`, { whatsapp:R.whatsapp });
  const nombre = texto(b.nombre, 60); if (nombre.length < 2) falla(400, 'Escribí tu nombre');
  if (inicio % BLOQUE) falla(400, 'Horario inválido');
  const turnos = turnosDelDia(await todas(env, 'SELECT * FROM turnos WHERE resto = ?', R.id), fecha);
  const enTurno = turnos.some(t => inicio >= t.desde && inicio <= t.hasta + (b.al_liberarse ? 90 : 0));
  if (!enTurno) falla(400, 'Ese horario no está disponible');
  if (await una(env, 'SELECT 1 FROM cierres WHERE resto = ? AND fecha = ?', R.id, fecha)) falla(400, 'Ese día el restaurante está cerrado');
  const c = await clienteDe(env, R, { nombre, tel:b.tel, email:texto(b.email, 80), idioma:b.idioma, promos:!!b.acepta_promos });
  const op = await opciones(env, R, fecha, inicio, pax);
  let elegida = op.opciones[0];
  if (b.mesa){ elegida = op.opciones.find(o => o.mesas.length === 1 && o.mesas[0] === Number(b.mesa)); if (!elegida) falla(409, 'Esa mesa no está libre en ese horario. Elegí otra.', { recalcular:true }); }
  if (!elegida) falla(409, 'No quedan mesas para ese horario', { recalcular:true });
  const pideSena = pax >= P.grupo_desde || (c.pide_sena_hasta && c.pide_sena_hasta >= L.fecha);
  const alergias = b.acepta_alergias ? texto(b.alergias, 120) : '';
  const nueva = await insertarReserva(env, R, { cliente:c.id, nombre, fecha, inicio, fin:op.fin, pax, mesas:elegida.mesas, estado:pideSena ? 'pendiente' : 'confirmada', canal:'web', ocasion:texto(b.ocasion, 40), alergias, notas:texto(b.notas, 200), al_liberarse:!!b.al_liberarse, idem:b.idem ? String(b.idem).slice(0, 64) : null });
  const r = await una(env, 'SELECT * FROM reservas WHERE id = ?', nueva.id);
  let pago = null;
  if (pideSena){
    pago = await crearPago(env, R, { tipo:'sena', reserva:r.id, monto:pax * P.sena, titulo:`Seña · ${R.nombre} · ${fechaCorta(fecha)} ${hhmm(inicio)}`, codigo:r.codigo });
    await avisar(env, R, r, 'sena', { monto:pesos(pax * P.sena), pago:pago.enlace, min:P.sena_min });
  } else await avisar(env, R, r, b.al_liberarse ? 'al_liberarse' : 'confirmada');
  await auditar(env, R, 'web', 'Reserva creada', `${r.codigo} · ${pax} p · ${fecha} ${hhmm(inicio)}`).run();
  return { codigo:r.codigo, k:await hmac(env, 'r:' + r.codigo), estado:r.estado, mesas:elegida.codigos, inicio, fin:op.fin, pago };
}
async function reservaPorCodigo(env, codigo, k){
  const r = await una(env, 'SELECT * FROM reservas WHERE codigo = ?', String(codigo || '').toUpperCase());
  if (!r || k !== await hmac(env, 'r:' + r.codigo)) falla(404, 'No encontramos la reserva. Usá el enlace de tu mensaje.');
  return r;
}
async function vistaReserva(env, R, r){
  const c = r.cliente ? await una(env, 'SELECT * FROM clientes WHERE id = ?', r.cliente) : null, L = local(env), P = R.politica;
  const cods = (await todas(env, `SELECT codigo, zona FROM mesas WHERE id IN (${r.mesas || 0})`));
  const limite = limiteSinCargo(R, r);
  const inc = await una(env, 'SELECT i.*, p.enlace, p.id pago FROM incidentes i LEFT JOIN pagos p ON p.incidente = i.id WHERE i.reserva = ? ORDER BY i.id DESC', r.id);
  const pagoSena = r.estado === 'pendiente' ? await una(env, "SELECT id, enlace, monto FROM pagos WHERE reserva = ? AND tipo = 'sena' AND estado = 'pendiente'", r.id) : null;
  return { codigo:r.codigo, estado:r.estado, fecha:r.fecha, dia:diaTexto(env, r.fecha, c?.idioma), inicio:r.inicio, hora:hhmm(r.inicio), fin:r.fin, pax:r.pax, mesas:cods.map(m => m.codigo), zona:cods[0]?.zona || '',
    nombre:r.nombre, ocasion:r.ocasion, tiene_alergias:!!r.alergias, al_liberarse:!!r.al_liberarse, confirmo:!!r.confirmo, sena:r.sena,
    sin_cargo_hasta:hhmm(local(env, limite).min), a_tiempo:ahoraMs(env) <= limite, compromiso:Math.min(r.pax, P.tope_personas) * P.monto,
    credito:c && c.credito && c.credito_vence >= L.fecha ? { monto:c.credito, vence:c.credito_vence } : null,
    incidente:inc ? { tipo:inc.tipo, monto:inc.monto, estado:inc.estado, pago:inc.enlace } : null, pago_sena:pagoSena,
    hoy:L.fecha, resto:{ nombre:R.nombre, slug:R.slug, whatsapp:R.whatsapp, subtitulo:R.subtitulo, estilo:(P.pagina || {}).estilo || 'canal' }, politica:{ horas:P.horas, monto:P.monto, credito:P.credito, dias:P.dias_credito, tolerancia:P.tolerancia } };
}
/* Cancelación: a tiempo, sin cargo; tarde, con incidente y compromiso. La usan el cliente y el plantón automático. */
async function registrarIncidente(env, R, r, tipo){
  const c = r.cliente ? await una(env, 'SELECT * FROM clientes WHERE id = ?', r.cliente) : null; if (!c) return null;
  const L = local(env), P = R.politica, monto = Math.min(r.pax, P.tope_personas) * P.monto;
  const alerta = P.smn && (await una(env, "SELECT valor FROM sistema WHERE clave = 'alerta_smn'"))?.valor === r.fecha;
  const id = nuevoId();
  await correr(env, 'INSERT INTO incidentes (id, resto, cliente, reserva, tipo, monto, estado, creado, vence) VALUES (?,?,?,?,?,?,?,?,?)', id, R.id, c.id, r.id, tipo, alerta ? 0 : monto, alerta ? 'exento' : 'pendiente', ahoraMs(env), sumarDias(L.fecha, 365));
  const MOT = { es:[`que no pudiste venir a tu reserva`, `tu cancelación con menos de ${P.horas} ${P.horas === 1 ? 'hora' : 'horas'}`], en:[`a no-show at your booking`, `your cancellation less than ${P.horas} hours ahead`], pt:[`que você não pôde vir à reserva`, `seu cancelamento com menos de ${P.horas} horas`] };
  const motivo = (MOT[c.idioma] || MOT.es)[tipo === 'planton' ? 0 : 1];
  if (alerta){ await mandar(env, R, { reserva:r.id, tel:c.tel, idioma:c.idioma, plantilla:'exento', vars:{ nombre:c.nombre.split(' ')[0], motivo } }); return { id, exento:true }; }
  const pago = await crearPago(env, R, { tipo:'compromiso', reserva:r.id, incidente:id, monto, titulo:`Compromiso · ${R.nombre} · ${fechaCorta(r.fecha)}`, codigo:r.codigo });
  await correr(env, 'UPDATE clientes SET pide_sena_hasta = ? WHERE id = ?', sumarDias(L.fecha, 180), c.id);
  await mandar(env, R, { reserva:r.id, tel:c.tel, idioma:c.idioma, plantilla:'compromiso', botones:['pagar', 'emergencia'],
    vars:{ nombre:c.nombre.split(' ')[0], motivo, dia:diaTexto(env, r.fecha, c.idioma), hora:hhmm(r.inicio), monto:pesos(monto), credito:P.credito, vence:fechaCorta(sumarDias(L.fecha, P.dias_credito)), pago:pago.enlace } });
  return { id, monto, pago };
}
async function cancelar(env, R, r, { quien, confirma_tarde = false }){
  if (!['confirmada', 'pendiente', 'ofrecida'].includes(r.estado)) falla(400, 'Esta reserva ya no se puede cancelar');
  const P = R.politica, tarde = r.estado === 'confirmada' && ahoraMs(env) > limiteSinCargo(R, r) && quien === 'cliente';
  if (tarde && !confirma_tarde) falla(409, 'Cancelación sobre la hora', { tarde:true, monto:Math.min(r.pax, P.tope_personas) * P.monto, credito:P.credito, dias:P.dias_credito });
  await env.DB.batch([q(env, 'UPDATE reservas SET estado = ?, actualizado = ? WHERE id = ?', tarde ? 'cancelada_tarde' : 'cancelada', ahoraMs(env), r.id), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id), subirVersion(env, R)]);
  let inc = null;
  if (tarde) inc = await registrarIncidente(env, R, r, 'tardia');
  else if (quien === 'cliente') await avisar(env, R, r, 'cancelada');
  if (r.sena && quien !== 'cliente') await correr(env, "UPDATE pagos SET estado = 'devuelto' WHERE reserva = ? AND tipo = 'sena' AND estado = 'aprobado'", r.id);
  await auditar(env, R, quien, tarde ? 'Cancelación tardía' : 'Cancelación', r.codigo).run();
  await ofrecerLiberadas(env, R, r.fecha);
  return { tarde, incidente:inc };
}

/* ======================= lista de espera ======================= */
async function ofrecerLiberadas(env, R, fecha){
  const L = local(env), P = R.politica;
  const esperan = await todas(env, "SELECT * FROM espera WHERE resto = ? AND fecha = ? AND estado = 'esperando' ORDER BY creado", R.id, fecha);
  for (const e of esperan){
    for (let s = Math.max(e.desde, fecha === L.fecha ? Math.ceil((L.min + 5) / BLOQUE) * BLOQUE : 0); s <= e.hasta; s += BLOQUE){
      const op = await opciones(env, R, fecha, s, e.pax); if (!op.opciones.length) continue;
      const o = op.opciones[0];
      let nueva; try { nueva = await insertarReserva(env, R, { cliente:e.cliente, nombre:e.nombre, fecha, inicio:s, fin:op.fin, pax:e.pax, mesas:o.mesas, estado:'ofrecida', canal:'espera' }); } catch (err){ continue; }
      const vence = ahoraMs(env) + P.oferta_min * 60000;
      await correr(env, "UPDATE espera SET estado = 'ofrecida', reserva = ?, oferta_vence = ? WHERE id = ?", nueva.id, vence, e.id);
      if (e.tel){ const c = e.cliente ? await una(env, 'SELECT idioma FROM clientes WHERE id = ?', e.cliente) : null;
        await mandar(env, R, { reserva:nueva.id, espera:e.id, tel:e.tel, idioma:c?.idioma || 'es', plantilla:'oferta', botones:['quiero', 'no_gracias'], vars:{ mesa:o.codigos.join(' + '), dia:diaTexto(env, fecha), hora:hhmm(s), pax:e.pax, min:P.oferta_min } }); }
      await auditar(env, R, 'sistema', 'Mesa ofrecida a la espera', `${o.codigos.join('+')} ${hhmm(s)}`).run();
      break;
    }
  }
}
async function responderOferta(env, R, e, acepta){
  const r = await una(env, 'SELECT * FROM reservas WHERE id = ?', e.reserva);
  if (!r || e.estado !== 'ofrecida') falla(400, 'Esa oferta ya venció');
  if (acepta){
    await env.DB.batch([q(env, "UPDATE reservas SET estado = 'confirmada', confirmo = 1, actualizado = ? WHERE id = ?", ahoraMs(env), r.id), q(env, "UPDATE espera SET estado = 'aceptada' WHERE id = ?", e.id), subirVersion(env, R)]);
    await avisar(env, R, r, 'oferta_ok');
  } else {
    await env.DB.batch([q(env, "UPDATE reservas SET estado = 'cancelada', actualizado = ? WHERE id = ?", ahoraMs(env), r.id), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id), q(env, "UPDATE espera SET estado = 'cancelada' WHERE id = ?", e.id), subirVersion(env, R)]);
    await ofrecerLiberadas(env, R, r.fecha);
  }
}

/* ======================= respuestas a los botones de WhatsApp ======================= */
async function responder(env, R, r, boton, msg){
  const P = R.politica, L = local(env);
  if (msg) await correr(env, 'UPDATE mensajes SET respuesta = ? WHERE id = ?', boton, msg);
  const d = await datosMensaje(env, R, r);
  const eco = async plantilla => { if (d.tel) await mandar(env, R, { reserva:r.id, tel:d.tel, idioma:d.idioma, plantilla, vars:d.vars }); };
  switch (boton){
    case 'confirmo': await env.DB.batch([q(env, 'UPDATE reservas SET confirmo = 1, actualizado = ? WHERE id = ?', ahoraMs(env), r.id), subirVersion(env, R)]); await eco('confirmo'); return { ok:true };
    case 'llegamos': await env.DB.batch([q(env, "UPDATE reservas SET avisos = avisos || ' tarde', notas = TRIM(notas || ' Llegan en 10 (' || ? || ')'), actualizado = ? WHERE id = ?", hhmm(L.min), ahoraMs(env), r.id), subirVersion(env, R)]); await eco('llegan'); return { ok:true };
    case 'no_vamos': return cancelar(env, R, r, { quien:'cliente', confirma_tarde:true });
    case 'cancelar': return { abrir:'cancelar' };
    case 'cambiar': return { abrir:'cambiar' };
    case 'quiero': case 'no_gracias': { const e = await una(env, 'SELECT * FROM espera WHERE reserva = ?', r.id); if (!e) falla(400, 'Esa oferta ya no está'); await responderOferta(env, R, e, boton === 'quiero'); return { ok:true }; }
    case 'voy': await env.DB.batch([q(env, "UPDATE reservas SET notas = TRIM(notas || ' Viene antes (' || ? || ')'), actualizado = ? WHERE id = ?", hhmm(L.min), ahoraMs(env), r.id), subirVersion(env, R)]); return { ok:true };
    case 'mantengo': return { ok:true };
    case 'pagar': { const p = await una(env, "SELECT enlace FROM pagos WHERE reserva = ? AND estado = 'pendiente' ORDER BY id DESC", r.id); return { abrir:'pago', enlace:p?.enlace }; }
    case 'emergencia': await env.DB.batch([q(env, "UPDATE reservas SET notas = TRIM(notas || ' Pidió revisar el compromiso: emergencia'), actualizado = ? WHERE id = ?", ahoraMs(env), r.id), subirVersion(env, R)]); return { ok:true, texto:'Le avisamos al encargado. Lo revisa y te contesta.' };
    default: falla(400, 'Respuesta desconocida');
  }
}

/* ======================= la sala y el dueño ======================= */
async function sesion(env, req, roles){
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''); if (!t) falla(401, 'Iniciá sesión');
  const s = await una(env, 'SELECT s.*, p.nombre, p.rol, p.activo FROM sesiones s JOIN personal p ON p.id = s.personal WHERE s.token_hash = ?', await sha(t));
  if (!s || s.vence < ahoraMs(env) || !s.activo) falla(401, 'La sesión venció. Volvé a entrar.');
  if (roles && !roles.includes(s.rol)) falla(403, 'Tu usuario no tiene permiso para esto');
  const R = await restoPorId(env, s.resto);
  return { ...s, R, quien:`${s.nombre} (${s.rol})` };
}
async function nuevaSesion(env, p, dias){
  const t = b64u(azar(32));
  await correr(env, 'INSERT INTO sesiones (token_hash, personal, resto, vence) VALUES (?,?,?,?)', await sha(t), p.id, p.resto, ahoraMs(env) + dias * 864e5);
  return t;
}
async function limitar(env, clave, max, segundos){
  if (env.SIN_LIMITES) return;
  const v = Math.floor(ahoraMs(env) / 1000 / segundos), f = await una(env, 'SELECT * FROM limites WHERE clave = ?', clave);
  if (!f || f.ventana !== v){ await correr(env, 'INSERT OR REPLACE INTO limites (clave, ventana, cuenta) VALUES (?,?,1)', clave, v); return; }
  if (f.cuenta >= max) falla(429, 'Demasiados intentos. Esperá unos minutos.');
  await correr(env, 'UPDATE limites SET cuenta = cuenta + 1 WHERE clave = ?', clave);
}
async function noche(env, S, fecha, verAlergias){
  const R = S.R, L = local(env);
  const reservas = await todas(env, "SELECT * FROM reservas WHERE resto = ? AND fecha = ? AND estado NOT IN ('cancelada') ORDER BY inicio", R.id, fecha);
  const clientes = new Map((await todas(env, `SELECT id, tel, credito, credito_vence, visitas, idioma FROM clientes WHERE id IN (${reservas.map(r => r.cliente).filter(Boolean).join(',') || 0})`)).map(c => [c.id, c]));
  const incs = await todas(env, `SELECT reserva, tipo, monto, estado, id FROM incidentes WHERE reserva IN (${reservas.map(r => r.id).join(',') || 0})`);
  return {
    version:R.version, ahora:{ fecha:L.fecha, min:L.min, hora:hhmm(L.min), ms:L.ms }, fecha,
    resto:{ nombre:R.nombre, slug:R.slug, politica:R.politica, plano:R.plano, whatsapp:R.whatsapp },
    mesas:await mesasDe(env, R),
    reservas:await Promise.all(reservas.map(async r => { const c = clientes.get(r.cliente); const i = incs.find(x => x.reserva === r.id);
      return { id:r.id, codigo:r.codigo, nombre:r.nombre, pax:r.pax, inicio:r.inicio, fin:r.fin, mesas:r.mesas.split(',').map(Number), estado:r.estado, confirmo:!!r.confirmo, canal:r.canal,
        ocasion:r.ocasion, alergias:verAlergias && fecha === L.fecha ? r.alergias : (r.alergias ? 'sí' : ''), notas:r.notas, al_liberarse:!!r.al_liberarse, sentada_en:r.sentada_en, sena:r.sena,
        idioma:c?.idioma || 'es', tel:c?.tel || '', visitas:c?.visitas || 0, credito:c && c.credito && c.credito_vence >= L.fecha ? c.credito : 0,
        incidente:i ? { id:i.id, tipo:i.tipo, monto:i.monto, estado:i.estado } : null,
        prueba_link:env.MODO_PRUEBA === '1' ? await linkReserva(env, r.codigo) : undefined }; })),
    espera:await todas(env, "SELECT id, nombre, pax, desde, hasta, estado, tel, oferta_vence, reserva FROM espera WHERE resto = ? AND fecha = ? AND estado IN ('esperando','ofrecida') ORDER BY creado", R.id, fecha),
    mensajes:await todas(env, "SELECT id, tel, plantilla, texto, creado FROM mensajes WHERE resto = ? AND estado = 'pendiente' ORDER BY id DESC LIMIT 30", R.id),
    alerta_smn:(await una(env, "SELECT valor FROM sistema WHERE clave = 'alerta_smn'"))?.valor === fecha,
  };
}
async function accionSala(env, S, b){
  const R = S.R, L = local(env), P = R.politica;
  const r = await una(env, 'SELECT * FROM reservas WHERE id = ? AND resto = ?', Number(b.reserva), R.id); if (!r) falla(404, 'No encontramos la reserva');
  const quien = S.quien;
  switch (b.accion){
    case 'sentar': {
      const dur = await duracion(env, R, r.pax, r.fecha), ini = r.fecha === L.fecha ? Math.min(Math.max(L.min, r.inicio - 60), r.inicio + 60) : r.inicio;
      await env.DB.batch([q(env, "UPDATE reservas SET estado = 'sentada', sentada_en = ?, actualizado = ? WHERE id = ?", ahoraMs(env), ahoraMs(env), r.id), subirVersion(env, R)]);
      await reubicar(env, R, r, { inicio:Math.floor(ini / 5) * 5, fin:Math.floor(ini / 5) * 5 + dur, forzar:true });
      if (r.cliente) await correr(env, 'UPDATE clientes SET visitas = visitas + 1, ultima = ? WHERE id = ?', r.fecha, r.cliente);
      break; }
    case 'cuenta': {
      await env.DB.batch([q(env, "UPDATE reservas SET estado = 'finalizada', liberada_en = ?, fin = ?, actualizado = ? WHERE id = ?", ahoraMs(env), Math.max(r.inicio + 15, L.min), ahoraMs(env), r.id), subirVersion(env, R)]);
      await liberarDesde(env, R, r, L.min);
      const sig = await todas(env, "SELECT * FROM reservas WHERE resto = ? AND fecha = ? AND estado = 'confirmada' AND al_liberarse = 1 AND inicio > ?", R.id, r.fecha, L.min);
      for (const s of sig) if (s.mesas.split(',').some(m => r.mesas.split(',').includes(m)) && !s.avisos.includes('antes')){
        await correr(env, "UPDATE reservas SET avisos = avisos || ' antes' WHERE id = ?", s.id); await avisar(env, R, s, 'antes', {}, ['voy', 'mantengo']); }
      await ofrecerLiberadas(env, R, r.fecha);
      break; }
    case 'mas15': {
      await reubicar(env, R, r, { fin:r.fin + 15, forzar:true });
      const sig = await todas(env, "SELECT * FROM reservas WHERE resto = ? AND fecha = ? AND estado = 'confirmada' AND inicio >= ? AND inicio < ?", R.id, r.fecha, r.inicio, r.fin + 15 + P.limpieza);
      for (const s of sig) if (s.mesas.split(',').some(m => r.mesas.split(',').includes(m))) await avisar(env, R, s, 'demora', { min:Math.max(10, r.fin + 15 + P.limpieza - s.inicio) });
      break; }
    case 'planton': {
      if (r.estado !== 'confirmada') falla(400, 'Solo una reserva que no llegó puede ser plantón');
      await env.DB.batch([q(env, "UPDATE reservas SET estado = 'planton', actualizado = ? WHERE id = ?", ahoraMs(env), r.id), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id), subirVersion(env, R)]);
      await registrarIncidente(env, R, r, 'planton'); await ofrecerLiberadas(env, R, r.fecha);
      break; }
    case 'cancelar': { await cancelar(env, R, r, { quien }); if (r.cliente) await avisar(env, R, r, 'cancelada_resto', { sena:!!r.sena }); break; }
    case 'mover': {
      const m = await una(env, 'SELECT * FROM mesas WHERE resto = ? AND codigo = ?', R.id, texto(b.mesa, 10)); if (!m) falla(404, 'No existe esa mesa');
      await reubicar(env, R, r, { mesas:String(m.id) }); break; }
    case 'confirmo': await env.DB.batch([q(env, 'UPDATE reservas SET confirmo = 1 WHERE id = ?', r.id), subirVersion(env, R)]); break;
    case 'usar_credito': if (r.cliente) await env.DB.batch([q(env, "UPDATE clientes SET credito = 0, credito_vence = '' WHERE id = ?", r.cliente), subirVersion(env, R)]); break;
    default: falla(400, 'Acción desconocida');
  }
  await auditar(env, R, quien, 'Sala: ' + b.accion, r.codigo).run();
  return { ok:true };
}
async function crearReservaSala(env, S, b){
  const R = S.R, L = local(env), fecha = esFecha(b.fecha) ? b.fecha : L.fecha, pax = entero(b.pax, 1, 40);
  const puerta = b.canal === 'puerta', inicio = puerta ? Math.floor(L.min / 5) * 5 : entero(b.inicio, 0, 1439);
  let c = null; if (b.tel) c = await clienteDe(env, R, { nombre:texto(b.nombre, 60) || 'Sin nombre', tel:b.tel, idioma:b.idioma });
  let op = await opciones(env, R, fecha, inicio, pax);
  const elegir = o => b.mesa ? o.opciones.find(x => x.codigos.length === 1 && x.codigos[0] === b.mesa) : o.opciones[0];
  let o = elegir(op), corta = false;
  /* Gente en la puerta: si no hay mesa para toda la duración, se les da una que esté libre al menos 45 minutos, hasta la próxima reserva. */
  for (let d = op.dur - 15; puerta && !o && d >= 45; d -= 15){ op = await opciones(env, R, fecha, inicio, pax, 0, d); o = elegir(op); corta = !!o; }
  if (!o && b.mesa) falla(409, `La ${b.mesa} no está libre para ${pax} a las ${hhmm(inicio)}`);
  if (!o) falla(409, 'No hay mesa libre para ese grupo a esa hora. Podés anotarlo en la lista de espera.');
  const n = await insertarReserva(env, R, { cliente:c?.id, nombre:texto(b.nombre, 60) || (puerta ? 'Sin reserva' : 'Sin nombre'), fecha, inicio, fin:op.fin, pax, mesas:o.mesas, estado:puerta ? 'sentada' : 'confirmada', confirmo:true, canal:puerta ? 'puerta' : 'sala', ocasion:texto(b.ocasion, 40), notas:texto(b.notas, 200), sentada_en:puerta ? ahoraMs(env) : null });
  if (!puerta && c){ const r = await una(env, 'SELECT * FROM reservas WHERE id = ?', n.id); await avisar(env, R, r, 'confirmada'); }
  if (corta) await correr(env, "UPDATE reservas SET notas = TRIM(notas || ' Tienen la mesa hasta las ' || ?) WHERE id = ?", hhmm(op.fin), n.id);
  await auditar(env, R, S.quien, puerta ? 'Sentó sin reserva' : 'Reserva desde la sala', `${o.codigos.join('+')} ${pax} p`).run();
  return { codigo:n.codigo, mesas:o.codigos, hasta:corta ? hhmm(op.fin) : null };
}

/* ======================= el dueño ======================= */
async function guardarPlano(env, S, b){
  const R = S.R, L = local(env);
  const elementos = (b.elementos || []).slice(0, 300).map(e => ({ id:texto(e.id, 20), tipo:texto(e.tipo, 12), x:+e.x || 0, y:+e.y || 0, w:Math.max(4, +e.w || 10), h:Math.max(4, +e.h || 10), texto:texto(e.texto, 30) }));
  const ancho = entero(b.ancho || 800, 300, 3000), alto = entero(b.alto || 520, 200, 3000);
  const mesas = (b.mesas || []).slice(0, 200);
  const codigos = new Set(); for (const m of mesas){ const c = texto(m.codigo, 8).toUpperCase(); if (!c) falla(400, 'Todas las mesas necesitan un nombre'); if (codigos.has(c)) falla(400, `Hay dos mesas con el nombre ${c}`); codigos.add(c); }
  const actuales = await todas(env, 'SELECT * FROM mesas WHERE resto = ?', R.id);
  const quedan = new Set(mesas.filter(m => m.id).map(m => Number(m.id)));
  for (const a of actuales.filter(a => a.activa && !quedan.has(a.id))){
    const fut = await una(env, "SELECT COUNT(*) n FROM ocupacion o JOIN reservas r ON r.id = o.reserva WHERE o.mesa = ? AND o.fecha >= ? AND r.estado IN ('confirmada','pendiente','sentada','ofrecida')", a.id, L.fecha);
    if (fut.n) falla(409, `La mesa ${a.codigo} tiene reservas próximas. Movelas antes de sacarla.`);
  }
  const stmts = [q(env, 'UPDATE restaurantes SET plano = ? WHERE id = ?', JSON.stringify({ ancho, alto, elementos }), R.id)];
  for (const a of actuales.filter(a => !quedan.has(a.id))) stmts.push(q(env, "UPDATE mesas SET activa = 0, codigo = codigo || '~' || id WHERE id = ?", a.id));
  for (const m of mesas){
    const f = ['redonda', 'cuadrada', 'rect'].includes(m.forma) ? m.forma : 'cuadrada', cap = entero(m.cap_max, 1, 30), cmin = entero(m.cap_min || 1, 1, cap);
    const v = [texto(m.codigo, 8).toUpperCase(), texto(m.zona, 30), f, +m.x || 0, +m.y || 0, Math.max(20, +m.w || 40), Math.max(20, +m.h || 40), cmin, cap, texto(m.combina, 3).toUpperCase()];
    if (m.id && actuales.some(a => a.id === Number(m.id))) stmts.push(q(env, 'UPDATE mesas SET codigo = ?, zona = ?, forma = ?, x = ?, y = ?, w = ?, h = ?, cap_min = ?, cap_max = ?, combina = ?, activa = 1 WHERE id = ? AND resto = ?', ...v, Number(m.id), R.id));
    else stmts.push(q(env, 'INSERT INTO mesas (codigo, zona, forma, x, y, w, h, cap_min, cap_max, combina, resto) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...v, R.id));
  }
  stmts.push(subirVersion(env, R), auditar(env, R, S.quien, 'Plano guardado', `${mesas.length} mesas, ${elementos.length} elementos`));
  try { await env.DB.batch(stmts); } catch (e){ if (choque(e)) falla(409, 'Hay dos mesas con el mismo nombre'); throw e; }
  return { ok:true };
}
async function guardarPolitica(env, S, b){
  const R = S.R, P = { ...R.politica };
  const rangos = { horas:[1, 24], monto:[0, 50000], tope_personas:[1, 20], dias_credito:[0, 365], tolerancia:[5, 45], grupo_desde:[4, 40], sena:[0, 100000], limpieza:[0, 45], anticipacion:[1, 120], max_pax:[2, 40], oferta_min:[5, 30], recordatorio:[480, 900] };
  for (const [k, [a, z]] of Object.entries(rangos)) if (b[k] != null) P[k] = entero(b[k], a, z);
  for (const k of ['credito', 'smn']) if (b[k] != null) P[k] = !!b[k];
  if (['simulado', 'manual'].includes(b.wa_modo)) P.wa_modo = b.wa_modo;
  if (b.dur) for (const g of ['2', '4', '6', '99']) if (b.dur[g] != null) P.dur[g] = entero(b.dur[g], 45, 240);
  if (b.pagina) P.pagina = { estilo:ESTILOS.includes(b.pagina.estilo) ? b.pagina.estilo : 'canal', lema:texto(b.pagina.lema, 90), destacados:(Array.isArray(b.pagina.destacados) ? b.pagina.destacados : []).map(x => texto(x, 32)).filter(Boolean).slice(0, 10) };
  const nombre = b.nombre != null ? texto(b.nombre, 60) : R.nombre, sub = b.subtitulo != null ? texto(b.subtitulo, 80) : R.subtitulo, wa = b.whatsapp != null ? (b.whatsapp ? telefono(b.whatsapp) : '') : R.whatsapp;
  await env.DB.batch([q(env, 'UPDATE restaurantes SET politica = ?, nombre = ?, subtitulo = ?, whatsapp = ? WHERE id = ?', JSON.stringify(P), nombre, sub, wa, R.id), subirVersion(env, R), auditar(env, R, S.quien, 'Reglas cambiadas', JSON.stringify(b).slice(0, 180))]);
  return { ok:true, politica:P };
}
async function guardarTurnos(env, S, b){
  const R = S.R, turnos = (b.turnos || []).slice(0, 10).map(t => ({ nombre:texto(t.nombre, 30) || 'Turno', dias:String(t.dias || '').replace(/[^0-6]/g, ''), desde:entero(t.desde, 0, 1439), hasta:entero(t.hasta, 0, 1439), paso:[15, 30].includes(+t.paso) ? +t.paso : 15, tope:entero(t.tope_franja || 0, 0, 500) }));
  for (const t of turnos) if (t.hasta < t.desde) falla(400, `En «${t.nombre}», la última reserva tiene que ser después de la primera`);
  const stmts = [q(env, 'DELETE FROM turnos WHERE resto = ?', R.id), ...turnos.map(t => q(env, 'INSERT INTO turnos (resto, nombre, dias, desde, hasta, paso, tope_franja) VALUES (?,?,?,?,?,?,?)', R.id, t.nombre, t.dias, t.desde, t.hasta, t.paso, t.tope))];
  const cierres = (b.cierres || []).filter(c => esFecha(c.fecha)).slice(0, 60);
  stmts.push(q(env, 'DELETE FROM cierres WHERE resto = ? AND fecha >= ?', R.id, local(env).fecha), ...cierres.map(c => q(env, 'INSERT OR REPLACE INTO cierres (resto, fecha, motivo) VALUES (?,?,?)', R.id, c.fecha, texto(c.motivo, 60))));
  stmts.push(subirVersion(env, R), auditar(env, R, S.quien, 'Horarios cambiados', `${turnos.length} turnos, ${cierres.length} cierres`));
  await env.DB.batch(stmts); return { ok:true };
}
async function resumenMes(env, S, mes){
  const R = S.R; if (!/^\d{4}-\d{2}$/.test(mes)) falla(400, 'Mes inválido');
  const cap = (await mesasDe(env, R)).reduce((s, m) => s + m.cap_max, 0) || 1;
  const turnos = await todas(env, 'SELECT * FROM turnos WHERE resto = ?', R.id);
  const res = await todas(env, "SELECT fecha, pax, inicio, fin, estado, canal FROM reservas WHERE resto = ? AND fecha LIKE ?", R.id, mes + '-%');
  const pagos = await todas(env, "SELECT p.monto, p.tipo, r.fecha FROM pagos p LEFT JOIN reservas r ON r.id = p.reserva WHERE p.resto = ? AND p.estado = 'aprobado' AND r.fecha LIKE ?", R.id, mes + '-%');
  const cierres = await todas(env, 'SELECT fecha, motivo FROM cierres WHERE resto = ? AND fecha LIKE ?', R.id, mes + '-%');
  const dias = []; const fin = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();
  for (let d = 1; d <= fin; d++){
    const f = `${mes}-${String(d).padStart(2, '0')}`, rs = res.filter(r => r.fecha === f), ok = rs.filter(r => ['confirmada', 'sentada', 'finalizada'].includes(r.estado));
    const minutosServicio = turnosDelDia(turnos, f).reduce((s, t) => s + (t.hasta - t.desde + 120), 0) || 1;
    const usados = ok.reduce((s, r) => s + r.pax * (r.fin - r.inicio), 0);
    dias.push({ fecha:f, dia:diaSemana(f), cerrado:cierres.find(c => c.fecha === f)?.motivo || (turnosDelDia(turnos, f).length ? null : 'Sin turnos'),
      reservas:ok.filter(r => r.canal !== 'puerta').length, personas:ok.reduce((s, r) => s + r.pax, 0), puerta:ok.filter(r => r.canal === 'puerta').length,
      plantones:rs.filter(r => r.estado === 'planton').length, tardias:rs.filter(r => r.estado === 'cancelada_tarde').length, desde_espera:ok.filter(r => r.canal === 'espera').length,
      ocupacion:Math.min(100, Math.round(usados / (cap * minutosServicio) * 100)), recuperado:pagos.filter(p => p.fecha === f).reduce((s, p) => s + p.monto, 0) });
  }
  return { mes, capacidad:cap, dias };
}

/* ======================= tareas de cada minuto ======================= */
export async function tareas(env){
  const L = local(env);
  const restos = await todas(env, 'SELECT slug FROM restaurantes');
  for (const { slug } of restos){
    const R = await resto(env, slug), P = R.politica, hoy = L.fecha;
    /* Señas sin pagar: la reserva se cae a los N minutos, sea para el día que sea. */
    for (const r of await todas(env, "SELECT id FROM reservas WHERE resto = ? AND estado = 'pendiente' AND creado < ?", R.id, ahoraMs(env) - P.sena_min * 60000))
      await env.DB.batch([q(env, "UPDATE reservas SET estado = 'cancelada' WHERE id = ?", r.id), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id), q(env, "UPDATE pagos SET estado = 'cancelado' WHERE reserva = ? AND estado = 'pendiente'", r.id), subirVersion(env, R)]);
    const rs = await todas(env, "SELECT * FROM reservas WHERE resto = ? AND fecha = ? AND estado = 'confirmada'", R.id, hoy);
    for (const r of rs){
      const marca = async m => correr(env, 'UPDATE reservas SET avisos = avisos || ? WHERE id = ?', ' ' + m, r.id);
      const hecho = m => r.avisos.split(' ').includes(m);
      const hechaHace = (ahoraMs(env) - r.creado) / 60000;
      if (!r.confirmo && !hecho('rec') && L.min >= P.recordatorio && r.inicio - L.min >= 120 && hechaHace > 120){ await marca('rec'); await avisar(env, R, r, 'recordatorio', {}, ['confirmo', 'cambiar', 'cancelar']); }
      if (!r.confirmo && !hecho('rec2') && r.inicio - L.min <= 120 && r.inicio - L.min > 30 && hechaHace > 60){ await marca('rec2'); await avisar(env, R, r, 'recordatorio2', {}, ['confirmo', 'cancelar']); }
      const tol = P.tolerancia + (hecho('tarde') ? 15 : 0);
      if (!hecho('vienen') && !hecho('tarde') && L.min >= r.inicio + Math.round(P.tolerancia / 2)){ await marca('vienen'); await avisar(env, R, r, 'vienen', { hasta:hhmm(r.inicio + tol) }, ['llegamos', 'no_vamos']); await subirVersion(env, R).run(); }
      if (L.min >= r.inicio + tol){
        await env.DB.batch([q(env, "UPDATE reservas SET estado = 'planton', actualizado = ? WHERE id = ?", ahoraMs(env), r.id), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id), subirVersion(env, R)]);
        await registrarIncidente(env, R, r, 'planton'); await auditar(env, R, 'sistema', 'Plantón automático', r.codigo).run(); await ofrecerLiberadas(env, R, hoy);
      }
    }
    const vencidas = await todas(env, "SELECT * FROM espera WHERE resto = ? AND estado = 'ofrecida' AND oferta_vence < ?", R.id, ahoraMs(env));
    for (const e of vencidas){ await env.DB.batch([q(env, "UPDATE reservas SET estado = 'cancelada' WHERE id = ?", e.reserva), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', e.reserva), q(env, "UPDATE espera SET estado = 'vencida' WHERE id = ?", e.id), subirVersion(env, R)]); await ofrecerLiberadas(env, R, e.fecha); }
    const cierre = (await una(env, "SELECT valor FROM sistema WHERE clave = 'cierre:' || ?", R.id))?.valor;
    if (L.min >= 180 && cierre !== hoy) await cierreDiario(env, R, hoy);
  }
}
async function cierreDiario(env, R, hoy){
  const ayer = sumarDias(hoy, -1), ahora = ahoraMs(env);
  const rs = await todas(env, 'SELECT * FROM reservas WHERE resto = ? AND fecha = ?', R.id, ayer);
  for (const r of rs) if (r.estado === 'sentada') await correr(env, "UPDATE reservas SET estado = 'finalizada', liberada_en = COALESCE(liberada_en, ?) WHERE id = ?", msDe(ayer, r.fin), r.id);
  for (const r of await todas(env, "SELECT * FROM reservas WHERE resto = ? AND fecha = ? AND estado = 'finalizada' AND sentada_en IS NOT NULL AND liberada_en IS NOT NULL", R.id, ayer)){
    const min = (r.liberada_en - r.sentada_en) / 60000; if (min < 20 || min > 300) continue;
    const g = grupoDe(r.pax), d = diaSemana(ayer), f = await una(env, 'SELECT * FROM duraciones WHERE resto = ? AND grupo = ? AND dia = ?', R.id, g, d);
    const n = Math.min(60, (f?.n || 0) + 1), prom = f ? f.promedio + (min - f.promedio) / n : min;
    await correr(env, 'INSERT OR REPLACE INTO duraciones (resto, grupo, dia, promedio, n) VALUES (?,?,?,?,?)', R.id, g, d, prom, n);
  }
  const m = (await resumenMes(env, { R }, ayer.slice(0, 7))).dias.find(x => x.fecha === ayer);
  if (m) await correr(env, 'INSERT OR REPLACE INTO metricas_dia (resto, fecha, reservas, personas, puerta, plantones, tardias, desde_espera, ocupacion, recuperado) VALUES (?,?,?,?,?,?,?,?,?,?)', R.id, ayer, m.reservas, m.personas, m.puerta, m.plantones, m.tardias, m.desde_espera, m.ocupacion, m.recuperado);
  await env.DB.batch([
    q(env, "UPDATE reservas SET alergias = '' WHERE resto = ? AND fecha < ? AND alergias != ''", R.id, sumarDias(hoy, -7)),
    q(env, 'DELETE FROM ocupacion WHERE resto = ? AND fecha < ?', R.id, hoy),
    q(env, 'UPDATE mensajes SET texto = NULL WHERE resto = ? AND creado < ? AND texto IS NOT NULL', R.id, ahora - 7 * 864e5),
    q(env, "UPDATE incidentes SET estado = 'vencido' WHERE resto = ? AND vence < ? AND estado = 'pendiente'", R.id, hoy),
    q(env, "UPDATE clientes SET nombre = 'Anónimo', tel = 'anon-' || id, email = '' WHERE resto = ? AND ultima != '' AND ultima < ? AND tel NOT LIKE 'anon-%'", R.id, sumarDias(hoy, -365)),
    q(env, 'DELETE FROM sesiones WHERE vence < ?', ahora),
    q(env, 'DELETE FROM limites WHERE ventana < ?', Math.floor(ahora / 1000 / 86400) - 2),
    q(env, "INSERT OR REPLACE INTO sistema (clave, valor) VALUES ('cierre:' || ?, ?)", R.id, hoy),
  ]);
}

/* ======================= datos de prueba ======================= */
export async function sembrar(env){
  const L = local(env), hoy = L.fecha, man = sumarDias(hoy, 1), ahora = ahoraMs(env);
  if (await una(env, "SELECT 1 FROM restaurantes WHERE slug = 'fogon'")) return { ya:true };
  const plano = { ancho:800, alto:520, elementos:[
    { id:'p1', tipo:'pared', x:10, y:10, w:780, h:10 }, { id:'p2', tipo:'pared', x:10, y:10, w:10, h:500 }, { id:'p3', tipo:'pared', x:780, y:10, w:10, h:500 }, { id:'p4', tipo:'pared', x:10, y:500, w:780, h:10 },
    { id:'v1', tipo:'ventana', x:90, y:8, w:600, h:14, texto:'Ventanal · Canal Beagle' }, { id:'b1', tipo:'barra', x:700, y:190, w:62, h:190, texto:'Barra' },
    { id:'h1', tipo:'hogar', x:60, y:486, w:160, h:18, texto:'Hogar' }, { id:'e1', tipo:'entrada', x:590, y:494, w:110, h:18, texto:'Entrada' } ] };
  await correr(env, 'INSERT INTO restaurantes (slug, nombre, subtitulo, whatsapp, politica, plano, creado) VALUES (?,?,?,?,?,?,?)', 'fogon', 'Fogón del Ñire', 'Cocina fueguina frente al canal', '5492901494953', JSON.stringify({ pagina:{ estilo:'canal', lema:'Fuego de lenga, mar del Beagle y la mesa mirando al canal.', destacados:['Centolla al natural', 'Cordero fueguino al asador', 'Merluza negra', 'Trucha del Lago Escondido', 'Hongos de ñire', 'Calafate'] } }), JSON.stringify(plano), ahora);
  const R = await resto(env, 'fogon');
  const M = [['V1', 'redonda', 90, 70, 60, 60, 1, 2, 'Ventanal', ''], ['V2', 'redonda', 200, 70, 60, 60, 1, 2, 'Ventanal', ''], ['V3', 'rect', 300, 60, 110, 70, 3, 4, 'Ventanal', 'V'], ['V4', 'rect', 440, 60, 110, 70, 3, 4, 'Ventanal', 'V'],
    ['V5', 'redonda', 600, 70, 60, 60, 1, 2, 'Ventanal', ''], ['M1', 'cuadrada', 70, 200, 80, 80, 2, 4, 'Salón', ''], ['M2', 'cuadrada', 200, 200, 80, 80, 2, 4, 'Salón', ''], ['M3', 'cuadrada', 330, 200, 80, 80, 2, 4, 'Salón', ''],
    ['M4', 'redonda', 470, 200, 84, 84, 3, 4, 'Salón', ''], ['M5', 'redonda', 600, 210, 60, 60, 1, 2, 'Salón', ''], ['F1', 'rect', 60, 360, 160, 80, 4, 6, 'Junto al hogar', 'F'], ['F2', 'rect', 250, 360, 160, 80, 4, 6, 'Junto al hogar', 'F'],
    ['M6', 'redonda', 460, 370, 60, 60, 1, 2, 'Salón', ''], ['M7', 'redonda', 560, 370, 60, 60, 1, 2, 'Salón', '']];
  await env.DB.batch(M.map(m => q(env, 'INSERT INTO mesas (resto, codigo, forma, x, y, w, h, cap_min, cap_max, zona, combina) VALUES (?,?,?,?,?,?,?,?,?,?,?)', R.id, ...m)));
  await env.DB.batch([q(env, 'INSERT INTO turnos (resto, nombre, dias, desde, hasta, paso, tope_franja) VALUES (?,?,?,?,?,?,?)', R.id, 'Almuerzo', '056', 750, 870, 15, 0),
    q(env, 'INSERT INTO turnos (resto, nombre, dias, desde, hasta, paso, tope_franja) VALUES (?,?,?,?,?,?,?)', R.id, 'Cena', '0123456', 1200, 1365, 15, 16)]);
  // Cuentas de prueba: los datos están en DATOS-DE-PRUEBA.md (no se usan fuera del modo prueba).
  await env.DB.batch([
    q(env, 'INSERT INTO personal (resto, nombre, email, rol, clave_hash, pin_hash, creado) VALUES (?,?,?,?,?,?,?)', R.id, 'Dueño de prueba', 'dueno@fogon.prueba', 'dueno', await hashClave('Fogon-prueba-2026'), await hashClave('1111'), ahora),
    q(env, 'INSERT INTO personal (resto, nombre, email, rol, clave_hash, pin_hash, creado) VALUES (?,?,?,?,?,?,?)', R.id, 'Lucía (encargada)', null, 'encargado', null, await hashClave('2468'), ahora),
    q(env, 'INSERT INTO personal (resto, nombre, email, rol, clave_hash, pin_hash, creado) VALUES (?,?,?,?,?,?,?)', R.id, 'Tomás (sala)', null, 'sala', null, await hashClave('1357'), ahora)]);
  const mid = async c => (await una(env, 'SELECT id FROM mesas WHERE resto = ? AND codigo = ?', R.id, c)).id;
  const gente = [['Lucía Méndez', '5492901000101'], ['Sofía Ledesma', '5492901000102'], ['Ricardo Pérez', '5492901000103'], ['Ana Clara Souza', '5511900000104', 'pt'], ['Diego Álvarez', '5492901000105'],
    ['Familia Ruiz', '5492901000106'], ['Martín Rojas', '5492901000107'], ['Julia Walker', '447700000108', 'en'], ['Paula Gómez', '5492901000109'], ['Nicolás Fernández', '5492901000110'], ['Valentina Bruno', '5492901000111'], ['Hernán Díaz', '5492901000112']];
  const cl = []; for (const [n, t, i] of gente) cl.push(await clienteDe(env, R, { nombre:n, tel:'+' + t, idioma:i }));
  const base = Math.floor(L.min / 15) * 15;
  const plan = [
    [0, 'V1', Math.max(1200, base - 30), 2, 'sentada', 'Aniversario'], [1, 'V3', 1260, 4, 'confirmada', 'Cumpleaños', 'Sin TACC (1)'], [2, 'M2', Math.max(1200, base - 45), 3, 'sentada'],
    [3, 'M3', 1290, 4, 'confirmada'], [4, 'M7', 1260, 2, 'confirmada'], [5, 'F1', Math.max(1200, base - 60), 6, 'sentada'], [6, 'V2', 1320, 2, 'confirmada'], [7, 'V4', 1215, 4, 'confirmada'],
    [8, 'M4', 1305, 3, 'confirmada'], [9, 'M5', 1245, 2, 'confirmada'], [10, 'M6', 1335, 2, 'confirmada'], [11, 'M1', 1290, 4, 'confirmada']];
  for (const [ci, mesa, ini, pax, estado, ocasion = '', alergias = ''] of plan){
    const dur = R.politica.dur[grupoDe(pax)], m = await mid(mesa);
    try { await insertarReserva(env, R, { cliente:cl[ci].id, nombre:cl[ci].nombre, fecha:hoy, inicio:ini, fin:ini + dur, pax, mesas:[m], estado, confirmo:ci % 3 !== 1, canal:'web', ocasion, alergias, sentada_en:estado === 'sentada' ? msDe(hoy, ini) : null }); } catch (e){ /* si no entra, se saltea */ }
  }
  for (const [ci, mesa, ini, pax] of [[2, 'V3', 1290, 4], [7, 'M1', 1230, 3], [9, 'F2', 1260, 6]]){
    const m = await mid(mesa); try { await insertarReserva(env, R, { cliente:cl[ci].id, nombre:cl[ci].nombre, fecha:man, inicio:ini, fin:ini + R.politica.dur[grupoDe(pax)], pax, mesas:[m], estado:'confirmada', canal:'web' }); } catch (e){}
  }
  await correr(env, 'INSERT INTO espera (resto, fecha, desde, hasta, pax, cliente, nombre, tel, creado) VALUES (?,?,?,?,?,?,?,?,?)', R.id, hoy, 1245, 1350, 2, cl[10].id, 'Valentina Bruno', cl[10].tel, ahora);
  /* Noches ya cerradas desde el 1 del mes, para que «El mes» tenga números. */
  let semilla = 7; const rnd = () => (semilla = (semilla * 9301 + 49297) % 233280) / 233280;
  const mesas = await mesasDe(env, R), hist = [];
  for (let f = hoy.slice(0, 8) + '01'; f < hoy; f = sumarDias(f, 1)){
    const dia = diaSemana(f), carga = [0.55, 0.3, 0.38, 0.45, 0.55, 0.85, 0.95][dia];
    if (f.endsWith('-16')){ hist.push(q(env, 'INSERT OR IGNORE INTO cierres (resto, fecha, motivo) VALUES (?,?,?)', R.id, f, 'Temporal')); continue; }
    for (const m of mesas) for (const ini of [1200, 1320]){
      if (rnd() > carga) continue;
      const pax = Math.max(m.cap_min, Math.min(m.cap_max, m.cap_max - Math.floor(rnd() * 2))), c = cl[Math.floor(rnd() * cl.length)], x = rnd();
      const estado = x < 0.035 ? 'planton' : x < 0.06 ? 'cancelada_tarde' : 'finalizada', dur = R.politica.dur[grupoDe(pax)] - 15 + Math.floor(rnd() * 3) * 15, id = nuevoId();
      hist.push(q(env, 'INSERT INTO reservas (id, resto, codigo, cliente, nombre, fecha, inicio, fin, pax, mesas, estado, confirmo, canal, creado, actualizado) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, R.id, nuevoCodigo(), c.id, c.nombre, f, ini + Math.floor(rnd() * 4) * 15, ini + dur, pax, String(m.id), estado, 1, rnd() < 0.12 ? 'puerta' : rnd() < 0.1 ? 'espera' : 'web', ahora, ahora));
      if (estado !== 'finalizada' && rnd() < 0.6) hist.push(q(env, "INSERT INTO pagos (resto, tipo, reserva, monto, estado, proveedor, creado, actualizado) VALUES (?,?,?,?,?,?,?,?)", R.id, 'compromiso', id, pax * R.politica.monto, 'aprobado', 'simulado', ahora, ahora));
    }
  }
  if (hist.length) await env.DB.batch(hist);
  await subirVersion(env, R).run();
  return { ok:true };
}

/* ======================= rutas ======================= */
const CORS = env => ({ 'access-control-allow-origin':env.ORIGEN || '*', 'access-control-allow-headers':'content-type, authorization, x-tablet', 'access-control-allow-methods':'GET, POST, PUT, DELETE, OPTIONS', 'vary':'origin' });
const json = (env, data, status = 200) => new Response(JSON.stringify(data), { status, headers:{ 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', ...CORS(env) } });
async function cuerpo(req){ try { return await req.json(); } catch (e){ return {}; } }

async function rutear(req, env){
  const u = new URL(req.url), p = u.pathname.replace(/\/+$/, ''), m = req.method, ip = req.headers.get('cf-connecting-ip') || 'local';
  const g = k => u.searchParams.get(k);
  let x;
  if (p === '/api/estado') return { version:VERSION, whatsapp:env.WA_TOKEN ? 'cloud' : 'simulado/manual', pagos:env.MP_TOKEN ? 'mercadopago' : 'simulado', prueba:env.MODO_PRUEBA === '1', ahora:local(env) };
  if (p === '/api/sembrar' && m === 'POST'){ if (env.MODO_PRUEBA !== '1') falla(403, 'Solo en modo prueba'); return sembrar(env); }
  if (p === '/api/instalar' && m === 'POST'){
    const b = await cuerpo(req); if (!env.CLAVE_INSTALACION || b.clave_instalacion !== env.CLAVE_INSTALACION) falla(403, 'Clave de instalación incorrecta');
    const slug = texto(b.slug, 30).toLowerCase().replace(/[^a-z0-9-]/g, ''); if (!slug) falla(400, 'Falta el nombre corto');
    if (!b.clave || b.clave.length < 10) falla(400, 'La contraseña del dueño necesita al menos 10 caracteres');
    await correr(env, 'INSERT INTO restaurantes (slug, nombre, subtitulo, whatsapp, politica, plano, creado) VALUES (?,?,?,?,?,?,?)', slug, texto(b.nombre, 60), '', b.whatsapp ? telefono(b.whatsapp) : '', '{}', JSON.stringify({ ancho:800, alto:520, elementos:[] }), ahoraMs(env));
    const R = await resto(env, slug);
    await correr(env, 'INSERT INTO personal (resto, nombre, email, rol, clave_hash, creado) VALUES (?,?,?,?,?,?)', R.id, texto(b.dueno, 60) || 'Dueño', texto(b.email, 80).toLowerCase(), 'dueno', await hashClave(b.clave), ahoraMs(env));
    return { ok:true, slug };
  }
  /* ---- público ---- */
  if ((x = p.match(/^\/api\/r\/([a-z0-9-]+)$/)) && m === 'GET'){
    const R = await resto(env, x[1]), L = local(env);
    const turnos = await todas(env, 'SELECT nombre, dias, desde, hasta, paso FROM turnos WHERE resto = ?', R.id);
    const cierres = await todas(env, 'SELECT fecha, motivo FROM cierres WHERE resto = ? AND fecha >= ?', R.id, L.fecha);
    const P = R.politica;
    return { nombre:R.nombre, subtitulo:R.subtitulo, whatsapp:R.whatsapp, hoy:L.fecha, ahora:L.min, turnos, cierres, plano:R.plano, mesas:(await mesasDe(env, R)).map(m => ({ id:m.id, codigo:m.codigo, forma:m.forma, x:m.x, y:m.y, w:m.w, h:m.h, cap:m.cap_max, zona:m.zona })),
      politica:{ horas:P.horas, monto:P.monto, credito:P.credito, dias:P.dias_credito, tolerancia:P.tolerancia, grupo_desde:P.grupo_desde, sena:P.sena, anticipacion:P.anticipacion, max_pax:P.max_pax, limpieza:P.limpieza, tope_personas:P.tope_personas },
      pagina:{ ...POLITICA.pagina, ...(P.pagina || {}) } };
  }
  if ((x = p.match(/^\/api\/r\/([a-z0-9-]+)\/horarios$/))){ const R = await resto(env, x[1]); return horariosDelDia(env, R, esFecha(g('fecha')) ? g('fecha') : local(env).fecha, entero(g('pax') || 2, 1, 40)); }
  if ((x = p.match(/^\/api\/r\/([a-z0-9-]+)\/plano$/))){ const R = await resto(env, x[1]); return planoPublico(env, R, esFecha(g('fecha')) ? g('fecha') : local(env).fecha, entero(g('inicio'), 0, 1439), entero(g('pax') || 2, 1, 40)); }
  if ((x = p.match(/^\/api\/r\/([a-z0-9-]+)\/reservas$/)) && m === 'POST'){ const R = await resto(env, x[1]); return crearReservaPublica(env, R, await cuerpo(req), ip); }
  if ((x = p.match(/^\/api\/r\/([a-z0-9-]+)\/espera$/)) && m === 'POST'){
    const R = await resto(env, x[1]), b = await cuerpo(req); await limitar(env, 'esp:' + ip, 10, 3600);
    if (!b.acepta_politica) falla(400, 'Tenés que aceptar las condiciones');
    const c = await clienteDe(env, R, { nombre:texto(b.nombre, 60), tel:b.tel, idioma:b.idioma });
    const fecha = esFecha(b.fecha) ? b.fecha : falla(400, 'Fecha inválida'), desde = entero(b.desde, 0, 1439), hasta = entero(b.hasta ?? desde + 60, desde, 1439);
    await env.DB.batch([q(env, 'INSERT INTO espera (resto, fecha, desde, hasta, pax, cliente, nombre, tel, creado) VALUES (?,?,?,?,?,?,?,?,?)', R.id, fecha, desde, hasta, entero(b.pax, 1, 40), c.id, c.nombre, c.tel, ahoraMs(env)), subirVersion(env, R)]);
    await ofrecerLiberadas(env, R, fecha); return { ok:true };
  }
  if ((x = p.match(/^\/api\/reserva\/([A-Z0-9-]+)$/i)) && m === 'GET'){ const r = await reservaPorCodigo(env, x[1], g('k')), R = await restoPorId(env, r.resto); return vistaReserva(env, R, r); }
  if ((x = p.match(/^\/api\/reserva\/([A-Z0-9-]+)\/(cancelar|cambiar|tarde|responder|mensajes|borrar-datos)$/i))){
    await limitar(env, 'mi:' + ip, 60, 600);
    const b = m === 'POST' ? await cuerpo(req) : {}, r = await reservaPorCodigo(env, x[1], b.k || g('k')), R = await restoPorId(env, r.resto);
    switch (x[2]){
      case 'cancelar': return cancelar(env, R, r, { quien:'cliente', confirma_tarde:!!b.confirma_tarde });
      case 'tarde': return responder(env, R, r, 'llegamos');
      case 'responder': {
        /* La respuesta se aplica a la reserva de ese mensaje, que tiene que ser del mismo cliente. */
        let destino = r; const mid = Number(b.mensaje) || null;
        if (mid){ const m = await una(env, 'SELECT * FROM mensajes WHERE id = ? AND resto = ?', mid, r.resto), c = r.cliente ? await una(env, 'SELECT tel FROM clientes WHERE id = ?', r.cliente) : null;
          if (!m || !c || m.tel !== c.tel) falla(404, 'Ese mensaje no es tuyo');
          if (m.respuesta) falla(400, 'Ese mensaje ya tiene respuesta');
          if (m.reserva) destino = await una(env, 'SELECT * FROM reservas WHERE id = ?', m.reserva); }
        if (!['confirmada', 'ofrecida', 'pendiente', 'sentada', 'cancelada_tarde', 'planton'].includes(destino.estado)) falla(400, 'Esa reserva ya no está activa');
        return responder(env, R, destino, texto(b.boton, 20), mid);
      }
      case 'cambiar': {
        if (r.estado !== 'confirmada') falla(400, 'Esta reserva no se puede cambiar');
        const fecha = esFecha(b.fecha) ? b.fecha : r.fecha, inicio = entero(b.inicio ?? r.inicio, 0, 1439), pax = entero(b.pax ?? r.pax, 1, R.politica.max_pax);
        const op = await opciones(env, R, fecha, inicio, pax, r.id); const misma = op.opciones.find(o => o.mesas.join(',') === r.mesas) || op.opciones[0];
        if (!misma) falla(409, 'No hay lugar para ese cambio. Probá otro horario.');
        await reubicar(env, R, r, { fecha, inicio, fin:op.fin, pax, mesas:misma.mesas.join(',') });
        await correr(env, "UPDATE reservas SET avisos = '', confirmo = 1 WHERE id = ?", r.id);
        await avisar(env, R, await una(env, 'SELECT * FROM reservas WHERE id = ?', r.id), 'confirmada');
        await auditar(env, R, 'cliente', 'Reserva cambiada', r.codigo).run(); return { ok:true };
      }
      case 'mensajes': {
        const c = r.cliente ? await una(env, 'SELECT tel FROM clientes WHERE id = ?', r.cliente) : null;
        return { mensajes:c ? await todas(env, `SELECT m.id, m.reserva, m.plantilla, m.texto, m.botones, m.estado, m.respuesta, m.creado,
          CASE WHEN x.estado IN ('confirmada','ofrecida','pendiente') OR (m.plantilla = 'compromiso' AND x.estado IN ('cancelada_tarde','planton')) THEN 1 ELSE 0 END vigente
          FROM mensajes m LEFT JOIN reservas x ON x.id = m.reserva WHERE m.resto = ? AND m.tel = ? ORDER BY m.id`, r.resto, c.tel) : [] };
      }
      case 'borrar-datos': {
        if (r.cliente){ const c = await una(env, 'SELECT * FROM clientes WHERE id = ?', r.cliente);
          await env.DB.batch([q(env, "UPDATE clientes SET nombre = 'Anónimo', tel = 'anon-' || id, email = '', acepta_promos = 0 WHERE id = ?", c.id), q(env, "UPDATE reservas SET nombre = 'Anónimo', alergias = '', notas = '' WHERE cliente = ?", c.id), q(env, 'UPDATE mensajes SET texto = NULL, tel = ? WHERE tel = ? AND resto = ?', 'anon-' + c.id, c.tel, r.resto), subirVersion(env, R)]);
          await auditar(env, R, 'cliente', 'Datos borrados a pedido', 'cliente ' + c.id).run(); }
        return { ok:true };
      }
    }
  }
  if ((x = p.match(/^\/api\/pago\/(\d+)$/)) && m === 'GET'){
    const pg = await una(env, 'SELECT * FROM pagos WHERE id = ?', Number(x[1])); if (!pg || g('k') !== await hmac(env, 'p:' + pg.id)) falla(404, 'No encontramos ese pago');
    const R = await restoPorId(env, pg.resto), r = pg.reserva ? await una(env, 'SELECT codigo, fecha, inicio, pax FROM reservas WHERE id = ?', pg.reserva) : null;
    return { tipo:pg.tipo, monto:pg.monto, estado:pg.estado, proveedor:pg.proveedor, enlace:pg.enlace, resto:R.nombre, estilo:(R.politica.pagina || {}).estilo || 'canal', reserva:r ? { codigo:r.codigo, fecha:r.fecha, hora:hhmm(r.inicio), pax:r.pax, k:await hmac(env, 'r:' + r.codigo) } : null };
  }
  if ((x = p.match(/^\/api\/pago\/(\d+)\/simular$/)) && m === 'POST'){
    const b = await cuerpo(req), pg = await una(env, 'SELECT * FROM pagos WHERE id = ?', Number(x[1]));
    if (!pg || b.k !== await hmac(env, 'p:' + pg.id)) falla(404, 'No encontramos ese pago');
    if (pg.proveedor !== 'simulado') falla(400, 'Este pago se hace en Mercado Pago');
    if (pg.estado !== 'pendiente') return { estado:pg.estado };
    if (b.resultado === 'rechazado') return { estado:'rechazado' };
    await aplicarPago(env, pg.id, 'sim-' + pg.id); return { estado:'aprobado' };
  }
  if (p === '/api/mp/webhook' && m === 'POST'){
    const dataId = g('data.id') || (await cuerpo(req.clone())).data?.id, sig = req.headers.get('x-signature') || '', rid = req.headers.get('x-request-id') || '';
    const partes = Object.fromEntries(sig.split(',').map(s => s.trim().split('=')));
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.MP_WEBHOOK_SECRET || ''), { name:'HMAC', hash:'SHA-256' }, false, ['sign']);
    const esperado = [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(`id:${dataId};request-id:${rid};ts:${partes.ts};`)))].map(b => b.toString(16).padStart(2, '0')).join('');
    if (!env.MP_WEBHOOK_SECRET || esperado !== partes.v1) falla(401, 'Firma inválida');
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, { headers:{ authorization:'Bearer ' + env.MP_TOKEN } }); if (!r.ok) falla(502, 'No se pudo consultar el pago');
    const pay = await r.json(); const id = Number(String(pay.external_reference || '').replace('pago-', ''));
    if (pay.status === 'approved' && id) await aplicarPago(env, id, String(pay.id));
    return { ok:true };
  }
  if (p === '/api/wa/webhook'){
    if (m === 'GET') return new Response(g('hub.verify_token') === env.WA_VERIFY ? g('hub.challenge') : 'no', { status:g('hub.verify_token') === env.WA_VERIFY ? 200 : 403 });
    // Respuestas a botones de WhatsApp Cloud: se relacionan con el último mensaje enviado a ese teléfono.
    const b = await cuerpo(req), msg = b.entry?.[0]?.changes?.[0]?.value?.messages?.[0]; if (!msg) return { ok:true };
    const boton = msg.button?.payload || msg.interactive?.button_reply?.id; const ult = await una(env, "SELECT * FROM mensajes WHERE tel = ? AND reserva IS NOT NULL ORDER BY id DESC", msg.from);
    if (boton && ult){ const r = await una(env, 'SELECT * FROM reservas WHERE id = ?', ult.reserva), R = await restoPorId(env, r.resto); await responder(env, R, r, boton, ult.id); }
    return { ok:true };
  }
  /* ---- personal ---- */
  if (p === '/api/login' && m === 'POST'){
    const b = await cuerpo(req); await limitar(env, 'login:' + ip, 10, 600);
    const R = await resto(env, texto(b.slug, 30));
    if (b.email){
      const pe = await una(env, 'SELECT * FROM personal WHERE resto = ? AND email = ? AND activo = 1', R.id, texto(b.email, 80).toLowerCase());
      if (!pe || !(await claveOk(String(b.clave || ''), pe.clave_hash))) falla(401, 'Correo o contraseña incorrectos');
      return { token:await nuevaSesion(env, pe, pe.rol === 'dueno' ? 14 : 2), nombre:pe.nombre, rol:pe.rol };
    }
    const tab = req.headers.get('x-tablet'); const t = tab && await una(env, "SELECT * FROM sesiones WHERE token_hash = ? AND vence > ?", await sha('tablet:' + tab), ahoraMs(env));
    if (!t || t.resto !== R.id) falla(401, 'Esta tablet no está habilitada. El dueño la habilita desde su panel.');
    const pe = await una(env, 'SELECT * FROM personal WHERE id = ? AND resto = ? AND activo = 1', Number(b.personal), R.id);
    if (!pe || !(await claveOk(String(b.pin || ''), pe.pin_hash))) falla(401, 'PIN incorrecto');
    return { token:await nuevaSesion(env, pe, 1), nombre:pe.nombre, rol:pe.rol };
  }
  if (p === '/api/equipo' && m === 'GET'){
    const R = await resto(env, texto(g('slug'), 30)), tab = req.headers.get('x-tablet');
    const t = tab && await una(env, 'SELECT * FROM sesiones WHERE token_hash = ? AND vence > ?', await sha('tablet:' + tab), ahoraMs(env));
    if (!t || t.resto !== R.id) return { habilitada:false, equipo:[] };
    return { habilitada:true, equipo:await todas(env, 'SELECT id, nombre, rol FROM personal WHERE resto = ? AND activo = 1 AND pin_hash IS NOT NULL ORDER BY nombre', R.id) };
  }
  if (p.startsWith('/api/sala/')){
    const S = await sesion(env, req, ['dueno', 'encargado', 'sala', 'cocina']), R = S.R;
    if (p === '/api/sala/noche'){ if (g('v') && Number(g('v')) === R.version) return { sin_cambios:true, version:R.version }; return noche(env, S, esFecha(g('fecha')) ? g('fecha') : local(env).fecha, true); }
    if (S.rol === 'cocina') falla(403, 'La cocina solo puede mirar');
    if (p === '/api/sala/accion' && m === 'POST') return accionSala(env, S, await cuerpo(req));
    if (p === '/api/sala/reservas' && m === 'POST') return crearReservaSala(env, S, await cuerpo(req));
    if (p === '/api/sala/espera' && m === 'POST'){
      const b = await cuerpo(req), L = local(env); let c = null; if (b.tel) c = await clienteDe(env, R, { nombre:texto(b.nombre, 60), tel:b.tel });
      await env.DB.batch([q(env, 'INSERT INTO espera (resto, fecha, desde, hasta, pax, cliente, nombre, tel, creado) VALUES (?,?,?,?,?,?,?,?,?)', R.id, L.fecha, Math.ceil(L.min / 15) * 15, Math.ceil(L.min / 15) * 15 + entero(b.minutos || 90, 15, 240), entero(b.pax, 1, 40), c?.id || null, texto(b.nombre, 60) || 'En la puerta', c?.tel || '', ahoraMs(env)), subirVersion(env, R)]);
      await ofrecerLiberadas(env, R, L.fecha); return { ok:true };
    }
    if ((x = p.match(/^\/api\/sala\/espera\/(\d+)\/(aceptar|quitar)$/)) && m === 'POST'){
      const e = await una(env, 'SELECT * FROM espera WHERE id = ? AND resto = ?', Number(x[1]), R.id); if (!e) falla(404, 'No está en la lista');
      if (x[2] === 'aceptar'){ await responderOferta(env, R, e, true); const r = await una(env, 'SELECT * FROM reservas WHERE id = ?', e.reserva); if (r) await accionSala(env, S, { reserva:r.id, accion:'sentar' }); }
      else { if (e.reserva && e.estado === 'ofrecida') await responderOferta(env, R, e, false); await env.DB.batch([q(env, "UPDATE espera SET estado = 'cancelada' WHERE id = ?", e.id), subirVersion(env, R)]); }
      return { ok:true };
    }
    if ((x = p.match(/^\/api\/sala\/mensaje\/(\d+)\/enviado$/)) && m === 'POST'){ await env.DB.batch([q(env, "UPDATE mensajes SET estado = 'enviado', enviado = ? WHERE id = ? AND resto = ?", ahoraMs(env), Number(x[1]), R.id), subirVersion(env, R)]); return { ok:true }; }
    falla(404, 'No existe');
  }
  if (p.startsWith('/api/dueno/')){
    const S = await sesion(env, req, p === '/api/dueno/incidente' ? ['dueno', 'encargado'] : ['dueno']), R = S.R;
    if (p === '/api/dueno/plano' && m === 'PUT') return guardarPlano(env, S, await cuerpo(req));
    if (p === '/api/dueno/politica' && m === 'PUT') return guardarPolitica(env, S, await cuerpo(req));
    if (p === '/api/dueno/turnos'){ if (m === 'PUT') return guardarTurnos(env, S, await cuerpo(req)); return { turnos:await todas(env, 'SELECT * FROM turnos WHERE resto = ? ORDER BY desde', R.id), cierres:await todas(env, 'SELECT fecha, motivo FROM cierres WHERE resto = ? AND fecha >= ? ORDER BY fecha', R.id, local(env).fecha) }; }
    if (p === '/api/dueno/mes') return resumenMes(env, S, g('mes') || local(env).fecha.slice(0, 7));
    if (p === '/api/dueno/clientes'){
      return { clientes:await todas(env, `SELECT c.id, c.nombre, c.tel, c.visitas, c.ultima, c.credito, c.credito_vence, c.pide_sena_hasta, c.acepta_promos,
        (SELECT COUNT(*) FROM incidentes i WHERE i.cliente = c.id AND i.estado IN ('pendiente','pagado')) incidentes FROM clientes c WHERE c.resto = ? AND c.tel NOT LIKE 'anon-%' ORDER BY c.visitas DESC, c.nombre LIMIT 500`, R.id),
        incidentes:await todas(env, 'SELECT i.id, i.tipo, i.monto, i.estado, i.creado, i.quien, c.nombre, r.fecha, r.codigo FROM incidentes i LEFT JOIN clientes c ON c.id = i.cliente LEFT JOIN reservas r ON r.id = i.reserva WHERE i.resto = ? ORDER BY i.id DESC LIMIT 100', R.id) };
    }
    if (p === '/api/dueno/incidente' && m === 'POST'){
      const b = await cuerpo(req), i = await una(env, 'SELECT * FROM incidentes WHERE id = ? AND resto = ?', Number(b.id), R.id); if (!i) falla(404, 'No existe');
      await env.DB.batch([q(env, "UPDATE incidentes SET estado = 'condonado', quien = ? WHERE id = ?", S.quien, i.id), q(env, "UPDATE pagos SET estado = 'cancelado' WHERE incidente = ? AND estado = 'pendiente'", i.id),
        q(env, "UPDATE clientes SET pide_sena_hasta = '' WHERE id = ?", i.cliente), subirVersion(env, R), auditar(env, R, S.quien, 'Incidente condonado', String(i.id))]);
      return { ok:true };
    }
    if (p === '/api/dueno/equipo'){
      if (m === 'POST'){
        const b = await cuerpo(req); const rol = ['encargado', 'sala', 'cocina'].includes(b.rol) ? b.rol : 'sala'; const pin = String(b.pin || ''); if (!/^\d{4}$/.test(pin)) falla(400, 'El PIN tiene que ser de 4 números');
        await env.DB.batch([q(env, 'INSERT INTO personal (resto, nombre, rol, pin_hash, creado) VALUES (?,?,?,?,?)', R.id, texto(b.nombre, 40) || 'Sin nombre', rol, await hashClave(pin), ahoraMs(env)), auditar(env, R, S.quien, 'Persona agregada', rol)]);
        return { ok:true };
      }
      if (m === 'DELETE'){ await env.DB.batch([q(env, "UPDATE personal SET activo = 0 WHERE id = ? AND resto = ? AND rol != 'dueno'", Number(g('id')), R.id), q(env, 'DELETE FROM sesiones WHERE personal = ?', Number(g('id'))), auditar(env, R, S.quien, 'Persona dada de baja', g('id'))]); return { ok:true }; }
      return { equipo:await todas(env, 'SELECT id, nombre, rol, email FROM personal WHERE resto = ? AND activo = 1 ORDER BY rol, nombre', R.id) };
    }
    if (p === '/api/dueno/tablet' && m === 'POST'){ const t = b64u(azar(24)); await correr(env, 'INSERT INTO sesiones (token_hash, personal, resto, vence) VALUES (?,?,?,?)', await sha('tablet:' + t), S.personal, R.id, ahoraMs(env) + 180 * 864e5); await auditar(env, R, S.quien, 'Tablet habilitada').run(); return { tablet:t }; }
    if (p === '/api/dueno/alerta' && m === 'POST'){ const b = await cuerpo(req); await env.DB.batch([q(env, "INSERT OR REPLACE INTO sistema (clave, valor) VALUES ('alerta_smn', ?)", b.activa ? local(env).fecha : ''), subirVersion(env, R), auditar(env, R, S.quien, b.activa ? 'Alerta SMN marcada' : 'Alerta SMN quitada')]); return { ok:true }; }
    if (p === '/api/dueno/cerrar-hoy' && m === 'POST'){
      const L = local(env), rs = await todas(env, "SELECT * FROM reservas WHERE resto = ? AND fecha = ? AND estado IN ('confirmada','pendiente','ofrecida')", R.id, L.fecha);
      await env.DB.batch([q(env, 'INSERT OR REPLACE INTO cierres (resto, fecha, motivo) VALUES (?,?,?)', R.id, L.fecha, 'Temporal'), q(env, "INSERT OR REPLACE INTO sistema (clave, valor) VALUES ('alerta_smn', ?)", L.fecha)]);
      for (const r of rs){ await env.DB.batch([q(env, "UPDATE reservas SET estado = 'cancelada', actualizado = ? WHERE id = ?", ahoraMs(env), r.id), q(env, 'DELETE FROM ocupacion WHERE reserva = ?', r.id)]); if (r.sena) await correr(env, "UPDATE pagos SET estado = 'devuelto' WHERE reserva = ? AND tipo = 'sena'", r.id); await avisar(env, R, r, 'cierre'); }
      await env.DB.batch([subirVersion(env, R), auditar(env, R, S.quien, 'Cierre por temporal', `${rs.length} reservas avisadas`)]);
      return { avisadas:rs.length };
    }
    if (p === '/api/dueno/auditoria') return { auditoria:await todas(env, 'SELECT quien, accion, detalle, cuando FROM auditoria WHERE resto = ? ORDER BY id DESC LIMIT 200', R.id) };
    falla(404, 'No existe');
  }
  falla(404, 'No existe');
}

export default {
  async fetch(req, env){
    if (req.method === 'OPTIONS') return new Response(null, { headers:CORS(env) });
    try {
      const r = await rutear(req, env);
      return r instanceof Response ? r : json(env, r);
    } catch (e){
      if (e instanceof Falla) return json(env, { error:e.message, ...e.extra }, e.status);
      console.error(e); return json(env, { error:'Algo salió mal. Probá de nuevo.' }, 500);
    }
  },
  async scheduled(evento, env, ctx){ ctx.waitUntil(tareas(env)); },
};
