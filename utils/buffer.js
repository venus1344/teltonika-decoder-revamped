/**
 * Create AVL packet acknowledgment
 * @param {number} recordCount - Number of records to acknowledge
 * @returns {Buffer}
 */
function createAvlAck(recordCount) {
    const ack = Buffer.alloc(4);
    ack.writeUInt32BE(recordCount);
    return ack;
}

/**
 * Check if buffer contains complete AVL packet
 * @param {Buffer} buffer - Data buffer
 * @returns {{ complete: boolean, packetLength: number }}
 */
function hasCompleteAvlPacket(buffer) {
    if (buffer.length < 12) {
        return { complete: false, packetLength: 0 };
    }

    const dataLength = buffer.readUInt32BE(4);
    const fullPacketLength = dataLength + 12;

    return {
        complete: buffer.length >= fullPacketLength,
        packetLength: fullPacketLength,
    };
}

module.exports = {
    createAvlAck,
    hasCompleteAvlPacket,
};
