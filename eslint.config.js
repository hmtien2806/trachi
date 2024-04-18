export default import('@kdt310722/eslint-config').then((m) => m.defineFlatConfig({}, {
    rules: {
        'unicorn/no-array-method-this-argument': 'off',
        'promise/no-nesting': 'off',
    },
}))
