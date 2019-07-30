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
 * @param options.room {string}
 * @constructor
 */
const RoomPresenceHandler = function(options) {
    Handler.call(this, options);

    this.room = options.room;
};

util.inherits(RoomPresenceHandler, Handler);

RoomPresenceHandler.prototype.setupAutodiscovery = function() {
    //Sadly, this isn't supported by mqtt_room yet
};

RoomPresenceHandler.prototype.handle = function(peripheral) {
    if(peripheral && peripheral.address && this.macs.indexOf(peripheral.address) !== -1) {
        const device = this.devices[this.macs.indexOf(peripheral.address)];
        // somewhat reasonable default value
        const txPower = peripheral && peripheral.advertisement && peripheral.advertisement.txPowerLevel ? peripheral.advertisement.txPowerLevel : -59;
        const distance = RoomPresenceHandler.CALCULATE_DISTANCE(peripheral.rssi, txPower);

        this.mqttClient.publish("room_presence/" + this.room, JSON.stringify({
            id: device.id,
            name: device.name,
            rssi: peripheral.rssi,
            uuid: device.id,
            distance: distance
        }));
    }
};

//Taken from https://github.com/mKeRix/room-assistant
RoomPresenceHandler.CALCULATE_DISTANCE = function calculateDistance(rssi, txPower) {
    if (rssi === 0) {
        return -1.0;
    }

    const ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
        return Math.pow(ratio, 10);
    } else {
        return (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    }
};

module.exports = RoomPresenceHandler;