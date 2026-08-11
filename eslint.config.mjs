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
    // Vendored Rust / native shells are NOT part of the frontend lint surface.
    // viewer/** = WASM viewer (Rust + Cargo.toml), built only in CI.
    // src-tauri/** = Tauri 2 native shell (Rust + TOML), Phase D scaffold.
    'viewer/**',
    'src-tauri/**',
    // Generated WASM output + resource-pack assets (copied from the vendored
    // web-monitor repo) are not authored frontend code.
    'src/public/viewer/**',
  ],
}, {
  // `pnpm/yaml-enforce-settings` demands `trustPolicy: no-downgrade`, which is
  // incompatible with the npmmirror registry (no npm provenance attestation).
  // Reproducibility is guaranteed by the committed pnpm-lock.yaml instead.
  rules: {
    'pnpm/yaml-enforce-settings': 'off',
  },
})
