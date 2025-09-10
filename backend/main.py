from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import JSONResponse, Response
import asyncio
from snmp_query import get_snmp_data, export_to_xml

app = FastAPI()

@app.get("/api/snmp/")
async def snmp_api(ip: str = Query(..., description="IP del dispositivo SNMP"),
                   format: str = Query("json", description="Formato de salida: json o xml")):

    try:
        # Obtener datos SNMP
        data = await get_snmp_data(ip)

        if format.lower() == "json":
            return JSONResponse(content=data)

        elif format.lower() == "xml":
            xml_data = export_to_xml(data)
            return Response(content=xml_data, media_type="application/xml")

        else:
            raise HTTPException(status_code=400, detail="Formato no válido. Usa 'json' o 'xml'.")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener datos SNMP: {str(e)}")
