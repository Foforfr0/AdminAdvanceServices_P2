import { useEffect, useState } from "react";

function TableOID({ ip }) {
  const intervalo = 3000; // 3 segundos
  const [data, setData] = useState({});

  useEffect(() => {
    if (!ip) return; // No hay IP seleccionada → no hacemos nada

    async function obtenerDatosJSON() {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/snmp?ip=${ip}&format=json`,
          {
            headers: { Accept: "application/json" },
          }
        );
        if (!response.ok) throw new Error("Error en la respuesta");

        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error al obtener datos JSON:", error);
      }
    }

    obtenerDatosJSON();
    const id = setInterval(obtenerDatosJSON, intervalo);

    return () => clearInterval(id);
  }, [ip]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-center text-2xl font-bold mb-6">
        {ip ? `Monitoreo de ${ip}` : "Selecciona un dispositivo"}
      </h2>

      {ip && (
        <table className="w-full border border-gray-300 rounded-lg shadow-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-gray-700">OID</th>
              <th className="px-4 py-2 text-left text-gray-700">Valor</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(data).map(([key, item]) => (
              <tr key={key} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-2 font-mono text-sm">{item.OID}</td>
                <td className="px-4 py-2">{item.Valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TableOID;
