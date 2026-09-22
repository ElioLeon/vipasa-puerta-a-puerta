import openpyxl
import json
import re

SRC = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\Documentos\Viviendas VIPASA.xlsx"
OUT = r"C:\Users\eliom\OneDrive\Escritorio\Claude\SII\VIPASA-App\data\buildings_raw.json"

TARGET_MUNIS = None  # None = todos los municipios de Asturias

wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
ws = wb["Viviendas"]

buildings = {}  # key -> building dict

def norm(v):
    if v is None:
        return ""
    return str(v).strip()

rows = ws.iter_rows(values_only=True)
header = next(rows)
# header: PROPIEDAD, INMUEBLE, GRUPO, CUENTA, EXPEDIENTE, DIRECCION, Nº, ESC., PISO, LETRA,
# Localidad, Municipio, Fecha Calificacion, SUP.UTIL, VALOR VIVIENDA, SUP.TRAS., VALOR TRAS.,
# SUP.GARAJE, VALOR GAR., VALOR TOTAL, Estado, Nombre, Telefono, Correo
idx = {name: i for i, name in enumerate(header)}

count = 0
for row in rows:
    municipio = norm(row[idx["Municipio"]]).upper()
    if not municipio:
        continue  # filas vacias o de totales al final de la hoja
    if TARGET_MUNIS is not None and municipio not in TARGET_MUNIS:
        continue
    direccion = norm(row[idx["DIRECCION"]])
    numero = norm(row[idx["Nº"]])
    localidad = norm(row[idx["Localidad"]])
    esc = norm(row[idx["ESC."]])
    piso = norm(row[idx["PISO"]])
    letra = norm(row[idx["LETRA"]])
    cuenta = norm(row[idx["CUENTA"]])
    expediente = norm(row[idx["EXPEDIENTE"]])
    grupo = norm(row[idx["GRUPO"]])
    estado = norm(row[idx["Estado"]]) or "Sin revisar"
    nombre = norm(row[idx["Nombre"]])
    telefono = norm(row[idx["Telefono"]])
    correo = norm(row[idx["Correo"]])

    key = f"{municipio}|{localidad}|{direccion}|{numero}"
    if key not in buildings:
        addr_query = f"{direccion} {numero}, {localidad}, {municipio}, Asturias, España"
        buildings[key] = {
            "id": key,
            "direccion": direccion,
            "numero": numero,
            "localidad": localidad,
            "municipio": municipio,
            "addr_query": addr_query,
            "units": [],
        }
    buildings[key]["units"].append({
        "esc": esc,
        "piso": piso,
        "letra": letra,
        "cuenta": cuenta,
        "expediente": expediente,
        "grupo": grupo,
        "estado": estado,
        "nombre": nombre,
        "telefono": telefono,
        "correo": correo,
    })
    count += 1

result = list(buildings.values())
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print(f"Filas procesadas: {count}")
print(f"Edificios unicos: {len(result)}")
