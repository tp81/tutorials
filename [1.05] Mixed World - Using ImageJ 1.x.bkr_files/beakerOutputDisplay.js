/*
 *  Copyright 2015 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function (window, document, undefined) {

var factory = function ($, DataTable) {
"use strict";

var HeaderMenu = function(dt, options) {

  this.s = {
    dt: new DataTable.Api(dt)
  };

  this.c = options;

  this.dom = {
    container:  null,
    menu:       null
  };

  this._constructor();
};

HeaderMenu.prototype = {

  _constructor: function ()
  {
    var that = this;
    var dt = this.s.dt;
    var dtSettings = dt.settings()[0];
    var headerLayout = dtSettings.aoHeader;

    this._appendMenuContainer();
    this._buildMenuData(headerLayout);

    var clickHandler = function(e) {
      var $container = that.dom.container;
      var targetClass = $(e.target).attr('class');
      var toggleClass = 'bko-column-header-menu';

      if ($container[0] != e.target && !$.contains($container[0], e.target) &&
         (!targetClass || targetClass.indexOf(toggleClass) < 0)) {
        that._hide();
      }
    };

    $(document.body).on('click.table-headermenu', clickHandler);
    dtSettings.oApi._fnCallbackReg(dtSettings, 'aoDestroyCallback', $.proxy(this._destroy, this), 'HeaderMenu');

  },

  _appendMenuContainer: function()
  {
    var node = this.s.dt.table().container();
    var $container = $("<div/>", { 'class': 'dropdown bko-header-menu' });

    $(node).before($container);
    this.dom.container = $container;
  },

  /**
   * @param layout {object} should be Array with header layout in it
   */
  _buildMenuData: function(layout)
  {
    if (!$.isArray(layout)) {
      return;
    }

    var cells = layout[0];
    var cols = this.c;

    for (var i = 0, ien = cells.length; i < ien ; i++) {
      var cell = cells[i];

      if (cols && cols[i] !== undefined) {
        this._buildCellMenu(cell, cols[i]);
      }
    }

    var that = this;

    $(this.s.dt.table().container()).on('click.headermenu', '.bko-column-header-menu', function(e) {
      $('.dropdown-menu').removeAttr('style');
      var colIdx = $(this).parent().index();
      var fixedCols = that.s.dt.settings()[0]._oFixedColumns;
      var rightHeader = fixedCols ? fixedCols.dom.clone.right.header : null;
      if (rightHeader && $(rightHeader).has(this).length) {
        colIdx = that.s.dt.columns(':visible')[0].length - fixedCols.s.rightColumns + colIdx;
      }
      var jqHeaderMenu = $(that.s.dt.column(colIdx + ':visible').header()).find(".bko-column-header-menu");
      if (that.dom.menu) {
        that._hide();
        if(colIdx !== that.dom.container.data('columnIndex')){
          that._show($(jqHeaderMenu));
        }
      } else {
        that._show($(jqHeaderMenu));
      }
    });
  },

  /**
   * @param col {object} current column header configuration
   * @param oCell {object} layout cell object
   */
  _buildCellMenu: function (oCell, col)
  {
    var menu = col.header && col.header.menu;
    var cell = oCell.cell;
    var $el = $("<span/>", { 'class': 'bko-menu bko-column-header-menu' });

    if (cell && menu && $.isArray(menu.items)) {
      $el.data('menu', menu.items)
      $(cell).append($el);
    }
  },

  _hide: function()
  {
    if (this.dom.menu) {
      this.dom.menu.remove();
      this.dom.menu = null;
    }
  },

  _show: function(el)
  {
    var that = this;
    var menuItems = el.data('menu');
    var colIdx = that.s.dt.column(el.parent().index() + ':visible').index();

    if ($.isArray(menuItems)) {
      var $menu = $("<ul/>", { 'class': 'dropdown-menu' });
      var node = this.dom.container;
      node.data('columnIndex', colIdx);

      that._buildMenuItems(menuItems, $menu);

      $menu.css('top', el.height() + 1)
      .css('left', el.offset().left - el.parent().offsetParent().offset().left)
      .css('display', 'block')
      .appendTo(node);
      that.dom.menu = $menu;      
    }
  },

  /**
   * @param oItems {object}
   * @param container {node} should be <ul> dropdown-menu container
   */
  _buildMenuItems: function (oItems, container)
  {
    var that = this;
    if (!$.isArray(oItems)) {
      return;
    }

    for (var i = 0, ien = oItems.length; i < ien; i++) {
      var oItem = oItems[i];

      var subitems = (typeof oItem.items == 'function') ? oItem.items(that.dom.container) : oItem.items;
      var hasSubitems = $.isArray(subitems) && subitems.length;

      var $li = $('<li/>', {'class': hasSubitems ? 'dropdown-submenu' : ''});
      var $item = $('<a/>')
        .attr('href', '#')
        .attr('tabindex', '-1')
        .attr('id', 'dt-select-all')
        .text(oItem.title)
        .data('action', oItem.action || '')
        .bind('click', function(e) {
          that._handleItemClick($(this));
          e.preventDefault();
          e.stopPropagation();
        });
      if (oItem.shortcut) {
        var $shortcut = $('<span/>', {'class': 'menu-shortcut'}).text(oItem.shortcut);
        $item.append($shortcut);
      }

      if (oItem.separator) {
        $item.addClass('menu-separator');
      }

      $li.append($item);

      if (oItem.icon) {
        var $icon = $('<i/>', {'class': oItem.icon});
        $li.append($icon);
      }

      if (!_.isEmpty(oItem.tooltip)) {
        $li.attr('title', oItem.tooltip);
      }

      if (typeof oItem.isChecked == 'function' && oItem.isChecked(that.dom.container)) {
        var $glyph = $('<i/>', {'class': 'glyphicon glyphicon-ok'});
        $li.append($glyph);
      }

      if (hasSubitems) {
        var $subContainer = $('<ul/>', { 'class': 'dropdown-menu' });
        $subContainer.appendTo($li);
        this._buildMenuItems(subitems, $subContainer);
      }

      $li.appendTo(container);
    }
  },

  _handleItemClick: function(el)
  {
    var action = el.data('action');

    if (action && action !== '' && typeof action == 'function') {
      action(el);
    }

    this._hide();
  },

  _destroy: function(){
    $(document.body).off('click.table-headermenu');
    this.dom.container.remove();
    $(this.s.dt.table().container()).find('.bko-column-header-menu').remove();
    $(this.s.dt.table().container()).off('click.headermenu');
  }
};

$.fn.dataTable.HeaderMenu = HeaderMenu;
$.fn.DataTable.HeaderMenu = HeaderMenu;


// Attach a listener to the document which listens for DataTables initialisation
// events so we can automatically initialise
$(document).on( 'init.dt.dtr', function (e, settings, json) {
  if ( e.namespace !== 'dt' ) {
    return;
  }

  var init = settings.oInit.columns;
  var defaults = DataTable.defaults.columns;

  if (init || defaults) {
    var opts = $.extend({}, init, defaults);

    if (init !== false) {
      new HeaderMenu(settings, opts);
    }
  }
});

return HeaderMenu;
}; //factory

if (  jQuery && !jQuery.fn.dataTable.HeaderMenu ) {
  // simply initialise as normal, stopping multiple evaluation
  factory( jQuery, jQuery.fn.dataTable );
}

})(window, document);

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoTableDisplay
 * This is the output display component for displaying tables.
 */
(function() {
  'use strict';
  (function($) {
    $.fn.dataTable.moment = function(format, locale) {
      var types = $.fn.dataTable.ext.type;
      // Add type detection
      types.detect.unshift(function(d) {
        // Null and empty values are acceptable
        if (d === '' || d === null) {
          return 'moment-' + format;
        }
        return (d.timestamp !== undefined && moment(d.timestamp).isValid()) ?
          'moment-' + format :
          null;
      });
      // Add sorting method - use an integer for the sorting
      types.order['moment-' + format + '-pre'] = function(d) {
        return d === '' || d === null ?
          -Infinity :
          parseInt(d.timestamp, 10);
      };
    };
  }(jQuery));

  $.fn.dataTable.moment('YYYYMMDD HH:mm:ss');
  $.fn.dataTable.moment('YYYYMMDD');
  $.fn.dataTable.moment('DD/MM/YYYY');

  $.fn.dataTable.Api.register( 'column().data().max()', function () {
    return this.length ? this.reduce( function (a, b) {
      var x = parseFloat( a ) || 0;
      var y = parseFloat( b ) || 0;
      return Math.max(x, y);
    } ) : 0;
  } );

  $.fn.dataTable.Api.register( 'column().data().min()', function () {
    return this.length ? this.reduce( function (a, b) {
      var x = parseFloat( a ) || 0;
      var y = parseFloat( b ) || 0;
      return Math.min(x, y);
    } ) : 0;
  } );

  // detect and sort by file size
  jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'file-size-pre': function(a) {
      var x = a.substring(0, a.length - 2);
      var xUnit = (a.substring(a.length - 2, a.length).toLowerCase() == 'mb' ?
          1000 : (a.substring(a.length - 2, a.length).toLowerCase() == 'gb' ? 1000000 : 1));
      return parseInt(x * xUnit, 10);
    },
    'file-size-asc': function(a, b) {
      return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'file-size-desc': function(a, b) {
      return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
  });

  var findDTColumnIndex = function(dtSettings, dtElement){
    var colInd;
    var dtCellNode = $(dtElement).closest('td').length ? $(dtElement).closest('td') : $(dtElement).closest('th');
    var fixedCols = dtSettings._oFixedColumns;
    if (dtCellNode.is('td')) {
      colInd = fixedCols.fnGetPosition(dtCellNode[0])[2];
    } else if (dtCellNode.is('th')) {
      var thInd = dtCellNode.index();
      var rightHeader = fixedCols ? fixedCols.dom.clone.right.header : null;
      if (rightHeader && $(rightHeader).has(dtCellNode).length) {
        var colsLength = 0;
        _.forOwn(dtSettings.aoColumns, function(value){
          if(value.bVisible){
            colsLength++;
          }
        });
        colInd = colsLength - fixedCols.s.rightColumns + thInd;
      } else {
        colInd = thInd;
      }
    }
    return colInd;
  };

  var findFilterInput = function (dtSettings, colInd) {
    var colsLength = 0;
    _.forOwn(dtSettings.aoColumns, function(value){
      if(value.bVisible){
        colsLength++;
      }
    });
    var fixedCols = dtSettings._oFixedColumns;
    var leftFixedHeader = fixedCols ? fixedCols.dom.clone.left.header : null;
    var rightFixedHeader = fixedCols ? fixedCols.dom.clone.right.header : null;
    var isFixedLeft = function (colInd) {
      return leftFixedHeader && fixedCols.s.leftColumns > colInd;
    };
    var isFixedRight = function (colInd) {
      return rightFixedHeader && fixedCols.s.rightColumns >= colsLength - colInd;
    };
    var jqInput;
    if (isFixedLeft(colInd)) {
      jqInput = $(leftFixedHeader).find('.filterRow th:eq(' + colInd + ') .filter-input');
    } else if (isFixedRight(colInd)) {
      var idxInRightClone = colInd - (colsLength - fixedCols.s.rightColumns);
      jqInput = $(rightFixedHeader).find('.filterRow th:eq(' + idxInRightClone + ') .filter-input');
    } else {
      var header = dtSettings.aoHeader[1][colInd];
      if (header) {
        jqInput = $(header.cell).find('.filter-input');
      }
    }
    return jqInput;
  };

  $.fn.dataTable.ext.search.push(
    function (settings, formattedRow, rowIndex, row) {

      if (!$(settings.nTHead).find('.filterRow').is(':visible')
        || $(settings.nTHead).find('.filter-input').hasClass('search-active')) {
        return true; // no filtering
      }

      var isValidJSIdentifier = function (columnTitle) {
        try {
          eval('var ' + columnTitle);
        } catch (e) { return false; }
        return true;
      };
      var formatValue = function (value) {
        if (typeof value === 'string') { return "'" + value + "'"; }
        if (value && value.type === 'Date') { return value.timestamp; }
        return value;
      };
      var evalExpression = function (expression, vars) {
        var result = true;
        if (!_.isEmpty(expression)) {
          try {
            result = eval(vars + expression);
          } catch (e) {
            if (!(e instanceof SyntaxError && e.message === 'Unexpected end of input')) {
              result = false;
              console.log(e.message);
            }
          }
        }
        return result;
      };

      var $$ = {};
      var variables = "var $ = undefined;";
      _.forEach(settings.aoColumns, function (column, index) {
        var title = $(column.sTitle).text();
        $$[title] = row[index];
        if (isValidJSIdentifier(title)) {
          variables += ('var ' + title + '=' + formatValue(row[index]) + ';');
        }
      });

      var tableFilterValue = findFilterInput(settings, 0).val();
      if (!evalExpression(tableFilterValue, variables)) {
        return false;
      }

      for (var colInd = 1; colInd < row.length; colInd++) {
        var columnFilter = findFilterInput(settings, colInd);
        if (columnFilter.hasClass('search-active')) {
          return true; //use expression parsing only for filtering
        }

        var columnFilterValue = columnFilter.val();

        if (_.isEmpty(columnFilterValue)) { continue; }

        variables += '$=' + formatValue(row[colInd]) + ';';
        if (!evalExpression(columnFilterValue, variables)) {
          return false;
        }
      }
      return true;
    }
  );

  jQuery.fn.dataTableExt.aTypes.unshift(function(sData) {
    if (typeof sData !== 'string') {
      return;
    }

    var sValidChars = '123456789';
    var Char;

    /* Check the numeric part */
    for (var i = 0; i < (sData.length - 3); i++) {
      Char = sData.charAt(i);
      if (sValidChars.indexOf(Char) == -1) {
        return null;
      }
    }
    /* Check for size unit KB, MB or GB */
    if (sData.substring(sData.length - 2, sData.length).toLowerCase() == 'kb' ||
      sData.substring(sData.length - 2, sData.length).toLowerCase() == 'mb' ||
      sData.substring(sData.length - 2, sData.length).toLowerCase() == 'gb') {
      return 'file-size';
    }
    return null;
  });

  // detect and sort by IP addresses
  jQuery.fn.dataTableExt.aTypes.unshift(function(sData) {
    if (/^\d{1,3}[\.]\d{1,3}[\.]\d{1,3}[\.]\d{1,3}$/.test(sData)) {
      return 'ip-address';
    }
    return null;
  });

  jQuery.extend(jQuery.fn.dataTableExt.oSort, {
    'ip-address-pre': function(a) {
      var m = a.split('.');
      var x = '';
      for (var i = 0; i < m.length; i++) {
        var item = m[i];
        if (item.length === 1) {
          x += '00' + item;
        } else if (item.length === 2) {
          x += '0' + item;
        } else {
          x += item;
        }
      }
      return x;
    },
    'ip-address-asc': function(a, b) {
      return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },
    'ip-address-desc': function(a, b) {
      return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
  });
  moment.tz.link(['Etc/GMT+1|GMT+01:00',
                  'Etc/GMT+2|GMT+02:00',
                  'Etc/GMT+3|GMT+03:00',
                  'Etc/GMT+4|GMT+04:00',
                  'Etc/GMT+5|GMT+05:00',
                  'Etc/GMT+6|GMT+06:00',
                  'Etc/GMT+7|GMT+07:00',
                  'Etc/GMT+8|GMT+08:00',
                  'Etc/GMT+9|GMT+09:00',
                  'Etc/GMT+10|GMT+10:00',
                  'Etc/GMT+11|GMT+11:00',
                  'Etc/GMT+12|GMT+12:00',
                  'Etc/GMT-1|GMT-01:00',
                  'Etc/GMT-2|GMT-02:00',
                  'Etc/GMT-3|GMT-03:00',
                  'Etc/GMT-4|GMT-04:00',
                  'Etc/GMT-5|GMT-05:00',
                  'Etc/GMT-6|GMT-06:00',
                  'Etc/GMT-7|GMT-07:00',
                  'Etc/GMT-8|GMT-08:00',
                  'Etc/GMT-9|GMT-09:00',
                  'Etc/GMT-10|GMT-10:00',
                  'Etc/GMT-11|GMT-11:00',
                  'Etc/GMT-12|GMT-12:00',
                  'Etc/GMT-13|GMT-13:00',
                  'Etc/GMT-14|GMT-14:00']);
  //jscs:disable
  beakerRegister.bkoDirective('Table', ['bkCellMenuPluginManager', 'bkUtils', 'bkElectron', '$interval', 'GLOBALS',
    '$rootScope','$timeout', 'cellHighlighters', 'tableService', 'bkSessionManager', 'bkCoreManager',
    function(bkCellMenuPluginManager, bkUtils, bkElectron, $interval, GLOBALS,
             $rootScope, $timeout, cellHighlighters, tableService, bkSessionManager, bkCoreManager) {
  //jscs:enable
    var CELL_TYPE = 'bko-tabledisplay';
    var ROW_HEIGHT = 27;
    var ROW_HEIGHT_ADVANCED_MODE = 22;
    var DEFAULT_PAGE_LENGTH = 25;
    var MIN_ROWS_FOR_PAGING = DEFAULT_PAGE_LENGTH;
    var FC_LEFT_SEPARATOR_CLASS = 'left-fix-col-separator';
    var FC_RIGHT_SEPARATOR_CLASS = 'right-fix-col-separator';
    var TIME_UNIT_FORMATS = {
      DATETIME:     { title: 'datetime', format: 'YYYY-MM-DD HH:mm:ss.SSS ZZ' },
      DAYS:         { title: 'date', format: 'YYYY-MM-DD' },
      HOURS:        { title: 'hours', format: 'YYYY-MM-DD HH:mm ZZ' },
      MINUTES:      { title: 'minutes', format: 'HH:mm ZZ' },
      SECONDS:      { title: 'seconds', format: 'HH:mm:ss ZZ' },
      MILLISECONDS: { title: 'milliseconds', format: 'HH:mm:ss.SSS ZZ' }
    };
    return {
      template: JST['bko-tabledisplay/output-table'],
      controller: function($scope, $uibModal) {

        $scope.id = 'table_' + bkUtils.generateId(6);
        $scope.rowsToDisplayMenu = [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']];

        $scope.showColumnMenu = {
          searchable: function(){
            return $scope.columnNames && $scope.columnNames.length > 10;
          }
        };

        $scope.getShareMenuPlugin = function() {
          return bkCellMenuPluginManager.getPlugin(CELL_TYPE);
        };
        $scope.$watch('getShareMenuPlugin()', function() {
          var newItems = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
          $scope.model.resetShareMenuItems(newItems);
        });

        $scope.exportTo = function(rows, format) {
          var data = rows.data();
          var settings = $scope.table.settings()[0];
          var rowIndexes = rows[0];
          var i;
          var j;
          var startingColumnIndex = 1;
          var order;
          var out = '';
          var eol = '\n';
          var sep = ',';
          var qot = '"';
          var fix = function(s) { return s.replace(/"/g, '""');};
          var model = $scope.model.getCellModel();
          var hasIndex = model.hasIndex === "true";
          if (hasIndex) {
            startingColumnIndex = 0;
          }

          if (format === 'tabs') {
            sep = '\t';
            qot = '';
            fix = function(s) { return s.replace(/\t/g, ' ');};
          }
          if (navigator.appVersion.indexOf('Win') !== -1) {
            eol = '\r\n';
          }

          for (i = startingColumnIndex; i < $scope.columns.length; i++) {
            order = $scope.colorder[i];
            if (!$scope.table.column(i).visible()) {
              continue;
            }
            if (out !== '') {
              out = out + sep;
            }
            var columnTitle
                = (hasIndex && i === startingColumnIndex)
                ? "Index"
                : fix($($scope.columns[order].title).text());
            out = out + qot + columnTitle + qot;
          }
          out = out + eol;

          for (i = 0; i < data.length; i++) {
            var row = data[i];
            var some = false;
            for (j = startingColumnIndex; j < row.length; j++) {
              order = $scope.colorder[j];
              if (!$scope.table.column(j).visible()) {
                continue;
              }
              if (!some) {
                some = true;
              } else {
                out = out + sep;
              }
              var d = row[j];
              if ($scope.columns[order].render !== undefined) {
                d = $scope.columns[order].render(d, 'csv', null,
                                                 {settings: settings,
                                                  row: rowIndexes[i],
                                                  col: order});
              }
              if (d == null) {
                d = '';
              }
              d = d + '';
              out = out + qot + (d !== undefined && d !== null ? fix(d) : '') + qot;
            }
            out = out + eol;
          }
          return out;
        };
        
        $scope.getCSV = function(selectedRows) {
          var data;
          var filename;
          var isFiltered = function (index) {
            return $scope.table.settings()[0].aiDisplay.indexOf(index) > -1;
          };
          if (!selectedRows) {
            data = $scope.table.rows(isFiltered).data();
          } else {
            data = $scope.table.rows(function(index, data, node) {
              return $scope.selected[index] && isFiltered(index);
            });
          }
          return $scope.exportTo(data, 'csv');
        };
        
        $scope.doCSVDownload = function(selectedRows) {
          var href = 'data:attachment/csv;charset=utf-8,' + encodeURI($scope.getCSV(selectedRows));
          var target = '_black';
          var filename = 'tableRows.csv';
          var anchor = document.createElement('a');
          anchor.href = href;
          anchor.target = target;
          anchor.download = filename;
          var event = document.createEvent("MouseEvents");
          event.initEvent(
            "click", true, false
          );
          anchor.dispatchEvent(event);

        };

        $scope.doCSVExport = function(selectedRows) {
          bkHelper.showFileSaveDialog({
            extension: "csv",
            title: 'Select name for CSV file to save',
            saveButtonTitle : 'Save'
          }).then(function (ret) {
            if (ret.uri) {
              return bkHelper.saveFile(ret.uri, $scope.getCSV(selectedRows), true);
            }
          });
        };
        
        // reset table state
        $scope.doResetAll = function () {
          $scope.table.state.clear();
          $scope.init($scope.getCellModel(), false);
        };

        // these are the menu actions
        $scope.doSelectAll = function(idx) {
          if ($scope.table === undefined) {
            return;
          }
          for (var i in $scope.selected) {
            $scope.selected[i] = true;
          }
          //jscs:disable
          $scope.update_selected();
          //jscs:enable
        };
        $scope.doDeselectAll = function(idx) {
          if ($scope.table === undefined) {
            return;
          }
          for (var i in $scope.selected) {
            $scope.selected[i] = false;
          }
          //jscs:disable
          $scope.update_selected();
          //jscs:enable
        };
        $scope.doReverseSelection = function(idx) {
          if ($scope.table === undefined) {
            return;
          }
          for (var i in $scope.selected) {
            $scope.selected[i] = !$scope.selected[i];
          }
          //jscs:disable
          $scope.update_selected();
          //jscs:enable
        };
        $scope.doCopyToClipboard = function(idx) {
          var queryCommandEnabled = true;
          try {
            document.execCommand('Copy');
          } catch (e) {
            queryCommandEnabled = false;
          }
          if (!bkUtils.isElectron && queryCommandEnabled) {
            var getTableData = function() {
              var isFiltered = function (index) {
                return $scope.table.settings()[0].aiDisplay.indexOf(index) > -1;
              };
              var rows = $scope.table.rows(function(index, data, node) {
                return isFiltered(index) && $scope.selected[index];
              });
              if (rows === undefined || rows.indexes().length === 0) {
                rows = $scope.table.rows(isFiltered);
              }
              var out = $scope.exportTo(rows, 'tabs');
              return out;
            };
            var executeCopy = function (text) {
              var input = document.createElement('textarea');
              document.body.appendChild(input);
              input.value = text;
              input.select();
              document.execCommand('Copy');
              input.remove();
            };
            var data = getTableData();
            executeCopy(data);
          }
        };

        $scope.isEmbedded = window.beakerRegister.isEmbedded ? true : false;
        $scope.isPublication = window.beakerRegister.isPublication ? true : false;
        $scope.isIFrame = (window.location != window.parent.location) ? true : false;

        $scope.getCellIdx      =  [];
        $scope.getCellNam      =  [];
        $scope.getCellSho      =  [];
        $scope.getCellAlign    =  [];
        $scope.getCellDisp     =  [];
        $scope.getCellDispOpts =  [];

        $scope.getCellDispOptsF = function(i) {
          return $scope.getCellDispOpts[i];
        };

        $scope.toggleColumnsVisibility = function(visible) {
          if (!$scope.table) {
            return;
          }

          var table = $scope.table;
          var cLength = [];
          for (var i = 1; i < $scope.columns.length; i++) {
            cLength.push(i);
          }
          table.columns(cLength).visible(visible);
        };

        $scope.getColumnIndexByColName = function (columnName) { // takes into account colorder and index column
          var initInd = $scope.columnNames.indexOf(columnName) + 1;
          return !_.isEmpty($scope.colorder) ? $scope.colorder.indexOf(initInd) : initInd;
        };

        $scope.getColumnByInitialIndex = function(index){
          if (!$scope.table) { return null; }
          if ($scope.colorder){
            index = $scope.colorder.indexOf(index);
          }
          return $scope.table.column(index);
        };

        $scope.showColumn = function(initialIndex, event) {
          var column = $scope.getColumnByInitialIndex(initialIndex);
          column.visible(!column.visible());
          if (event){
            event.stopPropagation();
          }

          if (column.visible()){
            var table = $('#' + $scope.id).DataTable();
            angular.element(document.getElementById($scope.id)).parent().scrollLeft(0);
            window.setTimeout(function() {
              var distance = $(table.column(initialIndex).header()).offset().left;
              var width = angular.element(document.getElementById($scope.id)).parent().width() / 2;
              angular.element(document.getElementById($scope.id)).parent().scrollLeft(distance - width);
            }, 0)
          }
        };

        $scope.isColumnVisible = function (initialIndex) {
          var column = $scope.getColumnByInitialIndex(initialIndex);
          return column && column.visible();
        };

        $scope.doUsePagination = function () {
          $scope.pagination.use = !$scope.pagination.use;
          if(!$scope.pagination.use){
            $scope.pagination.rowsToDisplay = $scope.table.settings()[0]._iDisplayLength;
          }
          // reorder the table data
          $scope.applyChanges();
        };

        $scope.refreshCells = function() {
          $scope.getCellIdx      =  [];
          $scope.getCellNam      =  [];
          $scope.getCellSho      =  [];
          $scope.getCellAlign    =  [];
          $scope.getCellDisp     =  [];
          $scope.getCellDispOpts =  [];

          if ($scope.table === undefined) {
            return;
          }

          var i;
          for (i = 1; i < $scope.columns.length; i++) {
            $scope.getCellIdx.push(i - 1);
            var order = $scope.colorder[i];
            $scope.getCellNam.push($scope.columns[order].title);
            $scope.getCellSho.push($scope.getColumnByInitialIndex(i).visible());
            $scope.getCellDisp.push($scope.actualtype[order - 1]);
            $scope.getCellAlign.push($scope.actualalign[order - 1]);
            if ($scope.types) {
              if ($scope.types[order - 1] === 'string') {
                $scope.getCellDispOpts.push($scope.allStringTypes);
              } else if ($scope.types[order - 1] === 'double') {
                $scope.getCellDispOpts.push($scope.allDoubleTypes);
              } else if ($scope.types[order - 1] === 'integer') {
                $scope.getCellDispOpts.push($scope.allIntTypes);
              } else if ($scope.types[order - 1] === 'time' || $scope.types[order - 1] === 'datetime') {
                $scope.getCellDispOpts.push($scope.allTimeTypes);
              } else if ($scope.types[order - 1] === 'boolean') {
                $scope.getCellDispOpts.push($scope.allBoolTypes);
              } else {
                $scope.getCellDispOpts.push($scope.allStringTypes);
              }
            } else {
              $scope.getCellDispOpts.push($scope.allTypes);
            }
          }
          $($scope.table.table().header()).find("th").each(function(i){
            var events = jQuery._data(this, 'events');
            if (events && events.click) {
              var click = events.click[0].handler;
              $(this).unbind('click.DT');
              $(this).bind('click.DT', function (e) {
                if(!$(e.target).hasClass('bko-column-header-menu')){
                  click(e);
                  setTimeout(function(){
                    $scope.tableOrder = [];
                    var order = $scope.table.order();
                    for(var i = 0; i < order.length; i++){
                      $scope.tableOrder.push([$scope.colorder[order[i][0]], order[i][1]]);
                    }
                  }, 0);
                }
                $(this).blur(); //outline is not removed for fixed columns so remove it manually
              });
            }
          });
          $.each($scope.colreorg.s.dt.aoColumns, function (i, column) {
            var filter = $scope.getColumnFilter($scope.table.column(column.idx + ":visible"));
            if (filter) {
              filter.closest('th').attr('data-column-index', i);
            }
          });
        };

        $scope.getColumnFilter = function(column){
          return findFilterInput($scope.table.settings()[0], column.index());
        };

        $scope.tableHasFocus = function(){
          var dtContainer = $($scope.table.table().container());
          return dtContainer.hasClass("focus") || dtContainer.has(':focus').length;
        };

        $scope.removeFilterListeners = function () {
          var filterInputSelector = '.filterRow .filter-input';
          var clearFilterSelector = '.filterRow .clear-filter';
          $($scope.table.table().container()).off('keyup.column-filter change.column-filter keydown.column-filter ' +
            'blur.column-filter focus.column-filter', filterInputSelector);
          $($scope.table.table().container()).off('mousedown.column-filter', clearFilterSelector);
        };

        $scope.getColumn = function(filterNode){
          return $scope.table.column($scope.getColumnIndexByCellNode(filterNode) + ':visible');
        };

        $scope.columnFilterFn = function (e) {
          if (e.keyCode === 27 || e.keyCode === 13) { return; }
          if ($(this).hasClass('table-filter')) {
            $scope.tableFilter = this.value;
            if ($scope.columnSearchActive) {
              $scope.table.search($scope.tableFilter).draw();
            } else {
              $scope.table.draw();
            }
          } else {
            var column = $scope.getColumn(this);
            var colIdx = $(this).parents('th').index();
            if ($scope.columnSearchActive) {
              column.search(this.value);
            }
            $scope.columnFilter[$scope.colorder[colIdx] - 1] = this.value;
            column.draw();
            $scope.updateFilterWidth($(this), column);
          }
        };

        // Apply filters
        $scope.applyFilters = function (){
          if (!$scope.table) { return; }
          $scope.removeFilterListeners();
          var filterInputSelector = '.filterRow .filter-input';
          var clearFilterSelector = '.filterRow .clear-filter';
          $($scope.table.table().container())
            .on('keyup.column-filter change.column-filter', filterInputSelector,
              $scope.columnSearchActive ? $scope.columnFilterFn : $.debounce(500, $scope.columnFilterFn))
            .on('focus.column-filter', filterInputSelector, function (event) {
              if($scope.keyTable){
                $scope.keyTable.blur();
              }
            })
            .on('blur.column-filter', filterInputSelector, function (event) {
              $scope.onFilterBlur($(this));
            })
            .on('keydown.column-filter', filterInputSelector, function (event) {
              var key = event.which;
              var column = $scope.getColumn(this);
              switch (key) {
                case 13: //enter key
                  $scope.onFilterBlur($(this), this);
                  break;
                case 27: //esc
                  event.preventDefault();
                  $scope.clearFilter(column, $(this));
                  $scope.updateFilterWidth($(this), column);
                  break;
                default:
                  $scope.onFilterEditing($(this), column);
              }
            })
            .on('mousedown.column-filter', clearFilterSelector, function (event) {
              var column = $scope.getColumn(this);
              var jqFilterInput = $(this).siblings('.filter-input');
              if(jqFilterInput.is(':focus')){
                event.preventDefault();
              }
              $scope.clearFilter(column, jqFilterInput);
              $scope.updateFilterWidth(jqFilterInput, column);
            });
        };

        $scope.updateFixedColumnsSeparator = function () {
          if ($scope.table) {
            var getHeader = function (thIndex) {
              return $($scope.table.header()).find('tr').find('th:eq(' + thIndex + ')');
            };
            var updateColumn = function (columnIndex, cssClass) {
              var column = $scope.table.column(columnIndex);
              if (!column.visible()) { return; }
              var columnHeader = getHeader($(column.header()).index());
              $(column.nodes()).addClass(cssClass);
              columnHeader.addClass(cssClass);
            };
            updateColumn($scope.pagination.fixLeft, FC_LEFT_SEPARATOR_CLASS);
            if ($scope.pagination.fixRight) {
              updateColumn($scope.columns.length - $scope.pagination.fixRight, FC_RIGHT_SEPARATOR_CLASS);
            }
          }
        };

        $scope.renderMenu = false;

        var chr = {
          '"': '&quot;', '&': '&amp;', '\'': '&#39;',
          '/': '&#47;',  '<': '&lt;',  '>': '&gt;'
        };

        $scope.escapeHTML = function(text) {
          if ($.type(text) === 'string') {
            return text.replace(/[\'&'\/<>]/g, function(a) { return chr[a]; });
          }
          return text;
        };

        $scope.allTypes = [{type: 0, name: 'string'},
        {type: 1, name: 'integer'},
        {type: 2, name: 'formatted integer'},
        {type: 3, name: 'double'},
        {type: 4, name: 'double with precision'},
        {type: 6, name: 'exponential 5'},
        {type: 7, name: 'exponential 15'},
        {type: 8, name: 'datetime'},
        {type: 9, name: 'boolean'},
        {type: 10, name: 'html'}];
        $scope.allConverters = {
          // string
          0: function(value, type, full, meta) {
            if (_.isObject(value) && value.type === 'Date') {
              value = moment(value.timestamp).format('YYYYMMDD HH:mm:ss.SSS ZZ');
            }
            if (type === 'display' && value !== null && value !== undefined) {
              return $scope.escapeHTML(value);
            }
            return value;
          },
          // integer
          1: function(value, type, full, meta) {
            if (value !== undefined && value !== '' && value !== 'null' && value !== null) {
              return parseInt(value);
            }
            if (type === 'sort') {
              return NaN;
            }
            return value;
          },
          // formatted integer
          2: function(value, type, full, meta) {
            if (value !== undefined && value !== '' && value !== 'null' && value !== null) {
              var x = parseInt(value);
              if (!isNaN(x)) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              }
              return x;
            }
            if (type === 'sort') {
              return NaN;
            }
            return value;
          },
          // double
          3: function(value, type, full, meta) {
            if (value !== undefined && value !== '' && value !== 'null' && value !== null) {
              var doubleValue = parseFloat(value);
              var colFormat = $scope.stringFormatForColumn[$(meta.settings.aoColumns[meta.col].sTitle).text()];
              var typeFormat = $scope.stringFormatForType.double;
              var format = colFormat && colFormat.type === 'decimal' ? colFormat : typeFormat;
              if (format && format.type === 'decimal') {
                var precision = doubleValue.toString().split('.')[1];
                if (precision && precision.length >= format.maxDecimals){
                  return doubleValue.toFixed(format.maxDecimals);
                } else {
                  return doubleValue.toFixed(format.minDecimals);
                }
              } else {
                return doubleValue;
              }
            }
            if (type === 'sort') {
              return NaN;
            }
            return value;
          },
          // exponential 5
          6: function(value, type, full, meta) {
            if (value !== undefined && value !== '' && value !== 'null' && value !== null) {
              return parseFloat(value).toExponential(5);
            }
            if (type === 'sort') {
              return NaN;
            }
            return value;
          },
          // exponential 15
          7: function(value, type, full, meta) {
            if (value !== undefined && value !== '' && value !== 'null' && value !== null) {
              return parseFloat(value).toExponential(15);
            }
            if (type === 'sort') {
              return NaN;
            }
            return value;
          },
          // datetime
          8: function(value, type, full, meta) {
            var time;
            var tz;
            if ($scope.timeStrings) {
              return $scope.timeStrings[meta.row];
            }
            if (type === 'display' || type === 'csv') {
              var format = _.isEmpty($scope.formatForTimes) ?
                TIME_UNIT_FORMATS.DATETIME.format : TIME_UNIT_FORMATS[$scope.formatForTimes].format;
              if (_.isObject(value) && value.type === 'Date') {
                return bkUtils.formatTimestamp(value.timestamp, $scope.tz, format);
              }
              var milli = value / 1000 / 1000;
              return bkUtils.formatTimestamp(milli, $scope.tz, format);
            }
            return value;
          },
          // boolean
          9: function(value, type, full, meta) {
            if (value !== undefined && value !== null && (value.toLowerCase() === 'true' || value === 1)) {
              return 'true';
            }
            return 'false';
          },
          // html
          10: function(value, type, full, meta) {
            return value;
          }
        };
        $scope.valueFormatter = function(value, type, full, meta) {
          var columnName = $scope.columnNames[meta.col - 1];
          return $scope.stringFormatForColumn[columnName].values[columnName][meta.row];
        };
        $scope.isDoubleWithPrecision = function(type){
          var parts = type.toString().split(".");
          return parts.length > 1 && parts[0] === '4';
        };
        $scope.getDoublePrecision = function(type){
          return $scope.isDoubleWithPrecision(type) ? type.toString().split(".")[1] : null;
        };
        $scope.getActualTypeByPrecision = function(precision){
          return '4.' + precision;
        };
        $scope.doubleWithPrecisionConverters = {}; //map: precision -> convert function
        for (var precision = 1; precision < 10; precision++) {
          $scope.doubleWithPrecisionConverters[precision] = function(precision, value, type, full, meta) {
            if (value !== undefined && value !== '' && value !== 'null' && value !== null) {
              return parseFloat(value).toFixed(precision);
            }
            if (type === 'sort') {
              return NaN;
            }
            return value;
          }.bind({}, precision);
        }
        $scope.allStringTypes = [{type: 0, name: 'string'}, {type: 10, name: 'html'}];
        $scope.allTimeTypes   = [{type: 8, name: 'datetime'},
                                 {type: 0, name: 'string'}];
        $scope.allIntTypes    = [{type: 0, name: 'string'},
        {type: 1, name: 'integer'},
        {type: 2, name: 'formatted integer'},
        {type: 8, name: 'datetime'}];
        $scope.allDoubleTypes = [{type: 0, name: 'string'},
        {type: 3, name: 'double'},
        {type: 4, name: 'double with precision'},
        {type: 6, name: 'exponential 5'},
        {type: 7, name: 'exponential 15'}];
        $scope.allBoolTypes = [{type: 0, name: 'string'},
        {type: 9, name: 'boolean'}];

        $scope.applyChanges = function() {
          $scope.doDestroy(false);
          $scope.update = true;
          // reorder the table data
          var model = $scope.model.getCellModel();
          $scope.doCreateData(model);
          $scope.doCreateTable(model);
        };

        $scope.getScrollY = function () {
          var rowHeight = bkHelper.getBkNotebookViewModel().isAdvancedMode() ? ROW_HEIGHT_ADVANCED_MODE : ROW_HEIGHT;
          var rowsNumber = $scope.pagination.rowsToDisplay > 0 ? $scope.pagination.rowsToDisplay : $scope.data.length;
          return rowsNumber * rowHeight;
        };

        $scope.changePageLength = function (len) {
          $scope.pagination.rowsToDisplay = len;
          if ($scope.pagination.use) {
            $scope.table.page.len(len).draw();
          } else {
            var scrollBody = $('#' + $scope.id).parent();
            scrollBody.css('max-height', $scope.getScrollY());
            $scope.update_size();
          }
        };
      },
      link: function(scope, element) {

        var cellModel;

        var unregisterOutputExpandEventListener = angular.noop; // used for deregistering listener

        var redrawTable = function(){
          if (scope.table !== undefined && tableChanged) {
            $timeout(function () {
              _.defer(function(){ scope.table.draw(false);});
              tableChanged = false;
            }, 0);
          }
        };

        scope.getScrollBarWidth = function () {
          var sizer = $('<p/>').css({
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 150,
              padding: 0,
              overflow: 'scroll',
              visibility: 'hidden'
            })
            .appendTo('body');
          var width = sizer[0].offsetWidth - sizer[0].clientWidth;
          sizer.remove();
          return width;
        };
        scope.scrollbarWidth = scope.getScrollBarWidth();

        scope.getTheme = function () {
          return bkHelper.getTheme();
        };
        scope.$watch('getTheme()', function (newValue, oldValue) {
          if (newValue !== oldValue) {
            if (scope.table) {
              scope.scrollbarWidth = scope.getScrollBarWidth();
              scope.table.settings()[0].oScroll.iBarWidth = scope.scrollbarWidth;
              scope.update_size();
            }
          }
        });

        scope.containerClickFunction = function(e){
          if (scope.table) {
            if ($(scope.table.table().container()).has(e.target).length) {
              scope.addInteractionListeners();
            } else {
              scope.removeInteractionListeners();
            }
          }
        };

        scope.doDestroy = function(all) {
          if (scope.table) {
            //jscs:disable
            clearTimeout(scope.refresh_size);
            //jscs:enable
            $(window).unbind('resize.' + scope.id);
            $('#' + scope.id + ' tbody').off('click');
            $('#' + scope.id + ' tbody').off('dblclick');
            scope.removeOnKeyListeners();
            $('#' + scope.id + ' tbody').off('mouseleave.bko-dt-highlight');
            $('#' + scope.id + ' tbody').off('mouseenter.bko-dt-highlight');
            scope.removeInteractionListeners();
            scope.table.off('key');
            scope.table.off('column-visibility.dt');
            scope.removeFilterListeners();
            $(scope.table.table().container()).find('.dataTables_scrollHead').off('scroll');
            $(element).find(".bko-table-use-pagination").remove();

            $.contextMenu('destroy', {
              selector: '#' + scope.id + ' tbody td'
            });
            $.contextMenu('destroy', {
              selector: '#' + scope.id +'_wrapper thead'
            });
            $(document).off('contextmenu.bko-dt-header', '#' + scope.id +'_wrapper thead th');

            if (all) {
              scope.table.destroy(true);
            }

            delete scope.keyTable;
            delete scope.table;
            delete scope.colreorg;
            if (scope.clipclient !== undefined) {
              scope.clipclient.destroy();
              delete scope.clipclient;
            }
            delete scope.fixcols;
            scope.fixcreated = false;
            scope.renderMenu = false;
          }
          if (all) {
            delete scope.timeStrings;
            delete scope.tz;
            delete scope.columnNames;
            delete scope.types;
            delete scope.actualtype;
            delete scope.actualalign;
            delete scope.data;
            delete scope.update;
            delete scope.tableOrder;
            $(document.body).off('click.bko-dt-container', scope.containerClickFunction);
          }
          unregisterOutputExpandEventListener();

          scope.$on(GLOBALS.EVENTS.CELL_OUTPUT_LM_SHOWED, function() {
            var parents = element.parents();
            var cyclingContainer =  _.find(parents, function (parent) {
              return parent.id.indexOf("lm-cycling-panel") !== -1;
            });
            if (cyclingContainer && cyclingContainer.style.display !== 'none'){
              redrawTable();
            }
            var tabContainer =  _.find(parents, function (parent) {
              return parent.id.indexOf("lm-tab-panel") !== -1;
            });
            if (tabContainer && tabContainer.classList.contains("active")){
              redrawTable();
            }
          });
        };
        scope.init = function(model, destroy) {
          scope.doDestroy(destroy);

          unregisterOutputExpandEventListener = scope.$on(GLOBALS.EVENTS.CELL_OUTPUT_EXPANDED, function() {
            var parents = element.parents();
            var cyclingContainer =  _.find(parents, function (parent) {
              return parent.id.indexOf("lm-cycling-panel") !== -1;
            });
            if (cyclingContainer && cyclingContainer.style.display === 'none'){
              return;
            }
            var tabContainer =  _.find(parents, function (parent) {
              return parent.id.indexOf("lm-tab-panel") !== -1;
            });

            if (tabContainer && !tabContainer.classList.contains("active")){
              return;
            }
            redrawTable();
          });

          var i;

          // validate saved state (if any) by using column \Names
          var modelColumnNames;
          if (model.columnNames) {
            modelColumnNames = model.columnNames.slice(0);
            if (model.hasIndex === 'true') {
              modelColumnNames.shift();
            }
          }
          if (scope.savedstate !== undefined) {
            if (scope.savedstate.columnNames === undefined) {
              scope.savedstate = undefined;
            } else if (scope.savedstate.columnNames.length !== modelColumnNames.length) {
              scope.savedstate = undefined;
            } else {
              for (i = 0; i < scope.savedstate.columnNames.length; i++) {
                if (modelColumnNames[i] !== scope.savedstate.columnNames[i]) {
                  scope.savedstate = undefined;
                  break;
                }
              }
            }
          }

          scope.hasIndex = model.hasIndex === 'true';

          // copy basic data
          if (model.columnNames !== undefined)
            scope.columnNames = model.columnNames.slice(0);
          else
            scope.columnNames = undefined;
          scope.timeStrings = model.timeStrings;
          scope.tz          = model.timeZone;
          if (model.types !== undefined)
            scope.types = model.types.slice(0);
          else
            scope.types = undefined;

          if (scope.hasIndex) {
            if (scope.columnNames !== undefined) {
              scope.indexName = scope.columnNames[0];
              scope.columnNames.shift();
            } else {
              scope.indexName = '     ';
            }
            if (scope.types !== undefined) {
              scope.indexType = scope.types[0];
              scope.types.shift();
            } else {
              scope.indexType = 'index';
            }
          }

          // compute how to display columns (remind: dummy column to keep server ordering)
          if (scope.savedstate !== undefined) {
            // we have a display state to recover
            scope.actualtype  = scope.savedstate.actualtype;
            scope.actualalign = scope.savedstate.actualalign;
            scope.colorder    = scope.savedstate.colorder;
            scope.getCellSho  = scope.savedstate.getCellSho;
            scope.pagination  = scope.savedstate.pagination;
            //fix saved pagination values to be numbers
            if (typeof scope.pagination.fixLeft === 'boolean') {
              scope.pagination.fixLeft = 0;
            }
            if (typeof scope.pagination.fixRight === 'boolean') {
              scope.pagination.fixRight = 0;
            }
            scope.barsOnColumn          = scope.savedstate.barsOnColumn || {};
            scope.cellHighlightersData  = scope.savedstate.cellHighlightersData || {};
            scope.tableFilter           = scope.savedstate.tableFilter || '';
            scope.columnFilter          = scope.savedstate.columnFilter || [];
            scope.showFilter            = scope.savedstate.showFilter;
            scope.columnSearchActive    = scope.savedstate.columnSearchActive;
            scope.columnWidth           = scope.savedstate.columnWidth || [];
            scope.tableOrder            = scope.savedstate.tableOrder;
            scope.formatForTimes        = scope.savedstate.formatForTimes;
            scope.stringFormatForType   = scope.savedstate.stringFormatForType || {};
            scope.stringFormatForColumn = scope.savedstate.stringFormatForColumn || {};
            scope.tooltips = scope.savedstate.tooltips || [];
            scope.dataFontSize = scope.savedstate.dataFontSize;
            scope.headerFontSize = scope.savedstate.headerFontSize;
            scope.fontColor = scope.savedstate.fontColor;
            scope.headersVertical = scope.savedstate.headersVertical;

            scope.savedstate  = undefined;
          } else {
            if (!_.isEmpty(model.columnsVisible) && _.isEmpty(model.columnOrder)) {
              scope.getCellSho = [];
              _.forEach(scope.columnNames, function(columnName){
                var visible = model.columnsVisible.hasOwnProperty(columnName) ? model.columnsVisible[columnName] : true;
                scope.getCellSho.push(visible);
              });
            } else {
              scope.getCellSho = undefined;
            }

            if (!_.isEmpty(model.columnOrder)) {
              scope.colorder = [0];
              scope.getCellSho = [];
              _.forEach(model.columnOrder, function (columnName) {
                scope.colorder.push(scope.columnNames.indexOf(columnName) + 1);
              });
              _.forEach(scope.columnNames, function (columnName) {
                var colIndex = model.columnOrder.indexOf(columnName);
                var visible = colIndex > -1;
                scope.getCellSho.push(visible);
                if (!visible) {
                  scope.colorder.push(scope.columnNames.indexOf(columnName) + 1);
                }
              });
            } else {
              scope.colorder = undefined;
            }

            scope.barsOnColumn = {}; //map: col index -> show bars
            if (!_.isEmpty(model.rendererForType)) {
              _.forEach(scope.types, function (type, index) {
                var renderer = model.rendererForType[type];
                if (renderer) {
                  scope.applyColumnRenderer(index, renderer);
                }
              });
            }
            _.forOwn(model.rendererForColumn, function (renderer, columnName) {
              scope.applyColumnRenderer(scope.getColumnIndexByColName(columnName) - 1, renderer);
            });

            scope.cellHighlightersData = model.cellHighlighters ? _.map(model.cellHighlighters, function(highlighter){
              return _.extend({colInd: scope.getColumnIndexByColName(highlighter.colName)}, highlighter);
            }) : {};
            scope.tableFilter       = '';
            scope.columnFilter      = [];
            scope.showFilter        = false;
            scope.columnSearchActive = false;
            scope.columnWidth       = [];
            scope.tableOrder        = undefined;
            var columnsFrozen = [];
            _.forOwn(model.columnsFrozen, function (frozen, columnName) {
              if (frozen) {
                columnsFrozen.push(scope.getColumnIndexByColName(columnName));
              }
            });
            var columnsFrozenRight = [];
            _.forOwn(model.columnsFrozenRight, function (frozen, columnName) {
              if (frozen) {
                columnsFrozenRight.push(scope.getColumnIndexByColName(columnName));
              }
            });
            scope.pagination = {
              'use' : true,
              'rowsToDisplay' : DEFAULT_PAGE_LENGTH,
              'fixLeft' : !_.isEmpty(columnsFrozen) ? Math.max.apply(null, columnsFrozen) : 0,
              'fixRight' : !_.isEmpty(columnsFrozenRight) ? scope.columnNames.length - Math.min.apply(null, columnsFrozenRight) + 1 : 0,
            };
            scope.formatForTimes        = model.stringFormatForTimes || {};
            scope.stringFormatForType   = model.stringFormatForType || {};
            scope.stringFormatForColumn = model.stringFormatForColumn || {};
            scope.tooltips              = model.tooltips || [];
            scope.dataFontSize          = model.dataFontSize;
            scope.headerFontSize        = model.headerFontSize;
            scope.fontColor             = model.fontColor;
            scope.headersVertical       = model.headersVertical;
          }
          // auto compute types
          if (scope.actualtype === undefined || scope.actualtype.length === 0) {
            scope.actualtype = [];
            scope.actualalign = [];
            for (i = 0; i < scope.columnNames.length; i++) {
              if (scope.types !== undefined) {
                var stringFormatForColumn =  scope.stringFormatForColumn[scope.columnNames[i]];
                if (stringFormatForColumn && stringFormatForColumn.type === 'value'){
                  scope.actualtype.push(0);
                  scope.actualalign.push('L');
                } else if (scope.types[i] === 'time' || scope.types[i] === 'datetime') {
                  scope.actualtype.push(8);
                  scope.actualalign.push('C');
                } else if (scope.types[i] === 'integer') {
                  scope.actualtype.push(2);
                  scope.actualalign.push('R');
                } else if (scope.types[i] === 'double') {
                  if (scope.stringFormatForType.double || stringFormatForColumn) {
                    scope.actualtype.push(3);
                  } else {
                    scope.actualtype.push('4.4');
                  }
                  scope.actualalign.push('R');
                } else {
                  scope.actualtype.push(0);
                  scope.actualalign.push('L');
                }
              } else {
                scope.actualtype.push(0);
                scope.actualalign.push('L');
              }
            }

            if (!_.isEmpty(model.alignmentForType)) {
              _.forEach(model.types, function (type, index) {
                var alignment = model.alignmentForType[type];
                if(alignment){
                  scope.actualalign[index] = alignment;
                }
              });
            }

            _.forOwn(model.alignmentForColumn, function (alignment, columnName) {
              scope.actualalign[scope.columnNames.indexOf(columnName)] = alignment;
            });
          }

          // cell highlighters
          scope.cellHighlighters = {}; //map: col index -> highlighter
          _.forEachRight(scope.cellHighlightersData, function (highlighter) {
            if (!highlighter) { return; }
            if(_.isEmpty(scope.cellHighlighters[highlighter.colInd])){
              var jsHighlighter = cellHighlighters.createHighlighter(highlighter.type, highlighter);
              if (jsHighlighter) {
                scope.cellHighlighters[highlighter.colInd] = jsHighlighter;
              }
            }
          });

          scope.contextMenuItems = {};
          if (!_.isEmpty(model.contextMenuItems)) {
            _.forEach(model.contextMenuItems, function (item) {
              scope.contextMenuItems[item] = {
                name: item,
                callback: function (itemKey, options) {
                  var index = scope.table.cell(options.$trigger.get(0)).index();
                  tableService.onContextMenu(model['update_id'],
                    itemKey,
                    index.row,
                    index.column - 1,
                    scope.model.getEvaluatorId()).then(function () {
                    scope.update = true;
                  });
                }
              }
            });
          }

          if (!_.isEmpty(model.contextMenuTags)) {
            _.forOwn(model.contextMenuTags, function (tag, name) {
              scope.contextMenuItems[name] = {
                name: name,
                callback: function (itemKey, options) {
                  var index = scope.table.cell(options.$trigger.get(0)).index();
                  var params = {
                    actionType: 'CONTEXT_MENU_CLICK',
                    contextMenuItem: itemKey,
                    row: index.row,
                    col: index.column - 1
                  };
                  tableService.setActionDetails(model['update_id'],
                                                scope.model.getEvaluatorId(),
                                                params).then(function () {
                    scope.evaluateTagCell(tag);
                  });
                }
              }
            });
          }

          scope.doCreateData(model);
          scope.doCreateTable(model);
          $(document.body).off('click.bko-dt-container', scope.containerClickFunction);
          $(document.body).on('click.bko-dt-container', scope.containerClickFunction);
        };

        scope.doCreateData = function(model) {
          // create a dummy column to keep server ordering if not already present
          var values = model.hasOwnProperty('filteredValues') ? model.filteredValues : model.values;
          if (!scope.hasIndex) {
            var data = [];
            var r;
            var selected = [];
            for (r = 0; r < values.length; r++) {
              var row = [];
              row.push(r);
              data.push(row.concat(values[r]));
              selected.push(false);
            }
            scope.data = data;
            scope.selected = selected;
          } else {
            var data = [];
            var r;
            var selected = [];
            for (r = 0; r < values.length; r++) {
              var row = [];
              data.push(row.concat(values[r]));
              selected.push(false);
            }
            scope.data = data;
            scope.selected = selected;
          }
        };
        //jscs:disable
        scope.update_size = function() {
        //jscs:enable
          var me = $('#' + scope.id);
          // this is dataTables_scrollBody
          var pp = me.parent();
          var tableWidth = me.width();
          var scrollWidth = scope.scrollbarWidth;
          if (pp.width() > tableWidth + scrollWidth) {
            if(pp.height() < me.height()){
              tableWidth += scrollWidth;
            }
            pp.width(tableWidth);
          }
          if (scope.fixcols) { //do not need data update
            scope.fixcols._fnColCalc();
            scope.fixcols._fnGridLayout()
          }
        };
        scope.selectFixedColumnRow = function (dtRowIndex, select) {
          if (scope.fixcols) {
            var doSelect = function(row){
              var cells = row.find('td');
              if (select) {
                row.addClass('selected');
              } else {
                row.removeClass('selected');
                cells.removeClass('selected');
              }
            };
            var row = scope.table.row(dtRowIndex).node();
            if (!row) { return; }
            var fixRowIndex = row.rowIndex;
            var fixedColumns = scope.fixcols.dom.clone;
            if(fixedColumns.left.body){
              doSelect($(fixedColumns.left.body.rows[fixRowIndex]));
            }
            if(fixedColumns.right.body){
              doSelect($(fixedColumns.right.body.rows[fixRowIndex]));
            }
          }
        };
        scope.selectFixedColumnCell = function (jqFixedCell, select) {
          if (jqFixedCell) {
            if (select) {
              jqFixedCell.addClass('selected');
            } else {
              jqFixedCell.removeClass('selected');
            }
          }
        };
        scope.highlightFixedColumnRow = function (dtRowIndex, highlight) {
          if (scope.fixcols) {
            var doHighlight = function(row){
              if (highlight) {
                row.addClass('hover');
              } else {
                row.removeClass('hover');
              }
            };
            var row = scope.table.row(dtRowIndex).node();
            if (!row) { return; }
            var fixRowIndex = scope.table.row(dtRowIndex).node().rowIndex;
            var fixedColumns = scope.fixcols.dom.clone;
            if(fixedColumns.left.body){
              doHighlight($(fixedColumns.left.body.rows[fixRowIndex]));
            }
            if(fixedColumns.right.body){
              doHighlight($(fixedColumns.right.body.rows[fixRowIndex]));
            }
          }
        };
        //jscs:disable
        scope.update_selected = function() {
        //jscs:enable
          if (scope.table === undefined) {
            return;
          }
          scope.table.rows().eq(0).each(function(index) {
            var row = scope.table.row(index);
            var tr = row.node();
            if (tr !== undefined) {
              var iPos = row.index();
              if (!scope.selected[iPos]) {
                $(tr).removeClass('selected');
                scope.selectFixedColumnRow(iPos, false);
              } else {
                $(tr).addClass('selected');
                scope.selectFixedColumnRow(iPos, true);
              }
            }
          });
        };

        scope.updateBackground = function () {
          if (scope.table === undefined) {
            return;
          }
          for (var colInd = 0; colInd < scope.columns.length; colInd++) {

            var max = Math.max(scope.table.column(colInd).data().max(), Math.abs(scope.table.column(colInd).data().min()));

            scope.table.column(colInd).nodes().each(function (td) {
              var value = $(td).text();
              if ($.isNumeric(value)) {
                $(td).empty();
                var barsRenderer = scope.barsOnColumn[scope.colorder[colInd]];
                if (barsRenderer) {
                  var cellDiv = $("<div></div>", {
                    "class": "dt-cell-div"
                  });
                  var textSpan = $("<div></div>", {
                    "class": "dt-cell-text"
                  }).text(value);

                  var barsBkg = $("<div></div>", {
                    "class": "dt-bar-data-cell"
                  });

                  var barsBkgPositiveValueCell = $("<div></div>", {
                    "class": "dt-bar-data-value-cell"
                  });

                  var barsBkgNegativeValueCell = $("<div></div>", {
                    "class": "dt-bar-data-value-cell"
                  });

                  var percent = (parseFloat(Math.abs(value)) / max) * 100;

                  if(value>0){
                    var barsBkgPositiveValues = $("<div></div>", {
                      "class": "dt-bar-data "
                    }).css({
                      "width": percent + "%"
                    });

                    barsBkgPositiveValueCell.append(barsBkgPositiveValues);

                  }else if(value<0){
                    var barsBkgNegativeValues = $("<div></div>", {
                      "class": "dt-bar-data-negative "
                    }).css({
                      "width": percent + "%"
                    });

                    barsBkgNegativeValueCell.append(barsBkgNegativeValues)
                  }

                  barsBkg.append(barsBkgNegativeValueCell);
                  barsBkg.append(barsBkgPositiveValueCell);

                  cellDiv.append(barsBkg);
                  if (!barsRenderer.includeText) {
                    textSpan.hide();
                  }
                  cellDiv.append(textSpan);
                  $(td).append(cellDiv);
                } else {
                  $(td).text(value);
                }
              }
            });
            var cellHighlighter = scope.cellHighlighters[colInd];
            if (cellHighlighter) {
              cellHighlighter.doHighlight(scope.table);
            }
          }
        };
        scope.addInteractionListeners = function () {
          if (!scope.interactionListeners) {
            $(scope.table.table().container())
              .on("mouseenter.bko-dt-interaction", 'td, th', function (e) {
                if (scope.tableHasFocus()) {
                  return; //ignore mouse over for key events if there is focus on table's cell
                }
                var column = scope.getColumnIndexByCellNode(this);
                if (!scope.onKeyListeners[column]) {
                  scope.onKeyListeners[column] = function (onKeyEvent) {
                    if (scope.tableHasFocus()) {
                      return; //ignore mouse over for key events if there is focus on table's cell
                    }
                    if (!onKeyEvent.isDefaultPrevented()) {
                      scope.onKeyAction(column, onKeyEvent);
                    }
                  };
                  $(document).on("keydown.bko-datatable", scope.onKeyListeners[column]);
                }
              })
              .on("mouseleave.bko-dt-interaction", 'td, th', function (e) {
                var column = scope.getColumnIndexByCellNode(this);
                var listener = scope.onKeyListeners[column];
                if (listener) {
                  delete scope.onKeyListeners[column];
                  $(document).off("keydown.bko-datatable", listener);
                }
              });
            scope.interactionListeners = true;
          }
        };
        scope.removeInteractionListeners = function () {
          if (scope.interactionListeners) {
            $(scope.table.table().container()).off('mouseenter.bko-dt-interaction', 'td, th');
            $(scope.table.table().container()).off('mouseleave.bko-dt-interaction', 'td, th');
            scope.interactionListeners = false;
          }
        };

        scope.showHideBars = function (column) {
          if (scope.barsOnColumn[column]) {
            delete scope.barsOnColumn[column];
          } else {
            scope.barsOnColumn[column] = {includeText: true};
          }
          _.defer(function () { scope.table.draw(false);  });
        };

        scope.showHideHighlighter = function(column, highlighterType){
          var highlighter = scope.cellHighlighters[column];
          if (!highlighter || !(highlighter instanceof highlighterType)) {
            if (highlighter) {
              highlighter.removeHighlight(scope.table);
            }
            scope.cellHighlighters[column] = new highlighterType({colInd: column});
          } else {
            highlighter.removeHighlight(scope.table);
            delete scope.cellHighlighters[column];
          }
          _.defer(function () { scope.table.draw(false);  });
        };

        scope.showHideHeatmap = function (column) {
          scope.showHideHighlighter(column, cellHighlighters.HeatmapHighlighter);
        };

        scope.columnHasFormat = function (column, format) {
          for (var i = 0; i < scope.types.length; i++) {
            if(scope.types[column] === format){
              return true;
            }
          }
          return false;
        };
        scope.changePrecision = function (column, precision) {
          if(scope.columnHasFormat(column, 'double')){
            scope.actualtype[column] = scope.getActualTypeByPrecision(precision);
            scope.applyChanges();
          }
        };
        scope.changeAllPrecision = function (precision) {
          for (var i = 0; i < scope.columns.length - 1; i++) {
            if(scope.columnHasFormat(i, 'double')){
              scope.actualtype[i] = scope.getActualTypeByPrecision(precision);
            }
          }
          scope.applyChanges();
        };

        scope.changeTimeFormat = function (timeUnit) {
          scope.formatForTimes = timeUnit;
          scope.applyChanges();
        };

        scope.doShowFilter = function (column, isSearch) {
          var jqContainer = $(scope.table.table().container());
          var filterInputs = jqContainer.find('.filter-input');
          var filterIcons = jqContainer.find('.filter-icon');
          var redrawFixCols = false;
          if (isSearch) {
            filterInputs.addClass('search-active');
            filterInputs.attr('title', 'search this column for a substring');
            $(filterInputs.get(0)).attr('title', 'search the whole table for a substring');
            filterIcons.removeClass('fa-filter');
            filterIcons.addClass('fa-search');
          } else {
            filterInputs.removeClass('search-active');
            filterInputs.attr('title', 'filter with an expression with a variable defined for each column and $ means the current column.  eg "$ > 5"');
            $(filterInputs.get(0)).attr('title', 'filter with an expression with a variable defined for each column');
            filterIcons.removeClass('fa-search');
            filterIcons.addClass('fa-filter');
          }
          if (scope.showFilter) {
            if(scope.columnSearchActive !== isSearch){
              scope.clearFilters();
              redrawFixCols = true;
            }
          } else {
            scope.showFilter = true;
            redrawFixCols = true;
          }
          scope.columnSearchActive = isSearch;

          var filterInputSelector = '.filterRow .filter-input';
          jqContainer.off('keyup.column-filter change.column-filter');
          jqContainer.on('keyup.column-filter change.column-filter', filterInputSelector,
            scope.columnSearchActive ? scope.columnFilterFn : $.debounce(500, scope.columnFilterFn));

          if (!(scope.$$phase || $rootScope.$$phase)) {
            scope.$apply();
          }

          setTimeout(function () {
            scope.table.draw(false);
            if (scope.fixcols && redrawFixCols) {
              scope.fixcols.fnRedrawLayout();
            }
            if(column){
              scope.getColumnFilter(column).focus();
            }
          }, 0);
        };
        scope.hideFilter = function () {
          scope.clearFilters();
          scope.showFilter = false;
          if (!(scope.$$phase || $rootScope.$$phase)) {
            scope.$apply();
          }
          setTimeout(function(){
            if (scope.fixcols){
              scope.fixcols.fnRedrawLayout();
            }
          }, 0);
        };
        scope.clearFilters = function () {
          var hasNotEmptyFilter = false;
          scope.table.columns().every(function (index) {
            var column = this;
            var jqInput = scope.getColumnFilter(column);
            var filterValue = jqInput.val();
            if (!_.isEmpty(filterValue)) {
              hasNotEmptyFilter = true;
              jqInput.val('');
              if (index === 0) {
                scope.table.search('');
              } else {
                column.search('');
              }
            }
          });
          if (hasNotEmptyFilter) {
            scope.table.draw();
          }
          scope.columnFilter = [];
          scope.tableFilter = '';
        };
        scope.clearFilter = function (column, jqInput) {
          if (column) {
            var filterValue = jqInput.val();
            if (!_.isEmpty(filterValue)) {
              jqInput.val('');
              if (column.index() === 0) {
                if (scope.columnSearchActive) {
                  scope.table.search('');
                }
                scope.table.draw();
                scope.tableFilter = '';
              } else {
                if (scope.columnSearchActive) {
                  column.search('');
                }
                column.draw();
                scope.columnFilter[scope.colorder[column.index()] - 1] = '';
              }
              if (!jqInput.is(':focus')) {
                scope.checkFilter();
              }
              scope.stopFilterEditing(jqInput);
            }
          }
        };
        scope.stopFilterEditing = function (jqInputEl) {
          jqInputEl.css('width', '');
          jqInputEl.parent().removeClass('editing');
          jqInputEl.parent().siblings('.hidden-filter').addClass('hidden-filter-input');
        };
        scope.onFilterBlur = function (jqInputEl) {
          scope.stopFilterEditing(jqInputEl);
          setTimeout(function () {
            var filtersInFocus = $(scope.table.table().container()).find('.filter-input:focus');
            if (!filtersInFocus.length) {
              //focus wasn't moved to another filter input
              scope.checkFilter();
            }
          }, 0);
        };
        scope.checkFilter = function () {
          var hasNotEmptyFilter = false;

          $(scope.table.table().container()).find('.filter-input').each(function(i, filterInput){
            if(!_.isEmpty(filterInput.value)){
              hasNotEmptyFilter = true;
            }
          });

          if(!hasNotEmptyFilter){
            scope.hideFilter();
          }
        };
        scope.onFilterEditing = function(jqInputEl, column){
          scope.updateFilterWidth(jqInputEl, column);
          jqInputEl.parent().addClass('editing');
          jqInputEl.parent().siblings('.hidden-filter').removeClass('hidden-filter-input');
        };
        scope.updateFilterWidth = function(jqInput, column){
          var iconsWidth = 30;
          var padding = 15;
          var textWidth = jqInput.parent().siblings('.hidden-length').text(jqInput.val()).width() + iconsWidth;
          var headerWidth = $(column.header()).width();
          if(textWidth > headerWidth && jqInput.parent().hasClass('editing')){
            jqInput.css('width', textWidth + padding);
          } else {
            jqInput.css('width', '');
          }
        };

        scope.onKeyAction = function (column, onKeyEvent) {
          var key = onKeyEvent.keyCode;
          var charCode = String.fromCharCode(key);
          if (charCode) {
            switch(charCode.toUpperCase()){
              case 'B':
                scope.showHideBars(scope.colorder[column]);
                break;
              case 'H':
                scope.showHideHeatmap(scope.colorder[column]);
                break;
            }
            if (key >= 48 && key <= 57){ //numbers 1..9
              if(onKeyEvent.shiftKey){
                scope.changePrecision(scope.colorder[column] - 1, parseInt(charCode));
              }else{
                scope.changeAllPrecision(parseInt(charCode));
              }
            }
          }
        };

        scope.getColumnIndexByCellNode = function (cellNode) {
          return findDTColumnIndex(scope.table.settings()[0], cellNode);
        };
        scope.removeOnKeyListeners = function () {
          for (var f in scope.onKeyListeners) {
            if (scope.onKeyListeners.hasOwnProperty(f)) {
              $(document).off("keydown.bko-datatable", scope.onKeyListeners[f]);
            }
          }
          scope.onKeyListeners = {};//map: col index -> listener function
        };

        scope.applyColumnRenderer = function(colIndex, renderer){
          switch (renderer.type) {
            case 'DataBars':
              scope.barsOnColumn[colIndex + 1] = {includeText: renderer.includeText};
              break;
            //other renderers here
          }
        };

        scope.updateHeaderLayout = function () {
          if (scope.table) {
            scope.updateHeaderFontSize();
            scope.rotateHeader();
          }
        };

        scope.updateHeaderFontSize = function () {
          if (scope.headerFontSize) {
            $(scope.table.table().container()).find('thead tr:not(".filterRow") th').css({'font-size': scope.headerFontSize});
          }
        };

        scope.rotateHeader = function () {
          var headerRows = $(scope.table.table().container())
            .find('.DTFC_LeftHeadWrapper, .DTFC_RightHeadWrapper, .dataTables_scrollHead')
            .find('thead tr:not(".filterRow")');
          var headerCols = headerRows.find('th');
          var headerTexts = headerCols.find('span.header-text');
          var headerTextMaxWidth = Math.max.apply(null, headerTexts.map(function () {
            return $(this).width();
          }).get());
          var lineHeight = parseFloat(headerTexts.css('line-height'));
          if (scope.headersVertical) {
            headerTexts.addClass('rotate');
            var padding = 10;
            headerTexts.css('transform', 'rotate(270deg) translateX(-' + (lineHeight - padding) + 'px)');
            headerCols.css({
              'height': headerTextMaxWidth + padding + 'px',
              'max-width': lineHeight,
              'vertical-align': 'bottom'
            });
          } else {
            headerTexts.removeClass('rotate');
            headerTexts.css('transform', '');
            headerCols.css({
              'height': '',
              'max-width': '',
              'vertical-align': ''
            });
            headerRows.css({'height': ''});
          }
        };

        scope.evaluateTagCell = function (tag) {
          var cellOp = bkSessionManager.getNotebookCellOp();
          var result;
          if (cellOp.hasUserTag(tag)) {
            result = cellOp.getCellsWithUserTag(tag);
            bkCoreManager.getBkApp().evaluateRoot(result)
              .catch(function () {
                console.log('Evaluation failed: ' + tag);
              });
          }
        };

        scope.doCreateTable = function(model) {
          var cols = [];
          var i;

          var getFormatSubitems = function(container) {
            var colIdx = container.data('columnIndex');
            var types = scope.getCellDispOptsF(colIdx - 1);
            var items = [];

            _.each(types, function(obj) {
              if (obj.type === 8) { //datetime
                items = items.concat(getTimeSubitems());
                return;
              }
              var item = {
                title: obj.name,
                isChecked: function(container) {
                  var colIdx = container.data('columnIndex');
                  return scope.actualtype[scope.colorder[colIdx] - 1] === obj.type;
                }
              };
              if (obj.type === 4) { //double with precision
                item.items = getPrecisionSubitems;
              } else {
                item.action = function(el) {
                    var container = el.closest('.bko-header-menu');
                    var colIdx = container.data('columnIndex');

                    scope.getCellDisp[scope.colorder[colIdx] - 1] = obj.type;
                    scope.actualtype[scope.colorder[colIdx] - 1] = obj.type;
                    scope.applyChanges();
                  }
                };
              items.push(item);
            });

            return items;
          };

          var getPrecisionSubitems = function(container) {
            var items = [];

            _.each(scope.doubleWithPrecisionConverters, function(func, precision) {
              var item = {
                title: precision,
                isChecked: function(container) {
                  var colIdx = container.data('columnIndex');
                  return scope.actualtype[scope.colorder[colIdx] - 1] == scope.getActualTypeByPrecision(precision);
                },
                action: function(el) {
                  var container = el.closest('.bko-header-menu');
                  var colIdx = container.data('columnIndex');
                  scope.changePrecision(scope.colorder[colIdx] - 1, precision);
                }
              };

              items.push(item);
            });

            return items;
          };

          var getTimeSubitems = function() {
            var items = [];

            _.forOwn(TIME_UNIT_FORMATS, function(value, unit) {
              var item = {
                title: value.title,
                isChecked: function(container) {
                  var colIdx = container.data('columnIndex');
                  return scope.actualtype[scope.colorder[colIdx] - 1] === 8 &&
                    (unit === scope.formatForTimes || unit == 'DATETIME' && _.isEmpty(scope.formatForTimes));
                },
                action: function(el) {
                  scope.changeTimeFormat(unit);
                }
              };

              items.push(item);
            });

            return items;
          };

          var menuHelper = {
            doAlignment: function(el, key) {
              var container = el.closest('.bko-header-menu');
              var colIdx = container.data('columnIndex');

              //table variables
              var table = $('#' + scope.id).DataTable();
              var bodyColumn = table.column(colIdx).nodes().to$();
              var headerColumn = $(table.column(colIdx).header());
              //remove align class
              bodyColumn.removeClass('dtleft').removeClass('dtcenter').removeClass('dtright');
              headerColumn.removeClass('dtleft').removeClass('dtcenter').removeClass('dtright');

              //add align class
              switch (key){
                case 'L':
                  bodyColumn.addClass('dtleft');
                  headerColumn.addClass('dtleft');
                  break;
                case 'C':
                  bodyColumn.addClass('dtcenter');
                  headerColumn.addClass('dtcenter');
                  break;
                case 'R':
                  bodyColumn.addClass('dtright');
                  headerColumn.addClass('dtright');
                  break;
              }

              //update align
              scope.getCellAlign[scope.colorder[colIdx] - 1] = key;
              scope.actualalign[scope.colorder[colIdx] - 1] = key;
              bkSessionManager.setNotebookModelEdited(true);
            },
            checkAlignment: function(container, key) {
              var colIdx = container.data('columnIndex');
              return scope.actualalign[scope.colorder[colIdx] - 1] === key;
            },
            doSorting: function(el, direction) {
              var container = el.closest('.bko-header-menu');
              var colIdx = container.data('columnIndex');

              if (_.includes(['asc', 'desc'], direction)) {
                scope.table.order([colIdx, direction]).draw();
              }
            },
            checkSorting: function(container, direction) {
              var order = scope.table.order();
              var colIdx = container.data('columnIndex');

              // server ordering
              if (0 === order.length) {
                return false;
              }

              if (_.includes(['asc', 'desc'], direction)) {
                return (order[0][0] == colIdx && order[0][1] == direction);
              } else {
                return (order[0][0] !== colIdx);
              }
            },
            doFixColumnLeft: function (el) {
              var container = el.closest('.bko-header-menu');
              var colIdx = container.data('columnIndex');
              var fixed = this.isFixedLeft(container);
              scope.pagination.fixLeft = fixed ? 0 : colIdx;
              scope.applyChanges();
            },
            doFixColumnRight: function (el) {
              var container = el.closest('.bko-header-menu');
              var colIdx = container.data('columnIndex');
              var fixed = this.isFixedRight(container);
              scope.pagination.fixRight = fixed ? 0 : scope.columns.length - colIdx;
              scope.applyChanges();
            },
            isFixedRight: function (container) {
              var colIdx = container.data('columnIndex');
              return scope.columns.length - colIdx === scope.pagination.fixRight;
            },
            isFixedLeft: function (container) {
              var colIdx = container.data('columnIndex');
              return scope.pagination.fixLeft === colIdx;
            }
          };

          var headerMenuItems = {
            items: [
              {
                title: 'Hide column',
                action: function(el) {
                  var table = scope.table;
                  var container = el.closest('.bko-header-menu');
                  var colIdx = container.data('columnIndex');
                  var column = table.column(colIdx);

                  column.visible(!column.visible());
                }
              },
              {
                title: 'Filter...',
                icon: 'fa fa-filter',
                tooltip: 'filter with an expression with a variable defined for each column and $ means the current column.  eg "$ > 5"',
                action: function(el) {
                  var table = scope.table;
                  var container = el.closest('.bko-header-menu');
                  var colIdx = container.data('columnIndex');
                  var column = table.column(colIdx);

                  scope.doShowFilter(column, false);
                }
              },
              {
                title: 'Search...',
                icon: 'fa fa-search',
                tooltip: 'search this column for a substring',
                action: function(el) {
                  var table = scope.table;
                  var container = el.closest('.bko-header-menu');
                  var colIdx = container.data('columnIndex');
                  var column = table.column(colIdx);

                  scope.doShowFilter(column, true);
                }
              },
              {
                title: 'Format',
                action: null,
                items: getFormatSubitems
              },
              {
                title: 'Sort Ascending',
                separator: true,
                isChecked: function(container) {
                  return menuHelper.checkSorting(container, 'asc');
                },
                action: function(el) {
                  menuHelper.doSorting(el, 'asc');
                }
              },
              {
                title: 'Sort Descending',
                isChecked: function(container) {
                  return menuHelper.checkSorting(container, 'desc');
                },
                action: function(el) {
                  menuHelper.doSorting(el, 'desc');
                }
              },
              {
                title: 'No Sort',
                isChecked: function(container) {
                  return menuHelper.checkSorting(container);
                },
                action: function() {
                  scope.table.order([0, 'asc']).draw();
                }
              },
              {
                title: 'Align Left',
                separator: true,
                isChecked: function(container) {
                  return menuHelper.checkAlignment(container, 'L');
                },
                action: function(el) {
                  menuHelper.doAlignment(el, 'L');
                }
              },
              {
                title: 'Align Center',
                isChecked: function(container) {
                  return menuHelper.checkAlignment(container, 'C');
                },
                action: function(el) {
                  menuHelper.doAlignment(el, 'C');
                }
              },
              {
                title: 'Align Right',
                isChecked: function(container) {
                  return menuHelper.checkAlignment(container, 'R');
                },
                action: function(el) {
                  menuHelper.doAlignment(el, 'R');
                }
              },
              {
                title: 'Heatmap',
                shortcut: 'H',
                separator: true,
                isChecked: function(container) {
                  var colIdx = container.data('columnIndex');
                  var highlighter = scope.cellHighlighters[scope.colorder[colIdx]];
                  return highlighter && highlighter instanceof cellHighlighters.HeatmapHighlighter;
                },
                action: function(el) {
                  var container = el.closest('.bko-header-menu');
                  var colIdx = container.data('columnIndex');
                  scope.showHideHeatmap(scope.colorder[colIdx]);
                }
              },
              {
                title: 'Data Bars',
                shortcut: 'B',
                isChecked: function(container) {
                  var colIdx = container.data('columnIndex');
                  return scope.barsOnColumn[scope.colorder[colIdx]] === true;
                },
                action: function(el) {
                  var container = el.closest('.bko-header-menu');
                  var colIdx = container.data('columnIndex');
                  scope.showHideBars(scope.colorder[colIdx]);
                }
              },
              {
                title: 'Fix Left',
                isChecked: function(container) {
                  return menuHelper.isFixedLeft(container);
                },
                action: function(el) {
                  menuHelper.doFixColumnLeft(el);
                }
              },
              {
                title: 'Fix Right',
                isChecked: function(container) {
                  return menuHelper.isFixedRight(container);
                },
                action: function(el) {
                  menuHelper.doFixColumnRight(el);
                }
              }
            ]
          };

          // build configuration
          var converter = scope.allConverters[1];
          var createdCell = function (td, cellData, rowData, row, col) {
            if (scope.dataFontSize) {
              $(td).css({'font-size': scope.dataFontSize});
            }
          };
          if (scope.hasIndex) {
            for (var i = 0; i < scope.allTypes.length; i++) {
              if (scope.allTypes[i].name === scope.indexType) {
                converter = scope.allConverters[scope.allTypes[i].type];
                break;
              }
            }
            cols.push({'title' : scope.indexName, 'className': 'dtright', 'render': converter, createdCell: createdCell});
          } else {
            cols.push({'title': '    ', 'className': 'dtright', 'render': converter, createdCell: createdCell});
          }

          var beakerObj = bkHelper.getBeakerObject().beakerObj;
          scope.outputColumnLimit = beakerObj.prefs && beakerObj.prefs.outputColumnLimit
            ? beakerObj.prefs.outputColumnLimit : scope.columnNames.length;

          for (i = 0; i < scope.columnNames.length; i++) {
            var type = scope.actualtype[i];
            var al = scope.actualalign[i];
            var col = {
              'title' : '<span class="header-text">' + scope.columnNames[i] +'</span>',
              'header': { 'menu': headerMenuItems },
              'visible': i<scope.outputColumnLimit,
            };
            col.createdCell = function (td, cellData, rowData, row, col) {
              if(!_.isEmpty(scope.tooltips)){
                $(td).attr('title', scope.tooltips[row][col - 1]);
              }
              if (scope.dataFontSize) {
                $(td).css({'font-size': scope.dataFontSize});
              }
              if (!_.isEmpty(scope.fontColor)) {
                var color = scope.fontColor[row][col - 1];
                var color_opacity = parseInt(color.substr(1, 2), 16) / 255;
                $(td).css({
                  'color': "#" + color.substr(3),
                  'opacity': color_opacity
                });
              }
            };

            if (al === 'R') {
              col.className = 'dtright';
            } else if (al === 'C') {
              col.className = 'dtcenter';
            }

            var stringFormatForColumn = scope.stringFormatForColumn[scope.columnNames[i]];
            if (stringFormatForColumn && stringFormatForColumn.type === 'value' && type === 0){
              col.render = scope.valueFormatter;
            } else if (scope.isDoubleWithPrecision(type)) {
              col.render = scope.doubleWithPrecisionConverters[scope.getDoublePrecision(type)];
            } else if (scope.allConverters[type] !== undefined) {
              col.render = scope.allConverters[type];
            }
            if (scope.getCellSho) {
              col.visible = scope.getCellSho[i];
            }
            if (scope.columnWidth) {
              col.sWidth = scope.columnWidth[i] || 0;
            }
            cols.push(col);
          }

          scope.columns = cols;

          var id = '#' + scope.id;
          var init = {
            'destroy' : true,
            'data': scope.data,
            'columns': scope.columns,
            'stateSave': true,
            'processing': true,
            'autoWidth': true,
            'ordering': true,
            'order': scope.tableOrder ? _.cloneDeep(scope.tableOrder) : [],
            'scrollX': '10%',
            'searching': true,
            'deferRender': true,
            'language': {
              'emptyTable': 'empty table'
            },
            'preDrawCallback': function(settings) {
              scope.updateTableWidth();
              if(scope.table){
                //allow cell's text be truncated when column is resized to a very small
                scope.table.columns().every(function(i){
                  var colWidth = settings.aoColumns[i].sWidthOrig;
                  if (colWidth) {
                    settings.aoColumns[i].sWidth = colWidth;
                    $(scope.table.column(i).nodes())
                      .css('max-width', colWidth)
                      .css('min-width', colWidth);
                  }
                });
              }
            },
            'drawCallback': function(settings) {
              //jscs:disable
              scope.update_size();
              scope.update_selected();
              scope.updateBackground();
              scope.updateDTMenu();
              //jscs:enable
            },
            'bSortCellsTop': true,
            'colResize': {
              'tableWidthFixed': false,
              'resizeCallback': function(column){
                scope.columnWidth[scope.colorder[column.idx] - 1] = column.sWidthOrig;
              },
              'exclude': _.range(scope.columns.length - scope.pagination.fixRight, scope.columns.length)
            }
          };

          var domCommon = '<"bko-table"Z' + (scope.data.length > 500 ? 'r' : '') + 't';
          if (!scope.pagination.use) {
            init.paging = false;
            init.scrollY = scope.getScrollY();
            init.scrollCollapse = true;
            init.dom = domCommon + '>';
          } else {
            init.dom = domCommon + '<"bko-table-bottom"<"bko-table-selector"l><"bko-table-pagenum"p><"bko-table-use-pagination">>S>';
            if (scope.data.length > MIN_ROWS_FOR_PAGING) {
              init.pagingType = 'simple_numbers';
              init.pageLength = scope.pagination.rowsToDisplay;
              init.lengthMenu = scope.rowsToDisplayMenu;
            } else {
              init.paging = false;
              init.scrollCollapse = true;
            }
          }
          scope.fixcreated = false;
          if (!_.isEmpty(scope.contextMenuItems)) {
            $.contextMenu({
              selector: id +' tbody td',
              items: scope.contextMenuItems
            });
          }

          var rotateMenuItem = {
            callback: function (itemKey, options) {
              scope.headersVertical = !!!scope.headersVertical;
              scope.rotateHeader();
              scope.table.draw();
            }
          };
          $.contextMenu({
            selector: id +'_wrapper thead',
            zIndex: 3, //to be over fixed headers
            items: {
              verticalHeaders: _.extend({}, rotateMenuItem, {
                name: 'vertical headers',
                visible: function(key, opt){
                  return !!!scope.headersVertical;
                }
              }),
              horizontalHeaders: _.extend({}, rotateMenuItem, {
                name: 'horizontal headers',
                visible: function(key, opt){
                  return !!scope.headersVertical;
                }
              })
            }
          });

          $(document).on('contextmenu.bko-dt-header', id +'_wrapper thead th', function(){
            $(this).blur();
          });

          bkHelper.timeout(function() {
            // we must wait for the DOM elements to appear
            $(id).parents('.dataTables_scroll').find('th, td')
              .removeClass(FC_LEFT_SEPARATOR_CLASS + ' ' + FC_RIGHT_SEPARATOR_CLASS);
            scope.table = $(id).DataTable(init);

            scope.updateHeaderLayout();

            scope.table.settings()[0].oScroll.iBarWidth = scope.scrollbarWidth;
            scope.renderMenu = true;
            if (!scope.colorder) {
              scope.colorder = _.range(scope.columnNames.length + 1);
            }
            scope.colreorg = new $.fn.dataTable.ColReorder($(id), {
              'order': scope.colorder,
              'fnReorderCallback': function() {
                if (scope.colreorg === undefined || scope.colreorg.s == null) {
                  return;
                }
                scope.colorder = scope.colreorg.fnOrder().slice(0);
                scope.refreshCells();
                scope.applyFilters();
                scope.updateBackground();
                scope.$digest();
              },
              'iFixedColumns': scope.pagination.fixLeft + 1,
              'iFixedColumnsRight': scope.pagination.fixRight
            });
            scope.keyTable = new $.fn.dataTable.KeyTable($(id));
            scope.refreshCells();

            if(init.paging !== false){
              var pagination = $(element).find(".bko-table-use-pagination");
              $('<input type="checkbox" checked="true" id=' + scope.id +'usePagination class="beforeCheckbox">')
                .bind('click', function (e) {
                  scope.doUsePagination();
                })
                .appendTo(pagination);
              $('<label for=' + scope.id +'usePagination> use pagination</label>')
                .appendTo(pagination);
            }

            /*
            $(id + ' tbody').off('click');
            */
            $(id + ' tbody').on('dblclick', 'td', function(e) {
              if (!scope.table) { return; }
              var rowIdx;
              var colIdx;
              var iPos = scope.table.cell(this).index();
              if (iPos) { //selected regular cell
                rowIdx = iPos.row;
                colIdx = iPos.column;
              } else { //selected fixed column or index cell
                var position = scope.fixcols.fnGetPosition(this);
                rowIdx = position[0];
                if ($(this).parents().hasClass('DTFC_RightWrapper')) {
                  var order = scope.colorder;
                  var fixRight = scope.pagination.fixRight;
                  var colIdxInRight = position[1];
                  colIdx = order[order.length - fixRight + colIdxInRight];
                } else {
                  colIdx = position[1];
                }
              }

              var currentCell = scope.table.cells(function (idx, data, node) {
                return idx.column === colIdx && idx.row ===  rowIdx;
              });
              var currentCellNodes = $(currentCell.nodes());

              var isCurrentCellSelected = currentCellNodes.hasClass('selected');

              if (scope.selected[rowIdx]) {
                scope.selected[rowIdx] = false;
                $(scope.table.row(rowIdx).node()).removeClass('selected');
                scope.selectFixedColumnRow(rowIdx, false);
              }

              $(scope.table.cells().nodes()).removeClass('selected');
              if (scope.fixcols) {
                _.each(scope.selected, function(selected, index){
                  if(!selected){
                    scope.selectFixedColumnRow(index, false);
                  }
                });
              }
              if (!isCurrentCellSelected) {
                currentCellNodes.addClass('selected');
                if(iPos === undefined) {
                  scope.selectFixedColumnCell($(this), true);
                }
              }

              var index = currentCell.indexes()[0];
              if (model.hasDoubleClickAction) {
                tableService.onDoubleClick(model['update_id'],
                  index.row,
                  index.column - 1,
                  scope.model.getEvaluatorId()).then(function () {
                  scope.update = true;
                });
              }

              if (!_.isEmpty(model.doubleClickTag)) {
                var params = {
                  actionType: 'DOUBLE_CLICK',
                  row: index.row,
                  col: index.column - 1
                };
                tableService.setActionDetails(model['update_id'],
                                              scope.model.getEvaluatorId(),
                                              params).then(function () {
                  scope.evaluateTagCell(model.doubleClickTag);
                });
              }

              e.stopPropagation();
            });

            $(id + ' tbody').on('click', 'tr', function(event) {
              if (!scope.table) { return; }
              var dtTR = scope.getDtRow(this);
              var iPos = scope.table.row(dtTR).index();
              if (scope.selected[iPos]) {
                scope.selected[iPos] = false;
                $(dtTR).removeClass('selected');
                scope.selectFixedColumnRow(iPos, false);
              } else {
                scope.selected[iPos] = true;
                $(dtTR).addClass('selected');
                scope.selectFixedColumnRow(iPos, true);
              }
            });

            $(id + ' tbody')
              .on('mouseenter.bko-dt-highlight', 'tr', function () {
                if (!scope.table) { return; }
                var dtTR = scope.getDtRow(this);
                var rowIndex = scope.table.row(dtTR).index();
                $(dtTR).addClass('hover');
                scope.highlightFixedColumnRow (rowIndex, true);
              })
              .on('mouseleave.bko-dt-highlight', 'tr', function () {
                if (!scope.table) { return; }
                var dtTR = scope.getDtRow(this);
                var rowIndex = scope.table.row(dtTR).index();
                $(dtTR).removeClass('hover');
                scope.highlightFixedColumnRow (rowIndex, false);
              });

            $(scope.table.table().container()).find('.dataTables_scrollHead').on('scroll', function () {
              var filtersInFocus = $(scope.table.table().container()).find('.filter-input:focus');
              if (filtersInFocus.length) {
                scope.stopFilterEditing(filtersInFocus);
              }
            });

            scope.removeOnKeyListeners();

            if (scope.update) {
              scope.addInteractionListeners();
            }

            scope.table
              .on('key', function (e, datatable, key, cell, originalEvent) {
                originalEvent.preventDefault();
                scope.onKeyAction(cell.index().column, originalEvent);
              })
              .on('column-visibility.dt', function (e, settings, column, state) {
                scope.getCellSho[scope.colorder[column] - 1] = state;
                setTimeout(function(){
                  scope.updateHeaderLayout();
                  scope.table.draw(false);
                }, 0);
              })
              .on( 'column-sizing.dt', function ( e, settings ) {
                scope.updateTableWidth();
              });

            function updateSize() {
              clearTimeout(scope.refresh_size);
              scope.refresh_size = setTimeout(function () {
                scope.update_size();
              }, 250);
            }

            $(window).bind('resize.' + scope.id, function () {
              updateSize();
            });

            scope.$on(GLOBALS.EVENTS.ADVANCED_MODE_TOGGLED, function () {
              updateSize();
            });

            var inits = {'heightMatch': 'none'};
            if ((scope.pagination.fixLeft + scope.pagination.fixRight) > (scope.columns.length - 1)) {
              scope.pagination.fixLeft = 0;
              scope.pagination.fixRight = 0;
            }
            if (scope.pagination.fixLeft) {
              inits.leftColumns = 1 + scope.pagination.fixLeft;
            } else {
              inits.leftColumns = 1;
            }
            if (scope.pagination.fixRight) {
              inits.rightColumns = scope.pagination.fixRight;
            } else {
              inits.rightColumns = 0;
            }

            scope.updateFixedColumnsSeparator();

            scope.fixcols = new $.fn.dataTable.FixedColumns($(id), inits);
            scope.fixcols.fnRedrawLayout();
            $rootScope.$emit('beaker.resize');

            setTimeout(function(){
              if (!scope.table) { return; }
              scope.applyFilters();
              if (scope.columnFilter) {
                scope.table.columns().every(function (i) {
                  var column = this;
                  var jqInput = scope.getColumnFilter(column);
                  if (i === 0) {
                    var filterValue = scope.tableFilter;
                    jqInput.val(filterValue);
                    if (scope.columnSearchActive && !_.isEmpty(filterValue)) {
                      scope.table.search(filterValue);
                    }
                  } else {
                    var filterValue = scope.columnFilter[scope.colorder[i] - 1];
                    jqInput.val(filterValue);
                    if (scope.columnSearchActive && !_.isEmpty(filterValue)) {
                      column.search(filterValue);
                    }
                  }
                });
              }
              if (scope.showFilter) {
                scope.doShowFilter(null, scope.columnSearchActive);
              }
              $rootScope.$emit('beaker.resize');

            }, 0);

          }, 0);
        };

        scope.menuToggle = function() {
          var getTableData = function() {
            var rows = scope.table.rows(function(index, data, node) {
              return scope.selected[index];
            });
            if (rows === undefined || rows.indexes().length === 0) {
              rows = scope.table.rows();
            }
            var out = scope.exportTo(rows, 'tabs');
            return out;
          };

          var queryCommandEnabled = true;
          try {
            document.execCommand('Copy');
          } catch (e) {
            queryCommandEnabled = false;
          }

          if (((!bkUtils.isElectron) && (scope.clipclient === undefined) && !queryCommandEnabled)
            || bkHelper.isSafari) {
            scope.clipclient = new ZeroClipboard();
            var d = document.getElementById(scope.id + '_dt_copy');
            scope.clipclient.clip(d);
            scope.clipclient.on('copy', function(event) {
              var clipboard = event.clipboardData;
              clipboard.setData('text/plain', getTableData());
            });
          } else if (bkUtils.isElectron) {
            document.getElementById(scope.id + '_dt_copy').onclick = function() {
              bkElectron.clipboard.writeText(getTableData(), 'text/plain');
            }
          }
        };

        scope.showHeaderMenu = function() {
          $('#' + scope.id + '_modal_dialog').hide();
          bkHelper.timeout(function() {
            $('#' + scope.id + '_dropdown_menu').click();
            $('#' + scope.id + '_show_column > .dropdown-menu').css('display', 'block');
          }, 0);
        };

        scope.hideModal = function(){
          var id = scope.id + '_modal_dialog';
          $('#'+id).hide()
        };

        scope.getDumpState = function() {
          return scope.model.getDumpState();
        };

        var savedstate = scope.model.getDumpState();
        if (savedstate !== undefined && savedstate.datatablestate !== undefined) {
          scope.savedstate = savedstate.datatablestate;
        }

        scope.$on('$destroy', function() {
          scope.doDestroy(true);
        });

        scope.$watch('getDumpState()', function(result) {
          if (result !== undefined && result.datatablestate === undefined) {
            var state = {
              'pagination'  : scope.pagination
            };
            if (scope.columnNames !== undefined) {
              state.columnNames = scope.columnNames.slice(0);
            }
            if (scope.actualtype !== undefined) {
              state.actualtype = scope.actualtype.slice(0);
            }
            if (scope.actualalign !== undefined) {
              state.actualalign = scope.actualalign.slice(0);
            }
            if (scope.colorder !== undefined) {
              state.colorder = scope.colorder.slice(0);
            }
            if (scope.getCellSho !== undefined) {
              state.getCellSho = scope.getCellSho;
            }
            if (scope.barsOnColumn !== undefined) {
              state.barsOnColumn = scope.barsOnColumn;
            }
            if (scope.cellHighlighters !== undefined) {
              state.cellHighlightersData = _.map(scope.cellHighlighters, function(highlighter, colInd){
                return highlighter;
              });
            }
            if (scope.tableFilter !== undefined) {
              state.tableFilter = scope.tableFilter;
            }
            if (scope.showFilter !== undefined) {
              state.showFilter = scope.showFilter;
            }
            if (scope.columnSearchActive !== undefined) {
              state.columnSearchActive = scope.columnSearchActive;
            }
            if (scope.columnFilter !== undefined) {
              state.columnFilter = scope.columnFilter;
            }
            if (scope.columnWidth !== undefined) {
              state.columnWidth = scope.columnWidth;
            }
            if (scope.tableOrder !== undefined) {
              state.tableOrder = scope.tableOrder.slice(0);
            }

            if (scope.formatForTimes !== undefined) {
              state.formatForTimes = scope.formatForTimes;
            }

            if (scope.stringFormatForType !== undefined) {
              state.stringFormatForType = scope.stringFormatForType;
            }

            if (scope.stringFormatForColumn !== undefined) {
              state.stringFormatForColumn = scope.stringFormatForColumn;
            }

            if (scope.tooltips !== undefined) {
              state.tooltips = scope.tooltips;
            }

            if (scope.headerFontSize !== undefined) {
              state.headerFontSize = scope.headerFontSize;
            }

            if (scope.dataFontSize !== undefined) {
              state.dataFontSize = scope.dataFontSize;
            }

            if (scope.fontColor !== undefined) {
              state.fontColor = scope.fontColor;
            }

            if (scope.headersVertical !== undefined) {
              state.headersVertical = scope.headersVertical;
            }

            if (scope.model.setDumpState !== undefined) {
              scope.model.setDumpState({datatablestate: state});
            }
          }
        });

        scope.getCellModel = function() {
          return scope.model.getCellModel();
        };
        scope.isShowOutput = function() {
          return scope.model.isShowOutput();
        };

        var tableChanged = false;

        scope.$watch('getCellModel()', function(m) {
          if(!angular.equals(m, cellModel)){
            cellModel = m;
            if (scope.update) {
              scope.applyChanges();
            } else {
              scope.init(m, true);
            }
            tableChanged = true;
          }
        });

        scope.$on('beaker.section.toggled', function(e, isCollapsed) {
          if (!isCollapsed && scope.table !== undefined) {
            bkHelper.timeout(function() {
              scope.table.draw(false);
            });
          }
        });

        scope.updateDTMenu = function(){
          if(scope.table){
            var orderInfo = scope.table.order()[0];
            if (orderInfo) {
              scope.isIndexColumnDesc = orderInfo[0] === 0 && orderInfo[1] === 'desc';
              if (!(scope.$$phase || $rootScope.$$phase)) {
                scope.$apply();
              }
            }
          }
        };

        scope.getDtRow = function (node) {
          var dtRow;
          var iPos = scope.table.row(node).index();
          if (iPos === undefined) { //node is fixed column
            iPos = scope.fixcols.fnGetPosition(node);
            dtRow = scope.table.row(iPos).node();
          } else { //regular node
            dtRow = node;
          }
          return dtRow;
        };

        scope.updateTableWidth = function () {
          var me = $('#' + scope.id);
          me.css('width', me.outerWidth());
        };

      }
    };
  }]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function () {
  'use strict';
  beakerRegister.bkoFactory('cellHighlighters', [
    'bkUtils',
    'GLOBALS',
    function (bkUtils,
              GLOBALS) {
      ///////////////constants///////////////
      var HIGHLIGHT_STYLE = {
        FULL_ROW: 'FULL_ROW',
        SINGLE_COLUMN: 'SINGLE_COLUMN'
      };
      ///////////////constants///////////////

      var getValue = function (obj, value, defaultValue) {
        return obj[value] != null ? obj[value] : defaultValue;
      };

      ///////////////colors///////////////
      var formatColor = function (hexColor) {
        //remove alpha
        return hexColor.length > 7 ? '#' + hexColor.substr(3) : hexColor;
      };
      var rgbToHex = function (r, g, b) {
        return formatColor(bkUtils.rgbaToHex(r, g, b));
      };
      var DEFAULT_COLORS = {};
      DEFAULT_COLORS[GLOBALS.THEMES.DEFAULT] = {
        red: rgbToHex(241, 88, 84),
        blue: rgbToHex(93, 165, 218),
        green: rgbToHex(96, 189, 104)
      };
      DEFAULT_COLORS[GLOBALS.THEMES.AMBIANCE] = {
        red: rgbToHex(191, 39, 31),
        blue: rgbToHex(46, 119, 191),
        green: rgbToHex(75, 160, 75)
      };
      var getDefaultColor = function (color) {
        return DEFAULT_COLORS[bkHelper.getTheme()][color];
      };
      ///////////////colors///////////////

      ///////////////Base Highlighter///////////////
      var CellHighlighter = function (data) {
        if (!data) { data = {}; }
        _.extend(this, {
          style: getValue(data, 'style', HIGHLIGHT_STYLE.SINGLE_COLUMN),
          colInd: data.colInd,
          type: data.type,
        });
        this.removeHighlight = function (table) {
          var self = this;
          table.column(this.colInd).nodes().each(function (td) {
            var nodeToHighlight = self.style === HIGHLIGHT_STYLE.SINGLE_COLUMN ?
              $(td) : $(table.row(table.cell(td).index().row).node()).find('td');
            nodeToHighlight.css({'background-color': ''});
          });
        };
      };
      ///////////////Base Highlighter///////////////

      ///////////////Heatmap Highlighter///////////////
      var HeatmapHighlighter = function (data) {
        if (!data) { data = {}; }
        CellHighlighter.call(this, data);
        _.extend(this, {
          type: 'HeatmapHighlighter',
          minVal: data.minVal,
          maxVal: data.maxVal,
          minColor: formatColor(getValue(data, 'minColor', getDefaultColor('blue'))),
          maxColor: formatColor(getValue(data, 'maxColor', getDefaultColor('red')))
        });

        this.colorScale = function (min, max) {
          return d3.scale.linear().domain([min, max]).range([this.minColor, this.maxColor]);
        };

        this.doHighlight = function (table) {
          var data = table.column(this.colInd).data();
          if (this.minVal == null) {
            this.minVal = getValue(data, 'minVal', data.min());
          }
          if (this.maxVal == null) {
            this.maxVal = getValue(data, 'maxVal', data.max());
          }
          var colorScaleFunction = this.colorScale(this.minVal, this.maxVal);

          var self = this;
          table.column(self.colInd).nodes().each(function (td) {
            var value = $(td).text();
            if ($.isNumeric(value)) {
              var color = colorScaleFunction(value);
              var nodeToHighlight = self.style === HIGHLIGHT_STYLE.SINGLE_COLUMN ?
                $(td) : $(table.row(table.cell(td).index().row).node()).find('td');
              nodeToHighlight.css({
                'background-color': color
              });
            }
          });
        };
      };
      ///////////////Heatmap Highlighter///////////////

      //////////ThreeColorHeatmap Highlighter//////////
      var ThreeColorHeatmapHighlighter = function (data) {
        if (!data) { data = {}; }
        HeatmapHighlighter.call(this, data);
        _.extend(this, {
          type: 'ThreeColorHeatmapHighlighter',
          midVal: data.midVal,
          midColor: formatColor(data.midColor)
        });
        this.colorScale = function (min, max) {
          if (this.midVal == null) {
            this.midVal = (min + max) / 2;
          }
          return d3.scale.linear(min, max).domain([min, this.midVal, max]).range([this.minColor, this.midColor, this.maxColor]);
        };
      };
      //////////ThreeColorHeatmap Highlighter//////////

      //////////UniqueEntriesHighlighter//////////
      var UniqueEntriesHighlighter = function (data) {
        if (!data) { data = {}; }
        CellHighlighter.call(this, data);
        _.extend(this, {
          type: 'UniqueEntriesHighlighter'
        });

        var generateColor = function (colorNum, colors) {
          return "hsl(" + (colorNum * (360 / colors)) + ", 75%, 85%)";
        };

        var findUniqueValues = function (colData) {
          return colData.unique().toArray();
        };

        this.doHighlight = function (table) {
          var uniqueValues = findUniqueValues(table.column(this.colInd).data());
          var uniqueColors = {};
          _.forEach(uniqueValues, function(value, index){
            uniqueColors[value] = generateColor(index, uniqueValues.length);
          });
          var self = this;
          table.column(self.colInd).nodes().each(function (td) {
            var value = table.cell(td).data();
            if ($.isNumeric(value)) {
              var color = uniqueColors[value];
              var nodeToHighlight = self.style === HIGHLIGHT_STYLE.SINGLE_COLUMN ?
                $(td) : $(table.row(table.cell(td).index().row).node()).find('td');
              nodeToHighlight.css({
                'background-color': color
              });
            }
          });
        };
      };
      //////////UniqueEntriesHighlighter//////////

      ///////////////Value Highlighter///////////////
      var ValueHighlighter = function (data) {
        if (!data) { data = {}; }
        CellHighlighter.call(this, data);
        _.extend(this, {
          colors: data.colors,
          type: 'ValueHighlighter',
          style: HIGHLIGHT_STYLE.SINGLE_COLUMN
        });
        this.doHighlight = function (table) {
          var self = this;
          table.column(self.colInd).nodes().each(function (td) {
            var index = table.cell(td).index();
            var color = self.colors[index.row];
            if(color){
              $(td).css({
                'background-color': formatColor(color)
              });
            }
          });
        };
      };
      ///////////////Value Highlighter///////////////

      return {
        HeatmapHighlighter: HeatmapHighlighter,
        ThreeColorHeatmapHighlighter: ThreeColorHeatmapHighlighter,
        createHighlighter: function (type, data) {
          switch (type) {
            case 'HeatmapHighlighter':
              return new HeatmapHighlighter(data);
            case 'ThreeColorHeatmapHighlighter':
              return new ThreeColorHeatmapHighlighter(data);
            case 'UniqueEntriesHighlighter':
              return new UniqueEntriesHighlighter(data);
            case 'ValueHighlighter':
              return new ValueHighlighter(data);
          }
        }
      }
    }]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var retfunc = function (bkUtils) {
    var onAction = function (action, tableId, params, evaluatorId) {
      if (window.languageServiceBase && window.languageServiceBase[evaluatorId]) {
        var defer = bkUtils.httpPostJson(
          window.languageServiceBase[evaluatorId] + '/tabledisplay/' +
          action + '/' +
          tableId,
          params
        );
        defer.then(
          undefined,
          function () { console.error('send ' + action + ' event error'); });
        return defer;
      } else {
        var defer = bkHelper.newDeferred();
        setTimeout(function () {
          console.error('send ' + action + ' event error, evaluator ' + evaluatorId + 'is not found');
          defer.reject();
        }, 0);
        return defer.promise;
      }
    };
    return {
      onDoubleClick: function (tableId, row, column, evaluatorId) {
        return onAction('ondoubleclick', tableId, [row, column], evaluatorId);
      },
      onContextMenu: function (tableId, menuKey, row, column, evaluatorId) {
        return onAction('oncontextmenu', tableId, [menuKey, row, column], evaluatorId);
      },
      setActionDetails: function (tableId, evaluatorId, params) {
        return onAction('actiondetails', tableId, params, evaluatorId);
      }
    };
  };
  beakerRegister.bkoFactory('tableService', ['bkUtils', retfunc]);
})();
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoImage
 * This is the output display component for displaying images transferred in byte arrays.
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective("Image", function() {
    return {
      template: "<img />",
      link: function(scope, element, attrs) {
        var img = element.find("img").first();
        if (scope.model.getCellModel()) {
          img.attr("src", "data:image/png;base64," +
              scope.model.getCellModel().imageData);
        }
      }
    };
  });
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoLatex
 * This is the output display component for displaying results of LaTex code.
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective('Latex', ["bkUtils", function(bkUtils) {

    return {
      link: function(scope, element, attrs) {
        scope.$watch('model.getCellModel()', function(newValue) {
          try {
            katex.render(newValue, element[0], {throwOnError : false});
          } catch(err) {
            bkHelper.show1ButtonModal(err.message+'<br>See: <a target="_blank" href="http://khan.github.io/KaTeX/">KaTeX website</a> and its <a target="_blank" href="https://github.com/Khan/KaTeX/wiki/Function-Support-in-KaTeX">list of supported functions</a>.', "KaTex error");
          }
        });
      }
    };
  }]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoProgress
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective("Progress", ["$interval", "$compile", "$rootScope", "bkEvaluateJobManager", "bkUtils",
    "bkNotificationService", "bkOutputDisplayFactory", "bkSparkContextManager",
    function(
      $interval, $compile, $rootScope, bkEvaluateJobManager, bkUtils, bkNotificationService,
      bkOutputDisplayFactory, bkSparkContextManager) {
    return {
      template: JST['mainapp/components/notebook/output-progress'],
      require: '^bkOutputDisplay',
      link: function(scope, element, attrs, outputDisplayCtrl) {
        scope.elapsed = 0;
        var computeElapsed = function() {
          var now = new Date().getTime();
          var start;
          if ( scope.model.getCellModel() !== undefined)
            start = scope.model.getCellModel().startTime;
          else
            start = now;
          scope.elapsed = now - start;
          if (!(scope.$$phase || $rootScope.$$phase)) {
            // we don't execute the $interval within $apply so we have to manually refresh it. This refreshes only this scope.
            scope.$digest();
          }
        };
        var intervalPromise = $interval(function() {
          computeElapsed();
          if (scope.elapsed > 60 * 1000) {
            $interval.cancel(intervalPromise);
            intervalPromise = $interval(function() {
              computeElapsed();
            }, 1000, 0, false);
          }
        }, 100, 0, false);
        scope.getElapsedTime = function() {
          return bkUtils.formatTimeString(scope.elapsed);
        };
        scope.getMessage = function() {
          return scope.model.getCellModel().message;
        };
        scope.hasMessage = function() {
          return scope.model.getCellModel().message !== undefined;
        };
        scope.getProgressBar = function() {
          return scope.model.getCellModel().progressBar;
        };
        scope.hasProgressBar = function() {
          return scope.model.getCellModel().progressBar >= 0;
        };
        scope.hasOutputData = function() {
          return scope.model.getCellModel().outputdata !== undefined && scope.model.getCellModel().outputdata.length > 0;
        };
        scope.hasPayload = function() {
          return scope.model.getCellModel().payload !== undefined;
        };
        scope.getPayloadType = function() {
          if (scope.hasPayload())
            return scope.model.getCellModel().payload.type;
          return undefined;
        };
        scope.getPayload = function() {
          return scope.model.getCellModel().payload;
        };
        scope.cancel = function() {
          bkEvaluateJobManager.cancel();
        };
        scope.isCancellable = function() {
          return bkEvaluateJobManager.isCancellable();
        };
        outputDisplayCtrl.initAvailableNotificationMethods();
        scope.getAvailableNotificationMethods = function () {
          return outputDisplayCtrl.getAvailableNotificationMethods();
        };
        scope.toggleNotifyWhenDone = function (notificationMethod) {
          outputDisplayCtrl.toggleNotifyWhenDone(notificationMethod);
        };
        scope.isNotifyWhenDone = function (notificationMethod) {
          return outputDisplayCtrl.isNotifyWhenDone(notificationMethod);
        };
        scope.$on("$destroy", function() {
          $interval.cancel(intervalPromise);
        });
        scope.getOutputResult = function() {
          return scope.model.getCellModel().payload;
        };
        scope.usesSpark = function() {
          return (scope.model.getEvaluatorId() === "Scala"
            && bkSparkContextManager.isAvailable()
            && bkSparkContextManager.isConnected());
        };

        scope.isShowMenu = function() { return false; };
        
        scope.$watch('getPayload()', function() {
          if (scope.hasPayload()) {
            scope.outputDisplayModel = {
                result : scope.getPayload()
            };
          }
        });
      }
    };
  }]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoResults
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective("Results", ["$interval", "$compile", "bkOutputDisplayFactory", "bkAnsiColorHelper", "$sce",
    function($interval, $compile, bkOutputDisplayFactory, bkAnsiColorHelper, $sce) {
    return {
      template: JST['mainapp/components/notebook/output-results'],
      link: function(scope, element, attrs) {
        scope.hasPayload = function() {
          return scope.model.getCellModel().payload !== undefined;
        };
        scope.isPayloadHidden = function () {
          return !!scope.getPayload() && scope.getPayload().type == 'HiddenOutputCell';
        };
        scope.getPayload = function() {
          return scope.model.getCellModel().payload;
        };
        scope.getOutputData = function() {
          return scope.model.getCellModel().outputdata;
        };
        scope.hasOutputData = function() {
          return scope.model.getCellModel().outputdata !== undefined && scope.model.getCellModel().outputdata.length>0;
        };
        scope.getOutputResult = function() {
          return scope.model.getCellModel().payload;
        };
        scope.isShowOutput = function() {
          return scope.model.isShowOutput();
        };
        scope.colorizeIfNeeded = function (text) {
          return $sce.trustAsHtml(bkAnsiColorHelper.hasAnsiColors(text) 
            ? bkAnsiColorHelper.convertToHtml(text) 
            : _.escape(text));
        };

        scope.isShowMenu = function() { return false; };
        scope.showoutput = scope.model.isShowOutput();

        scope.payload = {
          result: undefined,
          isShowOutput: function () {
            return scope.showoutput;
          }
        };
        
        scope.$watch('getPayload()', function() {
          if (scope.hasPayload()) {
            scope.payload.result = scope.getPayload();
          }
        });

        scope.$watch('isShowOutput()', function(oldval, newval) {
          scope.showoutput = newval;
        });

        scope.$watch('getOutputData()', function() {
          if (scope.hasOutputData()) {
            scope.outputdata =  scope.getOutputData()
          }
        });
      }
    };
  }]);
  beakerRegister.registerOutputDisplay("Results", ["Results", "Text"]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoResults
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective("GGVis", ["$interval", "$compile", "$sce", "$rootScope", "bkOutputDisplayFactory", function(
      $interval, $compile, $sce, $rootScope, bkOutputDisplayFactory) {
    return {
      template: '<div><iframe srcdoc="{{getStuff()}}" style="height: 450px; width: 650px; resize: both; overflow: auto; border: 0;"></iframe></div>',
      link: function(scope, element, attrs) {
        scope.header = '<!DOCTYPE html>' +
          '<html>\n' +
          '<head>\n' +
          '<meta charset="utf-8"/>\n' +
          '<script src="app/vendor/ggvis/lib/jquery/jquery.min.js"></script>\n' +
          '<script src="app/vendor/ggvis/lib/detect-resize/jquery.resize.js"></script>\n' +
          '<link href="app/vendor/ggvis/lib/jquery-ui/jquery-ui.min.css" rel="stylesheet" />\n' +
          '<script src="app/vendor/ggvis/lib/jquery-ui/jquery-ui.min.js"></script>\n' +
          '<script src="app/vendor/ggvis/lib/d3/d3.min.js"></script>\n' +
          '<script src="app/vendor/ggvis/lib/vega/vega.min.js"></script>\n' +
          '<script src="app/vendor/ggvis/lib/lodash/lodash.min.js"></script>\n' +
          '<script>var lodash = _.noConflict();</script>\n' +
          '<link href="app/vendor/ggvis/ggvis/css/ggvis.css" rel="stylesheet" />\n' +
          '<script src="app/vendor/ggvis/ggvis/js/ggvis.js"></script>\n' +
          '</head>\n' +
          '<body style="background-color:white;">\n';
        
        scope.footer = '</body>\n' +
          '</html>\n';
        
        scope.getModel = function() {
          return scope.model.getCellModel();
        };
        scope.isShowOutput = function() {
          return scope.model.isShowOutput();
        };
        scope.getStuff = function() {
          if (scope.payload)
            return $sce.trustAsHtml(scope.header+scope.payload.first+scope.payload.second+scope.footer);
          return $sce.trustAsHtml(scope.header + scope.footer);
        };
        
        scope.isShowMenu = function() { return false; };
        scope.showoutput = scope.model.isShowOutput();        
        scope.payload = scope.getModel();
        
        scope.$watch('getModel()', function() {
          scope.payload = scope.getModel();
        });

        scope.$watch('isShowOutput()', function(oldval, newval) {
          scope.showoutput = newval;
        });

        var debouncedOnResize = _.debounce(onResize, 100);
        var iframeEl = element.find('iframe').on('load', onLoad);
        
        function onLoad(e) {
          var iframeContentWindow = iframeEl[0].contentWindow;
          iframeContentWindow.addEventListener('resize', debouncedOnResize);
          iframeEl.off('load', onLoad);
          iframeEl = null;
        
          scope.$on('$destroy', function() {
            iframeContentWindow.removeEventListener('resize', debouncedOnResize);
            iframeContentWindow = null;
          });
        }

        function onResize() {
          $rootScope.$emit('beaker.resize');
        }
      }
    };
  }]);
  beakerRegister.registerOutputDisplay("GGVis", ["GGVis", "Text"]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoResults
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective("DiagrammeR", ["$interval", "$compile", "$sce", "bkOutputDisplayFactory", function(
      $interval, $compile, $sce, bkOutputDisplayFactory) {
    return {
      template: '<div><iframe srcdoc="{{getView()}}" style="height: 500px; width: 900px; resize: both; overflow: auto; border: 0;"></iframe></div>',
      link: function(scope, element, attrs) {
        scope.templateCode =
          "<!DOCTYPE html>\n" +
          "<html>\n" +
          "<head>\n" +
          "<meta charset=\"utf-8\"/>\n" +
          "<script src=\"app/vendor/htmlwidgets/htmlwidgets.js\"></script>\n" +
          "<script src=\"app/vendor/bower_components/d3/d3.min.js\"></script>\n" +
          "<link href=\"app/vendor/diagrammer/lib/mermaid/dist/mermaid.css\" rel=\"stylesheet\" />\n" +
          "<script src=\"app/vendor/diagrammer/lib/mermaid/dist/mermaid.slim.min.js\"></script>\n" +
          "<link href=\"app/vendor/diagrammer/lib/styles/styles.css\" rel=\"stylesheet\" />\n" +
          "<script src=\"app/vendor/diagrammer/lib/viz/viz.js\"></script>\n" +
          "<script src=\"app/vendor/bower_components/vis/vis.min.js\"></script>\n" +
          "<link href=\"app/vendor/bower_components/vis/vis.min.css\" rel=\"stylesheet\" />\n" +
          "<script src=\"app/vendor/bower_components/vivagraphjs/vivagraph.min.js\"></script>\n" +
          "<script src=\"app/vendor/diagrammer/visNetwork.js\"></script>\n" +
          "<script src=\"app/vendor/diagrammer/lib/chromatography/chromatography.js\"></script>\n" +
          "<script src=\"app/vendor/diagrammer/DiagrammeR.js\"></script>\n" +
          "<script src=\"app/vendor/diagrammer/grViz.js\"></script>\n" +
          "\n" +
          "</head>\n" +
          "<body style=\"background-color:white;\">\n" +
          "<div id=\"htmlwidget_container\">\n" +
          "  <div id=\"$widgetId$\" style=\"width:100%;height:100%;\" class=\"$type$ html-widget\"></div>\n" +
          "</div>\n" +
          "<script type=\"application/json\" data-for=\"$widgetId$\">$payload$</script>\n" +
          "<script type=\"application/htmlwidget-sizing\" data-for=\"$widgetId$\">{\"viewer\":{\"width\":450,\"height\":350,\"padding\":15,\"fill\":true},\"browser\":{\"width\":820,\"height\":420,\"padding\":20,\"fill\":false}}</script>\n" +
          "</body>\n" +
          "</html>";

        scope.getModel = function() {
          return scope.model.getCellModel();
        };
        scope.isShowOutput = function() {
          return scope.model.isShowOutput();
        };

        scope.widgetId = getRandomId();

        scope.getView = function() {
          return $sce.trustAsHtml(getTemplate()
            .replace(new RegExp('\\$widgetId\\$', 'g'), 'htmlwidget-' + scope.widgetId)
            .replace('$type$', scope.payload.concreteType)
            .replace('$payload$', scope.payload ? JSON.stringify(fixPayload()) : ''));
        };

        function getTemplate() {
          return scope.templateCode;
        }

        function getRandomId() {
          return Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
        }

        function fixPayload() {
          return {
            "x": scope.payload.data.x,
            "evals": [],
            "jsHooks": []
          };
        }
        
        scope.isShowMenu = function() { return false; };
        scope.showoutput = scope.model.isShowOutput();
        scope.payload = scope.getModel();
        
        scope.$watch('getModel()', function() {
          scope.payload = scope.getModel();
        });

        scope.$watch('isShowOutput()', function(oldval, newval) {
          scope.showoutput = newval;
        });

      }
    };
  }]);
  beakerRegister.registerOutputDisplay("DiagrammeR", ["DiagrammeR", "Text"]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkoVega
 * This is the output display component for displaying vega JSON (http://trifacta.github.io/vega/).
 */
(function() {
  'use strict';
  beakerRegister.bkoDirective('bkoVega', function() {
    return {
      template: "<input type='text' ng-model='model'></input>" +
          "<button ng-click='parse()'>parse</button>" +
          "<div id='vis'></div>",
      controller: function($scope) {
        var parse = function(spec) {

          if (_.isString(spec)) {
            try {
              spec = JSON.parse(spec);
            } catch (err) {
              console.log(err);
            }
          }
          vg.parse.spec(spec, function(chart) {
            var view = chart({el: "#vis"}).update();
          });
        };
        $scope.parse = function() {
          parse($scope.model.getCellModel());
        };
      }
    };
  });
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
    'use strict';
    var retfunc = function(bkUtils, bkCoreManager, bkSessionManager) {
      var keyCodeMap = {
        8	  : "BACKSPACE",
        9	  : "TAB",
        13	: "ENTER",
        16	: "SHIFT",
        17	: "CTRL",
        18	: "ALT",
        19	: "PAUSE_BREAK",
        20	: "CAPS_LOCK",
        27	: "ESCAPE",
        32	: "SPACE",
        33	: "PAGE_UP",
        34	: "PAGE_DOWN",
        35	: "END",
        36	: "HOME",
        37	: "LEFT_ARROW",
        38	: "UP_ARROW",
        39	: "RIGHT_ARROW",
        40	: "DOWN_ARROW",
        45	: "INSERT",
        46	: "DELETE",
        106	: "MULTIPLY",
        107	: "ADD",
        109	: "SUBTRACT",
        110	: "DECIMAL_POINT",
        111	: "DIVIDE",
        112	: "F1",
        113	: "F2",
        114	: "F3",
        115	: "F4",
        116	: "F5",
        117	: "F6",
        118	: "F7",
        119	: "F8",
        120	: "F9",
        121	: "F10",
        122	: "F11",
        123	: "F12",
        144	: "NUM_LOCK",
        145	: "SCROLL_LOCK",
        186	: "SEMICOLON",
        187	: "EQUAL_SIGN",
        188	: "COMMA",
        189	: "DASH",
        190	: "PERIOD",
        191	: "FORWARD_SLASH",
        192	: "GRAVE_ACCENT",
        219	: "OPEN_BRACKET",
        220	: "BACK_SLASH",
        221	: "CLOSE_BRAKET",
        222	: "SINGLE_QUOTE"
      };

      function fireClickEvent(a) {
        if (document.createEvent) {
          var evObj = document.createEvent('MouseEvents');
          evObj.initEvent('click', true, false);
          a.dispatchEvent(evObj);
        } else if (document.createEventObject) {
          a.fireEvent('onclick' + evt, document.createEventObject());
        }
      }

    return {

      safeWidth: function(e){
        return bkHelper.isChrome ? this.getComputedStyle(e, 'width') : e.width();
      },
      safeHeight: function(e){
        return bkHelper.isChrome ? this.getComputedStyle(e, 'height')  : e.height();
      },
      outsideScr: function(scope, x, y) {
        var W = this.safeWidth(scope.jqsvg), H = this.safeHeight(scope.jqsvg);
        return x < 0 || x > W || y < 0 || y > H;
      },
      outsideScrBox: function(scope, x, y, w, h) {
        var W = this.safeWidth(scope.jqsvg), H = this.safeHeight(scope.jqsvg);
        return x > W || x + w < 0 || y > H || y + h < 0;
      },
      updateRange : function(datarange, itemrange) {
        if (itemrange.xl != null) { datarange.xl = this.min(datarange.xl, itemrange.xl); }
        if (itemrange.xr != null) { datarange.xr = this.max(datarange.xr, itemrange.xr); }
        if (itemrange.yl != null) { datarange.yl = Math.min(datarange.yl, itemrange.yl); }
        if (itemrange.yr != null) { datarange.yr = Math.max(datarange.yr, itemrange.yr); }
      },
      getDataRange : function(data) { // data range is in [0,1] x [0,1]
        var datarange = {
          xl : Infinity,
          xr : -Infinity,
          yl : Infinity,
          yr : -Infinity
        };
        var visibleItem = 0, legendableItem = 0;
        for (var i = 0; i < data.length; i++) {
          if (data[i].legend != null && data[i].legend != "") {
            legendableItem++;
          }
          if (data[i].showItem === false) { continue; }
          visibleItem++;
          var itemrange = data[i].getRange();
          this.updateRange(datarange, itemrange);
        }
        if (datarange.xl === Infinity && datarange.xr !== -Infinity) {
          datarange.xl = datarange.xr - 1;
        } else if (datarange.xr === -Infinity && datarange.xl !== Infinity) {
          datarange.xr = datarange.xl + 1;
        } else if (visibleItem === 0 || datarange.xl === Infinity) {
          datarange.xl = 0;
          datarange.xr = 1;
        } else if (datarange.xl > datarange.xr) {
          var temp = datarange.xl;
          datarange.xl = datarange.xr;
          datarange.xr = temp;
        }
        if (datarange.yl === Infinity && datarange.yr !== -Infinity) {
          datarange.yl = datarange.yr - 1;
        } else if (datarange.yr === -Infinity && datarange.yl !== Infinity) {
          datarange.yr = datarange.yl + 1;
        }
        if (visibleItem === 0 || datarange.yl === Infinity) {
          datarange.yl = 0;
          datarange.yr = 1;
        } else if (datarange.yl > datarange.yr) {
          var temp = datarange.yl;
          datarange.yl = datarange.yr;
          datarange.yr = temp;
        }

        var self = this;
        var increaseRange = function(value) {
          return self.plus(value, self.div((value || 1), 10));
        };
        var decreaseRange = function(value){
          return self.minus(value, self.div((value || 1), 10));
        };

        if (this.eq(datarange.xl, datarange.xr)) {
          datarange.xl = decreaseRange(datarange.xl);
          datarange.xr = increaseRange(datarange.xr);
        }
        if (datarange.yl === datarange.yr) {
          datarange.yl = decreaseRange(datarange.yl);
          datarange.yr = increaseRange(datarange.yr);
        }

        datarange.xspan = this.minus(datarange.xr, datarange.xl);
        datarange.yspan = datarange.yr - datarange.yl;
        return {
          "datarange" : datarange,
          "visibleItem" : visibleItem,
          "legendableItem" : legendableItem
        };
      },
      getDefaultFocus : function(model) {
        var ret = this.getDataRange(model.data);
        var range = ret.datarange, margin = model.margin;
        if(ret.visibleItem === 0) { // for empty plot, focus needs to be adjusted
          range.xl = model.xAxis.getPercent(range.xl);
          range.xr = model.xAxis.getPercent(range.xr);
          range.yl = model.yAxis.getPercent(range.yl);
          range.yr = model.yAxis.getPercent(range.yr);
        }
        var focus = {
          xl : model.userFocus.xl,
          xr : model.userFocus.xr,
          yl : model.userFocus.yl,
          yr : model.userFocus.yr
        };

        if (focus.xl == null) {
          focus.xl = this.minus(range.xl, this.mult(range.xspan, margin.left));
        }
        if (focus.xr == null) {
          focus.xr = this.plus(range.xr, this.mult(range.xspan, margin.right));
        }
        if (focus.xl instanceof Big) {
          focus.xl = parseFloat(focus.xl.toString());
        }
        if (focus.xr instanceof Big) {
          focus.xr = parseFloat(focus.xr.toString());
        }

        if (focus.yl == null) {
          if (model.yIncludeZero === true) {
            var yl = model.vrange.yspan * range.yl + model.vrange.yl;
            if(yl > 0){
              range.yl = (0 - model.vrange.yl) / model.vrange.yspan;
              range.yspan = range.yr - range.yl;
            }
          }
          focus.yl = range.yl - range.yspan * margin.bottom;
        }
        if (focus.yr == null) {
          focus.yr = range.yr + range.yspan * margin.top;
        }
        focus.xspan = focus.xr - focus.xl;
        focus.yspan = focus.yr - focus.yl;
        var result = {};
        result.defaultFocus = focus;
        _.extend(result, _.omit(ret, "datarange"));
        return result;
      },

      plotGridlines: function(scope) {
        var sel = scope.gridg.selectAll("line");
        sel.data(scope.rpipeGridlines, function(d) { return d.id; }).exit().remove();
        sel.data(scope.rpipeGridlines, function(d) { return d.id; }).enter().append("line")
          .attr("id", function(d) { return d.id; })
          .attr("class", function(d) { return d.class; })
          .attr("x1", function(d) { return d.x1; })
          .attr("x2", function(d) { return d.x2; })
          .attr("y1", function(d) { return d.y1; })
          .attr("y2", function(d) { return d.y2; })
          .style("stroke", function(d) { return d.stroke; })
          .style("stroke-dasharray", function(d) { return d.stroke_dasharray; });
        sel.data(scope.rpipeGridlines, function(d) { return d.id; })
          .attr("x1", function(d) { return d.x1; })
          .attr("x2", function(d) { return d.x2; })
          .attr("y1", function(d) { return d.y1; })
          .attr("y2", function(d) { return d.y2; });
      },
      plotTicks: function(scope){
        scope.labelg.selectAll("line").remove();
        scope.labelg.selectAll("line")
          .data(scope.rpipeTicks, function(d) { return d.id; }).enter().append("line")
          .attr("id", function(d) { return d.id; })
          .attr("class", function(d) { return d.class; })
          .attr("x1", function(d) { return d.x1; })
          .attr("x2", function(d) { return d.x2; })
          .attr("y1", function(d) { return d.y1; })
          .attr("y2", function(d) { return d.y2; });
      },
      plotLabels: function(scope) {   // redraw
        var pipe = scope.rpipeTexts;
        scope.labelg.selectAll("text").remove();
        scope.labelg.selectAll("text")
          .data(pipe, function(d) { return d.id; }).enter().append("text")
          .attr("id", function(d) { return d.id; })
          .attr("class", function(d) { return d.class; })
          .attr("x", function(d) { return d.x; })
          .attr("y", function(d) { return d.y; })
          .attr("transform", function(d) { return d.transform; })
          .style("text-anchor", function(d) { return d["text-anchor"]; })
          .style("dominant-baseline", function(d) { return d["dominant-baseline"]; })
          .text(function(d) { return d.text; });
      },
      replotSingleCircle: function(scope, d) {
        scope.svg.selectAll("#" + d.id).remove();
        scope.svg.selectAll("#" + d.id)
          .data([d]).enter().append("circle")
          .attr("id", function(d) { return d.id; })
          .attr("class", function(d) { return d.class; })
          .attr("cx", function(d) { return d.cx; })
          .attr("cy", function(d) { return d.cy; })
          .attr("r", function(d) { return d.r; })
          .style("fill", function(d) { return d.color; })
          .style("stroke", function(d) { return d.stroke; })
          .style("opacity", function(d) { return d.opacity; });
      },
      replotSingleRect: function(svgElement, d) {
        svgElement.selectAll("#" + d.id).remove();
        svgElement.selectAll("#" + d.id)
          .data([d]).enter().append("rect")
          .attr("id", function(d) { return d.id; })
          .attr("class", function(d) { return d.class; })
          .attr("x", function(d) { return d.x; })
          .attr("y", function(d) { return d.y; })
          .attr("width", function(d) { return d.width; })
          .attr("height", function(d) { return d.height; })
          .style("fill", function(d) { return d.fill; });
      },
      upper_bound: function(a, attr, val) {
        var l = 0, r = a.length - 1;
        while (l <= r) {
          var m = Math.floor((l + r) / 2);
          if (a[m][attr] >= val) r = m - 1;
          else l = m + 1;
        }
        return r;
      },
      randomColor: function() {
        var rhex6 = Math.floor(Math.random() * Math.pow(16, 6));
        var s = rhex6.toString(16);
        while (s.length < 6) s = "0" + s;
        return "#" + s;
      },

      randomString: function(len) {
        var ret = "";
        var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < len; i++ ) {
          ret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return ret;
      },

      colorToHex: function(color) {

        var colors = {
          "aliceblue" : "#f0f8ff",
          "antiquewhite" : "#faebd7",
          "aqua" : "#00ffff",
          "aquamarine" : "#7fffd4",
          "azure" : "#f0ffff",
          "beige" : "#f5f5dc",
          "bisque" : "#ffe4c4",
          "black" : "#000000",
          "blanchedalmond" : "#ffebcd",
          "blue" : "#0000ff",
          "blueviolet" : "#8a2be2",
          "brown" : "#a52a2a",
          "burlywood" : "#deb887",
          "cadetblue" : "#5f9ea0",
          "chartreuse" : "#7fff00",
          "chocolate" : "#d2691e",
          "coral" : "#ff7f50",
          "cornflowerblue" : "#6495ed",
          "cornsilk" : "#fff8dc",
          "crimson" : "#dc143c",
          "cyan" : "#00ffff",
          "darkblue" : "#00008b",
          "darkcyan" : "#008b8b",
          "darkgoldenrod" : "#b8860b",
          "darkgray" : "#a9a9a9",
          "darkgreen" : "#006400",
          "darkkhaki" : "#bdb76b",
          "darkmagenta" : "#8b008b",
          "darkolivegreen" : "#556b2f",
          "darkorange" : "#ff8c00",
          "darkorchid" : "#9932cc",
          "darkred" : "#8b0000",
          "darksalmon" : "#e9967a",
          "darkseagreen" : "#8fbc8f",
          "darkslateblue" : "#483d8b",
          "darkslategray" : "#2f4f4f",
          "darkturquoise" : "#00ced1",
          "darkviolet" : "#9400d3",
          "deeppink" : "#ff1493",
          "deepskyblue" : "#00bfff",
          "dimgray" : "#696969",
          "dodgerblue" : "#1e90ff",
          "firebrick" : "#b22222",
          "floralwhite" : "#fffaf0",
          "forestgreen" : "#228b22",
          "fuchsia" : "#ff00ff",
          "gainsboro" : "#dcdcdc",
          "ghostwhite" : "#f8f8ff",
          "gold" : "#ffd700",
          "goldenrod" : "#daa520",
          "gray" : "#808080",
          "green" : "#008000",
          "greenyellow" : "#adff2f",
          "honeydew" : "#f0fff0",
          "hotpink" : "#ff69b4",
          "indianred " : "#cd5c5c",
          "indigo" : "#4b0082",
          "ivory" : "#fffff0",
          "khaki" : "#f0e68c",
          "lavender" : "#e6e6fa",
          "lavenderblush" : "#fff0f5",
          "lawngreen" : "#7cfc00",
          "lemonchiffon" : "#fffacd",
          "lightblue" : "#add8e6",
          "lightcoral" : "#f08080",
          "lightcyan" : "#e0ffff",
          "lightgoldenrodyellow" : "#fafad2",
          "lightgrey" : "#d3d3d3",
          "lightgreen" : "#90ee90",
          "lightpink" : "#ffb6c1",
          "lightsalmon" : "#ffa07a",
          "lightseagreen" : "#20b2aa",
          "lightskyblue" : "#87cefa",
          "lightslategray" : "#778899",
          "lightsteelblue" : "#b0c4de",
          "lightyellow" : "#ffffe0",
          "lime" : "#00ff00",
          "limegreen" : "#32cd32",
          "linen" : "#faf0e6",
          "magenta" : "#ff00ff",
          "maroon" : "#800000",
          "mediumaquamarine" : "#66cdaa",
          "mediumblue" : "#0000cd",
          "mediumorchid" : "#ba55d3",
          "mediumpurple" : "#9370d8",
          "mediumseagreen" : "#3cb371",
          "mediumslateblue" : "#7b68ee",
          "mediumspringgreen" : "#00fa9a",
          "mediumturquoise" : "#48d1cc",
          "mediumvioletred" : "#c71585",
          "midnightblue" : "#191970",
          "mintcream" : "#f5fffa",
          "mistyrose" : "#ffe4e1",
          "moccasin" : "#ffe4b5",
          "navajowhite" : "#ffdead",
          "navy" : "#000080",
          "oldlace" : "#fdf5e6",
          "olive" : "#808000",
          "olivedrab" : "#6b8e23",
          "orange" : "#ffa500",
          "orangered" : "#ff4500",
          "orchid" : "#da70d6",
          "palegoldenrod" : "#eee8aa",
          "palegreen" : "#98fb98",
          "paleturquoise" : "#afeeee",
          "palevioletred" : "#d87093",
          "papayawhip" : "#ffefd5",
          "peachpuff" : "#ffdab9",
          "peru" : "#cd853f",
          "pink" : "#ffc0cb",
          "plum" : "#dda0dd",
          "powderblue" : "#b0e0e6",
          "purple" : "#800080",
          "red" : "#ff0000",
          "rosybrown" : "#bc8f8f",
          "royalblue" : "#4169e1",
          "saddlebrown" : "#8b4513",
          "salmon" : "#fa8072",
          "sandybrown" : "#f4a460",
          "seagreen" : "#2e8b57",
          "seashell" : "#fff5ee",
          "sienna" : "#a0522d",
          "silver" : "#c0c0c0",
          "skyblue" : "#87ceeb",
          "slateblue" : "#6a5acd",
          "slategray" : "#708090",
          "snow" : "#fffafa",
          "springgreen" : "#00ff7f",
          "steelblue" : "#4682b4",
          "tan" : "#d2b48c",
          "teal" : "#008080",
          "thistle" : "#d8bfd8",
          "tomato" : "#ff6347",
          "turquoise" : "#40e0d0",
          "violet" : "#ee82ee",
          "wheat" : "#f5deb3",
          "white" : "#ffffff",
          "whitesmoke" : "#f5f5f5",
          "yellow" : "#ffff00",
          "yellowgreen" : "#9acd32"
        };
        if (typeof colors[color.toLowerCase()] != null)
            return colors[color.toLowerCase()];
        return null;
      },

      createColor : function(hexstr, opacity) {
        if (hexstr == null) {
          hexstr = "#000000";
        }
        if (hexstr[0] !== "#") {
          hexstr = this.colorToHex(hexstr);
        }
        if (opacity == null) {
          opacity = 1.0;
        }
        var r = parseInt(hexstr.substr(1,2), 16),
            g = parseInt(hexstr.substr(3,2), 16),
            b = parseInt(hexstr.substr(5,2), 16);
            var str = "rgba(" + r + "," + g + "," + b + "," + opacity + ")";;
        return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
      },

      getTipString : function(val, axis, fixed) {
        if (axis.axisType === "time") {
          return bkUtils.formatTimestamp(val, axis.axisTimezone, "YYYY MMM DD ddd, HH:mm:ss .SSS");
        }
        if (axis.axisType === "nanotime") {
          var d = parseFloat(val.div(1000000).toFixed(0));
          var nanosec = val.mod(1000000000).toFixed(0);
          return bkUtils.formatTimestamp(d, axis.axisTimezone, "YYYY MMM DD ddd, HH:mm:ss") + "." + this.padStr(nanosec, 9);
        }
        if (typeof(val) === "number") {
          if (fixed === true) {
            // do nothing, keep full val
          } else if (typeof(fixed) === "number"){
            val = val.toFixed(fixed);
          } else {
            val = val.toFixed(axis.axisFixed);
          }
        }
        return "" + val;
      },

      getTipStringPercent : function(pct, axis, fixed) {
        var val = axis.getValue(pct);
        if (axis.axisType === "log") {
          val = axis.axisPow(pct);
          return this.getTipString(val, axis, fixed) + " (" + axis.getString(pct) + ")";
        }
        return this.getTipString(val, axis, fixed);
      },

      createTipString : function(obj) {
        var txt = "";
        _.each(obj, function(value, key) {
          if (key == "title") {
            txt += "<div style='font-weight:bold'>";
          } else {
            txt += "<div>";
            txt += key + ": ";
          }
          txt += value;
          txt += "</div>";
        });
        return txt;
      },

      rangeAssert : function(list) {
        _.each(list, function(e, i){
          if (Math.abs(e) > 1E6) {
            console.error("data not shown due to too large coordinate");
            return true;
          }
        });
        return false;
      },

      useYAxisR: function(model, data) {
        var yAxisR = model.yAxisR;
        return yAxisR && yAxisR.label === data.yAxis;
      },

      getHighlightedDiff: function(highlighted) {
        return highlighted ? 2 : 0;
      },

      getHighlightedSize: function(size, highlighted) {
        return size + this.getHighlightedDiff(highlighted);
      },

      getHighlightDuration: function() {
        return 100;
      },

      getElementStyles: function(element) {
        var elementStyles = "";
        var styleSheets = document.styleSheets;
        for (var i = 0; i < styleSheets.length; i++) {
          var cssRules = styleSheets[i].cssRules;
          for (var j = 0; j < cssRules.length; j++) {
            var cssRule = cssRules[j];
            if (cssRule.style) {
              try {
                var childElements = element.querySelectorAll(cssRule.selectorText);
                if (childElements.length > 0 || element.matches(cssRule.selectorText)) {
                  elementStyles += cssRule.selectorText + " { " + cssRule.style.cssText + " }\n";
                }
              } catch (err) {
                //just ignore errors
                //http://bugs.jquery.com/ticket/13881#comment:1
              }
            }
          }
        }
        return elementStyles;
      },

      addInlineStyles: function(element, extraStyles) {
        var styleEl = document.createElement('style');
        styleEl.setAttribute('type', 'text/css');
        var elementStyles = this.getElementStyles(element);
        elementStyles += this.getFontToInject({
          fontFamily: 'pt-sans',
          urlformats: {'app/fonts/regular/pts55f-webfont.woff' : 'woff'},
          fontWeight: 'normal',
          fontStyle: 'normal'
        });
        elementStyles += this.getFontToInject({
          fontFamily: 'pt-sans',
          urlformats: {'app/fonts/bold/pts75f-webfont.woff' : 'woff'},
          fontWeight: 'bold',
          fontStyle: 'normal'
        });
        
        var extraStylesCss = '';
        if(extraStyles) {
            extraStylesCss = extraStyles.join('\n');
        }

        styleEl.innerHTML = '<![CDATA[\n' + elementStyles + '\n' + extraStylesCss + '\n]]>';
        var defsEl = document.createElement('defs');
        defsEl.appendChild(styleEl);
        element.insertBefore(defsEl, element.firstChild);
      },

      download: function(url, fileName) {
        var a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        fireClickEvent(a);
        a.remove();
      },

      translate: function(jqelement, x, y) {
        var getNumber = function(str) {
          return parseFloat(str.substring(0, str.length - 2));
        };
        var transform = jqelement.css('transform');
        var elementTranslate = {x: 0, y: 0};
        if (transform && transform.indexOf("translate") != -1) {
          var translate = transform.match(/translate(.*)/)[1].substring(1);
          var translateValues = translate.substring(0, translate.indexOf(')')).split(", ");
          elementTranslate.x = getNumber(translateValues[0]);
          elementTranslate.y = getNumber(translateValues[1]);
        }
        jqelement.css("transform", "translate(" + (elementTranslate.x + x) + "px, " + (elementTranslate.y + y) + "px)")
      },

      translateChildren: function(element, x, y) {
        for (var j = 0; j < element.childElementCount; j++) {
          var child = element.children[j];
          if (child.nodeName.toLowerCase() !== 'defs') {
            this.translate($(child), x, y);
          }
        }
      },

      addTitleToSvg: function(svg, jqtitle, titleSize) {
        var title = jqtitle.clone();
        title.find('style').remove();
        d3.select(svg).insert("text", "g")
          .attr("id", jqtitle.attr("id"))
          .attr("class", jqtitle.attr("class"))
          .attr("x", titleSize.width / 2)
          .attr("y", titleSize.height)
          .style("text-anchor", "middle")
          .text(title.text());
      },

      adjustStyleForSvg: function(styleString) {
        var colorArr = styleString.match(/color:(.*)\;/g);
        if (colorArr && colorArr.length) {
          var fill = colorArr[0].replace('color:', 'fill:');
          styleString += fill;
        }
        return styleString;
      },

      drawPng: function(canvas, imgsrc, fileName) {
        var download = this.download;
        var context = canvas.getContext("2d");
        var image = new Image;
        image.src = imgsrc;
        image.onload = function() {
          context.drawImage(image, 0, 0);
          download(canvas.toDataURL("image/png"), fileName);
          context.clearRect(0, 0, canvas.width, canvas.height);
        };
      },

      outerHeight: function (e, includeMargin) {
        if (!e || e.length === 0)
          return null;
        return this.getComputedStyle(e, 'height')
        + this.getComputedStyle(e, 'padding-top') + this.getComputedStyle(e, 'padding-bottom')
        + this.getComputedStyle(e, 'border-top') + this.getComputedStyle(e, 'border-bottom')
        + ((includeMargin === true ) ? this.getComputedStyle(e, 'margin-top') + this.getComputedStyle(e, 'margin-bottom') : 0);

      },

      outerWidth: function (e, includeMargin) {
        if (!e || e.length === 0)
          return null;
        return this.getComputedStyle(e, 'width')
        + this.getComputedStyle(e, 'padding-left') + this.getComputedStyle(e, 'padding-right')
        + this.getComputedStyle(e, 'border-left') + this.getComputedStyle(e, 'border-right')
        + ((includeMargin === true ) ? this.getComputedStyle(e, 'margin-left') + this.getComputedStyle(e, 'margin-right') : 0);
      },

      getComputedStyle: function(e, style, defaultValue) {
        if (!e || e.length === 0)
          return null;
        defaultValue = defaultValue || 0;
        var getValue = function(e){
          var value = window.getComputedStyle(e.get()[0], null).getPropertyValue(style).match(/\d+/);
          if (!value || value.length === 0 )
            return '';
          return value[0];
        };
        var hiddenParent = e.parents(".ng-hide:first");
        var value;
        if (hiddenParent.length === 0) {
          value = getValue(e);
        }else{
          hiddenParent.removeClass("ng-hide");
          value = getValue(e);
          hiddenParent.addClass("ng-hide");
        }
        return parseInt(value) || defaultValue;
      },

      getActualCss: function(jqelement, jqFunction, jqFunctionParams) {
        //to get actual size/position/etc values of hidden elements
        var value;
        if (jqelement.is(":visible")) {
          value = jqFunctionParams != null ? jqelement[jqFunction](jqFunctionParams) : jqelement[jqFunction]();
        } else {
          var hiddenParent = jqelement.parents(".ng-hide:first");
          hiddenParent.removeClass("ng-hide");
          value = jqFunctionParams != null ? jqelement[jqFunction](jqFunctionParams) : jqelement[jqFunction]();
          hiddenParent.addClass("ng-hide");
        }
        return value;
      },

      convertToXHTML: function (html) {
        return html.replace(/input[^>]+"/g, "$&" + '/');
      },

      base64Fonts: {},

      getFontToInject: function(font) {
        var src = '';
        for (var url in font.urlformats) {
          if (font.urlformats.hasOwnProperty(url)) {
            var format = font.urlformats[url];
            if (this.base64Fonts[url] == null) {
              this.base64Fonts[url] = bkHelper.base64Encode(this.getFileSynchronously(url));
      }
            src += "url('data:application/font-" + format + ";charset=utf-8;base64," + this.base64Fonts[url] + "') format('" + format + "'), ";
          }
        }
        src = src.replace(/,\s*$/, "");
        return '@font-face' + " { " +
          "font-family: '" + font.fontFamily + "';" +
          "src: " + src + ";" +
          "font-weight: " + font.fontWeight + ";" +
          "font-style: " + font.fontStyle + ";" +
          " }\n";
      },

      getFileSynchronously: function(file) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", file, false);
        xhr.overrideMimeType("text/plain; charset=x-user-defined");
        xhr.send(null);
        return xhr.responseText;
      },

      //ideas and some code - from d3 library(d3.layout.histogram)
      histogram: function () {

        var rightClose = false, binCount, rangeMin, rangeMax;

        var calcRange = function (values) {
          if (rangeMin !== undefined && rangeMax !== undefined) {
            return [rangeMin, rangeMax];
          } else if (rangeMin !== undefined) {
            return [rangeMin, d3.max(values)];
          } else if (rangeMax !== undefined) {
            return [d3.min(values), rangeMax];
          }
          return [d3.min(values), d3.max(values)];
        };

        var calcThresholds = function (range, values) {
          var n = binCount !== undefined ?
            binCount :
            Math.ceil(Math.log(values.length) / Math.LN2 + 1);
          var x = -1, b = +range[0], m = (range[1] - b) / n, f = [];
          while (++x <= n) f[x] = m * x + b;

          if (rightClose) {
            f.splice(0, 0, range[0] - m);
          }

          return f;
        };

        function histogram(data) {
          var bins = [],
            values = data.map(Number, this),
            range = calcRange(values),
            thresholds = calcThresholds(range, values),
            bin, i = -1,
            n = values.length,
            m = thresholds.length - 1,
            k = 1,
            x;

          while (++i < m) {
            bin = bins[i] = [];
            bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
            bin.y = 0;
          }
          if (m > 0) {
            i = -1;
            while (++i < n) {
              x = values[i];
              if (x >= range[0] && x <= range[1]) {
                bin = rightClose ?
                  bins[d3.bisectLeft(thresholds, x, 1, m) - 1] :
                  bins[d3.bisect(thresholds, x, 1, m) - 1];
                bin.y += k;
                bin.push(data[i]);
              }
            }
          }
          return bins;
        }

        histogram.rangeMin = function (x) {
          rangeMin = x;
          return histogram;
        };
        histogram.rangeMax = function (x) {
          rangeMax = x;
          return histogram;
        };
        histogram.binCount = function (x) {
          binCount = x;
          return histogram;
        };
        histogram.rightClose = function (x) {
          rightClose = x;
          return histogram;
        };

        return histogram;
      },

      fonts: {
        labelWidth : 6,
        labelHeight : 12,
        tooltipWidth : 10
      },

      padStr: function(val, len) {
        var str = "" + Math.abs(val);
        while (str.length < len) str = "0" + str;
        return str;
      },

      max: function(n1, n2){
        if (n1 instanceof Big || n2 instanceof Big) {
          if(n1 == -Infinity){
            return n2;
          }
          if(n2 == -Infinity){
            return n1;
          }
          return n1.gt(n2) ? n1 : n2;
        } else {
          return Math.max(n1, n2);
        }
      },
      min: function(n1, n2){
        if (n1 instanceof Big || n2 instanceof Big) {
          if(n1 == Infinity){
            return n2;
          }
          if(n2 == Infinity){
            return n1;
          }
          return n1.lt(n2) ? n1 : n2;
        } else {
          return Math.min(n1, n2);
        }
      },

      eq: function(n1, n2){
        return n1 instanceof Big ? n1.eq(n2) : n1 === n2;
      },

      lt: function(n1, n2){
        return n1 instanceof Big ? n1.lt(n2) : n1 < n2;
      },

      lte: function(n1, n2){
        return n1 instanceof Big ? n1.lte(n2) : n1 <= n2;
      },

      gt: function(n1, n2){
        return n1 instanceof Big ? n1.gt(n2) : n1 > n2;
      },

      gte: function(n1, n2){
        return n1 instanceof Big ? n1.gte(n2) : n1 >= n2;
      },

      plus: function(n1, n2){
        return n1 instanceof Big ? n1.plus(n2) : n1 + n2;
      },
      minus: function(n1, n2){
        return n1 instanceof Big ? n1.minus(n2) : n1 - n2;
      },
      mult: function(n1, n2){
        return n1 instanceof Big ? n1.times(n2) : n1 * n2;
      },
      div: function(n1, n2){
        return n1 instanceof Big ? n1.div(n2) : n1 / n2;
      },
      convertInfinityValue: function (value) {
        if(value === "Infinity"){
          return Infinity;
        }
        if(value === "-Infinity"){
          return -Infinity;
        }
        return value;
      },

      createNiceColor: function (n) {
        var hue = n * 157.5 / 360;
        var saturation = 0.75 + Math.cos(n) / 4;
        var value = 7/8 + Math.cos(n/5.1) / 8;

        var rgb = this.hsvToRgb(hue, saturation, value);
        return bkUtils.rgbaToHex(rgb[0], rgb[1], rgb[2]);
      },

      //http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
      hsvToRgb : function(h,s,v){
        var r, g, b;

        var i = Math.floor(h * 6);
        var f = h * 6 - i;
        var p = v * (1 - s);
        var q = v * (1 - f * s);
        var t = v * (1 - (1 - f) * s);

        switch(i % 6){
          case 0: r = v, g = t, b = p; break;
          case 1: r = q, g = v, b = p; break;
          case 2: r = p, g = v, b = t; break;
          case 3: r = p, g = q, b = v; break;
          case 4: r = t, g = p, b = v; break;
          case 5: r = v, g = p, b = q; break;
        }

        return [r * 255, g * 255, b * 255];
      },

      getDefaultColor: function (i) {
        var themeColors = bkHelper.defaultPlotColors[bkHelper.getTheme()];
        return i < themeColors.length ? themeColors[i] : this.createNiceColor(i);
      },
      evaluateTagCell: function (tag) {
        var cellOp = bkSessionManager.getNotebookCellOp();
        var result;
        if (cellOp.hasUserTag(tag)) {
          result = cellOp.getCellsWithUserTag(tag);
          bkCoreManager.getBkApp().evaluateRoot(result)
            .catch(function () {
              console.log('Evaluation failed: ' + tag);
            });
        }
      },
      getActionObject: function (plotType, e, subplotIndex) {
        var actionObject = {};
        if (plotType === "CategoryPlot") {
          if(e.ele != null){
            actionObject.category = e.ele.category;
            actionObject.series = e.ele.series;
            actionObject["@type"] = "categoryActionObject";
          }
        } else {
          if(plotType === "CombinedPlot") {
            actionObject.subplotIndex = subplotIndex;
            actionObject["@type"] =  "combinedActionObject";
          } else {
            actionObject["@type"] = "xyActionObject";
          }
          if(e.ele != null){
            actionObject.index = e.ele.index;
          }
        }
        return actionObject;
      },
      getKeyCodeConstant: function(keyCode){
        if(keyCode > 46 && keyCode < 90) {
          return String.fromCharCode(keyCode).toUpperCase();
        } else {
          return keyCodeMap[keyCode];
        }
      },
      getSavePlotAsContextMenuItems: function (scope) {
        return [
          {
            name: 'Save as PNG',
            callback: function () {
              scope.saveAsPng();
            }
          },
          {
            name: 'Save as SVG',
            callback: function () {
              scope.saveAsSvg();
            }
          }
        ];
      }
    };
  };
  beakerRegister.bkoFactory('plotUtils', ["bkUtils", "bkCoreManager", "bkSessionManager", retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotSampler = function(xs, ys, _ys){
      this.xs = xs;
      this.ys = ys;
      this._ys = _ys;
      this.n = xs.length;

      if (this.debug) {
        console.log("data size: ", this.n);
        var t = Date.now();
      }

      this.buildCoordTable();

      if (this.debug) {
        console.log("coord table: ", Date.now() - t, "ms");
        t = Date.now();
      }

      this.buildSegTree();

      if (this.debug) {
        console.log("seg tree: ", Date.now() - t, "ms");
      }
    };

    PlotSampler.prototype.debug = false;  // set time estimation

    PlotSampler.prototype.sample = function(xl, xr, step) {
      if (step <= 0 || xr < xl) {
        console.error("incorrect sample parameters");
        return [];
      }
      var ret = [];
      this.hashes = {};
      var nsl = xl, sl, sr;
      while (nsl < xr) {
        sl = nsl;
        nsl += step;
        sr = sl + step - 1E-12; // [sl,sr) closed open, be ware of precision problem

        var qret = this.query(sl, sr);
        if (qret == null) {
          continue;
        }
        var h = qret.l + "_" + qret.r;
        if (this.hashes[h] != null) {
          continue;
        } else {
          this.hashes[h] = 1;
        }
        // prevent segtree from being modified
        var avg = qret.sum / qret.cnt;
        var count = 0;
        var index;
        _.forEach(this.xs, function (x, i) {
          if (x >= sl && x < sr) {
            count++;
            index = i;
          }
        });
        if(!count){ continue; }
        var ele = {
          min : qret.min,
          max : qret.max,
          _min : qret._min,
          _max : qret._max,
          xl : sl,
          xr : sr,
          avg : avg,
          x : count === 1 ? this.xs[index] : (sl + sr) / 2,
          y : avg,
          hash : h,
          count: count
        };
        ret.push(ele);
      }
      delete this.hashes;
      return ret;
    };

    PlotSampler.prototype.query = function(xl, xr) {
      if (xr < this.xs[0] || xl > this.xs[this.xs.length - 1]) {
        return null;
      }
      var l = this.mapIndex(xl),
          r = this.mapIndex(xr);
      l = Math.max(l, 0);
      r = Math.min(r, this.n - 1);
      if (l > r || r == -1) {
        return null;
      }
      var ret = this.querySegTree(0, 0, this.n - 1, l, r);
      ret.l = l;
      ret.r = r;
      return ret;
    };

    PlotSampler.prototype.buildCoordTable = function() {
      this.x = this.xs.slice(0); // copy xs to x

      if (this.debug) {
        var t = Date.now();
      }

      _.uniq(this.xs, true); // keep unique values in xs

      if (this.debug) {
        console.log("uniq ", Date.now() - t, "ms");
        t = Date.now();
      }

      for (var i = 0; i < this.n; i++) {
        //if (this.x[i] == null || isNaN(this.x[i]) === true) {
        //  console.error("invalid value passed to sampler");
        //}
        this.x[i] = this.mapIndex(this.x[i]);
      }

      if (this.debug) {
        console.log("map ", Date.now() - t, "ms");
      }
    };

    PlotSampler.prototype.buildSegTree = function() {
      this.mins = [];
      this.maxs = [];
      this.sums = [];
      this.cnts = [];
      this._mins = [];
      this._maxs = [];
      this.initSegTree(0, 0, this.n - 1);
    };

    PlotSampler.prototype.initSegTree = function(k, nl, nr) {
      if (nl == nr) {
        this.mins[k] = this.ys[nl];
        this.maxs[k] = this.ys[nl];
        this.sums[k] = this.ys[nl];
        this._mins[k] = this._ys[nl];
        this._maxs[k] = this._ys[nl];
        this.cnts[k] = 1;
        return;
      }
      var nm = Math.floor((nl + nr) / 2),
          kl = 2 * k + 1,
          kr = 2 * k + 2;
      this.initSegTree(kl, nl, nm);
      this.initSegTree(kr, nm + 1, nr);
      this.mins[k] = Math.min(this.mins[kl], this.mins[kr]);
      this.maxs[k] = Math.max(this.maxs[kl], this.maxs[kr]);
      this._mins[k] = Math.min(this._mins[kl], this._mins[kr]);
      this._maxs[k] = Math.max(this._maxs[kl], this._maxs[kr]);
      this.sums[k] = this.sums[kl] + this.sums[kr];
      this.cnts[k] = this.cnts[kl] + this.cnts[kr];
    };

    PlotSampler.prototype.querySegTree = function(k, nl, nr, l, r) {
      if (r < nl || l > nr || l > r) {
        return null;
      }
      if (l <= nl && r >= nr) {
        return {
          min : this.mins[k],
          max : this.maxs[k],
          _min : this._mins[k],
          _max : this._maxs[k],
          sum : this.sums[k],
          cnt : this.cnts[k]
        };
      }
      var nm = Math.floor((nl + nr) / 2),
          kl = 2 * k + 1,
          kr = 2 * k + 2;
      var retl = this.querySegTree(kl, nl, nm, l, r),
          retr = this.querySegTree(kr, nm + 1, nr, l, r);
      if (retl == null && retr == null) {
        return null;
      } else if (retl == null) {
        return retr;
      } else if (retr == null) {
        return retl;
      } else {
        return {
          min : Math.min(retl.min, retr.min),
          max : Math.max(retl.max, retr.max),
          _min : Math.min(retl._min, retr._min),
          _max : Math.max(retl._max, retr._max),
          sum : retl.sum + retr.sum,
          cnt : retl.cnt + retr.cnt
        };
      }
    };

    PlotSampler.prototype.mapIndex = function(x) {
      // find the largest element in xs that is <= x, may return -1 (no such element)
      var l = 0, r = this.xs.length - 1;
      while (l <= r) {
        var m = Math.floor((l + r) / 2);
        if (this.xs[m] <= x) {
          l = m + 1;
        } else {
          r = m - 1;
        }
      }
      return r;
    };

    return PlotSampler;
  };
  beakerRegister.bkoFactory('PlotSampler', ['plotUtils', retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function () {
  'use strict';
  var retfunc = function (plotUtils) {

    var getTipElement = function (scope, d) {
      if (!d || !d.id) {
        return;
      }
      var tipid = "tip_" + d.id;
      return scope.jqcontainer.find("#" + tipid);
    };

    var clear = function (scope, d, hide) {
      if (hide !== true) {
        delete scope.tips[d.id];
      }
      scope.jqcontainer.find("#tip_" + d.id).remove();
      if (d.isresp === true) {
        scope.jqsvg.find("#" + d.id).css("opacity", 0);
      } else {
        scope.jqsvg.find("#" + d.id).removeAttr("filter");
      }
    };

    var pinCloseIcon = function (scope, d) {
      var tip = getTipElement(scope, d);
      if (tip.has("i").length > 0)
        return;
      var closeIcon = $('<i/>', {class: 'fa fa-times'})
        .on('click', function () {
          clear(scope, d);
          $(this).parent('.plot-tooltip').remove();
          impl.renderTips(scope);
        });
      tip.prepend(closeIcon);
    };

    var addAttachment = function (x, y, x2, y2, attachments) {
      attachments.push({
        x: x,
        y: y,
        dist: Math.sqrt(Math.pow(x - x2, 2) + Math.pow(y - y2, 2))
      });
    };

    var drawLine = function (scope, d, tipdiv) {
      var data = scope.stdmodel.data;
      var svg = scope.maing;

      var x2 = scope.data2scrX(d.targetx);
      var y2 = scope.data2scrY(d.targety);

      var position = tipdiv.position();

      var attachments = [];

      var left = position.left;
      var top = position.top;
      var height = tipdiv.outerHeight();
      var width = tipdiv.outerWidth();

      addAttachment(left, top + height / 2, x2, y2, attachments);
      addAttachment(left + width, top + height / 2, x2, y2, attachments);
      addAttachment(left + width / 2, top, x2, y2, attachments);
      addAttachment(left + width / 2, top + height, x2, y2, attachments);
      addAttachment(left, top, x2, y2, attachments);
      addAttachment(left + width, top, x2, y2, attachments);
      addAttachment(left + width, top + height, x2, y2, attachments);
      addAttachment(left, top + height, x2, y2, attachments);

      var attachment = _.min(attachments, "dist");
      var dist = attachment.dist, x1 = attachment.x, y1 = attachment.y;



      svg.append("line")
        .style("stroke", data[d.idx].tip_color)
        .attr("class", "plot-tooltip-line")
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("x1", x1)
        .attr("y1", y1);
    };


    /**
     * This code checks that tip is in the grid area
     * @param x - x coordinate of the tip
     * @param y - y coordinate of the tip
     * @param w - width of the tip
     * @param h - height of the tip
     * @returns {boolean} true if the tip is outside grid area, otherwise - false
     */
    var outsideGrid = function (scope, x, y, w, h) {
      var xPadding = 10;
      var bBox = scope.jqgridg.get(0).getBBox();
      var W = bBox.width;
      var H = bBox.height;
      var X = bBox.x;
      var Y = bBox.y;
      return x > W + X - xPadding || x + w - X + xPadding < 0 || y > H + Y || y + h - Y < 0;
    };

    var impl = {

      toggleTooltip: function (scope, d) {
        if (scope.zoomed === true) {
          return;
        } // prevent dragging and toggling at the same time

        var id = d.id, nv = !scope.tips[id];
        if (nv === true) {
          impl.tooltip(scope, d, d3.mouse(scope.svg[0][0]));
        } else {
          scope.tips[id].sticking = !scope.tips[id].sticking;
          if (scope.tips[id].sticking === false) {
            impl.untooltip(scope, d);
          }
        }
        impl.renderTips(scope);
      },

      tooltip: function (scope, d, mousePos) {
        if (scope.tips[d.id] != null) {
          return;
        }
        if (d.isresp === true) {
          scope.jqsvg.find("#" + d.id).css("opacity", 1);
        }
        scope.tips[d.id] = {};
        _.extend(scope.tips[d.id], d);
        var d = scope.tips[d.id];
        d.sticking = false;

        d.targetx = d.tooltip_cx ? scope.scr2dataX(d.tooltip_cx) : scope.scr2dataX(mousePos[0]);
        d.targety = d.tooltip_cy ? scope.scr2dataY(d.tooltip_cy) : scope.scr2dataY(mousePos[1]);

        d.datax = scope.scr2dataX(mousePos[0] + 5);
        d.datay = scope.scr2dataY(mousePos[1] + 5);

        impl.renderTips(scope);
      },

      untooltip: function (scope, d) {
        if (scope.tips[d.id] == null) {
          return;
        }
        if (scope.tips[d.id].sticking === false) {
          clear(scope, d);
          impl.renderTips(scope);
        }
      },

      hideTips: function (scope, itemid, hidden) {
        hidden = hidden === false ? hidden : true;
        _.each(scope.tips, function (value, key) {
          if (key.search("" + itemid) === 0) {
            scope.tips[key].hidden = hidden;
          }
        });
      },


      renderTips: function (scope) {

        var data = scope.stdmodel.data;
        var svg = scope.maing;

        svg.selectAll(".plot-tooltip-line").remove();

        _.each(scope.tips, function (d) {
          var x = scope.data2scrX(d.datax),
            y = scope.data2scrY(d.datay);
          d.scrx = x;
          d.scry = y;
          var tipid = "tip_" + d.id;
          var tipdiv = getTipElement(scope, d);

          if (tipdiv.length === 0) {
            var tiptext = data[d.idx].createTip(d.ele, d.g, scope.stdmodel);

            tipdiv = $("<div></div>").appendTo(scope.jqcontainer)
              .attr("id", tipid)
              .attr("class", "plot-tooltip")
              .css("border-color", data[d.idx].tip_color)
              .append(tiptext)
              .on('mouseup', function (e) {
                if (e.which == 3) {
                  clear(scope, d);
                  $(this).remove();
                }
              });
            if (data[d.idx].tip_class) {
              tipdiv.addClass(data[d.idx].tip_class);
            }
          }
          var w = tipdiv.outerWidth(), h = tipdiv.outerHeight();
          if (d.hidden === true || outsideGrid(scope, x, y, w, h)) {
            clear(scope, d, true);
            tipdiv.remove();
            return;
          }
          var drag = function (e, ui) {
            d.scrx = ui.position.left - plotUtils.fonts.tooltipWidth;
            d.scry = ui.position.top;
            d.datax = scope.scr2dataX(d.scrx);
            d.datay = scope.scr2dataY(d.scry);
            impl.renderTips(scope);
          };
          tipdiv
            .draggable({
              drag: function (e, ui) {
                drag(e, ui)
              },
              stop: function (e, ui) {
                drag(e, ui)
              }
            });

          tipdiv
            .css("left", x + plotUtils.fonts.tooltipWidth)
            .css("top", y);
          if (d.isresp === true) {
            scope.jqsvg.find("#" + d.id).attr("opacity", 1);
          } else {
            scope.jqsvg.find("#" + d.id).attr("filter", "url(" + window.location.pathname + "#svgfilter)");
          }
          if (d.sticking == true) {
            pinCloseIcon(scope, d);
            drawLine(scope, d, tipdiv);
          }
        });
      }
    };
    return impl;
  };
  beakerRegister.bkoFactory('plotTip', ['plotUtils', retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var retfunc = function (bkUtils) {
    var onAction = function(action, plotId, itemId, evaluatorId, params){
      if (window.languageServiceBase && window.languageServiceBase[evaluatorId]) {
        bkUtils.httpPostJson(
          window.languageServiceBase[evaluatorId] + '/chart/' +
          action + '/' +
          plotId + '/' +
          itemId,
          params
        ).then(
          function () {},
          function () { console.error('send ' + action + ' event error'); });
      }
    };
    return {
      onClick: function (plotId, itemId, evaluatorId, params) {
        onAction('onclick', plotId, itemId, evaluatorId, params)
      },
      onKey: function (plotId, itemId, evaluatorId, params) {
        onAction('onkey', plotId, itemId, evaluatorId, params)
      },
      setActionDetails: function (plotId, itemId, evaluatorId, params) {
        if (window.languageServiceBase && window.languageServiceBase[evaluatorId]) {
          return bkUtils.httpPostJson(
            window.languageServiceBase[evaluatorId] + '/chart/actiondetails/' +
            plotId + '/' +
            itemId,
            params
          );
        } else {
          var defer = bkHelper.newDeferred();
          setTimeout(function(){
            defer.reject();
          }, 0);
          return defer.promise;
        }
      }
    };
  };
  beakerRegister.bkoFactory('plotService', ['bkUtils', retfunc]);
})();
/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotAuxBox = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotAuxBox.prototype.plotClass = "";

    PlotAuxBox.prototype.format = function() {
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st": this.stroke,
        "st_w": this.stroke_width,
        "st_op": this.stroke_opacity
      };
      this.elementProps = [];
      this.widthShrink = 0;
    };

    PlotAuxBox.prototype.setWidthShrink = function(shrink) {
      this.widthShrink = shrink;
    };

    PlotAuxBox.prototype.render = function(scope, elements, gid){
      this.elements = elements;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotAuxBox.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var skipped = false;

      eleprops.length = 0;

      var eles = this.elements;
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        var x = mapX(ele.x), x2 = mapX(ele.x2),
            y = mapY(ele.y), y2 = mapY(ele.y2);

        if (plotUtils.rangeAssert([x, x2, y, y2])) {
          eleprops.length = 0;
          return;
        }

        var id = this.id + "_" + i;
        var prop = {
          "id" : id,
          "x" : x + this.widthShrink,
          "y" : y2,
          "w" : x2 - x - this.widthShrink * 2,
          "h" : y - y2
        };
        eleprops.push(prop);
      }
    };

    PlotAuxBox.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) {gid = "";}
      var svg = scope.maing;
      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);
      var groupsvg = itemsvg.select("#" + groupid);
      var diff = plotUtils.getHighlightedDiff(highlighted) / 2;
      groupsvg.selectAll("rect")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .attr("x", function(d) { return d.x - diff; })
        .attr("y", function(d) { return d.y - diff; })
        .attr("width", function(d) { return plotUtils.getHighlightedSize(d.w, highlighted); })
        .attr("height", function(d) { return plotUtils.getHighlightedSize(d.h, highlighted); });
    };

    PlotAuxBox.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        // aux box are ploted as bars with normal coloring
        // if special coloring is needed, it is set from the loader
        itemsvg.selectAll("#" + groupid)
          .data([props]).enter().append("g")
          .attr("id", groupid);
      }
      itemsvg.select("#" + groupid)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-width", props.st_w);

      var groupsvg = itemsvg.select("#" + groupid);

      // draw boxes
      groupsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      groupsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).enter().append("rect")
        .attr("id", function(d) { return d.id; })
        .attr("class", this.plotClass)
        .style("fill", function(d) { return d.fi; })
        .style("fill-opacity", function(d) { return d.fi_op; })
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; });

      groupsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.w; })
        .attr("height", function(d) { return d.h; });
    };

    return PlotAuxBox;
  };
  beakerRegister.bkoFactory('PlotAuxBox', ['plotUtils', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotAuxRiver = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };
    PlotAuxRiver.prototype.plotClass = "";

    PlotAuxRiver.prototype.format = function() {
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op" : this.color_opacity,
        "st" : this.stroke,
        "st_w" : this.stroke_width,
        "st_op" : this.stroke_opacity,
        "pts" : null
      };
      this.elementProps = [];
    };

    PlotAuxRiver.prototype.render = function(scope, elements, gid){
      if (gid == null) { gid = ""; }
      this.elements = elements;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotAuxRiver.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var pstr = "";

      eleprops.length = 0;

      var eles = this.elements;
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        var x = mapX(ele.x), y = mapY(ele.y), y2 = mapY(ele.y2);

        if (plotUtils.rangeAssert([x, y, y2])) {
          eleprops.length = 0;
          return;
        }
        pstr += x + "," + y + " ";
      }

      for (var i = eles.length - 1; i >= 0; i--) {
        var ele = eles[i];
        var x = mapX(ele.x), y2 = mapY(ele.y2);
        pstr += x + "," + y2 + " ";
      }
      if (pstr.length > 0) {
        this.itemProps.pts = pstr;
      }
    };

    PlotAuxRiver.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) { gid = ""; }
      var svg = scope.maing;
      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      var groupsvg = itemsvg.select("#" + groupid);
      groupsvg.selectAll("polygon")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", function(d) { return plotUtils.getHighlightedSize(d.st_w, highlighted); });
    };


    PlotAuxRiver.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        // aux box are ploted as bars with normal coloring
        // if special coloring is needed, it is set from the loader
        itemsvg.selectAll("#" + groupid)
          .data([props]).enter().append("g")
          .attr("id", groupid);
      }

      var groupsvg = itemsvg.select("#" + groupid);

      groupsvg.selectAll("polygon")
        .data([props]).enter().append("polygon");
      groupsvg.selectAll("polygon")
        .attr("points", props.pts)
        .attr("class", this.plotClass)
        .style("fill", function(d) { return d.fi; })
        .style("fill-opacity", function(d) { return d.fi_op; })
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; });
    };

    return PlotAuxRiver;
  };
  beakerRegister.bkoFactory('PlotAuxRiver', ['plotUtils', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotAuxStem = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotAuxStem.prototype.plotClass = "";

    PlotAuxStem.prototype.format = function() {
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray
      };
      this.elementProps = [];
    };

    PlotAuxStem.prototype.render = function(scope, elements, gid){
      this.elements = elements;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotAuxStem.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var skipped = false;

      eleprops.length = 0;

      var eles = this.elements;
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        var x = mapX(ele.x),
            y = mapY(ele.y), y2 = mapY(ele.y2);

        if (plotUtils.rangeAssert([x, y, y2])) {
          eleprops.length = 0;
          return;
        }

        var id = this.id + "_" + i;
        var prop = {
          "id" : id,
          "x" : x,
          "y" : y,
          "y2" : y2
        };
        eleprops.push(prop);
      }
    };

    PlotAuxStem.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) { gid = ""; }
      var svg = scope.maing;
      var props = this.itemProps;

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      itemsvg.select("#" + groupid)
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", plotUtils.getHighlightedSize(props.st_w, highlighted));
    };

    PlotAuxStem.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        // aux box are ploted as bars with normal coloring
        // if special coloring is needed, it is set from the loader
        itemsvg.selectAll("#" + groupid)
          .data([props]).enter().append("g")
          .attr("id", groupid);
      }
      itemsvg.select("#" + groupid)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-width", props.st_w)
        .style("stroke-dasharray", props.st_da);

      var groupsvg = itemsvg.select("#" + groupid);

      // draw stems
      groupsvg.selectAll("line")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      groupsvg.selectAll("line")
        .data(eleprops, function(d) { return d.id; }).enter().append("line")
        .attr("id", function(d) { return d.id; })
        .attr("class", this.plotClass)
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; })
        .style("stroke-dasharray", function(d) { return d.st_da; });
      groupsvg.selectAll("line")
        .data(eleprops, function(d) { return d.id; })
        .attr("x1", function(d) { return d.x; })
        .attr("x2", function(d) { return d.x; })
        .attr("y1", function(d) { return d.y; })
        .attr("y2", function(d) { return d.y2; });
    };

    return PlotAuxStem;
  };
  beakerRegister.bkoFactory('PlotAuxStem', ['plotUtils', retfunc]);
})();

  /*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotLine = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    // constants
    PlotLine.prototype.respR = 5;
    PlotLine.prototype.plotClass = "plot-line";
    PlotLine.prototype.respClass = "plot-resp plot-respdot";
    PlotLine.prototype.actionClass = "item-clickable item-onkey";

    PlotLine.prototype.setHighlighted = function(scope, highlighted) {
      var svg = scope.maing;
      var itemsvg = svg.select("#" + this.id);
      itemsvg.selectAll("path")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", function(d) {
          return plotUtils.getHighlightedSize(d.st_w, highlighted);
        })
    };

    PlotLine.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : null
      };
      this.elementProps = [];
      this.elementLabels = [];
    };

    PlotLine.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotLine.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity,
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y);
      }
      return range;
    };

    PlotLine.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
      }
    };

    PlotLine.prototype.filter = function(scope) {
      var eles = this.elements;
      if (this.isUnorderedItem === true) {
        // cannot do truncation on unordered item, force rendering all
        this.vindexL = 0;
        this.vindexR = eles.length - 1;
        this.vlength = eles.length;
        return;
      }
      var l = plotUtils.upper_bound(eles, "x", scope.focus.xl),
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr) + 1;

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x < scope.focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };

    PlotLine.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps,
          elelabels = this.elementLabels,
          tipids = this.tipIds;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var pstr = "";

      eleprops.length = 0;
      elelabels.length = 0;

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        if (i === this.vindexL) {
          pstr += "M";
        } else if (i === this.vindexL + 1) {
          if (this.interpolation !== "curve") pstr += "L";
          else pstr += "C";
        }
        var x = mapX(ele.x), y = mapY(ele.y);

        if (plotUtils.rangeAssert([x, y])) {
          eleprops.length = 0;
          return;
        }

        var nxtp = x + "," + y + " ";

        if (this.useToolTip === true && focus.yl <= ele.y && ele.y <= focus.yr) {
          var id = this.id + "_" + i;
          var prop = {
            "id" : id,
            "idx" : this.index,
            "ele" : ele,
            "isresp" : true,
            "cx" : x,
            "cy" : y,
            "tooltip_cx": x,
            "tooltip_cy": y,
            "tooltip_r": 5,
            "op" : scope.tips[id] == null ? 0 : 1
          };
          eleprops.push(prop);
        }

        if (i < this.vindexR) {
          if (this.interpolation === "none") {
            var ele2 = eles[i + 1];
            var x2 = mapX(ele2.x);

            if (plotUtils.rangeAssert([x2])) {
              eleprops.length = 0;
              return;
            }

            nxtp += x + "," +y + " " + x2 + "," + y + " ";

          } else if (this.interpolation === "curve") {
            // TODO curve implementation
          }
        }
        pstr += nxtp;

        if(ele.itemLabel || this.showItemLabel){
          var labelMargin = 3;

          var label = {
            "id": "label_" + id,
            "text": ele.itemLabel ? ele.itemLabel : ele._y,
            "x": x,
            "y": y - labelMargin
          };
          elelabels.push(label);
        }

      }
      if (pstr.length > 0) {
        this.itemProps.d = pstr;
      }
    };

    PlotLine.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps,
          elelabels = this.elementLabels;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var itemsvg = svg.select("#" + this.id);

      itemsvg.selectAll("path")
        .data(props, function(d) { return d.id; }).exit().remove();
      itemsvg.selectAll("path")
        .data([props], function(d) { return d.id; }).enter().append("path")
        .attr("class", this.plotClass + " " + this.actionClass)
        .style("stroke", function(d) { return d.st; })
        .style("stroke-dasharray", function(d) { return d.st_da; })
        .style("stroke-width", function(d) { return d.st_w; })
        .style("stroke-opacity", function(d) { return d.st_op; });
      itemsvg.select("path")
        .attr("d", props.d);

      if (this.useToolTip === true) {
        itemsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        itemsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id; }).enter().append("circle")
          .attr("id", function(d) { return d.id; })
          .attr("class", this.respClass + " " + this.actionClass)
          .style("stroke", this.tip_color);
        itemsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id; })
          .attr("cx", function(d) { return d.tooltip_cx; })
          .attr("cy", function(d) { return d.tooltip_cy; })
          .attr("r", this.respR )
          .style("opacity", function(d) { return d.op; });
      }
      itemsvg.selectAll("text").remove();
      itemsvg.selectAll("text")
        .data(elelabels, function(d) { return d.id; }).enter().append("text")
        .attr("id", function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .style("stroke", "none")
        .text(function(d) {
          return d.text;
        });
    };

    PlotLine.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotLine.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    PlotLine.prototype.createTip = function(ele) {
      if (ele.tooltip)
        return ele.tooltip;
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var valx = plotUtils.getTipString(ele._x, xAxis, true),
          valy = plotUtils.getTipString(ele._y, yAxis, true);
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      tip.x = valx;
      tip.y = valy;
      return plotUtils.createTipString(tip);
    };

    return PlotLine;
  };
  beakerRegister.bkoFactory('PlotLine', ['plotUtils', 'plotTip', retfunc]);
})();


/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {

    var PlotBar = function(data) {
      _.extend(this, data); // copy properties to itself
      this.format();
    };
    PlotBar.prototype.plotClass = "plot-bar";
    PlotBar.prototype.respClass = "plot-resp";
    PlotBar.prototype.actionClass = "item-clickable item-onkey";

    PlotBar.prototype.setHighlighted = function(scope, highlighted) {
      var itemsvg = scope.maing.select("#" + this.id);
      var diff = plotUtils.getHighlightedDiff(highlighted) / 2;
      itemsvg.selectAll("rect")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .attr("x", function(d) { return d.x - diff; })
        .attr("y", function(d) { return d.y - diff; })
        .attr("width", function(d) { return plotUtils.getHighlightedSize(d.w, highlighted); })
        .attr("height", function(d) { return plotUtils.getHighlightedSize(d.h, highlighted); });

    };

    PlotBar.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st": this.stroke,
        "st_w": this.stroke_width,
        "st_op": this.stroke_opacity
      };
      this.elementProps = [];
      this.elementLabels = [];
    };

    PlotBar.prototype.render = function(scope) {
      if (this.showItem == false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotBar.prototype.getRange = function(){
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity,
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x2);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y2);
      }
      return range;
    };

    PlotBar.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
        ele.x2 = xAxis.getPercent(ele.x2);
        ele.y2 = yAxis.getPercent(ele.y2);
      }
    };

    PlotBar.prototype.filter = function(scope) {
      var eles = this.elements;
      var l = plotUtils.upper_bound(eles, "x2", scope.focus.xl) + 1,
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr);

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x2 < focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };

    PlotBar.prototype.prepare = function(scope) {
      var w = this.width, sw;
      var focus = scope.focus;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var eleprops = this.elementProps,
          eles = this.elements;
      var elelabels = this.elementLabels;

      eleprops.length = 0;
      elelabels.length = 0;
      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        if (ele.y2 < focus.yl || ele.y > focus.yr) { continue; }

        var x = mapX(ele.x), x2 = mapX(ele.x2);
        if (x2 - x < 1) x2 = x + 1;
        var y = mapY(ele.y), y2 = mapY(ele.y2);
        sw = x2 - x;
        if (y < y2) { continue; } // prevent negative height


        if (plotUtils.rangeAssert([x, x2, y, y2])) {
          eleprops.length = 0;
          return;
        }

        var id = this.id + "_" + i;
        var prop = {
          "id" : id,
          "idx" : this.index,
          "ele" : ele,
          "x" : x,
          "y" : y2,
          "w" : sw,
          "h" : y - y2,
          "fi" : ele.color,
          "fi_op" : ele.color_opacity,
          "st" : ele.stroke,
          "st_w" : ele.stroke_width,
          "st_op" : ele.stroke_opacity
        };

        eleprops.push(prop);

        if(ele.itemLabel || this.showItemLabel){
          var labely;
          var labelMargin = 3;
          var labelHeight = plotUtils.fonts.labelHeight;
          var isBarPositive = ele._y2 != this.base;

          var labelText = ele.itemLabel ? ele.itemLabel : isBarPositive ? ele._y2 : ele._y;

          switch(this.labelPosition){
            case "VALUE_OUTSIDE":
              labely =  isBarPositive ? y2 - labelMargin : y + labelHeight + labelMargin;
              break;
            case "VALUE_INSIDE":
              labely = isBarPositive ? y2 + labelHeight + labelMargin : y - labelMargin;
              break;
            case "BASE_OUTSIDE":
              labely = isBarPositive ? y + labelHeight + labelMargin : y2 - labelMargin;
              break;
            case "BASE_INSIDE":
              labely = isBarPositive ? y - labelMargin : y2 + labelHeight + labelMargin;
              break;
            default: //CENTER
              var center = (y - y2)/2;
              labely = isBarPositive ? y2 + center + labelHeight/2 : y - center + labelHeight/2;
              break;
          }

          var label = {
            "id": "label_" + id,
            "text": labelText,
            "x": x + sw/2,
            "y": labely
          };
          elelabels.push(label);
        }
      }
    };

    PlotBar.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps,
          elelabels = this.elementLabels;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-width", props.st_w);


      var itemsvg = svg.select("#" + this.id);
      var respClass = this.useToolTip === true ? this.respClass : null;
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).enter().append("rect")
        .attr("id", function(d) { return d.id; })
        .attr("class", respClass + " " + this.actionClass)
        .attr("shape-rendering", "crispEdges");
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.w; })
        .attr("height", function(d) { return d.h; })
        .style("fill", function(d) { return d.fi; })
        .style("fill-opacity", function(d) { return d.fi_op; })
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; });;
      itemsvg.selectAll("text").remove();
      itemsvg.selectAll("text")
        .data(elelabels, function(d) { return d.id; }).enter().append("text")
        .attr("id", function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .text(function(d) {
          return d.text;
        });
    };

    PlotBar.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotBar.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id,  hidden);
    };

    PlotBar.prototype.createTip = function(ele, g, model) {
      if (ele.tooltip)
        return ele.tooltip;

      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      if (model.orientation === 'HORIZONTAL'){
        tip.value = plotUtils.getTipString(plotUtils.minus(ele._x2, ele._x), xAxis, true);
      }else{
        tip.x = plotUtils.getTipString(plotUtils.div(plotUtils.plus(ele._x, ele._x2), 2), xAxis, true);
        tip.yTop = plotUtils.getTipString(ele._y2, yAxis, true);
        tip.yBtm = plotUtils.getTipString(ele._y, yAxis, true);
      }
      return plotUtils.createTipString(tip);
    };

    return PlotBar;
  };
  beakerRegister.bkoFactory('PlotBar', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotStem = function(data) {
      _.extend(this, data);
      this.format();
    };

    PlotStem.prototype.plotClass = "plot-stem";
    PlotStem.prototype.respClass = "plot-resp";
    PlotStem.prototype.actionClass = "item-clickable item-onkey";

    PlotStem.prototype.setHighlighted = function(scope, highlighted) {
      var svg = scope.maing;
      var props = this.itemProps;

      svg.select("#" + this.id)
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", plotUtils.getHighlightedSize(props.st_w, highlighted));
    };

    PlotStem.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op": this.color_opacity,
        "st_w": this.width
      };
      this.elementProps = [];
      this.elementLabels = [];
    };

    PlotStem.prototype.render = function(scope) {
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotStem.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity,
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x2 ? ele.x2 : ele.x);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y2);
      }
      return range;
    };

    PlotStem.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        if(ele.x2)
          ele.x2 = xAxis.getPercent(ele.x2);
        ele.y = yAxis.getPercent(ele.y);
        ele.y2 = yAxis.getPercent(ele.y2);
      }
    };

    PlotStem.prototype.filter = function(scope) {
      var eles = this.elements;
      var l = plotUtils.upper_bound(eles, "x", scope.focus.xl) + 1,
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr);

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x < scope.focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };



    PlotStem.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps,
          elelabels = this.elementLabels;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;

      eleprops.length = 0;
      elelabels.length = 0;

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        if (ele.y2 < focus.yl || ele.y > focus.yr) { continue; }

        var x = mapX(ele.x), y = mapY(ele.y), y2 = mapY(ele.y2);
        var x2 = (ele.x2) ? mapX(ele.x2) : x;

        if (plotUtils.rangeAssert([x, y, y2])) {
          eleprops.length = 0;
          return;
        }

        var prop = {
          "id" : this.id + "_" + i,
          "idx" : this.index,
          "ele" : ele,
          "st" : ele.color,
          "st_op": ele.color_opacity,
          "st_w" : ele.width,
          "st_da": ele.stroke_dasharray,
          "isresp" : true,
          "x1" : x,
          "y1" : y,
          "x2" : x2,
          "y2" : y2,
          "op" : scope.tips[this.id + "_" + i] == null ? 0 : 1
        };
        eleprops.push(prop);

        if(ele.itemLabel || this.showItemLabel){
          var labelMargin = 3;
          var labelHeight = plotUtils.fonts.labelHeight;
          var base = this.base != null ? this.base : 0;
          var isPositiveStem = ele._y2 != base;

          var labelText = ele.itemLabel ? ele.itemLabel : isPositiveStem ? ele._y2 : ele._y;
          var labely = isPositiveStem ? y2 - labelMargin : y + labelHeight + labelMargin;

          var label = {
            "id": "label_" + prop.id,
            "text": labelText,
            "x": x,
            "y": labely
          };
          elelabels.push(label);
        }

      }
    };

    PlotStem.prototype.draw = function(scope) {
      var self = this;
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps,
          elelabels = this.elementLabels;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-dasharray", props.st_da)
        .style("stroke-width", props.st_w);

      var respClass = this.useToolTip === true ? this.respClass : null;
      var itemsvg = svg.select("#" + this.id);
      itemsvg.selectAll("line.normal")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      itemsvg.selectAll("line.normal")
        .data(eleprops, function(d) { return d.id; }).enter().append("line")
        .attr("class", respClass + " " + this.actionClass + " normal")
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-dasharray", function(d) { return d.st_da; })
        .style("stroke-width", function(d) { return d.st_w; });
      itemsvg.selectAll("line.normal")
        .data(eleprops, function(d) { return d.id; })
        .attr("x1", function(d) { return d.x1; })
        .attr("x2", function(d) { return d.x2; })
        .attr("y1", function(d) { return d.y1; })
        .attr("y2", function(d) { return d.y2; });

      if (this.useToolTip === true) {
        itemsvg.selectAll("line.highlighted")
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        itemsvg.selectAll("line.highlighted")
          .data(eleprops, function(d) { return d.id; }).enter().append("line")
          .attr("id", function(d) { return d.id; })
          .attr("class", respClass+" highlighted")
          .style("stroke", function(d) { return d.st; })
          .style("stroke-dasharray", function(d) { return d.st_da; })
          .style("stroke-width", function(d) { return plotUtils.getHighlightedSize(self.itemProps.st_w, true); })
          .style("opacity", function(d) { return d.op; });
        itemsvg.selectAll("line.highlighted")
          .data(eleprops, function(d) { return d.id; })
          .attr("x1", function(d) { return d.x1; })
          .attr("x2", function(d) { return d.x2; })
          .attr("y1", function(d) { return d.y1; })
          .attr("y2", function(d) { return d.y2; });
      }

      itemsvg.selectAll("text").remove();
      itemsvg.selectAll("text")
        .data(elelabels, function(d) { return d.id; }).enter().append("text")
        .attr("id", function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .style("stroke", "none")
        .text(function(d) {
          return d.text;
        });
    };

    PlotStem.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotStem.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    PlotStem.prototype.createTip = function(ele, g, model) {
      if (ele.tooltip)
        return ele.tooltip;
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      if (model.orientation === 'HORIZONTAL'){
        tip.value = plotUtils.getTipString(plotUtils.minus(ele._x2, ele._x), xAxis, true);
      }else {
        tip.x = plotUtils.getTipString(ele._x, xAxis, true);
        tip.yTop = plotUtils.getTipString(ele._y2, yAxis, true);
        tip.yBtm = plotUtils.getTipString(ele._y, yAxis, true);
      }
      return plotUtils.createTipString(tip);
    };

    return PlotStem;
  };
  beakerRegister.bkoFactory('PlotStem', ['plotUtils', 'plotTip',  retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {

    var PlotArea = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotArea.prototype.respWidth = 5;
    PlotArea.prototype.respMinHeight = 5;
    PlotArea.prototype.plotClass = "plot-area";
    PlotArea.prototype.respClass = "plot-resp plot-respstem";
    PlotArea.prototype.actionClass = "item-clickable item-onkey";

    PlotArea.prototype.setHighlighted = function(scope, highlighted) {

      if(highlighted === true){
        scope.jqsvg.find("#" + this.id+ " polygon").attr("filter", "url("+window.location.pathname+"#svgAreaFilter)");
      }else{
         scope.jqsvg.find("#" + this.id+ " polygon").removeAttr("filter");
      }
    };

    PlotArea.prototype.format = function(){
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st": this.stroke,
        "st_w": this.stroke_width,
        "st_op": this.stroke_opacity,
        "pts" : null
      };
      this.elementProps = [];
    };

    PlotArea.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      this.clear(scope);
      if (this.vlength !== 0) {
        this.draw(scope);
      }
    };

    PlotArea.prototype.getRange = function(){
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y2);
      }
      return range;
    };

    PlotArea.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
        ele.y2 = yAxis.getPercent(ele.y2);
      }
    };

    PlotArea.prototype.filter = function(scope) {
      var eles = this.elements;
      if (this.isUnorderedItem === true) {
        // cannot do truncation on unordered item, force rendering all
        this.vindexL = 0;
        this.vindexR = eles.length - 1;
        this.vlength = eles.length;
        return;
      }
      var l = plotUtils.upper_bound(eles, "x", scope.focus.xl),
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr) + 1;

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x < scope.focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };

    PlotArea.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var pstr = "";

      eleprops.length = 0;

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        var x = mapX(ele.x), y = mapY(ele.y), y2 = mapY(ele.y2);

        if (plotUtils.rangeAssert([x, y, y2])) {
          eleprops.length = 0;
          return;
        }

        if (this.interpolation === "linear") {
          pstr += x + "," + y + " ";
        } else if (this.interpolation === "none" && i < this.vindexR) {
          var ele2 = eles[i + 1];
          var x2 = mapX(ele2.x);
          if (Math.abs(x2) > 1E6) {
            break;
          }
          pstr += x + "," + y + " " + x2 + "," + y + " ";
        }

        if (this.useToolTip === true && ele.y <= focus.yr && ele.y2 >= focus.yl) {
          var id = this.id + "_" + i;
          var prop = {
            "id" : id,
            "idx" : this.index,
            "ele" : ele,
            "isresp" : true,
            "x" : x - this.respWidth / 2,
            "y" : y2,
            "h" : Math.max(y - y2, this.respMinHeight),  // min height to be hoverable
            "op" : scope.tips[id] == null ? 0 : 1
          };
          eleprops.push(prop);
        }
      }

      for (var i = this.vindexR; i >= this.vindexL; i--) {
        var ele = eles[i];
        var x = mapX(ele.x), y2 = mapY(ele.y2);

        if (this.interpolation === "linear") {
          pstr += x + "," + y2 + " ";
        } else if (this.interpolation === "none" && i < this.vindexR) {
          var ele2 = eles[i + 1];
          var x2 = mapX(ele2.x);

          if (plotUtils.rangeAssert([x2])) {
            eleprops.length = 0;
            return;
          }

          pstr += x2 + "," + y2 + " " + x + "," + y2 + " ";
        }
      }
      if (pstr.length > 0) {
        this.itemProps.pts = pstr;
      }
    };

    PlotArea.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var itemsvg = svg.select("#" + this.id);

      itemsvg.selectAll("polygon")
        .data([props]).enter().append("polygon")
        .attr("class", this.plotClass + " " + this.actionClass)
        .style("fill", function(d) { return d.fi; })
        .style("fill-opacity", function(d) { return d.fi_op; })
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; });
      itemsvg.select("polygon")
        .attr("points", props.pts);

      if (this.useToolTip === true) {
        itemsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        itemsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; }).enter().append("rect")
          .attr("id", function(d) { return d.id; })
          .attr("class", this.respClass + " " + this.actionClass)
          .attr("width", this.respWidth)
          .style("stroke", this.tip_color);

        itemsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; })
          .attr("x", function(d) { return d.x; })
          .attr("y", function(d) { return d.y; })
          .attr("height", function(d) { return d.h; })
          .style("opacity", function(d) { return d.op; });
      }
    };

    PlotArea.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotArea.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id,  hidden);
    };

    PlotArea.prototype.createTip = function(ele) {
      if (ele.tooltip)
        return ele.tooltip;

      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      tip.x = plotUtils.getTipString(ele._x, xAxis, true);
      tip.yTop = plotUtils.getTipString(ele._y2, yAxis, true);
      tip.yBtm = plotUtils.getTipString(ele._y, yAxis, true);
      return plotUtils.createTipString(tip);
    };

    return PlotArea;
  };
  beakerRegister.bkoFactory('PlotArea', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotPoint = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotPoint.prototype.plotClass = "plot-point";
    PlotPoint.prototype.respClass = "plot-resp";
    PlotPoint.prototype.actionClass = "item-clickable item-onkey";
    PlotPoint.prototype.shapes = ["rect", "diamond", "circle"];
    PlotPoint.prototype.svgtags = ["rect", "polygon", "circle"];

    PlotPoint.prototype.setHighlighted = function(scope, highlighted) {

      var svg = scope.maing;

      var itemsvg = svg.select("#" + this.id);

      for (var i = 0; i < this.shapes.length; i++) {
        var shape = this.shapes[i],
          tag = this.svgtags[i];

        var shapesvg = itemsvg.select("#" + shape);

        switch (shape) {
          case "circle":
            shapesvg.selectAll(tag)
              .transition()
              .duration(plotUtils.getHighlightDuration())
              .attr("r", function(d) { return plotUtils.getHighlightedSize(d.r, highlighted); });
            break;
          case "diamond":
            shapesvg.selectAll(tag)
              .transition()
              .duration(plotUtils.getHighlightDuration())
              .attr("points", function(d) {
                var mapX = scope.data2scrXi, mapY = scope.data2scrYi;
                var ele = d.ele, x = mapX(ele.x), y = mapY(ele.y),
                    s = plotUtils.getHighlightedSize(ele.size, highlighted);
                var pstr = "";
                pstr += (x - s) + "," + (y    ) + " ";
                pstr += (x    ) + "," + (y - s) + " ";
                pstr += (x + s) + "," + (y    ) + " ";
                pstr += (x    ) + "," + (y + s) + " ";
                return pstr;
              });
            break;
          default:  // rect
            var diff = plotUtils.getHighlightedDiff(highlighted) / 2;
            shapesvg.selectAll(tag)
              .transition()
              .duration(plotUtils.getHighlightDuration())
              .attr("x", function(d) { return d.x - diff; })
              .attr("y", function(d) { return d.y - diff; })
              .attr("width", function(d) { return plotUtils.getHighlightedSize(d.w, highlighted); })
              .attr("height", function(d) { return plotUtils.getHighlightedSize(d.h, highlighted); });
        }
      }
    };

    PlotPoint.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st": this.stroke,
        "st_op" : this.stroke_opacity,
        "st_w": this.stroke_width,
        "st_da": this.stroke_dasharray
      };

      this.elementProps = {
        "rect" : [],
        "diamond" : [],
        "circle" : []
      };
      this.elementLabels = {
        "rect" : [],
        "diamond" : [],
        "circle" : []
      };
    };

    PlotPoint.prototype.render = function(scope) {
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotPoint.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y);
      }
      return range;
    };

    PlotPoint.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
      }
    };

    PlotPoint.prototype.filter = function(scope) {
      var eles = this.elements;
      var l = plotUtils.upper_bound(eles, "x", scope.focus.xl) + 1,
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr);

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x < scope.focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };

    PlotPoint.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;

      _.each(this.elementProps, function(val) {
        val.length = 0;
      });

      _.each(this.elementLabels, function(val) {
        val.length = 0;
      });

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        if (ele.y < focus.yl || ele.y > focus.yr) { continue; }
        var x = mapX(ele.x), y = mapY(ele.y), s = ele.size;
        var labely;

        if (plotUtils.rangeAssert([x, y])) {
          _.each(this.elementProps, function(val) {
            val.length = 0;
          });
          _.each(this.elementLabels, function(val) {
            val.length = 0;
          });
          return;
        }

        var prop = {
          "id" :  this.id + "_" + i,
          "idx" : this.index,
          "ele" : ele,
          "fi" : ele.color,
          "fi_op" : ele.color_opacity,
          "st" : ele.stroke,
          "st_op" : ele.stroke_opacity,
          "st_w" : ele.stroke_width,
          "st_da" : ele.stroke_dasharray,
          "tooltip_cx" : x,
          "tooltip_cy" : y
        };
        var shape = ele.shape == null ? this.shape : ele.shape;
        switch (shape) {
          case "diamond":
            var pstr = "";
            pstr += (x - s) + "," + (y    ) + " ";
            pstr += (x    ) + "," + (y - s) + " ";
            pstr += (x + s) + "," + (y    ) + " ";
            pstr += (x    ) + "," + (y + s) + " ";
            _.extend(prop, {
              "pts" : pstr,
              "tooltip_cx" : x
            });
            labely = y - s;
            break;
          case "circle":
            _.extend(prop, {
              "cx": x,
              "cy": y,
              "r": s
            });
            labely = y - s;
            break;
          default:    // rects
            _.extend(prop, {
              "x": x - s / 2,
              "y": y - s / 2,
              "w": s,
              "h": s
            });
            labely = y - s / 2;
        }
        this.elementProps[shape].push(prop);
        if(ele.itemLabel || this.showItemLabel){
          var labelMargin = 3;

          var label = {
            "id": "label_" + prop.id,
            "text": ele.itemLabel ? ele.itemLabel : ele._y,
            "x": x,
            "y": labely - labelMargin
          };
          this.elementLabels[shape].push(label);
        }
      }
    };

    PlotPoint.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-dasharray", props.st_da)
        .style("stroke-width", props.st_w);

      var itemsvg = svg.select("#" + this.id);
      var respClass = this.useToolTip === true ? this.respClass : null;

      for (var i = 0; i < this.shapes.length; i++) {
        var shape = this.shapes[i],
            tag = this.svgtags[i],
            eleprops = this.elementProps[shape];

        var shapesvg = itemsvg.select("#" + shape);

        if (shapesvg.empty()) {
          shapesvg = itemsvg.selectAll("#" + shape)
            .data([{}]).enter().append("g")
            .attr("id", shape);
        }

        shapesvg.selectAll(tag)
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        shapesvg.selectAll(tag)
          .data(eleprops, function(d) { return d.id; }).enter().append(tag)
          .attr("id", function(d) { return d.id; })
          .attr("class", respClass + " " + this.actionClass)
          .style("fill", function(d) { return d.fi; })
          .style("fill-opacity", function(d) { return d.fi_op; })
          .style("stroke", function(d) { return d.st; })
          .style("stroke-opacity", function(d) { return d.st_op; })
          .style("stroke-dasharray", function(d) { return d.st_da; })
          .style("stroke-width", function(d) { return d.st_w; });

        switch (shape) {
          case "circle":
            shapesvg.selectAll(tag)
              .data(eleprops, function(d) { return d.id; })
              .attr("cx", function(d) { return d.cx; })
              .attr("cy", function(d) { return d.cy; })
              .attr("r", function(d) { return d.r; });
            break;
          case "diamond":
            shapesvg.selectAll(tag)
              .data(eleprops, function(d) { return d.id; })
              .attr("points", function(d) { return d.pts; });
            break;
          default:  // rect
            shapesvg.selectAll(tag)
              .data(eleprops, function(d) { return d.id; })
              .attr("x", function(d) { return d.x; })
              .attr("y", function(d) { return d.y; })
              .attr("width", function(d) { return d.w; })
              .attr("height", function(d) { return d.h; });
        }
        shapesvg.selectAll("text").remove();
        shapesvg.selectAll("text")
          .data(this.elementLabels[shape], function(d) { return d.id; }).enter().append("text")
          .attr("id", function(d) { return tag + "_" + d.id; })
          .attr("x", function(d) { return d.x; })
          .attr("y", function(d) { return d.y; })
          .attr("text-anchor", "middle")
          .style("fill", "black")
          .style("stroke", "none")
          .text(function(d) {return d.text;});
      }
    };

    PlotPoint.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotPoint.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id,  hidden);
    };

    PlotPoint.prototype.createTip = function(ele) {

      if (ele.tooltip)
        return ele.tooltip;

      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      tip.x = plotUtils.getTipString(ele._x, xAxis, true);
      tip.y = plotUtils.getTipString(ele._y, yAxis, true);
      return plotUtils.createTipString(tip);
    };

    return PlotPoint;
  };
  beakerRegister.bkoFactory('PlotPoint', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotConstline = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotConstline.prototype.plotClass = "plot-constline";

    PlotConstline.prototype.format = function(){
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op": this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "st_label" : this.showLabel,
      };

      this.elementProps = [];
      this.labelpipe = [];
      this.rmlabelpipe = [];
    };

    PlotConstline.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotConstline.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity,
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        if (ele.type === "x") {
          range.xl = Math.min(range.xl, ele.x);
          range.xr = Math.max(range.xr, ele.x);
        } else if (ele.type === "y") {
          range.yl = Math.min(range.yl, ele.y);
          range.yr = Math.max(range.yr, ele.y);
        }
      }
      return range;
    };

    PlotConstline.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        if (ele.type === "x") {
          ele.x = xAxis.getPercent(ele.x);
        } else if (ele.type === "y") {
          ele.y = yAxis.getPercent(ele.y);
        }
      }
    };

    PlotConstline.prototype.filter = function(scope) {
      // do nothing and show everything
      var l = 0, r = this.elements.length - 1;
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };


    PlotConstline.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var lMargin = scope.layout.leftLayoutMargin,
          bMargin = scope.layout.bottomLayoutMargin;
      var W = plotUtils.safeWidth(scope.jqsvg),
          H = plotUtils.safeHeight(scope.jqsvg);

      eleprops.length = 0;
      this.labelpipe.length = 0;
      this.rmlabelpipe.length = 0;

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];

        var prop = {
          "id" : this.id + "_" + i,
          "lbid" : this.id + "_" + i + "l",
          "st" : ele.color,
          "st_op" : ele.color_opacity,
          "st_w" : ele.width,
          "st_da" : ele.stroke_dasharray,
          "bg_clr" : ele.color == null ? this.color : ele.color
        };
        eleprops.push(prop);

        // does not need range assert, clipped directly
        if (ele.type === "x") {

          var x = mapX(ele.x);
          _.extend(prop, {
            "x1" : x,
            "x2" : x,
            "y1" : mapY(focus.yl),
            "y2" : mapY(focus.yr),
          });

          if (this.itemProps.st_label) {
            if (ele.x < focus.xl || ele.x > focus.xr) {
              this.rmlabelpipe.push(eleprops[i]);
              continue;
            } else {
              this.labelpipe.push(eleprops[i]);
            }
            var text = plotUtils.getTipString(ele._x, scope.stdmodel.xAxis);
            _.extend(prop, {
              "left" : function(w, h, x) { return x - w / 2; },
              "top" : function(w, h, y) { return H - bMargin - h - scope.labelPadding.y; },
              "lb_txt" : text
            });
          }
        } else if (ele.type === "y") {
          var y = mapY(ele.y);
          _.extend(prop, {
            "x1" : mapX(focus.xl),
            "x2" : mapX(focus.xr),
            "y1" : y,
            "y2" : y,
          });
          if (this.itemProps.st_label) {
            if (ele.y < focus.yl || ele.y > focus.yr) {
              this.rmlabelpipe.push(eleprops[i]);
              continue;
            } else {
              this.labelpipe.push(eleprops[i]);
            }
            var text = plotUtils.getTipString(ele._y, scope.stdmodel.yAxis);

            _.extend(prop, {
              "left" : function(w, h, x) { return lMargin + scope.labelPadding.x; },
              "top" : function(w, h, y) { return y - h / 2; },
              "lb_txt" : text
            });
          }
        }
      }
    };


    PlotConstline.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-dasharray", props.st_da)
        .style("stroke-width", props.st_w);

      var svgitem = svg.select("#" + this.id);
      svgitem.selectAll("line")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      svgitem.selectAll("line")
        .data(eleprops, function(d) { return d.id; }).enter().append("line")
        .attr("id", function(d) { return d.id; })
        //.attr("class", this.respClass) // does not need resp
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_w; })
        .style("stroke-dasharray", function(d) { return d.st_da; });
      svgitem.selectAll("line")
        .data(eleprops, function(d) { return d.id; })
        .attr("x1", function(d) { return d.x1; })
        .attr("x2", function(d) { return d.x2; })
        .attr("y1", function(d) { return d.y1; })
        .attr("y2", function(d) { return d.y2; });

      // add and remove labels
      for (var i = 0; i < this.labelpipe.length; i++) {
        var lb = this.labelpipe[i], lbid = lb.lbid;

        var box = scope.jqcontainer.find("#" + lbid);
        if (box.empty()) {
          box = $("<div></div>")
            .appendTo(scope.jqcontainer)
            .attr("id", lbid)
            .attr("class", "plot-constlabel")
            .css("background-color", lb.bg_clr)
            .text(lb.lb_txt);
        }
        var w = box.outerWidth(), h = box.outerHeight();
        box.css({
          "left" : lb.left(w, h, lb.x1),
          "top" : lb.top(w, h, lb.y1)
        });
      }

      for (var i = 0; i < this.rmlabelpipe.length; i++) {
        scope.jqcontainer.find("#" + this.rmlabelpipe[i].lbid).remove();
      }

    };

    PlotConstline.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
    };

    PlotConstline.prototype.hideTips = function(scope, hidden) {
      // do nothing, no tip for this type
    };

    return PlotConstline;
  };
  beakerRegister.bkoFactory('PlotConstline', ['plotUtils', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils) {
    var PlotConstband = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotConstband.prototype.plotClass = "plot-constband";

    PlotConstband.prototype.format = function(){
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st" : this.stroke,
        "st_op": this.stroke_opacity,
        "st_w" : this.stroke_width,
        "st_da" : this.stroke_dasharray
      };

      this.elementProps = [];
    };

    PlotConstband.prototype.render = function(scope){
      if (this.shotItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotConstband.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity,
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        if (ele.type === "x") {
          if(ele.x !== -Infinity){
            range.xl = Math.min(range.xl, ele.x);
          }
          if(ele.x2 !== Infinity){
            range.xr = Math.max(range.xr, ele.x2);
          }
        } else if (ele.type === "y") {
          if(ele.y !== -Infinity){
            range.yl = Math.min(range.yl, ele.y);
          }
          if(ele.y2 !== Infinity){
            range.yr = Math.max(range.yr, ele.y2);
          }
        }
      }
      return range;
    };

    PlotConstband.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        if (ele.type === "x") {
          if(ele.x !== -Infinity){
            ele.x = xAxis.getPercent(ele.x);
          }
          if(ele.x2 !== Infinity){
            ele.x2 = xAxis.getPercent(ele.x2);
          }
        } else if (ele.type === "y") {
          if(ele.y !== -Infinity){
            ele.y = yAxis.getPercent(ele.y);
          }
          if(ele.y2 !== Infinity){
            ele.y2 = yAxis.getPercent(ele.y2);
          }
        }
      }
    };

    PlotConstband.prototype.filter = function(scope) {
      // do nothing and show everything
      var l = 0, r = this.elements.length - 1;
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };


    PlotConstband.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var lMargin = scope.layout.leftLayoutMargin,
          bMargin = scope.layout.bottomLayoutMargin,
          tMargin = scope.layout.topLayoutMargin,
          rMargin = scope.layout.rightLayoutMargin;
      var W = plotUtils.safeWidth(scope.jqsvg),
          H = plotUtils.safeHeight(scope.jqsvg);

      eleprops.length = 0;

      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];

        var prop = {
          "id" : this.id + "_" + i,
          "fi" : ele.color,
          "fi_op" : ele.color_opacity,
          "st" : ele.stroke,
          "st_op" : ele.storke_opacity,
          "st_w" : ele.stroke_width,
          "st_da" : ele.stroke_dasharray
        };

        // does not need range assert, clipped directly
        if (ele.type === "x") {
          if (ele.x > focus.xr || ele.x2 < focus.xl) {
            continue;
          } else {
            eleprops.push(prop);
          }

          var x = mapX(ele.x !== -Infinity ? ele.x : focus.xl),
              x2 = mapX(ele.x2 !== Infinity ? ele.x2 : focus.xr);
          x = Math.max(x, lMargin);
          x2 = Math.min(x2, W - rMargin);

          _.extend(prop, {
            "x" : x,
            "w" : x2 - x,
            "y" : tMargin,
            "h" : H - bMargin - tMargin
          });
        } else if (ele.type === "y") {
          if (ele.y > focus.yr || ele.y2 < focus.yl) {
            continue;
          } else {
            eleprops.push(prop);
          }

          var y = mapY(ele.y !== -Infinity ? ele.y : focus.yl),
              y2 = mapY(ele.y2 !== Infinity ? ele.y2 : focus.yr);
          y = Math.min(y, H - bMargin);
          y2 = Math.max(y2, tMargin);

          _.extend(prop, {
            "x" : lMargin,
            "w" : W - lMargin - rMargin,
            "y" : y2,
            "h" : y - y2
          });
        }
      }
    };


    PlotConstband.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-width", props.st_w)
        .style("stroke-dasharray", props.st_da);

      var itemsvg = svg.select("#" + this.id);

      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).enter().append("rect")
        .attr("id", function(d) { return d.id; })
        // does not need resp class
        .style("fill", function(d) { return d.fi; })
        .style("fill-opacity", function(d) { return d.fi_op; })
        .style("stroke", function(d) { return d.st; })
        .style("stroke-opacity", function(d) { return d.st_op; })
        .style("stroke-width", function(d) { return d.st_wi; });
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.w; })
        .attr("height", function(d) { return d.h; });
    };

    PlotConstband.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
    };

    PlotConstband.prototype.hideTips = function(scope, hidden) {
      // do nothing, no tip for this type
    };

    return PlotConstband;
  };
  beakerRegister.bkoFactory('PlotConstband', ['plotUtils', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotText = function(data){
      _.extend(this, data);
      this.format();
    };

    PlotText.prototype.plotClass = "plot-text";
    PlotText.prototype.respClass = "plot-resp";

    PlotText.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id": this.id,
        "fi": this.color,
        "fi_op": this.color_opacity,
        "show_pointer": this.show_pointer,
        "pointer_angle": this.pointer_angle,
        "size": this.size
      };
      this.elementProps = [];
    };

    PlotText.prototype.render = function(scope) {
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    PlotText.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl : Infinity,
        xr : -Infinity,
        yl : Infinity,
        yr : -Infinity
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y);
      }
      return range;
    };

    PlotText.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
      }
    };

    PlotText.prototype.filter = function(scope) {
      var eles = this.elements;
      var l = plotUtils.upper_bound(eles, "x", scope.focus.xl) + 1,
          r = plotUtils.upper_bound(eles, "x", scope.focus.xr);

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x < scope.focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };


    /**
     * Uses canvas.measureText to compute and return the width of the given text of given font in pixels.
     *
     * @param {String} text The text to be rendered.
     * @param {String} font The css font descriptor that text is to be rendered with (e.g. "bold 14px verdana").
     *
     * @see http://stackoverflow.com/questions/118241/calculate-text-width-with-javascript/21015393#21015393
     */
    var getTextWidth = function (text, font) {
      // re-use canvas object for better performance
      var canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
      var context = canvas.getContext("2d");
      context.font = font;
      var metrics = context.measureText(text);
      return metrics.width;
    };


    PlotText.prototype.prepare = function(scope) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;

      eleprops.length = 0;
      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        if (ele.y < focus.yl || ele.y > focus.yr ) { continue; }
        var x = mapX(ele.x), y = mapY(ele.y);

        if (plotUtils.rangeAssert([x, y])) {
          eleprops.length = 0;
          return;
        }

        var prop = {
          "id" : this.id + "_" + i,
          "idx" : this.index,
          "ele" : ele,
          "txt" : ele.text,
          "x" : x,
          "y" : y
        };
        eleprops.push(prop);
      }
    };

    PlotText.prototype.draw = function (scope) {

      var pointerSize = 20;
      var pointerIndent = 10;

      var self = this;
      var svg = scope.maing;
      var props = this.itemProps,
        eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function (d) {
            return d.id;
          }).enter().append("g")
          .attr("id", function (d) {
            return d.id;
          });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass);

      var respClass = this.useToolTip === true ? this.respClass : null;
      var itemsvg = svg.select("#" + this.id);

      itemsvg.selectAll("text")
        .data(eleprops, function (d) {
          return d.id;
        }).exit().remove();
      itemsvg.selectAll("line")
        .data(eleprops, function (d) {
          return "line_" + d.id;
        }).exit().remove();

      if (self.itemProps.show_pointer === true) {

        itemsvg.selectAll("line")
          .data(eleprops, function (d) {
            return d.id;
          }).enter().append("line")
          .attr("id", function (d) {
            return "line_" + d.id;
          })
          .attr("x1", pointerSize)
          .attr("x2", pointerIndent)
          .attr("y1", 0)
          .attr("y2", 0)
          .attr("class", "text-line-style")
          .attr("stroke-width", 1)
          .attr("marker-end", "url("+window.location.pathname+"#Triangle)");


        itemsvg.selectAll("line")
          .data(eleprops, function (d) {
            return "line_" + d.id;
          })
          .attr("transform", function (d) {
            var x = d.x;
            var y = d.y;
            var transform = "rotate(" + self.itemProps.pointer_angle * (180 / Math.PI) + " " + x + " " + y + ")";
            transform += "translate(" + x + "," + y + ")";
            return transform;
          });
      }

      itemsvg.selectAll("text")
        .data(eleprops, function (d) {
          return d.id;
        }).enter().append("text")
        .attr("id", function (d) {
          return d.id;
        })
        .attr("class", respClass)
        .attr("fill", self.itemProps.fi)
        .style("opacity", self.itemProps.fi_op)
        .style('font-size', self.itemProps.size)
        .text(function (d) {
          return d.txt;
        });
      itemsvg.selectAll("text")
        .data(eleprops, function (d) {
          return d.id;
        })
        .attr("transform", function (d) {

          var x = d.x;
          var y = d.y;

          if (self.itemProps.show_pointer) {
            var size = self.itemProps.size;

            var width = getTextWidth(d.txt, size + "px pt-sans, Helvetica, sans-serif");
            var height = size;

            var angle = self.itemProps.pointer_angle;
            if (angle < 0) {
              angle = 2 * Math.PI + angle;
            }
            x += Math.cos(angle) * pointerSize;
            y += Math.sin(angle) * pointerSize;

            if (angle === 0) {
              y += Math.floor(height / 2);
            }
            else if (angle === 0.5 * Math.PI) {
              x -= Math.round(width / 2);
              y += height;
            }
            else if (angle === 1.5 * Math.PI) {
              x -= Math.round(width / 2);
            }
            else if (angle === Math.PI) {
              y += Math.floor(height / 2);
              x -= width;
            }
            else if (angle > 0 && angle < 0.5 * Math.PI) {
              y += height;
            }
            else if (angle > 0.5 * Math.PI && angle < Math.PI) {
              y += height;
              x -= width;
            }
            else if (angle > Math.PI && angle < 1.5 * Math.PI) {
              x -= width;
            }
            else if (angle > 1.5 * Math.PI && angle < 2 * Math.PI) {

            }
          }

          var tf = "", rot = null;
          if (d.ele.rotate != null) {
            rot = d.ele.rotate;
          }
          if (rot != null) {
            tf = "rotate(" + rot + " " + x + " " + y + ")";
          }
          tf += "translate(" + x + "," + y + ")";

          return tf;
        });
    };

    PlotText.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotText.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    PlotText.prototype.createTip = function(ele) {
      if (ele.tooltip)
        return ele.tooltip;
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend;
      }
      tip.x = plotUtils.getTipString(ele._x, xAxis, true);
      tip.y = plotUtils.getTipString(ele._y, yAxis, true);
      return plotUtils.createTipString(tip);
    };

    return PlotText;
  };
  beakerRegister.bkoFactory('PlotText', ['plotUtils', 'plotTip',  retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function () {
  'use strict';
  var retfunc = function (plotUtils) {

    var PlotTreeMapNode = function (data) {
      _(this).extend(data); // copy properties to itself
    };


    PlotTreeMapNode.prototype.isRoot = function () {
      return this.root === true;
    };

    PlotTreeMapNode.prototype.hideTips = function (scope, hidden) {
      //dummy function
    };

    PlotTreeMapNode.prototype.setHighlighted = function (scope, highlighted) {
      if (this.isRoot())
        return;
      var itemsvg = scope.maing.select("g").select("#" + this.id);
      if (highlighted) {
        itemsvg.node().parentNode.appendChild(itemsvg.node()); // workaround for bringing elements to the front (ie z-index)
      }
      itemsvg
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .select("rect")
        .style("stroke", highlighted ? "#000000" : "#FFFFFF")
        .style("stroke-width", highlighted ? 2 : 0.2)
        .style("opacity", highlighted ? 0.9 : 1.0)
      ;
    };


    PlotTreeMapNode.prototype.prepare = function (scope) {
      if (!this.isRoot())
        return;

      var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width = (scope ? plotUtils.safeWidth(scope.jqsvg) : 300) - margin.left - margin.right,
        height = (scope ? plotUtils.safeHeight(scope.jqsvg) : 200) - margin.top - margin.bottom;

      var treemap = d3.layout.treemap()
        .round(false)
        .size([width, height])
        .sticky(true)
        .value(function (d) {
          return d.showItem === true ? scope.stdmodel.valueAccessor === 'VALUE' ? d.doubleValue : d.weight : 0;
        });

      if (scope.stdmodel.mode) {
        treemap.mode(scope.stdmodel.mode)
      }
      if (scope.stdmodel.sticky) {
        treemap.sticky(scope.stdmodel.sticky)
      }
      if (scope.stdmodel.ratio) {
        treemap.ratio(scope.stdmodel.ratio)
      }
      if (scope.stdmodel.round) {
        treemap.round(scope.stdmodel.round)
      }

      this.nodes = treemap
        .nodes(this)
        .filter(function (d) {
          return !d.children || d.children.length === 0;
        });
    };


    PlotTreeMapNode.prototype.render = function (scope) {
      if (!this.isRoot())
        return;

      this.clear(scope);
      if (scope.showAllItems) {
        var hasVisible = false;
        var visitor = {

          visit: function (node) {
            if (!node.children && node.showItem === true)
              hasVisible = true;
          }
        };
        scope.stdmodel.process(visitor);
        if (hasVisible === true) {
          this.draw(scope);
        }
      }
    };


    PlotTreeMapNode.prototype.draw = function (scope) {

      var zoomed = function () {
        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        setTextStyles();
      };

      var setTextStyles = function () {
        svg.selectAll("text")
          .style('font-size', function (d) {
            var scale = d3.event && d3.event.scale ? d3.event.scale : 1;
            var size = Math.min(18 / scale, Math.floor(d.dx));
            return size + "px"
          })
          .attr("textLength", function (d) {
            return this.getComputedTextLength() < d.dx ? this.getComputedTextLength() : d.dx;
          })
          .style("opacity", function (d) {
            d.w = this.getComputedTextLength();
            return d.dx > d.w && d.showItem === true ? 1 : 0;
          })
        ;
      };

      if (!this.isRoot())
        return;

      this.prepare(scope);

      var zoom = d3.behavior.zoom().scaleExtent([1, 10]);

      var enableZoom = function () {
        scope.maing.call(zoom.on("zoom", zoomed));
        scope.maing.call(zoom)
          .on("dblclick.zoom", function () {
            svg.attr("transform", "translate(" + [0, 0] + ")scale(" + 1 + ")");
            setTextStyles();
          });
      };

      var disableZoom = function () {
        scope.maing.call(zoom.on("zoom", null));
        scope.maing.on("wheel.zoom", null);
      };

      // set zoom object
      scope.maing.on("focusin", function () {
        enableZoom();
      }).on("focusout", function () {
        disableZoom();
      });

      scope.maing.call(zoom)
        .on("dblclick.zoom", function () {
          svg.attr("transform", "translate(" + [0, 0] + ")scale(" + 1 + ")");
          setTextStyles();
        });


      var svg = scope.maing.append("svg:g");
      var cell = svg.selectAll("g")
          .data(this.nodes)
          .enter().append('svg:g')
          .attr('class', 'cell')
          .attr("id", function (d) {
            return d.id;
          })
          .attr('transform', function (d) {
            return 'translate(' + d.x + ',' + d.y + ')';
          })
          .on("mouseover", function (d) {
            if (scope.stdmodel.useToolTip === true && d.tooltip) {
              scope.tooltip.style("visibility", "visible");
              scope.tooltip.transition().duration(200).style("opacity", 0.9);
            }
          })
          .on("mousemove", function (d) {
            var xPosition = d3.event.layerX + 2;
            var yPosition = d3.event.layerY - 2;

            scope.tooltip
              .style("left", xPosition + "px")
              .style("top", yPosition + "px");

            if (d.tooltip) {
              scope.tooltip.html(d.tooltip);
            }
          })
          .on("mouseout", function () {
            scope.tooltip.transition().duration(500).style("opacity", 0);
          })
        ;


      cell.append("svg:rect")
        .attr("width", function (d) {
          return Math.max(0, d.dx - 0.2);
        })
        .attr("height", function (d) {
          return Math.max(0, d.dy - 0.2);
        })
        .style("fill", function (d) {
          return d.children ? null : d.color;
        })
      ;


      cell.append("svg:text")
        .attr("x", function (d) {
          return d.dx / 2;
        })
        .attr("y", function (d) {
          return d.dy / 2;
        })
        .attr("cursor", "default")
        .attr("text-anchor", "middle")
        .text(function (d) {
          return d.children ? null : d.label;
        });
      setTextStyles();
      disableZoom();
    };


    PlotTreeMapNode.prototype.clear = function (scope) {
      if (!this.isRoot())
        return;
      scope.maing.selectAll("*").remove();
    };


    return PlotTreeMapNode;
  };
  beakerRegister.bkoFactory('PlotTreeMapNode', ['plotUtils', retfunc]);
})();
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {

    var HeatMap = function(data) {
      _.extend(this, data); // copy properties to itself
      this.format();
    };
    HeatMap.prototype.plotClass = "heatmap";
    HeatMap.prototype.respClass = "plot-resp";

    HeatMap.prototype.format = function() {

      this.tip_class = "heatmap-tooltip";
      this.tip_color = "#004C80";

      var valueStep = (this.maxValue - this.minValue) / (this.colors.length - 1);
      var domain = [];
      for(var i = 0; i < this.colors.length; i++){
        domain.push(this.minValue + valueStep * i);
      }

      this.colorScale = d3.scale.linear()
        .domain(domain)
        .range(this.colors);

      this.itemProps = {
        "id": this.id
      };
      this.elementProps = [];
    };

    HeatMap.prototype.render = function(scope) {
      if (this.showItem == false) {
        this.clear(scope);
        return;
      }
      this.filter(scope);
      this.prepare(scope);
      if (this.vlength === 0) {
        this.clear(scope);
      } else {
        this.draw(scope);
      }
    };

    HeatMap.prototype.getRange = function() {
      var eles = this.elements;
      var range = {
        xl: Infinity,
        xr: -Infinity,
        yl: Infinity,
        yr: -Infinity
      };
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        range.xl = plotUtils.min(range.xl, ele.x);
        range.xr = plotUtils.max(range.xr, ele.x2);
        range.yl = Math.min(range.yl, ele.y);
        range.yr = Math.max(range.yr, ele.y2);
      }
      return range;
    };

    HeatMap.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        ele.x = xAxis.getPercent(ele.x);
        ele.y = yAxis.getPercent(ele.y);
        ele.x2 = xAxis.getPercent(ele.x2);
        ele.y2 = yAxis.getPercent(ele.y2);
      }
    };

    HeatMap.prototype.filter = function(scope) {
      var eles = this.elements;
      var l = plotUtils.upper_bound(eles, "x2", scope.focus.xl) + 1,
        r = plotUtils.upper_bound(eles, "x", scope.focus.xr);

      l = Math.max(l, 0);
      r = Math.min(r, eles.length - 1);

      if (l > r || l == r && eles[l].x2 < focus.xl) {
        // nothing visible, or all elements are to the left of the svg, vlength = 0
        l = 0;
        r = -1;
      }
      this.vindexL = l;
      this.vindexR = r;
      this.vlength = r - l + 1;
    };

    HeatMap.prototype.prepare = function(scope) {
      var sw;
      var focus = scope.focus;
      var mapX = scope.data2scrXi;
      var mapY = scope.data2scrYi;
      var eleprops = this.elementProps;
      var eles = this.elements;

      eleprops.length = 0;
      for (var i = this.vindexL; i <= this.vindexR; i++) {
        var ele = eles[i];
        if (ele.y2 < focus.yl || ele.y > focus.yr) { continue; }

        var x = mapX(ele.x), x2 = mapX(ele.x2);
        if (x2 - x < 1) x2 = x + 1;
        var y = mapY(ele.y), y2 = mapY(ele.y2);
        sw = x2 - x;
        if (y < y2) { continue; } // prevent negative height


        if (plotUtils.rangeAssert([x, x2, y, y2])) {
          eleprops.length = 0;
          return;
        }

        var id = this.id + "_" + i;
        var prop = {
          "id": id,
          "idx": this.index,
          "ele": ele,
          "x": x,
          "y": y2,
          "w": sw,
          "h": y - y2,
          "fi": this.colorScale(ele.value)
        };
        eleprops.push(prop);
      }
    };

    HeatMap.prototype.draw = function(scope) {
      var svg = scope.maing;
      var props = this.itemProps,
        eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }
      svg.select("#" + this.id)
        .attr("class", this.plotClass);

      var itemsvg = svg.select("#" + this.id);
      var respClass = this.useToolTip === true ? this.respClass : null;
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).enter().append("rect")
        .attr("id", function(d) { return d.id; })
        .attr("class", respClass)
        .attr("shape-rendering", "crispEdges")
        .style("fill", function(d) {
          return d.fi;
        });
      itemsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.w; })
        .attr("height", function(d) { return d.h; });
    };

    HeatMap.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    HeatMap.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    HeatMap.prototype.createTip = function(ele, g, model) {
      if (ele.tooltip)
        return ele.tooltip;
      return "<div>" + ele.value.toFixed(5) * 1 + "</div>";
    };

    return HeatMap;
  };
  beakerRegister.bkoFactory('HeatMap', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotLodLine = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };
    PlotLodLine.prototype.respR = 5;
    PlotLodLine.prototype.plotClass = "plot-line";
    PlotLodLine.prototype.respClass = "plot-resp plot-respdot";
    PlotLodLine.prototype.actionClass = "item-clickable item-onkey";

    PlotLodLine.prototype.render = function(scope, samples, gid){
      if (gid == null) { gid = ""; }
      this.elementSamples = samples;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotLodLine.prototype.setZoomHash = function(hash) {
      this.zoomHash = hash;
    };

    PlotLodLine.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotLodLine.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var pstr = "", skipped = false;

      eleprops.length = 0;

      var samples = this.elementSamples;
      for (var i = 0; i < samples.length; i++) {
        var ele = samples[i];
        if (i === 0) {
          pstr += "M";
        } else if (i === 1) {
          pstr += "L";
        }
        var x = mapX(ele.x), y = mapY(ele.y);
        if (Math.abs(x) > 1E6 || Math.abs(y) > 1E6) {
          skipped = true;
          break;
        }

        var nxtp = x + "," + y + " ";

        if (focus.yl <= ele.y && ele.y <= focus.yr) {
          var hashid = this.id + "_" + this.zoomHash + "_" + ele.hash + gid;

          var prop = {
            "id" : hashid,
            "idx" : this.index,
            "ele" : ele,
            "g" : gid,
            "isresp" : true,
            "cx" : x,
            "cy" : y,
            "op" : scope.tips[hashid] == null ? 0 : 1
          };
          eleprops.push(prop);
        }

        if (i < samples.length - 1) {
          if (this.interpolation === "none") {
            var ele2 = samples[i + 1];
            var x2 = mapX(ele2.x);
            nxtp += x + "," + y + " " + x2 + "," + y + " ";
          } else if (this.interpolation === "curve") {
            // TODO curve implementation
          }
        }

        pstr += nxtp;
      }

      if (skipped === true) {
        console.error("data not shown due to too large coordinate");
      }
      if (pstr.length > 0) {
        this.itemProps.d = pstr;
      }
    };

    PlotLodLine.prototype.setHighlighted = function(scope, highlighted) {
      var svg = scope.maing;
      var itemsvg = svg.select("#" + this.id);
      itemsvg.selectAll("path")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", function(d) {
          return plotUtils.getHighlightedSize(d.st_w, highlighted);
        })
    };

    PlotLodLine.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        itemsvg.selectAll("#" + groupid)
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", groupid);
      }

      itemsvg.selectAll("path")
        .data([props]).enter().append("path")
        .attr("class", this.plotClass + " " + this.actionClass)
        .style("stroke", function(d) { return d.st; })
        .style("stroke-dasharray", function(d) { return d.st_da; })
        .style("stroke-width", function(d) { return d.st_w; })
        .style("stroke-opacity", function(d) { return d.st_op; });
      itemsvg.select("path")
        .attr("d", props.d);

      if (scope.stdmodel.useToolTip === true) {
        itemsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        itemsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id; }).enter().append("circle")
          .attr("id", function(d) { return d.id; })
          .attr("class", this.respClass + " " + this.actionClass)
          .style("stroke", this.tip_color)
          .attr("r", this.respR);
        itemsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id; })
          .attr("cx", function(d) { return d.cx; })
          .attr("cy", function(d) { return d.cy; })
          .style("opacity", function(d) { return d.op; });
      }
    };

    PlotLodLine.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    return PlotLodLine;
  };
  beakerRegister.bkoFactory('PlotLodLine', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotLodRiver = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };
    PlotLodRiver.prototype.respWidth = 5;
    PlotLodRiver.prototype.respMinHeight = 5;
    PlotLodRiver.prototype.plotClass = "";
    PlotLodRiver.prototype.respClass = "plot-resp plot-respstem";
    PlotLodRiver.prototype.plotClassAvgLine = "plot-lodavgline";
    PlotLodRiver.prototype.actionClass = "item-clickable item-onkey";

    PlotLodRiver.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op" : this.color_opacity,
        "st" : this.stroke,
        "st_w" : this.stroke_width,
        "st_op" : this.stroke_opacity,
        "pts" : null
      };
      this.elementProps = [];
    };

    PlotLodRiver.prototype.setZoomHash = function(hash) {
      this.zoomHash = hash;
    };

    PlotLodRiver.prototype.render = function(scope, elements, gid){
      if (gid == null) { gid = ""; }
      this.elements = elements;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotLodRiver.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var pstr = "", pd = "";

      eleprops.length = 0;

      this.avgOn = true;

      var eles = this.elements;
      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        var x = mapX(ele.x), y = mapY(ele.min), y2 = mapY(ele.max);

        if (ele.avg == null) {
          this.avgOn = false;
        }

        if (this.avgOn === true) {
          var ym = mapY(ele.avg);
        }

        if (plotUtils.rangeAssert([x, y, y2])) {  // no need to put ym here
          eleprops.length = 0;
          return;
        }

        pstr += x + "," + y + " ";
        if (i === 0) {
          pd += "M";
        } else if (i === 1) {
          pd += "L";
        }

        pd += x + "," + ym + " ";

        if (ele.min <= focus.yr && ele.max >= focus.yl) {
          var hashid = this.id + "_" + this.zoomHash + "_" + ele.hash + gid;
          var prop = {
            "id" : hashid,
            "idx" : this.index,
            "ele" : ele,
            "g" : gid,
            "isresp" : true,
            "x" : x - this.respWidth / 2,
            "y" : y2,
            "h" : Math.max(y - y2, this.respMinHeight),  // min height to be hoverable
            "op" : scope.tips[hashid] == null ? 0 : 1
          };
          eleprops.push(prop);
        }
      }

      for (var i = eles.length - 1; i >= 0; i--) {
        var ele = eles[i];
        var x = mapX(ele.x), y2 = mapY(ele.max);
        pstr += x + "," + y2 + " ";
      }
      if (pstr.length > 0) {
        this.itemProps.pts = pstr;
      }
      if (this.avgOn === true && pd.length > 0) {
        this.itemProps.d = pd;
      }
    };

    PlotLodRiver.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) {gid = "";}
      var svg = scope.maing;
      var props = this.itemProps;

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      var groupsvg = itemsvg.select("#" + groupid);

      groupsvg.select("polygon")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", plotUtils.getHighlightedSize(props.st_w || 1, highlighted));
    };

    PlotLodRiver.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        // aux box are ploted as bars with normal coloring
        // if special coloring is needed, it is set from the loader
        itemsvg.selectAll("#" + groupid)
          .data([props]).enter().append("g")
          .attr("id", groupid);
      }

      var groupsvg = itemsvg.select("#" + groupid);

      // draw the river
      groupsvg.selectAll("polygon")
        .data([props]).enter().append("polygon");
      groupsvg.select("polygon")
        .attr("points", props.pts)
        .attr("class", this.plotClass + " " + this.actionClass)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-width", props.st_w);

      if (this.avgOn === true) {
        // draw the middle line
        var clr = props.st == null ? "black" : props.st;
        groupsvg.selectAll("path")
          .data([props]).enter().append("path");
        groupsvg.select("path")
          .attr("d", props.d)
          .attr("class", this.plotClassAvgLine + " " + this.actionClass)
          .style("stroke", clr)
          .style("stroke-opacity", props.st_op);
      }


      if (scope.stdmodel.useToolTip === true) {
        groupsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; }).exit().remove();
        groupsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; }).enter().append("rect")
          .attr("id", function(d) { return d.id; })
          .attr("class", this.respClass + " " + this.actionClass)
          .attr("width", this.respWidth)
          .style("stroke", this.tip_color);

        groupsvg.selectAll("rect")
          .data(eleprops, function(d) { return d.id; })
          .attr("x", function(d) { return d.x; })
          .attr("y", function(d) { return d.y; })
          .attr("height", function(d) { return d.h; })
          .style("opacity", function(d) { return d.op; });
      }
    };

    PlotLodRiver.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    return PlotLodRiver;
  };
  beakerRegister.bkoFactory('PlotLodRiver', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotLodBox = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotLodBox.prototype.plotClass = "plot-lodbox";
    PlotLodBox.prototype.respClass = "plot-resp";
    PlotLodBox.prototype.plotClassAvgLine = "plot-lodavgline";
    PlotLodBox.prototype.actionClass = "item-clickable item-onkey";

    PlotLodBox.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.widthShrink = 0;
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op" : this.color_opacity,
        "st" : this.stroke,
        "st_op" : this.stroke_opacity,
        "st_da" : this.stroke_dasharray
      };
      this.elementProps = [];
    };

    PlotLodBox.prototype.setWidthShrink = function(shrink) {
      this.widthShrink = shrink;
    };

    PlotLodBox.prototype.render = function(scope, samples, gid){
      if (gid == null) { gid = ""; }
      this.elementSamples = samples;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotLodBox.prototype.setZoomHash = function(hash) {
      this.zoomHash = hash;
    };

    PlotLodBox.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var fixed = scope.renderFixed;

      eleprops.length = 0;

      this.avgOn = true;

      var samples = this.elementSamples;
      for (var i = 0; i < samples.length; i++) {
        var ele = samples[i];
        if (ele.max < focus.yl || ele.min > focus.yr) { continue; }
        var x = mapX(ele.xl), x2 = mapX(ele.xr),
            y = mapY(ele.max), y2 = mapY(ele.min);

        if (ele.avg == null) {
          this.avgOn = false;
        }

        if (plotUtils.rangeAssert([x, x2, y, y2])) {
          eleprops.length = 0;
          return false;
        }

        var hashid = this.id + "_" + this.zoomHash + "_" + ele.hash + gid;
        var w = Number((x2 - x - this.widthShrink * 2).toFixed(fixed));
        var hasOneEl = ele.count === 1;
        var prop = {
          "id" : hashid,
          "idx" : this.index,
          "ele" : ele,
          "g" : gid,
          "x" : x + this.widthShrink,
          "y" : hasOneEl ? y - w/2 : y,
          "w" : w,
          "h" : hasOneEl ? w : Number((y2 - y).toFixed(fixed)),
          "x2" : Number((x2 - this.widthShrink).toFixed(fixed))
        };
        if (this.avgOn === true) {
          var y3 = mapY(ele.avg);
          prop.ym = y3;
        }
        eleprops.push(prop);
      }
    };

    PlotLodBox.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) {gid = "";}
      var svg = scope.maing;
      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);
      var groupsvg = itemsvg.select("#" + groupid);
      var diff = plotUtils.getHighlightedDiff(highlighted) / 2;
      groupsvg.selectAll("rect")
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .attr("x", function(d) { return d.x - diff; })
        .attr("y", function(d) { return d.y - diff; })
        .attr("width", function(d) { return plotUtils.getHighlightedSize(d.w, highlighted); })
        .attr("height", function(d) { return plotUtils.getHighlightedSize(d.h, highlighted); });
    };

    PlotLodBox.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        itemsvg.selectAll("#" + groupid)
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", groupid);
      }
      itemsvg.selectAll("#" + groupid)
        .attr("class", this.plotClass)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op);

      var groupsvg = itemsvg.select("#" + groupid);

      // draw boxes
      groupsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      groupsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; }).enter().append("rect")
        .attr("id", function(d) { return d.id; })
        .attr("class", this.respClass + " " + this.actionClass);
      groupsvg.selectAll("rect")
        .data(eleprops, function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("width", function(d) { return d.w; })
        .attr("height", function(d) { return d.h; });

      if (this.avgOn === true) {
        var clr = props.st == null ? "black" : props.st;
        var avgeles = _.filter(eleprops, function(eleprop){
          return eleprop.ele.count > 1;
        });
        // draw avg lines
        groupsvg.selectAll("line")
          .data(eleprops, function(d) { return d.id + "l"; }).exit().remove();
        groupsvg.selectAll("line")
          .data(avgeles, function(d) { return d.id + "l"; }).enter().append("line")
          .attr("id", function(d) { return d.id + "l"; })
          .attr("class", this.plotClassAvgLine)
          .style("stroke", clr)
          .style("stroke-opacity", props.st_op);
        groupsvg.selectAll("line")
          .data(avgeles, function(d) { return d.id + "l"; })
          .attr("x1", function(d) { return d.x; })
          .attr("x2", function(d) { return d.x2; })
          .attr("y1", function(d) { return d.ym; })
          .attr("y2", function(d) { return d.ym; });
      }
    };

    PlotLodBox.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    return PlotLodBox;
  };
  beakerRegister.bkoFactory('PlotLodBox', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotLodPoint = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotLodPoint.prototype.plotClass = "plot-point";
    PlotLodPoint.prototype.respClass = "plot-resp";
    PlotLodPoint.prototype.shapes = ["rect", "diamond", "circle"];
    PlotLodPoint.prototype.svgtags = ["rect", "polygon", "circle"];
    PlotLodPoint.prototype.actionClass = "item-clickable item-onkey";

    PlotLodPoint.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.itemProps = {
        "id" : this.id,
        "fi" : this.color,
        "fi_op": this.color_opacity,
        "st": this.stroke,
        "st_op" : this.stroke_opacity,
        "st_w": this.stroke_width,
        "st_da": this.stroke_dasharray
      };

      this.elementProps = [];
    };

    PlotLodPoint.prototype.render = function(scope, samples, samplesSize, gid){
      if (gid == null) { gid = ""; }
      this.elementSamples = samples;
      this.sizeSamples = samplesSize;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotLodPoint.prototype.setZoomHash = function(hash) {
      this.zoomHash = hash;
    };

    PlotLodPoint.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elementSamples,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var fixed = scope.renderFixed;

      eleprops.length = 0;

      for (var i = 0; i < eles.length; i++) {
        var ele = eles[i];
        if (ele.y < focus.yl || ele.y > focus.yr) { continue; }
        var x = mapX(ele.x), y = mapY(ele.avg);
        var s = this.sizeSamples[i].avg;

        if (plotUtils.rangeAssert([x, y])) {
          eleprops.length = 0;
          return;
        }

        var hashid = this.id + "_" + this.zoomHash + "_" + ele.hash + gid;
        var prop = {
          "id" :  hashid,
          "idx" : this.index,
          "ele" : ele,
          "g" : gid,
          "fi" : ele.color,
          "fi_op" : ele.color_opacity,
          "st" : ele.stroke,
          "st_op" : ele.stroke_opacity,
          "st_w" : ele.stroke_width,
          "st_da" : ele.stroke_dasharray
        };
        // lod point does not accept shape for individual element
        switch (this.shape) {
          case "diamond":
            var pstr = "";
            pstr += (x - s) + "," + (y    ) + " ";
            pstr += (x    ) + "," + (y - s) + " ";
            pstr += (x + s) + "," + (y    ) + " ";
            pstr += (x    ) + "," + (y + s) + " ";
            _.extend(prop, {
              "pts" : pstr
            });
            break;
          case "circle":
            _.extend(prop, {
              "cx" : x,
              "cy" : y,
              "r" : s
            });
            break;
          default:    // rect
            _.extend(prop, {
              "x" : x - s / 2,
              "y" : y - s / 2,
              "w" : s,
              "h" : s
            });
        }
        eleprops.push(prop);
      }
    };

    PlotLodPoint.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) {gid = "";}
      var svg = scope.maing;
      var shape = this.shape;
      var tag = this.svgtags[this.shapes.indexOf(shape)];

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      var groupsvg = itemsvg.select("#" + groupid);

      switch (shape) {
        case "circle":
          groupsvg.selectAll(tag)
            .transition()
            .duration(plotUtils.getHighlightDuration())
            .attr("r", function(d) { return plotUtils.getHighlightedSize(d.r, highlighted); });
          break;
        case "diamond":
          groupsvg.selectAll(tag)
            .transition()
            .duration(plotUtils.getHighlightDuration())
            .attr("points", function(d) {
              var mapX = scope.data2scrXi, mapY = scope.data2scrYi;
              var ele = d.ele, x = mapX(ele.x), y = mapY(ele.y),
                s = plotUtils.getHighlightedSize(ele.size, highlighted);
              var pstr = "";
              pstr += (x - s) + "," + (y    ) + " ";
              pstr += (x    ) + "," + (y - s) + " ";
              pstr += (x + s) + "," + (y    ) + " ";
              pstr += (x    ) + "," + (y + s) + " ";
              return pstr;
            });
          break;
        default:  // rect
          var diff = plotUtils.getHighlightedDiff(highlighted) / 2;
          groupsvg.selectAll(tag)
            .transition()
            .duration(plotUtils.getHighlightDuration())
            .attr("x", function(d) { return d.x - diff; })
            .attr("y", function(d) { return d.y - diff; })
            .attr("width", function(d) { return plotUtils.getHighlightedSize(d.w, highlighted); })
            .attr("height", function(d) { return plotUtils.getHighlightedSize(d.h, highlighted); });
      }
    };

    PlotLodPoint.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;
      var shape = this.shape;
      var tag = this.svgtags[this.shapes.indexOf(shape)];

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        itemsvg.selectAll("#" + groupid)
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", groupid);
      }
      itemsvg.select("#" + groupid)
        .attr("class", this.plotClass)
        .style("fill", props.fi)
        .style("fill-opacity", props.fi_op)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-dasharray", props.st_da)
        .style("stroke-width", props.st_w);

      var groupsvg = itemsvg.select("#" + groupid);

      if (groupsvg.empty()) {
        groupsvg = itemsvg.selectAll("#" + shape)
          .data([{}]).enter().append("g")
          .attr("id", shape);
      }

      groupsvg.selectAll(tag)
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      groupsvg.selectAll(tag)
        .data(eleprops, function(d) { return d.id; }).enter().append(tag)
        .attr("id", function(d) { return d.id; })
        .attr("class", this.respClass + " " + this.actionClass);

      switch (shape) {
        case "circle":
          groupsvg.selectAll(tag)
            .data(eleprops, function(d) { return d.id; })
            .attr("cx", function(d) { return d.cx; })
            .attr("cy", function(d) { return d.cy; })
            .attr("r", function(d) { return d.r; });
          break;
        case "diamond":
          groupsvg.selectAll(tag)
            .data(eleprops, function(d) { return d.id; })
            .attr("points", function(d) { return d.pts; });
          break;
        default:  // rect
          groupsvg.selectAll(tag)
            .data(eleprops, function(d) { return d.id; })
            .attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; })
            .attr("width", function(d) { return d.w; })
            .attr("height", function(d) { return d.h; });
      }
    };

    PlotLodPoint.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    return PlotLodPoint;
  };
  beakerRegister.bkoFactory('PlotLodPoint', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, plotTip) {
    var PlotLodStem = function(data){
      _.extend(this, data); // copy properties to itself
      this.format();
    };

    PlotLodStem.prototype.plotClass = "";
    PlotLodStem.prototype.respClass = "plot-resp";
    PlotLodStem.prototype.plotClassAvgCircle = "plot-lodavg";
    PlotLodStem.prototype.plotAvgCircleR = 2;
    PlotLodStem.prototype.actionClass = "item-clickable item-onkey";

    PlotLodStem.prototype.format = function() {
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }
      this.widthShrink = 0;
      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_w" : this.width,
        "st_op" : this.color_opacity,
        "st_da" : this.stroke_dasharray
      };
      this.elementProps = [];
    };

    PlotLodStem.prototype.setWidthShrink = function(shrink) {
      this.widthShrink = shrink;
    };

    PlotLodStem.prototype.render = function(scope, samples, gid){
      if (gid == null) { gid = ""; }
      this.elementSamples = samples;
      this.prepare(scope, gid);
      this.draw(scope, gid);
    };

    PlotLodStem.prototype.setZoomHash = function(hash) {
      this.zoomHash = hash;
    };

    PlotLodStem.prototype.prepare = function(scope, gid) {
      var focus = scope.focus;
      var eles = this.elements,
          eleprops = this.elementProps;
      var mapX = scope.data2scrXi,
          mapY = scope.data2scrYi;
      var fixed = scope.renderFixed;

      eleprops.length = 0;

      this.avgOn = true;

      var samples = this.elementSamples;
      for (var i = 0; i < samples.length; i++) {
        var ele = samples[i];
        if (ele.max < focus.yl || ele.min > focus.yr) { continue; }
        var x = mapX(ele.x),
            y = mapY(ele.max), y2 = mapY(ele.min);

        if (ele.avg == null) {
          this.avgOn = false;
        }

        if (plotUtils.rangeAssert([x, y, y2])) {
          eleprops.length = 0;
          return false;
        }

        var hashid = this.id + "_" + this.zoomHash + "_" + ele.hash + gid;
        var prop = {
          "id" : hashid,
          "idx" : this.index,
          "ele" : ele,
          "g" : gid,
          "x" : x,
          "y" : y,
          "y2" : y2
        };
        if (this.avgOn === true) {
          var y3 = mapY(ele.avg);
          prop.ym = y3;
        }
        eleprops.push(prop);
      }
    };

    PlotLodStem.prototype.setHighlighted = function(scope, highlighted, gid) {
      if(gid == null) { gid = ""; }
      var svg = scope.maing;
      var props = this.itemProps;

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      itemsvg.select("#" + groupid)
        .transition()
        .duration(plotUtils.getHighlightDuration())
        .style("stroke-width", plotUtils.getHighlightedSize(props.st_w, highlighted));
    };

    PlotLodStem.prototype.draw = function(scope, gid) {
      var svg = scope.maing;
      var props = this.itemProps,
          eleprops = this.elementProps;

      if (svg.select("#" + this.id).empty()) {
        svg.selectAll("g")
          .data([props], function(d) { return d.id; }).enter().append("g")
          .attr("id", function(d) { return d.id; });
      }

      var groupid = this.id + "_" + gid;
      var itemsvg = svg.select("#" + this.id);

      if (itemsvg.select("#" + groupid).empty()) {
        itemsvg.selectAll("#" + groupid)
          .data([props], function(d){ return d.id; }).enter().append("g")
          .attr("id", groupid);
      }
      itemsvg.select("#" + groupid)
        .style("class", this.plotClass)
        .style("stroke", props.st)
        .style("stroke-opacity", props.st_op)
        .style("stroke-dasharray", props.st_da)
        .style("stroke-width", props.st_w);

      var groupsvg = itemsvg.select("#" + groupid);

      // draw stems
      groupsvg.selectAll("line")
        .data(eleprops, function(d) { return d.id; }).exit().remove();
      groupsvg.selectAll("line")
        .data(eleprops, function(d) { return d.id; }).enter().append("line")
        .attr("id", function(d) { return d.id; })
        .attr("class", this.respClass + " " + this.actionClass);
      groupsvg.selectAll("line")
        .data(eleprops, function(d) { return d.id; })
        .attr("x1", function(d) { return d.x; })
        .attr("x2", function(d) { return d.x; })
        .attr("y1", function(d) { return d.y; })
        .attr("y2", function(d) { return d.y2; });

      if (this.avgOn === true) {
        var clr = props.st == null ? "gray" : props.st;
        // draw avg lines
        groupsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id + "l"; }).exit().remove();
        groupsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id + "l"; }).enter().append("circle")
          .attr("id", function(d) { return d.id + "l"; })
          .attr("class", this.plotClassAvgCircle)
          .attr("r", this.plotAvgCircleR)
          .style("stroke", clr)
          .style("stroke-opacity", props.st_op);
        groupsvg.selectAll("circle")
          .data(eleprops, function(d) { return d.id + "l"; })
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.ym; });
      }
    };

    PlotLodStem.prototype.hideTips = function(scope, hidden) {
      plotTip.hideTips(scope, this.id, hidden);
    };

    return PlotLodStem;
  };
  beakerRegister.bkoFactory('PlotLodStem', ['plotUtils', 'plotTip', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, PlotSampler, PlotLine, PlotLodLine, PlotLodBox, PlotLodRiver) {
    var PlotLineLodLoader = function(data, lodthresh){
      this.datacopy = {};
      _.extend(this.datacopy, data);  // save for later use
      _.extend(this, data); // copy properties to itself
      this.lodthresh = lodthresh;
      this.format(lodthresh);
    };
    // class constants
    PlotLineLodLoader.prototype.lodTypes = ["box", "river"];
    PlotLineLodLoader.prototype.lodSteps = [10, 3];

    PlotLineLodLoader.prototype.format = function() {
      // create plot type index
      this.lodTypeIndex =  (this.datacopy.lod_filter) ? this.lodTypes.indexOf(this.datacopy.lod_filter) : 1;
      this.lodType = this.lodTypes[this.lodTypeIndex];

      // create the plotters
      this.zoomHash = plotUtils.randomString(3);
      this.plotter = new PlotLine(this.datacopy);
      this.createLodPlotter();

      // a few switches and constants
      this.isLodItem = true;
      this.lodOn = false;
      this.lodAuto = true;
      this.sampleStep = -1;
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotLineLodLoader.prototype.zoomLevelChanged = function(scope) {
      this.sampleStep = -1;
      this.zoomHash = plotUtils.randomString(3);
      if (this.lodOn === false) { return; }
      this.lodplotter.setZoomHash(this.zoomHash);
      this.lodplotter.hideTips(scope);
    };

    PlotLineLodLoader.prototype.applyZoomHash = function(hash) {
      this.zoomHash = hash;
      this.lodplotter.setZoomHash(hash);
    };

    PlotLineLodLoader.prototype.switchLodType = function(scope) {
      this.clear(scope);  // must clear first before changing lodType
      this.lodTypeIndex = (this.lodTypeIndex + 1) % this.lodTypes.length;
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotLineLodLoader.prototype.applyLodType = function(type) {
      this.lodTypeIndex = this.lodTypes.indexOf(type);  // maybe -1
      if (this.lodTypeIndex === -1) {
        this.lodTypeIndex = 0;
      }
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotLineLodLoader.prototype.createLodPlotter = function() {
      var data = {};
      _.extend(data, this.datacopy);
      if (this.lodType === "line") {
        this.lodplotter = new PlotLodLine(data);
        this.lodplotter.setZoomHash(this.zoomHash);
      } else if (this.lodType === "box") {
        data.stroke = data.color;
        data.color_opacity *= .25;
        data.stroke_opacity = 1.0;
        this.lodplotter = new PlotLodBox(data);
        this.lodplotter.setWidthShrink(1);
        this.lodplotter.setZoomHash(this.zoomHash);
      } else if (this.lodType === "river") {
        data.stroke = data.color;  // assume the user has no way to set outline for line
        data.color_opacity *= .25;
        data.stroke_opacity = 1.0;
        this.lodplotter = new PlotLodRiver(data);
        this.lodplotter.setZoomHash(this.zoomHash);
      }
    };

    PlotLineLodLoader.prototype.toggleLodAuto = function(scope) {
      this.lodAuto = !this.lodAuto;
      this.clear(scope);
    };

    PlotLineLodLoader.prototype.applyLodAuto = function(auto) {
      this.lodAuto = auto;
    };

    PlotLineLodLoader.prototype.toggleLod = function(scope) {
      if (this.lodType === "off") {
        this.lodType = this.lodTypes[this.lodTypeIndex];
      } else {
        this.lodType = "off";
      }
      this.clear(scope);
    };

    PlotLineLodLoader.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }

      this.filter(scope);

      var lod = false;
      if (this.lodType !== "off") {
        if ( (this.lodAuto === true && this.vlength > this.lodthresh) || this.lodAuto === false) {
          lod = true;
        }
      }

      if (this.lodOn != lod) {
        scope.legendDone = false;
        this.clear(scope);
      }
      this.lodOn = lod;

      if (this.lodOn === true) {
        this.sample(scope);
        this.lodplotter.render(scope, this.elementSamples);
      } else {
        this.plotter.render(scope);
      }
    };

    PlotLineLodLoader.prototype.setHighlighted = function(scope, highlighted) {
      if (this.lodOn === true) {
        this.lodplotter.setHighlighted(scope, highlighted);
      } else {
        this.plotter.setHighlighted(scope, highlighted);
      }
    };

    PlotLineLodLoader.prototype.getRange = function() {
      return this.plotter.getRange();
    };

    PlotLineLodLoader.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.plotter.applyAxis(xAxis, yAxis);
      // sampler is created AFTER coordinate axis remapping
      this.createSampler();
    };

    PlotLineLodLoader.prototype.createSampler = function() {
      var xs = [], ys = [], _ys = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        xs.push(ele.x);
        ys.push(ele.y);
        _ys.push(ele._y);
      }
      this.sampler = new PlotSampler(xs, ys, _ys);
    };


    PlotLineLodLoader.prototype.filter = function(scope) {
      this.plotter.filter(scope);
      this.vindexL = this.plotter.vindexL;
      this.vindexR = this.plotter.vindexR;
      this.vlength = this.plotter.vlength;
    };

    PlotLineLodLoader.prototype.sample = function(scope) {

      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var xl = scope.focus.xl, xr = scope.focus.xr;

      if (this.sampleStep === -1) {
        var pixelWidth = scope.plotSize.width;
        var count = Math.ceil(pixelWidth / this.lodSteps[this.lodTypeIndex]);
        var s = (xr - xl) / count;
        this.sampleStep = s;
      }

      var step = this.sampleStep;
      xl = Math.floor(xl / step) * step;
      xr = Math.ceil(xr / step) * step;

      this.elementSamples = this.sampler.sample(xl, xr, this.sampleStep);
    };

    PlotLineLodLoader.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotLineLodLoader.prototype.hideTips = function(scope, hidden) {
      if (this.lodOn === false) {
        this.plotter.hideTips(scope, hidden);
        return;
      }
      this.lodplotter.hideTips(scope, hidden);
    };

    PlotLineLodLoader.prototype.createTip = function(ele) {
      if (this.lodOn === false) {
        return this.plotter.createTip(ele);
      }
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      if (this.legend != null) {
        tip.title = this.legend + " (sample)";
      }
      var eles = this.elements;
      tip.xl = plotUtils.getTipStringPercent(ele.xl, xAxis, 6);
      tip.xr = plotUtils.getTipStringPercent(ele.xr, xAxis, 6);
      tip.max = plotUtils.getTipString(ele._max, yAxis, true);
      tip.min = plotUtils.getTipString(ele._min, yAxis, true);
      tip.avg = plotUtils.getTipStringPercent(ele.avg, yAxis, 6);
      tip.count = plotUtils.getTipString(ele.count, yAxis, true);
      return plotUtils.createTipString(tip);
    };

    return PlotLineLodLoader;
  };
  beakerRegister.bkoFactory('PlotLineLodLoader',
    ['plotUtils', 'PlotSampler', 'PlotLine', 'PlotLodLine', 'PlotLodBox', 'PlotLodRiver',
    retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, PlotSampler, PlotArea, PlotLodLine, PlotLodRiver,
    PlotAuxRiver) {
    var PlotAreaLodLoader = function(data, lodthresh){
      this.datacopy = {};
      _.extend(this.datacopy, data);  // save for later use
      _.extend(this, data); // copy properties to itself
      this.lodthresh = lodthresh;
      this.format(lodthresh);
    };
    // class constants
    PlotAreaLodLoader.prototype.lodTypes = ["river"];
    PlotAreaLodLoader.prototype.lodSteps = [3];

    PlotAreaLodLoader.prototype.format = function() {
      // create plot type index
      this.lodTypeIndex =  (this.datacopy.lod_filter) ? this.lodTypes.indexOf(this.datacopy.lod_filter) : 0;
      this.lodType = this.lodTypes[this.lodTypeIndex]; // line, box

      // create the plotters
      this.zoomHash = plotUtils.randomString(3);
      this.plotter = new PlotArea(this.datacopy);
      this.createLodPlotter();

      // a few switches and constants
      this.isLodItem = true;
      this.lodOn = false;
      this.lodAuto = true;
      this.sampleStep = -1;
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotAreaLodLoader.prototype.zoomLevelChanged = function(scope) {
      this.sampleStep = -1;
      this.zoomHash = plotUtils.randomString(3);
      if (this.lodOn === false) { return; }
      if (this.lodType === "area") {
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter.hideTips(scope);
      } else if (this.lodType === "river"){
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash);
        this.lodplotter.hideTips(scope);
        this.lodplotter2.hideTips(scope);
      }
    };

    PlotAreaLodLoader.prototype.applyZoomHash = function(hash) {
      this.zoomHash = hash;
      if (this.lodType === "area") {
        this.lodplotter.setZoomHash(hash);
      } else if (this.lodType === "river") {
        this.lodplotter.setZoomHash(hash);
        this.lodplotter2.setZoomHash(hash);
      }
    };

    PlotAreaLodLoader.prototype.switchLodType = function(scope) {
      this.clear(scope);
      this.lodTypeIndex = (this.lodTypeIndex + 1) % this.lodTypes.length;
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotAreaLodLoader.prototype.applyLodType = function(type) {
      this.lodTypeIndex = this.lodTypes.indexOf(type);  // maybe -1
      if (this.lodTypeIndex === -1) {
        this.lodTypeIndex = 0;
      }
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotAreaLodLoader.prototype.createLodPlotter = function() {
      var data = {};
      _.extend(data, this.datacopy);
      if (this.lodType === "area") {
        this.lodplotter = new PlotLodRiver(data);
        this.lodplotter.setZoomHash(this.zoomHash);
      } else if (this.lodType === "river") {
        data.stroke = data.color;  // assume the user has no way to set outline for area
        data.color_opacity *= .25;
        data.stroke_opacity = 1.0;
        this.lodplotter = new PlotLodRiver(data);
        this.lodplotter2 = new PlotLodRiver(data);
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash);

        _.extend(data, this.datacopy);
        this.auxplotter = new PlotAuxRiver(data);
      }
    };

    PlotAreaLodLoader.prototype.toggleLodAuto = function(scope) {
      this.lodAuto = !this.lodAuto;
      this.clear(scope);
    };

    PlotAreaLodLoader.prototype.applyLodAuto = function(auto) {
      this.lodAuto = auto;
    };

    PlotAreaLodLoader.prototype.toggleLod = function(scope) {
      if (this.lodType === "off") {
        this.lodType = this.lodTypes[this.lodTypeIndex];
      } else {
        this.lodType = "off";
      }
      this.clear(scope);
    };

    PlotAreaLodLoader.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }

      this.filter(scope);

      var lod = false;
      if (this.lodType !== "off") {
        if ( (this.lodAuto === true && this.vlength > this.lodthresh) || this.lodAuto === false) {
          lod = true;
        }
      }

      if (this.lodOn != lod) {
        scope.legendDone = false;
        this.clear(scope);
      }
      this.lodOn = lod;

      if (this.lodOn === false) {
        this.plotter.render(scope);
        return;
      }

      this.sample(scope);
      if (this.lodType === "area") {
        this.lodplotter.render(scope, this.elementSamples);
      } else if (this.lodType === "river") {
        this.auxplotter.render(scope, this.elementAuxes, "a");
        this.lodplotter.render(scope, this.elementSamples, "yBtm");
        this.lodplotter2.render(scope, this.elementSamples2, "yTop");
      }
    };

    PlotAreaLodLoader.prototype.setHighlighted = function(scope, highlighted) {
      if (this.lodOn === true) {
        if (this.lodType === "area") {
          this.lodplotter.setHighlighted(scope, highlighted);
        } else if (this.lodType === "river") {
          this.auxplotter.setHighlighted(scope, highlighted, "a");
          this.lodplotter.setHighlighted(scope, highlighted, "yBtm");
          this.lodplotter2.setHighlighted(scope, highlighted, "yTop");
        }
      } else {
        this.plotter.setHighlighted(scope, highlighted);
      }
    };

    PlotAreaLodLoader.prototype.getRange = function(){
      return this.plotter.getRange();
    };

    PlotAreaLodLoader.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.plotter.applyAxis(xAxis, yAxis);
      // sampler is created AFTER coordinate axis remapping
      this.createSampler();
    };

    PlotAreaLodLoader.prototype.createSampler = function() {
      var xs = [], ys = [], y2s = [], _ys = [], _y2s = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        xs.push(ele.x);
        ys.push(ele.y);
        y2s.push(ele.y2);
        _ys.push(ele._y);
        _y2s.push(ele._y2);
      }
      this.sampler = new PlotSampler(xs, ys, _ys);
      this.sampler2 = new PlotSampler(xs, y2s, _y2s);
    };

    PlotAreaLodLoader.prototype.filter = function(scope) {
      this.plotter.filter(scope);
      this.vindexL = this.plotter.vindexL;
      this.vindexR = this.plotter.vindexR;
      this.vlength = this.plotter.vlength;
    };

    PlotAreaLodLoader.prototype.sample = function(scope) {
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var xl = scope.focus.xl, xr = scope.focus.xr;

      if (this.sampleStep === -1) {
        var pixelWidth = scope.plotSize.width;
        var count = Math.ceil(pixelWidth / this.lodSteps[this.lodTypeIndex]);
        var s = (xr - xl) / count;
        this.sampleStep = s;
      }

      var step = this.sampleStep;
      xl = Math.floor(xl / step) * step;
      xr = Math.ceil(xr / step) * step;

      this.elementSamples = this.sampler.sample(xl, xr, this.sampleStep);
      this.elementSamples2 = this.sampler2.sample(xl, xr, this.sampleStep);
      var count = this.elementSamples.length;

      if (this.lodType === "area") {
        var elements = [];
        for (var i = 0; i < count; i++) {
          elements.push({
            x : this.elementSamples[i].x,
            min : this.elementSamples[i].avg,
            max : this.elementSamples2[i].avg,
            hash : this.elementSamples[i].hash,
            xl : this.elementSamples[i].xl,
            xr : this.elementSamples[i].xr
          });
        }
        this.elementSamples = elements;
      } else if (this.lodType === "river") {
        this.elementAuxes = [];
        // prepare the aux river in between
        for (var i = 0; i < count; i++) {
          this.elementAuxes.push({
            x : this.elementSamples[i].x,
            y : this.elementSamples[i].max,
            y2 : this.elementSamples2[i].min
          });
        }
      }

    };

    PlotAreaLodLoader.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotAreaLodLoader.prototype.hideTips = function(scope, hidden) {
      if (this.lodOn === false) {
        this.plotter.hideTips(scope);
        return;
      }
      if (this.lodType === "area") {
        this.lodplotter.hideTips(scope, hidden);
      } else if (this.lodType === "river") {
        this.lodplotter.hideTips(scope, hidden);
        this.lodplotter2.hideTips(scope, hidden);
      }
    };

    PlotAreaLodLoader.prototype.createTip = function(ele, g) {
      if (this.lodOn === false) {
        return this.plotter.createTip(ele);
      }
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      var sub = "sample" + (g !== "" ? (" " + g) : "");
      if (this.legend != null) {
        tip.title = this.legend + " (" + sub + ")";
      }
      var eles = this.elements;
      tip.xl = plotUtils.getTipStringPercent(ele.xl, xAxis, 6);
      tip.xr = plotUtils.getTipStringPercent(ele.xr, xAxis, 6);
      if (this.lodType === "area") {
        tip.avg_yTop = plotUtils.getTipStringPercent(ele.max, yAxis, 6);
        tip.avg_yBtm = plotUtils.getTipStringPercent(ele.min, yAxis, 6);
      } else if (this.lodType === "river") {
        tip.max = plotUtils.getTipString(ele._max, yAxis, true);
        tip.min = plotUtils.getTipString(ele._min, yAxis, true);
        tip.avg = plotUtils.getTipStringPercent(ele.avg, yAxis, 6);
        tip.count = plotUtils.getTipString(ele.count, yAxis, true);
      }
      return plotUtils.createTipString(tip);
    };

    return PlotAreaLodLoader;
  };
  beakerRegister.bkoFactory('PlotAreaLodLoader',
    ['plotUtils', 'PlotSampler', 'PlotArea', 'PlotLodLine', 'PlotLodRiver', 'PlotAuxRiver',
    retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, PlotSampler, PlotBar, PlotLodBox, PlotAuxBox) {
    var PlotBarLodLoader = function(data, lodthresh){
      this.datacopy = {};
      _.extend(this.datacopy, data);  // save for later use
      _.extend(this, data); // copy properties to itself
      this.lodthresh = lodthresh;
      this.format(lodthresh);
    };
    // class constants
    PlotBarLodLoader.prototype.lodTypes = ["box"];
    PlotBarLodLoader.prototype.lodSteps = [10];

    PlotBarLodLoader.prototype.format = function() {
      // create plot type index
      this.lodTypeIndex =  (this.datacopy.lod_filter) ? this.lodTypes.indexOf(this.datacopy.lod_filter) : 0;
      this.lodType = this.lodTypes[this.lodTypeIndex]; // line, box

      // create the plotters
      this.zoomHash = plotUtils.randomString(3);
      this.plotter = new PlotBar(this.datacopy);
      this.createLodPlotter();

      // a few switches and constants
      this.isLodItem = true;
      this.lodOn = false;
      this.lodAuto = true;
      this.sampleStep = -1;
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotBarLodLoader.prototype.zoomLevelChanged = function(scope) {
      this.sampleStep = -1;
      this.zoomHash = plotUtils.randomString(3);
      if (this.lodOn === false) { return; }
      if (this.lodType === "bar") {
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter.hideTips(scope);
      } else if (this.lodType === "box") {
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash);
        this.lodplotter.hideTips(scope);
        this.lodplotter2.hideTips(scope);
      }
    };

    PlotBarLodLoader.prototype.applyZoomHash = function(hash) {
      this.zoomHash = hash;
      if (this.lodType === "bar") {
        this.lodplotter.setZoomHash(hash);
      } else if (this.lodType === "box") {
        this.lodplotter.setZoomHash(hash);
        this.lodplotter2.setZoomHash(hash);
      }
    };

    PlotBarLodLoader.prototype.switchLodType = function(scope) {
      this.clear(scope);  // must clear first before changing lodType
      this.lodTypeIndex = (this.lodTypeIndex + 1) % this.lodTypes.length;
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotBarLodLoader.prototype.applyLodType = function(type) {
      this.lodTypeIndex = this.lodTypes.indexOf(type);  // maybe -1
      if (this.lodTypeIndex === -1) {
        this.lodTypeIndex = 0;
      }
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotBarLodLoader.prototype.createLodPlotter = function() {
      var data = {};
      _.extend(data, this.datacopy);
      if (this.lodType === "bar") {
        this.lodplotter = new PlotLodBox(data);
        this.lodplotter.setWidthShrink(1);
        this.lodplotter.setZoomHash(this.zoomHash);
      } else if (this.lodType === "box") {
        // lod boxes are plotted with special coloring (inversed color)
        // user can set outline for bar
        data.stroke_opacity = 1.0;
        data.color_opacity *= .25;  // set box to be transparent
        this.lodplotter = new PlotLodBox(data);
        this.lodplotter2 = new PlotLodBox(data);
        this.lodplotter.setWidthShrink(1);
        this.lodplotter2.setWidthShrink(1);
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash);

        _.extend(data, this.datacopy); // normal color for aux box
        this.auxplotter = new PlotAuxBox(data);
        this.auxplotter.setWidthShrink(1);  // reduce box width by 1px (left and right)
      }
    };

    PlotBarLodLoader.prototype.toggleLodAuto = function(scope) {
      this.lodAuto = !this.lodAuto;
      this.clear(scope);
    };

    PlotBarLodLoader.prototype.applyLodAuto = function(auto) {
      this.lodAuto = auto;
    };

    PlotBarLodLoader.prototype.toggleLod = function(scope) {
      if (this.lodType === "off") {
        this.lodType = this.lodTypes[this.lodTypeIndex];
      } else {
        this.lodType = "off";
      }
      this.clear(scope);
    };

    PlotBarLodLoader.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }

      this.filter(scope);

      var lod = false;
      if (this.lodType !== "off") {
        if ( (this.lodAuto === true && this.vlength > this.lodthresh) || this.lodAuto === false) {
          lod = true;
        }
      }

      if (this.lodOn != lod) {
        scope.legendDone = false;
        this.clear(scope);
      }
      this.lodOn = lod;

      if (this.lodOn === true) {
        this.sample(scope);
        if (this.lodType === "bar") {
          this.lodplotter.render(scope, this.elementSamples);
        } else if (this.lodType === "box") {
          this.auxplotter.render(scope, this.elementAuxes, "a");
          this.lodplotter.render(scope, this.elementSamples, "yBtm");
          this.lodplotter2.render(scope, this.elementSamples2, "yTop");
        }
      } else {
        this.plotter.render(scope);
      }
    };

    PlotBarLodLoader.prototype.setHighlighted = function(scope, highlighted) {
      if (this.lodOn === true) {
        if (this.lodType === "bar") {
          this.lodplotter.setHighlighted(scope, highlighted);
        } else if (this.lodType === "box") {
          this.auxplotter.setHighlighted(scope, highlighted, "a");
          this.lodplotter.setHighlighted(scope, highlighted, "yBtm");
          this.lodplotter2.setHighlighted(scope, highlighted, "yTop");
        }
      } else {
        this.plotter.setHighlighted(scope, highlighted);
      }
    };

    PlotBarLodLoader.prototype.getRange = function(){
      return this.plotter.getRange();
    };

    PlotBarLodLoader.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.plotter.applyAxis(xAxis, yAxis);
      // sampler is created AFTER coordinate axis remapping
      this.createSampler();
    };

    PlotBarLodLoader.prototype.createSampler = function() {
      var xs = [], ys = [], y2s = [], _ys = [], _y2s = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        xs.push( (ele.x + ele.x2) / 2 );
        ys.push(ele.y);
        y2s.push(ele.y2);
        _ys.push(ele._y);
        _y2s.push(ele._y2);
      }
      this.sampler = new PlotSampler(xs, ys, _ys);
      this.sampler2 = new PlotSampler(xs, y2s, _y2s);
    };

    PlotBarLodLoader.prototype.filter = function(scope) {
      this.plotter.filter(scope);
      this.vindexL = this.plotter.vindexL;
      this.vindexR = this.plotter.vindexR;
      this.vlength = this.plotter.vlength;
    };

    PlotBarLodLoader.prototype.sample = function(scope) {
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var xl = scope.focus.xl, xr = scope.focus.xr;

      if (this.sampleStep === -1) {
        var pixelWidth = scope.plotSize.width;
        var count = Math.ceil(pixelWidth / this.lodSteps[this.lodTypeIndex]);
        var s = (xr - xl) / count;
        this.sampleStep = s;
      }

      var step = this.sampleStep;
      xl = Math.floor(xl / step) * step;
      xr = Math.ceil(xr / step) * step;

      this.elementSamples = this.sampler.sample(xl, xr, this.sampleStep);
      this.elementSamples2 = this.sampler2.sample(xl, xr, this.sampleStep);
      var count = this.elementSamples.length;

      if (this.lodType === "bar") {
        var elements = [];
        for (var i = 0; i < count; i++) {
          elements.push({
            x : this.elementSamples[i].xl,
            x2 : this.elementSamples[i].xr,
            min : this.elementSamples[i].avg,
            max : this.elementSamples2[i].avg,
            hash: this.elementSamples[i].hash,
            xl : this.elementSamples[i].xl,
            xr : this.elementSamples[i].xr
          });
        }
        this.elementSamples = elements;
      } else if (this.lodType === "box") {
        this.elementAuxes = [];
        // prepare the aux box in between
        for (var i = 0; i < count; i++) {
          this.elementAuxes.push({
            x : this.elementSamples[i].xl,
            x2 : this.elementSamples[i].xr,
            y : this.elementSamples[i].max,
            y2 : this.elementSamples2[i].min
          });
        }
      }
    };

    PlotBarLodLoader.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotBarLodLoader.prototype.hideTips = function(scope, hidden) {
      if (this.lodOn === false) {
        this.plotter.hideTips(scope, hidden);
        return;
      }
      if (this.lodType === "bar") {
        this.lodplotter.hideTips(scope, hidden);
      } else if (this.lodType === "box") {
        this.lodplotter.hideTips(scope, hidden);
        this.lodplotter2.hideTips(scope, hidden);
      }
    };

    PlotBarLodLoader.prototype.createTip = function(ele, g, model) {
      if (this.lodOn === false) {
        return this.plotter.createTip(ele, g, model);
      }
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      var sub = "sample" + (g !== "" ? (" " + g) : "");
      if (this.legend != null) {
        tip.title = this.legend + " (" + sub + ")";
      }
      tip.xl = plotUtils.getTipStringPercent(ele.xl, xAxis, 6);
      tip.xr = plotUtils.getTipStringPercent(ele.xr, xAxis, 6);
      if (this.lodType === "bar") {
        tip.avg_yTop = plotUtils.getTipStringPercent(ele.max, yAxis, 6);
        tip.avg_yBtm = plotUtils.getTipStringPercent(ele.min, yAxis, 6);
      } else if (this.lodType === "box") {
        if (ele.count > 1) {
          tip.max = plotUtils.getTipString(ele._max, yAxis, true);
          tip.min = plotUtils.getTipString(ele._min, yAxis, true);
          tip.avg = plotUtils.getTipStringPercent(ele.avg, yAxis, 6);
          tip.count = plotUtils.getTipString(ele.count, yAxis, true);
        } else {
          tip.y = plotUtils.getTipString(ele._max, yAxis, true);
        }
      }
      return plotUtils.createTipString(tip);
    };

    return PlotBarLodLoader;
  };
  beakerRegister.bkoFactory('PlotBarLodLoader',
    ['plotUtils', 'PlotSampler', 'PlotBar', 'PlotLodBox', 'PlotAuxBox', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, PlotSampler, PlotStem,
    PlotLodStem, PlotAuxStem, PlotLodBox, PlotAuxBox) {
    var PlotStemLodLoader = function(data, lodthresh){
      this.datacopy = {};
      _.extend(this.datacopy, data);  // save for later use
      _.extend(this, data); // copy properties to itself
      this.lodthresh = lodthresh;
      this.format(lodthresh);
    };
    // class constants
    PlotStemLodLoader.prototype.lodTypes = ["box"];
    PlotStemLodLoader.prototype.lodSteps = [10];

    PlotStemLodLoader.prototype.format = function() {
      // create plot type index
      this.lodTypeIndex =  (this.datacopy.lod_filter) ? this.lodTypes.indexOf(this.datacopy.lod_filter) : 0;
      this.lodType = this.lodTypes[this.lodTypeIndex]; // line, box

      // create the plotters
      this.zoomHash = plotUtils.randomString(3);
      this.plotter = new PlotStem(this.datacopy);
      this.createLodPlotter();

      // a few switches and constants
      this.isLodItem = true;
      this.lodOn = false;
      this.lodAuto = true;
      this.sampleStep = -1;
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotStemLodLoader.prototype.zoomLevelChanged = function(scope) {
      this.sampleStep = -1;
      this.zoomHash = plotUtils.randomString(3);
      if (this.lodOn === false) { return; }
      if (this.lodType === "stem") {
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter.hideTips(scope);
      } else if (this.lodType === "stem+" || this.lodType === "box") {
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash2);
        this.lodplotter.hideTips(scope);
        this.lodplotter2.hideTips(scope);
      }
    };

    PlotStemLodLoader.prototype.applyZoomHash = function(hash) {
      this.zoomHash = hash;
      if (this.lodType === "stem") {
        this.lodplotter.setZoomHash(hash);
      } else if (this.lodType === "stem+" ||  this.lodType === "box") {
        this.lodplotter.setZoomHash(hash);
        this.lodplotter2.setZoomHash(hash);
      }
    };

    PlotStemLodLoader.prototype.switchLodType = function(scope) {
      this.clear(scope);  // must clear first before changing lodType
      this.lodTypeIndex = (this.lodTypeIndex + 1) % this.lodTypes.length;
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotStemLodLoader.prototype.applyLodType = function(type) {
      this.lodTypeIndex = this.lodTypes.indexOf(type);  // maybe -1
      if (this.lodTypeIndex === -1) {
        this.lodTypeIndex = 0;
      }
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotStemLodLoader.prototype.createLodPlotter = function() {
      var data = {};
      _.extend(data, this.datacopy);
      if (this.lodType === "stem") {
        this.lodplotter = new PlotLodStem(data);
        this.lodplotter.setZoomHash(this.zoomHash);
      } else if (this.lodType === "stem+") {
        data.width += 1.5;
        data.color_opacity *= .5;
        this.lodplotter = new PlotLodStem(data);
        this.lodplotter2 = new PlotLodStem(data);
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash);

        _.extend(data, this.datacopy);
        this.auxplotter = new PlotAuxStem(data);
      } else if (this.lodType === "box") {
        // lod boxes are plotted with special coloring (inversed color)
        data.stroke = data.color; // assume the user has no way to set outline for stem
        data.color_opacity *= .25;
        data.stroke_opacity = 1.0;
        this.lodplotter = new PlotLodBox(data);
        this.lodplotter2 = new PlotLodBox(data);
        this.lodplotter.setWidthShrink(1);
        this.lodplotter2.setWidthShrink(1);
        this.lodplotter.setZoomHash(this.zoomHash);
        this.lodplotter2.setZoomHash(this.zoomHash);

        _.extend(data, this.datacopy); // normal color for aux box
        this.auxplotter = new PlotAuxBox(data);
        this.auxplotter.setWidthShrink(1);  // reduce box width by 1px (left and right)
      }
    };

    PlotStemLodLoader.prototype.toggleLodAuto = function(scope) {
      this.lodAuto = !this.lodAuto;
      this.clear(scope);
    };

    PlotStemLodLoader.prototype.applyLodAuto = function(auto) {
      this.lodAuto = auto;
    };

    PlotStemLodLoader.prototype.toggleLod = function(scope) {
      if (this.lodType === "off") {
        this.lodType = this.lodTypes[this.lodTypeIndex];
      } else {
        this.lodType = "off";
      }
      this.clear(scope);
    };

    PlotStemLodLoader.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }

      this.filter(scope);

      var lod = false;
      if (this.lodType !== "off") {
        if ( (this.lodAuto === true && this.vlength > this.lodthresh) || this.lodAuto === false) {
          lod = true;
        }
      }

      if (this.lodOn != lod) {
        scope.legendDone = false;
        this.clear(scope);
      }
      this.lodOn = lod;

      if (this.lodOn === true) {
        this.sample(scope);
        if (this.lodType === "stem") {
          this.lodplotter.render(scope, this.elementSamples);
        } else if (this.lodType === "stem+" || this.lodType === "box") {
          this.auxplotter.render(scope, this.elementAuxes, "a");
          this.lodplotter.render(scope, this.elementSamples, "yBtm");
          this.lodplotter2.render(scope, this.elementSamples2, "yTop");
        }
      } else {
        this.plotter.render(scope);
      }
    };

    PlotStemLodLoader.prototype.setHighlighted = function(scope, highlighted) {
      if (this.lodOn === true) {
        if (this.lodType === "stem") {
          this.lodplotter.setHighlighted(scope, highlighted);
        } else if (this.lodType === "stem+" || this.lodType === "box") {
          this.auxplotter.setHighlighted(scope, highlighted, "a");
          this.lodplotter.setHighlighted(scope, highlighted, "yBtm");
          this.lodplotter2.setHighlighted(scope, highlighted, "yTop");
        }
      } else {
        this.lodplotter.setHighlighted(scope, highlighted);
      }
    };

    PlotStemLodLoader.prototype.getRange = function(){
      return this.plotter.getRange();
    };

    PlotStemLodLoader.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.plotter.applyAxis(xAxis, yAxis);
      // sampler is created AFTER coordinate axis remapping
      this.createSampler();
    };

    PlotStemLodLoader.prototype.createSampler = function() {
      var xs = [], ys = [], y2s = [], _ys = [], _y2s = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        xs.push(ele.x);
        ys.push(ele.y);
        y2s.push(ele.y2);
        _ys.push(ele._y);
        _y2s.push(ele._y2);
      }
      this.sampler = new PlotSampler(xs, ys, _ys);
      this.sampler2 = new PlotSampler(xs, y2s, _y2s);
    };

    PlotStemLodLoader.prototype.filter = function(scope) {
      this.plotter.filter(scope);
      this.vindexL = this.plotter.vindexL;
      this.vindexR = this.plotter.vindexR;
      this.vlength = this.plotter.vlength;
    };

    PlotStemLodLoader.prototype.sample = function(scope) {
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var xl = scope.focus.xl, xr = scope.focus.xr;

      if (this.sampleStep === -1) {
        var pixelWidth = scope.plotSize.width;
        var count = Math.ceil(pixelWidth / this.lodSteps[this.lodTypeIndex]);
        var s = (xr - xl) / count;
        this.sampleStep = s;
      }

      var step = this.sampleStep;
      xl = Math.floor(xl / step) * step;
      xr = Math.ceil(xr / step) * step;

      this.elementSamples = this.sampler.sample(xl, xr, this.sampleStep);
      this.elementSamples2 = this.sampler2.sample(xl, xr, this.sampleStep);
      var count = this.elementSamples.length;

      if (this.lodType === "stem") {
        var elements = [];
        for (var i = 0; i < count; i++) {
          elements.push({
            x : this.elementSamples[i].x,
            min : this.elementSamples[i].avg,
            max : this.elementSamples2[i].avg,
            hash: this.elementSamples[i].hash,
            xl : this.elementSamples[i].xl,
            xr : this.elementSamples[i].xr
          });
        }
        this.elementSamples = elements;
      } else if (this.lodType === "stem+") {
        this.elementAuxes = [];
        // prepare the aux box in between
        for (var i = 0; i < count; i++) {
          this.elementAuxes.push({
            x : this.elementSamples[i].x,
            y : this.elementSamples[i].max,
            y2 : this.elementSamples2[i].min
          });
        }
      } else if (this.lodType === "box") {
        this.elementAuxes = [];
        // prepare the aux box in between
        for (var i = 0; i < count; i++) {
          this.elementAuxes.push({
            x : this.elementSamples[i].xl,
            x2 : this.elementSamples[i].xr,
            y : this.elementSamples[i].max,
            y2 : this.elementSamples2[i].min
          });
        }
      }
    };

    PlotStemLodLoader.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotStemLodLoader.prototype.hideTips = function(scope, hidden) {
      if (this.lodOn === false) {
        this.plotter.hideTips(scope, hidden);
        return;
      }
      if (this.lodType === "bar") {
        this.lodplotter.hideTips(scope, hidden);
      } else if (this.lodType === "box") {
        this.lodplotter.hideTips(scope, hidden);
        this.lodplotter2.hideTips(scope, hidden);
      }
    };

    PlotStemLodLoader.prototype.createTip = function(ele, g) {
      if (this.lodOn === false) {
        return this.plotter.createTip(ele);
      }
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      var sub = "sample" + (g !== "" ? (" " + g) : "");
      if (this.legend != null) {
        tip.title = this.legend + " (" + sub + ")";
      }
      tip.xl = plotUtils.getTipStringPercent(ele.xl, xAxis, 6);
      tip.xr = plotUtils.getTipStringPercent(ele.xr, xAxis, 6);
      tip.count = plotUtils.getTipString(ele.count, yAxis, true);
      if (this.lodType === "stem") {
        tip.avg_yTop = plotUtils.getTipStringPercent(ele.max, yAxis, 6);
        tip.avg_yBtm = plotUtils.getTipStringPercent(ele.min, yAxis, 6);
      } else if (this.lodType === "stem+" || this.lodType === "box") {
        tip.max = plotUtils.getTipString(ele._max, yAxis, true);
        tip.min = plotUtils.getTipString(ele._min, yAxis, true);
        tip.avg = plotUtils.getTipStringPercent(ele.avg, yAxis, 6);
      }
      return plotUtils.createTipString(tip);
    };

    return PlotStemLodLoader;
  };
  beakerRegister.bkoFactory('PlotStemLodLoader',
    ['plotUtils', 'PlotSampler', 'PlotStem',
    'PlotLodStem', 'PlotAuxStem', 'PlotLodBox', 'PlotAuxBox', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(plotUtils, PlotSampler, PlotPoint, PlotLodPoint, PlotLodBox) {
    var PlotPointLodLoader = function(data, lodthresh){
      this.datacopy = {};
      _.extend(this.datacopy, data);  // save for later use
      _.extend(this, data); // copy properties to itself
      this.lodthresh = lodthresh;
      this.format(lodthresh);
    };
    // class constants
    PlotPointLodLoader.prototype.lodTypes = ["box"];
    PlotPointLodLoader.prototype.lodSteps = [10];

    PlotPointLodLoader.prototype.format = function() {
      // create plot type index
      this.lodTypeIndex =  (this.datacopy.lod_filter) ? this.lodTypes.indexOf(this.datacopy.lod_filter) : 0;
      this.lodType = this.lodTypes[this.lodTypeIndex]; // line, box

      // create the plotters
      this.zoomHash = plotUtils.randomString(3);
      this.plotter = new PlotPoint(this.datacopy);
      this.createLodPlotter();

      // a few switches and constants
      this.isLodItem = true;
      this.lodOn = false;
      this.lodAuto = true;
      this.sampleStep = -1;
      if (this.color != null) {
        this.tip_color = plotUtils.createColor(this.color, this.color_opacity);
      } else {
        this.tip_color = "gray";
      }

      this.itemProps = {
        "id" : this.id,
        "st" : this.color,
        "st_op" : this.color_opacity,
        "st_w" : this.width,
        "st_da" : this.stroke_dasharray,
        "d" : ""
      };
      this.elementProps = [];
    };

    PlotPointLodLoader.prototype.zoomLevelChanged = function(scope) {
      this.sampleStep = -1;
      this.zoomHash = plotUtils.randomString(3);
      if (this.lodOn === false) { return; }
      this.lodplotter.setZoomHash(this.zoomHash);
      this.lodplotter.hideTips(scope);
    };

    PlotPointLodLoader.prototype.applyZoomHash = function(hash) {
      this.zoomHash = hash;
      this.lodplotter.setZoomHash(hash);
    };

    PlotPointLodLoader.prototype.createLodPlotter = function() {
      var data = {};
      _.extend(data, this.datacopy);
      if (this.lodType === "point") {
        this.lodplotter = new PlotLodPoint(data);
        this.lodplotter.setZoomHash(this.zoomHash);
      } else if (this.lodType === "box") {
        // user can set outline for point
        data.color_opacity *= .25;
        data.stroke_opacity = 1.0;
        this.lodplotter = new PlotLodBox(data);
        this.lodplotter.setWidthShrink(1);
        this.lodplotter.setZoomHash(this.zoomHash);
      }
    };

    PlotPointLodLoader.prototype.toggleLodAuto = function(scope) {
      this.lodAuto = !this.lodAuto;
      this.clear(scope);
    };

    PlotPointLodLoader.prototype.applyLodAuto = function(auto) {
      this.lodAuto = auto;
    };

    PlotPointLodLoader.prototype.toggleLod = function(scope) {
      if (this.lodType === "off") {
        this.lodType = this.lodTypes[this.lodTypeIndex];
      } else {
        this.lodType = "off";
      }
      this.clear(scope);
    };

    PlotPointLodLoader.prototype.render = function(scope){
      if (this.showItem === false) {
        this.clear(scope);
        return;
      }

      this.filter(scope);

      var lod = false;
      if (this.lodType !== "off") {
        if ( (this.lodAuto === true && this.vlength > this.lodthresh) || this.lodAuto === false) {
          lod = true;
        }
      }

      if (this.lodOn != lod) {
        scope.legendDone = false;
        this.clear(scope);
      }
      this.lodOn = lod;

      if (this.lodOn === true) {
        this.sample(scope);
        if (this.lodType === "point") {
          // lod point plotter needs size information
          this.lodplotter.render(scope, this.elementSamples, this.sizeSamples);
        } else if (this.lodType === "box") {
          this.lodplotter.render(scope, this.elementSamples);
        }
      } else {
        this.plotter.render(scope);
      }
    };

    PlotPointLodLoader.prototype.setHighlighted = function(scope, highlighted) {
      if (this.lodOn === true) {
        this.lodplotter.setHighlighted(scope, highlighted);
      } else {
        this.plotter.setHighlighted(scope, highlighted);
      }
    };

    PlotPointLodLoader.prototype.getRange = function(){
      return this.plotter.getRange();
    };

    PlotPointLodLoader.prototype.applyAxis = function(xAxis, yAxis) {
      this.xAxis = xAxis;
      this.yAxis = yAxis;
      this.plotter.applyAxis(xAxis, yAxis);
      // sampler is created AFTER coordinate axis remapping
      this.createSampler();
    };

    PlotPointLodLoader.prototype.switchLodType = function(scope) {
      this.clear(scope);  // must clear first before changing lodType
      this.lodTypeIndex = (this.lodTypeIndex + 1) % this.lodTypes.length;
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotPointLodLoader.prototype.applyLodType = function(type) {
      this.lodTypeIndex = this.lodTypes.indexOf(type);  // maybe -1
      if (this.lodTypeIndex === -1) {
        this.lodTypeIndex = 0;
      }
      this.lodType = this.lodTypes[this.lodTypeIndex];
      this.createLodPlotter();
    };

    PlotPointLodLoader.prototype.createSampler = function() {
      var xs = [], ys = [], ss = [], _ys = [];
      for (var i = 0; i < this.elements.length; i++) {
        var ele = this.elements[i];
        xs.push(ele.x);
        ys.push(ele.y);
        _ys.push(ele._y);
        ss.push(ele.size != null ? ele.size : this.size);
      }
      this.sampler = new PlotSampler(xs, ys, _ys);
      this.samplerSize = new PlotSampler(xs, ss, ss);
    };

    PlotPointLodLoader.prototype.filter = function(scope) {
      this.plotter.filter(scope);
      this.vindexL = this.plotter.vindexL;
      this.vindexR = this.plotter.vindexR;
      this.vlength = this.plotter.vlength;
    };

    PlotPointLodLoader.prototype.sample = function(scope) {
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var xl = scope.focus.xl, xr = scope.focus.xr;

      if (this.sampleStep === -1) {
        var pixelWidth = scope.plotSize.width;
        var count = Math.ceil(pixelWidth / this.lodSteps[this.lodTypeIndex]);
        var s = (xr - xl) / count;
        this.sampleStep = s;
      }

      var step = this.sampleStep;
      xl = Math.floor(xl / step) * step;
      xr = Math.ceil(xr / step) * step;

      this.elementSamples = this.sampler.sample(xl, xr, this.sampleStep);
      this.sizeSamples = this.samplerSize.sample(xl, xr, this.sampleStep);
    };

    PlotPointLodLoader.prototype.clear = function(scope) {
      scope.maing.select("#" + this.id).selectAll("*").remove();
      this.hideTips(scope);
    };

    PlotPointLodLoader.prototype.hideTips = function(scope, hidden) {
      if (this.lodOn === false) {
        this.plotter.hideTips(scope, hidden);
        return;
      }
      this.lodplotter.hideTips(scope, hidden);
    };

    PlotPointLodLoader.prototype.createTip = function(ele, g) {
      if (this.lodOn === false) {
        return this.plotter.createTip(ele);
      }
      var xAxis = this.xAxis,
          yAxis = this.yAxis;
      var tip = {};
      var sub = "sample" + (g !== "" ? (" " + g) : "");
      if (this.legend != null) {
        tip.title = this.legend + " (" + sub + ")";
      }
      if (ele.count > 1) {
        tip.xl = plotUtils.getTipStringPercent(ele.xl, xAxis, 6);
        tip.xr = plotUtils.getTipStringPercent(ele.xr, xAxis, 6);
        tip.max = plotUtils.getTipString(ele._max, yAxis, true);
        tip.min = plotUtils.getTipString(ele._min, yAxis, true);
        tip.avg = plotUtils.getTipStringPercent(ele.avg, yAxis, 6);
        tip.count = plotUtils.getTipString(ele.count, yAxis, true);
      } else {
        tip.x = plotUtils.getTipStringPercent(ele.x, xAxis, 6);
        tip.y = plotUtils.getTipString(ele._max, yAxis, true);
      }
      return plotUtils.createTipString(tip);
    };

    return PlotPointLodLoader;
  };
  beakerRegister.bkoFactory('PlotPointLodLoader',
    ['plotUtils', 'PlotSampler', 'PlotPoint', 'PlotLodPoint', 'PlotLodBox', retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
  'use strict';
  var retfunc = function(plotUtils, bkUtils) {
    var PlotAxis = function(type) {
      this.type = "axis";
      this.axisType = type == null ? "linear" : type; // linear, log, time, category, nanotime
      this.axisBase = 10;
      this.axisTime = 0;
      this.axisTimezone = "UTC";
      this.axisValL = type === "nanotime" ? new Big(0) : 0;
      this.axisValR = type === "nanotime" ? new Big(1) : 1;
      this.axisValSpan = type === "nanotime" ? new Big(1) : 1;
      this.axisPctL = 0;
      this.axisPctR = 1;
      this.axisPctSpan = 1;
      this.label = "";
      this.axisGridlines = [];
      this.axisGridlineLabels = [];
      this.axisStep = 1;
      this.axisFixed = 0;

      this.axisMarginValL = 0;
      this.axisMarginValR = 0;

      this.fixedLines = [];
      this.axisFixedLabels = {};

      if (this.axisType === "nanotime") {
        this.UNIT = 1000000;
      } else {
        this.UNIT = 1;
      }
      this.SECOND = 1000 * this.UNIT;
      this.MINUTE = 1000 * 60 * this.UNIT;
      this.HOUR = 1000 * 60 * 60 * this.UNIT;
      this.DAY = 1000 * 60 * 60 * 24 * this.UNIT;
      this.MONTH = 1000 * 60 * 60 * 24 * 30 * this.UNIT;
      this.YEAR = 1000 * 60 * 60 * 24 * 365 * this.UNIT;

      var numFixs = [];
      var min = this.axisType === "log" ? 1 : 0;
      for (var i = 0; i < 18; i++) {
        var f = Math.max(6 - i, min);
        numFixs = numFixs.concat([f, i <= 6 ? f + 1 : f, f]);
      }
      this.numFixs = numFixs;
    };

    var dateIntws = [], numIntws = [];

    PlotAxis.prototype.dateIntws = dateIntws;
    PlotAxis.prototype.numIntws = numIntws;

    PlotAxis.prototype.axisPow = function(pct) {
      return Math.pow(this.axisBase, pct * this.axisValSpan + this.axisValL);
    };
    PlotAxis.prototype.setLabel = function(label) {
      this.label = label;
    };
    PlotAxis.prototype.setRange = function(vl, vr, para) {
      if (vl != null) { this.axisValL = vl; }
      if (vr != null) { this.axisValR = vr; }
      if (this.axisType === "log") {
        if (para != null ) { this.axisBase = para; }
        if (this.axisBase <= 1) {
          this.axisBase = 10;
          console.error("cannot set base to <= 1");
        }
      } else if (this.axisType === "time" || this.axisType === "nanotime"){
        if (para != null) { this.axisTimezone = para; }
      }
      if (this.axisType === "nanotime"){
        if(!(this.axisValL instanceof Big)){
          this.axisValL = new Big(this.axisValL)
        }
        if(!(this.axisValR instanceof Big)){
          this.axisValR = new Big(this.axisValR)
        }
      }

      this.axisValSpan = plotUtils.minus(this.axisValR, this.axisValL);

    };
    PlotAxis.prototype.setCategoryNames = function(categoryNames, categoryxs) {
      this.axisFixedLabels = {};
      for (var i = 0; i < categoryxs.length; i++) {
        this.fixedLines.push(this.getPercent(categoryxs[i]));
        this.axisFixedLabels[this.fixedLines[i]] = categoryNames[i];
      }
    };
    PlotAxis.prototype.setGridlines = function(pl, pr, count, ml, mr) {
      if (pr < pl) {
        console.error("cannot set right coord < left coord");
        return;
      }
      if (count == null) {
        console.error("missing setCoords count");
        count = 1;
      }
      this.axisPctL = pl;
      this.axisPctR = pr;
      this.axisPctSpan = pr - pl;

      if (this.axisType === "time" || this.axisType === "nanotime") {
        this.axisMarginValL = plotUtils.mult(this.axisValSpan, ml);
        this.axisMarginValR = plotUtils.mult(this.axisValSpan, mr);
      }

      var span;
      if (this.axisValSpan instanceof Big) {
        span = parseFloat(this.axisValSpan.times(this.axisPctSpan).toString());
      } else {
        span =this.axisPctSpan * this.axisValSpan;
      }
      var intws, fixs;
      if (this.axisType === "time" || this.axisType === "nanotime") {
        intws = this.dateIntws;
        fixs = {};
      } else {
        intws = this.numIntws;
        fixs = this.numFixs;
      }
      var w, f, mindiff = 1E100;

      var diff = mindiff;
      var i = 0;

      var self = this;
      var calcW = function (i,axisType) {
        if (i >= intws.length) {
          var prev = intws[intws.length - 1];

          if (axisType === "time" || axisType === "nanotime") {
            if (i === 0) {
              intws.push(1);
              intws.push(5);
            } else {
              if (prev < self.UNIT) {
                intws.push(prev + 5);
              } else if (prev === self.UNIT) {
                intws.push(prev + 4 * self.UNIT);
              } else if (prev < self.SECOND) {
                intws.push(prev + 5 * self.UNIT);
              } else if (prev === self.SECOND) {
                intws.push(prev + self.SECOND * 4);
              } else if (prev < self.MINUTE) {
                intws.push(prev + self.SECOND * 5);
              } else if (prev === self.MINUTE) {
                intws.push(prev + self.MINUTE * 4);
              } else if (prev < self.HOUR) {
                intws.push(prev + self.MINUTE * 5);
              }else if (prev < self.DAY) {
                intws.push(prev + self.HOUR);
              } else if (prev < self.MONTH) {
                intws.push(prev + self.DAY);
              } else if (prev < self.YEAR) {
                intws.push(prev + self.DAY * 10);
              } else {
                intws.push(prev + self.YEAR);
              }
            }
          } else {
            var bs = (i === 0) ? 1E-6 : (prev / 5.0) * 10;
            intws = intws.concat([
              1.0 * bs,
              2.5 * bs,
              5.0 * bs
            ]);
          }
        }
        return intws[i];
      };

      var calcF = function (i, axisType) {
        if (i >= fixs.length) {
          return 0;
        }
        return fixs[i];
      };

      while (diff === mindiff && w !== Infinity) {
        w = calcW(i, this.axisType);
        f = calcF(i, this.axisType);

        var nowcount = span / w;
        diff = Math.abs(nowcount - count);
        if (diff < mindiff) {
          mindiff = diff;
        }
        i++;
      }

      this.axisStep = w;
      this.axisFixed = f;

      var lines, labels;

      lines = this.calcLines(pl, pr, w);

      var margins = plotUtils.plus(this.axisMarginValL, this.axisMarginValR);
      span = plotUtils.mult(this.axisPctSpan, plotUtils.minus(this.axisValSpan, margins));

      labels = this.calcLabels(
        lines,
        span,
        this.axisType
      );

      this.axisGridlines = lines;
      this.axisGridlineLabels = labels.labels;
      if (labels.common !== ''){
        this.axisLabelWithCommon = this.label ? this.label + ' ' + labels.common : labels.common;
      }else{
        this.axisLabelWithCommon = this.label;
      }


    };

    PlotAxis.prototype.calcLines = function (pl, pr, w) {

      var self = this;

      var selectStartOrEndInterval = function(value, interval) {
        var nextIntervalStart = bkUtils.applyTimezone(value, self.axisTimezone).endOf(interval).add(1, "ms");
        var intervalStart = bkUtils.applyTimezone(value, self.axisTimezone).startOf(interval);
        return  ((nextIntervalStart - value) > (value - intervalStart)) ? intervalStart : nextIntervalStart;
      };

      var normalize = function (value) {
        if (self.axisType === "time") {
          if (plotUtils.gt(w, self.DAY)) {
            if (plotUtils.lte(w, self.MONTH)) {
              value = selectStartOrEndInterval(value, "day");
            } else if (plotUtils.lte(w, self.YEAR)) {
              value = selectStartOrEndInterval(value, "month");
            } else {
              value = selectStartOrEndInterval(value, "year");
            }
          }
        }
        return value;
      };

      var val = this.getValue(pl);
      if(val instanceof Big){
        if(val.gte(0)){
          val = val.div(w).round(0, 3).times(w);
        }else{
          val = val.div(w).round(0, 0).times(w);
        }
      }else{
        val = normalize(Math.ceil(val / w) * w);
      }
      var valr = this.getValue(pr);
      var lines = [];

      if (this.axisType === "category") {
        for (var i = 0; i < this.fixedLines.length; i++) {
          var pct = this.fixedLines[i];
          if (pct >= this.getPercent(this.getValue(pl)) && pct <= this.getPercent(valr)) {
            lines.push(pct);
          }
        }
      } else {
        while (plotUtils.lt(val, valr)) {
          var pct = this.getPercent(val);
          lines.push(pct);
          val = normalize(plotUtils.plus(val, w));
        }
      }

      return lines;
    };

    PlotAxis.prototype.calcLabels = function (lines, span, axisType) {

      var labels = [];

      if (axisType === "category"){
        var min = Math.min.apply(null, lines);
        var max = Math.max.apply(null, lines);
        for (var key in this.axisFixedLabels) {
          var pct = parseFloat(key);
          if (!this.axisFixedLabels.hasOwnProperty(pct)) { continue; }
          if(pct >= min && pct <= max){
            labels.push(this.axisFixedLabels[pct]);
          }
        }
      } else {
        for (var i = 0; i < lines.length; i++) {
          var pct = lines[i];
          labels.push(this.getString(pct, span));
        }
      }


      if ((span > this.SECOND && axisType === "time" || axisType === "nanotime" && plotUtils.gt(span, this.UNIT)) &&
        labels.length != _.uniq(labels).length) {
        if (axisType === "nanotime" && plotUtils.lte(span, this.SECOND)){
          span = this.UNIT;
        } else if (plotUtils.lte(span, this.MINUTE)) {
          span = this.SECOND;
        } else if (plotUtils.lte(span, this.HOUR)) {
          span = this.MINUTE;
        } else if (plotUtils.lte(span, this.DAY)) {
          span = this.HOUR;
        } else if (plotUtils.lte(span, this.MONTH)) {
          span = this.DAY;
        } else if (plotUtils.lte(span, this.YEAR)) {
          span = this.MONTH;
        } else {
          span = this.YEAR;
        }
        if (axisType === "nanotime") {
          span = new Big(span).minus(1);
        } else {
          span -= 1;
        }

        return this.calcLabels(lines, span, axisType);
      }

      var self = this;
      var calcCommonPart = function () {
        var common = '';

        if ((axisType === "time" || axisType === "nanotime") && plotUtils.gte(span, self.HOUR) && labels.length > 1) {

          var tokens = labels[0].split(' ');

          var index = 0;

          var checkCommon = function (index) {

            var substring =  (common != '') ? common + ' ' + tokens[index] : tokens[index];
            for (i = 1; i < labels.length; i++) {
              if (substring !== labels[i].substring(0, substring.length)) {
                return false;
              }
            }
            return true;
          };

          while(checkCommon(index)){
            common = (common != '') ? common + ' ' + tokens[index] : tokens[index];
            index = index+1;
          }

          if (common.length > 1) {

            for (i = 1; i < labels.length; i++) {
              var label = labels[i];
              if (common != label.substring(0, common.length)) {
                common = '';
                break;
              }
            }
          }

          if (common.length > 1) {
            for (i = 0; i < labels.length; i++) {
              labels[i] = labels[i].replace(common, '').trim();
            }
          }
          common = common.replace(',', '').trim();
        }

        return common;
      };

      return {
          common : calcCommonPart(),
          labels : labels
        };
    };

    PlotAxis.prototype.getGridlines = function() { return _.without(this.axisGridlines); };
    PlotAxis.prototype.getGridlineLabels = function() { return _.without(this.axisGridlineLabels); };
    PlotAxis.prototype.getPercent = function(val) {
      if (plotUtils.lt(val, this.axisValL)) { val = this.axisValL; }
      if (plotUtils.gt(val, this.axisValR)) { val = this.axisValR; }
      if(val instanceof Big){
        return parseFloat(val.minus(this.axisValL).div(this.axisValSpan).toString());
      }else{
        return (val - this.axisValL) / this.axisValSpan;
      }
    };
    PlotAxis.prototype.getValue = function(pct) {
      if (pct < 0) { pct = 0; }
      if (pct > 1) { pct = 1; }
      return plotUtils.plus(plotUtils.mult(this.axisValSpan, pct), this.axisValL);
    };


    PlotAxis.prototype.getString = function(pct, span) {
      if (this.axisType != "time" && this.axisType != "nanotime") {
        if (this.axisType === "log") {
          return "" + Math.pow(this.axisBase, this.getValue(pct)).toFixed(this.axisFixed);
        } else {
          return "" + this.getValue(pct).toFixed(this.axisFixed);
        }
      }
      var val = this.getValue(pct);

      var padStr = function(val, len) {
        var str = "" + Math.abs(val);
        while (str.length < len) str = "0" + str;
        return str;
      };

      var d, ret = "", nanosec;
      if (this.axisType === "time") {
        d = Math.ceil(val * 1000) / 1000;
      }
      else if (this.axisType === "nanotime"){
        d = parseFloat(val.div(1000000).toFixed(0));
        nanosec = val.mod(1000000000).toFixed(0);
      }

      if (plotUtils.lte(span, this.SECOND) && this.axisType === "time") {
        ret = bkUtils.formatTimestamp(d, this.axisTimezone, ".SSS") + ( (d - Math.floor(d)).toFixed(this.axisFixed));
      } else if (plotUtils.lte(span, this.MINUTE) && this.axisType === "time") {
        ret = bkUtils.formatTimestamp(d, this.axisTimezone, "mm:ss.SSS");
      } else if (plotUtils.lte(span, this.HOUR)) {
        if(this.axisType === "nanotime"){
          if (moment(d) < this.SECOND) {
            ret = "." + padStr(nanosec, 9);
          } else {
            ret = bkUtils.formatTimestamp(d, this.axisTimezone, "HH:mm:ss") + "." + padStr(nanosec, 9);
          }
        }else{
          ret = bkUtils.formatTimestamp(d, this.axisTimezone, "HH:mm:ss");
        }
      } else if (plotUtils.lte(span, this.DAY)) {
        ret = bkUtils.formatTimestamp(d, this.axisTimezone, "YYYY MMM DD, HH:mm");
      } else if (plotUtils.lte(span, this.MONTH)) {
        ret = bkUtils.formatTimestamp(d, this.axisTimezone, "YYYY MMM DD");
      } else if (plotUtils.lte(span, this.YEAR)) {
        ret = bkUtils.formatTimestamp(d, this.axisTimezone, "YYYY MMM");
      } else {
        ret = bkUtils.formatTimestamp(d, this.axisTimezone, "YYYY");
      }

      return ret;
    };
    return PlotAxis;
  };
  beakerRegister.bkoFactory('PlotAxis', ['plotUtils', 'bkUtils', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/


(function() {
  'use strict';
  var retfunc = function (PlotAxis, PlotLine, PlotBar, PlotStem, PlotArea, PlotPoint,
                          PlotConstline, PlotConstband, PlotText, PlotTreeMapNode,
                          PlotLineLodLoader, PlotBarLodLoader, PlotStemLodLoader, PlotAreaLodLoader,
                          PlotPointLodLoader, HeatMap, plotUtils) {
    return {
      createPlotItem : function(item, lodthresh) {
        if (!lodthresh){
          lodthresh = 1500;
        }
        var size = item.elements ?  item.elements.length : 0;
        var shouldApplyLod = size >= lodthresh;
        if (shouldApplyLod) {
          var eles = item.elements;
          for (var j = 1; j < eles.length; j++) {
            if (plotUtils.lt(eles[j].x, eles[j - 1].x)) {
              console.warn("x values are not monotonic, LOD is disabled");
              shouldApplyLod = false;
              break;
            }
          }
        }
        var plotitem;
        switch (item.type) {
          case "line":
            plotitem = shouldApplyLod ?
              new PlotLineLodLoader(item, lodthresh) : new PlotLine(item);
            break;
          case "bar":
            plotitem = shouldApplyLod ?
              new PlotBarLodLoader(item, lodthresh) : new PlotBar(item);
            break;
          case "stem":
            plotitem = shouldApplyLod ?
              new PlotStemLodLoader(item, lodthresh) : new PlotStem(item);
            break;
          case "area":
            plotitem = shouldApplyLod ?
              new PlotAreaLodLoader(item, lodthresh) : new PlotArea(item);
            break;
          case "point":
            plotitem = shouldApplyLod ?
              new PlotPointLodLoader(item, lodthresh) : new PlotPoint(item);
            break;
          case "constline":
            plotitem = new PlotConstline(item);
            break;
          case "constband":
            plotitem = new PlotConstband(item);
            break;
          case "text":
            plotitem = new PlotText(item);
            break;
          case "treemapnode":
            plotitem = new PlotTreeMapNode(item);
            break;
          case "heatmap":
            plotitem = new HeatMap(item);
            break;
          default:
            console.error("no type specified for item creation");
        }
        return plotitem;
      },

      recreatePlotItem : function(item) {
        switch (item.type) {
          case "line":
            if (item.isLodItem === true) {
              item.__proto__ = PlotLineLodLoader.prototype;
            } else {
              item.__proto__ = PlotLine.prototype;
            }
            break;
          case "bar":
            if (item.isLodItem === true) {
              item.__proto__ = PlotBarLodLoader.prototype;
            } else {
              item.__proto__ = PlotBar.prototype;
            }
            break;
          case "stem":
          if (item.isLodItem === true) {
              item.__proto__ = PlotStemLodLoader.prototype;
            } else {
              item.__proto__ = PlotStem.prototype;
            }
            break;
          case "area":
            if (item.isLodItem === true) {
              item.__proto__ = PlotAreaLodLoader.prototype;
            } else {
              item.__proto__ = PlotArea.prototype;
            }
            break;
          case "point":
            if (item.isLodItem === true) {
              item.__proto__ = PlotPointLodLoader.prototype;
            } else {
              item.__proto__ = PlotPoint.prototype;
            }
            break;
          case "constline":
            item.__proto__ = PlotConstline.prototype;
            break;
          case "constband":
            item.__proto__ = PlotConstband.prototype;
            break;
          case "text":
            item.__proto__ = PlotText.prototype;
            break;
          case "axis":
            item.__proto__ = PlotAxis.prototype;
            break;
          case "treemapnode":
            item.__proto__ = PlotTreeMapNode.prototype;
            break;
          default:
            console.error("no type specified for item recreation");
        }
      }
    };
  };
  beakerRegister.bkoFactory('plotFactory',
    ['PlotAxis', 'PlotLine', 'PlotBar', 'PlotStem', 'PlotArea', 'PlotPoint',
      'PlotConstline', 'PlotConstband', 'PlotText', 'PlotTreeMapNode',
      'PlotLineLodLoader', 'PlotBarLodLoader', 'PlotStemLodLoader', 'PlotAreaLodLoader',
      'PlotPointLodLoader', 'HeatMap', 'plotUtils',
      retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


(function() {
  'use strict';
  var retfunc = function(bkUtils, plotUtils) {

    var calcWidths = function(categoryItems){

      var plotCategoriesNumber = 0;
      var plotSeriesNumber = 0;

      for (var i = 0; i < categoryItems.length; i++) {
        var categoryItem = categoryItems[i]; //e.g. CategoryBar
        var value = categoryItem.value;
        plotCategoriesNumber = Math.max(plotCategoriesNumber, value[0].length);
        plotSeriesNumber = Math.max(plotSeriesNumber, value.length);
      }

      var calculatedWidths = new Array(plotSeriesNumber);
      for (var i = 0; i < calculatedWidths.length; i++) {
        calculatedWidths[i] = Array.apply(null, Array(plotCategoriesNumber)).map(function (item, index) {
          return 0;
        });
      }

      for (var index = 0; index < categoryItems.length; index++) {
        var categoryItem = categoryItems[index]; //e.g. CategoryBar
        var itemCategoriesNumber = categoryItem.value[0].length;
        var itemSeriesNumber = categoryItem.value.length;

        for (var colindex = 0; colindex < itemCategoriesNumber; colindex++) {
          for (var rowindex = 0; rowindex < itemSeriesNumber; rowindex++) {
            if (_.isArray(categoryItem.widths)) {
              var rowWidths = categoryItem.widths[rowindex];
              if (_.isArray(rowWidths)) {
                calculatedWidths[rowindex][colindex] = Math.max(calculatedWidths[rowindex][colindex], rowWidths[colindex]);
              } else {
                calculatedWidths[rowindex][colindex] = Math.max(calculatedWidths[rowindex][colindex], rowWidths);
              }
            } else {
              calculatedWidths[rowindex][colindex] = Math.max(calculatedWidths[rowindex][colindex], categoryItem.width);
            }
          }
        }
      }

      return calculatedWidths;
    };


    var calccategoryitem = function(newmodel, categoryItem, categoriesNumber, seriesNumber, calculatedWidths) {

      var categoryMargin = newmodel.categoryMargin;

      var elementsxs = new Array(seriesNumber);
      for (var i = 0; i < elementsxs.length; i++) {
        elementsxs[i] = new Array(categoriesNumber);
      }
      var labelsxs = [];

      var resWidth = 0;

      for (var colindex = 0; colindex < categoriesNumber; colindex++) {
        var categoryxl = resWidth;
        var maxRowWidth = 0;
        for (var rowindex = 0; rowindex < seriesNumber; rowindex++) {

          var elWidth = calculatedWidths[rowindex][colindex] || 1; //FIXME why width default value is not set?
          elementsxs[rowindex][colindex] = resWidth + elWidth / 2;

          if (!categoryItem.center_series) {
            resWidth += elWidth;
          } else {
            maxRowWidth = Math.max(maxRowWidth, elWidth)
          }
        }
        if (categoryItem.center_series) {
          resWidth += maxRowWidth;
        }

        labelsxs.push(categoryxl + (resWidth - categoryxl) / 2);
        resWidth += categoryMargin;
      }
      return {
        elementsxs: elementsxs,
        labelsxs: labelsxs
      };
    };

    var  processItem = function(item, index, newmodel, yAxisRSettings, yAxisSettings) {
      item.legend = item.display_name;
      delete item.display_name;

      if (item.use_tool_tip != null) {
        item.useToolTip = item.use_tool_tip;
        delete item.use_tool_tip;
      }

      if(item.color == null && item.colors == null) {
        //set default colors
        item.color = plotUtils.getDefaultColor(index);
      }

      if (item.color != null) {
        item.color_opacity = parseInt(item.color.substr(1,2), 16) / 255;
        item.color = "#" + item.color.substr(3);
      }
      if (item.fill != null && item.fill === false) {
        item.color = "none";
      }
      if (item.outline_color != null) {
        if (!item.hasOwnProperty("outline") && !item.hasOwnProperty("outlines") ||
            item.hasOwnProperty("outline") && item.outline === true) {
          item.stroke_opacity = parseInt(item.outline_color.substr(1, 2), 16) / 255;
          item.stroke = "#" + item.outline_color.substr(3);
          //do not remove item.outline_color here, it is used in processElement()
        }
      }

      if (item.type == null) { item.type = ""; }
      if (item.style == null) { item.style = ""; }
      if (item.stroke_dasharray == null) { item.stroke_dasharray = ""; }
      if (item.interpolation == null) { item.interpolation = ""; }

      item.type = dataTypeMap[item.type];

      if(item.type === "bar" || item.type === "area") {
        //newmodel.yPreventNegative = true; // auto range to y = 0
      }

      if(item.type === "line" || item.type === "stem") {
        item.style = lineStyleMap[item.style];
      }

      if(item.type === "line" || item.type === "area") {
        item.interpolation = interpolationMap[item.interpolation];
      }

      if(item.type === "bar") {
        if (item.width == null) {
          item.width = 1;
        }
      }

      if (item.type === "point") {
        if (item.shape == null) {
          item.shape = "DEFAULT";
        }
        item.shape = pointShapeMap[item.shape];
      }

      var yAxisSettings = plotUtils.useYAxisR(newmodel, item) ? yAxisRSettings : yAxisSettings;
      if (item.base != null && yAxisSettings.logy) {
        if (item.base === 0) {
          item.base = 1;
        }
      }
    };

    var processElement = function(item, j, ele, yAxisSettings, logx) {

      if (item.tooltips){
        ele.tooltip = item.tooltips[j];
      }

      // discard NaN entries
      if (ele.x === "NaN" || ele.y === "NaN" ||
        logx && ele.x <= 0 || yAxisSettings.logy && ele.y <= 0 )
        return false;

      if (item.colors != null) {
        ele.color_opacity = parseInt(item.colors[j].substr(1,2), 16) / 255;
        ele.color = "#" + item.colors[j].substr(3);
      }
      if (item.fills != null && item.fills[j] === false) {
        ele.color = "none";
      }
      if (item.hasOwnProperty("outlines") || item.hasOwnProperty("outline")) {
        if (item.outlines && item.outlines[j] === true || item.outline === true) {
          if (item.outline_colors != null) {
            ele.stroke_opacity = parseInt(item.outline_colors[j].substr(1, 2), 16) / 255;
            ele.stroke = "#" + item.outline_colors[j].substr(3);
          } else if (item.outline_color != null) {
            ele.stroke_opacity = parseInt(item.outline_color.substr(1, 2), 16) / 255;
            ele.stroke = "#" + item.outline_color.substr(3);
          } else {
            ele.stroke_opacity = 1;
            ele.stroke = plotUtils.colorToHex("black");
          }
        }
      } else if (item.outline_colors != null) {
        ele.stroke_opacity = parseInt(item.outline_colors[j].substr(1,2), 16) / 255;
        ele.stroke = "#" + item.outline_colors[j].substr(3);
      }

      if (item.type === "line" || item.type === "stem") {
        if (item.styles != null) {
          var style = item.styles[j];
          if (style == null) {
            style = "";
          }
          if (item.type === "line")
            item.style = lineStyleMap[style];
          else
            ele.style = lineStyleMap[style];
        }
      }

      if ((item.type === "stem" || item.type === "bar" || item.type === "area") &&
        ele.y2 == null) {
        if (item.bases != null) {
          ele.y2 = item.bases[j];
        }
      }

      if (item.type === "point") {
        if (item.sizes != null) {
          ele.size = item.sizes[j];
        }
      }

      if (item.type === "bar" && item.widths != null) {
        ele.x = plotUtils.minus(ele.x, item.widths[j] / 2);
        ele.x2 = plotUtils.plus(ele.x, item.widths[j]);
      }
      return true;
    };

    var dataTypeMap = {
      "Line" : "line",
      "Stems" : "stem",
      "Bars" : "bar",
      "Area" : "area",
      "Text" : "text",
      "Points" : "point",
      "CategoryLine" : "line",
      "CategoryStems" : "stem",
      "CategoryBars" : "bar",
      "CategoryArea" : "area",
      "CategoryText" : "text",
      "CategoryPoints" : "point",
      "TreeMapNode" : "treemapnode",
      "" : ""
    };
    var lineStyleMap = {
      "DEFAULT": "solid",
      "SOLID" : "solid",
      "DASH" : "dash",
      "DOT" : "dot",
      "DASHDOT" : "dashdot",
      "LONGDASH" : "longdash",
      "" : "solid"
    };
    var pointShapeMap = {
      "DEFAULT" : "rect",
      "CIRCLE" : "circle",
      "DIAMOND" : "diamond",
      "" : "rect"
    };
    var interpolationMap = {
      0 : "none",
      1 : "linear",
      2 : "linear", // should be "curve" but right now it is not implemented yet
      "" : "linear"
    };

    return {
      dataTypeMap : dataTypeMap,
      lineStyleMap : lineStyleMap,
      pointShapeMap : pointShapeMap,
      interpolationMap : interpolationMap,

      convertTreeMapGroovyData: function (newmodel, model) {

        newmodel.process = process;

        function findParent(node) {
          var data = model.children;
          for (var i = 0; i < data.length; i++) {
            var _node_ = data[i];
            var _parent_ = _findParent_(_node_, node);
            if (_parent_)
              return _parent_;
          }

          return null;
        }

        function _findParent_(parent, node) {
          if (parent.children) {
            for (var i = 0; i < parent.children.length; i++) {
              var child = parent.children[i];
              if (child == node)
                return parent;

              var _parent_ = _findParent_(parent.children[i], node);
              if (_parent_)
                return _parent_;
            }
          }

          return null;
        }

        function _treatNode_(node, visitor) {
          visitor.visit(node);
          if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
              _treatNode_(node.children[i], visitor);
            }
          }
        }

        var visitor = {
          i: 0,
          visit: function (node) {
            node.showItem = true;
            node.setShowItem = setShowItem;
            node.type = dataTypeMap[node.type];

            node.index = this.i;
            node.id = "i" + this.i;

            this.i = this.i + 1;
            node.showItem = true;

            if (!node.children){
              node.legend = node.label;
            }

            newmodel.data.push(node)
          }
        };

        function setShowItem(showItem, skipChildren) {
          this.showItem = showItem;

          if (!skipChildren && this.children) {
            for (var i = 0; i < this.children.length; i++) {
              this.children[i].setShowItem(showItem);
            }
          }

          if (showItem === true) {
            var _parent_ = findParent(this);
            if (_parent_) {
              _parent_.setShowItem(true, true);
            }
          }
        }

        var item = model.graphics_list;
        function process(visitor) {
          _treatNode_(item, visitor);
        }
        item.root = true;
        process(visitor);
      },

      convertGroovyData : function(newmodel, model) {
        if ( model.type === 'TreeMap'){
          this.convertTreeMapGroovyData(newmodel, model);
          return;
        }
        var logx = false, logxb;
        var yAxisSettings = {yIncludeZero: false, logy: false, logyb: null};
        var yAxisRSettings = _.clone(yAxisSettings);
        if (model.rangeAxes != null) {
          var updateAxisSettings = function(axis, settings){
            if (axis.auto_range_includes_zero === true) {
              settings.yIncludeZero = true;
            }
            if (axis.use_log === true) {
              settings.logy = true;
              settings.logyb = axis.log_base == null ? 10 : axis.log_base;
            }
          };

          updateAxisSettings(model.rangeAxes[0], yAxisSettings);
          if(model.rangeAxes.length > 1){
            updateAxisSettings(model.rangeAxes[1], yAxisRSettings);
          }
        }
        if (model.log_x === true) {
          logx = true;
          logxb = model.x_log_base == null ? 10 : model.x_log_base;
        }
        // set margin
        newmodel.margin = {};
        // set axis bound as focus
        if (model.x_auto_range === false) {
          if (model.x_lower_bound !== model.x_upper_bound) {
            if (model.x_lower_bound != null) {
              newmodel.userFocus.xl = model.x_lower_bound;
            }
            if (model.x_upper_bound != null) {
              newmodel.userFocus.xr = model.x_upper_bound;
            }
          }
        } else {
          if (model.x_lower_margin != null) {
            newmodel.margin.left = model.x_lower_margin;
          }
          if (model.x_upper_margin != null) {
            newmodel.margin.right = model.x_upper_margin;
          }
        }

        if (model.rangeAxes != null) {
          var axis = model.rangeAxes[0];
          if (axis.auto_range === false) {
            if (axis.lower_bound != null) {
              newmodel.userFocus.yl = axis.lower_bound;
            }
            if (axis.upper_bound != null) {
              newmodel.userFocus.yr = axis.upper_bound;
            }
          }
        }

        if (model.crosshair != null) {
          var color = model.crosshair.color;
          newmodel.xCursor = {};
          var cursor = newmodel.xCursor;

          cursor.color_opacity = parseInt(color.substr(1,2), 16) / 255;
          cursor.color = "#" + color.substr(3);

          var style = model.crosshair.style;
          if (style == null) style = "";
          cursor.style = lineStyleMap[style];
          cursor.width = model.crosshair.width != null ? model.crosshair.width : 2;

          newmodel.yCursor = {};
          _.extend(newmodel.yCursor, cursor);
        }

        // log scaling
        if (logx) {
          newmodel.xAxis.type = "log";
          newmodel.xAxis.base = logxb;
        } else if (model.type === "TimePlot") {
          newmodel.xAxis.type = "time";
        } else if (model.type === "NanoPlot"){
          newmodel.xAxis.type = "nanotime";
        } else if (model.type === "CategoryPlot") {
          newmodel.xAxis.type = "category";
        } else {
          newmodel.xAxis.type = "linear";
        }

        var setYAxisType = function(axis, settings){
          if(axis == null){ return; }
          if (settings.logy) {
            axis.type = "log";
            axis.base = settings.logyb;
          } else {
            axis.type = "linear";
          }
        };
        setYAxisType(newmodel.yAxis, yAxisSettings);
        setYAxisType(newmodel.yAxisR, yAxisRSettings);

        var list = model.graphics_list;
        var numLines = list.length;
        switch (model.type) {
          case "CategoryPlot":
            var calculatedWidths = calcWidths(list);

            for (var index = 0; index < list.length; index++) {
              var categoryItem = list[index]; //e.g. CategoryBar
              var value = categoryItem.value;
              var categoriesNumber = value[0].length;
              var seriesNumber = value.length;
              var seriesNames = categoryItem.seriesNames || [];
              if (_.isEmpty(seriesNames) && newmodel.showLegend) {
                for (var s = 0; s < seriesNumber; s++) {
                  seriesNames.push("series" + s);
                }
              }

              var res = calccategoryitem(newmodel, categoryItem, categoriesNumber, seriesNumber, calculatedWidths);
              var elementsxs = res.elementsxs;
              newmodel.labelsxs = res.labelsxs;

              for (var i = 0; i < seriesNumber; i++) {
                var series = value[i];
                var item = _.extend({}, categoryItem);//
                item.series = i;
                item.display_name = seriesNames[i];

                var processSeriesProperty = function (seriesindex, property, seriesproperty) {
                  if (item[property]) {
                    var seriesPropertyValue = item[property][seriesindex];
                    if (_.isArray(seriesPropertyValue)) {
                      item[property] = seriesPropertyValue;
                    } else {
                      item[seriesproperty] = seriesPropertyValue;
                      delete item[property];
                    }

                    if(property === 'styles' && item.type === "CategoryLines") {
                      item.style = lineStyleMap[item.style];
                    }
                  }
                };
                processSeriesProperty(i, 'colors', 'color');
                processSeriesProperty(i, 'widths', 'width');
                processSeriesProperty(i, 'outline_colors', 'outline_color');
                processSeriesProperty(i, 'bases', 'base');
                processSeriesProperty(i, 'fills', 'fill');
                processSeriesProperty(i, 'outlines', 'outline');
                processSeriesProperty(i, 'styles', 'style');

                delete item.value;
                delete item.seriesNames;

                item.y = [];
                item.x = [];
                for (var j = 0; j < categoriesNumber; j++) {
                  item.y.push(series[j]);
                  item.x.push(elementsxs[i][j]);
                }

                processItem(item, i, newmodel, yAxisRSettings, yAxisSettings, logx);

                var elements = [];
                for (var j = 0; j < item.x.length; j++) {
                  var ele = {
                    series: i,
                    category: j,
                    x: item.x[j],
                    y: item.y[j]

                  };
                  if(categoryItem.itemLabels){
                    ele.itemLabel =  categoryItem.itemLabels[j][i];
                  }

                  if(processElement(item, j, ele, yAxisSettings)){
                    elements.push(ele);
                  }
                }

                item.elements = elements;

                newmodel.data.push(item);
              }
            }
            break;
          case "Histogram":
            if (!list || !list.length || !list[0] || !list[0].length) {
              break;
            }
            var datasets = [];
            var rangeMin = list[0][0], rangeMax = rangeMin;
            for (var i = 0; i < list.length; i++) {
              rangeMin = Math.min(rangeMin, d3.min(list[i]));
              rangeMax = Math.max(rangeMax, d3.max(list[i]));
            }
            for (var i = 0; i < list.length; i++) {
              var dataset = list[i];
              var item = {
                type: "Bars",
                color: !_.isEmpty(model.colors) ? model.colors[i] : model.color,
                x: [],
                y: []
              };

              if(newmodel.displayMode === 'STACK' && list.length > 1){
                item.bases = [];
              }

              if(list.length > 1) {
                if(model.names && model.names.length>0) {
                    item.display_name = model.names[i]
                }
                else {
                    item.display_name = "dataset" + (i + 1);
                }
              }

              var histvalues = plotUtils.histogram().
                rightClose(newmodel.rightClose).
                binCount(newmodel.binCount).
                rangeMin(newmodel.rangeMin != null ? newmodel.rangeMin : rangeMin).
                rangeMax(newmodel.rangeMax != null  ? newmodel.rangeMax : rangeMax)(dataset);

              datasets.push(histvalues);

              var sumy = 0;
              if(newmodel.normed === true) {
                for (var j = 0; j < histvalues.length; j++) {
                  sumy += histvalues[j].y;
                }
              }

              for(var j = 0; j < histvalues.length; j++){
                if(newmodel.normed === true){
                  histvalues[j].y = histvalues[j].y / sumy;
                }

                if (newmodel.cumulative && j != 0) {
                  histvalues[j].y = histvalues[j - 1].y + histvalues[j].y;
                }

                if(newmodel.displayMode === 'STACK' && i != 0){
                  histvalues[j].y = histvalues[j].y + datasets[i - 1][j].y;
                }

                if(newmodel.displayMode === 'SIDE_BY_SIDE'){
                  histvalues[j].dx = histvalues[j].dx / list.length;
                  histvalues[j].x += histvalues[j].dx * i;
                }

                var histvalue = histvalues[j];
                item.x.push(histvalue.x);
                item.y.push(histvalue.y);
                item.width = histvalue.dx;
              }

              processItem(item, i, newmodel, yAxisRSettings, yAxisSettings, logx);

              var elements = [];
              for (var j = 0; j < item.x.length; j++) {
                var ele = {};
                ele.x = item.x[j];
                ele.x2 = item.x[j] + item.width;
                ele.y = item.y[j];

                if(processElement(item, j, ele, yAxisSettings, logx)){
                  elements.push(ele);
                }
              }

              item.elements = elements;

              newmodel.data.push(item);

            }
            if(newmodel.displayMode === 'STACK' && list.length > 1){
              newmodel.data.reverse();
            }
            break;
          default:
            for (var i = 0; i < numLines; i++) {
              var item = list[i];

              processItem(item, i, newmodel, yAxisRSettings, yAxisSettings);

              var elements = [];
              for (var j = 0; j < item.x.length; j++) {
                var x = item.x[j];
                if (model.type === 'NanoPlot') {
                  if (_.isEmpty(x)) { continue; }
                  var bigv = new Big(x);
                  if (logx && bigv.lte(0)){ continue; }
                  item.x[j] = bigv;
                }

                var ele = {};
                ele.x = item.x[j];
                ele.y = item.y[j];
                ele.index = j;

                if(processElement(item, j, ele, yAxisSettings, logx)){
                  elements.push(ele);
                }
              }

              item.elements = elements;

              newmodel.data.push(item);
            }
            break;
        }

        if(model.constant_lines != null) {
          for(var i = 0; i < model.constant_lines.length; i++) {
            var line = model.constant_lines[i];
            var item = {
              "type": "constline",
              "width": line.width != null ? line.width : 1,
              "color": "black",
              "yAxis": line.yAxis,
              "showLabel": line.showLabel,
              "elements": []
            };
            if (line.color != null) {
              item.color_opacity = parseInt(line.color.substr(1,2), 16) / 255;
              item.color = "#" + line.color.substr(3);
            }
            var style = line.style;
            if (style == null) { style = ""; }
            item.style = lineStyleMap[style];

            var addElement = function (line, type, log) {
              if (line[type] == null || log && plotUtils.lte(line[type], 0)) {
                return false;
              }
              var ele = {"type": type};
              ele[type] = line[type];
              item.elements.push(ele);
            };

            if (model.type === "NanoPlot") {
              if (!_.isEmpty(line.x)) {
                line.x = new Big(line.x);
                addElement(line, "x", logx)
              }
            } else {
              addElement(line, "x", logx)
            }
            addElement(line, "y", yAxisSettings.logy)

            if (!_.isEmpty(item.elements)) {
              newmodel.data.push(item);
            }
          }
        }
        if (model.constant_bands != null) {
          for (var i = 0; i < model.constant_bands.length; i++) {
            var band = model.constant_bands[i];
            var item = {
              "type" : "constband",
              "elements" : []
            };
            if (band.color != null) {
              item.color_opacity = parseInt(band.color.substr(1, 2), 16) / 255;
              item.color = "#" + band.color.substr(3);
            }
            if (band.x != null) {
              var ele = {
                "type" : "x",
                "x" : plotUtils.convertInfinityValue(band.x[0]),
                "x2" : plotUtils.convertInfinityValue(band.x[1])
              };
              item.elements.push(ele);
            }
            if (band.y != null) {
              var ele = {
                "type" : "y"
              };
              var y1 = band.y[0], y2 = band.y[1];
              ele.y = plotUtils.convertInfinityValue(y1);
              ele.y2 = plotUtils.convertInfinityValue(y2);
              item.elements.push(ele);
            }
            newmodel.data.push(item);
          }
        }
        if (model.texts != null) {
          for (var i = 0; i < model.texts.length; i++) {
            var mtext = model.texts[i];
            var item = {
              "type" : "text",

              "color" : mtext.color != null ? "#" + mtext.color.substr(3) : "black",
              "color_opacity" : mtext.color != null ? parseInt(mtext.color.substr(1,2), 16) / 255 : 1,
              "show_pointer" : mtext.show_pointer,
              "pointer_angle" : mtext.pointer_angle,
              "size" : mtext.size,

              "elements" : []
            };
            var x = mtext.x;
            if (model.type === 'NanoPlot') {
              if (_.isEmpty(x)) { continue; }
              var bigv = new Big(x);
              mtext.x = bigv;
            }
            var ele = {
              "x" : mtext.x,
              "y" : mtext.y,
              "text" : mtext.text
            };
            item.elements.push(ele);
            newmodel.data.push(item);
          }
        }
        newmodel.yIncludeZero = yAxisSettings.yIncludeZero;
        newmodel.yRIncludeZero = yAxisRSettings.yIncludeZero;
      },

      cleanupModel : function(model) {
        for (var i = 0; i < model.data.length; i++) {
          var item = model.data[i];
          if (item.x != null) { delete item.x; }
          if (item.y != null) { delete item.y; }
          if (item.colors) { delete item.colors; }
          if (item.sizes) { delete item.sizes; }
          if (item.bases) { delete item.bases; }
          if (item.outline_colors) { delete item.outline_colors; }
        }
      }
    };
  };
  beakerRegister.bkoFactory('plotConverter', ["bkUtils", "plotUtils", retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
  'use strict';
  var retfunc = function() {

    return {

      convertGroovyData : function(newmodel, model) {
        // set margin
        newmodel.margin = {
          top: 0,
          bottom: 0
        };
        // set axis bound as focus
        if (model.x_auto_range === false) {
          if (model.x_lower_bound != null) {
            newmodel.userFocus.xl = model.x_lower_bound;
          }
          if (model.x_upper_bound != null) {
            newmodel.userFocus.xr = model.x_upper_bound;
          }
        } else {
          if (model.x_lower_margin != null) {
            newmodel.margin.left = model.x_lower_margin;
          }
          if (model.x_upper_margin != null) {
            newmodel.margin.right = model.x_upper_margin;
          }
        }

        if (model.rangeAxes != null) {
          var axis = model.rangeAxes[0];
          if (axis.auto_range === false) {
            if (axis.lower_bound != null) {
              newmodel.userFocus.yl = axis.lower_bound;
            }
            if (axis.upper_bound != null) {
              newmodel.userFocus.yr = axis.upper_bound;
            }
          }
        }

        //axes types
        newmodel.xAxis.type = "linear";
        newmodel.yAxis.type = "linear";

        var data = model.graphics_list;

        var minValue = data[0][0];
        var maxValue = minValue;
        for (var rowInd = 0; rowInd < data.length; rowInd++) {
          var row = data[rowInd];
          maxValue = Math.max(maxValue, Math.max.apply(null, row));
          minValue = Math.min(minValue, Math.min.apply(null, row));
        }

        var item = {
          type: "heatmap",
          minValue: minValue,
          maxValue: maxValue,
          legend: "true",
          colors: []
        };

        var colors = model.color;
        for (var i = 0; i < colors.length; i++) {
          item.colors.push("#" + colors[i].substr(3));
        }

        var elements = [];

        for (var rowInd = 0; rowInd < data.length; rowInd++) {
          var row = data[rowInd];

          for (var colInd = 0; colInd < row.length; colInd++) {
            var value = row[colInd];
            if (value === "NaN")
              continue;

            var eleSize = 1;
            var ele = {
              x: colInd - eleSize / 2,
              y: rowInd - eleSize / 2,
              x2: colInd + eleSize / 2,
              y2: rowInd + eleSize / 2,
              value: value
            };

            elements.push(ele);
          }
        }
        item.elements = elements;
        newmodel.data.push(item);
      }
    };
  };
  beakerRegister.bkoFactory('heatmapConverter', retfunc);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

(function() {
  'use strict';
  var retfunc = function(bkUtils, plotConverter, heatmapConverter, PlotAxis, plotFactory, plotUtils) {

    var createNewModel = function (model) {

      var newmodel;

      if (model.version === "groovy") {  // model returned from serializer

        newmodel = {
          plotId: model.update_id,
          type: "plot",
          title: model.chart_title != null ? model.chart_title : model.title,
          margin: {},
          showLegend: model.show_legend,
          legendPosition: model.legend_position != null ? model.legend_position : {position: "TOP_RIGHT"},
          legendLayout: model.legend_layout != null ? model.legend_layout : "VERTICAL",
          useToolTip: model.use_tool_tip != null ? model.use_tool_tip : false,
          plotSize: {
            "width": model.init_width != null ? model.init_width : 1200,
            "height": model.init_height != null ? model.init_height : 350
          },
          customStyles: model.custom_styles ? model.custom_styles : '',
          elementStyles: model.element_styles ? model.element_styles : ''
        }
      } else {
        newmodel = {
          showLegend: model.showLegend,
          legendPosition: model.legendPosition != null ? model.legendPosition : {position: "TOP_RIGHT"},
          legendLayout: model.legendLayout != null ? model.legendLayout : "VERTICAL",
          useToolTip: model.useToolTip != null ? model.useToolTip : false,
          margin: model.margin != null ? model.margin : {},
          plotSize: {
            "width": model.width != null ? model.width : 1200,
            "height": model.height != null ? model.height : 350
          }
        };
      }

      if (model.type !== "TreeMap") {

        if (model.version === "groovy") {  // model returned from serializer

          newmodel = _.extend(newmodel, {
            userFocus: {},
            xAxis: {label: model.domain_axis_label},
            yAxis: {label: model.y_label, lowerMargin: model.rangeAxes[0].lower_margin, upperMargin: model.rangeAxes[0].upper_margin},
            yAxisR: model.rangeAxes.length > 1 ? {label: model.rangeAxes[1].label, lowerMargin: model.rangeAxes[1].lower_margin, upperMargin: model.rangeAxes[1].upper_margin} : null,
            orientation: model.orientation != null ? model.orientation : "VERTICAL",
            omitCheckboxes: model.omit_checkboxes,
            nanoOffset: null,
            timezone: model.timezone,
            categoryNames: model.categoryNames,
            showXGridlines: !(model.orientation !== 'HORIZONTAL' && model.type === "CategoryPlot"),
            categoryMargin: model.category_margin,
            categoryNamesLabelAngle: model.categoryNamesLabelAngle,
            cumulative: model.cumulative,
            binCount: model.bin_count,
            normed: model.normed,
            rangeMin: model.range_min,
            rangeMax: model.range_max,
            displayMode: model.displayMode != null ? model.displayMode : 'OVERLAP',
            rightClose: model.right_close,
            tips: model.tips ? model.tips : null,
            tooltips: model.tooltips ? model.tooltips : null,
            itemLabels: model.itemLabels ? model.itemLabels : null

          });
        } else {
          newmodel = _.extend(newmodel, {
            orientation: model.orientation != null ? model.orientation : "VERTICAL",
            omitCheckboxes: model.omitCheckboxes,
            xAxis: model.xAxis != null ? model.xAxis : {},
            yAxis: model.yAxis != null ? model.yAxis : {},
            yAxisR: model.yAxisR,
            range: model.range != null ? model.range : null,
            userFocus: model.focus != null ? model.focus : {},
            xCursor: model.xCursor,
            yCursor: model.yCursor,
            timezone: model.timezone,
            categoryNames: model.categoryNames,
            showXGridlines: !(model.orientation !== 'HORIZONTAL' && model.type === "CategoryPlot"),
            categoryMargin: model.categoryMargin,
            categoryNamesLabelAngle: model.categoryNamesLabelAngle,
            cumulative: model.cumulative,
            binCount: model.binCount,
            normed: model.normed,
            rangeMin: model.rangeMin,
            rangeMax: model.rangeMax,
            displayMode: model.displayMode != null ? model.displayMode : 'OVERLAP',
            rightClose: model.rightClose,
            tips: model.tips ? model.tips : null,
            tooltips: model.tooltips,
            itemLabels: model.itemLabels
          });
        }
      }else{
        if (model.version === "groovy") {  // model returned from serializer

          newmodel = _.extend(newmodel, {
            mode: model.mode,
            ratio: model.ratio,
            sticky: model.sticky,
            round: model.round,
            valueAccessor: model.valueAccessor
          });
        } else {
          newmodel = _.extend(newmodel, {
            mode: model.mode,
            ratio: model.ratio,
            sticky: model.sticky,
            round: model.round,
            valueAccessor: model.valueAccessor
          });
        }
      }

      return newmodel;
    };

    return {
      lineDasharrayMap : {
        "solid" : "",
        "dash" : "9,5",
        "dot" : "2,2",
        "dashdot" : "9,5,2,5",
        "longdash" : "20,5",
        "" : ""
      },

      remapModel : function(model) {
        // map data entrie to [0, 1] of axis range
        var vrange = model.vrange;
        var xAxisLabel = model.xAxis.label;

        var xAxis = new PlotAxis(model.xAxis.type);

        if (xAxis.axisType === "category") {
          xAxis.setRange(vrange.xl, vrange.xr, model.xAxis.base);
          xAxis.setCategoryNames(model.categoryNames, model.labelsxs);
        } else if (xAxis.axisType === "time" || xAxis.axisType === "nanotime") {
          xAxis.setRange(vrange.xl, vrange.xr, model.timezone);
        } else {
          xAxis.setRange(vrange.xl, vrange.xr, model.xAxis.base);
        }

        if (xAxisLabel != null) {
          xAxis.setLabel(xAxisLabel);
        }
        model.xAxis = xAxis;

        var updateYAxisRange = function(modelAxis, axisVRange){
          if(modelAxis == null || axisVRange == null) { return null; }

          var label = modelAxis.label;

          var axis = new PlotAxis(modelAxis.type);

          if (axis.axisType === "category") {
            axis.setRange(vrange.xl, vrange.xr, model.xAxis.base);
            axis.setCategoryNames(model.categoryNames, model.labelsxs);
          } else if (axis.axisType !== "time") {
            axis.setRange(axisVRange.yl, axisVRange.yr, modelAxis.base);
          } else {
            axis.setRange(axisVRange.yl, axisVRange.yr, modelAxis.timezone);
          }

          if (label != null) {
            axis.setLabel(label);
          }
          axis.axisMarginValL = modelAxis.lowerMargin;
          axis.axisMarginValR = modelAxis.upperMargin;
          return axis;
        };
        model.yAxis = updateYAxisRange(model.yAxis, model.vrange);
        model.yAxisR = updateYAxisRange(model.yAxisR, model.vrangeR);

        var data = model.data;
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          if (item.type === "treemapnode")  continue;

          // map coordinates using percentage
          // tooltips are possibly generated at the same time
          if(plotUtils.useYAxisR(model, item)){
            item.applyAxis(xAxis, model.yAxisR);
          }else{
            item.applyAxis(xAxis, model.yAxis);
          }
        }
        // map focus region
        var focus = model.userFocus;
        if (focus.xl != null) { focus.xl = model.xAxis.getPercent(focus.xl); }
        if (focus.xr != null) { focus.xr = model.xAxis.getPercent(focus.xr); }
        if (focus.yl != null) { focus.yl = model.yAxis.getPercent(focus.yl); }
        if (focus.yr != null) { focus.yr = model.yAxis.getPercent(focus.yr); }
      },

      formatTreeMapModel: function (newmodel) {
        if (newmodel.data == null) {
          newmodel.data = [];
        }
        var data = newmodel.data;
        for (var i = 0; i < data.length; i++) {
          plotFactory.recreatePlotItem(data[i]);
        }
      },

      formatModel: function(newmodel) {
        if (newmodel.xCursor != null) {
          var cursor = newmodel.xCursor;
          if (cursor.color == null) { cursor.color = "black"; }
          if (cursor.width == null) { cursor.width = 1; }
          cursor.stroke_dasharray = this.lineDasharrayMap[cursor.style];
        }
        if (newmodel.yCursor != null) {
          var cursor = newmodel.yCursor;
          if (cursor.color == null) { cursor.color = "black"; }
          if (cursor.width == null) { cursor.width = 1; }
          cursor.stroke_dasharray = this.lineDasharrayMap[cursor.style];
        }
        var logx = newmodel.xAxis.type === "log",
            logxb = newmodel.xAxis.base,
            logy = newmodel.yAxis.type === "log",
            logyb = newmodel.yAxis.base,
            logyR = newmodel.yAxisR && newmodel.yAxisR.type === "log",
            logybR = newmodel.yAxisR && newmodel.yAxisR.base;

        if (newmodel.orientation === 'HORIZONTAL'){
          var temp = newmodel.xAxis;
          newmodel.xAxis = newmodel.yAxis;
          newmodel.yAxis = temp;
        }

        if (newmodel.data == null) { newmodel.data = []; }
        var data = newmodel.data;
        for (var i = 0; i < data.length; i++) {
          var item = data[i], eles = item.elements;

          var eles = item.elements;

          if (item.type !== "treemapnode") {
            var useYAxisR = plotUtils.useYAxisR(newmodel, item);
            var itemlogy = useYAxisR ? logyR : logy;
            var itemlogyb = useYAxisR ? logybR : logyb;
          }

          if (eles == null) eles = [];

          item.showItem = true;

          if (item.type == null) {
            item.type = "line";
          }

          if(item.type === "bar" || item.type === "area") {
            //newmodel.yPreventNegative = true; // prevent move to y < 0
          }

          if(item.type === "line" || item.type === "constline") {
            if (item.color == null) {
              item.color = "black";
            }
            if (item.style == null) {
              item.style = "solid";
            }
            item.stroke_dasharray = this.lineDasharrayMap[item.style];
          }

          if(item.type === "line" || item.type === "area") {
            if (item.interpolation === "curve") {
            }
          }

          if (item.type === "line" || item.type === "stem") {
            if (item.width == null) {
              item.width = 2;
            }
          }
          if (item.type === "bar" && item.width == null) {
            item.width = 1;
          }

          if (item.type === "point") {
            if (item.shape == null) {
              item.shape = "rect";
            }
            if (item.size == null) {
              item.size = item.shape === "rect" ? 8 : 5;
            }
          }

          if (item.type === "constline" || item.type === "constband") {
            if (item.color == null) {
              item.color = "black";
            }
          }

          if (item.useToolTip == null) {
            if (newmodel.useToolTip === true) {
              item.useToolTip = true;
            }
          }

          if (item.colorOpacity != null) {
            item.color_opacity = item.colorOpacity;
            delete item.colorOpacity;
          }
          if (item.outlineColor != null) {
            item.stroke = item.outlineColor;
            delete item.outlineColor;
          }
          if (item.outlineWidth != null) {
            item.stroke_width = item.outlineWidth;
            delete item.outlineWidth;
          }
          if (item.outlineOpacity != null) {
            item.stroke_opacity = item.outlineOpacity;
            delete item.outlineOpacity;
          }

          if (item.color_opacity == null) {
            item.color_opacity = 1.0; // default show fully
          }
          if (item.stroke_opacity == null) {
            // default show based on whether stroke is set
            item.stroke_opacity = item.stroke == null ? 0.0 : 1.0;
          }

          for (var j = 0; j < eles.length; j++) {
            var ele = eles[j];

            if(item.type === "stem") {
              ele.stroke_dasharray = this.lineDasharrayMap[ele.style];
            }

            if (ele.outlineColor != null) {
              ele.stroke = ele.outlineColor;
              delete ele.outlineColor;
            }
            if (ele.outlineWidth != null) {
              ele.stroke_width = ele.outlineWidth;
              delete ele.outlineWidth;
            }
            if (ele.outlineOpacity != null) {
              ele.stroke_opacity = ele.outlineOpacity;
              delete ele.outlineOpacity;
            }

            if (item.type === "bar" && ele.x2 == null) {
              ele.x = plotUtils.minus(ele.x, item.width / 2);
              ele.x2 = plotUtils.plus(ele.x, item.width);
            }
            if ((item.type === "area" || item.type === "bar" || item.type === "stem")
              && ele.y2 == null) {
              if (item.height != null) {
                ele.y2 = ele.y + item.height;
              } else if (item.base != null) {
                ele.y2 = item.base;
              } else {
                ele.y2 = itemlogy ? 1 : 0;
              }
            }

            if (item.type === "point" && ele.size == null) {
              if (item.size != null) {
                ele.size = item.size;
              } else {
                ele.size = item.shape === "rect" ? 8 : 5;
              }
            }

            if (item.type === "area") {
              if (item.interpolation == null) {
                item.interpolation = "linear";
              }
            }
            // swap y, y2
            if (ele.y != null && ele.y2 != null && ele.y > ele.y2) {
              var temp = ele.y;
              ele.y = ele.y2;
              ele.y2 = temp;
            }

            if (ele.x != null) {
              ele._x = ele.x;
              if (logx) {
                ele.x = Math.log(ele.x) / Math.log(logxb);
              }
            }
            if (ele.x2 != null) {
              ele._x2 = ele.x2;
              if (logx) {
                ele.x2 = Math.log(ele.x2) / Math.log(logxb);
              }
            }
            if (ele.y != null) {
              ele._y = ele.y;
              if (itemlogy) {
                ele.y = Math.log(ele.y) / Math.log(itemlogyb);
              }
            }
            if (ele.y2 != null) {
              ele._y2 = ele.y2;
              if (itemlogy) {
                ele.y2 = Math.log(ele.y2) / Math.log(itemlogyb);
              }
            }

            if (newmodel.orientation === 'HORIZONTAL'){
              var temp = {
                x: ele.y,
                x2: ele.y2,
                y: ele.x,
                y2: ele.x2
              };

              ele.x = temp.x;
              ele.x2 = temp.x2;
              ele.y = temp.y;
              ele.y2 = temp.y2;

              ele._x = ele.x;
              ele._x2 = ele.x2;
              ele._y = ele.y;
              ele._y2 = ele.y2;

              if (item.type === 'stem'){
                ele.y2 = ele.y;
                ele._y2 = ele._y;
              }
            }
          }

          if (newmodel.orientation === 'HORIZONTAL'){
            var temp =  item.x;
            item.x = item.y;
            item.y = temp;
          }

          // recreate rendering objects
          item.index = i;
          item.id = "i" + i;

          data[i] = plotFactory.createPlotItem(item, newmodel.lodThreshold);
        }

        // apply log to focus
        var focus = newmodel.userFocus;
        if (logx) {
          if (focus.xl != null) {
            focus.xl = Math.log(focus.xl) / Math.log(logxb);
          }
          if (focus.xr != null) {
            focus.xr = Math.log(focus.xr) / Math.log(logxb);
          }
        }
        if (logy) {
          if (focus.yl != null) {
            focus.yl = Math.log(focus.yl) / Math.log(logyb);
          }
          if (focus.yr != null) {
            focus.yr = Math.log(focus.yr) / Math.log(logyb);
          }
        }
      },

      sortModel: function(model) {
        var data = model.data;
        for (var i = 0; i < data.length; i++) {
          var item = data[i];
          if (item.type === "treemapnode" || item.type === "constline" || item.type === "constband" || item.type === "heatmap") { continue; }

          var eles = item.elements;
          var unordered = false;
          for (var j = 1; j < eles.length; j++) {
            if (plotUtils.lt(eles[j].x, eles[j - 1].x)) {
              unordered = true;
              break;
            }
          }
          if (unordered === true) {
            if (item.type === "bar" || item.type === "stem" ||
            item.type === "point" || item.type === "text") {
              eles.sort(function(a, b) {
                plotUtils.minus(a.x, b.x);
              });
            } else {
              item.isUnorderedItem = true;
            }
          }
        }
      },

      standardizeModel : function(_model, prefs) {
        var model = {};
        $.extend(true, model, _model); // deep copy model to prevent changing the original JSON

        if (model.graphics_list != null) {
          model.version = "groovy";  // TODO, a hack now to check DS source
        }
        if (model.version === "complete") { // skip standardized model in combined plot
          return model;
        } else if (model.version === "groovy") {
        } else {
          model.version = "direct";
        }
        var newmodel = createNewModel(model);

        newmodel.lodThreshold = (model.lodThreshold) ?
          model.lodThreshold : (prefs !== undefined && prefs.lodThreshold !== undefined ? prefs.lodThreshold : 4000) ;

        newmodel.data = [];

        if (model.version === "groovy") {
          switch(model.type){
            case 'HeatMap':
              heatmapConverter.convertGroovyData(newmodel, model);
              break;
            default:
              plotConverter.convertGroovyData(newmodel, model);
              break;
          }
        } else {  // DS generated directly
          _.extend(newmodel, model);
        }

        if (model.type === 'TreeMap') {
          this.formatTreeMapModel(newmodel);
        } else {
          this.formatModel(newmodel); // fill in null entries, compute y2, etc.
          this.sortModel(newmodel);

          // at this point, data is in standard format (log is applied as well)

          var yAxisData = [], yAxisRData = [];
          for (var i = 0; i < newmodel.data.length; i++) {
            var item = newmodel.data[i];
            if(newmodel.showLegend == null && item.legend){
                newmodel.showLegend = true;
            }
            if(plotUtils.useYAxisR(newmodel, item)){
              yAxisRData.push(item);
            }else{
              yAxisData.push(item);
            }
          }

          newmodel.showLegend = newmodel.showLegend != null ? newmodel.showLegend : false;

          var range = plotUtils.getDataRange(yAxisData).datarange;
          var rangeR = _.isEmpty(yAxisRData) ? null : plotUtils.getDataRange(yAxisRData).datarange;

          var applyMargins = function (range, axis) {
            axis.lowerMargin = axis.lowerMargin || 0;
            axis.upperMargin = axis.upperMargin || 0;

            var span = range.yr - range.yl;
            range.yl -= axis.lowerMargin * span;
            range.yr += axis.upperMargin * span;
            range.yspan = range.yr - range.yl;
            return range;
          };
          range = applyMargins(range, newmodel.yAxis);
          if (rangeR) {
            rangeR = applyMargins(rangeR, newmodel.yAxisR);
          }

          if (newmodel.yIncludeZero === true && range.yl > 0) {
            range.yl = 0;
            range.yspan = range.yr - range.yl;
          }
          if (rangeR && newmodel.yRIncludeZero === true && rangeR.yl > 0) {
            rangeR.yl = 0;
            rangeR.yspan = rangeR.yr - rangeR.yl;
          }

          var margin = newmodel.margin;
          if (margin.bottom == null) { margin.bottom = .05; }
          if (margin.top == null) { margin.top = .05; }
          if (margin.left == null) { margin.left = .05; }
          if (margin.right == null) { margin.right = .05; }

          if (newmodel.vrange == null) {
            // visible range initially is 10x larger than data range by default
            var getModelRange = function(r, logx, logy){
              if (r == null) { return null; }
              var result = {
                xl: plotUtils.minus(r.xl, r.xspan * 10.0),
                xr: plotUtils.plus(r.xr, r.xspan * 10.0),
                yl: r.yl - r.yspan * 10.0,
                yr: r.yr + r.yspan * 10.0
              };
              if(logx){
                result.xl = Math.max(result.xl, r.xl - newmodel.margin.left * r.xspan);
              }
              if(logy){
                result.yl = Math.max(result.yl, r.yl - newmodel.margin.left * r.yspan);
              }
              return result;
            };
            newmodel.vrange = getModelRange(range, newmodel.xAxis.type === "log", newmodel.yAxis.type === "log");
            if(newmodel.yAxisR){
              newmodel.vrangeR = getModelRange(rangeR, newmodel.xAxis.type === "log", newmodel.yAxisR.type === "log");
            }

            var vrange = newmodel.vrange;
            var vrangeR = newmodel.vrangeR;

            if (newmodel.yPreventNegative === true) {
              vrange.yl = Math.min(0, range.yl);
            }

            var focus = newmodel.userFocus; // allow user to overide vrange
            if (focus.xl != null) { vrange.xl = Math.min(focus.xl, vrange.xl); }
            if (focus.xr != null) { vrange.xr = Math.max(focus.xr, vrange.xr); }
            if (focus.yl != null) { vrange.yl = Math.min(focus.yl, vrange.yl); }
            if (focus.yr != null) { vrange.yr = Math.max(focus.yr, vrange.yr); }

            var updateRangeSpan = function(r) {
              if (r) {
                r.xspan = plotUtils.minus(r.xr, r.xl);
                r.yspan = r.yr - r.yl;
              }
            };
            updateRangeSpan(vrange);
            updateRangeSpan(vrangeR);
          }

          this.remapModel(newmodel);
        }
        newmodel.version = "complete";
        return newmodel;
      }
    };
  };
  beakerRegister.bkoFactory('plotFormatter',
    ["bkUtils", 'plotConverter', 'heatmapConverter', 'PlotAxis', 'plotFactory', 'plotUtils', retfunc]);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/


(function() {
  'use strict';
  var retfunc = function(bkUtils, plotFormatter, plotUtils) {
    return {
      standardizeModel : function(model, prefs) {
        var newmodel = {
          title : model.title,
          plots : []
        };
        var version;
        if (model.version === "groovy") {
          version = "groovy";
        } else {
          version = "direct";
        }

        var width, height;
        var showLegend, useToolTip;
        if (version === "groovy") {
          newmodel.xAxisLabel = model.x_label;
          newmodel.yAxisLabel = model.y_label;
          width = model.init_width;
          height = model.init_height;
          showLegend = model.show_legend;
          useToolTip = model.use_tool_tip;
        } else if (version === "direct"){
          width = model.width;
          height = model.height;
          showLegend = model.showLegend;
          useToolTip = model.useToolTip;
        }

        if (width == null) { width = 1200; }
        if (height == null) { height = 600; }

        newmodel.plotSize = {
          "width" : width,
          "height" : height
        };

        var plotType = model.plot_type;
        if (plotType == null) { plotType = "Plot"; }

        var layout = {
          bottomLayoutMargin : 30
        };
        var sumweights = 0;
        var sumvmargins = 0;
        var vmargins = [];
        var weights = model.weights == null ? [] : model.weights;
        for(var i = 0; i < model.plots.length; i++) {
          if(weights[i] == null) {
            weights[i] = 1;
          }
          sumweights += weights[i];
          if (i < model.plots.length - 1) {  //add margins for correct height calculation
            vmargins[i] = layout.bottomLayoutMargin;
            sumvmargins += vmargins[i];
          } else {
            vmargins[i] = layout.bottomLayoutMargin + plotUtils.fonts.labelHeight * 2;
            sumvmargins += vmargins[i];
          }
        }
        var plots = model.plots;
        for(var i = 0; i < plots.length; i++) {
          var plotmodel = plots[i];

          if (plotmodel.version == null) { plotmodel.version = version; }
          if (plotmodel.showLegend == null) { plotmodel.showLegend = showLegend; }
          if (plotmodel.useToolTip == null) { plotmodel.useToolTip = useToolTip; }

          plotmodel.type = plotType;
          var newplotmodel = plotFormatter.standardizeModel(plotmodel, prefs);

          if (i < plots.length - 1) {  // turn off x coordinate labels
            newplotmodel.xAxis.label = null;
            newplotmodel.xAxis.showGridlineLabels = false;
          } else {
            newplotmodel.xAxis.label = newmodel.xAxisLabel;
          }

          newplotmodel.plotSize.width = width;

          newplotmodel.plotSize.height = (height - sumvmargins) * weights[i] / sumweights + vmargins[i];

          newmodel.plots.push(newplotmodel);
        }
        return newmodel;
      }
    };
  };
  beakerRegister.bkoFactory('combinedplotFormatter', ["bkUtils", "plotFormatter", "plotUtils", retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


(function () {
	'use strict';
	var retfunc = function () {
		return {

			extend: function (scope, element, attrs) {

				// rendering code
				element.find(".plot-plotcontainer").resizable({
					maxWidth: element.width(), // no wider than the width of the cell
					minWidth: 450,
					minHeight: 150,
					handles: "e, s, se",
					resize: function (event, ui) {
						scope.width = ui.size.width;
						scope.height = ui.size.height;
						_(scope.plotSize).extend(ui.size);

						scope.jqsvg.css({"width": scope.width, "height": scope.height});
						scope.jqplottitle.css({"width": scope.width});
						scope.emitSizeChange();
						scope.legendDone = false;
						scope.legendResetPosition = true;

						scope.update();
					}
				});

				scope.calcRange = function(){

				};


				scope.calcLegendableItem = function() {
					scope.legendableItem = 0;
					var visitor = {
						i: 0,
						visit: function (node) {
							if (node.legend){
								scope.legendableItem++;
							}
						}
					};
					scope.stdmodel.process(visitor);
				};

				scope.init = function () {

					// first standardize data
					scope.standardizeData();
					// init flags
					scope.initFlags();

					scope.plotSize = {};

					_.extend(scope.plotSize, scope.stdmodel.plotSize);
					var savedstate = scope.model.getDumpState();
					if (savedstate !== undefined && savedstate.plotSize !== undefined) {
						scope.loadState(savedstate);
					} else {
					  if (scope.setDumpState !== undefined) {
						scope.setDumpState(scope.dumpState());
					  }
					}

					// create layout elements
					scope.initLayout();

					scope.resetSvg();

					scope.update();
				};

				scope.update = function (first) {
					if (scope.model.isShowOutput !== undefined && scope.model.isShowOutput() === false) {
						return;
					}
					scope.resetSvg();
					scope.renderData();
					scope.renderLegends(); // redraw
					scope.updateMargin(); //update plot margins
					scope.calcLegendableItem();
				};

				scope.initLayout = function () {
					var model = scope.stdmodel;

					element.find(".ui-icon-gripsmall-diagonal-se")
						.removeClass("ui-icon-gripsmall-diagonal-se")
						.addClass("ui-icon-grip-diagonal-se");

					// hook container to use jquery interaction
					scope.container = d3.select(element[0]).select(".plot-plotcontainer");
					scope.jqcontainer = element.find(".plot-plotcontainer");
					scope.jqlegendcontainer = element.find("#plotLegendContainer");
					scope.svg = d3.select(element[0]).select(".plot-plotcontainer svg");
					scope.jqsvg = element.find("svg");
					scope.canvas = element.find("canvas")[0];

					scope.canvas.style.display = "none";

					var plotSize = scope.plotSize;
					scope.jqcontainer.css(plotSize);
					scope.jqsvg.css(plotSize);

					$(window).resize(scope.resizeFunction);

					// set title
					scope.jqplottitle = element.find("#plotTitle");
					scope.jqplottitle.text(model.title).css("width", plotSize.width);

					scope.maing = d3.select(element[0]).select("#maing");
					scope.gridg = d3.select(element[0]).select("#gridg");
					scope.labelg = d3.select(element[0]).select("#labelg");

					// set some constants

					scope.renderFixed = 1;
					scope.layout = {    // TODO, specify space for left/right y-axis, also avoid half-shown labels
						bottomLayoutMargin: 30,
						topLayoutMargin: 0,
						leftLayoutMargin: 80,
						rightLayoutMargin: scope.stdmodel.yAxisR ? 80 : 0,
						legendMargin: 10,
						legendBoxSize: 10
					};

					scope.labelPadding = {
						x: 10,
						y: 10
					};

					scope.locateBox = null;
					scope.cursor = {
						x: -1,
						y: -1
					};

					scope.legendResetPosition = true;

					scope.$watch("model.getWidth()", function (newWidth) {
						if (scope.width == newWidth) {
							return;
						}
						scope.width = newWidth;
						scope.jqcontainer.css("width", newWidth);
						scope.jqsvg.css("width", newWidth);
						scope.legendDone = false;
						scope.legendResetPosition = true;
						scope.update();
					});

					scope.$watch('model.isShowOutput()', function (prev, next) {
						if (prev !== next) {
							scope.update();
						}
					});

					$("<div></div>").appendTo(scope.jqlegendcontainer)
						.attr("id", "tooltip")
						.attr("class", "plot-tooltip")
						.attr("style", "visibility: hidden");
					scope.tooltip = d3.select(element[0]).select("#tooltip");
				};

				scope.dumpState = function () {
					var state = {};

					state.showAllItems = scope.showAllItems;
					state.plotSize = scope.plotSize;
					state.showItem = [];
					var data = scope.stdmodel.data;
					for (var i = 0; i < data.length; i++) {
						state.showItem[i] = data[i].showItem;
					}
					state.visibleItem = scope.visibleItem;
					state.legendableItem = scope.legendableItem;
					return state;
				};

				scope.loadState = function (state) {
					scope.showAllItems = state.showAllItems;
					scope.plotSize = state.plotSize;
					var data = scope.stdmodel.data;
					for (var i = 0; i < data.length; i++) {
						data[i].showItem = state.showItem[i];
					}
					scope.visibleItem = state.visibleItem;
					scope.legendableItem = state.legendableItem;
				};

				scope.initFlags = function () {
					scope.showAllItems = true;
				};
			}
		};
	};
	beakerRegister.bkoFactory('bkoChartExtender',
		[retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
  'use strict';
  var count = 0;
  var retfunc = function() {

    var GradientLegend = function(data) {
      this.id = count++;
      this.data = _.extend({}, data);
      this.layout = {
        labelHPadding: 5,
        labelVPadding: 15,
        tickSize: 5,
        legendWidth: 350, //TODO can change it from outside?
        legendHeight: 60,
        colorboxHeight: 20,
        axisPadding: 10,
        histHeight: 7
      };
    };

    GradientLegend.prototype.makeGradient = function(colors) {
      var gradient = this.legend.append("defs")
        .append("linearGradient")
        .attr("id", "gradient" + this.id)
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%")
        .attr("spreadMethod", "pad");
      var colorPctStep = 100 / (colors.length - 1);
      for(var i = 0; i< colors.length; i++){
        gradient.append("stop")
          .attr("offset", colorPctStep * i  + "%")
          .attr("stop-color", colors[i])
          .attr("stop-opacity", 1);
      }
    };

    GradientLegend.prototype.drawAxis = function(){
      var labelsCount = 6; //TODO need to calculate labels count
      var ticks;
      var axislines = [];
      var axislabels = [];
      var axisliney = this.layout.colorboxHeight + this.layout.axisPadding;


      axislines.push({
        id: "legend-axis",
        class: "plot-legend-axis",
        x1: 0,
        x2: this.layout.legendWidth,
        y1: axisliney,
        y2: axisliney
      });

      //base ticks
      axislines.push({
        id: "legend-tick-left",
        class: "plot-legend-tick",
        x1: 0,
        x2: 0,
        y1: axisliney,
        y2: axisliney - this.layout.tickSize
      });
      axislines.push({
        id: "legend-tick-right",
        class: "plot-legend-tick",
        x1: this.layout.legendWidth,
        x2: this.layout.legendWidth,
        y1: axisliney,
        y2: axisliney - this.layout.tickSize
      });

      //ticks and labels
      var axis = d3.scale.linear().range([0, this.layout.legendWidth]);
      axis.domain([this.data[0].minValue, this.data[0].maxValue]);
      ticks = axis.ticks(labelsCount);

      var first = axis(ticks[0]);
      var step = axis(ticks[1]) - axis(ticks[0]);

      function getTickX(index) {
        return first + index * step;
      }

      for(var i = 0; i < ticks.length; i++){
        axislines.push({
          id: "legend-tick-" + i,
          class: "plot-legend-tick",
          x1: getTickX(i),
          x2: getTickX(i),
          y1: axisliney,
          y2: axisliney + this.layout.tickSize
        });
        axislabels.push({
          id: "legend-tick-text-" + i,
          class: "plot-legend-label",
          x: getTickX(i),
          y: axisliney + this.layout.labelVPadding,
          dy: ".35em",
          text: ticks[i],
          "text-anchor": "middle"
        });
      }

      //min and max value labels
      axislabels.push({
        id: "legend-min-text",
        class: "plot-legend-label",
        x: -this.layout.labelHPadding,
        y: axisliney,
        text: this.data[0].minValue.toFixed(4) * 1,
        "text-anchor": "end",
        "dominant-baseline": "central"
      });
      axislabels.push({
        id: "legend-max-text",
        class: "plot-legend-label",
        x: this.layout.legendWidth + this.layout.labelHPadding,
        y: axisliney,
        text: this.data[0].maxValue.toFixed(4) * 1,
        "text-anchor": "start",
        "dominant-baseline": "central"
      });

      this.legend.selectAll("line").remove();
      this.legend.selectAll("line")
        .data(axislines, function(d) { return d.id; }).enter().append("line")
        .attr("id", function(d) { return d.id; })
        .attr("class", function(d) { return d.class; })
        .attr("x1", function(d) { return d.x1; })
        .attr("x2", function(d) { return d.x2; })
        .attr("y1", function(d) { return d.y1; })
        .attr("y2", function(d) { return d.y2; });
      this.legend.selectAll("text").remove();
      this.legend.selectAll("text")
        .data(axislabels, function(d) { return d.id; }).enter().append("text")
        .attr("id", function(d) { return d.id; })
        .attr("x", function(d) { return d.x; })
        .attr("y", function(d) { return d.y; })
        .attr("dy", function(d) { return d.dy; })
        .style("text-anchor", function(d) { return d["text-anchor"]; })
        .style("dominant-baseline", function(d) { return d["dominant-baseline"]; })
        .text(function(d) { return d.text; });
    };

    GradientLegend.prototype.drawHistogram = function() {

      //create histogram data
      var flatValues = [];
      var elements = this.data[0].elements;
      for (var i = 0; i < elements.length; i++) {
        flatValues.push(elements[i].value);
      }
      var histValues = d3.layout.histogram().bins(100)(flatValues);
      var min = histValues[0].y, max = min;
      for (var i = 0; i < histValues.length; i++) {
        min = Math.min(min, histValues[i].y);
        max = Math.max(max, histValues[i].y);
      }

      // the x-scale parameters
      var x = d3.scale.linear()
        .domain([this.data[0].minValue, this.data[0].maxValue])
        .range([0, this.layout.legendWidth]);

      // the y-scale parameters
      var axisliney = this.layout.colorboxHeight + this.layout.axisPadding;
      var y = d3.scale.linear()
        .domain([min, max])
        .range([axisliney, axisliney - this.layout.histHeight]);

      var yreflected = d3.scale.linear()
        .domain([min, max])
        .range([axisliney, axisliney + this.layout.histHeight]);

      var createArea = function(yScale) {
        return d3.svg.area()
          .x(function(d) { return x(d.x + d.dx / 2); })
          .y0(axisliney)
          .y1(function(d) { return yScale(d.y); });
      };

      this.legend.append("path")
        .datum(histValues)
        .attr("class", "plot-legend-histogram")
        .attr("d", createArea(y));
      this.legend.append("path")
        .datum(histValues)
        .attr("class", "plot-legend-histogram")
        .attr("d", createArea(yreflected));
    };

    GradientLegend.prototype.drawPointer = function(pos) {
      var size = 32;
      var arc = d3.svg.symbol().type('triangle-down').size(size);

      var height = Math.sqrt(size * Math.sqrt(3));
      var data = [{x: pos, y: this.layout.colorboxHeight + this.layout.axisPadding - height / 2}];

      var x = d3.scale.linear()
        .domain([this.data[0].minValue, this.data[0].maxValue])
        .range([0, this.layout.legendWidth]);

      this.legend.selectAll('.legend-pointer').remove();
      this.legend.selectAll('.legend-pointer')
        .data(data)
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('class', 'legend-pointer')
        .attr('fill', '#333333')
        .attr('stroke', '#333333')
        .attr('stroke-width', 1)
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + d.y + ")"; });
    };

    GradientLegend.prototype.removePointer = function() {
      this.legend.selectAll('.legend-pointer').remove();
    };

    GradientLegend.prototype.render = function(legendContainer, colors) {
      var legendSvg = d3.select(legendContainer[0]).append("svg")
        .attr("id", "legends")
        .attr('xmlns', 'http://www.w3.org/2000/svg')
        .attr("height", this.layout.legendHeight);
      this.legend = legendSvg
        .append("g")
        .attr("transform", "translate(0.5, 0.5)");
  
      this.makeGradient(colors);
  
      this.legend.append("rect")
        .attr("width", this.layout.legendWidth)
        .attr("height", this.layout.colorboxHeight)
        .style("fill", "url(/beaker/#gradient" + this.id + ")");

      this.drawHistogram();
      this.drawAxis();
  
      legendSvg.attr("width", this.legend[0][0].getBBox().width);
      var minValueLabelWidth = this.legend.selectAll("#legend-min-text")[0][0].getBBox().width + this.layout.labelHPadding;
      this.legend.style("transform", "translate(" + minValueLabelWidth + "px, 0px)");
    };
    
    return GradientLegend;
  };
  beakerRegister.bkoFactory('GradientLegend', retfunc);
})();

/*
*  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*         http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*/

/*
 * bkoPlot
 * This is the output display component for displaying xyChart
 */

( function() {
  'use strict';
  var retfunc = function(plotUtils,
                         plotTip,
                         plotFormatter,
                         plotFactory,
                         bkCellMenuPluginManager,
                         bkSessionManager,
                         bkUtils,
                         GradientLegend,
                         bkoChartExtender,
                         plotService,
                         $compile) {
    var CELL_TYPE = "bko-plot";
    return {
      template :
          "<canvas></canvas>" +
          "<div id='plotTitle' class='plot-title'></div>" +
          "<div id='plotLegendContainer' class='plot-plotlegendcontainer' oncontextmenu='return false;'>" +
          "<div class='plot-plotcontainer' oncontextmenu='return false;'>" +
          "<svg id='svgg'>"  +
          "<defs>" +
            "<marker id='Triangle' class='text-line-style' viewBox='0 0 10 10' refX='1' refY='5' markerWidth='6' markerHeight='6' orient='auto'>" +
            "<path d='M 0 0 L 10 5 L 0 10 z' />" +
            "</marker>" +
            "<filter id='svgfilter'>" +
              "<feGaussianBlur result='blurOut' in='SourceGraphic' stdDeviation='1' />" +
              "<feBlend in='SourceGraphic' in2='blurOut' mode='normal' />" +
            "</filter>" +
            "<filter id='svgAreaFilter'>" +
              "<feMorphology operator='dilate' result='blurOut' in='SourceGraphic' radius='2' />" +
              "<feBlend in='SourceGraphic' in2='blurOut' mode='normal' />" +
            "</filter>" +
          "</defs>" +
          "<g id='gridg'></g>" +
          "<g id='maing'></g>" +
          "<g id='labelg'></g> " +
          "</svg>" +
          "</div>" +
          "</div>",
      controller : function($scope) {
        $scope.getShareMenuPlugin = function() {
          return bkCellMenuPluginManager.getPlugin(CELL_TYPE);
        };
        $scope.$watch("getShareMenuPlugin()", function() {
          var newItems = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
          $scope.model.resetShareMenuItems(newItems);
        });
        
        function modelHasPlotSpecificMethods(model) {
          return model.getSvgToSave && model.saveAsSvg && model.saveAsPng && model.updateLegendPosition;
        }

        $scope.fillCellModelWithPlotMethods = function () {
          var model = $scope.model.getCellModel();
          if(modelHasPlotSpecificMethods(model)) {
            return;
          }
          model.getSvgToSave = function () {
            return $scope.getSvgToSave();
          };
          model.saveAsSvg = function () {
            return $scope.saveAsSvg();
          };
          model.saveAsPng = function () {
            return $scope.saveAsPng();
          };
          model.updateLegendPosition = function () {
            return $scope.updateLegendPosition();
          };
        };
        $scope.$watch("model.getCellModel()", function () {
          $scope.fillCellModelWithPlotMethods();
        });
        $scope.fillCellModelWithPlotMethods();
      },
      link : function(scope, element, attrs) {
        // rendering code
        element.find(".plot-plotcontainer").resizable({
          maxWidth : element.width(), // no wider than the width of the cell
          minWidth : 450,
          minHeight: 150,
          handles : "e, s, se",
          resize : function(event, ui) {
            scope.width = ui.size.width;
            scope.height = ui.size.height;
            _.extend(scope.plotSize, ui.size);
            if (scope.setDumpState !== undefined) {
              scope.setDumpState(scope.dumpState());
            }

            scope.jqsvg.css({"width": scope.width, "height": scope.height});
            scope.jqplottitle.css({"width": scope.width });
            scope.numIntervals = {
              x: scope.width / scope.intervalStepHint.x,
              y: scope.height / scope.intervalStepHint.y
            };
            scope.calcRange();
            scope.calcMapping(false);
            scope.emitSizeChange();
            scope.legendDone = false;
            scope.legendResetPosition = true;

            scope.update();
          }
        });


        scope.resizeFunction = function() {
          // update resize maxWidth when the browser window resizes
          var width = element.width();
          scope.jqcontainer.resizable({
            maxWidth : width
          });
        };

        scope.id = 'bko-plot-' + bkUtils.generateId(6);
        element.find('.plot-plotcontainer').attr('id', scope.id);
        element.find('.plot-title').attr('class', 'plot-title ' + 'plot-title-' + scope.id);

        if (!scope.model.disableContextMenu) {
          $.contextMenu({
            selector: '#' + scope.id,
            zIndex: 3,
            items: plotUtils.getSavePlotAsContextMenuItems(scope) 
          });
        }

        scope.initLayout = function() {
          var model = scope.stdmodel;
          
          if(scope.model.getCellModel().x_tickLabels_visible !== undefined){
            model.xAxis.showGridlineLabels = scope.model.getCellModel().x_tickLabels_visible;
          }
            
          if(scope.model.getCellModel().y_tickLabels_visible !== undefined){
            model.yAxis.showGridlineLabels = scope.model.getCellModel().y_tickLabels_visible;
          }

          element.find(".ui-icon-gripsmall-diagonal-se")
            .removeClass("ui-icon-gripsmall-diagonal-se")
            .addClass("ui-icon-grip-diagonal-se");

          // hook container to use jquery interaction
          scope.container = d3.select(element[0]).select(".plot-plotcontainer");
          scope.jqcontainer = element.find(".plot-plotcontainer");
          scope.jqlegendcontainer = element.find("#plotLegendContainer");
          scope.svg = d3.select(element[0]).select(".plot-plotcontainer svg");
          scope.jqsvg = element.find("#svgg");
          scope.canvas = element.find("canvas")[0];

          scope.canvas.style.display="none";

          var plotSize = scope.plotSize;
          scope.jqcontainer.css(plotSize);
          scope.jqsvg.css(plotSize);

          $(window).resize(scope.resizeFunction);

          // Apply  advanced custom styles set directly by user
          if(model['customStyles']) {
              $("<style>"+model['customStyles'].map(function(s) { 
                  return "#" + scope.id + ' ' + s; 
              }).join('\n') + "\n</style>").prependTo(element.find('.plot-plotcontainer'));
          }

          // set title
          scope.jqplottitle = element.find("#plotTitle");
          scope.jqplottitle.text(model.title).css("width", plotSize.width);

          // Apply any specific element styles (labelStyle,elementStyle, etc)
          if(model['elementStyles']) {
              var styles = [];
              for(var style in model['elementStyles']) {
                  styles.push('#' + scope.id + ' ' + style + ' { ' + model['elementStyles'][style] + '}');
              }
              $("<style>\n" + styles.join('\n') + "\n</style>").prependTo(element.find('.plot-plotcontainer'));

              // Title style has to be handlded separately because it sits in a separate
              // div outside the hierachy the rest of the plot is in
              if(model['elementStyles']['.plot-title']) {
                  $("<style>\n" + '.plot-title-' + scope.id + ' { ' + 
                          model['elementStyles']['.plot-title'] + 
                          "}\n</style>").prependTo(element.find('.plot-title-' + scope.id));
              }
          }

          scope.maing = d3.select(element[0]).select("#maing");
          scope.gridg = d3.select(element[0]).select("#gridg");
          scope.labelg = d3.select(element[0]).select("#labelg");

          scope.jqgridg = element.find("#gridg");

          // set some constants

          scope.renderFixed = 1;
          scope.layout = {    // TODO, specify space for left/right y-axis, also avoid half-shown labels
            bottomLayoutMargin : 30,
            topLayoutMargin : 0,
            leftLayoutMargin : calcVertLayoutMargin(scope.stdmodel.yAxis),
            rightLayoutMargin : scope.stdmodel.yAxisR ? calcVertLayoutMargin(scope.stdmodel.yAxisR) : 0,
            legendMargin : 10,
            legendBoxSize : 10
          };
          scope.zoomLevel = {
            minSpanX : 1E-12,
            minSpanY : 1E-12,
            maxScaleX : 1E9,
            maxScaleY : 1E9
          };
          scope.labelPadding = {
            x : 10,
            y : 10
          };
          scope.intervalStepHint = {
            x : scope.model.getCellModel().type === 'NanoPlot' ? 130 : 75,
            y : 30
          };
          if(scope.stdmodel.orientation === 'HORIZONTAL'){
            var tempx = scope.intervalStepHint.x;
            scope.intervalStepHint.x = scope.intervalStepHint.y;
            scope.intervalStepHint.y = tempx;
          }
          scope.numIntervals = {
            x: parseInt(plotSize.width) / scope.intervalStepHint.x,
            y: parseInt(plotSize.height) / scope.intervalStepHint.y
          };
          scope.locateBox = null;
          scope.cursor = {
            x : -1,
            y : -1
          };

          scope.gridlineTickLength = 3;
          
          var factor = 2.0;
          if (model.xAxis.label == null) { factor -= 1.0; }
          if (model.xAxis.showGridlineLabels === false) { factor -= 1.0; }
          scope.layout.bottomLayoutMargin += plotUtils.fonts.labelHeight * factor;

          if (model.yAxis.showGridlineLabels !== false) {
            scope.layout.topLayoutMargin += plotUtils.fonts.labelHeight / 2;
          }

          if (model.yAxis.label != null) {
            scope.layout.leftLayoutMargin += plotUtils.fonts.labelHeight;
          }
          if(model.yAxisR != null) {
            scope.layout.rightLayoutMargin += plotUtils.fonts.labelHeight;
          }
          scope.legendResetPosition = true;

          scope.$watch("model.getFocus()", function(newFocus) {
            if (newFocus == null) { return; }
            scope.focus.xl = newFocus.xl;
            scope.focus.xr = newFocus.xr;
            scope.focus.xspan = newFocus.xr - newFocus.xl;
            scope.calcMapping(false);
            scope.update();
          });
          scope.$watch("model.getWidth()", function(newWidth) {
            if (scope.width == newWidth) { return; }
            scope.width = newWidth;
            scope.jqcontainer.css("width", newWidth );
            scope.jqsvg.css("width", newWidth );
            scope.calcMapping(false);
            scope.legendDone = false;
            scope.legendResetPosition = true;
            scope.update();
          });
          scope.$watch('model.isShowOutput()', function(prev, next) {
            if (prev !== next) {
              scope.update();
            }
          });
        };

        function measureText(pText, pFontSize, pStyle) {
          var lDiv = document.createElement('lDiv');

          document.body.appendChild(lDiv);

          if (pStyle != null) {
            lDiv.style = pStyle;
          }
          lDiv.style.fontSize = "" + pFontSize + "px";
          lDiv.style.position = "absolute";
          lDiv.style.left = -1000;
          lDiv.style.top = -1000;

          lDiv.innerHTML = pText;

          var lResult = {
            width: lDiv.clientWidth,
            height: lDiv.clientHeight
          };

          document.body.removeChild(lDiv);
          lDiv = null;

          return lResult;
        }

        var calcVertLayoutMargin = function (axis, pStyle) {
          var result = 80;
          if (axis && axis.axisType === 'linear') {
            var l = axis.axisValL.toFixed(axis.axisFixed) + '';
            var r = axis.axisValL.toFixed(axis.axisFixed) + '';

            var m = l.length > r.length ? l : r;
            var size = measureText(m, 13, pStyle);
            result = size.width + size.height * 2;
          }
          return result > 80 ? result : 80;
        };

        scope.emitZoomLevelChange = function() {
          var data = scope.stdmodel.data;
          for (var i = 0; i < data.length; i++) {
            if (data[i].isLodItem === true) {
              data[i].zoomLevelChanged(scope);
            }
          }
        };

        scope.emitSizeChange = function() {
          if (scope.model.updateWidth != null) {
            scope.model.updateWidth(scope.width);
          } // not stdmodel here

          scope.$emit('plotSizeChanged', {
            width: scope.width,
            height: scope.height
          });
        };
        scope.$on('plotSizeChanged', function (event, data) {
          //if (scope.width !== data.width
          //  //|| scope.height !== data.height
          //) {
          //  scope.model.width = data.width;
          //  //scope.model.height = data.height;
          //}
        });

        scope.calcRange = function() {
          var ret = plotUtils.getDefaultFocus(scope.stdmodel);
          scope.visibleItem = ret.visibleItem;
          scope.legendableItem = ret.legendableItem;
          scope.defaultFocus = ret.defaultFocus;
          scope.fixFocus(scope.defaultFocus);
        };
        scope.calcGridlines = function() {
          // prepare the gridlines
          var focus = scope.focus, model = scope.stdmodel;
          model.xAxis.setGridlines(focus.xl,
            focus.xr,
            scope.numIntervals.x,
            model.margin.left,
            model.margin.right);
          model.yAxis.setGridlines(focus.yl,
            focus.yr,
            scope.numIntervals.y,
            model.margin.bottom,
            model.margin.top);
          if(model.yAxisR){
            model.yAxisR.setGridlines(focus.yl,
              focus.yr,
              scope.numIntervals.y,
              model.margin.bottom,
              model.margin.top)
          }
        };
        scope.renderGridlines = function() {
          var focus = scope.focus, model = scope.stdmodel;
          var mapX = scope.data2scrX, mapY = scope.data2scrY;

          if(model.showXGridlines){
            var xGridlines = model.xAxis.getGridlines();
            for (var i = 0; i < xGridlines.length; i++) {
              var x = xGridlines[i];
              scope.rpipeGridlines.push({
                "id" : "gridline_x_" + i,
                "class" : "plot-gridline",
                "x1" : mapX(x),
                "y1" : mapY(focus.yl),
                "x2" : mapX(x),
                "y2" : mapY(focus.yr)
              });
            }
          }
          var yGridlines = model.yAxis.getGridlines();
          for (var i = 0; i < yGridlines.length; i++) {
            var y = yGridlines[i];
            scope.rpipeGridlines.push({
              "id" : "gridline_y_" + i,
              "class" : "plot-gridline",
              "x1" : mapX(focus.xl),
              "y1" : mapY(y),
              "x2" : mapX(focus.xr),
              "y2" : mapY(y)
            });
          }
          scope.rpipeGridlines.push({
            "id" : "gridline_x_base",
            "class" : "plot-gridline-base",
            "x1" : mapX(focus.xl),
            "y1" : mapY(focus.yl),
            "x2" : mapX(focus.xr),
            "y2" : mapY(focus.yl)
          });
          scope.rpipeGridlines.push({
            "id" : "gridline_y_base",
            "class" : "plot-gridline-base",
            "x1" : mapX(focus.xl),
            "y1" : mapY(focus.yl),
            "x2" : mapX(focus.xl),
            "y2" : mapY(focus.yr)
          });
          scope.rpipeGridlines.push({
            "id" : "gridline_yr_base",
            "class" : "plot-gridline-base",
            "x1" : mapX(focus.xr),
            "y1" : mapY(focus.yl),
            "x2" : mapX(focus.xr),
            "y2" : mapY(focus.yr)
          });
        };
        scope.renderData = function() {
          var data = scope.stdmodel.data;
          for (var i = 0; i < data.length; i++) {
            data[i].render(scope);
            if (data[i].isLodItem === true) {
              scope.hasLodItem = true;
            }
            if (data[i].isUnorderedItem === true) {
              scope.hasUnorderedItem = true;
            }
          }

          if (scope.hasUnorderedItem === true && scope.showUnorderedHint === true) {
            scope.showUnorderedHint = false;
            console.warn("unordered area/line detected, truncation disabled");
          }

        };

        scope.onKeyAction = function (item, onKeyEvent) {
          var key = plotUtils.getKeyCodeConstant(onKeyEvent.keyCode);
          for (var i = 0; i < scope.stdmodel.data.length; i++) {
            var data = scope.stdmodel.data[i];
            if (data.id === item.id || item.id.indexOf(data.id + "_") === 0) {
              var plotId = scope.stdmodel.plotId;
              if (data.keyTags != null && !_.isEmpty(data.keyTags[key])) {
                if (scope.model.setActionDetails) {
                  scope.model.setActionDetails(plotId, data, item).then(
                    function () { plotUtils.evaluateTagCell(data.keyTags[key]); },
                    function () { console.error('set action details error'); } );
                } else {
                  plotService.setActionDetails(plotId, data.uid, scope.model.getEvaluatorId(),
                    plotUtils.getActionObject(scope.model.getCellModel().type, item)).then(
                    function () { plotUtils.evaluateTagCell(data.keyTags[key]); },
                    function () { console.error('set action details error'); });
                }
              } else if (data.keys != null && data.keys.indexOf(key) > -1) {
                scope.legendDone = false;
                scope.legendResetPosition = true;
                scope.doNotLoadState = true;
                if (scope.model.onKey) {
                  scope.model.onKey(key, plotId, data, item);
                } else {
                  plotService.onKey(plotId, data.uid, scope.model.getEvaluatorId(), {
                    key: key,
                    actionObject: plotUtils.getActionObject(scope.model.getCellModel().type, item)
                  });
                }
              }
            }
          }
        };

        scope.onKeyListeners = {}; //map: item.id -> listener function
        scope.removeOnKeyListeners = function () {
          for (var f in scope.onKeyListeners){
            if(scope.onKeyListeners.hasOwnProperty(f)){
              $(document).off("keydown.plot-action", scope.onKeyListeners[f]);
            }
          }
          scope.onKeyListeners = {};
        };

        scope.prepareInteraction = function() {
          var model = scope.stdmodel;

          scope.svg.selectAll(".item-clickable")
            .on('click.action', function (e) {
              for (var i = 0; i < model.data.length; i++) {
                var item = model.data[i];
                if(item.hasClickAction === true && (item.id === e.id || e.id.indexOf(item.id + "_") === 0)) {
                  var plotId = scope.stdmodel.plotId;
                  if(!_.isEmpty(item.clickTag)){
                    if (scope.model.setActionDetails) {
                      scope.model.setActionDetails(plotId, item, e).then(
                        function () { plotUtils.evaluateTagCell(item.clickTag); },
                        function () { console.error('set action details error'); }
                      );
                    } else {
                      plotService.setActionDetails( plotId,
                                                    item.uid,
                                                    scope.model.getEvaluatorId(),
                                                    plotUtils.getActionObject(scope.model.getCellModel().type, e)).then(
                        function () { plotUtils.evaluateTagCell(item.clickTag); },
                        function () { console.error('set action details error'); }
                      );
                    }
                  }else{
                    scope.legendDone = false;
                    scope.legendResetPosition = true;
                    scope.doNotLoadState = true;
                    if (scope.model.onClick) {
                      scope.model.onClick(plotId, item, e);
                      return;
                    } else {
                      plotService.onClick(plotId, item.uid, scope.model.getEvaluatorId(),
                                          plotUtils.getActionObject(scope.model.getCellModel().type, e));
                    }
                  }
                }
              }
            });

          var onKeyElements = scope.svg.selectAll(".item-onkey");
          //TODO add listeners only for elements that have keys or keyTags
          onKeyElements
            .on("mouseenter.plot-click", function(item){
              if(!scope.onKeyListeners[item.id]) {
                scope.onKeyListeners[item.id] = function(onKeyEvent){
                  scope.onKeyAction(item, onKeyEvent);
                };
                $(document).on("keydown.plot-action", scope.onKeyListeners[item.id]);
              }
            })
            .on("mouseleave.plot-click", function(item){
              var keyListener = scope.onKeyListeners[item.id]
              if (keyListener) {
                delete scope.onKeyListeners[item.id];
                $(document).off("keydown.plot-action", keyListener);
              }
            });

          if (model.useToolTip === false) {
            return;
          }
          scope.svg.selectAll(".plot-resp")
            .on('mouseenter', function(d) {
              scope.drawLegendPointer(d);
              return plotTip.tooltip(scope, d, d3.mouse(scope.svg[0][0]));
            })
            .on('mousemove', function(d) {

              scope.removeLegendPointer();
              plotTip.untooltip(scope, d);

              scope.drawLegendPointer(d);
              return plotTip.tooltip(scope, d, d3.mouse(scope.svg[0][0]));
            })
            .on("mouseleave", function(d) {
              scope.removeLegendPointer();
              return plotTip.untooltip(scope, d);
            })
            .on("click.resp", function(d) {
              return plotTip.toggleTooltip(scope, d);
            });
        };

        scope.drawLegendPointer = function(d) {
          if (scope.gradientLegend) {
            scope.gradientLegend.drawPointer(d.ele.value);
          }
        };

        scope.removeLegendPointer = function() {
          if(scope.gradientLegend){
            scope.gradientLegend.removePointer();
          }
        };


        scope.renderGridlineLabels = function() {
          var _size_ = function (s, clazz) {
            var o = $('<div>' + s + '</div>')
                .css({
                  'position': 'absolute',
                  'float': 'left',
                  'white-space': 'nowrap',
                  'visibility': 'hidden',
                  'class': clazz
                }).appendTo($('body')),
              w = o.width(),
              h = o.height();
            o.remove();
            return {
              width : w,
              height : h
            };
          };
          var mapX = scope.data2scrX, mapY = scope.data2scrY;
          var model = scope.stdmodel;
          if (model.xAxis.showGridlineLabels !== false) {
            var lines = model.xAxis.getGridlines(),
                labels = model.xAxis.getGridlineLabels();
            for (var i = 0; i < labels.length; i++) {
              var x = mapX(lines[i]);
              var y = mapY(scope.focus.yl) + scope.labelPadding.y;
							var rpipeText = {
                "id": "label_x_" + i,
                "class": "plot-label plot-label-x",
                "text": labels[i],
                "x": x,
                "y": y,
                "text-anchor": "middle",
                "dominant-baseline": "hanging"
              };
              if (model.categoryNamesLabelAngle &&
                model.categoryNamesLabelAngle !== 0 && model.orientation === 'VERTICAL') {
                var __size__ = _size_(labels[i], "plot-label");
                var degree = -1 * model.categoryNamesLabelAngle * (180 / Math.PI);
								var delta = degree > 0 ? (__size__.width / 2) : -1 * (__size__.width / 2);
                rpipeText.transform =
                  "translate(" +
                  delta +
                  " " + -scope.labelPadding.y +
                  ") "
                  +
                  "rotate(" +
                  degree +
                  " " + (x - delta) +
                  " " + (y + __size__.height / 2) +
                  ") "
                ;
              }
              scope.rpipeTexts.push(rpipeText);
            }
          }
          if (model.yAxis.showGridlineLabels !== false) {
            lines = model.yAxis.getGridlines();
            labels = model.yAxis.getGridlineLabels();
            for (var i = 0; i < labels.length; i++) {
              var x = mapX(scope.focus.xl) - scope.labelPadding.x;
              var y = mapY(lines[i]);

							var rpipeText = {
                "id": "label_y_" + i,
                "class": "plot-label plot-label-y",
                "text": labels[i],
                "x": x,
                "y": y,
                "text-anchor": "end",
                "dominant-baseline": "central"
              };
              if (model.categoryNamesLabelAngle &&
                model.categoryNamesLabelAngle !== 0 && model.orientation === 'HORIZONTAL') {
                rpipeText.transform = "rotate(" +
                model.categoryNamesLabelAngle * (180 / Math.PI) +
                " " + (x) +
                " " + (y) +
                ")";
              }
              scope.rpipeTexts.push(rpipeText);
            }
          }
          if (model.yAxisR && model.yAxisR.showGridlineLabels !== false) {
            lines = model.yAxisR.getGridlines();
            labels = model.yAxisR.getGridlineLabels();
            for (var i = 0; i < labels.length; i++) {
              var y = lines[i];
              scope.rpipeTexts.push({
                "id" : "label_yr_" + i,
                "class" : "plot-label",
                "text" : labels[i],
                "x" : mapX(scope.focus.xr) + scope.labelPadding.x,
                "y" : mapY(y),
                "dominant-baseline" : "central"
              });
            }
          }
          var lMargin = scope.layout.leftLayoutMargin, bMargin = scope.layout.bottomLayoutMargin;
          if (model.xAxis.label != null) {
            scope.rpipeTexts.push({
              "id" : "xlabel",
              "class" : "plot-xylabel",
              "text" : model.xAxis.axisLabelWithCommon,
              "x" : lMargin + (plotUtils.safeWidth(scope.jqsvg) - lMargin) / 2,
              "y" : plotUtils.safeHeight(scope.jqsvg) - plotUtils.fonts.labelHeight
            });
          }
          if (model.yAxis.label != null) {
            var x = plotUtils.fonts.labelHeight * 2, y = (plotUtils.safeHeight(scope.jqsvg) - bMargin) / 2;
            scope.rpipeTexts.push({
              "id" : "ylabel",
              "class" : "plot-xylabel",
              "text" : model.yAxis.label,
              "x" : x,
              "y" : y,
              "transform" : "rotate(-90 " + x + " " + y + ")"
            });
          }
          if (model.yAxisR && model.yAxisR.label != null) {
            var x = plotUtils.safeWidth(scope.jqsvg) - plotUtils.fonts.labelHeight, y = (plotUtils.safeHeight(scope.jqsvg) - bMargin) / 2;
            scope.rpipeTexts.push({
              "id" : "yrlabel",
              "class" : "plot-xylabel",
              "text" : model.yAxisR.label,
              "x" : x,
              "y" : y,
              "transform" : "rotate(-90 " + x + " " + y + ")"
            });
          }
        };

        scope.renderGridlineTicks = function() {
          var tickLength = scope.gridlineTickLength;
          var mapX = scope.data2scrX, mapY = scope.data2scrY;
          var focus = scope.focus;
          var model = scope.stdmodel;
          if (model.xAxis.showGridlineLabels !== false) {
            var lines = model.xAxis.getGridlines(),
              labels = model.xAxis.getGridlineLabels();
            for (var i = 0; i < labels.length; i++) {
              var x = lines[i];
              scope.rpipeTicks.push({
                "id" : "tick_x_" + i,
                "class" : "plot-tick",
                "x1" : mapX(x),
                "y1" : mapY(focus.yl),
                "x2" : mapX(x),
                "y2" : mapY(focus.yl) + tickLength
              });
            }
          }
          if (model.yAxis.showGridlineLabels !== false) {
            lines = model.yAxis.getGridlines();
            labels = model.yAxis.getGridlineLabels();
            for (var i = 0; i < labels.length; i++) {
              var y = lines[i];
              scope.rpipeTicks.push({
                "id" : "tick_y_" + i,
                "class" : "plot-tick",
                "x1" : mapX(focus.xl) - tickLength,
                "y1" : mapY(y),
                "x2" : mapX(focus.xl),
                "y2" : mapY(y)
              });
            }
          }
          if (model.yAxisR && model.yAxisR.showGridlineLabels !== false) {
            lines = model.yAxisR.getGridlines();
            labels = model.yAxisR.getGridlineLabels();
            for (var i = 0; i < labels.length; i++) {
              var y = lines[i];
              scope.rpipeTicks.push({
                "id" : "tick_yr_" + i,
                "class" : "plot-tick",
                "x1" : mapX(focus.xr),
                "y1" : mapY(y),
                "x2" : mapX(focus.xr) + tickLength,
                "y2" : mapY(y)
              });
            }
          }
        };

        scope.renderCursor = function(e) {
          var x = e.offsetX, y = e.offsetY;
          var W = plotUtils.safeWidth(scope.jqsvg), H = plotUtils.safeHeight(scope.jqsvg);
          var lMargin = scope.layout.leftLayoutMargin, bMargin = scope.layout.bottomLayoutMargin,
              rMargin = scope.layout.rightLayoutMargin, tMargin = scope.layout.topLayoutMargin;
          var model = scope.stdmodel;
          if (x < lMargin || model.yAxisR != null && x > W - rMargin || y > H - bMargin || y < tMargin) {
            scope.svg.selectAll(".plot-cursor").remove();
            scope.jqcontainer.find(".plot-cursorlabel").remove();
            return;
          }
          var mapX = scope.scr2dataX, mapY = scope.scr2dataY;
          if (model.xCursor != null) {
            var opt = model.xCursor;
            scope.svg.selectAll("#cursor_x").data([{}]).enter().append("line")
              .attr("id", "cursor_x")
              .attr("class", "plot-cursor")
              .style("stroke", opt.color)
              .style("stroke-opacity", opt.color_opacity)
              .style("stroke-width", opt.width)
              .style("stroke-dasharray", opt.stroke_dasharray);
            scope.svg.select("#cursor_x")
              .attr("x1", x).attr("y1", tMargin).attr("x2", x).attr("y2", H - bMargin);

            scope.jqcontainer.find("#cursor_xlabel").remove();
            var label = $("<div id='cursor_xlabel' class='plot-cursorlabel'></div>")
              .appendTo(scope.jqcontainer)
              .text(plotUtils.getTipStringPercent(mapX(x), model.xAxis));
            var w = label.outerWidth(), h = label.outerHeight();
            var p = {
              "x" : x - w / 2,
              "y" : H - bMargin - scope.labelPadding.y - h
            };
            label.css({
              "left" : p.x ,
              "top" : p.y ,
              "background-color" : opt.color != null ? opt.color : "black"
            });
          }
          if (model.yCursor != null) {
            var opt = model.yCursor;
            scope.svg.selectAll("#cursor_y").data([{}]).enter().append("line")
              .attr("id", "cursor_y")
              .attr("class", "plot-cursor")
              .style("stroke", opt.color)
              .style("stroke-opacity", opt.color_opacity)
              .style("stroke-width", opt.width)
              .style("stroke-dasharray", opt.stroke_dasharray);
            scope.svg.select("#cursor_y")
              .attr("x1", lMargin)
              .attr("y1", y)
              .attr("x2", W - rMargin)
              .attr("y2", y);

            var renderCursorLabel = function(axis, id, alignRight){
              if(axis == null) { return };
              scope.jqcontainer.find("#" + id).remove();
              var label = $("<div id='" + id + "' class='plot-cursorlabel'></div>")
                .appendTo(scope.jqcontainer)
                .text(plotUtils.getTipStringPercent(mapY(y), axis));
              var w = label.outerWidth(), h = label.outerHeight();
              var p = {
                "x" : (alignRight ? rMargin : lMargin) + scope.labelPadding.x,
                "y" : y - h / 2
              };
              var css = {
                "top" : p.y ,
                "background-color" : opt.color != null ? opt.color : "black"
              };
              css[alignRight ? "right" : "left"] = p.x;
              label.css(css);
            };

            renderCursorLabel(model.yAxis, "cursor_ylabel", false);
            renderCursorLabel(model.yAxisR, "cursor_yrlabel", true);
          }
        };

        scope.prepareMergedLegendData = function() {
          var data = scope.stdmodel.data;

          var mergedLines = {};
          var lineUniqueAttributesSet = {};

          function getColorInfoUid(dat) {
            var color = plotUtils.createColor(dat.color, dat.color_opacity),
                border = plotUtils.createColor(dat.stroke, dat.stroke_opacity);
            return color + border;
          }

          function addNewLegendLineData(dat, lineUniqueIndex) {
            var line = {
              dataIds: [i],
              legend: dat.legend,
              showItem: dat.showItem,
              isLodItem: dat.isLodItem === true,
              color: dat.color,
              color_opacity: dat.color_opacity,
              stroke: dat.stroke,
              stroke_opacity: dat.stroke_opacity
            };
            if (dat.isLodItem === true) {
              line.lodDataIds = [i];
            }
            var lineId = plotUtils.randomString(32);
            mergedLines[lineId] = line;
            lineUniqueAttributesSet[lineUniqueIndex] = lineId;
            return lineId;
          }

          function addDataForExistingLegendLine(dat, line) {
            line.dataIds.push(i);
            if (dat.isLodItem === true) {
              line.isLodItem = true;
              if (line.lodDataIds) {
                line.lodDataIds.push(i);
              } else {
                line.lodDataIds = [i];
              }
            }
            if (line.showItem !== true) {
              line.showItem = dat.showItem
            }
          }

          for (var i = 0; i < data.length; i++) {
            var dat = data[i];
            if (dat.legend == null || dat.legend === "") {
              continue;
            }

            var lineUniqueIndex = dat.legend + getColorInfoUid(dat);

            if (lineUniqueAttributesSet[lineUniqueIndex] == null) {
              addNewLegendLineData(dat, lineUniqueIndex);
            } else {
              addDataForExistingLegendLine(dat, mergedLines[lineUniqueAttributesSet[lineUniqueIndex]])
            }
          }
          return mergedLines;
        };

        scope.getLegendPosition = function(legendPosition, isHorizontal) {
          var margin = scope.layout.legendMargin,
              containerWidth = scope.jqcontainer.outerWidth(true),
              containerWidthWithMargin = containerWidth + margin,
              legend = scope.jqlegendcontainer.find("#plotLegend"),
              legendHeight = legend.height(),
              legendHeightWithMargin = legendHeight + margin,
              verticalCenter = scope.jqcontainer.height() / 2 - legendHeight / 2,
              horizontalCenter = containerWidth / 2 - legend.width() / 2;
          if (!legendPosition) { return scope.getLegendPosition("TOP_RIGHT", isHorizontal); }
          var position;
          if(legendPosition.position){
            switch(legendPosition.position){
              case "TOP":
                position = {
                  "left": horizontalCenter,
                  "top": -legendHeightWithMargin
                };
                break;
              case "LEFT":
                position = {
                  "left": 0,
                  "top": verticalCenter
                };
                break;
              case "BOTTOM":
                position = {
                  "left": horizontalCenter,
                  "bottom": -legendHeightWithMargin
                };
                break;
              case "RIGHT":
                position = {
                  "left": containerWidthWithMargin,
                  "bottom": verticalCenter
                };
                break;
              default:
                position = scope.getLegendPositionByLayout(legendPosition, isHorizontal);
            }
          }else{
            position = {
              "left": legendPosition.x,
              "top": legendPosition.y
            };
          }
          return position;
        };

        scope.getLegendPositionByLayout = function(legendPosition, isHorizontal){
          var legend = scope.jqlegendcontainer.find("#plotLegend"),
              margin = scope.layout.legendMargin,
              legendWidth = legend.outerWidth(true),
              containerWidth = scope.jqcontainer.outerWidth(true),
              containerWidthWithMargin = containerWidth + margin,
              legendHeight = legend.height(),
              legendHeightWithMargin = legendHeight + margin, position;
          if(isHorizontal){
            switch(legendPosition.position){
              case "TOP_LEFT":
                position = {
                  "left": 0,
                  "top": -legendHeightWithMargin
                };
                break;
              case "TOP_RIGHT":
                position = {
                  "left": containerWidth - legendWidth,
                  "top": -legendHeightWithMargin
                };
                break;
              case "BOTTOM_LEFT":
                position = {
                  "left": 0,
                  "bottom": -legendHeightWithMargin
                };
                break;
              case "BOTTOM_RIGHT":
                position = {
                  "left": containerWidth - legendWidth,
                  "bottom": -legendHeightWithMargin
                };
                break;
            }
          }else{
            switch(legendPosition.position){
              case "TOP_LEFT":
                position = {
                  "left": 0,
                  "top": scope.layout.topLayoutMargin
                };
                break;
              case "TOP_RIGHT":
                position = {
                  "left": containerWidthWithMargin,
                  "top": scope.layout.topLayoutMargin
                };
                break;
              case "BOTTOM_LEFT":
                position = {
                  "left": 0,
                  "bottom": scope.layout.bottomLayoutMargin
                };
                break;
              case "BOTTOM_RIGHT":
                position = {
                  "left": containerWidthWithMargin,
                  "bottom": scope.layout.bottomLayoutMargin
                };
                break;
            }
          }
          return position;
        };

        scope.createLegendContainer = function(clazz, handle) {
          var isHorizontal = scope.stdmodel.legendLayout === "HORIZONTAL";
          var draggable = {
            start: function(event, ui) {
              $(this).css({//avoid resizing for bottom-stacked legend
                "bottom": "auto"
              });
            },
            stop: function(event, ui) {
              scope.legendPosition = {
                "left": ui.position.left,
                "top": ui.position.top
              };
            }
          };

          var legendContainer = $("<div></div>").appendTo(scope.jqlegendcontainer)
            .attr("id", "plotLegend")
            .attr("class", "plot-legend")
            .draggable(draggable)
            .css("max-height", plotUtils.safeHeight(scope.jqsvg) - scope.layout.bottomLayoutMargin - scope.layout.topLayoutMargin);

          if (clazz != null) {
            legendContainer.addClass(clazz);
          }

          if (handle != null) {
            draggable.handle = handle;
          } else {
            legendContainer.addClass("plot-legenddraggable");
          }

          if (isHorizontal) {
            legendContainer.css("max-width", scope.jqcontainer.width());
          }

          return legendContainer;
        };

        scope.getLodLabel = function(lodType) {
          var label;
          switch(lodType){
            case 'box':
              label = 'group into boxes';
              break;
            case 'river':
              label = 'group into river';
              break;
            case 'off':
              label = 'no grouping';
              break;
            default:
              label = lodType;
          }
          return label;
        };

        scope.renderLegends = function() {
          // legend redraw is controlled by legendDone
          if (scope.legendableItem === 0 ||
            scope.stdmodel.showLegend === false || scope.legendDone === true) { return; }

          var data = scope.stdmodel.data;
          var isHorizontal = scope.stdmodel.legendLayout === "HORIZONTAL";

          scope.jqlegendcontainer.find("#plotLegend").remove();
          scope.legendDone = true;

          var legendContainer;
          if (scope.model.getCellModel().type === "HeatMap"){
            legendContainer = scope.createLegendContainer();
          }else{
            legendContainer = scope.createLegendContainer("plot-legendscrollablecontainer", "#legendDraggableContainer");
          }

          if (scope.model.getCellModel().type === "HeatMap") {
            scope.gradientLegend = new GradientLegend(data);
            scope.gradientLegend.render(legendContainer, data[0].colors);
            scope.updateLegendPosition();
            return;
          }

          var legendDraggableContainer = $("<div></div>").appendTo(legendContainer)
            .attr("id", "legendDraggableContainer")
            .attr("class", "plot-legenddraggable");

          var legendUnit = "<div></div>",
              legendLineUnit = isHorizontal ? "<div class='plot-legenditeminline'></div>" : "<div class='plot-legenditeminrow'></div>";
          var legend = $(legendUnit).appendTo(legendDraggableContainer)
            .attr("id", "legends");

          scope.legendMergedLines = scope.prepareMergedLegendData();

          if (!scope.stdmodel.omitCheckboxes &&
            Object.keys(scope.legendMergedLines).length > 1) {  // skip "All" check when there is only one line
            var allLegendId = plotUtils.randomString(32);
            var unit = $(legendLineUnit).appendTo(legend)
              .attr("id", "legend_all")
              .addClass("plot-legendline");
            $("<input type='checkbox' />")
              .attr("id", "legendcheck_all_" + allLegendId)
              .attr("class", "plot-legendcheckbox beforeCheckbox")
              .prop("checked", scope.showAllItems)
              .click(function(e) {
                return scope.toggleVisibility(e);
              })
              .appendTo($(unit));
            $("<span></span>")
              .attr("id", "legendbox_all")
              .attr("class", "plot-legendbox")
              .css("background-color", "none")
              .appendTo($(unit));
            $("<label></label>")
              .attr("id", "legendtext_all")
              .attr("for", "legendcheck_all_" + allLegendId)
              .attr("class", "plot-label")
              .text("All")
              .appendTo($(unit));
          }

          scope.lodTypeMenuItems = {};
          for (var id in scope.legendMergedLines) {
            if (!scope.legendMergedLines.hasOwnProperty(id)) { continue; }
            var line = scope.legendMergedLines[id];
            if (line.legend == null || line.legend === "") { continue; }
            var highlightTimeoutId;
            var unit = $(legendLineUnit).appendTo(legend)
              .attr("id", "legend_" + id)
              .addClass("plot-legendline")
              .mouseenter(function(e){
                var legendLine = $(this)[0];
                highlightTimeoutId = setTimeout(function(){
                  scope.highlightElements(legendLine.id.split("_")[1], true);
                }, 300);
              })
              .mouseleave(function(e){
                clearTimeout(highlightTimeoutId);
                scope.highlightElements($(this)[0].id.split("_")[1], false);
              });
            if(!scope.stdmodel.omitCheckboxes){
              // checkbox
              $("<input type='checkbox'/>")
                .attr("id", "legendcheck_" + id)
                .attr("class", "plot-legendcheckbox beforeCheckbox")
                .prop("checked", line.showItem)
                .click(function(e) {
                  return scope.toggleVisibility(e);
                })
                .appendTo(unit);
            }

            var clr = plotUtils.createColor(line.color, line.color_opacity),
                st_clr = plotUtils.createColor(line.stroke, line.stroke_opacity);
            var sty = line.color == null ? "dotted " : "solid ";
            // color box
            $("<span></span>")
              .attr("id", "legendbox_" + id)
              .attr("class", "plot-legendbox")
              .attr("title", line.color == null ? "Element-based colored item" : "")
              .css("background-color",
                line.color == null ? "none" : clr)
              .css("border",
                line.stroke != null ? "1px " + sty + st_clr :
                (line.color != null ? "1px " + sty + clr : "1px dotted gray"))
              .appendTo(unit);
            // legend text
            $("<label></label>").appendTo(unit)
              .attr("id", "legendtext_" + id)
              .attr("for", "legendcheck_" + id)
              .attr("class", "plot-label")
              .text(line.legend);

            if (line.isLodItem === true) {

              var applyLodType = function (lodType, legendLineId) {
                var dataIds = scope.legendMergedLines[legendLineId].dataIds;

                if (lodType === 'off') {
                  if (scope.getMergedLodInfo(dataIds).lodType === "off") { return; }
                  scope.removePipe.push("msg_lodoff");
                  scope.renderMessage("LOD is being turned off. Are you sure?",
                    [ "You are trying to turning off LOD. Loading full resolution data is " +
                    "going to take time and may potentially crash the browser.",
                    "PROCEED (left click) / CANCEL (right click)"],
                    "msg_lodoff",
                    function() {
                      _.forEach(dataIds, function (dataId) {
                        var loadLoader = scope.stdmodel.data[dataId];
                        if (loadLoader.toggleLod) {
                          loadLoader.toggleLod(scope);
                        }
                      });
                      scope.update();
                      scope.setMergedLodHint(dataIds, legendLineId);
                    }, null);
                } else {
                  var hasChanged = false;
                  _.forEach(dataIds, function (dataId) {
                    var loadLoader = scope.stdmodel.data[dataId];
                    if (!loadLoader.lodType || loadLoader.lodType === lodType) { return; }
                    loadLoader.clear(scope);
                    loadLoader.applyLodType(lodType);
                    loadLoader.zoomLevelChanged(scope);
                    hasChanged = true;
                  });
                  if (hasChanged) {
                    scope.update();
                    scope.setMergedLodHint(dataIds, legendLineId);
                  }
                }
              };

              var createLodTypeMenuItem = function(lodType, lineId){
                return {
                  lodType: lodType,
                  lineId: lineId,
                  name: scope.getLodLabel(lodType),
                  action: function(){
                    applyLodType(this.lodType, this.lineId);
                  }
                }
              };

              var lodTypeMenuItems = [];
              _.forEach(line.dataIds, function(dataId){
                var graphics = scope.stdmodel.data[dataId];
                _.forEach(graphics.lodTypes, function(lodType){
                  if(!_.some(lodTypeMenuItems, {lodType: lodType})){
                    lodTypeMenuItems.push(createLodTypeMenuItem(lodType, id));
                  }
                });
              });
              lodTypeMenuItems.push(createLodTypeMenuItem('off', id));

              var lodhint = $(
                '<div class="dropdown dropdown-promoted" data-toggle="dropdown" style="float: right; width: auto;">' +
                '<a class="dropdown-toggle plot-legendlodtype" data-toggle="dropdown"></a>' +
                '<bk-dropdown-menu menu-items="lodTypeMenuItems[\'' + id + '\']" submenu-classes="drop-right"></bk-dropdown-menu>' +
                '</div>'
              );
              scope.lodTypeMenuItems[id] = lodTypeMenuItems;
              unit.append($compile(lodhint)(scope));
              lodhint.attr("id", "hint_" + id).attr("class", "plot-legendlod");
              scope.setMergedLodHint(line.lodDataIds, id);
            }
          }

          scope.updateLegendPosition();
        };

        scope.updateLegendPosition = function() {
          var legendContainer = scope.jqlegendcontainer.find("#plotLegend");
          var isHorizontal = scope.stdmodel.legendLayout === "HORIZONTAL";
          var margin = scope.layout.legendMargin;
          if (scope.legendResetPosition === true) {
            scope.legendPosition = scope.getLegendPosition(scope.stdmodel.legendPosition, isHorizontal);
            scope.legendResetPosition = false;
          }
          legendContainer.css(scope.legendPosition);

          //increase plot margins if legend has predefined values
          if(scope.stdmodel.legendPosition.position === "LEFT") {
            scope.jqcontainer.css("margin-left", legendContainer.width() + margin);
          }
          if(scope.stdmodel.legendPosition.position === "TOP") {
            scope.jqcontainer.css("margin-top", legendContainer.height() + margin);
          }
          if(scope.stdmodel.legendPosition.position === "BOTTOM") {
            scope.jqcontainer.css("margin-bottom", legendContainer.height() + margin);
          }
          if(isHorizontal){
            if(["TOP_LEFT", "TOP_RIGHT"].indexOf(scope.stdmodel.legendPosition.position) !== -1) {
              scope.jqcontainer.css("margin-top", legendContainer.height() + margin);
            }
            if(["BOTTOM_LEFT", "BOTTOM_RIGHT"].indexOf(scope.stdmodel.legendPosition.position) !== -1) {
              scope.jqcontainer.css("margin-bottom", legendContainer.height() + margin);
            }
          }else{
            if(["TOP_LEFT", "BOTTOM_LEFT"].indexOf(scope.stdmodel.legendPosition.position) !== -1) {
              scope.jqcontainer.css("margin-left", legendContainer.width() + margin);
            }
          }

          if (legendContainer.length) {
            var legenddraggable = legendContainer.find(".plot-legenddraggable");
            if (legendContainer.get(0).scrollHeight > legendContainer.get(0).clientHeight) {
              legenddraggable.addClass("hasScroll");
            } else {
              legenddraggable.removeClass("hasScroll");
            }
          }

        };

        scope.highlightElements = function(legendId, highlight){

          if(!legendId) { return; }

          var elementsIds = scope.legendMergedLines[legendId].dataIds;
          for(var i=0; i<elementsIds.length; i++){
            var id = elementsIds[i];
            var data = scope.stdmodel.data[id];
            data.setHighlighted(scope, highlight);
          }
        };

        scope.updateMargin = function(){
          if (scope.model.updateMargin != null) {
            setTimeout(scope.model.updateMargin, 0);
          }
        };

        scope.getMergedLodInfo = function(lodDataIds) {
          var firstLine = scope.stdmodel.data[lodDataIds[0]];
          var lodInfo = {
            lodType: firstLine.lodType,
            lodOn: firstLine.lodOn,
            lodAuto: firstLine.lodAuto //consider all lines have the same lodAuto
          };

          for (var j = 0; j < lodDataIds.length; j++) {
            var dat = scope.stdmodel.data[lodDataIds[j]];
            if (lodInfo.lodType !== dat.lodType) {
              lodInfo.lodType = "mixed";//if merged lines have different lod types
            }
            if (lodInfo.lodOn !== true) {//switch off lod only if all lines has lod off
              lodInfo.lodOn = dat.lodOn;
            }
          }
          return lodInfo;
        };
        scope.setMergedLodHint = function(lodDataIds, legendLineId) {
          var lodInfo = scope.getMergedLodInfo(lodDataIds);
          var legend = scope.jqlegendcontainer.find("#legends");
          var hint = legend.find("#hint_" + legendLineId);
          var type = hint.find(".dropdown-toggle");
          type.text(lodInfo.lodType);
        };
        scope.toggleVisibility = function(e) {
          var id = e.target.id.split("_")[1], data = scope.stdmodel.data, line;
          // id in the format "legendcheck_id"
          if (id == "all") {
            scope.showAllItems = !scope.showAllItems;

            for (var lineId in scope.legendMergedLines) {
              if (scope.legendMergedLines.hasOwnProperty(lineId)) {
                line = scope.legendMergedLines[lineId];
                line.showItem = scope.showAllItems;
                for (var i = 0; i < line.dataIds.length; i++) {
                  var dat = data[line.dataIds[i]];
                  dat.showItem = scope.showAllItems;
                  if (dat.showItem === false) {
                    dat.hideTips(scope, true);
                    if (dat.isLodItem === true) {
                      dat.lodOn = false;
                    }
                  }else{
                    dat.hideTips(scope, false);
                  }
                }
                if (line.showItem === false) {
                  if (line.isLodItem === true) {
                    scope.setMergedLodHint(line.lodDataIds, lineId);
                  }
                }
                scope.jqlegendcontainer.find("#legendcheck_" + lineId).prop("checked", line.showItem);
              }
            }

            scope.calcRange();
            scope.update();
            return;
          }

          line = scope.legendMergedLines[id];
          line.showItem = !line.showItem;
          for (var j = 0; j < line.dataIds.length; j++) {
            var dat = data[line.dataIds[j]];
            dat.showItem = !dat.showItem;
            if (dat.showItem === false) {
              dat.hideTips(scope, true);
              if (dat.isLodItem === true) {
                dat.lodOn = false;
              }
            } else {
              dat.hideTips(scope, false);
            }
          }
          if (line.showItem === false) {
            if (line.isLodItem === true) {
              scope.setMergedLodHint(line.lodDataIds, id);
            }
          }

          scope.calcRange();
          scope.update();
        };

        scope.renderMessage = function(title, msgs, msgid, callbacky, callbackn) {
          var message = $("<div></div>").appendTo(scope.jqcontainer)
            .attr("id", msgid)
            .attr("class", "plot-message")
            .on('mousedown', function(e) {
              if (e.which === 3) {
                if (callbackn != null) {
                  callbackn();
                }
              } else {
                if (callbacky != null) {
                  callbacky();
                }
              }
              $(this).remove();
            });

          if (title != null && title != "") {
            $("<div></div>").appendTo(message)
              .attr("class", "plot-message-title")
              .text(title);
          }

          var content = $("<div></div>").appendTo(message)
              .attr("class", "plot-message-content");
          if (typeof(msgs) === "string") {
            msgs = [ msgs ];
          }
          for (var i = 0; i < msgs.length; i++) {
            $("<div></div>").appendTo(content)
              .text(msgs[i]);
          }

          var w = message.outerWidth(), h = message.outerHeight();
          var lMargin = scope.layout.leftLayoutMargin,
              bMargin = scope.layout.bottomLayoutMargin;
          message.css({
            "left" : (scope.jqcontainer.width() - lMargin) / 2 - w / 2 + lMargin,
            "top" : (scope.jqcontainer.height() - bMargin) / 2 - h / 2
          });
        };

        scope.renderCoverBox = function() {
          var W = plotUtils.safeWidth(scope.jqsvg), H = plotUtils.safeHeight(scope.jqsvg);
          plotUtils.replotSingleRect(scope.labelg, {
            "id" : "coverboxYr",
            "class" : "plot-coverbox",
            "x" : 0,
            "y" : H - scope.layout.bottomLayoutMargin,
            "width" : W,
            "height" : scope.layout.bottomLayoutMargin
          });
          plotUtils.replotSingleRect(scope.labelg, {
            "id" : "coverboxYl",
            "class" : "plot-coverbox",
            "x" : 0,
            "y" : 0,
            "width" : W,
            "height" : scope.layout.topLayoutMargin
          });
          plotUtils.replotSingleRect(scope.labelg, {
            "id" : "coverboxXl",
            "class" : "plot-coverbox",
            "x" : 0,
            "y" : 0,
            "width" : scope.layout.leftLayoutMargin,
            "height" : H
          });
          plotUtils.replotSingleRect(scope.labelg, {
            "id" : "coverboxXr",
            "class" : "plot-coverbox",
            "x" : W - scope.layout.rightLayoutMargin,
            "y" : 0,
            "width" : scope.stdmodel.yAxisR ? scope.layout.rightLayoutMargin : 10,
            "height" : H
          });

        };
        scope.renderLocateBox = function() {
          scope.svg.selectAll("#locatebox").remove();
          if (scope.locateBox != null) {
            var box = scope.locateBox;
            scope.svg.selectAll("#locatebox").data([{}]).enter().append("rect")
              .attr("id", "locatebox")
              .attr("class", "plot-locatebox")
              .attr("x", box.x)
              .attr("y", box.y)
              .attr("width", box.w)
              .attr("height", box.h);
          }
        };
        scope.calcLocateBox = function() {
          var p1 = scope.mousep1, p2 = scope.mousep2;
          var xl = Math.min(p1.x, p2.x), xr = Math.max(p1.x, p2.x),
              yl = Math.min(p1.y, p2.y), yr = Math.max(p1.y, p2.y);
          if (xr === xl) { xr = xl + 1; }
          if (yr === yl) { yr = yl + 1; }
          scope.locateBox = {
            "x" : xl,
            "y" : yl,
            "w" : xr - xl,
            "h" : yr - yl
          };
        };
        scope.mouseDown = function() {
          if (scope.interactMode === "other") {
            return;
          }
          if (d3.event.target.nodeName.toLowerCase() === "div") {
            scope.interactMode = "other";
            scope.disableZoom();
            return;
          }
          scope.interactMode = d3.event.button == 0 ? "zoom" : "locate";
        };
        scope.mouseUp = function() {
          if (scope.interactMode === "remove") {
            scope.interactMode = "other";
            return;
          }
          if (scope.interactMode === "other") {
            scope.interactMode = "zoom";
          }
          scope.enableZoom();
        };
        scope.zoomStart = function(d) {
          if (scope.interactMode === "other") { return; }
          scope.zoomed = false;
          scope.lastx = scope.lasty = 0;
          scope.lastscale = 1.0;
          scope.zoomObj.scale(1.0);
          scope.zoomObj.translate([0, 0]);
          scope.mousep1 = {
            "x" : d3.mouse(scope.svg[0][0])[0],
            "y" : d3.mouse(scope.svg[0][0])[1]
          };
          scope.mousep2 = {};
          _.extend(scope.mousep2, scope.mousep1);
        };
        scope.zooming = function(d) {
          if (scope.interactMode === "other") { return; }
          if (scope.interactMode === "zoom") {
            // left click zoom
            var lMargin = scope.layout.leftLayoutMargin, bMargin = scope.layout.bottomLayoutMargin;
            var W = plotUtils.safeWidth(scope.jqsvg) - lMargin, H = plotUtils.safeHeight(scope.jqsvg) - bMargin;
            var d3trans = d3.event.translate, d3scale = d3.event.scale;
            var dx = d3trans[0] - scope.lastx, dy = d3trans[1] - scope.lasty,
                ds = this.lastscale / d3scale;
            scope.lastx = d3trans[0];
            scope.lasty = d3trans[1];
            scope.lastscale = d3scale;

            var focus = scope.focus;
            var mx = d3.mouse(scope.svg[0][0])[0], my = d3.mouse(scope.svg[0][0])[1];
            if (Math.abs(mx - scope.mousep1.x) > 0 || Math.abs(my - scope.mousep1.y) > 0) {
              scope.zoomed = true;
            }
            if (ds == 1.0) {
              // translate only
              var tx = -dx / W * focus.xspan, ty = dy / H * focus.yspan;
              if (focus.xl + tx >= 0 && focus.xr + tx <= 1) {
                focus.xl += tx;
                focus.xr += tx;
              } else {
                if (focus.xl + tx < 0) {
                  focus.xl = 0;
                  focus.xr = focus.xl + focus.xspan;
                } else if (focus.xr + tx > 1) {
                  focus.xr = 1;
                  focus.xl = focus.xr - focus.xspan;
                }
              }
              if (focus.yl + ty >= 0 && focus.yr + ty <= 1) {
                focus.yl += ty;
                focus.yr += ty;
              } else {
                if (focus.yl + ty < 0) {
                  focus.yl = 0;
                  focus.yr = focus.yl + focus.yspan;
                } else if (focus.yr + ty > 1) {
                  focus.yr = 1;
                  focus.yl = focus.yr - focus.yspan;
                }
              }
              scope.jqsvg.css("cursor", "move");
            } else {
              // scale only
              var level = scope.zoomLevel;
              if (my <= plotUtils.safeHeight(scope.jqsvg) - scope.layout.bottomLayoutMargin) {
                // scale y
                var ym = focus.yl + scope.scr2dataYp(my) * focus.yspan;
                var nyl = ym - ds * (ym - focus.yl), nyr = ym + ds * (focus.yr - ym),
                    nyspan = nyr - nyl;

                if (nyspan >= level.minSpanY && nyspan <= level.maxScaleY) {
                  focus.yl = nyl;
                  focus.yr = nyr;
                  focus.yspan = nyspan;
                } else {
                  if (nyspan > level.maxScaleY) {
                    focus.yr = focus.yl + level.maxScaleY;
                  } else if (nyspan < level.minSpanY) {
                    focus.yr = focus.yl + level.minSpanY;
                  }
                  focus.yspan = focus.yr - focus.yl;
                }
              }
              if (mx >= scope.layout.leftLayoutMargin) {
                // scale x
                var xm = focus.xl + scope.scr2dataXp(mx) * focus.xspan;
                var nxl = xm - ds * (xm - focus.xl), nxr = xm + ds * (focus.xr - xm),
                    nxspan = nxr - nxl;
                if (nxspan >= level.minSpanX && nxspan <= level.maxScaleX) {
                  focus.xl = nxl;
                  focus.xr = nxr;
                  focus.xspan = nxspan;
                } else {
                  if (nxspan > level.maxScaleX) {
                    focus.xr = focus.xl + level.maxScaleX;
                  } else if (nxspan < level.minSpanX) {
                    focus.xr = focus.xl + level.minSpanX;
                  }
                  focus.xspan = focus.xr - focus.xl;
                }
              }
              scope.emitZoomLevelChange();
              scope.fixFocus(focus);
            }
            scope.calcMapping(true);
            scope.renderCursor({
              offsetX : mx,
              offsetY : my
            });
            scope.update();
          } else if (scope.interactMode === "locate") {
            // right click zoom
            scope.mousep2 = {
              "x" : d3.mouse(scope.svg[0][0])[0],
              "y" : d3.mouse(scope.svg[0][0])[1]
            };
            scope.calcLocateBox();
            scope.rpipeRects = [];
            scope.renderLocateBox();
          }
        };
        scope.zoomEnd = function(d) {
          scope.zoomObj.scale(1.0);
          scope.zoomObj.translate([0, 0]);
          if (scope.interactMode === "locate") {
            scope.locateFocus();
            scope.locateBox = null;
            scope.update();
            scope.interactMode = "zoom";
          }
          scope.jqsvg.css("cursor", "auto");
        };
        scope.fixFocus = function(focus) {
          focus.xl = focus.xl < 0 ? 0 : focus.xl;
          focus.xr = focus.xr > 1 ? 1 : focus.xr;
          focus.yl = focus.yl < 0 ? 0 : focus.yl;
          focus.yr = focus.yr > 1 ? 1 : focus.yr;
          focus.xspan = focus.xr - focus.xl;
          focus.yspan = focus.yr - focus.yl;

          if (focus.xl > focus.xr || focus.yl > focus.yr) {
            console.error("visible range specified does not match data range, " +
                "enforcing visible range");
            _.extend(focus, scope.defaultFocus);
          }
        };
        scope.resetFocus = function() {
          var mx = d3.mouse(scope.svg[0][0])[0], my = d3.mouse(scope.svg[0][0])[1];
          var lMargin = scope.layout.leftLayoutMargin, bMargin = scope.layout.bottomLayoutMargin;
          var W = plotUtils.safeWidth(scope.jqsvg), H = plotUtils.safeHeight(scope.jqsvg);
          if (mx < lMargin && my < H - bMargin) {
            _.extend(scope.focus, _.pick(scope.defaultFocus, "yl", "yr", "yspan"));
          } else if (my > H - bMargin && mx > lMargin) {
            _.extend(scope.focus, _.pick(scope.defaultFocus, "xl", "xr", "xspan"));
          } else {
            _.extend(scope.focus, scope.defaultFocus);
          }
          scope.fixFocus(scope.focus);
          scope.calcMapping(true);
          scope.emitZoomLevelChange();
          scope.update();
        };
        scope.locateFocus = function() {
          var box = scope.locateBox;
          if (box == null) {
            return;
          }
          var p1 = {
            "x" : scope.scr2dataXp(box.x),
            "y" : scope.scr2dataYp(box.y)
          };
          var p2 = {
            "x" : scope.scr2dataXp(box.x + box.w),
            "y" : scope.scr2dataYp(box.y + box.h)
          };
          p1.x = Math.max(0, p1.x);
          p1.y = Math.max(0, p1.y);
          p2.x = Math.min(1, p2.x);
          p2.y = Math.min(1, p2.y);

          var focus = scope.focus, ofocus = {};
          _.extend(ofocus, scope.focus);
          focus.xl = ofocus.xl + ofocus.xspan * p1.x;
          focus.xr = ofocus.xl + ofocus.xspan * p2.x;
          focus.yl = ofocus.yl + ofocus.yspan * p2.y;
          focus.yr = ofocus.yl + ofocus.yspan * p1.y;
          focus.xspan = focus.xr - focus.xl;
          focus.yspan = focus.yr - focus.yl;
          scope.calcMapping(true);
          scope.emitZoomLevelChange();
        };
        scope.resetSvg = function() {
          scope.jqcontainer.find(".plot-constlabel").remove();

          scope.rpipeGridlines = [];
          scope.rpipeTexts = [];
          scope.rpipeTicks = [];
        };
        scope.enableZoom = function() {
          scope.svg.call(scope.zoomObj.on("zoomstart", function(d) {
            return scope.zoomStart(d);
          }).on("zoom", function(d) {
            return scope.zooming(d);
          }).on("zoomend", function(d) {
            return scope.zoomEnd(d);
          }));
          scope.svg.on("dblclick.zoom", function() {
            return scope.resetFocus();
          });
        };
        scope.disableZoom = function() {
          scope.svg.call(scope.zoomObj.on("zoomstart", null).on("zoom", null).on("zoomend", null));
        };
        scope.disableWheelZoom = function() {
          scope.svg.on("wheel.zoom", null);
        };

        scope.mouseleaveClear = function() {
          scope.svg.selectAll(".plot-cursor").remove();
          scope.jqcontainer.find(".plot-cursorlabel").remove();
        };

        scope.calcMapping = function(emitFocusUpdate) {
          // called every time after the focus is changed
          var focus = scope.focus;
          var lMargin = scope.layout.leftLayoutMargin,
              bMargin = scope.layout.bottomLayoutMargin,
              tMargin = scope.layout.topLayoutMargin,
              rMargin = scope.layout.rightLayoutMargin;
          var model = scope.stdmodel;
          var W = plotUtils.safeWidth(scope.jqsvg), H = plotUtils.safeHeight(scope.jqsvg);
          if (emitFocusUpdate == true && scope.model.updateFocus != null) {
            scope.model.updateFocus({
              "xl" : focus.xl,
              "xr" : focus.xr
            });
          }
          scope.data2scrY =
            d3.scale.linear().domain([focus.yl, focus.yr]).range([H - bMargin, tMargin]);
          scope.data2scrYp =
            d3.scale.linear().domain([focus.yl, focus.yr]).range([1, 0]);
          scope.scr2dataY =
            d3.scale.linear().domain([tMargin, H - bMargin]).range([focus.yr, focus.yl]);
          scope.scr2dataYp =
            d3.scale.linear().domain([tMargin, H - bMargin]).range([1, 0]);
          scope.data2scrX =
            d3.scale.linear().domain([focus.xl, focus.xr]).range([lMargin, W - rMargin]);
          scope.data2scrXp =
            d3.scale.linear().domain([focus.xl, focus.xr]).range([0, 1]);
          scope.scr2dataX =
            d3.scale.linear().domain([lMargin, W-rMargin]).range([focus.xl, focus.xr]);
          scope.scr2dataXp =
            d3.scale.linear().domain([lMargin, W-rMargin]).range([0, 1]);

          scope.data2scrXi = function(val) {
            return Number(scope.data2scrX(val).toFixed(scope.renderFixed));
          };
          scope.data2scrYi = function(val) {
            return Number(scope.data2scrY(val).toFixed(scope.renderFixed));
          };
        };

        scope.standardizeData = function() {
          var model = scope.model.getCellModel();
          scope.stdmodel = plotFormatter.standardizeModel(model, scope.prefs);
        };

        scope.dumpState = function() {
          var state = {};

          state.showAllItems = scope.showAllItems;
          state.plotSize = scope.plotSize;
          state.zoomed = scope.zoomed;
          state.focus = scope.focus;

          state.lodOn = [];
          state.lodType = [];
          state.lodAuto = [];
          state.zoomHash = [];
          state.showItem = [];
          var data = scope.stdmodel.data;
          for (var i = 0; i < data.length; i++) {
            state.lodOn[i] = data[i].lodOn;
            state.lodType[i] = data[i].lodType;
            state.lodAuto[i] = data[i].lodAuto;
            state.zoomHash[i] = data[i].zoomHash;
            state.showItem[i] = data[i].showItem;
          }
          state.visibleItem = scope.visibleItem;
          state.legendableItem = scope.legendableItem;
          state.defaultFocus = scope.defaultFocus;


          state.tips = {};
          $.extend(true, state.tips, scope.tips);

          return state;
        };

        scope.loadState = function(state) {
          scope.showAllItems = state.showAllItems;
          scope.plotSize = state.plotSize;
          scope.zoomed = state.zoomed;
          scope.focus = state.focus;
          var data = scope.stdmodel.data;
          for (var i = 0; i < data.length; i++) {
            if(data[i].isLodItem === true){
              data[i].lodOn = state.lodOn[i];
              if (state.lodOn[i]) {
                data[i].applyLodType(state.lodType[i]);
                data[i].applyLodAuto(state.lodAuto[i]);
                data[i].applyZoomHash(state.zoomHash[i]);
              }
            }
            data[i].showItem = state.showItem[i];
          }
          scope.visibleItem = state.visibleItem;
          scope.legendableItem = state.legendableItem;
          scope.defaultFocus = state.defaultFocus;
          if(scope.defaultFocus) {
            scope.fixFocus(scope.defaultFocus);
          }

          $.extend(true, scope.tips, state.tips);
        };

        scope.initFlags = function() {
          scope.showAllItems = true;
          scope.showLodHint = true;
          scope.showUnorderedHint = true;
        };

        scope.clearRemovePipe = function() {
          // some hints are set to be removed at the end of the next rendering cycle
          for (var i = 0; i < scope.removePipe.length; i++) {
            var id = scope.removePipe[i];
            scope.jqcontainer.find("#" + id).remove();
          }
          scope.removePipe.length = 0;
        };

        scope.init = function() {
          
          // first standardize data
          scope.standardizeData();
          // init flags
          scope.initFlags();

          // see if previous state can be applied
          scope.focus = {};

          if (!scope.model.getCellModel().tips) {
            scope.model.getCellModel().tips = {};
          }

          scope.tips = scope.model.getCellModel().tips;
          scope.plotSize = {};

          _.extend(scope.plotSize, scope.stdmodel.plotSize);
          var savedstate = scope.model.getDumpState();
          if (scope.doNotLoadState !== true && savedstate !== undefined && savedstate.plotSize !== undefined) {
            scope.loadState(savedstate);
          } else {
            if (scope.setDumpState !== undefined) {
              scope.setDumpState(scope.dumpState());
            }
          }
          scope.doNotLoadState = false;

          // create layout elements
          scope.initLayout();

          scope.resetSvg();
          scope.zoomObj = d3.behavior.zoom();

          // set zoom object
          scope.svg.on("mousedown", function() {
            return scope.mouseDown();
          }).on("mouseup", function() {
            return scope.mouseUp();
          }).on("mouseleave", function() {
            return scope.disableWheelZoom();
          });
          scope.jqsvg.mousemove(function(e) {
            return scope.renderCursor(e);
          }).mouseleave(function(e) {
            return scope.mouseleaveClear(e);
          });
          scope.enableZoom();
          scope.disableWheelZoom();
          scope.calcRange();

          // init copies focus to defaultFocus, called only once
          if(_.isEmpty(scope.focus)){
            _.extend(scope.focus, scope.defaultFocus);
          }

          // init remove pipe
          scope.removePipe = [];

          scope.calcMapping();

          scope.legendDone = false;
          scope.update();
        };

        scope.update = function(first) {
          if (scope.model.isShowOutput !== undefined && scope.model.isShowOutput() === false) {
            return;
          }

          scope.resetSvg();
          scope.calcGridlines();
          scope.renderGridlines();
          plotUtils.plotGridlines(scope);

          scope.renderData();
          scope.renderGridlineLabels();
          scope.renderGridlineTicks();
          scope.renderCoverBox(); // redraw
          plotUtils.plotLabels(scope); // redraw
          plotUtils.plotTicks(scope); // redraw

          plotTip.renderTips(scope);
          scope.renderLocateBox(); // redraw
          scope.renderLegends(); // redraw
          scope.updateMargin(); //update plot margins

          scope.prepareInteraction();

          scope.clearRemovePipe();
        };


        scope.getDumpState = function () {
          if (scope.model.getDumpState !== undefined) {
            return scope.model.getDumpState();
          }
        };


        scope.setDumpState = function (state) {
          if (scope.model.setDumpState !== undefined) {
              scope.model.setDumpState(state);

              bkSessionManager.setNotebookModelEdited(true);
              bkUtils.refreshRootScope();
          }
        };

        if (scope.model.getCellModel().type === "TreeMap"){
          bkoChartExtender.extend(scope, element, attrs);
        }
        scope.init(); // initialize
        scope.$watch('getDumpState()', function (result) {
          if (result !== undefined && result.plotSize === undefined) {
            scope.setDumpState(scope.dumpState());
          }
        });

        scope.getCellWidth = function () {
          return scope.jqcontainer.width();
        };

        scope.getCellHeight= function () {
          return scope.jqcontainer.height();
        };

        var watchCellSize = function () {
          if (!scope.model.isShowOutput || (scope.model.isShowOutput && scope.model.isShowOutput() === true)) {
            scope.plotSize.width = scope.getCellWidth();
            scope.plotSize.height = scope.getCellHeight();
            if (scope.setDumpState !== undefined) {
              scope.setDumpState(scope.dumpState());
            }
          }
        };

        scope.$watch('getCellWidth()', function (newValue, oldValue) {
          if(newValue !== oldValue){
            watchCellSize();
          }
        });

        scope.$watch('getCellHeight()', function (newValue, oldValue) {
          if(newValue !== oldValue){
            watchCellSize();
          }
        });

        scope.getCellModel = function() {
          return scope.model.getCellModel();
        };
        scope.$watch('getCellModel()', function() {
          scope.init();
        });
        scope.getTheme = function(){
          return bkHelper.getTheme();
        };
        scope.$watch('getTheme()', function(newValue, oldValue) {
          if(newValue !== oldValue) {
            if (scope.model.setDumpState !== undefined) {
              scope.model.setDumpState(scope.dumpState());
            }
            scope.legendDone = false;
            scope.init();
          }
        });

        scope.$on('$destroy', function() {
          $(window).off('resize',scope.resizeFunction);
          scope.svg.selectAll("*").remove();
          scope.jqlegendcontainer.find("#plotLegend").remove();
          scope.removeOnKeyListeners();
          $.contextMenu('destroy', { selector: '#' + scope.id});
        });

        scope.getSvgToSave = function() {
          var svg = scope.svg
            .node()
            .cloneNode(true);
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          svg.setAttribute('class', 'svg-export');

          var plotTitle = scope.jqplottitle;
          var titleOuterHeight = plotUtils.getActualCss(plotTitle, 'outerHeight', true);

          //legend
          scope.adjustSvgPositionWithLegend(svg, titleOuterHeight);
          scope.appendLegendToSvg(d3.select(svg));
          ///////

          plotUtils.translateChildren(svg, 0, titleOuterHeight);
          plotUtils.addTitleToSvg(svg, plotTitle, {
            width: plotTitle.width(),
            height: plotUtils.getActualCss(plotTitle, 'outerHeight') 
          });

          // Custom styles added by user
          var cellModel = scope.getCellModel(),
            extraStyles = [],
            styleString = '';
          if(cellModel.element_styles) {
              for(var style in cellModel.element_styles) {
                styleString = cellModel.element_styles[style];
                if (style === '.plot-title') {
                  styleString = plotUtils.adjustStyleForSvg(styleString);
                }
                extraStyles.push(style + ' {' + styleString + '}');
              }
          }

          if(cellModel.custom_styles) 
              extraStyles = extraStyles.concat(cellModel.custom_styles);

          plotUtils.addInlineStyles(svg, extraStyles);

          return svg;
        };

        scope.saveAsSvg = function() {
          var html = plotUtils.convertToXHTML(scope.getSvgToSave().outerHTML);
          var fileName = _.isEmpty(scope.stdmodel.title) ? 'plot' : scope.stdmodel.title;
          plotUtils.download('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(html))), fileName + ".svg");
        };

        scope.saveAsPng = function() {
          var svg = scope.getSvgToSave();

          scope.canvas.width = svg.getAttribute("width");
          scope.canvas.height = svg.getAttribute("height");

          var imgsrc = 'data:image/svg+xml;base64,' +
            btoa(unescape(encodeURIComponent(plotUtils.convertToXHTML(svg.outerHTML))));
          var fileName = _.isEmpty(scope.stdmodel.title) ? 'plot' : scope.stdmodel.title;
          plotUtils.drawPng(scope.canvas, imgsrc, fileName + ".png");
        };

        scope.adjustSvgPositionWithLegend = function(svg, titleOuterHeight) {
          var isHorizontal = scope.stdmodel.legendLayout === "HORIZONTAL";
          var margin = scope.layout.legendMargin;
          var legendContainer = scope.jqlegendcontainer.find("#plotLegend");
          var containerLeftMargin = parseFloat(scope.jqcontainer.css("margin-left"));


          var W = plotUtils.outerWidth(scope.jqcontainer) + containerLeftMargin + 1;//add 1 because jQuery round size
          var H = plotUtils.outerHeight(scope.jqcontainer) + titleOuterHeight + 1;
          var legendW = plotUtils.getActualCss(legendContainer, 'outerWidth', true);
          var legendH = plotUtils.getActualCss(legendContainer, 'outerHeight', true);
          var legendPosition = scope.stdmodel.legendPosition;

          if (!legendPosition.position) {
            if (legendPosition.x + legendW > W) {
              W += legendPosition.x + legendW - W;
            }
            if ((legendPosition.y + legendH) > H) {
              H += legendPosition.y + legendH - H;
            }
          }

          if (legendPosition.position === "LEFT") {
            plotUtils.translateChildren(svg, legendW + margin, 0);
            W += legendW + margin;
          }
          if (legendPosition.position === "RIGHT") {
            W += legendW + margin;
          }
          if (legendPosition.position === "BOTTOM") {
            H += legendH + margin;
          }
          if (legendPosition.position === "TOP") {
            plotUtils.translateChildren(svg, 0, legendH + margin);
            H += legendH + margin;
          }
          if (isHorizontal) {
            if (["TOP_LEFT", "TOP_RIGHT"].indexOf(legendPosition.position) !== -1) {
              plotUtils.translateChildren(svg, 0, legendH + margin);
              H += legendH + margin;
            }
            if (["BOTTOM_LEFT", "BOTTOM_RIGHT"].indexOf(legendPosition.position) !== -1) {
              H += legendH + margin;
            }
            if (legendPosition.position !== "LEFT") {
              plotUtils.translateChildren(svg, containerLeftMargin, 0);
            }
          } else {
            if (["TOP_LEFT", "BOTTOM_LEFT"].indexOf(legendPosition.position) !== -1) {
              plotUtils.translateChildren(svg, legendW + margin, 0);
              W += legendW + margin;
            }
            if (["TOP_RIGHT", "BOTTOM_RIGHT"].indexOf(legendPosition.position) !== -1) {
              W += legendW + margin;
            }
            if (["LEFT", "TOP_LEFT", "BOTTOM_LEFT"].indexOf(legendPosition.position) < 0) {
              plotUtils.translateChildren(svg, containerLeftMargin, 0);
            }
          }
          svg.setAttribute("width", W);
          svg.setAttribute("height", H);
          $(svg).css("width", W);
          $(svg).css("height", H);
        };

        scope.appendLegendToSvg = function(svg) {

          var legend = scope.jqlegendcontainer.find("#plotLegend");
          if (scope.legendableItem === 0 || scope.stdmodel.showLegend === false || !legend.length) { return; }
          var legendCopy = scope.jqlegendcontainer.find("#plotLegend").clone();
          legendCopy.find(".plot-legendcheckbox").each(function(i, item) {
            if (item.checked) {
              item.setAttribute("checked", true);
            }
            item.setAttribute("onclick", "return false");
          });
          legendCopy.css("position", "inherit");

          //remove base from urls
          legendCopy.find("[style*='url']").each(function(i, item){
            var style = $(item).attr('style');
            style = style.replace("/beaker/", "");
            $(item).attr('style', style);
          });

          var getPositive = function(value) {
            return value > 0 ? value : 0;
          };

          var position = plotUtils.getActualCss(legend, 'position');
          var x = getPositive(position.left);
          var y = position.top != null ? getPositive(position.top) : getPositive(position.bottom);
          svg.append("foreignObject")
            .attr("width", plotUtils.getActualCss(legend, 'outerWidth', true) + 1)//add 1 because jQuery round size
            .attr("height", plotUtils.getActualCss(legend, 'outerHeight', true) + 1)
            .attr("x", x)
            .attr("y", y)
            .append("xhtml:body")
            .attr("xmlns", "http://www.w3.org/1999/xhtml")
            .html(legendCopy[0].outerHTML);
        }

      }
    };
  };
  beakerRegister.bkoDirective("Plot", [
    "plotUtils",
    "plotTip",
    "plotFormatter",
    "plotFactory",
    "bkCellMenuPluginManager",
    "bkSessionManager",
    "bkUtils",
    "GradientLegend",
    "bkoChartExtender",
    "plotService",
    "$compile",
    retfunc]);
})();

/*
 *  Copyright 2015 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
(function () {
  'use strict';
  var module = angular.module('bk.outputDisplay');

  (function ($) {
    $.widget("custom.combobox", {
      options: {
        change: null,
        disabled: false
      },
      _create: function () {
        this.editable = this.element.attr('easyform-editable') === 'true';
        this.wrapper = $("<span>")
            .addClass("custom-combobox")
            .insertAfter(this.element);

        this.element.hide();
        this._createAutocomplete();
        this._createShowAllButton();
      },

      _createAutocomplete: function () {
        var selected = this.element.children(":selected"),
            value = selected.val() ? selected.text() : "";

        this.input = $("<input>")
            .appendTo(this.wrapper)
            .val(value)
            .attr("title", "")
            .attr("ng-model", this.element.attr('ng-model'))
            .addClass("custom-combobox-input ui-widget ui-widget-content ui-corner-left")
            .autocomplete({
              delay: 0,
              minLength: 0,
              source: $.proxy(this, "_source")
            })
            .tooltip({
              tooltipClass: "ui-state-highlight"
            });

        this.element.removeAttr('ng-model');

        if (!this.editable) {
          this.input.attr('readonly', 'true');
          var input = this.input, wasOpen = false;
          this.input
              .mousedown(function () {
                wasOpen = input.autocomplete("widget").is(":visible");
              })
              .click(function () {
                input.focus();
                if (wasOpen) {
                  return;
                }
                input.autocomplete("search", "");
              });
        }

        if(this.options.disabled){
          this.input.attr('disabled', 'disabled');
        }

        this._on(this.input, {
          autocompleteselect: function (event, ui) {
            ui.item.option.selected = true;
            this._trigger("select", event, {
              item: ui.item.option
            });
            if ($.isFunction(this.options.change)) {
              this.options.change(ui.item.option.value);
            }
          }
        });
      },

      _createShowAllButton: function () {
        var input = this.input,
            wasOpen = false;

        //use jquery button fn instead of bootstrap
        //reverts to jquery button fn
        var bootstrapButtonFn = $.fn.button.noConflict();

        var self = this;
        var showAllButton = $("<a>")
            .attr("tabIndex", -1)
            .attr("title", "Show All Items")
            .appendTo(this.wrapper)
            .button({
              icons: {
                primary: "ui-icon-triangle-1-s"
              },
              text: false
            })
            .removeClass("ui-corner-all")
            .addClass("custom-combobox-toggle ui-corner-right")
            .mousedown(function () {
              if (!self.options.disabled) {
                wasOpen = input.autocomplete("widget").is(":visible");
              }
            })
            .click(function () {
              if (!self.options.disabled) {
                input.focus();
                if (wasOpen) {
                  return;
                }
                input.autocomplete("search", "");
              }
            });

        if (self.options.disabled) {
          showAllButton.attr("disabled", "disabled");
        } else {
          showAllButton.removeAttr("disabled");
        }

        //return to bootstrap button fn
        $.fn.button = bootstrapButtonFn;
      },

      _source: function (request, response) {
        var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
        response(this.element.children("option").map(function () {
          var text = $(this).text();
          if (this.value && ( !request.term || matcher.test(text) ))
            return {
              label: text,
              value: text,
              option: this
            };
        }));
      },

      _destroy: function () {
        this.wrapper.remove();
        this.element.show();
      }
    });
  })(jQuery);

  function EasyFormComponent(scope, element, constants, service, utils) {

    this.scope = scope;
    this.element = element;
    this.constants = constants;
    this.service = service;
    this.utils = utils;
    this.watchByObjectEquality = false;

    var component = null;

    this.getComponent = function() {
      return component;
    };

    this.setWatchByObjectEquality = function(value) {
      this.watchByObjectEquality = value;
    };

    this.isWatchByObjectEquality = function() {
      return this.watchByObjectEquality;
    };

    this.watchedExpression = function (scope) {
      return scope[scope.ngModelAttr];
    };

    var that = this;

    this.valueChangeHandler = function (newValue, oldValue) {
      if (newValue != undefined && newValue != null) {
        newValue = that.prepareValueForSave(newValue);
        component.value = newValue;
        service.setComponentValue(scope.formId, scope.evaluatorId, component, newValue);
      }
    };

    this.prepareValueForSave = function(value) {
      return value;
    };

    this.buildUI = function () {};

    this.initValue = function (component) {
      if (component.value) {
        scope[scope.ngModelAttr] = component.value;
      }
    };

    this.init = function() {
      component = scope.component;
      scope.componentId = component.label;
      scope.id = scope.componentId.toLowerCase().replace(/\s/g, '');
      scope.ngModelAttr = utils.getValidNgModelString(component.label);

      this.buildUI();

      this.initValue(component);

      if (scope.evaluatorExist) {
        scope.$watch(this.watchedExpression,
            this.valueChangeHandler,
            this.isWatchByObjectEquality());
      }
      this.addUpdatedListener();
      this.addValueLoadedListener();
    };

    this.addListener = function(event, handler) {
      scope.$on(event, handler);
    };

    this.addUpdatedListener = function() {
      this.addListener(constants.Events.UPDATED, function(event, args) {
        args.components.forEach(function(component) {
          if (component.label === scope.componentId) {
            scope.$apply(function() {
              scope[scope.ngModelAttr] = component.value;
              scope.component.enabled = component.enabled;
            });
          }
        });
      });
    };

    this.addValueLoadedListener = function() {
      this.addListener(constants.Events.VALUE_LOADED, function(event, args) {
        scope.$apply(function() {
          scope[scope.ngModelAttr] = service.getComponentValue(scope.formId, component);
        });
      });
    };
  };

  module.directive("easyFormTextField",
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container'>" +
                    "<input type='text' class='text-field' ng-disabled='!component.enabled'/>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                var fixedSize = false;
                if (!efc.getComponent().width
                    || parseInt(efc.getComponent().width)
                      < efc.constants.Components.TextField.MIN_WIDTH) {
                  efc.getComponent().width = efc.constants.Components.TextField.MIN_WIDTH;
                } else {
                  fixedSize = true;
                }
                element.find('.easyform-label').text(efc.getComponent().label);
                var textField = element.find('.text-field');
                textField.attr('ng-model', scope.ngModelAttr)
                    .attr('size', efc.getComponent().width);
                if (fixedSize) {
                  element.find('.easyform-component-container').addClass('fixed-size');
                }
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormTextArea",
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container'>" +
                    "<textarea class='text-area' ng-disabled='!component.enabled'/>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                var fixedSize = false;
                if (!efc.getComponent().height
                    || parseInt(efc.getComponent().height)
                      < efc.constants.Components.TextArea.MIN_HEIGHT) {
                  efc.getComponent().height = efc.constants.Components.TextArea.MIN_HEIGHT;
                }
                if (!efc.getComponent().width
                    || parseInt(efc.getComponent().width)
                      < efc.constants.Components.TextArea.MIN_WIDTH) {
                  efc.getComponent().width = efc.constants.Components.TextArea.MIN_WIDTH;
                } else {
                  fixedSize = true;
                }
                element.find('.easyform-label').text(efc.getComponent().label);
                var textArea = element.find('.text-area');
                textArea
                    .attr('ng-model', scope.ngModelAttr)
                    .attr('rows', efc.getComponent().height);
                if (fixedSize) {
                  element.find('.easyform-component-container').addClass('fixed-size');
                  textArea.css('width', parseInt(efc.getComponent().width) + 1.5 + 'ch');
                }
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormCheckBox",
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<div class='easyform-component-container'>" +
                    "<input type='checkbox' ng-disabled='!component.enabled' class='check-box'/>" +
                    "<label class='easyform-label'/>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                element.find('.easyform-label').text(efc.getComponent().label).attr('for', scope.id);
                var checkBox = element.find('.check-box');
                checkBox.attr('ng-model', scope.ngModelAttr);
                checkBox.attr('id', scope.id);
                if ('true' === efc.getComponent().value) {
                  efc.getComponent().value = true;
                  checkBox.attr('checked', 'true');
                } else {
                  efc.getComponent().value = false;
                }
              };

              efc.addUpdatedListener = function() {
                efc.addListener(efc.constants.Events.UPDATED, function(event, args) {
                  args.components.forEach(function(component) {
                    if (component.label === scope.componentId) {
                      scope.$apply(function() {
                        scope[scope.ngModelAttr] = component.value === 'true' ? true : false;
                        scope.component.enabled = component.enabled;
                      });
                    }
                  });
                });
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive('easyFormCheckBoxGroup',
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container'>" +
                    "<div class='check-box-group-item'" +
                    " ng-repeat='value in values track by $index' " +
                    " ng-class='{horizontal : !!horizontal}'>" +
                    " <input type='checkbox' id='{{value.id}}' ng-model='value.selected' name='selectedValues[]' " +
                    " ng-disabled='!component.enabled'/>" +
                    " <label for='{{value.id}}' class='check-box-group-item-label' ng-bind='value.name'/>" +
                    "</div>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                scope.values = [];
                if (efc.getComponent().values && efc.getComponent().values.length > 0) {
                  efc.getComponent().values.forEach(function (value) {
                    var valuePostfix = value.toLowerCase().replace(/\s+/g, '');
                    var obj = {
                      name: value,
                      selected: false,
                      id: scope.id + valuePostfix
                    };
                    scope.values.push(obj);
                  });
                }

                element.find('.easyform-label').text(efc.getComponent().label);
                scope.horizontal = 'true' === efc.getComponent().isHorizontal.toString();
              };

              efc.watchedExpression = function (scope) {
                return scope.values;
              };

              efc.prepareValueForSave = function (value) {
                value = value
                    .filter(function(x) { return x.selected; })
                    .map(function(x) { return x.name; })
                    .join(', ');
                if (value) {
                  value = '[' + value + ']';
                }
                return value;
              };

              efc.setWatchByObjectEquality(true);

              efc.addUpdatedListener = function() {
                efc.addListener(efc.constants.Events.UPDATED, function(event, args) {
                  args.components.forEach(function(component) {
                    if (component.label === scope.componentId && component.value) {
                      var selectedValues = component.value.substring(1, component.value.length - 1)
                          .split(', ');
                      scope.values.forEach(function(value) {
                        value.selected = selectedValues.indexOf(value.name) != -1
                      });
                      scope.$apply(function() {
                        scope[scope.ngModelAttr] = component.value;
                        scope.component.enabled = component.enabled;
                      });
                    }
                  });
                });
              };

              efc.addValueLoadedListener = function() {
                efc.addListener(efc.constants.Events.VALUE_LOADED, function(event, args) {
                  var loadedValue = efc.service.getComponentValue(scope.formId, efc.getComponent());
                  if (loadedValue) {
                    scope.$apply(function() {
                      scope.values = JSON.parse(loadedValue);
                    });
                  }
                });
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormComboBox",
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container position-absolute'>" +
                    "<div class='combo-box-input-outer'>" +
                      "<div class='combo-box-outer'>" +
                        "<select class='combo-box' ng-disabled='!component.enabled'>" +
                          "<option ng-repeat='value in values' value='{{value}}'>" +
                            "{{value}}" +
                          "</option>" +
                        "</select>" +
                      "</div>" +
                    "</div>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                element.find('.easyform-label').text(efc.getComponent().label);
                var comboBox = element.find('.combo-box');
                comboBox.attr('ng-model', scope.ngModelAttr);

                var editable = efc.getComponent().editable
                    && efc.getComponent().editable === 'true';
                comboBox.attr('easyform-editable', editable);
                comboBox.combobox({change : efc.valueChangeHandler, disabled: !scope.component.enabled});
                if (editable && efc.getComponent().width
                    && parseInt(efc.getComponent().width)
                        > efc.constants.Components.ComboBox.MIN_WIDTH) {
                  element.find('.custom-combobox-input')
                      .css('width', parseInt(efc.getComponent().width) + 1 + 'ch');
                }

                if (!efc.getComponent().values) {
                  efc.getComponent().values = [];
                }
                scope.values = efc.getComponent().values;
              };

              efc.addUpdatedListener = function() {
                efc.addListener(efc.constants.Events.UPDATED, function(event, args) {
                  args.components.forEach(function(component) {
                    if (component.label === scope.componentId) {
                      scope.$apply(function() {
                        scope[scope.ngModelAttr] = component.value;
                        scope.component.enabled = component.enabled;
                      });
                    }
                  });
                });
              };

              efc.addValueLoadedListener = function() {
                efc.addListener(efc.constants.Events.VALUE_LOADED, function(event, args) {
                  var loadedValue = efc.service.getComponentValue(scope.formId, efc.getComponent());
                  if (loadedValue) {
                    scope.$apply(function() {
                      scope[scope.ngModelAttr] = JSON.parse(loadedValue);
                    });
                  }
                });
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormListComponent",
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container'>" +
                    "<div class='list-component-outer'>" +
                      "<select class='list-component' ng-disabled='!component.enabled'/>" +
                    "</div>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var setListComponentValue = function(component) {
                if (component.value) {
                  scope[scope.ngModelAttr] =
                    'true' === efc.getComponent().multipleSelection
                      ? component.value.substring(1, component.value.length - 1).split(', ')
                      : component.value;
                }
              };

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.initValue = function (component) {
                setListComponentValue(component);
              };

              efc.buildUI = function() {
                element.find('.easyform-label').text(efc.getComponent().label);
                var listComponent = element.find('.list-component');
                listComponent.attr('ng-model', scope.ngModelAttr);

                if ('true' === efc.getComponent().multipleSelection) {
                  listComponent.attr('multiple', 'true');
                }

                var size;
                if (efc.getComponent().size && efc.getComponent().size > 0) {
                  size = efc.getComponent().size;
                  listComponent.attr('size', size);
                } else if (efc.getComponent().values && efc.getComponent().values.length > 0) {
                  size = efc.getComponent().values.length;
                  listComponent.attr('size', size);
                }

                if (size >= efc.getComponent().values.length) {
                  //hide scrollbar
                  var outerDiv = element.find('.list-component-outer');
                  outerDiv.addClass('hide-scrollbar');
                }

                if (efc.getComponent().values) {
                  listComponent.attr('ng-options', 'v for v in component.values');
                }
              };

              efc.prepareValueForSave = function(value) {
                if ('true' === efc.getComponent().multipleSelection) {
                  if (value.join) {
                    value = '[' + value.join(', ') + ']';
                  } else {
                    value = '[' + value + ']';
                  }
                }
                return value;
              };

              efc.addUpdatedListener = function() {
                efc.addListener(efc.constants.Events.UPDATED, function(event, args) {
                  args.components.forEach(function(component) {
                    if (component.label === scope.componentId) {
                      scope.$apply(function() {
                        setListComponentValue(component);
                        scope.component.enabled = component.enabled;
                      });
                    }
                  });
                });
              };

              efc.addValueLoadedListener = function() {
                efc.addListener(efc.constants.Events.VALUE_LOADED, function(event, args) {
                  var loadedValue = efc.service.getComponentValue(scope.formId, efc.getComponent());
                  if (loadedValue) {
                    scope.$apply(function() {
                      scope.values = JSON.parse(loadedValue);
                    });
                  }
                });
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormRadioButtonComponent",
      ['$compile', 'bkUtils', 'bkSessionManager', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, bkSessionManager, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container'>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                element.find('.easyform-label').text(efc.getComponent().label);

                if (efc.getComponent().values && efc.getComponent().values.length > 0) {
                  var container = element.find('.easyform-component-container');
                  var horizontal = 'true' === efc.getComponent().isHorizontal.toString();
                  var radioButtonItemsContainer
                      = angular.element('<div class="radio-button-items-container"></div>');

                  efc.getComponent().values.forEach(function (value) {
                    var valuePostfix = value.toLowerCase().replace(/\s+/g, '');
                    var outerRadioButtonWrap
                        = angular.element('<div class="radio-button-item"></div>');
                    var outerRadioButtonLabel
                        = angular.element('<label class="radio-button-item-label"></label>');
                    outerRadioButtonWrap.addClass(horizontal ? 'horizontal' : 'vertical');
                    var radioButton
                        = angular.element('<input type="radio" class="radio-button-component-item"'
                        + ' ng-disabled="!component.enabled"/>')
                        .attr('ng-model', scope.ngModelAttr)
                        .attr('value', value)
                        .attr('id', scope.id + valuePostfix);
                    outerRadioButtonLabel.attr('for', scope.id + valuePostfix).text(value);
                    var divSpacer = angular.element('<div class="radio-button-item-spacer"/>');
                    outerRadioButtonWrap.append(radioButton).append(outerRadioButtonLabel).append(divSpacer);
                    radioButtonItemsContainer.append(outerRadioButtonWrap);
                  });

                  container.append(radioButtonItemsContainer);
                }
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormDatePickerComponent",
      ['$compile', 'bkUtils', 'EasyFormConstants', 'EasyFormService',
        function ($compile, bkUtils, EasyFormConstants, EasyFormService) {
          return {
            restrict: "E",
            template:
                "<div class='easyform-container'>" +
                  "<label class='easyform-label'/>" +
                  "<div class='easyform-component-container datepicker-container'>" +
                    "<input type='text' class='date-picker' ng-disabled='!component.enabled'/>" +
                    "<a tabindex='-1' title='Select date' class='date-picker-button ui-button ui-widget ui-state-default ui-button-icon-only custom-combobox-toggle ui-corner-right' role='button' aria-disabled='false'>" +
                      "<span class='ui-button-icon-primary ui-icon ui-icon-triangle-1-s'></span><span class='ui-button-text'></span>" +
                    "</a>" +
                  "</div>" +
                "</div>",
            link: function (scope, element, attrs) {

              var efc = new EasyFormComponent(
                  scope, element, EasyFormConstants, EasyFormService, bkUtils);

              efc.buildUI = function() {
                element.find('.easyform-label').text(efc.getComponent().label);

                var datePicker = element.find('.date-picker');
                datePicker.attr('ng-model', scope.ngModelAttr);

                var datePickerButtonClicked = false;
                var onShowHandler = function() {
                  return datePickerButtonClicked;
                };
                var onCloseHandler = function() {
                  datePickerButtonClicked = false;
                  return true;
                }

                datePicker.attr('maxlength',
                    EasyFormConstants.Components.DatePickerComponent.inputLength);

                if (true === efc.getComponent().showTime) {
                  datePicker.datetimepicker({
                    format: EasyFormConstants.Components.DatePickerComponent.dateTimeFormat,
                    onShow: onShowHandler,
                    onClose: onCloseHandler,
                    allowBlank: true
                  });
                } else {
                  datePicker.datetimepicker({
                    format: EasyFormConstants.Components.DatePickerComponent.dateFormat,
                    onShow: onShowHandler,
                    onClose: onCloseHandler,
                    timepicker: false,
                    allowBlank: true
                  });
                }

                var datePickerButton = element.find('.date-picker-button');
                datePickerButton.on("mousedown", function() {
                  event.stopPropagation();
                  event.preventDefault();
                });
                datePickerButton.click(function() {
                  if (scope.component.enabled) {
                    datePickerButtonClicked = true;
                    datePicker.datetimepicker("toggle");
                  }
                });
                if (scope.component.enabled) {
                  datePickerButton.removeAttr("disabled");
                } else {
                  datePickerButton.attr("disabled", "disabled");
                }
              };

              efc.init();
              $compile(element.contents())(scope);
            }
          };
        }]);

  module.directive("easyFormButtonComponent",
      ['$compile', 'bkUtils', 'bkSessionManager', 'EasyFormConstants', 'EasyFormService',
        'bkCoreManager', '$rootScope',
        function ($compile, bkUtils, bkSessionManager, EasyFormConstants, EasyFormService,
                  bkCoreManager, $rootScope) {
          return {
            restrict: "E",
            template:
                "<div class='button-component-container'>" +
                  "<button type='button' class='btn btn-default' " +
                  "ng-disabled='!component.enabled'/>" +
                "</div>",
            link: function (scope, element, attrs) {
              var component = scope.component;
              scope.component.enabled = component.enabled && scope.evaluatorExist;

              var executeCellWithTag = function () {
                var cellOp = bkSessionManager.getNotebookCellOp();
                var result;
                if (cellOp.hasUserTag(component.tag)) {
                  result = cellOp.getCellsWithUserTag(component.tag);
                  bkCoreManager.getBkApp().evaluateRoot(result)
                      .catch(function (data) {
                        console.log('Evaluation failed');
                      });
                }
              };

              var actionPerformed = function () {
                EasyFormService.sendActionPerformed(scope.formId, scope.evaluatorId,
                    component.label);
              };

              var saveValues = function () {
                var contentAsJson = JSON.stringify(EasyFormService.easyForms[scope.formId]);
                bkUtils.saveFile(component.path, contentAsJson, true);
              };

              var loadValues = function () {
                bkUtils.loadFile(component.path).then(function (contentAsJson) {
                  EasyFormService.easyForms[scope.formId] = JSON.parse(contentAsJson);
                  $rootScope.$broadcast(EasyFormConstants.Events.VALUE_LOADED);
                });
              };

              var buttonComponent = element.find('div.button-component-container button');

              if (EasyFormConstants.Components.ButtonComponent.type == component.type) {
                buttonComponent.text(component.label);
                if (component.tag && scope.evaluatorExist) {
                  buttonComponent.attr('title', component.tag).on('click', executeCellWithTag);
                }
                buttonComponent.on('click', actionPerformed);
                component.click = function() {
                  buttonComponent.click();
                };
              } else if (EasyFormConstants.Components.SaveValuesButton.type == component.type) {
                buttonComponent.text("Save");
                buttonComponent.on('click', saveValues);
              } else if (EasyFormConstants.Components.LoadValuesButton.type == component.type) {
                buttonComponent.text("Load");
                buttonComponent.on('click', loadValues);
              }

              scope.$on(EasyFormConstants.Events.UPDATED, function (event, args) {
                args.components.forEach(function(component) {
                  if (component.label === scope.componentId) {
                    scope.$apply(function() {
                      scope.component.enabled = component.enabled;
                    });
                  }
                });
              });
            }
          };
        }]);

  beakerRegister.bkoDirective("EasyForm",
      ['$compile', 'bkUtils', 'bkEvaluatorManager', 'bkSessionManager', 'EasyFormConstants',
        'EasyFormService',
        function ($compile, bkUtils, bkEvaluatorManager, bkSessionManager, EasyFormConstants,
                  EasyFormService) {
          return {
            template: "<div class='easy-form-container' bk-enter='clickRunButton()' skipfortag='TEXTAREA'></div>",

            controller: function ($scope) {
              $scope.evaluatorExist = $scope.model.getEvaluatorId && $scope.model.getEvaluatorId();


              $scope.clickRunButton = function () {
                if (event && event.target) {
                  var el = $(event.target);
                  var components = $scope.model.getCellModel().components;
                  if (components) {
                    var componentLabel = EasyFormService.getComponentLabel(
                        EasyFormService.getComponentElement(el));
                    if (componentLabel) {

                      var getComponentIndex = function (label) {
                        for (var i = 0; i < components.length; i++) {
                          if (components[i].label === label) {
                            return i;
                          }
                        }
                      };

                      var getNextButton = function (index) {
                        for (var i = index, component = components[index];
                             i < components.length; i++, component = components[i]) {
                          if (component.type === EasyFormConstants.Components.ButtonComponent.type) {
                            return component;
                          }
                        }
                      };

                      var index = getComponentIndex(componentLabel);
                      var button = getNextButton(index);

                      if (button) {
                        button.click();
                      }

                    }
                  }
                }
              };

              $scope.getUpdateService = function () {
                if (window !== undefined && window.languageUpdateService !== undefined
                    && bkEvaluatorManager.getEvaluator($scope.model.getEvaluatorId()) !== undefined)
                  return window.languageUpdateService[$scope.model.getEvaluatorId()];
                return undefined;
              };

              $scope.ingestUpdate = function (model) {
                $scope.update_id = model.update_id;
                var srv = $scope.getUpdateService();

                if ($scope.subscribedId && $scope.subscribedId !== $scope.update_id) {
                  if (srv !== undefined)
                    srv.unsubscribe($scope.subscribedId);
                  $scope.subscribedId = null;
                }

                if (!$scope.subscribedId && $scope.update_id && srv !== undefined) {
                  var onUpdate = function (update) {
                    $scope.ingestUpdate(update);
                    $scope.$broadcast(EasyFormConstants.Events.UPDATED, update);
                  };
                  srv.subscribe($scope.update_id, onUpdate);
                  $scope.subscribedId = $scope.update_id;
                }

              };

              $scope.fetchFromCellModel = function (model, element) {
                if ($scope.evaluatorExist) {
                  $scope.ingestUpdate(model);
                }
                var easyFormContainer = element.find('.easy-form-container');

                if (model.caption) {
                  var fieldsetElement = angular.element('<fieldset></fieldset>');
                  var legendElement = angular.element('<legend></legend>').text(model.caption);
                  easyFormContainer.append(fieldsetElement.append(legendElement));
                  easyFormContainer = fieldsetElement;
                }

                if (model.components) {
                  model.components.forEach(function (component) {
                    component.enabled = !_.isEmpty(model.update_id);
                    var childScope = $scope.$new();
                    childScope.component = component;
                    childScope.formId = $scope.update_id;
                    childScope.evaluatorExist = $scope.evaluatorExist;
                    if ($scope.evaluatorExist) {
                      childScope.evaluatorId = $scope.model.getEvaluatorId();
                    }
                    var newElement
                        = angular.element(EasyFormConstants.Components[component.type].htmlTag);
                    newElement.attr(EasyFormConstants.Attributes.EasyFormComponentID,
                        component.label);
                    childScope.component.enabled = childScope.component.enabled ? true : false;
                    easyFormContainer.append($compile(newElement)(childScope));

                    if ((component.type.indexOf(
                        EasyFormConstants.Components.SaveValuesButton.type) == -1
                        || component.type.indexOf(
                        EasyFormConstants.Components.LoadValuesButton.type) == -1)) {
                      EasyFormService.addComponent($scope.update_id, component);
                    }

                  });
                }

                $scope.alignComponents();

                if ($scope.evaluatorExist) {
                  EasyFormService.setReady($scope.update_id, $scope.model.getEvaluatorId());
                }
              };

              $scope.alignComponents = function() {
                var labels = $('.easyform-label');
                var components = $('.easyform-component-container');
                var maxLabelWidth = findMaxLabelWidth();
                if (maxLabelWidth <= 0) {
                  return;
                }
                var safeIndent = 5;
                var maxComponentWidth = countMaxComponentWidth(maxLabelWidth + safeIndent);
                setComponentsWidthInPercents(maxComponentWidth);
                setEqualLabelsWidth(maxLabelWidth);

                function findMaxLabelWidth() {
                  var maxWidth = -1;
                  for (var i = 0; i < labels.size(); i++) {
                    var elementWidth = labels.eq(i).width();
                    maxWidth = maxWidth < elementWidth ? elementWidth : maxWidth;
                  }
                  return maxWidth;
                }

                function countMaxComponentWidth(labelWidth) {
                  var maxComponentWidth = 0;
                  if (components) {
                    var parentWidth = components.eq(0).parent().width();
                    var defaultBorder = 2, defaultPadding = 1, textFieldMargin = 5,
                        delta = (defaultBorder + defaultPadding + textFieldMargin) * 2;
                    maxComponentWidth = (parentWidth - labelWidth - delta) / parentWidth * 100;
                  }
                  return maxComponentWidth;
                }

                function setComponentsWidthInPercents(width) {
                  for (var i = 0; i < components.size(); i++) {
                    var component = components.eq(i);
                    if (!component.hasClass('fixed-size')) {
                      component.css('width', width + '%');
                    }
                  }
                }

                function setEqualLabelsWidth(width) {
                  for (var i = 0; i < labels.size(); i++) {
                    labels.eq(i).width(width);
                  }
                }
              };

              $(window).resize($scope.alignComponents);

              $scope.$on('$destroy', function () {
                $(window).off('resize', $scope.alignComponents);
                if ($scope.evaluatorExist && $scope.subscribedId) {
                  var srv = $scope.getUpdateService();
                  if (srv !== undefined) {
                    srv.unsubscribe($scope.subscribedId);
                  }
                }
              });
            },

            link: function (scope, element, attrs) {

              scope.getState = function () {
                return scope.model.getCellModel();
              };

              scope.$watch(function () {
                return element.is(':visible')
              }, scope.alignComponents);

              scope.fetchFromCellModel(scope.getState(), element);
            }
          };
        }
      ]);

  module.service('EasyFormService', ["EasyFormConstants", function (EasyFormConstants) {
    var service = {
      easyForms: {},
      addComponent: function (formId, component) {
        if (!this.easyForms[formId]) {
          this.easyForms[formId] = {};
        }
        this.easyForms[formId][component.label] = component;
      },
      setComponentValue: function (formId, evaluatorId, component, value) {
        if (!(this.easyForms[formId] && this.easyForms[formId].ready)) {
          return;
        }
        if (this.easyForms[formId][component.label]) {
          this.easyForms[formId][component.label].currentValue = value;
        }
        if (window.languageServiceBase && window.languageServiceBase[evaluatorId]) {
          var req = $.ajax({
            type: "POST",
            datatype: "json",
            url: window.languageServiceBase[evaluatorId] + '/easyform/set',
            data: {
              id: formId,
              key: component.label,
              value: value
            }
          });
          req.done(function (ret) {
          });
          req.error(function (jqXHR, textStatus) {
            console.error("Unable to set easyform value");
          });
        }
      },
      getComponentValue: function (formId, component) {
        if (this.easyForms[formId] && this.easyForms[formId][component.label]) {
          return this.easyForms[formId][component.label].currentValue;
        }
      },
      setReady: function (formId, evaluatorId) {
        if (window.languageServiceBase && window.languageServiceBase[evaluatorId]) {
          var req = $.ajax({
            type: "POST",
            datatype: "json",
            url: window.languageServiceBase[evaluatorId] + '/easyform/setReady/' + formId
          });
          var self = this;
          req.done(function (ret) {
            self.easyForms[formId].ready = true;
          });
          req.error(function (jqXHR, textStatus) {
            console.log("Unable to set easyform ready.");
          });
        }
      },
      setNotReady: function(formId) {
        this.easyForms[formId].ready = false;
      },
      sendActionPerformed: function(formId, evaluatorId, label) {
        if (window.languageServiceBase && window.languageServiceBase[evaluatorId]) {
          var req = $.ajax({
            type: "POST",
            datatype: "json",
            url: window.languageServiceBase[evaluatorId] + '/easyform/actionPerformed/' + formId,
            data: {
              label: label
            }
          });
          req.done(function (ret) {
          });
          req.error(function (jqXHR, textStatus) {
            console.log("Unable to send information about action performed.");
          });
        }
      },
      getComponentElement: function(childElement) {
        var el = childElement;
        while (el != null && el.parent() && !el.prop('tagName').toLowerCase().startsWith("easy-form")) {
          el = el.parent();
        }
        if (el.prop('tagName').toLowerCase().startsWith("easy-form")) {
          return el;
        }
      },
      getComponentLabel: function(element) {
        if (element) {
          if (!element.jquery) {
            element = $(element);
          }
          return element.attr(EasyFormConstants.Attributes.EasyFormComponentID);
        }
      }
    };
    return service;
  }]);

  module.constant("EasyFormConstants", {
    Attributes: {
      EasyFormComponentID: "data-easyform-component-id"
    },
    Events: {
      UPDATED: "easyformupdated",
      VALUE_LOADED: "easyformvalueloaded"
    },
    Components: {
      TextField: {
        type: "TextField",
        htmlTag: "<easy-form-text-field/>",
        MIN_WIDTH: 1
      },
      TextArea: {
        type: "TextArea",
        htmlTag: "<easy-form-text-area/>",
        MIN_WIDTH: 1,
        MIN_HEIGHT: 3
      },
      CheckBox: {
        type: "CheckBox",
        htmlTag: "<easy-form-check-box/>"
      },
      CheckBoxGroup: {
        type: "CheckBoxGroup",
        htmlTag: "<easy-form-check-box-group/>"
      },
      ComboBox: {
        type: "ComboBox",
        htmlTag: "<easy-form-combo-box/>",
        MIN_WIDTH: 1
      },
      ListComponent: {
        type: "ListComponent",
        htmlTag: "<easy-form-list-component/>"
      },
      RadioButtonComponent: {
        type: "RadioButtonComponent",
        htmlTag: "<easy-form-radio-button-component/>"
      },
      DatePickerComponent: {
        type: "DatePickerComponent",
        htmlTag: "<easy-form-date-picker-component/>",
        dateFormat: "Ymd",
        dateTimeFormat: "Ymd H:i",
        inputLength: 9
      },
      ButtonComponent: {
        type: "ButtonComponent",
        htmlTag: "<easy-form-button-component/>"
      },
      SaveValuesButton: {
        type: "SaveValuesButton",
        htmlTag: "<easy-form-button-component/>"
      },
      LoadValuesButton: {
        type: "LoadValuesButton",
        htmlTag: "<easy-form-button-component/>"
      }
    }
  });
})();
/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/*
 * bkoCombinedPlot
 * This is the output display component for displaying multiple Plots
 */

(function() {
  'use strict';
  var retfunc = function(plotUtils, combinedplotFormatter, bkCellMenuPluginManager, plotService, bkUtils) {
    var CELL_TYPE = "bko-combinedplot";
    return {
      template :
          "<canvas></canvas>" +
          "<div id='combplotTitle' class='plot-title'></div>" +
          "<div class='combplot-plotcontainer'>" +
          "<bk-output-display type='Plot' ng-repeat='m in models' model='m' class='nocollapsing-margins'>" +
          "</bk-output-display>" +
          "</div>",
      controller : function($scope) {
        $scope.getShareMenuPlugin = function() {
          return bkCellMenuPluginManager.getPlugin(CELL_TYPE);
        };
        $scope.$watch("getShareMenuPlugin()", function() {
          var newItems = bkCellMenuPluginManager.getMenuItems(CELL_TYPE, $scope);
          $scope.model.resetShareMenuItems(newItems);
        });
        var model = $scope.model.getCellModel();
        model.saveAsSvg = function(){
          return $scope.saveAsSvg();
        };
        model.saveAsPng = function(){
          return $scope.saveAsPng();
        };
      },
      link : function(scope, element, attrs) {
        scope.canvas = element.find("canvas")[0];
        scope.canvas.style.display="none";

        scope.id = 'bko-plot-' + bkUtils.generateId(6);
        element.find('.combplot-plotcontainer').attr('id', scope.id);
        $.contextMenu({
          selector: '#' + scope.id,
          zIndex: 3,
          items: plotUtils.getSavePlotAsContextMenuItems(scope)
        });

        scope.initLayout = function() {
          var model = scope.stdmodel;
          if (model.title != null) {
            element.find("#combplotTitle").text(model.title).css("width", scope.width || scope.stdmodel.plotSize.width);
          }
        };

        scope.standardizeData = function() {
          var model = scope.model.getCellModel();
          scope.stdmodel = combinedplotFormatter.standardizeModel(model, scope.prefs);
          model.saveAsSvg = function(){
            return scope.saveAsSvg();
          };
          model.saveAsPng = function(){
            return scope.saveAsPng();
          };
        };

        scope.prepareSavedState = function(state) {
          state.focus = scope.calcRange();
          scope.width = scope.stdmodel.plotSize.width;
        };

        scope.applySavedState = function(state) {
          scope.state = state;
          scope.width = state.width;
        };

        scope.preparePlotModels = function() {
          var models = [];
          var plots = scope.stdmodel.plots;
          
          // create a plot model and a saved state for each plot
          for (var i = 0; i < plots.length; i++) {

            var plotmodel = plots[i];

            plotmodel.xAxis.showGridlineLabels = scope.model.getCellModel().x_tickLabels_visible;
            plotmodel.yAxis.showGridlineLabels = scope.model.getCellModel().y_tickLabels_visible;
            
            plotmodel.plotIndex = i;
            var pl = {
              model : plotmodel,
              state : { },
              disableContextMenu: true,
              getCellModel : function() {
                return this.model;
              },
              getDumpState: function() {
                return this.state;
              },
              setDumpState: function(s) {
                this.state = s;
                if (scope.model.setDumpState !== undefined) {
                  scope.model.setDumpState(scope.dumpState());
                }
              },
              resetShareMenuItems : function() {
              },
              getFocus : function() {
                return scope.focus;
              },
              updateFocus : function(focus) {
                scope.focus = {};
                _.extend(scope.focus, focus);
                scope.$apply();
                this.setDumpState(scope.dumpState());
              },
              updateWidth : function(width) {
                scope.width = width;
                element.find("#combplotTitle").css("width", width);
                scope.$apply();
              },
              updateMargin : function() {
                // if any of plots has left-positioned legend we should update left margin (with max value)
                // for all plots (to adjust vertical position)
                var plots = element.find(".plot-plotcontainer");
                var maxMargin = 0;

                plots.each(function() {
                  var value = parseFloat($(this).css('margin-left'));
                  maxMargin = _.max([value, maxMargin]);
                });
                plots.css("margin-left", maxMargin);
                for (var i = 0; i < scope.stdmodel.plots.length; i++) {
                  scope.stdmodel.plots[i].updateLegendPosition();
                }
              },
              getWidth : function() {
                return scope.width;
              },
              onClick: function(subplotId, item, e) {
                for (var i = 0; i < scope.stdmodel.plots.length; i++) {
                  var subplot = scope.stdmodel.plots[i];
                  if (subplotId === subplot.plotId) {
                    var params = plotUtils.getActionObject(scope.model.getCellModel().type, e, i);
                    plotService.onClick(scope.model.getCellModel().update_id,
                                        item.uid,
                                        scope.model.getEvaluatorId(),
                                        params);
                  }
                }
              },
              onKey: function(key, subplotId, item, e) {
                for (var i = 0; i < scope.stdmodel.plots.length; i++) {
                  var subplot = scope.stdmodel.plots[i];
                  if (subplotId === subplot.plotId) {
                    var actionObject = plotUtils.getActionObject(scope.model.getCellModel().type, e, i);
                    plotService.onKey(scope.model.getCellModel().update_id,
                                      item.uid,
                                      scope.model.getEvaluatorId(),
                                      { key: key, actionObject: actionObject });
                  }
                }
              },
              setActionDetails: function(subplotId, item, e) {
                var actionObject;
                for (var i = 0; i < scope.stdmodel.plots.length; i++) {
                  var subplot = scope.stdmodel.plots[i];
                  if (subplotId === subplot.plotId) {
                    actionObject = plotUtils.getActionObject(scope.model.getCellModel().type, e, i);
                  }
                }
                return plotService.setActionDetails(scope.model.getCellModel().update_id,
                                                    item.uid,
                                                    scope.model.getEvaluatorId(),
                                                    actionObject);
              }
            };
            models.push(pl);
          }
          scope.models = models;
        };

        scope.calcRange = function() {
          var xl = 1E100, xr = 0;
          var plots = scope.stdmodel.plots;
          for (var i = 0; i < plots.length; i++) {
            var plotmodel = plots[i]; // models are already standardized at this point
            var ret = plotUtils.getDefaultFocus(plotmodel);
            xl = Math.min(xl, ret.defaultFocus.xl);
            xr = Math.max(xr, ret.defaultFocus.xr);
          }
          return {
            "xl" : xl,
            "xr" : xr
          };
        };

        scope.dumpState = function() {
          var ret = { };
          ret.focus = scope.focus;
          ret.width = scope.width;
          ret.subplots = [];
          for (var i = 0; i < scope.models.length; i++) {
            ret.subplots.push(scope.models[i].state);
          }
          return ret;
        };
        
        scope.init = function() {
          scope.standardizeData();
          scope.preparePlotModels();
          scope.initLayout();
          scope.calcRange();

          if (scope.model.getDumpState !== undefined) {
            var savedstate = scope.model.getDumpState();
            if (savedstate !== undefined && savedstate.subplots !== undefined) {
              for (var i = 0; i < scope.models.length; i++) {
                scope.models[i].state = savedstate.subplots[i];
              }
              scope.width = savedstate.width;
              scope.focus = savedstate.focus;
            } else if (scope.models !== undefined) {
              scope.focus = scope.calcRange();
              for (var i = 0; i < scope.models.length; i++) {
                scope.models[i].state = { };
              }
              if (scope.model.setDumpState !== undefined) {
                scope.model.setDumpState(scope.dumpState());
              }
            }
          }
        };

        if (scope.model.getDumpState !== undefined) {
          scope.getDumpState = function() {
            return scope.model.getDumpState();
          };
        }

        scope.init();

        if (scope.model.getDumpState !== undefined) {
          scope.$watch('getDumpState()', function(result) {
            if (result !== undefined && result.subplots === undefined && scope.models !== undefined) {
              for (var i = 0; i < scope.models.length; i++) {
                scope.models[i].state = { };
              }
              if (scope.model.setDumpState !== undefined) {
                scope.model.setDumpState(scope.dumpState());
              }
            }
          });
        }

        scope.getCellModel = function() {
          return scope.model.getCellModel();
        };
        scope.$watch('getCellModel()', function() {
          scope.init();
        });
        scope.$on('$destroy', function() {
          $.contextMenu('destroy', { selector: '#' + scope.id});
        });

        scope.getSvgToSave = function() {
          var plots = scope.stdmodel.plots;

          var combinedSvg = $("<svg></svg>").attr('xmlns', 'http://www.w3.org/2000/svg').attr('class', 'svg-export');

          var plotTitle = element.find("#combplotTitle");

          plotUtils.addTitleToSvg(combinedSvg[0], plotTitle, {
            width: plotTitle.width(),
            height: plotUtils.getActualCss(plotTitle, "outerHeight")
          });

          var combinedSvgHeight = plotUtils.getActualCss(plotTitle, "outerHeight",  true);
          var combinedSvgWidth = 0;
          for (var i = 0; i < plots.length; i++) {
            var svg = plots[i].getSvgToSave();
            plotUtils.translateChildren(svg, 0, combinedSvgHeight);
            combinedSvgHeight += parseInt(svg.getAttribute("height"));
            combinedSvgWidth = Math.max(parseInt(svg.getAttribute("width")), combinedSvgWidth);
            combinedSvg.append(svg.children);
          }
          combinedSvg.attr("width", combinedSvgWidth);
          combinedSvg.attr("height", combinedSvgHeight);
          return combinedSvg[0];
        };

        scope.saveAsSvg = function() {
          var html = plotUtils.convertToXHTML(scope.getSvgToSave().outerHTML);
          var fileName = _.isEmpty(scope.stdmodel.title) ? 'combinedplot' : scope.stdmodel.title;
          plotUtils.download('data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(html))), fileName + '.svg');
        };

        scope.saveAsPng = function() {
          var svg = scope.getSvgToSave();

          scope.canvas.width = svg.getAttribute("width");
          scope.canvas.height = svg.getAttribute("height");

          var html = plotUtils.convertToXHTML(svg.outerHTML);
          var imgsrc = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(html)));
          var fileName = _.isEmpty(scope.stdmodel.title) ? 'combinedplot' : scope.stdmodel.title;
          plotUtils.drawPng(scope.canvas, imgsrc, fileName + '.png');
        };

      }
    };
  };
  beakerRegister.bkoDirective("CombinedPlot",
      ["plotUtils", "combinedplotFormatter", "bkCellMenuPluginManager", "plotService", "bkUtils", retfunc]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function () {
  'use strict';
  beakerRegister.bkoDirective("BeakerDashboard", [ "$timeout", "bkEvaluatorManager", function ($timeout, bkEvaluatorManager) {
    return {
      template:
        '<script type="text/ng-template" id="rowrender.html">' +
        '  <div ng-repeat="c in r.cols" class="col-md-{{c.width}}" ng-class="c.theclass" style="{{c.thestyle}}">'+
        '    <div ng-repeat="p in c.payload">' +
        '      <div class="row" ng-class="p.theclass" style="{{p.thestyle}}" ng-if="p.rows !== undefined" ng-model="p" ng-include="\'rowrender.html\'"></div>'+
        '      <div><bk-code-cell-output ng-if="p.rows === undefined" model="p"></bk-code-cell-output></div>'+
        '    <div>' +
        '  </div>'+
        '</script>' +
        '<div>' +
        '  <button ng-click="fullscreen()">Go FullScreen</button>'+
        '  <div id="{{theid}}" class="html5-fullscreen-api" ng-class="theclass" style="{{data.thestyle}}">'+
        '    <div class="row" ng-class="r.theclass" style="{{r.thestyle}}" ng-repeat="r in data.rows" ng-include="\'rowrender.html\'">'+
        '    </div>'+
        '  </div>'+
        '</div>',

      scope : {
        model: '=model'
      },

      controller: function ($scope) {
        $scope.content = [];

        $scope.theid = Math.random().toString(36).substring(7);

        $scope.wrapCol = function(r) {
          var ret = { };
          ret.payload = [];
          ret.theclass = r.theclass;
          ret.thestyle = r.thestyle;
          ret.width    = r.width;

          var i;
          for (i=0; i<r.payload.length; i++) {
            if (r.payload[i].rows !== undefined)
              ret.payload.push($scope.wrapRow(r.payload[i]));
            else {
              var o = {
                result: r.payload[i],
                cellmodel: {
                  output: {
                    hidden: false
                  }
                }
              };
              ret.payload.push(o);
            }
          }
          return ret;
        };

        $scope.wrapRow = function(r) {
          var ret = { };
          ret.cols = [];
          ret.theclass = r.theclass;
          ret.thestyle = r.thestyle;
          var i;
          for (i=0; i<r.cols.length; i++)
            ret.cols.push($scope.wrapCol(r.cols[i]));
          return ret;
        };

        $scope.getUpdateService = function() {
          if (window !== undefined && window.languageUpdateService !== undefined && bkEvaluatorManager.getEvaluator($scope.model.getEvaluatorId())!==undefined)
            return window.languageUpdateService[$scope.model.getEvaluatorId()];
          return undefined;
        };

        $scope.ingestUpdate = function(data) {
          $scope.data = { };
          $scope.data.rows = [];

          if (data.rows !== undefined) {
            var i;
            for (i=0; i<data.rows.length; i++)
              $scope.data.rows.push($scope.wrapRow(data.rows[i]));
          }

          $scope.cellmodel = $scope.model.getCellModel();
          if ($scope.cellmodel.output === undefined) {
            $scope.cellmodel.output = {
              hidden: false
            };
          }
          $scope.data.theclass  = data.theclass;
          $scope.data.thestyle  = data.thestyle;
          $scope.update_id = data.update_id;

          var srv = $scope.getUpdateService();
          if ($scope.subscribedId && $scope.subscribedId !== $scope.update_id) {
            if (srv !== undefined)
              srv.unsubscribe($scope.subscribedId);
            $scope.subscribedId = null;
          }
          if (!$scope.subscribedId && $scope.update_id && srv !== undefined) {
            var onUpdate = function(update) {
              $scope.ingestUpdate(update);
              $scope.$digest();
            };
            srv.subscribe($scope.update_id, onUpdate);
            $scope.subscribedId = $scope.update_id;
          }
        };

        $scope.$on('$destroy', function () {
          if ($scope.subscribedId) {
            var srv = $scope.getUpdateService();
            if (srv !== undefined) {
              srv.unsubscribe($scope.subscribedId);
            }
          }
        });

        $scope.fullscreen = function() {
          var elem = document.getElementById($scope.theid);
          if (elem.requestFullscreen) {
            elem.requestFullscreen();
          } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
          } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
          }
        };

        $scope.isShowMenu = function() {
          return false;
        };

      },
      link: function (scope, element, attrs) {
        scope.getState = function() {
          return scope.model.getCellModel();
        };

        scope.$watch('getState()', function(result) {
          if (result == void 0) {
            return ;
          }
          scope.ingestUpdate(result);
        });

      }
    };
  }]);
  beakerRegister.registerOutputDisplay("BeakerDashboard", ["BeakerDashboard", "Text"]);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

/**
 * bkoPlotly
 * output display component for displaying plotly
 */
( function() {
  'use strict';
  var retfunc = function($sce, $rootScope) {
    var CELL_TYPE = "bko-plotly";
    return {
      template: '<div><iframe srcdoc="{{getHtml()}}" ' +
                'style="height: 480px; width: 640px; resize: both; overflow: auto; border: 0;"></iframe></div>',
      link: function(scope, element, attrs) {
        scope.getModel = function(){
          return scope.model.getCellModel();
        };
        if(scope.getModel().data.evals == null){
          scope.getModel().data.evals = [];
        }
        scope.html = '<!DOCTYPE html>' +
          '<script src="app/vendor/htmlwidgets/htmlwidgets.js"></script>' +
          '<script src="app/vendor/plotly/lib/plotlyjs/plotly-latest.min.js"></script>' +
          '<script src="app/vendor/plotly/plotly.js"></script>' +
          '<div id="htmlwidget_container">' +
          '<div id="htmlwidget" class="plotly"></div>' +
          '</div>' +
          '<script type="application/json" data-for="htmlwidget">' +
          angular.toJson(scope.model.getCellModel().data) +
          '</script>' +
          '<script type="application/htmlwidget-sizing" data-for="htmlwidget">{' +
          '"viewer":{"width":640,"height":480,"padding":5,"fill":true},' +
          '"browser":{"width":960,"height":500,"padding":5,"fill":true}}</script>';

        scope.getHtml = function() {
          return $sce.trustAsHtml(scope.html);
        };

        var debouncedOnResize = _.debounce(onResize, 100);
        var iframeEl = element.find('iframe').on('load', onLoad);
        
        function onLoad(e) {
          var iframeContentWindow = iframeEl[0].contentWindow;
          iframeContentWindow.addEventListener('resize', debouncedOnResize);
          iframeEl.off('load', onLoad);
          iframeEl = null;
        
          scope.$on('$destroy', function() {
            iframeContentWindow.removeEventListener('resize', debouncedOnResize);
            iframeContentWindow = null;
          });
        }

        function onResize() {
          $rootScope.$emit('beaker.resize');
        }
      }
    };
  };
  beakerRegister.bkoDirective("Plotly", [
    '$sce',
    '$rootScope',
    retfunc]);
})();
