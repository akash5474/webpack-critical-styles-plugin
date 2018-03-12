const chalk = require('chalk');

const red = chalk.keyword('red');
const orange = chalk.keyword('orange');

const log = (color, type, ...args) =>
    console.log(
        color(`\nwebpack-critical-styles-plugin:${type}`, ...args, '\n')
    );

const logInfo = (...args) =>
    console.log('\nwebpack-critical-styles-plugin:\n', ...args);

const logError = (...args) => log(red, 'ERROR:', ...args);
const logWarning = (...args) => log(orange, 'WARNING:', ...args);

module.exports = {
    logInfo,
    logError,
    logWarning,
};
