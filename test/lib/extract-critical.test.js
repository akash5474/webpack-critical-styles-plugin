const fs = require('fs');
const path = require('path');
const slug = require('limax');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const { OriginalSource } = require('webpack-sources');

const fixturesDir = path.join(__dirname, '../fixtures');
const testCSSFile = fs
    .readFileSync(`${fixturesDir}/css/test-all.css`)
    .toString();

const testHtmlFile = fs
    .readFileSync(`${fixturesDir}/testIndex.html`)
    .toString();

describe('lib/extract-critical.js', () => {
    const port = 1234;
    const baseUrl = `http://localhost:${port}`;

    const targetsData = [
        { url: `${baseUrl}/`, width: 500, height: 800 },
        { url: `${baseUrl}/other-route`, width: 500, height: 800 },
        { url: `${baseUrl}/another-route`, width: 500, height: 800 },
        { url: `${baseUrl}/`, width: 800, height: 1000 },
        { url: `${baseUrl}/other-route`, width: 800, height: 1000 },
        { url: `${baseUrl}/another-route`, width: 800, height: 1000 },
        { url: `${baseUrl}/`, width: 1000, height: 1200 },
        { url: `${baseUrl}/other-route`, width: 1000, height: 1200 },
        { url: `${baseUrl}/another-route`, width: 1000, height: 1200 },
    ];

    let penthouseStub;
    let extractCritical;
    let expectedTargets;

    beforeEach(() => {
        expectedTargets = targetsData.map(target => ({ ...target }));

        penthouseStub = sinon.stub().resolves(testCSSFile);

        extractCritical = proxyquire('../../lib/extract-critical', {
            penthouse: penthouseStub,
        });
    });

    describe('startPenthouseJob', () => {
        it('calls penthouse with correct arguments', async () => {
            const targets = expectedTargets.slice(0, 1);
            const expctedCallCount = targets.length;
            const [target] = targets;

            const result = await extractCritical.startPenthouseJob(
                targets,
                testCSSFile
            );

            expect(penthouseStub.callCount).to.equal(expctedCallCount);

            expect(
                penthouseStub.calledWithExactly({
                    ...target,
                    cssString: testCSSFile,
                })
            ).to.equal(true);

            expect(result).to.equal(testCSSFile);
        });

        it('calls penthouse once for each target', async () => {
            const expctedCallCount = expectedTargets.length;
            const expectedResult = testCSSFile.repeat(expectedTargets.length);
            const options = { penthouse: { blockJSRequests: true } };

            const result = await extractCritical.startPenthouseJob(
                expectedTargets,
                testCSSFile,
                options
            );

            expect(penthouseStub.callCount).to.equal(expctedCallCount);

            targetsData.forEach((target, idx) => {
                const call = penthouseStub.getCall(idx);
                expect(
                    call.calledWithExactly({
                        ...target,
                        ...options,
                        cssString: testCSSFile,
                    })
                ).to.equal(true);
            });

            expect(result).to.equal(expectedResult);
        });

        it('calls penthouse with correct options', async () => {
            const targets = expectedTargets.slice(0, 1);
            const options = { penthouse: { blockJSRequests: true } };
            const [target] = targets;

            const result = await extractCritical.startPenthouseJob(
                targets,
                testCSSFile,
                options
            );

            expect(penthouseStub.callCount).to.equal(1);

            expect(
                penthouseStub.calledWithExactly({
                    ...target,
                    ...options,
                    cssString: testCSSFile,
                })
            ).to.equal(true);

            expect(result).to.equal(testCSSFile);
        });

        it('calls penthouse with correct options when screenshots enabled', async () => {
            const basePath = '/some/path/';

            const targets = expectedTargets.slice(0, 1);

            const options = {
                blockJSRequests: true,
                screenshots: {
                    basePath,
                    type: 'jpeg',
                },
            };

            const [target] = targets;

            const result = await extractCritical.startPenthouseJob(
                targets,
                testCSSFile,
                options
            );

            expect(penthouseStub.callCount).to.equal(1);

            expect(
                penthouseStub.calledWithExactly({
                    ...target,
                    ...options,
                    cssString: testCSSFile,
                    screenshots: {
                        ...options.screenshots,
                        basePath: `${basePath}${slug(target.url)}-${
                            target.width
                        }-${target.height}`,
                    },
                })
            ).to.equal(true);

            expect(result).to.equal(testCSSFile);
        });
    });

    describe('startJobs', () => {
        let assets;
        let cssFiles;

        beforeEach(() => {
            const cssFileName = 'css/test-file.css';
            const htmlFileName = 'test-index.html';

            const cssSrc = new OriginalSource(testCSSFile, cssFileName);
            const htmlSrc = new OriginalSource(testHtmlFile, htmlFileName);

            cssFiles = [cssFileName];
            assets = {
                [cssFileName]: cssSrc,
                [htmlFileName]: htmlSrc,
            };
        });

        it('honors parallel option', async () => {
            const parallel = 3;
            const result = await extractCritical.startJobs(
                assets,
                cssFiles,
                expectedTargets,
                { parallel }
            );

            expect(result.length).to.equal(parallel);
            expect(penthouseStub.callCount).to.equal(targetsData.length);
        });

        it('defaults to 5 when parallel option not provided', async () => {
            const result = await extractCritical.startJobs(
                assets,
                cssFiles,
                expectedTargets
            );

            expect(result.length).to.equal(5);
            expect(penthouseStub.callCount).to.equal(targetsData.length);
        });

        it('maximum of 5 parallel jobs', async () => {
            const result = await extractCritical.startJobs(
                assets,
                cssFiles,
                expectedTargets,
                { parallel: 10 }
            );

            expect(result.length).to.equal(5);
            expect(penthouseStub.callCount).to.equal(targetsData.length);
        });

        it('nJobs === targets.length when targets.length < options.parallel', async () => {
            const result = await extractCritical.startJobs(
                assets,
                cssFiles,
                expectedTargets.slice(0, 2),
                { parallel: 4 }
            );

            expect(result.length).to.equal(2);
            expect(penthouseStub.callCount).to.equal(2);
        });
    });

    describe('extractCritical', () => {
        xit('extracts critical css', () => {});

        xit('honors rules given in options.ignore css', () => {});

        xit('calls filterCSS with options.ignoreOptions', () => {});
    });
});
