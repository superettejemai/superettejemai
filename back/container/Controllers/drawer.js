const { SerialPort } = require('serialport');

async function tryPort(portName) {
  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portName,
      baudRate: 9600,
      autoOpen: false
    });

    port.open((err) => {
      if (err) return reject(err);

      // Common cash drawer command
      const command = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);

      port.write(command, (err) => {
        port.close();
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
}

async function openDrawer() {
 

  // Try COM1 to COM20 (you can increase if needed)
  for (let i = 1; i <= 20; i++) {
    const portName = `COM${i}`;
    try {
      await tryPort(portName);
      return;
    } catch {
      console.log(`❌ Not on ${portName}`);
    }
  }

  console.log('⚠️ No working cash drawer port found.');
}

// Run it
openDrawer();
