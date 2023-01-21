export interface Icon {
    mimetype: string;
    width: string;
    height: string;
    depth: string;
    url: string;
}

export interface Service {
    serviceType: string;
    serviceId: string;
    SCPDURL: string;
    controlURL: string;
    eventSubURL: string;
}

export interface DeviceDescription {
    icons: Icon[];
    services: Record<string, Service>;
    deviceType: string;
    friendlyName: string;
    manufacturer: string;
    manufacturerURL: string;
    modelName: string;
    modelNumber: string;
    modelDescription: string;
    UDN: string;
}

export interface Action {
    inputs: ActionArgument[];
    outputs: ActionArgument[];
}

export interface ActionArgument {
    name: string;
    direction: string;
    relatedStateVariable: string;
}

interface StateVariable {
    dataType: string;
    sendEvents: string;
    allowedValues: string[];
    defaultValue: string;
}

export interface ServiceDescription {
    actions: Record<string, Action>;
    stateVariables: Record<string, StateVariable>;
}

export interface Subscription {
    sid: string;
    url: string;
    timer: NodeJS.Timeout;
    listeners: Listener[];
}

export type UpnpEvent = Record<string, string | number>;

export type Listener = (event: UpnpEvent) => void;
