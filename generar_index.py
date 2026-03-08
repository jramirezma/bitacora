#!/usr/bin/env python3
"""
Genera index.json a partir de los metadatos en cada archivo HTML de ejercicios.
Ejecutar: python3 generar_index.py

El script extrae TODOS los campos que existan en window.EJERCICIO de cada archivo.
"""
import json
import os
import re
from pathlib import Path

EJERCICIOS_DIR = Path("ejercicios")
INDEX_FILE = Path("index.json")

def extraer_metadata(html_path):
    """Extrae window.EJERCICIO del HTML."""
    contenido = html_path.read_text(encoding="utf-8")

    match = re.search(r'window\.EJERCICIO\s*=\s*(\{.*?\});', contenido, re.DOTALL)
    if not match:
        return None

    try:
        json_str = match.group(1)

        # Agregar comillas a claves sin comillas (JS -> JSON)
        json_str = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)', r'\1"\2"\3', json_str)

        # Reemplazar objeto autor anidado (las claves internas también necesitan comillas)
        json_str = re.sub(
            r'"autor"\s*:\s*\{([^}]+)\}',
            lambda m: '"autor": {' + re.sub(
                r'([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)', r'"\1"\2', m.group(1)
            ) + '}',
            json_str
        )

        metadata = json.loads(json_str)

        # Normalizar: garantizar que los campos de busqueda sean siempre listas
        campos_lista = ["materia", "tema", "dificultad", "seo_keywords"]
        for campo in campos_lista:
            if campo in metadata and isinstance(metadata[campo], str):
                metadata[campo] = [metadata[campo]]

        # Campo automatico: archivo
        metadata["archivo"] = f"ejercicios/{html_path.name}"

        # Extraer enunciado del div.ejercicio
        enunciado_match = re.search(
            r'<div class="[^"]*ejercicio[^"]*">(.*?)</div>',
            contenido, re.DOTALL
        )
        if enunciado_match:
            texto_limpio = re.sub(r'<[^>]+>', '', enunciado_match.group(1)).strip()
            texto_limpio = re.sub(r'\s+', ' ', texto_limpio)
            metadata["enunciado"] = texto_limpio[:200]

        return metadata

    except json.JSONDecodeError as e:
        print(f"Error en {html_path.name}: {e}")
        return None

def generar_index():
    """Genera el index.json con todos los campos encontrados."""
    ejercicios = []
    todos_los_campos = set()

    if not EJERCICIOS_DIR.exists():
        print(f"Carpeta {EJERCICIOS_DIR} no existe")
        return

    for html_file in sorted(EJERCICIOS_DIR.glob("*.html")):
        if html_file.name == "plantilla.html":
            continue

        metadata = extraer_metadata(html_file)
        if metadata:
            todos_los_campos.update(metadata.keys())
            ejercicios.append(metadata)
            print(f"✓ {metadata.get('id', 'sin ID')} — {metadata.get('tema', ['sin tema'])[0]}")
        else:
            print(f"✗ {html_file.name} — sin metadatos")

    # Ordenar por fecha descendente
    ejercicios.sort(key=lambda x: x.get("fecha", ""), reverse=True)

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(ejercicios, f, ensure_ascii=False, indent=2)

    print(f"\n✓ index.json generado con {len(ejercicios)} ejercicios")
    print(f"  Campos detectados: {sorted(todos_los_campos)}")

if __name__ == "__main__":
    generar_index()
