const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Add support for wasm files (required by expo-sqlite on web)
config.resolver.assetExts.push("wasm");

module.exports = withNativeWind(config, { input: "./global.css" });
