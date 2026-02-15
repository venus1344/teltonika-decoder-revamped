const http = require("http");
const https = require("https");
const { URL } = require("url");
const { MAPPING_API } = require("../config");

/**
 * Push decoded record to the mapping interface via OsmAnd format
 * @param {string} imei - Device IMEI
 * @param {object} record - Decoded AVL record
 */
function pushToMappingApi(imei, record) {
    const { gps, timestamp, io, event, priority } = record;

    const payload = buildPayload(imei, timestamp, gps, io, event, priority);
    const params = new URLSearchParams(payload);

    sendRequest(params, imei);
}

/**
 * Build OsmAnd-compatible payload
 */
function buildPayload(imei, timestamp, gps, io, event, priority) {
    const fixTime = new Date(timestamp).getTime();

    // Build attributes with IO values and metadata
    const attributes = {
        ...io,
        event,
        priority,
        satellites: gps.satellites,
    };

    return {
        uniqueId: imei,
        fixTime: fixTime.toString(),
        latitude: gps.latitude.toString(),
        longitude: gps.longitude.toString(),
        altitude: gps.altitude.toString(),
        speed: convertKmhToKnots(gps.speed).toString(),
        course: gps.angle.toString(),
        valid: (gps.valid ? 1 : 0).toString(),
        protocol: MAPPING_API.protocol,
        attributes: JSON.stringify(attributes),
    };
}

/**
 * Convert km/h to knots (OsmAnd expects knots)
 */
function convertKmhToKnots(kmh) {
    return kmh / 1.852;
}

/**
 * Send HTTP request to mapping API
 */
function sendRequest(params, imei) {
    const apiUrl = new URL(MAPPING_API.url);
    const isHttps = apiUrl.protocol === "https:";
    const httpModule = isHttps ? https : http;

    const options = {
        hostname: apiUrl.hostname,
        port: apiUrl.port || (isHttps ? 443 : 80),
        path: `${apiUrl.pathname}?${params.toString()}`,
        method: "GET",
        timeout: MAPPING_API.timeout,
    };

    const req = httpModule.request(options, res => {
        let data = "";
        res.on("data", chunk => (data += chunk));
        res.on("end", () => {
            if (res.statusCode === 200) {
                console.log(`✅ Pushed to mapping API: IMEI=${imei}`);
            } else {
                console.error(`⚠️ Mapping API error: ${res.statusCode} - ${data}`);
            }
        });
    });

    req.on("error", err => {
        console.error(`❌ Mapping API request failed: ${err.message}`);
    });

    req.on("timeout", () => {
        req.destroy();
        console.error("❌ Mapping API request timed out");
    });

    req.end();
}

module.exports = {
    pushToMappingApi,
};
