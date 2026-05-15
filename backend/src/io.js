let _io = null;

function init(httpServer) {
  const { Server } = require('socket.io');
  _io = new Server(httpServer, { cors: { origin: '*' } });
  return _io;
}

function getIO() {
  return _io;
}

module.exports = { init, getIO };
