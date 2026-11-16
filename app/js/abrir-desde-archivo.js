/* Si la página se abrió con doble clic (file://), el navegador bloquea los módulos de la app
 * y queda a medio dibujar. Este script NO es un módulo, así que sí corre: avisa cómo abrirla bien. */
(function () {
  if (location.protocol !== 'file:') return;
  var WEB = 'https://claudioravasi-ai.github.io/mesa-austral/app/';
  var pagina = location.pathname.split('/').pop() || 'index.html';
  var destino = WEB + (pagina === 'index.html' ? '' : pagina);
  document.addEventListener('DOMContentLoaded', function () {
    document.documentElement.removeAttribute('data-estilo');
    document.querySelectorAll('link[rel="stylesheet"], style').forEach(function (e) { e.remove(); });
    document.body.innerHTML =
      '<main style="max-width:560px;margin:12vh auto;padding:0 20px;font:16px/1.55 system-ui,-apple-system,sans-serif;color:#1d2328">' +
      '<h1 style="font-size:26px;margin:0 0 12px">Mesa Austral no se abre con doble clic</h1>' +
      '<p>Abriste el archivo directo desde la carpeta. Así el navegador no deja correr la app y se ve rota.</p>' +
      '<p><b>Dos formas de abrirla bien:</b></p>' +
      '<ol><li style="margin-bottom:8px">En internet: <a href="' + destino + '">' + destino + '</a></li>' +
      '<li>En esta Mac: doble clic en <b>Abrir Mesa Austral.command</b>, en la carpeta mesa-austral.</li></ol>' +
      '<p><a href="' + destino + '" style="display:inline-block;margin-top:8px;padding:12px 20px;border-radius:10px;background:#C9774A;color:#fff;text-decoration:none;font-weight:700">Abrir la versión de internet</a></p>' +
      '</main>';
    document.body.style.cssText = 'margin:0;background:#F4EFE6';
  });
})();
