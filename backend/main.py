from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

import asyncio
from snmp_query import get_snmp_data, export_to_xml
from io import BytesIO
import nmap

app = FastAPI()

NETWORK_RANGE = "192.168.1.0/24"


# Orígenes permitidos (puedes usar ["*"] para permitir todos)
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # lista de orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],    # métodos HTTP permitidos (GET, POST, etc)
    allow_headers=["*"],    # cabeceras permitidas
)

def scan_network(network_range: str):
    nm = nmap.PortScanner()
    nm.scan(hosts=network_range, arguments='-sn -T4')
    active_hosts = [host for host in nm.all_hosts() if nm[host].state() == 'up']
    return active_hosts

@app.get("/api/snmp/")
async def snmp_api(
    ip: str | None = Query(
        None,
        description="IP del dispositivo SNMP. Si se omite, se escanea toda la red."
    ),
    network: str = Query(
        NETWORK_RANGE,
        description="Rango de red para escanear cuando no se proporciona 'ip' (ej. 192.168.10.0/24)"
    ),
    format: str = Query(
        "json",
        description="Formato de salida: json o xml (xml solo para una IP específica)"
    )
):
    try:
        # Validar formato
        fmt = format.lower()
        if fmt not in ("json", "xml"):
            raise HTTPException(
                status_code=400,
                detail="Formato no válido. Usa 'json' o 'xml'."
            )

        if ip:
            data = await get_snmp_data(ip)

            if fmt == "json":
                return JSONResponse(content={"IP": ip, "Data": data})
            else:  # xml
                xml_data = export_to_xml(data)
                return Response(content=xml_data, media_type="application/xml")

        active_hosts = await asyncio.to_thread(scan_network, network)

        if not active_hosts:
            return JSONResponse(
                content={"message": f"No se encontraron dispositivos activos en la red {network}"}
            )

        tasks = [get_snmp_data(host_ip) for host_ip in active_hosts]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        snmp_results = []
        for host_ip, result in zip(active_hosts, results):
            if isinstance(result, Exception):
                snmp_results.append({
                    "IP": host_ip,
                    "Error": str(result)
                })
            else:
                snmp_results.append({
                    "IP": host_ip,
                    "Data": result
                })

        if fmt == "json":
            return JSONResponse(content={"active_devices": snmp_results})
        else:

            raise HTTPException(
                status_code=400,
                detail="El formato XML solo está soportado cuando se especifica una IP concreta."
            )

    except HTTPException:
        # ya formateado arriba
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener datos SNMP: {str(e)}"
        )


@app.get("/api/snmp/network-scan/")
async def snmp_network_scan(network: str = Query(NETWORK_RANGE, description="Rango de red para escanear")):
    try:
        active_hosts = await asyncio.to_thread(scan_network, network)

        if not active_hosts:
            return JSONResponse(content={"message": f"No se encontraron dispositivos activos en la red {network}"})
    
        tasks = [get_snmp_data(ip) for ip in active_hosts]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)

        snmp_results = []
        for ip, data in zip(active_hosts, results):
            if isinstance(data, Exception):
                snmp_results.append({"IP": ip, "Error": str(data)})
            else:
                snmp_results.append({"IP": ip, "Data": data})
        
        return JSONResponse(content={"active_devices": snmp_results})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al escanear la red: {str(e)}")


@app.get("/api/snmp/report")
async def generate_snmp_report():
    try:
        active_hosts = await asyncio.to_thread(scan_network, NETWORK_RANGE)

        if not active_hosts:
            return JSONResponse(content={"message": f"No se encontraron dispositivos activos en la red {NETWORK_RANGE}"})
    
        tasks = [get_snmp_data(ip) for ip in active_hosts]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        styles = getSampleStyleSheet()
        flowables = []

        flowables.append(Paragraph("<b>Reporte SNMP de Dispositivos en la Red</b>", styles['Title']))
        flowables.append(Spacer(1, 12))

        for ip, data in zip(active_hosts, results):
            flowables.append(Paragraph(f"<b>Dispositivo: {ip}</b>", styles['Heading2']))
            if isinstance(data, Exception):
                flowables.append(Paragraph(f"Error al obtener datos SNMP: {str(data)}", styles['Normal']))
            else:
                for name, content in data.items():
                    flowables.append(Paragraph(f"<b>{name}:</b> {content['Valor']}", styles['Normal']))
            flowables.append(Spacer(1, 12))
        
        doc.build(flowables)
        buffer.seek(0)

        headers = { 
            'Content-Disposition': 'attachment; filename="snmp_reporte.pdf"'
        }

        return StreamingResponse(buffer, media_type='application/pdf', headers=headers)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al generar el reporte SNMP: {str(e)}")