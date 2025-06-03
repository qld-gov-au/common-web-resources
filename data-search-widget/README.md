# Data search widget

Collects from a data source (API endpoint or CSV file) and displays returned results with a search form for filtering.

# Search tool configuration

You can use JSON in your JavaScript file to configure your search tool.
The basic structure could be defined as follows:
```js
let options = {
  dataSources: [ {  }, ],
  dataCallback: (data) => { return data },
  resultTemplate: { return `// return html output here ` },
  noResultsTemplate: function () { return `// return html output here ` },
  keywords: true || false,
  keywordFields: [ ],
  filterFields: { },
  sortFields: { },
  pagination: { },
}
```
## Available options
### dataSources
**dataSources** property can be used to define the API URL and functionality.

```js
  dataSources: [ 
    {
      url: 'API_URL',
      results: 'result.results' // where results is the property present in the API
    },
  ],
```
### dataCallback
```dataCallback``` is a function that is called when a specific event or condition is met, typically involving the handling or processing of data.
```dataCallback`` can be written like the following:
```js
let options = {
    ...
    dataCallback: (data) => {
        keywordFields: [
        ... // add fields where users will look for specific keywords here
        ],
        filterFields: {
        ... // add filter options here
        }
        
    }
```
#### Options (in dataCallback)
There are various options that determine how users can use the search tool.
An example structure is defined as follows:
```js
let options = {
      dataSources: [
        {
          url: 'API_URL',
          results: 'result.results'
        },
      ],
      dataCallback: (data) => {
        // add custom functions here
        keywords: false,
        keywordFields: [
            "title",
            "description",
            "name"
        ],
        filterFields: {
            year: {
                type: 'select',
                sort: 'reverse',
                multi: true,
                label: "Year"
                hint: "Your hint here"
                defaultText: "",
                data: {
                type: 'array',
                separator: ','
                },
                sort: 'numeric'
                },
                //from here
                required: true,
          dependents: {
            event: {
              type: 'select',
              multi: false,
              label: 'Event',
              conditional: true,
              minimum: 2,
            },
              dependents: {
                task: {
                  type: 'select',
                  multi: false,
                  label: 'Task',
                  conditional: ['finance', 'payroll'],
                  minimum: 1,
                  dependents: {
                    group: {
                      type: 'select',
                      multi: false,
                      label: 'Group',
                      conditional: 'pay',
                      minimum: 2,
                    },
                  },
                },
              },
            },
        },
    }
```
### resultTemplate
Function that stores two methods, **data** and **markup**.
The method **data** is used to extract the determine the data we want to extract from the API.
```js
resultTemplate: {
        data: function (results) {
          return results.map(function (entry) {
            return {
              name: entry.name, // where name is a property from the API
              description: entry.description,
            }
          });
        },
```
The method **markup** is used to output how the search results are displayed.
```js
        markup: function (result) {
            let result_list = result.property.map(p => {
                return `<li> <a href="${p.url}">
                ${p.name ? `Name: ${p.name}` : ""}
                ${p.description ? `Description: ${p.description}` : ""}`
            }
          return `
          <div class="col">
            <div class="card card-default default card-multi-action">
              <div class="card-body">
                <h3 class="card-title">${result.name}</h3>
                <div class="card-text">
                  <ul>${result_list}</ul>
                </div>
              </div>
            </div>
          </div>
          `
        },
```
### noResultsTemplate
Function that shows an error check if no results are found when user attempts to search for result.
```js
noResultsTemplate: function () {
        return `
        <div class="col">
          <div class="card card-default default card-multi-action">
            <div class="card-body">
              <h3 class="card-title">No results found</h3>
              <div class="card-text">
                <p>We couldn't find any matching results.</p>
              </div>
            </div>
          </div>
        </div>
        `
      },
```
### keywords
Boolean that determines whether or not the user can enter keywords in the search field. If **keywords** is false, this usually means users can only filter the search by predetermined values.
```js
let options = {
    keywords: true || false
    }
```
### keywordFields
Array that defines properties extracted from the API that users can search for when they type in the search box. The search will look for matches within the specified fields.
For example, if the user searches for the "cat" keyword, the search can generate results that contain "cat" in any of the fields ```"title"```, ```"description"``` or ```"name"```:
```js
      keywordFields: [
        "title",
        "description",
        "name"
      ],
```
### filterFields
Contains the type of object to be structured as a selectable drop down by the use. This allows the tool to filter the results according to what was selected.
For example, if the search requires a drop down field containing 'year(s)', the 'year' would be an object within ```filterFields```, and its structure would look like this:
```js
filterFields: {
        year: {
          type: 'select',
          label: "Year",
          multi: true,
        }
    },
```
#### filterFields options
There are various options that are available within the objects in filterFields. Custom options could be created and added to the object as well.
##### 1. options
The ```options``` property links up the filter field with the API property extracted or created for the search.
```js
let options = {
    options: year,
    }
```
#### 2. type
The ```type``` property defines the type of filter that users will interact with. Its options are ```select``` (dropdown selection) and ```check``` (checkbox selection).
```js
let options = {
    type: 'select' | 'check'
    }
```
#### 3. sort
The ```sort``` property is defines the sorting of the search results. This property can be both a boolean and a string.
```js
let options = {
    sort: true | false
    }
```
```js
let options = {
    sort: 'reverse' | 'numeric'
    }
```

#### 4. multi
The ```multi``` property is a boolean that determines if the user can select multiple choices in the search.
```js
let options = {
    multi: true | false
    }
```
#### 5. label
The ```label``` property labels the data that the user wants to filter, and is showed in the front-end.
```js
let options = {
    label: "Year"
    }
```
#### 6. hint
Additional information displayed to the user for the object.
```js
let options = {
    hint: "Only holds data up to 10 years" 
}
```
#### 7. conditional
Can be either a boolean or an array.
```js
let options = {
  conditional: true | false
}
```
```js
let options = {
  conditional: ['finance', 'payroll']
}
```
#### 8. separator
Filter field that defines the delimiter that splits each property for the search term.
```js
let options = {
    filterFields: {
        year: {
            separator: ','
        }
    }
}
```
#### 9. minimum
Minimum number of options for a filter to show
```js
let options = {
    event: {
        minimum: 1,
    }
}
```
### sortFields 
This property shows an array of labels of the fields to sort search results by. Put a '-' before the label for reverse ordering.
```js
let options = {
    sortFields: ['-year']
    }
```
### pagination
Configuration options for pagination.js.
```js
let options = {
      pagination: {
        pageSize: 20
      },
  }
```
### resultPlaceholder
 This function defines the template for the placeholder result. Using this means actual results will not display until a search is performed, and this placeholder will be there until then.
```js
resultPlaceholder: function () { },
```
### filterCallback
Additional data filtering before printing results.
```js
filterCallback: function () { },
```

#### callback: function (data, searchTool)
Additional processing at the end of build.
```js
callback: function (data, searchTool) { },
```
#### resultsCallback: function (results)
Additional processing after results are rendered. Useful for attaching events to elements in result markup.

#### dataCallback: function (data) { return data }
Run additional function from configuration to prepare or select data.

In the example below, it's used to extract regex data from the API. Users can use the extracted data to return relevant results.
```js
let options = {
    dataCallback: (data) => {
        data.forEach(set => {
          let dateRegex = /(\w+) (\d{4})$/
          let displayDateRegex = /(\d+) (\w+) (\d{4})/

          let regexMonth = set.title.match(dateRegex)[1]
          let regexYear = set.title.match(dateRegex)[2]

          set.month = ""
          if (months.includes(regexMonth)) {
            set.month = regexMonth
          }
          set.year = regexYear

          set.resources.forEach(resource => {
            regexProperty(displayDateRegex, "date", 0)
          }
          )
        });
        return data
      },
```


### Pagination
Configuration options for pagination.js.
```js
let options = {
      pagination: {
        pageSize: 20,
      },
  }
```

