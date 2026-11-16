/* Página del restaurante para el cliente: portada, carta en marquesina y la reserva en cuatro pasos. */
import { $, $$, esc, api, hhmm, pesos, plano, fechaLarga, sumarDias, hoja, toast, ls, CONFIG, MODO_PRUEBA, barraPrueba } from './comun.js';

const T = {
  es:{ estilo:'Estilo', cta:'Reservar una mesa', hoy_abre:'Hoy', reservas_hasta:'Reservas', reservas:'Reservas online', titulo_h2:'Tu mesa, en el plano.', sub_h2:'Elegí el día, cuántos van y dónde sentarte. Si la mesa que te gusta está ocupada, te decimos a qué hora se libera y la podés pedir para ese momento.',
    hecho:'Reservas con Mesa Austral', desliza:'← Deslizá para ver todo el salón →', ver_priv:'Privacidad y condiciones', cerrado_hoy:'Cerrado', dias_ant:'hasta {n} días antes', que_dia:'¿Qué día?', cuantos:'¿Cuántos van?', a_que_hora:'¿A qué hora?', hoy:'Hoy', manana:'Mañana', persona:'persona', personas:'personas',
    cerrado:'Ese día está cerrado.', sin_horas:'No quedan horarios para ese grupo ese día.', espera_btn:'Anotarme en la lista de espera', ver_mesas:'Ver el salón', dura:'Una mesa para {n} dura unos {d} minutos.',
    grupo:'Para grupos de {n} o más pedimos una seña de {s} por persona, que se descuenta de la cuenta.', paso_cuando:'Cuándo', paso_mesa:'Mesa', paso_datos:'Datos', paso_listo:'Listo', elegi_tu_mesa:'Elegí tu mesa', tus_datos:'Tus datos',
    elegi_mesa:'Tocá una mesa libre. Si una ocupada muestra una hora, es cuándo queda lista: la podés pedir para ese momento.', elegir:'Reservar la mesa {m}', auto:'Que la elija el restaurante', cambiar:'Cambiar',
    ocupada_t:'La mesa {m} está ocupada', ocupada_p:'Según el tiempo que lleva, se libera y queda lista a las {h} (incluye la limpieza). Te la guardamos para esa hora; si se libera antes, te avisamos.', pedir:'Pedirla para las {h}', no_sirve:'La mesa {m} es para {c} personas.',
    sin_libre:'La {m} no se libera a tiempo esta noche.', combo:'Para tu grupo juntamos las mesas {m}.', nombre:'Nombre y apellido', tel:'Teléfono con WhatsApp', tel_ayuda:'Con código de área. Te llega la confirmación y el recordatorio.', correo:'Correo (opcional)',
    ocasion:'¿Es una ocasión especial?', cumple:'Cumpleaños', aniversario:'Aniversario', trabajo:'Trabajo', alergias:'Alergias o intolerancias (opcional)', alergias_ph:'Por ejemplo: celiaquía, mariscos',
    alergias_ok:'Acepto que el restaurante use este dato de salud solo para esta visita. Se borra a los 7 días.', notas:'Algo más que debamos saber (opcional)', promos:'Quiero recibir novedades del restaurante (opcional)',
    acepto:'Leí y acepto las condiciones. Mis datos se usan solo para esta reserva.', confirmar:'Confirmar la reserva', confirmando:'Confirmando…', listo:'¡Te esperamos!', pendiente:'Falta la seña',
    pagar_sena:'Pagar la seña de {m}', te_llega:'Te mandamos la confirmación por WhatsApp.', ver_reserva:'Ver o cambiar mi reserva', ver_wa:'Ver el WhatsApp simulado', otra:'Hacer otra reserva',
    pol:'Podés cancelar sin cargo hasta las <b>{h}</b>. Si cancelás después o no venís, queda un compromiso de <b>{m} por persona</b>{c}.', pol_c:', que te devolvemos como crédito si volvés en {d} días', pol_ya:'Como reservás con poca anticipación, tenés 15 minutos para cancelar sin cargo.',
    tol:'Te guardamos la mesa {t} minutos después de la hora.', mesa:'Mesa', dia_l:'Día', hora_l:'Hora', personas_l:'Personas', desde:'lista a las', espera_t:'Lista de espera', espera_p:'Si se libera una mesa entre esas horas, te escribimos por WhatsApp y tenés 10 minutos para aceptarla.',
    entre:'Entre las', y:'y las', anotarme:'Anotarme', anotado:'Listo: estás en la lista. Te avisamos por WhatsApp.', privacidad:'Tus datos los usa solo el restaurante para gestionar tu reserva (Ley 25.326). Podés verlos o borrarlos desde el enlace de tu reserva.',
    escribinos:'WhatsApp {w}', falta:'Completá tu nombre y tu teléfono', falta_ok:'Tildá «Leí y acepto» para confirmar', leg_libre:'Libre', leg_ocupada:'Ocupada (hora en que queda lista)', leg_no:'No es para tu grupo', leg_tuya:'Tu mesa' },
  en:{ estilo:'Style', cta:'Book a table', hoy_abre:'Today', reservas_hasta:'Bookings', reservas:'Online booking', titulo_h2:'Your table, on the floor plan.', sub_h2:"Pick the day, how many of you, and where to sit. If the table you like is taken, we'll tell you when it frees up and you can request it for then.",
    hecho:'Bookings by Mesa Austral', desliza:'← Swipe to see the whole room →', ver_priv:'Privacy and terms', cerrado_hoy:'Closed', dias_ant:'up to {n} days ahead', que_dia:'Which day?', cuantos:'How many?', a_que_hora:'What time?', hoy:'Today', manana:'Tomorrow', persona:'person', personas:'people',
    cerrado:'Closed that day.', sin_horas:'No times left for that group that day.', espera_btn:'Join the waitlist', ver_mesas:'See the room', dura:'A table for {n} lasts about {d} minutes.',
    grupo:'Groups of {n} or more leave a {s} per person deposit, deducted from the bill.', paso_cuando:'When', paso_mesa:'Table', paso_datos:'Details', paso_listo:'Done', elegi_tu_mesa:'Choose your table', tus_datos:'Your details',
    elegi_mesa:'Tap a free table. A time under a taken table is when it will be ready: you can request it for then.', elegir:'Book table {m}', auto:'Let the restaurant choose', cambiar:'Change',
    ocupada_t:'Table {m} is taken', ocupada_p:"Based on how long it's been in use, it will be ready at {h} (cleaning included). We'll hold it for you; if it frees up earlier, we'll let you know.", pedir:'Request it for {h}', no_sirve:'Table {m} seats {c}.',
    sin_libre:"Table {m} won't be free in time tonight.", combo:'For your group we join tables {m}.', nombre:'Full name', tel:'WhatsApp number', tel_ayuda:"With country and area code. You'll get the confirmation and a reminder.", correo:'Email (optional)',
    ocasion:'Special occasion?', cumple:'Birthday', aniversario:'Anniversary', trabajo:'Business', alergias:'Allergies (optional)', alergias_ph:'e.g. gluten, shellfish', alergias_ok:'I agree the restaurant uses this health data only for this visit. It is deleted after 7 days.',
    notas:'Anything else? (optional)', promos:'Send me news from the restaurant (optional)', acepto:'I have read and accept the conditions. My data is used only for this booking.', confirmar:'Confirm booking', confirmando:'Confirming…', listo:'See you soon!', pendiente:'Deposit pending',
    pagar_sena:'Pay the {m} deposit', te_llega:"We've sent the confirmation by WhatsApp.", ver_reserva:'View or change my booking', ver_wa:'See the simulated WhatsApp', otra:'Make another booking',
    pol:'Free cancellation until <b>{h}</b>. Late cancellations or no-shows carry a <b>{m} per person</b> commitment{c}.', pol_c:', refunded as credit if you come back within {d} days', pol_ya:'Booking at short notice: you have 15 minutes to cancel for free.',
    tol:'We hold the table for {t} minutes.', mesa:'Table', dia_l:'Day', hora_l:'Time', personas_l:'People', desde:'ready at', espera_t:'Waitlist', espera_p:"If a table opens up in that window, we'll message you on WhatsApp and you'll have 10 minutes to accept.",
    entre:'Between', y:'and', anotarme:'Join', anotado:"You're on the list. We'll message you.", privacidad:'Your data is used only by the restaurant to manage your booking.', escribinos:'WhatsApp {w}', falta:'Enter your name and phone', falta_ok:'Tick the box to accept the conditions',
    leg_libre:'Free', leg_ocupada:'Taken (time it will be ready)', leg_no:'Not for your group', leg_tuya:'Your table' },
  pt:{ estilo:'Estilo', cta:'Reservar uma mesa', hoy_abre:'Hoje', reservas_hasta:'Reservas', reservas:'Reservas online', titulo_h2:'Sua mesa, na planta.', sub_h2:'Escolha o dia, quantas pessoas e onde sentar. Se a mesa que você quer está ocupada, dizemos a que horas libera e você pode pedi-la para esse momento.',
    hecho:'Reservas com Mesa Austral', desliza:'← Deslize para ver todo o salão →', ver_priv:'Privacidade e condições', cerrado_hoy:'Fechado', dias_ant:'até {n} dias antes', que_dia:'Que dia?', cuantos:'Quantas pessoas?', a_que_hora:'Que horas?', hoy:'Hoje', manana:'Amanhã', persona:'pessoa', personas:'pessoas',
    cerrado:'Fechado nesse dia.', sin_horas:'Não há horários para esse grupo nesse dia.', espera_btn:'Entrar na lista de espera', ver_mesas:'Ver o salão', dura:'Uma mesa para {n} dura uns {d} minutos.',
    grupo:'Para grupos de {n} ou mais pedimos um sinal de {s} por pessoa, descontado da conta.', paso_cuando:'Quando', paso_mesa:'Mesa', paso_datos:'Dados', paso_listo:'Pronto', elegi_tu_mesa:'Escolha sua mesa', tus_datos:'Seus dados',
    elegi_mesa:'Toque uma mesa livre. O horário sob uma mesa ocupada é quando fica pronta: você pode pedi-la para esse momento.', elegir:'Reservar a mesa {m}', auto:'O restaurante escolhe', cambiar:'Mudar',
    ocupada_t:'A mesa {m} está ocupada', ocupada_p:'Pelo tempo de uso, fica pronta às {h} (com a limpeza). Guardamos para você; se liberar antes, avisamos.', pedir:'Pedir para às {h}', no_sirve:'A mesa {m} é para {c} pessoas.',
    sin_libre:'A mesa {m} não fica livre a tempo hoje.', combo:'Para o seu grupo juntamos as mesas {m}.', nombre:'Nome completo', tel:'Telefone com WhatsApp', tel_ayuda:'Com código do país e DDD. Você recebe a confirmação e um lembrete.', correo:'E-mail (opcional)',
    ocasion:'Ocasião especial?', cumple:'Aniversário', aniversario:'Bodas', trabajo:'Trabalho', alergias:'Alergias (opcional)', alergias_ph:'Ex.: glúten, frutos do mar', alergias_ok:'Aceito que o restaurante use este dado de saúde só nesta visita. É apagado em 7 dias.',
    notas:'Algo mais? (opcional)', promos:'Quero receber novidades (opcional)', acepto:'Li e aceito as condições. Meus dados são usados só para esta reserva.', confirmar:'Confirmar reserva', confirmando:'Confirmando…', listo:'Esperamos você!', pendiente:'Falta o sinal',
    pagar_sena:'Pagar o sinal de {m}', te_llega:'Enviamos a confirmação pelo WhatsApp.', ver_reserva:'Ver ou mudar minha reserva', ver_wa:'Ver o WhatsApp simulado', otra:'Fazer outra reserva',
    pol:'Cancelamento sem custo até <b>{h}</b>. Depois disso, ou se não vier, fica um compromisso de <b>{m} por pessoa</b>{c}.', pol_c:', devolvido como crédito se voltar em {d} dias', pol_ya:'Reserva em cima da hora: você tem 15 minutos para cancelar sem custo.',
    tol:'Guardamos a mesa por {t} minutos.', mesa:'Mesa', dia_l:'Dia', hora_l:'Horário', personas_l:'Pessoas', desde:'pronta às', espera_t:'Lista de espera', espera_p:'Se uma mesa liberar nesse intervalo, escrevemos pelo WhatsApp e você tem 10 minutos para aceitar.',
    entre:'Entre', y:'e', anotarme:'Entrar', anotado:'Pronto: você está na lista.', privacidad:'Seus dados são usados só pelo restaurante para a sua reserva.', escribinos:'WhatsApp {w}', falta:'Preencha nome e telefone', falta_ok:'Marque a caixa para aceitar',
    leg_libre:'Livre', leg_ocupada:'Ocupada (hora em que fica pronta)', leg_no:'Não é para o seu grupo', leg_tuya:'Sua mesa' },
};
const slug = new URLSearchParams(location.search).get('r') || CONFIG.RESTO;
let L = ls.get('idioma') || (navigator.language || 'es').slice(0, 2); if (!T[L]) L = 'es';
const t = (k, v = {}) => (T[L][k] || T.es[k] || k).replace(/\{(\w+)\}/g, (_, x) => v[x] ?? '');
const S = { paso:'cuando', info:null, fecha:null, pax:2, inicio:null, horarios:null, plano:null, mesa:null, al_liberarse:false, datos:{ nombre:'', tel:'', email:'', ocasion:'', alergias:'', alergias_ok:false, notas:'', promos:false, acepto:false }, idem:null, res:null };
const app = $('#app');
const ROM = ['I', 'II', 'III', 'IV', 'V'];
const FONDO = { bosque:'#16211A', canal:'#0E0A24', bistro:'#FFF4E8', palermo:'#04241C', galeria:'#F4F1FF' };
const COLS = { libre:{ f:'var(--e-acc)', t:'var(--e-acc-ink)' }, elegida:{ f:'var(--e-ink)', t:'var(--e-bg)' }, ocupada:{ f:'var(--e-ocupada)', t:'var(--e-ocupada-t)', nota:'var(--e-nota-t)' }, no:{ f:'transparent', t:'var(--e-muted)', b:'var(--e-line-2)' } };
const telLindo = n => n ? '+' + n.replace(/^(\d{2})(\d)(\d{4})(\d{6})$/, '$1 $2 $3 $4') : '';

/* ---------- estilo ---------- */
function ponerEstilo(e, guardar){
  if (!FONDO[e]) e = 'bosque';
  document.documentElement.dataset.estilo = e; $('meta[name="theme-color"]').content = FONDO[e];
  $$('.estilos [data-estilo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.estilo === e));
  if (guardar) ls.set('estilo:' + slug, e);
}
$$('.estilos [data-estilo]').forEach(b => b.addEventListener('click', () => ponerEstilo(b.dataset.estilo, true)));

/* ---------- datos del restaurante ---------- */
async function iniciar(){
  await barraPrueba();
  try { S.info = await api('GET', `/api/r/${slug}`); } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const I = S.info, pg = I.pagina || {};
  ponerEstilo(ls.get('estilo:' + slug) || pg.estilo || 'bosque');
  document.title = I.nombre + ' · ' + t('reservas');
  const partes = I.nombre.split(' '), primera = partes.shift();
  $('#nombreResto').innerHTML = `<span>${esc(primera)}</span>${partes.length ? `<em>${esc(partes.join(' '))}</em>` : ''}`;
  $('#marca').textContent = I.nombre; $('#monograma').textContent = I.nombre.replace(/^(el|la|los|las)\s+/i, '').slice(0, 1).toUpperCase();
  $('#lema').textContent = pg.lema || I.subtitulo || '';
  const platos = (pg.destacados && pg.destacados.length ? pg.destacados : [I.subtitulo || I.nombre]).map(esc);
  $('#pista').innerHTML = [...platos, ...platos].map(p => `<span>${p}</span><i>✦</i>`).join('');
  S.fecha = primerDiaAbierto(I.hoy);
  pintarFijos(); pintar(); cargarHorarios(); pintarSecciones(); traerClima();
}
function turnosDe(f){ const d = String(new Date(f + 'T12:00:00Z').getUTCDay()); return S.info.turnos.filter(x => x.dias.includes(d)); }
function abierto(f){ return turnosDe(f).length && !S.info.cierres.some(c => c.fecha === f); }
function primerDiaAbierto(desde){ for (let i = 0; i < 14; i++){ const f = sumarDias(desde, i); if (abierto(f)) return f; } return desde; }
function pintarFijos(){
  const I = S.info, tu = abierto(I.hoy) ? turnosDe(I.hoy) : [];
  $('#horarioHoy').textContent = tu.length ? tu.map(x => `${hhmm(x.desde)}–${hhmm(x.hasta + 60)}`).join(' · ') : t('cerrado_hoy');
  $('#anticipa').textContent = t('dias_ant', { n:I.politica.anticipacion });
  $$('[data-t]').forEach(e => e.textContent = t(e.dataset.t));
  $$('.idiomas button').forEach(b => b.setAttribute('aria-pressed', b.dataset.l === L)); document.documentElement.lang = L;
  $('#pieWa').textContent = I.whatsapp ? t('escribinos', { w:telLindo(I.whatsapp) }) : '';
}
async function cargarHorarios(){
  S.horarios = null; pintar();
  try { S.horarios = await api('GET', `/api/r/${slug}/horarios?fecha=${S.fecha}&pax=${S.pax}`); } catch (e){ S.horarios = { error:e.message, horarios:[] }; }
  if (S.inicio != null && !S.horarios.horarios.some(h => h.min === S.inicio && h.libre)) S.inicio = null;
  if (S.inicio == null){ const h = S.horarios.horarios.find(h => h.libre); if (h) S.inicio = h.min; }
  pintar();
}

/* ---------- vistas ---------- */
function politica(inicio){ const P = S.info.politica, lim = inicio - P.horas * 60, ya = S.fecha === S.info.hoy && lim < S.info.ahora + 1;
  return (ya ? t('pol_ya') + ' ' : '') + t('pol', { h:hhmm(ya ? S.info.ahora + 15 : lim), m:pesos(P.monto), c:P.credito ? t('pol_c', { d:P.dias }) : '' }); }
const pregunta = (n, titulo, cuerpo) => `<div class="pregunta"><h3><span class="rom">${ROM[n]}</span>${titulo}</h3>${cuerpo}</div>`;
function vistaCuando(){
  const I = S.info, P = I.politica, dias = [];
  for (let i = 0; i < Math.min(P.anticipacion, 21); i++){ const f = sumarDias(I.hoy, i), d = new Date(f + 'T12:00:00Z');
    const nom = i === 0 ? t('hoy') : i === 1 ? t('manana') : d.toLocaleDateString({ es:'es-AR', en:'en-GB', pt:'pt-BR' }[L], { weekday:'short', timeZone:'UTC' }).replace('.', '');
    dias.push(`<button class="dia" data-dia="${f}" aria-pressed="${f === S.fecha}" ${abierto(f) ? '' : 'disabled'}><small>${esc(nom)}</small><b>${d.getUTCDate()}</b></button>`); }
  const H = S.horarios; let horas = '<div class="muted">…</div>';
  if (H && H.cerrado) horas = `<div class="aviso">${t('cerrado')}</div>`;
  else if (H && H.error) horas = `<div class="aviso mal">${esc(H.error)}</div>`;
  else if (H){ horas = H.horarios.length ? `<div class="horas">${H.horarios.map(h => `<button class="chip ${h.min === S.inicio ? 'on' : ''}" data-hora="${h.min}" ${h.libre ? '' : 'disabled'}>${h.hora}</button>`).join('')}</div>` : '';
    if (!H.horarios.some(h => h.libre)) horas += `<div class="aviso">${t('sin_horas')}</div><button class="boton" data-accion="espera">${t('espera_btn')}</button>`; }
  return pregunta(0, t('que_dia'), `<div class="dias">${dias.join('')}</div>`)
    + pregunta(1, t('cuantos'), `<div class="personas"><button data-pax="-1" aria-label="−1">−</button><b>${S.pax}</b><button data-pax="1" aria-label="+1">+</button><span>${S.pax === 1 ? t('persona') : t('personas')}</span></div>${S.pax >= P.grupo_desde ? `<div class="aviso warn">${t('grupo', { n:P.grupo_desde, s:pesos(P.sena) })}</div>` : ''}`)
    + pregunta(2, t('a_que_hora'), horas + `<p class="muted" style="font-size:14px">${t('dura', { n:S.pax, d:S.pax <= 2 ? 90 : S.pax <= 4 ? 105 : 120 })}</p>`)
    + `<button class="boton pri bloque" data-accion="ver-mesas" ${S.inicio == null ? 'disabled' : ''}>${t('ver_mesas')} →</button>`;
}
function vistaMesa(){
  const Pl = S.plano;
  if (!Pl) return pregunta(3, t('elegi_tu_mesa'), '<div class="muted">…</div>');
  const svg = plano({ plano:Pl.plano, mesas:Pl.mesas, sel:S.mesa, colores:COLS, estado:m => m.id === S.mesa ? { c:'elegida' } : m.estado === 'libre' ? { c:'libre' } : m.estado === 'no' ? { c:'no' } : { c:'ocupada', nota:m.desde_hora || '', aria:m.desde_hora ? t('desde') + ' ' + m.desde_hora : '' } });
  const m = Pl.mesas.find(x => x.id === S.mesa);
  const combo = !Pl.mesas.some(x => x.estado === 'libre') && Pl.combos.length ? `<div class="aviso">${t('combo', { m:Pl.combos[0].codigos.join(' + ') })}</div>` : '';
  const ley = [['libre', 'leg_libre'], ['ocupada', 'leg_ocupada'], ['no', 'leg_no'], ['elegida', 'leg_tuya']].map(([k, n]) => `<span><i style="background:${COLS[k].f};${COLS[k].b ? 'box-shadow:inset 0 0 0 1.5px ' + COLS[k].b : ''}"></i>${t(n)}</span>`).join('');
  return pregunta(3, t('elegi_tu_mesa'), `<div class="resumen"><b>${fechaLarga(S.fecha, L)} · ${hhmm(S.inicio)} · ${S.pax}</b><button class="boton chico" data-accion="volver-cuando">${t('cambiar')}</button></div>
    <p class="muted">${t('elegi_mesa')}</p><div class="plano-caja deslizable">${svg}</div><p class="desliza-aviso">${t('desliza')}</p><div class="leyenda-e">${ley}</div>${combo}
    ${m ? `<div class="mesa-info"><b>${t('mesa')} ${esc(m.codigo)}</b><span class="muted">${esc(m.zona || '')} · ${m.cap} ${t('personas')}${S.al_liberarse ? ' · ' + t('desde') + ' ' + hhmm(S.inicio) : ''}</span></div>` : ''}
    <button class="boton pri bloque" data-accion="a-datos" ${m ? '' : 'hidden'}>${m ? t('elegir', { m:esc(m.codigo) }) + ' →' : ''}</button>
    <button class="boton bloque" data-accion="auto">${t('auto')}</button>`);
}
function vistaDatos(){
  const D = S.datos, P = S.info.politica, mc = S.mesa ? S.plano.mesas.find(x => x.id === S.mesa)?.codigo : '';
  const oc = ['cumple', 'aniversario', 'trabajo'].map(k => `<button type="button" class="chip ${D.ocasion === t(k) ? 'on' : ''}" data-ocasion="${esc(t(k))}">${t(k)}</button>`).join('');
  return `<form id="formDatos" novalidate class="pila" style="gap:34px">${pregunta(4, t('tus_datos'), `
    <div class="resumen"><b>${fechaLarga(S.fecha, L)} · ${hhmm(S.inicio)} · ${S.pax}${mc ? ' · ' + t('mesa') + ' ' + esc(mc) : ''}</b><button type="button" class="boton chico" data-accion="volver-mesa">${t('cambiar')}</button></div>
    <div class="campo"><label for="fNombre">${t('nombre')}</label><input id="fNombre" autocomplete="name" value="${esc(D.nombre)}" required></div>
    <div class="campo"><label for="fTel">${t('tel')}</label><input id="fTel" type="tel" inputmode="tel" autocomplete="tel" value="${esc(D.tel)}" placeholder="2901 15 555555" required><small>${t('tel_ayuda')}</small></div>
    <div class="campo"><label for="fMail">${t('correo')}</label><input id="fMail" type="email" autocomplete="email" value="${esc(D.email)}"></div>
    <div class="pila"><span class="etiqueta">${t('ocasion')}</span><div class="chips">${oc}</div></div>
    <div class="campo"><label for="fAlerg">${t('alergias')}</label><input id="fAlerg" value="${esc(D.alergias)}" placeholder="${t('alergias_ph')}"></div>
    <label class="check" id="chkAlerg" ${D.alergias ? '' : 'hidden'}><input type="checkbox" id="fAlergOk" ${D.alergias_ok ? 'checked' : ''}><span>${t('alergias_ok')}</span></label>
    <div class="campo"><label for="fNotas">${t('notas')}</label><input id="fNotas" value="${esc(D.notas)}"></div>
    <div class="pol">${politica(S.inicio)} ${t('tol', { t:P.tolerancia })}</div>
    <label class="check"><input type="checkbox" id="fAcepto" ${D.acepto ? 'checked' : ''}><span>${t('acepto')}</span></label>
    <label class="check"><input type="checkbox" id="fPromos" ${D.promos ? 'checked' : ''}><span>${t('promos')}</span></label>`)}
    <button class="boton pri bloque" type="submit" id="btnConfirmar">${t('confirmar')}</button></form>`;
}
function vistaListo(){
  const r = S.res, pend = r.estado === 'pendiente', enlace = `mi.html?c=${r.codigo}&k=${r.k}`;
  return `<div class="pregunta"><h2 class="disp listo-t">${pend ? t('pendiente') : t('listo')}</h2><p class="muted">${pend ? '' : t('te_llega')}</p></div>
    <div style="filter:drop-shadow(0 12px 24px rgba(0,0,0,.18))"><div class="ticket"><div class="cod">${esc(r.codigo)}</div>
      <div class="l"><span>${t('dia_l')}</span><b>${fechaLarga(S.fecha, L)}</b></div><div class="l"><span>${t('hora_l')}</span><b>${hhmm(r.inicio)}</b></div>
      <div class="l"><span>${t('personas_l')}</span><b>${S.pax}</b></div><div class="l"><span>${t('mesa')}</span><b>${esc(r.mesas.join(' + '))}</b></div></div></div>
    ${pend && r.pago ? `<a class="boton pri bloque" href="${esc(r.pago.enlace)}">${t('pagar_sena', { m:pesos(S.pax * S.info.politica.sena) })}</a>` : ''}
    <div class="pol">${politica(r.inicio)}</div>
    <a class="boton canal bloque" href="${enlace}">${t('ver_reserva')}</a>${MODO_PRUEBA ? `<a class="boton bloque" href="${enlace}#mensajes">${t('ver_wa')}</a>` : ''}
    <button class="boton bloque" data-accion="otra">${t('otra')}</button>`;
}
function pintar(){
  if (!S.info) return;
  app.innerHTML = { cuando:vistaCuando, mesa:vistaMesa, datos:vistaDatos, listo:vistaListo }[S.paso]();
  const orden = ['cuando', 'mesa', 'datos', 'listo'], i = orden.indexOf(S.paso);
  $('#progreso').innerHTML = orden.map((p, j) => `<span class="${j === i ? 'on' : j < i ? 'hecho' : ''}">${t('paso_' + p)}</span>`).join('<span aria-hidden="true">—</span>');
  if (S.paso === 'datos') conectarForm();
}
function subir(){ const r = $('#reservar'); if (r.getBoundingClientRect().top < 0 || r.getBoundingClientRect().top > innerHeight * .6) r.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function guardarDatos(){ const D = S.datos; D.nombre = $('#fNombre').value; D.tel = $('#fTel').value; D.email = $('#fMail').value; D.alergias = $('#fAlerg').value; D.alergias_ok = $('#fAlergOk').checked; D.notas = $('#fNotas').value; D.acepto = $('#fAcepto').checked; D.promos = $('#fPromos').checked; }
function conectarForm(){
  $('#fAlerg').addEventListener('input', e => { $('#chkAlerg').hidden = !e.target.value.trim(); });
  $('#formDatos').addEventListener('submit', async e => {
    e.preventDefault(); guardarDatos(); const D = S.datos;
    if (D.nombre.trim().length < 2 || D.tel.replace(/\D/g, '').length < 8){ toast(t('falta'), 'mal'); return; }
    if (!D.acepto){ toast(t('falta_ok'), 'mal'); $('#fAcepto').focus(); return; }
    const b = $('#btnConfirmar'); b.disabled = true; b.textContent = t('confirmando');
    try {
      S.res = await api('POST', `/api/r/${slug}/reservas`, { fecha:S.fecha, inicio:S.inicio, pax:S.pax, mesa:S.mesa, al_liberarse:S.al_liberarse, nombre:D.nombre, tel:D.tel, email:D.email, idioma:L, ocasion:D.ocasion,
        alergias:D.alergias, acepta_alergias:D.alergias_ok, notas:D.notas, acepta_politica:D.acepto, acepta_promos:D.promos, idem:S.idem });
      ls.set('ultima_reserva', JSON.stringify({ c:S.res.codigo, k:S.res.k }));
      S.paso = 'listo'; pintar(); subir();
    } catch (err){
      toast(err.message, 'mal'); b.disabled = false; b.textContent = t('confirmar');
      if (err.datos?.recalcular){ S.mesa = null; S.al_liberarse = false; await verMesas(); }
    }
  });
}
async function verMesas(){ S.paso = 'mesa'; S.plano = null; pintar(); subir(); try { S.plano = await api('GET', `/api/r/${slug}/plano?fecha=${S.fecha}&inicio=${S.inicio}&pax=${S.pax}`); aplicarPref(); } catch (e){ toast(e.message, 'mal'); S.paso = 'cuando'; } pintar(); }
function tocarMesa(id){
  const m = S.plano.mesas.find(x => x.id === id); if (!m) return;
  if (m.estado === 'libre'){ S.mesa = id; S.al_liberarse = false; pintar(); return; }
  if (m.estado === 'no'){ toast(t('no_sirve', { m:m.codigo, c:m.cap })); return; }
  if (!m.desde){ toast(t('sin_libre', { m:m.codigo })); return; }
  const h = hoja(`<h3 class="disp" style="font-size:34px">${t('ocupada_t', { m:esc(m.codigo) })}</h3><p>${t('ocupada_p', { h:`<b>${m.desde_hora}</b>` })}</p><div class="pol">${politica(m.desde)}</div>
    <button class="boton pri bloque" data-pedir>${t('pedir', { h:m.desde_hora })}</button>`);
  h.el.querySelector('[data-pedir]').addEventListener('click', () => { S.mesa = id; S.inicio = m.desde; S.al_liberarse = true; S.idem = crypto.randomUUID(); notaConFavs(); h.cerrar(); S.paso = 'datos'; pintar(); subir(); });
}
function listaEspera(){
  const desde = S.inicio ?? (S.horarios?.horarios[0]?.min || 1260);
  const opts = sel => { let o = ''; for (let m = 720; m <= 1410; m += 15) o += `<option value="${m}" ${m === sel ? 'selected' : ''}>${hhmm(m)}</option>`; return o; };
  const h = hoja(`<h3 class="disp" style="font-size:34px">${t('espera_t')}</h3><p class="muted">${t('espera_p')}</p><p><b>${fechaLarga(S.fecha, L)} · ${S.pax} ${t('personas')}</b></p>
    <div class="dos-col"><div class="campo"><label for="eDesde">${t('entre')}</label><select id="eDesde">${opts(desde)}</select></div><div class="campo"><label for="eHasta">${t('y')}</label><select id="eHasta">${opts(desde + 60)}</select></div></div>
    <div class="campo"><label for="eNom">${t('nombre')}</label><input id="eNom" autocomplete="name" value="${esc(S.datos.nombre)}"></div>
    <div class="campo"><label for="eTel">${t('tel')}</label><input id="eTel" type="tel" autocomplete="tel" value="${esc(S.datos.tel)}"></div>
    <label class="check"><input type="checkbox" id="eOk"><span>${t('acepto')}</span></label><button class="boton pri bloque" data-anotar>${t('anotarme')}</button>`);
  h.el.querySelector('[data-anotar]').addEventListener('click', async () => {
    try { await api('POST', `/api/r/${slug}/espera`, { fecha:S.fecha, desde:+$('#eDesde').value, hasta:+$('#eHasta').value, pax:S.pax, nombre:$('#eNom').value, tel:$('#eTel').value, idioma:L, acepta_politica:$('#eOk').checked });
      h.cerrar(); toast(t('anotado')); } catch (e){ toast(e.message, 'mal'); }
  });
}
app.addEventListener('click', e => {
  const d = e.target.closest('[data-dia]'); if (d){ S.fecha = d.dataset.dia; S.inicio = null; cargarHorarios(); return; }
  const p = e.target.closest('[data-pax]'); if (p){ S.pax = Math.max(1, Math.min(S.info.politica.max_pax, S.pax + +p.dataset.pax)); cargarHorarios(); pintarHorasHoy(); return; }
  const h = e.target.closest('[data-hora]'); if (h){ S.inicio = +h.dataset.hora; pintar(); return; }
  const o = e.target.closest('[data-ocasion]'); if (o){ guardarDatos(); S.datos.ocasion = S.datos.ocasion === o.dataset.ocasion ? '' : o.dataset.ocasion; pintar(); return; }
  const m = e.target.closest('.mesa-g'); if (m){ tocarMesa(Number(m.dataset.mesa)); return; }
  const a = e.target.closest('[data-accion]'); if (!a) return;
  switch (a.dataset.accion){
    case 'ver-mesas': S.mesa = null; S.al_liberarse = false; verMesas(); break;
    case 'volver-cuando': S.paso = 'cuando'; pintar(); subir(); break;
    case 'volver-mesa': guardarDatos(); verMesas(); break;
    case 'a-datos': S.idem = crypto.randomUUID(); notaConFavs(); S.paso = 'datos'; pintar(); subir(); break;
    case 'auto': S.mesa = null; S.al_liberarse = false; S.idem = crypto.randomUUID(); notaConFavs(); S.paso = 'datos'; pintar(); subir(); break;
    case 'espera': listaEspera(); break;
    case 'otra': S.paso = 'cuando'; S.res = null; S.mesa = null; cargarHorarios(); subir(); break;
  }
});
app.addEventListener('keydown', e => { const m = e.target.closest?.('.mesa-g'); if (m && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); tocarMesa(Number(m.dataset.mesa)); } });
$$('.idiomas button').forEach(b => b.addEventListener('click', () => { if (S.paso === 'datos') guardarDatos(); L = b.dataset.l; ls.set('idioma', L); pintarFijos(); pintar(); pintarSecciones(); }));

/* ======================================================================================
 * Diseño «Bosque nórdico» por secciones (16-11-2026): portada viva, carta con favoritos,
 * esta noche (clima, apertura y horarios con lugar), el salón para recorrer y cómo llegar.
 * Lo que el cliente elige acá (platos y mesa o zona preferida) se usa solo en la reserva.
 * ====================================================================================== */
Object.assign(T.es, { cta_corta:'Reservar', m_inicio:'inicio', m_carta:'la carta', m_noche:'esta noche', m_salon:'el salón', m_reservar:'reservar', m_llegar:'cómo llegar', m_mi:'mi reserva', baja:'bajá',
  carta_t:'la carta', carta_p:'Deslizá los platos de la casa. Tocá el corazón en los que quieras probar: los anotamos en tu reserva para que la cocina los tenga en cuenta.', carta_nota:'{p} · se anotan en tu reserva', carta_vacia:'Todavía no guardaste ningún plato.',
  cat_mar:'del mar', cat_fuego:'del fuego', cat_bosque:'del bosque', cat_casa:'de la casa', guardar:'Guardar {p}', quiero_probar:'Quiero probar: {p}',
  noche_t:'esta noche', noche_p:'Lo que pasa hoy en Ushuaia y en el salón, al minuto.', clima_t:'El clima en Ushuaia', abre_t:'Hoy', lugar_t:'Horarios con lugar hoy para {n}',
  abierto:'abiertos ahora', cierra:'Cerramos a las {h}.', abre_en:'Abrimos a las {h}. Faltan:', h_l:'horas', m_l:'min', s_l:'seg', cerrado_ya:'Hoy ya cerramos.', prox:'Próxima apertura: {d} a las {h}.',
  sin_lugar_hoy:'Hoy no quedan horarios para {n}.', ver_otro:'Ver otros días', viento:'viento {v} km/h', reco_frio:'Noche fresca: te sugerimos una mesa en <b>{z}</b>.', reco_lindo:'Cielo despejado: pedí una mesa en <b>{z}</b> y mirá el canal.', reco_btn:'Quiero esa zona', clima_no:'No pudimos ver el clima ahora.',
  salon_t:'el salón', salon_p:'Recorré el salón y tocá la mesa que te guste. Cuando llegues al paso de la mesa, te la dejamos marcada si está libre.', salon_toca:'Tocá una mesa del plano.', lugares:'{n} lugares', me_gusta:'Me gusta esta mesa', ya_gusta:'Elegida ✓ · ir a reservar',
  pref_mesa:'Mesa favorita: {m}', pref_zona:'Zona preferida: {z}', pref_platos:'Para probar: {p}', pref_ok:'Te dejamos elegida la {m}, la que te gustó.', pref_no:'La {m} no está libre a esa hora: elegí otra o probá otro horario.', zona_ok:'Te elegimos la {m}, en {z}.', quitar:'Quitar',
  llegar_t:'cómo llegar', llegar_p:'Frente al canal Beagle, en Ushuaia. Si necesitás ayuda para llegar, escribinos por WhatsApp.', mapa:'Abrir el mapa',
  f_noche:'noche en el canal', f_amanecer:'amanecer en el canal', f_dia:'día en el canal', f_atardecer:'atardecer en el canal',
  cielo:{ 0:'Despejado', 1:'Casi despejado', 2:'Algo nublado', 3:'Nublado', 45:'Niebla', 51:'Llovizna', 61:'Lluvia', 71:'Nieve', 80:'Chaparrones', 85:'Nevadas', 95:'Tormenta' } });
Object.assign(T.en, { cta_corta:'Book', m_inicio:'home', m_carta:'the menu', m_noche:'tonight', m_salon:'the room', m_reservar:'book', m_llegar:'getting here', m_mi:'my booking', baja:'scroll',
  carta_t:'the menu', carta_p:'Swipe through the house dishes. Tap the heart on the ones you want to try: we add them to your booking so the kitchen knows.', carta_nota:'{p} · added to your booking', carta_vacia:'No dishes saved yet.',
  cat_mar:'from the sea', cat_fuego:'from the fire', cat_bosque:'from the forest', cat_casa:'house special', guardar:'Save {p}', quiero_probar:'I want to try: {p}',
  noche_t:'tonight', noche_p:"What's happening today in Ushuaia and in the room, live.", clima_t:'Weather in Ushuaia', abre_t:'Today', lugar_t:'Times available today for {n}',
  abierto:'open now', cierra:'We close at {h}.', abre_en:'We open at {h}. Starts in:', h_l:'hours', m_l:'min', s_l:'sec', cerrado_ya:"We're closed for today.", prox:'Next opening: {d} at {h}.',
  sin_lugar_hoy:'No times left today for {n}.', ver_otro:'See other days', viento:'wind {v} km/h', reco_frio:'Chilly night: we suggest a table in <b>{z}</b>.', reco_lindo:'Clear sky: ask for a table in <b>{z}</b> and enjoy the channel.', reco_btn:'I want that area', clima_no:'Weather unavailable right now.',
  salon_t:'the room', salon_p:"Explore the room and tap the table you like. When you reach the table step, we'll pre-select it if it's free.", salon_toca:'Tap a table on the plan.', lugares:'{n} seats', me_gusta:'I like this table', ya_gusta:'Chosen ✓ · go to booking',
  pref_mesa:'Favourite table: {m}', pref_zona:'Preferred area: {z}', pref_platos:'To try: {p}', pref_ok:'We pre-selected {m}, the one you liked.', pref_no:"Table {m} isn't free at that time: pick another or try another time.", zona_ok:'We picked {m}, in {z}.', quitar:'Remove',
  llegar_t:'getting here', llegar_p:'By the Beagle Channel, in Ushuaia. If you need help getting here, message us on WhatsApp.', mapa:'Open the map',
  f_noche:'night on the channel', f_amanecer:'sunrise on the channel', f_dia:'daytime on the channel', f_atardecer:'sunset on the channel',
  cielo:{ 0:'Clear', 1:'Mostly clear', 2:'Partly cloudy', 3:'Cloudy', 45:'Fog', 51:'Drizzle', 61:'Rain', 71:'Snow', 80:'Showers', 85:'Snow showers', 95:'Storm' } });
Object.assign(T.pt, { cta_corta:'Reservar', m_inicio:'início', m_carta:'o cardápio', m_noche:'esta noite', m_salon:'o salão', m_reservar:'reservar', m_llegar:'como chegar', m_mi:'minha reserva', baja:'role',
  carta_t:'o cardápio', carta_p:'Deslize os pratos da casa. Toque o coração nos que quer provar: anotamos na sua reserva para a cozinha saber.', carta_nota:'{p} · anotados na sua reserva', carta_vacia:'Nenhum prato salvo ainda.',
  cat_mar:'do mar', cat_fuego:'do fogo', cat_bosque:'da floresta', cat_casa:'da casa', guardar:'Salvar {p}', quiero_probar:'Quero provar: {p}',
  noche_t:'esta noite', noche_p:'O que acontece hoje em Ushuaia e no salão, ao vivo.', clima_t:'O tempo em Ushuaia', abre_t:'Hoje', lugar_t:'Horários com lugar hoje para {n}',
  abierto:'abertos agora', cierra:'Fechamos às {h}.', abre_en:'Abrimos às {h}. Faltam:', h_l:'horas', m_l:'min', s_l:'seg', cerrado_ya:'Hoje já fechamos.', prox:'Próxima abertura: {d} às {h}.',
  sin_lugar_hoy:'Hoje não há horários para {n}.', ver_otro:'Ver outros dias', viento:'vento {v} km/h', reco_frio:'Noite fria: sugerimos uma mesa em <b>{z}</b>.', reco_lindo:'Céu limpo: peça uma mesa em <b>{z}</b> e veja o canal.', reco_btn:'Quero essa área', clima_no:'Clima indisponível agora.',
  salon_t:'o salão', salon_p:'Percorra o salão e toque na mesa que gostar. No passo da mesa, deixamos marcada se estiver livre.', salon_toca:'Toque uma mesa da planta.', lugares:'{n} lugares', me_gusta:'Gostei desta mesa', ya_gusta:'Escolhida ✓ · ir reservar',
  pref_mesa:'Mesa favorita: {m}', pref_zona:'Área preferida: {z}', pref_platos:'Para provar: {p}', pref_ok:'Deixamos escolhida a {m}, a que você gostou.', pref_no:'A {m} não está livre nesse horário: escolha outra ou outro horário.', zona_ok:'Escolhemos a {m}, em {z}.', quitar:'Remover',
  llegar_t:'como chegar', llegar_p:'Em frente ao canal Beagle, em Ushuaia. Se precisar de ajuda para chegar, escreva pelo WhatsApp.', mapa:'Abrir o mapa',
  f_noche:'noite no canal', f_amanecer:'amanhecer no canal', f_dia:'dia no canal', f_atardecer:'pôr do sol no canal',
  cielo:{ 0:'Céu limpo', 1:'Quase limpo', 2:'Parcialmente nublado', 3:'Nublado', 45:'Neblina', 51:'Garoa', 61:'Chuva', 71:'Neve', 80:'Pancadas', 85:'Neve', 95:'Tempestade' } });

const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cargadoEn = Date.now();
const ahoraMin = () => S.info ? S.info.ahora + (Date.now() - cargadoEn) / 60000 : 0;   // hora del restaurante (sigue al reloj de la demo)
let favs = []; try { favs = JSON.parse(ls.get('favs:' + slug) || '[]'); } catch (e){ favs = []; }
S.pref = null; try { S.pref = JSON.parse(ls.get('pref:' + slug) || 'null'); } catch (e){}
const guardarPrefs = () => { ls.set('favs:' + slug, JSON.stringify(favs)); ls.set('pref:' + slug, S.pref ? JSON.stringify(S.pref) : null); pintarPrefs(); };
const lista = a => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + (L === 'en' ? ' and ' : L === 'pt' ? ' e ' : ' y ') + a[a.length - 1];

/* azar con semilla: el mismo plato siempre se dibuja igual */
function semilla(txt){ let h = 2166136261; for (const c of String(txt)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let x = h; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

/* ---------- 1 · la portada: el canal a la hora real de Ushuaia ---------- */
function fase(min){ const h = min / 60; return h < 5.5 || h >= 22.5 ? 'noche' : h < 8 ? 'amanecer' : h < 19 ? 'dia' : 'atardecer'; }
const CIELOS = {
  noche:{ c:['#050A12', '#0C1726', '#1A2B3B'], lejos:'#1A2531', medio:'#111B23', cerca:'#09110D', agua:['#0B1520', '#060C12'], nieve:'#8FA6B8', astro:'#F2EBD3' },
  amanecer:{ c:['#2B3A5A', '#B9786C', '#F2C38B'], lejos:'#5B6478', medio:'#384854', cerca:'#1C2A22', agua:['#6A7488', '#2A3442'], nieve:'#F7E3D2', astro:'#FFE2B0' },
  dia:{ c:['#6F9DC0', '#AFCBDD', '#E3ECEE'], lejos:'#7890A1', medio:'#4C6866', cerca:'#203528', agua:['#4F7894', '#2B4A5E'], nieve:'#FFFFFF', astro:'#FFF6DA' },
  atardecer:{ c:['#1C2747', '#9B4E66', '#F09A5B'], lejos:'#4A4560', medio:'#2C3343', cerca:'#121C17', agua:['#3B3D5A', '#171B2A'], nieve:'#F4C3A4', astro:'#FFCB8A' } };
function sierra(r, y0, alto, paso, fin = 1600){ const p = [[0, 900], [0, y0]]; let x = 0; while (x < fin){ x += paso * (.6 + r()); p.push([x, y0 - alto * (.25 + r() * .75)]); } p.push([fin, y0], [fin, 900]); return p; }
function paisaje(){
  const f = fase(ahoraMin()), C = CIELOS[f], r = semilla(slug + f), P = [];
  const camino = pts => 'M' + pts.map(([x, y]) => x.toFixed(0) + ' ' + y.toFixed(0)).join(' L') + ' Z';
  const lejos = sierra(r, 560, 330, 90), medio = sierra(r, 610, 190, 70);
  let nieve = 'M0 0 H1600 V330'; for (let x = 1600; x >= 0; x -= 40) nieve += ` L${x} ${(318 + Math.sin(x / 37) * 14 + r() * 22).toFixed(0)}`; nieve += ' Z';
  if (f === 'noche'){ for (let i = 0; i < 90; i++) P.push(`<circle class="estrella" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 420).toFixed(0)}" r="${(r() * 1.6 + .4).toFixed(1)}" fill="#fff" style="--d:${(2 + r() * 4).toFixed(1)}s;--r:-${(r() * 4).toFixed(1)}s"/>`); }
  const aurora = f === 'noche' ? `<g class="capa" style="--prof:.08" filter="url(#difu)" opacity=".7"><path class="aurora-banda" d="M-100 250 C 300 120, 600 330, 900 190 S 1500 120, 1750 230 L1750 330 C 1400 240, 1100 360, 800 300 S 200 300, -100 360Z" fill="url(#gAur)"/><path class="aurora-banda" d="M-100 180 C 400 90, 700 240, 1100 140 S 1600 120, 1750 160 L1750 220 C 1300 200, 900 280, 500 220 S 100 230, -100 260Z" fill="#7C5CC4" opacity=".35"/></g>` : '';
  const astro = { noche:[1240, 150, 34], amanecer:[300, 470, 70], dia:[1150, 140, 52], atardecer:[1280, 470, 80] }[f];
  const nubes = f === 'noche' ? '' : `<g class="capa" style="--prof:.12" opacity="${f === 'dia' ? .85 : .55}" fill="${f === 'dia' ? '#fff' : C.c[2]}"><g class="nube"><ellipse cx="260" cy="190" rx="130" ry="26"/><ellipse cx="330" cy="172" rx="80" ry="30"/></g><g class="nube" style="animation-duration:80s"><ellipse cx="900" cy="250" rx="170" ry="24"/><ellipse cx="980" cy="232" rx="90" ry="28"/></g></g>`;
  const brillos = Array.from({ length:26 }, () => { const y = 640 + r() * 220, w = 30 + r() * 120; return `<rect class="brillo-agua" x="${(r() * 1600).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="2" rx="1" fill="${C.astro}" opacity="${(.15 + r() * .35).toFixed(2)}" style="--r:-${(r() * 5).toFixed(1)}s"/>`; }).join('');
  const reflejo = `<rect x="${astro[0] - astro[2]}" y="640" width="${astro[2] * 2}" height="260" fill="url(#gRef)" opacity="${f === 'dia' ? .25 : .55}"/>`;
  const lengas = Array.from({ length:9 }, (_, i) => { const x = 40 + i * 70 + r() * 30, a = 120 + r() * 120, y = 820 + r() * 40;
    const copa = Array.from({ length:4 }, (_, j) => `<ellipse cx="${(x + 18 + j * 9 - r() * 10).toFixed(0)}" cy="${(y - a + j * a / 5).toFixed(0)}" rx="${(34 - j * 4 + r() * 10).toFixed(0)}" ry="${(18 + r() * 8).toFixed(0)}"/>`).join('');
    return `<g class="lenga" style="--d:${(4 + r() * 4).toFixed(1)}s" fill="${C.cerca}"><path d="M${x} ${y} Q${x + 6} ${y - a / 2} ${x + 22} ${y - a}" stroke="${C.cerca}" stroke-width="7" fill="none"/>${copa}</g>`; }).join('');
  const humo = Array.from({ length:5 }, (_, i) => `<circle class="humo" cx="1312" cy="672" r="${8 + i * 2}" fill="${f === 'dia' ? '#E8ECEF' : '#C9C6C0'}" opacity="0" style="--r:-${(i * 1.2).toFixed(1)}s"/>`).join('');
  const luz = f === 'dia' ? '#3A3020' : '#F7C873';
  return `<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="gCielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.c[0]}"/><stop offset=".6" stop-color="${C.c[1]}"/><stop offset="1" stop-color="${C.c[2]}"/></linearGradient>
      <linearGradient id="gAgua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.agua[0]}"/><stop offset="1" stop-color="${C.agua[1]}"/></linearGradient>
      <linearGradient id="gAur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3EE6A0" stop-opacity="0"/><stop offset=".3" stop-color="#3EE6A0"/><stop offset=".7" stop-color="#5CD6C9"/><stop offset="1" stop-color="#7C5CC4" stop-opacity="0"/></linearGradient>
      <linearGradient id="gRef" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.astro}"/><stop offset="1" stop-color="${C.astro}" stop-opacity="0"/></linearGradient>
      <radialGradient id="gAstro"><stop offset="0" stop-color="${C.astro}"/><stop offset=".45" stop-color="${C.astro}" stop-opacity=".35"/><stop offset="1" stop-color="${C.astro}" stop-opacity="0"/></radialGradient>
      <filter id="difu"><feGaussianBlur stdDeviation="18"/></filter></defs>
    <rect width="1600" height="900" fill="url(#gCielo)"/>${P.join('')}${aurora}
    <g class="capa" style="--prof:.1"><circle cx="${astro[0]}" cy="${astro[1]}" r="${astro[2] * 3.2}" fill="url(#gAstro)"/><circle cx="${astro[0]}" cy="${astro[1]}" r="${astro[2]}" fill="${C.astro}"/></g>${nubes}
    <g class="capa" style="--prof:.22"><clipPath id="cMont"><path d="${camino(lejos)}"/></clipPath><path d="${camino(lejos)}" fill="${C.lejos}"/><path d="${nieve}" fill="${C.nieve}" opacity=".88" clip-path="url(#cMont)"/></g>
    <g class="capa" style="--prof:.4"><path d="${camino(medio)}" fill="${C.medio}"/></g>
    <g class="capa" style="--prof:.5"><rect y="630" width="1600" height="270" fill="url(#gAgua)"/>${reflejo}${brillos}
      <g class="barco" fill="${C.cerca}"><path d="M0 668 L70 668 L60 680 L8 680Z"/><rect x="26" y="650" width="22" height="18"/><rect x="34" y="640" width="5" height="10"/></g></g>
    <g class="capa" style="--prof:.9"><path d="M-40 900 L-40 790 Q 260 730 560 800 T 1040 812 Q 1260 760 1640 720 L1640 900Z" fill="${C.cerca}"/>${lengas}
      <g fill="${C.cerca}"><path d="M1260 740 L1312 704 L1364 740Z"/><rect x="1268" y="738" width="88" height="54"/><rect x="1324" y="690" width="12" height="26"/></g>
      <rect class="ventana-luz" x="1286" y="752" width="18" height="16" fill="${luz}"/><rect class="ventana-luz" x="1318" y="752" width="18" height="16" fill="${luz}" style="animation-delay:-2s"/>${humo}</g>
  </svg>`;
}
function pintarPortada(){ const p = $('#paisaje'); if (!p || !S.info) return; const f = fase(ahoraMin()); if (p.dataset.fase === f) return; p.dataset.fase = f; p.innerHTML = paisaje(); }
function pintarMomento(){ if (S.info) $('#momento').textContent = t('f_' + fase(ahoraMin())) + ' · ' + hhmm(ahoraMin()); }
/* profundidad: las capas se corren con el mouse o al bajar */
if (!quieto){
  let pend = false;
  const mover = (px, sy) => { const p = $('#paisaje'); if (!p) return; if (px != null) p.style.setProperty('--px', px.toFixed(1)); if (sy != null) p.style.setProperty('--sy', sy.toFixed(0)); };
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || pend) return; pend = true; requestAnimationFrame(() => { pend = false; mover((e.clientX / innerWidth - .5) * -40, null); }); }, { passive:true });
  addEventListener('scroll', () => { if (scrollY < innerHeight * 1.2) mover(null, scrollY); }, { passive:true });
}

/* ---------- barra, menú, puntos del costado y botón flotante ---------- */
const barra = $('#barra'), menu = $('#menu'), btnMenu = $('#abrirMenu');
function abrirMenu(si){
  btnMenu.setAttribute('aria-expanded', si); document.body.classList.toggle('menu-abierto', si); document.documentElement.style.overflow = si ? 'hidden' : '';
  if (si){ menu.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('abierto'))); }
  else { menu.classList.remove('abierto'); setTimeout(() => { if (!menu.classList.contains('abierto')) menu.hidden = true; }, quieto ? 0 : 600); }
}
btnMenu.addEventListener('click', () => abrirMenu(btnMenu.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', e => { if (e.target.closest('.menu-links a')) abrirMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape' && btnMenu.getAttribute('aria-expanded') === 'true') abrirMenu(false); });
const alBajarSitio = () => { const por = $('#inicio'); barra.classList.toggle('solida', scrollY > por.offsetHeight - 90); };
addEventListener('scroll', () => requestAnimationFrame(alBajarSitio), { passive:true }); alBajarSitio();
if ('IntersectionObserver' in window){
  const puntos = $$('#indice a');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) puntos.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin:'-45% 0px -50% 0px' });
  ['inicio', 'carta', 'noche', 'salon', 'reservar', 'llegar'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  const rev = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting){ e.target.classList.add('visto'); rev.unobserve(e.target); } }), { rootMargin:'0px 0px -12% 0px' });
  $$('[data-revela]').forEach(el => { const hermanos = [...el.parentElement.children].filter(x => x.hasAttribute('data-revela')); el.style.setProperty('--retraso-r', hermanos.indexOf(el) * .12 + 's'); rev.observe(el); });
  const f = $('#ctaFlota'), por = $('#inicio'), res = $('#reservar'); let verPor = true, verRes = false; const pinta = () => f.classList.toggle('ver', !verPor && !verRes);
  new IntersectionObserver(e => { verPor = e[0].isIntersecting; pinta(); }, { rootMargin:'0px 0px -30% 0px' }).observe(por);
  new IntersectionObserver(e => { verRes = e[0].isIntersecting; pinta(); }, { rootMargin:'0px 0px -40% 0px' }).observe(res);
} else $$('[data-revela]').forEach(el => el.classList.add('visto'));
(() => { try { const u = JSON.parse(ls.get('ultima_reserva') || 'null'); if (u && u.c){ const a = $('#menuMiReserva'); a.href = `mi.html?c=${encodeURIComponent(u.c)}&k=${encodeURIComponent(u.k)}`; a.hidden = false; } } catch (e){} })();

/* ---------- 2 · la carta ---------- */
function categoria(p){ const x = p.toLowerCase(); return /centolla|merluza|trucha|mejill|ostra|pesca|salm|mar|cholg|langost/.test(x) ? 'mar' : /cordero|asado|asador|parrill|carne|chivo|cerdo|fuego/.test(x) ? 'fuego' : /hongo|calafate|ñire|bosque|berr|fruto|ruibarbo|verdura|papa/.test(x) ? 'bosque' : 'casa'; }
const TINTAS = { mar:['#D9725B', '#E8B4A0', '#F2D8C9', '#7FA3A8'], fuego:['#8B4A2B', '#C77A3E', '#5E3A24', '#D9A066'], bosque:['#5E7A4A', '#3D2A4E', '#8A5A7E', '#C7B07A'], casa:['#B4532A', '#E7C98F', '#3F5B3A', '#D9CBB0'] };
function ilustracion(nombre){
  const r = semilla(nombre), cat = categoria(nombre), c = TINTAS[cat], fondo = ['#E9E3D4', '#DCE3D3', '#F0E1CF', '#E2E6E1'][Math.floor(r() * 4)];
  const mancha = (cx, cy, rad, col, puntas = 7) => { let d = ''; for (let i = 0; i <= puntas; i++){ const a = i / puntas * Math.PI * 2, rr = rad * (.7 + r() * .45); d += (i ? ' ' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } return `<path d="${d}Z" fill="${col}" stroke="${col}" stroke-width="10" stroke-linejoin="round"/>`; };
  let comida = ''; for (let i = 0; i < 3 + Math.floor(r() * 3); i++) comida += mancha(150 + (r() - .5) * 70, 150 + (r() - .5) * 70, 18 + r() * 26, c[i % 4]);
  let hojas = ''; for (let i = 0; i < 9; i++) hojas += `<circle cx="${(150 + (r() - .5) * 110).toFixed(0)}" cy="${(150 + (r() - .5) * 110).toFixed(0)}" r="${(2 + r() * 3.5).toFixed(1)}" fill="${i % 2 ? '#3F5B3A' : '#F4F0E6'}"/>`;
  const salsa = `<path d="M${90 + r() * 30} ${200 + r() * 20} Q 150 ${230 + r() * 20} ${200 + r() * 20} ${190 + r() * 20}" stroke="${c[3]}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".8"/>`;
  return `<svg viewBox="0 0 300 300" aria-hidden="true"><rect width="300" height="300" fill="${fondo}"/><ellipse cx="160" cy="166" rx="122" ry="118" fill="rgba(28,38,32,.12)"/>
    <circle cx="150" cy="150" r="120" fill="#FBF8F1"/><circle cx="150" cy="150" r="96" fill="none" stroke="#E2DBCB" stroke-width="2"/>${salsa}${comida}${hojas}</svg>`;
}
const SVG_CORAZON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.4-9.3-9.2C1.5 8 3.6 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.6 0 5.7 3.5 4.5 6.8-1.8 4.8-9.3 9.2-9.3 9.2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
function platos(){ const pg = S.info.pagina || {}; return (pg.destacados && pg.destacados.length ? pg.destacados : [S.info.subtitulo || S.info.nombre]).slice(0, 10); }
function pintarCarta(){
  const P = platos(); favs = favs.filter(f => P.includes(f));
  $('#cartaPista').innerHTML = P.map((p, i) => { const on = favs.includes(p);
    return `<article class="plato"><span class="ilus">${ilustracion(p)}</span><div class="cuerpo"><span class="n">${String(i + 1).padStart(2, '0')} · ${t('cat_' + categoria(p))}</span><h3>${esc(p)}</h3></div>
      <button class="corazon" data-fav="${esc(p)}" aria-pressed="${on}" aria-label="${esc(t('guardar', { p }))}">${SVG_CORAZON}</button></article>`; }).join('');
  pintarNotaCarta();
}
function pintarNotaCarta(){ $('#cartaNota').innerHTML = favs.length ? `<b>♥</b> ${esc(t('carta_nota', { p:lista(favs) }))}` : `<span class="muted">${t('carta_vacia')}</span>`; }
$('#cartaPista').addEventListener('click', e => {
  const b = e.target.closest('[data-fav]'); if (!b) return; const p = b.dataset.fav, on = !favs.includes(p);
  favs = on ? [...favs, p] : favs.filter(x => x !== p); b.setAttribute('aria-pressed', on); guardarPrefs(); pintarNotaCarta();
  if (navigator.vibrate && navigator.userActivation?.isActive) try { navigator.vibrate(on ? [10, 40, 10] : 8); } catch (x){}
  if (on && !quieto){ b.classList.remove('late-c'); void b.offsetWidth; b.classList.add('late-c');
    for (let i = 0; i < 10; i++){ const s = document.createElement('i'), a = i / 10 * Math.PI * 2; s.className = 'chispa'; s.style.left = '19px'; s.style.top = '19px';
      s.style.setProperty('--cx', Math.cos(a) * 34 + 'px'); s.style.setProperty('--cy', Math.sin(a) * 34 + 'px'); b.appendChild(s); setTimeout(() => s.remove(), 700); } }
});

/* ---------- 3 · esta noche: clima, apertura y horarios con lugar ---------- */
const ICONOS = {
  sol:'<svg class="ico" viewBox="0 0 64 64"><g class="sol-gira" stroke="#E7C98F" stroke-width="3" stroke-linecap="round">' + Array.from({ length:8 }, (_, i) => { const a = i * Math.PI / 4; return `<line x1="${32 + Math.cos(a) * 20}" y1="${32 + Math.sin(a) * 20}" x2="${32 + Math.cos(a) * 27}" y2="${32 + Math.sin(a) * 27}"/>`; }).join('') + '</g><circle cx="32" cy="32" r="13" fill="#E7C98F"/></svg>',
  luna:'<svg class="ico" viewBox="0 0 64 64"><path d="M40 10a22 22 0 1 0 14 34A18 18 0 0 1 40 10z" fill="#F2EBD3"/><circle class="estrella" cx="14" cy="16" r="2" fill="#fff"/><circle class="estrella" cx="52" cy="12" r="1.6" fill="#fff" style="--r:-1s"/></svg>',
  nube:'<svg class="ico" viewBox="0 0 64 64"><g class="nube-ico"><circle cx="24" cy="36" r="12" fill="#C9CFC0"/><circle cx="38" cy="30" r="15" fill="#E2E6E1"/><rect x="14" y="36" width="38" height="14" rx="7" fill="#E2E6E1"/></g></svg>',
  lluvia:'<svg class="ico" viewBox="0 0 64 64"><g class="nube-ico"><circle cx="24" cy="28" r="11" fill="#93A08E"/><circle cx="38" cy="24" r="14" fill="#C9CFC0"/><rect x="14" y="28" width="38" height="12" rx="6" fill="#C9CFC0"/></g>' + [18, 30, 42].map((x, i) => `<line class="copo" x1="${x}" y1="46" x2="${x - 3}" y2="54" stroke="#7FA3A8" stroke-width="3" stroke-linecap="round" style="--r:-${i * .7}s"/>`).join('') + '</svg>',
  nieve:'<svg class="ico" viewBox="0 0 64 64"><g class="nube-ico"><circle cx="24" cy="28" r="11" fill="#C9CFC0"/><circle cx="38" cy="24" r="14" fill="#E2E6E1"/><rect x="14" y="28" width="38" height="12" rx="6" fill="#E2E6E1"/></g>' + [18, 30, 42, 24, 36].map((x, i) => `<circle class="copo" cx="${x}" cy="${i > 2 ? 54 : 48}" r="2.6" fill="#fff" style="--r:-${i * .6}s"/>`).join('') + '</svg>',
  viento:'<svg class="ico" viewBox="0 0 64 64" fill="none" stroke="#C9CFC0" stroke-width="3.5" stroke-linecap="round"><path class="viento-l" d="M6 24h34a7 7 0 1 0-7-7"/><path class="viento-l" d="M6 34h44a7 7 0 1 1-7 7" style="animation-delay:-.6s"/><path class="viento-l" d="M6 44h22" style="animation-delay:-1.1s"/></svg>' };
function cieloDe(cod){ const K = Object.keys(T[L].cielo).map(Number).sort((a, b) => b - a), k = K.find(x => cod >= x) ?? 0; return T[L].cielo[k]; }
function iconoDe(cod, viento, dia){ if (cod >= 71 && cod <= 77 || cod === 85 || cod === 86) return ICONOS.nieve; if (cod >= 51) return ICONOS.lluvia; if (viento >= 40) return ICONOS.viento; if (cod >= 2) return ICONOS.nube; return dia ? ICONOS.sol : ICONOS.luna; }
let clima = null;
function zonas(){ return [...new Set((S.info.mesas || []).map(m => m.zona).filter(Boolean))]; }
function pintarClima(){
  const el = $('#clima'); if (!el) return;
  if (!clima){ return; }
  if (clima.error){ el.innerHTML = `<p class="muted">${t('clima_no')}</p>`; return; }
  const Z = zonas(), frio = clima.temp < 9 || clima.viento >= 35;
  const z = frio ? (Z.find(x => /hogar|fuego|salón|salon|interior|chimenea/i.test(x)) || Z[0]) : (Z.find(x => /ventan|canal|vista|terraza/i.test(x)) || Z[0]);
  el.innerHTML = `${iconoDe(clima.cod, clima.viento, clima.dia)}<span class="temp">${Math.round(clima.temp)}°</span><span class="det">${esc(cieloDe(clima.cod))} · ${t('viento', { v:Math.round(clima.viento) })}</span>
    ${z ? `<div class="reco">${t(frio ? 'reco_frio' : 'reco_lindo', { z:esc(z) })} <button class="boton chico" data-zona="${esc(z)}" style="margin-top:8px">${t('reco_btn')}</button></div>` : ''}`;
}
async function traerClima(){
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-54.80&longitude=-68.30&current=temperature_2m,wind_speed_10m,weather_code,is_day&timezone=America%2FArgentina%2FUshuaia');
    if (!r.ok) throw new Error(); const d = (await r.json()).current;
    clima = { temp:d.temperature_2m, viento:d.wind_speed_10m, cod:d.weather_code, dia:!!d.is_day };
  } catch (e){ clima = { error:true }; }
  pintarClima();
}
function pintarAbre(){
  const el = $('#abre'); if (!el || !S.info) return;
  const I = S.info, ahora = ahoraMin(), tu = abierto(I.hoy) ? turnosDe(I.hoy).slice().sort((a, b) => a.desde - b.desde) : [];
  const enCurso = tu.find(x => ahora >= x.desde && ahora < x.hasta + 60), prox = tu.find(x => x.desde > ahora);
  if (enCurso){ el.innerHTML = `<div class="abierto-ya"><i aria-hidden="true"></i>${t('abierto')}</div><p class="muted">${t('cierra', { h:hhmm(enCurso.hasta + 60) })}</p>`; return; }
  if (prox){ const s = Math.max(0, Math.round((prox.desde - ahora) * 60)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sg = s % 60;
    el.innerHTML = `<p>${t('abre_en', { h:hhmm(prox.desde) })}</p><div class="cuenta"><div><b>${String(h).padStart(2, '0')}</b><small>${t('h_l')}</small></div><div><b>${String(m).padStart(2, '0')}</b><small>${t('m_l')}</small></div><div><b>${String(sg).padStart(2, '0')}</b><small>${t('s_l')}</small></div></div>`; return; }
  let sig = null; for (let i = 1; i < 14 && !sig; i++){ const f = sumarDias(I.hoy, i); if (abierto(f)) sig = f; }
  el.innerHTML = `<p class="abierto-ya" style="font-size:28px">${t('cerrado_ya')}</p>${sig ? `<p class="muted">${t('prox', { d:fechaLarga(sig, L), h:hhmm(Math.min(...turnosDe(sig).map(x => x.desde))) })}</p>` : ''}`;
}
async function pintarHorasHoy(){
  const el = $('#horasHoy'); if (!el || !S.info) return;
  el.previousElementSibling.textContent = t('lugar_t', { n:S.pax });
  let H; try { H = await api('GET', `/api/r/${slug}/horarios?fecha=${S.info.hoy}&pax=${S.pax}`); } catch (e){ el.innerHTML = ''; return; }
  const ahora = ahoraMin(), libres = (H.horarios || []).filter(h => h.libre && h.min > ahora).slice(0, 10);
  el.innerHTML = libres.length ? `<div class="horas-hoy">${libres.map(h => `<button data-hoy="${h.min}">${h.hora}<small>${S.pax} ${S.pax === 1 ? t('persona') : t('personas')}</small></button>`).join('')}</div>`
    : `<p class="muted">${t('sin_lugar_hoy', { n:S.pax })}</p><a class="boton chico" href="#reservar">${t('ver_otro')}</a>`;
}
$('#noche').addEventListener('click', e => {
  const h = e.target.closest('[data-hoy]'); if (h){ S.fecha = S.info.hoy; S.inicio = +h.dataset.hoy; S.paso = 'cuando'; cargarHorarios(); $('#reservar').scrollIntoView({ behavior:quieto ? 'auto' : 'smooth' }); return; }
  const z = e.target.closest('[data-zona]'); if (z){ S.pref = { tipo:'zona', zona:z.dataset.zona }; guardarPrefs(); pintarSalon(); toast(t('pref_zona', { z:z.dataset.zona })); }
});

/* ---------- 4 · el salón para recorrer ---------- */
function pintarSalon(){
  const I = S.info; if (!I || !I.mesas) return;
  const sel = S.pref && S.pref.tipo === 'mesa' ? S.pref.id : null;
  $('#salonPlano').innerHTML = plano({ plano:I.plano, mesas:I.mesas, sel, colores:COLS, estado:m => m.id === sel ? { c:'elegida' } : S.pref && S.pref.tipo === 'zona' && m.zona === S.pref.zona ? { c:'elegida' } : { c:'libre' } });
  const m = sel != null ? I.mesas.find(x => x.id === sel) : null, Z = zonas();
  $('#salonInfo').innerHTML = m ? `<b class="m">${t('mesa')} ${esc(m.codigo)}</b><span class="muted">${t('lugares', { n:m.cap })}${m.zona ? ' · ' + esc(m.zona) : ''}</span><a class="boton pri" href="#reservar">${t('ya_gusta')}</a>`
    : `<span class="muted">${S.pref && S.pref.tipo === 'zona' ? t('pref_zona', { z:esc(S.pref.zona) }) : t('salon_toca')}</span>${Z.length ? `<div class="zonas">${Z.map(z => `<span>${esc(z)}</span>`).join('')}</div>` : ''}`;
}
function tocarSalon(id){
  const m = S.info.mesas.find(x => x.id === id); if (!m) return;
  S.pref = S.pref && S.pref.tipo === 'mesa' && S.pref.id === id ? null : { tipo:'mesa', id, codigo:m.codigo, zona:m.zona || '' };
  guardarPrefs(); pintarSalon(); if (S.pref) toast(t('pref_mesa', { m:m.codigo }));
}
$('#salonPlano').addEventListener('click', e => { const g = e.target.closest('.mesa-g'); if (g) tocarSalon(Number(g.dataset.mesa)); });
$('#salonPlano').addEventListener('keydown', e => { const g = e.target.closest?.('.mesa-g'); if (g && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); tocarSalon(Number(g.dataset.mesa)); } });

/* lo que el cliente fue eligiendo, a la vista al reservar */
function pintarPrefs(){
  const el = $('#prefs'); if (!el) return; const it = [];
  if (S.pref && S.pref.tipo === 'mesa') it.push(['mesa', '◎', t('pref_mesa', { m:esc(S.pref.codigo) })]);
  if (S.pref && S.pref.tipo === 'zona') it.push(['mesa', '◎', t('pref_zona', { z:esc(S.pref.zona) })]);
  if (favs.length) it.push(['favs', '♥', esc(t('pref_platos', { p:lista(favs) }))]);
  el.innerHTML = it.map(([k, i, x]) => `<div class="pref"><span aria-hidden="true">${i}</span><span>${x}</span><button data-quitar="${k}" aria-label="${t('quitar')}">×</button></div>`).join('');
}
$('#prefs').addEventListener('click', e => { const b = e.target.closest('[data-quitar]'); if (!b) return; if (b.dataset.quitar === 'mesa') S.pref = null; else { favs = []; pintarCarta(); } guardarPrefs(); pintarSalon(); });
/* al abrir el plano de la reserva: si la mesa o la zona que le gustó está libre, queda elegida sola */
function aplicarPref(){
  if (!S.plano || !S.pref || S.mesa != null) return;
  if (S.pref.tipo === 'mesa'){ const m = S.plano.mesas.find(x => x.id === S.pref.id); if (!m) return;
    if (m.estado === 'libre'){ S.mesa = m.id; S.al_liberarse = false; toast(t('pref_ok', { m:m.codigo })); } else toast(m.estado === 'no' ? t('no_sirve', { m:m.codigo, c:m.cap }) : t('pref_no', { m:m.codigo })); return; }
  const m = S.plano.mesas.find(x => x.estado === 'libre' && x.zona === S.pref.zona);
  if (m){ S.mesa = m.id; S.al_liberarse = false; toast(t('zona_ok', { m:m.codigo, z:m.zona })); }
}
/* los platos guardados pasan solos a la nota de la reserva */
function notaConFavs(){ if (!favs.length) return; const D = S.datos, linea = t('quiero_probar', { p:favs.join(', ') }); if (!D.notas.includes(linea)) D.notas = (D.notas.replace(/(Quiero probar|I want to try|Quero provar): [^.]*\.?\s*/g, '').trim() + (D.notas.trim() ? ' · ' : '') + linea).trim().replace(/^·\s*/, ''); }

/* ---------- 6 · cómo llegar ---------- */
function pintarLlegar(){
  const I = S.info, r = semilla('mapa');
  $('#btnMapa').href = 'https://www.google.com/maps/search/?api=1&query=-54.8069,-68.3073';
  if (I.whatsapp){ const b = $('#btnWa'); b.hidden = false; b.href = 'https://wa.me/' + encodeURIComponent(I.whatsapp); }
  const lineas = Array.from({ length:14 }, (_, i) => `<path class="agua-l" d="M${(r() * 300).toFixed(0)} ${(120 + i * 8).toFixed(0)} h${(30 + r() * 70).toFixed(0)}" style="--r:-${(r() * 6).toFixed(1)}s"/>`).join('');
  $('#mapaSvg').innerHTML = `<rect width="400" height="260" fill="#1A2620"/>${lineas}
    <path class="costa" d="M0 0 H400 V92 Q 352 112 312 100 T 236 106 Q 196 122 160 104 T 82 96 Q 40 112 0 98Z"/>
    <path class="costa" d="M0 260 V206 Q 60 190 120 202 T 240 196 Q 300 184 340 198 T 400 194 V260Z"/>
    <path class="ruta" d="M70 70 Q 120 40 170 62 T 222 92"/><circle cx="70" cy="70" r="4" fill="#C9CFC0"/>
    <circle class="onda-pin" cx="222" cy="98" r="10" fill="#E7C98F"/><path d="M222 108 C 214 98 210 92 210 86 a12 12 0 0 1 24 0 c0 6 -4 12 -12 22z" fill="#E7C98F"/><circle cx="222" cy="86" r="4" fill="#1A2620"/>
    <text x="236" y="70">ushuaia</text><text x="150" y="152">canal beagle</text><text x="250" y="232">isla navarino</text><text x="40" y="52">aeropuerto</text>`;
}

/* ---------- arranque de las secciones (y un reloj que las mantiene al día) ---------- */
function pintarSecciones(){
  $$('[data-t-title]').forEach(a => a.title = t(a.dataset.tTitle));
  pintarPortada(); pintarMomento(); pintarCarta(); pintarClima(); pintarAbre(); pintarHorasHoy(); pintarSalon(); pintarPrefs(); pintarLlegar();
}
setInterval(() => { if (!S.info || document.hidden) return; pintarAbre(); }, 1000);
setInterval(() => { if (!S.info || document.hidden) return; pintarPortada(); pintarMomento(); }, 30000);
setInterval(() => { if (!S.info || document.hidden) return; pintarHorasHoy(); }, 120000);

ponerEstilo(ls.get('estilo:' + slug) || 'bosque');
iniciar();
