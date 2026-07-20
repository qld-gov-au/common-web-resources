# Data search widget

Collects from a data source (API endpoint or CSV file) and displays returned results with a search form for filtering.

## Run locally
`cd data-search-widget`
`npm run serve`

Now the example sites will be available to be tested locally considering port 5050 is available:

http://localhost:5050/examples/ccms-business-search--json-categories/index.html
http://localhost:5050/examples/ccms-business-search--location-only/index.html
http://localhost:5050/examples/ccms-business-search-leaflet/index.html
http://localhost:5050/examples/ccms-companion-card/index.html
http://localhost:5050/examples/forgov-gazette-search/index.html

### Regenerating css and minified files:
After any scss change in `data-search-widget.scss`, you need to run below command locally to regenerate css and minified files within `data-search-widget` directory:

`sass scss/data-search-widget.scss:css/data-search-widget.css`