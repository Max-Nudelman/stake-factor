import type { NextConfig } from "next";

// Two deployments come out of this one codebase and differ only in where they
// are mounted. GitHub Pages serves a project repo from a subdirectory, so the
// exported HTML has to know its own prefix or every asset 404s.
//
//   npm run build:portfolio   -> max-nudelman.github.io/demos/stake-factor/
//   npm run build:standalone  -> max-nudelman.github.io/stake-factor/
//   npm run build             -> a plain server build, for local checking
//
// Nothing on this page needs a server: the simulation runs in the browser, so a
// static export loses nothing.
const basePath: string = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const isExport: boolean = process.env.EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isExport
    ? {
        output: "export" as const,
        // Pages resolves /stake-factor/ to index.html only with the slash.
        trailingSlash: true,
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
      }
    : {}),
};

export default nextConfig;
