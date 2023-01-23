import { UpnpDeviceClient } from './deviceClient';
import { UpnpError } from './errors';
import { MediaEvents, MediaRendererOptions, Protocol, UpnpClientResponse, UpnpEvent } from './types';
import { buildMetadata } from './utils/builders';
import { parseTime, formatTime } from './utils/time';

const MEDIA_EVENTS = ['status', 'loading', 'playing', 'paused', 'stopped', 'speedChanged'];

export class UpnpMediaRendererClient extends UpnpDeviceClient {
    instanceId: number;

    constructor(url: string) {
        super(url);
        this.instanceId = 0;

        // Subscribe / unsubscribe from AVTransport depending
        // on relevant registered / removed event listeners.
        let refs = 0;
        let receivedState;

        this.addListener('newListener', (eventName: MediaEvents) => {
            if (MEDIA_EVENTS.indexOf(eventName) === -1) {
                return;
            }
            if (refs === 0) {
                receivedState = false;
                void this.subscribe('AVTransport', onstatus);
            }
            refs++;
        });

        this.addListener('removeListener', (eventName: MediaEvents) => {
            if (MEDIA_EVENTS.indexOf(eventName) === -1) {
                return;
            }
            refs--;
            if (refs === 0) {
                void this.unsubscribe('AVTransport', onstatus);
            }
        });

        const onstatus = (event: UpnpEvent) => {
            this.emit('status', event);

            console.log('RECEIVED', event);

            if (!receivedState) {
                // Starting from here we only want state updates.
                // As the first received event is the full service state, we ignore it.
                receivedState = true;
                return;
            }

            if (Object.prototype.hasOwnProperty.call(event, 'TransportState')) {
                switch (event.TransportState) {
                    case 'TRANSITIONING':
                        this.emit('loading');
                        break;
                    case 'PLAYING':
                        this.emit('playing');
                        break;
                    case 'PAUSED_PLAYBACK':
                        this.emit('paused');
                        break;
                    case 'STOPPED':
                        this.emit('stopped');
                        break;
                }
            }

            if (Object.prototype.hasOwnProperty.call(event, 'TransportPlaySpeed')) {
                this.emit('speedChanged', Number(event.TransportPlaySpeed));
            }
        };
    }

    getSupportedProtocols = async (): Promise<Protocol[]> => {
        const response = await this.callAction('ConnectionManager', 'GetProtocolInfo', {});

        //
        // Here we leave off the `Source` field as we're hopefuly dealing with a Sink-only device.
        //
        const lines = response.Sink.split(',');

        const protocols = lines.map((line) => {
            const tmp = line.split(':');
            return {
                protocol: tmp[0],
                network: tmp[1],
                contentFormat: tmp[2],
                additionalInfo: tmp[3]
            };
        });

        return protocols;
    };

    getPosition = async (): Promise<number> => {
        const response = await this.callAction('AVTransport', 'GetPositionInfo', {
            InstanceID: this.instanceId
        });

        const strTime = response.AbsTime !== 'NOT_IMPLEMENTED' ? response.AbsTime : response.RelTime;
        return parseTime(strTime);
    };

    getDuration = async (): Promise<number> => {
        const response = await this.callAction('AVTransport', 'GetMediaInfo', {
            InstanceID: this.instanceId
        });

        return parseTime(response.MediaDuration);
    };

    getMediaInfo = (): Promise<UpnpClientResponse> => {
        return this.callAction('AVTransport', 'GetMediaInfo', {
            InstanceID: this.instanceId
        });
    };

    load = async (url: string, options: MediaRendererOptions): Promise<UpnpClientResponse> => {
        const metadata = buildMetadata(url, options.metadata, options);

        const paramsPrepareForConnection = {
            RemoteProtocolInfo: metadata.metadata.protocolInfo,
            PeerConnectionManager: null,
            PeerConnectionID: -1,
            Direction: 'Input'
        };

        await this.callAction('ConnectionManager', 'PrepareForConnection', paramsPrepareForConnection)
            .catch((error) => {
                if (error instanceof UpnpError && error.code !== 'ENOACTION') {
                    throw error;
                }
            })
            .then((connection) => {
                if (connection) {
                    this.instanceId = Number(connection['AVTransportID']);
                }
            });

        const paramsSetAVTransportURI = {
            InstanceID: this.instanceId,
            CurrentURI: url,
            CurrentURIMetaData: metadata.xml
        };

        const response = await this.callAction('AVTransport', 'SetAVTransportURI', paramsSetAVTransportURI);

        if (options.autoplay) {
            return this.play();
        }

        return response;
    };

    loadNext = (url: string, options: MediaRendererOptions): Promise<UpnpClientResponse> => {
        if (!this.listening) {
            throw new Error('No media was loaded first, use load method.');
        }

        const params = {
            InstanceID: this.instanceId,
            NextURI: url,
            NextURIMetaData: buildMetadata(url, options.metadata, options).xml
        };

        return this.callAction('AVTransport', 'SetNextAVTransportURI', params);
    };

    play = (): Promise<UpnpClientResponse> => {
        const params = {
            InstanceID: this.instanceId,
            Speed: 1
        };
        return this.callAction('AVTransport', 'Play', params);
    };

    pause = async () => {
        const params = {
            InstanceID: this.instanceId
        };
        await this.callAction('AVTransport', 'Pause', params);
    };

    stop = async () => {
        const params = {
            InstanceID: this.instanceId
        };
        await this.callAction('AVTransport', 'Stop', params);
    };

    seek = (seconds: number): Promise<UpnpClientResponse> => {
        const params = {
            InstanceID: this.instanceId,
            Unit: 'REL_TIME',
            Target: formatTime(seconds)
        };
        return this.callAction('AVTransport', 'Seek', params);
    };

    getVolume = async (): Promise<number> => {
        const response = await this.callAction('RenderingControl', 'GetVolume', {
            InstanceID: this.instanceId,
            Channel: 'Master'
        });
        return parseInt(response.CurrentVolume);
    };

    setVolume = async (volume: number): Promise<void> => {
        const params = {
            InstanceID: this.instanceId,
            Channel: 'Master',
            DesiredVolume: volume
        };
        await this.callAction('RenderingControl', 'SetVolume', params);
    };

    getTransportInfo = (): Promise<UpnpClientResponse> => {
        return this.callAction('AVTransport', 'GetTransportInfo', {
            InstanceID: this.instanceId
        });
    };
}
