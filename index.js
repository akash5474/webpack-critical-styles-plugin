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
        validateOptions(schema, options, 'Critical Styles Plugin');
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

    async emit(compilation, excludeFiles = []) {
        this.warnOptionOverrides();

        const { assets, chunks, hash } = compilation;
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

        if (Number.isInteger(this.options.stall)) {
            const stall = Math.min(this.options.stall, 5);
            await new Promise(resolve =>
                setTimeout(resolve, 1000 * 60 * stall)
            );
        }

        try {
            let criticalCSS = await extractCritical(
                assets,
                cssFiles,
                port,
                this.options
            );

            const ignore = excludeFiles
                .filter(file => /\.css$/.test(file))
                .map(file => this.options.publicPath + file);

            const inlinedHtml = inlineCritical(
                assets[indexHtml].source(),
                criticalCSS,
                { ignore }
            );

            if (this.options.extract) {
                replaceAssets(
                    compilation,
                    indexHtml,
                    inlinedHtml,
                    cssFiles,
                    criticalCSS,
                    this.options
                );
            }
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

            const { excludeChunks = [] } = this.options;

            const excludeFiles = compilation.chunks
                .filter(c => excludeChunks.includes(c.name))
                .reduce((acc, c) => [...acc, ...c.files], []);

            await this.emit(compilation, excludeFiles);
            callback();
        });
    }
}

module.exports = CriticalStylesPlugin;
