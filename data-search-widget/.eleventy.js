module.exports = function (eleventyConfig) {
  // eleventyConfig.addPassthroughCopy("layout.css")
  eleventyConfig.addPassthroughCopy("css/data-search-widget.css")
  eleventyConfig.addPassthroughCopy("css/layout.css")
  eleventyConfig.addPassthroughCopy("data-search-widget.js")
  eleventyConfig.addPassthroughCopy("utils/helpers.js")
  eleventyConfig.addPassthroughCopy("**/*.csv");
  eleventyConfig.addPassthroughCopy("examples/*.json");
  eleventyConfig.addPassthroughCopy("./node_modules/bootstrap/dist/css/bootstrap.min.css")
  eleventyConfig.addPassthroughCopy("./node_modules/bootstrap/dist/js/bootstrap.min.js")
  eleventyConfig.addPassthroughCopy("./node_modules/jquery/dist/jquery.min.js")

  eleventyConfig.setServerOptions({
    port: 5050,
    watch: [
      "_site/**/*.css",
      "_site/**/*.js",
      "_site/**/*.csv",
      "_site/**/*.json"
    ]
  })
}
