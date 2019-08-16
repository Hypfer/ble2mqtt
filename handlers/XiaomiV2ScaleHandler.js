const util = require("util");

const Handler = require("./Handler");
const BodyMetrics = require("../lib/BodyMetrics");

/**
 *
 * @param options {object}
 * @param options.devices {Array<object>}
 * @param options.devices.mac {string}
 * @param options.devices.id {string}
 * @param options.devices.name {string}
 * @param options.devices.userBirthday {Date}
 * @param options.devices.userHeight {number}
 * @param options.devices.userSex {"M"|"F"}
 * @param options.mqttClient
 * @constructor
 */
const XiaomiV2ScaleHandler = function (options) {
    Handler.call(this, options);
};

util.inherits(XiaomiV2ScaleHandler, Handler);

XiaomiV2ScaleHandler.prototype.setupAutodiscovery = function () {
    this.devices.forEach(d => {
        this.mqttClient.publish("homeassistant/sensor/body_scale_" + d.id + "/config", JSON.stringify({
            "state_topic": "body_scale/" + d.id + "/state",
            "json_attributes_topic": "body_scale/" + d.id + "/attributes",
            "name": d.name,
            "platform": "mqtt",
            "unit_of_measurement": "kg", //TODO
            "icon": "mdi:scale-bathroom"
        }), {retain: true});
    })
};

XiaomiV2ScaleHandler.prototype.handle = function (peripheral) {
    if (peripheral && peripheral.address && this.macs.indexOf(peripheral.address) !== -1 &&
        peripheral.advertisement && peripheral.advertisement.serviceData && peripheral.advertisement.serviceData.length > 0 &&
        peripheral.advertisement.serviceData[0].uuid === "181b"
    ) {
        const device = this.devices[this.macs.indexOf(peripheral.address)];
        if(!device.lastUpdate || device.lastUpdate < new Date().getTime() - 500) {
            const data = peripheral.advertisement.serviceData[0].data;
            let unit;

            //TODO: Use this value. Handle scales with non-kg-measurements
            if((data[0] & (1<<4)) !== 0) { // Chinese Catty
                unit = "jin"
            } else if ((data[0] & 0x0F) === 0x03) { // Imperial pound
                unit = "lbs"
            } else if ((data[0] & 0x0F) === 0x02) { // MKS kg
                unit = "kg"
            } else {
                unit = "???"
            }

            const state = {
                isStabilized: ((data[1] & (1 << 5)) !== 0),
                loadRemoved: ((data[1] & (1 << 7)) !== 0),
                impedanceMeasured: ((data[1] & (1 << 1)) !== 0)
            };

            const measurements = {
                weight: (data.readUInt16LE(data.length - 2) / 100) /2,
                impedance: data.readUInt16LE(data.length - 4)
            };

            if(state.isStabilized && state.loadRemoved) {
                //TODO: Maybe don't do the body metrics in this app at all?
                //By doing those somewhere else, sex, age and height could be completely dynamic
                //At least age is dynamic atm. Just don't grow and/or share your scale, okay?
                const BM = new BodyMetrics({
                    age: (new Date().getTime() - device.userBirthday.getTime())/31556926000,
                    height: device.userHeight,
                    sex: device.userSex
                });
                this.mqttClient.publish("body_scale/" + device.id + "/state", measurements.weight.toFixed(2));
                this.mqttClient.publish("body_scale/" + device.id + "/attributes", JSON.stringify(BM.getAllMetrics(measurements.weight, measurements.impedance)));

                device.lastUpdate = new Date().getTime();
            }

        }
    }
};


module.exports = XiaomiV2ScaleHandler;