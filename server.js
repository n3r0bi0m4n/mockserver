#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULT_MOCK_DATA_SUBDIR = 'mock_data';
const DEFAULT_PORT = 8085;

const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    white: '\x1b[37m'
};

const options = parseArgs(process.argv.slice(2));

function parseArgs(args) {
    const parsed = {
        path: DEFAULT_MOCK_DATA_SUBDIR,
        port: DEFAULT_PORT,
        public: false
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--public') {
            parsed.public = true;
            continue;
        }

        if (arg.startsWith('--path=')) {
            parsed.path = arg.slice('--path='.length);
            continue;
        }

        if (arg === '--path' && i + 1 < args.length) {
            parsed.path = args[++i];
            continue;
        }

        if (arg.startsWith('--port=')) {
            const value = Number(arg.slice('--port='.length));
            parsed.port = Number.isFinite(value) ? value : parsed.port;
            continue;
        }

        if (arg === '--port' && i + 1 < args.length) {
            const value = Number(args[++i]);
            parsed.port = Number.isFinite(value) ? value : parsed.port;
        }
    }

    return parsed;
}

function colorize(text, ...codes) {
    if (codes.length === 0) {
        return text;
    }
    return `${codes.join('')}${text}${COLORS.reset}`;
}

let mockDataPath = '';

function init() {
    mockDataPath = path.resolve(__dirname, options.path ? options.path : DEFAULT_MOCK_DATA_SUBDIR);
    if (!fs.existsSync(mockDataPath)) {
        console.error(colorize(`No such directory: ${mockDataPath}`, COLORS.red, COLORS.bright));
        process.exit(1);
    }
}

function timestamp() {
    const pad = (t) => String(t).padStart(2, '0');
    const nowRaw = new Date();
    return `${pad(nowRaw.getUTCHours())}:${pad(nowRaw.getUTCMinutes())}:${pad(nowRaw.getUTCSeconds())}.${String(nowRaw.getUTCMilliseconds()).padStart(3, '0')}`;
}

function logRequest(method, url, data, result, dynamic) {
    if (true === result) {
        const kind = dynamic ? 'dynamic' : ' static';
        console.log(
            colorize(
                `[${timestamp()}]: [${kind} request] ${colorize(method.padStart(4, ' '), COLORS.green, COLORS.bright)} ${url} -> ${path.join(mockDataPath, data)}.${dynamic ? 'js' : 'json'} (ok)`,
                COLORS.yellow
            )
        );
    } else {
        console.log(
            colorize(
                `[${timestamp()}]: ${method.padStart(4, ' ')} ${url} (Not found: ${path.join(mockDataPath, data)}.js(json)`,
                COLORS.red,
                COLORS.bright
            )
        );
    }
}

const server = http.createServer(null, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    if (req.method === 'OPTIONS') {
        res.end();
        return;
    }

    let url;
    if (req.url) {
        url = new URL(req.url, `http://${req.headers.host}/`);
    }

    if (url.pathname.includes('favicon')) {
        res.end();
        return;
    }

    let fileName = url.pathname;
    if (req.method !== 'GET') {
        fileName = fileName + '_' + req.method.toLowerCase();
    }
    const filePath = path.join(mockDataPath, fileName);

    
    fs.stat(filePath + '.js', (err, st) => {
        if (err) {
            // if js (dynamic response) not found, try to find json
            fs.stat(filePath + '.json', (err, st) => {
                // not js nor json found -> 404
                if (err) {
                    logRequest(req.method, url.toString(), fileName, false, false);
                    res.statusCode = 404;
                    res.end(null);
                } else {
                    // json found
                    fs.readFile(filePath + '.json', (_, data) => {
                        logRequest(req.method, url.toString(), fileName, true, false);
                        if (st.size < 2) {
                            res.end('null');
                        } else {
                            res.end(data);
                        }
                    });
                }
            });
        } else {
            logRequest(req.method, url.toString(), fileName, true, true);
            res.end(require(path.join(mockDataPath, fileName + '.js'))(req));
        }
    })
});

init();

server.listen({
   host: options.public ? '0.0.0.0' : '127.0.0.1',
   port: options.port || DEFAULT_PORT
}, () => {
    const mode = options.public ? 'public' : 'local';
    console.log([
        colorize(`Started ${mode} mock server`, COLORS.white, COLORS.bright),
        colorize(`Listening on port ${options.port || DEFAULT_PORT}`, COLORS.magenta),
        colorize(`Serving from ${mockDataPath}`, COLORS.cyan)
    ].join('\n'));
});
