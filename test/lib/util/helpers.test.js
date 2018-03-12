const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const loaderUtils = require('loader-utils');
const { RawSource } = require('webpack-sources');

const { getTargets, getFileName, getFiles } = require('../../../lib/util/helpers');

const cssDir = path.join(__dirname, '../../fixtures/css');
const testCSSFile = fs.readFileSync(`${cssDir}/test-all.css`).toString();

describe('lib/util/helpers.js', () => {
    describe('getTargets', () => {
        const port = 1234;
        const baseUrl = `http://localhost:${port}`;

        let urls;
        let dimensions;
        let expectedTargets;

        beforeEach(() => {
            urls = ['/', '/other-route', '/another-route'];

            dimensions = [
                { width: 500, height: 800 },
                { width: 800, height: 1000 },
                { width: 1000, height: 1200 },
            ];

            expectedTargets = [
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
        });

        it('returns default arguments', () => {
            const result = getTargets(port);

            expect(result).to.deep.have.all.members([
                { url: `${baseUrl}/`, width: 900, height: 1300 },
            ]);
        });

        it('returns one result per url/dimension combination', () => {
            const result = getTargets(port, { urls, dimensions });

            expect(result).to.deep.have.all.members(expectedTargets);
        });
    });

    describe('getFiles', () => {
        const filterHtmlFiles = file => /\.html$/.test(file);
        const filterCSSFiles = file => /\.css$/.test(file);
        const filterOtherFiles = file =>
            !/\.html$/.test(file) && !/\.css$/.test(file);

        let fileNames;
        let excludeFiles;

        beforeEach(() => {
            fileNames = [
                'index.html',
                'error.html',
                'app.css',
                'app.js',
                'vendor.css',
                'vendor.js',
                'exclude.html',
                'exclude.js',
                'exclude.css',
            ];

            excludeFiles = ['exclude.html', 'exclude.js', 'exclude.css'];
        });

        it('gives the correct result', () => {
            const { htmlFiles, cssFiles, includedFiles } = getFiles(
                fileNames,
                excludeFiles
            );

            const htmlFilesResult = ['index.html', 'error.html'];
            const cssFilesResult = ['app.css', 'vendor.css'];
            const validFilesResult = fileNames
                .filter(file => !excludeFiles.includes(file))
                .filter(file => !htmlFilesResult.includes(file))
                .filter(file => !cssFilesResult.includes(file));

            expect(htmlFiles).to.have.all.members(htmlFilesResult);
            expect(cssFiles).to.have.all.members(cssFilesResult);
            expect(includedFiles).to.have.all.members(validFilesResult);
        });

        it('separates html, css, and other files', () => {
            const { htmlFiles, cssFiles, includedFiles } = getFiles(
                fileNames,
                excludeFiles
            );

            expect(htmlFiles).to.have.all.members(
                htmlFiles.filter(filterHtmlFiles)
            );

            expect(cssFiles).to.have.all.members(
                cssFiles.filter(filterCSSFiles)
            );

            expect(includedFiles).to.have.all.members(
                includedFiles.filter(filterOtherFiles)
            );
        });
    });

    describe('getFileName', () => {
        const hash = '1a2b3c4d5e';
        const chunk = { name: 'app', id: '3' };

        const asset = new RawSource(testCSSFile);

        const contenthash = loaderUtils.getHashDigest(asset.source());

        it('replaces [name] with chunk.name', () => {
            const namePattern = '[name].css';
            const result = getFileName(namePattern, asset, chunk, hash);

            expect(result).to.equal(`${chunk.name}.css`);
        });

        it('replaces [hash] with hash argument', () => {
            const namePattern = '[hash].css';
            const result = getFileName(namePattern, asset, chunk, hash);

            expect(result).to.equal(`${hash}.css`);
        });

        it('replaces [id] with chunk.id', () => {
            const namePattern = '[id].css';
            const result = getFileName(namePattern, asset, chunk, hash);

            expect(result).to.equal(`${chunk.id}.css`);
        });

        it('replaces [contenthash] with correct value', () => {
            const namePattern = '[contenthash].css';
            const result = getFileName(namePattern, asset, chunk, hash);

            expect(result).to.equal(`${contenthash}.css`);
        });

        it('replaces [name], [id], [hash], [contenthash] when used together', () => {
            const namePattern = '[name].[id].[hash].[contenthash].css';
            const expectedName = `${chunk.name}.${
                chunk.id
            }.${hash}.${contenthash}.css`;

            const result = getFileName(namePattern, asset, chunk, hash);

            expect(result).to.equal(expectedName);
        });
    });
});
