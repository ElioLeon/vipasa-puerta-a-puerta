import json

IN_PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\buildings_geocoded.json"
OUT_PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\js\data.js"

with open(IN_PATH, "r", encoding="utf-8") as f:
    buildings = json.load(f)

clean = []
skipped_no_coords = 0
for b in buildings:
    if b.get("lat") is None or b.get("lon") is None:
        skipped_no_coords += 1
        continue
    clean.append({
        "id": b["id"],
        "direccion": b["direccion"],
        "numero": b["numero"],
        "localidad": b["localidad"],
        "municipio": b["municipio"],
        "lat": b["lat"],
        "lon": b["lon"],
        # "calle" o ausente = precision de direccion; "localidad"/"municipio" = aproximado
        "geocodeLevel": b.get("geocode_level", "calle"),
        # Se excluyen deliberadamente nombre/telefono/correo: este archivo se publica
        # en un repositorio publico (GitHub Pages).
        "units": [
            {
                "esc": u.get("esc", ""),
                "piso": u.get("piso", ""),
                "letra": u.get("letra", ""),
            }
            for u in b["units"]
        ],
    })

js_content = "export const BUILDINGS = " + json.dumps(clean, ensure_ascii=False, indent=None) + ";\n"

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write(js_content)

total_units = sum(len(b["units"]) for b in clean)
print(f"Edificios con coordenadas: {len(clean)} (sin coordenadas: {skipped_no_coords})")
print(f"Viviendas totales incluidas: {total_units}")
print(f"Escrito: {OUT_PATH}")
