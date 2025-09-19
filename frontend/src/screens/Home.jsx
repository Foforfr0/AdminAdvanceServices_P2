import { useState } from "react";
import ViewDevices from "./devices/ViewDevices";
import AddDevice from "./devices/AddDevice";
import TableOID from "./devices/TableOID";
import GraphView from "./devices/GraphView";

function Home() {
  const [selectedIp, setSelectedIp] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "graph"

  return (
    <div className="grid h-auto mx-5 my-3 bg-white shadow-xl">
      <div className="grid grid-cols-2">
        {/* Left side: device list + add device */}
        <div className="border-1 w-auto m-3 p-3 rounded-lg shadow-md">
          <ViewDevices
            onMonitor={(ip) => {
              setSelectedIp(ip);
              setViewMode("table"); // default to table when selecting a device
            }}
          />
          <AddDevice />
        </div>

        {/* Right side: monitoring */}
        <div className="border-1 w-auto m-3 p-3 rounded-lg shadow-md">
          {selectedIp ? (
            <>
              {/* Toggle buttons */}
              <div className="flex justify-center gap-4 mb-4">
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-4 py-2 rounded ${
                    viewMode === "table"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Tabla
                </button>
                <button
                  onClick={() => setViewMode("graph")}
                  className={`px-4 py-2 rounded ${
                    viewMode === "graph"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200"
                  }`}
                >
                  Gráficas
                </button>
              </div>

              {/* Render table or graphs */}
              {viewMode === "table" && <TableOID ip={selectedIp} />}
              {viewMode === "graph" && <GraphView ip={selectedIp} />}
            </>
          ) : (
            <p className="text-center text-gray-500">
              Selecciona un dispositivo
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
