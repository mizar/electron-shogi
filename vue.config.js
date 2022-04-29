const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  pages: {
    index: {
      entry: "src/main.ts",
      title: `Electron将棋 Version ${process.env.npm_package_version}`,
    },
  },
  outputDir: "docs/webapp",
  publicPath: "./",
  pluginOptions: {
    electronBuilder: {
      preload: "src/ipc/preload.ts",
      builderOptions: {
        productName: "ElectronShogi",
      },
    },
  },
  configureWebpack: {
    plugins: [
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(
              __dirname,
              "node_modules/@mizarjp/yaneuraou.k-p/lib"
            ),
            to: path.resolve(__dirname, "docs/webapp/lib"),
            toType: "dir",
          },
          {
            from: path.resolve(
              __dirname,
              "node_modules/@mizarjp/yaneuraou.komoringheights-mate/lib"
            ),
            to: path.resolve(__dirname, "docs/webapp/lib"),
            toType: "dir",
          },
          {
            from: path.resolve(
              __dirname,
              "node_modules/@mizarjp/yaneuraou.material/lib"
            ),
            to: path.resolve(__dirname, "docs/webapp/lib"),
            toType: "dir",
          },
          {
            from: path.resolve(
              __dirname,
              "node_modules/@mizarjp/yaneuraou.material9/lib"
            ),
            to: path.resolve(__dirname, "docs/webapp/lib"),
            toType: "dir",
          },
        ],
      }),
    ],
  },
};
