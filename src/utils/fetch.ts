import http from 'http';

export interface RequestResult {
    statusCode: number;
    headers: http.IncomingHttpHeaders;
    body: Buffer;
}

export const fetch = (url: string): Promise<RequestResult> => {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => {
                chunks.push(chunk as Buffer);
            });
            res.on('end', () => {
                resolve({
                    headers: res.headers,
                    body: Buffer.concat(chunks),
                    statusCode: res.statusCode ?? 500
                });
            });
            res.on('error', (error) => {
                reject(error);
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
    });
};

export const doRequest = (params: {
    requestOptions: http.RequestOptions;
    bodyString: string | null;
}): Promise<RequestResult> => {
    const { requestOptions, bodyString } = params;

    return new Promise((resolve, reject) => {
        const req = http.request(requestOptions, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => {
                chunks.push(chunk as Buffer);
            });
            res.on('end', () => {
                resolve({ headers: res.headers, body: Buffer.concat(chunks), statusCode: res.statusCode ?? 500 });
            });
            res.on('error', (error) => {
                reject(error);
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        if (bodyString == null) {
            req.end();
        } else {
            req.end(bodyString);
        }
    });
};
