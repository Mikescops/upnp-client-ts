# UPNP Client and MediaRenderer for NodeJS

![GitHub package.json version](https://img.shields.io/github/package-json/v/mikescops/upnp-client-ts)
![npm](https://img.shields.io/npm/v/upnp-client-ts)
![npm](https://img.shields.io/npm/dw/upnp-client-ts)
![GitHub](https://img.shields.io/github/license/mikescops/upnp-client-ts)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/mikescops/upnp-client-ts/pr-validation.yml)

A modern UPNP client made in Typescript. Compatible with both ESM and CommonJS.

-   UpnpDeviceClient: to connect to any UPNP devices
-   UpnpMediaRendererClient: to play medias on UPNP devices
-   also includes DLNA helpers

## Install

```bash
$ npm install <TODO: insert name here when published>
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

## Usage of UpnpMediaRendererClient

```ts
import upnp from 'upnp-client';

const client = new upnp.UpnpMediaRendererClient('http://192.168.1.50:54380/MediaRenderer_HT-A9.xml');

// TODO: To be written

await client.play();

await client.pause();

await client.stop();

await client.seek(60);
```

## Usage of dlnaHelpers

```ts
// TODO: To be written
```

## Debugging

Run with debug traces

```sh
$ DEBUG=* node index.js
```

## Inspiration

This project is based on the [awesome work from @thibauts](https://github.com/thibauts/node-upnp-device-client).

## Maintainer

| [![twitter/mikescops](https://avatars0.githubusercontent.com/u/4266283?s=100&v=4)](https://pixelswap.fr 'Personal Website') |
| --------------------------------------------------------------------------------------------------------------------------- |
| [Corentin Mors](https://pixelswap.fr/)                                                                                      |
