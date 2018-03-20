const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { OriginalSource } = require('webpack-sources');

const fixturesDir = path.join(__dirname, './fixtures');

const testHtmlFile = fs
    .readFileSync(`${fixturesDir}/testIndex.html`)
    .toString();

const inlinedHtmlFile = fs
    .readFileSync(`${fixturesDir}/testInlined.html`)
    .toString();

const testCSSFile = fs
    .readFileSync(`${fixturesDir}/css/test-all.css`)
    .toString();

const criticalCSSFile = fs
    .readFileSync(`${fixturesDir}/css/test-critical.css`)
    .toString();

describe('index.js', () => {
    let stubs;
    let assets;
    let chunks;
    let cssSrc;
    let htmlSrc;
    let logErrorStub;
    let validateOptionsStub;
    let checkOptionOverridesStub;
    let inlineCriticalStub;
    let replaceAssetsStub;
    let extractCriticalStub;
    let createServerStub;
    let CriticalStylesPlugin;

    const port = 1234;
    const hash = 'abcd1234';
    const htmlFileName = 'test-index.html';
    const cssFileName = 'css/test-file.css';
    const newCSSFileName = 'css/test-new-file.css';

    beforeEach(() => {
        chunks = [
            {
                id: 0,
                name: 'chunkA',
                files: [cssFileName, 'some-file.js', 'some-file.css'],
            },
            {
                id: 1,
                name: 'chunkB',
                files: ['other-file.js', 'other-file.css'],
            },
        ];

        cssSrc = new OriginalSource(testCSSFile, cssFileName);
        htmlSrc = new OriginalSource(testHtmlFile, htmlFileName);

        cssFiles = [cssFileName];
        assets = {
            [cssFileName]: cssSrc,
            [htmlFileName]: htmlSrc,
        };

        logErrorStub = sinon.stub();
        validateOptionsStub = sinon.stub();
        checkOptionOverridesStub = sinon.stub();

        inlineCriticalStub = sinon.stub().returns(inlinedHtmlFile);
        replaceAssetsStub = sinon.stub();
        extractCriticalStub = sinon.stub().returns(criticalCSSFile);

        createServerStub = sinon.stub().returns({
            port,
            server: {
                close: () => Promise.resolve(),
            },
        });

        stubs = {
            'schema-utils': validateOptionsStub,
            './lib/util/logging': { logError: logErrorStub },
            './lib/util/helpers': {
                checkOptionOverrides: checkOptionOverridesStub,
            },
            'inline-critical': inlineCriticalStub,
            './lib/create-server': createServerStub,
            './lib/replace-assets': { replaceAssets: replaceAssetsStub },
            './lib/extract-critical': {
                extractCritical: extractCriticalStub,
            },
        };

        CriticalStylesPlugin = proxyquire('../index', stubs);
    });

    describe('CriticalStylesPlugin', () => {
        it('Calls validateOptions', () => {
            const plugin = new CriticalStylesPlugin();
            expect(validateOptionsStub.calledOnce).to.equal(true);
        });

        it('logs errors while validating options', () => {
            validateOptionsStub = sinon.stub().throws();

            CriticalStylesPlugin = proxyquire('../index', {
                ...stubs,
                'schema-utils': validateOptionsStub,
            });
            try {
                const plugin = new CriticalStylesPlugin();
            } catch (err) {
                expect(err).to.be.an('error');
            }

            expect(validateOptionsStub.calledOnce).to.equal(true);
            expect(logErrorStub.calledOnce).to.equal(true);
        });

        it('warnOptionOverrides calls checkOptionOverrides with correct arguments', () => {
            const penthouseOverrides = ['url', 'width', 'height', 'cssString'];

            const options = { penthouse: { blockJSRequests: false } };
            const plugin = new CriticalStylesPlugin(options);
            plugin.warnOptionOverrides();

            expect(checkOptionOverridesStub.calledOnce).to.equal(true);
            expect(
                checkOptionOverridesStub.calledWithExactly(
                    options.penthouse,
                    penthouseOverrides,
                    'Overriding penthouse options'
                )
            ).to.equal(true);
        });

        it('emit calls functions with correct arguments', async () => {
            const options = { filename: '[name].css' };

            const plugin = new CriticalStylesPlugin(options);
            await plugin.emit({ assets, chunks, hash });

            expect(
                createServerStub.calledOnceWithExactly(
                    assets,
                    htmlFileName,
                    [cssFileName],
                    options
                )
            ).to.equal(true);

            expect(
                extractCriticalStub.calledOnceWithExactly(
                    assets,
                    [cssFileName],
                    port,
                    options
                )
            ).to.equal(true);

            expect(
                inlineCriticalStub.calledOnceWithExactly(
                    assets[htmlFileName].source(),
                    criticalCSSFile,
                    { ignore: [] }
                )
            ).to.equal(true);

            expect(
                replaceAssetsStub.calledOnceWithExactly(
                    { assets, chunks, hash },
                    htmlFileName,
                    inlinedHtmlFile,
                    [cssFileName],
                    criticalCSSFile,
                    options
                )
            ).to.equal(true);
        });

        it('emit correctly excludes chunks', async () => {
            const options = {
                filename: '[name].css',
                excludeChunks: ['chunkB'],
            };

            const plugin = new CriticalStylesPlugin(options);
            await plugin.emit({ assets, chunks, hash });

            expect(
                createServerStub.calledOnceWithExactly(
                    assets,
                    htmlFileName,
                    [cssFileName],
                    options
                )
            ).to.equal(true);

            expect(
                extractCriticalStub.calledOnceWithExactly(
                    assets,
                    [cssFileName],
                    port,
                    options
                )
            ).to.equal(true);

            expect(
                inlineCriticalStub.calledOnceWithExactly(
                    assets[htmlFileName].source(),
                    criticalCSSFile,
                    { ignore: ['/other-file.css'] }
                )
            ).to.equal(true);

            expect(
                replaceAssetsStub.calledOnceWithExactly(
                    { assets, chunks, hash },
                    htmlFileName,
                    inlinedHtmlFile,
                    [cssFileName],
                    criticalCSSFile,
                    options
                )
            ).to.equal(true);
        });

        it('emit catches and logs errors', async () => {
            inlineCriticalStub = sinon.stub().throws();

            CriticalStylesPlugin = proxyquire('../index', {
                ...stubs,
                'inline-critical': inlineCriticalStub,
            });

            const plugin = new CriticalStylesPlugin({
                filename: '[name].css',
            });

            try {
                await plugin.emit({ assets, chunks, hash });
            } catch (err) {
                expect(err).to.be.an('error');

                expect(logErrorStub.calledTwice).to.equal(true);

                expect(
                    logErrorStub
                        .getCall(0)
                        .calledWithExactly('Error extracting critical CSS')
                ).to.equal(true);

                expect(logErrorStub.getCall(1).calledWithExactly(err)).to.equal(
                    true
                );
            }
        });
    });
});
