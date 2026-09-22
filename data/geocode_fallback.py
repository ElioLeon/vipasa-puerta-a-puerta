"""
Segunda pasada: para los edificios que la geocodificacion de calle no encontro
(muy comun en pueblos pequenos que apenas estan mapeados en OpenStreetMap),
intenta ubicarlos por nivel de localidad (pueblo) y, como ultimo recurso, por
municipio. Se marca el nivel de precision conseguido en "geocode_level" para
que la app pueda avisar de que la posicion es aproximada.
"""
import json
import time
import urllib.request
import urllib.parse

PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\buildings_geocoded.json"
LOG_PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\geocode_fallback_log.txt"

UA = "VIPASA-DoorToDoor-Campaign/1.0 (voluntariado sindicato vivienda; contacto: eliomanuelleonlopez@gmail.com)"


def geocode(query):
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({
        "q": query,
        "format": "json",
        "limit": 1,
        "countrycodes": "es",
    })
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    if data:
        return float(data[0]["lat"]), float(data[0]["lon"])
    return None, None


def tiers(b):
    direccion, localidad, municipio = b["direccion"], b["localidad"], b["municipio"]
    return [
        ("calle", f"{direccion}, {localidad}, {municipio}, Asturias, España"),
        ("localidad", f"{localidad}, {municipio}, Asturias, España"),
        ("municipio", f"{municipio}, Asturias, España"),
    ]


def main():
    with open(PATH, "r", encoding="utf-8") as f:
        buildings = json.load(f)

    pending = [b for b in buildings if b.get("lat") is None]
    log = open(LOG_PATH, "a", encoding="utf-8")
    log.write(f"\n--- fallback: {len(pending)} edificios pendientes ---\n")

    resolved = 0
    still_failed = 0

    for i, b in enumerate(pending):
        found = False
        for level, query in tiers(b):
            try:
                lat, lon = geocode(query)
            except Exception as e:
                log.write(f"[{i}] ERROR {level} '{query}': {e}\n")
                lat = lon = None
            time.sleep(1.1)
            if lat is not None:
                b["lat"] = lat
                b["lon"] = lon
                b["geocode_level"] = level
                log.write(f"[{i}] OK nivel={level} '{query}'\n")
                found = True
                resolved += 1
                break
        if not found:
            still_failed += 1
            log.write(f"[{i}] SIN RESOLVER (todos los niveles fallaron): {b['id']}\n")

        if i % 20 == 0:
            log.write(f"progress: {i+1}/{len(pending)} resolved={resolved} still_failed={still_failed}\n")
            log.flush()
            with open(PATH, "w", encoding="utf-8") as f:
                json.dump(buildings, f, ensure_ascii=False, indent=2)

    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(buildings, f, ensure_ascii=False, indent=2)

    log.write(f"DONE resolved={resolved} still_failed={still_failed}\n")
    log.close()
    print(f"DONE resolved={resolved} still_failed={still_failed}")


if __name__ == "__main__":
    main()
