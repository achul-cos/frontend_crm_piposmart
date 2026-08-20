import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// In local monorepo dev, the workspace root is one level up (sibling to
// backend/). In the Docker build, the build context is scoped to this
// directory alone, so that parent doesn't contain the monorepo and this
// must be left unset — otherwise Next resolves the workspace root as "/"
// and nests the standalone output under an extra "app/" directory.
const monorepoRoot = path.resolve(process.cwd(), "..");
const isMonorepo = fs.existsSync(path.join(monorepoRoot, "backend"));

const nextConfig: NextConfig = {
  output: "standalone",
  ...(isMonorepo ? { turbopack: { root: monorepoRoot } } : {}),
};

export default nextConfig;
