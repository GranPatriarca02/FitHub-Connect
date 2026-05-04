const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// 🔥 FIX crítico Node 24 + Windows + ESM bug
config.resolver.platforms = ["ios", "android", "native", "web"];
config.watchFolders = [path.resolve(__dirname)];

module.exports = withNativeWind(config, {
    input: path.resolve(__dirname, "global.css"),
});