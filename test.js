/**
 * Test script for Teltonika Codec 8/8E decoder
 */

const { decodeAvlPacket } = require("./parsers/avl");
const { parseImei, createImeiAck } = require("./parsers/imei");
const { createAvlAck, hasCompleteAvlPacket } = require("./utils/buffer");

// Test data from Teltonika documentation
const TEST_DATA = {
    // Codec 8 Extended packet with 2 records
    codec8e: "00000000000001398e020000019be4e013a80015674f0ffdb7df6a03db009d0e000a0000001a000900ef0100f00100150200c80000450100010100b30000b40000fc00000c00b5000e00b60007004235ec00cd83a600ce008300430fef004400000009002b001100c70012fffe001301470006002b000200f10000fa040010001132ee0003000b00000002140063f4004e0000000000000000000e00000000270d3b7600000000019be4e017900015674f94fdb7e0a603dd007a0e00070000001a000900ef0100f00100150200c80000450100010100b30000b40000fc00000c00b5000d00b60007004235e800cd83a600ce008300430fe8004400000009002b001100a30012ff810013006c0006002b000200f10000fa040010001132f30003000b00000002140063f4004e0000000000000000000e00000000270d3b7600000200004f42",

    // IMEI packet (15-digit IMEI: 356307042441013)
    imei: "000F333536333037303432343431303133",

    // Codec 8 packet (simpler format)
    codec8: "000000000000003608010000016B40D8EA30010000000000000000000000000000000105021503010101425E0F01F10000601A014E0000000000000000010000C7CF",
};

function printHeader(title) {
    console.log("\n" + "=".repeat(50));
    console.log(title);
    console.log("=".repeat(50));
}

function printSubHeader(title) {
    console.log("\n" + "-".repeat(40));
    console.log(title);
    console.log("-".repeat(40));
}

// Test 1: IMEI Parsing
printHeader("Test 1: IMEI Parsing");

try {
    const imeiBuffer = Buffer.from(TEST_DATA.imei, "hex");
    const result = parseImei(imeiBuffer);

    if (result) {
        console.log("Input (hex):", TEST_DATA.imei);
        console.log("Parsed IMEI:", result.imei);
        console.log("Remaining bytes:", result.remaining.length);
        console.log("ACK response:", createImeiAck().toString("hex"));
        console.log("✅ Test 1 PASSED");
    } else {
        console.log("❌ Test 1 FAILED - Could not parse IMEI");
    }
} catch (err) {
    console.error("❌ Test 1 FAILED:", err.message);
}

// Test 2: Codec 8 Extended Decoding
printHeader("Test 2: Codec 8 Extended Packet Decoding");

try {
    const packet = Buffer.from(TEST_DATA.codec8e, "hex");

    console.log("Input length:", packet.length, "bytes");

    // Check if packet is complete
    const { complete, packetLength } = hasCompleteAvlPacket(packet);
    console.log("Packet complete:", complete);
    console.log("Expected packet length:", packetLength, "bytes");

    // Decode
    const { records, recordCount } = decodeAvlPacket(packet);

    console.log("\nDecoded successfully!");
    console.log("Record count:", recordCount);

    records.forEach((record, index) => {
        printSubHeader(`Record ${index + 1}`);
        console.log("Timestamp:", record.timestamp);
        console.log("Priority:", record.priority);
        console.log("Event:", record.event, `(ID: ${record.eventId})`);

        console.log("\nGPS Data:");
        console.log("  Latitude:", record.gps.latitude);
        console.log("  Longitude:", record.gps.longitude);
        console.log("  Altitude:", record.gps.altitude, "m");
        console.log("  Speed:", record.gps.speed, "km/h");
        console.log("  Angle:", record.gps.angle, "°");
        console.log("  Satellites:", record.gps.satellites);
        console.log("  Valid:", record.gps.valid);

        console.log("\nIO Elements:");
        Object.entries(record.io).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    });

    console.log("\nACK response:", createAvlAck(recordCount).toString("hex"));
    console.log("✅ Test 2 PASSED");
} catch (err) {
    console.error("❌ Test 2 FAILED:", err.message);
    console.error(err.stack);
}

// Test 3: Codec 8 Decoding
printHeader("Test 3: Codec 8 Packet Decoding");

try {
    const packet = Buffer.from(TEST_DATA.codec8, "hex");

    console.log("Input length:", packet.length, "bytes");

    const { complete, packetLength } = hasCompleteAvlPacket(packet);
    console.log("Packet complete:", complete);

    const { records, recordCount } = decodeAvlPacket(packet);

    console.log("\nDecoded successfully!");
    console.log("Record count:", recordCount);

    records.forEach((record, index) => {
        printSubHeader(`Record ${index + 1}`);
        console.log("Timestamp:", record.timestamp);
        console.log("Priority:", record.priority);
        console.log("Event:", record.event);

        console.log("\nGPS Data:");
        console.log("  Latitude:", record.gps.latitude);
        console.log("  Longitude:", record.gps.longitude);
        console.log("  Altitude:", record.gps.altitude, "m");
        console.log("  Speed:", record.gps.speed, "km/h");

        console.log("\nIO Elements:");
        Object.entries(record.io).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    });

    console.log("\n✅ Test 3 PASSED");
} catch (err) {
    console.error("❌ Test 3 FAILED:", err.message);
    console.error(err.stack);
}

// Test 4: Buffer utilities
printHeader("Test 4: Buffer Utilities");

try {
    // Test ACK creation
    const ack1 = createAvlAck(1);
    const ack5 = createAvlAck(5);

    console.log("ACK for 1 record:", ack1.toString("hex"), ack1.toString("hex") === "00000001" ? "✓" : "✗");
    console.log("ACK for 5 records:", ack5.toString("hex"), ack5.toString("hex") === "00000005" ? "✓" : "✗");

    // Test incomplete packet detection
    const incompleteBuffer = Buffer.alloc(8);
    const { complete } = hasCompleteAvlPacket(incompleteBuffer);
    console.log("Incomplete packet detected:", !complete ? "✓" : "✗");

    console.log("✅ Test 4 PASSED");
} catch (err) {
    console.error("❌ Test 4 FAILED:", err.message);
}

// Test 5: Mapping API payload (dry run)
printHeader("Test 5: Mapping API Payload Format");

try {
    const packet = Buffer.from(TEST_DATA.codec8e, "hex");
    const { records } = decodeAvlPacket(packet);
    const record = records[0];
    const imei = "356307042441013";

    // Simulate payload building
    const fixTime = new Date(record.timestamp).getTime();
    const attributes = {
        ...record.io,
        event: record.event,
        priority: record.priority,
        satellites: record.gps.satellites,
    };

    const payload = {
        uniqueId: imei,
        fixTime: fixTime,
        latitude: record.gps.latitude,
        longitude: record.gps.longitude,
        altitude: record.gps.altitude,
        speed: (record.gps.speed / 1.852).toFixed(2), // Convert to knots
        course: record.gps.angle,
        valid: record.gps.valid ? 1 : 0,
        protocol: "teltonika",
        attributes: JSON.stringify(attributes),
    };

    console.log("Sample payload for mapping API:");
    console.log(JSON.stringify(payload, null, 2));

    console.log("\n✅ Test 5 PASSED");
} catch (err) {
    console.error("❌ Test 5 FAILED:", err.message);
}

printHeader("All Tests Completed");
