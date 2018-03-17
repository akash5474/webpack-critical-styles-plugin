const CleanCSS = require('clean-css');
const filterCSS = require('filter-css');
const penthouse = require('penthouse');

const { getBasePath, getTargets } = require('./util/helpers');

async function startPenthouseJob(
    targets,
    cssString,
    options = {},
    output = ''
) {
    const target = targets.shift();

    if (!target) {
        return Promise.resolve(output);
    }

    const opts = { ...options, ...target, cssString };

    if (options.screenshots) {
        const basePath = options.screenshots.basePath;

        opts.screenshots = {
            ...options.screenshots,
            basePath: getBasePath(basePath, target),
        };
    }

    const criticalCSS = await penthouse(opts);

    return await startPenthouseJob(
        targets,
        cssString,
        options,
        output + criticalCSS
    );
}

async function startJobs(assets, cssFiles, targets, options = {}) {
    const cssString = cssFiles.reduce((acc, s) => acc + assets[s].source(), '');

    const parallel = Math.min(options.parallel || 5, 5, targets.length);
    const jobs = [...Array(parallel)].map(() =>
        startPenthouseJob(targets, cssString, options)
    );

    return await Promise.all(jobs);
}

async function extractCritical(assets, cssFiles, port, options = {}) {
    const targets = getTargets(port, options);

    const output = await startJobs(assets, cssFiles, targets, options.penthouse);

    let criticalCSS = output.reduce((acc, s) => acc + s, '');

    if (options.ignore) {
        criticalCSS = filterCSS(
            criticalCSS,
            options.ignore,
            options.ignoreOptions || {}
        );
    }

    return new CleanCSS({
        level: {
            1: {
                all: true,
            },
            2: {
                all: false,
                removeDuplicateFontRules: true,
                removeDuplicateMediaBlocks: true,
                removeDuplicateRules: true,
                removeEmpty: true,
                mergeMedia: true,
            },
        },
    }).minify(criticalCSS).styles;
}

module.exports = {
    startPenthouseJob, // For testing
    startJobs, // For testing
    extractCritical,
};
