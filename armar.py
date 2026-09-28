#!/usr/bin/env python3
"""Arma las páginas completas (para GitHub Pages) a partir de los fragmentos de src/.
Los fragmentos son los que se publican como Artifact; acá se les agrega el esqueleto
con <meta charset="utf-8"> para que las tildes se vean bien fuera de Claude."""
import pathlib
AQUI = pathlib.Path(__file__).parent
PAGINAS = {'venta.html': 'index.html', 'analisis.html': 'analisis.html'}
for fuente, destino in PAGINAS.items():
    f = AQUI / 'src' / fuente
    if not f.exists():
        continue
    cuerpo = f.read_text(encoding='utf-8')
    doc = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
           + cuerpo + '\n</html>\n')
    (AQUI / destino).write_text(doc, encoding='utf-8')
    print(f'{fuente} -> {destino} ({len(doc):,} bytes)')
