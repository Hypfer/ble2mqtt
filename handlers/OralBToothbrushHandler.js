const util = require("util");

const Handler = require("./Handler");

/**
 *
 * @param options {object}
 * @param options.devices {Array<object>}
 * @param options.devices.mac {string}
 * @param options.devices.id {string}
 * @param options.devices.name {string}
 * @param options.mqttClient
 * @constructor
 */
const OralBToothbrushHandler = function (options) {
    Handler.call(this, options);
};

util.inherits(OralBToothbrushHandler, Handler);

OralBToothbrushHandler.prototype.setupAutodiscovery = function () {
    this.devices.forEach(d => {
        this.mqttClient.publish("homeassistant/sensor/toothbrush_" + d.id + "/config", JSON.stringify({
            "state_topic": "toothbrush/" + d.id + "/state",
            "json_attributes_topic": "toothbrush/" + d.id + "/attributes",
            "name": d.name,
            "platform": "mqtt",
            "availability_topic": "toothbrush/" + d.id + "/presence",
            "icon": "mdi:tooth-outline"
        }));
    })
};

OralBToothbrushHandler.prototype.handle = function (peripheral) {
    if (peripheral && peripheral.address && this.macs.indexOf(peripheral.address) !== -1 &&
        peripheral.advertisement && peripheral.advertisement.manufacturerData) {

        const device = this.devices[this.macs.indexOf(peripheral.address)];
        if(!device.lastUpdate || device.lastUpdate < new Date().getTime() - 500) {
            const parsedData = OralBToothbrushHandler.PARSE_TOOTHBRUSH_DATA(peripheral.advertisement.manufacturerData);

            this.mqttClient.publish("toothbrush/" + device.id + "/presence", parsedData.state > 0 ? "online" : "offline");
            this.mqttClient.publish("toothbrush/" + device.id + "/state", OralBToothbrushHandler.STATES[parsedData.state]);
            this.mqttClient.publish("toothbrush/" + device.id + "/attributes", JSON.stringify({
                rssi: peripheral.rssi,
                pressure: parsedData.pressure,
                time: parsedData.time,
                mode: OralBToothbrushHandler.MODES[parsedData.mode],
                sector: OralBToothbrushHandler.SECTORS[parsedData.sector]
            }));

            device.lastUpdate = new Date().getTime();
        }
    }
};

OralBToothbrushHandler.PARSE_TOOTHBRUSH_DATA = function(data) {
    return {
        state: data[5],
        pressure: data[6],
        time: data[7] * 60 + data[8],
        mode: data[9],
        sector: data[10]
    };
};

OralBToothbrushHandler.STATES = {
    0: "Unknown",
    1: "Initializing",
    2: "Idle",
    3: "Running",
    4: "Charging",
    5: "Setup",
    6: "Flight Menu",
    113: "Final Test",
    114: "PCB Test",
    115: "Sleeping",
    116: "Transport"
};

OralBToothbrushHandler.MODES = {
    0: "Off",
    1: "Daily Clean",
    2: "Sensitive",
    3: "Massage",
    4: "Whitening",
    5: "Deep Clean",
    6: "Tongue Cleaning",
    7: "Turbo",
    255: "Unknown"
};

OralBToothbrushHandler.SECTORS = {
    0: "Sector 1",
    1: "Sector 2",
    2: "Sector 3",
    3: "Sector 4",
    4: "Sector 5",
    5: "Sector 6",
    7: "Sector 7",
    8: "Sector 8",
    254: "Last sector",
    255: "No sector"
};

module.exports = OralBToothbrushHandler;