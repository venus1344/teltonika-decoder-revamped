const net = require("net");
const { PORT } = require("../config");
const { handleConnection } = require("./connectionHandler");

/**
 * Create and start TCP server
 * @returns {net.Server}
 */
function createServer() {
    const server = net.createServer(handleConnection);

    server.on("error", err => {
        console.error("❌ Server error:", err.message);
    });

    return server;
}

/**
 * Start the server
 */
function start() {
    const server = createServer();

    server.listen(PORT, () => {
        console.log(`🚀 Teltonika Codec8/8E server listening on port ${PORT}`);
    });

    return server;
}

module.exports = {
    createServer,
    start,
};
