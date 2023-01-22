export class UpnpError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(`${code}: ${message}`);

        this.code = code;
    }
}
