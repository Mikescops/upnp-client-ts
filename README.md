# UPNP Client for NodeJS

A modern UPNP client made in Typescript. Compatible with both ESM and CommonJS.

This project is based on the [awesome work from @thibauts](https://github.com/thibauts/node-upnp-device-client).

## Install

```bash
$ npm install upnp-client
```

## Usage of UpnpDeviceClient

```ts
import upnp from 'upnp-client';

// Instanciate a client with a device description URL (discovered by SSDP)
const client = new upnp.UpnpDeviceClient('http://192.168.1.50:4873/foo.xml');

// Get the device description
const deviceDescription = await client.getDeviceDescription();
console.log(deviceDescription);

// Get the device's AVTransport service description
const serviceDescription = await client.getServiceDescription('AVTransport');
console.log(serviceDescription);

// Call GetMediaInfo on the AVTransport service
const callActionResponse = await client.callAction('AVTransport', 'GetMediaInfo', { InstanceID: 0 });
console.log(callActionResponse);

await client.subscribe('AVTransport');
// Will receive events like { InstanceID: 0, TransportState: 'PLAYING' } when playing media

// await client.unsubscribe('AVTransport', listener);
```

Run with debug traces

```sh
$ DEBUG=* node index.js
```
