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
const Handler = function(options) {
    this.devices = options.devices;

    this.macs = this.devices.map(d => d.mac);
    this.mqttClient = options.mqttClient;
};

Handler.prototype.setupAutodiscovery = function() {
    throw new Error("Implement setupAutodiscovery");
};

Handler.prototype.handle = function(peripheral) {
    throw new Error("Implement handle");
};

module.exports = Handler;