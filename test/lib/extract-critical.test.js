const fs = require('fs');
const path = require('path');
const slug = require('limax');
const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const cssDir = path.join(__dirname, '../fixtures/css');
const testCSSFile = fs.readFileSync(`${cssDir}/test-all.css`).toString();

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
        xit('honors parallel option', () => {});

        xit('defaults to 5 when parallel option not provided', () => {});

        xit('maximum of 5 parallel jobs', () => {});

        xit('nJobs === targets.length when targets.length < options.parallel', () => {});
    });

    describe('extractCritical', () => {
        xit('extracts critical css', () => {});

        xit('honors rules given in options.ignore css', () => {});

        xit('calls filterCSS with options.ignoreOptions', () => {});
    });
});
