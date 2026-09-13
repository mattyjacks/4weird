'use strict';
// vcwcode ports helper — probe local TCP ports (built-ins only).
const net = require('net');

function probePort(host, port, timeoutMs) {
  const timeout = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : 1000;
  return new Promise((resolve) => {
    let done = false;
    const finish = (open) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch (_) { /* ignore */ }
      resolve(open);
    };
    const socket = new net.Socket();
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    try {
      socket.connect(port, host);
    } catch (_) {
      finish(false);
    }
  });
}

async function portsStatus() {
  const [p42069, p8888] = await Promise.all([
    probePort('127.0.0.1', 42069),
    probePort('127.0.0.1', 8888),
  ]);
  return { 42069: p42069, 8888: p8888 };
}

module.exports = { probePort, portsStatus };
