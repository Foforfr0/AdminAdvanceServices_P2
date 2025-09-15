import { useState } from "react";
import ViewDevices from "./devices/ViewDevices";
import AddDevice from "./devices/AddDevice";
import TableOID from "./devices/TableOID";

function Home() {
  const [selectedIp, setSelectedIp] = useState(null);

  return (
    <div className="grid h-auto mx-5 my-3 bg-white shadow-xl">
      <div className="grid grid-cols-2">
        <div className="border-1 w-auto m-3 p-3 rounded-lg shadow-md">
          <ViewDevices onMonitor={setSelectedIp} />
          <AddDevice />
        </div>
        <div className="border-1 w-auto m-3 p-3 rounded-lg shadow-md">
          <TableOID ip={selectedIp} />
        </div>
      </div>
    </div>
  );
}

export default Home;
