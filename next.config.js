const { VueLoaderPlugin } = require('vue-loader');

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Unshift the vue-loader rule to ensure it's at the beginning.
    config.module.rules.unshift({
      test: /\.vue$/,
      loader: 'vue-loader',
    });

    // Add the VueLoaderPlugin if it doesn't exist.
    if (!config.plugins.some(plugin => plugin.constructor.name === 'VueLoaderPlugin')) {
        config.plugins.push(new VueLoaderPlugin());
    }

    return config;
  },
};

module.exports = nextConfig;
