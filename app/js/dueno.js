/* Panel del dueño: esta noche, el mes, reglas, salón, horarios, equipo, clientes y (en prueba) el reloj. */
import { $, $$, esc, api, hhmm, pesos, plano, leyenda, hoja, toast, fechaLarga, MODO_PRUEBA, barraPrueba, prueba, alCambiarPrueba, ls, CONFIG } from './comun.js';
import { estadoMesa, personasEn, codigos, etiquetas, pillDe } from './noche.js';
import { slug, sesionGuardada, guardarSesion, pantallaEntrada, habilitarTablet, tablet } from './acceso.js';
import { montarEditor } from './editor.js';

const app = $('#app'), nav = $('#solapas');
const SOLAPAS = [['noche', 'Esta noche'], ['mes', 'El mes'], ['reglas', 'Reglas'], ['salon', 'Salón'], ['horarios', 'Horarios'], ['equipo', 'Equipo'], ['clientes', 'Clientes'], ...(MODO_PRUEBA ? [['prueba', 'Prueba']] : [])];
const S = { ses:sesionGuardada(), tab:(location.hash || '#noche').slice(1), N:null, t:null, mesa:null, mes:null, dia:null, editor:null, cargadoEn:0 };
const tok = () => ({ token:S.ses.token });

async function traerNoche(forzar){
  const d = await api('GET', `/api/sala/noche?${!forzar && S.N ? 'v=' + S.N.version : ''}`, undefined, tok());
  if (!d.sin_cambios){ S.N = d; S.cargadoEn = Date.now(); if (S.t == null) S.t = d.ahora.min; return true; }
  return false;
}
async function iniciar(){
  if (!S.ses || S.ses.rol !== 'dueno'){
    nav.hidden = true; $('#salir').hidden = true;
    pantallaEntrada(app, { soloDueno:true, alEntrar:r => { if (r.rol !== 'dueno'){ toast('Esta cuenta no es del dueño', 'mal'); guardarSesion(null); return; } S.ses = r; iniciar(); } });
    return;
  }
  try { await traerNoche(true); } catch (e){ if (e.status === 401 || e.status === 403){ guardarSesion(null); S.ses = null; iniciar(); return; } app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  $('#nombreResto').textContent = S.N.resto.nombre; $('#quien').textContent = S.ses.nombre + ' · panel del dueño'; $('#salir').hidden = false; nav.hidden = false;
  if (!SOLAPAS.some(([k]) => k === S.tab)) S.tab = 'noche';
  pintarNav(); abrir();
}
function pintarNav(){ nav.innerHTML = SOLAPAS.map(([k, n]) => `<button role="tab" data-tab="${k}" aria-selected="${S.tab === k}">${n}</button>`).join(''); }
nav.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  if (S.editor && S.editor.hayCambios() && S.tab === 'salon' && b.dataset.tab !== 'salon'){ const h = hoja(`<h3>Hay cambios sin guardar en el salón</h3><p>Si salís, se pierden.</p><button class="boton peligro bloque" data-si>Salir sin guardar</button>`); h.el.querySelector('[data-si]').onclick = () => { h.cerrar(); S.editor = null; S.tab = b.dataset.tab; history.replaceState(null, '', '#' + S.tab); pintarNav(); abrir(); }; return; }
  S.tab = b.dataset.tab; history.replaceState(null, '', '#' + S.tab); pintarNav(); abrir();
});
function abrir(){ S.editor = null; ({ noche, mes, reglas, salon, horarios, equipo, clientes, prueba:pestañaPrueba })[S.tab](); }

/* ---------------- esta noche ---------------- */
function marea(N){
  const W = 620, H = 200, x0 = 34, x1 = W - 12, y0 = 16, y1 = H - 26, cap = N.mesas.reduce((s, m) => s + m.cap_max, 0) || 1;
  const turnos = N.reservas.length ? [Math.min(...N.reservas.map(r => r.inicio)) - 30, Math.max(...N.reservas.map(r => r.fin)) + 30] : [1140, 1470];
  const T0 = Math.floor(Math.min(turnos[0], N.ahora.min - 30, 1140) / 60) * 60, T1 = Math.ceil(Math.max(turnos[1], 1440) / 60) * 60;
  const X = t => x0 + (t - T0) / (T1 - T0) * (x1 - x0), Y = v => y1 - Math.min(v, cap * 1.1) / (cap * 1.1) * (y1 - y0);
  let d = ''; for (let t = T0; t <= T1; t += 5) d += (t === T0 ? 'M' : 'L') + X(t).toFixed(1) + ' ' + Y(personasEn(N, t)).toFixed(1);
  const horas = []; for (let t = T0; t <= T1; t += 60) horas.push(`<line class="grilla" x1="${X(t)}" y1="${y0}" x2="${X(t)}" y2="${y1}"/><text class="eje" x="${X(t)}" y="${H - 8}" text-anchor="middle">${hhmm(t).slice(0, 2)} h</text>`);
  const c = personasEn(N, S.t), vivo = N.fecha === N.ahora.fecha;
  return { T0, T1, svg:`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Personas en el salón durante el día; a las ${hhmm(S.t)}, ${c} de ${cap}">${horas.join('')}
    ${[0, Math.round(cap / 2), cap].map(v => `<text class="eje" x="${x0 - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join('')}
    <line class="tope" x1="${x0}" y1="${Y(cap)}" x2="${x1}" y2="${Y(cap)}"/><text class="tope-t" x="${x1}" y="${Y(cap) - 4}" text-anchor="end">${cap} lugares</text>
    <path class="area" d="${d}L${X(T1)} ${y1}L${X(T0)} ${y1}Z"/><path class="linea" d="${d}"/>
    ${vivo ? `<line class="ahora" x1="${X(N.ahora.min)}" y1="${y0}" x2="${X(N.ahora.min)}" y2="${y1}"/>` : ''}
    <line class="cursor" x1="${X(S.t)}" y1="${y0}" x2="${X(S.t)}" y2="${y1}"/><circle class="punto" cx="${X(S.t)}" cy="${Y(c)}" r="5"/><text class="rot" x="${Math.min(X(S.t) + 8, x1 - 70)}" y="${Math.max(Y(c) - 8, y0 + 10)}">${c} personas</text></svg>` };
}
function atencion(N){
  const vivo = N.fecha === N.ahora.fecha, a = [];
  if (N.alerta_smn) a.push(['mal', 'Alerta meteorológica marcada para hoy', 'Los plantones de hoy no generan compromiso.']);
  if (vivo) N.reservas.filter(r => r.estado === 'confirmada' && N.ahora.min >= r.inicio).forEach(r => a.push(['warn', `${codigos(N, r)}: ${r.nombre} no llegó (${N.ahora.min - r.inicio} min)`, 'Se le preguntó por WhatsApp. La mesa se libera sola al terminar la tolerancia.']));
  const sc = N.reservas.filter(r => r.estado === 'confirmada' && !r.confirmo && (!vivo || r.inicio > N.ahora.min));
  if (sc.length) a.push(['warn', `${sc.length} ${sc.length === 1 ? 'reserva sin confirmar' : 'reservas sin confirmar'}`, sc.slice(0, 4).map(r => `${hhmm(r.inicio)} ${r.nombre}`).join(' · ')]);
  N.reservas.filter(r => r.incidente && r.incidente.estado === 'pendiente').forEach(r => a.push(['mal', `Compromiso pendiente: ${r.nombre}`, `${pesos(r.incidente.monto)} · ${r.estado === 'planton' ? 'plantón' : 'canceló sobre la hora'}`]));
  N.reservas.filter(r => r.sena).forEach(r => a.push(['ok', `Seña de ${r.nombre} acreditada (${pesos(r.sena)})`, `${codigos(N, r)} · ${hhmm(r.inicio)} · se descuenta de la cuenta`]));
  if (N.espera.length) a.push(['ok', `${N.espera.length} en la lista de espera`, N.espera.map(e => `${e.nombre} (${e.pax})`).join(' · ')]);
  return a.length ? a.slice(0, 6).map(([c, t, s]) => `<div class="aviso ${c}"><b>${esc(t)}</b><br><span class="muted">${esc(s)}</span></div>`).join('') : '<div class="aviso ok">Todo en orden.</div>';
}
function noche(){
  const N = S.N, vivo = N.fecha === N.ahora.fecha, M = marea(N), rs = N.reservas.filter(r => r.estado !== 'cancelada');
  const conf = rs.filter(r => r.confirmo || ['sentada', 'finalizada'].includes(r.estado)).length, cap = N.mesas.reduce((s, m) => s + m.cap_max, 0);
  const plant = rs.filter(r => r.estado === 'planton').length, recup = rs.reduce((s, r) => s + (r.incidente && r.incidente.estado === 'pagado' ? r.incidente.monto : 0) + (r.sena || 0), 0);
  app.innerHTML = `<div class="nums">
      <div class="num"><span>Reservas hoy</span><b>${rs.filter(r => r.canal !== 'puerta').length}</b><small>${rs.filter(r => !['planton', 'cancelada_tarde'].includes(r.estado)).reduce((s, r) => s + r.pax, 0)} personas · ${rs.filter(r => r.canal === 'puerta').length} sin reserva</small></div>
      <div class="num ok"><span>Confirmadas</span><b>${conf}</b><small>de ${rs.filter(r => r.canal !== 'puerta').length}</small></div>
      <div class="num"><span>En el salón a las ${hhmm(S.t)}</span><b id="nSalon">${personasEn(N, S.t)}</b><small>de ${cap} lugares</small></div>
      <div class="num ${plant ? 'warn' : 'ok'}"><span>Plantones</span><b>${plant}</b><small>${recup ? pesos(recup) + ' en señas y compromisos' : 'ninguno cobrado'}</small></div></div>
    <div class="duo">
      <div class="pila"><div class="fila-h entre"><h3>La marea del día</h3><span class="muted">personas sentadas a cada hora</span></div>
        <div class="marea tarjeta plana" id="marea">${M.svg}</div>
        <label class="hora-ctl" for="horaR"><span>Mirá el salón a las <b class="mono" id="horaTxt">${hhmm(S.t)}</b>${vivo ? ` · <button class="boton chico" id="aAhora" type="button">Ahora</button>` : ''}</span><input type="range" id="horaR" min="${M.T0}" max="${M.T1}" step="5" value="${S.t}"></label>
        <h3>Para mirar</h3><div class="pila">${atencion(N)}</div>
        <div class="tarjeta plana"><div class="sw"><label for="alerta">Hoy hay alerta del SMN (nieve o viento)</label><input type="checkbox" role="switch" id="alerta" ${N.alerta_smn ? 'checked' : ''}></div><small class="muted">Con la alerta marcada, los plantones de hoy no generan compromiso.</small>
          <button class="boton peligro" id="cerrarHoy">Cerrar hoy por temporal…</button></div>
      </div>
      <div class="pila"><div class="plano-caja deslizable" id="planoD"></div><p class="desliza-aviso">← Deslizá para ver todo el salón →</p>${leyenda(['libre', 'llega', 'ocupada', 'pronto', 'espera'])}<div id="mesaD" class="tarjeta plana"><p class="muted">Tocá una mesa para ver quién está y cuándo se libera.</p></div></div>
    </div>`;
  refrescarNoche();
  $('#horaR').addEventListener('input', e => { S.t = +e.target.value; refrescarNoche(); });
  $('#aAhora')?.addEventListener('click', () => { S.t = N.ahora.min + Math.floor((Date.now() - S.cargadoEn) / 60000); $('#horaR').value = S.t; refrescarNoche(); });
  $('#alerta').addEventListener('change', async e => { try { await api('POST', '/api/dueno/alerta', { activa:e.target.checked }, tok()); await traerNoche(true); noche(); toast(e.target.checked ? 'Alerta marcada para hoy' : 'Alerta quitada'); } catch (err){ toast(err.message, 'mal'); } });
  $('#cerrarHoy').addEventListener('click', () => {
    const vivas = N.reservas.filter(r => ['confirmada', 'pendiente'].includes(r.estado));
    const h = hoja(`<h3>Cerrar hoy por temporal</h3><p>Se avisa a <b>${vivas.length} reservas</b> (${vivas.reduce((s, r) => s + r.pax, 0)} personas) por WhatsApp, con un enlace para elegir otra fecha. Las señas se devuelven y nadie paga compromiso.</p><button class="boton peligro bloque" data-si>Cerrar y avisar a todos</button><button class="boton bloque" data-no>Todavía no</button>`);
    h.el.querySelector('[data-no]').onclick = () => h.cerrar();
    h.el.querySelector('[data-si]').onclick = async () => { try { const r = await api('POST', '/api/dueno/cerrar-hoy', {}, tok()); h.cerrar(); toast(`Cerrado. Avisamos a ${r.avisadas} reservas.`); await traerNoche(true); noche(); } catch (err){ toast(err.message, 'mal'); } };
  });
}
function refrescarNoche(){
  const N = S.N; if (!$('#planoD')) return;
  $('#planoD').innerHTML = plano({ plano:N.resto.plano, mesas:N.mesas, sel:S.mesa, estado:m => estadoMesa(N, m, S.t) });
  $('#marea').innerHTML = marea(N).svg; $('#horaTxt').textContent = hhmm(S.t); $('#nSalon').textContent = personasEn(N, S.t);
  if (S.mesa){ const m = N.mesas.find(x => x.id === S.mesa), e = estadoMesa(N, m, S.t), r = e.r;
    const prox = N.reservas.filter(x => x.mesas.includes(m.id) && x.inicio > S.t && ['confirmada', 'pendiente'].includes(x.estado)).sort((a, b) => a.inicio - b.inicio)[0];
    $('#mesaD').innerHTML = `<h3>Mesa ${esc(m.codigo)} <span class="muted" style="font-size:14px">${esc(m.zona || '')} · ${m.cap_max} lugares</span></h3><div class="detalle">
      ${r ? `<div class="f"><span>${e.c === 'llega' ? 'Llega' : 'En la mesa'}</span><b>${esc(r.nombre)} · ${r.pax}</b></div><div class="f"><span>Horario</span><b>${hhmm(r.inicio)} a ${hhmm(r.fin)}</b></div>
        ${r.estado === 'sentada' ? `<div class="f"><span>Llevan</span><b>${Math.max(0, S.t - r.inicio)} min</b></div>` : ''}<div class="f"><span>Lista para otra reserva</span><b>${hhmm(r.fin + N.resto.politica.limpieza)}</b></div><div class="f"><span>Estado</span><b>${esc(pillDe(N, r)[0])}</b></div>${etiquetas(r)}`
        : '<div class="f"><span>A esa hora</span><b>Libre</b></div>'}
      ${prox && prox !== r ? `<div class="f"><span>Próxima</span><b>${hhmm(prox.inicio)} · ${esc(prox.nombre)} · ${prox.pax}</b></div>` : ''}</div>`; }
}
app.addEventListener('click', e => { if (S.tab !== 'noche') return; const m = e.target.closest('#planoD .mesa-g'); if (m){ S.mesa = Number(m.dataset.mesa); refrescarNoche(); } });

/* ---------------- el mes ---------------- */
async function mes(){
  const N = S.N; S.mes = S.mes || N.ahora.fecha.slice(0, 7);
  app.innerHTML = '<div class="muted">Cargando…</div>';
  let M; try { M = await api('GET', `/api/dueno/mes?mes=${S.mes}`, undefined, tok()); } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const abiertos = M.dias.filter(d => !d.cerrado && d.fecha <= N.ahora.fecha), suma = k => abiertos.reduce((s, d) => s + d[k], 0);
  const occ = abiertos.length ? Math.round(suma('ocupacion') / abiertos.length) : 0, res = suma('reservas');
  const nombreMes = new Date(S.mes + '-15T12:00:00Z').toLocaleDateString('es-AR', { month:'long', year:'numeric', timeZone:'UTC' });
  const primer = (new Date(S.mes + '-01T12:00:00Z').getUTCDay() + 6) % 7, nom = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const sem = [1, 2, 3, 4, 5, 6, 0].map(w => { const xs = abiertos.filter(d => d.dia === w); return [w, xs.length ? Math.round(xs.reduce((s, d) => s + d.ocupacion, 0) / xs.length) : 0]; });
  const mover = n => { const d = new Date(S.mes + '-15T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };
  S.dia = S.dia && S.dia.startsWith(S.mes) ? S.dia : (N.ahora.fecha.startsWith(S.mes) ? N.ahora.fecha : S.mes + '-01');
  app.innerHTML = `<div class="fila-h entre"><div class="fila-h"><button class="boton chico" data-mes="-1" aria-label="Mes anterior">◀</button><h2 style="text-transform:capitalize">${nombreMes}</h2><button class="boton chico" data-mes="1" aria-label="Mes siguiente">▶</button></div><span class="muted">Se cierra solo cada día a las 03:00</span></div>
    <div class="nums"><div class="num"><span>Personas</span><b>${suma('personas').toLocaleString('es-AR')}</b><small>${res} reservas · ${suma('puerta')} sin reserva</small></div>
      <div class="num"><span>Ocupación media</span><b>${occ} %</b><small>de los lugares en horario de servicio</small></div>
      <div class="num ${suma('plantones') ? 'warn' : 'ok'}"><span>Plantones</span><b>${suma('plantones')}</b><small>${res ? (suma('plantones') / res * 100).toFixed(1).replace('.', ',') : 0} % · ${suma('tardias')} cancelaron tarde</small></div>
      <div class="num ok"><span>Recuperado</span><b>${pesos(suma('recuperado')).replace('$ ', '$')}</b><small>${suma('desde_espera')} mesas desde la lista de espera</small></div></div>
    <div class="duo"><div class="pila"><span class="muted">Más oscuro = más lleno. Tocá un día.</span>
      <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span class="dsem">${x}</span>`).join('')}${'<span class="vacio"></span>'.repeat(primer)}
      ${M.dias.map(d => `<button class="${d.cerrado ? 'cerrado' : ''} ${d.fecha > N.ahora.fecha ? 'futuro' : ''} ${d.fecha === N.ahora.fecha ? 'hoy' : ''} ${d.ocupacion >= 65 ? 'alto' : ''}" style="--p:${d.cerrado ? 0 : Math.round(d.ocupacion * .95)}%" data-d="${d.fecha}" aria-pressed="${S.dia === d.fecha}"><b>${+d.fecha.slice(8)}</b><span>${d.cerrado ? 'cerr.' : d.personas ? d.ocupacion + '%' : ''}</span></button>`).join('')}</div></div>
      <div class="pila"><div class="tarjeta plana detalle" id="diaD"></div><h3>Por día de la semana</h3><div class="sem">${sem.map(([w, v]) => `<div><span>${nom[w]}</span><i style="width:${v}%"></i><b>${v} %</b></div>`).join('')}</div></div></div>`;
  const pintarDia = () => { const d = M.dias.find(x => x.fecha === S.dia);
    $('#diaD').innerHTML = `<h3 style="text-transform:capitalize">${fechaLarga(d.fecha)}</h3>${d.cerrado ? `<div class="f"><span>Cerrado</span><b>${esc(d.cerrado)}</b></div>` :
      `<div class="f"><span>Personas</span><b>${d.personas}</b></div><div class="f"><span>Reservas</span><b>${d.reservas}</b></div><div class="f"><span>Sin reserva</span><b>${d.puerta}</b></div><div class="f"><span>Ocupación</span><b>${d.ocupacion} %</b></div>
      <div class="f"><span>Desde la lista de espera</span><b>${d.desde_espera}</b></div><div class="f"><span>Plantones</span><b>${d.plantones}</b></div><div class="f"><span>Cancelaron tarde</span><b>${d.tardias}</b></div><div class="f"><span>Recuperado</span><b>${pesos(d.recuperado)}</b></div>`}`; };
  pintarDia();
  app.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { S.dia = b.dataset.d; app.querySelectorAll('[data-d]').forEach(x => x.setAttribute('aria-pressed', x.dataset.d === S.dia)); pintarDia(); }));
  app.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => { S.mes = mover(+b.dataset.mes); mes(); }));
}

/* ---------------- reglas ---------------- */
const REGLAS = [
  ['horas', 'Cancelar sin cargo hasta', 1, 24, 1, v => `${v} ${v == 1 ? 'hora' : 'horas'} antes`, 'Para Ushuaia sugerimos 3 horas: da tiempo a volver a ocupar la mesa.'],
  ['monto', 'Compromiso por persona', 0, 30000, 1000, pesos, 'Sugerido: $ 10.000 (≈ 18 % de una cena de $ 55.000). Educa sin sentirse una multa.'],
  ['tope_personas', 'Máximo de personas que se cobran', 1, 20, 1, v => `${v} personas`, ''],
  ['tolerancia', 'Tolerancia de llegada', 5, 45, 5, v => `${v} minutos`, 'A la mitad, la app pregunta «¿vienen?»; al final marca el plantón y libera la mesa.'],
  ['limpieza', 'Limpieza entre una mesa y otra', 0, 45, 5, v => `${v} minutos`, 'Se suma después de cada mesa: si se va a las 22:00, se puede reservar desde las 22:15.'],
  ['grupo_desde', 'Seña para grupos desde', 4, 40, 1, v => `${v} personas`, ''],
  ['sena', 'Seña por persona', 0, 50000, 1000, pesos, 'Se descuenta de la cuenta. Se devuelve si cancelan con más de 48 horas.'],
  ['dias_credito', 'El compromiso vuelve como crédito durante', 0, 365, 15, v => `${v} días`, ''],
  ['oferta_min', 'Tiempo para aceptar una mesa de la espera', 5, 30, 5, v => `${v} minutos`, ''],
  ['anticipacion', 'Se puede reservar con hasta', 1, 120, 1, v => `${v} días`, ''],
  ['max_pax', 'Máximo de personas por reserva online', 2, 40, 1, v => `${v} personas`, 'Más que eso, escriben por WhatsApp.'],
];
function reglas(){
  const P = { ...S.N.resto.politica }, R = S.N.resto, PG = { estilo:'canal', lema:'', destacados:[], ...(P.pagina || {}) };
  const url = new URL('index.html', location.href); if (slug !== CONFIG.RESTO) url.searchParams.set('r', slug);
  app.innerHTML = `<div class="duo"><form class="tarjeta" id="fReglas">
      <h3>Tu restaurante</h3>
      <div class="campo"><label for="rNombre">Nombre</label><input id="rNombre" value="${esc(R.nombre)}"></div>
      <div class="campo"><label for="rWa">WhatsApp de contacto para los clientes</label><input id="rWa" type="tel" value="${R.whatsapp ? '+' + esc(R.whatsapp) : ''}"><small>Por ahora es el de Claudio; se cambia cuando el restaurante tenga el suyo.</small></div>
      <div class="campo"><label for="rWaModo">Cómo salen los WhatsApp</label><select id="rWaModo"><option value="simulado" ${P.wa_modo === 'simulado' ? 'selected' : ''}>Simulados (para probar)</option><option value="manual" ${P.wa_modo === 'manual' ? 'selected' : ''}>A mano: la sala los envía con un toque</option></select><small>El envío automático se activa cuando el restaurante tenga su número de WhatsApp Business.</small></div>
      <h3 style="margin-top:8px">Tu página web</h3>
      <div class="pila"><span class="etiqueta">Estilo</span><div class="chips" id="estilosD">${[['canal', 'Canal · Ushuaia de noche', '#0C1720', '#D6925F'], ['bistro', 'Bistró · París', '#F3EEE4', '#7A1F2B'], ['palermo', 'Palermo · Buenos Aires', '#0E231B', '#C9A45C'], ['galeria', 'Galería · vanguardia', '#F6F6F2', '#2340D6']].map(([k, n, a, z]) => `<button type="button" class="chip ${PG.estilo === k ? 'on' : ''}" data-est="${k}"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:-2px;margin-right:6px;background:linear-gradient(135deg,${a} 0 50%,${z} 50%);box-shadow:0 0 0 1px var(--line-2)"></span>${n}</button>`).join('')}</div><small class="muted">Es el que ve el cliente al entrar. Igual puede cambiarlo desde la página.</small></div>
      <div class="campo"><label for="rLema">Lema de la portada</label><input id="rLema" maxlength="90" value="${esc(PG.lema || '')}"></div>
      <div class="campo"><label for="rPlatos">Platos de la marquesina (separados por coma)</label><input id="rPlatos" value="${esc((PG.destacados || []).join(', '))}"></div>
      <h3 style="margin-top:8px">Plantones y cancelaciones</h3>
      ${REGLAS.map(([k, l, a, z, st, f, ay]) => `<div class="rg"><div class="rg-t"><label for="r-${k}">${l}</label><output id="o-${k}">${f(P[k])}</output></div><input type="range" id="r-${k}" data-k="${k}" min="${a}" max="${z}" step="${st}" value="${P[k]}">${ay ? `<small>${ay}</small>` : ''}</div>`).join('')}
      <div class="rg"><div class="sw"><label for="r-credito">El compromiso vuelve como crédito</label><input type="checkbox" role="switch" id="r-credito" ${P.credito ? 'checked' : ''}></div><small>Si paga y vuelve dentro del plazo, se le descuenta de la cuenta: el cliente aprende y vuelve.</small></div>
      <div class="rg"><div class="sw"><label for="r-smn">Sin cargo con alerta del SMN</label><input type="checkbox" role="switch" id="r-smn" ${P.smn ? 'checked' : ''}></div></div>
      <button class="boton pri" type="submit">Guardar las reglas</button></form>
    <div class="pila"><h3>Así lo lee el cliente</h3><div class="chat" id="vista"></div>
      <div class="tarjeta plana"><h3>Tu enlace de reservas</h3><p class="muted">Para la bio de Instagram, Google Maps y el QR de la puerta.</p><div class="mono" style="overflow-wrap:anywhere">${esc(url.href)}</div><div class="fila-h"><button class="boton chico" id="copiar">Copiar el enlace</button><a class="boton chico" href="${esc(url.href)}" target="_blank" rel="noopener">Abrir</a></div><div class="qr" id="qr"></div></div></div></div>`;
  const vista = () => { const lim = hhmm(1260 - P.horas * 60), m = pesos(P.monto);
    $('#vista').innerHTML = `<div class="msj">¡Listo, Sofía! Tu reserva en ${esc($('#rNombre').value)} está confirmada 🎉\nHoy a las 21:00 · 4 personas · mesa V3.\n\nPodés cancelar sin cargo hasta las ${lim}. Si cancelás después o no venís, queda un compromiso de ${m} por persona${P.credito ? `, que te devolvemos como crédito si volvés en ${P.dias_credito} días` : ''}.<time>10:31</time></div>
      <div class="msj">Si una mesa de 4 cancela a las 20:15: compromiso de ${pesos(Math.min(4, P.tope_personas) * P.monto)}. El restaurante pierde cerca de ${pesos(4 * 55000 * .65)} de margen; el compromiso cubre el ${Math.round(Math.min(4, P.tope_personas) * P.monto / (4 * 55000 * .65) * 100)} %.<time>ejemplo</time></div>`; };
  vista();
  app.querySelectorAll('[data-k]').forEach(i => i.addEventListener('input', () => { P[i.dataset.k] = +i.value; const r = REGLAS.find(x => x[0] === i.dataset.k); $('#o-' + r[0]).textContent = r[5](P[r[0]]); vista(); }));
  ['r-credito', 'r-smn'].forEach(id => $('#' + id).addEventListener('change', e => { P[id.slice(2)] = e.target.checked; vista(); }));
  $('#rNombre').addEventListener('input', vista);
  $('#estilosD').addEventListener('click', e => { const b = e.target.closest('[data-est]'); if (!b) return; PG.estilo = b.dataset.est; $$('#estilosD [data-est]').forEach(x => x.classList.toggle('on', x === b)); });
  try { const q = qrcode(0, 'M'); q.addData(url.href); q.make(); $('#qr').innerHTML = q.createSvgTag({ cellSize:4, margin:2, scalable:true }); } catch (e){ $('#qr').hidden = true; }
  $('#copiar').addEventListener('click', () => { navigator.clipboard?.writeText(url.href).then(() => toast('Enlace copiado'), () => toast('Copialo a mano', 'mal')); });
  $('#fReglas').addEventListener('submit', async e => {
    e.preventDefault();
    try { await api('PUT', '/api/dueno/politica', { ...Object.fromEntries(REGLAS.map(([k]) => [k, P[k]])), credito:P.credito, smn:P.smn, wa_modo:$('#rWaModo').value, pagina:{ estilo:PG.estilo, lema:$('#rLema').value, destacados:$('#rPlatos').value.split(',').map(x => x.trim()).filter(Boolean) }, nombre:$('#rNombre').value, whatsapp:$('#rWa').value }, tok());
      await traerNoche(true); $('#nombreResto').textContent = S.N.resto.nombre; toast('Reglas guardadas. Valen para las reservas nuevas.'); } catch (err){ toast(err.message, 'mal'); }
  });
}

/* ---------------- salón (editor) ---------------- */
function salon(){
  app.innerHTML = '<div id="ed"></div>';
  S.editor = montarEditor($('#ed'), S.N, S.ses, async () => { await traerNoche(true); });
}

/* ---------------- horarios ---------------- */
async function horarios(){
  let H; try { H = await api('GET', '/api/dueno/turnos', undefined, tok()); } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const DS = [['1', 'L'], ['2', 'M'], ['3', 'M'], ['4', 'J'], ['5', 'V'], ['6', 'S'], ['0', 'D']];
  const opts = sel => { let o = ''; for (let m = 360; m <= 1439; m += 15) o += `<option value="${m}" ${m === sel ? 'selected' : ''}>${hhmm(m)}</option>`; return o; };
  const turnoHTML = (t, i) => `<div class="turno" data-i="${i}"><div class="fila-h entre"><div class="campo" style="flex:1"><label>Nombre</label><input data-f="nombre" value="${esc(t.nombre)}"></div><button class="boton chico peligro" data-quitar="${i}">Quitar</button></div>
    <div class="dias-sem">${DS.map(([d, n]) => `<label><input type="checkbox" data-dia="${d}" ${t.dias.includes(d) ? 'checked' : ''}>${n}</label>`).join('')}</div>
    <div class="dos-col"><div class="campo"><label>Primera reserva</label><select data-f="desde">${opts(t.desde)}</select></div><div class="campo"><label>Última reserva</label><select data-f="hasta">${opts(t.hasta)}</select></div></div>
    <div class="dos-col"><div class="campo"><label>Cada</label><select data-f="paso"><option value="15" ${t.paso == 15 ? 'selected' : ''}>15 minutos</option><option value="30" ${t.paso == 30 ? 'selected' : ''}>30 minutos</option></select></div>
    <div class="campo"><label>Tope de personas que entran cada ${t.paso} min</label><input type="number" min="0" data-f="tope_franja" value="${t.tope_franja}"><small>0 = sin tope. Sirve para no ahogar la cocina.</small></div></div></div>`;
  let T = H.turnos.map(t => ({ ...t })), C = H.cierres.map(c => ({ ...c }));
  const pintarH = () => {
    app.innerHTML = `<div class="duo"><div class="pila"><h3>Turnos</h3>${T.map(turnoHTML).join('')}<button class="boton" id="masTurno">+ Agregar un turno</button></div>
      <div class="pila"><h3>Días cerrados</h3><div class="tarjeta plana">${C.length ? C.map((c, i) => `<div class="fila-h entre"><span>${fechaLarga(c.fecha)} · ${esc(c.motivo)}</span><button class="boton chico" data-qc="${i}">Quitar</button></div>`).join('') : '<p class="muted">Ninguno cargado.</p>'}
        <div class="dos-col"><div class="campo"><label for="cF">Fecha</label><input id="cF" type="date" min="${S.N.ahora.fecha}"></div><div class="campo"><label for="cM">Motivo</label><input id="cM" placeholder="Vacaciones, evento privado…"></div></div><button class="boton chico" id="masCierre">Agregar</button></div>
        <button class="boton pri" id="guardarH">Guardar horarios</button></div></div>`;
  };
  const leer = () => { $$('.turno', app).forEach(el => { const t = T[+el.dataset.i]; el.querySelectorAll('[data-f]').forEach(i => t[i.dataset.f] = i.dataset.f === 'nombre' ? i.value : +i.value); t.dias = [...el.querySelectorAll('[data-dia]:checked')].map(c => c.dataset.dia).join(''); }); };
  pintarH();
  app.onclick = async e => {
    if (S.tab !== 'horarios') return;
    if (e.target.closest('#masTurno')){ leer(); T.push({ nombre:'Nuevo turno', dias:'0123456', desde:1200, hasta:1380, paso:15, tope_franja:0 }); pintarH(); }
    const q = e.target.closest('[data-quitar]'); if (q){ leer(); T.splice(+q.dataset.quitar, 1); pintarH(); }
    const qc = e.target.closest('[data-qc]'); if (qc){ leer(); C.splice(+qc.dataset.qc, 1); pintarH(); }
    if (e.target.closest('#masCierre')){ leer(); if (!$('#cF').value){ toast('Elegí la fecha', 'mal'); return; } C.push({ fecha:$('#cF').value, motivo:$('#cM').value || 'Cerrado' }); pintarH(); }
    if (e.target.closest('#guardarH')){ leer(); try { await api('PUT', '/api/dueno/turnos', { turnos:T, cierres:C }, tok()); toast('Horarios guardados'); } catch (err){ toast(err.message, 'mal'); } }
  };
}

/* ---------------- equipo ---------------- */
async function equipo(){
  let E; try { E = await api('GET', '/api/dueno/equipo', undefined, tok()); } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const ROL = { dueno:'Dueño', encargado:'Encargado: todo menos el panel del dueño; puede condonar', sala:'Sala: reservas, llegadas y mesas', cocina:'Cocina: solo mira la noche y las alergias' };
  app.innerHTML = `<div class="duo"><div class="pila"><h3>El equipo</h3><div class="lista">${E.equipo.map(p => `<div class="item"><span class="logo" style="width:36px;height:36px;font-size:16px">${esc(p.nombre.slice(0, 1))}</span><span><b>${esc(p.nombre)}</b><span class="d">${esc(ROL[p.rol] || p.rol)}</span></span>${p.rol === 'dueno' ? '' : `<button class="boton chico" data-baja="${p.id}">Dar de baja</button>`}</div>`).join('')}</div>
      <form class="tarjeta" id="fEq"><h3>Agregar a alguien</h3><div class="campo"><label for="eqN">Nombre</label><input id="eqN" required></div>
        <div class="dos-col"><div class="campo"><label for="eqR">Rol</label><select id="eqR"><option value="sala">Sala</option><option value="encargado">Encargado</option><option value="cocina">Cocina</option></select></div><div class="campo"><label for="eqP">PIN de 4 números</label><input id="eqP" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required></div></div>
        <button class="boton pri" type="submit">Agregar</button></form></div>
    <div class="pila"><h3>La tablet de la entrada</h3><div class="tarjeta plana"><p>El equipo entra con su PIN solo en equipos que habilitaste. ${tablet() ? '<b>Este equipo ya está habilitado.</b>' : 'Este equipo todavía no está habilitado.'}</p>
      <button class="boton" id="habilitar">${tablet() ? 'Volver a habilitar este equipo' : 'Habilitar este equipo'}</button><p class="muted" style="font-size:13.5px">Hacelo solo en la tablet del restaurante. Si se pierde, da de baja a las personas y habilitá otra.</p></div></div></div>`;
  $('#fEq').addEventListener('submit', async e => { e.preventDefault(); try { await api('POST', '/api/dueno/equipo', { nombre:$('#eqN').value, rol:$('#eqR').value, pin:$('#eqP').value }, tok()); toast('Agregado'); equipo(); } catch (err){ toast(err.message, 'mal'); } });
  app.querySelectorAll('[data-baja]').forEach(b => b.addEventListener('click', async () => { try { await api('DELETE', `/api/dueno/equipo?id=${b.dataset.baja}`, undefined, tok()); toast('Dado de baja: ya no puede entrar'); equipo(); } catch (err){ toast(err.message, 'mal'); } }));
  $('#habilitar').addEventListener('click', async () => { try { await habilitarTablet(S.ses); toast('Equipo habilitado para entrar con PIN'); equipo(); } catch (err){ toast(err.message, 'mal'); } });
}

/* ---------------- clientes e incidentes ---------------- */
async function clientes(){
  let C; try { C = await api('GET', '/api/dueno/clientes', undefined, tok()); } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const EST = { pendiente:'warn', pagado:'ok', condonado:'', exento:'info', vencido:'' };
  app.innerHTML = `<h3>Incidentes</h3><div class="tabla-caja"><table class="tabla"><thead><tr><th>Cliente</th><th>Qué pasó</th><th>Monto</th><th>Estado</th><th></th></tr></thead><tbody>
      ${C.incidentes.length ? C.incidentes.map(i => `<tr><td>${esc(i.nombre || '—')}<br><span class="muted">${i.fecha ? fechaLarga(i.fecha) : ''} · ${esc(i.codigo || '')}</span></td><td>${i.tipo === 'planton' ? 'No vino' : 'Canceló sobre la hora'}</td><td class="mono">${pesos(i.monto)}</td><td><span class="pill ${EST[i.estado]}">${esc(i.estado)}</span>${i.quien ? `<br><span class="muted" style="font-size:12.5px">por ${esc(i.quien)}</span>` : ''}</td>
        <td>${i.estado === 'pendiente' ? `<button class="boton chico" data-cond="${i.id}">Condonar</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5" class="muted">Sin incidentes.</td></tr>'}</tbody></table></div>
    <h3>Clientes</h3><p class="muted">Solo datos para atender mejor: visitas, crédito y si la próxima reserva pide seña. Nunca se comparten con otros restaurantes.</p>
    <div class="tabla-caja"><table class="tabla"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Visitas</th><th>Última</th><th>Crédito</th><th>Pide seña hasta</th><th>Incidentes</th></tr></thead><tbody>
      ${C.clientes.map(c => `<tr><td>${esc(c.nombre)}${c.acepta_promos ? ' <span class="pill info">novedades</span>' : ''}</td><td class="mono">+${esc(c.tel)}</td><td>${c.visitas}</td><td>${c.ultima ? fechaLarga(c.ultima) : '—'}</td><td>${c.credito ? pesos(c.credito) : '—'}</td><td>${c.pide_sena_hasta ? fechaLarga(c.pide_sena_hasta) : '—'}</td><td>${c.incidentes || '—'}</td></tr>`).join('')}</tbody></table></div>`;
  app.querySelectorAll('[data-cond]').forEach(b => b.addEventListener('click', async () => { try { await api('POST', '/api/dueno/incidente', { id:+b.dataset.cond }, tok()); toast('Condonado. Queda registrado que lo hiciste vos.'); clientes(); } catch (err){ toast(err.message, 'mal'); } }));
}

/* ---------------- prueba (reloj y datos) ---------------- */
async function pestañaPrueba(){
  const L = await prueba(), ahora = () => new Date(L.ahoraPrueba() - 180 * 60000), d = ahora();
  const ult = (() => { try { return JSON.parse(ls.get('ultima_reserva') || 'null'); } catch (e){ return null; } })();
  app.innerHTML = `<div class="duo"><div class="pila"><h3>Reloj de prueba</h3><div class="tarjeta plana"><p>La app funciona con esta hora: así se prueban los recordatorios, el «¿vienen?», los plantones y las ofertas de la lista de espera sin esperar. El reloj sigue corriendo desde la hora que pongas.</p>
      <div class="mono" style="font-size:28px" id="relojP">${d.toISOString().slice(8, 10)}/${d.toISOString().slice(5, 7)} ${d.toISOString().slice(11, 16)}</div>
      <div class="dos-col"><div class="campo"><label for="pF">Fecha</label><input id="pF" type="date" value="${d.toISOString().slice(0, 10)}"></div><div class="campo"><label for="pH">Hora</label><input id="pH" type="time" value="${d.toISOString().slice(11, 16)}"></div></div>
      <div class="fila-h"><button class="boton pri chico" id="pFijar">Poner esta hora</button><button class="boton chico" data-mas="15">+15 min</button><button class="boton chico" data-mas="60">+1 hora</button><button class="boton chico" id="pReal">Hora real</button></div></div>
      <h3>Datos de prueba</h3><div class="tarjeta plana"><p>Todo lo de esta prueba vive solo en este navegador: el restaurante «Fogón del Ñire», sus mesas, 12 clientes inventados y las reservas de hoy y mañana.</p><button class="boton peligro chico" id="pBorrar">Borrar todo y empezar de nuevo</button></div></div>
    <div class="pila"><h3>Para probar</h3><div class="tarjeta plana pila"><a class="boton" href="index.html" target="_blank" rel="noopener">Página de reservas (lo que ve el cliente)</a><a class="boton" href="sala.html" target="_blank" rel="noopener">Tablet de la sala</a>${ult ? `<a class="boton" href="mi.html?c=${esc(ult.c)}&k=${esc(ult.k)}#mensajes" target="_blank" rel="noopener">Mi última reserva y su WhatsApp simulado</a>` : ''}
      <p class="muted" style="font-size:13.5px">Abrí la sala en otra pestaña y reservá desde la página pública: la reserva aparece sola en la sala. Adelantá el reloj para ver el recordatorio, el «¿vienen?» y el plantón.</p></div></div></div>`;
  const fijar = (fecha, min) => { L.relojFijar(fecha, min); toast('Reloj de prueba: ' + fecha.split('-').reverse().join('/') + ' ' + hhmm(min)); setTimeout(() => location.reload(), 600); };
  $('#pFijar').addEventListener('click', () => { const [h, m] = $('#pH').value.split(':').map(Number); fijar($('#pF').value, h * 60 + m); });
  app.querySelectorAll('[data-mas]').forEach(b => b.addEventListener('click', () => { const x = new Date(ahora().getTime() + +b.dataset.mas * 60000); fijar(x.toISOString().slice(0, 10), x.getUTCHours() * 60 + x.getUTCMinutes()); }));
  $('#pReal').addEventListener('click', () => { L.relojReal(); toast('Reloj real'); setTimeout(() => location.reload(), 600); });
  $('#pBorrar').addEventListener('click', () => { const h = hoja(`<h3>¿Borrar los datos de prueba?</h3><p>Se vuelve a crear el restaurante de ejemplo desde cero. Tu sesión se cierra.</p><button class="boton peligro bloque" data-si>Borrar y empezar de nuevo</button>`);
    h.el.querySelector('[data-si]').onclick = async () => { await L.borrarTodo(); try { Object.keys(localStorage).filter(k => k.startsWith('ma_')).forEach(k => localStorage.removeItem(k)); } catch (e){} location.reload(); }; });
}

$('#salir').addEventListener('click', () => { guardarSesion(null); S.ses = null; S.N = null; iniciar(); });
barraPrueba(); iniciar();
setInterval(async () => { if (!S.ses || S.tab !== 'noche' || document.visibilityState !== 'visible') return; try { if (await traerNoche()) refrescarNoche(); } catch (e){} }, 8000);
if (MODO_PRUEBA) alCambiarPrueba(async () => { if (S.ses && S.tab === 'noche'){ try { if (await traerNoche()) noche(); } catch (e){} } });
