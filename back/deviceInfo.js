const si = require("systeminformation");

async function getSystemInfo() {
  try {
    const system = await si.system();     // General system info
    const baseboard = await si.baseboard(); // Motherboard info

    console.log("System Info:", system);
    console.log("Baseboard Info:", baseboard);

    // Example: create a unique device ID
    const deviceId = `${system.serial}-${baseboard.serial}`;
    console.log("Device ID:", deviceId);
  } catch (err) {
    console.error("Error getting system info:", err);
  }
}

getSystemInfo();
