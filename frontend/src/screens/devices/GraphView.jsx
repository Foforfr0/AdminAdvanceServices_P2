import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

function GraphView({ ip }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!ip) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/snmp/?ip=${ip}&format=json`);
        const json = await res.json();

        // Extract RAM values
        const used = parseInt(json["hrStorageUsed.1"]?.Valor || 0);
        const total = parseInt(json["hrStorageSize.1"]?.Valor || 1);
        const ramPercent = (used / total) * 100;

        // Extract CPU load (if available in JSON)
        const cpu = parseInt(json["hrProcessorLoad"]?.Valor || 0);

        setData((prev) => [
          ...prev.slice(-20), // keep last 20 samples
          {
            time: new Date().toLocaleTimeString(),
            ram: ramPercent,
            cpu: cpu,
          },
        ]);
      } catch (err) {
        console.error("Error fetching SNMP data:", err);
      }
    }, 5000); // poll every 5s

    return () => clearInterval(interval);
  }, [ip]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Monitoreo de {ip}</h2>
      <LineChart width={500} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="ram" stroke="#8884d8" name="RAM (%)" />
        <Line type="monotone" dataKey="cpu" stroke="#82ca9d" name="CPU (%)" />
      </LineChart>
    </div>
  );
}

export default GraphView;
