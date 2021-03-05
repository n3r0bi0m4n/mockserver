#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const color = require('ansi-colors');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;

const DEFAULT_MOCK_DATA_SUBDIR = '/mock_data';
const DEFAULT_PORT = 8085;

let mockDataPath = '';

function init() {
    mockDataPath = path.join(__dirname, argv.path ? argv.path : DEFAULT_MOCK_DATA_SUBDIR);
    if (!fs.existsSync(mockDataPath)) {
        console.error(color.redBright(`No such directory: ${mockDataPath}`));
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
        console.log(color.whiteBright(`[${timestamp()}]: ${color.yellow(`[${dynamic ? 'dynamic' : ' static'} request] `)}${color.greenBright.bold(`${method.padStart(4, ' ')}`)} ${color.green(`${url} ${color.whiteBright('->')} ${path.join(mockDataPath, data)}.${dynamic ? 'js' : 'json'}`)} (ok)`));
    } else {
        console.log(color.whiteBright(`[${timestamp()}]: ${color.redBright.bold(`${method.padStart(4, ' ')}`)} ${color.red(url)} (Not found: ${mockDataPath}${data}.js(json)`));
    }
}

const server = http.createServer(null, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
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
   host: '127.0.0.1',
   port: argv.port || DEFAULT_PORT
}, () => {
    console.log(color.whiteBright(
        'Started ' + 
        (argv.public ? color.redBright('public') : color.cyanBright('local')) + 
        ' mock server\nListening on port ' + 
        color.magentaBright(argv.port || DEFAULT_PORT)) +
        '\n' +
        'Serving from ' +
        mockDataPath
        );
});