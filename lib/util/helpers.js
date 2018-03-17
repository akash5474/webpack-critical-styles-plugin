const loaderUtils = require('loader-utils');
const slug = require('limax');

const { logWarning } = require('./logging');

function checkOptionOverrides(options, optionOverrides, ...args) {
    const arr = Object.keys(options)
        .filter(opt => optionOverrides.includes(opt))
        .map(opt => `\n\t- ${opt}`);

    if (arr.length > 0) {
        logWarning(...args, ...arr);
    }
}

function getBasePath(basePath, { url, width, height }) {
    return `${basePath}${slug(url)}-${width}-${height}`;
}

function getTargets(port, options = {}) {
    const {
        urls = ['/'],
        dimensions = [{ width: 900, height: 1300 }],
    } = options;

    const baseUrl = `http://localhost:${port}`;

    return dimensions.reduce(
        (acc, dim) => [
            ...acc,
            ...urls.map(u => ({ ...dim, url: baseUrl + u })),
        ],
        []
    );
}

function getFiles(fileNames, excludeFiles) {
    const validFiles = fileNames.filter(file => !excludeFiles.includes(file));

    const htmlFiles = validFiles.filter(file => file.endsWith('.html'));
    const cssFiles = validFiles.filter(file => file.endsWith('.css'));

    const includedFiles = validFiles
        .filter(file => !htmlFiles.includes(file))
        .filter(file => !cssFiles.includes(file));

    return { htmlFiles, cssFiles, includedFiles };
}

function getFileName(filename, asset, chunk, hash) {
    return filename
        .replace(
            /\[(?:(\w+):)?contenthash(?::([a-z]+\d*))?(?::(\d+))?\]/gi,
            (...args) =>
                loaderUtils.getHashDigest(
                    asset.source(),
                    args[1],
                    args[2],
                    parseInt(args[3], 10)
                )
        )
        .replace(/\[name\]/gi, chunk.name)
        .replace(/\[hash\]/gi, hash)
        .replace(/\[id\]/gi, chunk.id);
}

module.exports = {
    checkOptionOverrides,
    getBasePath,
    getTargets,
    getFiles,
    getFileName,
};
