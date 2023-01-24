import et from 'elementtree';

export const extractFields = <T>(node: et.Element, fields: string[]): T => {
    const data = {};
    fields.forEach((field) => {
        const value = node.findtext('./' + field);
        if (typeof value !== 'undefined') {
            data[field] = value.toString();
        }
    });
    return data as T;
};

export const extractBaseUrl = (url: string) => {
    return new URL(url).href;
};

export const buildAbsoluteUrl = (baseUrl: string, url: string) => {
    return new URL(url, baseUrl).toString();
};

export const resolveService = (serviceId: string) => {
    return serviceId.indexOf(':') === -1 ? 'urn:upnp-org:serviceId:' + serviceId : serviceId;
};
