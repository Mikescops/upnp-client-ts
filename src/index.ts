import http from 'http';
import { EventEmitter } from 'events';
import et from 'elementtree';
import os from 'os';
import * as address from './utils/ipaddress';
import debug from 'debug';
import pkg from '../package.json';
import { DeviceDescription, Listener, Service, ServiceDescription, Subscription } from './types';
import { doRequest, fetch } from './utils/fetch';
import { parseDeviceDescription, parseEvents, parseServiceDescription, parseTimeout } from './utils/parsers';
import { resolveService } from './utils/helpers';
import { urlToHttpOptions } from 'url';

const OS_VERSION = [os.platform(), os.release()].join('/');
const PACKAGE_VERSION = [pkg.name, pkg.version].join('/');

const SUBSCRIPTION_TIMEOUT = 300;

const logger = debug('upnp-client');

export class UpnpDeviceClient extends EventEmitter {
    url: string;
    deviceDescription: DeviceDescription;
    serviceDescriptions: Record<string, ServiceDescription>;
    server: http.Server;
    listening: boolean;
    subscriptions: Record<string, Subscription>;

    constructor(url: string) {
        super(); // required

        this.url = url;
        this.deviceDescription = null;
        this.serviceDescriptions = null;
        this.server = null;
        this.listening = false;
        this.subscriptions = {};
    }

    getDeviceDescription = async (): Promise<DeviceDescription> => {
        const deviceDescription = this.deviceDescription;

        // Use cache if available
        if (this.deviceDescription) {
            process.nextTick(() => {
                return deviceDescription;
            });
            return;
        }

        logger('fetch device description');
        const response = await fetch(this.url);
        const desc = parseDeviceDescription(response.body.toString(), this.url);
        this.deviceDescription = desc; // Store in cache for next call
        return desc;
    };

    getServiceDescription = async (serviceId: string): Promise<ServiceDescription> => {
        const serviceDescriptions = this.serviceDescriptions;

        serviceId = resolveService(serviceId);

        const deviceDescription = await this.getDeviceDescription();

        const service = deviceDescription.services[serviceId];
        if (!service) {
            throw new Error('ENOSERVICE: Service ' + serviceId + ' not provided by device');
        }

        // Use cache if available
        if (serviceDescriptions[serviceId]) {
            return serviceDescriptions[serviceId];
        }

        logger('fetch service description (%s)', serviceId);
        const response = await fetch(service.SCPDURL);
        const desc = parseServiceDescription(response.body.toString());
        this.serviceDescriptions[serviceId] = desc; // Store in cache for next call
        return desc;
    };

    callAction = async (
        serviceId: string,
        actionName: string,
        params: Record<string, string>
    ): Promise<Record<string, string>> => {
        serviceId = resolveService(serviceId);

        const serviceDescription = await this.getServiceDescription(serviceId);

        if (!serviceDescription.actions[actionName]) {
            throw new Error('ENOACTION: Action ' + actionName + ' not implemented by service');
        }

        const service = this.deviceDescription.services[serviceId];

        // Build SOAP action body
        const envelope = et.Element('s:Envelope');
        envelope.set('xmlns:s', 'http://schemas.xmlsoap.org/soap/envelope/');
        envelope.set('s:encodingStyle', 'http://schemas.xmlsoap.org/soap/encoding/');

        const body = et.SubElement(envelope, 's:Body');
        const action = et.SubElement(body, 'u:' + actionName);
        action.set('xmlns:u', service.serviceType);

        Object.keys(params).forEach(function (paramName) {
            const tmp = et.SubElement(action, paramName);
            const value = params[paramName];
            tmp.text = value === null ? '' : params[paramName].toString();
        });

        const doc = new et.ElementTree(envelope);
        const xml = doc.write({
            xml_declaration: true
        });

        // Send action request
        const options = urlToHttpOptions(new URL(service.controlURL));
        options.method = 'POST';
        options.headers = {
            'Content-Type': 'text/xml; charset="utf-8"',
            'Content-Length': xml.length,
            Connection: 'close',
            SOAPACTION: '"' + service.serviceType + '#' + actionName + '"'
        };

        logger('call action %s on service %s with params %j', actionName, serviceId, params);

        const serviceDescriptions = this.serviceDescriptions;

        const response = await doRequest({ requestOptions: options, bodyString: xml });

        const responseDoc = et.parse(response.body.toString());

        if (response.statusCode !== 200) {
            const errorCode = responseDoc.findtext('.//errorCode').toString();
            const errorDescription = responseDoc.findtext('.//errorDescription').toString().trim();

            throw new Error('EUPNP: ' + errorDescription + ' (' + errorCode + ')');
        }

        // Extract response outputs
        const serviceDesc = serviceDescriptions[serviceId];
        const actionDesc = serviceDesc.actions[actionName];
        const outputs = actionDesc.outputs.map((desc) => {
            return desc.name;
        });

        const result = {};
        outputs.forEach((name) => {
            result[name] = responseDoc.findtext('.//' + name).toString();
        });

        return result;
    };

    subscribe = async (serviceId: string, listener: Listener) => {
        serviceId = resolveService(serviceId);

        if (this.subscriptions[serviceId]) {
            // If we already have a subscription to this service,
            // add the provided callback to the listeners and return
            this.subscriptions[serviceId].listeners.push(listener);
            return;
        }

        // If there's no subscription to this service, create one
        // by first fetching the event subscription URL ...
        const deviceDescription = await this.getDeviceDescription();

        const service = deviceDescription.services[serviceId];

        if (!service) {
            throw new Error('ENOSERVICE: Service ' + serviceId + ' not provided by device');
        }

        // ... and ensuring the event server is created and listening
        this.ensureEventingServer();

        const options = urlToHttpOptions(new URL(service.eventSubURL));
        const serverAddress = this.server.address() as { address: string; port: number };

        options.method = 'SUBSCRIBE';
        options.headers = {
            HOST: options.host,
            'USER-AGENT': `${OS_VERSION} UPnP/1.1 ${PACKAGE_VERSION}`,
            CALLBACK: `<http://${serverAddress['address']}:${serverAddress['port']} />`,
            NT: 'upnp:event',
            TIMEOUT: `Second-${SUBSCRIPTION_TIMEOUT}`
        };

        try {
            const response = await doRequest({ requestOptions: options, bodyString: null });

            if (response.statusCode !== 200) {
                const error = new Error(`${response.statusCode} - SUBSCRIBE error`);
                this.releaseEventingServer();
                this.emit('error', error);
                throw error;
            }

            const sid = response.headers['sid'] as string;
            const timeout = parseTimeout(response.headers['timeout'] as string);

            const renewTimeout = Math.max(timeout - 30, 30); // renew 30 seconds before expiration
            logger('renewing subscription to %s in %d seconds', serviceId, renewTimeout);
            const timer = setTimeout(() => void this.renew(serviceId, sid, service), renewTimeout * 1000);

            this.subscriptions[serviceId] = {
                sid,
                url: service.eventSubURL,
                timer,
                listeners: [listener]
            };
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    };

    renew = async (serviceId: string, sid: string, service: Service): Promise<void> => {
        logger('renew subscription to %s', serviceId);

        const options = urlToHttpOptions(new URL(service.eventSubURL));
        options.method = 'SUBSCRIBE';
        options.headers = {
            HOST: options.host,
            SID: sid,
            TIMEOUT: `Second-${SUBSCRIPTION_TIMEOUT}`
        };

        const response = await doRequest({ requestOptions: options, bodyString: null });

        if (response.statusCode !== 200) {
            const err = new Error(`${response.statusCode} - SUBSCRIBE renewal error`);
            // XXX: should we clear the subscription and release the server here ?
            this.emit('error', err);
            return;
        }

        const timeout = parseTimeout(response.headers['timeout'] as string);

        const renewTimeout = Math.max(timeout - 30, 30); // renew 30 seconds before expiration
        logger('renewing subscription to %s in %d seconds', serviceId, renewTimeout);
        const timer = setTimeout(() => void this.renew(serviceId, sid, service), renewTimeout * 1000);
        this.subscriptions[serviceId].timer = timer;
    };

    unsubscribe = async (serviceId: string, listener: Listener) => {
        serviceId = resolveService(serviceId);

        // First make sure there are subscriptions for this service ...
        const subscription = this.subscriptions[serviceId];
        if (!subscription) return;

        // ... and we know about this listener
        const idx = subscription.listeners.indexOf(listener);
        if (idx === -1) return;

        // Remove the listener from the list
        subscription.listeners.splice(idx, 1);

        if (subscription.listeners.length === 0) {
            // If there's no listener left for this service, unsubscribe from it
            logger('unsubscribe from service %s', serviceId);

            const options = urlToHttpOptions(new URL(subscription.url));

            options.method = 'UNSUBSCRIBE';
            options.headers = {
                HOST: options.host,
                SID: subscription.sid
            };

            try {
                const response = await doRequest({ requestOptions: options, bodyString: null });

                if (response.statusCode !== 200) {
                    const err = new Error(`${response.statusCode} - UNSUBSCRIBE error`);
                    return this.emit('error', err);
                }

                clearTimeout(this.subscriptions[serviceId].timer);
                delete this.subscriptions[serviceId];
                // Make sure the eventing server is shutdown if there is no
                // subscription left for any service
                this.releaseEventingServer();
            } catch (error) {
                this.emit('error', error);
                throw error;
            }
        }
    };

    ensureEventingServer = () => {
        if (!this.server) {
            logger('create eventing server');
            this.server = http.createServer((req, res) => {
                const chunks: Buffer[] = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk as Buffer);
                });
                res.on('end', () => {
                    const sid = req.headers['sid'] as string;
                    const seq = req.headers['seq'] as string;
                    const events = parseEvents(Buffer.concat(chunks));

                    logger('received events %s %d %j', sid, seq, events);

                    const keys = Object.keys(this.subscriptions);
                    const sids = keys.map((key) => {
                        return this.subscriptions[key].sid;
                    });

                    const idx = sids.indexOf(sid);
                    if (idx === -1) {
                        logger('WARNING unknown SID %s', sid);
                        // silently ignore unknown SIDs
                        return;
                    }

                    const serviceId = keys[idx];
                    const listeners = this.subscriptions[serviceId].listeners;

                    // Dispatch each event to each listener registered for
                    // this service's events
                    listeners.forEach(function (listener) {
                        events.forEach(function (e) {
                            listener(e);
                        });
                    });
                });
            });

            this.server.listen(0, address.ipv4());
        }

        if (!this.listening) {
            this.server.on('listening', () => {
                this.listening = true;
                debug('Server started to listen');
                return;
            });
        }
    };

    releaseEventingServer = () => {
        if (Object.keys(this.subscriptions).length === 0) {
            logger('shutdown eventing server');
            this.server.close();
            this.server = null;
            this.listening = false;
        }
    };
}
