import { useState } from "react";

function AddDevice() {
  const [apodo, setApodo] = useState("");
  const [ip, setIp] = useState("");
  const [errorApodo, setErrorApodo] = useState("");
  const [errorIp, setErrorIp] = useState("");

  // Función para validar IP simple (puedes mejorarla)
  const isValidIp = (ip) => {
    const regex =
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    return regex.test(ip);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let valid = true;
    setErrorApodo("");
    setErrorIp("");

    if (!apodo.trim()) {
      setErrorApodo("El nombre del dispositivo es obligatorio");
      valid = false;
    }
    if (!ip.trim()) {
      setErrorIp("La IP es obligatoria");
      valid = false;
    } else if (!isValidIp(ip.trim())) {
      setErrorIp("La IP no es válida");
      valid = false;
    }

    if (!valid) return;

    // Leer dispositivos actuales
    const stored = localStorage.getItem("devices");
    let devices = [];
    if (stored) {
      try {
        devices = JSON.parse(stored);
      } catch {
        devices = [];
      }
    }

    // Agregar nuevo dispositivo
    devices.push({ ip: ip.trim(), apodo: apodo.trim() });

    // Guardar en localStorage
    localStorage.setItem("devices", JSON.stringify(devices));

    // Limpiar formulario
    setApodo("");
    setIp("");
    window.location.reload();
  };

  const handleClear = () => {
    setApodo("");
    setIp("");
    setErrorApodo("");
    setErrorIp("");
  };

  return (
    <div>
      <div className="text-center text-xl font-bold mb-4">
        Agregar dispositivo
      </div>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-row gap-6 justify-center">
          <div className="flex flex-col">
            <label className="block text-gray-700 font-medium mb-1">
              Nombre de dispositivo:
            </label>
            <input
              type="text"
              placeholder="Eg. Servidor principal"
              className="w-64 px-3 py-2 border rounded-lg text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              value={apodo}
              onChange={(e) => setApodo(e.target.value)}
            />
            {errorApodo && <label className="text-red-600">{errorApodo}</label>}
          </div>

          <div className="flex flex-col">
            <label className="block text-gray-700 font-medium mb-1">
              IP de dispositivo:
            </label>
            <input
              type="text"
              placeholder="192.168.0.1"
              className="w-64 px-3 py-2 border rounded-lg text-gray-800 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
            {errorIp && <label className="text-red-600">{errorIp}</label>}
          </div>
        </div>

        <div className="flex gap-4 justify-center mt-6">
          <button
            type="button"
            onClick={handleClear}
            className="w-32 bg-red-500 text-white py-2 rounded-lg font-semibold shadow-md hover:bg-red-600 transition-colors duration-300"
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="w-32 bg-green-500 text-white py-2 rounded-lg font-semibold shadow-md hover:bg-green-600 transition-colors duration-300"
          >
            Agregar
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddDevice;
