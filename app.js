const net = require("net");

const PORT = 6027;

/**
 * Common Teltonika IO mappings (partial but useful)
 * Extend freely based on your device model
 */
const IO_MAP = {
    1: "Digital Input 1",
    2: "Digital Input 2",
    3: "Digital Output 1",
    66: "External Voltage (mV)",
    67: "Battery Voltage (mV)",
    68: "Battery Current (mA)",
    69: "GNSS Status",
    70: "Movement",
    78: "iButton",
    80: "Data Mode",
    181: "GNSS PDOP",
    182: "GNSS HDOP",
    199: "Trip Odometer",
    207: "RFID",
    239: "Ignition",
    240: "Speed",
};

const server = net.createServer(socket => {
    console.log("📡 Device connected:", socket.remoteAddress);

    let buffer = Buffer.alloc(0);
    let imei = null;

    socket.on("data", chunk => {
        console.log(`HEX: ${chunk.toString("hex")}`);
        buffer = Buffer.concat([buffer, chunk]);

        while (true) {
            // 1️⃣ IMEI HANDSHAKE
            if (!imei) {
                if (buffer.length < 2) return;

                const imeiLength = buffer.readUInt16BE(0);
                if (buffer.length < 2 + imeiLength) return;

                imei = buffer.slice(2, 2 + imeiLength).toString();
                buffer = buffer.slice(2 + imeiLength);

                console.log("📟 IMEI:", imei);

                // ACK IMEI
                socket.write(Buffer.from([0x01]));
                continue;
            }

            // 2️⃣ AVL PACKET HEADER
            if (buffer.length < 12) return;

            const dataLength = buffer.readUInt32BE(4);
            const fullPacketLength = dataLength + 12;

            if (buffer.length < fullPacketLength) return;

            const packet = buffer.slice(0, fullPacketLength);
            buffer = buffer.slice(fullPacketLength);

            try {
                const { records, recordCount } = decodeAVLPacket(packet);

                records.forEach(r => {
                    console.log("📦 AVL Record:", JSON.stringify(r, null, 2));
                });

                // ACK number of records
                const ack = Buffer.alloc(4);
                ack.writeUInt32BE(recordCount);
                socket.write(ack);
            } catch (err) {
                console.error("❌ Decode error:", err.message);
            }
        }
    });

    socket.on("end", () => {
        console.log("🔌 Disconnected:", imei);
    });

    socket.on("error", err => {
        console.error("❌ Socket error:", err.message);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Teltonika Codec8/8E server listening on ${PORT}`);
});


// =====================
// DECODER
// =====================

function decodeAVLPacket(packet) {
    let offset = 8; // skip preamble (4) + data field length (4)

    const codec = packet.readUInt8(offset++);

    // Number of Data 1 is 1 byte for both Codec 8 and Codec 8E
    const recordCount = packet.readUInt8(offset++);

    const records = [];

    for (let i = 0; i < recordCount; i++) {
        const timestamp = Number(packet.readBigInt64BE(offset));
        offset += 8;

        const priority = packet.readUInt8(offset++);

        // GPS Element (15 bytes total)
        const lon = packet.readInt32BE(offset) / 1e7;
        offset += 4;

        const lat = packet.readInt32BE(offset) / 1e7;
        offset += 4;

        const altitude = packet.readInt16BE(offset);
        offset += 2;

        const angle = packet.readInt16BE(offset);
        offset += 2;

        const satellites = packet.readUInt8(offset++);
        const speed = packet.readUInt16BE(offset);
        offset += 2;

        // IO Elements - structure differs by codec
        let eventId;
        const io = {};

        if (codec === 0x8e) {
            // Codec 8 Extended: 2-byte event ID, counts, and element IDs
            eventId = packet.readUInt16BE(offset);
            offset += 2;

            const totalIo = packet.readUInt16BE(offset);
            offset += 2;

            offset = parseIoGroup8E(packet, offset, 1, io);
            offset = parseIoGroup8E(packet, offset, 2, io);
            offset = parseIoGroup8E(packet, offset, 4, io);
            offset = parseIoGroup8E(packet, offset, 8, io);

            // Variable-length IO group (NX) - unique to Codec 8E
            offset = parseIoGroupVariable(packet, offset, io);
        } else if (codec === 0x08) {
            // Codec 8: 1-byte event ID, counts, and element IDs
            eventId = packet.readUInt8(offset++);

            const totalIo = packet.readUInt8(offset++);

            offset = parseIoGroup8(packet, offset, 1, io);
            offset = parseIoGroup8(packet, offset, 2, io);
            offset = parseIoGroup8(packet, offset, 4, io);
            offset = parseIoGroup8(packet, offset, 8, io);
        } else {
            throw new Error("Unsupported codec: 0x" + codec.toString(16));
        }

        records.push({
            timestamp: new Date(timestamp).toISOString(),
            priority,
            gps: { lat, lon, altitude, angle, speed, satellites },
            event: IO_MAP[eventId] || `IO_${eventId}`,
            io,
        });
    }

    return { records, recordCount };
}

/**
 * Codec 8 Extended: 2-byte IO group count, 2-byte IO element IDs
 */
function parseIoGroup8E(packet, offset, valueSize, io) {
    const count = packet.readUInt16BE(offset);
    offset += 2;

    for (let i = 0; i < count; i++) {
        const id = packet.readUInt16BE(offset);
        offset += 2;

        let value;
        if (valueSize === 1) value = packet.readUInt8(offset);
        else if (valueSize === 2) value = packet.readUInt16BE(offset);
        else if (valueSize === 4) value = packet.readUInt32BE(offset);
        else value = packet.readBigUInt64BE(offset);

        offset += valueSize;

        const name = IO_MAP[id] || `IO_${id}`;
        io[name] = valueSize === 8 ? value.toString(16).padStart(16, "0") : value;
    }

    return offset;
}

/**
 * Codec 8 Extended: variable-length IO group (NX)
 * Each element has: 2-byte ID, 2-byte length, then `length` bytes of value
 */
function parseIoGroupVariable(packet, offset, io) {
    const count = packet.readUInt16BE(offset);
    offset += 2;

    for (let i = 0; i < count; i++) {
        const id = packet.readUInt16BE(offset);
        offset += 2;

        const length = packet.readUInt16BE(offset);
        offset += 2;

        const value = packet.slice(offset, offset + length);
        offset += length;

        const name = IO_MAP[id] || `IO_${id}`;
        io[name] = value.toString("hex");
    }

    return offset;
}

/**
 * Codec 8: 1-byte IO group count, 1-byte IO element IDs
 */
function parseIoGroup8(packet, offset, valueSize, io) {
    const count = packet.readUInt8(offset++);

    for (let i = 0; i < count; i++) {
        const id = packet.readUInt8(offset++);

        let value;
        if (valueSize === 1) value = packet.readUInt8(offset);
        else if (valueSize === 2) value = packet.readUInt16BE(offset);
        else if (valueSize === 4) value = packet.readUInt32BE(offset);
        else value = packet.readBigUInt64BE(offset);

        offset += valueSize;

        const name = IO_MAP[id] || `IO_${id}`;
        io[name] = valueSize === 8 ? value.toString(16).padStart(16, "0") : value;
    }

    return offset;
}