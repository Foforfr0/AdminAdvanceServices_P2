import pysnmp as snmp
import asyncio
import json
import xml.etree.ElementTree as ET
from pysnmp.hlapi.v3arch.asyncio import *

OIDs = {
    'sysDescr': '.1.3.6.1.2.1.1.1.0',
    'sysServices': '.1.3.6.1.2.1.1.7.0',
    'hrSystemUptime': '.1.3.6.1.2.1.25.1.1.0',
    'hrSystemDate': '.1.3.6.1.2.1.25.1.2.0',
    'hrSystemInitialLoadDevice': '.1.3.6.1.2.1.25.1.3.0',
    'hrSystemInitialLoadParameters': '.1.3.6.1.2.1.25.1.4.0',
    'hrSystemNumUsers': '.1.3.6.1.2.1.25.1.5.0',
    'hrSystemProcesses': '.1.3.6.1.2.1.25.1.6.0',
    'hrSystemMaxProcesses': '.1.3.6.1.2.1.25.1.7.0',
    'hrDeviceDescr.196608': '.1.3.6.1.2.1.25.3.2.1.3.196608',
    'hrMemorySize': '.1.3.6.1.2.1.25.2.2.0',
    'hrStorageIndex.1': '.1.3.6.1.2.1.25.2.3.1.1.1',
    'hrStorageType.1': '.1.3.6.1.2.1.25.2.3.1.2.1',
    'hrStorageDescr.1': '.1.3.6.1.2.1.25.2.3.1.3.1',
    'hrStorageAllocationUnits.1': '.1.3.6.1.2.1.25.2.3.1.1.1',
    'hrStorageSize.1': '.1.3.6.1.2.1.25.2.3.1.5.1',
    'hrStorageUsed.1': '.1.3.6.1.2.1.25.2.3.1.6.1',
}

async def get_snmp_data(ip: str) -> dict:
    snmp_results = {}

    async def getSnmp(name, oid):
        snmpEngine = SnmpEngine()
        target = await UdpTransportTarget.create((ip, 161))

        iterator = get_cmd(
            snmpEngine,
            CommunityData("private", mpModel=0),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )

        errorIndication, errorStatus, errorIndex, varBinds = await iterator

        if errorIndication:
            snmp_results[name] = {
                "OID": oid,
                "Valor": str(errorIndication)
            }
        elif errorStatus:
            snmp_results[name] = {
                "OID": oid,
                "Valor": f"Error: {errorStatus.prettyPrint()}"
            }
        else:
            for varBind in varBinds:
                value = varBind[1].prettyPrint()
                snmp_results[name] = {
                    "OID": oid,
                    "Valor": value
                }

        snmpEngine.close_dispatcher()

    tasks = [getSnmp(name, oid) for name, oid in OIDs.items()]
    await asyncio.gather(*tasks)

    return snmp_results

def export_to_xml(data: dict) -> str:
    root = ET.Element("SNMPData")
    for name, content in data.items():
        entry = ET.SubElement(root, "Entry", name=name)
        oid_elem = ET.SubElement(entry, "OID")
        oid_elem.text = content["OID"]
        val_elem = ET.SubElement(entry, "Valor")
        val_elem.text = content["Valor"]
    return ET.tostring(root, encoding="utf-8", method="xml").decode("utf-8")



""" Export data on file
import pysnmp as snmp
import asyncio
import json
import xml.etree.ElementTree as ET
from pysnmp.hlapi.v3arch.asyncio import *

print('Using', snmp.__version__, 'version')

##IP = '10.50.42.13'
IP = input("Enter the IP address of the SNMP device: ").strip()
print('Obtaining SNMP data...')

# Diccionario con nombres para cada OID
OIDs = {
    'sysDescr': '.1.3.6.1.2.1.1.1.0',
    'sysServices': '.1.3.6.1.2.1.1.7.0',
    'hrSystemUptime': '.1.3.6.1.2.1.25.1.1.0',
    'hrSystemDate': '.1.3.6.1.2.1.25.1.2.0',
    'hrSystemInitialLoadDevice': '.1.3.6.1.2.1.25.1.3.0',
    'hrSystemInitialLoadParameters': '.1.3.6.1.2.1.25.1.4.0',
    'hrSystemNumUsers': '.1.3.6.1.2.1.25.1.5.0',
    'hrSystemProcesses': '.1.3.6.1.2.1.25.1.6.0',
    'hrSystemMaxProcesses': '.1.3.6.1.2.1.25.1.7.0',
    'hrDeviceDescr.196608': '.1.3.6.1.2.1.25.3.2.1.3.196608',
    'hrMemorySize': '.1.3.6.1.2.1.25.2.2.0',
    'hrStorageIndex.1': '.1.3.6.1.2.1.25.2.3.1.1.1',
    'hrStorageType.1': '.1.3.6.1.2.1.25.2.3.1.2.1',
    'hrStorageDescr.1': '.1.3.6.1.2.1.25.2.3.1.3.1',
    'hrStorageAllocationUnits.1': '.1.3.6.1.2.1.25.2.3.1.1.1',
    'hrStorageSize.1': '.1.3.6.1.2.1.25.2.3.1.5.1',
    'hrStorageUsed.1': '.1.3.6.1.2.1.25.2.3.1.6.1',
}

# Diccionario donde se guardarán los resultados
snmp_results = {}

# Elegir formato de salida
format_choice = input("¿En qué formato deseas exportar los resultados? (json/xml): ").strip().lower()

async def getSnmp(name, oid):
    snmpEngine = SnmpEngine()
    target = await UdpTransportTarget.create((IP, 161))

    iterator = get_cmd(
        snmpEngine,
        CommunityData("private", mpModel=0),
        target,
        ContextData(),
        ObjectType(ObjectIdentity(oid)),
    )

    errorIndication, errorStatus, errorIndex, varBinds = await iterator

    if errorIndication:
        print(f"{name} → Error: {errorIndication}")
        snmp_results[name] = {
            "OID": oid,
            "Valor": str(errorIndication)
        }
    elif errorStatus:
        print(f"{name} → Error: {errorStatus.prettyPrint()} at {errorIndex}")
        snmp_results[name] = {
            "OID": oid,
            "Valor": f"Error: {errorStatus.prettyPrint()}"
        }
    else:
        for varBind in varBinds:
            value = varBind[1].prettyPrint()
            snmp_results[name] = {
                "OID": oid,
                "Valor": value
            }
            print(f"{name}:\n  OID: {oid}\n  Valor: {value}\n")

    snmpEngine.close_dispatcher()

# Exportar a JSON
def export_to_json(data):
    with open("snmp_output.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("✔ Resultados exportados a snmp_output.json")

# Exportar a XML
def export_to_xml(data):
    root = ET.Element("SNMPData")
    for name, content in data.items():
        entry = ET.SubElement(root, "Entry", name=name)
        oid_elem = ET.SubElement(entry, "OID")
        oid_elem.text = content["OID"]
        val_elem = ET.SubElement(entry, "Valor")
        val_elem.text = content["Valor"]
    tree = ET.ElementTree(root)
    tree.write("snmp_output.xml", encoding="utf-8", xml_declaration=True)
    print("✔ Resultados exportados a snmp_output.xml")

async def main():
    tasks = [getSnmp(name, oid) for name, oid in OIDs.items()]
    await asyncio.gather(*tasks)

    # Exportar según la elección del usuario
    if format_choice == "json":
        export_to_json(snmp_results)
    elif format_choice == "xml":
        export_to_xml(snmp_results)
    else:
        print("⚠ Formato no válido. No se exportó ningún archivo.")

asyncio.run(main())
"""