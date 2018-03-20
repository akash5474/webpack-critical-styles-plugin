const inlineCritical = require('inline-critical');
const validateOptions = require('schema-utils');

const { extractCritical } = require('./lib/extract-critical');
const createServer = require('./lib/create-server');
const schema = require('./lib/schema');
const { logError } = require('./lib/util/logging');
const { replaceAssets } = require('./lib/replace-assets');
const { getFiles, checkOptionOverrides } = require('./lib/util/helpers');

class CriticalStylesPlugin {
    constructor(options = {}) {
        try {
            validateOptions(schema, options, 'Critical Styles Plugin');
        } catch (err) {
            logError(err);
            throw err;
        }

        this.options = options;
    }

    warnOptionOverrides() {
        const penthouseOverrides = ['url', 'width', 'height', 'cssString'];
        checkOptionOverrides(
            this.options.penthouse,
            penthouseOverrides,
            'Overriding penthouse options'
        );
    }

    async emit(compilation) {
        this.warnOptionOverrides();

        const { assets, chunks, hash } = compilation;
        const { excludeChunks = [] } = this.options;

        const excludeFiles = chunks
            .filter(c => excludeChunks.includes(c.name))
            .reduce((acc, c) => [...acc, ...c.files], []);

        const fileNames = Object.keys(assets);

        const { htmlFiles: [indexHtml], cssFiles, includedFiles } = getFiles(
            fileNames,
            excludeFiles
        );

        const { server, port } = await createServer(
            assets,
            indexHtml,
            cssFiles.concat(includedFiles),
            this.options
        );

        try {
            let criticalCSS = await extractCritical(
                assets,
                cssFiles,
                port,
                this.options
            );

            const { publicPath = '/' } = this.options;
            const ignore = excludeFiles
                .filter(file => file.endsWith('.css'))
                .map(file => publicPath + file);

            const inlinedHtml = inlineCritical(
                assets[indexHtml].source(),
                criticalCSS,
                { ignore }
            );

            replaceAssets(
                compilation,
                indexHtml,
                inlinedHtml,
                cssFiles,
                criticalCSS,
                this.options
            );
        } catch (err) {
            logError('Error extracting critical CSS');
            logError(err);
            throw err;
        } finally {
            await server.close();
        }
    }

    apply(compiler) {
        compiler.plugin('emit', async (compilation, callback) => {
            this.options = {
                ...this.options,
                publicPath: compiler.options.output.publicPath,
            };

            await this.emit(compilation);
            callback();
        });
    }
}

module.exports = CriticalStylesPlugin;
