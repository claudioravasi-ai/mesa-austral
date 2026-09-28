/* La tablet de la entrada: la noche en lista y en plano, y las acciones de un toque. */
import { $, $$, esc, api, hhmm, pesos, plano, leyenda, hoja, toast, sonar, fechaLarga, sumarDias, MODO_PRUEBA, barraPrueba, alCambiarPrueba } from './comun.js';
import { estadoMesa, personasEn, codigos, etiquetas, pillDe, deMesa } from './noche.js';
import { slug, sesionGuardada, guardarSesion, pantallaEntrada, habilitarTablet, tablet } from './acceso.js';

const app = $('#app');
const S = { ses:sesionGuardada(), N:null, fecha:null, ver:'lista', filtro:'todas', t:null, cant:null, cargadoEn:0, sel:null };
const puede = () => S.ses && S.ses.rol !== 'cocina';
const esJefe = () => S.ses && ['dueno', 'encargado'].includes(S.ses.rol);

async function cargar(forzar){
  if (!S.ses) return;
  try {
    const d = await api('GET', `/api/sala/noche?fecha=${S.fecha || ''}${!forzar && S.N ? '&v=' + S.N.version : ''}`, undefined, { token:S.ses.token });
    if (d.sin_cambios){ reloj(); return; }
    const nuevas = d.reservas.filter(r => r.canal === 'web' && ['confirmada', 'pendiente'].includes(r.estado)).length;
    if (S.cant != null && nuevas > S.cant && d.fecha === d.ahora.fecha){ sonar(); toast('Nueva reserva'); }
    S.cant = nuevas; S.N = d; S.fecha = d.fecha; S.cargadoEn = Date.now(); pintar();
  } catch (e){
    if (e.status === 401){ guardarSesion(null); S.ses = null; entrada(); return; }
    toast(e.message, 'mal');
  }
}
function ahoraMin(){ const N = S.N; return N ? N.ahora.min + Math.floor((Date.now() - S.cargadoEn) / 60000) : 0; }
function reloj(){ if (S.N) $('#reloj').textContent = hhmm(ahoraMin()); }
function entrada(){
  $('#salir').hidden = true; $('#quien').textContent = '';
  pantallaEntrada(app, { alEntrar:async r => {
    S.ses = r;
    if (r.rol === 'dueno' && !tablet()){
      const h = hoja(`<h3>¿Habilitar esta tablet?</h3><p>Así el equipo puede entrar con su PIN en este equipo, sin saber tu contraseña. Hacelo solo en la tablet del restaurante.</p><button class="boton pri bloque" data-si>Habilitar esta tablet</button><button class="boton bloque" data-no>Ahora no</button>`);
      h.el.querySelector('[data-si]').onclick = async () => { try { await habilitarTablet(r); toast('Tablet habilitada'); } catch (e){ toast(e.message, 'mal'); } h.cerrar(); };
      h.el.querySelector('[data-no]').onclick = () => h.cerrar();
    }
    iniciarSala();
  } });
}
function iniciarSala(){ $('#salir').hidden = false; $('#quien').textContent = `${S.ses.nombre} · ${S.ses.rol}`; cargar(true); }

function pintar(){
  const N = S.N, vivo = N.fecha === N.ahora.fecha, t = vivo ? ahoraMin() : (S.t ?? 1260);
  $('#nombreResto').textContent = N.resto.nombre; reloj();
  const rs = N.reservas.filter(r => r.estado !== 'cancelada');
  const pers = rs.filter(r => !['planton', 'cancelada_tarde'].includes(r.estado)).reduce((s, r) => s + r.pax, 0);
  const sinConf = rs.filter(r => r.estado === 'confirmada' && !r.confirmo).length;
  const filtros = { todas:() => true, llegar:r => ['confirmada', 'pendiente', 'ofrecida'].includes(r.estado), mesa:r => r.estado === 'sentada', fin:r => ['finalizada', 'planton', 'cancelada_tarde'].includes(r.estado) };
  const lista = rs.filter(filtros[S.filtro]);
  const cap = N.mesas.reduce((s, m) => s + m.cap_max, 0);
  app.innerHTML = `
    ${N.alerta_smn ? '<div class="aviso mal"><b>Alerta meteorológica marcada para hoy.</b> Los plantones de hoy no generan compromiso.</div>' : ''}
    <div class="barra-sala"><div class="fila-h"><button class="boton chico" data-dia="-1" aria-label="Día anterior">◀</button><b>${vivo ? 'Hoy' : fechaLarga(N.fecha)}</b>${vivo ? '' : '<button class="boton chico" data-dia="0">Hoy</button>'}<button class="boton chico" data-dia="1" aria-label="Día siguiente">▶</button></div>
      ${puede() ? '<div class="fila-h"><button class="boton pri chico" data-a="nueva">+ Reserva</button><button class="boton chico" data-a="puerta">+ Sin reserva</button><button class="boton chico" data-a="espera">+ Lista de espera</button></div>' : ''}</div>
    <div class="nums"><div class="num"><span>Reservas</span><b>${rs.filter(r => r.canal !== 'puerta').length}</b><small>${pers} personas</small></div>
      <div class="num ${sinConf ? 'warn' : 'ok'}"><span>Sin confirmar</span><b>${sinConf}</b><small>${sinConf ? 'la app les vuelve a escribir' : 'todas confirmaron'}</small></div>
      <div class="num"><span>En el salón ${vivo ? 'ahora' : 'a las ' + hhmm(t)}</span><b>${personasEn(N, t)}</b><small>de ${cap} lugares</small></div>
      <div class="num ${N.espera.length ? 'warn' : ''}"><span>Lista de espera</span><b>${N.espera.length}</b><small>${N.espera.filter(e => e.estado === 'ofrecida').length} con mesa ofrecida</small></div></div>
    <div class="solapas vista-sel" role="tablist"><button data-ver="lista" aria-selected="${S.ver === 'lista'}">Lista</button><button data-ver="plano" aria-selected="${S.ver === 'plano'}">Plano</button></div>
    <div class="sala" data-vista="${S.ver}">
      <div class="col lista-col">
        <div class="solapas" role="tablist">${[['todas', 'Todas'], ['llegar', 'Por llegar'], ['mesa', 'En la mesa'], ['fin', 'Terminadas']].map(([k, n]) => `<button data-filtro="${k}" aria-selected="${S.filtro === k}">${n}</button>`).join('')}</div>
        <div class="lista">${lista.length ? lista.map(r => { const [p, c] = pillDe(N, r);
          return `<button class="item ${['finalizada', 'planton', 'cancelada_tarde'].includes(r.estado) ? 'apagado' : ''}" data-r="${r.id}"><time>${hhmm(r.inicio)}</time><span><b>${esc(r.nombre)} · ${r.pax}</b><span class="d">${esc(codigos(N, r))}${r.estado === 'sentada' ? ' · se libera ' + hhmm(r.fin + N.resto.politica.limpieza) : ''}</span>${etiquetas(r)}</span><span class="pill ${c}">${esc(p)}</span></button>`; }).join('') : '<div class="vacio">No hay reservas acá.</div>'}</div>
        ${N.espera.length ? `<h3>Lista de espera</h3><div class="lista">${N.espera.map(e => `<div class="item"><time>${hhmm(e.desde)}</time><span><b>${esc(e.nombre)} · ${e.pax}</b><span class="d">${e.estado === 'ofrecida' ? 'Mesa ofrecida · vence ' + hhmm(Math.floor((e.oferta_vence - N.ahora.ms) / 60000) + N.ahora.min) : 'Esperando hasta las ' + hhmm(e.hasta)}${e.tel ? '' : ' · en la puerta'}</span></span>
          ${puede() ? `<span class="fila-h">${e.estado === 'ofrecida' ? `<button class="boton ok chico" data-esp="${e.id}" data-que="aceptar">Sentarlos</button>` : ''}<button class="boton chico" data-esp="${e.id}" data-que="quitar">Quitar</button></span>` : ''}</div>`).join('')}</div>` : ''}
        ${N.mensajes.length && puede() ? `<h3>Mensajes para mandar a mano</h3><p class="muted">WhatsApp está en modo manual: tocá Enviar, se abre WhatsApp con el mensaje escrito, y después marcalo como enviado.</p>
          <div class="lista">${N.mensajes.map(m => `<div class="msj-pend"><b>${esc(m.plantilla)} · +${esc(m.tel)}</b><p>${esc(m.texto || '')}</p><div class="fila-h"><a class="boton ok chico" href="https://wa.me/${esc(m.tel)}?text=${encodeURIComponent(m.texto || '')}" target="_blank" rel="noopener">Enviar por WhatsApp</a><button class="boton chico" data-enviado="${m.id}">Marcar enviado</button></div></div>`).join('')}</div>` : ''}
      </div>
      <div class="col plano-col"><div class="fila-h entre"><b>${vivo ? 'El salón ahora' : 'El salón a las'}</b>${vivo ? `<span class="muted">${hhmm(t)}</span>` : `<select id="horaPlano" aria-label="Hora del plano">${Array.from({ length:48 }, (_, i) => 720 + i * 15).map(m => `<option value="${m}" ${m === t ? 'selected' : ''}>${hhmm(m)}</option>`).join('')}</select>`}</div>
        <div class="plano-caja deslizable">${plano({ plano:N.resto.plano, mesas:N.mesas, sel:S.sel, estado:m => estadoMesa(N, m, t) })}</div><p class="desliza-aviso">← Deslizá para ver todo el salón →</p>
        ${leyenda(['libre', 'llega', 'ocupada', 'pronto', 'espera', 'ofrecida'])}<p class="muted" style="font-size:13px">La hora bajo una mesa ocupada es cuándo queda lista (con la limpieza); bajo una azul, cuándo llegan.</p></div>
    </div>`;
  $('#horaPlano')?.addEventListener('change', e => { S.t = +e.target.value; pintar(); });
}
function acciones(r){
  const N = S.N, vivo = N.fecha === N.ahora.fecha, [p, c] = pillDe(N, r), t = ahoraMin(), B = [];
  if (puede()){
    if (r.estado === 'confirmada'){ B.push(['sentar', 'Llegaron', 'ok']); if (!r.confirmo) B.push(['confirmo', 'Confirmó por teléfono']); B.push(['mover', 'Mover de mesa']); if (vivo && t >= r.inicio) B.push(['planton', 'No vinieron: plantón', 'peligro']); B.push(['cancelar', 'Cancelar (lo decide el restaurante)']); }
    if (r.estado === 'sentada'){ B.push(['cuenta', 'Pidieron la cuenta', 'pri']); B.push(['mas15', 'Se quedan 15 minutos más']); B.push(['mover', 'Mover de mesa']); if (r.credito) B.push(['usar_credito', `Usaron el crédito de ${pesos(r.credito)}`]); }
    if (r.estado === 'pendiente') B.push(['cancelar', 'Cancelar la reserva']);
    if (r.incidente && r.incidente.estado === 'pendiente' && esJefe()) B.push(['condonar', 'Condonar el compromiso']);
  }
  const h = hoja(`<h3>${esc(r.nombre)} · ${r.pax} ${r.pax === 1 ? 'persona' : 'personas'}</h3>
    <div class="fila-h"><span class="pill ${c}">${esc(p)}</span><span class="muted">${esc(r.codigo)} · ${hhmm(r.inicio)} a ${hhmm(r.fin)} · ${esc(codigos(N, r))}</span></div>${etiquetas(r)}
    ${r.tel && !r.tel.startsWith('anon') ? `<div class="fila-h"><a class="boton chico" href="https://wa.me/${esc(r.tel)}" target="_blank" rel="noopener">WhatsApp</a><a class="boton chico" href="tel:+${esc(r.tel)}">Llamar</a><span class="mono muted">+${esc(r.tel)}</span></div>` : ''}
    ${MODO_PRUEBA && r.prueba_link ? `<a class="boton chico" href="${esc(r.prueba_link)}#mensajes" target="_blank" rel="noopener">Ver su WhatsApp simulado (prueba)</a>` : ''}
    <div class="pila">${B.map(([a, n, cl]) => `<button class="boton bloque ${cl || ''}" data-acc="${a}">${n}</button>`).join('') || '<p class="muted">Sin acciones.</p>'}</div>`);
  h.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-acc]'); if (!b) return; const acc = b.dataset.acc;
    try {
      if (acc === 'condonar'){ await api('POST', '/api/dueno/incidente', { id:r.incidente.id }, { token:S.ses.token }); toast('Compromiso condonado. Queda registrado quién lo hizo.'); }
      else if (acc === 'mover'){
        const libres = N.mesas.filter(m => !r.mesas.includes(m.id) && m.cap_max >= r.pax);
        h.el.innerHTML = `<h3>Mover a ${esc(r.nombre)}</h3><p class="muted">Solo se puede si la mesa está libre en ese horario.</p><div class="chips">${libres.map(m => `<button class="chip" data-mesa-a="${esc(m.codigo)}">${esc(m.codigo)}<small>${m.cap_max} p.</small></button>`).join('')}</div>`;
        h.el.querySelectorAll('[data-mesa-a]').forEach(x => x.addEventListener('click', async () => { try { await api('POST', '/api/sala/accion', { reserva:r.id, accion:'mover', mesa:x.dataset.mesaA }, { token:S.ses.token }); h.cerrar(); toast('Listo: movida a la ' + x.dataset.mesaA); cargar(true); } catch (err){ toast(err.message, 'mal'); } }));
        return;
      }
      else { await api('POST', '/api/sala/accion', { reserva:r.id, accion:acc }, { token:S.ses.token });
        toast({ sentar:'Sentados. La mesa queda ocupada.', cuenta:'Mesa libre. Se avisa a quien la pidió y a la lista de espera.', mas15:'Listo: 15 minutos más. Si alguien sigue, se le avisa.', planton:'Plantón registrado. La mesa se ofrece a la lista de espera.', cancelar:'Reserva cancelada. Se le avisó al cliente.', confirmo:'Marcada como confirmada.', usar_credito:'Crédito usado.' }[acc] || 'Listo'); }
      h.cerrar(); cargar(true);
    } catch (err){ toast(err.message, 'mal'); }
  });
}
function mesaTocada(id){
  const N = S.N, vivo = N.fecha === N.ahora.fecha, t = vivo ? ahoraMin() : (S.t ?? 1260), m = N.mesas.find(x => x.id === id), e = estadoMesa(N, m, t);
  S.sel = id; pintar();
  if (e.r){ acciones(e.r); return; }
  const prox = deMesa(N, id).filter(r => r.inicio > t).sort((a, b) => a.inicio - b.inicio)[0];
  const h = hoja(`<h3>Mesa ${esc(m.codigo)} · ${m.cap_max} lugares</h3><p>${vivo ? 'Libre ahora.' : 'Libre a esa hora.'} ${prox ? `Próxima reserva: <b>${hhmm(prox.inicio)}</b>, ${esc(prox.nombre)} (${prox.pax}).` : 'Sin reservas el resto de la noche.'}</p>
    ${puede() && vivo ? `<div class="campo"><label for="wPax">Personas</label><select id="wPax">${Array.from({ length:m.cap_max }, (_, i) => i + 1).map(n => `<option ${n === Math.min(2, m.cap_max) ? 'selected' : ''}>${n}</option>`).join('')}</select></div><button class="boton ok bloque" data-sentar>Sentar gente sin reserva acá</button>` : ''}`,
    { alCerrar:() => { S.sel = null; pintar(); } });
  h.el.querySelector('[data-sentar]')?.addEventListener('click', async () => {
    try { const r = await api('POST', '/api/sala/reservas', { canal:'puerta', pax:+$('#wPax').value, mesa:m.codigo }, { token:S.ses.token }); h.cerrar(); toast('Sentados en la ' + m.codigo + (r.hasta ? ` · tienen la mesa hasta las ${r.hasta}` : '')); cargar(true); } catch (err){ toast(err.message, 'mal'); }
  });
}
function formNueva(puerta){
  const N = S.N, horas = Array.from({ length:48 }, (_, i) => 720 + i * 15);
  const h = hoja(`<h3>${puerta ? 'Sentar gente sin reserva' : 'Nueva reserva'}</h3>
    ${puerta ? '' : `<div class="campo"><label for="nFecha">Día</label><input id="nFecha" type="date" value="${N.fecha}" min="${N.ahora.fecha}"></div><div class="campo"><label for="nHora">Hora</label><select id="nHora">${horas.map(m => `<option value="${m}" ${m === 1260 ? 'selected' : ''}>${hhmm(m)}</option>`).join('')}</select></div>`}
    <div class="dos-col"><div class="campo"><label for="nPax">Personas</label><input id="nPax" type="number" min="1" max="40" value="2"></div><div class="campo"><label for="nMesa">Mesa (opcional)</label><select id="nMesa"><option value="">Que elija la app</option>${N.mesas.map(m => `<option>${esc(m.codigo)}</option>`).join('')}</select></div></div>
    <div class="campo"><label for="nNombre">Nombre</label><input id="nNombre"></div>
    ${puerta ? '' : '<div class="campo"><label for="nTel">Teléfono con WhatsApp (opcional)</label><input id="nTel" type="tel"><small>Si lo cargás, le llega la confirmación y el recordatorio.</small></div>'}
    <button class="boton pri bloque" data-ok>${puerta ? 'Sentarlos' : 'Guardar la reserva'}</button>`);
  h.el.querySelector('[data-ok]').addEventListener('click', async () => {
    try { const r = await api('POST', '/api/sala/reservas', puerta ? { canal:'puerta', pax:+$('#nPax').value, mesa:$('#nMesa').value, nombre:$('#nNombre').value }
      : { canal:'sala', fecha:$('#nFecha').value, inicio:+$('#nHora').value, pax:+$('#nPax').value, mesa:$('#nMesa').value, nombre:$('#nNombre').value, tel:$('#nTel').value }, { token:S.ses.token });
      h.cerrar(); toast(`Listo: mesa ${r.mesas.join(' + ')}${r.hasta ? ` · tienen la mesa hasta las ${r.hasta} (hay reserva después)` : ''}`); cargar(true); } catch (err){ toast(err.message, 'mal'); }
  });
}
function formEspera(){
  const h = hoja(`<h3>Anotar en la lista de espera</h3><p class="muted">Cuando se libere una mesa que les sirva, la app la ofrece sola: por WhatsApp si dejan teléfono, o te avisa acá para llamarlos en la puerta.</p>
    <div class="dos-col"><div class="campo"><label for="ePax">Personas</label><input id="ePax" type="number" min="1" max="40" value="2"></div><div class="campo"><label for="eMin">Esperan hasta</label><select id="eMin"><option value="30">30 minutos</option><option value="60" selected>1 hora</option><option value="120">2 horas</option></select></div></div>
    <div class="campo"><label for="eNom">Nombre</label><input id="eNom"></div><div class="campo"><label for="eTel">Teléfono (opcional)</label><input id="eTel" type="tel"></div>
    <button class="boton pri bloque" data-ok>Anotar</button>`);
  h.el.querySelector('[data-ok]').addEventListener('click', async () => {
    try { await api('POST', '/api/sala/espera', { pax:+$('#ePax').value, minutos:+$('#eMin').value, nombre:$('#eNom').value, tel:$('#eTel').value }, { token:S.ses.token }); h.cerrar(); toast('Anotados en la lista de espera'); cargar(true); } catch (err){ toast(err.message, 'mal'); }
  });
}
app.addEventListener('click', async e => {
  if (!S.N) return;
  const r = e.target.closest('[data-r]'); if (r){ acciones(S.N.reservas.find(x => x.id === Number(r.dataset.r))); return; }
  const m = e.target.closest('.mesa-g'); if (m){ mesaTocada(Number(m.dataset.mesa)); return; }
  const d = e.target.closest('[data-dia]'); if (d){ S.fecha = d.dataset.dia === '0' ? S.N.ahora.fecha : sumarDias(S.N.fecha, +d.dataset.dia); S.t = null; S.cant = null; cargar(true); return; }
  const f = e.target.closest('[data-filtro]'); if (f){ S.filtro = f.dataset.filtro; pintar(); return; }
  const v = e.target.closest('[data-ver]'); if (v){ S.ver = v.dataset.ver; pintar(); return; }
  const a = e.target.closest('[data-a]'); if (a){ if (a.dataset.a === 'espera') formEspera(); else formNueva(a.dataset.a === 'puerta'); return; }
  const es = e.target.closest('[data-esp]'); if (es){ try { await api('POST', `/api/sala/espera/${es.dataset.esp}/${es.dataset.que}`, {}, { token:S.ses.token }); toast(es.dataset.que === 'aceptar' ? 'Sentados' : 'Quitados de la lista'); cargar(true); } catch (err){ toast(err.message, 'mal'); } return; }
  const en = e.target.closest('[data-enviado]'); if (en){ try { await api('POST', `/api/sala/mensaje/${en.dataset.enviado}/enviado`, {}, { token:S.ses.token }); cargar(true); } catch (err){ toast(err.message, 'mal'); } }
});
app.addEventListener('keydown', e => { const m = e.target.closest?.('.mesa-g'); if (m && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); mesaTocada(Number(m.dataset.mesa)); } });
$('#salir').addEventListener('click', () => { guardarSesion(null); S.ses = null; S.N = null; entrada(); });
barraPrueba();
if (S.ses) iniciarSala(); else entrada();
setInterval(() => { if (S.ses && document.visibilityState === 'visible') cargar(); }, 5000);
setInterval(reloj, 15000);
if (MODO_PRUEBA) alCambiarPrueba(() => cargar());
