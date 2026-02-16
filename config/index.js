module.exports = {
    PORT: process.env.PORT || 6027,

    MAPPING_API: {
        url: process.env.MAPPING_API_URL || "http://localhost:81/insert.php",
        protocol: "teltonika",
        timeout: 10000,
    },

    /**
     * Common Teltonika IO element mappings
     * Extend based on your device model
     * @see https://wiki.teltonika-gps.com/view/FMB_AVL_ID
     */
    IO_MAP: {
        1: "din1",
        2: "din2",
        3: "dout1",
        66: "externalVoltage",
        67: "batteryVoltage",
        68: "batteryCurrent",
        69: "gnssStatus",
        70: "movement",
        78: "io78",
        80: "dataMode",
        181: "gnssPdop",
        182: "gnssHdop",
        199: "tripOdometer",
        207: "rfid",
        239: "ignition",
        240: "speed",
    },
};
