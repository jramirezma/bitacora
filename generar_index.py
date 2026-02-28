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
        
        # Convertir JS object a JSON válido
        # 1. Agregar comillas a claves sin comillas
        json_str = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)', r'\1"\2"\3', json_str)
        
        # 2. Reemplazar objeto autor anidado
        autor_match = re.search(r'autor:\s*\{([^}]+)\}', json_str)
        if autor_match:
            autor_content = autor_match.group(1)
            # Extraer nombre y modelo
            nombre_match = re.search(r'nombre:\s*"([^"]+)"', autor_content)
            modelo_match = re.search(r'modelo:\s*"([^"]+)"', autor_content)
            if nombre_match and modelo_match:
                json_str = re.sub(
                    r'autor:\s*\{[^}]+\}',
                    f'"autor": {{"nombre": "{nombre_match.group(1)}", "modelo": "{modelo_match.group(1)}"}}',
                    json_str
                )
        
        metadata = json.loads(json_str)
        
        # Campo automático: archivo
        metadata["archivo"] = f"ejercicios/{html_path.name}"
        
        # Extraer enunciado
        enunciado_match = re.search(r'<div class="enunciado">(.*?)</div>', contenido, re.DOTALL)
        if enunciado_match:
            texto_limpio = re.sub(r'<[^>]+>', '', enunciado_match.group(1)).strip()
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
    
    for html_file in EJERCICIOS_DIR.glob("*.html"):
        if html_file.name == "plantilla.html":
            continue
            
        metadata = extraer_metadata(html_file)
        if metadata:
            # Registrar todos los campos encontrados
            todos_los_campos.update(metadata.keys())
            
            ejercicios.append(metadata)
            print(f"✓ {metadata.get('id', 'sin ID')} - {metadata.get('tema', 'sin tema')}")
        else:
            print(f"✗ {html_file.name} - sin metadatos")
    
    # Ordenar por fecha descendente (si existe el campo)
    ejercicios.sort(key=lambda x: x.get("fecha", ""), reverse=True)
    
    # Guardar
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(ejercicios, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ index.json generado con {len(ejercicios)} ejercicios")
    print(f"  Campos detectados: {sorted(todos_los_campos)}")

if __name__ == "__main__":
    generar_index()
