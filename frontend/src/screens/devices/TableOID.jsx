// devices/TableOID.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const INTERVALO_MS = 3000;
const MAX_POINTS = 20;

function toNumber(val) {
  if (val == null) return null;
  const n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

function TableOID({ device }) {
  const ip = device?.ip;
  const alias = device?.apodo;

  const [raw, setRaw] = useState({});
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // cpu% / ram% / diskActivity(MB/s) / net(Mbps)
  const [history, setHistory] = useState({
    cpu: [],
    ram: [],
    disk: [],
    net: [],
  });

  const [meta, setMeta] = useState({
    os: null,
    cpuName: null,
    ramCapacityGb: null,
    diskName: null,
    diskCapacityGb: null,
    diskUsagePercent: null,
  });

  const lastNetOctetsRef = useRef(null);
  const lastDiskUsedRef = useRef(null);

  useEffect(() => {
    if (!ip) return;

    let intervalId;

    async function obtenerDatosJSON() {
      try {
        setIsLoading(true);

        const response = await fetch(
          `http://127.0.0.1:8000/api/snmp?ip=${ip}&format=json`,
          {
            headers: { Accept: "application/json" },
          }
        );
        if (!response.ok) throw new Error("Error en la respuesta");

        const result = await response.json();
        const data = result.Data || result;

        setRaw(data);
        setError(null);

        const timestamp = new Date().toLocaleTimeString();

        // ========= METADATA =========
        const os = data?.sysDescr?.Valor || null;

        // CPU NAME – mejor hrDeviceDescr.*
        const descrPlain = data?.hrDeviceDescr?.Valor;
        const descr196 = data?.["hrDeviceDescr.196608"]?.Valor;
        const descr1 = data?.["hrDeviceDescr.1"]?.Valor;

        const allDescrKeys = Object.keys(data || {}).filter((k) =>
          k.startsWith("hrDeviceDescr")
        );
        const extraDescrVals = allDescrKeys
          .map((k) => data[k]?.Valor)
          .filter(Boolean);

        const candidates = [
          descrPlain,
          descr196,
          descr1,
          ...extraDescrVals,
        ].filter(Boolean);

        const isBad = (v) =>
          /^Error:/i.test(v) ||
          /not found/i.test(v) ||
          /No Such/i.test(v);

        let cpuName =
          candidates.find(
            (v) =>
              !isBad(v) && /(cpu|processor|procesador)/i.test(v)
          ) ||
          candidates.find((v) => !isBad(v)) ||
          null;

        // 🔹 RAM desde ramStorage*
        const ramAlloc = toNumber(data?.ramStorageAllocationUnits?.Valor);
        const ramSize = toNumber(data?.ramStorageSize?.Valor);
        const ramUsed = toNumber(data?.ramStorageUsed?.Valor);

        let ramCapacityGb = null;
        if (ramSize != null && ramAlloc != null) {
          const totalBytes = ramSize * ramAlloc;
          ramCapacityGb = totalBytes / 1024 ** 3;
        }

        // 🔹 DISCO desde diskStorage*
        const diskAlloc = toNumber(data?.diskStorageAllocationUnits?.Valor);
        const diskSize = toNumber(data?.diskStorageSize?.Valor);
        const diskUsed = toNumber(data?.diskStorageUsed?.Valor);
        const diskName = data?.diskStorageDescr?.Valor || null;

        let diskCapacityGb = null;
        if (diskSize != null && diskAlloc != null) {
          const totalBytes = diskSize * diskAlloc;
          diskCapacityGb = totalBytes / 1024 ** 3;
        }

        // % de disco usado (para la tarjeta)
        let diskUsagePercent = null;
        if (diskSize != null && diskUsed != null && diskSize > 0) {
          diskUsagePercent = (diskUsed / diskSize) * 100;
        }

        setMeta({
          os,
          cpuName,
          ramCapacityGb,
          diskName,
          diskCapacityGb,
          diskUsagePercent,
        });

        // ========= CPU % =========
        let cpuPercent = null;
        const cpuKeys = Object.keys(data || {}).filter((k) =>
          k.startsWith("hrProcessorLoad")
        );

        if (cpuKeys.length > 0) {
          let sum = 0;
          let count = 0;

          for (const k of cpuKeys) {
            const val = toNumber(data[k]?.Valor);
            if (val != null && val >= 0 && val <= 100) {
              sum += val;
              count++;
            }
          }

          if (count > 0) {
            cpuPercent = sum / count;
          }
        }

        // ========= RAM % =========
        let ramPercent = null;
        if (ramSize != null && ramUsed != null && ramSize > 0) {
          ramPercent = (ramUsed / ramSize) * 100;
        }

        // ========= DISCO: actividad (MB/s) =========
        let diskActivityMBps = null;
        if (diskUsed != null && diskAlloc != null) {
          const lastUsed = lastDiskUsedRef.current;
          if (lastUsed != null && diskUsed >= lastUsed) {
            const deltaBlocks = diskUsed - lastUsed;
            const deltaBytes = deltaBlocks * diskAlloc;
            const deltaSeconds = INTERVALO_MS / 1000;
            const bytesPerSec = deltaBytes / deltaSeconds;
            diskActivityMBps = bytesPerSec / (1024 * 1024); // MB/s
          }
          lastDiskUsedRef.current = diskUsed;
        }

        // ========= RED: actividad (Mbps) =========
        // Buscar las claves reales que devolvió el backend
        const inKey = Object.keys(data || {}).find((k) =>
          k.startsWith("ifInOctets.")
        );
        const outKey = Object.keys(data || {}).find((k) =>
          k.startsWith("ifOutOctets.")
        );

        const inOctets = inKey ? toNumber(data[inKey]?.Valor) : null;
        const outOctets = outKey ? toNumber(data[outKey]?.Valor) : null;

        let netMbps = null;

        if (inOctets != null && outOctets != null) {
          const totalOctets = inOctets + outOctets;
          const last = lastNetOctetsRef.current;

          if (last != null && totalOctets >= last) {
            const deltaOctets = totalOctets - last;
            const deltaSeconds = INTERVALO_MS / 1000;

            const bytesPerSec = deltaOctets / deltaSeconds;
            netMbps = (bytesPerSec * 8) / 1_000_000; // bits/s → Mbps
          }

          lastNetOctetsRef.current = totalOctets;
        }

        const pushPoint = (arr, value) => {
          if (value == null) return arr;
          const next = [...arr, { time: timestamp, value }];
          if (next.length > MAX_POINTS) next.shift();
          return next;
        };

        setHistory((prev) => ({
          cpu: pushPoint(prev.cpu, cpuPercent),
          ram: pushPoint(prev.ram, ramPercent),
          disk: pushPoint(prev.disk, diskActivityMBps),
          net: pushPoint(prev.net, netMbps),
        }));
      } catch (err) {
        console.error("Error al obtener datos JSON:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    // reset cuando cambias de dispositivo
    setHistory({ cpu: [], ram: [], disk: [], net: [] });
    lastNetOctetsRef.current = null;
    lastDiskUsedRef.current = null;

    obtenerDatosJSON();
    intervalId = setInterval(obtenerDatosJSON, INTERVALO_MS);

    return () => clearInterval(intervalId);
  }, [ip]);

  const latest = useMemo(() => {
    const last = (arr) => (arr.length ? arr[arr.length - 1].value : null);
    return {
      cpu: last(history.cpu),
      ram: last(history.ram),
      diskActivity: last(history.disk), // MB/s
      netMbps: last(history.net),       // Mbps
    };
  }, [history]);

  if (!ip) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500 text-center">
          Selecciona un dispositivo en la izquierda para empezar a monitorear.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-slate-800">
          Monitoreo de {alias || ip}
        </h2>
        <div className="flex flex-col items-end">
          <span className="text-xs text-slate-500">IP: {ip}</span>
          {isLoading && (
            <span className="text-xs text-blue-500 animate-pulse">
              Actualizando...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm">
          Error al obtener datos SNMP: {error}
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="CPU"
          subtitle={meta.cpuName || "Nombre desconocido"}
          value={latest.cpu}
          suffix="%"
          icon="🖥️"
        />
        <StatCard
          title="RAM"
          subtitle={
            meta.ramCapacityGb
              ? `${meta.ramCapacityGb.toFixed(1)} GB totales`
              : "Capacidad desconocida"
          }
          value={latest.ram}
          suffix="%"
          icon="💾"
        />
        <StatCard
          title="Disco"
          subtitle={
            meta.diskName || meta.diskCapacityGb
              ? `${meta.diskName || "Volumen"}${
                  meta.diskCapacityGb
                    ? ` · ${meta.diskCapacityGb.toFixed(1)} GB`
                    : ""
                }`
              : "Información no disponible"
          }
          value={meta.diskUsagePercent}
          suffix="%"
          icon="📀"
        />
        <StatCard
          title="Red / OS"
          subtitle={meta.os || "Sistema operativo desconocido"}
          value={latest.netMbps}
          suffix=" Mbps"
          icon="📡"
          digits={2}
        />
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
        <MetricChart title="Uso de CPU (%)" data={history.cpu} isPercent />
        <MetricChart title="Uso de RAM (%)" data={history.ram} isPercent />
        <MetricChart
          title="Actividad de disco (MB/s)"
          data={history.disk}
          isPercent={false}
        />
        <MetricChart
          title="Actividad de red (Mbps)"
          data={history.net}
          isPercent={false}
        />
      </div>

      {/* Tabla de OIDs crudos (debug) */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-2 text-slate-700">
          OIDs crudos recibidos
        </h3>

        {Object.keys(raw || {}).length === 0 ? (
          <p className="text-xs text-gray-500">
            Aún no se han recibido datos o hubo un error en la consulta.
          </p>
        ) : (
          <div className="max-h-64 overflow-auto border rounded-lg bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">
                    Clave
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">
                    OID
                  </th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(raw).map(([key, obj]) => (
                  <tr key={key} className="border-t">
                    <td className="px-2 py-1 font-mono text-[11px] text-slate-700">
                      {key}
                    </td>
                    <td className="px-2 py-1 font-mono text-[11px] text-slate-500">
                      {obj?.OID}
                    </td>
                    <td className="px-2 py-1 text-[11px] text-slate-700">
                      {obj?.Valor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, subtitle, value, suffix, digits = 1, icon }) {
  let display = "--";
  if (value != null) {
    display = `${value.toFixed(digits)}${suffix || ""}`;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 shadow-md border border-slate-200 flex flex-col gap-2 hover:shadow-lg transition duration-200 min-h-[120px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">
            {title}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>
        </div>
        <span className="text-lg">{icon}</span>
      </div>

      <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
        {display}
      </div>
    </div>
  );
}

function MetricChart({ title, data, isPercent }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 shadow-sm border h-56">
      <h3 className="text-sm font-semibold mb-2 text-slate-700">{title}</h3>
      {data.length === 0 ? (
        <p className="text-xs text-gray-500">
          Aún no hay datos suficientes para graficar.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            {isPercent ? (
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
            ) : (
              <YAxis tick={{ fontSize: 10 }} />
            )}
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              labelStyle={{ fontSize: 11 }}
            />
            <Line type="monotone" dataKey="value" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default TableOID;
