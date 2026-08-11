import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  unocss: false,
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },
  ignores: [
    '**/node_modules/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/dist/**',
    '**/coverage/**',
    '**/.git/**',
    '**/pnpm-lock.yaml',
  ],
}, {
  // `pnpm/yaml-enforce-settings` demands `trustPolicy: no-downgrade`, which is
  // incompatible with the npmmirror registry (no npm provenance attestation).
  // Reproducibility is guaranteed by the committed pnpm-lock.yaml instead.
  rules: {
    'pnpm/yaml-enforce-settings': 'off',
  },
})
