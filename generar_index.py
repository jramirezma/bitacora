#!/usr/bin/env python3
"""
Genera index.json a partir de los metadatos en cada archivo HTML de ejercicios.
Ejecutar: python3 generar_index.py

- Se incluyen solo los archivos sin inconsistencias.
- Si hay inconsistencias se listan al final pero el JSON se genera igual con los válidos.
- Si todo está ok, solo se muestra el mensaje de éxito.
"""
import json
import re
from pathlib import Path

EJERCICIOS_DIR = Path("ejercicios")
INDEX_FILE = Path("index.json")

def extraer_metadata(html_path):
    """
    Extrae window.EJERCICIO del HTML.
    Retorna (metadata, errores). Si hay errores, metadata es None.
    """
    contenido = html_path.read_text(encoding="utf-8")

    match = re.search(r'window\.EJERCICIO\s*=\s*(\{.*?\});', contenido, re.DOTALL)
    if not match:
        return None, ["no se encontró window.EJERCICIO"]

    try:
        json_str = match.group(1)

        # Agregar comillas a claves sin comillas (JS -> JSON)
        json_str = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)', r'\1"\2"\3', json_str)

        # Reemplazar objeto autor anidado
        json_str = re.sub(
            r'"autor"\s*:\s*\{([^}]+)\}',
            lambda m: '"autor": {' + re.sub(
                r'([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)', r'"\1"\2', m.group(1)
            ) + '}',
            json_str
        )

        metadata = json.loads(json_str)
        id_meta = metadata.get("id", "")
        errores = []

        if html_path.stem != id_meta:
            errores.append(f"nombre de archivo '{html_path.stem}' ≠ id '{id_meta}'")

        title_match = re.search(r'<title>(.*?)</title>', contenido, re.IGNORECASE)
        title_val = title_match.group(1).strip() if title_match else ""
        if title_val != id_meta:
            errores.append(f"<title>'{title_val}'</title> ≠ id '{id_meta}'")

        if errores:
            return None, errores

        # Normalizar: garantizar que los campos de busqueda sean siempre listas
        campos_lista = ["materia", "tema", "dificultad", "seo_keywords"]
        for campo in campos_lista:
            if campo in metadata and isinstance(metadata[campo], str):
                metadata[campo] = [metadata[campo]]

        metadata["archivo"] = f"ejercicios/{html_path.name}"

        enunciado_match = re.search(
            r'<div class="[^"]*ejercicio[^"]*">(.*?)</div>',
            contenido, re.DOTALL
        )
        if enunciado_match:
            texto_limpio = re.sub(r'<[^>]+>', '', enunciado_match.group(1)).strip()
            texto_limpio = re.sub(r'\s+', ' ', texto_limpio)
            metadata["enunciado"] = texto_limpio[:200]

        return metadata, []

    except json.JSONDecodeError as e:
        return None, [f"error al parsear JSON: {e}"]

def generar_index():
    ejercicios = []
    todos_los_campos = set()
    inconsistencias = {}  # {nombre_archivo: [errores]}

    if not EJERCICIOS_DIR.exists():
        print(f"Carpeta {EJERCICIOS_DIR} no existe")
        return

    for html_file in sorted(EJERCICIOS_DIR.glob("*.html")):
        if html_file.name == "plantilla.html":
            continue

        metadata, errores = extraer_metadata(html_file)
        if errores:
            inconsistencias[html_file.name] = errores
        elif metadata:
            todos_los_campos.update(metadata.keys())
            ejercicios.append(metadata)

    ejercicios.sort(key=lambda x: x.get("fecha", ""), reverse=True)

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(ejercicios, f, ensure_ascii=False, indent=2)

    if inconsistencias:
        print(f"⚠ index.json generado con {len(ejercicios)} ejercicio(s) — {len(inconsistencias)} excluido(s) por inconsistencias:\n")
        for archivo, errores in inconsistencias.items():
            print(f"  {archivo}")
            for e in errores:
                print(f"    • {e}")
    else:
        print(f"✓ index.json generado con {len(ejercicios)} ejercicio(s).")

if __name__ == "__main__":
    generar_index()
