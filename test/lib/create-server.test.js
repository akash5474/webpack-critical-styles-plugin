const fs = require('fs');
const path = require('path');
const chai = require('chai');
const chaiHttp = require('chai-http');
const loaderUtils = require('loader-utils');
const { RawSource } = require('webpack-sources');

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

        afterEach(() => server.close());

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

        xit('applies proxy option', async () => {});
    });
});
