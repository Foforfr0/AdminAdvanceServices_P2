# snmp_query.py
import asyncio
import re
import xml.etree.ElementTree as ET

import pysnmp as snmp
from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    UdpTransportTarget,
    CommunityData,
    ContextData,
    ObjectType,
    ObjectIdentity,
    get_cmd,
)

print("Usando pysnmp", snmp.__version__)

# OIDs escalares básicos
SCALAR_OIDS = {
    "sysDescr": "1.3.6.1.2.1.1.1.0",
    "sysServices": "1.3.6.1.2.1.1.7.0",
    "hrSystemUptime": "1.3.6.1.2.1.25.1.1.0",
    "hrSystemDate": "1.3.6.1.2.1.25.1.2.0",
    # Puede fallar, pero no pasa nada si da error
    "hrMemorySize": "1.3.6.1.2.1.25.2.2.0",
}

# Índices candidatos para hrProcessorLoad.<idx>
CPU_INDEX_CANDIDATES = [196608] + list(range(1, 33))

# Tipos de hrStorageType
HR_STORAGE_RAM = "1.3.6.1.2.1.25.2.1.2"
HR_STORAGE_FIXED_DISK = "1.3.6.1.2.1.25.2.1.4"


async def get_snmp_data(ip: str, community_str: str = "public") -> dict:
    """
    Devuelve un dict con estructura:
    {
        'sysDescr': {'OID': '...', 'Valor': '...'},
        'hrDeviceDescr': {...},
        'hrProcessorLoad.1': {...},
        'ramStorageSize': {...},
        'diskStorageSize': {...},
        'ifInOctets.<idx>': {...},
        'ifOutOctets.<idx>': {...},
        ...
    }
    """
    snmp_results: dict[str, dict] = {}

    snmpEngine = SnmpEngine()
    target = await UdpTransportTarget.create((ip, 161))
    community = CommunityData(community_str, mpModel=0)

    async def do_get(oid: str):
        iterator = get_cmd(
            snmpEngine,
            community,
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
        )
        return await iterator

    async def get_scalar(name: str, oid: str):
        try:
            errorIndication, errorStatus, errorIndex, varBinds = await do_get(oid)

            if errorIndication:
                snmp_results[name] = {"OID": oid, "Valor": str(errorIndication)}
                return

            if errorStatus:
                snmp_results[name] = {
                    "OID": oid,
                    "Valor": f"Error: {errorStatus.prettyPrint()}",
                }
                return

            if varBinds:
                vb = varBinds[0]
                snmp_results[name] = {
                    "OID": vb[0].prettyPrint(),
                    "Valor": vb[1].prettyPrint(),
                }
        except Exception as e:
            snmp_results[name] = {"OID": oid, "Valor": f"Exception: {e}"}

    async def get_cpu_info():
        """
        - Busca varios hrProcessorLoad.<idx>
        - Guarda cada núcleo como hrProcessorLoad.<idx>
        - Intenta obtener un buen nombre de CPU en hrDeviceDescr
        """
        cpu_load_base = "1.3.6.1.2.1.25.3.3.1.2"
        cpu_descr_base = "1.3.6.1.2.1.25.3.2.1.3"

        first_index = None

        # 1) Recoger hrProcessorLoad.<idx>
        for idx in CPU_INDEX_CANDIDATES:
            load_oid = f"{cpu_load_base}.{idx}"
            errorIndication, errorStatus, errorIndex, varBinds = await do_get(load_oid)

            if errorIndication or errorStatus or not varBinds:
                continue

            vb = varBinds[0]
            val_str = vb[1].prettyPrint()
            if "No Such" in val_str:
                continue

            snmp_results[f"hrProcessorLoad.{idx}"] = {
                "OID": vb[0].prettyPrint(),
                "Valor": val_str,
            }

            if first_index is None:
                first_index = idx

        # 2) Nombre de CPU base a partir del primer índice válido
        if first_index is not None:
            descr_oid = f"{cpu_descr_base}.{first_index}"
            errorIndication, errorStatus, errorIndex, varBinds = await do_get(
                descr_oid
            )

            if errorIndication:
                snmp_results["hrDeviceDescr"] = {
                    "OID": descr_oid,
                    "Valor": str(errorIndication),
                }
            elif errorStatus:
                snmp_results["hrDeviceDescr"] = {
                    "OID": descr_oid,
                    "Valor": f"Error: {errorStatus.prettyPrint()}",
                }
            elif varBinds:
                vb = varBinds[0]
                snmp_results["hrDeviceDescr"] = {
                    "OID": vb[0].prettyPrint(),
                    "Valor": vb[1].prettyPrint(),
                }
        else:
            snmp_results["hrProcessorLoad"] = {
                "OID": cpu_load_base,
                "Valor": "CPU load not found (no valid index)",
            }
            snmp_results["hrDeviceDescr"] = {
                "OID": cpu_descr_base,
                "Valor": "CPU description not found (no valid index)",
            }

        # 3) Escanear varios hrDeviceDescr.* para encontrar un nombre más "CPU"
        best = None
        best_cpuish = None

        for idx in range(1, 65):
            oid = f"{cpu_descr_base}.{idx}"
            errorIndication, errorStatus, errorIndex, varBinds = await do_get(oid)
            if errorIndication or errorStatus or not varBinds:
                continue

            vb = varBinds[0]
            val = vb[1].prettyPrint()
            if any(word in val for word in ["No Such", "not found", "Error"]):
                continue

            if best is None:
                best = (vb[0].prettyPrint(), val)

            if re.search(r"(cpu|processor|procesador)", val, re.IGNORECASE):
                best_cpuish = (vb[0].prettyPrint(), val)
                break

        chosen = best_cpuish or best
        if chosen:
            oid_str, val_str = chosen
            snmp_results["hrDeviceDescr"] = {"OID": oid_str, "Valor": val_str}

    async def get_storage_info():
        """
        No asume que RAM / disco estén en índice .1.
        Busca hrStorageType.<idx> para RAM y FixedDisk y llena:
        - ramStorageAllocationUnits / Size / Used / Descr
        - diskStorageAllocationUnits / Size / Used / Descr
        """
        ram_idx = None
        disk_idx = None

        for idx in range(1, 65):
            type_oid = f"1.3.6.1.2.1.25.2.3.1.2.{idx}"
            errorIndication, errorStatus, errorIndex, varBinds = await do_get(
                type_oid
            )

            if errorIndication or errorStatus or not varBinds:
                continue

            vb = varBinds[0]
            type_val = vb[1].prettyPrint()

            if type_val == HR_STORAGE_RAM and ram_idx is None:
                ram_idx = idx
            elif type_val == HR_STORAGE_FIXED_DISK and disk_idx is None:
                disk_idx = idx

            if ram_idx is not None and disk_idx is not None:
                break

        async def fill_storage(prefix: str, idx):
            if idx is None:
                return

            base = "1.3.6.1.2.1.25.2.3.1"
            mapping = {
                "AllocationUnits": f"{base}.4.{idx}",
                "Size": f"{base}.5.{idx}",
                "Used": f"{base}.6.{idx}",
                "Descr": f"{base}.3.{idx}",
            }

            for suffix, oid in mapping.items():
                key = f"{prefix}{suffix}"
                errorIndication, errorStatus, errorIndex, varBinds = await do_get(oid)

                if errorIndication:
                    snmp_results[key] = {"OID": oid, "Valor": str(errorIndication)}
                elif errorStatus:
                    snmp_results[key] = {
                        "OID": oid,
                        "Valor": f"Error: {errorStatus.prettyPrint()}",
                    }
                elif varBinds:
                    vb = varBinds[0]
                    snmp_results[key] = {
                        "OID": vb[0].prettyPrint(),
                        "Valor": vb[1].prettyPrint(),
                    }

        await fill_storage("ramStorage", ram_idx)
        await fill_storage("diskStorage", disk_idx)

    async def get_interface_counters():
        """
        Elige una interfaz 'buena' (UP, no loopback) y expone:
        - ifDescr.<idx>
        - ifInOctets.<idx>
        - ifOutOctets.<idx>
        Usa ifHCIn/OutOctets (64 bits) si están disponibles.
        """
        chosen_idx = None
        chosen_descr = None

        # Probar algunos índices razonables
        for idx in range(1, 65):
            descr_oid = f"1.3.6.1.2.1.2.2.1.2.{idx}"  # ifDescr
            status_oid = f"1.3.6.1.2.1.2.2.1.8.{idx}"  # ifOperStatus

            err1, st1, ix1, vb1 = await do_get(descr_oid)
            if err1 or st1 or not vb1:
                continue
            descr_val = vb1[0][1].prettyPrint()

            err2, st2, ix2, vb2 = await do_get(status_oid)
            if err2 or st2 or not vb2:
                continue
            status_val = vb2[0][1].prettyPrint()

            # 1 = up
            if status_val != "1":
                continue
            if descr_val.lower().startswith("lo"):
                continue

            chosen_idx = idx
            chosen_descr = descr_val
            break

        if chosen_idx is None:
            snmp_results["ifDescr"] = {
                "OID": "1.3.6.1.2.1.2.2.1.2",
                "Valor": "No suitable interface found",
            }
            return

        snmp_results[f"ifDescr.{chosen_idx}"] = {
            "OID": f"1.3.6.1.2.1.2.2.1.2.{chosen_idx}",
            "Valor": chosen_descr,
        }

        # Intentar primero contadores de 64 bits
        hc_in_oid = f"1.3.6.1.2.1.31.1.1.1.6.{chosen_idx}"   # ifHCInOctets
        hc_out_oid = f"1.3.6.1.2.1.31.1.1.1.10.{chosen_idx}" # ifHCOutOctets

        def is_valid_counter(val: str) -> bool:
            return val.isdigit()

        # IN
        err_in, st_in, ix_in, vb_in = await do_get(hc_in_oid)
        if (
            not err_in
            and not st_in
            and vb_in
            and is_valid_counter(vb_in[0][1].prettyPrint())
        ):
            in_oid = hc_in_oid
            in_val = vb_in[0][1].prettyPrint()
        else:
            in_oid_32 = f"1.3.6.1.2.1.2.2.1.10.{chosen_idx}"  # ifInOctets
            err_in2, st_in2, ix_in2, vb_in2 = await do_get(in_oid_32)
            if err_in2 or st_in2 or not vb_in2:
                in_oid = in_oid_32
                in_val = "0"
            else:
                in_oid = in_oid_32
                in_val = vb_in2[0][1].prettyPrint()

        snmp_results[f"ifInOctets.{chosen_idx}"] = {
            "OID": in_oid,
            "Valor": in_val,
        }

        # OUT
        err_out, st_out, ix_out, vb_out = await do_get(hc_out_oid)
        if (
            not err_out
            and not st_out
            and vb_out
            and is_valid_counter(vb_out[0][1].prettyPrint())
        ):
            out_oid = hc_out_oid
            out_val = vb_out[0][1].prettyPrint()
        else:
            out_oid_32 = f"1.3.6.1.2.1.2.2.1.16.{chosen_idx}"  # ifOutOctets
            err_out2, st_out2, ix_out2, vb_out2 = await do_get(out_oid_32)
            if err_out2 or st_out2 or not vb_out2:
                out_oid = out_oid_32
                out_val = "0"
            else:
                out_oid = out_oid_32
                out_val = vb_out2[0][1].prettyPrint()

        snmp_results[f"ifOutOctets.{chosen_idx}"] = {
            "OID": out_oid,
            "Valor": out_val,
        }

    # Lanzar todo en paralelo
    tasks = [get_scalar(name, oid) for name, oid in SCALAR_OIDS.items()]
    tasks.append(get_cpu_info())
    tasks.append(get_storage_info())
    tasks.append(get_interface_counters())

    await asyncio.gather(*tasks)
    snmpEngine.close_dispatcher()

    return snmp_results


def export_to_xml(data: dict) -> str:
    """
    Convierte el dict de get_snmp_data en XML (string).
    """
    root = ET.Element("SNMPData")
    for name, content in data.items():
        entry = ET.SubElement(root, "Entry", name=name)
        oid_elem = ET.SubElement(entry, "OID")
        oid_elem.text = content.get("OID", "")
        val_elem = ET.SubElement(entry, "Valor")
        val_elem.text = content.get("Valor", "")
    return ET.tostring(root, encoding="utf-8", method="xml").decode("utf-8")
