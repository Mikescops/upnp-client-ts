import os from 'os';

const pickInterface = (interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>, family: string) => {
    for (const i in interfaces) {
        for (let j = interfaces[i].length - 1; j >= 0; j--) {
            const face = interfaces[i][j];
            const reachable = family === 'IPv4' || face.scopeid === 0;
            if (!face.internal && face.family === family && reachable) {
                return face.address;
            }
        }
    }
    return family === 'IPv4' ? '127.0.0.1' : '::1';
};

const reduceInterfaces = (interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]>, iface: string) => {
    const ifaces = {};
    for (const i in interfaces) {
        if (i === iface) {
            ifaces[i] = interfaces[i];
        }
    }
    return ifaces;
};

export const ipv4 = (iface?: string) => {
    let interfaces = os.networkInterfaces();
    if (iface) {
        interfaces = reduceInterfaces(interfaces, iface);
    }
    return pickInterface(interfaces, 'IPv4');
};

export const ipv6 = (iface?: string) => {
    let interfaces = os.networkInterfaces();
    if (iface) {
        interfaces = reduceInterfaces(interfaces, iface);
    }
    return pickInterface(interfaces, 'IPv6');
};
