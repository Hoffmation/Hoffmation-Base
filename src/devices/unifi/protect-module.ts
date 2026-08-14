type ProtectModule = typeof import('unifi-protect');

let modulePromise: Promise<ProtectModule> | null = null;

/**
 * Loads the ESM-only `unifi-protect` package.
 *
 * Since v5 the package exposes an "import" condition only, so `require()` fails with
 * ERR_PACKAGE_PATH_NOT_EXPORTED. The `Function` indirection keeps TypeScript from downleveling
 * the dynamic import into a `require()` call while this project still emits CommonJS.
 * @returns The module namespace, loaded once and cached.
 */
export function loadProtectModule(): Promise<ProtectModule> {
  modulePromise ??= (Function('specifier', 'return import(specifier)') as (s: string) => Promise<ProtectModule>)(
    'unifi-protect',
  );
  return modulePromise;
}
