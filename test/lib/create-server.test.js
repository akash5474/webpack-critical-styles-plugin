const fs = require('fs');
const path = require('path');
const chai = require('chai');
const chaiHttp = require('chai-http');
const loaderUtils = require('loader-utils');
const { RawSource } = require('webpack-sources');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const createServer = require('../../lib/create-server');

const testCSS = 'test-all.css';
const indexHtml = 'testIndex.html';
const externalJSON = 'external.json';

const fixturesDir = path.join(__dirname, '../fixtures');
const externalsRoot = path.join(fixturesDir, '/static');
const cssDir = path.join(fixturesDir, '/css');

const indexHtmlFile = fs.readFileSync(`${fixturesDir}/${indexHtml}`).toString();
const testCSSFile = fs.readFileSync(`${cssDir}/${testCSS}`).toString();

const externalJSONFile = fs
    .readFileSync(`${externalsRoot}/${externalJSON}`)
    .toString();

chai.use(chaiHttp);

const { expect } = chai;

describe('lib/create-server.js', () => {
    describe('createServer', () => {
        const publicPath = '/static/test/';
        const getBaseUrl = port => `http://localhost:${port}`;

        let assets;
        let server;

        beforeEach(() => {
            server = null;
            assets = {};

            assets[indexHtml] = new RawSource(indexHtmlFile);
            assets[testCSS] = new RawSource(testCSSFile);
        });

        afterEach(() => { if (server) server.close(); });

        it('serves index.html file', async () => {
            const result = await createServer(assets, indexHtml, []);
            server = result.server;

            const res = await chai.request(getBaseUrl(result.port)).get('/');

            expect(res).to.have.status(200);
            expect(res).to.be.html;
            expect(res.text).to.be.equal(indexHtmlFile);
        });

        it('serves files with default publicPath', async () => {
            const result = await createServer(assets, indexHtml, [testCSS]);
            server = result.server;

            const cssRes = await chai
                .request(getBaseUrl(result.port))
                .get(`/${testCSS}`);

            const cssContentType = cssRes.headers['content-type'].startsWith(
                'text/css'
            );

            expect(cssRes).to.have.status(200);
            expect(cssContentType).to.equal(true);
            expect(cssRes.text).to.be.equal(testCSSFile);

            const htmlRes = await chai
                .request(getBaseUrl(result.port))
                .get('/other-route');

            expect(htmlRes).to.have.status(200);
            expect(htmlRes).to.be.html;
            expect(htmlRes.text).to.be.equal(indexHtmlFile);
        });

        it('applies publicPath option', async () => {
            const result = await createServer(assets, indexHtml, [testCSS], {
                publicPath,
            });
            server = result.server;

            const cssRes = await chai
                .request(getBaseUrl(result.port))
                .get(`${publicPath}${testCSS}`);

            const cssContentType = cssRes.headers['content-type'].startsWith(
                'text/css'
            );

            expect(cssRes).to.have.status(200);
            expect(cssContentType).to.equal(true);
            expect(cssRes.text).to.be.equal(testCSSFile);

            const htmlRes = await chai
                .request(getBaseUrl(result.port))
                .get('/other-route');

            expect(htmlRes).to.have.status(200);
            expect(htmlRes).to.be.html;
            expect(htmlRes.text).to.be.equal(indexHtmlFile);
        });

        it('applies externals option without urlPath', async () => {
            const result = await createServer(assets, indexHtml, [], {
                externals: { root: externalsRoot },
            });
            server = result.server;

            const jsonRes = await chai
                .request(getBaseUrl(result.port))
                .get('/external.json');

            expect(jsonRes).to.have.status(200);
            expect(jsonRes).to.be.json;
            expect(jsonRes.text).to.be.equal(externalJSONFile);

            const htmlRes = await chai
                .request(getBaseUrl(result.port))
                .get('/other-route');

            expect(htmlRes).to.have.status(200);
            expect(htmlRes).to.be.html;
            expect(htmlRes.text).to.be.equal(indexHtmlFile);
        });

        it('applies externals option with urlPath', async () => {
            const urlPath = '/some/test/path/';

            const result = await createServer(assets, indexHtml, [], {
                externals: { root: externalsRoot, urlPath },
            });
            server = result.server;

            const jsonRes = await chai
                .request(getBaseUrl(result.port))
                .get(`${urlPath}/external.json`);

            expect(jsonRes).to.have.status(200);
            expect(jsonRes).to.be.json;
            expect(jsonRes.text).to.be.equal(externalJSONFile);

            const htmlRes = await chai
                .request(getBaseUrl(result.port))
                .get('/other-route');

            expect(htmlRes).to.have.status(200);
            expect(htmlRes).to.be.html;
            expect(htmlRes.text).to.be.equal(indexHtmlFile);
        });

        it('applies proxy option', async () => {
            const proxyMiddlewareStub = sinon.stub().returns((req, res, next) => { next() });
            const createServer = proxyquire('../../lib/create-server', {
                'http-proxy-middleware': proxyMiddlewareStub
            });

            const proxy = {
                '/v1/api': {
                    target: 'https://test-site.com'
                },

                '/v2/api': {
                    target: 'https://test-site-2.com'
                }
            };

            const result = await createServer(assets, indexHtml, [], { proxy });
            server = result.server;

            expect(proxyMiddlewareStub.callCount).to.equal(2);

            Object.entries(proxy).forEach(([urlPath, opts], idx) => {
                const call = proxyMiddlewareStub.getCall(idx);

                expect(call.calledWithExactly(opts)).to.equal(true);
            });

        });

        it('catches and logs errors', async () => {
            const expressStub = sinon.stub().throws();
            const logErrorStub = sinon.stub();

            const createServer = proxyquire('../../lib/create-server', {
                express: expressStub,
                './util/logging': { logError: logErrorStub }
            });

            try {
                const result = await createServer();
            } catch (err) {
                expect(err).to.be.an('error');
            }

            expect(expressStub.threw()).to.equal(true);
            expect(expressStub.exceptions.length).to.equal(1);
            expect(logErrorStub.callCount).to.equal(2);
        });

        it('honors stall option and prints log message', async () => {
            const logInfoStub = sinon.stub();

            const createServer = proxyquire('../../lib/create-server', {
                './util/logging': { logInfo: logInfoStub }
            });

            const result = await createServer(assets, indexHtml, [], { stall: 5, test: { duration: 1 } });
            server = result.server;

            expect(logInfoStub.callCount).to.equal(1);
        });
    });
});
