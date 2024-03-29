const mqtt = require("mqtt");
const noble = require('noble');

const RoomPresenceHandler = require("./handlers/RoomPresenceHandler");
const OralBToothbrushHandler = require("./handlers/OralBToothbrushHandler");
const XiaomiV2ScaleHandler = require("./handlers/XiaomiV2ScaleHandler");

const config = require("./config.json");
const mqttClient = mqtt.connect(config.mqtt.url, {});

noble.on('stateChange', state => { //TODO: Read documentation to find out if this even makes sense
    if (state === 'poweredOn') {
        console.info("Starting scan");
        noble.startScanning([], true);
    } else {
        noble.stopScanning();
    }
});

mqttClient.on("connect", () => {
    console.info("Connected to broker");

    //TODO: Better config handling
    const handlers = [
        new RoomPresenceHandler(Object.assign({}, {mqttClient: mqttClient}, {
            room: config.handlers.RoomPresenceHandler.room,
            devices: config.handlers.RoomPresenceHandler.devices.map(d => {
                return {
                    mac: d.mac.toLowerCase(),
                    id: d.id,
                    name: d.name
                }
            })
        })),
        new OralBToothbrushHandler(Object.assign({}, {mqttClient: mqttClient}, {
            devices: config.handlers.OralBToothbrushHandler.devices.map(d => {
                return {
                    mac: d.mac.toLowerCase(),
                    id: d.id,
                    name: d.name
                }
            })
        })),
        new XiaomiV2ScaleHandler(Object.assign({}, {mqttClient: mqttClient}, {
            devices: config.handlers.XiaomiV2ScaleHandler.devices.map(d => {
                return {
                    mac: d.mac.toLowerCase(),
                    id: d.id,
                    name: d.name,
                    userSex: d.userSex,
                    userHeight: d.userHeight,
                    userBirthday: new Date(d.userBirthday)
                }
            })
        }))
    ];

    handlers.forEach(handler => {
        //TODO: this should check if it was successful
        //TODO: Unify autodiscovery prefix stuff
        handler.setupAutodiscovery();
    });

    noble.on("discover", peripheral => {
        handlers.forEach(h => {
            h.handle(peripheral);
        })
    });
});

["error", "close", "disconnect", "end"].forEach(event => {
    //TODO: Something reasonable
    mqttClient.on(event, (e) => {
        console.error(e);
        process.exit(0);
    })
});