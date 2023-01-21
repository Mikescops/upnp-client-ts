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
    return url.split('/').slice(0, -1).join('/');
};

export const buildAbsoluteUrl = (base: string, url: string) => {
    if (url === '') return '';
    if (url.substring(0, 4) === 'http') return url;
    if (url[0] === '/') {
        const root = base.split('/').slice(0, 3).join('/'); // http://host:port
        return root + url;
    } else {
        return base + '/' + url;
    }
};

export const resolveService = (serviceId: string) => {
    return serviceId.indexOf(':') === -1 ? 'urn:upnp-org:serviceId:' + serviceId : serviceId;
};
