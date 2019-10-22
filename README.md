# ble2mqtt

**Deprecated** Use [https://github.com/Hypfer/Cybele](https://github.com/Hypfer/Cybele)

ble2mqtt is a ~~simple~~ way to integrate bluetooth smart devices into home assistant as well as other smarthome systems.

It aims to be a leaner and/or faster alternative to [room-assistant](https://github.com/mKeRix/room-assistant) as well as [bt-mqtt-gateway](https://github.com/zewelor/bt-mqtt-gateway)

Currently, it's focused on devices which report all the relevant data in their advertisement packets.
Therefore, ble2mqtt doesn't interfer with the devices in any way. It just observes and reports to ~~the authorities~~ the mqtt broker.

## Supported Devices
* Any Bluetooth Device with a static mac (e.g. BLE Beacons like the Gigaset G-Tag)
* Oral-B Smart Toothbrushes (though I don't know why)
* Xiaomi Mi Body Composition Scale (Also known as MIBCS, Mi Scale V2 etc.)

Where it's possible, ble2mqtt tries to make use of the Home Assistant autodiscovery feature

## Requirements
Please note that ble2mqtt currently requires a nodejs version <= 9 since it's using the noble library which hasn't been updated to compile against the latest nodejs versions.

Apart from that you will also need a suitable bluetooth dongle. You can check if it can receive anything by running `hcitool lescan`

## Installation
* git clone
* npm install
* copy config.default.json to config.json and edit for your setup

Since using raw sockets apparently requires root, you might need to run ``sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)`` if you want to run ble2mqtt as a regular user like a reasonable human being.

For persistence, you'll find a simple systemd unit file in the deployment folder. Don't forget to specify the correct paths.

## Misc

This is basically a prototype thrown right into production. Don't be surprised if things break. It works for me™

There are TODOs sprinkled all around the code. If you feel like it you might want to take a look at those.

**Please do not ask for support. You have to figure it out by yourself.** At least the code is free ¯\\_(ツ)_/¯
