// Home.jsx
import { useState } from "react";
import ViewDevices from "./devices/ViewDevices";
import AddDevice from "./devices/AddDevice";
import TableOID from "./devices/TableOID";

function Home() {
  // selectedDevice = { ip, apodo } o null
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const openAddModal = () => setIsAddModalOpen(true);
  const closeAddModal = () => setIsAddModalOpen(false);

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Panel de monitoreo SNMP
          </h1>
          {selectedDevice && (
            <span className="text-sm text-slate-500">
              Dispositivo seleccionado:&nbsp;
              <span className="font-semibold text-slate-700">
                {selectedDevice.apodo || selectedDevice.ip}
              </span>
            </span>
          )}
        </header>

        {/* Layout principal: barra izquierda + panel de métricas */}
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          {/* Panel izquierdo: lista de dispositivos */}
          <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col gap-4">
            <ViewDevices
              onMonitor={setSelectedDevice}
              onAddDeviceClick={openAddModal}
            />
          </div>

          {/* Panel derecho: dashboard SNMP */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <TableOID device={selectedDevice} />
          </div>
        </div>
      </div>

      {/* Modal para agregar dispositivo */}
      {isAddModalOpen && <AddDeviceModal onClose={closeAddModal} />}
    </div>
  );
}

function AddDeviceModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="text-xl font-semibold mb-2 text-slate-800">
          Agregar dispositivo SNMP
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Ingresa el nombre y la dirección IP del dispositivo que quieras
          monitorear. Se guardará localmente en este navegador.
        </p>
        <AddDevice onClose={onClose} />
      </div>
    </div>
  );
}

export default Home;
