const util = require("util");
const async = require("async");

const Handler = require("./Handler");
const MiCipher = require("../lib/MiCipher");

/**
 *
 * @param options {object}
 * @param options.noble {noble}
 * @param options.devices {Array<object>}
 * @param options.devices.mac {string}
 * @param options.devices.id {string}
 * @param options.devices.name {string}
 * @param options.devices.productId {number}
 * @param options.devices.reverseMac {Buffer}
 * @param options.mqttClient
 * @constructor
 */
const XiaomiMiKettleHandler = function(options) {
    Handler.call(this, options);

    this.noble = options.noble;

};

util.inherits(XiaomiMiKettleHandler, Handler);

XiaomiMiKettleHandler.prototype.setupAutodiscovery = function() {

};

XiaomiMiKettleHandler.prototype.handle = function(peripheral) {
    if(peripheral && peripheral.address && this.macs.indexOf(peripheral.address) !== -1) {
        const device = this.devices[this.macs.indexOf(peripheral.address)];

        console.log(device);
        if(!device.connected) {
            device.connecting = true;
            device.token = Buffer.allocUnsafeSlow(12);


            let timeout = setTimeout(() => {
                console.log("giving up");
                this.noble.cancelLeConn();
                device.connecting = false;
                device.connected = false;
            }, 2000);

            XiaomiMiKettleHandler.CONNECT_TO_KETTLE(peripheral, device, (err, dataCharacteristics) => {
                if(!err) {
                    device.connected = true;
                    device.connecting = false;

                    clearTimeout(timeout);

                    //djaf //TODO
                } else {
                    device.connected = false;
                    device.connecting = false;
                }
            })
        }
    }
};

XiaomiMiKettleHandler.CONNECT_TO_KETTLE = function(peripheral, device, callback) {
    let authService;
    let dataService;
    let authCharacteristics = {};
    let dataCharacteristics = {};

    async.waterfall([
        function connect(callback) {
            peripheral.on("disconnect", () => {device.connected = false; device.connecting = false});
            peripheral.connect(callback);
        },
        function serviceDiscovery(callback) {
            peripheral.discoverServices(null, (err, services) => {
                if(!err) {
                    const servicesByID = {};
                    services.forEach(s => servicesByID[s.uuid] = s);

                    if(servicesByID[XiaomiMiKettleHandler.AUTH_SERVICE_ID] && servicesByID[XiaomiMiKettleHandler.DATA_SERVICE_ID]) {
                        authService = servicesByID[XiaomiMiKettleHandler.AUTH_SERVICE_ID];
                        dataService = servicesByID[XiaomiMiKettleHandler.DATA_SERVICE_ID];

                        callback();
                    } else {
                        callback(new Error("Missing service"));
                    }
                } else {
                    callback(err);
                }
            });
        },
        function authCharacteristicsDiscovery(callback) {
            authService.discoverCharacteristics(null, (err, characteristics) => {
                if(!err) {
                    const cByID = {};
                    characteristics.forEach(c => cByID[c.uuid] = c);

                    if(cByID[XiaomiMiKettleHandler.AUTH_CHARACTERISTICS.INIT] && cByID[XiaomiMiKettleHandler.AUTH_CHARACTERISTICS.AUTH] && cByID[XiaomiMiKettleHandler.AUTH_CHARACTERISTICS.VER]) {
                        authCharacteristics.INIT = cByID[XiaomiMiKettleHandler.AUTH_CHARACTERISTICS.INIT];
                        authCharacteristics.AUTH = cByID[XiaomiMiKettleHandler.AUTH_CHARACTERISTICS.AUTH];
                        authCharacteristics.VER = cByID[XiaomiMiKettleHandler.AUTH_CHARACTERISTICS.VER];
                        callback();
                    } else {
                        callback(new Error("Missing characteristic"));
                    }
                } else {
                    callback(err);
                }
            })
        },
        function authStep1(callback) {
            authCharacteristics.INIT.write(XiaomiMiKettleHandler.KEY1, true, callback);
        },
        function authStep2(callback) {
            //We have to write 0x01, 0x00 this instead of calling ".subscribe" for.. reasons.
            authCharacteristics.AUTH.write(Buffer.from([0x01, 0x00]), false, err => {
                if(!err) {
                    //STEP 3
                    authCharacteristics.AUTH.on("data", data => {
                        if(MiCipher.cipher(MiCipher.mixB(device.reverseMac, device.productId), MiCipher.cipher(MiCipher.mixA(device.reverseMac, device.productId), data)).compare(device.token) === 0) {
                            callback();
                        } else {
                            callback(new Error("Verification failed"))
                        }
                    });

                    //STEP 4
                    authCharacteristics.AUTH.write(MiCipher.cipher(MiCipher.mixA(device.reverseMac, device.productId), device.token), err => {
                        if(err) {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });
        },
        function authStep5(callback) {
            authCharacteristics.AUTH.write(MiCipher.cipher(device.token, XiaomiMiKettleHandler.KEY2), true, callback);
        },
        function authStep6(callback) {
            authCharacteristics.VER.read((err, data) => {
                if(!err) {
                    //We have to wait a moment https://github.com/noble/noble/issues/825#issuecomment-416292680
                    setTimeout(() => {
                        callback();
                    }, 100)
                } else {
                    callback(err);
                }
            });
        },
        function dataCharacteristicsDiscovery(callback) {
            dataService.discoverCharacteristics(null, function(err, characteristics){
                if(!err) {
                    if(Array.isArray(characteristics) && characteristics.length === 5) {
                        characteristics.forEach(c => dataCharacteristics[c.uuid] = c);
                        callback();
                    }
                } else {
                    callback(err);
                }
            });
        }
    ], function(err) {
        if(!err) {
            callback(null, dataCharacteristics)
        } else {
            callback(err);
        }
    })
};

XiaomiMiKettleHandler.KEY1 = Buffer.from([0x90, 0xCA, 0x85, 0xDE]);
XiaomiMiKettleHandler.KEY2 = Buffer.from([0x92,0xAB,0x54,0xFA]);

XiaomiMiKettleHandler.AUTH_SERVICE_ID = "fe95";
XiaomiMiKettleHandler.DATA_SERVICE_ID = "01344736000010008000262837236156";

XiaomiMiKettleHandler.AUTH_CHARACTERISTICS = {
    INIT: "10",
    AUTH: "1",
    VER: "4"
};

module.exports = XiaomiMiKettleHandler;