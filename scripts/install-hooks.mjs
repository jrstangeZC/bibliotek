import { execFileSync } from "node:child_process";

/**
 * Points git at the committed hooks in `.githooks/`. Runs as the `prepare`
 * script, so every `npm install` sets it up on whichever machine runs it.
 * Outside a git checkout (a deploy, a tarball) there is nothing to set up.
 */
try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "ignore",
  });
} catch {
  // No git, or not a repository.
}
