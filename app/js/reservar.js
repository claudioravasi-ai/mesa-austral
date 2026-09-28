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
const FONDO = { canal:'#0C1720', bistro:'#F3EEE4', palermo:'#0E231B', galeria:'#F6F6F2' };
const COLS = { libre:{ f:'var(--e-acc)', t:'var(--e-acc-ink)' }, elegida:{ f:'var(--e-ink)', t:'var(--e-bg)' }, ocupada:{ f:'var(--e-ocupada)', t:'var(--e-ocupada-t)', nota:'var(--e-nota-t)' }, no:{ f:'transparent', t:'var(--e-muted)', b:'var(--e-line-2)' } };
const telLindo = n => n ? '+' + n.replace(/^(\d{2})(\d)(\d{4})(\d{6})$/, '$1 $2 $3 $4') : '';

/* ---------- estilo ---------- */
function ponerEstilo(e, guardar){
  if (!FONDO[e]) e = 'canal';
  document.documentElement.dataset.estilo = e; $('meta[name="theme-color"]').content = FONDO[e];
  $$('.estilos [data-estilo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.estilo === e));
  if (guardar) ls.set('estilo:' + slug, e);
}
$$('.estilos [data-estilo]').forEach(b => b.addEventListener('click', () => ponerEstilo(b.dataset.estilo, true)));
function lineas(){ let d = ''; for (let i = 0; i < 9; i++){ let p = `M0 ${40 + i * 30}`; for (let x = 0; x <= 760; x += 38) p += ` Q${x + 19} ${40 + i * 30 + Math.sin((x + i * 60) / 90) * (14 + i * 2)} ${x + 38} ${40 + i * 30}`; d += `<path d="${p}" opacity="${(1 - i / 11).toFixed(2)}"/>`; } $('#lineas').innerHTML = d; }

/* ---------- datos del restaurante ---------- */
async function iniciar(){
  await barraPrueba(); lineas();
  try { S.info = await api('GET', `/api/r/${slug}`); } catch (e){ app.innerHTML = `<div class="aviso mal">${esc(e.message)}</div>`; return; }
  const I = S.info, pg = I.pagina || {};
  ponerEstilo(ls.get('estilo:' + slug) || pg.estilo || 'canal');
  document.title = I.nombre + ' · ' + t('reservas');
  const partes = I.nombre.split(' '), primera = partes.shift();
  $('#nombreResto').innerHTML = `<span>${esc(primera)}</span>${partes.length ? `<em>${esc(partes.join(' '))}</em>` : ''}`;
  $('#marca').textContent = I.subtitulo || I.nombre; $('#monograma').textContent = I.nombre.replace(/^(el|la|los|las)\s+/i, '').slice(0, 1).toUpperCase();
  $('#lema').textContent = pg.lema || I.subtitulo || '';
  const platos = (pg.destacados && pg.destacados.length ? pg.destacados : [I.subtitulo || I.nombre]).map(esc);
  $('#pista').innerHTML = [...platos, ...platos].map(p => `<span>${p}</span><i>✦</i>`).join('');
  S.fecha = primerDiaAbierto(I.hoy);
  pintarFijos(); pintar(); cargarHorarios();
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
async function verMesas(){ S.paso = 'mesa'; S.plano = null; pintar(); subir(); try { S.plano = await api('GET', `/api/r/${slug}/plano?fecha=${S.fecha}&inicio=${S.inicio}&pax=${S.pax}`); } catch (e){ toast(e.message, 'mal'); S.paso = 'cuando'; } pintar(); }
function tocarMesa(id){
  const m = S.plano.mesas.find(x => x.id === id); if (!m) return;
  if (m.estado === 'libre'){ S.mesa = id; S.al_liberarse = false; pintar(); return; }
  if (m.estado === 'no'){ toast(t('no_sirve', { m:m.codigo, c:m.cap })); return; }
  if (!m.desde){ toast(t('sin_libre', { m:m.codigo })); return; }
  const h = hoja(`<h3 class="disp" style="font-size:34px">${t('ocupada_t', { m:esc(m.codigo) })}</h3><p>${t('ocupada_p', { h:`<b>${m.desde_hora}</b>` })}</p><div class="pol">${politica(m.desde)}</div>
    <button class="boton pri bloque" data-pedir>${t('pedir', { h:m.desde_hora })}</button>`);
  h.el.querySelector('[data-pedir]').addEventListener('click', () => { S.mesa = id; S.inicio = m.desde; S.al_liberarse = true; S.idem = crypto.randomUUID(); h.cerrar(); S.paso = 'datos'; pintar(); subir(); });
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
  const p = e.target.closest('[data-pax]'); if (p){ S.pax = Math.max(1, Math.min(S.info.politica.max_pax, S.pax + +p.dataset.pax)); cargarHorarios(); return; }
  const h = e.target.closest('[data-hora]'); if (h){ S.inicio = +h.dataset.hora; pintar(); return; }
  const o = e.target.closest('[data-ocasion]'); if (o){ guardarDatos(); S.datos.ocasion = S.datos.ocasion === o.dataset.ocasion ? '' : o.dataset.ocasion; pintar(); return; }
  const m = e.target.closest('.mesa-g'); if (m){ tocarMesa(Number(m.dataset.mesa)); return; }
  const a = e.target.closest('[data-accion]'); if (!a) return;
  switch (a.dataset.accion){
    case 'ver-mesas': S.mesa = null; S.al_liberarse = false; verMesas(); break;
    case 'volver-cuando': S.paso = 'cuando'; pintar(); subir(); break;
    case 'volver-mesa': guardarDatos(); verMesas(); break;
    case 'a-datos': S.idem = crypto.randomUUID(); S.paso = 'datos'; pintar(); subir(); break;
    case 'auto': S.mesa = null; S.al_liberarse = false; S.idem = crypto.randomUUID(); S.paso = 'datos'; pintar(); subir(); break;
    case 'espera': listaEspera(); break;
    case 'otra': S.paso = 'cuando'; S.res = null; S.mesa = null; cargarHorarios(); subir(); break;
  }
});
app.addEventListener('keydown', e => { const m = e.target.closest?.('.mesa-g'); if (m && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); tocarMesa(Number(m.dataset.mesa)); } });
$$('.idiomas button').forEach(b => b.addEventListener('click', () => { if (S.paso === 'datos') guardarDatos(); L = b.dataset.l; ls.set('idioma', L); pintarFijos(); pintar(); }));
ponerEstilo(ls.get('estilo:' + slug) || 'canal');
iniciar();
