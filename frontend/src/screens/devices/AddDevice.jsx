// devices/AddDevice.jsx
import { useState } from "react";

function AddDevice({ onClose }) {
  const [apodo, setApodo] = useState("");
  const [ip, setIp] = useState("");
  const [errorApodo, setErrorApodo] = useState("");
  const [errorIp, setErrorIp] = useState("");

  const isValidIp = (ip) => {
    const regex =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return regex.test(ip);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setErrorApodo("");
    setErrorIp("");

    let valid = true;

    if (!apodo.trim()) {
      setErrorApodo("El nombre del dispositivo es obligatorio");
      valid = false;
    }

    const trimmedIp = ip.trim();
    if (!trimmedIp) {
      setErrorIp("La IP es obligatoria");
      valid = false;
    } else if (!isValidIp(trimmedIp)) {
      setErrorIp("La IP no es válida");
      valid = false;
    }

    if (!valid) return;

    let devices = [];
    const stored = localStorage.getItem("devices");
    if (stored) {
      try {
        devices = JSON.parse(stored) || [];
      } catch {
        devices = [];
      }
    }

    // Evitar IP duplicadas
    if (devices.some((d) => d.ip === trimmedIp)) {
      setErrorIp("Ya existe un dispositivo con esa IP");
      return;
    }

    devices.push({ ip: trimmedIp, apodo: apodo.trim() });
    localStorage.setItem("devices", JSON.stringify(devices));

    setApodo("");
    setIp("");

    if (onClose) onClose();
    // Refresca la lista de la izquierda (más simple que levantar el estado)
    window.location.reload();
  };

  const handleClear = () => {
    setApodo("");
    setIp("");
    setErrorApodo("");
    setErrorIp("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <label className="block text-gray-700 font-medium mb-1">
            Nombre de dispositivo:
          </label>
          <input
            type="text"
            placeholder="Ej. Servidor principal"
            className="w-full px-3 py-2 border rounded-lg text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
          />
          {errorApodo && (
            <span className="mt-1 text-sm text-red-600">{errorApodo}</span>
          )}
        </div>

        <div className="flex flex-col">
          <label className="block text-gray-700 font-medium mb-1">
            IP de dispositivo:
          </label>
          <input
            type="text"
            placeholder="192.168.50.66"
            className="w-full px-3 py-2 border rounded-lg text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          {errorIp && (
            <span className="mt-1 text-sm text-red-600">{errorIp}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={handleClear}
          className="w-full sm:w-32 bg-slate-200 text-slate-800 py-2 rounded-lg font-semibold shadow-sm hover:bg-slate-300 transition-colors duration-200"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full sm:w-32 bg-red-500 text-white py-2 rounded-lg font-semibold shadow-md hover:bg-red-600 transition-colors duration-200"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="w-full sm:w-32 bg-emerald-500 text-white py-2 rounded-lg font-semibold shadow-md hover:bg-emerald-600 transition-colors duration-200"
        >
          Agregar
        </button>
      </div>
    </form>
  );
}

export default AddDevice;
