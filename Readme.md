# webpack-critical-styles-plugin
Inline above the fold CSS with Webpack + Penthouse

## Install

```
npm install --save-dev webpack-critical-styles-plugin
```


## Description

This plugin integrates [`penthouse`](https://github.com/pocketjoso/penthouse) with Webpack and is heavily
inspired by [`critical`](https://github.com/addyosmani/critical).
Unfortunately [`critical`](https://github.com/addyosmani/critical) and some of it's dependencies depend
on the file being written to disk which does not play nicely with Webpack.
This is where `webpack-critical-styles-plugin` fits in.


#### Goals of this plugin:
* Provide an easy way to extract "above the fold" styles with Webpack.
* Better support for Single Page Applications by providing a way to proxy requests to real APIs.


#### Limitations

* Currently limited to one HTML file (support for more to come).
* Requires HTML file created by Webpack.
* Requires CSS files created by Webpack.
* No Webpack 4 support (yet).
* No sourcemap support (hopefully to come).


## Usage

```javascript
const CriticalStylesPlugin = require('webpack-critical-styles-plugin');

module.exports = {
    ...,
    new HtmlWebpackPlugin({ ... }),

    new ExtractTextPlugin({ ... }),

    new CriticalStylesPlugin({
        urls: [ '/', '/not-found' ],

        filename: 'css/[name].[id].[contenthash].[hash].css',

        extract: true,

        excludeChunks: [ 'chunk-to-exclude' ],

        externals: { path: '/myapp/static/', root: './static' },

        proxy: {
            '/api/v1': {
                target: 'https://mysite.com/'
            }
        },

        dimensions: [
            { width: 900, height: 1300 }
        ],

        penthouse: {
            blockJSRequests: false,
            ...
        }
    }),
}
```


## Options

Name             | Type       | Default   | Description
---------------- | ---------- | --------- | ------------
urls             | `array`    | `['/']`   | Urls to extract critical CSS from.
filename         | `string`   | `[name].css` | Output filename, required if `extract` option is `true`.
extract          | `boolean`  | `false`   | Remove inlined styles from webpack's CSS assets.
minify           | `boolean`  | `false`   | Minify resulting CSS file with critical CSS extracted.
excludeChunks    | `array`    | `[]`      | Chunks to exclude when extracting critical CSS.
externals        | `object`   | `null`    | Properties are `root` (required) and `path`.  `root` is passed to [`express.static`](http://expressjs.com/en/api.html#express.static) and `path` can be used to prepend a path for external files such as `app.use(<path>, express.static(<root>))`.
proxy            | `object`   | `null`    | Same as webpack's [`devServer.proxy`](https://webpack.js.org/configuration/dev-server/#devserver-proxy) option, uses [`http-proxy-middlware`](https://github.com/chimurai/http-proxy-middleware).
dimensions       | `array`    | <pre>[{<br>&nbsp;&nbsp;width: 900,<br>&nbsp;&nbsp;height: 1300<br>}]</pre> | An array of objects containing width and height.
parallel         | `integer`  | `5`       | Number of `penthouse` jobs to run in parallel (maximum of 5).
stall            | `integer`  | `null`    | Number of minutes to stall before running `penthouse`.  Helpful for making sure your app is rendering correctly.
penthouse        | `object`   | `{}`      | [`penthouse#options`](https://github.com/pocketjoso/penthouse#options)
ignore           | `array`    | `[]`      | CSS rules to ignore. See [`filter-css`](https://github.com/bezoerb/filter-css) for more details.
ignoreOptions    | `object`   | `{}`      | [`filter-css#options`](https://github.com/bezoerb/filter-css#options)
