import json
import time
import urllib.request
import urllib.parse

IN_PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\buildings_raw.json"
OUT_PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\buildings_geocoded.json"
LOG_PATH = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\geocode_log.txt"

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
        return float(data[0]["lat"]), float(data[0]["lon"]), data[0].get("display_name", "")
    return None, None, None

def simplify_query(direccion, numero, localidad, municipio):
    # fallback: drop the street number, or drop locality if it's a small barrio not in OSM
    return f"{direccion}, {municipio}, Asturias, España"

def main():
    with open(IN_PATH, "r", encoding="utf-8") as f:
        buildings = json.load(f)

    log = open(LOG_PATH, "w", encoding="utf-8")
    ok = 0
    fail = 0

    for i, b in enumerate(buildings):
        if b.get("lat") is not None:
            continue
        query = b["addr_query"]
        lat = lon = None
        try:
            lat, lon, display = geocode(query)
        except Exception as e:
            log.write(f"[{i}] ERROR primary '{query}': {e}\n")

        if lat is None:
            time.sleep(1.1)
            fallback_q = simplify_query(b["direccion"], b["numero"], b["localidad"], b["municipio"])
            try:
                lat, lon, display = geocode(fallback_q)
                if lat is not None:
                    log.write(f"[{i}] fallback OK '{fallback_q}'\n")
            except Exception as e:
                log.write(f"[{i}] ERROR fallback '{fallback_q}': {e}\n")

        b["lat"] = lat
        b["lon"] = lon
        if lat is not None:
            ok += 1
        else:
            fail += 1
            log.write(f"[{i}] FAILED '{query}'\n")

        if i % 20 == 0:
            log.write(f"progress: {i+1}/{len(buildings)} ok={ok} fail={fail}\n")
            log.flush()
            with open(OUT_PATH, "w", encoding="utf-8") as f:
                json.dump(buildings, f, ensure_ascii=False, indent=2)

        time.sleep(1.1)

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(buildings, f, ensure_ascii=False, indent=2)

    log.write(f"DONE total={len(buildings)} ok={ok} fail={fail}\n")
    log.close()
    print(f"DONE ok={ok} fail={fail}")

if __name__ == "__main__":
    main()
