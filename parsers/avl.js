const { parseGpsElement } = require("./gps");
const { parseIoGroup8, parseIoGroup8E, parseIoGroupVariable, getIoName } = require("./io");

const CODEC = {
    CODEC_8: 0x08,
    CODEC_8E: 0x8e,
};

/**
 * Decode AVL data packet
 * @param {Buffer} packet - Full AVL packet including preamble
 * @returns {{ records: Array, recordCount: number }}
 */
function decodeAvlPacket(packet) {
    let offset = 8; // Skip preamble (4) + data field length (4)

    const codecId = packet.readUInt8(offset++);
    const recordCount = packet.readUInt8(offset++);

    const records = [];

    for (let i = 0; i < recordCount; i++) {
        const record = parseAvlRecord(packet, offset, codecId);
        records.push(record.data);
        offset = record.offset;
    }

    return { records, recordCount };
}

/**
 * Parse single AVL data record
 * @param {Buffer} packet - Data packet
 * @param {number} offset - Current offset
 * @param {number} codecId - Codec ID (0x08 or 0x8E)
 * @returns {{ data: object, offset: number }}
 */
function parseAvlRecord(packet, offset, codecId) {
    // Timestamp (8 bytes)
    const timestamp = Number(packet.readBigInt64BE(offset));
    offset += 8;

    // Priority (1 byte)
    const priority = packet.readUInt8(offset++);

    // GPS Element (15 bytes)
    const gpsResult = parseGpsElement(packet, offset);
    offset = gpsResult.offset;

    // IO Elements
    const ioResult = parseIoElements(packet, offset, codecId);
    offset = ioResult.offset;

    return {
        data: {
            timestamp: new Date(timestamp).toISOString(),
            priority,
            gps: gpsResult.gps,
            eventId: ioResult.eventId,
            event: getIoName(ioResult.eventId),
            io: ioResult.io,
        },
        offset,
    };
}

/**
 * Parse IO elements based on codec type
 * @param {Buffer} packet - Data packet
 * @param {number} offset - Current offset
 * @param {number} codecId - Codec ID
 * @returns {{ eventId: number, io: object, offset: number }}
 */
function parseIoElements(packet, offset, codecId) {
    const io = {};
    let eventId;

    if (codecId === CODEC.CODEC_8E) {
        // Codec 8 Extended: 2-byte IDs
        eventId = packet.readUInt16BE(offset);
        offset += 2;

        // Total IO count (not used, but must read)
        offset += 2;

        // Parse IO groups by value size
        offset = parseIoGroup8E(packet, offset, 1, io);
        offset = parseIoGroup8E(packet, offset, 2, io);
        offset = parseIoGroup8E(packet, offset, 4, io);
        offset = parseIoGroup8E(packet, offset, 8, io);

        // Variable-length IO group (NX)
        offset = parseIoGroupVariable(packet, offset, io);
    } else if (codecId === CODEC.CODEC_8) {
        // Codec 8: 1-byte IDs
        eventId = packet.readUInt8(offset++);

        // Total IO count (not used, but must read)
        offset++;

        // Parse IO groups by value size
        offset = parseIoGroup8(packet, offset, 1, io);
        offset = parseIoGroup8(packet, offset, 2, io);
        offset = parseIoGroup8(packet, offset, 4, io);
        offset = parseIoGroup8(packet, offset, 8, io);
    } else {
        throw new Error(`Unsupported codec: 0x${codecId.toString(16)}`);
    }

    return { eventId, io, offset };
}

module.exports = {
    decodeAvlPacket,
    CODEC,
};
