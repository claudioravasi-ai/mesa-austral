/* Entrada del personal: el dueño con correo y contraseña; el equipo con su PIN, solo en tablets que el dueño habilitó. */
import { $, esc, api, ls, toast, CONFIG, MODO_PRUEBA } from './comun.js';

export const slug = new URLSearchParams(location.search).get('r') || ls.get('resto') || CONFIG.RESTO;
export function sesionGuardada(){ try { return JSON.parse(ls.get('sesion:' + slug) || 'null'); } catch (e){ return null; } }
export function guardarSesion(s){ ls.set('sesion:' + slug, s ? JSON.stringify(s) : null); }
export const tablet = () => ls.get('tablet:' + slug);

export async function pantallaEntrada(app, { soloDueno = false, alEntrar }){
  let eq = { habilitada:false, equipo:[] };
  if (!soloDueno) try { eq = await api('GET', `/api/equipo?slug=${slug}`, undefined, { tablet:tablet() }); } catch (e){}
  const ayudaPrueba = MODO_PRUEBA ? `<div class="aviso warn">Modo prueba: las cuentas de prueba están en el archivo <b>DATOS-DE-PRUEBA.md</b> de la carpeta del proyecto.</div>` : '';
  const conCorreo = () => {
    app.innerHTML = `<div class="envol angosto pila"><h1>${soloDueno ? 'Panel del dueño' : 'Entrar'}</h1>${ayudaPrueba}
      <form class="tarjeta" id="fCorreo"><div class="campo"><label for="lMail">Correo</label><input id="lMail" type="email" autocomplete="username" required></div>
      <div class="campo"><label for="lClave">Contraseña</label><input id="lClave" type="password" autocomplete="current-password" required></div>
      <button class="boton pri bloque" type="submit">Entrar</button></form>
      ${eq.habilitada && !soloDueno ? '<button class="boton bloque" id="volverPin">Entrar con PIN</button>' : ''}</div>`;
    $('#fCorreo').addEventListener('submit', async e => {
      e.preventDefault();
      try { const r = await api('POST', '/api/login', { slug, email:$('#lMail').value, clave:$('#lClave').value }); guardarSesion(r); alEntrar(r); }
      catch (err){ toast(err.message, 'mal'); }
    });
    $('#volverPin')?.addEventListener('click', conPin);
  };
  const conPin = () => {
    app.innerHTML = `<div class="envol angosto pila"><h1>¿Quién entra?</h1>${ayudaPrueba}<div class="gente">${eq.equipo.map(p => `<button data-p="${p.id}">${esc(p.nombre)}<small>${esc(p.rol)}</small></button>`).join('')}</div>
      <button class="boton bloque" id="conCorreo">Entrar con correo</button></div>`;
    app.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => pad(eq.equipo.find(p => String(p.id) === b.dataset.p))));
    $('#conCorreo').addEventListener('click', conCorreo);
  };
  const pad = p => {
    let pin = '';
    app.innerHTML = `<div class="envol angosto pila" style="text-align:center"><h2>${esc(p.nombre)}</h2><p class="muted">Tu PIN de 4 números</p><div class="puntos" id="puntos"></div>
      <div class="pin">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(n => n === '' ? '<span></span>' : `<button data-n="${n}" aria-label="${n === '⌫' ? 'Borrar' : n}">${n}</button>`).join('')}</div>
      <button class="boton" id="otro">Elegir otra persona</button></div>`;
    const puntos = () => $('#puntos').innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('');
    puntos();
    app.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', async () => {
      if (b.dataset.n === '⌫'){ pin = pin.slice(0, -1); puntos(); return; }
      if (pin.length >= 4) return; pin += b.dataset.n; puntos();
      if (pin.length === 4){
        try { const r = await api('POST', '/api/login', { slug, personal:p.id, pin }, { tablet:tablet() }); guardarSesion(r); alEntrar(r); }
        catch (err){ toast(err.message, 'mal'); pin = ''; puntos(); }
      }
    }));
    $('#otro').addEventListener('click', conPin);
  };
  if (eq.habilitada && !soloDueno) conPin(); else conCorreo();
}
export async function habilitarTablet(ses){ const r = await api('POST', '/api/dueno/tablet', {}, { token:ses.token }); ls.set('tablet:' + slug, r.tablet); return true; }
