class SNMPClient {
    constructor(baseURL = "http://127.0.0.1:8000") {
        this.baseURL = baseURL;
    }

    async getSNMPData(ip, format = "json") {
        const url = `${this.baseURL}/api/snmp/?ip=${ip}&format=${format}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Error al obtener datos SNMP para la IP ${ip}`);
            }
            if (format === "json") {
                return await response.json();
            } else if (format === "xml") {
                return await response.text();
            }
        } catch (error) {
            console.error("Error en getSNMPData:", error);
            throw error;
        }
    }

    async scanNetwork(networkRange) {
        const url = `${this.baseURL}/api/snmp/network-scan/?network=${networkRange}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Error al escanear la red.");
            }
            return await response.json();
        } catch (error) {
            console.error("Error en scanNetwork:", error);
            throw error;
        }
    }

    async getReport() {
        const url = `${this.baseURL}/api/snmp/report`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Error al generar el reporte.");
            }
            // Devolver la respuesta para que el navegador la maneje como una descarga
            return response;
        } catch (error) {
            console.error("Error en getReport:", error);
            throw error;
        }
    }
}