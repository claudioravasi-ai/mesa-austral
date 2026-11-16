/* Mi reserva: la ve quien tiene el enlace firmado del mensaje. */
import { $, esc, api, hhmm, pesos, fechaLarga, sumarDias, hoja, toast, MODO_PRUEBA, barraPrueba, alCambiarPrueba } from './comun.js';

const qs = new URLSearchParams(location.search), codigo = qs.get('c') || '', k = qs.get('k') || '';
const app = $('#app');
let R = null, msjs = [], cargando = false;
const ESTADOS = { confirmada:['Confirmada', 'ok'], pendiente:['Falta la seña', 'warn'], sentada:['En el restaurante', 'info'], finalizada:['Finalizada', ''], cancelada:['Cancelada', ''], cancelada_tarde:['Cancelada sobre la hora', 'warn'], planton:['No se presentó', 'mal'], ofrecida:['Ofrecida', 'lila'] };

async function cargar(){
  if (cargando) return; cargando = true;
  try {
    R = await api('GET', `/api/reserva/${codigo}?k=${encodeURIComponent(k)}`);
    if (MODO_PRUEBA) msjs = (await api('GET', `/api/reserva/${codigo}/mensajes?k=${encodeURIComponent(k)}`)).mensajes;
    pintar();
  } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; }
  cargando = false;
}
function pintar(){
  document.documentElement.dataset.estilo = R.resto.estilo || 'bosque';
  $('#nombreResto').textContent = R.resto.nombre; $('#subResto').textContent = 'Reserva ' + R.codigo; $('#logo').textContent = R.resto.nombre.replace(/^(el|la|los|las)\s+/i, '').slice(0, 1).toUpperCase();
  const [et, cl] = ESTADOS[R.estado] || [R.estado, ''], activa = R.estado === 'confirmada';
  const inc = R.incidente;
  app.innerHTML = `
    <div class="fila-h entre"><h1 class="disp" style="font-size:clamp(40px,8vw,64px)">${activa ? '¡Te esperamos!' : 'Tu reserva'}</h1><span class="pill ${cl}">${et}</span></div>
    <div class="sombra-ticket"><div class="ticket"><div class="cod">${esc(R.codigo)}</div>
      <div class="l"><span>Día</span><b>${fechaLarga(R.fecha)}</b></div><div class="l"><span>Hora</span><b>${R.hora}</b></div>
      <div class="l"><span>Personas</span><b>${R.pax}</b></div><div class="l"><span>Mesa</span><b>${esc(R.mesas.join(' + '))}${R.zona ? ' · ' + esc(R.zona) : ''}</b></div>
      ${R.ocasion ? `<div class="l"><span>Ocasión</span><b>${esc(R.ocasion)}</b></div>` : ''}${R.sena ? `<div class="l"><span>Seña pagada</span><b>${pesos(R.sena)}</b></div>` : ''}</div></div>
    ${R.al_liberarse && activa ? `<div class="aviso info">Pediste esta mesa para cuando se libere. Si queda lista antes, te avisamos por WhatsApp.</div>` : ''}
    ${R.pago_sena ? `<div class="aviso warn">Para confirmar la reserva falta la seña de <b>${pesos(R.pago_sena.monto)}</b>. Se descuenta de la cuenta.</div><a class="boton pri bloque" href="${esc(R.pago_sena.enlace)}">Pagar la seña</a>` : ''}
    ${inc && inc.estado === 'pendiente' ? `<div class="aviso warn">Quedó un compromiso de <b>${pesos(inc.monto)}</b> por ${inc.tipo === 'planton' ? 'no venir' : 'cancelar sobre la hora'}.${R.politica.credito ? ` Si lo pagás y volvés en ${R.politica.dias} días, se descuenta de tu cuenta.` : ''} Si no lo pagás, tu próxima reserva online pide seña.</div>${inc.pago ? `<a class="boton pri bloque" href="${esc(inc.pago)}">Pagar el compromiso</a>` : ''}` : ''}
    ${inc && inc.estado === 'pagado' ? `<div class="aviso ok">Compromiso pagado. ¡Gracias!</div>` : ''}${inc && inc.estado === 'exento' ? `<div class="aviso ok">Había alerta meteorológica: no hay ningún cargo.</div>` : ''}${inc && inc.estado === 'condonado' ? `<div class="aviso ok">El restaurante dejó sin efecto el compromiso.</div>` : ''}
    ${R.credito ? `<div class="aviso ok">Tenés un crédito de <b>${pesos(R.credito.monto)}</b> para usar antes del ${R.credito.vence.split('-').reverse().join('/')}. Se descuenta de tu próxima cuenta.</div>` : ''}
    ${activa ? `<div class="aviso ${R.a_tiempo ? 'ok' : 'warn'}">${R.a_tiempo ? `Podés cancelar sin cargo hasta las <b>${R.sin_cargo_hasta}</b>.` : `Ya pasó el horario para cancelar sin cargo (${R.sin_cargo_hasta}). Si no pueden venir, avisanos igual: la mesa se le ofrece a otra persona.`} Te guardamos la mesa ${R.politica.tolerancia} minutos después de la hora.</div>
      <button class="boton bloque" data-a="tarde">Llegamos un poco tarde</button><button class="boton bloque" data-a="cambiar">Cambiar día, hora o personas</button><button class="boton bloque" data-a="cancelar">Cancelar la reserva</button>` : ''}
    ${MODO_PRUEBA ? bandeja() : ''}
    <details class="tarjeta plana"><summary><b>Tus datos</b></summary><p class="muted" style="margin-top:8px">${esc(R.resto.nombre)} usa tu nombre y tu teléfono solo para gestionar tus reservas. Las alergias se borran 7 días después de la visita. Podés pedir que borremos tus datos: la reserva queda a nombre de «Anónimo».</p>
      <div class="fila-h" style="margin-top:10px"><button class="boton peligro chico" data-a="borrar">Borrar mis datos</button><a class="boton chico" href="privacidad.html?r=${esc(R.resto.slug)}">Privacidad y condiciones</a></div></details>
    ${R.resto.whatsapp ? `<p class="muted">¿Consultas? WhatsApp del restaurante: <span class="mono">+${esc(R.resto.whatsapp)}</span></p>` : ''}`;
  if (location.hash === '#mensajes'){ const c = $('#mensajes'); if (c) c.scrollIntoView({ block:'start' }); history.replaceState(null, '', location.pathname + location.search); }
}
function bandeja(){
  const hora = ms => new Date(ms - 180 * 60000).toISOString().slice(11, 16);
  const cuerpo = msjs.length ? msjs.map(m => { const b = JSON.parse(m.botones || '[]');
    const txt = m.texto ? esc(m.texto).replace(/(\.?\/?mi\.html\?[^\s<]+|\.?\/?pago\.html\?[^\s<]+|https?:\/\/[^\s<]+)/g, u => `<a href="${u.replace(/&amp;/g, '&')}">${u.length > 38 ? u.slice(0, 36) + '…' : u}</a>`) : '<i>(mensaje borrado)</i>';
    return `<div class="msj">${txt}<time>${hora(m.creado)}${m.estado === 'pendiente' ? ' · para enviar a mano' : ''}</time></div>` + (m.respuesta ? `<div class="msj mio">${esc(b.find(x => x.id === m.respuesta)?.texto || m.respuesta)}<time>✓✓</time></div>` :
      b.length && m.vigente ? `<div class="msj-btns">${b.map(x => `<button data-resp="${m.id}" data-boton="${x.id}">${esc(x.texto)}</button>`).join('')}</div>` : ''); }).join('') : '<div class="msj">Todavía no hay mensajes.</div>';
  return `<section id="mensajes" class="pila"><div class="chat-cab"><span class="logo" style="width:34px;height:34px;font-size:18px">${esc(R.resto.nombre.slice(0, 1))}</span><div><b>${esc(R.resto.nombre)}</b><small>WhatsApp simulado · modo prueba</small></div></div>
    <div class="chat">${cuerpo}</div><p class="muted" style="font-size:13px">En la app real estos mensajes llegan al WhatsApp del cliente. Acá se ven para probar los botones.</p></section>`;
}
async function cancelarFlujo(confirmaTarde = false){
  try {
    const r = await api('POST', `/api/reserva/${codigo}/cancelar`, { k, confirma_tarde:confirmaTarde });
    toast(r.tarde ? 'Cancelaste. Te mandamos el detalle del compromiso.' : 'Reserva cancelada sin cargo. ¡Gracias por avisar!'); cargar();
  } catch (e){
    if (e.datos?.tarde){
      const h = hoja(`<h3>Cancelar sobre la hora</h3><p>La mesa estaba preparada para ustedes y se les dijo que no a otras personas. Por eso queda un compromiso de <b>${pesos(e.datos.monto)}</b>.${e.datos.credito ? ` Si lo pagás y volvés en ${e.datos.dias} días, se descuenta de tu cuenta.` : ''}</p>
        <div class="aviso">¿Te sirve mejor avisar que llegan más tarde o cambiar la hora? Es sin cargo si hay lugar.</div>
        <button class="boton peligro bloque" data-si>Cancelar igual</button><button class="boton bloque" data-cambiar>Mejor cambio la hora</button><button class="boton bloque" data-no>Mejor vamos</button>`);
      h.el.querySelector('[data-si]').onclick = () => { h.cerrar(); cancelarFlujo(true); };
      h.el.querySelector('[data-cambiar]').onclick = () => { h.cerrar(); cambiar(); };
      h.el.querySelector('[data-no]').onclick = () => { h.cerrar(); toast('¡Buenísimo! Tu reserva sigue en pie.'); };
    } else toast(e.message, 'mal');
  }
}
async function cambiar(){
  const dias = []; for (let i = 0; i < 21; i++) dias.push(sumarDias(R.hoy, i));
  const h = hoja(`<h3>Cambiar la reserva</h3><div class="campo"><label for="cFecha">Día</label><select id="cFecha">${dias.map(f => `<option value="${f}" ${f === R.fecha ? 'selected' : ''}>${fechaLarga(f)}</option>`).join('')}</select></div>
    <div class="campo"><label for="cPax">Personas</label><select id="cPax">${Array.from({ length:12 }, (_, i) => i + 1).map(n => `<option ${n === R.pax ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="campo"><label for="cHora">Hora</label><select id="cHora"><option>…</option></select></div><button class="boton pri bloque" data-guardar>Guardar el cambio</button>`);
  const slug = R.resto.slug;
  const horas = async () => { const hs = await api('GET', `/api/r/${slug}/horarios?fecha=${$('#cFecha').value}&pax=${$('#cPax').value}`);
    $('#cHora').innerHTML = hs.horarios.length ? hs.horarios.map(x => `<option value="${x.min}" ${x.libre ? '' : 'disabled'} ${x.min === R.inicio ? 'selected' : ''}>${x.hora}${x.libre ? '' : ' (completo)'}</option>`).join('') : '<option value="">Cerrado</option>'; };
  $('#cFecha').onchange = horas; $('#cPax').onchange = horas; await horas();
  h.el.querySelector('[data-guardar]').onclick = async () => {
    if (!$('#cHora').value){ toast('Elegí otro día', 'mal'); return; }
    try { await api('POST', `/api/reserva/${codigo}/cambiar`, { k, fecha:$('#cFecha').value, inicio:+$('#cHora').value, pax:+$('#cPax').value }); h.cerrar(); toast('Listo: reserva cambiada. Te llega la nueva confirmación.'); cargar(); }
    catch (e){ toast(e.message, 'mal'); }
  };
}
app.addEventListener('click', async e => {
  const a = e.target.closest('[data-a]');
  if (a){
    if (a.dataset.a === 'cancelar') cancelarFlujo();
    if (a.dataset.a === 'cambiar') cambiar();
    if (a.dataset.a === 'tarde'){ try { await api('POST', `/api/reserva/${codigo}/tarde`, { k }); toast('Le avisamos a la sala: te guardan la mesa 15 minutos más.'); cargar(); } catch (err){ toast(err.message, 'mal'); } }
    if (a.dataset.a === 'borrar'){ const h = hoja(`<h3>¿Borrar tus datos?</h3><p>Se borran tu nombre, tu teléfono, tu correo y las alergias. Las reservas quedan a nombre de «Anónimo» y ya no vas a recibir mensajes.</p><button class="boton peligro bloque" data-si>Borrar mis datos</button>`);
      h.el.querySelector('[data-si]').onclick = async () => { try { await api('POST', `/api/reserva/${codigo}/borrar-datos`, { k }); h.cerrar(); toast('Listo: borramos tus datos.'); cargar(); } catch (err){ toast(err.message, 'mal'); } }; }
    return;
  }
  const r = e.target.closest('[data-resp]');
  if (r){
    r.disabled = true;
    try { const res = await api('POST', `/api/reserva/${codigo}/responder`, { k, mensaje:+r.dataset.resp, boton:r.dataset.boton });
      if (res.abrir === 'cancelar') cancelarFlujo(); else if (res.abrir === 'cambiar') cambiar(); else if (res.abrir === 'pago' && res.enlace) location.href = res.enlace; else if (res.texto) toast(res.texto); else if (res.tarde) toast('Cancelaste. Te mandamos el detalle del compromiso.');
      cargar(); } catch (err){ toast(err.message, 'mal'); r.disabled = false; }
  }
});
barraPrueba(); cargar();
if (MODO_PRUEBA){ alCambiarPrueba(() => cargar()); setInterval(cargar, 10000); }
