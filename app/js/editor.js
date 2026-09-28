/* Editor del salón en 2D: paredes, ventanas, barra, mesas… se agregan, se arrastran, se estiran y se borran. */
import { $, esc, api, plano, toast } from './comun.js';

const NUEVOS = {
  pared_h:{ tipo:'pared', w:200, h:10 }, pared_v:{ tipo:'pared', w:10, h:200 }, ventana:{ tipo:'ventana', w:160, h:12, texto:'Ventana' }, puerta:{ tipo:'puerta', w:70, h:14, texto:'' },
  entrada:{ tipo:'entrada', w:100, h:16, texto:'Entrada' }, barra:{ tipo:'barra', w:60, h:180, texto:'Barra' }, hogar:{ tipo:'hogar', w:120, h:16, texto:'Hogar' },
  columna:{ tipo:'columna', w:24, h:24 }, planta:{ tipo:'planta', w:34, h:34 }, zona:{ tipo:'zona', w:260, h:180, texto:'Terraza' },
};
const MESAS_NUEVAS = { redonda2:{ forma:'redonda', w:60, h:60, cap_max:2, cap_min:1 }, cuadrada4:{ forma:'cuadrada', w:80, h:80, cap_max:4, cap_min:2 }, rect6:{ forma:'rect', w:150, h:78, cap_max:6, cap_min:4 }, redonda8:{ forma:'redonda', w:120, h:120, cap_max:8, cap_min:5 } };
const NOMBRE_EL = { pared:'Pared', ventana:'Ventana', puerta:'Puerta', entrada:'Entrada', barra:'Barra', hogar:'Hogar', columna:'Columna', planta:'Planta', zona:'Zona' };

export function montarEditor(cont, N, ses, alGuardar){
  const E = { plano:JSON.parse(JSON.stringify(N.resto.plano || { ancho:800, alto:520, elementos:[] })), mesas:N.mesas.map(m => ({ ...m })), sel:null, historial:[], cambios:false, grilla:10 };
  if (!E.plano.elementos) E.plano.elementos = [];
  const guardarPaso = () => { E.historial.push(JSON.stringify({ p:E.plano, m:E.mesas })); if (E.historial.length > 60) E.historial.shift(); E.cambios = true; };
  const nid = p => p + Math.random().toString(36).slice(2, 7);
  const redondo = v => Math.round(v / E.grilla) * E.grilla;
  const buscar = sel => sel ? (sel.k === 'm' ? E.mesas.find(m => String(m.id) === sel.id) : E.plano.elementos.find(e => e.id === sel.id)) : null;

  cont.innerHTML = `<div class="editor">
    <div class="ed-barra">
      <div class="ed-grupo"><span class="etiqueta">Mesas</span><button class="boton chico" data-nm="redonda2">○ Redonda 2</button><button class="boton chico" data-nm="cuadrada4">□ Cuadrada 4</button><button class="boton chico" data-nm="rect6">▭ Larga 6</button><button class="boton chico" data-nm="redonda8">◯ Redonda 8</button></div>
      <div class="ed-grupo"><span class="etiqueta">El lugar</span><button class="boton chico" data-ne="pared_h">Pared ─</button><button class="boton chico" data-ne="pared_v">Pared │</button><button class="boton chico" data-ne="ventana">Ventana</button><button class="boton chico" data-ne="puerta">Puerta</button><button class="boton chico" data-ne="entrada">Entrada</button><button class="boton chico" data-ne="barra">Barra</button><button class="boton chico" data-ne="hogar">Hogar</button><button class="boton chico" data-ne="columna">Columna</button><button class="boton chico" data-ne="planta">Planta</button><button class="boton chico" data-ne="zona">Zona</button></div>
    </div>
    <div class="ed-cuerpo">
      <div class="ed-lienzo plano-caja" id="edLienzo"></div>
      <aside class="ed-panel tarjeta plana" id="edPanel"></aside>
    </div>
    <div class="fila-h entre ed-pie"><div class="fila-h"><button class="boton chico" id="edDeshacer">↶ Deshacer</button><label class="muted" style="font-size:14px">Tamaño del lugar <input id="edAncho" type="number" min="300" max="3000" step="10" value="${E.plano.ancho}" style="width:82px"> × <input id="edAlto" type="number" min="200" max="3000" step="10" value="${E.plano.alto}" style="width:82px"></label></div>
      <button class="boton pri" id="edGuardar">Guardar el salón</button></div>
    <p class="aviso warn solo-movil">El editor se usa mejor en tablet o computadora: en el teléfono las piezas quedan chicas.</p>
    <p class="muted" style="font-size:13.5px">Arrastrá para mover. El punto naranja estira. Con las flechas del teclado se ajusta de a poco. Las mesas con la misma letra en «Se junta con» se pueden unir para grupos grandes.</p>
  </div>`;
  const lienzo = $('#edLienzo', cont), panel = $('#edPanel', cont);

  function dibujar(){
    const s = buscar(E.sel); let extra = '';
    if (s){ extra = `<rect x="${s.x - 4}" y="${s.y - 4}" width="${s.w + 8}" height="${s.h + 8}" fill="none" stroke="#D9481F" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/><circle class="ed-asa" cx="${s.x + s.w}" cy="${s.y + s.h}" r="9" fill="#D9481F" stroke="#fff" stroke-width="2"/>`; }
    lienzo.innerHTML = plano({ plano:E.plano, mesas:E.mesas.map(m => ({ ...m, cap:m.cap_max })), sel:E.sel?.k === 'm' ? E.sel.id : null, edit:true, estado:() => ({ c:'neutra' }), extra });
    const svg = lienzo.querySelector('svg'); svg.classList.add('ed-svg'); svg.setAttribute('tabindex', '0');
  }
  function pintarPanel(){
    const s = buscar(E.sel);
    if (!s){ panel.innerHTML = `<b>Tocá algo del plano para editarlo</b><p class="muted">${E.mesas.length} mesas · ${E.mesas.reduce((a, m) => a + (+m.cap_max || 0), 0)} lugares · ${E.plano.elementos.length} elementos del lugar.</p>${E.cambios ? '<div class="aviso warn">Hay cambios sin guardar.</div>' : ''}`; return; }
    const num = (id, l, v, min = 4, max = 3000) => `<div class="campo"><label for="${id}">${l}</label><input id="${id}" type="number" min="${min}" max="${max}" value="${Math.round(v)}"></div>`;
    if (E.sel.k === 'm') panel.innerHTML = `<b>Mesa ${esc(s.codigo)}</b>
      <div class="campo"><label for="pCod">Nombre</label><input id="pCod" maxlength="8" value="${esc(s.codigo)}"></div>
      <div class="dos-col">${num('pCap', 'Lugares', s.cap_max, 1, 30)}${num('pMin', 'Mínimo de personas', s.cap_min || 1, 1, 30)}</div>
      <div class="campo"><label for="pForma">Forma</label><select id="pForma">${[['redonda', 'Redonda'], ['cuadrada', 'Cuadrada'], ['rect', 'Rectangular']].map(([v, n]) => `<option value="${v}" ${s.forma === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="dos-col"><div class="campo"><label for="pZona">Zona</label><input id="pZona" maxlength="30" value="${esc(s.zona || '')}" placeholder="Ventanal, salón…"></div><div class="campo"><label for="pComb">Se junta con</label><input id="pComb" maxlength="3" value="${esc(s.combina || '')}" placeholder="Letra, p. ej. F"></div></div>
      <div class="dos-col">${num('pW', 'Ancho', s.w, 20)}${num('pH', 'Alto', s.h, 20)}</div>
      <div class="fila-h"><button class="boton chico" data-p="girar">Girar</button><button class="boton chico" data-p="duplicar">Duplicar</button><button class="boton chico peligro" data-p="borrar">Quitar</button></div>`;
    else panel.innerHTML = `<b>${NOMBRE_EL[s.tipo] || s.tipo}</b>
      ${['pared', 'columna', 'planta'].includes(s.tipo) ? '' : `<div class="campo"><label for="pTxt">Texto</label><input id="pTxt" maxlength="30" value="${esc(s.texto || '')}"></div>`}
      <div class="dos-col">${num('pW', 'Ancho', s.w)}${num('pH', 'Alto', s.h)}</div>
      <div class="fila-h"><button class="boton chico" data-p="girar">Girar</button><button class="boton chico" data-p="duplicar">Duplicar</button><button class="boton chico peligro" data-p="borrar">Quitar</button></div>`;
    panel.querySelectorAll('input, select').forEach(i => i.addEventListener('change', () => {
      guardarPaso(); const v = i.value;
      ({ pCod:() => s.codigo = v.toUpperCase().slice(0, 8), pCap:() => s.cap_max = Math.max(1, +v), pMin:() => s.cap_min = Math.max(1, +v), pForma:() => s.forma = v, pZona:() => s.zona = v, pComb:() => s.combina = v.toUpperCase(),
        pW:() => s.w = Math.max(4, +v), pH:() => s.h = Math.max(4, +v), pTxt:() => s.texto = v })[i.id]();
      dibujar(); pintarPanel();
    }));
  }
  function agregar(obj, esMesa){
    guardarPaso();
    const x = redondo(E.plano.ancho / 2 - obj.w / 2), y = redondo(E.plano.alto / 2 - obj.h / 2);
    if (esMesa){ let n = 1; while (E.mesas.some(m => m.codigo === 'N' + n)) n++; const m = { id:nid('n'), codigo:'N' + n, zona:'', combina:'', ...obj, x, y }; E.mesas.push(m); E.sel = { k:'m', id:String(m.id) }; }
    else { const e = { id:nid('e'), ...obj, x, y }; E.plano.elementos.push(e); E.sel = { k:'e', id:e.id }; }
    dibujar(); pintarPanel();
  }
  cont.querySelectorAll('[data-nm]').forEach(b => b.addEventListener('click', () => agregar({ ...MESAS_NUEVAS[b.dataset.nm] }, true)));
  cont.querySelectorAll('[data-ne]').forEach(b => b.addEventListener('click', () => agregar({ ...NUEVOS[b.dataset.ne] }, false)));
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-p]'); if (!b) return; const s = buscar(E.sel); if (!s) return; guardarPaso();
    if (b.dataset.p === 'girar'){ const cx = s.x + s.w / 2, cy = s.y + s.h / 2; [s.w, s.h] = [s.h, s.w]; s.x = redondo(cx - s.w / 2); s.y = redondo(cy - s.h / 2); }
    if (b.dataset.p === 'duplicar'){ if (E.sel.k === 'm'){ let n = 1; while (E.mesas.some(m => m.codigo === 'N' + n)) n++; const c = { ...s, id:nid('n'), codigo:'N' + n, x:s.x + 30, y:s.y + 30 }; E.mesas.push(c); E.sel = { k:'m', id:String(c.id) }; } else { const c = { ...s, id:nid('e'), x:s.x + 30, y:s.y + 30 }; E.plano.elementos.push(c); E.sel = { k:'e', id:c.id }; } }
    if (b.dataset.p === 'borrar'){ if (E.sel.k === 'm') E.mesas = E.mesas.filter(m => String(m.id) !== E.sel.id); else E.plano.elementos = E.plano.elementos.filter(x => x.id !== E.sel.id); E.sel = null; }
    dibujar(); pintarPanel();
  });

  /* arrastrar y estirar */
  let arr = null;
  const aSvg = (svg, ev) => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  lienzo.addEventListener('pointerdown', ev => {
    const svg = lienzo.querySelector('svg'); if (!svg) return;
    const asa = ev.target.closest('.ed-asa'), gm = ev.target.closest('[data-mesa]'), ge = ev.target.closest('[data-el]');
    const pt = aSvg(svg, ev);
    if (asa){ const s = buscar(E.sel); guardarPaso(); arr = { modo:'estirar', s, x0:pt.x, y0:pt.y, w0:s.w, h0:s.h }; }
    else if (gm || ge){ E.sel = gm ? { k:'m', id:gm.dataset.mesa } : { k:'e', id:ge.dataset.el }; const s = buscar(E.sel); guardarPaso(); arr = { modo:'mover', s, dx:pt.x - s.x, dy:pt.y - s.y, movio:false }; dibujar(); pintarPanel(); }
    else { E.sel = null; dibujar(); pintarPanel(); return; }
    lienzo.setPointerCapture(ev.pointerId); ev.preventDefault();
  });
  let raf = 0;
  lienzo.addEventListener('pointermove', ev => {
    if (!arr) return; const svg = lienzo.querySelector('svg'), pt = aSvg(svg, ev), s = arr.s;
    if (arr.modo === 'mover'){ s.x = Math.max(-20, Math.min(E.plano.ancho - 10, redondo(pt.x - arr.dx))); s.y = Math.max(-20, Math.min(E.plano.alto - 10, redondo(pt.y - arr.dy))); arr.movio = true; }
    else { s.w = Math.max(E.sel.k === 'm' ? 30 : 4, redondo(arr.w0 + pt.x - arr.x0)); s.h = Math.max(E.sel.k === 'm' ? 30 : 4, redondo(arr.h0 + pt.y - arr.y0)); if (E.sel.k === 'm' && s.forma !== 'rect' && s.forma === 'cuadrada') s.h = s.w; }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(dibujar);
  });
  const soltar = () => { if (!arr) return; if (arr.modo === 'mover' && !arr.movio) E.historial.pop(); arr = null; dibujar(); pintarPanel(); };
  lienzo.addEventListener('pointerup', soltar); lienzo.addEventListener('pointercancel', soltar);
  /* Un toque simple (o Enter sobre una pieza con el teclado) también la elige. */
  const elegir = t => { const gm = t.closest('[data-mesa]'), ge = t.closest('[data-el]'); if (!gm && !ge) return false; E.sel = gm ? { k:'m', id:gm.dataset.mesa } : { k:'e', id:ge.dataset.el }; dibujar(); pintarPanel(); return true; };
  lienzo.addEventListener('click', ev => { if (ev.detail === 0 || !arr) elegir(ev.target); });
  lienzo.addEventListener('keydown', ev => {
    if ((ev.key === 'Enter' || ev.key === ' ') && elegir(ev.target)){ ev.preventDefault(); lienzo.querySelector('svg')?.focus(); return; }
    const s = buscar(E.sel); if (!s) return; const d = ev.shiftKey ? 10 : 2, mv = { ArrowLeft:[-d, 0], ArrowRight:[d, 0], ArrowUp:[0, -d], ArrowDown:[0, d] }[ev.key];
    if (mv){ ev.preventDefault(); guardarPaso(); s.x += mv[0]; s.y += mv[1]; dibujar(); }
    if (ev.key === 'Delete' || ev.key === 'Backspace'){ ev.preventDefault(); panel.querySelector('[data-p="borrar"]')?.click(); }
  });
  $('#edDeshacer', cont).addEventListener('click', () => { const h = E.historial.pop(); if (!h){ toast('No hay nada para deshacer'); return; } const o = JSON.parse(h); E.plano = o.p; E.mesas = o.m; E.sel = null; dibujar(); pintarPanel(); });
  ['edAncho', 'edAlto'].forEach(id => $('#' + id, cont).addEventListener('change', e => { guardarPaso(); E.plano[id === 'edAncho' ? 'ancho' : 'alto'] = Math.max(200, Math.min(3000, +e.target.value || 800)); dibujar(); }));
  $('#edGuardar', cont).addEventListener('click', async () => {
    const cods = E.mesas.map(m => String(m.codigo).trim().toUpperCase()); const rep = cods.find((c, i) => cods.indexOf(c) !== i);
    if (rep){ toast(`Hay dos mesas llamadas ${rep}`, 'mal'); return; }
    try {
      await api('PUT', '/api/dueno/plano', { ancho:E.plano.ancho, alto:E.plano.alto, elementos:E.plano.elementos, mesas:E.mesas.map(m => ({ id:/^\d+$/.test(String(m.id)) ? m.id : null, codigo:m.codigo, forma:m.forma, x:m.x, y:m.y, w:m.w, h:m.h, cap_max:m.cap_max, cap_min:m.cap_min || 1, zona:m.zona, combina:m.combina })) }, { token:ses.token });
      E.cambios = false; toast('Salón guardado. Las reservas nuevas ya lo usan.'); alGuardar && alGuardar();
    } catch (e){ toast(e.message, 'mal'); }
  });
  dibujar(); pintarPanel();
  return { hayCambios:() => E.cambios };
}
