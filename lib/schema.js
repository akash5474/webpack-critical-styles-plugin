module.exports = {
    type: 'object',

    properties: {
        externals: {
            type: 'object',
            properties: {
                root: {
                    type: 'string',
                },
                urlPath: {
                    type: 'string',
                },
            },
            required: ['root'],
            additionalProperties: false,
        },

        urls: {
            type: 'array',
            items: {
                type: 'string',
                pattern: '^/'
            },
        },

        excludeChunks: {
            type: 'array',
            items: {
                type: 'string',
            },
        },

        proxy: {
            type: 'object',
        },

        extract: {
            type: 'boolean',
        },

        filename: {
            type: 'string',
            pattern: '\\.css$'
        },

        dimensions: {
            type: 'array',
            items: {
                $ref: '#/definitions/dimension',
            },
        },

        penthouse: {
            type: 'object',
        },

        stall: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
        },

        parallel: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
        },

        ignore: {
            type: 'array',
            items: {
                oneOf: [{ type: 'string' }, { instanceof: 'RegExp' }],
            },
        },

        ignoreOptions: {
            type: 'object',
        },

        minify: {
            type: 'boolean',
        },

        sourceMap: {
            type: 'boolean',
        },
    },

    required: ['filename'],

    additionalProperties: false,

    definitions: {
        dimension: {
            properties: {
                width: {
                    type: 'integer',
                },
                height: {
                    type: 'integer',
                },
            },
            required: ['width', 'height'],
            additionalProperties: false,
        },
    },
};
