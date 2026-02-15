/**
 * Parse IMEI from handshake packet
 * @param {Buffer} buffer - Data buffer
 * @returns {{ imei: string, remaining: Buffer } | null}
 */
function parseImei(buffer) {
    if (buffer.length < 2) {
        return null;
    }

    const imeiLength = buffer.readUInt16BE(0);

    if (buffer.length < 2 + imeiLength) {
        return null;
    }

    const imei = buffer.slice(2, 2 + imeiLength).toString();
    const remaining = buffer.slice(2 + imeiLength);

    return { imei, remaining };
}

/**
 * Create IMEI acknowledgment buffer
 * @returns {Buffer}
 */
function createImeiAck() {
    return Buffer.from([0x01]);
}

module.exports = {
    parseImei,
    createImeiAck,
};
