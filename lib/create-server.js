const path = require('path');
const express = require('express');
const proxyMiddleware = require('http-proxy-middleware');
const getPort = require('get-port');

const { logError, logInfo } = require('./util/logging');

async function createServer(assets, indexHtml, files = [], options = {}) {
    const { externals = null, proxy = null, publicPath = '/' } = options;

    try {
        const app = express();

        if (externals) {
            const staticMiddleware = express.static(externals.root);

            if (externals.urlPath) {
                app.use(externals.urlPath, staticMiddleware);
            } else {
                app.use(staticMiddleware);
            }
        }

        if (proxy) {
            Object.entries(proxy).forEach(([urlPath, opts]) =>
                app.use(urlPath, proxyMiddleware(opts))
            );
        }

        files.forEach(file => {
            app.use(`${publicPath}${file}`, (req, res) => {
                const fileType = path.extname(file).slice(1);
                res.type(fileType).send(assets[file].source());
            });
        });

        app.use('*', (req, res) =>
            res.type('html').send(assets[indexHtml].source())
        );

        const port = await getPort();
        const server = await app.listen(port);

        if (options.stall && Number.isInteger(options.stall)) {
            logInfo(
                `Running at http://localhost:${port}, stalling for ${
                    options.stall
                } minutes.`
            );

            // Duration option to avoid timoeuts while unit testing
            const duration = (options.test && options.test.duration) || 1000;
            const stall = Math.min(options.stall, 5);

            await new Promise(resolve =>
                setTimeout(resolve, duration * 60 * stall)
            );
        }

        return { server, port };
    } catch (err) {
        logError('Error creating server...');
        logError(err);
        throw err;
    }
}

module.exports = createServer;
