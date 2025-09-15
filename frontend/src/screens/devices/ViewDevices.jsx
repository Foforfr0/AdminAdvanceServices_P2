import { useState, useEffect } from "react";

function ViewDevices({ onMonitor }) {
  // Estado para la lista de dispositivos
  const [devices, setDevices] = useState([]);

  // Cargar dispositivos desde localStorage al montar el componente
  useEffect(() => {
    const stored = localStorage.getItem("devices");
    if (stored) {
      try {
        setDevices(JSON.parse(stored));
      } catch (e) {
        console.error("Error parsing devices from localStorage", e);
      }
    }
  }, []);

  // Función para eliminar un dispositivo por IP (o por índice)
  const handleDelete = (ipToDelete) => {
    const filtered = devices.filter((device) => device.ip !== ipToDelete);
    setDevices(filtered);
    localStorage.setItem("devices", JSON.stringify(filtered));
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-center text-2xl font-bold mb-6">Mis dispositivos</h2>

      {devices.length === 0 ? (
        <p className="text-center text-gray-500">
          No hay dispositivos guardados.
        </p>
      ) : (
        <ul className="space-y-4">
          {devices.map(({ ip, apodo }) => (
            <li
              key={ip}
              className="flex justify-between items-center border rounded p-3 shadow"
            >
              <div>
                <p className="font-semibold">Apodo: {apodo}</p>
                <p className="text-sm text-gray-600">IP: {ip}</p>
              </div>
              <button
                onClick={() => handleDelete(ip)}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                aria-label={`Eliminar dispositivo ${apodo}`}
              >
                Eliminar
              </button>
              <button
                onClick={() => onMonitor(ip)}
                type="button"
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                aria-label={`Empezar monitoreo ${apodo}`}
              >
                Monitorear
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ViewDevices;
