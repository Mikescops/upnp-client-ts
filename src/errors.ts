interface ExtraInfoUpnpError {
    errorCode?: number;
    httpCode?: number;
}

export class UpnpError extends Error {
    code: string;
    extra: ExtraInfoUpnpError;

    constructor(code: string, message: string, extra?: ExtraInfoUpnpError) {
        super(`${code}: ${message}`);

        this.code = code;
        this.extra = extra;
    }
}

export class AVTransportError extends Error {
    constructor(errorCode: number) {
        super(
            `AVTransportError: ${errorCode} - ${AVTransportErrors[errorCode].message} - ${AVTransportErrors[errorCode].description}`
        );
    }
}

type AVTransportErrorsList = Record<number, { message: string; description: string }>;

export const AVTransportErrors: AVTransportErrorsList = {
    401: {
        message: 'Invalid Action',
        description: 'No action by that name at this service.'
    },
    402: {
        message: 'Invalid Args',
        description:
            'Could be any of the following: not enough in args, too many in args, no in arg by ' +
            'that name, one or more in args are of the wrong data type.'
    },
    404: {
        message: 'Invalid Var',
        description: 'No state variable by that name at this service.'
    },
    501: {
        message: 'Action Failed',
        description: 'May be returned in current state of service prevents invoking that action.'
    },
    701: {
        message: 'Transition not available',
        description:
            'The immediate transition from current transport state to desired transport state is ' +
            'not supported by this device.'
    },
    702: {
        message: 'No contents',
        description: 'The media does not contain any contents that can be played.'
    },
    703: {
        message: 'Read error ',
        description: 'The media cannot be read (e.g., because of dust or a scratch).'
    },
    704: {
        message: 'Format not supported for playback',
        description: 'The storage format of the currently loaded media is not supported for playback by this device.'
    },
    705: {
        message: 'Transport is locked',
        description:
            'The transport is “hold locked”. (Some portable mobile devices ' +
            'have a small mechanical toggle switch called a “hold lock ' +
            'switch”. While this switch is ON, i.e., the transport is hold ' +
            'locked, the device is guarded against operations such as ' +
            'accidental power on when not in use, or interruption of play or ' +
            'record from accidental pressing of a front panel button or a GUI ' +
            'button.)'
    },
    706: {
        message: 'Write error',
        description: 'The media cannot be written (e.g., because of dust or a scratch).'
    },
    707: {
        message: 'Media is protected or not writable',
        description: 'The media is write-protected or is of a not writable type.'
    },
    708: {
        message: 'Format not supported for recording',
        description: 'The storage format of the currently loaded media is not supported for recording by this device.'
    },
    709: {
        message: 'Media is full',
        description: 'There is no free space left on the loaded media.'
    },
    710: {
        message: 'Seek mode not supported',
        description: 'The specified seek mode is not supported by the device.'
    },
    711: {
        message: 'Illegal seek target',
        description:
            'The specified seek target is not specified in terms of the seek mode, or is not present on the media.'
    },
    712: {
        message: 'Play mode not supported',
        description: 'The specified play mode is not supported by the device.'
    },
    713: {
        message: 'Record quality not supported',
        description: 'The specified record quality is not supported by the device.'
    },
    714: {
        message: 'Illegal MIME-type',
        description: 'The resource to be played has a MIME-type which is not supported by the AVTransport service.'
    },
    715: {
        message: 'Content "BUSY"',
        description:
            'This indicates the resource is already being played by other ' +
            'means. The actual implementation might detect through HTTP ' +
            'Busy, and returns this error code.'
    },
    716: {
        message: 'Resource not found',
        description: 'The resource to be played cannot be found in the network.'
    },
    717: {
        message: 'Play speed not supported',
        description: 'The specified playback speed is not supported by the AVTransport service.'
    },
    718: {
        message: 'Invalid InstanceID',
        description: 'The specified instanceID is invalid for this AVTransport.'
    },
    737: {
        message: 'No DNS Server',
        description: 'The DNS Server is not available (HTTP error 503).'
    },
    738: {
        message: 'Bad Domain Name',
        description: 'Unable to resolve the Fully Qualified Domain Name (HTTP error 502).'
    },
    739: {
        message: 'Server Error',
        description: 'The server that hosts the resource is unreachable or unresponsive (HTTP error 404/410).'
    }
};
