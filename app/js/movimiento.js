/* Mesa Austral · movimiento (diseño 0.3, 16-11-2026)
 * Le da vida a todas las pantallas sin tocar cómo funcionan: mira lo que aparece en la pantalla y anima solo
 * lo que es NUEVO (las pantallas se redibujan seguido; lo que ya estaba no vuelve a saltar).
 * Ideas tomadas (no código) de librerías con más de 1000 estrellas en GitHub: motion (35k), canvas-confetti
 * (12k), mojs (18k), sal (3,6k) y lax.js (10k).
 * Si el teléfono pide «reducir movimiento», no se anima nada. Nada de esto guarda ni manda datos. */
(function(){
  'use strict';
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finoPuntero = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raiz = document.documentElement;

  /* ---------- 1. onda al tocar y una vibración cortita en el teléfono ---------- */
  var TOCABLES = '.boton:not(.brillo),.chip,.dia,.gente button,.pin button';
  document.addEventListener('pointerdown', function(e){
    var b = e.target.closest && e.target.closest(TOCABLES);
    if (b && !b.disabled && !b.hasAttribute('disabled')){
      if (e.pointerType === 'touch' && navigator.vibrate) try { navigator.vibrate(8); } catch (x){}
      if (!quieto){
        var r = b.getBoundingClientRect(), o = document.createElement('span');
        o.className = 'onda';
        o.style.setProperty('--d', Math.max(r.width, r.height) * 2.4 + 'px');
        o.style.setProperty('--ox', (e.clientX - r.left) + 'px');
        o.style.setProperty('--oy', (e.clientY - r.top) + 'px');
        b.appendChild(o); setTimeout(function(){ o.remove(); }, 650);
      }
    }
  }, { passive:true });

  /* ---------- 2. luz que sigue al puntero, inclinación y botón «imán» ---------- */
  var LUZ = '.tarjeta,.num,.lista,.plano-caja,.pregunta,.turno,.hora-ctl,.tabla-caja,.plato,.ficha,.salon-info';
  var pendiente = null;
  document.addEventListener('pointermove', function(e){
    if (quieto || e.pointerType === 'touch') return;
    pendiente = e;
    requestAnimationFrame(function(){
      if (!pendiente) return; var ev = pendiente; pendiente = null;
      var t = ev.target.closest && ev.target.closest(LUZ);
      if (t){ var r = t.getBoundingClientRect(); t.style.setProperty('--mx', (ev.clientX - r.left) + 'px'); t.style.setProperty('--my', (ev.clientY - r.top) + 'px'); }
      var inc = ev.target.closest && ev.target.closest('.inclina');
      if (inc){ var q = inc.getBoundingClientRect(), px = (ev.clientX - q.left) / q.width - .5, py = (ev.clientY - q.top) / q.height - .5;
        inc.style.setProperty('--ry', (px * 10).toFixed(2) + 'deg'); inc.style.setProperty('--rx', (-py * 10).toFixed(2) + 'deg'); }
      var im = finoPuntero && ev.target.closest && ev.target.closest('.boton.brillo');
      if (im){ var s = im.getBoundingClientRect(); im.style.transform = 'translate(' + ((ev.clientX - s.left - s.width / 2) * .18).toFixed(1) + 'px,' + ((ev.clientY - s.top - s.height / 2) * .3).toFixed(1) + 'px)'; }
    });
  }, { passive:true });
  document.addEventListener('pointerout', function(e){
    var inc = e.target.closest && e.target.closest('.inclina');
    if (inc && !inc.contains(e.relatedTarget)){ inc.style.setProperty('--rx', '0deg'); inc.style.setProperty('--ry', '0deg'); }
    var im = e.target.closest && e.target.closest('.boton.brillo');
    if (im && !im.contains(e.relatedTarget)) im.style.transform = '';
  });

  /* ---------- 3. al bajar: barra de avance, aurora con profundidad, cabecera más fina ---------- */
  var barra = null;
  function alBajar(){
    var y = scrollY, alto = document.documentElement.scrollHeight - innerHeight;
    if (barra) barra.style.setProperty('--avance', alto > 0 ? Math.min(1, y / alto).toFixed(4) : 0);
    var au = document.querySelector('.aurora'); if (au && !quieto) au.style.setProperty('--paralaje', (y * .25).toFixed(1) + 'px');
    var cab = document.querySelector('.cab'); if (cab) cab.classList.toggle('achicada', y > 12);
  }
  addEventListener('scroll', function(){ requestAnimationFrame(alBajar); }, { passive:true });

  /* ---------- 4. la tira de días: se arrastra con el mouse y no vuelve al principio al elegir ---------- */
  var diasScroll = 0, arr = null;
  document.addEventListener('scroll', function(e){ if (e.target.classList && e.target.classList.contains('dias')) diasScroll = e.target.scrollLeft; }, true);
  document.addEventListener('pointerdown', function(e){
    var d = e.pointerType === 'mouse' && e.target.closest && e.target.closest('.dias,.carta-pista');
    if (d) arr = { el:d, x:e.clientX, s:d.scrollLeft, movio:false };
  });
  addEventListener('pointermove', function(e){
    if (!arr) return; var dx = e.clientX - arr.x;
    if (Math.abs(dx) > 6){ arr.movio = true; arr.el.classList.add('arrastra'); }
    if (arr.movio) arr.el.scrollLeft = arr.s - dx;
  });
  addEventListener('pointerup', function(){ if (!arr) return; var a = arr; arr = null; setTimeout(function(){ a.el.classList.remove('arrastra'); }, 0);
    if (a.movio){ var tapa = function(ev){ ev.stopPropagation(); ev.preventDefault(); }; addEventListener('click', tapa, true); setTimeout(function(){ removeEventListener('click', tapa, true); }, 0); } });

  /* ---------- 5. la hoja de abajo se cierra deslizándola con el dedo ---------- */
  document.addEventListener('pointerdown', function(e){
    var asa = e.target.closest && e.target.closest('.hoja-asa'); if (!asa) return;
    var h = asa.parentElement, y0 = e.clientY, dy = 0;
    h.classList.add('arrastrando'); asa.setPointerCapture && asa.setPointerCapture(e.pointerId);
    var mueve = function(ev){ dy = Math.max(0, ev.clientY - y0); h.style.transform = 'translateY(' + dy + 'px)'; };
    var suelta = function(){
      asa.removeEventListener('pointermove', mueve); asa.removeEventListener('pointerup', suelta); asa.removeEventListener('pointercancel', suelta);
      h.classList.remove('arrastrando');
      if (dy > 110){ var x = h.querySelector('.hoja-x'); if (x) x.click(); return; }
      h.classList.add('vuelve'); h.style.transform = ''; setTimeout(function(){ h.classList.remove('vuelve'); }, 400);
    };
    asa.addEventListener('pointermove', mueve); asa.addEventListener('pointerup', suelta); asa.addEventListener('pointercancel', suelta);
  });

  /* ---------- 6. festejo al reservar o pagar (papelitos con los colores del restaurante) ---------- */
  function festejo(){
    if (quieto) return;
    var c = document.createElement('canvas'), x = c.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    c.className = 'festejo'; c.width = innerWidth * dpr; c.height = innerHeight * dpr; document.body.appendChild(c); x.scale(dpr, dpr);
    var cs = getComputedStyle(raiz), col = ['--e-g1', '--e-g2', '--e-g3', '--acento', '--canal'].map(function(v){ return cs.getPropertyValue(v).trim(); }).filter(Boolean);
    if (col.length < 3) col = ['#FF4F8B', '#9B5CFF', '#3EE6C9', '#FFC83D'];
    var P = [];
    [[.2, -60], [.8, -120]].forEach(function(o){ for (var i = 0; i < 80; i++){ var a = (o[1] + (Math.random() - .5) * 70) * Math.PI / 180, v = 9 + Math.random() * 9;
      P.push({ x:innerWidth * o[0], y:innerHeight * .9, vx:Math.cos(a) * v, vy:Math.sin(a) * v, r:Math.random() * 6.28, vr:(Math.random() - .5) * .4, w:6 + Math.random() * 6, h:4 + Math.random() * 5, c:col[i % col.length], f:Math.random() < .3 }); } });
    var t0 = performance.now();
    (function cuadro(t){
      var dt = t - t0; x.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach(function(p){ p.vy += .32; p.vx *= .985; p.vy *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - dt / 3200); x.fillStyle = p.c;
        if (p.f){ x.beginPath(); x.arc(0, 0, p.w / 2.4, 0, 6.28); x.fill(); } else x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2)));
        x.restore(); });
      if (dt < 3200) requestAnimationFrame(cuadro); else c.remove();
    })(t0);
  }

  /* ---------- 7. números que cuentan y código que «gira» como una tragamonedas ---------- */
  function contar(el, desde, hasta, fmt){
    if (quieto || desde === hasta){ return; }
    var t0 = performance.now(), dur = 900;
    (function paso(t){ var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(Math.round(desde + (hasta - desde) * e)); if (k < 1 && el.isConnected) requestAnimationFrame(paso); })(t0);
  }
  function leerNum(txt){ var m = /^(\D{0,3}?)([\d.]+)(\s?%?)$/.exec(txt.trim()); if (!m) return null;
    var n = parseInt(m[2].replace(/\./g, ''), 10); if (isNaN(n)) return null;
    var miles = m[2].indexOf('.') >= 0 || n >= 1000;
    return { n:n, fmt:function(v){ return m[1] + (miles ? v.toLocaleString('es-AR') : String(v)) + m[3]; } }; }
  function girarCodigo(el){
    if (quieto) return; var fin = el.textContent, L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', t0 = performance.now();
    (function paso(t){ var k = (t - t0) / 1100, fijas = Math.floor(k * fin.length);
      el.textContent = fin.split('').map(function(ch, i){ return i < fijas || /[\s·-]/.test(ch) ? ch : L[Math.floor(Math.random() * L.length)]; }).join('');
      if (k < 1) requestAnimationFrame(paso); else el.textContent = fin; })(t0);
  }

  /* ---------- 8. mirar la pantalla y animar solo lo nuevo ---------- */
  var ENTRAN = ['.pregunta', '.tarjeta', '.num', '.item', '#app > .aviso', '.pila > .aviso', '.plano-caja', '.ticket', '.entrada', '.msj', '.msj-btns', '.turno', '.rg', '.cal button', '.gente button', '.resumen', '.mesa-info', '.boton.bloque', '.hora-ctl', '.tabla-caja', '.marea', '#app h1', '#app h2', 'main > h1', '.listo-t', '.pin', '.chat-cab'].join(',');
  var ELEGIDOS = '.dia[aria-pressed="true"],.horas .chip.on,.chips .chip.on,.estilos [aria-pressed="true"],.idiomas [aria-pressed="true"],.cal [aria-pressed="true"],.personas b';
  var QUITAR = /\b(aparece|aparece-lado|salta|late|sacude|pop|libre|con-indicador|sin-trans|cargando|inclina|crece|dibuja)\b/g;
  var vistos = new WeakSet(), antes = null, elegidosAntes = new Set(), numsAntes = new Map(), solapasAntes = new Map(), puntosAntes = 0, trazos = new Set(), primera = true;
  function clave(el){
    var k = el.tagName + '.' + String(el.getAttribute('class') || '').replace(QUITAR, '').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < el.attributes.length; i++){ var a = el.attributes[i]; if (a.name.indexOf('data-') === 0) k += '|' + a.name + '=' + a.value; }
    var h = el.matches('.num,.item,.pregunta,.tarjeta,.turno,.rg,.entrada') ? el.querySelector('h1,h2,h3,time,label,span,b') : null;
    return k + '|' + (h ? h.textContent : el.textContent).replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  /* si la pantalla se redibuja en plena animación, la copia nueva sigue desde donde iba la vieja */
  var recientes = new Map();
  function anima(el, clase, i, k){
    if (k) recientes.set(k, { clase:clase, t:performance.now() + Math.min(i, 14) * 45 });
    el.style.setProperty('--retraso', Math.min(i, 14) * 45 + 'ms'); el.classList.add(clase);
    el.addEventListener('animationend', function f(ev){ if (ev.target !== el) return; el.classList.remove(clase); el.removeEventListener('animationend', f); });
  }
  function sigue(el, k){
    var r = recientes.get(k); if (!r || quieto) return; var pasado = performance.now() - r.t;
    if (pasado > 700){ recientes.delete(k); return; }
    el.classList.add(r.clase); el.style.setProperty('--retraso', (-Math.max(0, pasado)).toFixed(0) + 'ms');
    el.addEventListener('animationend', function f(ev){ if (ev.target !== el) return; el.classList.remove(r.clase); el.removeEventListener('animationend', f); });
  }
  function escanear(){
    var ahora = new Set(), nuevos = [];
    document.querySelectorAll(ENTRAN).forEach(function(el){
      if (el.closest('.hoja') && !el.matches('.msj')) return;
      var k = clave(el); ahora.add(k);
      if (vistos.has(el)) return; vistos.add(el);
      if (!antes || !antes.has(k)) nuevos.push(el); else sigue(el, k);
    });
    if (!quieto) nuevos.forEach(function(el, i){ anima(el, el.matches('.item') ? 'aparece-lado' : 'aparece', i, clave(el)); });
    antes = ahora;

    /* «cargando…» se ve como barras que brillan */
    document.querySelectorAll('.muted').forEach(function(m){ var t = m.textContent.trim(); if ((t === '…' || t === 'Cargando…') && !m.children.length) m.classList.add('cargando'); });

    /* lo recién elegido da un saltito */
    var sel = new Set();
    document.querySelectorAll(ELEGIDOS).forEach(function(el){ var k = clave(el) + '#' + el.textContent; sel.add(k);
      if (vistos.has(el)) return; vistos.add(el);
      if (!primera && !elegidosAntes.has(k) && !quieto) anima(el, el.matches('.personas b') ? 'late' : 'salta', 0, k); else sigue(el, k); });
    elegidosAntes = sel;

    /* números que cuentan */
    document.querySelectorAll('.num b').forEach(function(b){
      var k = clave(b.parentElement), v = leerNum(b.textContent); if (!v) return;
      if (!b.dataset.contado){ b.dataset.contado = '1'; var prev = numsAntes.has(k) ? numsAntes.get(k) : 0; if (prev !== v.n) contar(b, prev, v.n, v.fmt); }
      numsAntes.set(k, v.n);
    });

    /* el plano: mesas libres que respiran y, la primera vez, aparecen de a una */
    document.querySelectorAll('.plano-svg').forEach(function(svg){
      if (svg.dataset.vivo) return; svg.dataset.vivo = '1';
      var caja = svg.closest('.plano-caja'), entra = caja && caja.classList.contains('aparece');
      svg.querySelectorAll('.mesa-g').forEach(function(g, i){
        var f = g.querySelector(':scope > ellipse, :scope > rect'), st = f ? f.getAttribute('style') || '' : '';
        if (/var\(--e-acc\)|#2FA36B/i.test(st)){ g.classList.add('libre'); g.style.setProperty('--fase', (-Math.random() * 2.6).toFixed(2) + 's');
          g.style.setProperty('--brillo-mesa', /#2FA36B/i.test(st) ? '#2FA36B' : 'var(--e-acc)'); }
        if (entra && !quieto) anima(g, 'pop', i);
      });
    });

    /* solapas: la píldora se desliza hasta la elegida */
    document.querySelectorAll('.solapas').forEach(function(s){
      var b = s.querySelector('[aria-selected="true"]'); if (!b || !b.offsetWidth) return;
      var k = Array.prototype.map.call(s.querySelectorAll('button'), function(x){ return x.textContent; }).join('|');
      var pos = { x:b.offsetLeft, w:b.offsetWidth }, prev = solapasAntes.get(k);
      if (!s.classList.contains('con-indicador')){
        s.classList.add('con-indicador', 'sin-trans');
        var ini = prev || pos; s.style.setProperty('--x', ini.x + 'px'); s.style.setProperty('--w', ini.w + 'px');
        void s.offsetWidth; s.classList.remove('sin-trans');
      }
      s.style.setProperty('--x', pos.x + 'px'); s.style.setProperty('--w', pos.w + 'px'); solapasAntes.set(k, pos);
    });

    /* el ticket: se imprime, el código gira, se inclina y, al reservar, festejo */
    document.querySelectorAll('.ticket').forEach(function(tk){
      if (tk.dataset.vivo) return; tk.dataset.vivo = '1';
      if (tk.parentElement) tk.parentElement.classList.add('inclina');
      var cod = tk.querySelector('.cod'); if (cod && !primera) girarCodigo(cod);
      if (document.getElementById('reservar')) setTimeout(festejo, 250);
    });
    document.querySelectorAll('.aviso.ok').forEach(function(a){ if (a.dataset.vivo) return; a.dataset.vivo = '1'; if (/Pago recibido/.test(a.textContent) && !primera) festejo(); });
    document.querySelectorAll('.entrada').forEach(function(e){ e.classList.add('inclina'); });

    /* panel del dueño: la marea se dibuja sola y las barras crecen */
    document.querySelectorAll('.marea .linea').forEach(function(p){
      if (p.dataset.vivo) return; p.dataset.vivo = '1'; var d = p.getAttribute('d');
      if (!trazos.has(d) && !quieto){ p.setAttribute('pathLength', '1'); p.classList.add('dibuja'); var ar = p.parentNode.querySelector('.area'); if (ar) ar.classList.add('dibuja'); }
      trazos.add(d);
    });
    document.querySelectorAll('.sem i').forEach(function(i, n){ if (i.dataset.vivo) return; i.dataset.vivo = '1'; if (!quieto) anima(i, 'crece', n); });

    /* PIN: cada número suma un punto que late */
    var pts = document.querySelectorAll('#puntos i.on').length;
    if (pts > puntosAntes && !quieto){ var ult = document.querySelectorAll('#puntos i.on')[pts - 1]; if (ult) anima(ult, 'late', 0); }
    puntosAntes = pts;

    /* la tira de días queda donde estaba */
    var dias = document.querySelector('.dias');
    if (dias && !dias.dataset.vivo){ dias.dataset.vivo = '1'; dias.style.scrollBehavior = 'auto'; dias.scrollLeft = diasScroll; dias.style.scrollBehavior = '';
      if (primera || !diasScroll){ var on = dias.querySelector('[aria-pressed="true"]'); if (on && on.offsetLeft > dias.clientWidth) dias.scrollLeft = on.offsetLeft - 16; } }

    /* hojas: asa para deslizar; avisos de error: la pantalla «dice que no» */
    document.querySelectorAll('.hoja').forEach(function(h){ if (h.querySelector(':scope > .hoja-asa')) return; var a = document.createElement('div'); a.className = 'hoja-asa'; a.setAttribute('aria-hidden', 'true'); h.prepend(a); });
    document.querySelectorAll('.toast.mal').forEach(function(t){ if (t.dataset.vivo) return; t.dataset.vivo = '1'; if (quieto) return;
      var f = document.getElementById('puntos') || document.querySelector('.hoja') || document.getElementById('fCorreo') || document.getElementById('formDatos'); if (f) anima(f, 'sacude', 0); });

    primera = false;
  }
  var programado = false;
  function programar(){ if (programado) return; programado = true; requestAnimationFrame(function(){ programado = false; escanear(); }); }
  function arrancar(){
    if (document.getElementById('reservar') || document.querySelector('.sitio')){ barra = document.createElement('div'); barra.className = 'barra-avance'; barra.setAttribute('aria-hidden', 'true'); document.body.appendChild(barra); }
    escanear(); alBajar();
    new MutationObserver(function(ms){
      for (var i = 0; i < ms.length; i++){ var m = ms[i];
        for (var j = 0; j < m.addedNodes.length; j++){ var n = m.addedNodes[j]; if (n.nodeType === 1 && !n.classList.contains('onda') && !n.classList.contains('festejo')){ programar(); return; } }
        if (m.type === 'attributes' || m.type === 'characterData'){ programar(); return; } }
    }).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['aria-pressed', 'aria-selected'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
