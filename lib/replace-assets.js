const CleanCSS = require('clean-css');
const { ReplaceSource } = require('webpack-sources');

const extractCSS = require('./extract-css');
const { getFileName } = require('./util/helpers');

function replaceHtml(htmlAsset, inlinedHtml, cssFiles) {
    for (const { oldFile, newFile } of cssFiles) {
        inlinedHtml = inlinedHtml.replace(new RegExp(oldFile, 'g'), newFile);
    }

    const htmlSource = new ReplaceSource(htmlAsset);
    htmlSource.replace(0, htmlSource.original().size(), inlinedHtml);

    return htmlSource;
}

function replaceCSS(cssAsset, criticalCSS, minify = false) {
    let trimmedCSS = extractCSS(cssAsset.source(), criticalCSS);

    if (minify) {
        trimmedCSS = new CleanCSS().minify(trimmedCSS).styles;
    }

    const cssSource = new ReplaceSource(cssAsset);
    cssSource.replace(0, cssSource.original().size(), trimmedCSS);

    return cssSource;
}

function replaceAssets(
    compilation,
    indexHtml,
    inlinedHtml,
    cssFiles,
    criticalCSS,
    options
) {
    const { assets, chunks, hash } = compilation;
    const newCSSFiles = [];

    criticalCSS = criticalCSS.toString();

    for (const cssFile of cssFiles) {
        const cssSource = replaceCSS(
            assets[cssFile],
            criticalCSS,
            options.minify
        );
        const chunk = chunks.find(c => c.files.includes(cssFile));

        const newFile = getFileName(
            options.filename,
            assets[cssFile],
            chunk,
            hash
        );

        delete assets[cssFile];
        assets[newFile] = cssSource;

        chunk.files = chunk.files
            .filter(file => file !== cssFile)
            .concat([newFile]);

        assets[newFile] = cssSource;

        newCSSFiles.push({ oldFile: cssFile, newFile });
    }

    assets[indexHtml] = replaceHtml(
        assets[indexHtml],
        inlinedHtml.toString(),
        newCSSFiles
    );
}

module.exports = {
    replaceHtml,
    replaceCSS,
    replaceAssets,
};
