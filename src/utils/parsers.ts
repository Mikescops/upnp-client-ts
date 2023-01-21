import et from 'elementtree';
import { ActionArgument, DeviceDescription, Icon, Service, ServiceDescription, UpnpEvent } from '../types';
import { extractFields, extractBaseUrl, buildAbsoluteUrl } from './helpers';

export const parseEvents = (buf: Buffer): UpnpEvent[] => {
    const events: UpnpEvent[] = [];
    let doc = et.parse(buf.toString());

    const lastChange = doc.findtext('.//LastChange');
    if (lastChange) {
        // AVTransport and RenderingControl services embed event data
        // in an `<Event></Event>` element stored as an URIencoded string.
        doc = et.parse(lastChange.toString());

        // The `<Event></Event>` element contains one `<InstanceID></InstanceID>`
        // subtree per stream instance reporting its status.
        const instances = doc.findall('./InstanceID');
        instances.forEach(function (instance) {
            const data = {
                InstanceID: Number(instance.get('val'))
            };
            instance.findall('./*').forEach((node) => {
                data[node.tag.toString()] = node.get('val');
            });
            events.push(data);
        });
    } else {
        // In any other case, each variable is stored separately in a
        // `<property></property>` tag
        const data = {};
        doc.findall('./property/*').forEach((node) => {
            data[node.tag.toString()] = node.text.toString();
        });
        events.push(data);
    }

    return events;
};

export const parseTimeout = (header: string) => {
    return Number(header.split('-')[1]);
};

export const parseDeviceDescription = (xml: string, url: string): DeviceDescription => {
    const doc = et.parse(xml);

    const desc: DeviceDescription = {
        icons: undefined,
        services: undefined,
        ...extractFields(doc.find('./device'), [
            'deviceType',
            'friendlyName',
            'manufacturer',
            'manufacturerURL',
            'modelName',
            'modelNumber',
            'modelDescription',
            'UDN'
        ])
    };

    const iconNodes = doc.findall('./device/iconList/icon');
    desc.icons = iconNodes.map((icon) => {
        return extractFields<Icon>(icon, ['mimetype', 'width', 'height', 'depth', 'url']);
    });

    const serviceNodes = doc.findall('./device/serviceList/service');
    serviceNodes.forEach((service) => {
        const tmp = extractFields<Service>(service, [
            'serviceType',
            'serviceId',
            'SCPDURL',
            'controlURL',
            'eventSubURL'
        ]);

        const id = tmp.serviceId;
        delete tmp.serviceId;
        desc.services[id] = tmp;
    });

    // Make URLs absolute
    const baseUrl = extractBaseUrl(url);

    desc.icons.map((icon) => {
        icon.url = buildAbsoluteUrl(baseUrl, icon.url);
        return icon;
    });

    Object.keys(desc.services).forEach((id) => {
        const service = desc.services[id];
        service.SCPDURL = buildAbsoluteUrl(baseUrl, service.SCPDURL);
        service.controlURL = buildAbsoluteUrl(baseUrl, service.controlURL);
        service.eventSubURL = buildAbsoluteUrl(baseUrl, service.eventSubURL);
    });

    return desc;
};

export const parseServiceDescription = (xml: string) => {
    const doc = et.parse(xml);
    const desc: ServiceDescription = {
        actions: null,
        stateVariables: null
    };

    desc.actions = {};
    const actionNodes = doc.findall('./actionList/action');
    actionNodes.forEach(function (action) {
        const name = action.findtext('./name').toString();
        const inputs: ActionArgument[] = [];
        const outputs: ActionArgument[] = [];

        const nodes = action.findall('./argumentList/argument');
        nodes.forEach((argument) => {
            const arg = extractFields<ActionArgument>(argument, ['name', 'direction', 'relatedStateVariable']);

            const direction = arg.direction;
            delete arg.direction;

            if (direction === 'in') inputs.push(arg);
            else outputs.push(arg);
        });

        desc.actions[name] = { inputs, outputs };
    });

    desc.stateVariables = {};
    const nodes = doc.findall('./serviceStateTable/stateVariable');
    nodes.forEach((stateVariable) => {
        const name = stateVariable.findtext('./name').toString();

        const nodes = stateVariable.findall('./allowedValueList/allowedValue');
        const allowedValues = nodes.map((allowedValue) => {
            return allowedValue.text.toString();
        });

        desc.stateVariables[name] = {
            dataType: stateVariable.findtext('./dataType').toString(),
            sendEvents: stateVariable.get('sendEvents'),
            allowedValues,
            defaultValue: stateVariable.findtext('./defaultValue').toString()
        };
    });

    return desc;
};
