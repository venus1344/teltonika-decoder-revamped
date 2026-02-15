const { parseImei, createImeiAck, decodeAvlPacket } = require("../parsers");
const { createAvlAck, hasCompleteAvlPacket } = require("../utils");
const { pushToMappingApi } = require("../services");

/**
 * Handle incoming device connection
 * @param {net.Socket} socket - TCP socket
 */
function handleConnection(socket) {
    console.log("📡 Device connected:", socket.remoteAddress);

    let buffer = Buffer.alloc(0);
    let imei = null;

    socket.on("data", chunk => {
        buffer = Buffer.concat([buffer, chunk]);
        processBuffer();
    });

    socket.on("end", () => {
        console.log("🔌 Disconnected:", imei || socket.remoteAddress);
    });

    socket.on("error", err => {
        console.error("❌ Socket error:", err.message);
    });

    function processBuffer() {
        while (true) {
            // Step 1: IMEI Handshake
            if (!imei) {
                const result = parseImei(buffer);
                if (!result) return;

                imei = result.imei;
                buffer = result.remaining;

                console.log("📟 IMEI:", imei);
                socket.write(createImeiAck());
                continue;
            }

            // Step 2: AVL Packet Processing
            const { complete, packetLength } = hasCompleteAvlPacket(buffer);
            if (!complete) return;

            const packet = buffer.slice(0, packetLength);
            buffer = buffer.slice(packetLength);

            try {
                const { records, recordCount } = decodeAvlPacket(packet);

                records.forEach(record => {
                    console.log("📦 AVL Record:", JSON.stringify(record, null, 2));
                    pushToMappingApi(imei, record);
                });

                socket.write(createAvlAck(recordCount));
            } catch (err) {
                console.error("❌ Decode error:", err.message);
            }
        }
    }
}

module.exports = {
    handleConnection,
};
