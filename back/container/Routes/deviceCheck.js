const express = require("express");
const si = require("systeminformation");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const filePath = path.join(__dirname, "../config/device.json");

// Helper: Get stored device ID
function getStoredDeviceId() {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(data);
    return json.VALID_DEVICE_ID || null;
  }
  return null;
}

// Helper: Save new device ID
function saveDeviceId(id) {
  fs.writeFileSync(filePath, JSON.stringify({ VALID_DEVICE_ID: id }, null, 2));
}

// Helper: Get current device info
async function getDeviceId() {
  try {
    const system = await si.system();
    const baseboard = await si.baseboard();
    return `${system.serial}-${baseboard.serial}`;
  } catch (error) {
    console.error("Error getting device ID:", error);
    return "";
  }
}

// ✅ GET /api/device/check
router.get("/check", async (req, res) => {
  try {
    const storedDeviceId = getStoredDeviceId(); // This could be "Barnoussa-Kef-AEVE" or the serial
    const currentDeviceId = await getDeviceId(); // This is the actual hardware ID

    // Check if the stored device ID is valid in two ways:
    // 1. If stored ID is "Barnoussa-Kef-AEVE" (manual override) → ALWAYS VALID
    // 2. If current hardware ID matches stored device ID → VALID
    const isManualOverride = storedDeviceId === "Barnoussa-Kef-AEVE";
    const isHardwareMatch = currentDeviceId === storedDeviceId;
    
    const valid = isManualOverride || isHardwareMatch;

    res.json({ 
      valid, 
      deviceId: currentDeviceId,
      storedDeviceId: storedDeviceId,
      isManualOverride: isManualOverride // Let frontend know if manual key was used
    });
  } catch (error) {
    console.error("Device check error:", error);
    res.status(500).json({ valid: false });
  }
});

// ✅ POST /api/device/set — save the new device ID (can be "Barnoussa-Kef-AEVE" or hardware ID)
router.post("/set", (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ success: false, message: "Missing deviceId" });

  saveDeviceId(deviceId);
  res.json({ 
    success: true, 
    message: "Device ID updated successfully", 
    deviceId,
    isManualOverride: deviceId === "Barnoussa-Kef-AEVE"
  });
});

module.exports = router;