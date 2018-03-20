const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');
const { OriginalSource } = require('webpack-sources');

const replaceAssets = require('../../lib/replace-assets');

const fixturesDir = path.join(__dirname, '../fixtures');
const testCSSFile = fs
    .readFileSync(`${fixturesDir}/css/test-all.css`)
    .toString();

const criticalCSSFile = fs
    .readFileSync(`${fixturesDir}/css/test-critical.css`)
    .toString();

const cssDiffFile = fs
    .readFileSync(`${fixturesDir}/css/test-diff.css`)
    .toString();

const minifiedCSSFile = fs
    .readFileSync(`${fixturesDir}/css/minified.css`)
    .toString();

const testHtmlFile = fs
    .readFileSync(`${fixturesDir}/testIndex.html`)
    .toString();

const inlinedHtmlFile = fs
    .readFileSync(`${fixturesDir}/testInlined.html`)
    .toString();

describe('lib/replace-assets.js', () => {
    let htmlSrc;
    let cssSrc;
    let cssFiles;

    const cssFileName = 'css/test-file.css';
    const newCSSFileName = 'css/test-new-file.css';

    beforeEach(() => {
        const htmlFileName = 'test-index.html';

        cssSrc = new OriginalSource(testCSSFile, cssFileName);
        htmlSrc = new OriginalSource(testHtmlFile, htmlFileName);

        cssFiles = [{ oldFile: cssFileName, newFile: newCSSFileName }];
    });

    describe('replaceHtml', () => {
        it('replaces css file ref in html source', () => {
            const result = replaceAssets.replaceHtml(
                htmlSrc,
                inlinedHtmlFile,
                cssFiles
            );

            expect(result.source()).to.be.equal(
                inlinedHtmlFile.replace(cssFileName, newCSSFileName)
            );
        });
    });

    describe('relaceCSS', () => {
        it('replaces css file source', () => {
            const result = replaceAssets.replaceCSS(cssSrc, criticalCSSFile);
            expect(result.source().trim()).to.be.equal(cssDiffFile);
        });

        it('minifies css file source if given option', () => {
            const result = replaceAssets.replaceCSS(
                cssSrc,
                criticalCSSFile,
                true
            );

            expect(result.source().trim()).to.be.equal(minifiedCSSFile);
        });
    });

    describe('replaceAssets', () => {
        const hash = 'abcd1234';
        let assets;
        let chunks;
        let cssFileName;
        let htmlFileName;

        beforeEach(() => {
            cssFileName = 'css/test-file.css';
            htmlFileName = 'test-index.html';

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

            cssFiles = [cssFileName];
            assets = {
                [cssFileName]: cssSrc,
                [htmlFileName]: htmlSrc,
            };
        });

        it('does not replace html and css assets by default', () => {
            replaceAssets.replaceAssets(
                { assets, chunks, hash },
                htmlFileName,
                inlinedHtmlFile,
                [cssFileName],
                criticalCSSFile,
                { filename: '[name].css', minify: false }
            );

            expect(assets[htmlFileName].source()).to.equal(inlinedHtmlFile);
            expect(assets[cssFileName].source().trim()).to.equal(testCSSFile);
        });

        it('replaces html and css assets with extract true', () => {
            replaceAssets.replaceAssets(
                { assets, chunks, hash },
                htmlFileName,
                inlinedHtmlFile,
                [cssFileName],
                criticalCSSFile,
                { filename: '[name].css', minify: false, extract: true }
            );

            expect(assets[htmlFileName].source()).to.equal(
                inlinedHtmlFile.replace(cssFileName, 'chunkA.css')
            );
            expect(assets['chunkA.css'].source().trim()).to.equal(cssDiffFile);
            expect(assets[cssFileName]).to.be.undefined;
        });
    });
});
