const fs = require("fs");
const path = require("path");

// Gracefully handle Windows EMFILE / EBUSY errors with automatic retry and backoff
try {
  const gracefulFs = require("graceful-fs");
  gracefulFs.gracefulify(fs);
} catch (_) {}

if (fs.promises) {
  const patchPromiseFn = (fnName) => {
    const orig = fs.promises[fnName];
    if (typeof orig === "function") {
      fs.promises[fnName] = async function (...args) {
        let retries = 8;
        let delay = 25;
        while (true) {
          try {
            return await orig.apply(this, args);
          } catch (err) {
            if ((err.code === "EMFILE" || err.code === "EBUSY") && retries > 0) {
              retries--;
              await new Promise((resolve) => setTimeout(resolve, delay));
              delay = Math.min(delay * 2, 250);
              continue;
            }
            throw err;
          }
        }
      };
    }
  };

  patchPromiseFn("readFile");
  patchPromiseFn("open");
  patchPromiseFn("writeFile");
}

const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add support for wasm files if needed
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

// Limit worker processes to prevent memory exhaustion / SIGTERM crashes on Windows
config.maxWorkers = 2;

// Intercept expo-sqlite on web so Metro serves the lightweight shim instead of wa-sqlite.js
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "expo-sqlite") {
    return {
      filePath: path.resolve(__dirname, "lib/sqliteClient.web.ts"),
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...config.resolver.sourceExts, "svg", "mjs", "cjs"],
};

module.exports = withNativeWind(config, { input: "./global.css" });
