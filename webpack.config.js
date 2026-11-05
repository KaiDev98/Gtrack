/**
 * Gym Tracker — Webpack 5 build.
 * Based on TailAdmin Free (HTML) conventions: every file in src/pages becomes
 * a page, and <include src="..."> is resolved recursively at build time.
 */
const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

const INCLUDE_PATTERN =
  /<include\s+src=["'](.+?)["']\s*\/?>\s*(?:<\/include>)?/gis;

const processNestedHtml = (content, loaderContext, dir = null) =>
  !INCLUDE_PATTERN.test(content)
    ? content
    : content.replace(INCLUDE_PATTERN, (m, src) => {
        let filePath = path.resolve(dir || loaderContext.context, src);
        if (!fs.existsSync(filePath)) {
          const commonFallback = path.resolve(
            __dirname,
            "src/partials/common",
            path.basename(src),
          );
          if (fs.existsSync(commonFallback)) {
            filePath = commonFallback;
          } else {
            filePath = path.resolve(__dirname, "src", src.replace(/^\.\//, ""));
          }
        }
        loaderContext.dependency(filePath);
        return processNestedHtml(
          loaderContext.fs.readFileSync(filePath, "utf8"),
          loaderContext,
          path.dirname(filePath),
        );
      });

const generateHTMLPlugins = () => {
  const plugins = [];
  globSync("./src/pages/**/*.html").forEach((filePath) => {
    const rel = filePath.replace(/^(\.\/)?src\/pages\//, "");
    const filename = rel.replace(/\([^)]+\)\/?/g, "");
    plugins.push(
      new HtmlWebpackPlugin({
        filename,
        template: filePath,
        favicon: "./src/images/favicon.ico",
        inject: "body",
        scriptLoading: "defer",
      }),
    );
  });
  return plugins;
};

module.exports = {
  mode: "development",
  entry: "./src/js/index.js",
  devServer: {
    static: [{ directory: path.join(__dirname, "./src") }],
    hot: true,
    compress: true,
    historyApiFallback: {
      rewrites: [
        { from: /^\/$/, to: "/index.html" },
        {
          from: /^\/[^.]+$/,
          to: (context) => context.parsedUrl.pathname + ".html",
        },
      ],
      index: "/index.html",
    },
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: { presets: ["@babel/preset-env"] },
        },
      },
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|webp)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: "asset/resource",
      },
      {
        test: /\.html$/,
        loader: "html-loader",
        options: { sources: false, preprocessor: processNestedHtml },
      },
    ],
  },
  plugins: [
    ...generateHTMLPlugins(),
    new MiniCssExtractPlugin({
      filename: "style.css",
      chunkFilename: "style.css",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/images", to: "images" },
        { from: "src/pwa", to: "." },
      ],
    }),
  ],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    assetModuleFilename: "[path][name][ext]",
  },
  resolve: {
    conditionNames: ["import", "module", "require", "default"],
    extensionAlias: { ".js": [".js", ".mjs"] },
  },
  target: "web",
  stats: "minimal",
};
