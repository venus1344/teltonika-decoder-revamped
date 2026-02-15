const { IO_MAP } = require("../config");

/**
 * Get IO element name from ID
 * @param {number} id - IO element ID
 * @returns {string} IO element name
 */
function getIoName(id) {
    return IO_MAP[id] || `io${id}`;
}

/**
 * Parse Codec 8 IO group (1-byte IDs)
 * @param {Buffer} packet - Data packet
 * @param {number} offset - Current offset
 * @param {number} valueSize - Size of each value in bytes (1, 2, 4, or 8)
 * @param {object} io - IO object to populate
 * @returns {number} New offset after parsing
 */
function parseIoGroup8(packet, offset, valueSize, io) {
    const count = packet.readUInt8(offset++);

    for (let i = 0; i < count; i++) {
        const id = packet.readUInt8(offset++);
        const value = readValue(packet, offset, valueSize);
        offset += valueSize;

        io[getIoName(id)] = formatValue(value, valueSize);
    }

    return offset;
}

/**
 * Parse Codec 8 Extended IO group (2-byte IDs)
 * @param {Buffer} packet - Data packet
 * @param {number} offset - Current offset
 * @param {number} valueSize - Size of each value in bytes (1, 2, 4, or 8)
 * @param {object} io - IO object to populate
 * @returns {number} New offset after parsing
 */
function parseIoGroup8E(packet, offset, valueSize, io) {
    const count = packet.readUInt16BE(offset);
    offset += 2;

    for (let i = 0; i < count; i++) {
        const id = packet.readUInt16BE(offset);
        offset += 2;

        const value = readValue(packet, offset, valueSize);
        offset += valueSize;

        io[getIoName(id)] = formatValue(value, valueSize);
    }

    return offset;
}

/**
 * Parse Codec 8 Extended variable-length IO group (NX)
 * @param {Buffer} packet - Data packet
 * @param {number} offset - Current offset
 * @param {object} io - IO object to populate
 * @returns {number} New offset after parsing
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

        io[getIoName(id)] = value.toString("hex");
    }

    return offset;
}

/**
 * Read value from buffer based on size
 */
function readValue(packet, offset, size) {
    switch (size) {
        case 1:
            return packet.readUInt8(offset);
        case 2:
            return packet.readUInt16BE(offset);
        case 4:
            return packet.readUInt32BE(offset);
        case 8:
            return packet.readBigUInt64BE(offset);
        default:
            throw new Error(`Unsupported value size: ${size}`);
    }
}

/**
 * Format value for output (handle BigInt for 8-byte values)
 */
function formatValue(value, size) {
    if (size === 8) {
        return value.toString();
    }
    return value;
}

module.exports = {
    parseIoGroup8,
    parseIoGroup8E,
    parseIoGroupVariable,
    getIoName,
};
