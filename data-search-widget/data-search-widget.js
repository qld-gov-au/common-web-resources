(function ($) {
  $.fn.searchTool = function (config) {
    var container = $(this)
    var config = $.extend({}, $.fn.searchTool.defaults, config)
    var searchTool = {
      container: container,
      scripts: {
        csv: {
          script: 'https://cdnjs.cloudflare.com/ajax/libs/jquery-csv/1.0.11/jquery.csv.min.js',
          loaded: false
        },
        pagination: {
          script: 'https://cdnjs.cloudflare.com/ajax/libs/paginationjs/2.6.0/pagination.min.js',
          loaded: false
        },
        select2: {
          script: 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js', //'./?a=60482',
          loaded: false
        }
      },
      initialize: function () {
        // If no dataUrls have been given, log an error.
        if (config.dataSources.length === 0) {
          console.error('Search tool error: no data locations have been provided.')
          return
        }

        // Get all data and merge into a single array.
        var returnedData = []
        for (var url in config.dataSources) {
          returnedData.push($.get(config.dataSources[url].url))
        }

        // When array of data is ready, merge data and call processes.
        $.when.apply(this, returnedData).done(function () {
          // If no data is returned, log an error.
          if (returnedData.length === 0) {
            console.error('Search tool error: no data was retrieved.')
            return
          }

          var resultData = []
          if (returnedData.length > 1) {
            for (var arg in arguments) {
              var values = arguments[arg][0]
              resultData.push(values)
            }
          }
          else {
            resultData.push(arguments[0])
          }

          $.getScript(searchTool.scripts.csv.script).then(function () {
            searchTool.scripts.csv.loaded = true
            var data = []
            for (var resultSet in resultData) {
              var dataObject = []
              // If data is given as a string (e.g. from CSV).
              if (typeof resultData[resultSet] === 'string') {
                // Remove empty rows of data.
                var cleanString = $.csv.parsers.splitLines(resultData[resultSet])
                  .filter(function (line) { return RegExp(/\w/).test(line) })
                  .join('\n')
                // Convert string data to objects.
                dataObject = $.csv.toObjects(cleanString)
              }
              // If data is an object and results location is given.
              else if (config.dataSources[resultSet]['results'] && config.dataSources[resultSet]['results'].length) {
                dataObject = searchTool.helpers.fromString(resultData[resultSet], config.dataSources[resultSet]['results'])
              }
              // Otherwise use object data as is.
              else {
                dataObject = resultData[resultSet]
              }
              // Merge data.
              $.merge(data, dataObject)
            }

            // Run additional function from configuration to prepare or select data.
            data = config.dataCallback(data)

            // Standardise data keys to camel case.
            data = searchTool.helpers.standardiseKeys(data)
            // Add flattened version of filter fields to searchTool.
            searchTool.flatFilterFields = []
            searchTool.helpers.flattenFields(config.filterFields, searchTool.flatFilterFields)
            // Convert string data to arrays if applicable.
            data = searchTool.helpers.dataStringToArray(data, config.filterFields)

            // Create a unique id for the search widget that gives context.
            var uniqueId = searchTool.helpers.uniqueId('search-form')

            // Build base search widget.
            if (!config.hideSearchWidget) {
              container.append(searchTool.build.widget(uniqueId))

              // Create filter fields.
              $.each(config.filterFields, function (name, settings) { searchTool.build.filters(data, name, settings) })
            }

            // Sort data by specified field/s.
            if (config.sortFields) {
              data.sort(searchTool.helpers.dynamicSort(config.sortFields))
            }

            // Add actions to search form buttons.
            searchTool.actions(data, uniqueId)

            // Add results container.
            container.append(searchTool.build.results())

            // Add pager and page summary.
            searchTool.build.pager().insertAfter('.results')
            searchTool.build.pageSummary().insertBefore('.results')

            if (config.prefilter) {
              // TODO: can this leverage existing filter logic?
              if (config.hideSearchWidget) {
                let filteredItems = []
                $.each(config.prefilter, (key, values) => {
                  $.each(data, (i, item) => {
                    let match = true

                    if (!Array.isArray(values)) {
                      values = [values]
                    }
                    $.each(values, (i, value) => {
                      if (Array.isArray(item[key])) {
                        if (!item[key].includes(value)) {
                          match = false
                        }
                      }
                      // else if (value !== item[key]) {
                      else if (!new RegExp(value,'i').test(item[key])) {
                        match = false
                      }
                    })

                    if (match) {
                      filteredItems.push(item)
                    }
                  })
                })

                searchTool.template.printResults(filteredItems.slice(0,config.pagination.pageSize))
              }
              else {
                $.each(config.prefilter, (key, values) => {
                  // TODO: test if this works for multi-select/multi-values
                  console.log('values', values)
                  if (Array.isArray(values)) {
                    if (searchTool.flatFilterFields[key].multi) {
                      $.each(values, (i, value) => {
                        console.log(i, value)
                        $(`#${key}-filter option[value=${value}]`, searchTool.container).prop('selected', true)
                      })
                      $(`#${key}-filter option[value=${values}]`, searchTool.container).prop('selected', true)
                    }
                    else {
                      $(`#${key}-filter option[value=${values[0]}]`, searchTool.container).prop('selected', true)
                    }
                  }
                  else {
                    $(`#${key}-filter option[value=${values}]`, searchTool.container).prop('selected', true)
                  }
                })

                $('form', searchTool.container).submit()
              }
            }
            else if (config.placeholderTemplate) {
              // Show placeholder card on initial load.
              searchTool.template.resultPlaceholder()
            }
            else {
              // Render all results on initial load.
              searchTool.template.paginate(data)
            }

            // Return data for other deferred functions to use.
            return data
          }) // $.getScript(scripts.csv).then()
            .then(function (data) {
              // After build is finished, run the optional callback.
              config.callback(data, searchTool)

              // Use select2 for multi-select filters.
              for (var field in searchTool.flatFilterFields) {
                if (!searchTool.scripts.select2.loaded && searchTool.flatFilterFields[field].type === 'select' && searchTool.flatFilterFields[field].multi) {
                  $.getScript(searchTool.scripts.select2.script).done(function () {
                    // Load select2 css.
                    $('<link>', {
                      rel: 'stylesheet',
                      type: 'text/css',
                      href: 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css' //'./?a=60483'
                    }).appendTo('head')

                    // Apply select2 to multi-select inputs.
                    $('select[multiple]', searchTool.container).select2({ selectionCssClass: 'form-control' })

                    // Make reset button clear select2 inputs.
                    $('button[type=reset]').click(function () {
                      $('select[multiple]', searchTool.container).val(null).trigger('change')
                    })

                    // Flag select2 as loaded to prevent unnecessary requests.
                    searchTool.scripts.select2.loaded = true
                  })
                }
              }

              // if (multiSelect) {
              // }

            }) // config.callback()
        }) // $.when.apply().done()
      }, // initialize
      build: {
        widget: function (uniqueId) {
          // Create search widget.
          let widget_wrapper = $('<div>').addClass('qg-search-widget-qgds'),
              widget = $('<div>').addClass(['qg-search-widget', 'border']).attr('id', uniqueId),
              title = config.title.length ? $('<h2>').text(config.title) : '',
              form = $('<form>').addClass('search-form').attr('novalidate', '')

          if (config.keywords) {
            var kwFieldset = $('<fieldset>').attr('id', 'keywords-input')
            var kwLabel = $('<label>').attr('for', 'keywords-filter').text('Keywords').addClass('qld-text-input-label')
            var kwInput = $('<input>').addClass('form-control form-text search-keywords').attr({ id: 'keywords-filter', type: 'text' })
            kwFieldset.append(kwLabel, kwInput)
            form.append(kwFieldset)
          }

          if (config.filterFields) {
            var filtersContainer = $('<fieldset>').attr('id', 'filters')
            form.append(filtersContainer)
          }

          var actions = $('<fieldset>').addClass('actions')
          var submit = $('<button type="submit">').addClass('btn btn-primary').text(config.submitLabel)
          var reset = $('<button type="reset">').addClass('btn btn-link').text(config.resetLabel)

          actions.append(submit, reset)
          form.append(actions)

          // Trigger form reset on click of reset button (qg-main.js currently blocks default behaviour of button).
          reset.on('click', function () { form.trigger('reset') })

          widget.append(title, form)
          widget_wrapper.append(widget)
          return widget_wrapper
        },
        filters: function (data, name, settings, parent, changed) {
          parent = parent || null
          var fieldset = $('<fieldset>').attr('id', name + '-input').addClass('form-item')
          var label = $('<label>').attr('for', name + '-filter').text(settings.label).addClass('qld-text-input-label')
          var invalid = ''
          var input

          switch (settings.type) {
            case 'check':
              if (settings.multi) {
                fieldset.addClass('form-checkboxes')
              }
              input = searchTool.build.filterType.check(data, name, settings, parent, changed)
              break
            case 'select':
              input = searchTool.build.filterType.select(data, name, settings, parent, changed)
              break
            // TODO: any other filter types?
          }

          // If an input has been created, set up the fieldset and add it to the form.
          if (input) {
            if (settings.required) {
              var asterisk = $('<span>').addClass('form-required').attr('title', 'This field is required.').text('*')
              label.append(asterisk)
              invalid = $('<div>').addClass('invalid-feedback').text('Must be completed')
            }
            else {
              input.attr('no-validate', '')
            }
            if (parent) {
              $('.search-form #' + parent + '-input').append(fieldset.append(label, input))
            }
            else {
              $('#filters').append(fieldset.append(label, input, invalid))
              // fieldset.append(label, input, invalid).insertBefore('.search-form .actions')
            }

            if (settings.dependents) {
              parent = name
              input.change(function () {
                var parentValue = input.val()
                // Filter out data that doesn't match the parent filter value.
                var filteredData = data.filter(function (item) {
                  if (Array.isArray(item[parent])) {
                    return $.inArray(parentValue, item[parent].map(function (item) { return item.trim() })) > -1
                  }
                  else {
                    return $.inArray(parentValue, item[parent].split(',').map(function (item) { return item.trim() })) > -1
                  }
                })
                $.each(settings.dependents, function (name, settings) {
                  // Remove the filter if it already exists.
                  $('#' + name + '-input').remove()
                  // Create a new filter with the relevant info.
                  searchTool.build.filters(filteredData, name, settings, parent)
                })
              })
            }

            if (settings.siblingFilter) {
              input.change(function () {
                var filteredData = data

                if (parent && parent !== name) {
                  // Filter out data that doesn't match the parent filter value.
                  const parentEl = $('#' + parent + '-filter')

                  filteredData = data.filter(function (item) { return item[parent] === parentEl.val() })
                }
                const value = input.val(),
                  flatFields = searchTool.flatFilterFields
                const siblingFields = parent ? flatFields[parent].dependents : config.filterFields,
                  siblingKeys = Object.keys(siblingFields).filter(function (key) { return key !== name })


                $.each(siblingKeys, function (i, key) {
                  const siblingFields = flatFields[parent] ? flatFields[parent].dependents : config.filterFields,
                    sibling = {
                      key: key,
                      settings: flatFields[key],
                      position: $.inArray(key, Object.keys(siblingFields)),
                      get element() { return $('#' + this.key + '-filter') },
                      get parent() { return this.element.parent() },
                      get value() { return this.element.val() }
                    }
                  var initialValue = sibling.value,
                    initialPosition = sibling.position

                  sibling.parent.remove()
                  searchTool.build.filters(filteredData, sibling.key, sibling.settings, parent, input)
                  sibling.parent.insertBefore($('fieldset', sibling.parent.parent())[initialPosition])

                  if (initialValue) {
                    $('option[value="' + initialValue + '"]', sibling.element).attr('selected', 'selected')
                  }
                  else if ($('option', sibling.element).length === 2) {
                    $('option', sibling.element).eq(1).attr('selected', 'selected')
                  }
                })
              })
            }
          }
        },
        filterType: {
          getOptions: function (data, name, settings, parent, changed) {
            var options = []
            // If settings specify options, create them.
            if (settings.options) {
              // If options are a plain array, only return the value.
              if ($.isArray(settings.options)) {
                options = $.map(settings.options, function (value, index) { return value })
              }
              // If options are an object, return value and label.
              else {
                options = $.map(settings.options, function (label, value) { return { value: value, label: label } })
              }
            }
            else {
              if (settings.conditional) { // If field is conditional...
                var parentValue = $('#' + parent + '-filter').val()
                if (settings.conditional.length) { // ...and conditional values are set...
                  if (Array.isArray(settings.conditional)) { // ...and values are in an array...
                    var match = false
                    // Compare the parent filter's value against the conditional values.
                    $.each(settings.conditional, function (i, condition) {
                      if (parentValue.toLowerCase() === condition.toLowerCase()) {
                        match = condition
                      }
                    })
                    if (!match) {
                      return false
                    }
                  }
                  else { // ...and value is a string...
                    if (parentValue.toLowerCase() !== settings.conditional.toLowerCase()) {
                      return false
                    }
                  }
                }
              }
              if (settings.data && settings.data.type === 'array') {
                var combined = []
                data.forEach(function (item) {
                  if (item[name]) {
                    // Merge into combined array.
                    $.merge(combined, item[name])
                  }
                })
                // Filter duplicate values.
                combined = combined.filter(function (entry, index, array) { return array.indexOf(entry) === index })
                options = combined.sort()
              }
              else if (settings.siblingFilter && changed && changed.val()) {
                // Filter out items that don't match the value of the changed input, then map the relevant field options.
                options = data.filter(function (item) { return item[changed.attr('name')] === changed.val() })
                  .map(function (item) { return item[name].trim() })
                  .filter(function (item, index, array) { return !!item && array.indexOf(item) === index })
              }
              else {
                options = data.map(function (item) { return item[name].trim() })
                  .filter(function (item, index, array) { return !!item && array.indexOf(item) === index })
              }
            }

            if (settings.sort === false) {
              return options
            }
            else if (settings.sort === 'reverse') {
              return options.sort().reverse()
            }
            else if (settings.sort === 'numeric') {
              return options.sort((a, b) => a - b)
            }
            else if (settings.sort === 'numeric-reverse') {
              return options.sort((a, b) => b - a)
            }
            else {
              return options.sort()
            }

          },
          check: function (data, name, settings, parent, changed) {
            parent = parent || null
            var options = searchTool.build.filterType.getOptions(data, name, settings, parent, changed)

            // Check that minimum number of option exists (or at least one).
            if (options.length >= (settings.minimum || 1)) {
              var checkGroup = $('<div>').addClass('form-check-group')
              $.each(options, function (index, option) {
                var container = $('<div>').addClass('form-check')
                var checkId = name + '-' + (option.value || option).toLowerCase().replaceAll(' ', '-')
                var checkName = name
                var checkbox = $('<input>').attr({
                  type: settings.multi ? 'checkbox' : 'radio',
                  id: checkId,
                  name: checkName,
                  value: option.value || option,
                  class: 'form-check-input',
                })

                // If a default option is configured, set it to checked.
                if (settings.default && settings.default === checkbox.val()) {
                  checkbox.attr('checked', '')
                }

                // TODO: required for checkbox/radio
                // if (settings.required) {
                //   checkbox.attr('required', true)
                // }

                var label = $('<label>').attr({
                  for: checkId,
                  class: 'form-check-label',
                }).text((option.label || option))

                container.append(checkbox, label)

                checkGroup.append(container)
              })

              return checkGroup
            }
            return false

          },
          select: function (data, name, settings, parent, changed) {
            parent = parent || null
            var select = $('<select>').attr({
              id: name + '-filter',
              name: name,
              class: 'form-control',
            })
            if (settings.required) {
              select.attr('required', true)
            }
            if (settings.multi) {
              select.attr('multiple', true)
              // TODO: Multi-select values are given as an array. Need to update how parent value/s
              // are checked against conditional value/s.
            }
            else {
              // If no default option is specified, add a placeholder option.
              if (!settings.default) {
                const optionText = settings.defaultText || name,
                  defaultText = `—Select a${$.inArray(optionText.slice(0, 1), ['a', 'e', 'i', 'o', 'u']) > -1 ? 'n ' : ' '}${optionText}—`,
                  defaultOption = $('<option selected value>').text(defaultText)
                select.append(defaultOption)
              }
            }

            var options = searchTool.build.filterType.getOptions(data, name, settings, parent, changed)
            // Check that minimum number of option exists (or at least one).
            if (options.length >= (settings.minimum || 1)) {
              var template = options.map(function (option) {
                const element = $('<option>')
                if (typeof option == 'string') {
                  element.val(option).text(option)
                }
                else {
                  element.val(option.value).text(option.label)
                }

                // If a default option is configured, set it to selected.
                if (settings.default && settings.default === element.val()) {
                  element.attr('selected', '')
                }

                return element
              })

              select.append(template)
              return select
            }
            return false
          },
        },
        results: function () {
          return $('<div>').addClass('results row row-cols-1 g-4')
        },
        pager: function () {
          return $('<nav>').addClass('pager')
        },
        pageSummary: function () {
          return $('<div>').addClass('page-summary').insertBefore('.results')
        },
      },
      actions: function (data, uniqueId) {
        var searchActions = {
          submit: function (event) {
            event.preventDefault()
            $(this).closest('form').addClass('was-validated')
            if ($(':required', $(this)).length) {
              var valid = true
              $(':required', $(this)).each(function () {
                if (!$(this).val().length) { valid = false }
              })
              if (valid) {
                searchActions.filterItems(data)
              }
            }

            else if ($(':invalid', $(this)).length) {
              var invalid = $('<div>').addClass('invalid-feedback').text('Must be completed')
              $(':invalid', $(this)).append(invalid)
            }
            else {
              searchActions.filterItems(data)
            }
          },
          reset: function () {
            var context = '#' + uniqueId

            $('.results', context).empty()

            $.each(config.filterFields, function (filter) {
              if (config.filterFields[filter].dependents) {
                $.each(Object.keys(config.filterFields[filter].dependents), function (key, fieldName) { $('#' + fieldName + '-input').remove() })
              }
            })

            if (config.placeholderTemplate) {
              searchTool.template.resultPlaceholder()
            }
            else {
              searchTool.template.paginate(data)
            }
          },
          filterItems: function (items) {
            var context = '#' + uniqueId
            var keywords = $('.search-keywords').val() || ''
            var filters = $('input:not(.search-keywords):not([type=checkbox]):not([type=radio]), select:not([multiple]), input[type=radio]:checked', context)
            var multiFilters = $('.form-checkboxes, select[multiple]', context)
            var results = []
            var fieldsArray = searchTool.flatFilterFields

            // Filter out empty entries and extract only the properties needed for filtering.
            filters = filters.filter(function (index, filter) {
              return filter.value
            }).map(function (index, filter) {
              return { name: filter.name, value: filter.value }
            })

            if (filters.length || multiFilters.length) {
              var multiFiltered = items
              if (multiFilters.length) {
                $.each(multiFilters, function (i, filter) {
                  var selected = []
                  if (filter.tagName === 'SELECT') {
                    $.each(filter.options, function (i, option) {
                      if (option.selected) {
                        selected.push({ name: filter.name, value: option.value })
                      }
                    })
                  }
                  else {
                    $.each($('input:checked', filter), function (i, input) {
                      selected.push({ name: input.name, value: input.value })
                    })
                  }
                  if (selected.length) {
                    // If field config specifies 'and' operator, use andFilter()...
                    if (fieldsArray[selected[0].name].multi && fieldsArray[selected[0].name].multiOperator === 'and') {
                      multiFiltered = searchActions.andFilter(selected, multiFiltered)
                    }
                    // ...otherwise use orFilter() by default.
                    else {
                      multiFiltered = searchActions.orFilter(selected, multiFiltered)
                    }
                  }
                })
              }

              var filteredItems = multiFiltered
              if (filters.length) {
                $.each(filters, function (key, filter) {
                  filteredItems = searchActions.andFilter([filter], filteredItems)
                })
              }
              else {
                filteredItems = multiFiltered
              }
            }
            else {
              filteredItems = items
            }

            if (keywords.length) {
              if (keywords.indexOf(' ')) {
                var terms = keywords.split(' ')
                var regexp = terms.map(function (term) {
                  return '(?=.*' + term + ')'
                })
                keywords = new RegExp('(' + regexp.join('') + '.*)', 'i')
              }
              else {
                keywords = new RegExp(keywords, 'i')
              }

              var results = filteredItems.filter(function (item) {
                var searchFields = $.map(config.keywordFields, function (field) {
                  return item[field]
                }).join(' ')

                return keywords.test(searchFields)
              })
            }
            else {
              results = filteredItems
            }

            // Run additional filtering function from configuration.
            if (config.filterCallback.length) {
              results = config.filterCallback(results)
            }

            $('.results').empty()
            if (results.length) {
              searchTool.template.paginate(results)
            }
            else {
              $('.results').append(
                '<div id="no-results">' +
                '<h3>No results found</h3>' +
                '<p>We couldn\'t find any matching results.</p>' +
                '</div>')
              $('.page-summary, .pager').hide()
            }

            $('#search-form .was-validated').removeClass('was-validated')
          }, // filterItems()
          orFilter: function (values, items) {
            var filteredItems = []
            $.each(items, function (i, item) {
              var match = false
              $.each(values, function (i, value) {
                if (Array.isArray(item[value.name])) {
                  if (item[value.name].includes(value.value)) {
                    match = true
                  }
                }
                else if (value.value === item[value.name]) {
                  match = true
                }
              })
              if (match) {
                filteredItems.push(item)
              }
            })
            return filteredItems
          }, // orFilter
          andFilter: function (values, items) {
            var filteredItems = []
            $.each(items, function (i, item) {
              var match = true
              $.each(values, function (i, value) {
                // console.log(value.value, item[value.name])
                if (Array.isArray(item[value.name])) {
                  // console.log('is array')
                  if (!item[value.name].map(entry => entry.toUpperCase()).includes(value.value.toUpperCase())) {
                    match = false
                  }
                }
                else if (value.value !== item[value.name]) {
                  match = false
                }
              })
              // console.log(match)
              if (match) {
                filteredItems.push(item)
              }
            })
            return filteredItems
          }, // andFilter
        }

        $('.search-form').submit(searchActions.submit)
        $('.search-form').on('reset', searchActions.reset)
      },
      template: {
        paginate: function (data) {
          const paginationOptions = {
            dataSource: data,
            pageSize: config.pagination.pageSize,
            autoHidePrevious: true,
            autoHideNext: true,
            prevText: 'Previous',
            prevClassName: 'previous',
            nextText: 'Next',
            nextClassName: 'next',
            ulClassName: 'pagination',
            callback: function (data, pagination) {
              searchTool.template.pageSummary(pagination, data.length)
              searchTool.template.printResults(data)

              $('.pagination li').addClass('page-item')
              $('.pagination li a').addClass('page-link')
              $('.pager, .page-summary').show()
              if (config.pagination.hidePagination ||
                  pagination.totalNumber <= pagination.pageSize) {
                $('.pager').hide()
              }
              if (config.pagination.hidePageSummary ||
                  pagination.totalNumber === 0) {
                $('.page-summary').hide()
              }

              $('.pager a').click(searchTool.helpers.scrollUp)
            }
          }
          if (!searchTool.scripts.pagination.loaded) {
            $.getScript(searchTool.scripts.pagination.script).done(function () {
              searchTool.scripts.pagination.loaded = true
              $('.pager').pagination(paginationOptions)
            })
          }
          else {
            $('.pager').pagination(paginationOptions)
          }
        }, // paginate
        pageSummary: function (pagination, length) {
          var pageStart = pagination.totalNumber > 0 ? (pagination.pageNumber - 1) * pagination.pageSize + 1 : 0
          var pageEnd = pageStart > 0 ? pageStart + (length - 1) : 0
          var pageSummary =
            'Displaying results <span>' +
            pageStart +
            '</span> to <span>' +
            pageEnd +
            '</span> of ' +
            pagination.totalNumber
          $('.page-summary').empty().append(pageSummary)
        }, // pageSummary
        printResults: function (results) {
          var templateData = config.resultTemplate.data(results)
          var template = config.resultTemplate.markup

          $('.results').empty().append(templateData.map(template).join(''))

          config.resultsCallback(results)
        }, // printResults()
        resultPlaceholder: function () {
          $('.page-summary, .pager').hide()
          $('.results').empty().append(config.placeholderTemplate())
        }
      }, // template
      helpers: {
        toDashCase: function (str) { return str.replace(/[()]/g, '').replace(/\s/g, '-').toLowerCase(); }, // toDashCase
        toCamelCase: function (str) {
          return str
            .replace(/(?:^\w|[A-Z]|\b\w)/g, function (ltr, idx) { return idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase() })
            .replace(/[\W_]+/g, '')
        }, // toCamelCase
        toTitleCase: function (str) { return str.replace(/(?:^|\s)\w/g, function (match) { return match.toUpperCase() }) },
        dynamicSort: function (properties) {
          if (!properties) {
            return
          }

          // Dynamic sort on multiple fields - https://stackoverflow.com/a/11379791/8631382
          return function (a, b) {
            let i = 0, result = 0

            while (i < properties.length && result === 0) {
              result = sortCompare(properties[i])(a, b)
              i++
            }
            return result
          }

          function sortCompare(property) {
            return function (a, b) {
              if (property[0] === '-') {
                property = property.substr(1)
                return (a[property] > b[property] ? -1 : a[property] < b[property] ? 1 : 0)
              } else {
                return (a[property] > b[property] ? 1 : a[property] < b[property] ? -1 : 0)
              }
            }
          }
        }, // dynamicSort
        scrollUp: function () {
          $('html, body').animate({
            scrollTop: $('.qg-search-widget').offset().top - 32
          }, 750)
        }, // scrollUp
        standardiseKeys: function (data) {
          return data.map(function (item) {
            for (key in item) {
              var newKey = searchTool.helpers.toCamelCase(key)
              if (newKey != key) {
                item[newKey] = item[key]
                delete item[key]
              }
            }
            return item
          })
        }, // standardiseKeys
        uniqueId: function (id) {
          if ($('#' + id).length) {
            if (RegExp(/\d/).test(id.substr(-1))) {
              var numerator = parseInt(id.substr(-1)) + 1
              id = id.substr(0, id.length - 1) + numerator.toString()
            }
            else {
              id = id + '-1'
            }
          }
          if ($('#' + id).length) {
            id = uniqueId(id)
          }

          return id
        }, // uniqueId
        dataStringToArray: function (data, fields) {
          var flatFields = searchTool.flatFilterFields

          var arrayFields = []
          for (var field in flatFields) {
            if (flatFields[field].data && flatFields[field].data.type === 'array') {
              arrayFields[field] = flatFields[field].data.separator
            }
          }

          data = data.map(function (item) {
            for (var field in arrayFields) {
              if (item[field]) {
                item[field] = item[field].split(arrayFields[field])
                  .map(function (entry) { return entry.trim() })
                  .filter(function (entry) { return entry.length > 0 })
              }
            }
            return item
          })

          return data
        }, // dataStringToArray
        flattenFields: function (fields, array) {
          $.each(fields, function (key, field) {
            array[key] = field
            if (field.dependents) {
              searchTool.helpers.flattenFields(field.dependents, array)
            }
          })
          return array
        }, // flattenFields
        fromString: function (object, string) {
          // From: https://stackoverflow.com/a/6491621/8631382
          string = string.replace(/\[(\w+)\]/g, '.$1'); // convert indices to properties
          string = string.replace(/^\./, '');           // strip leading dot
          var array = string.split('.')
          for (var i = 0, n = array.length; i < n; ++i) {
            var key = array[i]
            if (key in object) {
              object = object[key]
            } else {
              return
            }
          }
          return object
        }, // fromString
        formatDate: function (date) {
          var months = {
            'Jan': '01',
            'Feb': '02',
            'Mar': '03',
            'Apr': '04',
            'May': '05',
            'Jun': '06',
            'Jul': '07',
            'Aug': '08',
            'Sep': '09',
            'Oct': '10',
            'Nov': '11',
            'Dec': '12',
          }
          var dateComponents = date.split('-')
          var day = ('0' + dateComponents[0]).slice(-2)
          var month = months[dateComponents[1]]
          var year = dateComponents[2]
          return new Date('20' + [year, month, day].join('-'))
        } // formatDate
      }, // helpers
    }

    // Start building...
    $(searchTool.initialize())

    return searchTool
  }

  $.fn.searchTool.defaults = {
    title: 'Search',
    keywords: true,
    submitLabel: 'Search', // Text for submit button.
    resetLabel: 'Clear', // Text for reset button.
    hideSearchWidget: false, // Option to not display search filters.
    prefilter: false, // Option to prefilter displayed results. Configure as object e.g. { <filter-name>: <value> }
    pagination: { // Configuration options for pagination.js.
      pageSize: 10,
      hidePagination: false, // When true pagination will not be displayed.
      hidePageSummary: false // When true, page summary will not be displayed.
    },
    resultTemplate: {
      data: function (results) {
        $('.results').append('<div class="card bg-warning"><div class="card-body"><p>The results template has not been created.</p></div></div>')
        return results.map(function (entry) {
          // Define and prepare markup for results.
          // e.g. var buttonLabel = entry.type.substr(9)
          var array = {}
          $.each(entry, function (key, val) {
            array[key] = val
          })
          // Return array of prepared markup items e.g.
          // return {
          //   title: entry.title,
          // }
          return array
        })
      },
      markup: function (result) {
        var items = []
        $.each(result, function (key, val) {
          items.push('<li>' + key + ': ' + val + '</li>')
        })

        var markup =
          '<div class="card">' +
          '<div class="card-body">' +
          '<p>The results template has not been created.</p>' +
          '<div class="card-title">Data</div>' +
          '<ul>' +
          items.join('') +
          '</ul>' +
          '</div>' +
          '</div>'
        return markup
      },
    },
    resultPlaceholder: function () { }, // Define the template for placeholder result. Using this means actual results will not display until a search is submitted.
    sortFields: [], // Array of labels of the fields to sort results by. Put a '-' before the label for reverse ordering.
    filterCallback: function () { }, // Additional data filtering before printing results.
    callback: function (data, searchTool) { }, // Additional processing at the end of build.
    resultsCallback: function (results) { }, // Additional processing after results are rendered. Useful for attaching events to elements in result markup.
    dataCallback: function (data) { return data } // Run additional function from configuration to prepare or select data.
  }
})(jQuery)
