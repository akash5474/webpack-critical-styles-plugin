/*
Modified from https://github.com/bevacqua/cave
*/

/*
The MIT License (MIT)

Copyright © 2014 Nicolas Bevacqua

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const _ = require('lodash');
const css = require('css');

function extractCSS(stylesheet, cssToExtract) {
    const sheet = css.parse(stylesheet);
    const sheetRules = sheet.stylesheet.rules;
    const removables = css.parse(cssToExtract);

    removables.stylesheet.rules.forEach(inspectRule);
    _.forEachRight(sheetRules, removeEmptyMedia);

    return result();

    function inspectRule(inspected, parent) {
        const simpler = omitRulePosition(inspected);
        const forEachVictim = typeof parent === 'number';

        if (forEachVictim) {
            parent = false;
        }

        if (inspected.type === 'rule') {
            if (parent) {
                _(sheetRules)
                    .filter({ type: 'media', media: parent.media })
                    .map('rules')
                    .value()
                    .forEach(removeMatches);
            } else {
                removeMatches(sheetRules);
            }
        } else if (inspected.type === 'media') {
            inspected.rules.forEach(inspectRuleInMedia);
        }

        function inspectRuleInMedia(rule) {
            inspectRule(rule, inspected);
        }

        function removeMatches(rules) {
            _.remove(rules, perfectMatch).length; // remove perfect matches
            _.filter(rules, byDeclarations).forEach(stripSelector); // strip selector from partial matches
        }

        function perfectMatch(rule) {
            return _.isEqual(omitRulePosition(rule), simpler);
        }

        function byDeclarations(rule) {
            return _.isEqual(
                omitRulePosition(rule).declarations,
                simpler.declarations
            );
        }

        function stripSelector(rule) {
            rule.selectors = _.difference(rule.selectors, inspected.selectors);
        }
    }

    function removeEmptyMedia(rule, i) {
        if (rule.type === 'media' && rule.rules.length === 0) {
            sheetRules.splice(i, 1);
        }
    }

    function result() {
        return css.stringify(sheet) + '\n';
    }
}

function omitPosition(declaration) {
    return _.omit(declaration, 'position');
}

function omitRulePosition(rule) {
    if (rule.type !== 'rule') {
        return false;
    }

    const result = omitPosition(rule);
    result.declarations = result.declarations.map(omitPosition);

    return result;
}

module.exports = extractCSS;
