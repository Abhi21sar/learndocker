import { execSync } from 'node:child_process';
import { build as viteBuild } from 'vite';

// If `npm run build` is invoked with extra arguments (e.g. `npm run build foo`),
// npm will append those args to the underlying command. Vite's CLI interprets
// positional args as potential entry roots and can break the build.
//
// This script intentionally ignores process.argv and uses Vite's JS API.
execSync('tsc', { stdio: 'inherit' });

await viteBuild({
  // Use Vite's defaults (index.html at project root, default config resolution).
  // We do not read process.argv to avoid accidentally treating extra npm args
  // as entry modules.
});

