/**
 * Parse GPS element from AVL packet (15 bytes)
 * @param {Buffer} packet - Data packet
 * @param {number} offset - Current offset
 * @returns {{ gps: object, offset: number }}
 */
function parseGpsElement(packet, offset) {
    const longitude = packet.readInt32BE(offset) / 1e7;
    offset += 4;

    const latitude = packet.readInt32BE(offset) / 1e7;
    offset += 4;

    const altitude = packet.readInt16BE(offset);
    offset += 2;

    const angle = packet.readInt16BE(offset);
    offset += 2;

    const satellites = packet.readUInt8(offset++);

    const speed = packet.readUInt16BE(offset);
    offset += 2;

    return {
        gps: {
            latitude,
            longitude,
            altitude,
            angle,
            speed,
            satellites,
            valid: satellites > 0,
        },
        offset,
    };
}

module.exports = {
    parseGpsElement,
};
