const fs = require('fs');
const path = require('path');
const { expect } = require('chai');

const extractCSS = require('../../lib/extract-css');
const cssDir = path.join(__dirname, '../fixtures/css');

const testMediaAllFile = fs
    .readFileSync(`${cssDir}/test-media-all.css`)
    .toString();

const testMediaCriticalFile = fs
    .readFileSync(`${cssDir}/test-media-critical.css`)
    .toString();

const testMediaDiffFile = fs
    .readFileSync(`${cssDir}/test-media-diff.css`)
    .toString();

describe('lib/extract-css.js', () => {
    it('extracts css', () => {
        const testAllFile = fs
            .readFileSync(`${cssDir}/test-all.css`)
            .toString();

        const testCriticalFile = fs
            .readFileSync(`${cssDir}/test-critical.css`)
            .toString();

        const testDiffFile = fs
            .readFileSync(`${cssDir}/test-diff.css`)
            .toString()
            .trim();

        const result = extractCSS(testAllFile, testCriticalFile).trim();
        expect(result).to.equal(testDiffFile);
    });

    it('extracts css with media queries', () => {
        const testAllFile = fs
            .readFileSync(`${cssDir}/test-media-all.css`)
            .toString();

        const testCriticalFile = fs
            .readFileSync(`${cssDir}/test-media-critical.css`)
            .toString();

        const testDiffFile = fs
            .readFileSync(`${cssDir}/test-media-diff.css`)
            .toString()
            .trim();

        const result = extractCSS(testAllFile, testCriticalFile).trim();
        expect(result).to.equal(testDiffFile);
    });
});
