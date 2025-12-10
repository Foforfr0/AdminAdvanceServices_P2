// devices/ViewDevices.jsx
import { useState, useEffect } from "react";

function ViewDevices({ onMonitor, onAddDeviceClick }) {
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("devices");
    if (stored) {
      try {
        setDevices(JSON.parse(stored));
      } catch {
        setDevices([]);
      }
    }
  }, []);

  const handleDelete = (ipToDelete) => {
    const filtered = devices.filter((device) => device.ip !== ipToDelete);
    setDevices(filtered);
    localStorage.setItem("devices", JSON.stringify(filtered));
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-slate-800">Mis dispositivos</h2>
        <button
          type="button"
          onClick={onAddDeviceClick}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors"
        >
          <span className="text-base">＋</span>
          <span>Agregar</span>
        </button>
      </div>

      {devices.length === 0 ? (
        <p className="text-center text-gray-500 text-sm">
          No hay dispositivos guardados. Usa el botón &quot;Agregar&quot; para
          añadir uno nuevo.
        </p>
      ) : (
        <ul className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
          {devices.map(({ ip, apodo }) => (
            <li
              key={ip}
              className="flex justify-between items-center border rounded-lg px-3 py-3 shadow-sm bg-slate-50"
            >
              <div className="flex flex-col">
                <p className="font-semibold text-slate-800 text-sm sm:text-base">
                  {apodo || "Sin nombre"}
                </p>
                <p className="text-xs text-slate-500 break-all">IP: {ip}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onMonitor({ ip, apodo })}
                  type="button"
                  className="bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold hover:bg-blue-600 transition"
                >
                  Monitorear
                </button>
                <button
                  onClick={() => handleDelete(ip)}
                  type="button"
                  className="bg-red-500 text-white px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold hover:bg-red-600 transition"
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ViewDevices;
