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
/* eslint no-console:0 */

/*
 *copied from https://github.com/Khan/KaTeX/tree/master/contrib/auto-render
 *until https://github.com/Khan/KaTeX/issues/425 is resolved.
 */

/*
 *The MIT License (MIT)
 *
 *Copyright (c) 2015 Khan Academy
 *
 *This software also uses portions of the underscore.js project, which is
 *MIT licensed with the following copyright:
 *
 *Copyright (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative
 *Reporters & Editors
 *
 *Permission is hereby granted, free of charge, to any person obtaining a copy
 *of this software and associated documentation files (the "Software"), to deal
 *in the Software without restriction, including without limitation the rights
 *to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *copies of the Software, and to permit persons to whom the Software is
 *furnished to do so, subject to the following conditions:
 *
 *The above copyright notice and this permission notice shall be included in all
 *copies or substantial portions of the Software.
 *
 *THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 *SOFTWARE.
 */

(function() {
  'use strict';
  angular.module('bk.katexhelper', []).factory('katexhelper', function() {
    return {
      splitWithDelimiters: function(text, delimiters) {
        var data = [{type: "text", data: text}];
        delimiters = delimiters.delimiters;
        for(var i = 0; i<delimiters.length; i++){
          var delimiter = delimiters[i];
          data = this.splitAtDelimiters(
            data, delimiter.left, delimiter.right,
            delimiter.display || false);
        }
        return data;
      },
      renderMathInText: function(text, delimiters) {
        var data = this.splitWithDelimiters(text, delimiters);
        var fragment = document.createDocumentFragment();

        for(var i = 0; i<data.length; i++){
          if (data[i].type === "text"){
            fragment.appendChild(document.createTextNode(data[i].data));
          } else {
            var element = document.createElement("span");
            var math = data[i].data;
            try {
              katex.render(math, element);
              fragment.appendChild(element);
            } catch(err) {
              element.style.color = '#cc0000';
              element.title = err.message;
              element.appendChild(document.createTextNode(data[i].rawData));
              fragment.appendChild(element);
            }
          }
        }

        return fragment;
      },
      renderElem: function(elem, delimiters, ignoredTags) {
        for(var i = 0; i<elem.childNodes.length; i++){
          var childNode = elem.childNodes[i];
          if (childNode.nodeType === 3){
            // Text node
            var frag = this.renderMathInText(childNode.textContent, delimiters);
            i += frag.childNodes.length - 1;
            elem.replaceChild(frag, childNode);
          } else if (childNode.nodeType === 1){
            //because all tags are ignored we don't care about those. if the node is element - render child is called
            this.renderElem(childNode, delimiters, ignoredTags);
          }
          // Otherwise, it's something else, and ignore it.
        }
      },
      defaultOptions: {
        delimiters: [
          {left: "$$", right: "$$", display: true},
          {left: "\\[", right: "\\]", display: true},
          {left: "\\(", right: "\\)", display: false},
          // LaTeX uses this, but it ruins the display of normal `$` in text:
          {left: "$", right: "$", display: false},
        ],

        ignoredTags: [
          "script", "noscript", "style", "textarea", "pre", "code",
        ]
      },
      extend: function(obj) {
        // Adapted from underscore.js' `_.extend`. See LICENSE.txt for license.
        var source;
        var prop;
        for(var i = 1, length = arguments.length; i<length; i++){
          source = arguments[i];
          for(prop in source){
            if (Object.prototype.hasOwnProperty.call(source, prop)){
              obj[prop] = source[prop];
            }
          }
        }
        return obj;
      },
      findEndOfMath: function(delimiter, text, startIndex) {
        // Adapted from
        // https://github.com/Khan/perseus/blob/master/src/perseus-markdown.jsx
        var index = startIndex;
        var braceLevel = 0;

        var delimLength = delimiter.length;

        while(index<text.length) {

          if (text.slice(index, index + delimLength) === delimiter){
            return index;
          }

          index++;
        }

        return -1;
      },
      splitAtDelimiters: function(startData, leftDelim, rightDelim, display) {
        var finalData = [];

        for(var i = 0; i<startData.length; i++){
          if (startData[i].type === "text"){
            var text = startData[i].data;

            var lookingForLeft = true;
            var currIndex = 0;
            var nextIndex;

            nextIndex = text.indexOf(leftDelim);
            if (nextIndex !== -1){
              currIndex = nextIndex;
              finalData.push({
                type: "text",
                data: text.slice(0, currIndex),
              });
              lookingForLeft = false;
            }

            while(true) {
              if (lookingForLeft){
                nextIndex = text.indexOf(leftDelim, currIndex);
                if (nextIndex === -1){
                  break;
                }

                finalData.push({
                  type: "text",
                  data: text.slice(currIndex, nextIndex),
                });

                currIndex = nextIndex;
              } else {
                nextIndex = this.findEndOfMath(
                  rightDelim,
                  text,
                  currIndex + leftDelim.length);
                if (nextIndex === -1){
                  break;
                }

                finalData.push({
                  type: "math",
                  data: text.slice(
                    currIndex + leftDelim.length,
                    nextIndex),
                  rawData: text.slice(
                    currIndex,
                    nextIndex + rightDelim.length),
                  display: display,
                });

                currIndex = nextIndex + rightDelim.length;
              }

              lookingForLeft = !lookingForLeft;
            }

            finalData.push({
              type: "text",
              data: text.slice(currIndex),
            });
          } else {
            finalData.push(startData[i]);
          }
        }
        return finalData;
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
 * Module bk.datatables
 */
(function() {
  'use strict';
  angular.module('bk.globals', []).factory('GLOBALS', function() {
    return {
      DEFAULT_EVALUATOR: 'JavaScript',
      REQUIREJS_TIMEOUT: 30,
      RECONNECT_TIMEOUT: 30 * 1000, // 30 seconds
      CELL_INSTANTIATION_DISTANCE: 500, // in pixels - if the cell is closer than from the viewport it gets instantiated
      EVENTS: {
      	RECONNECT_FAILED: 'reconnect-failed',
        LANGUAGE_MANAGER_SHOW_SPINNER: 'language-manager-show-spinner',
        LANGUAGE_MANAGER_HIDE_SPINNER: 'language-manager-hide-spinner',
        DISCARD_LANGUAGE_SETTINGS: 'discard-language-settings',
        HIGHLIGHT_EDITED_LANGUAGE_SETTINGS: 'highlight-edited-language-settings',
        SET_LANGUAGE_SETTINGS_EDITED: 'set-language-settings-edited',
        LANGUAGE_ADDED: 'languageAdded',
        CELL_OUTPUT_EXPANDED: 'cell-output-expanded',
        CELL_OUTPUT_LM_SHOWED: 'cell-output-lm-showed',
        ADVANCED_MODE_TOGGLED: 'advanced-mode-toggled',
        FILE_DROPPED: 'file-dropped'
      },
      FILE_LOCATION: {
        FILESYS: "file",
        HTTP: "http",
        AJAX: "ajax"
      },
      EVALUATOR_SPEC: {
        PROPERTIES: {
          STRING: "settableString",
          BOOLEAN: "settableBoolean",
          ENUM: "settableEnum",
          SELECT: "settableSelect"
        },
        ACTION: "action"
      },
      THEMES: {
        DEFAULT: 'default',
        AMBIANCE: 'ambiance'
      }
    };
  });
})();

(function() {(window["JST"] = window["JST"] || {})["controlpanel/controlpanel"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<header ng-class="{\'electron-hide\': getElectronMode()}" class="navbar-fixed-top bkr">\n  <div class="navbar navbar-inverse bkr">\n    <bk-brand-logo reference="/beaker/#/control" on-click="gotoControlPanel(event)" class="bkr"></bk-brand-logo>\n  </div>\n  <div class="navbar navbar-default bkr">\n    <ul class="nav navbar-nav bkr">\n      <li class="dropdown bkr" ng-repeat="m in getMenus() | orderBy: \'index\'">\n        <a href="#" role="button" class="dropdown-toggle {{m.id}} bkr" data-toggle="dropdown">{{m.name}}</a>\n        <bk-dropdown-menu menu-items="m.items" class="bkr"></bk-dropdown-menu>\n      </li>\n    </ul>\n    <p ng-if="disconnected" class="navbar-text text-danger pull-right bkr">offline</p>\n  </div>\n</header>\n\n<div ng-class="{\'electron-mode\': getElectronMode()}" class="dashboard container-fluid bkr">\n  <div class="row bkr">\n    <div class="col-md-12 bkr">\n      <div ng-if="isSessionsListEmpty()" class="empty-session-prompt bkr">\n        <br class="bkr">\n        <h1 class="bkr">Beaker <small class="bkr">The data scientist\'s laboratory</small></h1>\n        <p class="bkr">\n          <br class="bkr">\n          Click below to learn to use Beaker, or use the <strong class="bkr">Help → Tutorial</strong> menu item.\n\t</p>\n        <div class="new-notebook bkr">\n          <div class="row bkr bkr">\n            <div class="col-xs-3 bkr bkr">\n              <a class="btn btn-default text-center btn-block bkr bkr" ng-click="openTutorial()">Examples and Demos</a>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div ng-hide="isSessionsListEmpty()" class="bkr">\n        <h4 class="open-notebook-headline bkr">Open Notebooks</h4>\n        <bk-control-panel-session-item class="open-notebooks bkr"></bk-control-panel-session-item>\n      </div>\n\n      <div class="new-notebook bkr">\n        <div class="row bkr">\n          <div class="col-xs-3 bkr">\n            <a class="btn btn-default text-center btn-block bkr" ng-click="newDefaultNotebook()">New Default Notebook</a>\n          </div>\n          <div class="col-xs-3 bkr">\n            <a class="btn btn-default text-center btn-block new-empty-notebook bkr" ng-click="newNotebook()">New Empty Notebook</a>\n          </div>\n        </div>\n        <div class="row bkr">\n          <div class="col-xs-3 bkr">\n            <a class="btn btn-default text-center btn-block bkr" ng-click="openNotebook()">Open notebook...</a>\n          </div>\n          <div class="col-xs-3 bkr">\n            <div class="faux-drop-zone bkr">\n              Drag a .bkr file here to import\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <div class="recent-notebook bkr" ng-hide="isRecentEmpty()">\n        <h4 class="open-notebook-headline bkr">Recent Notebooks</h4>\n          <ul class="notebook-dashboard-list bkr">\n            <li class="session clearfix bkr" ng-repeat="item in recents">\n              <div class="row vertical-align bkr">\n                <div class="col-xs-11 bkr">\n                  <a class="caption notebook-link bkr" href="#" ng-click="openRecent(item, $event)" ng-bind="item.name" eat-click=""></a>\n                  <div class="light path bkr" ng-if="item.tooltip" ng-bind="item.tooltip"></div>\n                </div>\n                <div class="col-xs-1 bkr">\n                  <i class="glyphicon glyphicon-remove cursor_hand bko-glyphicon bkr" ng-click="removeRecent(item, $event)" eat-click="" title="click to remove from history"></i>\n                </div>\n              </div>\n            </li>\n          </ul>\n      </div>\n    </div>\n  </div>\n  <div class="row bkr" ng-show="isAllowAnonymousTracking == null">\n    <div class="col-md-6 well bkr">\n      <p class="bkr">\n        <b class="bkr">Track anonymous usage info?</b>\n      </p>\n\n      <p class="bkr">\n        We would like to collect anonymous usage info to help improve our product. We may share this information\n        with other parties, including, in the spirit of open software, by making it publicly accessible.<br class="bkr">\n      </p>\n\n      <p class="bkr">\n        <a target="_blank" href="http://beakernotebook.com/privacy" class="bkr">Privacy policy</a> - <a class="cursor_hand bkr" ng-click="showWhatWeLog()">What will we log?</a>\n      </p>\n      <div class="btn-group bkr">\n        <button class="btn btn-default bkr" ng-click="isAllowAnonymousTracking = false">No, don\'t track</button>\n        <button class="btn btn-active bkr" ng-click="isAllowAnonymousTracking = true">Yes, track my info</button>\n      </div>\n    </div>\n\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["controlpanel/table"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul class="notebook-dashboard-list bkr">\n  <li class="session clearfix bkr" ng-repeat="session in sessions | orderBy:&quot;openedDate&quot;:true">\n    <div class="pull-left bkr">\n      <a class="caption notebook-link bkr" href="{{getOpenSessionLink(session)}}">{{getCaption(session)}}</a>\n      <div class="light path bkr" ng-if="getDescription(session)">\n        {{getDescription(session)}}\n      </div>\n    </div>\n    <a class="btn btn-default btn-sm pull-right close-session bkr" ng-click="close(session)">Close</a>\n    <div class="open-date light pull-right bkr">\n      <span class="bkr">Opened on</span>\n      {{session.openedDate | date:\'medium\'}}\n      <br class="bkr">\n      <div ng-if="session.lastEdited !== undefined &amp;&amp; session.lastEdited !== null &amp;&amp;session.lastEdited !== \'\'" class="bkr">\n\t      <span class="bkr">Last edited</span>\n\t      {{session.lastEdited | date:\'medium\'}}\n\t  </div>\n    </div>\n\n  </li>\n</ul>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["controlpanel/what_we_log"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<div class="modal-header bkr">\n  <h3 class="bkr">What will we log</h3>\n</div>\n\n<div class="modal-body bkr">\n  <p class="bkr">\n    <b class="bkr">What we log:</b>\n  </p>\n  <p class="bkr">We use Google Analytics to collect usage info. Google Analytics collects data such as how long you spend in Beaker, what browser you\'re using, and your geographic region.</p>\n  <p class="bkr">In addition to the standard Google Analytics collection, we\'re logging how many times you run cells in each language and what types of notebooks you open (local .bkr file, remote .ipynb, et cetera).</p>\n  <p class="bkr">\n    <b class="bkr">What we <i class="bkr">don\'t</i> log:</b>\n  </p>\n  <p class="bkr">We will never log any of the code you run or the names of your notebooks.</p>\n  <p class="bkr">Please see our <a target="_blank" href="http://beakernotebook.com/privacy" class="bkr">privacy policy</a> for more information.</p>\n</div>\n\n<div class="modal-footer bkr">\n   <button class="btn btn-default bkr" ng-click="close()">Got it</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["helpers/plugin-load-error"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h1 class="bkr">Language Error</h1>\n</div>\n<div class="modal-body bkr">\n  ' +
((__t = (errorMessage)) == null ? '' : __t) +
'\n</div>\n\n<div class="modal-footer bkr bkr">\n  <button class="btn btn-default bkr" ng-click="$close()">OK</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["helpers/sql-login-template"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h3 class="bkr">SQL Login</h3>\n</div>\n<form ng-submit="okFunction()" class="bkr">\n  <div class="modal-body bkr">\n    <p class="bkr">\n      </p><table class="table bkr">\n        <tbody class="bkr">\n          <tr class="bkr">\n            <td ng-if="sqlConnectionData.connectionName == null" colspan="2" style="border-top:none" class="bkr">\n              Default data source\n             </td>\n            <td ng-if="sqlConnectionData.connectionName != null" style="border-top:none" class="bkr">\n              Named data source\n             </td>\n            <td ng-if="sqlConnectionData.connectionName != null" style="border-top:none" class="bkr">\n              {{sqlConnectionData.connectionName}}\n             </td>\n          </tr>\n          <tr class="bkr">\n            <td style="border-top:none" colspan="2" class="bkr">\n              <div ng-if="sqlConnectionData.connectionString.length > 75" class="bkr">\n                {{sqlConnectionData.connectionString | limitTo:75}} ...\n              </div>\n              <div ng-if="sqlConnectionData.connectionString.length <= 75" class="bkr">\n                {{sqlConnectionData.connectionString}}\n              </div>\n            </td>\n          </tr>\n          <tr class="bkr">\n            <td class="bkr">User</td>\n            <td class="bkr"><input type="text" id="user_field" ng-model="sqlConnectionData.user" class="field bkr" placeholder="User"></td>\n          </tr>\n          <tr class="bkr">\n            <td style="border-top:none" class="bkr">Password</td>\n            <td style="border-top:none" class="bkr"><input type="password" id="password_field" placeholder="Password" ng-model="sqlConnectionData.password" class="bkr"></td>\n          </tr>\n        </tbody>\n      </table>\n    <p class="bkr"></p>\n  </div>\n  <div class="modal-footer bkr">\n    <button class="yes btn btn-default bkr" ng-click="okFunction()">OK</button>\n    <button class="cancel btn btn-default bkr" ng-click="cancelFunction()">Cancel</button>\n  </div>\n</form>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/brand_logo"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="bkr">\n    <a class="navbar-brand bkr" href="{{reference}}" ng-click="clickAction($event)" eat-click="">\n        <svg width="16px" height="22px" viewbox="0 0 600 790" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:1.41421" class="bkr">\n            <g transform="matrix(1,0,0,1,-219.244,-106.439)" class="bkr">\n            <path d="M239.89,289.249L293.584,289.249L318.661,341.533L318.661,799.236L346.819,825.996L693.232,825.996L721.762,799.432L721.762,341.475L746.707,289.228L799.576,289.228L773.717,340.36L773.717,826.224L722.48,879.53L317.616,879.53L266.714,826.457L266.714,341.03L239.89,289.249Z" class="navbar-brand-fill bkr"></path>\n            </g>\n            <g transform="matrix(1,0,0,1,-219.244,-106.439)" class="bkr">\n            <path d="M373.419,396.178L666.524,396.178L666.524,772.449L373.627,772.449L373.419,396.178Z" class="navbar-brand-fill bkr"></path>\n            </g>\n            <g transform="matrix(1.0164,0,0,1.0164,-224.968,-108.995)" class="bkr">\n            <circle cx="425.264" cy="181.637" r="52.944" class="navbar-brand-fill bkr"></circle>\n            </g>\n            <g transform="matrix(2.40784,0,0,2.40784,-755.394,-522.242)" class="bkr">\n            <circle cx="388.783" cy="303.979" r="11.274" class="navbar-brand-fill bkr"></circle>\n            </g>\n            <g transform="matrix(1.68901,0,0,1.68901,-607.657,-297.223)" class="bkr">\n            <circle cx="569.535" cy="276.282" r="39.853" class="navbar-brand-fill bkr"></circle>\n            </g>\n          </svg>\n    </a>\n    <a class="navbar-left bkr" href="{{reference}}" ng-click="clickAction($event)" eat-click="">\n        Beaker\n    </a>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/dropdown"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul class="dropdown-menu bkr" role="menu" aria-labelledby="dropdownMenu">\n  <bk-dropdown-menu-item ng-repeat="item in getMenuItems() | filter:isHidden | orderBy:\'sortorder\'" item="item" class="bkr"></bk-dropdown-menu-item>\n</ul>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/dropdown_item"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<li ng-hide="item.locked() === true || getName(item) === &quot;&quot;" ng-class="getItemClass(item)" class="bkr">\n  <span ng-if="hasCustomMarkup(item)" ng-bind-html="getCustomMarkup(item)" class="bkr"></span>\n  <a href="#" tabindex="-1" ng-click="runAction(item)" ng-class="getAClass(item)" id="{{item.id}}" title="{{item.tooltip}}" eat-click="" class="bkr">\n    {{getName(item)}}\n    <span ng-if="item.shortcut" class="menu-shortcut bkr" ng-bind-html="getShortcut(item.shortcut)"></span>\n  </a>\n  <i class="glyphicon glyphicon-ok bkr" ng-show="isMenuItemChecked(item)"></i>\n</li>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/fileactiondialog"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h1 class="bkr">{{actionName}}</h1>\n</div>\n<div class="modal-body bkr">\n  <p class="bkr">Path: <input name="{{inputId}}" ng-model="result" class="bkr"></p>\n</div>\n<div class="modal-footer bkr">\n  <button ng-click="close()" class="btn bkr">Cancel</button>\n  <button ng-click="close(result)" class="btn btn-primary bkr">{{actionName}}</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/filedialog"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header fixed form-group property language-option clearfix bkr" style="padding: 0px;margin-bottom: 0 ; height: 20px">\n  <input id="file-dlg-selected-path" type="text" autofocus="" class="form-control bkr" ng-keydown="onkey($event)" ng-model="selected.path">\n</div>\n<div id="elfinder" ng-init="init()" style="width: 100% !important; height: 100% !important; padding-bottom: 68px; padding-top: 32px" class="bkr">\n\n<div class="modal-footer fixed bkr" style="height: 68px">\n  <span style="float:left; position:relative" ng-if="getStrategy().treeViewfs.extension !== undefined" class="bkr">\n     <input class="beforeCheckbox bkr" id="extensionFilter" type="checkbox" style="vertical-align:middle" ng-model="getStrategy().treeViewfs.applyExtFilter">\n     <label ng-click="getStrategy().treeViewfs.applyExtFilter = !getStrategy().treeViewfs.applyExtFilter" class="bkr">show .{{\n       getStrategy().treeViewfs.extension }} files only</label>\n   </span>\n  <span style="float:left; position:relative; width: 30px" class="bkr">&nbsp;</span>\n  <span style="float:left; position:relative" class="bkr">\n     <input class="beforeCheckbox bkr" id="showHiddenFiles" type="checkbox" style="vertical-align:top" ng-model="getStrategy().treeViewfs.showHiddenFiles">\n     <label ng-click="getStrategy().treeViewfs.showHiddenFiles = !getStrategy().treeViewfs.showHiddenFiles" class="bkr">show hidden\n       files</label>\n   </span>\n\n  <button ng-click="cancel()" class="btn btn-default bkr">Cancel</button>\n  <button id="okButton" ng-click="ok()" class="btn btn-primary modal-submit bkr">{{getStrategy().okButtonTitle ?\n    getStrategy().okButtonTitle : "Ok"}}\n  </button>\n\n\n</div>\n\n\n\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/filepermissionsdialog"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<div class="modal-header bkr">\n  <h1 class="bkr">{{getStrategy().title}}</h1>\n  <div class="permission-path bkr">{{getStrategy().path}}</div>\n</div>\n<div class="modal-body permissions bkr">\n\n  <div class="col-sm-4 bkr">\n    <div class="row group bkr">Owner</div>\n\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.OWNER_READ" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.OWNER_READ = !model.OWNER_READ" class="bkr">Read</label>\n      </span>\n    </div>\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.OWNER_WRITE" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.OWNER_WRITE = !model.OWNER_WRITE" class="bkr">Write</label>\n        </span>\n    </div>\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.OWNER_EXECUTE" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.OWNER_EXECUTE = !model.OWNER_EXECUTE" class="bkr">Execute</label>\n      </span>\n    </div>\n  </div>\n\n  <div class="col-sm-4 bkr">\n    <div class="row group bkr">Group</div>\n\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.GROUP_READ" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label data-ng-click="model.GROUP_READ = !model.GROUP_READ" class="bkr">Read</label>\n      </span>\n    </div>\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.GROUP_WRITE" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.GROUP_WRITE = !model.GROUP_WRITE" class="bkr">Write</label>\n      </span>\n    </div>\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.GROUP_EXECUTE" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.GROUP_EXECUTE = !model.GROUP_EXECUTE" class="bkr">Execute</label>\n      </span>\n    </div>\n  </div>\n\n  <div class="col-sm-4 bkr">\n    <div class="row group bkr">Others</div>\n\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.OTHERS_READ" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.OTHERS_READ = !model.OTHERS_READ" class="bkr">Read</label>\n      </span>\n    </div>\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.OTHERS_WRITE" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.OTHERS_WRITE = !model.OTHERS_WRITE" class="bkr">Write</label>\n      </span>\n    </div>\n    <div class="row bkr">\n      <span style="float: left; position: relative" class="bkr">\n        <input ng-model="model.OTHERS_EXECUTE" type="checkbox" class="beforeCheckbox ng-pristine ng-untouched ng-valid ng-not-empty bkr">\n        <label ng-click="model.OTHERS_EXECUTE = !model.OTHERS_EXECUTE" class="bkr">Execute</label>\n      </span>\n    </div>\n  </div>\n\n  <div class="row bkr" style="padding-top: 100px; margin-top: 5px">\n    <div class="col-sm-3 bkr"><label for="owner" class="bkr"><strong class="bkr">Owner:</strong>&nbsp;</label></div>\n    <div class="col-sm-9 bkr">\n      <a ng-hide="ownerEdit" ng-click="editOwner()" href="#" title="Edit" eat-click="" class="bkr">{{getStrategy().owner}}</a>\n      <input ng-show="ownerEdit" type="text" ng-model="model.owner" id="owner" class="bkr">\n    </div>\n  </div>\n  <div class="row bkr" style="margin-top: 5px">\n    <div class="col-sm-3 bkr"><label for="group" class="bkr"><strong class="bkr">Group:</strong>&nbsp;</label></div>\n    <div class="col-sm-9 bkr">\n      <a ng-hide="groupEdit" ng-click="editGroup()" href="#" title="Edit" eat-click="" class="bkr">{{getStrategy().group}}</a>\n      <input ng-show="groupEdit" type="text" ng-model="model.group" id="group" class="bkr">\n    </div>\n  </div>\n\n</div>\n<div class="modal-footer bkr">\n  <button ng-click="cancel()" class="btn btn-default bkr">Cancel</button>\n  <button ng-click="ok()" class="btn btn-primary modal-submit bkr">{{getStrategy().okButtonTitle ? getStrategy().okButtonTitle : "Ok"}}\n  </button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/dialogs/bkorename"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h1 class="bkr">Rename beaker object property</h1>\n</div>\n<div class="modal-body bkr">\n    <div class="form-horizontal bkr">\n        <div class="form-group bkr">\n            <label for="property-name" class="control-label col-sm-2 bkr">New name</label>\n            <div class="col-sm-10 bkr"><input id="property-name" class="form-control bkr" ng-model="propertyName" focus="true" bk-enter="save()"></div>\n        </div>\n    </div>\n</div>\n<div class="modal-footer bkr">\n    <button ng-click="close()" class="btn btn-default bkr">Cancel</button>\n    <button ng-click="save()" class="btn btn-primary bkr">Save</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/dialogs/changeserver"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<title class="bkr">Change Beaker Server</title>\n<div class="bkr-dialog bkr" ng-controller="changeServer">\n  <form novalidate="" class="change-server-form bkr" ng-submit="change(address)">\n    <input class="server-input bkr" type="text" ng-model="address" placeholder="E.g. http://127.0.0.1:8801/">\n    <a class="btn btn-default text-center bkr server-dialog-button bkr" ng-click="change(address)">Change Beaker Server</a>\n    <a class="btn btn-default text-center bkr server-dialog-button bkr" ng-click="newBackend()">New Local Backend</a>\n  </form>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/dialogs/codecelloptions"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h1 class="bkr">Code Cell Options</h1>\n</div>\n<div class="modal-body bkr">\n  <div class="form-horizontal bkr">\n    <div class="form-group bkr">\n      <label for="cell-id" class="control-label col-sm-2 bkr">ID</label>\n      <div ng-class="isError() ? \'col-sm-7\' : \'col-sm-10\'" class="bkr"><input id="cell-id" class="form-control bkr" ng-model="cellName" bk-enter="save()"></div>\n      <div class="col-sm-3 bkr" ng-if="isError()"><span class="help-inline bkr" style="color:red">{{getNameError()}}</span></div>\n    </div>\n    <div class="form-group bkr">\n      <label for="cell-tags" class="control-label col-sm-2 bkr">Tags</label>\n      <div ng-class="isError() ? \'col-sm-7\' : \'col-sm-10\'" class="bkr">\n          <input id="cell-tags" class="form-control bkr" ng-model="cellTags" bk-enter="save()" title="one tag, or a space-separated list of tags">\n      </div>\n      <div class="col-sm-3 bkr" ng-if="isError()"><span class="help-inline bkr" style="color:red">{{getTagError()}}</span></div>\n    </div>\n    <div class="form-group bkr">\n      <div class="col-sm-offset-2 col-sm-10 bkr">\n          <input class="beforeCheckbox bkr" id="initializationCell" type="checkbox" ng-model="initializationCell">\n          <label for="initializationCell" class="bkr">Initialization Cell</label>\n      </div>\n    </div>\n  </div>\n</div>\n<div class="modal-footer bkr">\n  <button ng-click="close()" class="btn btn-default bkr">Cancel</button>\n  <button ng-click="save()" class="btn btn-primary bkr" ng-class="saveDisabled() &amp;&amp; \'disabled\'">Save</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/dashboard/app"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<bk-control-panel class="bkr"></bk-control-panel>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/mainapp/app"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '<bk-main-app session-id="{{sessionId}}" new-session="{{newSession}}" import="{{isImport}}" open="{{isOpen}}" notebook="notebook" class="bkr">\n</bk-main-app>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["template/mainapp/mainapp"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<header class="navbar-fixed-top bkr" ng-class="{\'electron-hide\': getElectronMode()}" id="notebook_header">\n  <div class="navbar navbar-inverse bkr">\n    <table class="bkr">\n      <tbody class="bkr"><tr class="bkr">\n        <td class="bkr">\n          <bk-brand-logo reference="/beaker/#/control" on-click="gotoControlPanel(event)" class="bkr"></bk-brand-logo>\n        </td>\n        <td class="bkr">\n          <div ng-switch="renamingAllowed()" style="padding-top: 10px" class="bkr">\n            <a ng-switch-when="true" href="#" class="navbar-text path-name bkr" ng-class="{full: !loading &amp;&amp; !loadingmsg}" ng-click="renameNotebook()" eat-click="">{{pathname()}}</a>\n            <a ng-switch-default="" href="#" class="navbar-text path-name bkr" ng-class="{full: !loading &amp;&amp; !loadingmsg}" ng-click="" eat-click="">{{pathname()}}</a>\n          </div>\n        </td>\n        <td class="bkr">\n          <div class="bkr">\n            <div class="navbar-text text-white loadingmsg left-float bkr" ng-if="isShowProgressBar()">\n              <div class="fa fa-times-circle fa-lg cursor_hand bkr bkr" style="color: #e48d71 !important" ng-click="cancel()" title="cancel"></div>\n            </div>\n            <div class="navbar-text text-white loadingmsg left-float bkr" ng-if="isShowProgressBar()">\n              <div class="progress bkr" style="width: 150px; margin-bottom: inherit; height: 16px; background-color:#505050">\n                <div class="progress-bar bkr" role="progressbar" aria-valuenow="{{getProgressBar()}}" aria-valuemin="0" aria-valuemax="100" style="width: {{getProgressBar()}}%; display: inline-block; line-height: 20px">\n                  {{getProgressBar()}} %\n                </div>\n              </div>\n            </div>\n            <div class="navbar-text text-white loadingmsg left-float bkr" ng-if="loading || !!loadingmsg">\n              <a data-toggle="dropdown" class="loading-spin dtmenu bkr" ng-if="isShowProgressBar()">\n                <i class="fa fa-refresh fa-spin text-white bkr"></i>\n              </a>\n              <ul class="dropdown-menu bkr" ng-if="isShowProgressBar()" style="left: inherit; top: inherit">\n                <li ng-repeat="notificationMethod in evaluationCompleteNotificationMethods" class="bkr">\n                  <a ng-click="toggleNotifyWhenDone(notificationMethod)" class="bkr">{{notificationMethod.title}}</a>\n                  <i class="glyphicon glyphicon-ok bkr ng-hide bkr" ng-show="notificationMethod.selected" style="color: #333333"></i>\n                </li>\n              </ul>\n              <a ng-if="!isShowProgressBar()" class="bkr">\n                <i class="fa fa-refresh fa-spin text-white bkr"></i>\n              </a>\n              {{loadingmsg}}\n            </div>\n          </div>\n        </td>\n      </tr>\n    </tbody></table>\n  </div>\n  <div class="navbar navbar-default bkr">\n    <ul class="nav navbar-nav bkr">\n      <li class="dropdown bkr" ng-repeat="m in getMenus() | orderBy: \'index\'">\n        <a href="#" role="button" class="dropdown-toggle bkr" ng-class="m.classNames" data-toggle="dropdown">{{m.name}}</a>\n        <bk-dropdown-menu menu-items="m.items" class="bkr"></bk-dropdown-menu>\n      </li>\n      <bk-spark-menu ng-if="usesSpark()" class="bkr"></bk-spark-menu>\n    </ul>\n    <p ng-if="isEdited()" class="navbar-text text-success pull-right bkr">edited</p>\n    <p ng-if="isDisconnected()" class="navbar-text pull-right bkr">\n      <a href="javascript:;" class="navbar-link text-danger bkr" ng-click="promptToSave()" eat-click="">{{getOffineMessage()}}</a>\n    </p>\n  </div>\n</header>\n\n<div ng-class="{\'electron-mode\': getElectronMode()}" class="container-fluid notebook-container bkr">\n  <div class="row bkr">\n    <div class="col-md-12 bkr">\n      <bk-notebook set-bk-notebook="setBkNotebook(bkNotebook)" is-loading="loading" class="bkr"></bk-notebook>\n    </div>\n  </div>\n\n  \n  <div style="height: 300px" class="bkr"></div>\n\n</div>\n\n\n<script type="text/ng-template" id="section-cell.html" class="bkr">\n  <bk-section-cell></bk-section-cell>\n</script>\n<script type="text/ng-template" id="text-cell.html" class="bkr">\n  <div class="text-cell">\n    <bk-text-cell></bk-text-cell>\n  </div>\n</script>\n<script type="text/ng-template" id="markdown-cell.html" class="bkr">\n  <bk-markdown-cell></bk-markdown-cell>\n</script>\n<script type="text/ng-template" id="code-cell.html" class="bkr">\n  <bk-code-cell cellmodel="cellmodel" cellmenu="cellview.menu" index="$index"></bk-code-cell>\n</script>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/pluginmanager/pluginmanager"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="bkr">\n  <div class="modal-header fixed bkr" style="height: 69px">\n    <div class="pull-left bkr">\n      <h1 class="bkr">Language Manager</h1>\n    </div>\n    <div class="pull-right bkr">\n      <span class="navbar-text bkr" ng-show="showSpinner">\n        <i class="fa fa-refresh fa-spin bkr"></i>\n      </span>\n      <div class="navbar-text loadingmsg animate-show bkr" ng-show="showMessage">\n        {{loadingMessage}}\n      </div>\n    </div>\n  </div>\n  <div ng-init="onInit()" class="modal-body fixed modal-large plugin-manager bkr" style="padding-top: 69px; padding-bottom: 68px">\n    <div class="languages clearfix bkr">\n      <button class="btn btn-default language-icon-button navigate-btn bkr" ng-click="evalTabOp.togglePlugin(pluginName)" ng-repeat="(pluginName, pluginStatus) in evalTabOp.getEvaluatorStatuses()" ng-class="pluginName" title="{{getEvaluatorTooltipText(pluginName, pluginStatus)}}" ng-keydown="navigate($event)" ng-enter="evalTabOp.togglePlugin(pluginName)">\n        <span ng-class="\'plugin-\' + pluginStatus" class="plugin-status bkr">●</span>\n        <bk-language-logo bg-color="{{getEvaluatorDetails(pluginName).bgColor}}" name="{{getEvaluatorDetails(pluginName).shortName}}" fg-color="{{getEvaluatorDetails(pluginName).fgColor}}" border-color="{{getEvaluatorDetails(pluginName).borderColor}}" class="bkr">\n        </bk-language-logo>\n\n        {{pluginName}}\n      </button>\n      <button ng-click="evalTabOp.showURL = !evalTabOp.showURL" ng-enter="evalTabOp.showURL = !evalTabOp.showURL" class="btn btn-default navigate-btn bkr" ng-if="allowFromUrl()" ng-keydown="navigate($event)">\n        From URL...\n      </button>\n    </div>\n    <div ng-show="evalTabOp.showURL" class="input-group addeval bkr">\n      <input type="text" bk-enter="evalTabOp.togglePlugin()" ng-model="evalTabOp.newPluginNameOrUrl" class="bkr">\n      <button class="btn btn-default bkr" ng-click="evalTabOp.togglePlugin()">Add Plugin from URL</button>\n    </div>\n    <div ng-if="evalTabOp.showSecurityWarning" class="bkr">\n      <div class="modal-body error-title body-box bkr">\n        <p class="bkr">Are you sure you want to load this plugin from an external URL?</p>\n        <button class="btn btn-default right bkr" ng-click="evalTabOp.showSecurityWarning = false; evalTabOp.showURL=false; evalTabOp.newPluginNameOrUrl=&quot;&quot;">Cancel</button>\n        <button class="btn btn-default right bkr" ng-click="evalTabOp.showSecurityWarning = false; evalTabOp.forceLoad = true; evalTabOp.togglePlugin()">OK</button>\n      </div>\n      <p class="bkr"><br class="bkr"></p>\n    </div>\n    <div ng-if="evalTabOp.showWarning" class="bkr">\n      <div class="modal-body error-title body-box bkr">\n        <p class="bkr">Cannot remove plugin currently used by a code cell in the notebook.<br class="bkr">\n        Delete those cells and try again.</p>\n        <button class="btn btn-default right bkr" ng-click="evalTabOp.showWarning = false">OK</button>\n      </div>\n      <p class="bkr"><br class="bkr"></p>\n    </div>\n    <uib-tabset class="bkr">\n      <uib-tab ng-repeat="(evaluatorName, evaluator) in evalTabOp.getEvaluatorsWithSpec()" heading="{{evaluatorName}}" active="evalTabOp.tabs[$index].active" class="bkr">\n        <bk-plugin-manager-evaluator-settings class="bkr"></bk-plugin-manager-evaluator-settings>\n      </uib-tab>\n    </uib-tabset>\n  </div>\n  <div class="modal-footer fixed bkr" style="height: 68px"> \n    <button class="btn btn-primary language-manager-close-button bkr" ng-click="doClose()">Close</button>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/pluginmanager/pluginmanager_evaluator_settings"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<div ng-repeat="property in properties" class="form-group language-option property clearfix bkr">\n  \n  <label ng-if="property.type === availableProperties.STRING" class="bkr">{{ property.name }}</label>\n  <textarea ng-if="property.type === availableProperties.STRING" ng-class="{\'edited-property\': property.edited &amp;&amp; highlight}" class="form-control bkr" ng-model="evaluator.settings[property.key]"></textarea>\n  <button ng-if="property.type === availableProperties.STRING" class="btn btn-default pull-right set bkr" ng-click="set(property)">Set</button>\n\n  <input ng-if="property.type === availableProperties.BOOLEAN" class="beforeCheckbox bkr" id="{{property.name}}-checkbox" type="checkbox" ng-model="evaluator.settings[property.key]" ng-change="set(property)">\n  <label class="checkbox-label bkr" ng-if="property.type === availableProperties.BOOLEAN" for="{{property.name}}-checkbox">{{property.name}}</label>\n\n  <div class="radio bkr" ng-if="property.type === availableProperties.ENUM">\n    <h6 class="bkr">{{ property.name }}</h6>\n      <span class="radio-inline bkr" ng-repeat="(value, label) in property.values">\n        <input id="eval-settings-{{$index}}" name="{{::property.name}}" value="{{::value}}" type="radio" ng-model="evaluator.settings[property.key]" ng-change="set(property)" class="bkr">\n        <label for="eval-settings-{{$index}}" class="bkr">{{label}}</label>\n      </span>\n  </div>\n\n  <div ng-if="property.type === availableProperties.SELECT" class="bkr">\n    <label class="bkr">{{ property.name }} </label><span class="cdnjs-spinner bkr" ng-if="property.spinner" ng-show="searchingRemote"><i class="fa fa-refresh fa-spin bkr"></i></span>\n    <uib-alert class="cdnjs-error bkr" ng-show="cdnJsErrorOccured" type="danger">Unable to reach cdnjs. Please try later or include javascript files manually.</uib-alert>\n    <ui-select multiple="multiple" ng-model="evaluator.settings[property.key]" ng-change="set(property)" class="bkr">\n      <ui-select-match class="bkr">\n        <span title="{{!!property.itemTooltip ? $eval(property.itemTooltip) : $item.name}}" class="bkr">{{$item.name}}</span>\n      </ui-select-match>\n      <ui-select-choices ng-class="!jsCdnLibs || jsCdnLibs.length < 1 ? \'hidden\' : \'\'" repeat="item in (jsCdnLibs | filter: $select.search)" refresh="searchRemote(property.remote + \'?search=\'+$select.search+\'&amp;fields=version,description,homepage\', \'jsCdnLibs\', $select.search)" position="up" refresh-delay="300" on-highlight="showLibraryPreview(item, property)" class="bkr">\n        <span class="bkr">{{::item.name}} - v{{::item.version}} - {{::item.description}}</span>\n      </ui-select-choices>\n    </ui-select>\n  </div>\n</div>\n<div ng-repeat="action in actions" class="action language-option clearfix bkr">\n  <button class="btn btn-default bkr" ng-click="perform(action)" ng-disabled="action.running">{{ action.name }}</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/publication/publish"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="bkr">\n  <div class="modal-header bkr">\n    <div class="init bkr" ng-if="initializing">\n      Loading…\n      <i class="fa fa-refresh fa-spin loading-state bkr"></i>\n    </div>\n    <div class="sign-in bkr" ng-if="!initializing &amp;&amp; !isSignedIn()">\n      <h1 class="error bkr" ng-if="error">{{error}}</h1>\n      <h1 ng-if="!error" class="bkr">Sign in to Beaker Publications</h1>\n      <form ng-submit="signIn()" class="bkr">\n        <input ng-model="user.email" type="email" focus="true" name="email" placeholder="Email" class="field bkr">\n        <input ng-model="user.password" type="password" required="" name="password" placeholder="Password" class="field bkr">\n        <input type="submit" value="Sign in" class="btn btn-primary bkr" ng-if="!saving">\n        <p ng-if="saving" class="bkr">\n          Signing in…\n          <i class="fa fa-refresh fa-spin loading-state bkr"></i>\n        </p>\n      </form>\n      <div class="sign-up bkr">\n        No account?\n        <a target="_blank" ng-href="{{signupUrl()}}" ng-click="close()" class="bkr">Create New Account</a>\n      </div>\n    </div>\n    <div class="publish bkr" ng-if="!initializing &amp;&amp; isSignedIn()">\n      <h1 class="bkr">{{title}}</h1>\n      <form ng-submit="publishAction()" class="bkr">\n        <label for="category" class="full bkr">Notebook name others will see when you publish:</label>\n        <input ng-model="model.name" focus="true" ng-required="model[\'category-id\']" type="text" class="field bkr">\n        <label for="category" class="full bkr">Notebook description:</label>\n        <textarea ng-model="model.description" rows="3" class="field bkr"></textarea>\n        <label for="category" class="full bkr">Category that describes your notebook:</label>\n        <select ng-model="model[\'category-id\']" ng-options="category[\'public-id\'] as category.name for category in categories" name="category" class="field bkr">\n          <option value="" class="bkr">Select a category</option>\n        </select>\n        <label class="field text-danger bkr" ng-if="!model[\'category-id\']" title="will not be indexed, can only be found if you have the URL">If you do not select a category your publication will be \'unlisted\'</label>\n        <div class="preview-image bkr" ng-if="attachmentUrl">\n          <label class="full bkr">Preview image:</label>\n          <img ng-src="{{attachmentUrl}}" width="50" class="bkr">\n          <a class="remove bkr" ng-click="removeAttachment()">×</a>\n        </div>\n        <div class="error attachment bkr" ng-if="attachmentErrors">{{attachmentErrors}}</div>\n        <a class="file-upload bkr" ng-if="!file.progress" ngf-select="uploadAttachment($file)">{{attachmentUrl ? "Update image" : "Add preview image"}}</a>\n        <em class="bkr">(recommended at least 400x300 resolution)</em>\n        <div class="progress bkr" ng-if="file.progress >= 0">\n          <div class="progress-bar bkr" role="progressbar" aria-valuenow="{{file.progress}}" aria-valuemin="0" aria-valuemax="100" style="width: {{file.progress}}%">\n          </div>\n        </div>\n        <ul ng-if="published" class="publication-details bkr">\n          <li class="bkr">\n            <div class="time-label bkr">Published</div>\n            <div class="value publish-time bkr">{{model[\'created-at\'] | date:\'short\'}}</div>\n          </li>\n          <li class="bkr">\n            <div class="time-label bkr">Last updated</div>\n            <div class="value update-time bkr">{{model[\'updated-at\'] | date:\'short\'}}</div>\n          </li>\n        </ul>\n        <div class="actions bkr">\n          <input ng-if="!saving" type="submit" ng-value="saveButton" class="btn btn-primary bkr">\n          <input ng-if="!saving &amp;&amp; published" type="button" class="btn bkr" value="Publish as new" ng-click="publish(\'create\', true)">\n          <input ng-if="!saving &amp;&amp; published" type="button" class="btn bkr" value="Delete" ng-click="delete()" formnovalidate="">\n          <input ng-if="!saving" type="button" class="btn bkr" value="Cancel" ng-click="close()" formnovalidate="">\n        </div>\n        <div class="identity bkr">\n          <img gravatar-src="currentUser().email" gravatar-size="30" gravatar-default="retro" class="bkr">\n          <span class="text bkr">\n            Publishing\n            as <span class="name bkr">{{currentUser().name}}</span>.\n            <a ng-if="!saving" ng-click="signOut()" class="bkr">Log out</a>\n            <span ng-if="saving" class="bkr"><i class="fa fa-refresh fa-spin loading-state bkr"></i></span>\n          </span>\n        </div>\n      </form>\n    </div>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/beakerobjectlayout"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul class="bkr">\n  <li class="outputcontainer-li bkr" ng-repeat="i in items track by $index">\n    <div class="dropdown bkr">\n      <a class="dropdown-toggle bk-object-label-menu bkr bkr" data-toggle="dropdown">\n        <b class="bkr bkr">{{model.getCellModel().labels[$index]}}</b>\n      </a>\n      <ul class="dropdown-menu bkr" role="menu" aria-labelledby="dropdownMenu" ng-if="isPublication == false">\n        <li ng-repeat="item in bkoMenuItems" class="bkr">\n          <a href="#" tabindex="-1" ng-click="item.action($parent.$index)" ng-bind="item.name" eat-click="" class="bkr">\n          </a>\n        </li>\n      </ul>\n    </div>\n    <bk-code-cell-output model="i" class="bkr"></bk-code-cell-output>\n  </li>\n</ul>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/cell"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div ng-class="(isLocked() || isLockedCell()) &amp;&amp; \'locked\'" class="bkcell {{cellmodel.type}} bkr">\n  <div class="toggle-menu bkr" ng-class="{\'locked-cell-menu\': cellmodel.locked &amp;&amp; \'locked-cell-menu\', \'wide\' : wideMenu()}">\n    <div class="toggle-menu-items bkr">\n      <div class="dropdown dropdown-promoted bkr" data-toggle="dropdown" style="float: right">\n        <div class="cell-menu-item cell-dropdown dropdown-toggle bkr" title="cell menu"></div>\n        <bk-dropdown-menu menu-items="cellview.menu.items" submenu-classes="drop-left" class="bkr"></bk-dropdown-menu>\n      </div>\n      \n      <div class="cell-menu-item fa fa-unlock hover-item bkr" style="padding: 5px" ng-if="isLockedCell()" ng-click="lockUnlockCell()" title="unlock cell"></div>\n      <div class="cell-menu-item move-cell-down bkr" ng-click="moveCellDown()" ng-class="moveCellDownDisabled() &amp;&amp; \'disabled\'" title="move cell down"></div>\n      <div class="cell-menu-item move-cell-up bkr" ng-click="moveCellUp()" ng-class="moveCellUpDisabled() &amp;&amp; \'disabled\'" title="move cell up"></div>\n      <div class="cell-menu-item delete-cell bkr" ng-click="deleteCell()" title="{{isSectionCell() ? \'Delete heading and keep contents\' : \'Delete cell\'}}"></div>\n      <div class="cell-menu-item expand-contract bkr" ng-if="!isLockedCell() &amp;&amp; collapseCellMenu[cellmodel.type]" ng-click="collapseCellMenu[cellmodel.type].click()" ng-class="isCellHidden() &amp;&amp; \'collapsed\'" title="{{isCellHidden() ? \'show\' : \'hide\'}} {{collapseCellMenu[cellmodel.type].tooltip}}"></div>\n      <div class="dropdown dropdown-promoted advanced-only bkr" ng-if="isCodeCell() &amp;&amp; !isLockedCell()" style="float: right">\n        <div ng-if="!cellmodel.evaluatorReader &amp;&amp; !hasFaultyEvaluator()" class="loading-state bkr">\n          <i class="fa fa-refresh fa-spin bkr"></i>\n        </div>\n        <div ng-if="hasFaultyEvaluator()" class="loading-state bkr">\n          <i class="fa fa-exclamation-triangle bkr" title="failed to load {{cellmodel.evaluator}}" ng-if="hasFaultyEvaluator()"></i>\n        </div>\n        <bk-code-cell-input-menu ng-show="cellmodel.evaluatorReader" ng-if="!hasFaultyEvaluator()" class="bkr"></bk-code-cell-input-menu>\n      </div>\n      <div class="cell-menu-item evaluate bkr" ng-if="isMarkdownCell()" title="run cell"></div>\n      <div class="cell-menu-item evaluate bkr" ng-if="isCodeCell()" ng-class="isCellRunning() &amp;&amp; \'disabled\'" ng-click="evaluate($event)" title="run cell"></div>\n      <div class="cell-menu-item evaluate bkr" ng-if="!isLockedCell() &amp;&amp;  cellmodel.type === \'section\'" ng-click="evaluate($event)" title="run all cells in section"></div>\n      <div class="cell-status-item loading-state advanced-hide bkr" ng-if="!isLockedCell() &amp;&amp; isCodeCell() &amp;&amp; !cellmodel.evaluatorReader &amp;&amp; !hasFaultyEvaluator()">Initializing {{cellmodel.evaluator}}\n        <i class="fa fa-refresh fa-spin bkr"></i>\n      </div>\n      <div ng-hide="isLockedCell()" class="cell-status-item loading-state advanced-hide bkr" ng-if="!isLockedCell() &amp;&amp; isCodeCell() &amp;&amp; hasFaultyEvaluator()">Failed to load {{cellmodel.evaluator}}\n        <i class="fa fa-exclamation-triangle bkr"></i>\n      </div>\n    </div>\n    <div ng-if="shouldShowSummary() &amp;&amp; !isLockedCell()" class="mini-cell-stats bkr">\n      <span ng-if="isCodeCell()" class="bkr">\n      {{cellmodel.evaluator}} &nbsp;\n      ({{cellmodel.lineCount}} lines) &nbsp;&nbsp;\n      </span>\n      {{getCellSummary()}}\n    </div>\n  </div>\n  <div ng-if="isDebugging() &amp;&amp; !isLockedCell()" class="bkr">\n    [Debug]: cell Id = {{cellmodel.id}}, parent = {{getParentId()}}, level = {{cellmodel.level}}\n    <a ng-click="toggleShowDebugInfo()" ng-hide="isShowDebugInfo()" class="bkr">show more</a>\n    <a ng-click="toggleShowDebugInfo()" ng-show="isShowDebugInfo()" class="bkr">show less</a>\n    <div collapse="!isShowDebugInfo()" class="bkr">\n      <pre class="bkr">{{cellmodel | json}}</pre>\n    </div>\n  </div>\n  <div ng-include="getTypeCellUrl()" class="bkr"></div>\n\n  <bk-new-cell-menu config="newCellMenuConfig" ng-class="isLarge &amp;&amp; \'large\'" is-large="isLarge" ng-if="newCellMenuConfig.isShow()" class="bkr"></bk-new-cell-menu>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/celltooltip"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="bkcelltooltip bkr"></div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/codecell"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<div class="evaluator bkr" evaluator-type="{{ cellmodel.evaluator }}" ng-class="{\n    \'evaluator-ready\': cellmodel.evaluatorReader,\n    \'locked\': isLocked()||isLockedCell(),\n    \'empty\': isEmpty()\n  }">\n  <div class="bkcell code-cell-area bkr">\n    <div class="code-cell-input bkr" ng-mousedown="backgroundClick($event)" ng-hide-ex="isLocked() || isLockedCell()" after-hide="afterHide()" after-show="afterShow()" ng-class="{\'input-hidden\': cellmodel.input.hidden}">\n      <div class="code-cell-input-content bkr">\n        <bk-code-cell-input-menu class="advanced-hide bkr"></bk-code-cell-input-menu>\n        <div ng-mousedown="$event.stopPropagation()" class="bkr">\n          <div class="bkcelltextarea bkr">{{cellmodel.input.body}}</div>\n          <bk-cell-tooltip editor="cm" class="bkr"></bk-cell-tooltip>\n        </div>\n        <a href="#" class="btn btn-default evaluate-script advanced-hide bkr" ng-class="isCellRunning() &amp;&amp; \'disabled\'" ng-click="evaluate($event)" eat-click="">\n          {{ isJobCancellable() ? \'Stop\' : \'Run\' }}\n        </a>\n      </div>\n      <div class="power-menu bkr" ng-class="{\'input-hidden\': cellmodel.input.hidden}">\n        <div class="dropdown dropdown-promoted bkr" data-toggle="dropdown" ng-show="cellmodel.initialization">\n          <div class="cell-power-button dropdown-toggle bkr" title="initialization cell is on"><i class="fa fa-power-off bkr"></i></div>\n          <bk-dropdown-menu menu-items="power.menu.items" submenu-classes="drop-left" class="bkr"></bk-dropdown-menu>\n        </div>\n      </div>\n    </div>\n    <div ng-if="!displayOutput &amp;&amp; hasOutput()" cell-id="{{ cellmodel.id }}" ng-style="{\'min-height\': (cellmodel.output &amp;&amp; cellmodel.output.height) + \'px\'}" class="code-cell-output bkr"></div>\n    <div ng-if="displayOutput &amp;&amp; hasOutput()" class="code-cell-output bkr" ng-class="{\n      \'no-output\': isHiddenOutput(),\n      \'input-hidden\': cellmodel.input.hidden,\n      \'output-hidden\': cellmodel.output.hidden,\n      \'error\': isError()\n      }">\n      <h6 ng-if="outputTitle()" class="bkr">{{outputTitle()}}</h6>\n      <bk-code-cell-output model="cellmodel.output" evaluator-id="{{ cellmodel.evaluator }}" cell-id="{{ cellmodel.id }}" class="bkr">\n      </bk-code-cell-output>\n    </div>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/codecellinputmenu"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="dropdown bk-code-cell-input bkr">\n  <a class="dropdown-toggle cell-evaluator-menu bkr" data-toggle="dropdown">\n    <bk-language-logo name="{{getEvaluator().shortName}}" bg-color="{{getEvaluator().bgColor}}" fg-color="{{getEvaluator().fgColor}}" border-color="{{getEvaluator().borderColor}}" class="bkr">\n    </bk-language-logo>\n    <b class="advanced-hide bkr">{{cellmodel.evaluator}}</b>\n  </a>\n  <ul class="dropdown-menu inputcellmenu bkr" role="menu" aria-labelledby="dLabel">\n    <li ng-repeat="(evaluatorName, evaluator) in getEvaluators()" class="bkr">\n      <a tabindex="-1" href="#" ng-click="setEvaluator(evaluatorName)" class="{{evaluatorName}}-menuitem bkr" eat-click="">\n          <bk-language-menu-item key="{{evaluatorName}}" bg-color="{{getEvaluatorDetails(evaluatorName).bgColor}}" name="{{getEvaluatorDetails(evaluatorName).shortName}}" fg-color="{{getEvaluatorDetails(evaluatorName).fgColor}}" border-color="{{getEvaluatorDetails(evaluatorName).borderColor}}" class="bkr"></bk-language-menu-item>\n      </a>\n      <i class="fa fa-check bkr" ng-show="getShowEvalIcon(evaluatorName)"></i>\n    </li>\n  </ul>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/codecelloutput"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="toggle-menu bkr">\n  <div class="dropdown dropdown-promoted bkr" style="float: right">\n    <div class="cell-menu-item cell-dropdown dropdown-toggle bkr" data-toggle="dropdown" title="cell output menu" ng-show="isShowMenu()"></div>\n    <bk-code-cell-output-menu model="outputCellMenuModel" class="bkr"></bk-code-cell-output-menu>\n  </div>\n  <div class="cell-menu-item expand-contract bkr" ng-click="toggleExpansion()" ng-class="!isExpanded() &amp;&amp; \'collapsed\'" title="{{!isExpanded() ? \'show\' : \'hide\'}} cell output" ng-show="isShowMenu()"></div>\n</div>\n<bk-output-display ng-show="isShowOutput()" model="outputDisplayModel" type="{{ getOutputDisplayType() }}" class="bkr">\n</bk-output-display>\n<div ng-show="isShowOutputSummary()" class="mini-cell-stats output-stats-padding bkr">\n  {{getOutputSummary()}}\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/codecelloutputmenu"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul class="dropdown-menu dropdown-menu-form cursor_hand bkr" role="menu" aria-labelledby="dLabel">\n  <li class="dropdown-submenu drop-left bkr">\n    <a tabindex="-1" class="bkr">Displays ({{model.getSelectedDisplay()}})</a>\n    <ul class="dropdown-menu bkr">\n      <li ng-repeat="d in model.getApplicableDisplays()" class="bkr">\n        <a tabindex="-1" href="#" ng-click="model.setSelectedDisplay(d)" eat-click="" class="bkr">\n          {{ d }}\n        </a>\n        <i class="glyphicon glyphicon-ok bkr" ng-show="d === model.getSelectedDisplay()"></i>\n      </li>\n    </ul>\n  </li>\n  <li ng-repeat="item in model.getAdditionalMenuItems()" class="{{getItemClass(item)}} bkr">\n    <a tabindex="-1" ng-click="item.action()" class="bkr">{{getItemName(item)}}</a>\n    <ul class="dropdown-menu bkr">\n      <li ng-repeat="subitem in getSubItems(item)" class="bkr">\n        <a ng-click="subitem.action()" class="{{getSubmenuItemClass(subitem)}} bkr" title="{{subitem.tooltip}}">{{subitem.name}}</a>\n      </li>\n    </ul>\n  </li>\n  <li ng-if="sparkJobs() > 0" class="bkr">\n    <a tabindex="-1" ng-click="showSparkJobs()" class="bkr">Spark jobs...</a>\n  </li>\n</ul>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/cyclingoutputcontainerlayout"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<div id="lm-cycling-panel-{{guid}}-{{$index}}" ng-style="borderStyle" ng-repeat="i in items track by $index" class="bkr">\n  <b class="bkr">{{model.getCellModel().labels[$index]}}</b><br class="bkr">\n  <bk-code-cell-output model="i" class="bkr"></bk-code-cell-output>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/dashboardlayout"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<table class="bkr">\n  <tbody class="bkr"><tr ng-repeat="row in rows" class="bkr">\n    <td ng-style="cellStyle" ng-repeat="col in row" class="bkr">\n      <div ng-if="model.getCellModel().layout.borderDisplayed" class="panel panel-primary bkr">\n        <div class="panel-heading bkr">\n          <h3 class="panel-title bkr">{{col.label}}</h3>\n        </div>\n        <div class="panel-body bkr">\n          <bk-code-cell-output id="cell_{{col.row}}_{{col.col}}" model="col" class="bkr"></bk-code-cell-output>\n        </div>\n      </div>\n      <div ng-if="!model.getCellModel().layout.borderDisplayed" class="panel-primary bkr">\n        <div class="panel-heading bkr">\n          <h3 class="panel-title bkr">{{col.label}}</h3>\n        </div>\n        <div class="panel-body bkr">\n          <bk-code-cell-output id="cell_{{col.row}}_{{col.col}}" model="col" class="bkr"></bk-code-cell-output>\n        </div>\n      </div>\n    </td>\n  </tr>\n</tbody></table>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/gridoutputcontainerlayout"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<table class="bkr">\n  <tbody class="bkr"><tr ng-repeat="row in rows" class="bkr">\n    <td ng-style="cellStyle" ng-repeat="col in row" class="bkr">\n      <b class="bkr">{{col.label}}</b><br class="bkr">\n      <bk-code-cell-output model="col" class="bkr"></bk-code-cell-output>\n    </td>\n  </tr>\n</tbody></table>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/markdown-editable"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="markdown-area bkr" ng-class="{\'markdown-hidden\': cellmodel.hidden}">\n  <div class="markdown-content bkr">\n    <div ng-show="mode==\'edit\'" ng-click="$event.stopPropagation()" class="codemirror-wrapper bkr">\n      <textarea class="bkr"></textarea>\n    </div>\n    <div ng-click="edit($event)" class="markup bkr" ng-show="mode==\'preview\'"></div>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/markdowncell"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<bk-markdown-editable cellmodel="cellmodel" class="bkr"></bk-markdown-editable>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/newcellmenu"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul class="nav nav-pills new-cell bkr" role="tablist">\n  <li role="presentation" class="active bkr">\n    <button ng-click="newDefaultCodeCell()" class="btn btn-primary insert-cell bkr" ng-class="!isLarge &amp;&amp; \'btn-xs\'">\n    <span ng-class="!isLarge &amp;&amp; \'advanced-hide\'" class="bkr">\n      Insert {{defaultEvaluator()}} Cell\n    </span>\n    <span ng-if="!isLarge" class="plus advanced-only bkr">+<i class="fa fa-sort-down fa-hidden bkr"></i>\n    </span>\n    </button>\n  </li>\n  <li role="presentation" class="dropdown bkr" uib-dropdown="">\n    <button class="btn btn-primary dropdown-toggle bkr" ng-class="!isLarge &amp;&amp; \'btn-xs\'" data-toggle="dropdown">code <i class="fa fa-sort-down bkr"></i>\n    </button>\n    <ul class="dropdown-menu code-dropdown bkr" role="menu" uib-dropdown-menu="">\n      <li ng-repeat="(key, value) in getEvaluators()" class="bkr">\n        <a class="new-cell-menu-item bkr" ng-click="newCodeCell(key)">\n          <bk-language-menu-item key="{{key}}" bg-color="{{getEvaluatorDetails(key).bgColor}}" name="{{getEvaluatorDetails(key).shortName}}" fg-color="{{getEvaluatorDetails(key).fgColor}}" border-color="{{getEvaluatorDetails(key).borderColor}}" class="bkr"></bk-language-menu-item>\n        </a>\n      </li>\n      <li class="bkr">\n        <a class="new-cell-menu-item bkr" ng-click="showPluginManager()">Other languages...</a>\n      </li>\n    </ul>\n  </li>\n  <li role="presentation" class="dropdown bkr">\n    <button class="btn btn-primary insert-text bkr" ng-class="!isLarge &amp;&amp; \'btn-xs\'" ng-click="newMarkdownCell()">text<i class="fa fa-sort-down fa-hidden bkr"></i>\n    </button>\n  </li>\n  <li role="presentation" class="dropdown bkr" uib-dropdown="">\n    <button class="btn btn-primary bkr" ng-class="!isLarge &amp;&amp; \'btn-xs\'" data-toggle="dropdown">section <i class="fa fa-sort-down bkr"></i>\n    </button>\n    <ul class="dropdown-menu section-menu bkr" role="menu" uib-dropdown-menu="">\n      <li ng-repeat="level in ::sectionLevels" class="bkr">\n        <a class="new-cell-menu-item bkr" ng-click="newSectionCell(level)">Level {{::level}}</a>\n      </li>\n    </ul>\n  </li>\n</ul>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/notebook"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div ng-class="{\'advanced-mode\': isAdvancedMode(), \'hierarchy-mode\': isHierarchyEnabled()}" class="bkr">\n  <bk-new-cell-menu ng-show="!isLocked() &amp;&amp; !isLoading &amp;&amp; defaultEvaluatorLoaded()" ng-class="isEmpty() &amp;&amp; \'only-child large\'" is-large="isEmpty()" config="newCellMenuConfig" class="bkr"></bk-new-cell-menu>\n  <div class="bkcell bkr">\n    <bk-cell ng-repeat="cell in getChildren()" cellmodel="cell" index="$index" cellid="{{cell.id}}" class="bkr">\n    </bk-cell>\n    <div class="dropdown bkcellmenu bkr" style="position: fixed; z-index: 99">\n      <a class="dropdown-toggle bkr" data-toggle="dropdown"></a>\n    </div>\n  </div>\n  <div id="search_replace_window" ng-show="isShowingSearchReplace()" class="searchreplace-container bkr" ng-keyup="($event.which==27)?hideSearchReplace():return" tabindex="0">\n    <div class="search-replace bkr">\n      <table class="table bkr">\n        <tbody class="bkr">\n          <tr class="bkr">\n            <td style="border-top:none" class="bkr"><label for="find_field" class="cursor_hand bkr">Find:</label></td>\n            <td style="border-top:none" class="bkr">\n               <input type="text" id="find_field" class="field cursor_hand bkr" placeholder="Find" ng-model="searchReplaceData.find" ng-keyup="($event.which==13)?findNextFunction(searchReplaceData):findALLFunction(searchReplaceData)">\n            </td>\n            <td style="border-top:none" class="bkr"><label for="replace_field" class="cursor_hand bkr">Replace:</label></td>\n            <td style="border-top:none" class="bkr">\n              <input type="text" id="replace_field" class="field cursor_hand bkr" placeholder="Replace" ng-model="searchReplaceData.replace" ng-keyup="($event.which==13)?replaceFunction(searchReplaceData):return">\n            </td>\n          </tr>\n        </tbody>\n      </table>\n      <table class="table bkr">\n        <tbody class="bkr">\n          <tr class="bkr">\n            <td style="border-top:none" class="bkr">\n              <select class="cursor_hand bkr" ng-model="searchReplaceData.searchCellFilter" ng-change="findALLFunction(searchReplaceData)" ng-options="option.value as option.name for option in availableSearchCellOptions">\n              </select>\n            </td>\n            <td style="border-top:none" class="bkr">\n              <input type="checkbox" id="case_sensitive" ng-model="searchReplaceData.caseSensitive" ng-change="findALLFunction(searchReplaceData)" class="cursor_hand bkr">\n              <label for="case_sensitive" class="cursor_hand bkr">Case sensitive</label>\n            </td>\n            <td style="border-top:none" class="bkr">\n              <input type="checkbox" id="wrap_search" ng-model="searchReplaceData.wrapSearch" class="cursor_hand bkr">\n              <label for="wrap_search" class="cursor_hand bkr">Wrap search</label>\n            </td>\n          </tr>\n        </tbody>\n      </table>\n      <div align="center" class="bkr">\n        <button class="cancel btn btn-default bkr" ng-click="hideSearchReplace()">Done</button>\n        <button class="yes btn btn-default bkr" ng-click="findNextFunction(searchReplaceData)">Find next</button>\n        <button class="yes btn btn-default bkr" ng-click="findPreviousFunction(searchReplaceData)">Find previous</button>\n        <button class="yes btn btn-default bkr" ng-click="replaceFunction(searchReplaceData)">Replace</button>\n        <button class="yes btn btn-default bkr" ng-click="replaceAllFunction(searchReplaceData)">Replace all</button>\n      </div>\n    </div>\n  </div>\n  \n  <div ng-show="isShowingOutput()" class="outputlogbox bkr"></div>\n  <div ng-show="isShowingOutput()" class="outputlogcontainer bkr">\n    <div class="outputloghandle bkr"></div>\n    <div class="btn-toolbar bkr">\n      <div class="btn-group alt-controls bkr">\n        <a class="btn btn-default btn-sm bkr" ng-click="clearOutput()">Clear</a>\n        <a class="btn btn-default btn-sm hide-output bkr" ng-click="hideOutput()">Hide</a>\n      </div>\n      <div class="btn-group bkr" data-toggle="buttons-checkbox">\n        <a class="btn bkr" ng-class="showStdOut ? \'btn-primary\' : \'btn-default\'" ng-click="toggleStdOut($event)">stdout</a>\n        <a class="btn bkr" ng-class="showStdErr ? \'btn-primary\' : \'btn-default\'" ng-click="toggleStdErr($event)">stderr</a>\n      </div>\n    </div>\n    <div class="outputlogout bkr" ng-show="showStdOut" ng-class="!showStdErr &amp;&amp; \'single\'">\n      <label class="output-label bkr">stdout:</label>\n      <div class="outputlogbox outputlogstdout bkr">\n        <div ng-repeat="line in outputLog track by $index" class="bkr">\n          <div ng-show="line.type == \'text\' || line.type == \'stdout\'" class="bkr">\n            <pre class="prelog bkr">{{line.line}}</pre>\n          </div>\n        </div>\n      </div>\n    </div>\n    <div class="outputlogerr bkr" ng-show="showStdErr" ng-class="!showStdOut &amp;&amp; \'single\'">\n      <label class="output-label bkr">stderr:</label>\n      <div class="outputlogbox bkr">\n        <div ng-repeat="line in outputLog track by $index" class="bkr">\n          <div ng-show="line.type == \'stderr\'" class="bkr">\n            <pre class="prelog bkr">{{line.line}}</pre>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div ng-if="isDebugging()" class="bkr">\n    <button ng-click="showDebugTree = !showDebugTree" class="bkr">Toggle debug Tree</button>\n    <div collapse="!showDebugTree" class="bkr">\n      <pre class="bkr">{{getNotebookModel() | json}}</pre>\n    </div>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/output-progress"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div ng-if="elapsed > 200" style="white-space: nowrap; overflow-x: hidden" class="bkr">\n  <div style="display: inline-block; margin: 2px 0 0 2px" class="bkr">\n    <div class="dropdown progress-notification-dropdown bkr">\n      <a class="dropdown-toggle progress-notification-menu-toggle bkr" data-toggle="dropdown" data-target="#" role="button" aria-haspopup="true" aria-expanded="false">\n        <i class="fa fa-refresh fa-spin fa-lg bkr"></i>\n      </a>\n      <ul class="dropdown-menu bkr" role="menu" aria-labelledby="dropdownMenu">\n        <li ng-repeat="notificationMethod in getAvailableNotificationMethods()" class="bkr">\n          <a href="#" tabindex="-1" ng-click="toggleNotifyWhenDone(notificationMethod)" eat-click="" class="bkr">{{notificationMethod.title}}</a>\n          <i class="glyphicon glyphicon-ok bkr" ng-show="isNotifyWhenDone(notificationMethod)"></i>\n        </li>\n      </ul>\n    </div>\n    <span class="elapsed-time bkr"> &nbsp; Elapsed: {{getElapsedTime()}} &nbsp; </span>\n    <i class="fa fa-times-circle fa-lg text-danger cursor_hand bkr" ng-click="cancel()" ng-if="isCancellable()" title="cancel"></i>\n  </div>\n  <div class="progress bkr" style="display: inline-block; width: 150px; margin-left: 30px; margin-bottom: -5px" ng-if="hasProgressBar()">\n    <div class="progress-bar bkr" role="progressbar" aria-valuenow="{{getProgressBar()}}" aria-valuemin="0" aria-valuemax="100" style="width: {{getProgressBar()}}%; display: inline-block">\n      {{getProgressBar()}} %\n    </div>\n  </div>\n  <div ng-if="hasMessage()" style="margin-left: 30px; display: inline-block" class="bkr">{{getMessage()}}</div>\n  <br class="bkr">\n  <bk-spark-progress ng-if="usesSpark()" class="bkr"></bk-spark-progress>\n</div>\n<div ng-if="hasPayload() || hasOutputData()" class="bkr">\n  <hr class="bkr">\n  <bk-code-cell-output model="outputDisplayModel" class="bkr"></bk-code-cell-output>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/output-results"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul ng-if="hasOutputData()" class="list-unstyled bkr">\n  <li ng-repeat="i in outputdata" class="bkr">\n    <pre ng-bind-html="colorizeIfNeeded(i.value)" ng-class="i.type === &quot;out&quot; ? &quot;text-info&quot; : &quot;text-warning&quot;" class="bkr"></pre>\n  </li>\n</ul>\n<bk-code-cell-output ng-if="hasPayload() &amp;&amp; !isPayloadHidden()" model="payload" class="bkr"></bk-code-cell-output>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/outputcontainer"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div ng-switch="" on="layout.type" class="bkr">\n    <tabbed-output-container-layout class="outputcontainer bkr" model="model" ng-switch-when="TabbedOutputContainerLayoutManager"></tabbed-output-container-layout>\n    <grid-output-container-layout class="outputcontainer bkr" model="model" ng-switch-when="GridOutputContainerLayoutManager"></grid-output-container-layout>\n    <cycling-output-container-layout class="outputcontainer bkr" model="model" ng-switch-when="CyclingOutputContainerLayoutManager"></cycling-output-container-layout>\n    <dashboard-layout class="outputcontainer bkr" model="model" ng-switch-when="DashboardLayoutManager"></dashboard-layout>\n    <beakerobject-layout class="outputcontainer bkr" model="model" ng-switch-when="BeakerObjectLayoutManager"></beakerobject-layout>\n    <simple-layout class="outputcontainer bkr" model="model" ng-switch-default=""></simple-layout>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/sectioncell"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div ng-class="{branch: isBranch(), leaf: isLeaf(), \'section-error\': cellmodel.isError &amp;&amp; !isShowChildren()}" class="bkr">\n  <div ng-hide="cellmodel.hideTitle" class="bkr">\n    <div class="section-connector bkr" ng-hide="!isAntecedentSectionSiblingPrimogeniture()"></div>\n    <span class="bksectiontoggleplus section-toggle bkr" ng-click="toggleShowChildren()" ng-hide="isShowChildren()">\n      <i class="fa fa-plus bkr"></i>\n    </span>\n    <span class="bksectiontoggleminus section-toggle bkr" ng-click="toggleShowChildren()" ng-show="isShowChildren()">\n      <i class="fa fa-minus bkr"></i>\n    </span>\n    <p class="depth-indicator bkr">{{getFullIndex()}}</p>\n    <bk-markdown-editable class="section{{cellmodel.level}} bk-section-title bkr" cellmodel="cellmodel"></bk-markdown-editable>\n  </div>\n  <bk-new-cell-menu size="xs" config="newCellMenuConfig" ng-if="newCellMenuConfig.isShow()" class="bkr"></bk-new-cell-menu>\n  <div ng-show="isShowChildren()" class="section-children bkr">\n    <bk-cell ng-repeat="cell in getChildren()" cellmodel="cell" index="$index" cellid="{{cell.id}}" class="bkr"></bk-cell>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/simplelayout"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<ul class="bkr">\n  <li class="outputcontainer-li bkr" ng-repeat="i in items track by $index">\n    <b class="bkr">{{model.getCellModel().labels[$index]}}</b><br class="bkr">\n    <bk-code-cell-output model="i" class="bkr"></bk-code-cell-output>\n  </li>\n</ul>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/tabbedoutputcontainerlayout"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<ul class="nav nav-tabs bkr">\n  <li class="{{$index==0 ? \'active\' : \'\'}} bkr" ng-repeat="i in items track by $index">\n    <a href="#lm-tab-panel-{{guid}}-{{$index}}" data-toggle="tab" class="bkr">{{model.getCellModel().labels[$index] ? model.getCellModel().labels[$index] : " "}}</a>\n  </li>\n</ul>\n\n<div class="tab-content bkr">\n  <div id="lm-tab-panel-{{guid}}-{{$index}}" ng-style="borderStyle" class="{{$index==0 ? \'tab-pane fade in active\' : \'tab-pane fade\'}} bkr" ng-repeat="i in items track by $index">\n    <bk-code-cell-output model="i" class="bkr"></bk-code-cell-output>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/notebook/textcell"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="textcell-wrapper bkr" ng-click="edit()">\n  <div class="editable-text bkr" contenteditable="{{ isEditable() ? true : false }}" style="min-height: 14px; min-width: 14px"></div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/spark/sparkconfiguration"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n  <div class="modal-header bkr">\n    <h1 class="spark-configuration bkr">\n      Spark Configuration\n      <b ng-if="edited()" class="bkr">*</b>\n    </h1>\n    <div class="spark-configuration status-line bkr">\n      <bk-spark-status class="bkr"></bk-spark-status>\n    </div>\n    <br style="clear:both" class="bkr">\n    \n  </div>\n\n  <div class="modal-body bkr">\n    <div class="alert alert-danger bkr" ng-if="error() !== \'\'">\n      {{error()}}\n    </div>\n    <fieldset class="spark-configuration bkr">\n      <form class="bkr">\n        <table border="0" width="100%" class="bkr">\n          <tbody class="bkr"><tr class="bkr">\n            <td class="bkr"><label class="col-sm-1 form-control-label bkr">Executor cores</label></td>\n            <td class="bkr">\n              <input type="text" class="form-control bkr" ng-model="configuration.executorCores.value" maxlength="3" ng-disabled="isDisabled()">\n            </td>\n\n            <td class="spacing bkr"></td>\n\n            <td class="bkr"><label class="col-sm-1 form-control-label bkr">Executor Memory</label></td>\n            <td class="bkr">\n              <input type="text" class="form-control bkr" ng-model="configuration.executorMemory.value" maxlength="3" ng-disabled="isDisabled()">\n            </td>\n          </tr>\n\n          <tr class="bkr">\n            <td class="bkr"><label class="col-sm-1 form-control-label bkr">Datacenter</label></td>\n            <td class="bkr">\n              <select class="form-control bkr" ng-model="configuration.datacenter.value" ng-options="option for option in ::configuration.datacenter.options" ng-disabled="isDisabled()">\n              </select>\n            </td>\n            <td class="bkr"></td>\n            <td class="bkr"></td>\n            <td class="bkr"></td>\n          </tr>\n        </tbody></table>\n\n        <div class="advanced-options bkr" ng-if="showAdvanced">\n\n          <hr class="bkr">\n\n          <table border="0" width="100%" class="bkr">\n            <tbody class="bkr"><tr ng-repeat="co in configuration.advanced" class="bkr">\n              <td width="35%" class="bkr">\n                <label class="col-sm-1 form-control-label bkr">{{co.name}}</label>\n              </td>\n\n              <td ng-if="co.type === \'string\'" class="bkr">\n                <input type="text" class="form-control bkr" ng-model="co.value" ng-disabled="isDisabled()">\n              </td>\n              <td ng-if="co.type === \'choice\'" class="bkr">\n                <select class="form-control bkr" ng-model="co.value" ng-options="option for option in ::co.options" ng-disabled="isDisabled()">\n                </select>\n              </td>\n              <td ng-if="co.type === \'boolean\'" class="bkr">\n                <input type="checkbox" class="checkbox bkr" ng-model="co.value" ng-disabled="isDisabled()">\n              </td>\n            </tr>\n\n            <tr ng-repeat="property in sparkConf" class="spark-property bkr">\n              <td width="35%" class="spark-property-key bkr">\n                <input type="text" class="form-control bkr" ng-model="property.key" ng-disabled="isDisabled() || isFixedProperty(property.key)" placeholder="spark.property">\n              </td>\n              <td class="bkr">\n                <span class="fa fa-times bkr" title="Remove Spark property" ng-click="removeSparkConfProperty(property)" ng-disabled="isDisabled()" eat-click="" ng-if="property.key !== \'\' &amp;&amp; !isFixedProperty(property.key)"></span>\n                <input type="text" class="form-control spark-property-value bkr" ng-model="property.value" ng-disabled="isDisabled()">\n              </td>\n            </tr>\n          </tbody></table>\n        </div>\n\n        <div class="form-commands bkr">\n          <a href="#" ng-if="!showAdvanced" ng-click="toggleAdvanced()" eat-click="" class="bkr">Advanced settings...</a>\n          <a href="#" ng-if="showAdvanced" ng-click="toggleAdvanced()" eat-click="" class="bkr">Hide advanced settings</a>\n        </div>\n      </form>\n    </fieldset>\n  </div>\n  <div class="modal-footer bkr">\n    <button ng-click="doClose()" class="btn btn-default bkr" title="Closes this dialog without saving any changes">Cancel</button>\n    <button disabled="disabled" ng-if="isConnecting()" class="btn btn-primary bkr" title="Creating SparkContext, please wait">\n      <span class="fa fa-refresh fa-spin bkr"></span>\n      Starting...\n    </button>\n    <button disabled="disabled" ng-if="isDisconnecting()" class="btn btn-primary bkr" title="Closing SparkContext, please wait">\n      <span class="fa fa-refresh fa-spin bkr"></span>\n      Stopping...\n    </button>\n    <button ng-click="start()" ng-if="!isConnected() &amp;&amp; !isConnecting() &amp;&amp; !isDisconnecting()" class="btn btn-primary bkr" title="Create SparkContext">Start</button>\n    <button ng-click="stop()" ng-if="isConnected() &amp;&amp; !isConnecting() &amp;&amp; !isDisconnecting()" class="btn btn-primary bkr" title="Close SparkContext">Stop</button>\n  </div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/spark/sparkjobs"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h1 class="bkr">Spark Jobs</h1>\n  <div class="spark-jobs-controls bkr" ng-if="jobs != null &amp;&amp; jobs.length > 0">\n    <button class="btn btn-default bkr" ng-click="expandAll()">Expand all</button>\n    <button class="btn btn-default bkr" ng-click="collapseAll()">Collapse all</button>\n  </div>\n</div>\n\n<div class="modal-body bkr">\n  <div class="spark-jobs bkr">\n    <div ng-if="!jobs || jobs.length == 0" class="alert alert-info bkr" role="alert">\n      No Spark jobs were executed.\n    </div>\n\n    <div ng-if="jobs.length > 0" class="bkr">\n      <div class="panel panel-default bkr" ng-repeat="job in jobs">\n        <div class="panel-heading bkr" ng-click="toggle(job)" eat-click="">\n          <div class="panel-title bkr">\n            <span class="fa bkr" ng-class="job.expanded ? \'fa-chevron-up\' : \'fa-chevron-down\'"></span>\n            <span class="spark-job-name bkr">Spark Job {{job.id}}</span>\n\n            <span class="spark-job-status spark-job-status-animated bkr" ng-if="job.running &amp;&amp; job.failedTasks == 0">\n              <span class="fa fa-refresh fa-spin bkr"></span> Running\n            </span>\n            <span class="spark-job-status spark-job-status-animated bkr" ng-if="job.running &amp;&amp; job.failedTasks > 0">\n              <span class="fa fa-refresh fa-spin bkr"></span> <span class="text-danger bkr">Failing</span>\n            </span>\n            <span class="spark-job-status bkr" ng-if="!job.running &amp;&amp; job.failedTasks == 0 &amp;&amp; job.totalTasks == job.succeededTasks &amp;&amp; job.totalTasks > 0">\n              <span class="plugin-status plugin-active bkr">●</span> Succeeded\n            </span>\n            <span class="spark-job-status bkr" ng-if="!job.running &amp;&amp; job.failedTasks > 0">\n              <span class="plugin-status plugin-error bkr">●</span> Failed\n            </span>\n            <span class="spark-job-status bkr" ng-if="!job.running &amp;&amp; job.failedTasks == 0 &amp;&amp; job.activeTasks == 0 &amp;&amp; job.totalTasks > 0 &amp;&amp; job.succeededTasks == 0">\n              <span class="plugin-status plugin-known bkr">●</span> Submitted\n            </span>\n            <span class="spark-job-status bkr" ng-if="!job.running &amp;&amp; job.failedTasks == 0 &amp;&amp; job.activeTasks == 0 &amp;&amp; job.totalTasks == 0">\n              <span class="plugin-status plugin-known bkr">●</span> Inactive\n            </span>\n\n            <span class="spark-job-link bkr">\n              <a href="{{job.url}}" target="_blank" title="Show native Spark UI of this job" ng-click="openUrl($event, job.url)" eat-click="" class="bkr">Spark UI</a>\n            </span>\n          </div>\n        </div>\n\n        <div class="panel-body spark-progress bkr" ng-if="job.expanded">\n          <table border="0" width="100%" class="bkr">\n            <tbody class="bkr"><tr ng-repeat="stage in job.stages" class="bkr">\n              <td class="spark-stage-name bkr">\n                <a href="{{stage.url}}" target="_blank" title="Show native Spark UI of this stage" class="bkr">\n                  Stage {{stage.id}}\n                </a>\n              </td>\n              <td class="spark-stage-progress bkr">   \n                <div class="total-progress progress bkr" title="{{stage.total}} executed tasks">\n                  <span class="spark-tasks-total bkr">{{stage.total}}</span>\n                  <div class="progress-bar spark-tasks-error bkr" role="progressbar" aria-valuenow="{{stage.failedP}}" aria-valuemin="0" aria-valuemax="100" style="width: {{stage.failedP}}%" title="{{stage.failed}} failed tasks" ng-show="stage.failed">\n                      {{stage.failed}}\n                  </div>\n                  <div class="progress-bar spark-tasks-completed bkr" role="progressbar" aria-valuenow="{{stage.completedP}}" aria-valuemin="0" aria-valuemax="100" style="width: {{stage.completedP}}%" title="{{stage.completed}} completed tasks" ng-show="stage.completed">\n                      {{stage.completed}}\n                  </div>\n                  <div class="progress-bar spark-tasks-active bkr" role="progressbar" aria-valuenow="{{stage.activeP}}" aria-valuemin="0" aria-valuemax="100" style="width: {{stage.activeP}}%" title="{{stage.active}} active tasks" ng-show="stage.active">\n                      {{stage.active}}\n                  </div>\n                </div>\n              </td>\n            </tr>\n          </tbody></table>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n\n<div class="modal-footer bkr">\n  <button ng-click="doClose()" class="btn btn-default bkr" title="Closes this dialog">Close</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/spark/sparkmenu"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<li class="dropdown spark-menu bkr" ng-class="isInactive() ? \'disabled\' : \'bkr\'">\n  <a href="#" role="button" class="dropdown-toggle bkr" data-toggle="dropdown" title="{{getError()}}">\n    <span class="plugin-status bkr" ng-class="statusClass()">●</span>\n    Spark Cluster\n  </a>\n  <ul class="bkr dropdown-menu bkr bkr" role="menu" aria-labelledby="dropdownMenu" ng-show="!isInactive()">    \n    <li ng-class="isConnecting() || isConnected() || isDisconnecting() ? \'disabled\' : \'bkr\'" class="bkr">\n      <a href="#" ng-if="!isConnecting()" ng-click="start()" title="Create Spark context" eat-click="" class="bkr">\n        Start\n      </a>\n      <a href="#" ng-if="isConnecting()" title="Spark cluster is connecting" eat-click="" class="bkr">\n        <span class="fa fa-refresh fa-spin bkr"></span>\n        Starting...\n      </a>\n    </li>\n\n    <li ng-class="isConnecting() || !isConnected() || isDisconnecting() ? \'disabled\' : \'bkr\'" class="bkr">\n      <a href="#" ng-click="stop()" ng-if="!isDisconnecting()" title="Close Spark context" eat-click="" style="border-bottom:1px solid #ccc" class="bkr">\n        Stop\n      </a>\n      <a href="#" ng-click="stop()" ng-if="isDisconnecting()" title="Closing Spark context" eat-click="" style="border-bottom:1px solid #ccc" class="bkr">\n        <span class="fa fa-refresh fa-spin bkr"></span>\n        Stopping...\n      </a>\n    </li>\n\n    <li class="bkr">\n      <a href="#" ng-click="showSparkConfiguration()" title="Configure the Spark cluster" eat-click="" class="bkr">\n        Configure...\n      </a>\n    </li>\n\n    <li ng-class="isConnected() ? \'bkr\' : \'disabled\'" class="bkr">\n      <a href="#" ng-click="showSparkProperties()" title="View the properties of the SparkConf object" eat-click="" class="bkr">\n        Spark properties...\n      </a>\n    </li>\n\n    <li ng-class="isConnected() ? \'bkr\' : \'disabled\'" class="bkr">\n      <a href="#" ng-click="showSparkUi()" title="Open the native Spark UI" eat-click="" class="bkr">\n        Show Spark UI\n      </a>\n    </li>\n  </ul>\n</li>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/spark/sparkprogress"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n\n<div class="spark-progress bkr">\n  <div ng-if="jobs.length > 0" class="bkr">\n    <div class="spark-spacing bkr" ng-repeat="job in jobs">\n      <a href="{{job.url}}" class="spark-job-name bkr" title="Show native Spark UI of this job" ng-show="job.id != null" target="_blank">Spark Job {{job.id}}</a>\n      <table border="0" width="80%" class="bkr">\n        <tbody class="bkr"><tr ng-repeat="stage in job.stages" class="bkr">\n          <td class="spark-stage-name bkr">\n            <a href="{{stage.url}}" target="_blank" title="Show native Spark UI of this stage" class="bkr">\n              Stage {{stage.id}}\n            </a>\n          </td>\n          <td class="spark-stage-progress bkr">   \n            <div class="total-progress progress bkr" title="{{stage.total}} executed tasks">\n              <span class="spark-tasks-total bkr">{{stage.total}}</span>\n              <div class="progress-bar spark-tasks-error bkr" role="progressbar" aria-valuenow="{{stage.failedP}}" aria-valuemin="0" aria-valuemax="100" style="width: {{stage.failedP}}%" title="{{stage.failed}} failed tasks" ng-show="stage.failed">\n                  {{stage.failed}}\n              </div>\n              <div class="progress-bar spark-tasks-completed bkr" role="progressbar" aria-valuenow="{{stage.completedP}}" aria-valuemin="0" aria-valuemax="100" style="width: {{stage.completedP}}%" title="{{stage.completed}} completed tasks" ng-show="stage.completed">\n                  {{stage.completed}}\n              </div>\n              <div class="progress-bar spark-tasks-active bkr" role="progressbar" aria-valuenow="{{stage.activeP}}" aria-valuemin="0" aria-valuemax="100" style="width: {{stage.activeP}}%" title="{{stage.active}} active tasks" ng-show="stage.active">\n                  {{stage.active}}\n              </div>\n            </div>\n          </td>\n        </tr>\n      </tbody></table>\n    </div>\n  </div>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/spark/sparkproperties"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="modal-header bkr">\n  <h1 class="spark-configuration bkr">SparkConf Properties</h1>\n  <div class="spark-configuration status-line bkr" style="float:right">\n    <bk-spark-status class="bkr"></bk-spark-status>\n  </div>\n  <br style="clear:both" class="bkr">\n</div>\n\n<div class="modal-body bkr">\n  <table width="100%" class="spark-properties bkr">\n    <tbody class="bkr"><tr ng-repeat="(key, value) in properties" class="bkr">\n      <th width="320" class="bkr">{{key}}</th>\n      <td class="bkr"><pre class="bkr">{{value}}</pre></td>\n    </tr>\n  </tbody></table>\n\n  <hr class="bkr">\n\n  <div class="spark-executorids bkr">\n    <h3 class="bkr">{{executorIdSectionTitle}}</h3>\n    <div ng-if="executorIds.length === 0" class="alert alert-info bkr">\n      No executor IDs are available.\n    </div>\n    <ul ng-if="executorIds.length > 0" class="bkr">\n      <li ng-repeat="executorId in executorIds" class="bkr">{{executorId}}</li>\n    </ul>\n  </div>\n</div>\n\n<div class="modal-footer bkr">\n  <button ng-click="doClose()" class="btn btn-default bkr" title="Closes this dialog">Close</button>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["mainapp/components/spark/sparkstatus"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="bkr">\n  <span ng-if="!isAvailable() &amp;&amp; !isConnecting()" class="bkr">\n    <span class="plugin-status plugin-known bkr">●</span>\n    SparkContext is not available\n  </span>\n  <span ng-if="isConnecting()" class="bkr">\n    <span class="plugin-status plugin-loading bkr">●</span>\n    SparkContext is starting...\n  </span>\n  <span ng-if="!$scope.isConnected() &amp;&amp; isDisconnecting()" class="bkr">\n    <span class="plugin-status plugin-loading bkr">●</span>\n    SparkContext is stopping...\n  </span>\n  <span ng-if="isAvailable() &amp;&amp; isFailing()" class="bkr">\n    <span class="plugin-status plugin-error bkr">●</span>\n    SparkContext encountered an error <span class="fa fa-question-circle bkr" title="{{error()}}"></span>\n  </span>\n  <span ng-if="isAvailable() &amp;&amp; isOffline() &amp;&amp; !isFailing()" class="bkr">\n    <span class="plugin-status plugin-known bkr">●</span>\n    SparkContext has not been started\n  </span>\n  <span ng-if="isConnected() &amp;&amp; running() <= 0 &amp;&amp; !isDisconnecting()" class="bkr">\n    <span class="plugin-status plugin-active bkr">●</span>\n    SparkContext has been started, no jobs are running\n  </span>\n  <span ng-if="isConnected() &amp;&amp; running() == 1 &amp;&amp; !isDisconnecting()" class="bkr">\n    <span class="plugin-status plugin-active bkr">●</span>\n    SparkContext has been started, one job is running\n  </span>\n  <span ng-if="isConnected() &amp;&amp; running() > 1 &amp;&amp; !isDisconnecting()" class="bkr">\n    <span class="plugin-status plugin-active bkr">●</span>\n    SparkContext has been started, {{running()}} jobs are running\n  </span>\n</div>';

}
return __p
}})();
(function() {(window["JST"] = window["JST"] || {})["bko-tabledisplay/output-table"] = function(obj) {
obj || (obj = {});
var __t, __p = '', __e = _.escape;
with (obj) {
__p += '\n<div class="dtcontainer bkr">\n  \n  <div ng-if="columns.length-1 > outputColumnLimit" class="bkr">\n    <div class="table_modal bkr" id="{{id}}_modal_dialog">\n      <div class="modal-dialog bkr" role="document">\n        <div class="modal-content bkr">\n          <div class="modal-body bkr">\n            Too many columns, hiding those numbered {{outputColumnLimit}} to {{columnNames.length}}. Open list of all columns to show selectively?\n          </div>\n          <div class="modal-footer bkr">\n            <button type="button" class="btn btn-primary bkr" ng-click="showHeaderMenu()">OK</button>\n            <button type="button" class="btn btn-secondary bkr" ng-click="hideModal()">Cancel</button>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n  <div class="dropdown dtmenu clearfix bkr" style="float: left; z-index: 10" ng-if="renderMenu" id="{{id}}_tabel_menu">\n     <a class="dropdown-toggle bkr" data-toggle="dropdown" ng-click="menuToggle()" id="{{id}}_dropdown_menu">\n      <span class="bko-menu bkr" aria-hidden="true" ng-class="{ sorting_desc: isIndexColumnDesc }"></span>\n    </a>\n    <ul class="dropdown-menu bkr" role="menu" submenu-classes="drop-right" aria-labelledby="dLabel">\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="toggleColumnsVisibility(true)" class="dt-show-all bkr" eat-click="">Show All Columns</a></li>\n      <li class="dropdown-submenu bkr" id="{{id}}_show_column">\n        <a tabindex="-1" href="" class="dt-show-columns bkr" data-toggle="dropdown" eat-click="">Show Column</a>\n        <div class="dropdown-menu dropdown-menu-search bkr" ng-if="showColumnMenu.searchable()" stop-click="">\n          <i class="fa fa-search bkr"></i>\n          <input ng-model="showColumnMenu.search" placeholder="search..." class="bkr">\n        </div>\n        <ul class="dropdown-menu dropdown-submenu-scrollable bkr" role="menu" submenu-classes="drop-right" aria-labelledby="dLabel">\n          <li ng-repeat="title in columnNames | filter: showColumnMenu.search" class="bkr">\n            <a tabindex="-1" href="" ng-click="showColumn($index+1, $event)" class="bkr">\n              {{title}}\n            </a>\n            <input type="checkbox" id="{{id}}-{{$index}}-visible" class="beforeCheckbox bkr" ng-click="showColumn($index+1, $event)" ng-checked="isColumnVisible($index+1)">\n            <label for="{{id}}-{{$index}}-visible" class="checkbox-label bkr"></label>\n          </li>\n        </ul>\n      </li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="toggleColumnsVisibility(false)" class="dt-hide-all bkr" eat-click="">Hide All Columns</a></li>\n      <li class="bkr">\n        <a tabindex="-1" href="#" ng-click="doUsePagination()" class="dt-use-pagination menu-separator bkr" eat-click="">Use pagination</a>\n        <i class="glyphicon glyphicon-ok bkr" ng-show="pagination.use"></i>\n      </li>\n      <li class="dropdown-submenu bkr">\n        <a tabindex="-1" href="" class="dt-rows-to-show bkr" data-toggle="dropdown" eat-click="">Rows to Show</a>\n        <ul class="dropdown-menu bkr" role="menu" submenu-classes="drop-right" aria-labelledby="dLabel">\n          <li ng-repeat="length in rowsToDisplayMenu[0]" class="bkr">\n            <a tabindex="-1" href="" ng-click="changePageLength(length)" class="bkr"> {{rowsToDisplayMenu[1][$index]}}</a>\n            <i class="glyphicon glyphicon-ok bkr" ng-show="pagination.rowsToDisplay === length"></i>\n          </li>\n        </ul>\n      </li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doSelectAll()" class="dt-select-all bkr" eat-click="">Select All Rows</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doDeselectAll()" class="dt-deselect-all bkr" eat-click="">Deselect All Rows</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doReverseSelection()" class="dt-reverse-selection bkr" eat-click="">Reverse Selection</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doCopyToClipboard()" class="menu-separator bkr" id="{{id}}_dt_copy" eat-click="">Copy to Clipboard</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doCSVExport(false)" class="dt-save-all bkr" ng-if="isPublication == false &amp;&amp; isEmbedded == false" eat-click="">Save All as CSV</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doCSVExport(true)" class="dt-save-selected bkr" ng-if="isPublication == false &amp;&amp; isEmbedded == false" eat-click="">Save Selected as CSV</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doCSVDownload(false)" class="dt-download-all bkr" eat-click="">Download All as CSV</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doCSVDownload(true)" class="dt-download-selected bkr" eat-click="">Download Selected as CSV</a></li>\n      <li class="bkr">\n        <a tabindex="-1" href="#" ng-click="doShowFilter(table.column(0), true)" class="dt-search menu-separator bkr" title="search the whole table for a substring" eat-click="">Search...</a>\n        <i class="fa fa-search bkr"></i>\n      </li>\n      <li class="bkr">\n        <a tabindex="-1" href="#" ng-click="doShowFilter(table.column(0), false)" class="dt-filter bkr" eat-click="" title="filter with an expression with a variable defined for each column">Filter...</a>\n        <i class="fa fa-filter bkr"></i>\n      </li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="hideFilter()" class="dt-hide-filter bkr" eat-click="">Hide Filter</a></li>\n      <li class="bkr"><a tabindex="-1" href="#" ng-click="doResetAll()" class="dt-reset-all menu-separator bkr" eat-click="">Reset All Interactions</a></li>\n    </ul>\n  </div>\n\n  <table cellpadding="0" class="display bkr" border="0" cellspacing="0" width="10%" id="{{id}}">\n    <thead class="bkr">\n      <tr class="bkr">\n        <th ng-repeat="c in [].constructor(columns.length) track by $index" class="bkr"></th>\n      </tr>\n      <tr class="filterRow bkr" ng-show="showFilter">\n        <th ng-repeat="c in [].constructor(columns.length) track by $index" class="bkr">\n          <div class="input-clear-growing bkr">\n            <div class="input-clear bkr">\n              <span class="fa filter-icon bkr"></span>\n              <input class="filter-input bkr" ng-class="{\'table-filter\': $first}" type="text">\n              <span class="fa fa-times clear-filter bkr"></span>\n            </div>\n            <input tabindex="-1" class="hidden-filter hidden-filter-input bkr">\n            <span class="hidden-length bkr"></span>\n          </div>\n        </th>\n      </tr>\n    </thead>\n  </table>\n</div>';

}
return __p
}})();
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
 * bk.ControlPanel
 * - This is the module for the 'control panel' section of beaker
 * - In the control panel, users get a list of opened sessions and is able to
 * (re)open one in bkApp.
 */
(function() {
  'use strict';
  var module = angular.module('bk.controlPanel', [
    'bk.utils',
    'bk.core',
    'bk.session',
    'bk.menuPluginManager',
    'bk.recentMenu',
    'bk.evaluatePluginManager',
    'bk.electron',
    'bk.connectionManager']);
})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the 'License');
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function() {
  'use strict';
  var module = angular.module('bk.controlPanel');

  module.directive('bkControlPanel', function(
        bkUtils, bkHelper, bkCoreManager, bkSession, bkMenuPluginManager, bkTrack, bkElectron, connectionManager, bkRecentMenu, $location) {
    return {
      restrict: 'E',
      template: JST['controlpanel/controlpanel'](),
      controller: function($scope) {
        document.title = 'Beaker';
        var _impl = {
          name: 'bkControlApp',
          showAnonymousTrackingDialog: function() {
            $scope.$evalAsync(function() {
              $scope.isAllowAnonymousTracking = null;
            });
          }
        };

        bkCoreManager.setBkAppImpl(_impl);

        $scope.gotoControlPanel = function(event) {
          if (bkUtils.isMiddleClick(event)) {
            bkHelper.openWindow($location.absUrl() + '/beaker', 'control-panel');
          } else {
            location.reload();
          }
        };

        // setup menus
        bkMenuPluginManager.clear();
        if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
          bkUtils.httpGet('../beaker/rest/util/getControlPanelMenuPlugins')
            .success(function(menuUrls) {
              menuUrls.forEach(function(url) {
                bkMenuPluginManager.loadMenuPlugin(url);
              });
            });
        } else {
          var menues = window.beakerRegister.getControlMenuItems();
          bkMenuPluginManager.attachMenus(menues);
        }

        $scope.getMenus = function() {
          return bkMenuPluginManager.getMenus();
        };

        if (bkUtils.isElectron){
          window.addEventListener('focus', function() {
            bkElectron.updateMenus(bkMenuPluginManager.getMenus());
          });
        }

        // actions for UI
        $scope.newNotebook = function() {
          bkCoreManager.newSession(true);
        };
        $scope.newDefaultNotebook = function() {
          bkCoreManager.newSession(false);
        };
        $scope.openNotebook = function() {
          bkHelper.openWithDialog('bkr');
        };
        $scope.openTutorial = function() {
          var uri = window.beakerRegister.tutorialUri || 'file:config/tutorial.bkr'
          bkHelper.openNotebookInNewWindow(uri, 'file', true, 'bkr');
        };

        $scope.getElectronMode = function() {
          return bkUtils.isElectron;
        };

        // ask for tracking permission
        $scope.isAllowAnonymousTracking = false;
        if ((window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) && bkTrack.isNeedPermission()) {
          bkUtils.getBeakerPreference('allow-anonymous-usage-tracking').then(function(allow) {
            switch (allow) {
              case 'true':
                $scope.isAllowAnonymousTracking = true;
                break;
              case 'false':
                $scope.isAllowAnonymousTracking = false;
                break;
              default:
                $scope.isAllowAnonymousTracking = null;
            }
          });
        } else {
          $scope.isAllowAnonymousTracking = true;
        }
        if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
          $scope.$watch('isAllowAnonymousTracking', function(newValue, oldValue) {
            if (newValue !== oldValue) {
              var allow = null;
              if (newValue) {
                allow = 'true';
                bkTrack.enable();
              } else if (newValue === false) {
                allow = 'false';
                bkTrack.disable();
              }
              bkUtils.httpPost('../beaker/rest/util/setPreference', {
                preferencename: 'allow-anonymous-usage-tracking',
                preferencevalue: allow
              });
            }
          });
        }
        $scope.showWhatWeLog = function() {
          return bkCoreManager.showModalDialog(
              function() {},
              JST['controlpanel/what_we_log']()
              );
        };

        var keydownHandler = function(e) {
          if (bkHelper.isNewDefaultNotebookShortcut(e)) { // Ctrl/Alt + Shift + n
            bkUtils.fcall(function() {
              $scope.newDefaultNotebook();
            });
            return false;
          } else if (bkHelper.isNewNotebookShortcut(e)) { // Ctrl/Alt + n
            bkUtils.fcall(function() {
              $scope.newNotebook();
            });
            return false;
          } else if (bkUtils.isElectron) {
            var ctrlXORCmd = (e.ctrlKey || e.metaKey) && !(e.ctrlKey && e.metaKey);
            // Command H
            if (ctrlXORCmd && e.which === 72) {
              bkElectron.minimize();
            }

            // Command W
            if (ctrlXORCmd && e.which === 87) {
              bkElectron.closeWindow();
            }

            if (e.which === 123) { // F12
              bkElectron.toggleDevTools();
              return false;
            } else if (ctrlXORCmd && ((e.which === 187) || (e.which === 107))) { // Ctrl + '+'
              bkElectron.increaseZoom();
              return false;
            } else if (ctrlXORCmd && ((e.which === 189) || (e.which === 109))) { // Ctrl + '-'
              bkElectron.decreaseZoom();
              return false;
            } else if (ctrlXORCmd && ((e.which === 48) || (e.which === 13))) {
              bkElectron.resetZoom();
              return false;
            }
          }
        };
        $(document).bind('keydown', keydownHandler);

        var onDestroy = function() {
          $(document).unbind('keydown', keydownHandler);
        };
        $scope.$on('$destroy', onDestroy);

        // sessions list UI
        $scope.sessions = null;
        // get list of opened sessions
        $scope.reloadSessionsList = function() {
          bkSession.getSessions().then(function(sessions) {
            $scope.sessions = _.map(sessions, function(session, sessionId) {
              session.id = sessionId;
              return session;
            });
          });
        };
        $scope.reloadSessionsList();

        // Listen to backend for changes to session list
        $.cometd.subscribe('/sessionChange', function(reply){
          $scope.reloadSessionsList();
        });

        $scope.isSessionsListEmpty = function() {
          return _.isEmpty($scope.sessions);
        };

        $scope.recents = null;
        $scope.getRecentMenuItems = function() {
          $scope.recents = bkCoreManager.getRecentMenuItems();
        };

        $scope.isRecentEmpty = function() {
          var isEmpty = _.isEmpty($scope.recents);
          if ($scope.recents && $scope.recents.length) {
            isEmpty = $scope.recents[0] && $scope.recents[0].disabled;
          }

          return isEmpty;
        };

        $scope.getRecentMenuItems();

        $scope.openRecent = function (item, event) {
          if (_.isFunction(item.action)) {
            if ((bkUtils.isMacOS && event.metaKey) || (!bkUtils.isMacOS && event.ctrlKey)) {
              item.action(true);
            } else {
              item.action();
            }
          }
        };

        $scope.removeRecent = function (item, event) {
          bkRecentMenu.removeRecentDocument(item);
        };

        var isDisconnected = function() {
          return connectionManager.isDisconnected();
        };

        bkUtils.addConnectedStatusListener(function(msg) {
          if (isDisconnected() && msg.successful) {
            connectionManager.onReconnected();
          }
          if (msg.failure) {
            connectionManager.onDisconnected();
          }
          $scope.disconnected = isDisconnected();
          return $scope.$digest();
        });
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
 * bk.ControlPanel
 * - This is the module for the 'control panel' section of beaker
 * - In the control panel, users get a list of opened sessions and is able to
 * (re)open one in bkApp.
 */
(function() {
  'use strict';
  var module = angular.module('bk.controlPanel');

  module.directive('bkControlPanelSessionItem', function(
      bkUtils, bkSession, bkCoreManager, bkRecentMenu, bkEvaluatePluginManager) {

    function saveMostRecentNotebookContents(sessionId, pathInfo, format) {
      var deferred = bkUtils.newDeferred();

      $.cometd.subscribe('/latest-notebook-model', function(resp) {

        var fileSaver = bkCoreManager.getFileSaver(pathInfo.uriType);
        fileSaver.save(pathInfo.uri, resp.data.notebookJson)
        .then(function() {
          bkRecentMenu.recordRecentDocument(JSON.stringify({
            uri: pathInfo.uri,
            type: pathInfo.uriType,
            readOnly: false,
            format: _.isEmpty(format) ? '' : format
          }));
        })
        .then(deferred.resolve)
        .catch(deferred.reject);

        $.cometd.unsubscribe('/latest-notebook-model');
      });

      $.cometd.publish('/request-latest-notebook-model', {sessionId: sessionId});

      return deferred.promise;
    }

    return {
      restrict: 'E',
      template: JST['controlpanel/table'],
      controller: function($scope) {
        $scope.getOpenSessionLink = function(session) {
          return bkUtils.getBaseUrl() + '/session/' + session.id;
        };
        $scope.close = function(session) {
          var format = session.format;
          var notebookModel = angular.fromJson(session.notebookModelJson);
          var closeSession = function() {
            if (notebookModel && notebookModel.evaluators) {
              for (var i = 0; i < notebookModel.evaluators.length; ++i) {
                // XXX Outdated notebook model is used, consider getting most recent version from backend
                bkEvaluatePluginManager.createEvaluatorThenExit(notebookModel.evaluators[i]);
              }
            }
            return bkSession.close(session.id).then(function() {
              $scope.reloadSessionsList();
            });

          };
          bkSession.getSessionEditedState(session.id)
          .then(function(response) {
            var edited = response.data.edited;
            if (!edited) {
              // close session
              closeSession();
            } else {
              // ask if user want to save first
              bkHelper.show3ButtonModal(
                  'Do you want to save [' + $scope.getCaption(session) + ']?',
                  'Confirm close',
                  function() { // yes
                    // save session
                    var saveSession = function() {
                      var notebookModelAsString = bkUtils.toPrettyJson(notebookModel);
                      if (!_.isEmpty(session.notebookUri) && !session.readOnly) {
                        var fileSaver = bkCoreManager.getFileSaver(session.uriType);
                        return fileSaver.save(session.notebookUri, notebookModelAsString, true);
                      }

                      return bkCoreManager.showFileSaveDialog({})
                        .then(function (pathInfo) {
                          if (!pathInfo.uri) {
                            return bkUtils.newDeferred().reject({
                              cause: 'Save cancelled'
                            });
                          }

                          return saveMostRecentNotebookContents(session.id, pathInfo, format)
                            .catch(function (error) {
                              return bkUtils.newDeferred().reject({
                                cause: 'error saving to file',
                                error: error
                              });
                            });
                        });
                    };

                    var savingFailedHandler = function(info) {
                      if (info.cause === 'Save cancelled') {
                        console.log('File saving cancelled');
                      } else {
                        bkHelper.show1ButtonModal(info.error, info.cause);
                      }
                    };
                    saveSession().then(closeSession, savingFailedHandler);
                  },
                  function() { // no
                    closeSession();
                  },
                  function() { // cancel
                    // no-op
                  },
                  'Save',
                  'Don\'t Save'
              );
            }
          });
        };

        $scope.getCaption = function(session) {
          var url = session.notebookUri;
          if (!url) {
            return 'New Notebook';
          }
          if (url[url.length - 1] === '/') {
            url = url.substring(0, url.length - 1);
          }
          return url.replace(/^.*[\\\/]/, '');
        };
        $scope.getDescription = function(session) {
          return session.notebookUri;
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
/**
 * bkCellMenuPluginManager
 * bkCellMenuPluginManager load and manages loaded cell menu plugins.
 */
(function() {
  'use strict';
  var module = angular.module('bk.cellMenuPluginManager', [
    'bk.utils',
    'bk.helper'  // This is only for ensuring that window.bkHelper is set, don't use bkHelper directly
  ]);
  module.factory('bkCellMenuPluginManager', function(bkUtils) {
    // loaded plugins
    var _cellMenuPlugins = {};

    var addPlugin = function(cellType, itemGetter) {
      if (!_cellMenuPlugins[cellType]) {
        _cellMenuPlugins[cellType] = [];
      }
      _cellMenuPlugins[cellType].push(itemGetter);
    };

    return {
      reset: function() {
        var self = this;
        for (var member in _cellMenuPlugins) {
          delete _cellMenuPlugins[member];
        }
        if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
          bkUtils.httpGet('../beaker/rest/util/getCellMenuPlugins')
              .success(function(menuUrls) {
                menuUrls.forEach(self.loadPlugin);
              });
        } else {
          var ml = window.beakerRegister.getCellMenuList();
          if (_.isArray(ml)) {
            var i;      
            for(i=0; i<ml.length; i++) {
              if (_.isArray(ml[i].cellType)) {
                _.each(ml[i].cellType, function(cType) {
                  addPlugin(cType, ml[i].plugin);
                });
              } else {
                addPlugin(ml[i].cellType, ml[i].plugin);
              }
            }
          }
        }
      },
      loadPlugin: function(url) {
        return bkUtils.loadModule(url).then(function(ex) {
          if (_.isArray(ex.cellType)) {
            _.each(ex.cellType, function(cType) {
              addPlugin(cType, ex.plugin);
            });
          } else {
            addPlugin(ex.cellType, ex.plugin);
          }
          return ex.plugin;
        });
      },
      getPlugin: function(cellType) {
        return _cellMenuPlugins[cellType];
      },
      getMenuItems: function(cellType, scope) {
        var menuItemGetters = _cellMenuPlugins[cellType];
        var newItems = [];
        _.each(menuItemGetters, function(getter) {
          var items = getter(scope);
          _.each(items, function(it) {
            newItems.push(it);
          });
        });
        return newItems;
      }
    };
  });
})();

/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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

  angular.module('uiSelectWrapper', ['ui.select'])
    //This overrides the ui-select-sort directive from ui.select to do nothing
    //ui-select-sort gets automatically attached to the ui-select dropdown in pluginmanager evaluator settings and adds drag listeners which we do not want
    .config(function($provide) {
      $provide.decorator('uiSelectSortDirective', function($delegate) {
        var directive = $delegate[0];

        directive.compile = function() {
          return angular.noop;
        };

        return $delegate;
      });
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
 * Module bk.core
 * Holds the core of beaker utilities. It wraps of lower level utilities that come from other
 * modules.
 * The user facing directives also use the core as a communication/exchange layer.
 */
(function() {
  'use strict';
  var module = angular.module('bk.core', [
    'ui.bootstrap',
    'bk.commonUi',
    'bk.utils',
    'bk.recentMenu',
    'bk.notebookCellModelManager',
    'bk.treeView',
    'bk.electron',
    'ngAnimate',
    'uiSelectWrapper'
  ]);

  /**
   * bkCoreManager
   * - this acts as the global space for all view managers to use it as the communication channel
   * - bkUtils should be consider 'private' to beaker, external code should depend on bkHelper
   *     instead
   */
  module.factory('bkCoreManager', function(
      $uibModal,
      $rootScope,
      $document,
      $location,
      $sessionStorage,
      $q,
      $timeout,
      bkUtils,
      bkRecentMenu,
      bkNotebookCellModelManager,
      bkElectron,
      modalDialogOp,
      Upload,
      autocompleteService,
      autocompleteParametersService,
      codeMirrorExtension,
      bkDragAndDropHelper,
      GLOBALS) {

    function isFilePath(path) {
      return path.split('/').pop() !== '';
    }

    var  FileChooserStrategy = function (data) {
      var newStrategy = this;
      newStrategy.type = data.type;
      newStrategy.initUri = data.initUri;
      newStrategy.title = data.title;
      newStrategy.okButtonTitle = data.okButtonTitle;
      newStrategy.treeViewfs = {
        applyExtFilter: true,
        showHiddenFiles: false,
        extension: data.extension
      };
    };

    var  FilePermissionsStrategy = function (data) {
      var newStrategy = this;
      newStrategy.permissions = data.permissions;
      newStrategy.owner = data.owner;
      newStrategy.group = data.group;
      newStrategy.title = data.title;
      newStrategy.path = data.path;
      newStrategy.okButtonTitle = data.okButtonTitle;
    };

    var FileSystemFileChooserStrategy = function (){
      var newStrategy = this;
      newStrategy.manualName = '';
      newStrategy.input = "";
      newStrategy.getResult = function() {
        return newStrategy.input;
      };
      newStrategy.close = function(ev, closeFunc) {
        if (ev.which === 13) {
          closeFunc(this.getResult());
        }
      };
      newStrategy.manualEntry = function() {
        newStrategy.manualName = this.input ? this.input.split('/').pop() : "";
      };
      newStrategy.checkCallback = function (result) {
        var deferred = bkUtils.newDeferred();
        if (!result){
          deferred.resolve({
            result: true
          });
        }else {
          bkHelper.httpGet(bkHelper.serverUrl("beaker/rest/file-io/isDirectory"),
            {path: result}).success(function (value) {
              if (value === true) {
                $rootScope.$broadcast("SELECT_DIR", {
                  find_in_home_dir: true,
                  path: result
                });
                deferred.resolve({
                  result: false
                });
              } else {
                deferred.resolve({
                  result: true
                });
              }
            }
          );
        }
        return deferred.promise;
      };
      newStrategy.treeViewfs = { // file service
        getChildren: function(basePath, openFolders) {
          var self = this;
          var paths = [basePath];

          this.showSpinner = true;

          if (openFolders) {
            paths = [paths].concat(openFolders);
          }

          return bkUtils.httpPost("../beaker/rest/file-io/getDecoratedChildren", {
            openFolders: paths.join(',')
          }).success(function (list) {
            self.showSpinner = false;
          }).error(function () {
            self.showSpinner = false;
            console.log("Error loading children");
          });
        },
        fillInput: function(path) {
          if (isFilePath(path)) {
            newStrategy.manualName = "";
          } else {
            path += newStrategy.manualName;
          }

          newStrategy.input = path;
        },
        open: function(path) {
          this.fillInput(path);
          $rootScope.$broadcast('modal.submit');
        },
        setOrderBy: function(options) {
          bkCoreManager.setFSOrderBy(options.orderBy);
          bkCoreManager.setFSReverse(options.reverse);
        },
        getOrderBy: function() {
          return bkCoreManager.getFSOrderBy();
        },
        getOrderReverse: function() {
          return !!bkCoreManager.getFSReverse();
        },
        getPrettyOrderBy: function() {
          var prettyNames = {
            uri: 'Name',
            modified: 'Date Modified'
          };

          return prettyNames[newStrategy.treeViewfs.getOrderBy()];
        },
        showSpinner: false,
        applyExtFilter: true,
        extFilter: ['bkr'],
        filter: function(child) {
          var fs = newStrategy.treeViewfs;
          if (!fs.applyExtFilter || _.isEmpty(fs.extFilter) || child.type === "directory") {
            return true;
          } else {
            return _.any(fs.extFilter, function(ext) {
              return _.endsWith(child.uri, ext);
            });
          }
        }
      };
    };

    // importers are responsible for importing various formats into bkr
    // importer impl must define an 'import' method
    var _importers = {};
    var FORMAT_BKR = "bkr";
    _importers[FORMAT_BKR] = {
      import: function(notebookJson) {
        var notebookModel;
        try {
          notebookModel = bkUtils.fromPrettyJson(notebookJson);
          // TODO, to be removed. Addressing loading a corrupted notebook.
          if (angular.isString(notebookModel)) {
            notebookModel = bkUtils.fromPrettyJson(notebookModel);
            bkUtils.log("corrupted-notebook", { notebookUri: enhancedNotebookUri });
          }
        } catch (e) {
          console.error(e);
          console.error("This is not a valid Beaker notebook JSON");
          console.error(notebookJson);
          throw "Not a valid Beaker notebook";
        }
        return notebookModel;
      }
    };

    var LOCATION_FILESYS = GLOBALS.FILE_LOCATION.FILESYS;
    var LOCATION_HTTP = GLOBALS.FILE_LOCATION.HTTP;
    var LOCATION_AJAX = GLOBALS.FILE_LOCATION.AJAX;

    // fileLoaders are responsible for loading files and output the file content as string
    // fileLoader impl must define an 'load' method which returns a then-able
    var _fileLoaders = {};
    _fileLoaders[LOCATION_FILESYS] = {
      load: function(uri) {
        return bkUtils.loadFile(uri);
      }
    };
    _fileLoaders[LOCATION_HTTP] = {
      load: function(uri) {
        return bkUtils.loadHttp(uri);
      }
    };
    _fileLoaders[LOCATION_AJAX] = {
      load: function(uri) {
        return bkUtils.loadAjax(uri);
      }
    };

    // fileSavers are responsible for saving various formats into bkr
    // fileLoader impl must define an 'load' method which returns a then-able
    var _fileSavers = {};

    _fileSavers[LOCATION_FILESYS] = {
      save: function(uri, contentAsString, overwrite) {
        return bkUtils.saveFile(uri, contentAsString, overwrite);
      },
      rename: function(oldUri, newUri, overwrite) {
        return bkUtils.renameFile(oldUri, newUri, overwrite);
      },
      showFileChooser: function (initUri) {
        return bkCoreManager.showFileSaveDialog({
          initUri: initUri,
          extension: 'bkr'
        });
      }
    };

    _fileSavers[LOCATION_AJAX] = {
      save: function(uri, contentAsString) {
        return bkUtils.saveAjax(uri, contentAsString);
      }
    };

    var importInput = function() {
      var $input,
          endpoint = '../beaker/fileupload';

      if (($input = $('input#import-notebook')).length) return $input;

      $rootScope.getImportNotebookPattern = function () {
        return getImportNotebookFileTypePattern();
      };
      $rootScope.fileDropped = function(file, event) {
        if (file) {
          if (bkDragAndDropHelper.isFileForImport(file)) {
            file.upload = Upload.upload({
              url: endpoint,
              file: file,
              method: 'POST'
            });

            file.upload.then(function (response) {
              bkCoreManager.importNotebook(response.data);
            }, function (response) {
              if (response.status > 0)
                console.log(response.status + ': ' + response.data);
            });
          } else {
            $rootScope.$emit(GLOBALS.EVENTS.FILE_DROPPED, {file: file, event: event});
          }
        }
      };

      $input = $('<input type="file" name="file" id="import-notebook" ' +
          'ngf-select="fileDropped($file)" accept="application/json,application/text"' +
      'ngf-pattern="\'application/json,application/text\'" style="display: none"/>')
                .prependTo('body');

      return $input;
    };

    var bkCoreManager = {

      _prefs: {
        setTheme: function (theme) {
          bkCoreManager.colorize(theme);
          bkHelper.setInputCellTheme(theme);
          this.theme = theme;
          bkHelper.setThemeToBeakerObject();
        },
        getTheme: function () {
          if (this.theme === undefined) {
            return "default";
          }
          return this.theme;
        },
        setFSOrderBy: function (fs_order_by) {
          this.fs_order_by = fs_order_by;
        },
        getFSOrderBy: function () {
          return this.fs_order_by;
        },
        setFSReverse: function (fs_reverse) {
          this.fs_reverse = fs_reverse;
        },
        getFSReverse: function () {
          return this.fs_reverse;
        }
      },

      setTheme: function (theme) {
        this._prefs.setTheme(theme);

        bkUtils.httpPost('../beaker/rest/util/setPreference', {
          preferencename: 'theme',
          preferencevalue: theme
        });
        $rootScope.$broadcast('beaker.theme.set', theme);
      },
      getTheme: function () {
        return this._prefs.getTheme();
      },

      setFSOrderBy: function (fs_order_by) {
        this._prefs.setFSOrderBy(fs_order_by);
        bkUtils.httpPost('../beaker/rest/util/setPreference', {
          preferencename: 'fs-order-by',
          preferencevalue: fs_order_by
        });
      },
      getFSOrderBy: function () {
        return this._prefs.getFSOrderBy();
      },
      setFSReverse: function (fs_reverse) {
        this._prefs.setFSReverse(fs_reverse);
        bkUtils.httpPost('../beaker/rest/util/setPreference', {
          preferencename: 'fs-reverse',
          preferencevalue: fs_reverse
        });
      },
      getFSReverse: function () {
        return this._prefs.getFSReverse();
      },

      setNotebookImporter: function(format, importer) {
        _importers[format] = importer;
      },
      getNotebookImporter: function(format) {
        return _importers[format];
      },
      getNotebookImporterNames: function() {
        return Object.keys(_importers);
      },
      setFileLoader: function(uriType, fileLoader) {
        _fileLoaders[uriType] = fileLoader;
      },
      getFileLoader: function(uriType) {
        return _fileLoaders[uriType];
      },
      setFileSaver: function(uriType, fileSaver) {
        _fileSavers[uriType] = fileSaver;
      },
      getFileSaver: function(uriType) {
        return _fileSavers[uriType];
      },
      guessUriType: function(notebookUri) {
        // TODO, make smarter guess
        if (/^https?:\/\//.exec(notebookUri)) {
          return LOCATION_HTTP;
        }
        else if (/^ajax:/.exec(notebookUri)) {
          return LOCATION_AJAX;
        }
        else {
          return LOCATION_FILESYS;
        }
      },
      guessFormat: function(notebookUri) {
        // TODO, make smarter guess
        return FORMAT_BKR;
      },

      _beakerRootOp: null,
      init: function(beakerRootOp) {
        this._beakerRootOp = beakerRootOp;
        bkRecentMenu.init({
          open: beakerRootOp.openNotebook
        });
      },
      gotoControlPanel: function() {
        return this._beakerRootOp.gotoControlPanel();
      },
      newSession: function(empty) {
        return this._beakerRootOp.newSession(empty);
      },
      openSession: function(sessionId) {
        return this._beakerRootOp.openSession(sessionId);
      },
      openNotebook: function(notebookUri, uriType, readOnly, format) {
        this._beakerRootOp.openNotebook(notebookUri, uriType, readOnly, format);
      },
      addImportInput: function() {
        importInput();
      },
      importNotebookDialog: function() {
        importInput().click();
      },
      importNotebook: function(notebook) {
        $sessionStorage.importedNotebook = notebook;
        $location.path("/session/import").search({});
      },

      codeMirrorOptions: function(scope, notebookCellOp) {

        var showAutocomplete = function(cm) {
          autocompleteService.showAutocomplete(cm, scope);
        };

        var maybeShowAutocomplete = function(cm) {
          autocompleteService.maybeShowAutocomplete(cm, scope);
        }

        var goCharRightOrMoveFocusDown = function(cm) {
          if ($('.CodeMirror-hint').length > 0) {
            //codecomplete is up, skip
            return;
          }
          if (cm.getCursor().line === scope.cm.doc.lastLine()
            && cm.getCursor().ch === scope.cm.doc.getLine(scope.cm.doc.lastLine()).length
            && !cm.somethingSelected()) {
            var nextCell = moveFocusDown();
            if (nextCell){
              var nextCm = scope.bkNotebook.getCM(nextCell.id);
              if (nextCm){
                nextCm.execCommand("goDocStart");
              }
            }
          } else {
            cm.execCommand("goCharRight");
          }
        };

        var goCharLeftOrMoveFocusDown = function(cm) {
          if ($('.CodeMirror-hint').length > 0) {
            //codecomplete is up, skip
            return;
          }
          if (cm.getCursor().line === 0
            && cm.getCursor().ch === 0) {
            var prevCell = moveFocusUp();
            if (prevCell){
              var prevCm = scope.bkNotebook.getCM(prevCell.id);
              if (prevCm){
                prevCm.execCommand("goDocEnd");
              }
            }
          } else {
            cm.execCommand("goCharLeft");
          }
        };

        var goUpOrMoveFocusUp = function(cm) {
          if ($('.CodeMirror-hint').length > 0) {
            //codecomplete is up, skip
            return;
          }
          if (cm.getCursor().line === 0) {
            var prevCell = moveFocusUp();
            if (prevCell) {
              var prevCm = scope.bkNotebook.getCM(prevCell.id);
              if (prevCm) {
                prevCm.setCursor({
                  line: prevCm.doc.size - 1,
                  ch: cm.getCursor().ch
                })
              }
            }
          } else {
            cm.execCommand("goLineUp");
            var top = cm.cursorCoords(true,'window').top;
            if ( top < 150)
              window.scrollBy(0, top-150);
          }
        };

        var goDownOrMoveFocusDown = function(cm) {
          if ($('.CodeMirror-hint').length > 0) {
            //codecomplete is up, skip
            return;
          }
          if (cm.getCursor().line === cm.doc.size - 1 && !cm.somethingSelected()) {
            var nextCell = moveFocusDown();
            if (nextCell) {
              var nextCm = scope.bkNotebook.getCM(nextCell.id);
              if (nextCm) {
                nextCm.setCursor({
                  line: 0,
                  ch: cm.getCursor().ch
                });
              }
            }
          } else {
            cm.execCommand("goLineDown");
          }
        };

        var goToNextCodeCell = function(){
          var nextCell = notebookCellOp.findNextCodeCell(scope.cellmodel.id);
          while (nextCell) {
            var focusable = scope.bkNotebook.getFocusable(nextCell.id);
            if (focusable && focusable.isShowInput()) {
              focusable.focus();
              break;
            } else {
              nextCell = notebookCellOp.findNextCodeCell(nextCell.id);
            }
          }
          return nextCell;
        };

        var appendCodeCell = function() {
          var thisCellId = scope.cellmodel.id;
          var evaluatorName = scope.cellmodel.evaluator;
          var newCell = scope.bkNotebook.getNotebookNewCellFactory().newCodeCell(evaluatorName);
          notebookCellOp.appendAfter(thisCellId, newCell);
          bkUtils.refreshRootScope();
        };

        var moveFocusDown = function() {
          // move focus to next code cell
          var thisCellId = scope.cellmodel.id;
          var nextCell = notebookCellOp.getNext(thisCellId);
          while (nextCell) {
            var focusable = scope.bkNotebook.getFocusable(nextCell.id);
            if (focusable && focusable.isShowInput()) {
              focusable.focus();
              break;
            } else {
              nextCell = notebookCellOp.getNext(nextCell.id);
            }
          }
          return nextCell;
        };

        var moveFocusUp = function() {
          // move focus to prev code cell
          var thisCellID = scope.cellmodel.id;
          var prevCell = notebookCellOp.getPrev(thisCellID);
          while (prevCell) {
            var focusable = scope.bkNotebook.getFocusable(prevCell.id);
            if (focusable && focusable.isShowInput()) {
              focusable.focus();
              var top = focusable.cm.cursorCoords(true, 'window').top;
              if (top < 150)
                window.scrollBy(0, top - 150);
              break;
            } else {
              prevCell = notebookCellOp.getPrev(prevCell.id);
            }
          }
          return prevCell;
        };

        var evaluate = function() {
          scope.evaluate();
          scope.$apply();
        };

        var evaluateAndGoDown = function () {
          bkUtils.newPromise(scope.evaluate()).then(function () {
            var nextCell = notebookCellOp.findNextCodeCell(scope.cellmodel.id);
            if (!nextCell) {
              appendCodeCell();
            }
            goToNextCodeCell();
          });
        };

        var reformat = function (cm) {
          var start = cm.getCursor(true).line;
          var end = cm.getCursor(false).line;
          do {
            cm.indentLine(start);
            start += 1;
          } while (start <= end)
        };

        var shiftTab = function(cm) {
          if (autocompleteParametersService.isActive()) {
            return autocompleteParametersService.previousParameter();
          }
          var cursor = cm.getCursor();
          var leftLine = cm.getRange({line: cursor.line, ch: 0}, cursor);
          if (leftLine.match(/^\s*$/)) {
            cm.execCommand("indentAuto");
          } else {
            showDocs(cm);
          }
        };

        var showDocs = function(cm) {
          var cur = cm.getCursor();
          var cursorPos = cm.indexFromPos(cur);
          scope.showDocs(cursorPos);
        };

        var moveCellUp = function(cm) {
          notebookCellOp.moveUp(scope.cellmodel.id);
          bkUtils.refreshRootScope();
          cm.focus();
        };

        var moveCellDown = function(cm) {
          notebookCellOp.moveDown(scope.cellmodel.id);
          bkUtils.refreshRootScope();
          cm.focus();
        };

        var deleteCell = function(cm) {
          notebookCellOp.delete(scope.cellmodel.id, true);
          bkUtils.refreshRootScope();
        };

        var tab = function(cm) {
          if (autocompleteParametersService.isActive()) {
            return autocompleteParametersService.nextParameter();
          }
          var cursor = cm.getCursor();
          var leftLine = cm.getRange({line: cursor.line, ch: 0}, cursor);
          if (leftLine.match(/^\s*$/)) {
            cm.execCommand("indentMore");
          } else {
            showAutocomplete(cm);
          }
        };

        var enter = function(cm) {
          if (autocompleteParametersService.isActive()) {
            return autocompleteParametersService.endCompletionAndMoveCursor();
          }
          cm.execCommand("newlineAndIndent");
        };

        var backspace = function(cm) {
          var cursor, anchor,
              toKill = [],
              selections = cm.listSelections();

          _.each(selections, function(range) {
            cursor = range['head'];
            anchor = range['anchor'];

            if (cursor.line !== anchor.line || cursor.ch !== anchor.ch) {
              cm.replaceRange("", cursor, anchor);
            } else {
              var from = cm.findPosH(cursor, -1, "char", false);
              toKill.push({from: from, to: cursor});
            }
          });

          _.each(toKill, function(i) {
            cm.replaceRange("", i.from, i.to);
          });
          autocompleteService.backspace(cursor, cm);
        };

        var cancel = function() {
          scope.cancel();
          scope.$apply();
        };

        var isFullScreen = function (cm) {
          return bkHelper.isFullScreen(cm);
        };

        var setFullScreen = function (cm) {
          bkHelper.setFullScreen(cm, !bkHelper.isFullScreen(cm));
        };

        CodeMirror.commands.save = bkHelper.saveNotebook;
        CodeMirror.Vim.defineEx('wquit', 'wq', bkCoreManager.getBkApp().saveNotebookAndClose);
        CodeMirror.Vim.defineEx('quit', 'q', bkHelper.closeNotebook);
        
        var keys = {
            "Up" : goUpOrMoveFocusUp,
            "Down" : goDownOrMoveFocusDown,
            "Ctrl-S": false, // no need to handle this shortcut on CM level
            "Cmd-S": false,
            "Alt-Down": moveFocusDown,
            "Alt-J": moveFocusDown,
            "Alt-Up": moveFocusUp,
            "Alt-K": moveFocusUp,
            "Enter": enter,
            "Ctrl-Enter": evaluate,
            "Cmd-Enter": evaluate,
            "Shift-Enter": evaluateAndGoDown,
            "Ctrl-Space": maybeShowAutocomplete,
            "Cmd-Space": showAutocomplete,
            "Shift-Tab": shiftTab,
            "Shift-Ctrl-Space": showDocs,
            "Shift-Cmd-Space": showDocs,
            "Ctrl-Alt-Up": moveCellUp,
            "Cmd-Alt-Up": moveCellUp,
            "Ctrl-Alt-Down": moveCellDown,
            "Cmd-Alt-Down": moveCellDown,
            "Ctrl-Alt-D": deleteCell,
            "Cmd-Alt-Backspace": deleteCell,
            "Tab": tab,
            "Backspace": backspace,
            "Ctrl-/": "toggleComment",
            "Cmd-/": "toggleComment",
            'Right': goCharRightOrMoveFocusDown,
            'Left': goCharLeftOrMoveFocusDown,
            "Shift-Ctrl-F": reformat,
            "Shift-Cmd-F": reformat,
            "Alt-F11": setFullScreen
        };

        if(bkHelper.isMacOS){
          keys["Ctrl-C"] = cancel;
        }else{
          keys["Alt-C"] = cancel;
        }

        if (codeMirrorExtension.extraKeys !== undefined) {
          _.extend(keys, codeMirrorExtension.extraKeys);
        }

        return {
          lineNumbers: true,
          matchBrackets: true,
          lineWrapping: true,
          extraKeys: keys,
          goToNextCodeCell: goToNextCodeCell,
          scrollbarStyle: "simple",
          theme: bkCoreManager.getTheme()
        };
      },

      _bkAppImpl: null,
      setBkAppImpl: function(bkAppOp) {
        this._bkAppImpl = bkAppOp;
      },
      getBkApp: function() {
        return this._bkAppImpl;
      },

      getRecentMenuItems: function() {
        return bkRecentMenu.getMenuItems();
      },

      getNotebookElement: function(currentScope) {
        // Walk up the scope tree and find the one that has access to the
        // notebook element (notebook directive scope, specifically)
        if (_.isUndefined(currentScope.getNotebookElement)) {
          return bkCoreManager.getNotebookElement(currentScope.$parent);
        } else {
          return currentScope.getNotebookElement();
        }
      },
      getNotebookCellManager: function() {
        return bkNotebookCellModelManager;
      },

      showFilePermissionsDialog: function(path, permissionsSettings) {
        var deferred = bkUtils.newDeferred();

        var data = {
          permissions: permissionsSettings.permissions,
          owner: permissionsSettings.owner,
          group: permissionsSettings.group,
          title:'Permissions',
          path: path
        };

        var dd = $uibModal.open({
          templateUrl: "app/template/filepermissionsdialog.jst.html",
          controller: 'filePermissionsDialogCtrl',
          windowClass: 'beaker-sandbox',
          backdropClass: 'beaker-sandbox',
          backdrop: true,
          keyboard: true,
          backdropClick: true,
          size: 'sm',
          resolve: {
            strategy: function () {
              return new FilePermissionsStrategy(data);
            }
          }
        });
        dd.result.then(
          function (result) {
            deferred.resolve(result);
          }, function () {
            deferred.reject();
          }).catch(function () {
          deferred.reject();
        });
        return deferred.promise;
      },

      showFileOpenDialog: function(extension) {
        var deferred = bkUtils.newDeferred();

        var data = {
          type: 'OPEN',
          title:'Select',
          okButtonTitle : 'Open',
          extension: extension
        };

        var dd = $uibModal.open({
          templateUrl: "app/template/filedialog.jst.html",
          controller: 'fileDialogCtrl',
          windowClass: 'beaker-sandbox',
          backdropClass: 'beaker-sandbox',
          backdrop: true,
          keyboard: true,
          backdropClick: true,
          size: 'lg',
          resolve: {
            strategy: function () {
              return new FileChooserStrategy(data);
            }
          }
        });
        dd.result.then(
          function (result) {
            deferred.resolve({
              uri: result,
              uriType: GLOBALS.FILE_LOCATION.FILESYS
            });
          }, function () {
            deferred.reject();
          }).catch(function () {
          deferred.reject();
        });
        return deferred.promise;
      },

      showFileSaveDialog: function(data) {
        var deferred = bkUtils.newDeferred();

        if ((!data.extension || data.extension.trim().length === 0) && data.initUri) {
          var filename = data.initUri.substring(data.initUri.lastIndexOf(bkUtils.serverOS.isWindows() ? '\\' : '/') + 1);
          data.extension = filename.substring(filename.lastIndexOf('.') + 1);
        }
        data.type="SAVE";
        data.title = "Save As";
        data.okButtonTitle = "Save";

        var dd = $uibModal.open({
          templateUrl: "app/template/filedialog.jst.html",
          controller: 'fileDialogCtrl',
          windowClass: 'beaker-sandbox',
          backdropClass: 'beaker-sandbox',
          backdrop: true,
          keyboard: true,
          backdropClick: true,
          size: 'lg',
          resolve: {
            strategy: function () {
              return new FileChooserStrategy(data);
            }
          }
        });
        dd.result.then(
          function (result) {
            deferred.resolve({
              uri: result,
              uriType: GLOBALS.FILE_LOCATION.FILESYS
            });
          }, function () {
            deferred.reject();
          }).catch(function () {
          deferred.reject();
        });
        return deferred.promise;
      },

      showSparkConfiguration: (function() {
        var sparkConfigurationInstance;

        return function() {
          var options = {
            windowClass: 'beaker-sandbox',
            backdropClass: 'beaker-sandbox',
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            controller: 'sparkConfigurationCtrl',
            template: JST['mainapp/components/spark/sparkconfiguration']()
          };

          sparkConfigurationInstance = $uibModal.open(options);
          return sparkConfigurationInstance.result;
        };
      })(),

      showModalDialog: function(callback, template, strategy, uriType, readOnly, format) {
        var options = {
          windowClass: 'beaker-sandbox',
          backdropClass: 'beaker-sandbox',
          backdrop: true,
          keyboard: true,
          backdropClick: true,
          controller: 'modalDialogCtrl'
        };

        var attachSubmitListener = function() {
          $document.on('keydown.modal', function (e) {
            if (e.which === 13) {
              var modal_submit = $('.modal .modal-submit');
              if (modal_submit.length > 0)
                modal_submit[0].click();
            }
          });
        };

        var removeSubmitListener = function() {
          $document.off('keydown.modal');
        };

        // XXX - template is sometimes a url now.
        if (template.indexOf('app/template/') === 0) {
          options.templateUrl = template;
        } else {
          options.template = template;
        }

        modalDialogOp.setStrategy(strategy);
        var dd = $uibModal.open(options);

        attachSubmitListener();

        var callbackAction = function(result) {
          removeSubmitListener();

          if (callback) {
            callback(result, uriType, readOnly, format);
          }
        };

        dd.result.then(function(result) {
          //Trigger when modal is closed
          callbackAction(result);
        }, function(result) {
          //Trigger when modal is dismissed
          callbackAction();
        }).catch(function() {
          removeSubmitListener();
        });

        return dd;
      },
      showSQLLoginModalDialog: function(
          connectionName,
          connectionString,
          user,
          okCB,
          cancelCB) {

        var options = {
            windowClass: 'beaker-sandbox',
            backdropClass: 'beaker-sandbox',
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            controller: 'SQLLoginController',
            templateUrl: 'app/helpers/sql-login-template.jst.html',
            resolve: {
              connectionName: function () {
                return connectionName;
              },
              connectionString : function () {
                return connectionString;
              },
              user : function () {
                return user;
              }
            }
        };

        var attachSubmitListener = function() {
          $document.on('keydown.modal', function (e) {
            if (e.which === 13) {
              var modal_submit = $('.modal .modal-submit');
              if (modal_submit.length > 0)
                modal_submit[0].click();
            }
          });
        };

        var removeSubmitListener = function() {
          $document.off('keydown.modal');
        };
        attachSubmitListener();

        var dd = $uibModal.open(options);
        dd.result.then(function(result) {
          if (okCB && (result != -1)) {
            okCB(result);
          }else{
            cancelCB();
          }
          //Trigger when modal is closed
          removeSubmitListener();
        }, function(result) {
          //Trigger when modal is dismissed
          removeSubmitListener();
          cancelCB();
        }).catch(function() {
          removeSubmitListener();
        });
        return dd;
      },
      show0ButtonModal: function(msgBody, msgHeader) {
        if (!msgHeader) {
          msgHeader = "Oops...";
        }
        var template = "<div class='modal-header'>" +
            "<h1>" + msgHeader + "</h1>" +
            "</div>" +
            "<div class='modal-body'><p>" + msgBody + "</p></div>" ;
        return this.showModalDialog(null, template);
      },
      showErrorModal: function (msgBody, msgHeader, errorDetails, callback) {
        if(!errorDetails) {
          return this.show1ButtonModal(msgBody, msgHeader, callback);
        }
        if(bkUtils.isElectron) {
          return bkElectron.Dialog.showMessageBox({
            type: 'error',
            buttons: ['OK'],
            title: msgHeader,
            message: msgBody,
            detail: errorDetails
          }, callback);
        } else {
          return this.showModalDialog(callback,
            "<div class='modal-header'>" +
            "<h1>" + msgHeader + "</h1>" +
            "</div>" +
            "<div class='modal-body'><p>" + msgBody + "</p><div class='modal-error-details'>" + errorDetails + "</div></div>" +
            '<div class="modal-footer">' +
            "   <button class='btn btn-primary' ng-click='close(\"OK\")'>Close</button>" +
            "</div>");
        }
      },
      show1ButtonModal: function(msgBody, msgHeader, callback, btnText, btnClass) {
        if (!msgHeader || msgBody.toLowerCase().indexOf(msgHeader.toLowerCase()) !== -1) {
          msgHeader = "Oops...";
        }
        if (bkUtils.isElectron) {
          var options = {
            type: 'none',
            buttons: ['OK'],
            title: msgHeader,
            message: msgBody
          };
          return bkElectron.Dialog.showMessageBox(options, callback);
        } else {
          btnText = btnText ? btnText : "Close";
          btnClass = btnClass ? _.isArray(btnClass) ? btnClass.join(' ') : btnClass : 'btn-primary';
          if (btnClass.indexOf("modal-submit") === -1) btnClass+=" modal-submit";
          var template = "<div class='modal-header'>" +
              "<h1>" + msgHeader + "</h1>" +
              "</div>" +
              "<div class='modal-body'><p>" + msgBody + "</p></div>" +
              '<div class="modal-footer">' +
              "   <button class='btn " + btnClass +"' ng-click='close(\"OK\")'>" + btnText + "</button>" +
              "</div>";
          return this.showModalDialog(callback, template);
        }
      },
      show2ButtonModal: function(
          msgBody,
          msgHeader,
          okCB, cancelCB,
          okBtnTxt, cancelBtnTxt,
          okBtnClass, cancelBtnClass) {
        if (!msgHeader) {
          msgHeader = "Question...";
        }
        var callback = function(result) {
          if (okCB && (result == 0)) {
            okCB();
          } else if (cancelCB){
            cancelCB();
          }
        };
        if (bkUtils.isElectron) {
          var options = {
            type: 'none',
            buttons: ['OK', 'Cancel'],
            title: msgHeader,
            message: msgBody
          };
          return bkElectron.Dialog.showMessageBox(options, callback);
        } else {
          okBtnTxt = okBtnTxt ? okBtnTxt : "OK";
          cancelBtnTxt = cancelBtnTxt ? cancelBtnTxt : "Cancel";
          okBtnClass = okBtnClass ? _.isArray(okBtnClass) ? okBtnClass.join(' ') : okBtnClass : 'btn-default';
          cancelBtnClass = cancelBtnClass ? _.isArray(cancelBtnClass) ? cancelBtnClass.join(' ') : cancelBtnClass : 'btn-default';
          var template = "<div class='modal-header'>" +
              "<h1>" + msgHeader + "</h1>" +
              "</div>" +
              "<div class='modal-body'><p>" + msgBody + "</p></div>" +
              '<div class="modal-footer">' +
              "   <button class='Yes btn " + okBtnClass +"' ng-click='close(0)'>" + okBtnTxt + "</button>" +
              "   <button class='Cancel btn " + cancelBtnClass +"' ng-click='close()'>" + cancelBtnTxt + "</button>" +
              "</div>";
          return this.showModalDialog(callback, template);
        }
      },
      show3ButtonModal: function(
          msgBody, msgHeader,
          yesCB, noCB, cancelCB,
          yesBtnTxt, noBtnTxt, cancelBtnTxt,
          yesBtnClass, noBtnClass, cancelBtnClass) {
        if (!msgHeader) {
          msgHeader = "Question...";
        }
        var callback = function(result) {
          if (yesCB && (result == 0)) {
            yesCB();
          } else if (noCB && (result == 1)) {
            noCB();
          } else if (cancelCB) {
            cancelCB();
          }
        };
        if (bkUtils.isElectron) {
          var options = {
            type: 'none',
            buttons: ['Yes', 'No', 'Cancel'],
            title: msgHeader,
            message: msgBody
          };
          return bkElectron.Dialog.showMessageBox(options, callback);
        } else {
          yesBtnTxt = yesBtnTxt ? yesBtnTxt : "Yes";
          noBtnTxt = noBtnTxt ? noBtnTxt : "No";
          cancelBtnTxt = cancelBtnTxt ? cancelBtnTxt : "Cancel";
          yesBtnClass = yesBtnClass ? _.isArray(yesBtnClass) ? okBtnClass.join(' ') : yesBtnClass : 'btn-default';
          noBtnClass = noBtnClass ? _.isArray(noBtnClass) ? noBtnClass.join(' ') : noBtnClass : 'btn-default';
          cancelBtnClass = cancelBtnClass ? _.isArray(cancelBtnClass) ? cancelBtnClass.join(' ') : cancelBtnClass : 'btn-default';
          var template = this.getDialogTemplateOpening(msgHeader, msgBody) +
              "   <button class='yes btn " + yesBtnClass +"' ng-click='close(0)'>" + yesBtnTxt + "</button>" +
              "   <button class='no btn " + noBtnClass +"' ng-click='close(1)'>" + noBtnTxt + "</button>" +
              "   <button class='cancel btn " + cancelBtnClass +"' ng-click='close()'>" + cancelBtnTxt + "</button>" +
              this.getDialogTemplateClosing();
          return this.showModalDialog(callback, template);
        }
      },
      showMultipleButtonsModal: function(params) {
        var buttons = params.buttons;

        var callback = function(result) {
          if (result != undefined) {
            buttons[result].action();
          } else if (params.dismissAction) {
            params.dismissAction();
          }
        };

        if (bkUtils.isElectron) {
          var buttonTexts = [];
          for (var i = 0; i < buttons.length; i++) {
            buttonTexts.push(buttons[i].text);
          }
          var options = {
            type: 'none',
            buttons: buttonTexts,
            title: params.msgHeader,
            message: params.msgBody
          };
          return bkElectron.Dialog.showMessageBox(options, callback);
        } else {
          var template = this.getDialogTemplateOpening(params.msgHeader, params.msgBody);
          for (var i = 0; i < buttons.length; i++) {
            var buttonSettings = buttons[i];
            var newTemplatePart = "   <button class='btn btn-default " + buttonSettings.cssClass + "' ng-click='close(" + i + ")'>" + buttonSettings.text + "</button>"
            template = template + newTemplatePart;
          }
          template = template + this.getDialogTemplateClosing();

          return this.showModalDialog(callback, template);
        }


      },
      getDialogTemplateOpening: function(msgHeader, msgBody) {
        return "<div class='modal-header'>" +
            "<h1>" + msgHeader + "</h1>" +
            "</div>" +
            "<div class='modal-body'><p>" + msgBody + "</p></div>" +
            '<div class="modal-footer">';
      },
      getDialogTemplateClosing: function() {
        return "</div>";
      },
      getFileSystemFileChooserStrategy: function() {
        return new FileSystemFileChooserStrategy();
      },

      showFullModalDialog: function(callback, template, controller, dscope) {
        var options = {
          windowClass: 'beaker-sandbox',
          backdropClass: 'beaker-sandbox',
          backdrop: true,
          keyboard: true,
          backdropClick: true,
          controller: controller,
          resolve: { dscope: function(){ return dscope; } }
        };

        if (template.indexOf('http:') !== 0) {
          options.templateUrl = template;
        } else {
          options.template = template;
        }
        var dd = $uibModal.open(options);
        return dd.result.then(function(result) {
          if (callback) {
            callback(result);
          }
        });
      },
      showLanguageManager: (function() {
        var languageManagerInstance;

        return function() {
          // result status is 1 if modal is closed, 2 if it is dismissed, and 0 if still open
          if (languageManagerInstance && languageManagerInstance.result.$$state.status === 0) {
            return languageManagerInstance.close()
          }
          var options = {
            windowClass: 'beaker-sandbox',
            backdropClass: 'beaker-sandbox',
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            controller: 'pluginManagerCtrl',
            template: JST['mainapp/components/pluginmanager/pluginmanager']()
          };

          languageManagerInstance = $uibModal.open(options);
          return languageManagerInstance.result;
        };
      })(),
      showPublishForm: function(nModel, callback) {
        var options = {
          windowClass: 'beaker-sandbox',
          backdropClass: 'beaker-sandbox',
          backdrop: true,
          keyboard: true,
          backdropClick: true,
          controller: 'publicationCtrl',
          template: JST['mainapp/components/publication/publish'](),
          resolve: {nModel: function() { return (nModel ? nModel : undefined); } }
        };

        var dd = $uibModal.open(options);
        return dd.result.then(function(result) {
          if (callback) {
            callback(result);
          }
        });
      },
      colorize: function (theme) {
        var colorizedElements = $("html");
        var ca = colorizedElements.attr('class');
        var classes = [];
        if (ca && ca.length && ca.split) {
          ca = jQuery.trim(ca);
          /* strip leading and trailing spaces */
          classes = ca.split(' ');
        }
        var themeStylePrefix = "beaker-theme-";
        var clazz = _.find(classes, function (e) {
          return e.indexOf(themeStylePrefix) !== -1
        });
        if (clazz) colorizedElements.removeClass(clazz);
        if ("default" !== theme) {
          colorizedElements.addClass(themeStylePrefix + theme);
        }
      }
    };

    if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
      bkUtils.getBeakerPreference('fs-order-by').then(function (fs_order_by) {
        bkCoreManager._prefs.fs_order_by = !fs_order_by || fs_order_by.length === 0 ? 'uri' : fs_order_by;
      }).catch(function (response) {
        console.log(response);
        bkCoreManager._prefs.fs_order_by = 'uri';
      });

      bkUtils.getBeakerPreference('fs-reverse').then(function (fs_reverse) {
        bkCoreManager._prefs.fs_reverse = !fs_reverse || fs_reverse.length === 0 ? false : fs_reverse;
      }).catch(function (response) {
        console.log(response);
        bkCoreManager._prefs.fs_reverse = false;
      });
      bkUtils.getBeakerPreference('theme').then(function (theme) {
        bkCoreManager._prefs.setTheme(_.includes(_.values(GLOBALS.THEMES), theme) ? theme : GLOBALS.THEMES.DEFAULT);
        $rootScope.$broadcast('beaker.theme.set', theme);
      }).catch(function (response) {
        console.log(response);
        bkCoreManager._prefs.setTheme(GLOBALS.THEMES.DEFAULT);
      });
    } else if (window.beakerRegister === undefined || window.beakerRegister.prefsPreset === undefined) {
      bkCoreManager._prefs.fs_order_by = 'uri';
      bkCoreManager._prefs.fs_reverse = false;
      $timeout(function() {
        // there's a race condition in calling setTheme during bootstrap
        bkCoreManager._prefs.setTheme(GLOBALS.THEMES.DEFAULT);
      }, 0);
    } else {
      bkCoreManager._prefs.fs_order_by = window.beakerRegister.prefsPreset.fs_order_by;
      bkCoreManager._prefs.fs_reverse = window.beakerRegister.prefsPreset.fs_reverse;
      $timeout(function() {
        // there's a race condition in calling setTheme during bootstrap
        bkCoreManager._prefs.setTheme(window.beakerRegister.prefsPreset.theme);
      }, 0);
    }

    return bkCoreManager;
  });

  module.factory('modalDialogOp', function() {
    var _strategy = {};
    return {
      setStrategy: function(strategy) {
        _strategy = strategy;
      },
      getStrategy: function() {
        return _strategy;
      }
    };
  });

  module.controller('filePermissionsDialogCtrl', function ($scope, $rootScope, $uibModalInstance,
                                                           bkUtils, strategy) {

    $scope.getStrategy = function () {
      return strategy;
    };

    $scope.ownerEdit = false;
    $scope.groupEdit = false;

    $scope.editOwner = function () {
      $scope.ownerEdit = true;
    };

    $scope.editGroup = function () {
      $scope.groupEdit = true;
    };

    $scope.model = {
      OWNER_READ: strategy.permissions.indexOf('OWNER_READ') !== -1,
      OWNER_WRITE: strategy.permissions.indexOf('OWNER_WRITE') !== -1,
      OWNER_EXECUTE: strategy.permissions.indexOf('OWNER_EXECUTE') !== -1,
      GROUP_READ: strategy.permissions.indexOf('GROUP_READ') !== -1,
      GROUP_WRITE: strategy.permissions.indexOf('GROUP_WRITE') !== -1,
      GROUP_EXECUTE: strategy.permissions.indexOf('GROUP_EXECUTE') !== -1,
      OTHERS_READ: strategy.permissions.indexOf('OTHERS_READ') !== -1,
      OTHERS_WRITE: strategy.permissions.indexOf('OTHERS_WRITE') !== -1,
      OTHERS_EXECUTE: strategy.permissions.indexOf('OTHERS_EXECUTE') !== -1,

      owner: strategy.owner,
      group: strategy.group,

      collectResult: function () {
        var permissions = [];
        if (this.OWNER_READ === true) permissions.push('OWNER_READ');
        if (this.OWNER_WRITE === true) permissions.push('OWNER_WRITE');
        if (this.OWNER_EXECUTE === true) permissions.push('OWNER_EXECUTE');
        if (this.GROUP_READ === true) permissions.push('GROUP_READ');
        if (this.GROUP_WRITE === true) permissions.push('GROUP_WRITE');
        if (this.GROUP_EXECUTE === true)  permissions.push('GROUP_EXECUTE');
        if (this.OTHERS_READ === true) permissions.push('OTHERS_READ');
        if (this.OTHERS_WRITE === true) permissions.push('OTHERS_WRITE');
        if (this.OTHERS_EXECUTE === true) permissions.push('OTHERS_EXECUTE');
        return {
          permissions: permissions,
          owner: this.owner,
          group: this.group
        };
      }
    };


    $scope.ok = function () {
      $uibModalInstance.close($scope.model.collectResult());
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

  });



  module.controller('fileDialogCtrl', function ($scope, $rootScope, $uibModalInstance, $timeout, bkCoreManager, bkUtils, strategy) {

    var elfinder;

    var state = {
      hashes2Open: [],
      tabClicked : false,
      go2Path: function (path) {
        state.hashes2Open = bkHelper.path2hash(elfinder, path);
        elfinder.exec('open', state.hashes2Open.pop());
      }
    };

    var addTrailingSlash = function (str, isWindows) {
      if (isWindows) {
        if (!_.endsWith(str, '\\')) {
          str = str + '\\';
        }
      } else {
        if (!_.endsWith(str, '/')) {
          str = str + '/';
        }
      }
      return str;
    };

    var getFilename = function (path) {
      var filename = path.substring(path.lastIndexOf(bkUtils.serverOS.isWindows() ? '\\' : '/') + 1);
      return filename.trim().length > 0 ? filename.trim() : null;
    };

    var getParent = function (path) {
      var parentEndIndex = path.lastIndexOf(bkUtils.serverOS.isWindows() ? '\\' : '/') + 1;
      if(parentEndIndex > 1) {
        parentEndIndex--; //trim trailing slash for non-root path
      }
      return path.substring(0, parentEndIndex);
    };

    var isRoot = function (path) {
      return path === getParent(path);
    };

    var setFromHash = function (hash, timeout) {
      var action = function () {
        $scope.selected.path = elfinder.file(hash).fullpath.replace('//', '/');
        if (elfinder.file(hash).mime === 'directory')
          $scope.selected.path = addTrailingSlash($scope.selected.path, bkUtils.serverOS.isWindows());
      };
      if (timeout !== undefined && timeout !== null) {
        $timeout(function () {
          action(hash);
        }, timeout);
      } else {
        action(hash);
      }
    };

    $scope.selected = {
      path: null
    };

    $scope.isReady = function () {
      var deferred = bkUtils.newDeferred();
      if ($scope.selected.path) {
        bkUtils.httpGet(bkUtils.serverUrl("beaker/rest/file-io/analysePath"), {path: $scope.selected.path})
          .success(function (result) {
            if (result.exist === true) {
              deferred.resolve(result.isDirectory !== true);
            } else {
              if ($scope.getStrategy().type === "SAVE") {
                deferred.resolve(result.parent ? true : false);
              } else {
                deferred.resolve(false);
              }
            }
          });
      } else {
        deferred.resolve(false);
      }
      return deferred.promise;
    };

    $scope.$watch('selected.path', function(newVal){
      $scope.selected.path = newVal;
      var disabled = false;
      if ($scope.selected.path){
        bkUtils.httpGet(bkUtils.serverUrl("beaker/rest/file-io/analysePath"), {path: $scope.selected.path})
        .success(function(result) {
          if (result.exist === true){
            disabled = (result.isDirectory === true);
          }else{
            disabled = ($scope.getStrategy().type !== "SAVE");
          }
          angular.element(document.getElementById('okButton'))[0].disabled = disabled;
        });
      }
    });

    $scope.getStrategy = function () {
      return strategy;
    };

    $scope.mime = function () {
      if ($scope.getStrategy().treeViewfs.applyExtFilter === true) {
        return bkUtils.mime($scope.getStrategy().treeViewfs.extension);
      }
      return [];
    };


    $scope.init = function () {

      elFinder.prototype.commands.editpermissions = function() {
        this.exec = function (hashes) {
          var path = $scope.selected.path;
          bkUtils.httpGet(bkUtils.serverUrl("beaker/rest/file-io/getPosixFileOwnerAndPermissions"), {path: path})
            .then(function (response) {
              bkCoreManager.showFilePermissionsDialog(path, response.data).then(function(result){
                var postData = {
                  path: $scope.selected.path,
                  permissions: result.permissions
                };
                if(result.owner !== response.data.owner) {
                  postData.owner = result.owner;
                }
                if(result.group !== response.data.group) {
                  postData.group = result.group;
                }
                bkUtils.httpPost('rest/file-io/setPosixFileOwnerAndPermissions', postData).catch(function (response) {
                  bkHelper.show1ButtonModal(response.data, 'Permissions change filed');
                })
              });
            })
        };
        this.getstate = function (hashes) {
          //return 0 to enable, -1 to disable icon access
          return $scope.selected.path && $scope.selected.path.length > 0 && !bkUtils.serverOS.isWindows() ? 0 : -1;
        }
      };

      var $elfinder = $('#elfinder');

      var selectCallback = function (event, elfinderInstance) {
        if (event.data.selected && event.data.selected.length > 0) {
          elfinder.trigger('enable');
          setFromHash(event.data.selected[0], 0);
        }
      };
      var openCallback = function (event, elfinderInstance) {
        if (state.hashes2Open.length > 0) {
          elfinder.exec('open', state.hashes2Open.pop());
        }
        setFromHash(elfinderInstance.cwd().hash, 0);
      };
      var getFileCallback = function (url) {
        $scope.ok();
      };

      var elfinderOptions = bkHelper.elfinderOptions(getFileCallback,
        selectCallback,
        openCallback,
        $scope.mime(),
        $scope.getStrategy().treeViewfs.showHiddenFiles);

      elfinder = bkHelper.elfinder($elfinder, elfinderOptions);

      var orig_mime2class = elfinder.mime2class;
      elfinder.mime2class = function (mime) {
        if (mime === 'Beaker-Notebook') {
          return 'elfinder-cwd-icon-beaker';
        }
        return orig_mime2class(mime);
      };

      $elfinder.css("width", '100%');
      $elfinder.css("height", '100%');

      $(".modal-content").resizable({
        resize: function (event, ui) {
          $elfinder.trigger('resize');
        }
      });

      if ($scope.getStrategy().initUri && $scope.getStrategy().initUri.length > 0) {
        $timeout(function () {
          $scope.selected.path = $scope.getStrategy().initUri;
        }, 1000);
      }
      elfinder.trigger('disable');
    };

    var onEnter = function (keyEvent) {
      state.tabClicked = false;
      if ($scope.selected.path) {
        bkUtils.httpGet(bkUtils.serverUrl("beaker/rest/file-io/analysePath"), {path: $scope.selected.path})
          .success(function (result) {
            if (result.exist === true) {
              if (result.isDirectory === true) {
                state.go2Path($scope.selected.path);
              } else {
                $scope.ok(true);
              }
            } else {
              if ($scope.getStrategy().type === "SAVE") {
                if (result.parent) {
                  $scope.ok(true);
                }
              }
            }
          });
      }
    };

    function sharedStart(array) {
      var A = array.concat().sort(),
        a1 = A[0], a2 = A[A.length - 1], L = a1.length, i = 0;
      while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
      return a1.substring(0, i);
    }

    function getCurrentFolder() {
      var path = elfinder.path(elfinder.cwd().hash);
      return path.startsWith('//') ? path.substring(1) : path;
    }

    var onTab = function (keyEvent) {
      var parentPath = getCurrentFolder();
      if (parentPath === getParent($scope.selected.path)) {
        var filename = getFilename($scope.selected.path);
        var volume = bkHelper.getVolume(elfinder);
        var possible_files = [];
        // Get the keys
        var keys = Object.keys(elfinder.files());
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (key.indexOf(volume.hash) === 0) {
            var file = elfinder.files()[key];
            if (parentPath === getParent(file.fullpath) && !isRoot(file.fullpath)) {
              if (getFilename(file.fullpath).indexOf(filename) === 0) {
                possible_files.push(file);
              }
            }
          }
        }
        if (possible_files.length === 1) {
          state.tabClicked = true;
          $timeout(function () {
            $scope.selected.path = possible_files[0].fullpath;
            if (possible_files[0].mime === 'directory') {
              state.go2Path($scope.selected.path);
            }
          }, 0);
        } else {
          $timeout(function () {
            $scope.selected.path = addTrailingSlash(getParent($scope.selected.path)) +
              sharedStart(_.map(possible_files, function (e) {
                return e.name;
              }));
          }, 0);
        }
      }
      keyEvent.preventDefault();
    };

    var onSlash = function (keyEvent) {
      state.tabClicked = false;
      state.go2Path($scope.selected.path);
    };

    var onBackspace= function (keyEvent) {
      if (state.tabClicked === true){
        $timeout(function () {
          $scope.selected.path = addTrailingSlash(getParent($scope.selected.path));
          elfinder.trigger("filter_cwd", {
            filter: getFilename($scope.selected.path)
          });
        }, 0);
      }else{
        onKey(keyEvent);
      }
      state.tabClicked = false;
    };

    var onKey = function (keyEvent) {
      state.tabClicked = false;
      $timeout(function () {
        var parent = getParent($scope.selected.path);
        if (getCurrentFolder() === parent) {
          $timeout(function () {
            elfinder.trigger("filter_cwd", {
              filter: getFilename($scope.selected.path)
            });
          }, 300);
        }
      }, 0);
    };

    $scope.onkey = function (keyEvent) {
      if (keyEvent.which === 13) {
        onEnter(keyEvent);
      } else if (keyEvent.which === 9) {
        onTab(keyEvent)
      } else if (keyEvent.which === 191) {
        if (!bkUtils.serverOS.isWindows())
          onSlash(keyEvent);
      } else if (keyEvent.which === 220) {
        if (bkUtils.serverOS.isWindows())
          onSlash(keyEvent);
      } else if (keyEvent.which === 8) {
        onBackspace(keyEvent);
      } else {
        onKey(keyEvent);
      }
    };
    
    var ok = function () {
      if ($scope.getStrategy().type === "SAVE") {
        var filename = getFilename($scope.selected.path);
        var extension = $scope.getStrategy().treeViewfs.extension;
        if (extension !== undefined && extension.length > 0) {
          if (filename.indexOf(extension) === -1 || filename.lastIndexOf(extension) != filename.length - extension.length) {
            $scope.selected.path += "." + extension;
          }
        }
      }
      $uibModalInstance.close($scope.selected.path);
    };

    $scope.ok = function (skipReady) {
      if (skipReady === true) {
        ok();
      }
      $scope.isReady().then(function (isReady) {
        if (isReady === true) {
          ok();
        }
      });
    };

    $scope.cancel = function () {
      $uibModalInstance.dismiss('cancel');
    };

    $scope.$watch(function (scope) {
      return scope.getStrategy().treeViewfs.applyExtFilter
    }, function () {
      if (elfinder) {
        elfinder.options.onlyMimes = $scope.mime();
        elfinder.exec('reload');
      }
    });

    $scope.$watch(function (scope) {
      return scope.getStrategy().treeViewfs.showHiddenFiles
    }, function () {
      if (elfinder) {
        elfinder.options.showHiddenFiles = $scope.getStrategy().treeViewfs.showHiddenFiles;
        elfinder.exec('reload');
      }
    });

    var unregister = $scope.$watch(function (scope) {
        return scope.selected.path
      },
      function (newValue, oldValue) {
        if ((!oldValue || oldValue.length === 0) && (newValue && newValue.length > 0)) {
          document.getElementById("file-dlg-selected-path").setSelectionRange(newValue.length - 1, newValue.length - 1);
          unregister();
        }
      }
    );

  });



  module.controller('modalDialogCtrl', function($scope, $rootScope, $uibModalInstance, modalDialogOp,
                                                bkUtils) {
    $scope.getStrategy = function() {
      return modalDialogOp.getStrategy();
    };
    $scope.isWindows = function() {
      return bkUtils.isWindows;
    };
    $rootScope.$on('modal.submit', function() {
      $scope.close($scope.getStrategy().getResult());
    });
    $scope.close = function (result) {
      if (!$scope.getStrategy || !$scope.getStrategy() || !$scope.getStrategy().checkCallback) {
        $uibModalInstance.close(result);
      }else {
        $scope.getStrategy().checkCallback(result).then(function(value) {
          if (value.result === true)
            $uibModalInstance.close(result);
        });
      }
    };
  });

  module.controller('SQLLoginController', function($scope, $rootScope, $uibModalInstance, modalDialogOp, bkUtils, connectionName, connectionString, user) {

    $scope.sqlConnectionData = {
      connectionName: connectionName,
      connectionString: connectionString,
      user: user,
      password: null
    }

    $scope.cancelFunction = function() {
      $uibModalInstance.close(-1);
    };

    $scope.okFunction = function() {
      $uibModalInstance.close($scope.sqlConnectionData);
    };

    $scope.getStrategy = function() {
      return modalDialogOp.getStrategy();
    };
    $scope.isWindows = function() {
      return bkUtils.isWindows;
    };
    $rootScope.$on('modal.submit', function() {
      $scope.close($scope.getStrategy().getResult());
    });

  });

  /**
   * Directive to show a modal dialog that does filename input.
   */
  module.directive('fileActionDialog', function() {
    return {
      scope: { actionName: '@', inputId: '@', close: '=' },
      template: JST['template/fileactiondialog'](),
      link: function(scope, element, attrs) {
        element.find('input').focus();
      }
    };
  });

  module.factory('bkAnsiColorHelper', function () {
    function getChunks(text) {
      return text.split(/\033\[/);
    }

    function chunkHasColorCodes(item) {
      return !!item.match(/^([!\x3c-\x3f]*)([\d;]*)([\x20-\x2c]*[\x40-\x7e])([\s\S]*)/m);
    }

    return {
      hasAnsiColors: function (text) {
        return getChunks(text).some(function (item) {
          return chunkHasColorCodes(item);
        });
      },
      convertToHtml: function (text) {
        return ansi_up.ansi_to_html(text);
      }
    };
  });

  module.factory('bkDragAndDropHelper', function (bkUtils) {
    function wrapImageDataUrl(dataUrl) {
      return '<img src="' + dataUrl + '" />';
    }

    var dragAndDropHelper = {
      getImportNotebookPattern: function () {
        return getImportNotebookFileTypePattern();
      },
      isFileForImportDragging: function (event) {
        if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.disableDragAndDropImport !== undefined) {
          if(window.beakerRegister.hooks.disableDragAndDropImport()) {
            return false;
          }
        }
        if(event.originalEvent) {
          event = event.originalEvent;
        }
        if(event && event.dataTransfer && event.dataTransfer.items) {
          var items = event.dataTransfer.items;
          for (var i = 0; i < items.length; i++) {
            if(this.isFileForImport(items[i])) {
              return true;
            }
          }
        }
        return false;
      },
      isFileForImport: function (item) {
        if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.disableDragAndDropImport !== undefined) {
          if(window.beakerRegister.hooks.disableDragAndDropImport()) {
            return false;
          }
        }
        return item.type !== undefined && new RegExp(getImportNotebookFileTypePattern(), 'i').test(item.type);
      },
      loadImageFileAsString: function (file) {
        if (file && window.FileReader && window.File) {
          var deferred = bkUtils.newDeferred();
          var reader = new FileReader;
          reader.onload = function (loadingEvent) {
            deferred.resolve(wrapImageDataUrl(loadingEvent.target.result));
          };
          reader.readAsDataURL(file);
          return deferred.promise;
        } else {
          return false;
        }
      },
      wrapImageDataUrl: wrapImageDataUrl,
      configureDropEventHandlingForCodeMirror: function (cm, allowImageDropping) {
        if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.codemirrorEventConfig !== undefined) {
          window.beakerRegister.hooks.codemirrorEventConfig(cm, allowImageDropping);
        }
        cm.on('drop', function (cm, e) {
          if(allowImageDropping && !allowImageDropping()) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();

          var pos = posFromMouse(cm, e);
          var files = e.dataTransfer.files;
          if (files && files.length && window.FileReader && window.File) {
            var n = files.length, text = Array(n), read = 0;
            var loadFile = function(file, i) {
              var reader = new FileReader;
              reader.onload = function(fileLoadingEvent) {
                text[i] = wrapImageDataUrl(fileLoadingEvent.target.result);
                if (++read == n) {
                  cm.setSelection(cm.clipPos(pos));
                  cm.replaceSelection(text.join("\n"));
                }
              };
              reader.readAsDataURL(file);
            };
            for (var i = 0; i < n; ++i) loadFile(files[i], i);
          }

          function posFromMouse(cm, e) {
            var display = cm.display;
            var x, y, space = display.lineSpace.getBoundingClientRect();
            try { x = e.clientX - space.left; y = e.clientY - space.top; }
            catch (e) { return null; }
            return cm.coordsChar({left: x, top: y}, "div");
          }
        });
      },
      isImageFile: isImageFile
    };
    return dragAndDropHelper;
  });

  module.factory('bkNotificationService', function (bkUtils) {
    var _notificationSound = null;

    function checkPermissionsForNotification() {
      var deferred = bkUtils.newDeferred();
      if (Notification.permission === "granted") {
        deferred.resolve(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission(function (permission) {
          deferred.resolve(permission === "granted");
        });
      }
      return deferred.promise;
    }

    function playNotificationSound() {
      if(!_notificationSound) {
        _notificationSound = new Audio('app/sound/notification.wav');
      }
      _notificationSound.play();
    }

    function sendEmailNotification(title, body) {
      var url = bkUtils.getEvaluationFinishedNotificationUrl();
      if (!!url) {
        bkUtils.httpGet(url, {
          title: title,
          body: body
        });
      }
    }

    function showNotification(title, body, tag) {
      checkPermissionsForNotification().then(function (granted) {
        if (granted) {
          var options = {
            body: body,
            icon: '/static/favicon.png'
          };
          if(tag) {
            options.tag = tag;
          }
          var notification = new Notification(title, options);
          notification.onclick = function () {
            notification.close();
            window.focus();
          };
          //we need to play sound this way because notification's 'options.sound' parameter is not supported yet
          playNotificationSound();
        }
      });
    }

    function initAvailableNotificationMethods() {

      var evaluationCompleteNotificationMethods = [];

      evaluationCompleteNotificationMethods = [{
        title: 'Notify when done',
        checkPermissions: function () {
          checkPermissionsForNotification();
        },
        action: showNotification
      }];
      if (bkUtils.getEvaluationFinishedNotificationUrl() != null) {
        evaluationCompleteNotificationMethods.push({
          title: 'Send email when done',
          action: sendEmailNotification
        });
      }

      return evaluationCompleteNotificationMethods;
    }

    function getAvailableNotificationMethods() {
      return evaluationCompleteNotificationMethods;
    }

    return {
      checkPermissions: checkPermissionsForNotification,
      initAvailableNotificationMethods: initAvailableNotificationMethods,
      sendEmailNotification: sendEmailNotification,
      showNotification: showNotification
    };
  });

  function getImportNotebookFileTypePattern() {
    return "^((?!image\/((png)|(jpg)|(jpeg))).)*?$";
  }

  function isImageFile(file) {
    return file && file.type && new RegExp(getImageFileTypePattern(), 'i').test(file.type);
  }

  function getImageFileTypePattern() {
    return "image/((png)|(jpg)|(jpeg))";
  }


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
 * Module bk.core
 * Holds the core of beaker utilities. It wraps of lower level utilities that come from other
 * modules.
 * The user facing directives also use the core as a communication/exchange layer.
 */
(function() {
  'use strict';
  angular.module('bk.core').factory('codeMirrorExtension', function() {
    var codeMirrorExtension = undefined;

    var codeMirrorFileName = {
        type : 'string',
        hint: function(token, cm) {
          var deferred = bkHelper.newDeferred();
          $.ajax({
            type: "GET",
            datatype: "json",
            url: "../beaker/rest/file-io/autocomplete",
            data: { path: token.string.substr(1)}
          }).done(function(x) {
            for (var i in x) {
              x[i] = token.string[0] + x[i];
            }
            deferred.resolve(x);
          }).error(function(x) {
            deferred.resolve([]);
          });
          return deferred.promise;
        }
    };

    if (typeof window.bkInit !== 'undefined') {
      codeMirrorExtension = window.bkInit.codeMirrorExtension;
    }

    if (typeof codeMirrorExtension === 'undefined') {
      codeMirrorExtension = { autocomplete : [ codeMirrorFileName ]};
    } else {
      codeMirrorExtension.autocomplete.push(codeMirrorFileName);
    }

    return codeMirrorExtension;
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
  angular.module('bk.core').factory('autocompleteService', function(codeMirrorExtension, autocompleteParametersService, bkEvaluatorManager, $q, bkUtils) {

  var completionActive = false;
  var currentDocumentation = {};
  var autocompleteParameters = true;
  if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
    bkUtils.getBeakerPreference('autocomplete-parameters').then(function(autocompleteParametersPref) {
      if (autocompleteParametersPref === "false") {
        autocompleteParameters = false;
      }
    });
  }
  var showAutocomplete = function(cm, scope) {
    if (autocompleteParametersService.isActive()) {
      autocompleteParametersService.nextParameter();
    }

    var getToken = function(editor, cur) {
      return editor.getTokenAt(cur);
    };
    var getHints = function(editor, showHintCB, options) {
      var cur = editor.getCursor();
      var token = getToken(editor, cur);
      var cursorPos = editor.indexFromPos(cur);

      var waitfor = _(codeMirrorExtension.autocomplete).filter(function(t) {
        return t.type === token.type || t.type === '*';
      }).map(function(t) {
        return t.hint(token, editor);
      }).value();

      var onResults = function(results, matchedText, dotFix) {
        if (_.isEmpty(results)) {
          return;
        }

        if (_.isUndefined(matchedText)) {
          matchedText = token.string;
        }
        var start = cur.ch - matchedText.length;
        var end = start + matchedText.length;
        if (dotFix && token.string === ".") {
          start += 1;
        }

        var hintData = {
          from: CodeMirror.Pos(cur.line, start),
          to: CodeMirror.Pos(cur.line, end),
          list: _.uniq(results)
        };

        var evaluator = bkEvaluatorManager.getEvaluator(scope.cellmodel.evaluator);
        if (_.isFunction(evaluator.getAutocompleteDocumentation)) {
          attachAutocompleteListeners(hintData, evaluator, scope, cm, matchedText);
        }

        if (waitfor.length > 0) {
          $q.all(waitfor).then(function (res) {
            for (var i in res) {
              hintData.results = _.uniq(results.concat(res[i]));
            }
            showHintCB(hintData);
          }, function(err) {
            showHintCB(hintData);
          })
        } else {
          showHintCB(hintData);
        }
      };
      scope.autocomplete(cursorPos, onResults);
    };

    if (cm.getOption('mode') === 'htmlmixed' || cm.getOption('mode') === 'javascript') {
      cm.execCommand("autocomplete");
    } else {
      var options = {
        async: true,
        closeOnUnfocus: true,
        alignWithWord: true,
        completeSingle: true
      };
      CodeMirror.showHint(cm, getHints, options);
    }
  };

  var maybeShowAutocomplete = function(cm, scope) {
    if (scope.bkNotebook.getCMKeyMapMode() === "emacs") {
      cm.setCursor(cm.getCursor());
      cm.setExtending(!cm.getExtending());
      cm.on("change", function() {
        cm.setExtending(false);
      });
    } else {
      showAutocomplete(cm, scope);
    }
  };

  var attachAutocompleteListeners = function(hintData, evaluator, scope, cm, matchedText) {
    CodeMirror.on(hintData, 'select', onSelect.bind(null, evaluator, scope, cm, matchedText));
    CodeMirror.on(cm, 'endCompletion', onEndCompletion.bind(null, scope));
    CodeMirror.on(hintData, 'pick', onPick.bind(null, cm, matchedText, scope));
  };

  function writeCompletion(funcName, params, cm, matchedText) {
    // writes the selected completion with parameters
    var str = _.map(params, function(p) {
      return p.name;
    });
    var index = funcName.indexOf(matchedText) + matchedText.length;

    var currentScrollInfo = cm.getScrollInfo();
    replaceSelection(funcName.substring(index) + '(' + str.join(', ') + ')', cm);
    cm.scrollTo(currentScrollInfo.left, currentScrollInfo.top);
  }

  function replaceSelection(s, cm) {
    // Disabling and enabling showhint event handlers that fire on every change
    var handlers = cm._handlers.cursorActivity;
    cm._handlers.cursorActivity = [];
    cm.doc.replaceSelection(s, 'around');
    cm._handlers.cursorActivity = handlers;
  }

  function backspace(cursor, cm) {
    // If backspace is pressed while autocompletion selection is active we delete one extra character
    if (completionActive) {
      var from = cm.findPosH(cursor, -1, 'char', false);
      cm.replaceRange('', from, cursor);
    }
  }

  function onSelect(evaluator, scope, cm, matchedText, selectedWord, selectedListItem) {
    completionActive = true;
    currentDocumentation = {};

    evaluator.getAutocompleteDocumentation(selectedWord, function(documentation) {
      if (!_.isEmpty(documentation)) {
        scope.$broadcast('showDocumentationForAutocomplete', documentation.description, true);
      }

      if (documentation.parameters && autocompleteParameters && !_.isEmpty(documentation.parameters)) {
        currentDocumentation = documentation;
        writeCompletion(selectedWord, documentation.parameters, cm, matchedText);
      } else {
        var index = selectedWord.indexOf(matchedText) + matchedText.length;
        replaceSelection(selectedWord.substring(index), cm);
      }
    });
  }

  function onPick(cm, matchedText, scope, completion) {
    // Removing duplicate completion since we already have it from when we wrote the parameters
    var lengthToRemove = completion.length - matchedText.length;
    var cursorPosBegin = cm.getCursor('from');
    var cursorPosEnd = cm.getCursor('to');
    cm.doc.replaceRange('', {line: cursorPosBegin.line, ch: cursorPosBegin.ch - lengthToRemove}, cursorPosBegin);
    cm.setCursor(cm.getCursor());
    if (_.isEmpty(currentDocumentation) || _.isEmpty(currentDocumentation.parameters)) {
      return;
    }
    _.defer(function() {
      if (autocompleteParameters) {
        autocompleteParametersService.startParameterCompletion(cm, currentDocumentation, cursorPosBegin, cursorPosEnd, scope);
      }
    });
  }

  function onEndCompletion(scope) {
    completionActive = false;
    scope.$broadcast('hideDocumentationForAutocomplete');
  }

  return {
    showAutocomplete: showAutocomplete,
    maybeShowAutocomplete: maybeShowAutocomplete,
    backspace: backspace
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
  angular.module('bk.core').factory('autocompleteParametersService', function() {

    var markConfig = {
      clearWhenEmpty: false,
      inclusiveLeft: true,
      inclusiveRight: true
    };

    var params = [];
    var cm;
    var scope;
    var currentParam, initialValues = [], currentValues = [];
    var args = [];
    var DOCUMENTATION_WIDTH = 500;

    function startParameterCompletion(codeMirror, documentation, selectionStart, selectionEnd, $scope) {
      cm = codeMirror;
      params = documentation.parameters;
      scope = $scope;
      markParameters(selectionStart, selectionEnd);
      cm.on('cursorActivity', endCompletionIfCursorOutOfRange);
      nextParameter();
    }

    function endCompletionIfCursorOutOfRange(cm) {
      if (!isActive()) {
        return;
      }
      if (!cursorInRange(getCompletionRange())) {
        return endCompletion();
      }

      if (cursorInRange(args[currentParam].find())) {
        // if not initialized
        if (initialValues.length == 0) {
          initialValues = getAllValues();
        }
        return showParameterDocumentation(params[currentParam]);
      }

      var activeArgumentIndex = getArgumentIndexUnderCursor();
      if (activeArgumentIndex === -1 || _.isUndefined(activeArgumentIndex)) {
        return hideParameterDocumentation();
      }
      toParam(activeArgumentIndex);

    }

    function getArgumentIndexUnderCursor() {
      return _.findIndex(args, function(arg) {
        return cursorInRange(arg.find());
      });
    }

    function cursorInRange(range) {
      var cursor = cm.getCursor('anchor');
      return cursor.line >= range.from.line &&
        cursor.line <= range.to.line &&
        cursor.ch >= range.from.ch &&
        cursor.ch <= range.to.ch;
    }

    function getCompletionRange() {
      return {from: args[0].find().from, to: _.last(args).find().to};
    }

    function markParameters(from, to) {
      var paramsString = cm.getRange(from, to);
      var positions = [];
      _.reduce(params, function(positionAccumulator, p) {
        var position = paramsString.indexOf(p.name, positionAccumulator);
        positions.push([position, position + p.name.length - 1]);
        return positionAccumulator + p.name.length + 2; // including comma and a space after comma
      }, 0);
      args = _.map(positions, function(p) {
        var start = _.merge({}, from, {ch: from.ch + p[0]});
        var end = _.merge({}, from, {ch: from.ch + p[1] + 1});
        return markWithClass(start, end, 'marked-argument-unchanged');
      });
    }

    function markWithClass(start, end, className) {
      return cm.markText(start, end, _.merge({}, {className: className}, markConfig));
    }

    function nextParameter() {
      toParam(_.isUndefined(currentParam) || currentParam === params.length - 1? 0 : currentParam + 1);
    }

    function previousParameter() {
      toParam(_.isUndefined(currentParam) || currentParam === 0 ? params.length - 1 : currentParam - 1);
    }

    function toParam(index) {
      if (! _.isUndefined(currentParam)) {
        params[currentParam].argument = args[currentParam].find();
        markArgumentIfChanged();
      }
      currentParam = index;
      selectArgument(currentParam);
      showParameterDocumentation(params[currentParam]);
    }

    function markArgumentIfChanged() {
      var p = params[currentParam]
      if (cm.getRange(p.argument.from, p.argument.to) !== p.name) {
        args[currentParam].clear();
        args[currentParam] = markWithClass(p.argument.from, p.argument.to, 'marked-argument-changed');
      }
    }

    function isActive() {
      return !(_.isEmpty(params));
    }

    function endCompletion() {
      removeOptionalParams();
      cm.off('cursorActivity', endCompletionIfCursorOutOfRange);
      hideParameterDocumentation();
      clearMarks();
      cm = void 0;
      currentParam = void 0;
      scope = void 0;
      params = [];
      args = [];
    }

    function getAllValues() {
      var currentValues = [];
      for (var i = 0; i < args.length; ++i) {
        var arg = args[i].find();
        currentValues[i] = cm.doc.getRange(arg.from, arg.to);
      }
      return currentValues;
    }

    function getIndexOfLastChangedParam() {
      for (var i = initialValues.length - 1; i >= 0; --i) {
        // that means value was changed
        if (initialValues[i] !== currentValues[i]) {
          return i;
        }
      }
      return 0;
    }

    function removeOptionalParams() {
      try {
        currentValues = getAllValues();
        // last changed parameter
        var lastParamIndex = getIndexOfLastChangedParam();
        var lastParam = args[lastParamIndex].find();
        // last argument for current params suggestion
        var lastArg = _.last(args).find();
        // get selection of optional params
        cm.doc.setSelection(lastParam.to, lastArg.to);
        cm.doc.replaceSelection('');
      } catch(e) {
        // if we get here than there is error in editor
        console.log('unable to get selection for removing optional parameters');
      }
    }

    function endCompletionAndMoveCursor() {
      var lastArg = _.last(args).find();
      cm.setCursor(_.merge({}, lastArg.to, {ch: lastArg.to.ch + 1}));
      endCompletion();
    }

    function selectArgument(i) {
      var arg = args[i].find();
      cm.setSelection(arg.from, arg.to);
    }

    function clearMarks() {
      _.forEach(args, function(arg) {
        arg.clear();
      });
    }

    function showParameterDocumentation(param) {
      if (!param.description || _.isEmpty(param.description)) {
        return;
      }
      _.defer(function() {scope.$broadcast('showParameterDocumentation', param.description, cm.getScrollInfo().left, DOCUMENTATION_WIDTH);});
    }

    function hideParameterDocumentation() {
      scope.$broadcast('hideParameterDocumentation');
    }

    return {
      startParameterCompletion: startParameterCompletion,
      isActive: isActive,
      nextParameter: nextParameter,
      previousParameter: previousParameter,
      endCompletion: endCompletion,
      endCompletionAndMoveCursor: endCompletionAndMoveCursor
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
 * Module bk.debug
 * This module is for debug only and should never be used in code
 */
(function() {
  'use strict';
  var module = angular.module("bk.debug", [
    "bk.angularUtils",
    "bk.mainApp",
    'bk.cellMenuPluginManager',
    "bk.core",
    'bk.sessionManager',
    "bk.outputLog",
    "bk.recentMenu",
    "bk.session",
    "bk.share",
    "bk.track",
    "bk.utils",
    "bk.cometdUtils",
    "bk.commonUtils",
    "bk.menuPluginManager",
    "bk.evaluatePluginManager",
    "bk.evaluatorManager",
    "bk.evaluateJobManager",
    "bk.notebookCellModelManager"
  ]);
  module.factory("bkDebug", function(
      $injector, angularUtils, bkEvaluateJobManager, bkCellMenuPluginManager, bkSessionManager,
      bkCoreManager, bkOutputLog, bkRecentMenu, bkSession, bkShare,
      bkTrack, bkUtils, cometdUtils, commonUtils, bkMenuPluginManager, bkEvaluatePluginManager,
      bkNotebookCellModelManager,
      bkEvaluatorManager) {
    return {
      $injector: $injector,
      angularUtils: angularUtils,
      bkEvaluateJobManager: bkEvaluateJobManager,
      bkCellMenuPluginManager: bkCellMenuPluginManager,
      bkSessionManager: bkSessionManager,
      bkCoreManager: bkCoreManager,
      bkOutputLog: bkOutputLog,
      bkRecentMenu: bkRecentMenu,
      bkSession: bkSession,
      bkShare: bkShare,
      bkTrack: bkTrack,
      bkUtils: bkUtils,
      cometdUtils: cometdUtils,
      commonUtils: commonUtils,
      bkMenuPluginManager: bkMenuPluginManager,
      bkEvaluatePluginManager: bkEvaluatePluginManager,
      bkEvaluatorManager: bkEvaluatorManager,
      bkNotebookCellModelManager: bkNotebookCellModelManager,
      debugUI: function() {
        bkHelper.getBkNotebookViewModel().toggleDebugging();
        bkHelper.refreshRootScope();
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
 * Module bk.evaluatePluginManager
 */
(function() {
  'use strict';
  var module = angular.module('bk.evaluatePluginManager', ['bk.utils']);
  module.factory('bkEvaluatePluginManager', function(bkUtils, $sce, $uibModal) {
    var nameToUrlMap = {};
    var nameToVisualParams = {};
    var plugins = {};
    var loadingInProgressPlugins = [];

    var evaluatorLoadQueue = (function() {
      var _queue = [];
      var _loadInProgress = undefined;

      var loadEvaluator = function(ev) {
        bkHelper.showStatus("Starting language "+ev.name);
        return bkUtils.loadModule(ev.url, ev.name);
      };
      var doNext = function() {
        if (_loadInProgress) {
          return;
        }
        _loadInProgress = _queue.shift();
        if (_loadInProgress) {
          if (plugins[_loadInProgress.name] || plugins[_loadInProgress.url]) { // plugin code already loaded
            if (plugins[_loadInProgress.name]) {
              _loadInProgress.resolve(plugins[_loadInProgress.name])
              .finally(function () {
                _loadInProgress = undefined;
              })
              .then(doNext);
            } else {
              _loadInProgress.resolve(plugins[_loadInProgress.url])
              .finally(function () {
                _loadInProgress = undefined;
              })
              .then(doNext);
            }
            return;
          }
          return loadEvaluator(_loadInProgress)
          .then(_loadInProgress.resolve, _loadInProgress.reject)
          .finally(function () {
            bkHelper.clearStatus("Starting language " + _loadInProgress.name)
            _loadInProgress = undefined;
          })
          .then(doNext);
        }
      };

      return {
        add: function(evl) {
          _queue.push(evl);
          bkUtils.fcall(doNext);
        }
      };
    })();

    return {
      getKnownEvaluatorPlugins: function() {
        return nameToUrlMap;
      },
      addNameToUrlEntry: function(name, url) {
        if ( typeof url === 'string' ) {
          nameToUrlMap[name] = url;
        } else {
          nameToUrlMap[name] = url.url;
          delete url.url;
          nameToVisualParams[name] = url;
        }
      },
      getVisualParams: function(name) {
        return nameToVisualParams[name];
      },
      getEvaluatorFactoryAndShell: function(evaluatorSettings) {
        var nameOrUrl = evaluatorSettings.plugin;
        if (plugins[nameOrUrl]) {
          // plugin code already loaded
          var deferred = bkUtils.newDeferred();
          plugins[nameOrUrl].getEvaluatorFactory().then(function(factory) {
            if (factory !== undefined && factory.create !== undefined) {
              return factory.create(evaluatorSettings).then(function(ev) { deferred.resolve(ev); });
            } else {
              deferred.reject("no factory for evaluator plugin");
            }
          }, function(err) {
            console.log(err);
            deferred.reject(err);
          });
          return deferred.promise;
        } else {
          var deferred = bkUtils.newDeferred();
          var name, url;
          if (nameToUrlMap[nameOrUrl]) {
            name = nameOrUrl;
            url = nameToUrlMap[nameOrUrl];
          } else {
            name = "";
            url = nameOrUrl;
          }

          var onPluginLoadError = function(pluginId, reason){
            $uibModal.open({backdrop: true,
              backdropClick: true,
              windowClass: 'beaker-sandbox',
              backdropClass: 'beaker-sandbox',
              template: JST['helpers/plugin-load-error'](
                {
                  errorMessage: $sce.trustAsHtml(bkHelper.getPluginStartFailedMessage(pluginId))
                }
              )
            });
            deferred.reject(reason);
          };

          var loadJob = {
              name: name,
              url: url,
              resolve: function(ex) {
                if (!_.isEmpty(ex.name)) {
                  plugins[ex.name] = ex;
                }
                if (!_.isEmpty(name) && name !== ex.name) {
                  plugins[name] = ex;
                }
                return ex.getEvaluatorFactory()
                  .then(function(factory) {
                    if (factory !== undefined && factory.create !== undefined) {
                      return factory.create(evaluatorSettings).then(
                        function(ev) { deferred.resolve(ev); },
                        function(reason){ onPluginLoadError(name, reason); });
                    } else {
                      onPluginLoadError(name, "no factory for evaluator plugin");
                    }
                  }, function(err) {
                    // This function is never called.  Instead the
                    // "then" clause above is called but factory is
                    // undefined.  Unknown why XXX.
                    if (!_.isEmpty(ex.name)) {
                      delete plugins[ex.name];
                    }
                    if (!_.isEmpty(name) && name !== ex.name) {
                      delete plugins[name];
                    }
                    console.error(err);
                    if (_.isEmpty(name)) {
                      deferred.reject("failed to load plugin: " + url);
                    } else {
                      deferred.reject("failed to load plugin: " + name + " at " + url);
                    }
                  });
              },
              reject: function(err) {
                // This is called if the URL is bad or there is a syntax error in the JS.
                bkHelper.showTransientStatus("Failed to find plugin "+name+": "+err);
                console.error(err);
                if (_.isEmpty(name)) {
                  deferred.reject("failed to find plugin: " + url);
                } else {
                  deferred.reject("failed to find plugin: " + name + " at " + url);
                }
              }
          };
          evaluatorLoadQueue.add(loadJob);
          return deferred.promise;
        }
      },
      createEvaluatorThenExit: function(settings) {
        var theShell;
        return this.getEvaluatorFactoryAndShell(settings)
        .then(function(evaluator) {
          if (evaluator.exit) {
            evaluator.exit();
          }
        })
        .then(function() {
          _.filter(plugins, function(aShell) {
            return aShell !== theShell;
          });
        });
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
 * Module bk.helper
 * The bkHelper should be a subset of bkCore utilities that are exposed for
 * usages external to Beaker.
 */
(function() {
  'use strict';
  var module = angular.module('bk.helper', ['bk.utils', 'bk.core', 'bk.debug', 'bk.electron', 'bk.publication','bk.katexhelper']);
  /**
   * bkHelper
   * - should be the only thing plugins depend on to interact with general beaker stuffs (other than
   * conforming to the API spec)
   * - except plugins, nothing should depends on bkHelper
   * - we've made this global. We should revisit this decision and figure out the best way to load
   *   plugins dynamically
   * - it mostly should just be a subset of bkUtil
   */
  module.factory('bkHelper', function($location, $rootScope, $httpParamSerializer, $uibModal,  bkUtils, bkCoreManager, bkSessionManager, bkEvaluatorManager, bkDebug, bkElectron, bkPublicationAuth, katexhelper, GLOBALS) {
    var getCurrentApp = function() {
      return bkCoreManager.getBkApp();
    };
    var getBkNotebookWidget = function() {
      if (getCurrentApp() && getCurrentApp().getBkNotebookWidget) {
        return getCurrentApp().getBkNotebookWidget();
      } else {
        return undefined;
      }
    };

    var rgbaToHex = bkUtils.rgbaToHex;
    var defaultPlotColors = {};
    defaultPlotColors[GLOBALS.THEMES.DEFAULT] = [
      "#FF1F77B4", // blue
      "#FFFF7F0E", // orange
      "#FF2CA02C", // green
      "#FFD62728", // red
      "#FF9467BD", // purple
      "#FF8C564B", // brown
      "#FFE377C2", // pink
      "#FF7F7F7F", // gray
      "#FFBCBD22", // pear
      "#FF17BECF",  // aqua
      "#FFAEC7E8",
      "#FFFFBB78",
      "#FF98DF8A",
      "#FFFF9896",
      "#FFC5B0D5",
      "#FFC49C94",
      "#FFF7B6D2",
      "#FFC7C7C7",
      "#FFDBDB8D",
      "#FF9EDAE5"
    ];

    defaultPlotColors[GLOBALS.THEMES.AMBIANCE] = [
      "#FF1F77B4", // blue
      "#FFFF7F0E", // orange
      "#FF2CA02C", // green
      "#FFD62728", // red
      "#FF9467BD", // purple
      "#FF8C564B", // brown
      "#FFE377C2", // pink
      "#FF7F7F7F", // gray
      "#FFBCBD22", // pear
      "#FF17BECF",  // aqua
      "#FFAEC7E8",
      "#FFFFBB78",
      "#FF98DF8A",
      "#FFFF9896",
      "#FFC5B0D5",
      "#FFC49C94",
      "#FFF7B6D2",
      "#FFC7C7C7",
      "#FFDBDB8D",
      "#FF9EDAE5"
    ];

    var defaultEvaluator = GLOBALS.DEFAULT_EVALUATOR;
    $rootScope.$on("defaultEvaluatorChanged", function (event, data) {
      defaultEvaluator = data;
    });

      var bkHelper = {

      isNewNotebookShortcut: function (e){
        if (this.isMacOS){
          if(this.getInputCellKeyMapMode() === "emacs"){
            return false; //issue #4722 
          }else{
            return e.ctrlKey && (e.which === 78);// Ctrl + n
          }
        }
        return e.altKey && (e.which === 78);// Alt + n
      },
      isNewDefaultNotebookShortcut: function (e){
        if (this.isMacOS){
          return e.ctrlKey && e.shiftKey && (e.which === 78);// Ctrl + Shift + n
        }
        return e.altKey && e.shiftKey && (e.which === 78);// Cmd + Shift + n
      },
      isAppendCodeCellShortcut: function (e){
        if (this.isMacOS){
          return e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 65);// Ctrl + Shift + A
        }
        return e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 65);// Cmd + Shift + A
      },
      isAppendTextCellShortcut: function (e){
        if (this.isMacOS){
          return e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 89);// Ctrl + Shift + Y
        }
        return e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 89);// Cmd + Shift + Y
      },
      isInsertCodeCellAboveShortcut: function (e){
        if (this.isMacOS){
          return e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 85);// Ctrl + Shift + U
        }
        return e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 85);// Cmd + Shift + U
      },
      isSaveNotebookAsShortcut: function (e){
        if (this.isMacOS){
          return e.shiftKey && e.metaKey && !e.ctrlKey && !e.altKey && (e.which === 83);// Cmd + shift + s
        }
        return e.ctrlKey && e.shiftKey && e.altKey && (e.which === 83);// Ctrl + shift + s
      },
      isSaveNotebookShortcut: function (e){
        if (this.isMacOS){
          return e.metaKey && !e.shiftKey && !e.ctrlKey && !e.altKey && (e.which === 83);// Cmd + s
        }
        return e.ctrlKey && !e.shiftKey && !e.altKey && (e.which === 83);// Ctrl + s
      },
      isLanguageManagerShortcut: function (e) {
        if (this.isMacOS) {
          return e.ctrlKey && (e.which === 76);// Ctrl + l
        }
        return e.altKey && (e.which === 76);//Alt + l
      },
      isResetEnvironmentShortcut: function (e) {
        if (this.isMacOS) {
          return e.ctrlKey && (e.which === 82); // ctrlKey + r
        }
        return e.altKey && (e.which === 82); // Alt + r
      },
      isRaiseSectionLevelShortcut: function (e) {
        if (this.isMacOS){
          return e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 190);// Ctrl + Shift + >
        }
        return e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 190);// Cmd + Shift + >
      },
      isLowerSectionLevelShortcut: function (e) {
        if (this.isMacOS){
          return e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 188);// Ctrl + Shift + <
        }
        return e.ctrlKey && !e.altKey && e.shiftKey && (e.which === 188);// Cmd + Shift + <
      },
      isInsertAfterSectionShortcut: function(e) {
        if (this.isMacOS){
          return e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey &&
            ((e.which>=49) && (e.which<=50));// cmd + Shift + 1...2
        }
        return e.ctrlKey && !e.altKey && e.shiftKey &&
          ((e.which>=49) && (e.which<=50));// ctrl + Shift + 1...2
      },
      isSearchReplace: function (e){
        if (this.isMacOS){
          if(this.getInputCellKeyMapMode() === "emacs"){
            return e.ctrlKey && (e.which === 83);// Ctrl + s
          }else{
            return e.ctrlKey && (e.which === 70);// Ctrl + f
          }
        }
        return e.altKey && (e.which === 70);// Alt + f
      },
  
      isPageUpKey: function (e) {
        return e.which === 33;
      },
      isPageDownKey: function (e) {
        return e.which === 34;
      },

      //see http://stackoverflow.com/questions/9847580/how-to-detect-safari-chrome-ie-firefox-and-opera-browser
      // Firefox 1.0+
      isFirefox: typeof InstallTrigger !== 'undefined',
      // At least Safari 3+: "[object HTMLElementConstructor]"
      isSafari: Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0,
      // Chrome 1+
      isChrome: !!window.chrome && !!window.chrome.webstore,

      guid: function () {
        function s4() {
          return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
      },

      setTheme: function (theme) {
        bkCoreManager.setTheme(theme);
      },
      getTheme: function () {
        return bkCoreManager.getTheme();
      },
      defaultPlotColors: defaultPlotColors,
      setThemeToBeakerObject: function () {
        var beakerObject = this.getBeakerObject().beakerObj;
        if (beakerObject && beakerObject.prefs) {
          beakerObject.prefs.theme = {
            name: this.getTheme(),
            plotColors: defaultPlotColors[this.getTheme()]
          };
        }
      },
      initBeakerLanguageSettings: function () {
        var beakerObj = this.getBeakerObject();
        var beaker = beakerObj.beakerObj;
        if (beaker) {
          beaker.language = {};
          beakerObj.beakerObjectToNotebook();
        }
      },
      setLanguageManagerSettingsToBeakerObject: function (plugin) {
        var beakerObject = this.getBeakerObject();
        var beaker = beakerObject.beakerObj;
        if (beaker && beaker.language) {
          var spec = plugin.spec;
          var beakerLanguageSettings = {};
          _.forOwn(spec, function(value, property){
            if(value.type === 'settableString'){
              beakerLanguageSettings[property] = plugin.settings[property] || '';
            }
          });
          beaker.language[plugin.pluginName] = beakerLanguageSettings;
          beakerObject.beakerObjectToNotebook();
        }
      },
      updateLanguageManagerSettingsInBeakerObject: function (pluginName, propertyName, propertyValue) {
        var beakerObject = this.getBeakerObject();
        var beaker = beakerObject.beakerObj;
        if (beaker && beaker.language) {
          var settings = beaker.language[pluginName];
          if (settings) {
            settings[propertyName] = propertyValue;
          }
          beakerObject.beakerObjectToNotebook();
        }
      },
      removeLanguageManagerSettingsFromBeakerObject: function (pluginName) {
        var beakerObject = this.getBeakerObject();
        var beaker = beakerObject.beakerObj;
        if (beaker && beaker.language && pluginName) {
          delete beaker.language[pluginName];
          beakerObject.beakerObjectToNotebook();
        }
      },

      // enable debug
      debug: function() {
        window.bkDebug = bkDebug;
      },

      // beaker (root)
      gotoControlPanel: function() {
        return bkCoreManager.gotoControlPanel();
      },
      openNotebook: function(notebookUri, uriType, readOnly, format) {
        return bkCoreManager.openNotebook(notebookUri, uriType, readOnly, format);
      },
      importNotebookDialog: function() {
        return bkCoreManager.importNotebookDialog();
      },
      // Empty true means truly empty new session.
      // otherwise use the default notebook.
      newSession: function(empty) {
        return bkCoreManager.newSession(empty);
      },
      getBaseUrl: function () {
        return bkUtils.getBaseUrl();
      },
      getNotebookUri: function() {
        return bkSessionManager.getNotebookUri();
      },
      openNotebookInNewWindow: function (notebookUri, uriType, readOnly, format) {
        var params = {
          'uri': notebookUri
        };
        if (uriType) {
          params.type = uriType;
        }
        if (readOnly) {
          params.readOnly = readOnly;
        }
        if (format) {
          params.format = format;
        }
        bkHelper.openWindow(
          bkHelper.getBaseUrl() + "/open?" + $httpParamSerializer(params),
          'notebook');
      },
      // Open tab/window functions that handle the electron case
      openWindow: function(path, type) {
        if (bkUtils.isElectron) {
          if (path[0] == '/'){
            bkElectron.IPC.send('new-window', bkUtils.getBaseUrl() + path, type);
          } else {
            bkElectron.IPC.send('new-window', path, type);
          }
        } else {
          window.open(path);
        }
      },
      openStaticWindow: function(path) {
        if (bkHelper.isElectron) {
          var newWindow = new bkElectron.BrowserWindow({});
          newWindow.loadUrl(bkHelper.serverUrl('beaker/' + path));
        } else {
          window.open('./' + path);
        }
      },
      openBrowserWindow: function(path) {
        if (bkUtils.isElectron) {
          bkElectron.Shell.openExternal(path);
        } else {
          window.open(path);
        }
      },
      // Save file with electron or web dialog
      saveWithDialog: function(thenable) {
        if (bkUtils.isElectron) {
          var BrowserWindow = bkElectron.BrowserWindow;
          var Dialog = bkElectron.Dialog;
          var thisWindow = BrowserWindow.getFocusedWindow();
          var path = showElectronSaveDialog(thisWindow, options).then(function(path) {
            if (path === undefined) {
              saveFailed('cancelled');
              return;
            }
            bkUtils.httpPost('rest/file-io/setWorkingDirectory', {dir: path});
            var ret = {
              uri: path,
              uriType: 'file'
            };
            bkSessionManager.dumpDisplayStatus();
            var saveData = bkSessionManager.getSaveData();
            var fileSaver = bkCoreManager.getFileSaver(ret.uriType);
            var content = saveData.notebookModelAsString;
            fileSaver.save(ret.uri, content, true).then(function() {
              thenable.resolve(ret);
            }, thenable.reject);
          });
          return thenable.promise.then(saveDone, saveFailed);
        } else {
          thenable = savePromptChooseUri();
          return thenable.then(saveDone, saveFailed);
        }
      },
      showElectronSaveDialog: function() {
        var BrowserWindow = bkElectron.BrowserWindow;
        var Dialog = bkElectron.Dialog;
        return bkUtils.getWorkingDirectory().then(function(defaultPath) {
          var options = {
            title: 'Save Beaker Notebook',
            defaultPath: defaultPath,
            filters: [
              {name: 'Beaker Notebook Files', extensions: ['bkr']}
            ]
          };
          var path = Dialog.showSaveDialog(options);
          return path;
        });
      },
      // Open file with electron or web dialog
      openWithDialog: function(ext, uriType, readOnly, format) {
        if (bkUtils.isElectron) {
          var BrowserWindow = bkElectron.BrowserWindow;
          var Dialog = bkElectron.Dialog;
          return bkUtils.getWorkingDirectory().then(function(defaultPath) {
            var options = {
              title: 'Open Beaker Notebook',
              defaultPath: defaultPath,
              multiSelections: false,
              filters: [
                {name: 'Beaker Notebook Files', extensions: [ext]}
              ]
            };
            // Note that the open dialog return an array of paths (strings)
            var path = Dialog.showOpenDialog(options);
            if (path === undefined) {
              console.log('Open cancelled');
              return;
            } else {
              // For now, multiSelections are off, only get the first
              path = path[0];
            }
            bkUtils.httpPost('rest/file-io/setWorkingDirectory', {dir: path});
            // Format this accordingly!
            var routeParams = {
              uri: path
            };
            if (uriType) {
              routeParams.type = uriType;
            }
            if (readOnly) {
              routeParams.readOnly = true;
            }
            if (format) {
              routeParams.format = format;
            }
            bkHelper.openWindow(bkUtils.getBaseUrl() + '/open?' + jQuery.param(routeParams), 'notebook');
          });
        } else {
            bkCoreManager.showFileOpenDialog(ext).then(function(selected){
              if (selected && selected.uri)
                bkHelper.openNotebook(selected.uri, uriType, readOnly, format);
            });
        }
      },
      Electron: bkElectron,
      // current app
      getCurrentAppName: function() {
        if (!_.isEmpty(getCurrentApp().name)) {
          return getCurrentApp().name;
        }
        return "Unknown App";
      },
      hasSessionId: function() {
        if (getCurrentApp().getSessionId) {
          return true;
        }
        return false;
      },
      getSessionId: function() {
        if (getCurrentApp() && getCurrentApp().getSessionId) {
          return getCurrentApp().getSessionId();
        } else {
          return "unknown";
        }
      },
      getNotebookModel: function() {
        if (getCurrentApp() && getCurrentApp() && getCurrentApp().getNotebookModel) {
          return getCurrentApp().getNotebookModel();
        } else {
          return { };
        }
      },
      getBeakerObject: function() {
        if (getCurrentApp() && getCurrentApp().getBeakerObject) {
          return getCurrentApp().getBeakerObject();
        } else {
          return { };
        }
      },
      initBeakerPrefs: function () {
        var beakerObj = this.getBeakerObject();
        beakerObj.setupBeakerObject({});
        beakerObj.notebookToBeakerObject();
        var beaker = beakerObj.beakerObj;
        beaker.prefs = {useOutputPanel: false, outputLineLimit: 1000, outputColumnLimit: 50};
        beaker.client = {
          mac: navigator.appVersion.indexOf("Mac") != -1,
          windows: navigator.appVersion.indexOf("Win") != -1,
          linux: navigator.appVersion.indexOf("Linux") != -1
        };
        this.setThemeToBeakerObject();
        beakerObj.beakerObjectToNotebook();
      },
      stripOutBeakerPrefs: function(model) {
        if (model && model.namespace && model.namespace.prefs)
          delete model.namespace.prefs;
      },
      stripOutBeakerLanguageManagerSettings: function(model) {
        if (model && model.namespace && model.namespace.language)
          delete model.namespace.language;
      },
      stripOutBeakerClient: function(model) {
        if (model && model.namespace && model.namespace.client)
          delete model.namespace.client;
      },
      getNotebookElement: function(currentScope) {
        return bkCoreManager.getNotebookElement(currentScope);
      },
      collapseAllSections: function() {
        if (getCurrentApp() && getCurrentApp().collapseAllSections) {
          return getCurrentApp().collapseAllSections();
        } else {
          return false;
        }
      },
      openAllSections: function() {
        if (getCurrentApp() && getCurrentApp().openAllSections()) {
          return getCurrentApp().openAllSections();
        } else {
          return false;
        }
      },
      closeNotebook: function() {
        if (getCurrentApp() && getCurrentApp().closeNotebook) {
          return getCurrentApp().closeNotebook();
        } else {
          return false;
        }
      },
        saveNotebook: function() {
        if (getCurrentApp() && getCurrentApp().saveNotebook) {
          return getCurrentApp().saveNotebook();
        } else {
          return false;
        }
      },
      saveNotebookAs: function() {
        if (getCurrentApp() && getCurrentApp().saveNotebookAs) {
          return getCurrentApp().saveNotebookAs();
        } else {
          return false;
        }
      },
      saveNotebookAsUri: function(notebookUri, uriType) {
        if (getCurrentApp() && getCurrentApp().saveNotebookAsUri) {
          return getCurrentApp().saveNotebookAsUri(notebookUri, uriType);
        } else {
          return false;
        }
      },
      renameNotebookTo: function(notebookUri, uriType) {
        if (getCurrentApp() && getCurrentApp().renameNotebookTo) {
          return getCurrentApp().renameNotebookTo(notebookUri, uriType);
        } else {
          return false;
        }
      },
      runAllCellsInNotebook: function () {
        if (getCurrentApp() && getCurrentApp().runAllCellsInNotebook) {
          return getCurrentApp().runAllCellsInNotebook();
        } else {
          return false;
        }
      },
      resetAllKernelsInNotebook: function () {
        if (getCurrentApp() && getCurrentApp().resetAllKernelsInNotebook) {
          return getCurrentApp().resetAllKernelsInNotebook();
        } else {
          return false;
        }
      },
      hasCodeCell: function(toEval) {
        if (getCurrentApp() && getCurrentApp().evaluate) {
          return getCurrentApp().hasCodeCell(toEval);
        } else {
          return false;
        }
      },
      evaluate: function(toEval) {
        if (getCurrentApp() && getCurrentApp().evaluate) {
          return getCurrentApp().evaluate(toEval);
        } else {
          return false;
        }
      },
      evaluateRoot: function(toEval) {
        if (getCurrentApp() && getCurrentApp().evaluateRoot) {
          return getCurrentApp().evaluateRoot(toEval);
        } else {
          return false;
        }
      },
      evaluateCode: function(evaluator, code) {
        if (getCurrentApp() && getCurrentApp().evaluateCode) {
          return getCurrentApp().evaluateCode(evaluator, code);
        } else {
          return false;
        }
      },
      loadLibrary: function(path, modelOutput) {
        if (getCurrentApp() && getCurrentApp().loadLibrary) {
          return getCurrentApp().loadLibrary(path, modelOutput);
        } else {
          return false;
        }
      },        
      backupNotebook: function() {
        return bkSessionManager.backup();
      },
      isNotebookModelEdited: function () {
        return bkSessionManager.isNotebookModelEdited();
      },
      typeset: function(element) {
        try {
          katexhelper.renderElem(element[0], {
            delimiters: [
              {left: "$$", right: "$$", display: true},
              {left: "$", right:  "$", display: false},
              {left: "\\[", right: "\\]", display: true},
              {left: "\\(", right: "\\)", display: false}
            ]
          });
        } catch(err) {
          bkHelper.show1ButtonModal(err.message + '<br>See: ' +
              '<a target="_blank" href="http://khan.github.io/KaTeX/">KaTeX website</a> and its ' +
              '<a target="_blank" href="https://github.com/Khan/KaTeX/wiki/Function-Support-in-KaTeX">' +
              'list of supported functions</a>.',
              "KaTex error");
        }
      },
      markupCellContent: function(cellContent, evaluateFn) {
        var markupDeferred = bkHelper.newDeferred();
        if (!evaluateFn) {
          evaluateFn = this.evaluateCode;
        }

        var omitContentInsideBackquotsFromKatexTransformation = function(content) {
          var contentCopy = angular.copy(content);
          var result = "";
          var contentList = contentCopy.match(/`.*?\$.*?`/g);
          if (contentList) {
            for (var i = 0; i < contentList.length; i++) {
              var matchContent = contentList[i];
              var indexOf = contentCopy.indexOf(matchContent);
              var contentForKatexTransformation = contentCopy.substring(0, indexOf);
              var contentInsideBackquots = contentCopy.substring(indexOf, indexOf + matchContent.length);
              var contentForKatexTransformationDiv = $('<div>' + contentForKatexTransformation + '</div>');
              bkHelper.typeset(contentForKatexTransformationDiv);
              result += contentForKatexTransformationDiv.html() + contentInsideBackquots;
              contentCopy = contentCopy.substring(indexOf + matchContent.length, contentCopy.length);
            }
            var contentCopyDiv = $('<div>' + contentCopy + '</div>');
            bkHelper.typeset(contentCopyDiv);
            result += contentCopyDiv.html();
          } else {
            var markdownFragment = $('<div>' + contentCopy + '</div>');
            bkHelper.typeset(markdownFragment);
            result = markdownFragment.html();
          }
          return result;
        };

        var markIt = function(content) {
          var markdownFragment = $('<div>' + omitContentInsideBackquotsFromKatexTransformation(content) + '</div>');
          var escapedHtmlContent = angular.copy(markdownFragment.html());
          markdownFragment.remove();
          var unescapedGtCharacter = escapedHtmlContent.replace(/&gt;/g, '>');
          var md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true
          });

          // Remember old renderer, if overridden, or proxy to default renderer
          var defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
              return self.renderToken(tokens, idx, options);
            };

          md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
            // check if 'target' attr has already been added
            var aIndex = tokens[idx].attrIndex('target');
            if (aIndex < 0) {
              tokens[idx].attrPush(['target', '_blank']); //add new attribute
            } else {
              tokens[idx].attrs[aIndex][1] = '_blank'; //replace value of existing attr
            }
            // pass token to default renderer.
            return defaultRender(tokens, idx, options, env, self);
          };

          var result = md.render(unescapedGtCharacter);
          markupDeferred.resolve(result);
        };

        var results = [], re = /{{([^}]+)}}/g, text;

        while (text = re.exec(cellContent)) {
          if (results.indexOf(text) === -1)
            results.push(text);
        }

        var evaluateCode = function (index) {

          if (index === results.length) {
            markIt(cellContent);
          } else {
            evaluateFn("JavaScript", results[index][1]).then(
                function (r) {
                  cellContent = cellContent.replace(results[index][0], r);
                },
                function (r) {
                  cellContent = cellContent.replace(results[index][0], "<font color='red'>" + "Error: **" + r.object[0] + "**" + "</font>");
                }
            ).finally(function () {
                  evaluateCode(index + 1);
                }
            );
          }
        };

        evaluateCode(0);

        return markupDeferred.promise;
      },
      evaluateJSinHTML: function(code, evaluateFn) {
        var markupDeferred = bkHelper.newDeferred();
        if (!evaluateFn) {
          evaluateFn = this.evaluateCode;
        }

        var results = [], re = /{{([^}]+)}}/g, text;

        while (text = re.exec(code)) {
          if (results.indexOf(text) === -1)
            results.push(text);
        }
        
        var evaluateCode = function (index) {
          if (index === results.length) {
            markupDeferred.resolve(code);
          } else {
            evaluateFn("JavaScript", results[index][1]).then(
                function (r) {
                  code = code.replace(results[index][0], r);
                },
                function (r) {
                  code = code.replace(results[index][0], "<font color='red'>" + "Error: **" + r.object[0] + "**" + "</font>");
                }
            ).finally(function () {
                  evaluateCode(index + 1);
                }
            );
          }
        };

        evaluateCode(0);

        return markupDeferred.promise;
      },
      getEvaluatorMenuItems: function() {
        if (getCurrentApp() && getCurrentApp().getEvaluatorMenuItems) {
          return getCurrentApp().getEvaluatorMenuItems();
        } else {
          return [];
        }
      },
      toggleNotebookLocked: function() {
        if (getCurrentApp() && getCurrentApp().toggleNotebookLocked) {
          return getCurrentApp().toggleNotebookLocked();
        } else {
          return false;
        }
      },
      isNotebookLocked: function() {
        if (getCurrentApp() && getCurrentApp().isNotebookLocked) {
          return getCurrentApp().isNotebookLocked();
        } else {
          return true;
        }
      },
      showAnonymousTrackingDialog: function() {
        if (getCurrentApp() && getCurrentApp().showAnonymousTrackingDialog) {
          return getCurrentApp().showAnonymousTrackingDialog();
        } else {
          return false;
        }
      },
      showStatus: function(message, nodigest) {
        if (getCurrentApp() && getCurrentApp().showStatus) {
          return getCurrentApp().showStatus(message, nodigest);
        } else {
          return false;
        }
      },
      updateStatus: function() {
        if (getCurrentApp() && getCurrentApp().updateStatus) {
          return getCurrentApp().updateStatus();
        } else {
          return false;
        }
      },
      getStatus: function() {
        if (getCurrentApp() && getCurrentApp().getStatus) {
          return getCurrentApp().getStatus();
        } else {
          return false;
        }
      },
      clearStatus: function(message, nodigest) {
        if (getCurrentApp() && getCurrentApp().clearStatus) {
          return getCurrentApp().clearStatus(message, nodigest);
        } else {
          return false;
        }
      },
      showTransientStatus: function(message, nodigest) {
        if (getCurrentApp() && getCurrentApp().showTransientStatus) {
          return getCurrentApp().showTransientStatus(message, nodigest);
        } else {
          return false;
        }
      },
      getEvaluators: function() {
        if (getCurrentApp() && getCurrentApp().getEvaluators) {
          return getCurrentApp().getEvaluators();
        } else {
          return [];
        }
      },
      setIPythonCookiesCleaned: function (value) {
        this.iPythonCookiesCleaned = value;
      },
      isIPythonCookiesCleaned: function () {
        return this.iPythonCookiesCleaned;
      },
      go2FirstErrorCodeCell: function() {
        if (getCurrentApp() && getCurrentApp().go2FirstErrorCodeCell) {
          return getCurrentApp().go2FirstErrorCodeCell();
        } else {
          return [];
        }
      },
      go2LastCodeCell: function() {
        if (getCurrentApp() && getCurrentApp().go2LastCodeCell) {
          getCurrentApp().go2LastCodeCell();
        } else {
          return [];
        }
      },
      go2FirstCell: function() {
        if (getCurrentApp() && getCurrentApp().go2FirstCell) {
          getCurrentApp().go2FirstCell();
        } else {
          return [];
        }
      },
      go2Cell: function(cellId) {
        if (getCurrentApp() && getCurrentApp().go2Cell) {
          getCurrentApp().go2Cell(cellId);
        } else {
          return [];
        }
      },
      getCodeCells: function(filter) {
        if (getCurrentApp() && getCurrentApp().getCodeCells) {
          return getCurrentApp().getCodeCells(filter);
        } else {
          return [];
        }
      },
      setCodeCellBody: function(name, code) {
        if (getCurrentApp() && getCurrentApp().setCodeCellBody) {
          return getCurrentApp().setCodeCellBody(name,code);
        } else {
          return false;
        }
      },
      setCodeCellEvaluator: function(name, evaluator) {
        if (getCurrentApp() && getCurrentApp().setCodeCellEvaluator) {
          return getCurrentApp().setCodeCellEvaluator(name, evaluator);
        } else {
          return false;
        }
      },
      setCodeCellTags: function(name, tags) {
        if (getCurrentApp() && getCurrentApp().setCodeCellTags) {
          return getCurrentApp().setCodeCellTags(name, tags);
        } else {
          return false;
        }
      },
      getVersionNumber: function () {
        return window.beakerRegister.version;
      },
      getVersionString: function () {
        return window.beakerRegister.versionString;
      },
      getPluginStartFailedMessage: function (pluginId) {
        var template;
        if(window.beakerRegister.evaluatorStartFailedMessage) {
          template = window.beakerRegister.evaluatorStartFailedMessage;
        } else {
          template = "<p>Failed to start ${pluginId}.</p>\n" +
                    "<p>Did you install it according to the instructions\n" +
                    "on <a target=\"_blank\" href=\"http://beakernotebook.com/getting-started#${pluginId}\">BeakerNotebook.com</a>?\n" +
                    "</p>\n" +
                    "<p>If you already have it, then <a target=\"_blank\"\n" +
                    "href=\"https://github.com/twosigma/beaker-notebook/wiki/Language-Preferences\">edit\n" +
                    "your preferences file</a> to help Beaker find it on your system, and\n" +
                    "then restart Beaker and try again.\n" +
                    "</p>\n" +
                    "<p>Any other languages in your notebook should still work.</p>";
        }
        return template.split('${pluginId}').join(pluginId);
      },
      // bk-notebook
      refreshBkNotebook: function () {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.refreshScope();
        }
      },
      deleteAllOutputCells: function() {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.deleteAllOutputCells();
        }
      },
      getBkNotebookViewModel: function() {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.getViewModel();
        }
      },
      setInputCellKeyMapMode: function(keyMapMode) {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.setCMKeyMapMode(keyMapMode);
        }
      },
      getInputCellKeyMapMode: function() {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.getCMKeyMapMode();
        }
      },
      setInputCellTheme: function(theme) {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.setCMTheme(theme);
        }
      },
      getInputCellTheme: function() {
        var bkNotebook = getBkNotebookWidget();
        if (bkNotebook) {
          return bkNotebook.getCMTheme();
        }
      },

      // low level utils (bkUtils)
      refreshRootScope: function() {
        return bkUtils.refreshRootScope();
      },
      loadJS: function(url, success) {
        return bkUtils.loadJS(url, success);
      },
      loadCSS: function(url) {
        return bkUtils.loadCSS(url);
      },
      loadList: function(url, success, failure) {
        return bkUtils.loadList(url, success, failure);
      },
      findTable: function(elem) {
        return bkUtils.findTable(elem);
      },
      generateId: function(length) {
        return bkUtils.generateId(length);
      },
      serverUrl: function(path) {
        return bkUtils.serverUrl(path);
      },
      fileUrl: function(path) {
        return bkUtils.fileUrl(path);
      },
      httpGet: function(url, data) {
        return bkUtils.httpGet(url, data);
      },
      httpPost: function(url, data) {
        return bkUtils.httpPost(url, data);
      },
      spinUntilReady: function(url) {
        return bkUtils.spinUntilReady(url);
      },
      newDeferred: function() {
        return bkUtils.newDeferred();
      },
      newPromise: function(value) {
        return bkUtils.newPromise(value);
      },
      all: function(promises) {
        return bkUtils.all(promises);
      },
      fcall: function(func) {
        return bkUtils.fcall(func);
      },
      timeout: function(func, ms) {
        return bkUtils.timeout(func,ms);
      },
      cancelTimeout: function(promise) {
        return bkUtils.cancelTimeout(promise);
      },
      getHomeDirectory: function() {
        return bkUtils.getHomeDirectory();
      },
      getWorkingDirectory: function() {
        return bkUtils.getWorkingDirectory();
      },
      saveFile: function(path, contentAsJson, overwrite) {
        return bkUtils.saveFile(path, contentAsJson, overwrite);
      },
      loadFile: function(path) {
        return bkUtils.loadFile(path);
      },

      // utils (bkCore)
      setNotebookImporter: function(format, importer) {
        return bkCoreManager.setNotebookImporter(format, importer);
      },
      setFileLoader: function(uriType, fileLoader) {
        return bkCoreManager.setFileLoader(uriType, fileLoader);
      },
      setFileSaver: function(uriType, fileSaver) {
        return bkCoreManager.setFileSaver(uriType, fileSaver);
      },
      showFileSaveDialog: function(data) {
        return bkCoreManager.showFileSaveDialog(data);
      },
      showSQLLoginModalDialog: function(connectionName, connectionString, user, okCB, cancelCB) {
        return bkCoreManager.showSQLLoginModalDialog(connectionName, connectionString, user, okCB, cancelCB);
      },
      getRecentMenuItems: function() {
        return bkCoreManager.getRecentMenuItems();
      },
      showModalDialog: function(callback, template, strategy) {
        return bkCoreManager.showModalDialog(callback, template, strategy).result;
      },
      showErrorModal: function (msgBody, msgHeader, errorDetails, callback) {
        return bkCoreManager.showErrorModal(msgBody, msgHeader, errorDetails, callback);
      },
      show1ButtonModal: function(msgBody, msgHeader, callback) {
        return bkCoreManager.show1ButtonModal(msgBody, msgHeader, callback);
      },
      show2ButtonModal: function(msgBody, msgHeader, okCB, cancelCB, okBtnTxt, cancelBtnTxt) {
        return bkCoreManager.show2ButtonModal(
            msgBody, msgHeader, okCB, cancelCB, okBtnTxt, cancelBtnTxt);
      },
      show3ButtonModal: function(
          msgBody, msgHeader, yesCB, noCB, cancelCB, yesBtnTxt, noBtnTxt, cancelBtnTxt) {
        return bkCoreManager.show3ButtonModal(
            msgBody, msgHeader, yesCB, noCB, cancelCB, yesBtnTxt, noBtnTxt, cancelBtnTxt);
      },
      showMultipleButtonsModal: function(params) {
        return bkCoreManager.showMultipleButtonsModal(params);
      },
      getFileSystemFileChooserStrategy: function() {
        return bkCoreManager.getFileSystemFileChooserStrategy();
      },

      // eval utils
      locatePluginService: function(id, locator) {
        return bkUtils.httpGet(bkUtils.serverUrl("beaker/rest/plugin-services/" + id), locator);
      },
      getEvaluatorFactory: function(shellConstructorPromise) {
        return shellConstructorPromise.then(function(Shell) {
          return {
            create: function(settings) {
              return bkUtils.newPromise(new Shell(settings));
            }
          };
        });
      },
      showLanguageManager: function () {
        return bkCoreManager.showLanguageManager();
      },
      showSparkConfiguration: function () {
        return bkCoreManager.showSparkConfiguration();
      },
      appendCodeCell: function () {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var currentCellId = $(':focus').parents('bk-cell').attr('cellid');
        var newCell;
        if (currentCellId) {
          var cell = notebookCellOp.getCell(currentCellId);
          var evaluator = cell.type === 'code' ? cell.evaluator : defaultEvaluator;
          newCell = bkSessionManager.getNotebookNewCellFactory().newCodeCell(evaluator);
          notebookCellOp.insertAfter(currentCellId, newCell);
        } else {
          newCell = bkSessionManager.getNotebookNewCellFactory().newCodeCell(defaultEvaluator);
          notebookCellOp.insertLast(newCell);
        }
        bkUtils.refreshRootScope();
        this.go2Cell(newCell.id);
      },
      appendTextCell: function () {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var newCell = bkSessionManager.getNotebookNewCellFactory().newMarkdownCell();
        var currentCellId = $(':focus').parents('bk-cell').attr('cellid');
        if (currentCellId) {
          notebookCellOp.insertAfter(currentCellId, newCell);
        } else {
          notebookCellOp.insertLast(newCell);
        }
        bkUtils.refreshRootScope();
        this.go2Cell(newCell.id);
      },
      insertCodeCellAbove: function () {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var currentCellId = $(':focus').parents('bk-cell').attr('cellid');
        var newCell;
        if (currentCellId) {
          var cell = notebookCellOp.getCell(currentCellId);
          var evaluator = cell.type === 'code' ? cell.evaluator : defaultEvaluator;
          newCell = bkSessionManager.getNotebookNewCellFactory().newCodeCell(evaluator);
          notebookCellOp.insertBefore(currentCellId, newCell);
        } else {
          newCell = bkSessionManager.getNotebookNewCellFactory().newCodeCell(defaultEvaluator);
          notebookCellOp.insertFirst(newCell);
        }
        bkUtils.refreshRootScope();
        this.go2Cell(newCell.id);
      },
      raiseSectionLevel: function () {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var currentCellId = $(':focus').parents('bk-cell').attr('cellid');
        if (currentCellId) {
          var cell = notebookCellOp.getCell(currentCellId);
          if (cell.type === 'section' && cell.level > 1) {
            cell.level--;
            notebookCellOp.reset();
          }
        }
      },
      lowerSectionLevel: function () {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var currentCellId = $(':focus').parents('bk-cell').attr('cellid');
        if (currentCellId) {
          var cell = notebookCellOp.getCell(currentCellId);
          if (cell.type === 'section' && cell.level < 4) {
            cell.level++;
            notebookCellOp.reset();
          }
        }
      },
      insertNewSectionWithLevel: function (level) {
        bkSessionManager.setNotebookModelEdited(true);
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var currentCellId = $(':focus').parents('bk-cell').attr('cellid');
        var newCell;
        if (currentCellId){
          var cell = notebookCellOp.getCell(currentCellId);
          newCell = bkSessionManager.getNotebookNewCellFactory().newSectionCell(level);
          notebookCellOp.insertAfter(currentCellId, newCell);
        } else {
          newCell = bkSessionManager.getNotebookNewCellFactory().newSectionCell(level);
          notebookCellOp.insertFirst(newCell);
        }
        bkUtils.refreshRootScope();
        this.go2Cell(newCell.id);
      },
      showPublishForm: function() {
        return bkCoreManager.showPublishForm();
      },
      isSignedIn: function() {
        return bkPublicationAuth.isSignedIn();
      },
      signOutFromPublications: function() {
        return bkPublicationAuth.signOut();
      },
      // other JS utils
      updateCellsFromDOM: function(cells) {
        function convertCanvasToImage(elem) {
          if (elem.nodeName == 'CANVAS') {
            var img = document.createElement('img');
            img.src = elem.toDataURL();
            return img;
          }
          var childNodes = elem.childNodes;
          for (var i = 0; i < childNodes.length; i++) {
            var result = convertCanvasToImage(childNodes[i]);
            if (result != childNodes[i]) {
              elem.replaceChild(result, childNodes[i]);
            }
          }
          return elem;
        }

        for(var i = 0; i < cells.length; i++){
          var cell = cells[i];
          if (cell.type === 'section') { continue; }
          var elem = $("bk-cell[cellid='" + cell.id +"']");
          var body = elem.find( "bk-output-display[type='Html'] div div" );
          if(body.length > 0){

            // 2.5) search for any canvas elements in body and replace each with an image.
            body = convertCanvasToImage(body[0]);

            // 2) convert that part of the DOM to a string
            var newOutput = body.innerHTML;

            // 3) set the result.object to that string.
            var res = cell.output.result;
            if (res.innertype === "Html") {
              res.object = newOutput;
            }
          }
        }
      },
      sanitizeNotebookModel: function(m) {
        var notebookModelCopy = angular.copy(m);
        bkHelper.stripOutBeakerPrefs(notebookModelCopy);
        bkHelper.stripOutBeakerLanguageManagerSettings(notebookModelCopy);
        bkHelper.stripOutBeakerClient(notebookModelCopy);
        delete notebookModelCopy.evaluationSequenceNumber; //remove evaluation counter
        if (notebookModelCopy.cells) {
          for (var i = 0; i < notebookModelCopy.cells.length; i++) {
            var currentCell = notebookModelCopy.cells[i];
            if (currentCell && currentCell.output) {

              //save output height
              var cellId = currentCell.id;
              var output = $("[cellid=" + cellId + "] div.code-cell-output");
              if (output && output[0]) {
                currentCell.output.height = output[0].offsetHeight;
              }

              //Save running cells as interrupted
              if (currentCell.output.result && currentCell.output.result.innertype === 'Progress') {
                currentCell.output.result.innertype = 'Error';
                currentCell.output.result.object = 'Interrupted, saved while running.'
              }

              //remove update_id to avoid subscribing to a nonexistent object
              if (currentCell.output.result) {
                delete currentCell.output.result.update_id;
              }

              //remove evaluation counter
              delete currentCell.output.evaluationSequenceNumber;
            }
          }
        }

        //strip out the shell IDs
        _.each(notebookModelCopy.evaluators, function(evaluator) {
          if (_.isObject(evaluator)) delete evaluator.shellID;
        });

        // apply hooks
        if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.preSave !== undefined) {
          notebookModelCopy = window.beakerRegister.hooks.preSave(notebookModelCopy);
        }
        
        // generate pretty JSON
        var prettyJson = bkUtils.toPrettyJson(notebookModelCopy);
        return prettyJson;
      },
      updateDocumentModelFromDOM: function(id) {
        // 1) find the cell that contains elem
        var elem = $("#" + id).closest("bk-cell");
        if (elem === undefined || elem[0] === undefined) {
          console.log("ERROR: cannot find an Html cell containing the element '" + id + "'.");
          return;
        }
        var cellid = elem[0].getAttribute("cellid");
        if (cellid === undefined) {
          console.log("ERROR: cannot find an Html cell containing the element '" + id + "'.");
          return;
        }
        var cell = bkCoreManager.getNotebookCellManager().getCell(cellid);
        if (cell === undefined) {
          console.log("ERROR: cannot find an Html cell containing the element '" + id + "'.");
          return;
        }
        this.updateCellsFromDOM([cell]);
      },

      // language plugin utilities
      setupProgressOutput: function(modelOutput) {
        var progressObj = {
            type: "BeakerDisplay",
            innertype: "Progress",
            object: {
              message: "submitting ...",
              startTime: new Date().getTime(),
              outputdata: [],
              payload: undefined
            }
          };
        modelOutput.result = progressObj;
      },
      printCanceledAnswer: function(modelOutput) {
        var progressObj = {
          type: "BeakerDisplay",
          innertype: "Error",
          object: "No password provided."
        };
        modelOutput.result = progressObj;
      },
      setupCancellingOutput: function(modelOutput) {
        if (modelOutput.result.type !== "BeakerDisplay" || modelOutput.result.innertype !== "Progress")
          setupProgressOutput(modelOutput);
        modelOutput.result.object.message = "cancelling ...";
      },
      printEvaluationProgress: function (modelOutput, text, outputType) {
        this.receiveEvaluationUpdate(modelOutput,
          {outputdata:[{type:outputType, value: text+"\n"}]}, "JavaScript");
        // XXX should not be needed but when progress meter is shown at same time
        // display is broken without this, you get "OUTPUT" instead of any lines of text.
        this.refreshRootScope();
      },  
      receiveEvaluationUpdate: function(modelOutput, evaluation, pluginName, shellId) {
        var beakerObj = bkHelper.getBeakerObject().beakerObj;
        var maxNumOfLines = beakerObj.prefs
            && beakerObj.prefs.outputLineLimit ? beakerObj.prefs.outputLineLimit : 1000;

        if (modelOutput.result !== undefined)
          modelOutput.result.status = evaluation.status;

        // save information to handle updatable results in displays
        modelOutput.pluginName = pluginName;
        modelOutput.shellId = shellId;

        // append text output (if any)
        if (evaluation.outputdata !== undefined && evaluation.outputdata.length>0) {
          var idx;
          for (idx=0; idx<evaluation.outputdata.length>0; idx++) {
            modelOutput.result.object.outputdata.push(evaluation.outputdata[idx]);
          }
          var cnt = 0;
          for (idx = 0; idx < modelOutput.result.object.outputdata.length; idx++) {
            var l = modelOutput.result.object.outputdata[idx].value.split(/\n/).length;
            if (l > 0)
              cnt += l - 1;
          }
          if (cnt > maxNumOfLines) {
            cnt -= maxNumOfLines;
            while(cnt > 0) {
              var l = modelOutput.result.object.outputdata[0].value.split(/\n/).length;
              if (l<=cnt) {
                modelOutput.result.object.outputdata.splice(0,1);
                cnt -= l;
              } else {
                var a = modelOutput.result.object.outputdata[0].value.split(/\n/);
                a.splice(0,cnt);
                modelOutput.result.object.outputdata[0].value = '...\n' + a.join('\n');
                cnt = 0;
              }
            }
          }
        }

        if (modelOutput.result === undefined) {
          console.log("WARNING: this should not happen - your plugin javascript is broken!");
          setupProgressOutput(modelOutput);
        }

        // now update payload (if needed)
        if (evaluation.payload !== undefined && modelOutput.result !== undefined && modelOutput.result.object !== undefined) {
          modelOutput.result.object.payload = evaluation.payload;
        }

        if (modelOutput.result.object !== undefined) {
          if (modelOutput.result.object.payload === undefined) {
            if (modelOutput.result.object.outputdata.length > 0) {
              modelOutput.result.object.payload = { type : "Results", outputdata : modelOutput.result.object.outputdata, payload : undefined };
            }
          } else if (modelOutput.result.object.payload.type === "Results") {
            modelOutput.result.object.payload.outputdata = modelOutput.result.object.outputdata;
          } else if (modelOutput.result.object.outputdata.length > 0) {
            modelOutput.result.object.payload = { type : "Results", outputdata : modelOutput.result.object.outputdata, payload : modelOutput.result.object.payload };
          }
        }

        if (evaluation.status === "FINISHED") {
          if (evaluation.payload === undefined) {
            if (modelOutput.result.object.payload !== undefined && modelOutput.result.object.payload.type === "Results")
              evaluation.payload = modelOutput.result.object.payload.payload;
            else
              evaluation.payload = modelOutput.result.object.payload;
          }
          modelOutput.elapsedTime = new Date().getTime() - modelOutput.result.object.startTime;

          if (modelOutput.result.object.outputdata.length === 0) {
            // single output display
            modelOutput.result = evaluation.payload;
          } else {
            // wrapper display with standard output and error
            modelOutput.result = { type : "Results", outputdata : modelOutput.result.object.outputdata, payload : evaluation.payload };
            // build output container
          }
          if (evaluation.jsonres !== undefined)
            modelOutput.dataresult = evaluation.jsonres;
        } else if (evaluation.status === "ERROR") {
          if (evaluation.payload === undefined) {
            if (modelOutput.result.object.payload !== undefined && modelOutput.result.object.payload.type === "Results")
              evaluation.payload = modelOutput.result.object.payload.payload;
            else
              evaluation.payload = modelOutput.result.object.payload;
          }
          if (evaluation.payload !== undefined && $.type(evaluation.payload)=='string') {
            evaluation.payload = evaluation.payload.split('\n');
          }
          modelOutput.elapsedTime = new Date().getTime() - modelOutput.result.object.startTime;

          if (modelOutput.result.object.outputdata.length === 0) {
            // single output display
            modelOutput.result = {
              type: "BeakerDisplay",
              innertype: "Error",
              object: evaluation.payload
            };
          } else {
            // wrapper display with standard output and error
            modelOutput.result = { type : "Results", outputdata : modelOutput.result.object.outputdata, payload : { type: "BeakerDisplay", innertype: "Error", object: evaluation.payload } };
          }
        } else if (evaluation.status === "RUNNING") {
          if (evaluation.message === undefined)
            modelOutput.result.object.message     = "running...";
          else
            modelOutput.result.object.message     = evaluation.message;
          modelOutput.result.object.progressBar   = evaluation.progressBar;
        }

        return (evaluation.status === "FINISHED" || evaluation.status === "ERROR");
      },
      getUpdateService: function() {
        var cometdUtil = {
            initialized: false,
            subscriptions: { },
            init: function(pluginName, serviceBase) {
              if (!this.initialized) {
                this.cometd = new $.Cometd();
                this.cometd.init(bkUtils.serverUrl(serviceBase + "/cometd/"));
                var self = this;
                this.hlistener = this.cometd.addListener('/meta/handshake', function(message) {
                  if (window.bkDebug) console.log(pluginName+'/meta/handshake');
                  if (message.successful) {
                    this.cometd.batch(function() {
                      var k;
                      for (k in Object.keys(self.subscriptions))
                      {
                        self.subscriptions[k] = self.cometd.resubscribe(self.subscriptions[k]);
                      }
                    });
                  }
                });
                this.initialized = true;
              }
            },
            destroy: function() {
              if (this.initialized) {
                this.cometd.removeListener(this.hlistener);
                var k;
                for (k in Object.keys(this.subscriptions))
                {
                  this.cometd.unsubscribe(this.subscriptions[k]);
                }
              }
              this.initialized = true;
              this.cometd = null;
              this.subscriptions = { };
            },
            subscribe: function(update_id, callback) {
              if (!update_id)
                return;
              if (window.bkDebug) console.log('subscribe to '+update_id);
              if (this.subscriptions[update_id]) {
                this.cometd.unsubscribe(this.subscriptions[update_id]);
                this.subscriptions[update_id] = null;
              }
              var cb = function(ret) {
                callback(ret.data);
              };
              var s = this.cometd.subscribe('/object_update/' + update_id, cb);
              this.subscriptions[update_id] = s;
            },
            unsubscribe: function(update_id) {
              if (!update_id)
                return;
              if (window.bkDebug) console.log('unsubscribe from '+update_id);
              if (this.subscriptions[update_id]) {
                this.cometd.unsubscribe(this.subscriptions[update_id]);
                this.subscriptions[update_id] = null;
              }
            },
            issubscribed: function(update_id) {
              if (!update_id)
                return false;
              return this.subscriptions[update_id] !== null;
            }
        };
        return cometdUtil;
      },
      showLanguageManagerSpinner: function(pluginName) {
        bkUtils.showLanguageManagerSpinner(pluginName);
      },
      hideLanguageManagerSpinner: function(error) {
        bkUtils.hideLanguageManagerSpinner(error);
      },
      asyncCallInLanguageManager: function(settings) {
        bkUtils.showLanguageManagerSpinner(settings.pluginName);

        bkUtils.httpPost(settings.url, settings.data).success(function(ret) {
          bkUtils.hideLanguageManagerSpinner();
          settings.onSuccess && settings.onSuccess(ret);
        }).error(function(response) {
          var statusText = response ? response.statusText : "No response from server";

          bkUtils.hideLanguageManagerSpinner(statusText);
          console.error("Request failed: " + statusText);
          settings.onFail && settings.onFail(statusText);
        });
      },

      winHeight: function () {
        return window.innerHeight || (document.documentElement || document.body).clientHeight;
      },

      isFullScreen: function (cm) {
        return /\bCodeMirror-fullscreen\b/.test(cm.getWrapperElement().className);
      },

      setFullScreen: function (cm, full) {
        var wrap = cm.getWrapperElement();
        if (full) {
          wrap.className += ' CodeMirror-fullscreen';
          wrap.style.height = this.winHeight() + 'px';
          document.documentElement.style.overflow = 'hidden';
        } else {
          wrap.className = wrap.className.replace(' CodeMirror-fullscreen', '');
          wrap.style.height = '';
          document.documentElement.style.overflow = '';
        }
        cm.refresh();
      },

      elfinder: function($elfinder, elfinderOptions){
        var elfinder;

        elFinder.prototype.i18.en.messages['cmdeditpermissions'] = 'Edit Permissions';
        elFinder.prototype._options.commands.push('editpermissions');
        elFinder.prototype._options.contextmenu.files.push('copypath');
        elFinder.prototype._options.contextmenu.cwd.push('editpermissions');

        elFinder.prototype._options.commands.push('copypath');
        elFinder.prototype._options.contextmenu.files.push('copypath');
        elFinder.prototype._options.contextmenu.cwd.push('copypath');
        elFinder.prototype.i18.en.messages['cmdcopypath'] = 'Copy Path';
        elFinder.prototype.commands.copypath = function() {
          this.exec = function(hashes) {
            bkCoreManager.show1ButtonModal(
              "<p><input type='text' autofocus onfocus='this.select();' style='width: 100%' value='"+elfinder.path(hashes[0])+"'></p>",
              "Copy to clipboard: "+ (bkHelper.isMacOS ? "&#x2318;" : "Ctrl") + "+C");

          };
          this.getstate = function() {
            //return 0 to enable, -1 to disable icon access
            return 0;
          }
        };
        elfinder = $elfinder.elfinder(elfinderOptions).elfinder('instance');
        return elfinder;
      },

      //http://stackoverflow.com/questions/7370943/retrieving-binary-file-content-using-javascript-base64-encode-it-and-reverse-de
      base64Encode: function(str) {
        var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        var out = "", i = 0, len = str.length, c1, c2, c3;
        while (i < len) {
          c1 = str.charCodeAt(i++) & 0xff;
          if (i == len) {
            out += CHARS.charAt(c1 >> 2);
            out += CHARS.charAt((c1 & 0x3) << 4);
            out += "==";
            break;
          }
          c2 = str.charCodeAt(i++);
          if (i == len) {
            out += CHARS.charAt(c1 >> 2);
            out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            out += CHARS.charAt((c2 & 0xF) << 2);
            out += "=";
            break;
          }
          c3 = str.charCodeAt(i++);
          out += CHARS.charAt(c1 >> 2);
          out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
          out += CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
          out += CHARS.charAt(c3 & 0x3F);
        }
        return out;
      },

      getVolume : function(elfinder)  {
        var cwd = elfinder.cwd();
        var phash = cwd.phash;
        var file = elfinder.file(cwd.hash);
        while (phash) {
          file = elfinder.file(phash);
          phash = file.phash;
        }
        return file;
      },

      path2hash : function (elfinder, path){

        var file = bkHelper.getVolume(elfinder);

        var _hash_ = function (path) {
          path = path.replace(file.name, '');
          var base = bkHelper.base64Encode(path);
          return file.hash + base
              .replace(/\+/g, "_P")
              .replace(/\-/g, "_M")
              .replace(/\\/g, "_S")
              .replace(/\./g, "_D")
              .replace(/=/g, "_E");
        };

        var _cached_ = function(hash){
          var files = elfinder.files();
          var _hashes = Object.keys(files);
          for (var i=0; i< _hashes.length; i++){
            var _hash = _hashes[i];
            if (_hash === hash)
              return true;
          }
          return false;
        };
        var hash = _hash_(path);
        var hashes = [];
        hashes.push(hash);

        while(!_cached_(hash)){
          path = path.substring(0, path.lastIndexOf(bkUtils.serverOS.isWindows() ? '\\' : '/'));
          hash = _hash_(path);
          hashes.push(hash);
        }
        return hashes;
      },

      elfinderOptions: function (getFileCallback, selectCallback, openCallback, mime, showHiddenFiles) {
        
        function getNavbarMenuItems() {
          var items = ['copy', 'cut', 'paste', 'duplicate', '|', 'rm'];
          if(!bkUtils.serverOS.isWindows()) {
            items.push('|', 'editpermissions');
          }
          return items;
        }
        
        function getToolbarItems() {
          var toolbar = [
            ['back', 'forward'],
            ['mkdir'],
            ['copy', 'cut', 'paste'],
            ['rm'],
            ['duplicate', 'rename'],
            ['view', 'sort']
          ];
          if(!bkUtils.serverOS.isWindows()) {
            toolbar.push(['editpermissions']);
          }
          return toolbar;
        }
        
        function getFileContextMenuItems() {
          var items = [
            'copy', 'copypath', 'cut', 'paste', 'duplicate', '|',
            'rm', 'rename'
          ];
          if(!bkUtils.serverOS.isWindows()) {
            items.push('|', 'editpermissions');
          }
          return items;
        }

        return {
          url: bkHelper.serverUrl('beaker/connector'),
          useBrowserHistory: false,
          resizable: false,
          onlyMimes: mime,
          dragUploadAllow: false,
          showHiddenFiles: showHiddenFiles,
          getFileCallback: function (url) {
            if (getFileCallback)
              getFileCallback(url);
          },
          handlers: {
            select: function (event, elfinderInstance) {
              if (selectCallback)
                selectCallback(event, elfinderInstance);
            },
            open: function (event, elfinderInstance) {
              if (openCallback)
                openCallback(event, elfinderInstance);
            }
          },
          defaultView: 'icons',
          contextmenu: {
            // navbarfolder menu
            navbar: getNavbarMenuItems(),

            // current directory menu
            cwd: ['reload', 'back', '|', 'mkdir', 'paste'],

            // current directory file menu
            files: getFileContextMenuItems()
          },
          uiOptions: {
            // toolbar configuration
            toolbar: getToolbarItems(),

            // navbar options
            navbar: {
              minWidth: 150,
              maxWidth: 1200
            },

            // directories tree options
            tree: {
              // expand current root on init
              openRootOnLoad: false,
              // auto load current dir parents
              syncTree: true
            }
          }
        }
      },

      isElectron: bkUtils.isElectron,
      isMacOS: bkUtils.isMacOS
    };

    return bkHelper;
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
  var module = angular.module('bk.menuPluginManager', ['bk.utils', 'bk.electron']);

  var utils = (function() {
    var DEFAULT_PRIORITY = 0;
    // add newItem to itemsList, if an item with same name already exists in itemsList,
    // compare priorities, if newItem.priority > existingItem.priority, newItem will
    // replace the existingItem in place.
    //
    // if newItem already exists in itemsList with the same priority and has type submenu then merge submenus' items
    var addMenuItem = function(itemsList, newItem) {
      // check if an entry with same name already exist
      var existingItem = _.find(itemsList, function(it) {
        return it.name === newItem.name;
      });
      if (existingItem) {
        existingItem.priority = existingItem.priority ? existingItem.priority : DEFAULT_PRIORITY;
        newItem.priority = newItem.priority ? newItem.priority : DEFAULT_PRIORITY;
        if (existingItem.type === 'submenu' && newItem.priority === existingItem.priority) {
          //merge submenu items
          if(newItem.items){
            newItem.items.forEach(function (item) {
              addMenuItem(existingItem.items, item);
            });
          }
        } else if (newItem.priority >= existingItem.priority) {
          // replace in place
          itemsList.splice(itemsList.indexOf(existingItem), 1, newItem);
        } else {
          // ignore and warn
          console.warn("ignoring menu item " + newItem.name + "because priority="
              + newItem.priority + "is smaller than existing (" + existingItem.priority + ")");
        }
      } else {
        itemsList = itemsList.push(newItem);
      }
    };
    return {
      addMenuItems: function (parentMenu, items) {
        if (_.isFunction(items)) {
          parentMenu.items = items;
        } else {
          items.forEach(function (item) {
            addMenuItem(parentMenu.items, item);
          });
        }
      }
    };
  })();

  module.factory('bkMenuPluginManager', function(bkUtils, bkElectron) {

    var menus = {};
    var loadedPlugins = [];
    var loadingInProgressPluginJobs = [];
    var pluginIndex = 0;
    var menuChanged = false;

    var addPlugin = function(plugin, pluginIndex, secondaryIndex) {
      if (!plugin) {
        return;
      }

      var parentMenu = _.find(_.values(menus), function(it) {
        return it.name === plugin.parent;
      });

      if (!parentMenu) {
        parentMenu = {
          name: plugin.parent,
          items: [],
          index: pluginIndex,
          secondaryIndex: secondaryIndex,
          sortorder: plugin.sortorder,
          classNames: plugin.id
        };
        menus[pluginIndex + '_' + secondaryIndex + '_' + parentMenu.name] = parentMenu;
        menuChanged = true;
      } else {
        if (pluginIndex < parentMenu.index
            || (pluginIndex === parentMenu.index && secondaryIndex < parentMenu.secondaryIndex)) {
          delete menus[parentMenu.index + '_' + parentMenu.secondaryIndex + '_' + parentMenu.name];
          menus[pluginIndex + '_' + secondaryIndex + '_' + parentMenu.name] = parentMenu;
          parentMenu.index = pluginIndex;
          menuChanged = true;
        }
      }

      if (!plugin.submenu) {
        utils.addMenuItems(parentMenu, plugin.items);
        if (! _.isFunction(parentMenu.items)) {
          parentMenu.items.sort(function(a,b) {
            if (a.sortorder !== undefined && b.sortorder !== undefined) {
              return a.sortorder>b.sortorder;
            }
            return a.sortorder !== undefined;
          });
        }
      } else {
        var subMenu = _.find(parentMenu.items, function(it) {
          return it.name === plugin.submenu;
        });
        if (!subMenu) {
          subMenu = {
            name: plugin.submenu,
            type: "submenu",
            items: [],
            sortorder: plugin.submenusortorder
          };
          parentMenu.items.push(subMenu);
          if (! _.isFunction(parentMenu.items)) {
            parentMenu.items.sort(function(a,b) {
              if (a.sortorder !== undefined && b.sortorder !== undefined) {
                return a.sortorder>b.sortorder;
              }
              return a.sortorder !== undefined;
            });
          }
        } else {
          subMenu.disabled = false;
          subMenu.type = "submenu";
          if (!subMenu.items) {
            subMenu.items = [];
          }
        }
        utils.addMenuItems(subMenu, plugin.items);
        if (! _.isFunction(subMenu.items)) {
          subMenu.items.sort(function(a,b) {
            if (a.sortorder !== undefined && b.sortorder !== undefined) {
              return a.sortorder>b.sortorder;
            }
            return a.sortorder !== undefined;
          });
        }
      }
      if (bkUtils.isElectron && menuChanged){
        bkElectron.updateMenus(menus);
      }
    };

    var getLoadMenuPluginJob = function(url) {
      var cancelled = false;
      return {
        getUrl: function() {
          return url;
        },
        cancel: function () {
          cancelled = true;
        },
        isCancelled: function() {
          return cancelled;
        }
      };
    };
    var loadPlugin = function(job) {
      return bkUtils.loadModule(job.getUrl()).then(function(menuPlugin) {
        if (job.isCancelled()) {
          throw "cancelled";
        }
        return menuPlugin.getMenuItems().then(function(menuItems) {
          if (job.isCancelled()) {
            throw "cancelled";
          }
          return menuItems;
        });
      });
    };

    return {
      loadMenuPlugin: function(url) {
        var job = getLoadMenuPluginJob(url);
        var index = pluginIndex++;
        loadPlugin(job).then(function(plugin) {
          loadedPlugins.push({url: job.getUrl()});
          if (_.isArray(plugin)) {
            _.each(plugin, function (item, i) {
              addPlugin(item, index, i);
            });
          } else {
            addPlugin(plugin, index, 0);
          }
        }, function(rejection) {
          console.error(rejection);
        }).finally(function() {
          loadingInProgressPluginJobs.splice(loadingInProgressPluginJobs.indexOf(job), 1);
        });
        loadingInProgressPluginJobs.push(job);
      },
      attachMenus: function(plugin) {
        var index = pluginIndex++;
        if (_.isArray(plugin)) {
          _.each(plugin, function (item, i) {
            addPlugin(item, index, i);
          });
        } else {
          addPlugin(plugin, index, 0);
        }
      },
      getMenus: function() {
        return _.values(menus);
      },
      clear: function() {
        menus = {};
        _.each(loadingInProgressPluginJobs, function(job) {
          job.cancel();
        });
        pluginIndex = 0;
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

// extension for Bootstrap dropdown.js
// navigation using left and right arrows
(function ($) {

  var KEY_CODES = {
    ARROW_LEFT: 37,
    ARROW_RIGHT: 39
  };

  var toggle = '[data-toggle="dropdown"]';

  var getMenuToggle = function (el, prev) {
    var menu = el.closest('.dropdown');
    return menu[prev ? 'prev' : 'next']().find(toggle);
  };

  var getNextMenuToggle = function (el) {
    return getMenuToggle(el, false);
  };

  var getPrevMenuToggle = function (el) {
    return getMenuToggle(el, true);
  };

  var isSubmenu = function (el) {
    var parent = el.parents('ul');
    return parent.hasClass('dropdown-menu') && parent.parent().hasClass('dropdown-submenu');
  };

  var isSubmenuToggle = function (el) {
    return el.parent().hasClass('dropdown-submenu');
  };

  var openSubmenu = function (el) {
    var submenu = el.parent();
    submenu.addClass('hover');
    submenu.addClass('open');
    submenu.find('.dropdown-menu > li:first > a').trigger('focus');
  };

  var closeSubmenu = function (submenu) {
    submenu.removeClass('open');
    submenu.removeClass('hover');
  };

  var clearMenus = function () {
    closeSubmenu($('.dropdown-submenu'));
  };

  function getParent($this) {
    var selector = $this.attr('data-target')

    if (!selector) {
      selector = $this.attr('href')
      selector = selector && /#[A-Za-z]/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '') // strip for ie7
    }

    var $parent = selector && $(selector)

    return $parent && $parent.length ? $parent : $this.parent()
  }

  var extensionMethods = {
    keydown: function (e) {
      if (!/(37|39|38|40|27|32)/.test(e.which) || /input|textarea/i.test(e.target.tagName)) return;
      e.preventDefault();
      e.stopPropagation();
      var keyCode = e.keyCode;
      if (_.values(KEY_CODES).indexOf(keyCode) > -1) {
        var jqEl = $(e.target);
        switch (event.keyCode) {
          case KEY_CODES.ARROW_LEFT:
            if (isSubmenu(jqEl)) {
              var submenu = jqEl.parents('.dropdown-submenu');
              closeSubmenu(submenu);
              submenu.find('a:first').trigger('focus');
            } else {
              getPrevMenuToggle(jqEl).trigger('click');
              clearMenus();
            }
            break;
          case KEY_CODES.ARROW_RIGHT:
            if(isSubmenuToggle(jqEl)){
              openSubmenu(jqEl);
            } else {
              getNextMenuToggle(jqEl).trigger('click');
            }
            break;
        }
      } else {
        ///// copy from Bootstrap dropdown.js/////
        var $this = $(this);

        if ($this.is('.disabled, :disabled')) return

        var $parent  = getParent($this)
        var isActive = $parent.hasClass('open')

        if (!isActive && e.which != 27 || isActive && e.which == 27) {
          if (e.which == 27) $parent.find(toggle).trigger('focus')
          return $this.trigger('click')
        }

        ///// fix for navigation through items containing submenus /////
        var desc = ' li:not(.disabled):visible a:not(.disabled):visible';
        ///// fix for navigation through items containing submenus /////

        var $items = $parent.find('.dropdown-menu' + desc)

        if (!$items.length) return

        var index = $items.index(e.target)

        if (e.which == 38 && index > 0)                 index--         // up
        if (e.which == 40 && index < $items.length - 1) index++         // down
        if (!~index)                                    index = 0

        $items.eq(index).trigger('focus')
        ///// copy from Bootstrap dropdown.js /////
      }
    }
  };
  $.extend(true, $.fn.dropdown.Constructor.prototype, extensionMethods);

  $(document)
    .off('keydown.bs.dropdown.data-api', '.dropdown-menu')
    .off('keydown.bs.dropdown.data-api', toggle);
  $(document)
    .on('keydown.bs.dropdown.data-api', toggle, $.fn.dropdown.Constructor.prototype.keydown)
    .on('keydown.bs.dropdown.data-api', '.dropdown-menu', $.fn.dropdown.Constructor.prototype.keydown)
    .on('mouseenter.bs.dropdown.data-api', '.dropdown-menu, .dropdown', clearMenus);
  
  //dropdown behaviour correction

  $(document)
  .on('mouseover', '.dropdown-menu', function() {
    $(this).css('display', 'block');
    if ($(this).closest('.dropdown').find(this).length>0){
      $(this).siblings('.dropdown-menu').css('display', 'block');
    }
  })
  .on('mouseover', '.dropdown-menu > li > a', function() {
    if ($(this).siblings('.dropdown-menu').size() == 0){
      var removeStyleFrom = $(this).parent().siblings().find('.dropdown-menu:visible');
      if (removeStyleFrom.length>0){
        bkHelper.timeout(function() {
          removeStyleFrom.removeAttr('style');
        }, 300);
      }
    } else if ($(this).siblings('.dropdown-menu').size() != 0){
      $(this).parent().siblings('.dropdown-submenu').find('.dropdown-menu').removeAttr('style');
      $(this).siblings('.dropdown-menu:has(*)').css('display', 'block');
    }
  })
  .on('click', 'html, .dropdown > a, button[data-toggle="dropdown"]', function(event) {
    var target = event && event.target,
      className = target.className && typeof target.className === 'string' ? target.className : '',
      isAllowed = className.indexOf('bko-column-header-menu') === -1;
    if(isAllowed){
      $('.dropdown-menu').removeAttr('style');
    }
  });

})(jQuery);
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

(function() {
  'use strict';
  var module = angular.module('bk.notebookRouter', ['ngRoute']);

  module.controller('notebookRouter', function($scope, $route, $routeParams) {
    var sessionRouteResolve = $route.current.$$route.resolve;

    $scope.sessionId = $routeParams.sessionId;
    $scope.newSession = $route.current.locals.isNewSession;
    $scope.isImport = $route.current.locals.isImport;
    $scope.isOpen = $route.current.locals.isOpen;
    $scope.notebook = $route.current.locals.target;
    $route.current.locals.clearResolves();
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
 * Module bk.mainApp
 * This is the main module for the beaker notebook application. The module has a directive that
 * holds the menu bar as well as the notebook view.
 * The module also owns the centralized cell evaluation logic.
 */
(function() {
  'use strict';
  var module = angular.module('bk.mainApp', [
                                             'ngRoute',
                                             'bk.utils',
                                             'bk.commonUi',
                                             'bk.core',
                                             'bk.globals',
                                             'bk.session',
                                             'bk.sessionManager',
                                             'bk.notebookCellModelManager',
                                             'bk.menuPluginManager',
                                             'bk.cellMenuPluginManager',
                                             'bk.notebookVersionManager',
                                             'bk.evaluatorManager',
                                             'bk.evaluatePluginManager',
                                             'bk.evaluateJobManager',
                                             'bk.notebookRouter',
                                             'bk.notebook',
                                             'bk.electron',
                                             'bk.connectionManager',
                                             'bk.fileManipulation',
                                             'bk.sparkContextManager'
                                             ]);

  /**
   * bkApp
   * - This is the beaker App
   * - menus + plugins + notebook(notebook model + evaluator)
   */
  module.directive('bkMainApp', function(
      $timeout,
      $sessionStorage,
      $rootScope,
      bkUtils,
      bkCoreManager,
      bkSession,
      bkSessionManager,
      bkMenuPluginManager,
      bkNotebookCellModelManagerFactory,
      bkCellMenuPluginManager,
      bkNotebookVersionManager,
      bkEvaluatorManager,
      bkEvaluatePluginManager,
      bkEvaluateJobManager,
      bkElectron,
      $location,
      bkFileManipulation,
      bkSparkContextManager,
      bkNotificationService
      ) {

    return {
      restrict: 'E',
      template: JST["template/mainapp/mainapp"](),
      scope: {
        notebook: '=',
        sessionId: '@',
        newSession: '@',
        allowDocumentRenaming: '@',
        isImport: '@import',
        isOpen: '@open'
      },
      controller: function($scope, $timeout, connectionManager, GLOBALS) {
        
        $scope.totalCells = 0;
        $scope.completedCells = 0;
        $scope.evaluationCompleteNotificationMethods = [];
        $scope.runAllRunning = false;
        
        $scope.initAvailableNotificationMethods = function () {
          $scope.evaluationCompleteNotificationMethods = bkNotificationService.initAvailableNotificationMethods();
        };
        
        $scope.notifyThatRunAllFinished = function () {
          _.filter($scope.evaluationCompleteNotificationMethods, 'selected').forEach(function (notificationMethod) {
            notificationMethod.action.call(notificationMethod,'Evaluation completed', 'Run all finished');
          });
        }
                
        $scope.isRunAllFinished  = function() {
          return bkEvaluateJobManager.isAnyInProgress();
        }
        
        $scope.isShowProgressBar  = function() {
          return $scope.runAllRunning && $scope.totalCells > 1;
        }

        $scope.$watch("isRunAllFinished()", function(newType, oldType) {
          if(newType === false && oldType === true){ // there are some "false" , "false" events
              $timeout(function(){
                $scope.runAllRunning = false;
              }, 2000); 
            
            $scope.notifyThatRunAllFinished();
          }
        });
        
        $scope.getProgressBar  = function() {
          return Math.round(100/$scope.totalCells * $scope.completedCells);
        }

        $scope.toggleNotifyWhenDone = function (notificationMethod) {
          notificationMethod.selected = !notificationMethod.selected;
          if(notificationMethod.selected && notificationMethod.checkPermissions) {
            notificationMethod.checkPermissions();
          }
        }
        
        $scope.isNotifyWhenDone = function (notificationMethod) {
          return notificationMethod.selected;
        }
        
        $scope.cancel  = function() {
          bkEvaluateJobManager.cancelAll();
        }
      
        var showLoadingStatusMessage = function(message, nodigest) {
          if (bkHelper.isElectron) {
            bkElectron.setStatus(message);
          } else {
            $scope.loadingmsg = message;
            if (nodigest !== true && !($scope.$$phase || $rootScope.$$phase))
              $scope.$digest();
          }
        };
        var updateLoadingStatusMessage = function() {
          if (bkHelper.isElectron) {
            return;
          }
          if (!($scope.$$phase || $rootScope.$$phase))
            $scope.$digest();
        };
        var getLoadingStatusMessage = function() {
          if (bkHelper.isElectron) {
            return bkElectron.getStatus();
          }
          return $scope.loadingmsg;
        };
        var clrLoadingStatusMessage = function(message, nodigest) {
          if (bkHelper.isElectron) {
            if (bkElectron.getStatus() === message) {
              bkElectron.setStatus('');
            }
          } else {
            if ($scope.loadingmsg === message) {
              $scope.loadingmsg = "";
              if (nodigest !== true && !($scope.$$phase || $rootScope.$$phase))
                $scope.$digest();
            }
          }
        };
        var showTransientStatusMessage = function(message, nodigest) {
          $scope.loadingmsg = message;
          if (nodigest !== true && !($scope.$$phase || $rootScope.$$phase))
            $scope.$digest();
          if (message !== "") {
            $timeout(function() {
              if ($scope.loadingmsg === message) {
                $scope.loadingmsg = "";
                if (nodigest !== true && !($scope.$$phase || $rootScope.$$phase))
                  $scope.$digest();
              }
            }, 500, 0, false);
          }
        };
        var evaluatorMenuItems = [];

        var addEvaluator = function(settings, alwaysCreateNewEvaluator) {
          // set shell id to null, so it won't try to find an existing shell with the id
          if (alwaysCreateNewEvaluator) {
            settings.shellID = null;
          }

          // error when trying to load an unknown language
          if (!(settings.plugin in bkEvaluatePluginManager.getKnownEvaluatorPlugins())) {
            bkCoreManager.show1ButtonModal(
              "Language \"" + settings.plugin + "\" could not be found.","ERROR",null,"OK"
            );
            return null;
          }

          return bkEvaluatorManager.newEvaluator(settings)
          .then(function(evaluator) {
            if (!_.isEmpty(evaluator.spec)) {
              bkHelper.setLanguageManagerSettingsToBeakerObject(evaluator);
              var actionItems = [];
              _.each(evaluator.spec, function(value, key) {
                if (value.type === "action") {
                  actionItems.push({
                    name: value.name ? value.name : value.action,
                        action: function() {
                          evaluator.perform(key);
                        }
                  });
                }
              });
              if (actionItems.length > 0) {
                evaluatorMenuItems.push({
                  name: evaluator.pluginName, // TODO, this should be evaluator.settings.name
                  items: actionItems
                });
              }
            }
          });
        };

        var loadNotebook = (function() {
          var loadNotebookModelAndResetSession = function(
              notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId,
              isExistingSession) {
            // check if the notebook has to load plugins from an external source
            var r = new RegExp('^(?:[a-z]+:)?//', 'i');
            if (notebookModel && notebookModel.evaluators) {
              for (var i = 0; i < notebookModel.evaluators.length; ++i) {
                if (r.test(notebookModel.evaluators[i].plugin)) {
                  var plugList = "<ul>";
                  for (var j = 0; j < notebookModel.evaluators.length; ++j) {
                    if (r.test(notebookModel.evaluators[j].plugin)) {
                      plugList += "<li>"+notebookModel.evaluators[j].plugin;
                    }
                  }
                  plugList += "</ul>";
                  promptIfInsecure(plugList).then(function() {
                    // user accepted risk... do the loading
                    _loadNotebookModelAndResetSession(notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId, isExistingSession);
                  }, function() {
                    // user denied risk... clear plugins with external URL and do the loading
                    var r = new RegExp('^(?:[a-z]+:)?//', 'i');
                    for (var i = 0; i < notebookModel.evaluators.length; ++i) {
                      if (r.test(notebookModel.evaluators[i].plugin)) {
                        notebookModel.evaluators[i].plugin="";
                      }
                    }
                    _loadNotebookModelAndResetSession(notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId, isExistingSession);
                  });
                  return;
                }
              }
            }
            // no unsafe operation detected... do the loading
            _loadNotebookModelAndResetSession(notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId, isExistingSession);
          };
          var promptIfInsecure = function(urlList) {
            var deferred = bkUtils.newDeferred();
            bkCoreManager.show2ButtonModal(
                "This notebook is asking to load the following plugins from external servers:<br/>" + urlList+
                " <br/>How do you want to handle these external plugins?",
                "Warning: external plugins detected",
                function() {
                  deferred.reject();
                },
                function() {
                  deferred.resolve();
                }, "Disable", "Load", "", "btn-danger");
            return deferred.promise;
          };
          var _loadNotebookModelAndResetSession = function(
              notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId,
              isExistingSession) {

            showLoadingStatusMessage("Loading notebook");
            $scope.loading = true;

            isExistingSession = !!isExistingSession;
            evaluatorMenuItems.splice(0, evaluatorMenuItems.length);

            // HACK to fix older version of evaluator configuration
            if (notebookModel && notebookModel.cells && notebookModel.evaluators) {
              for (var i = 0; i < notebookModel.cells.length; ++i) {
                if (notebookModel.cells[i].evaluator !== undefined) {
                  for (var j = 0; j < notebookModel.evaluators.length; ++j) {
                    var name = notebookModel.evaluators[j].name;
                    if (notebookModel.cells[i].evaluator === name) {
                      var plugin = notebookModel.evaluators[j].plugin;
                      if (bkUtils.beginsWith(name,"Html")) {
                        notebookModel.cells[i].evaluator = "HTML";
                      } else if(bkUtils.beginsWith(name,"Latex")) {
                        notebookModel.cells[i].evaluator = "TeX";
                      } else if(bkUtils.beginsWith(name,"TeX")) {
                          notebookModel.cells[i].evaluator = "TeX";
                      } else if(bkUtils.beginsWith(name,"JavaScript")) {
                        notebookModel.cells[i].evaluator = "JavaScript";
                      } else if(bkUtils.beginsWith(name,"Groovy")) {
                        notebookModel.cells[i].evaluator = "Groovy";
                      } else if(name === "Python") {
                        notebookModel.cells[i].evaluator = plugin;
                      }
                      break;
                    }
                  }
                }
              }
              for (var k = 0; k < notebookModel.evaluators.length; ++k) {
                var evaluatorName = notebookModel.evaluators[k].name;
                var evaluatorPlugin = notebookModel.evaluators[k].plugin;
                if (bkUtils.beginsWith(evaluatorName,"Html")) {
                  notebookModel.evaluators[k].name = "HTML";
                  notebookModel.evaluators[k].plugin = "HTML";
                } else if(bkUtils.beginsWith(evaluatorName,"Latex")) {
                  notebookModel.evaluators[k].name = "TeX";
                  notebookModel.evaluators[k].plugin = "TeX";
                } else if(bkUtils.beginsWith(evaluatorName,"TeX")) {
                  notebookModel.evaluators[k].name = "TeX";
                  notebookModel.evaluators[k].plugin = "TeX";
                } else if(bkUtils.beginsWith(evaluatorName,"JavaScript")) {
                  notebookModel.evaluators[k].name = "JavaScript";
                  notebookModel.evaluators[k].plugin = "JavaScript";
                } else if(bkUtils.beginsWith(evaluatorName,"Groovy")) {
                  notebookModel.evaluators[k].name = "Groovy";
                  notebookModel.evaluators[k].plugin = "Groovy";
                } else if(evaluatorName=== "Python") {
                  notebookModel.evaluators[k].name = evaluatorPlugin;
                }
              }
            }
            // HACK END

            bkSessionManager.backup();
            bkSessionManager.clear();
            sessionId = bkSessionManager.setSessionId(sessionId);

            bkSessionManager.setup(
                notebookUri, uriType, readOnly, format,
                notebookModel, edited, sessionId);

            if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.loadFinished !== undefined) {
              window.beakerRegister.hooks.loadFinished();
            }

            var mustwait;
            if (!isExistingSession && bkHelper.hasCodeCell("initialization")) {
              mustwait = bkCoreManager.show0ButtonModal("This notebook has initialization cells... waiting for their completion.", "Please Wait");
            }

            // this is used to load evaluators before rendering the page
            if (notebookModel && notebookModel.evaluators) {
              var promises = _.map(notebookModel.evaluators, function(ev) {
                return addEvaluator(ev, !isExistingSession);
              });
              promises = _.filter(promises, function(el) {
                el != null
              });
              bkUtils.all(promises).then(function() {
                if (!isExistingSession) {
                  bkUtils.log("open", {
                    uriType: uriType,
                    format: format,
                    maxCellLevel: _.max(notebookModel.cells, function(cell) {
                      return cell.level;
                    }).level,
                    cellCount: notebookModel.cells.length
                  });

                  bkHelper.evaluateRoot("initialization")
                    .then(function () {
                      if(mustwait !== undefined)
                        mustwait.close();
                      }, function () {
                        if(mustwait !== undefined)
                          mustwait.close();
                        bkCoreManager.show1ButtonModal("Notebook initialization failed","ERROR",null,"OK");
                      });
                }
              });
              clrLoadingStatusMessage("Loading notebook");
              $scope.loading = false;
              return;
            }

            if (!isExistingSession) {
              bkUtils.log("open", {
                uriType: uriType,
                format: format,
                maxCellLevel: _.max(notebookModel.cells, function(cell) {
                  return cell.level;
                }).level,
                cellCount: notebookModel.cells.length
              });
              bkHelper.evaluateRoot("initialization").then(function () { if(mustwait !== undefined) mustwait.close(); });
            }
            clrLoadingStatusMessage("Loading notebook");
            $scope.loading = false;
          };
          return {
            openUri: function(target, sessionId, retry, retryCountMax) {
              if (!target.uri) {
                bkCoreManager.show1ButtonModal("Failed to open notebook, notebookUri is empty");
                return;
              }
              $scope.loading = true;
              showLoadingStatusMessage("Opening URI");
              if (retryCountMax === undefined) {
                retryCountMax = 100;
              }
              if (!target.type) {
                target.type = bkCoreManager.guessUriType(target.uri);
              }
              target.readOnly = !!target.readOnly;
              if (!target.format) {
                target.format = bkCoreManager.guessFormat(target.uri);
              }

              if (bkUtils.isElectron && (target.type == 'file')){
                bkElectron.app.addRecentDocument(target.uri);
              }
              bkSessionManager.updateNotebookUri(target.uri, target.type, target.readOnly, target.format);
              var importer = bkCoreManager.getNotebookImporter(target.format);
              if (!importer) {
                if (retry) {
                  // retry, sometimes the importer came from a plugin that is being loaded
                  retryCountMax -= 1;
                  setTimeout(function() {
                    loadNotebook.openUri(target, retry, retryCountMax);
                  }, 100);
                } else {
                  clrLoadingStatusMessage("Opening URI");
                  $scope.loading = false;
                  bkCoreManager.show1ButtonModal("Failed to open " + target.uri +
                      " because format " + target.format +
                      " was not recognized.", "Open Failed", function() {
                    bkCoreManager.gotoControlPanel();
                  });
                }
              } else {
                var fileLoader = bkCoreManager.getFileLoader(target.type);
                fileLoader.load(target.uri).then(function(fileContentAsString) {
                  var notebookModel = importer.import(fileContentAsString);
                  notebookModel = bkNotebookVersionManager.open(notebookModel);
                  loadNotebookModelAndResetSession(
                      target.uri,
                      target.type,
                      target.readOnly,
                      target.format,
                      notebookModel, false, sessionId, false);
                  setDocumentTitle();
                }).catch(function(data, status, headers, config) {
                  var message = typeof(data) === 'string' ? data : "Not a valid Beaker notebook";
                  if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.loadFailed !== undefined) {
                    window.beakerRegister.hooks.loadFailed(message);
                  }
                  bkHelper.show1ButtonModal(message, "Open Failed", function() {
                    bkCoreManager.gotoControlPanel();
                  });
                }).finally(function() {
                  clrLoadingStatusMessage("Opening URI");
                  $scope.loading = false;
                });
              }
            },
            fromSession: function(sessionId) {
              $scope.loading = true;
              showLoadingStatusMessage("Loading notebook");
              bkSession.load(sessionId).then(function(session) {
                var notebookUri = session.notebookUri;
                var uriType = session.uriType;
                var readOnly = session.readOnly;
                var format = session.format;
                var notebookModel = angular.fromJson(session.notebookModelJson);
                var edited = session.edited;
                bkSessionManager.updateNotebookUri(notebookUri, uriType, readOnly, format);
                $timeout(function() {
                  loadNotebookModelAndResetSession(
                    notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId, true);
                }, 0);
              });
            },
            fromImport: function(sessionId) {
              var notebook = $sessionStorage.importedNotebook;
              var notebookUri = null;
              var uriType = null;
              var readOnly = true;
              var format = null;
              var importer = bkCoreManager.getNotebookImporter('bkr');
              var notebookModel = importer.import(notebook);
              notebookModel = bkNotebookVersionManager.open(notebook);
              loadNotebookModelAndResetSession(
                  notebookUri, uriType, readOnly, format, notebookModel, false, sessionId, false);
            },
            emptyNotebook: function(sessionId) {
              var notebookModel =
                '{"beaker": "2", "evaluators": [{"name": "Html", "plugin": "Html"},' +
                '{"name": "JavaScript", "plugin": "JavaScript"}], "cells": []}';
              var notebookUri = null;
              var uriType = null;
              var readOnly = true;
              var format = null;
              notebookModel = bkNotebookVersionManager.open(notebookModel);
              loadNotebookModelAndResetSession(
                  notebookUri, uriType, readOnly, format, notebookModel, false, sessionId, false);
            },
            defaultNotebook: function(sessionId) {
              bkUtils.getDefaultNotebook().then(function(notebookModel) {
                var notebookUri = null;
                var uriType = null;
                var readOnly = true;
                var format = null;
                var importer = bkCoreManager.getNotebookImporter('bkr');
                notebookModel = importer.import(notebookModel);
                notebookModel = bkNotebookVersionManager.open(notebookModel);
                loadNotebookModelAndResetSession(
                    notebookUri, uriType, readOnly, format, notebookModel, false, sessionId, false);
              });
            }
          };
        })();

        var bkNotebookWidget;
        $scope.setBkNotebook = function(bkNotebook) {
          bkNotebookWidget = bkNotebook;
        };

        var _impl = (function() {

          var saveStart = function() {
            showLoadingStatusMessage("Saving");
          };
          var updateSessionStore = function(uri, uriType, readOnly) {
            return bkSession.getSessions().then(function(sessions){
              var sessionID = bkSessionManager.getSessionId();
              var currentSession = sessions[sessionID];
              currentSession.uriType = uriType;
              currentSession.notebookModelJson = JSON.stringify(bkHelper.getNotebookModel());
              currentSession.notebookUri = uri;
              currentSession.readOnly = readOnly;
              return bkSession.backup(sessionID, currentSession);
            });
          };
          var saveDone = function(ret) {
            bkSessionManager.setNotebookModelEdited(false);
            bkSessionManager.updateNotebookUri(ret.uri, ret.uriType, false, "bkr");
            bkSessionManager.recordRecentNotebook();
            updateSessionStore(ret.uri, ret.uriType, false);
            showTransientStatusMessage("Saved");
          };

          var saveFailed = function (msg) {
            if (msg === "cancelled") {
              showTransientStatusMessage("Cancelled");
            } else {
              bkCoreManager.show1ButtonModal(msg, "Save Failed");
              showTransientStatusMessage("Save Failed");
            }
          };

          var getRenameDoneCallback = function() {
            var oldUrl = bkSessionManager.getNotebookPath();
            return function (ret) {
              bkSessionManager.updateNotebookUri(ret.uri, ret.uriType, false, "bkr");
              bkSessionManager.updateRecentDocument(oldUrl);
              updateSessionStore(ret.uri, ret.uriType, false);
              showTransientStatusMessage("Renamed");
            }
          };

          var renameFailed = function (msg) {
            if (msg === "cancelled") {
              showTransientStatusMessage("Cancelled");
            } else {
              bkCoreManager.show1ButtonModal(msg, "Rename Failed");
              showTransientStatusMessage("Rename Failed");
            }
          };
          
          var closeSession = function(destroy) {
            bkSessionManager.close().then(function() {
              if(destroy){
                if (bkUtils.isElectron) {
                  bkElectron.thisWindow.destroy();
                }
              } else {
                bkCoreManager.gotoControlPanel();
              }
            });
          };

          function _closeNotebook(destroy) {

            if (bkSessionManager.isNotebookModelEdited() === false) {
              closeSession(destroy);
            } else {
              var notebookTitle = bkSessionManager.getNotebookTitle();
              bkHelper.show3ButtonModal(
                  "Do you want to save " + notebookTitle + "?",
                  "Confirm close",
                  function() {
                    _impl.saveNotebook().then(
                        function() {
                          closeSession(destroy);
                        }
                    );
                  },
                  function() {
                    closeSession(destroy);
                  },
                  null, "Save", "Don't save"
              );
            }
          };
          
          var closeNotebookWithJobProgress = function (closeImplementation) {
            if (bkEvaluateJobManager.isAnyInProgress() ) {
              bkCoreManager.show2ButtonModal(
                  "All running and pending cells will be cancelled.",
                  "Warning!",
                  function() {
                    bkEvaluateJobManager.cancelAll().then(function() {
                      closeImplementation();
                    }
                  ); });
            } else{
              closeImplementation();
            }
          };

          var go = function(id) {
            if (bkNotebookWidget && bkNotebookWidget.getFocusable(id)) {
              bkNotebookWidget.getFocusable(id).scrollTo();
            }
          };

          var evalCodeId = 0;

          if (bkUtils.isElectron) {
            bkElectron.IPC.removeAllListeners('close-window');
            bkElectron.IPC.on('close-window', function(){
              closeNotebookWithJobProgress(function(){
                _closeNotebook(true);
              });
            });
          }

          return {
            name: "bkNotebookApp",
            getSessionId: function() {
              return bkSessionManager.getSessionId();
            },
            getNotebookModel: function() {
              return bkSessionManager.getRawNotebookModel();
            },
            getBeakerObject: function() {
              return bkSessionManager.getBeakerObject();
            },
            showStatus: function(message, nodigest) {
              showLoadingStatusMessage(message, nodigest);
            },
            updateStatus: function() {
              updateLoadingStatusMessage();
            },
            getStatus: function() {
              return getLoadingStatusMessage();
            },
            clearStatus: function(message, nodigest) {
              clrLoadingStatusMessage(message, nodigest);
            },
            showTransientStatus: function(message, nodigest) {
              showTransientStatusMessage(message, nodigest);
            },

            saveNotebook: function() {
              saveStart();
              return bkFileManipulation.saveNotebook(saveFailed).then(saveDone, saveFailed);
            },
            renameNotebookTo: function(notebookUri, uriType) {
              if (_.isEmpty(notebookUri)) {
                console.error("cannot rename notebook, notebookUri is empty");
                return;
              }
              showLoadingStatusMessage("Renaming");
              return bkFileManipulation.renameNotebook(notebookUri, uriType).then(getRenameDoneCallback(), renameFailed);
            },
            saveNotebookAsUri: function(notebookUri, uriType) {
              if (_.isEmpty(notebookUri)) {
                console.error("cannot save notebook, notebookUri is empty");
                return;
              }
              saveStart();
              return bkFileManipulation.saveNotebookAs(notebookUri, uriType).then(saveDone, saveFailed);
            },
            saveNotebookAs: function() {
              bkHelper.showFileSaveDialog({
                extension: "bkr"
              }).then(function (ret) {
                if (ret.uri) {
                  return bkFileManipulation.saveNotebookAs(ret.uri, ret.uriType).then(saveDone, saveFailed);
                }
              });
            },
            saveNotebookAsUri: function(uri, uriType) {
              return bkFileManipulation.saveNotebookAs(uri, uriType).then(saveDone, saveFailed);
            },
            
            runAllCellsInNotebook: function () {
              bkHelper.evaluateRoot('root').then(function (res) {
                bkHelper.go2FirstErrorCodeCell();
              }, function (err) {
                bkHelper.go2FirstErrorCodeCell();
              });
            },
            resetAllKernelsInNotebook: function () {
              var statusMessage = 'Resetting all languages and running all init cells';
              bkHelper.showStatus(statusMessage);

              var evaluatorsWithResetMethod = _.values(bkEvaluatorManager.getLoadedEvaluators()).filter(function (item) {
                return item.spec && item.spec.reset;
              });

              syncResetKernels(evaluatorsWithResetMethod);

              function syncResetKernels(kernels) {
                if(kernels.length > 0) {
                  var promise = kernels.pop().perform('reset');
                  if(promise) {
                    promise.finally(function () {
                      syncResetKernels(kernels);
                    });
                  } else {
                    syncResetKernels(kernels);
                  }
                } else {
                  bkHelper.clearStatus(statusMessage);
                  bkHelper.evaluateRoot("initialization").then(function (res) {
                    bkHelper.go2FirstErrorCodeCell();
                  }, function (err) {
                    bkHelper.go2FirstErrorCodeCell();
                  });
                }
              }
            },
            saveNotebookAndClose: function() {
              saveStart();
              bkFileManipulation.saveNotebook(saveFailed).then(
                  function(ret){
                    closeNotebookWithJobProgress(function(){
                      closeSession(true);
                    })
                    
                  }, saveFailed);
            },
            closeNotebook: function(){
              closeNotebookWithJobProgress(function(){
                _closeNotebook(false);
              });
            },
            _closeNotebook: _closeNotebook,
            collapseAllSections: function() {
              _.each(this.getNotebookModel().cells, function(cell) {
                if (cell.type == "section") {
                  cell.collapsed = true;
                }
              });
            },
            openAllSections: function() {
              _.each(this.getNotebookModel().cells, function(cell) {
                if (cell.type == "section") {
                  cell.collapsed = false;
                }
              });
            },
            hasCodeCell: function(toEval) {
              var cellOp = bkSessionManager.getNotebookCellOp();
              // toEval can be a tagName (string), either "initialization", name of an evaluator or user defined tag
              // or a cellID (string)
              // or a cellModel
              // or an array of cellModels
              if (typeof toEval === "string") {
                if (cellOp.hasCell(toEval)) {
                  // this is a cellID
                  if (cellOp.isContainer(toEval)) {
                    // this is a section cell or root cell
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getAllCodeCells(toEval);
                  } else {
                    // single cell, just get the cell model from cellID
                    toEval = cellOp.getCell(toEval);
                  }
                } else {
                  // not a cellID
                  if (toEval === "initialization") {
                    // in this case toEval is going to be an array of cellModels
                    toEval = bkSessionManager.notebookModelGetInitializationCells();
                  } else if(cellOp.hasUserTag(toEval)) {
                    // this is a user tag for a cell
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getCellsWithUserTag(toEval);
                  } else {
                    // assume it is a evaluator name,
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getCellsWithEvaluator(toEval);
                  }
                }
              }
              if (toEval === undefined || (_.isArray(toEval) && toEval.length === 0)) {
                return false;
              }
              return true;
            },
            isRunning: function (cellId) {
              return bkEvaluateJobManager.isRunning(cellId);
            },

            cancel: function() {
              return bkEvaluateJobManager.cancel();
            },

            evaluate: function(toEval) {
              if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.evaluate !== undefined) {
                window.beakerRegister.hooks.evaluate('', toEval);
              }
              var cellOp = bkSessionManager.getNotebookCellOp();
              // toEval can be a tagName (string), either "initialization", name of an evaluator or user defined tag
              // or a cellID (string)
              // or a cellModel
              // or an array of cellModels
              if (typeof toEval === "string") {
                if (cellOp.hasCell(toEval)) {
                  // this is a cellID
                  if (cellOp.isContainer(toEval)) {
                    // this is a section cell or root cell
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getAllCodeCells(toEval);
                  } else {
                    // single cell, just get the cell model from cellID
                    toEval = cellOp.getCell(toEval);
                  }
                } else {
                  // not a cellID
                  if (toEval === "initialization") {
                    // in this case toEval is going to be an array of cellModels
                    toEval = bkSessionManager.notebookModelGetInitializationCells();
                  } else if(cellOp.hasUserTag(toEval)) {
                    // this is a user tag for a cell
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getCellsWithUserTag(toEval);
                  } else {
                    // assume it is a evaluator name,
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getCellsWithEvaluator(toEval);
                  }
                }
              }
              if (toEval === undefined || (!_.isArray(toEval) && toEval.length === 0)) {
                showTransientStatusMessage("ERROR: cannot find anything to evaluate");
                return "cannot find anything to evaluate";
              }
              if (!_.isArray(toEval)) {
                return bkEvaluateJobManager.evaluate(toEval);
              } else {
                return bkEvaluateJobManager.evaluateAll(toEval);
              }
            },
            evaluateRoot: function(toEval) {
              if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.evaluate !== undefined) {
                window.beakerRegister.hooks.evaluate('root', toEval);
              }
              var cellOp = bkSessionManager.getNotebookCellOp();
              // toEval can be a tagName (string), either "initialization", name of an evaluator or user defined tag
              // or a cellID (string)
              // or a cellModel
              // or an array of cellModels
              if (typeof toEval === "string") {
                if (cellOp.hasCell(toEval)) {
                  // this is a cellID
                  if (cellOp.isContainer(toEval)) {
                    // this is a section cell or root cell
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getAllCodeCells(toEval);
                  } else {
                    // single cell, just get the cell model from cellID
                    toEval = cellOp.getCell(toEval);
                  }
                } else {
                  // not a cellID
                  if (toEval === "initialization") {
                    // in this case toEval is going to be an array of cellModels
                    toEval = bkSessionManager.notebookModelGetInitializationCells();
                  } else if(cellOp.hasUserTag(toEval)) {
                    // this is a user tag for a cell
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getCellsWithUserTag(toEval);
                  } else {
                    // assume it is a evaluator name,
                    // in this case toEval is going to be an array of cellModels
                    toEval = cellOp.getCellsWithEvaluator(toEval);
                  }
                }
              }
              if (toEval === undefined || (!_.isArray(toEval) && toEval.length === 0)) {
                showTransientStatusMessage("ERROR: cannot find anything to evaluate");
                return "cannot find anything to evaluate";
              }
              
              $scope.completedCells = 0;
              $scope.runAllRunning = true;
              $scope.initAvailableNotificationMethods();
              
              if (!_.isArray(toEval)) {
                
                $scope.totalCells = 1;
                var ret = bkEvaluateJobManager.evaluateRoot(toEval).then(function() {
                  $scope.completedCells++;
                 });

                return ret;
              } else {
                
                $scope.totalCells = toEval.length;
     
                var promiseList =  bkEvaluateJobManager.evaluateRootAllPomises(toEval);
                
                for (var i = 0; i < promiseList.length; i++) {
                  promiseList[i].then(function() {
                    $scope.completedCells++;
                   });
                }
                return bkUtils.all(promiseList);
              }
            },
            evaluateCellCode: function(cell, code) {
              if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.evaluate !== undefined) {
                window.beakerRegister.hooks.evaluate('cell', cell, code);
              }
              // cell: cellModel
              // code: code to evaluate
              if (cell == null || typeof cell !== 'object' || _.isArray(cell)) {
                showTransientStatusMessage("ERROR: cannot evaluate cell");
                return "cannot evaluate cell";
              }
              return bkEvaluateJobManager.evaluateCellCode(cell, code);
            },
            evaluateCode: function(evaluator, code) {
              if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.evaluate !== undefined) {
                window.beakerRegister.hooks.evaluate('code', evaluator, code);
              }
              var outcontainer = { };
              var deferred = bkHelper.newDeferred();
              evalCodeId++;
              bkEvaluateJobManager.evaluate({
                id: "onTheFlyCell_"+evalCodeId,
                evaluator: evaluator,
                input: { body: code },
                output: outcontainer
              }).then(function() { deferred.resolve(outcontainer.result); }, function(err) { deferred.reject(err); });
              return deferred.promise;
            },
            loadSingleLibrary: function (path, modelOutput) {
              bkHelper.printEvaluationProgress(modelOutput, 'loading library ' + path, 'out');
              var self = this;
              var deferred = bkHelper.newDeferred();
              var importer = bkCoreManager.getNotebookImporter(bkCoreManager.guessFormat(path));
              if (importer) {
                var fileLoader = bkCoreManager.getFileLoader(bkCoreManager.guessUriType(path));
                fileLoader.load(path).then(function (fileContentAsString) {
                  var notebookModel = bkNotebookCellModelManagerFactory.createInstance();
                  notebookModel.reset(bkNotebookVersionManager.open(importer.import(fileContentAsString)).cells);

                  var toEval = notebookModel.getInitializationCells();
                  if (toEval.length === 0) {
                    deferred.reject("library doesn't have any initialization cells");
                  }
                  _.forEach(toEval, function (cell) {
                    if (!bkEvaluatorManager.getEvaluator(cell.evaluator)) {
                      self.addEvaluatorToNotebook(cell.evaluator);
                    }
                  });
                  var executedCells = 0;
                  function evaluateNext() {
                    var innerDeferred = bkHelper.newDeferred();
                    if (toEval.length > 0) {
                      executedCells++;
                      var cell = toEval.shift();
                      var delegateModelOutput = {};
                      cell.output = delegateModelOutput;
                      bkEvaluateJobManager.evaluate(cell).then(function () {
                        var result = delegateModelOutput.result;
                        if (result && result.outputdata) {
                          bkHelper.receiveEvaluationUpdate(modelOutput, result);
                        }
                        evaluateNext().then(innerDeferred.resolve, innerDeferred.reject);
                      }, innerDeferred.reject);
                    } else {
                      innerDeferred.resolve(executedCells);
                    }
                    return innerDeferred.promise;
                  }

                  evaluateNext().then(deferred.resolve, deferred.reject);
                });
              }
              return deferred.promise;
            },
            loadLibrary: function (path, modelOutput) {
              if(_.isArray(path)) {
                var self = this;
                var deferred = bkHelper.newDeferred();
                var overallExecutedCells = 0;
                var loadNextLibrary = function () {
                  self.loadSingleLibrary(path.shift(), modelOutput).then(function (executedCells) {
                    overallExecutedCells += executedCells;
                    if (path.length === 0) {
                      deferred.resolve(overallExecutedCells);
                    } else {
                      loadNextLibrary();
                    }
                  }, deferred.reject);
                };
                loadNextLibrary();
                return deferred.promise;
              }
              return this.loadSingleLibrary(path, modelOutput);
            },
            addEvaluator: function(settings) {
              return addEvaluator(settings, true);
            },
            addEvaluatorToNotebook: function (pluginName) {
              var settings = {name: '', plugin: pluginName};
              bkSessionManager.addEvaluator(settings);
              addEvaluator(settings);
              $rootScope.$broadcast(GLOBALS.EVENTS.LANGUAGE_ADDED, { evaluator: pluginName });
            },
            removeEvaluator: function(plugin) {
              bkEvaluatorManager.removeEvaluator(plugin);
              evaluatorMenuItems = _.reject(evaluatorMenuItems, function(item) {
                return item.name == plugin;
              });
              bkHelper.removeLanguageManagerSettingsFromBeakerObject(plugin);
            },
            getEvaluatorMenuItems: function() {
              return evaluatorMenuItems;
            },
            getBkNotebookWidget: function() {
              return bkNotebookWidget;
            },
            toggleNotebookLocked: function() {
              return bkSessionManager.toggleNotebookLocked();
            },
            isNotebookLocked: function() {
              return bkSessionManager.isNotebookLocked();
            },
            // return the names of all enabled evaluators
            getEvaluators: function() {
              var evals = bkEvaluatorManager.getLoadedEvaluators();
              var ret = [];
              for (var key in evals) {
                if (evals.hasOwnProperty(key)) {
                  ret.push(key);
                }
              }
              return ret;
            },
            go2LastCodeCell: function () {
              var cellOp = bkSessionManager.getNotebookCellOp();
              // get all code cells
              var cells = cellOp.getAllCodeCells();

              if (cells === undefined || (!_.isArray(cells) && cells.length === 0)) {
                return null;
              }
              if (_.isArray(cells)&& cells.length>0) {
                var cell = cells[cells.length-1];
                go(cell.id);
              }
            },
            go2FirstCell: function () {
              var cellOp = bkSessionManager.getNotebookCellOp();
              var cells = cellOp.getCells();

              if (cells === undefined || (!_.isArray(cells) && cells.length === 0)) {
                return null;
              }
              if (_.isArray(cells) && cells.length > 0) {
                var cell = cells[0];
                go(cell.id);
              }
            },
            go2Cell: function(cellId) {
              go(cellId);
            },
            go2FirstErrorCodeCell: function () {
              var cellOp = bkSessionManager.getNotebookCellOp();
              // get all code cells
              var cells = cellOp.getAllCodeCells();

              if (cells === undefined || (!_.isArray(cells) && cells.length === 0)) {
                return null;
              }
              if (_.isArray(cells)) {
                var i;
                for (i = 0; i < cells.length; i++) {
                  var cell = cells[i];
                  if (cell.output.result && cell.output.result.innertype === "Error"){
                    go(cell.id);
                    break;
                  }
                }
              } else {
                if (cell.output.result && cells.output.result.innertype === "Error")
                  go(cells.id);
              }

            },
            // get (a subset of) code cells
            getCodeCells: function(filter) {
              var cellOp = bkSessionManager.getNotebookCellOp();
              // filter can be a tagName (string), either "initialization", name of an evaluator or user defined tag
              // or a cellID (string)
              if (!filter) {
                // get all code cells
                filter = cellOp.getAllCodeCells();
              } else if (typeof filter !== "string")
                return [];
              else if (cellOp.hasCell(filter)) {
                // this is a cellID
                if (cellOp.isContainer(filter)) {
                  // this is a section cell or root cell
                  // in this case toEval is going to be an array of cellModels
                  filter = cellOp.getAllCodeCells(filter);
                } else {
                  // single cell, just get the cell model from cellID
                  filter = cellOp.getCell(filter);
                }
              } else {
                // not a cellID
                if (filter === "initialization") {
                  // in this case toEval is going to be an array of cellModels
                  filter = bkSessionManager.notebookModelGetInitializationCells();
                } else if(cellOp.hasUserTag(filter)) {
                  // this is a user tag for a cell
                  // in this case toEval is going to be an array of cellModels
                  filter = cellOp.getCellsWithUserTag(filter);
                } else {
                  // assume it is a evaluator name,
                  // in this case toEval is going to be an array of cellModels
                  filter = cellOp.getCellsWithEvaluator(filter);
                }
              }
              if (filter === undefined || (!_.isArray(filter) && filter.length === 0)) {
                return [];
              }
              var ret = [];

              if (_.isArray(filter)) {
                var i;
                for ( i = 0 ; i < filter.length ; i++ ) {
                  var cell = filter[i];
                  var o = {};
                  o.cellId = cell.id;
                  o.evaluatorId = cell.evaluator;
                  o.code = cell.input.body;
                  o.tags = cell.tags;
                  if (cell.dataresult !== undefined) {
                    o.output = cell.dataresult;
                  } else if (cell.output !== undefined && cell.output.result !== undefined) {
                    if (cell.output.result.type !== undefined) {
                      if (cell.output.result.type === 'BeakerDisplay') {
                        o.output = cell.output.result.object;
                      } else {
                        o.outputtype = cell.output.result.type;
                        o.output = cell.output.result;
                      }
                    } else {
                      o.output = cell.output.result;
                    }
                  }
                  o.type = "BeakerCodeCell";
                  ret.push(o);
                }
              } else {
                var tmpCell = {};
                tmpCell.cellId = filter.id;
                tmpCell.evaluatorId = filter.evaluator;
                tmpCell.code = filter.input.body;
                if (filter.dataresult !== undefined) {
                  tmpCell.output = filter.dataresult;
                } else if (filter.output !== undefined && filter.output.result !== undefined) {
                  if (filter.output.result.type !== undefined) {
                    if (filter.output.result.type === 'BeakerDisplay') {
                      tmpCell.output = filter.output.result.object;
                    } else {
                      tmpCell.outputtype = filter.output.result.type;
                      tmpCell.output = filter.output.result;
                    }
                  } else {
                    tmpCell.output = filter.output.result;
                  }
                }
                tmpCell.tags = filter.tags;
                tmpCell.type = "BeakerCodeCell";
                ret.push(tmpCell);
              }
              return ret;
            },
            // set a code cell body
            setCodeCellBody: function(name, code) {
              var cellOp = bkSessionManager.getNotebookCellOp();
              if (!cellOp.hasCell(name))
                return "Error: cell "+name+" does not exist";
              if (cellOp.isContainer(name))
                return "Error: cell "+name+" is not code cell";
              var cell  = cellOp.getCell(name);
              if ( cell.input === undefined || cell.input.body === undefined )
                return "Error: cell "+name+" is not code cell";
              cell.input.body = code;
              return "";
            },
            // set a code cell evaluator
            setCodeCellEvaluator: function(name, evaluator) {
              var evals = this.getEvaluators();
              if ( evals.indexOf(evaluator)==-1 )
                return "Error: evaluator "+evaluator+" does not exist";
              var cellOp = bkSessionManager.getNotebookCellOp();
              if (!cellOp.hasCell(name))
                return "Error: cell "+name+" does not exist";
              if (cellOp.isContainer(name))
                return "Error: cell "+name+" is not code cell";
              var cell  = cellOp.getCell(name);
              if ( cell.input === undefined || cell.input.body === undefined )
                return "Error: cell "+name+" is not code cell";
              cell.evaluator = evaluator;
              cellOp.rebuildMaps();
              return "";
            },
            // set a code cell tags
            setCodeCellTags: function(name, tags) {
              var cellOp = bkSessionManager.getNotebookCellOp();
              if (!cellOp.hasCell(name))
                return "Error: cell "+name+" does not exist";
              if (cellOp.isContainer(name))
                return "Error: cell "+name+" is not code cell";
              var cell  = cellOp.getCell(name);
              cell.tags = tags;
              cellOp.rebuildMaps();
              return "";
            }
          };
        })();
        bkCoreManager.setBkAppImpl(_impl);

        var setDocumentTitle = function() {
          if ($scope.allowDocumentRenaming === 'false') { return; }

          var edited = $scope.isEdited(),
              filename = $scope.filename(),
              title;

          title = filename;
          if (edited) {
            title = '*' + title;
          }

          document.title = title;
          if (bkHelper.isElectron) {
            bkElectron.thisWindow.pageTitle = title;
          }
        };

        $scope.isEdited = function() {
          return bkSessionManager.isNotebookModelEdited();
        };
        $scope.$watch('isEdited()', function(edited, oldValue) {
          if (edited === oldValue) return;
          if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.edited !== undefined) {
            window.beakerRegister.hooks.edited(edited);
          }
          setDocumentTitle();
        });
        $scope.$watch('filename()', function(newVal, oldVal) {
          if (newVal === oldVal) return;
          setDocumentTitle();
        });

        var intervalID = null;
        var stopAutoBackup = function() {
          if (intervalID) {
            clearInterval(intervalID);
          }
          intervalID = null;
        };
        var startAutoBackup = function() {
          stopAutoBackup();
          intervalID = setInterval(bkSessionManager.backup, 60 * 1000);
        };
        $scope.getMenus = function() {
          return bkMenuPluginManager.getMenus();
        };
        if (bkUtils.isElectron) {
          window.addEventListener('focus', function() {
            bkElectron.updateMenus(bkMenuPluginManager.getMenus());
          });
        }

        var sizeOfWindowWithoutTheMenusAtTop = function() {
          return ($(window).height() - $('.navbar-fixed-top').height());
        };

        var keydownHandler = function(e) {
          if (bkHelper.isPageUpKey(e)) {
            window.scrollBy(0, - sizeOfWindowWithoutTheMenusAtTop());
            return false;
          } else if (bkHelper.isPageDownKey(e)) {
            window.scrollBy(0, sizeOfWindowWithoutTheMenusAtTop());
            return false;
          }else if (bkHelper.isSaveNotebookShortcut(e)) { // Ctrl/Cmd + s
            e.preventDefault();
            if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.saveNotebookShortcut !== undefined) {
              window.beakerRegister.hooks.saveNotebookShortcut();
            } else {
              _impl.saveNotebook();
            }
            $scope.$apply();
            return false;
          } else if(bkHelper.isSaveNotebookAsShortcut(e)){
            e.preventDefault();
            if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.saveNotebookAsShortcut !== undefined) {
              window.beakerRegister.hooks.saveNotebookAsShortcut();
            } else {
              _impl.saveNotebookAs();
            }
            $scope.$apply();
            return false;
          } else if (bkHelper.isNewDefaultNotebookShortcut(e)) { // Ctrl/Alt + Shift + n
            if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.newDefaultNotebookShortcut !== undefined) {
              window.beakerRegister.hooks.newDefaultNotebookShortcut();
            } else {
              bkUtils.fcall(function() {
                bkCoreManager.newSession(false);
              });
            }
            return false;
          } else if (bkHelper.isSearchReplace(e)) { // Alt + f
            e.preventDefault();
            bkHelper.getBkNotebookViewModel().showSearchReplace();
            return false;
          } else if (bkHelper.isNewNotebookShortcut(e)) { // Ctrl/Alt + n
            if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.newNotebookShortcut !== undefined) {
              window.beakerRegister.hooks.newNotebookShortcut();
            } else {
              bkUtils.fcall(function() {
                bkCoreManager.newSession(true);
              });
            }
            return false;
          } else if (bkHelper.isAppendCodeCellShortcut(e)) {
            bkUtils.fcall(function() {
              bkHelper.appendCodeCell()
            });
            return false;
          } else if (bkHelper.isAppendTextCellShortcut(e)) {
            bkUtils.fcall(function() {
              bkHelper.appendTextCell();
            });
            return false;
          } else if (bkHelper.isInsertCodeCellAboveShortcut(e)) {
            bkUtils.fcall(function() {
              bkHelper.insertCodeCellAbove();
            });
            return false;
          } else if (e.which === 116) { // F5
            bkHelper.runAllCellsInNotebook();
            return false;
          } else if (bkHelper.isLanguageManagerShortcut(e)) {
            bkHelper.showLanguageManager();
            return false;
          } else if(bkHelper.isResetEnvironmentShortcut(e)) {
            bkHelper.resetAllKernelsInNotebook();
            return false;
          } else if (bkHelper.isRaiseSectionLevelShortcut(e)) {
            bkSessionManager.setNotebookModelEdited(true);
            bkUtils.fcall(function() {
              bkHelper.raiseSectionLevel();
            });
            return false;
          } else if (bkHelper.isLowerSectionLevelShortcut(e)) {
            bkSessionManager.setNotebookModelEdited(true);
            bkUtils.fcall(function() {
              bkHelper.lowerSectionLevel();
            });
            return false;
          } else if (bkHelper.isInsertAfterSectionShortcut(e)){
            bkSessionManager.setNotebookModelEdited(true);
            bkUtils.fcall(function(){
              bkHelper.insertNewSectionWithLevel(String.fromCharCode(e.which));
            });
            return false;
          } else if (bkUtils.isElectron) {
            var ctrlXORCmd = (e.ctrlKey || e.metaKey) && !(e.ctrlKey && e.metaKey);
            // Command H
            if (ctrlXORCmd && e.which === 72) {
              bkElectron.minimize();
            }

            // Command W
            if (ctrlXORCmd && e.which === 87) {
              bkElectron.closeWindow();
            }

            if (e.which === 123) { // F12
              bkElectron.toggleDevTools();
              return false;
            } else if (ctrlXORCmd && ((e.which === 187) || (e.which === 107))) { // Ctrl + '+'
              bkElectron.increaseZoom();
              return false;
            } else if (ctrlXORCmd && ((e.which === 189) || (e.which === 109))) { // Ctrl + '-'
              bkElectron.decreaseZoom();
              return false;
            } else if (ctrlXORCmd && ((e.which === 48) || (e.which === 13))) {
              bkElectron.resetZoom();
              return false;
            }
          } else if (e.target.nodeName !== "TEXTAREA" && e.target.nodeName !== "INPUT") {
            if (e.ctrlKey && e.which === 90) { // Ctrl + z
              bkUtils.fcall(function() {
                bkSessionManager.undo();
              });
              return false;
            } else if (e.metaKey && !e.ctrlKey && !e.altKey && (e.which === 90)) { // Cmd + z
              bkUtils.fcall(function() {
                bkSessionManager.undo();
              });
              return false;
            } else if (e.ctrlKey && e.which === 89) { // Ctrl + z
              bkUtils.fcall(function() {
                bkSessionManager.redo();
              });
              return false;
            } else if (e.metaKey && !e.ctrlKey && !e.altKey && (e.which === 89)) { // Cmd + z
              bkUtils.fcall(function() {
                bkSessionManager.redo();
              });
              return false;
            }// TODO implement global redo
          }
        };
        $(document).bind('keydown', keydownHandler);
        var onDestroy = function() {
          bkSessionManager.backup();
          stopAutoBackup();
          bkCoreManager.setBkAppImpl(null);
          $(document).unbind('keydown', keydownHandler);
          window.onbeforeunload = null;
          bkUtils.removeConnectedStatusListener();
          if ($scope.reconnectFailedListenerUnsubscribe) {
            $scope.reconnectFailedListenerUnsubscribe();
          }
        };

        $scope.$on("$destroy", onDestroy);
        window.onbeforeunload = function(e) {
          if (window.beakerRegister !== undefined && window.beakerRegister.hooks !== undefined && window.beakerRegister.hooks.onbeforeunload !== undefined) {
            window.beakerRegister.hooks.onbeforeunload();
          } else {
            bkSessionManager.backup();
            if (bkSessionManager.isNotebookModelEdited()) {
              return "Your notebook has been edited but not saved, if you close the page your changes may be lost";
            }
            if (bkEvaluateJobManager.isAnyInProgress()) {
              return "Some cells are still running. Leaving the page now will cause cancelling and result be lost";
            }
          }
          onDestroy();
        };
        window.onunload = function() {
          bkEvaluateJobManager.cancel();
        };
        startAutoBackup();
        $scope.gotoControlPanel = function(event) {
          if (window.beakerRegister !== undefined && window.beakerRegister.isEmbedded === true) {
            return;
          }
          if (bkUtils.isMiddleClick(event)) {
            window.open($location.absUrl() + '/beaker');
          } else {
            bkCoreManager.gotoControlPanel();
          }
        };

        $scope.renamingAllowed = function() {
          var uriType = bkSessionManager.getNotebookUriType();
          return !uriType || GLOBALS.FILE_LOCATION.FILESYS === uriType;
        };

        $scope.renameNotebook = function() {
          if (bkSessionManager.isSavable()) {
            var initUri = bkSessionManager.getNotebookPath();
            bkHelper.showFileSaveDialog({initUri: initUri, saveButtonTitle: "Rename"}).then(function (ret) {
              if (ret.uri) {
                return bkHelper.renameNotebookTo(ret.uri, ret.uriType);
              }
            });
          } else {
            bkHelper.saveNotebookAs();
          }
        };

        $scope.getElectronMode = function() {
          return bkUtils.isElectron;
        };

        $scope.filename = function() {
          return bkSessionManager.getNotebookTitle();
        };

        $scope.pathname = function() {
          if ($scope.isEdited()) {
            return '*' + bkSessionManager.getNotebookPath();
          } else {
            return bkSessionManager.getNotebookPath();
          }
        };

        $scope.$on("$locationChangeStart", function(event, next, current) {
          if (bkEvaluateJobManager.isAnyInProgress() && next.indexOf("force=yes") === -1) {
            event.preventDefault();
            bkCoreManager.show2ButtonModal(
                "All running and pending cells will be cancelled.",
                "Warning!",
                function() {
                  bkEvaluateJobManager.cancelAll().then(function() {
                    bkSessionManager.backup().then(function() {
                      bkSessionManager.clear();
                      var routeParams = {force: "yes"};
                      var splits = decodeURIComponent(next.split("#")[1]).split("?");
                      var path = splits[0];
                      var search = splits[1];
                      if (search) {
                        var vars = search.split('&').forEach(function(v) {
                          var pair = v.split('=');
                          routeParams[pair[0]] = pair[1];
                        });
                      }
                      $location.path(path).search(routeParams);
                    });
                  });
                }
            );
          }
        });

        $scope.promptToSave = function() {
          if ($scope.disconnectedDialog) { // prevent prompting multiple at the same time
            return;
          }
          var dismissAction = function() {
            $scope.disconnectedDialog = void 0;
          };
          var params = {
            msgBody: "Beaker server disconnected. Further edits will not be saved.<br>" +
            "Download a copy of the current notebook?",
            msgHeader: "Disconnected",
            dismissAction: dismissAction,
            buttons: [
              {
                text: "Reconnect",
                action: function () {
                  bkUtils.addHandshakeListener(function(handshakeReply){
                    if (handshakeReply.successful) {
                      addConnectedStatusListener();
                    }
                  });
                  bkUtils.reconnect();
                  connectionManager.waitReconnect();
                  $scope.disconnectedDialog = void 0;
                },
                cssClass: "btn-primary modal-submit"
              },
              {
                text: "Download",
                action: function() {
                  // "Save", save the notebook as a file on the client side
                  bkSessionManager.dumpDisplayStatus();
                  var timeoutPromise = $timeout(function() {
                    bkUtils.saveAsClientFile(
                      bkSessionManager.getSaveData().notebookModelAsString,
                      "notebook.bkr");
                  }, 1);
                  timeoutPromise.then(function() {
                    $scope.disconnectedDialog = void 0;
                  })
                }
              },
              {
                text: "Not now",
                action: dismissAction
              }
            ]
          };
          $scope.disconnectedDialog = bkCoreManager.showMultipleButtonsModal(params);
        };
        $scope.reconnectFailedListenerUnsubscribe = $rootScope.$on(GLOBALS.EVENTS.RECONNECT_FAILED, $scope.promptToSave);

        $scope.getOffineMessage = function() {
          return connectionManager.getStatusMessage();
        };
        $scope.isDisconnected = function() {
          return connectionManager.isDisconnected();
        };

        var addConnectedStatusListener = function(){
          return bkUtils.addConnectedStatusListener(function(msg) {
            if ($scope.isDisconnected() && msg.successful) {
              connectionManager.onReconnected();
              return $scope.$digest();
            }
            if (msg.failure) {
              connectionManager.onDisconnected();
              return $scope.$digest();
            }
          });
        };

        addConnectedStatusListener();

        $scope.$watch('isDisconnected()', function(disconnected) {
          if (disconnected) {
            stopAutoBackup();
          } else {
            startAutoBackup();
          }
        });

        $scope.usesSpark = function() {
          var notebookModel = bkHelper.getNotebookModel();
          if (!notebookModel || !notebookModel.evaluators)
            return false;
          return _.filter(notebookModel.evaluators, function(evaluator) {
            return "useSpark" in evaluator && evaluator["useSpark"];
          }).length > 0;
        };

        setDocumentTitle();

        // ensure an existing session is cleared so that the empty notebook model
        // makes the UI is blank immediately (instead of showing leftover from a previous session)
        bkSessionManager.clear();

        bkMenuPluginManager.clear();
        if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
          bkUtils.httpGet('../beaker/rest/util/getMenuPlugins')
          .success(function(menuUrls) {
            menuUrls.forEach(function(url) {
              bkMenuPluginManager.loadMenuPlugin(url);
            });
          });
        } else {
          var menues = window.beakerRegister.getMenuItems();
          bkMenuPluginManager.attachMenus(menues);
        }
        bkCellMenuPluginManager.reset();
        bkEvaluateJobManager.reset();

        setTimeout(function () {
          if ($scope.newSession === "new") {
            loadNotebook.defaultNotebook($scope.sessionId);
          } else if ($scope.newSession === "empty") {
            loadNotebook.emptyNotebook($scope.sessionId);
          } else if ($scope.isImport === 'true') {
            loadNotebook.fromImport($scope.sessionId);
          } else if ($scope.isOpen === 'true') {
            loadNotebook.openUri($scope.notebook, $scope.sessionId, true);
          } else {
            loadNotebook.fromSession($scope.sessionId);
          }
        }, 0);
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
  var module = angular.module(
    'bk.evaluateJobManager',
    ['bk.utils', 'bk.evaluatorManager', 'bk.evaluatePluginManager']
  );
  module.factory('bkEvaluateJobManager', function(
    bkUtils, bkEvaluatorManager, bkEvaluatePluginManager, $timeout) {

    var outputMap = { };

    var errorMessage = function(msg) {
      return {
        type: "BeakerDisplay",
        innertype: "Error",
        object: msg
      };
    };
    var textMessage = function(msg) {
      return {
        type: "BeakerDisplay",
        innertype: "Text",
        object: msg
      };
    };
    var ERROR_MESSAGE_ON_EARLIER_FAILURE =
      errorMessage("Evaluation cancelled due to a failure of an earlier cell evaluation");
    var ERROR_MESSAGE_ON_CANCEL =
      errorMessage("... cancelled!");
    var MESSAGE_PENDING =
      textMessage("pending");
    var MESSAGE_WAITING_FOR_EVALUTOR_INIT =
      textMessage("waiting for evaluator initialization ...");

    var jobQueue = (function() {

      var _queue = [];
      var _jobInProgress = [];
      var running = {};

      var evaluateJob = function(job) {
        // check if job language is unknown
        if (!(job.evaluatorId in bkEvaluatePluginManager.getKnownEvaluatorPlugins())) {
          job.output.result = errorMessage('Language "' + job.evaluatorId + '" is unknown and could not be evaluated.');
          return new Promise(function(resolve, reject) {
            reject('ERROR');
          });
        }

        job.evaluator = bkEvaluatorManager.getEvaluator(job.evaluatorId);
        if (job.evaluator) {
          bkUtils.log("evaluate", {
            plugin: job.evaluator.pluginName,
            length: job.code.length });
          return job.evaluator.evaluate(job.code, job.output, outputMap[job.cellId], job.cellId);
        }
        job.output.result = MESSAGE_WAITING_FOR_EVALUTOR_INIT;
        return bkEvaluatorManager.waitEvaluator(job.evaluatorId)
          .then(function(ev) {
            job.evaluator = ev;
            if (ev !== undefined)
              return job.evaluator.evaluate(job.code, job.output, outputMap[job.cellId], job.cellId);
            return "cannot find evaluator for "+job.evaluatorId;
          } );
      };

      var getEvaluatingStatusMsg = function (job) {
        return "Evaluating " + job.evaluatorId + " cell" + (!_.isEmpty(job.tags) ? " " + job.tags : "");
      };

      var doNext = function(innext) {
        var job;

        if (_jobInProgress.length == 0) {
          // start a new root job
          job = _queue.shift();
        } else {
          // we have something executing...
          var last = _jobInProgress[_jobInProgress.length-1];
          if (last.runchild !== undefined && last.runchild.finished) {
            last.runchild = undefined;
          }
          if (last.finished && last.cancel_deferred !== undefined) {
            var parent, idx;
            // this job has finished but due to cancellation
            if (_jobInProgress.length > 1) {
              // we have a parent job to cancel
              parent = _jobInProgress[_jobInProgress.length-2];
            }

            if (parent !== undefined) {
              parent.cancel_deferred = last.cancel_deferred;
              if (parent.evaluator && parent.evaluator.cancelExecution) {
                parent.evaluator.cancelExecution();
              }
              for(idx = 0; idx<parent.children.length; idx++) {
                parent.children[idx].output.result=ERROR_MESSAGE_ON_CANCEL;
                parent.children[idx].whendone.reject('... cancelled!');
                delete running[parent.children[idx].cellId];
              }
              parent.children = [];
            } else {
              for(idx = 0; idx<_queue.length; idx++) {
                _queue[idx].output.result=ERROR_MESSAGE_ON_CANCEL;
                _queue[idx].whendone.reject('... cancelled!');
                delete running[_queue[idx].cellId];
              }
              _queue = [];
            }
            last.whendone.reject('... cancelled!');
            delete running[last.cellId];
            _jobInProgress.pop();
            bkHelper.clearStatus(getEvaluatingStatusMsg(last), true);
            if (parent !== undefined) {
              bkHelper.showStatus(getEvaluatingStatusMsg(parent), true);
            } else {
              last.cancel_deferred.resolve('done');
            }
            doNext(true);
            if (innext === undefined)
              bkHelper.updateStatus();
            return;
          }
          else if (last.runchild === undefined && last.children.length > 0) {
            // check if we can start a children
            job = last.children[0];
            last.children.shift();
            last.runchild = job;
          } else if (last.finished && last.children.length === 0) {
            // check if this has finished
            if (last.error) {
              last.whendone.reject(last.error);
              if (_jobInProgress.length > 1) {
                // we have a parent job to cancel
                var parent = _jobInProgress[_jobInProgress.length-2];

                var idx;
                for(idx = 0; idx<parent.children.length; idx++) {
                  parent.children[idx].output.result=ERROR_MESSAGE_ON_EARLIER_FAILURE;
                  parent.children[idx].whendone.reject("Evaluation cancelled due to a failure of an earlier cell evaluation");
                  delete running[parent.children[idx].cellId];
                }
                parent.children = [];
              } else {
                var idx;
                for(idx = 0; idx<_queue.length; idx++) {
                  _queue[idx].output.result=ERROR_MESSAGE_ON_EARLIER_FAILURE;
                  _queue[idx].whendone.reject("Evaluation cancelled due to a failure of an earlier cell evaluation");
                  delete running[_queue[idx].cellId];
                }
                _queue = [];
              }
            } else
              last.whendone.resolve(last.output);
            bkHelper.clearStatus(getEvaluatingStatusMsg(last), true);
            delete running[last.cellId];
            _jobInProgress.pop();
            if (_jobInProgress.length > 0) {
              job = _jobInProgress[_jobInProgress.length-1];
              bkHelper.showStatus(getEvaluatingStatusMsg(job), true);
            }
            doNext(true);
            if (innext === undefined)
              bkHelper.updateStatus();
            return;
          }
        }

        if (job === undefined) {
          $timeout(function() { bkHelper.refreshRootScope(); }, 0);
          return;
        }

        _jobInProgress.push(job);
        bkHelper.showStatus(getEvaluatingStatusMsg(job), true);

        evaluateJob(job)
        .then(function(data) {
          job.finished = true;
          job.output = data;
          doNext();
        }, function(err) {
          job.finished = true;
          job.error = err;
          doNext();
        });
        if (innext === undefined)
          bkHelper.updateStatus();
      };

      return {
        add: function(job) {
          running[job.cellId] = true;
          _queue.push(job);
        },
        addChildren: function(job, child) {
          running[child.cellId] = true;
          job.children.push(child);
        },
        getCurrentJob: function() {
          if (_jobInProgress.length > 0)
            return _jobInProgress[_jobInProgress.length-1];
          return undefined;
        },
        cancelAll: function() {
          var idx;
          for ( idx=0; idx<_queue.length; idx++) {
            _queue[idx].output.result = ERROR_MESSAGE_ON_CANCEL;
            delete running[_queue[idx].cellId];
          }
          _queue = [];
        },
        isRunning: function(n) {
          return running[n] === true;
        },
        tick: function() {
          bkUtils.fcall(doNext);
        },
        remove: function(cellId) {
          for (var idx=0; idx<_queue.length; idx++) {
            if(_queue[idx].cellId === cellId){
              delete running[_queue[idx].cellId];
              _queue.splice(idx, 1);
            }
          }
        }
      };
    })();

    return {
      isRunning: function (cellId) {
        return jobQueue.isRunning(cellId);
      },
      // evaluate a cell (as a subcell of currently running cell)
      evaluate: function(cell, notick) {
        var parent = jobQueue.getCurrentJob();
        if (parent === undefined)
          return this.evaluateRoot(cell);

        var deferred = bkUtils.newDeferred();
        if (jobQueue.isRunning(cell.id)) {
          bkHelper.showTransientStatus("ERROR: restart blocked for cell "+cell.id);
          console.log("RESTART PROHIBITED for cell "+cell.id);
          // prevent self restart
          deferred.reject("RESTART PROHIBITED for cell "+cell.id);
          return deferred.promise;
        }
        cell.output.result = MESSAGE_PENDING;
        if (!cell.output) {
          cell.output = {};
        }
        var evalJob = {
          parent: parent,
          cellId: cell.id,
          evaluatorId: cell.evaluator,
          code: cell.input.body,
          output: cell.output,
          retry: 0,
          finished: false,
          runchild: undefined,
          children: [],
          whendone : deferred,
          tags: cell.tags
        };
        jobQueue.addChildren(parent,evalJob);
        if (notick === undefined)
          jobQueue.tick();
        return deferred.promise;
      },
      // evaluate a cell in top level context
      evaluateRoot: function(cell, notick) {
        return this.evaluateCellCode(cell, cell.input.body, notick);
      },
      // evaluate a code of a cell
      evaluateCellCode: function(cell, code, notick){
        var deferred = bkUtils.newDeferred();
        if (jobQueue.isRunning(cell.id)) {
          bkHelper.showTransientStatus("ERROR: restart blocked for cell "+cell.id);
          console.log("RESTART PROHIBITED for cell "+cell.id);
          // prevent self restart
          deferred.reject("RESTART PROHIBITED for cell "+cell.id);
          return deferred.promise;
        }
        cell.output.result = MESSAGE_PENDING;
        if (!cell.output) {
          cell.output = {};
        }
        var notebook = bkHelper.getNotebookModel();
        if (!notebook.evaluationSequenceNumber) {
          notebook.evaluationSequenceNumber = 0;
        }
        cell.output.evaluationSequenceNumber = ++notebook.evaluationSequenceNumber;

        var evalJob = {
          parent: parent,
          cellId: cell.id,
          evaluatorId: cell.evaluator,
          code: code,
          output: cell.output,
          retry: 0,
          finished: false,
          runchild: undefined,
          children: [],
          whendone : deferred,
          tags: cell.tags
        };
        jobQueue.add(evalJob);
        if (notick === undefined)
          jobQueue.tick();
        return deferred.promise;
      },
      // evaluate a cell (as a subcell of currently running cell)
      evaluateAll: function(cells) {
        var self = this;
        var promises = _.map(cells, function(cell) {
          return self.evaluate(cell, true);
        });
        jobQueue.tick();
        return bkUtils.all(promises);
      },
      // evaluate all cells in top level context
      evaluateRootAll: function(cells, parent) {
        var self = this;
        var promises = _.map(cells, function(cell) {
          return self.evaluateRoot(cell, true);
        });
        jobQueue.tick();
        return bkUtils.all(promises);
      },
      evaluateRootAllPomises: function(cells, parent) {
        var self = this;
        var promises = _.map(cells, function(cell) {
          return self.evaluateRoot(cell, true);
        });
        jobQueue.tick();
        return promises;
      },
      isCancellable: function() {
        var currentJob = jobQueue.getCurrentJob();
        return !!(currentJob && currentJob.evaluator && currentJob.evaluator.cancelExecution);
      },
      cancel: function() {
        var currentJob = jobQueue.getCurrentJob();
        var deferred = bkUtils.newDeferred();

        if (currentJob && currentJob.evaluator) {
          if (currentJob.evaluator.cancelExecution) {
            currentJob.cancel_deferred = deferred;
            currentJob.evaluator.cancelExecution();
            return deferred.promise;
          }
        }
        deferred.resolve();
        return deferred.promise;
      },
      cancelAll: function() {
        var currentJob = jobQueue.getCurrentJob();
        var deferred = bkUtils.newDeferred();

        jobQueue.cancelAll();

        if (currentJob && currentJob.evaluator) {
          if (currentJob.evaluator.cancelExecution) {
            currentJob.cancel_deferred = deferred;
            currentJob.evaluator.cancelExecution();
            return deferred.promise;
          }
        }
        deferred.resolve();
        return deferred.promise;
      },
      isAnyInProgress: function() {
        return !!jobQueue.getCurrentJob();
      },
      reset: function() {
        this.cancelAll();
      },
      registerOutputCell: function(id, out) {
        outputMap[id] = out;
      },
      deRegisterOutputCell: function(id) {
        delete outputMap[id];
      },
      getOutputCell: function(id) {
        return outputMap[id];
      },
      remove: function (cell) {
        jobQueue.remove(cell.id);
      },
      getCurrentJob: function(){
        return jobQueue.getCurrentJob();
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
 * Module bk.evaluatorPluginManager
 */
(function() {
  'use strict';
  var module = angular.module('bk.evaluatorManager', ['bk.utils', 'bk.evaluatePluginManager']);

  module.factory('bkEvaluatorManager', function (bkUtils, bkEvaluatePluginManager) {

    var evaluators = {};
    var loadingInProgressEvaluators = [];
    return {
      reset: function() {
        evaluators = {};
      },
      removeEvaluator: function(plugin) {
        for (var key in evaluators) {
          var e = evaluators[key];
          if (e.pluginName === plugin) {
            if (_.isFunction(e.exit)) {
              e.exit();
            }
            delete evaluators[key];
          }
        }
      },
      newEvaluator: function(evaluatorSettings) {
        if (loadingInProgressEvaluators.indexOf(evaluatorSettings) === -1)
	      loadingInProgressEvaluators.push(evaluatorSettings);
	    var deferred = bkUtils.newDeferred();
	    bkEvaluatePluginManager.getEvaluatorFactoryAndShell(evaluatorSettings)
	    .then(function(evaluator) {
	      if(evaluator === undefined) {
	        deferred.reject("cannot create evaluator factory");
	        return;
	      }
	      if (_.isEmpty(evaluatorSettings.name)) {
	        if (!evaluators[evaluator.pluginName]) {
	          evaluatorSettings.name = evaluator.pluginName;
	        } else {
	          evaluatorSettings.name = evaluator.pluginName + "_" + bkUtils.generateId(6);
	        }
	      }

	      if (!evaluatorSettings.view) {
	        evaluatorSettings.view = {};
	      }
	      if (!evaluatorSettings.view.cm) {
	        evaluatorSettings.view.cm = {};
	      }
	      evaluatorSettings.view.cm.mode = evaluator.cmMode;
	      evaluators[evaluatorSettings.name] = evaluator;
	      if ( evaluatorSettings.deferred !== undefined ) {
	        evaluatorSettings.deferred.resolve(evaluator);
	        delete evaluatorSettings.deferred;
	      }
	      deferred.resolve(evaluator);
	    })
	    .finally(function() {
	      var index = loadingInProgressEvaluators.indexOf(evaluatorSettings);
	      loadingInProgressEvaluators.splice(index, 1);
	    });
        return deferred.promise;
      },
      getEvaluator: function(evaluatorId) {
        if (!(evaluatorId in evaluators))
          return null;
        return evaluators[evaluatorId];
      },
      waitEvaluator: function(evaluatorId) {
        var deferred = bkUtils.newDeferred();
        if (evaluators[evaluatorId] !== undefined) {
          deferred.resolve(evaluators[evaluatorId]);
        } else {
          var i;
          for (i = 0; i < loadingInProgressEvaluators.length; i++) {
            var loadingEvaluator = loadingInProgressEvaluators[i];
            if (loadingEvaluator.name === evaluatorId
                || (_.isEmpty(loadingEvaluator.name) && loadingEvaluator.plugin === evaluatorId)) {
              loadingEvaluator.deferred = deferred;
              break;
            }
          }
          if (i === loadingInProgressEvaluators.length) {
            deferred.resolve(undefined);
          }
        }
        return deferred.promise;
      },

      getVisualParams: function(name) {
        if (evaluators[name] === undefined)
          return bkEvaluatePluginManager.getVisualParams(name);
        var v = { };
        var e = evaluators[name];
        var f = bkEvaluatePluginManager.getVisualParams(name);

        function populateField(fieldName) {
          if (e[fieldName] !== undefined)
            v[fieldName] = e[fieldName];
          else if (f !== undefined && f[fieldName] !== undefined)
            v[fieldName] = f[fieldName];
          else
            v[fieldName] = "";
        }

        populateField('bgColor');
        populateField('fgColor');
        populateField('borderColor');
        populateField('shortName');
        populateField('tooltip');
        populateField('cmMode');

        return v;
      },
      getLoadedEvaluators: function() {
        return evaluators;
      },
      getLoadingEvaluators: function() {
        return loadingInProgressEvaluators;
      },
      reconnectEvaluators: function() {
        _.each(evaluators, function(ev) {
          if (ev && _.isFunction(ev.reconnect)) {
            ev.reconnect();
          }
        });
      },
      exitAndRemoveAllEvaluators: function() {
        _.each(evaluators, function(ev) {
          if (ev && _.isFunction(ev.exit)) {
            ev.exit();
          }
        });
        evaluators = {};
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
 * Module bk.notebookCellModelManager
 * Notebook Cell Model doesn't own the notebook model.
 */
(function() {
  'use strict';
  var module = angular.module('bk.notebookCellModelManager', []);

  // utilities
  var generateCellMap = function(cells) {
    var decoratedCells = {
      'root': {
        id: 'root',
        raw: null,
        level: 0,
        parent: null,
        children: [],
        allDescendants: []
      }
    };
    if (!cells || cells.length === 0) {
      return decoratedCells;
    }

    cells.forEach(function(cell, index) {
      decoratedCells[cell.id] = {
        id: cell.id,
        raw: cell,
        rawIndex: index,
        level: cell.level > 0 ? cell.level : Number.POSITIVE_INFINITY,
        parent: null,
        children: [],
        allDescendants: []
      };
    });

    var stack = [decoratedCells.root];
    stack.peek = function() {
      return this[this.length - 1];
    };

    var decoratedCellsKeys = Object.keys(decoratedCells);
    decoratedCellsKeys.sort(function(a,b){return decoratedCells[a].rawIndex - decoratedCells[b].rawIndex});

    decoratedCellsKeys.forEach(function(key) {
      var cell = decoratedCells[key];
      if (cell.id === 'root') {
        return;
      }
      while (stack.peek().level >= cell.level) {
        stack.pop();
      }
      decoratedCells[stack.peek().id].children.push(cell.id);
      decoratedCells[cell.id].parent = stack.peek().id;
      stack.forEach(function(c) {
        decoratedCells[c.id].allDescendants.push(cell.id);
      });
      stack.push(cell);
    });
    return decoratedCells;
  };

  var generateTagMap = function(cellMap) {
    // initialization cells
    var initializationCells = _.chain(cellMap)
        .filter(function(cell) {
          return cell.raw && cell.raw.initialization;
        })
        .map(function(cell) {
          if (cell.raw.type === 'code') {
            return cell;
          } else {
            return _.chain(cell.allDescendants)
                .map(function(childId) {
                  return cellMap[childId];
                })
                .filter(function(c) {
                  return c.raw.type === 'code';
                })
                .value();
          }
        })
        .flatten()
        .uniq()
        .sortBy(function(cell) {
          return cell.rawIndex;
        })
        .map(function(cell) {
          return cell.raw;
        })
        .value();

    // evaluators
    var evaluatorMap = {};
    evaluatorMap.add = function(key, value) {
      if (!this[key]) {
        this[key] = [];
      }
      this[key].push(value);
    };
    _.chain(cellMap)
      .filter(function(cell) {
        return cell.raw && cell.raw.type === 'code';
      })
      .each(function(codeCell) {
        evaluatorMap.add(codeCell.raw.evaluator, codeCell.raw);
      }).value();

    // user tags
    var userTagsMap = {};
    userTagsMap.add = function(key, value) {
      if (!this[key]) {
        this[key] = [];
      }
      this[key].push(value);
    };
    _.chain(cellMap)
    .filter(function(cell) {
      return cell.raw && cell.raw.type === 'code' && cell.raw.tags !== undefined && cell.raw.tags !== '';
    })
    .each(function(codeCell) {
      var re = /\s+/;
      var tags = codeCell.raw.tags.split(re);
      var i;
      for (i = 0; i < tags.length; i++) {
        userTagsMap.add(tags[i], codeCell.raw);
      }
    }).value();

    return {
      initialization: initializationCells,
      evaluator: evaluatorMap,
      usertags: userTagsMap
    };
  };

  var replaceWholeArray = function(oldArray, newArray) {
    var args = _.flatten([0, oldArray.length, newArray]);
    oldArray.splice.apply(oldArray, args);
  };

  module.factory('bkNotebookCellModelManager', function(bkNotebookCellModelManagerFactory) {
    return bkNotebookCellModelManagerFactory.createInstance();
  });
  
  
  
  
  
  module.factory('bkNotebookCellModelManagerFactory', function($timeout, $rootScope, bkEvaluateJobManager) {
    return {
      createInstance: function () {
        var cells = [];
        var cellMap = {};
        var tagMap = {};
        var undoAction = {};
        var undoAction2 = {};
        var redoAction = {};
        var redoAction2 = {};
        var recreateCellMap = function(doNotClearUndoAction) {
          cellMap = generateCellMap(cells);
          tagMap = generateTagMap(cellMap);
          if (!doNotClearUndoAction) {
            undoAction = undefined;
            undoAction2 = undefined;
            redoAction = undefined;
            redoAction2 = undefined;
          }
          // TODO: Optimize this function so it doesn't destroy the page scroll and require
          // this hack below.
          //
          // Most likely because of the nested nature of the cell map and the cells in the
          // DOM that reflect that cell map, when one changes something at the base of the
          // tree (like adding a new section cell
          // [https://github.com/twosigma/beaker-notebook/issues/672]), it not only takes an
          // eternity, but randomly scrolls to ~65% of the document.
          var currentPosition = $(window).scrollTop();
          $timeout(function() {
            $('html, body').scrollTop(currentPosition);
          });
          $rootScope.$broadcast('cellMapRecreated');
        };
        return {
          _getCellMap: function() {
            return cellMap;
          },
          _getTagMap: function() {
            return tagMap;
          },
          reset: function(_cells_) {
            if (_cells_) {
              cells = _cells_;
            }
            this.clipboard = null;
            recreateCellMap();
          },
          getCells: function() {
            return cells;
          },
          getIndex: function(id) {
            return cellMap[id] ? cellMap[id].rawIndex : -1;
          },
          getCellAtIndex: function(index) {
            return cells[index];
          },
          hasCell: function(id) {
            return !!cellMap[id];
          },
          _getDecoratedCell: function(id) {
            if (this.hasCell(id)) {
              return cellMap[id];
            } else {
              throw 'target cell ' + id + ' was not found';
            }
          },
          getCell: function(id) {
            return this._getDecoratedCell(id).raw;
          },
          getCellType: function(id) {
            return this.getCell(id).type;
          },
          getCellLevel: function() {
            return this.getCell(id).level;
          },
          getParent: function(id) {
            var parentId = this._getDecoratedCell(id).parent;
            if (parentId === 'root') {
              return;
            } else {
              return this.getCell(parentId);
            }
          },
          getChildren: function (id) {
            var self = this;
            var children = _.chain(this._getDecoratedCell(id).children)
              .sortBy(function (childId) {
                return self._getDecoratedCell(childId).rawIndex;
              })
              .map(function (childId) {
                return self.getCell(childId);
              }).value();
            return children;
          },
          getAllDescendants: function(id) {
            var self = this;
            return this._getDecoratedCell(id).allDescendants.map(function(childId) {
              return self.getCell(childId);
            });
          },
          getAllCodeCells: function(id) {
            if (!id) {
              id = 'root';
            }
            return this.getAllDescendants(id).filter(function(cell) {
              return cell.type === 'code';
            });
          },
          // find the first code cell starting with the startCell and scan
          // using the direction, if the startCell is a code cell, it will be returned.
          findCodeCell: function(startCellId, forward) {
            var cell = this.getCell(startCellId);
            while (cell) {
              if (cell.type === 'code') {
                return cell;
              }
              cell = forward ? this.getNext(cell.id) : this.getPrev(cell.id);
            }
            return null;
          },
          insertBefore: function(id, cell, quietly) {
            var index = this.getIndex(id);
            if (index !== -1) {
              cells.splice(index, 0, cell);
            } else {
              throw 'target cell ' + id + ' was not found';
            }
            recreateCellMap();
            if (!quietly) {
              $timeout(function () {
                $rootScope.$broadcast('beaker.cell.added', cell);
              });
            }
          },
          insertFirst: function(cell, quietly) {
            if (!_.isObject(cell)) {
              throw 'unacceptable';
            }
    
            cells.splice(0, 0, cell);
            recreateCellMap();
            if (!quietly) {
              $timeout(function () {
                $rootScope.$broadcast('beaker.cell.added', cell);
              });
            }
          },
          insertLast: function(cell, quietly) {
            if (!_.isObject(cell)) {
              throw 'unacceptable';
            }

            cells.push(cell);
            recreateCellMap();
            if (!quietly) {
              $timeout(function () {
                $rootScope.$broadcast('beaker.cell.added', cell);
              });
            }
          },
          insertAfter: function(id, cell, quietly) {
            if (!_.isObject(cell)) {
              throw 'unacceptable';
            }
    
            var index = this.getIndex(id);
            if (index !== -1) {
              cells.splice(index + 1, 0, cell);
            } else {
              throw 'target cell ' + id + ' was not found';
            }
            recreateCellMap();
            if (!quietly) {
              $timeout(function () {
                $rootScope.$broadcast('beaker.cell.added', cell);
              });
            }
          },
          insertAt: function(index, cell, doNotClearUndoAction, quietly) {
            if (_.isArray(cell)) {
              Array.prototype.splice.apply(cells, [index, 0].concat(cell));
            } else if (_.isObject(cell)) {
              cells.splice(index, 0, cell);
            } else {
              throw 'unacceptable';
            }
            recreateCellMap(doNotClearUndoAction);
            if (!quietly) {
              $timeout(function () {
                $rootScope.$broadcast('beaker.cell.added', cell);
              });
            }
          },
          isPossibleToMoveUp: function(id) {
            // If the cell isn't first (or nonexistent?)
            return [-1, 0].indexOf(this.getIndex(id)) === -1;
          },
          moveUp: function(id) {
            var index = this.getIndex(id);
            if (index !== -1) {
              if (index === 0) {
                return;
              } else {
                var cell = this.getCell(id);
                cells[index] = this.getCellAtIndex(index - 1);
                cells[index - 1] = cell;
              }
            } else {
              throw 'target cell ' + id + ' was not found';
            }
            recreateCellMap();
          },
          isPossibleToMoveDown: function(id) {
            // If the cell isn't last (or nonexistent?)
            return [-1, (cells.length - 1)].indexOf(this.getIndex(id)) === -1;
          },
          moveDown: function(id) {
            var index = this.getIndex(id);
            if (index !== -1) {
              if (index === cells.length - 1) {
                return;
              } else {
                var cell = this.getCell(id);
                cells[index] = this.getCellAtIndex(index + 1);
                cells[index + 1] = cell;
              }
            } else {
              throw 'target cell ' + id + ' was not found';
            }
            recreateCellMap();
          },
          undoableDelete: function() {
            this.deleteUndo = {
                type: 'single',
                index: this.getIndex(id),
                cell: this.getCell(id)
            };
            this.delete(id);
          },
          delete: function(id, undoable) {
            // delete the cell,
            // note that if this is a section, its descendants are not deleted.
            // to delete a seciton with all its descendants use deleteSection instead.
            var index = this.getIndex(id);
            if (index !== -1) {
              var deleted = cells.splice(index, 1);
              if (undoable) {
                var self = this;
                undoAction = function() {
                  self.insertAt(index, deleted, true);
                };
                undoAction2 = undefined;
                redoAction = undefined;
                redoAction2 = function() {
                  cells.splice(index, 1);
                  recreateCellMap(true);
                };
                recreateCellMap(true);
              } else {
                recreateCellMap();
              }
            }
          },
          deleteSection: function(id, undoable) {
            // delete the section cell as well as all its descendants
            var cell = this.getCell(id);
            if (!cell) {
              throw 'target cell ' + id + ' was not found';
            }
            if (cell.type !== 'section') {
              throw 'target cell ' + id + ' is not a section cell';
            }
            var index = this.getIndex(id);
            var descendants = this.getAllDescendants(id);
            var deleted = cells.splice(index, descendants.length + 1);
            if (undoable) {
              var self = this;
              undoAction = function() {
                self.insertAt(index, deleted, true);
              };
              undoAction2 = undefined;
              redoAction = undefined;
              redoAction2 = function() {
                cells.splice(index, descendants.length + 1);
                recreateCellMap(true);
              };
              recreateCellMap(true);
            } else {
              recreateCellMap();
            }
            return deleted;
          },
          undo: function() {
            if (undoAction) {
              undoAction.apply();
              redoAction = redoAction2;
              redoAction2 = undefined;
              undoAction2 = undoAction;
              undoAction = undefined;
            } else {
              console.log('no undo');
            }
          },
          redo: function() {
            if (redoAction) {
              redoAction.apply();
              redoAction2 = redoAction;
              undoAction = undoAction2;
              undoAction2 = undefined;
              redoAction = undefined;
            } else {
              console.log('no redo');
            }
          },
          deleteAllOutputCells: function() {
            if (cells) {
              _.each(cells, function(cell) {
                if (cell.output) {
                  var runningJob = bkEvaluateJobManager.getCurrentJob();
                  if (!runningJob || runningJob.cellId !== cell.id) {
                    cell.output.result = undefined;
                    cell.output.elapsedTime = undefined;
                    bkEvaluateJobManager.remove(cell);
                  }              
                }
              });
            }
          },
          dumpDisplayStatus: function() {
            if (cells) {
              _.each(cells, function(cell) {
                if (cell.output) {
                  cell.output.state = {};
                }
              });
            }
          },
          shiftSegment: function(segBegin, segLength, offset) {
            if (offset === 0) {
              return;
            }
            // this function shifts a continuous sequence of cells
            if (segBegin + offset < 0 || segBegin + segLength - 1 + offset >= cells.length) {
              throw 'Illegal shifting, result would be out of bound';
            }
            var slice1 = cells.slice(0, segBegin);
            var slice2 = cells.slice(segBegin, segBegin + segLength);
            var slice3 = cells.slice(segBegin + segLength);
            var toBeMoved;
            if (offset > 0) {
              // moving from slice 3 to slice 1
              toBeMoved = slice3.splice(0, offset);
              slice1 = slice1.concat(toBeMoved);
            } else {
              // moving from slice 1 to slice 3
              toBeMoved = slice1.splice(slice1.length + offset, -offset);
              slice3 = toBeMoved.concat(slice3);
            }
            replaceWholeArray(cells, _.flatten([slice1, slice2, slice3]));
            recreateCellMap();
          },
          getPrevSection: function(id) {
            var prev = this.getPrev(id);
    
                while (prev !== null && prev.type !== "section") {
                  prev = this.getPrev(prev.id);
                }
    
                return prev;
              },
              getPrevSibling: function(id) {
                var parentId = this._getDecoratedCell(id).parent;
                if (!parentId) {
                  return null;
                }
                var siblingIds = this._getDecoratedCell(parentId).children;
                var myIndexAmongSiblings = siblingIds.indexOf(id);
                if (myIndexAmongSiblings === 0) {
                  return null;
                }
                return this.getCell(siblingIds[myIndexAmongSiblings - 1]);
              },
              getNextSibling: function(id) {
                var parentId = this._getDecoratedCell(id).parent;
                if (!parentId) {
                  return null;
                }
                var siblingIds = this._getDecoratedCell(parentId).children;
                var myIndexAmongSiblings = siblingIds.indexOf(id);
                if (myIndexAmongSiblings === siblingIds.length - 1) {
                  return null;
                }
                return this.getCell(siblingIds[myIndexAmongSiblings + 1]);
              },
              isPossibleToMoveSectionUp: function(id) {
                return !!this.getPrevSibling(id);
              },
              moveSectionUp: function(id) {
                var index = this.getIndex(id);
                var length = this.getSectionLength(id);
                var prevSib = this.getPrevSibling(id);
                if (!prevSib) {
                  throw 'Cannot move section up';
                }
                var prevSibId = prevSib.id;
                var offset = -1 * this.getSectionLength(prevSibId);
                this.shiftSegment(index, length, offset);
              },
              isPossibleToMoveSectionDown: function(id) {
                return !!this.getNextSibling(id);
              },
              moveSectionDown: function(id) {
                var nextSib = this.getNextSibling(id);
                if (!nextSib) {
                  throw 'Cannot move section down';
                }
                this.moveSectionUp(nextSib.id);
              },
              getSectionLength: function(id) {
                // the cell itself plus all descendants
                return 1 + this._getDecoratedCell(id).allDescendants.length;
              },
    
              // The following has not been unit tested
              getNext: function(id) {
                var index = this.getIndex(id);
                if (index === cells.length - 1) {
                  return null;
                }
                return this.getCellAtIndex(index + 1);
              },
              getPrev: function(id) {
                var index = this.getIndex(id);
                if (index === 0) {
                  return null;
                }
                return this.getCellAtIndex(index - 1);
              },
              findNextCodeCell: function(id) {
                var index = this.getIndex(id);
                if (index === cells.length - 1) {
                  return null;
                }
                return this.findCodeCell(this.getCellAtIndex(index + 1).id, true);
              },
              isContainer: function(id) {
                return id === 'root' || !!this.getCell(id).level;
              },
              isEmpty: function(id) {
                return this._getDecoratedCell(id).allDescendants.length === 0;
              },
              isLast: function(id) {
                if (_.isEmpty(cells)) {
                  return false;
                }
                return _.last(cells).id === id;
              },
              appendAfter: function(id, cell) {
                if (this.isContainer(id) && !this.isEmpty(id)) {
                  // add to tail
                  var descendants = this.getAllDescendants(id);
                  this.insertAfter(descendants[descendants.length - 1].id, this.clipboard);
                } else {
                  // append after
                  this.insertAfter(id, cell);
                }
              },
              getCellsSize: function(){
                return cells.length;
              },
              getInitializationCells: function() {
                return tagMap.initialization;
              },
              getCellsWithEvaluator: function(evaluator) {
                return tagMap.evaluator[evaluator];
              },
              hasUserTag: function(t) {
                return tagMap.usertags[t] !== undefined;
              },
              getCellsWithUserTag: function(t) {
                return tagMap.usertags[t];
              },
              clipboard: null,
              cut: function(id) {
                if (this.clipboard) {
                  this.delete(this.clipboard);
                }
                this.clipboard = this.getCell(id);
                this.delete(id);
              },
              paste: function(destinationId) {
                if (this.clipboard) {
                  this.appendAfter(destinationId, this.clipboard);
                  this.clipboard = null;
                }
              },
              canSetUserTags: function(tags) {
                var re = /\s+/;
                if (tags !== undefined) {
                  var tgs = tags.split(re);
                  var i;
                  for (i = 0; i < tgs.length; i++) {
                    if (cellMap[tgs[i]] !== undefined) {
                      return 'ERROR: The name "' + tgs[i] + '" is already used as a cell name.';
                    }
                  }
                }
                return '';
              },
              canRenameCell: function(newid) {
                if (cellMap[newid] !== undefined) {
                  return 'ERROR: Cell "' + newid + '" already exists.';
                }
                if (tagMap.usertags[newid] !== undefined) {
                  return 'ERROR: The name "' + newid + '" is already used as a tag.';
                }
                return '';
              },
              renameCell: function(oldid, newid) {
                if (this.canRenameCell(newid) !== '') {
                  return;
                }
                var idx = this.getIndex(oldid);
                if (idx >= 0) {
                  cells[idx].id = newid;
                  recreateCellMap();
                }
              },
              rebuildMaps: function() {
                recreateCellMap(true);
              }
            };
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
/**
 * Module bk.notebookNamespaceModelManager
 */
(function() {
  'use strict';
  var module = angular.module("bk.notebookNamespaceModelManager", []);

  module.factory("bkNotebookNamespaceModelManager", function() {
    var _subscriptions = {};
    var _listeners = {};
    return {
      init: function(sessionId, notebookModel, generateSaveData) {
        var onMessage = function(reply) {
          var name = reply.data.name;
          var value = reply.data.value;
          var sync = reply.data.sync;
          var namespace = notebookModel.namespace;
          if (undefined === sync) {
            var reply2 = {name: name, defined: false, session: sessionId};
            if (undefined !== namespace) {
              var readValue = namespace[name];
              if (undefined !== readValue) {
                reply2.value = readValue;
                reply2.defined = true;
              }
            }
            $.cometd.publish("/service/namespace/receive", JSON.stringify(reply2));
          } else {
            if (undefined === namespace) {
              notebookModel.namespace = {};
              namespace = notebookModel.namespace;
            }
            if (undefined === value) {
              delete namespace[name];
            } else {
              namespace[name] = value;
            }
            if (sync) {
              var reply2 = {name: name, session: sessionId};
              $.cometd.publish("/service/namespace/receive", JSON.stringify(reply2));
            }
          }
        };
        _subscriptions[sessionId] = $.cometd.subscribe("/namespace/" + sessionId, onMessage);

        //if cometd channel was closed and a new one was opened we have to resubscribe to the new channel
        _listeners[sessionId] = $.cometd.addListener("/meta/handshake", function (reply) {
          if (reply.successful === true && sessionId) {
            _subscriptions[sessionId] = $.cometd.subscribe("/namespace/" + sessionId, onMessage);
          }
        });
      },
      clear: function(sessionId) {
        if (sessionId) {
          $.cometd.unsubscribe(_subscriptions[sessionId]);
          $.cometd.removeListener(_listeners[sessionId]);
          delete _subscriptions[sessionId];
          delete _listeners[sessionId];
        }
      }
    };
  });
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
/**
 * Module bk.notebookNamespaceModelManager
 */
(function() {
  'use strict';
  var module = angular.module('bk.notebookManager', []);

  module.factory('bkNotebookManager', function() {
    var registrations = [];
    var listeners = [];
    return {
      init: function(notebookModel) {
        registrations.push(
          $.cometd.subscribe('/request-latest-notebook-model', function(resp) {
            if (resp.data.sessionId !== notebookModel.getSessionId()) { return; }

            $.cometd.publish('/latest-notebook-model', {
              notebookJson: notebookModel.getSaveData().notebookModelAsString
            });
          })
        );

        registrations.push($.cometd.subscribe('/sessionChange', function(reply){}));
        listeners.push($.cometd.addListener("/meta/handshake", function (reply) {
          if (reply.successful) {
            registrations.push($.cometd.subscribe('/sessionChange', function(reply){}));
          }
        }));
        bkHelper.initBeakerLanguageSettings();
      },
      reset: function() {
        _.each(registrations, function(v) {
          $.cometd.unsubscribe(v);
        });
        _.each(listeners, function(l) {
          $.cometd.removeListener(l);
        });
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
 * Module bk.sessionManager
 */
(function() {
  'use strict';
  angular.module('bk.connectionManager',['bk.globals', 'bk.utils', 'bk.sessionManager'])
  .factory('connectionManager', function($timeout, $rootScope, bkUtils, bkSessionManager, GLOBALS) {
    var OFFLINE_MESSAGE = "offline, click to reconnect or download a copy";
    var CONNECTING_MESSAGE = "reconnecting";
    var reconnectTimeout;
    var statusMessage = OFFLINE_MESSAGE;
    var disconnected = false;

    var indicateReconnectFailed = function() {
      stopWaitingReconnect();
      statusMessage = OFFLINE_MESSAGE;
      bkUtils.disconnect(); // prevent further attempting to reconnect
      $rootScope.$emit(GLOBALS.EVENTS.RECONNECT_FAILED);
    };
    var waitReconnect = function() {
      statusMessage = CONNECTING_MESSAGE;

      // if reconnect didn't happen during the timeout period, prompt to save
      if (!reconnectTimeout) {
        reconnectTimeout = $timeout(indicateReconnectFailed, GLOBALS.RECONNECT_TIMEOUT);
      }
    };
    var stopWaitingReconnect = function() {
      if (reconnectTimeout) {
        $timeout.cancel(reconnectTimeout);
        reconnectTimeout = undefined;
      }
    };

    return {
      onDisconnected: function() {
        disconnected = true;
        waitReconnect();
      },
      onReconnected: function() {
        bkSessionManager.isSessionValid().then(function(isValid) {
          if (isValid) {
            stopWaitingReconnect();
            disconnected = false;
            bkSessionManager.reconnectEvaluators();
          } else {
            indicateReconnectFailed();
          }
        });
      },
      waitReconnect: waitReconnect,
      getStatusMessage: function() {
        return statusMessage;
      },
      isDisconnected: function() {
        return disconnected;
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
 * Module bk.sessionManager
 */
(function() {
  'use strict';
  var module = angular.module('bk.sessionManager',[
    'bk.utils',
    'bk.session',
    'bk.notebookManager',
    'bk.notebookCellModelManager',
    'bk.notebookNamespaceModelManager',
    'bk.recentMenu',
    'bk.evaluatorManager',
    'bk.electron',
    'bk.plotapi',
    'bk.categoryplotapi',
    'bk.delayManager'
  ]);

  module.factory('bkSessionManager', function(
      bkUtils,
      bkSession,
      bkNotebookManager,
      bkNotebookCellModelManager,
      bkNotebookCellModelManagerFactory,
      bkNotebookNamespaceModelManager,
      bkEvaluatorManager,
      bkRecentMenu,
      bkElectron,
      bkPlotApi,
      bkCategoryPlotApi,
      bkDelayManager) {

    // we have copypasted piece of code from this line up to the end of 'transformBack' method in
    // plugin/node/src/dist/app/transformation.js. If you make some changes there, please bring them
    // to Node plugin too

    var ImageIcon = function(data) {
      if (data === undefined || data.type !== "ImageIcon") {
        this.imageData = [];
        this.width = 0;
        this.height = 0;
      } else {
        this.imageData = data.imageData;
        this.width = data.width;
        this.height = data.height;
      }
    };

    var DataFrame = function(data) {
      if (data === undefined || data.type !== "TableDisplay" || data.subtype !== "TableDisplay") {
        this.columnNames = [];
        this.types = [];
        this.values = [];
        this.hasIndex = false;
      } else {
        this.columnNames = data.columnNames.slice(0);
        this.types = data.types.slice(0);
        this.values = [];
        this.hasIndex = data.hasIndex || false;
        for (var j in data.values) {
          var vals = [];
          for (var i in data.values[j]) {
            vals.push( transformBack(data.values[j][i]));
          }
          this.values.push(vals);
        }
      }
    };

    DataFrame.prototype.toString = function() {
      var s = '';
      s = 'DataFrame:'+
        '  Rows: '+this.values.length+'\n' +
        '  Data columns (total '+this.columnNames.length+' columns):\n';
      for (var i in this.columnNames) {
        s = s + '    '+this.columnNames[i]+'   '+this.types[i]+(this.hasIndex && i==0 ? ' *Index*\n' : '\n');
      }
      return s;
    };

    DataFrame.prototype.hasIndex = function() {
      return this.hasIndex;
    };

    DataFrame.prototype.columns = function() {
      return this.columnNames;
    };

    DataFrame.prototype.dtypes = function() {
      return this.types;
    };

    DataFrame.prototype.getIndex = function() {
      if(!this.hasIndex)
        return undefined;
      var o = [];
      for (var j in this.values) {
        o.push(this.values[j][0]);
      }
      return o;
    };
    
    DataFrame.prototype.getColumn = function(name) {
      var i = this.columnNames.indexOf(name);
      if (i < 0)
          return null;
      var o = [];
      for (var j in this.values) {
        o.push(this.values[j][i]);
      }
      return o;
    };

    DataFrame.prototype.getRow = function(i) {
      if (i < 0 || i > this.values.length)
        return null;
      var o = {};
      for (var j in this.columnNames) {
        o[this.columnNames[j]] = this.values[i][j];
      }
      return o;
    };

    DataFrame.prototype.length = function() {
      return this.values.length;
    };

    DataFrame.prototype.removeColumn = function(name) {
      var i = this.columnNames.indexOf(name);
      if (i < 0)
          return false;
      if (i==0)
        this.hasIndex = false;
      for (var j in this.values) {
        this.values[j].splice(i,1);
      }
      this.columnNames.splice(i,1);
      this.types.splice(i,1);
      return true;
    };

    DataFrame.prototype.addColumn = function(name, data, type) {
      var i = this.columnNames.indexOf(name);
      if (i >= 0 || data === undefined || data.length === 0)
          return false;

      this.columnNames.push(name);
      this.types.push((type === undefined) ? getDataType(data[0]) : type);
      var min = (data.length > this.values.length) ? this.values.length : data.length;
      var j;
      for (j = 0; j < min; j++) {
        this.values[j].push(data[j]);
      }
      if (this.values.length > data.length) {
        for (; j < this.values.length; j++) {
          this.values[j].push(null);
        }
      } else {
        for (; j < data.length; j++) {
          this.values.push([]);
          for (var k = 0; k < this.columnNames.length - 1; k++) {
            this.values[j].push(null);
          }
          this.values[j].push(data[j]);
        }
      }
      return true;
    };

    DataFrame.prototype.addRow = function(row) {
      var r = [];
      for(var c in this.columnNames) {
        if (row[this.columnNames[c]] !== undefined)
          r.push(row[this.columnNames[c]]);
        else
          r.push(null);
      }
      this.values.push(r);
    };

    function isPrimitiveType(v) {
      if (_.isDate(v) || _.isString(v) || _.isNumber(v) || _.isBoolean(v) || _.isNaN(v) || _.isNull(v) || _.isUndefined(v))
        return true;
      return false;
    };

    function getDataType(v) {
      if (_.isDate(v))
        return "datetime";
      if(_.isNumber(v)) // can we do a better job here?
        return "double";
      if(_.isBoolean(v))
        return "boolean";
      return "string";
    };

    function isDictionary(v) {
      if (!_.isObject(v))
        return false;
      for(var i in v) {
        if (!isPrimitiveType(v[i]))
          return false;
      }
      return true;
    };

    function transform(v, norecurse) {
      if (_.isFunction(v) || _.isUndefined(v))
        return null;

      if (_.isDate(v)) {
        var o = {}
        o.type = "Date";
        o.timestamp = v.valueOf();
        return o
      }

      if (isPrimitiveType(v))
        return v;

      if (v instanceof ImageIcon && norecurse === undefined) {
        var o = {}
        o.type = "ImageIcon";
        o.imageData = v.imageData;
        o.width = v.width;
        o.height = v.height;
        return o
      }

      if (v instanceof DataFrame && norecurse === undefined) {
        var o = {}
        o.type = "TableDisplay";
        o.subtype = "TableDisplay";
        o.hasIndex = v.hasIndex ? 'true' : 'false';
        o.values = [];
        for (var i in v.values) {
          var row = [ ];
          for (var j in v.values[i]) {
            row.push(transform(v.values[i][j], true));
          }
          o.values.push(row);
        }
        o.types = [ ];
        if (_.isArray(v.types)) o.types = o.types.concat(v.types.slice(0));
        o.columnNames = [ ];
        if (_.isArray(v.columnNames)) o.columnNames = o.columnNames.concat(v.columnNames.slice(0));
        return o
      }

      if (_.isArray(v) && v.length>0) {
        var doit = true;
        for(var r in v) {
          if (!_.isArray(v[r])) {
            doit = false;
            break;
          }
          for (var c in (v[r])) {
            if (!isPrimitiveType(v[r][c])) {
              doit = false;
              break;
            }
          }
        }
        if (doit && norecurse === undefined) {
          var o = {}
          o.type = "TableDisplay";
          o.values = [];
          for (var i in v) {
            var row = [];
            for (var item in v[i])
              row.push(transform(v[i][item], true));
            o.values.push(row);
          }
          o.subtype = "Matrix";
          o.columnNames = [];
          o.types = [];
          for(var i in v[0]) {
            o.columnNames.push('c'+i);
            o.types.push(getDataType(v[0][i]));
          }
          return o;
        } else {
          doit = true;
          for(var r in v) {
            if (!isDictionary(v[r])) {
              doit = false;
              break;
            }
          }
          if (doit && norecurse === undefined) {
            var o = {};
            o.type = "TableDisplay";
            o.subtype = "ListOfMaps";
            o.columnNames = [];
            for (var i in v) {
              for (var j in v[i]) {
                if (o.columnNames.indexOf(j)<0)
                  o.columnNames.push(j);
              }
            }
            o.values = [];
            for (var i in v) {
              var o2 = [];
              for (var j in o.columnNames) {
                var n = o.columnNames[j];
                if (v[i][n] !== undefined)
                  o2.push(transform(v[i][n], true));
                else
                  o2.push(null);
              }
              o.values.push(o2);
            }
            o.types = [];
            for (var j in o.columnNames) {
              var n = o.columnNames[j];
              for (var i in v) {
                if (v[i][n] !== undefined) {
                  o.types.push(getDataType(v[i][n]));
                  break;
                }
              }
            }
            return o;
          }
        }
      }

      if (_.isArray(v)) {
        return v.map(function(e) {return transform(e, true)});
      }

      if (bkPlotApi.instanceOfPlotApi(v) && norecurse === undefined) {
        return _.cloneDeep(v);
      }
      if (bkCategoryPlotApi.instanceOfCategoryPlotApi(v) && norecurse === undefined) {
        return _.cloneDeep(v);
      }

      if (_.isObject(v) && isDictionary(v) && norecurse === undefined) {
        var o = {}
        o.type = "TableDisplay";
        o.values = [];
        o.subtype = "Dictionary";
        o.columnNames= ['Key','Value'];
        for (var i in v) {
          var r = [];
          r.push(i);
          r.push(transform(v[i],true));
          o.values.push(r);
        }
        return o;
      }
      var o = {};
      for(var p in v) {
        o[p] = transform(v[p], true);
      }
      return o;
    };

    function transformBack(v) {
      if(v === undefined || (!_.isObject(v) && !_.isArray(v)))
        return v;

      if (v.type !== undefined) {
        if (v.type === "Date") {
          return new Date(v.timestamp);
        }
        if (v.type === "TableDisplay") {
          if (v.subtype === "Dictionary") {
            var o = {}
            for (var r in v.values) {
              if (typeof(v.values[r][0]) === 'object') {
                o[transformBack(v.values[r][0])] = transformBack(v.values[r][1]);
              } else {
                o[v.values[r][0]] = transformBack(v.values[r][1]);
              }
            }
            return o;
          }
          if (v.subtype === "Matrix") {
            var o = [];
            for (var i in v.values) {
              o.push(v.values[i].slice(0));
            }
            return o;
          }
          if (v.subtype === "ListOfMaps") {
            var out2 = [];
            for (var r in v.values) {
              var out3 = { };
              for (var i=0; i<v.values[r].length; i++) {
                if (v.values[r][i] !== null)
                  out3[ v.columnNames[i] ] = transformBack(v.values[r][i]);
              }
              out2.push(out3);
            }
            return out2;
          }
          var out = new DataFrame(v);
          return out;
        }
        if (v.type === "ImageIcon")
          return new ImageIcon(v);
      }
      if (!_.isArray(v)) {
        var o = {};
        for(var p in v) {
          o[p] = transformBack(v[p]);
        }
        return o;
      }
      return v.map(transformBack);
    };


    var _notebookUri = (function() {
      var DEFAULT_VALUE = null;
      var _v = DEFAULT_VALUE;
      return {
        reset: function() {
          this.set(DEFAULT_VALUE);
        },
        get: function() {
          return _v;
        },
        set: function(v) {
          _v = v;
        }
      };
    })();

    var _uriType = null;
    var _readOnly = null;
    var _format = null;
    var _sessionId = null;
    var _edited = false;
    var _needsBackup = false;

    var BeakerObject = function(nbmodel) {
      this.knownBeakerVars = { };
      this.getCache = { };
      this.setCache = { };
      this.beakerObj = { };
      this.nbmodel = nbmodel;
    };

    BeakerObject.prototype.isBeakerObject = function(obj) {
      return obj === this.beakerObj;
    };
    
    BeakerObject.prototype.setupBeakerObject = function(modelOutput) {
      var self = this;

      if (this.beakerObj.showProgressUpdate === undefined) {
        Object.defineProperty(this.beakerObj, 'showProgressUpdate', { value: function (a,b,c) {
          if ( a === undefined || self._beaker_model_output_result === undefined ||
              self._beaker_model_output_result.object === undefined)
            return;
          if ( typeof a === 'string' )
            self._beaker_model_output_result.object.message = a;
          else if ( typeof a === 'number' )
            self._beaker_model_output_result.object.progressBar = a;
          else if ( a !== null )
            self._beaker_model_output_result.object.payload = a;

          if ( typeof b === 'string' )
            self._beaker_model_output_result.object.message = b;
          else if ( typeof b === 'number' )
            self._beaker_model_output_result.object.progressBar = b;
          else if ( b !== null )
            self._beaker_model_output_result.object.payload = b;

          if ( typeof c === 'string' )
            self._beaker_model_output_result.object.message = c;
          else if ( typeof c === 'number' )
            self._beaker_model_output_result.object.progressBar = c;
          else if ( c !== null )
            self._beaker_model_output_result.object.payload = c;
        }, writeable: false, enumerable: true });

        Object.defineProperty(this.beakerObj, 'showStatus', { value: bkHelper.showStatus, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'clearStatus', { value: bkHelper.clearStatus, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'showTransientStatus', { value: bkHelper.showTransientStatus, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'getEvaluators', { value: bkHelper.getEvaluators, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'getCodeCells', { value: bkHelper.getCodeCells, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'setCodeCellBody', { value: bkHelper.setCodeCellBody, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'setCodeCellEvaluator', { value: bkHelper.setCodeCellEvaluator, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'setCodeCellTags', { value: bkHelper.setCodeCellTags, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'evaluate', { value: function(a) {
            var d = bkHelper.newDeferred();
            self.beakerObjectToNotebook();
            bkHelper.evaluate(a).then(function (r) { self.notebookToBeakerObject(); d.resolve(transformBack(r)); }, function (r) { self.notebookToBeakerObject(); d.reject(r); });
            return d.promise;
          }, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'evaluateCode', { value: function(a,b) {
          var d = bkHelper.newDeferred();
            self.beakerObjectToNotebook();
            bkHelper.evaluateCode(a,b).then(function (r) { self.notebookToBeakerObject(); d.resolve(transformBack(r)); }, function (r) { self.notebookToBeakerObject(); d.reject(r); });
            return d.promise;
          }, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'print', {value: function(input) {
          bkHelper.printEvaluationProgress(self._beaker_model_output, input, 'out');
        }, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'printError', {value: function(input) {
          bkHelper.printEvaluationProgress(self._beaker_model_output, input, 'err');
        }, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'loadLibrary', { value: function (path) {
          return bkHelper.loadLibrary(path, self._beaker_model_output);
        }, writeable: false, enumerable: true});
        Object.defineProperty(this.beakerObj, 'loadJS', { value: bkHelper.loadJS, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'loadCSS', { value: bkHelper.loadCSS, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'loadList', { value: bkHelper.loadList, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'httpGet', { value: bkHelper.httpGet, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'httpPost', { value: bkHelper.httpPost, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'newDeferred', { value: bkHelper.newDeferred, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'newPromise', { value: bkHelper.newPromise, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'all', { value: bkHelper.all, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'timeout', { value: bkHelper.timeout, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'DataFrame', { value: DataFrame, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'ImageIcon', { value: ImageIcon, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'getVersionNumber', { value: bkHelper.getVersionNumber, writeable: false, enumerable: true });
        Object.defineProperty(this.beakerObj, 'getVersion', { value: bkHelper.getVersionString, writeable: false, enumerable: true });
        _.extend(this.beakerObj, bkPlotApi.list());
        _.extend(this.beakerObj, bkCategoryPlotApi.list());
        this.predefined = Object.keys(this.beakerObj);
      }
      this._beaker_model_output_result = modelOutput.result; // XXX obviated by next line
      this._beaker_model_output = modelOutput;
    };

    BeakerObject.prototype.clearOutput = function() {
      this._beaker_model_output_result.object = undefined;
    };

    BeakerObject.prototype.beakerGetter = function(name) {
      if (this.setCache[name] !== undefined) {
        return this.setCache[name];
      }
      if (this.getCache[name] === undefined && this.nbmodel.namespace !== undefined)
        this.getCache[name] = transformBack(this.nbmodel.namespace[name]);
      // this is required to support subobject modification
      this.setCache[name] = this.getCache[name];
      return this.getCache[name];
    };

    BeakerObject.prototype.beakerSetter = function(name, v) {
      this.setCache[name] = v;
      if (this.beakerSetterTimeout !== undefined)
        bkHelper.cancelTimeout(this.beakerSetterTimeout);
      var makeTimeout = function(self) {
        return function() {
          self.beakerSetterTimeout = undefined;
          self.beakerObjectToNotebook();
        };
      };
      this.beakerSetterTimeout = bkHelper.timeout(makeTimeout(this),500);
    };

    BeakerObject.prototype.notebookToBeakerObject = function() {
      // clear getcache
      this.getCache = { };

      // check if some other language removed a binding
      for (var p in this.knownBeakerVars) {
        if (this.nbmodel.namespace !== undefined && this.nbmodel.namespace[p] === undefined) {
          delete this.knownBeakerVars[p];
          delete this.beakerObj[p];
          delete this.setCache[p];
        }
      }

      // check if some other language added a binding
      if (this.nbmodel.namespace !== undefined) {
        for (var p in this.nbmodel.namespace) {
          var t = this.nbmodel.namespace[p];
          if (this.predefined.indexOf(p)>=0) {
            delete this.nbmodel.namespace[p];
          } else if (this.knownBeakerVars[p] === undefined) {
            delete this.beakerObj[p];
            this.knownBeakerVars[p] = true;
            var makeGetter = function(self, name) {
              return function() { return self.beakerGetter(name); }
            }
            var makeSetter = function(self, name) {
              return function(v) { self.beakerSetter(name,v); }
            }
            Object.defineProperty(this.beakerObj, p,
                { writeable: true,
                  get: makeGetter(this, p),
                  set: makeSetter(this, p),
                  enumerable: true,
                  configurable: true
                });
          }
        }
      }
    };

    BeakerObject.prototype.beakerObjectToNotebook = function() {
      var keys = Object.keys(this.beakerObj);
      var stuff = Object.keys(this.knownBeakerVars);
      var diff = $(keys).not(stuff).get();
      diff = $(diff).not(this.predefined).get();

      // check if javascript removed a binding
      if ( this.nbmodel.namespace !== undefined ) {
        for (var p in this.nbmodel.namespace) {
          if (this.knownBeakerVars[p] !== undefined && keys.indexOf(p) < 0) {
            delete this.nbmodel.namespace[p];
            delete this.knownBeakerVars[p];
          }
        }
      }

      // check if javascript set any NEW variable
      _.forEach(diff, function(p) {
        if (this.knownBeakerVars[p] === undefined) {
          if (this.nbmodel.namespace === undefined)
            this.nbmodel.namespace = { };
          var t = this.beakerObj[p];
          if ((this.predefined.indexOf(p)>=0 || _.isFunction(t))) {
            // we do NOT put functions in the namespace
            delete this.nbmodel.namespace[p];
            delete this.knownBeakerVars[p];
          } else {
            this.setCache[p] = t;
            this.knownBeakerVars[p] = true;
            var makeGetter = function(self, name) {
              return function() { return self.beakerGetter(name); }
            }
            var makeSetter = function(self, name) {
              return function(v) { self.beakerSetter(name,v); }
            }
            Object.defineProperty(this.beakerObj, p,
                { writeable: true,
                  get: makeGetter(this,p),
                  set: makeSetter(this,p),
                  enumerable: true,
                  configurable: true
                });
          }
        }
      }.bind(this));

      // check if javascript set any new variable
      for (var p in this.setCache) {
        if (this.nbmodel.namespace === undefined)
          this.nbmodel.namespace = { };
        if (this.isCircularObject2(this.setCache[p]))
          this.nbmodel.namespace[p] = "ERROR: circular objects are not supported";
        else
          this.nbmodel.namespace[p] = transform(this.setCache[p]);
        if (this.knownBeakerVars[p] === undefined && this.beakerObj[p] === undefined) {
            this.knownBeakerVars[p] = true;
            var makeGetter = function(self, name) {
              return function() { return self.beakerGetter(name); }
            }
            var makeSetter = function(self, name) {
              return function(v) { self.beakerSetter(name,v); }
            }
            Object.defineProperty(this.beakerObj, p,
                { writeable: true,
                  get: makeGetter(this,p),
                  set: makeSetter(this,p),
                  enumerable: true,
                  configurable: true
                });
        }
      }
      // clear setcache and getcache
      this.setCache = { };
      this.getCache = { };
    };

    BeakerObject.prototype.transform = function(obj) {
      if (obj === this.beakerObj) {
        var its = [];
        var nms = [];
        for (var p in this.nbmodel.namespace) {
          if (this.predefined.indexOf(p)<0 && p != 'prefs' && p != 'language' && p != 'client') {
            var t = this.nbmodel.namespace[p];
            its.push(t);
            nms.push(p);
          }
        }
        obj = {
          type: 'OutputContainer',
          items: its,
          labels: nms,
          layout:{
            borderDisplayed: false,
            type: "BeakerObjectLayoutManager"
          }
        };
      }
      return transform(obj);
    };
    
    BeakerObject.prototype.isCircularObject = function(node, parents) {
      if (node === this.beakerObj)
        return true;
      
      return this.isCircularObject2(node, parents);
    };

    BeakerObject.prototype.isCircularObject2 = function(node, parents) {
      parents = parents || [];
      if (!node || typeof node != "object"){
        return false;
      }
      parents.push(node);
      for (var key in node) {
        var value = node[key];
        if (value && typeof value == "object") {
          if (parents.indexOf(value)>=0) {
            return true;
          }
          if (this.isCircularObject2(value, parents)) {
            return true;
          }
        }
      }
      parents.pop(node);
      return false;
    };

    var _bo = {};

    var _notebookModel = (function() {
      var _v = {};
      return {
        reset: function() {
          this.set({});
        },
        get: function() {
          return _v;
        },
        getBeakerObject: function() {
          return _bo;
        },
        set: function(v) {
          _v = v;
          // this removes legacy data previously saved
          if (_v._beaker_model_output_result !== undefined) {
            delete _v._beaker_model_output_result;
          }
          //if (_v.namespace === undefined)
          //  _v.namespace = { };
          _bo = new BeakerObject(_v);
          if (this.isEmpty()) {
            bkNotebookCellModelManager.reset([]);
          } else {
            bkNotebookCellModelManager.reset(_v.cells);
          }
        },
        isEmpty: function() {
          return _.isEmpty(_v);
        },
        isLocked: function() {
          return !this.isEmpty() && !!_v.locked;
        },
        toJson: function() {
          return angular.toJson(_v);
        },
        toCleanPrettyJson: function() {
          return bkHelper.sanitizeNotebookModel(_v);
        }
      };
    })();

    var generateBackupData = function() {
      return {
        notebookUri: _notebookUri.get(),
        uriType: _uriType,
        readOnly: _readOnly,
        format: _format,
        notebookModelJson: _notebookModel.toJson(),
        edited: _edited
      };
    };
    var generateRecentDocumentItem = function () {
      var data = {
        uri: _notebookUri.get(),
        type: _.isEmpty(_uriType) ? "" : _uriType,
        readOnly: !!_readOnly ? true : false,
        format: _.isEmpty(_format) ? "" : _format
      };
      return angular.toJson(data);
    };

    var recordRecentNotebook = function () {
      if (_notebookUri.get()) {
        bkRecentMenu.recordRecentDocument(generateRecentDocumentItem());
      }
    };

    var generateSaveData = function() {
      return {
        uriType: _uriType,
        notebookUri: _notebookUri.get(),
        notebookModelAsString: _notebookModel.toCleanPrettyJson()
      };
    };

    var _subscriptions = {};
    var connectcontrol = function(sessionId) {
      _subscriptions[sessionId] =
          $.cometd.subscribe("/notebookctrl/" + sessionId, function(req) {
            try {
              var name = "bkHelper."+req.data.method;
              var numargs = req.data.numargs;
              var args = [];
              var i;
              for ( i = 0; i < numargs; i++ ) {
                args.push( req.data["arg"+i] );
              }
              var publish = true;
              var reply2 = { session: sessionId };
              reply2.value = eval(name).apply(this, args);
              if(typeof reply2.value === 'object') {
                if(typeof reply2.value.promise === 'object' && typeof reply2.value.promise.then === 'function') {
                  reply2.value = reply2.value.promise;
                }
                if(typeof reply2.value.then === 'function') {
                  // must wait for result to be ready
                  publish = false;
                  reply2.value.then(function(res) {
                    reply2.value=res;
                    $.cometd.publish("/service/notebookctrl/receive", JSON.stringify(reply2));
                  }, function(err) {
                    reply2.value=err;
                    $.cometd.publish("/service/notebookctrl/receive", JSON.stringify(reply2));
                  });
                }
              }
              else if (reply2.value === undefined)
                reply2.value = true;
              if (publish) {
                $.cometd.publish("/service/notebookctrl/receive", JSON.stringify(reply2));
              }
            } catch (err) {
              console.log("CATCH "+err);
              $.cometd.publish("/service/notebookctrl/receive", JSON.stringify( { session: sessionId, value: false } ));
            }
          });
      };

      var disconnectcontrol = function(sessionId) {
        if (sessionId) {
          $.cometd.unsubscribe(_subscriptions[sessionId]);
          delete _subscriptions[sessionId];
        }
      };

    return {
      reset: function(notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId) {

        // backup existing session if it's not empty.
        if (_sessionId && !_notebookModel.isEmpty()) {
          bkSession.backup(_sessionId, generateBackupData());
        }

        if (_sessionId)
          disconnectcontrol(_sessionId);
        bkNotebookManager.reset();
        bkEvaluatorManager.reset();

        // check inputs
        if (!sessionId) {
          sessionId = bkUtils.generateId(6);
        }

        // reset
        _uriType = uriType;
        _readOnly = readOnly;
        _format = format;
        _notebookUri.set(notebookUri);
        _notebookModel.set(notebookModel);
        bkHelper.initBeakerPrefs();
        this.setNotebookModelEdited(!!edited);
        _sessionId = sessionId;
        bkNotebookNamespaceModelManager.init(sessionId, notebookModel, generateSaveData);
        connectcontrol(sessionId);
        bkSession.backup(_sessionId, generateBackupData());
        bkNotebookManager.init(this);
      },
      setSessionId: function(sessionId) {
        if (!sessionId) {
          sessionId = bkUtils.generateId(6);
        }
        _sessionId = sessionId;
        return _sessionId;
      },
      setup: function(notebookUri, uriType, readOnly, format, notebookModel, edited, sessionId) {

        // check inputs
        if (!sessionId) {
          sessionId = bkUtils.generateId(6);
        }

        // tell main thread that session lives in this window
        if (bkUtils.isElectron) {
          bkElectron.IPC.send('window-session', {
            windowId: bkElectron.remote.getCurrentWindow().id,
            sessionId: sessionId
          });
        }

        // reset
        _uriType = uriType;
        _readOnly = readOnly;
        _format = format;
        _notebookUri.set(notebookUri);
        _notebookModel.set(notebookModel);
        bkHelper.initBeakerPrefs();
        _sessionId = sessionId;

        _needsBackup = _edited;
        bkNotebookNamespaceModelManager.init(sessionId, notebookModel);
        bkNotebookManager.init(this);
        connectcontrol(sessionId);
        bkSession.backup(_sessionId, generateBackupData());
        recordRecentNotebook();
      },
      clear: function() {
        disconnectcontrol(_sessionId);
        bkEvaluatorManager.reset();
        bkNotebookNamespaceModelManager.clear(_sessionId);
        bkNotebookManager.reset();
        _notebookUri.reset();
        _uriType = null;
        _readOnly = null;
        _format = null;
        _notebookModel.reset();
        _sessionId = null;
        _edited = false;
        _needsBackup = false;
      },
      close: function() {
        var self = this;
        var close = function() {
          bkEvaluatorManager.exitAndRemoveAllEvaluators();
          self.clear();
        };
        if (_sessionId) {
          return bkSession.close(_sessionId).then(close);
        } else{
          close();
          return bkUtils.newPromise();
        }
      },
      backup: function() {
        if (_sessionId && !_notebookModel.isEmpty() && _needsBackup) {
          _needsBackup = false;
          return bkSession.backup(_sessionId, generateBackupData())
          .catch(function(err) {
            _needsBackup = true;
            throw err;
          });
        } else {
          return bkUtils.newPromise();
        }
      },
      updateNotebookUri: function(notebookUri, uriType, readOnly, format) {
        // to be used by save-as
        _uriType = uriType;
        _readOnly = readOnly;
        _format = format;
        _notebookUri.set(notebookUri);
      },
      recordRecentNotebook: recordRecentNotebook,
      updateRecentDocument: function (oldUrl) {
        bkRecentMenu.updateRecentDocument(oldUrl, generateRecentDocumentItem());
      },
      getNotebookPath: function() {
        if (_uriType === 'ajax') {
          if (window.beakerRegister.notebookName !== undefined) {
            return window.beakerRegister.notebookName;
          }
          return '';
        }
        else if (_notebookUri.get()) {
          return _notebookUri.get();
        } else {
          return "New Notebook";
        }
      },
      getNotebookUriType: function() {
        return _uriType;
      },
      getNotebookUri: function() {
        return _notebookUri.get();
      },
      getNotebookTitle: function() {
        if (_uriType === 'ajax') {
          if (window.beakerRegister.notebookName !== undefined) {
            return window.beakerRegister.notebookName;
          }
          return '';
        }
        else if (_notebookUri.get()) {
          return _notebookUri.get().replace(/^.*[\\\/]/, '');
        } else {
          return "New Notebook";
        }
      },
      isSavable: function() {
        return _notebookUri && !_readOnly;
      },
      /*
       * This function triggers all display implementations to save the current output status.
       * This save is asynchronous and happens in the current digest loop.
       * Users must schedule a timeout to execute code that requires the dumped state.
       */
      dumpDisplayStatus: function() {
        this.getNotebookCellOp().dumpDisplayStatus();
        return true;
      },
      getSaveData: function() {
        bkHelper.updateCellsFromDOM(this.getRawNotebookModel().cells);
        return generateSaveData();
      },
      getNotebookModelAsString: function() {
        return _notebookModel.toJson();
      },
      getRawNotebookModel: function() {
        return _notebookModel.get();
      },
      getBeakerObject: function() {
        return _notebookModel.getBeakerObject();
      },
      getSessionId: function() {
        return _sessionId;
      },
      isSessionValid: function() {
        if (!_sessionId) {
          return bkUtils.newPromise("false");
        } else {
          return bkSession.getSessions().then(function(sessions) {
            return _(sessions).keys().contains(_sessionId);
          });
        }
      },
      // TODO, move the following impl to a dedicated notebook model manager
      // but still expose it here
      setNotebookModelEdited: function(edited) {
        _needsBackup = edited;
        _edited = edited;
        bkDelayManager.create('setNotebookModelEdited', function() {
          bkUtils.httpPost(bkUtils.serverUrl('beaker/rest/session-backup/setEdited'), {
            sessionid: _sessionId,
            edited: edited
          });
        });
      },
      isNotebookModelEdited: function() {
        return _edited;
      },
      isNotebookLocked: function() {
        return _notebookModel.isLocked();
      },
      toggleNotebookLocked: function() {
        if (!_notebookModel.isEmpty()) {
          if (!_notebookModel.isLocked()) {
            _notebookModel.get().locked = true;
          } else {
            _notebookModel.get().locked = undefined;
          }
          this.setNotebookModelEdited(true);
        }
      },
      evaluatorUnused: function(plugin) {
        var n = _.find(_notebookModel.get().cells, function (c) {
          return c.type == "code" && c.evaluator == plugin;
        });
        return !n;
      },
      addEvaluator: function(evaluator) {
        _notebookModel.get().evaluators.push(evaluator);
        this.setNotebookModelEdited(true);
      },
      removeEvaluator: function(plugin) {
        var model = _notebookModel.get();
        model.evaluators = _.reject(model.evaluators, function(e) {
          return e.plugin == plugin;
        });
        this.setNotebookModelEdited(true);
      },
      reconnectEvaluators: function() {
        return bkEvaluatorManager.reconnectEvaluators();
      },
      getNotebookCellOp: function() {
        return bkNotebookCellModelManager;
      },
      getNotebookNewCellFactory: function() {
        return {
          newCodeCell: function(evaluator, id) {
            if (!evaluator) {
              evaluator = _notebookModel.get().evaluators[0].name;
            }
            if (!id) {
              id = "code" + bkUtils.generateId(6);
            }
            return {
              "id": id,
              "type": "code",
              "evaluator": evaluator,
              "input": {
                "body": ""
              },
              "output": {}
            };
          },
          newSectionCell: function(level, title, id) {
            var levelNumberToWordMapping = {1 : "One", 2 : "Two", 3 : "Three", 4 : "Four"};
            if (!level && level !== 0) {
              level = 1;
            }
            if (level <= 0) {
              throw "creating section cell with level " + level + " is not allowed";
            }
            if (!title && levelNumberToWordMapping[level]) {
              title = "Section Level " + levelNumberToWordMapping[level];
            }

            if (!id) {
              id = "section" + bkUtils.generateId(6);
            }
            return {
              "id": id,
              "type": "section",
              "title": title,
              "level": level
            };
          },
          newMarkdownCell: function(id) {
            var tail = _notebookModel.get().cells.length - 1;
            if (!id) {
              id = "markdown" + bkUtils.generateId(6);
            }
            return {
              "id": id,
              "type": "markdown",
              "body": ""
            };
          }
        };
      },
      isRootCellInitialization: function() {
        return _notebookModel.get().initializeAll;
      },
      setRootCellInitialization: function(initialization) {
        if (initialization === true) {
          _notebookModel.get().initializeAll = true;
        } else {
          _notebookModel.get().initializeAll = undefined;
        }
      },
      notebookModelAddEvaluator: function(newEvaluator) {
        _notebookModel.get().evaluators.push(newEvaluator);
      },
      notebookModelGetInitializationCells: function() {
        if (_notebookModel.get().initializeAll) {
          return this.getNotebookCellOp().getAllCodeCells("root");
        } else {
          return this.getNotebookCellOp().getInitializationCells();
        }
      },
      undo: function() {
        bkNotebookCellModelManager.undo();
      },
      redo: function() {
        bkNotebookCellModelManager.redo();
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
 * Module bk.delayManager
 */
(function() {
  'use strict';
  var module = angular.module('bk.delayManager', []);

  module.factory('bkDelayManager', function(
    $timeout
  ) {

    var queue = {},
      defaultDelayMs = 500;

    return {
      create: create
    };

    // ------

    /***
     * Create delay instance in queue
     * @param {string} name
     * @param {function} cb
     * @param {number} delayMs
     * @returns {*} $timeout promise
     */
    function create(name, cb, delayMs) {
      if (name === undefined || typeof name !== 'string') {
        console.warn('DelayManager: name is required');
        return false;
      }

      delayMs = delayMs === undefined ? defaultDelayMs : delayMs;

      _clear(name);

      var timer = $timeout(function() {
        cb();
        _remove(name);
      }, delayMs);

      queue[name] = timer;

      return timer;
    }

    // ------

    function _clear(name) {
      if (queue[name]) {
        $timeout.cancel(queue[name]);
      }
    }

    function _remove(name) {
        delete queue[name];
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
/**
 * Module bk.fileManipulation
 */
(function () {
  'use strict';
  var module = angular.module('bk.fileManipulation', [
    'bk.core',
    'bk.sessionManager',
    'bk.utils',
    'bk.electron'
  ]);
  module.factory('bkFileManipulation',
      function (bkCoreManager, bkSessionManager, bkUtils, bkElectron, $timeout) {

      var promptUriChooser = function (uriType, initUri) {
        if (!uriType) {
          uriType = "file";
        }
        var deferred = bkUtils.newDeferred();
        var fileSaver = bkCoreManager.getFileSaver(uriType);
        if (!fileSaver || !fileSaver.showFileChooser) {
          fileSaver = bkCoreManager.getFileSaver("file");
        }
        fileSaver.showFileChooser(initUri).then(function (ret) {
          if (_.isEmpty(ret.uri)) {
            deferred.reject("cancelled");
          } else {
            deferred.resolve(ret);
          }
        }, function(){
          deferred.reject("cancelled");
        });
        return deferred.promise;
      };

      var promptIfOverwrite = function (uri) {
        var deferred = bkUtils.newDeferred();
        bkCoreManager.show2ButtonModal(
                "File " + uri + " exists. Overwrite?",
            "File exists",
            function () {
              deferred.resolve();
            },
            function () {
              deferred.reject();
            }, "Overwrite", "Cancel", "btn-danger", "");
        return deferred.promise;
      };

      var _renamePromptUriChooser = function (deferred, uriType, initUri) {
        promptUriChooser(uriType, initUri).then(function (ret) {
          _renamePromptIfOverwrite(deferred, ret.uri, ret.uriType);
        }, function () {
          deferred.reject("cancelled"); // file rename cancelled
        });
      };

      var _renamePromptIfOverwrite = function (deferred, uri, uriType) {
        var fileSaver = bkCoreManager.getFileSaver(uriType);
        bkSessionManager.dumpDisplayStatus();
        var oldPath = bkSessionManager.getNotebookPath();
        $timeout(function () {
          return fileSaver.rename(oldPath, uri, false);
        }, 1).then(function () {
          deferred.resolve({uri: uri, uriType: uriType}); // file rename succeed
        }, function (reason) {
          if (reason === "exists") {
            promptIfOverwrite(uri).then(function () {
              fileSaver.rename(oldPath, uri, true).then(function () {
                deferred.resolve({uri: uri, uriType: uriType}); // file rename succeed
              }, function (reason) {
                deferred.reject(reason); // file rename failed
              });
            }, function () {
              _renamePromptUriChooser(deferred, uriType, uri);
            });
          } else if (reason === "isDirectory") {
            bkCoreManager.show1ButtonModal(
                    uri + " is a directory. Please choose a different location",
                "Rename Failed",
                function () {
                  _renamePromptUriChooser(deferred, uriType, uri);
                });
          } else if (reason !== "cancelled") {
            console.log(reason);
            bkCoreManager.show1ButtonModal(
                    "Error renaming to " + uri,
                "Rename Failed",
                function () {
                  _renamePromptUriChooser(deferred, uriType, uri);
                });
          }
          else {
            deferred.reject(reason); // file rename failed
          }
        });
      };

      var saveAlwaysOverwrite = function (uri, uriType) {
        var deferred = bkUtils.newDeferred();
        var fileSaver = bkCoreManager.getFileSaver(uriType);
        bkSessionManager.dumpDisplayStatus();
        $timeout(function () {
          var content = bkSessionManager.getSaveData().notebookModelAsString;
          return fileSaver.save(uri, content, true);
        }, 1).then(function () {
          deferred.resolve({uri: uri, uriType: uriType});
        }, function (reason) {
          deferred.reject(reason);
        });
        return deferred.promise;
      };

      var _savePromptUriChooser = function (deferred, uriType, initUri) {
        promptUriChooser(uriType, initUri).then(function (ret) {
          _savePromptIfOverwrite(deferred, ret.uri, ret.uriType);
        }, function () {
          deferred.reject("cancelled"); // file save cancelled
        });
      };

      var savePromptChooseUri = function () {
        var deferred = bkUtils.newDeferred();
        _savePromptUriChooser(deferred);
        return deferred.promise;
      };

      var _savePromptIfOverwrite = function (deferred, uri, uriType) {
        var fileSaver = bkCoreManager.getFileSaver(uriType);
        bkSessionManager.dumpDisplayStatus();
        $timeout(function () {
          var content = bkSessionManager.getSaveData().notebookModelAsString;
          return fileSaver.save(uri, content);
        }, 1).then(function () {
          deferred.resolve({uri: uri, uriType: uriType}); // file save succeed
        }, function (reason) {
          if (reason === "exists") {
            promptIfOverwrite(uri).then(function () {
              saveAlwaysOverwrite(uri, uriType).then(function (ret) {
                deferred.resolve(ret); // file save succeed
              }, function (reason) {
                deferred.reject(reason); // file save failed
              });
            }, function () {
              _savePromptUriChooser(deferred, uriType, uri);
            });
          } else if (reason === "isDirectory") {
            bkCoreManager.show1ButtonModal(
                    uri + " is a directory. Please choose a different location",
                "Save Failed",
                function () {
                  _savePromptUriChooser(deferred, uriType, uri);
                });
          } else if (reason !== "cancelled") {
            console.log(reason);
            bkCoreManager.show1ButtonModal(
                    "Error saving to " + uri,
                "Save Failed",
                function () {
                  _savePromptUriChooser(deferred, uriType, uri);
                });
          }
          else {
            deferred.reject(reason); // file save failed
          }
        });
      };

      var service = {
        renameNotebook: function (uri, uriType) {
          var deferred = bkUtils.newDeferred();
          _renamePromptIfOverwrite(deferred, uri, uriType);
          return deferred.promise;
        },
        saveNotebookAs: function (uri, uriType) {
          var deferred = bkUtils.newDeferred();
          _savePromptIfOverwrite(deferred, uri, uriType);
          return deferred.promise;
        },
        saveNotebook: function (saveFailed) {
          var thenable;
          if (bkSessionManager.isSavable()) {
            bkSessionManager.dumpDisplayStatus();
            thenable = $timeout(function () {
              var saveData = bkSessionManager.getSaveData();
              var deferred = bkUtils.newDeferred();
              var fileSaver = bkCoreManager.getFileSaver(saveData.uriType);
              var content = saveData.notebookModelAsString;
              fileSaver.save(saveData.notebookUri, content, true).then(function () {
                deferred.resolve({uri: saveData.notebookUri, uriType: saveData.uriType});
              }, function (reason) {
                deferred.reject(reason);
              });
              return deferred.promise;
            }, 1);
          } else {
            if (bkUtils.isElectron) {
              var Dialog = bkElectron.Dialog;
              var thisWindow = bkElectron.thisWindow;
              var deferred = bkUtils.newDeferred();
              bkUtils.getWorkingDirectory().then(function (defaultPath) {
                var options = {
                  title: 'Save Beaker Notebook',
                  defaultPath: defaultPath,
                  filters: [
                    { name: 'Beaker Notebook Files', extensions: ['bkr'] }
                  ]
                };
                var path = Dialog.showSaveDialog(thisWindow, options);
                if (path === undefined) {
                  saveFailed('cancelled');
                  return;
                }
                bkUtils.httpPost('rest/file-io/setWorkingDirectory', { dir: path });
                var ret = {
                  uri: path,
                  uriType: 'file'
                };
                bkSessionManager.dumpDisplayStatus();
                var saveData = bkSessionManager.getSaveData();
                var fileSaver = bkCoreManager.getFileSaver(ret.uriType);
                var content = saveData.notebookModelAsString;
                fileSaver.save(ret.uri, content, true).then(function () {
                  deferred.resolve(ret);
                }, function (reason) {
                  deferred.reject(reason);
                });
              });
              thenable = deferred.promise;
            } else {
              thenable = savePromptChooseUri();
            }
          }
          return thenable;
        }
      };
      return service;
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
 * Module bk.notebook
 * This is the 'notebook view' part of {@link bkApp}. What is the root cell holding the nested
 * {@link bkCell}s.
 */

(function() {
  'use strict';
  var module = angular.module('bk.notebook', [
    'bk.globals',
    'bk.commonUi',
    'bk.utils',
    'bk.outputLog',
    'bk.core',
    'bk.sessionManager',
    'bk.evaluatorManager',
    'bk.cellMenuPluginManager',
    'bk.outputDisplay',
    'bk.publication'
  ]);
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
 * bkCell
 * - the controller that responsible for directly changing the view
 * - the container for specific typed cell
 * - the directive is designed to be capable of used in a nested way
 * - conceptually, a cell is 'cell model' + 'view model'(an example of what goes in to the view
 * model is code cell bg color)
 * - A bkCell is generically corresponds to a portion of the notebook model (currently, it is
 * always a branch in the hierarchy)
 * - When exporting (a.k.a. sharing), we will need both the cell model and the view model
 */

(function() {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkCell', function(
      bkUtils,
      bkSessionManager,
      bkCoreManager,
      bkEvaluatorManager,
      bkEvaluatePluginManager) {
    
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/cell'](),
      scope: {
        cellmodel: '=',
        index: '='
      },
      controller: function($scope) {
        $scope.cellmodel.evaluatorReader = false;

        var getBkBaseViewModel = function() {
          return bkCoreManager.getBkApp().getBkNotebookWidget().getViewModel();
        };
        var notebookCellOp = bkSessionManager.getNotebookCellOp();

        $scope.$watch(function() {
          return notebookCellOp.isLast($scope.cellmodel.id);
        }, function(newVal, oldVal) {
          $scope.isLarge = newVal;
        });

        $scope.cellview = {
          showDebugInfo: false,
          menu: {
            items: [],
            renameItem: function(opts) {
              _.findWhere(this.items,
                {name: opts.name}
              ).name = opts.newName;
            },
            addItem: function(menuItem) {
              this.items.push(menuItem);
            },
            changeSortOrder: function(opts) {
              var item = _.findWhere(this.items,
                {name: opts.name}
              );
              if(item){
                item.sortorder = opts.sortorder;
              }
            },
            addSeparator: function(itemName) {
              var item = _.findWhere(this.items,
                {name: itemName}
              );
              if(item){
                item.separator = true;
              }
            },
            addItemToHead: function(menuItem) {
              this.items.splice(0, 0, menuItem);
            },
            removeItem: function(itemName) {
              var index = this.items.indexOf(_.find(this.items, function(it) {
                return it.name === itemName;
              }));
              this.items.splice(index, 1);
            }
          }
        };

        $scope.isLocked = function() {
          return bkSessionManager.isNotebookLocked();
        };

        $scope.newCellMenuConfig = {
          isShow: function() {
            return !bkSessionManager.isNotebookLocked() && !notebookCellOp.isContainer($scope.cellmodel.id);
          },
          attachCell: function(newCell) {
            notebookCellOp.insertAfter($scope.cellmodel.id, newCell);
          },
          prevCell: function() {
            return $scope.cellmodel;
          }
        };

        $scope.isRoot = function() {
          return $scope.$parent.getNestedLevel === undefined;
        };

        $scope.toggleShowDebugInfo = function() {
          $scope.cellview.showDebugInfo = !$scope.cellview.showDebugInfo;
        };
        $scope.isShowDebugInfo = function() {
          return $scope.cellview.showDebugInfo;
        };
        $scope.isDebugging = function() {
          return getBkBaseViewModel().isDebugging();
        };
        $scope.getNestedLevel = function() {
          // bkCell is using isolated scope, $scope is the isolated scope
          // $scope.$parent is the scope resulted from ng-repeat (ng-repeat creates a prototypal
          // scope for each ng-repeated item)
          // $Scope.$parent.$parent is the container cell(which initiates ng-repeat) scope
          var parent = $scope.$parent.$parent;
          return parent.getNestedLevel ? parent.getNestedLevel() + 1 : 1;
        };
        $scope.getParentId = function() {
          return $scope.$parent.$parent.cellmodel ? $scope.$parent.$parent.cellmodel.id : 'root';
        };

        $scope.toggleCellInput = function() {
          if ($scope.cellmodel.input.hidden) {
            delete $scope.cellmodel.input.hidden;
          } else {
            $scope.cellmodel.input.hidden = true;
          }
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.toggleMarkdown = function() {
          if ($scope.cellmodel.hidden) {
            delete $scope.cellmodel.hidden;
          } else {
            $scope.cellmodel.hidden = true;
          }
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.toggleSection = function() {
          $scope.cellmodel.collapsed = !$scope.cellmodel.collapsed;
          $scope.$broadcast('beaker.section.toggled', $scope.cellmodel.collapsed);
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.evaluate = function($event) {
          if($scope.isCellRunning()) {
            return;
          }
          if ($event) {
            $event.stopPropagation();
          }
          var toEval;

          if ($scope.cellmodel.type === 'section') {
            toEval = $scope.cellmodel.id;
          } else {
            $scope.cellmodel.output.state = {};
            toEval = $scope.cellmodel;
          }

          bkCoreManager.getBkApp()
            .evaluateRoot(toEval)
            .catch(function(data) {
              console.error(data);
            });
        };

        $scope.deleteCell = function() {
          notebookCellOp.delete($scope.cellmodel.id, true);
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.hasFaultyEvaluator = function() {
          return !($scope.cellmodel.evaluator in bkEvaluatePluginManager.getKnownEvaluatorPlugins());
        };

        $scope.getEvaluators = function() {
          return bkEvaluatorManager.getLoadedEvaluators();
        };

        $scope.getEvaluator = function() {
          return bkEvaluatorManager.getEvaluator($scope.cellmodel.evaluator);
        };

        var moveMethod = 'move';
        if ($scope.cellmodel.type == 'section') {
          moveMethod = 'moveSection';
        }

        $scope.moveCellUp = function() {
          notebookCellOp[moveMethod + 'Up']($scope.cellmodel.id);
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.moveCellDown = function() {
          notebookCellOp[moveMethod + 'Down']($scope.cellmodel.id);
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.moveCellUpDisabled = function() {
          return !notebookCellOp['isPossibleTo' + _.capitalize(moveMethod) + 'Up']($scope.cellmodel.id);
        };

        $scope.moveCellDownDisabled = function() {
          return !notebookCellOp['isPossibleTo' + _.capitalize(moveMethod) + 'Down']($scope.cellmodel.id);
        };

        $scope.isLockedCell = function() {
          return $scope.cellmodel.locked;
        };
        
        $scope.lockUnlockCell = function() {
          bkSessionManager.setNotebookModelEdited(true);
          if ($scope.isLockedCell()) {
            $scope.cellmodel.locked = undefined;
          } else {
            $scope.cellmodel.locked = true;
          }
        };

        $scope.cellview.menu.addItem({
          name: 'Lock Cell',
          sortorder: 110,
          isChecked: function() {
            return $scope.isLockedCell();
          },
          action: $scope.lockUnlockCell
        });

        $scope.cellview.menu.addItem({
          name: 'Cut',
          sortorder: 150,
          action: function() {
            notebookCellOp.cut($scope.cellmodel.id);
          },
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.cellview.menu.addItem({
          name: 'Paste (append after)',
          sortorder: 160,
          disabled: function() {
            return !notebookCellOp.clipboard;
          },
          action: function() {
            notebookCellOp.paste($scope.cellmodel.id);
          }
        });

        $scope.cellview.menu.addItem({
          name: 'Move up',
          sortorder: 210,
          shortcut: ['Ctrl-Alt-Up', 'Alt-Cmd-Up'],
          action: $scope.moveCellUp,
          disabled: $scope.moveCellUpDisabled
        });

        $scope.cellview.menu.addItem({
          name: 'Move down',
          sortorder: 220,
          shortcut: ['Ctrl-Alt-Down', 'Alt-Cmd-Down'],
          action: $scope.moveCellDown,
          disabled: $scope.moveCellDownDisabled
        });

        $scope.cellview.menu.addItem({
          name: 'Delete cell',
          sortorder: 230,
          shortcut: ['Ctrl-Alt-D', 'Alt-Cmd-Backspace'],
          action: $scope.deleteCell,
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.getTypeCellUrl = function() {
          var type = $scope.cellmodel.type;
          return type + '-cell.html';
        };

        $scope.getCellSummary = function () {
          var body = '';
          if($scope.isCodeCell()) {
            body = $scope.cellmodel.input.body;
          }
          if($scope.isMarkdownCell()){
            body = $scope.cellmodel.body;
          }
          return body.replace(/\n/g, ' ');
        };

        $scope.isMarkdownCell = function() {
          return $scope.cellmodel.type === 'markdown';
        };



        $scope.isCodeCell = function() {
          return $scope.cellmodel.type == 'code';
        };

        $scope.isSectionCell = function() {
          return $scope.cellmodel.type == 'section';
        };
        
        $scope.isCellRunning = function () {
          return bkCoreManager.getBkApp().isRunning($scope.cellmodel.id);
        };

        $scope.isCellHidden = function () {
          return $scope.isCodeCell() ? $scope.cellmodel.input.hidden :
            $scope.isMarkdownCell() ? $scope.cellmodel.hidden :
            $scope.isSectionCell ? $scope.cellmodel.collapsed : false;
        };

        $scope.shouldShowSummary = function () {
          return !$scope.isSectionCell() && $scope.isCellHidden() && !$scope.isLocked();
        };

        $scope.wideMenu = function () {
          return $scope.isCellHidden() && !$scope.isSectionCell();
        };




        $scope.collapseCellMenu = {
          'code' : {
            click: $scope.toggleCellInput,
            tooltip: 'cell input'
          },
          'markdown' : {
            click: $scope.toggleMarkdown,
            tooltip: 'text'
          },
          'section' : {
            click: $scope.toggleSection,
            tooltip: 'section'
          }
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
  var module = angular.module('bk.notebook');

  module.directive('ngHideEx', function($animate) {
    return {
      scope: {
        'ngHideEx': '=',
        'afterShow': '&',
        'afterHide': '&'
      },
      link: function(scope, element) {
        scope.$watch('ngHideEx', function(hide, oldHide) {
          if (hide) {
            $animate.addClass(element, 'ng-hide', {tempClasses: 'ng-hide-animate'}).then(scope.afterHide);
          }
          if (!hide) {
            $animate.removeClass(element, 'ng-hide', {tempClasses: 'ng-hide-animate'}).then(scope.afterShow);
          }
        });
      }
    }
  });

  module.directive('bkCodeCell', function(
      bkUtils,
      bkEvaluatorManager,
      bkEvaluatePluginManager,
      bkCellMenuPluginManager,
      bkSessionManager,
      bkCoreManager,
      bkDragAndDropHelper,
      bkPublicationHelper,
      GLOBALS,
      $rootScope,
      $timeout,
      autocompleteParametersService) {

    var notebookCellOp = bkSessionManager.getNotebookCellOp();
    var getBkNotebookWidget = function() {
      return bkCoreManager.getBkApp().getBkNotebookWidget();
    };
    var CELL_TYPE = 'code';
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/codecell'](),
      scope: {cellmodel: '=', cellmenu: '='},
      controller: function($scope) {
        
        $scope.changeHandler = function(cm, e) {
          if ($scope.cellmodel.input.body !== cm.getValue()) {
            $scope.cellmodel.lineCount = cm.lineCount();
            $scope.cellmodel.input.body = cm.getValue();
            if (!bkSessionManager.isNotebookModelEdited()) {
              bkSessionManager.setNotebookModelEdited(true);
              bkUtils.refreshRootScope();
            }
          }
        };
        
        $scope.onGutterClick = function(cm, line, gutter, e) {
          if (gutter !== 'CodeMirror-linenumbers') return;

          var prev = (e.ctrlKey || e.shiftKey) || e.metaKey ? cm.listSelections() : [];
          var anchor = line;
          var head = line + 1;

          function update() {
            var curr = {
              anchor: CodeMirror.Pos(anchor, head > anchor ? 0 : null),
              head: CodeMirror.Pos(head, 0)
            };
            if (e.shiftKey) {
              if (prev[0].anchor.line >= head) {
                cm.extendSelection(curr.anchor, prev[0].head, {origin: "*mouse"});
              } else {
                cm.extendSelection(prev[0].anchor, curr.head, {origin: "*mouse"});
              }
            } else {
              cm.setSelections(prev.concat([curr]), prev.length, {origin: "*mouse"});
            }
            $scope.focus();
          }
          function onMouseMove(e) {
            var currLine = cm.lineAtHeight(e.clientY, "client");
            if (head > anchor) {
              currLine++;
            }
            if (currLine != head) {
              head = currLine;
              update();
            }
          }
          function onMouseUp(e) {
            removeEventListener("mouseup", onMouseUp);
            removeEventListener("mousemove", onMouseMove);
          }

          update();
          addEventListener("mousemove", onMouseMove);
          addEventListener("mouseup", onMouseUp);
        };
        
        $scope.cellview = {
          inputMenu: [],
          displays: []
        };

        $scope.isLocked = function() {
          return bkSessionManager.isNotebookLocked();
        };

        $scope.isEmpty = function() {
          return !($scope.cellmodel.output.result);
        };

        $scope.isError = function() {
          //jscs:disable
          if ($scope.cellmodel === undefined || $scope.cellmodel.output === undefined || $scope.cellmodel.output.result === undefined) {
            //jscs:enable
            return false;
          }

          var type = $scope.cellmodel.output.result.innertype;

          if (!type && $scope.cellmodel.output.result.payload !== undefined) {
            type = $scope.cellmodel.output.result.payload.innertype;
          }

          var isError = type === 'Error';
          $scope.cellmodel.isError = isError;

          return isError;
        };

        $scope.isShowInput = function() {
          if ($scope.isLocked()) {
            return false;
          }
          return $scope.cellmodel.input.hidden !== true;
        };

        $scope.bkNotebook = getBkNotebookWidget();

        //ensure cm refreshes when 'unhide'
        $scope.afterShow = function () {
          if ($scope.cm)
            $scope.cm.refresh();
        };
        $scope.$watch('cellmodel.input.hidden', function(newValue, oldValue) {
          if (oldValue === true && newValue !== oldValue) {
            bkUtils.fcall(function() {
              $scope.afterShow();
            });
          }
        });

        $scope.prepareForSearch = function() {
          delete $scope.cellmodel.output.hidden;
        };
        
        $scope.afterSearchActions = function() {
          //nothing to do
        };
        
        $scope.prepareForSearchCellActions = function() {
          $scope.cm.off('change', $scope.changeHandler);
        };
        
        $scope.doPostSearchCellActions = function() {
          $scope.cm.on('change', $scope.changeHandler);
          $scope.changeHandler($scope.cm, null);
        };

        $scope.isHiddenOutput = function() {
          return $scope.cellmodel.output.selectedType == 'Hidden';
        };

        $scope.hasOutput = function() {
          return $scope.cellmodel.output.result !== undefined;
        };

        $scope.backgroundClick = function(event) {
          if (!$scope.isShowInput() ||
              $(event.toElement).parents().hasClass('code-cell-output') ||
              $(event.toElement).hasClass('evaluate-script')) {
            return;
          }
          var top = $(event.delegateTarget).offset().top;
          var outputElement = $(event.delegateTarget).children('.code-cell-output:first');
          var bottom;
          if (outputElement.length > 0) {
            bottom = outputElement.offset().top;
          } else {
            bottom = top + $(event.delegateTarget).height();
          }
          // Even better would be to detect left/right and move to
          // beginning or end of line, but we can live with this for now.
          var cm = $scope.cm;
          setTimeout(function() {
            // click-shiftKey handling - select from current position to the end
            if (event.shiftKey) {
              var cursor = cm.lastPositon || {"line" : 0, "ch" : 0};
              var lastPosition = {
                "line" : cm.lineCount() - 1,
                "ch" : cm.getLine(cm.lastLine()).length
              };
              cm.setSelection(cursor, lastPosition);
            } else {
              if (event.pageY < (top + bottom) / 2) {
                cm.setCursor(0, 0);
              } else {
                cm.setCursor(cm.lineCount() - 1,
                    cm.getLine(cm.lastLine()).length);
              }
              cm.focus();
            }
          }, 0);

        };

        $scope.isShowOutput = function() {

          var result = $scope.cellmodel.output.result;

          if (!$scope.hasOutput() || result.hidden) {
            return false;
          }

          if (result.status !== "RUNNING" && ($scope.cellmodel.output.hidden === true || $scope.isHiddenOutput())) {
            return false;
          }

          return true;
        };

        $scope.outputTitle = function() {
          return $scope.isError() ? 'Error' : null;
        };

        $scope.evaluate = function($event) {
          if($scope.isCellRunning()) {
            return;
          }
          if ($event) {
            $event.stopPropagation();
          }

          var deferred = bkUtils.newDeferred();
          $scope.cellmodel.output.state = {};
          bkCoreManager.getBkApp().evaluateRoot($scope.cellmodel).then(deferred.resolve, function (error) {
            console.log('Evaluation failed');
            deferred.reject(error);
          });
          return deferred.promise;
        };

        $scope.isCellRunning = function () {
          return bkCoreManager.getBkApp().isRunning($scope.cellmodel.id);
        };

        $scope.cancel = function() {
          if($scope.isCellRunning()) {
            bkCoreManager.getBkApp().cancel();
          }
        };

        var editedListener = function(newValue, oldValue) {
          if (newValue !== oldValue) {
            bkSessionManager.setNotebookModelEdited(true);
          }
        };
        $scope.$watch('cellmodel.id', editedListener);
        $scope.$watch('cellmodel.evaluator', editedListener);
        $scope.$watch('cellmodel.initialization', editedListener);
        $scope.$watch('cellmodel.wordWrapDisabled', editedListener);
        $scope.$watch('cellmodel.input.body', editedListener);
        $scope.$watch('cellmodel.output.result', editedListener);

        $scope.autocomplete = function(cpos, onResults) {
          var evaluator = bkEvaluatorManager.getEvaluator($scope.cellmodel.evaluator);
          if (!evaluator) {
            return;
          }
          if (evaluator.autocomplete) {
            evaluator.autocomplete($scope.cellmodel.input.body, cpos, onResults);
          } else if (evaluator.autocomplete2) {
            // used by JavaScript evaluator
            evaluator.autocomplete2($scope.cm, null, onResults);
          }
        };

        $scope.showDocs = function(cpos) {

          var cb = function(doc) {
            $scope.$broadcast('showTooltip', doc);
          };

          var evaluator = bkEvaluatorManager.getEvaluator($scope.cellmodel.evaluator);
          if (!evaluator) {
            return;
          }
          if (evaluator.showDocs) {
            evaluator.showDocs($scope.cellmodel.input.body, cpos, cb);
          }
        };

        $scope.getEvaluators = function() {
          return bkEvaluatorManager.getLoadedEvaluators();
        };

        $scope.getEvaluator = function() {
          if (!($scope.cellmodel.evaluator in bkEvaluatePluginManager.getKnownEvaluatorPlugins())) {
            return "fail";
          }
          return bkEvaluatorManager.getEvaluator($scope.cellmodel.evaluator);
        };

        $scope.updateUI = function(evaluator) {
          if(!$scope.cm) {
            return;
          }
          $scope.cellmodel.evaluatorReader = Boolean(evaluator);
          var visualParams = bkEvaluatorManager.getVisualParams($scope.cellmodel.evaluator);
          
          var cmMode = evaluator ? evaluator.cmMode : visualParams ? visualParams.cmMode : undefined;
          var indentSpaces = evaluator ? evaluator.indentSpaces : undefined;
          
          if(cmMode) {
            $scope.cm.setOption('mode', visualParams.cmMode);
          }
          if(indentSpaces) {
            $scope.cm.setOption('indentUnit', evaluator.indentSpaces);
          }
        };
        $scope.$watch('getEvaluator()', function(newValue, oldValue) {
          $scope.updateUI(newValue);
        });

        $scope.isLockedCell = function() {
          return $scope.cellmodel.locked;
        };

        $scope.cellmenu.addItem({
          name: 'Initialization Cell',
          sortorder: 100,
          isChecked: function() {
            return $scope.isInitializationCell();
          },
          action: function() {
            if ($scope.isInitializationCell()) {
              $scope.cellmodel.initialization = undefined;
            } else {
              $scope.cellmodel.initialization = true;
            }
            notebookCellOp.reset();
          },
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.cellmenu.addItem({
          name: 'Word wrap',
          sortorder: 130,
          isChecked: function () {
            return $scope.isWordWrap();
          },
          action: function () {
            if ($scope.cellmodel.wordWrapDisabled) {
              delete $scope.cellmodel.wordWrapDisabled;
            } else {
              $scope.cellmodel.wordWrapDisabled = true;
            }
          },
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.cellmenu.addItem({
          name: 'Options...',
          sortorder: 140,
          action: function() {
            bkCoreManager.showFullModalDialog(function cb(r) { } ,
                'app/mainapp/dialogs/codecelloptions.jst.html', 'CodeCellOptionsController', $scope.cellmodel);
          },
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.cellmenu.addItem({
          name: 'Run',
          sortorder: 180,
          action: function() {
            $scope.evaluate();
          }
        });

        $scope.cellmenu.addItem({
          name: 'Show input cell',
          sortorder: 190,
          isChecked: function() {
            return !$scope.cellmodel.input.hidden;
          },
          action: function() {
            if ($scope.cellmodel.input.hidden) {
              delete $scope.cellmodel.input.hidden;
            } else {
              $scope.cellmodel.input.hidden = true;
            }
          },
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.cellmenu.addItem({
          name: 'Show output cell (if available)',
          sortorder: 200,
          isChecked: function() {
            return !$scope.cellmodel.output.hidden;
          },
          action: function() {
            if ($scope.cellmodel.output.hidden) {
              delete $scope.cellmodel.output.hidden;
            } else {
              $scope.cellmodel.output.hidden = true;
            }
          }
        });

        $scope.isInitializationCell = function() {
          return $scope.cellmodel.initialization;
        };

        $scope.isWordWrap = function () {
          return !$scope.cellmodel.wordWrapDisabled;
        };

        $scope.power = {
          menu: {
            items: [
              {
                name: 'Disable initialization',
                sortorder: 100,
                action: function() {
                  if ($scope.isInitializationCell()) {
                    $scope.cellmodel.initialization = undefined;
                  } else {
                    $scope.cellmodel.initialization = true;
                  }
                  notebookCellOp.reset();
                }
              }
            ]
          }
        };

        bkPublicationHelper.helper(CELL_TYPE, $scope);

        $scope.cellmenu.changeSortOrder({
          name: "Publish...",
          sortorder: 170
        });

        var getElapsedTimeString = function() {
          var elapsedTime = $scope.cellmodel.output.elapsedTime;
          if (_.isNumber(elapsedTime) && !$scope.hasOutput()) {
            return "Elapsed time: " + bkUtils.formatTimeString(elapsedTime);
          }
          return '';
        };

        $scope.cellmenu.addItem({
          name: getElapsedTimeString,
          sortorder: 300,
          action: null,
          separator: true
        });

        var getEvaluationSequenceNumber = function() {
          var seqNo = $scope.cellmodel.output.evaluationSequenceNumber;
          if (seqNo && !$scope.hasOutput()) {
            return "Run Sequence: " + seqNo;
          }
          return '';
        };

        $scope.cellmenu.addItem({
          name: getEvaluationSequenceNumber,
          sortorder: 310,
          action: null
        });
        
        $scope.cellmenu.addSeparator("Cut");

        $scope.cellmenu.addSeparator("Run");
        
      },
      link: function(scope, element) {
        scope.showDebug = false;

        var resizeHandler = function() {
          var showing = document.body.getElementsByClassName('CodeMirror-fullscreen')[0];
          if (!showing) {
            return;
          }
          showing.CodeMirror.getWrapperElement().style.height = bkHelper.winHeight() + 'px';
        };
        scope.scrollTo = function(){
          window.scrollTo(0, element.offset().top - 100);
        };
        CodeMirror.on(window, 'resize', resizeHandler);

        var codeMirrorOptions = bkCoreManager.codeMirrorOptions(scope, notebookCellOp);
        _.extend(codeMirrorOptions.extraKeys, {
          'Esc' : function(cm) {
            if (autocompleteParametersService.isActive()) {
              return autocompleteParametersService.endCompletion();
            }
            cm.execCommand('singleSelection');
            if (cm.state.vim && cm.state.vim.insertMode) {
              CodeMirror.Vim.exitInsertMode(cm);
            } else {
              if (bkHelper.isFullScreen(cm)) {
                bkHelper.setFullScreen(cm, false);
              }
            }
          },
          'Shift-Ctrl-E': function(cm) {
            scope.popupMenu();
            var parent = element;
            if (bkHelper.getBkNotebookViewModel().isAdvancedMode()) {
              var inputMenuDivAdvanced = element.parents('.bkcell.code.bkr').find('.toggle-menu').first();
              parent = inputMenuDivAdvanced.find('.dropdown.advanced-only').first();
            }
            parent.find('.inputcellmenu').find('li').find('a')[0].focus();
          },
          'Shift-Cmd-E': function(cm) {
            scope.popupMenu();
            var parent = element;
            if (bkHelper.getBkNotebookViewModel().isAdvancedMode()) {
              var inputMenuDivAdvanced = element.parents('.bkcell.code.bkr').find('.toggle-menu').first();
              parent = inputMenuDivAdvanced.find('.dropdown.advanced-only').first();
            }
            parent.find('.inputcellmenu').find('li').find('a')[0].focus();
          },
          'Ctrl-Alt-H': function(cm) { // cell hide
            scope.cellmodel.input.hidden = true;
            bkUtils.refreshRootScope();
          },
          'Cmd-Alt-H': function(cm) { // cell hide
            scope.cellmodel.input.hidden = true;
            bkUtils.refreshRootScope();
          },
          'Shift-Ctrl-Enter': function(cm) {
            scope.evaluateSelection(cm);
          },
          'Shift-Cmd-Enter':  function(cm) {
            scope.evaluateSelection(cm);
          },
          'PageDown': function (cm) {
            //override default behaviour of codemirror control
            //do nothing
          },
          'PageUp': function (cm) {
            //override default behaviour of codemirror control
            //do nothing
          }
        });

        var initCodeMirror = function() {
          var template = '<textarea class="bkcelltextarea" ng-model="cellmodel.input.body"/>';
          $(element.find('.bkcelltextarea')[0]).replaceWith($(template).text(scope.cellmodel.input.body));

          _.extend(codeMirrorOptions, {
            theme: bkHelper.getTheme(),
            lineWrapping: scope.isWordWrap()
          });

          scope.cm = CodeMirror.fromTextArea(element.find('textarea')[0], codeMirrorOptions);
          scope.bkNotebook.registerCM(scope.cellmodel.id, scope.cm);
          scope.cm.on('change', scope.changeHandler);
          scope.cm.on('blur', function () {
            if ($('.CodeMirror-hint').length > 0) {
              //codecomplete is up, skip
              return;
            }
            scope.cm.lastPositon = scope.cm.getCursor('anchor');
            if(document.hasFocus()){
              // This is involved in issue #4397, but we do not have a good fix.
              scope.cm.setSelection({line: 0, ch: 0 }, {line: 0, ch: 0 }, {scroll: false});
            }
          });
          scope.cm.on('gutterClick', scope.onGutterClick);
          bkDragAndDropHelper.configureDropEventHandlingForCodeMirror(scope.cm, function () {
            return scope.cm.getOption('mode') === 'htmlmixed';
          });

          scope.updateUI(scope.getEvaluator());
          // Since the instantiation of codemirror instances is now lazy,
          // we need to track and handle focusing on an async cell add
          if (scope._shouldFocusCodeMirror) {
            delete scope._shouldFocusCodeMirror;
            return scope.cm.focus();
          }
        };

        initCodeMirror();
        scope.displayOutput = true;

        scope.focus = function() {
          if (scope.cm) scope.cm.focus();
        };

        scope.bkNotebook.registerFocusable(scope.cellmodel.id, scope);

        // cellmodel.body --> CodeMirror
        scope.$watch('cellmodel.input.body', function(newVal, oldVal) {
          if (scope.cm && newVal !== scope.cm.getValue()) {
            if (newVal === null) {
              newVal = '';
            }
            scope.cm.setValue(newVal);
            scope.cm.clearHistory();
          }
        });

        var inputMenuDiv = element.find('.bkcell').first();
        scope.popupMenu = function(event) {
          var menu = inputMenuDiv.find('.dropdown').first();
          if (bkHelper.getBkNotebookViewModel().isAdvancedMode()) {
            var inputMenuDivAdvanced = element.parents('.bkcell.code.bkr').find('.toggle-menu').first();
            menu = inputMenuDivAdvanced.find('.dropdown.advanced-only').first();
          }
          menu.find('.dropdown-toggle').first().dropdown('toggle');
        };

        if (scope.isInitializationCell()) {
          element.closest('.bkcell').addClass('initcell');
        } else {
          element.closest('.bkcell').removeClass('initcell');
        }
        scope.$watch('isInitializationCell()', function(newValue, oldValue) {
          if (newValue !== oldValue) {
            if (newValue) {
              element.closest('.bkcell').addClass('initcell');
            } else {
              element.closest('.bkcell').removeClass('initcell');
            }
          }
        });

        scope.$watch('isWordWrap()', function(newValue, oldValue) {
          if (newValue !== oldValue) {
            scope.cm.setOption('lineWrapping', newValue);
          }
        });

        /*
        scope.getShareData = function() {
          var evaluator = _(bkSessionManager.getRawNotebookModel().evaluators)
              .find(function(evaluator) {
                return evaluator.name === scope.cellmodel.evaluator;
              });
          var cells = [scope.cellmodel];
          return bkUtils.generateNotebook([evaluator], cells);
        };
        */

        scope.$on('beaker.cell.added', function(e, cellmodel) {
          if (cellmodel === scope.cellmodel) {
            if (scope.cm) {
              return scope.cm.focus();
            }

            scope._shouldFocusCodeMirror = true;
          }
        });

        scope.evaluateSelection = function(cm) {
          var evalCode;
          var currentLine;
          if (cm.somethingSelected()) {
            evalCode = cm.getSelection();
          } else {
            currentLine = cm.getCursor().line;
            evalCode = cm.getLine(currentLine);
          }

          scope.cellmodel.output.state = {};
          bkCoreManager.getBkApp().evaluateCellCode(scope.cellmodel, evalCode)
            .then(function(data) {
              if (currentLine != null) {
                if (currentLine !== cm.lastLine()) {
                  cm.setCursor(currentLine + 1, 0);
                } else {
                  codeMirrorOptions.goToNextCodeCell(cm);
                }
              }
            })
            .catch(function(data) {
              console.log('Evaluation failed');
            });
        };

        scope.$on('beaker.section.toggled', function(e, isCollapsed) {
          if (!isCollapsed) {
            $timeout(function() {
              if (scope.cm === undefined) {
                Scrollin.checkForVisibleElements();
              } else {
                scope.cm.refresh();
              }
            });
          }
        });

        scope.$on('$destroy', function() {
          Scrollin.untrack(element[0]);
          CodeMirror.off(window, 'resize', resizeHandler);
          //CodeMirror.off('change', changeHandler);
          scope.cm.off('change', scope.changeHandler);
          if (scope.cm) {
            scope.cm.off();
          }
          CodeMirror.off('gutterClick', scope.onGutterClick);
          scope.bkNotebook.unregisterFocusable(scope.cellmodel.id);
          scope.bkNotebook.unregisterCM(scope.cellmodel.id);
          scope.bkNotebook = null;
        });
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
  var module = angular.module('bk.notebook');

  module.directive('bkCellTooltip', function(bkUtils) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/celltooltip"](),
      scope: {
        editor: '='
      },
      controller: function($scope) {
      },
      link: function(scope, element, attrs) {
        var tooltip = element.find('.bkcelltooltip');

        var currentTooltipHtml = '';

        function tooltipIsOpen() {
          return $('.bkcelltooltip-open').length > 0;
        }

        ///handle showTooltip event//////////////////////
        scope.$on('showTooltip', function(event, doc) {
          tooltip.empty();
          bindEvents();
          var html = getDocContent(doc);

          if (tooltipIsOpen() && html === currentTooltipHtml) {
            return hideTooltip();
          }

          if (html) {
            currentTooltipHtml = html;
            displayTooltip(html);
            setTooltipPosition(calculateTooltipPosition());
          }
        });

        scope.$on('showDocumentationForAutocomplete', function(event, doc) {
          tooltip.empty();

          if (!doc || !doc.length) {
            return hideTooltip();
          }
          displayTooltip(doc);
          var autocompleteList = $('ul.CodeMirror-hints');
          tooltip.addClass('CodeMirror-hints');
          setTooltipPosition(_.merge(calculateTooltipPosition(), {left: autocompleteList.position().left + autocompleteList.outerWidth() - $('.bkcell').offset().left}));

          if (autocompleteListAboveCursor(autocompleteList)) {
            moveTooltipAboveCursor();
          }
        });

        scope.$on('hideDocumentationForAutocomplete', function(event) {
          tooltip.removeClass('bkcelltooltip-open');
          tooltip.removeClass('CodeMirror-hints');
        });

        scope.$on('showParameterDocumentation', function(event, doc, leftScrollPosition, tooltipMinWidth) {
          tooltip.empty();
          unbindEvents();
          displayTooltip(doc);
          setTooltipPosition(calculateTooltipPosition(leftScrollPosition, tooltipMinWidth));
        });

        scope.$on('hideParameterDocumentation', function() {
          hideTooltip();
        });

        function getDocContent(doc) {
          if (doc.ansiHtml) {
            return ansi_up.ansi_to_html(doc.ansiHtml, {use_classes: true});
          }
          if (doc.text) {
            return doc.text
          }
        }

        function autocompleteListAboveCursor(list) {
          return list.offset().top < scope.editor.cursorCoords(true).top;
        }

        function displayTooltip(htmlContent) {
          tooltip.html(htmlContent);
          tooltip.addClass('bkcelltooltip-open');
        }

        function hideTooltip() {
          unbindEvents();
          tooltip.removeClass('bkcelltooltip-open');
        }

        function calculateTooltipPosition(leftScrollPosition, tooltipMinWidth) {
          leftScrollPosition = leftScrollPosition || 0;

          var jqEditor = $(scope.editor.getWrapperElement());
          var cmPosition = jqEditor.position();
          var position = scope.editor.cursorCoords(true, 'local');

          var editorWidth = jqEditor.width();

          var vMargins = jqEditor.outerHeight(true) - jqEditor.height();
          var hMargins = jqEditor.outerWidth(true) - editorWidth;

          var left = cmPosition.left + position.left + hMargins - leftScrollPosition;
          var top = cmPosition.top + position.bottom + vMargins;

          var documentationWidth = editorWidth - left;
          if (tooltipMinWidth && documentationWidth < tooltipMinWidth) {
            left = Math.max(0, left - (tooltipMinWidth - documentationWidth));
          }

          return {top: top, left: left};
        }

        function moveTooltipAboveCursor() {
          var c = scope.editor.cursorCoords(true, 'local');
          var currentTooltipTop = parseInt(tooltip.css('top'), 10);
          var newTopPosition = currentTooltipTop - tooltip.outerHeight() - (c.bottom - c.top);
          tooltip.css('top', newTopPosition + 'px');
        }

        function setTooltipPosition(position) {
          tooltip.css('position', 'absolute');
          tooltip.css('top', position.top);
          tooltip.css('left', position.left);
        }

        function shouldHideTooltip(clickEventElement) {
          return tooltipIsOpen() && !tooltip.is(clickEventElement) &&
            tooltip.has(clickEventElement).length === 0;
        }

        function tooltipIsOpen() {
          return tooltip.hasClass('bkcelltooltip-open');
        }

        var mouseDownHandler = function(e) {
          if (shouldHideTooltip(e.target)) {
            hideTooltip();
          }
        };

        var resizeHandler = function() {
          if (tooltipIsOpen()) {
            calculateTooltipPosition();
          }
        };

        var editorChangeHandler = function() {
          if (tooltipIsOpen()) {
            hideTooltip();
          }
        };

        var escapeKeyBind = function(evt) {
          if (evt.which === 27 && tooltipIsOpen()) {
            hideTooltip();
          }
        };

        function bindEvents() {
          //handle document mousedown to close tooltip
          $(window).on('mousedown', mouseDownHandler);
          //adjust tooltip position on window resize
          $(window).resize(resizeHandler);
          //close tooltip on esc
          $(window).on('keydown', escapeKeyBind);
          //hide tooltip on typing in editor
          scope.editor.on('change', editorChangeHandler);
        }

        function unbindEvents() {
          $(window).off('resize', resizeHandler);
          $(window).off('mousedown', mouseDownHandler);
          $(window).off('keydown', escapeKeyBind);
          if(scope.editor){
            scope.editor.off('change', editorChangeHandler);
          }
        }

        scope.$on('$destroy', function() {
          unbindEvents();
        });
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
 * This module holds the logic for code cell, which is a typed {@link bkCell}.
 * The code cell contains an input cell an output cell ({@link bkCodeCellOutput}) and cell menus.
 */
(function() {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkCodeCellInputMenu', function(bkCoreManager, bkEvaluatorManager) {
    var getBkNotebookWidget = function() {
      return bkCoreManager.getBkApp().getBkNotebookWidget();
    } ;
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/codecellinputmenu'](),
      controller: function($scope) {
        $scope.getItemClass = function(item) {
          var result = [];
          if (item.items) {
            result.push('dropdown-submenu');
          }
          return result.join(' ');
        };
        $scope.getSubmenuItemClass = function(item) {
          var result = [];
          if (item.disabled) {
            result.push('disabled-link');
          }
          return result.join(' ');
        };
        $scope.getShowEvalIcon = function(evaluatorName) {
          return $scope.cellmodel.evaluator === evaluatorName;
        };
        $scope.setEvaluator = function(evaluatorName) {
          var cellId = $scope.cellmodel.id;
          $scope.cellmodel.evaluator = evaluatorName;
          getBkNotebookWidget().getFocusable(cellId).focus();
        };
        $scope.getEvaluatorDetails = function(name) {
          return bkEvaluatorManager.getVisualParams(name);
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
  var module = angular.module('bk.notebook');

  module.directive('dropdown', function() {
    return {
      restrict: 'A',
      link: function(scope, element) {
        var dropdownButton = element.children('button');
        var menu = element.children('.dropdown-menu')
        element.on('mouseleave', function() {$(document).trigger('click.bs.dropdown.data-api');});
        dropdownButton.on('click', function() {menu.dropdown();});
        scope.$on('$destroy', function() {element.off(); dropdownButton.off();});
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
 * This module is the abstract container for types of output displays. While we plan to make the output display loading
 * mechanism more pluggable, right now, this module serves as the registration output display types and holds the logic
 * for switch between applicable output display through UI.
 */
(function() {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkCodeCellOutput', function(
      $rootScope, bkUtils, bkOutputDisplayFactory, bkEvaluatorManager, bkEvaluateJobManager, bkSessionManager, GLOBALS) {
    return {
      restrict: "E",
      template: JST["mainapp/components/notebook/codecelloutput"](),
      scope: {
        model: "=",
        evaluatorId: "@",
        cellId: "@"
      },
      controller: function($scope) {
        var _shareMenuItems = [];
        var _saveAsItems = [];

        $scope.getOutputResult = function() {
          return $scope.model.result;
        };
        $scope.$on('$destroy', function () {
          if ($scope.subscribedTo) {
            if ($scope.model.pluginName && window.languageUpdateService && window.languageUpdateService[$scope.model.pluginName]) {
              window.languageUpdateService[$scope.model.pluginName].unsubscribe($scope.subscribedTo);
            }
          }
          if ($scope.cellId !== undefined)
            bkEvaluateJobManager.deRegisterOutputCell($scope.cellId);
        });
        $scope.applicableDisplays = [];
        $scope.$watch('getOutputResult()', function(result) {
          if ($scope.subscribedTo && $scope.subscribedTo !== result.update_id) {
            if ($scope.model.pluginName && window.languageUpdateService && window.languageUpdateService[$scope.model.pluginName]) {
              window.languageUpdateService[$scope.model.pluginName].unsubscribe($scope.subscribedTo);
            }
            $scope.subscribedTo = null;
          }
          if (!$scope.subscribedTo && result !== undefined && result.update_id) {
            if ($scope.model.pluginName && window.languageUpdateService && window.languageUpdateService[$scope.model.pluginName]) {
              var onUpdatableResultUpdate = function(update) {
                $scope.model.result = update;
                bkHelper.refreshRootScope();
              };
              window.languageUpdateService[$scope.model.pluginName].subscribe(result.update_id, onUpdatableResultUpdate);
              $scope.subscribedTo = result.update_id;
            }
          }

          if (result !== undefined && result.type === "UpdatableEvaluationResult")
            $scope.applicableDisplays = bkOutputDisplayFactory.getApplicableDisplays(result.payload);
          else
            $scope.applicableDisplays = bkOutputDisplayFactory.getApplicableDisplays(result);
          $scope.model.selectedType = $scope.applicableDisplays[0];
        });

        // to be used in bkOutputDisplay
        $scope.outputDisplayModel = {
          getCellModel: function() {
            var result = $scope.getOutputResult();
            if (result && result.type === "BeakerDisplay") {
              return result.object;
            } else if (result && result.type === "UpdatableEvaluationResult") {
                return result.payload;
            } else {
              return result;
            }
          },
          getCellId: function() {
            return $scope.cellId;
          },
          isShowOutput: function() {
            return $scope.isShowOutput();
          },
          getDumpState: function() {
            var result = $scope.model.state;
            return result;
          },
          setDumpState: function(s) {
            $scope.model.state = s;
          },
          resetShareMenuItems: function(newItems) {
            _shareMenuItems = newItems;
          },
          getCometdUtil: function() {
            var id = $scope.getEvaluatorId();
            if (id) {
              var evaluator = bkEvaluatorManager.getEvaluator(id);
              if (evaluator) {
                return evaluator.cometdUtil;
              }
            }
          },
          getEvaluatorId: function() {
            var id = $scope;
            while (id !== undefined) {
              if (id.evaluatorId !== undefined)
                return id.evaluatorId;
              id = id.$parent;
            }
            return undefined;
          }
        };

        $scope.getOutputDisplayType = function() {
          if ($scope.model === undefined)
              return "Text";
          var type = $scope.model.selectedType;
          // if BeakerDisplay or UpdatableEvaluationResult, use the inner type instead
          if (type === "BeakerDisplay") {
            var result = $scope.getOutputResult();
            type = result ? result.innertype : "Hidden";
          }
          return type;
        };

        $scope.$watch('getOutputDisplayType()', function() {
            $scope.outputCellMenuModel.refreshMenu();
        });

        var getElapsedTimeString = function() {
          if ($scope.model.elapsedTime || $scope.model.elapsedTime === 0) {
            var elapsedTime = $scope.model.elapsedTime;
            return "Elapsed time: " + bkUtils.formatTimeString(elapsedTime);
          }
          return "";
        };

        var getEvaluationSequenceNumber = function() {
          if ($scope.model.evaluationSequenceNumber) {
            return "Run Sequence: " + $scope.model.evaluationSequenceNumber;
          }
          return null;
        };

        $scope.isShowOutput = function() {
          if ($scope.$parent !== undefined && $scope.$parent.isShowOutput !== undefined)
            return $scope.$parent.isShowOutput();
          return true;
        };

        $scope.isShowMenu = function() {
          if ($scope.$parent !== undefined && $scope.$parent.isShowMenu !== undefined)
            return $scope.$parent.isShowMenu();
          return true;
        };

        $scope.toggleExpansion = function() {
          if ($scope.$parent.cellmodel !== undefined && $scope.$parent.cellmodel.output !== undefined) {
            if ($scope.$parent.cellmodel.output.hidden) {
              delete $scope.$parent.cellmodel.output.hidden;
              $scope.$broadcast(GLOBALS.EVENTS.CELL_OUTPUT_EXPANDED);
            } else {
              $scope.$parent.cellmodel.output.hidden = true;
            }
            bkSessionManager.setNotebookModelEdited(true);
          }
        };

        $scope.isExpanded = function() {
          if ($scope.$parent.cellmodel !== undefined && $scope.$parent.cellmodel.output !== undefined)
            return !$scope.$parent.cellmodel.output.hidden;
          return true;
        };

        $scope.isShowOutputSummary = function () {
          return !$scope.isExpanded() && !bkSessionManager.isNotebookLocked() && $scope.outputDisplayModel.getOutputSummary;
        };

        $scope.getOutputSummary = function () {
          return $scope.outputDisplayModel.getOutputSummary ? $scope.outputDisplayModel.getOutputSummary() : '';
        };

        $scope.getAdditionalMenuItems = function() {

          var getDisplayType = function(){
            var displayType = $scope.getOutputDisplayType() != null ? $scope.getOutputDisplayType() : $scope.applicableDisplays[0];

            if (displayType === "Results" && $scope.getOutputResult() && $scope.getOutputResult().payload){
              displayType = $scope.getOutputResult().payload.type;
            }
            return displayType;
          };

          var displayType = getDisplayType();
          if(displayType === "Plot" || displayType === "CombinedPlot"){
            _saveAsItems = [
              {
                name: "SVG",
                action: function () {
                  $scope.outputDisplayModel.getCellModel().saveAsSvg ?
                    $scope.outputDisplayModel.getCellModel().saveAsSvg() : $scope.outputDisplayModel.getCellModel().payload.saveAsSvg();
                }
              },
              {
                name: "PNG",
                action: function () {
                  $scope.outputDisplayModel.getCellModel().saveAsPng ?
                    $scope.outputDisplayModel.getCellModel().saveAsPng() : $scope.outputDisplayModel.getCellModel().payload.saveAsPng();
                }
              }];
          }else{
            _saveAsItems = [];
          }
          return [
            {
              name: "Toggle Cell Output",
              isChecked: function() {
                $scope.isExpanded();
              },
              action: function() {
                $scope.toggleExpansion();
              }
            },
            {
              name: "Delete Output",
              action: function() {
                $scope.model.result = undefined;
              }
            },
            {
              name: "Save Plot As",
              items: _saveAsItems
            },
            {
              name: getElapsedTimeString,
              action: null
            },
            {
              name: getEvaluationSequenceNumber,
              action: null
            }
          ];
        };

        // to be used in output cell menu
        $scope.outputCellMenuModel = (function() {
          var _additionalMenuItems = $scope.getAdditionalMenuItems();
          return {
            getApplicableDisplays: function() {
              return $scope.applicableDisplays;
            },
            getSelectedDisplay: function() {
              return $scope.model.selectedType;
            },
            setSelectedDisplay: function(display) {
              $scope.model.selectedType = display;
            },
            getAdditionalMenuItems: function() {
              return _additionalMenuItems;
            },
            refreshMenu: function() {
              _additionalMenuItems = $scope.getAdditionalMenuItems();
            }
          };
        })();

        $scope.outputRefreshed = function() {
          if (!($scope.$$phase || $rootScope.$$phase))
            $scope.$digest();
        };
        if ( $scope.cellId !== undefined )
          bkEvaluateJobManager.registerOutputCell($scope.cellId, $scope);
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
  var module = angular.module('bk.notebook');

  module.directive('bkCodeCellOutputMenu', function($uibModal, bkUtils, bkSparkContextManager) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/codecelloutputmenu"](),
      scope: {
        model: '='
      },
      controller: function($scope) {
        $scope.getItemName = function(item) {
          if (_.isFunction(item.name)) {
            return item.name();
          } else {
            return item.name;
          }
        };
        $scope.getItemClass = function(item) {
          var result = [];
          if (item.items) {
            var subItems = $scope.getSubItems(item);
            if (subItems.length > 0) {
              result.push("dropdown-submenu");
              result.push("drop-left");
            } else {
              result.push("display-none");
            }
          } else if ($scope.getItemName(item) === "") {
            result.push("display-none");
          }
          return result.join(" ");
        };
        $scope.getSubmenuItemClass = function(item) {
          var result = [];
          if (item.disabled) {
            result.push("disabled-link");
          }
          return result.join(" ");
        };
        $scope.getSubItems = function(parentItem) {
          if (_.isFunction(parentItem.items)) {
            return parentItem.items();
          }
          return parentItem.items;
        };
        $scope.sparkJobs = function() {
          if ($scope.$parent.evaluatorId !== "Scala")
            return 0;
          var jobs = bkSparkContextManager.getJobsPerCell($scope.$parent.cellId);
          return jobs == null ? 0 : jobs.length;
        };
        $scope.showSparkJobs = function() {
          var options = {
            windowClass: 'beaker-sandbox',
            backdropClass: 'beaker-sandbox',
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            controller: 'sparkJobsCtrl',
            template: JST['mainapp/components/spark/sparkjobs'](),
            scope: $scope
          };
          $uibModal.open(options);
        };
      }
    };
  });
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

(function() {
  'use strict';

  var module = angular.module('bk.notebook');
  module.directive('bkMarkdownEditable', ['bkSessionManager', 'bkHelper', 'bkCoreManager', 'bkDragAndDropHelper', '$timeout', function(bkSessionManager, bkHelper, bkCoreManager, bkDragAndDropHelper, $timeout) {
    var notebookCellOp = bkSessionManager.getNotebookCellOp();
    var getBkNotebookWidget = function() {
      return bkCoreManager.getBkApp().getBkNotebookWidget();
    };
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/markdown-editable"](),
      scope: {
        cellmodel: '='
      },
      link: function(scope, element, attrs) {
        var contentAttribute = scope.cellmodel.type === "section" ? 'title' : 'body';

        var previewEnable = true;
        
        var preview = function () {
          bkHelper.markupCellContent(scope.cellmodel[contentAttribute], bkHelper.evaluateCode)
              .then(function (transformedHtml) {
                if(previewEnable){
                  element.find('.markup').html(transformedHtml);
                  scope.mode = 'preview';
                }else{
                  scope.mode = 'edit';
                }
              });
        };

        var syncContentAndPreview = function() {
          scope.cellmodel[contentAttribute] = scope.cm.getValue();
          preview();
        };
        scope.evaluate = syncContentAndPreview;

        // cellmodel.body <-- CodeMirror
        var changeHandler = function(cm, e) {
          if (scope.cellmodel[contentAttribute] !== cm.getValue()) {
            scope.cellmodel[contentAttribute] = cm.getValue();
          }
          bkSessionManager.setNotebookModelEdited(true);
        };

        scope.bkNotebook = getBkNotebookWidget();
        
        scope.isPreviewMode = function () {
          return scope.mode === 'preview';
        };

        scope.focus = function() {
          scope.edit();
          scope.$apply();
        };

        scope.isShowInput = function() {
          //Markdown cell input is always visible
          return true;
        };
        
        scope.prepareForSearch = function() {
          scope.mode = 'edit';
          previewEnable = false;
        };
        
        scope.afterSearchActions = function() {
          previewEnable = true;
          preview();
          if (scope.$root.$$phase != '$apply' && scope.$root.$$phase != '$digest') {
            scope.$apply();
          }
        }

        scope.edit = function(event) {
          var selection = window.getSelection() || {};
          // If the user is selecting some text, do not enter the edit markdown mode
          if (selection.type == "Range" && $.contains(element[0], selection.focusNode)) {
            return;
          }
          if (bkHelper.isNotebookLocked()) return;
          if (event && event.target.tagName === "A") return; // Don't edit if clicking a link
          if (scope.$parent.isLockedCell()) return;

          scope.mode = 'edit';

          $timeout(function() {
            // remove content of markup when toggling to edit mode to prevent
            // flash when toggling back to preview mode.
            element.find('.markup').html('');

            var cm = scope.cm;
            cm.setValue(scope.cellmodel[contentAttribute]);
            cm.clearHistory();

            if (event) {
              var clickLocation;
              var wrapper = $(event.delegateTarget);
              var top = wrapper.offset().top;
              var bottom = top + wrapper.outerHeight();
              if (event !== undefined && event.pageY < (top + bottom) / 2) {
                cm.setCursor(0, 0);
              } else {
                cm.setCursor(cm.lineCount() - 1, cm.getLine(cm.lastLine()).length);
              }
            }

            if (scope.creatingNewSection === true && scope.cellmodel.type === 'section') {
              scope.creatingNewSection = false;
              var selectionStart = {line: 0, ch: 0};
              var selectionEnd = {line: 0, ch: cm.getValue().length};
              cm.setSelection(selectionStart, selectionEnd);
            }

            cm.focus();
          });
        };
        
        element.on('dragenter', function (e) {
          if(scope.isPreviewMode() && !bkDragAndDropHelper.isFileForImportDragging(e)) {
            scope.focus();
            scope.cm.refresh(); // CM should recalculate line heights
          }
        });
        
        CodeMirror.defineMode("smartMarkdownMode", function(config) {
        	  return CodeMirror.multiplexingMode(
        	    CodeMirror.getMode(config, "markdown"),
        	    {open: "$", close: "$",  mode: CodeMirror.getMode(config, "stex"),  delimStyle: "delimit"},
        	    {open: "{{", close: "}}",  mode: CodeMirror.getMode(config, "javascript"),  delimStyle: "delimit"}
        	  );
        	});
        
        var codeMirrorOptions = _.extend(bkCoreManager.codeMirrorOptions(scope, notebookCellOp), {
          lineNumbers: false,
          mode: "smartMarkdownMode",
          smartIndent: false
        });
        _.extend(codeMirrorOptions.extraKeys, {
          'Esc' : function(cm) {
              if (bkHelper.isFullScreen(cm)) {
                bkHelper.setFullScreen(cm, false);
              }
          }
        });

        scope.cm = CodeMirror.fromTextArea(element.find("textarea")[0], codeMirrorOptions);

        scope.bkNotebook.registerPreviewable(scope.cellmodel.id, scope);
        scope.bkNotebook.registerFocusable(scope.cellmodel.id, scope);
        scope.bkNotebook.registerCM(scope.cellmodel.id, scope.cm);

        scope.cm.setValue(scope.cellmodel[contentAttribute]);
        preview();

        scope.cm.on("mousedown", function(cm) {
          scope.mousedown = true;
        });

        $(scope.cm.getWrapperElement()).on("mouseup", function(cm) {
          scope.mousedown = false;
        });

        scope.cm.on("change", changeHandler);
        scope.cm.on("blur", function(cm) {
          setTimeout(function() {
            if (!scope.mousedown) {
              scope.$apply(function() {
                syncContentAndPreview();
              });
            }
          }, 0);
        });
        bkDragAndDropHelper.configureDropEventHandlingForCodeMirror(scope.cm);

        scope.$on('beaker.cell.added', function(e, cellmodel) {
          if (cellmodel === scope.cellmodel) {
            scope.creatingNewSection = true;
            scope.edit();
          }
        });

        scope.$watch('cellmodel.body', function(newVal, oldVal) {
          if (newVal !== oldVal && !bkSessionManager.isNotebookModelEdited()){
            bkSessionManager.setNotebookModelEdited(true);
          }
        });

        scope.$on('$destroy', function() {
          scope.bkNotebook.unregisterFocusable(scope.cellmodel.id);
          scope.bkNotebook.unregisterPreviewable(scope.cellmodel.id);
          scope.bkNotebook.unregisterCM(scope.cellmodel.id, scope.cm);
          CodeMirror.off('change', changeHandler);
          scope.cm.off();
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

(function() {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkMarkdownCell', function(bkPublicationHelper) {
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/markdowncell'](),
      controller: function($scope) {
        bkPublicationHelper.helper('', $scope);
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
  var module = angular.module('bk.notebook');

  module.directive('bkNewCellMenu', function(
      bkUtils, bkSessionManager, bkEvaluatorManager) {
    var cellOps = bkSessionManager.getNotebookCellOp();
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/newcellmenu"](),
      scope: {
        config: '=',
        isLarge: '=',
        position: '@'
      },
      link: function($scope, element) {
        $scope.hideOpenMenus = function() {
          $(document).trigger('click.bs.dropdown.data-api');
        };

        var menu = $(element).find('.new-cell');
        var fade = function (opacity) {
          if (!$scope.isLarge) {
            menu.stop().fadeTo(200, opacity);
          }
        };
        menu.on('mouseenter.cellmenu-fade', function () { fade(1); });
        menu.on('mouseleave.cellmenu-fade', function () { fade(0); });
        $scope.$on('$destroy', function () {
          menu.off('mouseenter.cellmenu-fade mouseleave.cellmenu-fade');
        });

        $scope.$watch('isLarge', function(newValue){
          menu.css('opacity', newValue ? 1 : 0);
        });
      },
      controller: function($scope, $rootScope, GLOBALS) {
        var newCellFactory = bkSessionManager.getNotebookNewCellFactory();
        var recentlyAddedLanguage;

        $scope.getEvaluators = function() {
          return bkEvaluatorManager.getLoadedEvaluators();
        };
        $scope.sectionLevels = [1, 2, 3, 4];

        $scope.newCodeCell = function(evaluatorName) {
          var newCell = newCellFactory.newCodeCell(evaluatorName);
          attachCell(newCell);
        };
        $scope.newDefaultCodeCell = function() {
          $scope.newCodeCell($scope.defaultEvaluator());
        };
        $scope.showPluginManager = function() {
          bkHelper.showLanguageManager($scope);
        };
        $scope.newMarkdownCell = function() {
          var newCell = newCellFactory.newMarkdownCell();
          attachCell(newCell);
        };

        $scope.newSectionCell = function(level) {
          var newCell = newCellFactory.newSectionCell(level);
          attachCell(newCell);
        };

        $scope.defaultEvaluator = function() {
          // by default, insert a code cell (and use the best evaluator with best guess)
          // If a prev cell is given, first scan toward top of the notebook, and use the evaluator
          // of the first code cell found. If not found, scan toward bottom, and use the evaluator
          // of the first code cell found.
          // If a prev cell is not given, use the very last code cell in the notebook.
          // If there is no code cell in the notebook, use the first evaluator in the list
          var prevCell = $scope.config && $scope.config.prevCell && $scope.config.prevCell();
          var codeCell = recentlyAddedLanguage
              || (prevCell && cellOps.findCodeCell(prevCell.id))
              || (prevCell && cellOps.findCodeCell(prevCell.id, true))
              || getLastCodeCell();
          var defaultEvaluator = GLOBALS.DEFAULT_EVALUATOR;
          var evaluatorName = codeCell ? codeCell.evaluator : bkEvaluatorManager.getEvaluator(defaultEvaluator) ?
              defaultEvaluator : _.keys(bkEvaluatorManager.getLoadedEvaluators())[0];

          return evaluatorName;
        };

        $scope.getEvaluatorDetails = function(name) {
          return bkEvaluatorManager.getVisualParams(name);
        };

        function attachCell(cell) {
          bkSessionManager.setNotebookModelEdited(true);
          if ($scope.config && $scope.config.attachCell) {
            return $scope.config.attachCell(cell);
          } else {
            cellOps.insertFirst(cell);
          }
        }

        // get the last code cell in the notebook
        var getLastCodeCell = function() {
          return _.last(cellOps.getAllCodeCells());
        };

        $scope.$on('languageAdded', function(event, data) {
          recentlyAddedLanguage = data;
        });

        $scope.$on('cellMapRecreated', function() {
          recentlyAddedLanguage = null;
        });

        $scope.$watch('defaultEvaluator()', function(newValue, oldValue) {
          if (newValue !== oldValue) {
            $rootScope.$emit("defaultEvaluatorChanged", $scope.defaultEvaluator());
          }
        });
      }
    };
  });

})();

/*
 *  Copyright 2014 TWO SIGMA OPEN SOURCE, LLC
 *
 *  Licensed under the Apache License, Version 2.0 (the 'License');
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * bkNotebook
 * - the controller that responsible for directly changing the view
 * - root cell + evaluators + other stuffs specific to one (the loaded) notebook
 * - root cell is just a special case of a section cell
 * - TODO, we are mixing the concept of a notebook and a root section here
 * we want to separate out the layout specific stuffs(idea of a section) from other
 * stuffs like evaluator panel
 */

(function () {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkNotebook', function (
      bkUtils,
      bkEvaluatorManager,
      bkCellMenuPluginManager,
      bkSessionManager,
      bkCoreManager,
      bkOutputLog,
      bkElectron,
      bkMenuPluginManager,
      $timeout) {
    var CELL_TYPE = 'notebook';
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/notebook'](),
      scope: {
        setBkNotebook: '&',
        isLoading: '='
      },
      controller: function ($scope, $rootScope, $window, bkEvaluatorManager, bkDragAndDropHelper, GLOBALS) {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();
        var _impl = {
          _viewModel: {
            _debugging: false,
            _showOutput: false,
            _showSearchReplace: false,
            _editMode: 'default',
            hideSearchReplace: function () {
              this._showSearchReplace = false;
            },
            showSearchReplace: function (cm, cellmodel) {
              this.hideOutput();
              if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                $scope.$apply();
              }
              if(this._showSearchReplace){
                if(cm){
                  $scope.prepareNotebookeForSearch(cm, cellmodel);
                }
              }else{
                $scope.prepareNotebookeForSearch(cm, cellmodel);
              }
              this._showSearchReplace = true;
              if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
                $scope.$apply();
              }
            },
            isShowingSearchReplace: function () {
              return this._showSearchReplace;
            },
            toggleShowOutput: function () {
              this._showOutput = !this._showOutput;
            },
            hideOutput: function () {
              this._showOutput = false;
            },
            isShowingOutput: function () {
              return this._showOutput;
            },
            isLocked: function() {
              return bkSessionManager.isNotebookLocked();
            },
            toggleAdvancedMode: function() {
              this._advancedMode = !this._advancedMode;
              $scope.$broadcast(GLOBALS.EVENTS.ADVANCED_MODE_TOGGLED)
            },
            isAdvancedMode: function() {
              return !!(this._advancedMode);
            },
            getEditMode: function() {
              return this._editMode;
            },
            setEditMode: function(mode) {
              bkHelper.setInputCellKeyMapMode(mode);
              this._editMode = mode;
            },
            // Add edit mode
            isHierarchyEnabled: function() {
              return !!(this._hierarchyEnabled);
            },
            toggleHierarchyEnabled: function() {
              this._hierarchyEnabled = !this._hierarchyEnabled;
            },
            toggleDebugging: function () {
              this._debugging = !this._debugging;
            },
            isDebugging: function () {
              return this._debugging;
            },
            getLodThreshold: function () {
              return this._lodThreshold;
            },
            setLodThreshold: function (lodThreshold) {
               this._lodThreshold = lodThreshold;
            }
          },
          refreshScope: function () {
            if(!($scope.$$phase || $scope.$root.$$phase)){
              $scope.$apply();
            }
          },
          getViewModel: function () {
            return this._viewModel;
          },
          deleteAllOutputCells: function () {
            bkSessionManager.getNotebookCellOp().deleteAllOutputCells();
          },
          _focusables: {}, // map of focusable(e.g. code mirror instances) with cell id being keys
          registerFocusable: function (cellId, focusable) {
            this._focusables[cellId] = focusable;
          },
          unregisterFocusable: function (cellId) {
            delete this._focusables[cellId];
            this._focusables[cellId] = null;
          },
          _previewable: {}, // map of prewieable 
          registerPreviewable: function (cellId, previewable) {
            this._previewable[cellId] = previewable;
          },
          unregisterPreviewable: function (cellId) {
            delete this._previewable[cellId];
            this._previewable[cellId] = null;
          },
          _sectioncells: {}, // map of section cells 
          registerSectioncell: function (cellId, sectioncell) {
            this._sectioncells[cellId] = sectioncell;
          },
          unregisterSectioncell: function (cellId) {
            delete this._sectioncells[cellId];
            this._sectioncells[cellId] = null;
          },
          getNotebookNewCellFactory: function () {
            return bkSessionManager.getNotebookNewCellFactory();
          },
          getFocusable: function (cellId) {
            return this._focusables[cellId];
          },
          getPreviewable: function (cellId) {
            return this._previewable[cellId];
          },
          _codeMirrors: {},
          registerCM: function (cellId, cm) {
            this._codeMirrors[cellId] = cm;
            cm.setOption('keyMap', this._cmKeyMapMode);
            cm.setOption('vimMode', this._cmKeyMapMode == 'vim');
          },
          getCM: function (cellId) {
            return this._codeMirrors[cellId];
          },
          unregisterCM: function (cellId) {
            this._codeMirrors[cellId] = null;
            delete this._codeMirrors[cellId];
          },
          _cmKeyMapMode: 'default',
          setCMKeyMapMode: function (keyMapMode) {
            this._cmKeyMapMode = keyMapMode;
            _.each(this._codeMirrors, function (cm) {
              cm.setOption('keyMap', keyMapMode);
              cm.setOption('vimMode', keyMapMode == 'vim');
            });
          },
          getCMKeyMapMode: function () {
            return this._cmKeyMapMode;
          },
          setCMTheme: function (theme) {
            _.each(this._codeMirrors, function (cm) {
              cm.setOption("theme", theme);
            });
          }
        };
        
        $scope.setBkNotebook({bkNotebook: _impl});

        $scope.getFullIndex = function() { return '1' }

        $scope.isLocked = function() {
          return _impl._viewModel.isLocked();
        }

        $scope.isDebugging = function () {
          return _impl._viewModel.isDebugging();
        };
        $scope.isShowingOutput = function () {
          return _impl._viewModel.isShowingOutput();
        };
        
        $scope.isShowingSearchReplace = function () {
          return _impl._viewModel.isShowingSearchReplace();
        };
        $scope.hideSearchReplace = function () {
          doPostSearchNotebookActions();
          _impl._viewModel.hideSearchReplace();
          showHideCellManager.hideCellModel();
        };

        var cursor = null;
        
        var previousFilter = {};
        var currentCm = null;
        var cursorPozitionFromCm = {};
        var currentCellmodel = null;
        var currentMarker = null;

        $scope.availableSearchCellOptions =
          [
           {value: {allNotebook:true, codeCells:true, sectionCells:true, markdownCells:true}, name: 'entire notebook'},
           {value: {allNotebook:false, codeCells:false, sectionCells:false, markdownCells:false}, name: 'current cell only'},
           {value: {allNotebook:true, codeCells:true, sectionCells:false, markdownCells:false}, name: 'all code cells'},
           {value: {allNotebook:true, codeCells:false, sectionCells:true, markdownCells:true}, name: 'all text'}
        ];

        $scope.searchReplaceData = {
          replace: null,
          searchCellFilter: $scope.availableSearchCellOptions[0].value,
          caseSensitive: false,
          wrapSearch: false,
          reverseSearch: false
        }
        
        var isCellMatchSearchCellFilter = function (cellModelToUse, searchCellFilter){
          var ret = false;
          if(searchCellFilter.codeCells === true){
            ret = ret || cellModelToUse.type === "code";
          }
          if(searchCellFilter.sectionCells === true){
            ret = ret || cellModelToUse.type === "section";
          }
          if(searchCellFilter.markdownCells === true){
            ret = ret || cellModelToUse.type === "markdown";
          }
          return ret;
        }

        var clearMarcs = function (theCM){
          if(theCM){
            var marks = theCM.findMarks({line: 0, ch: 0},{line: theCM.lineCount() - 1, ch: theCM.getLine(theCM.lastLine()).length});
            if(marks){
              for (var i = 0; i < marks.length; i++) {
                marks[i].clear();
              }
            }
          }
        }
        
        $scope.cmArray = [];
        $scope.markAllInterval = null;

        var showHideCellManager = {

          cellModels : [],

          copyCellModel : function(currentCellmodel) {
            var previousCellmodel = {};
            angular.copy(currentCellmodel, previousCellmodel);
            return {original:currentCellmodel, copy: previousCellmodel};
          },

          openCellModels : function() {
            for (var i = 0; i < this.cellModels.length; i++) {
              var cellModel = this.cellModels[i];
              if (cellModel.copy.locked) {
                cellModel.original.locked = false;
              }
              if (cellModel.copy.input && cellModel.copy.input.hidden) {
                cellModel.original.input.hidden = false;
              }
            }
          },

          hideCellModel :function () {
            for (var i = 0; i < this.cellModels.length; i++) {
              var cellModel = this.cellModels[i];
              if (cellModel.copy.locked) {
                cellModel.original.locked = true;
              }
              if (cellModel.copy.input && cellModel.copy.input.hidden) {
                cellModel.original.input.hidden = true;
              }
            }
          },

          clear : function () {
            this.cellModels = []
          },

          registerCell : function (theCell) {
            var exists = _.filter(this.cellModels, function(o) { return o.original.id==theCell.id; });
            if(exists.length==0){
              this.cellModels.push(this.copyCellModel(theCell));
            }
          }
        }

        $scope.findALLFunction = function (result) {
          
          $scope.cmArray = [];

          showHideCellManager.hideCellModel()
          showHideCellManager.clear();

          if($scope.markAllInterval){
            clearInterval($scope.markAllInterval);
          }
          
          $scope.findAllFunctionTemplate(
              result,
              function(theCursor,theCM, theCell){
                //markText is too slow to put it directly in here.
                $scope.cmArray.push({theCM : theCM, from: theCursor.from(), to: theCursor.to()});
                showHideCellManager.registerCell(theCell);
              }
          );

          showHideCellManager.openCellModels();

          if($scope.cmArray && $scope.cmArray.length > 0){
            var index = 0;
            $scope.markAllInterval = setInterval(function(){
              if($scope.cmArray && $scope.cmArray[index]){
                $scope.cmArray[index].theCM.markText($scope.cmArray[index].from, $scope.cmArray[index].to, {className: "search-find-all-selected-background"});
                index++;
              }else{
                clearInterval($scope.markAllInterval);
              }
              if(index >= $scope.cmArray.length){
                clearInterval($scope.markAllInterval);
              }
            },10);
          }
        }
        
        $scope.replaceAllFunction = function (result) {
          $scope.findAllFunctionTemplate(
              result,
              function(theCursor,theCM,theCell){
                prepareForSearchCellActions(theCell);
                theCursor.replace(result.replace, result.find);
                theCM.addSelection(theCursor.from(), theCursor.to());
                doPostSearchCellActions(theCell);
              }
          );
          showHideCellManager.hideCellModel()
        }
        
        $scope.findAllFunctionTemplate = function (result, action) {
          var theCursor = null;
          for (var index = 0; notebookCellOp.getCellsSize() > index; index++) {
            var theCell = notebookCellOp.getCellAtIndex(index);
            if (theCell){
              var theCM = _impl.getCM(theCell.id);
              if (theCM){
                clearMarcs(theCM);     
                if(result.find && result.searchCellFilter.allNotebook){
                  if(isCellMatchSearchCellFilter(theCell, result.searchCellFilter)){
                    for (theCursor = getSearchCursor(result, null, 'MIN', theCM); theCursor.findNext();) {
                      action(theCursor, theCM, theCell);
                    }
                  }
                }
              }
            }
          }
          if(!result.searchCellFilter.allNotebook){
            if(result.find){
              for (theCursor = getSearchCursor(result, null, 'MIN', currentCm); theCursor.findNext();) {
                action(theCursor, currentCm);
              }
            }
          }
        }

        var scrollToChar = function (theCM, pozition){
          var headerHeight = 0;
          var searchReplaceHeight = 0;
          var searchReplaceWidth = 0;

          var header = $window.document.getElementById("notebook_header");
          if(header){
            headerHeight = header.getBoundingClientRect().height;
          }

          var searchReplace = $window.document.getElementById("search_replace_window");
          if(searchReplace){
            searchReplaceHeight = searchReplace.getBoundingClientRect().height;
            searchReplaceWidth = searchReplace.getBoundingClientRect().width;
          }

          var de = document.documentElement;
          var box = theCM.getScrollerElement().getBoundingClientRect();
          
          var cmPozitionY = box.top + window.pageYOffset - de.clientTop;
          var charPozitionY = theCM.charCoords({line: pozition.line, ch: pozition.ch}, "local").top;
          var charPozitionX = theCM.charCoords({line: pozition.line, ch: pozition.ch}, "page").left;
          var scrollToY = cmPozitionY + charPozitionY;
          var scrollToX = charPozitionX;
 
          var visible_start = $(window).scrollTop() + headerHeight;
          var visible_end = $(window).scrollTop() + window.innerHeight;
          var visible_end_search = $(window).scrollTop() + window.innerHeight - searchReplaceHeight;
          
          var visibelFrameSearchX = window.innerWidth - searchReplaceWidth;
          var visibelFrameSearchY = window.innerHeight - searchReplaceHeight - headerHeight;
          
          if(scrollToX < visibelFrameSearchX){
            if((scrollToY < visible_start || scrollToY > visible_end)){
              $('html,body').animate({scrollTop: scrollToY - Math.round(visibelFrameSearchY *0.2) - headerHeight}, 700);
              //window.scrollTo(0, cmPozition - window.innerHeight);
            }
          }else{
            if((scrollToY < visible_start || scrollToY > visible_end_search)){
              $('html,body').animate({scrollTop: scrollToY - Math.round(visibelFrameSearchY *0.2) - headerHeight}, 700);
              //window.scrollTo(0, cmPozition - window.innerHeight);
            }
          }
        }

        $scope.findFunction = function (result, reversive) {
          if(result.find  && currentCm ){

            var clearCursorPozition = !cursorPozitionFromCm.line;
            
            var createNewCursor = result.caseSensitive != previousFilter.caseSensitive
              || result.find != previousFilter.find;
            angular.copy(result, previousFilter);
            
            if(createNewCursor){
              cursor = getSearchCursor(result, cursorPozitionFromCm, clearCursorPozition ? 'MIN' : 'COPY', currentCm);
            }

            var cellmodelId = currentCellmodel.id;

            if(cursor != null && cursor.find(reversive)){
              if(currentMarker){
                currentMarker.clear();
              }
              currentMarker = currentCm.markText(cursor.from(), cursor.to(), {className: "search-selected-background"});

              scrollToChar(currentCm, cursor.to());

            }else {

              var search = true;
              do{
                
                do{
                  cursor = getNextCursor(result, currentCm, reversive);
                }while(cursor != null && !isCellMatchSearchCellFilter(currentCellmodel, result.searchCellFilter));

                var find = null;
                if(cursor != null){
                  find = cursor.find(reversive);
                  search = !find && cellmodelId != currentCellmodel.id;
                }else{
                  search = false;
                }

                if(find){
                  if(currentMarker){
                    currentMarker.clear();
                  }
                  currentMarker = currentCm.markText(cursor.from(), cursor.to(), {className: "search-selected-background"});
                  scrollToChar(currentCm, cursor.to());
                }

              }while(search);
              
            }
          }
        }
        
        $scope.findPreviousFunction = function (result) {
          $scope.findFunction(result, true);
        }
        
        $scope.findNextFunction = function (result) {
          $scope.findFunction(result, result.reverseSearch);
        }
        
        $scope.replaceFunction = function (result) {
          if(cursor && cursor.from() && cursor.to()){
            prepareForSearchCellActions(currentCellmodel);
            cursor.replace(result.replace, result.find);
            currentCm.setSelection(cursor.from(), cursor.to());
            $scope.findNextFunction(result);
            showHideCellManager.hideCellModel();
            doPostSearchCellActions(currentCellmodel);
          }
        }

        $scope.prepareNotebookeForSearch = function (cm, cellmodel) {
          if(cm && cellmodel){
            currentCm = cm;
            currentCellmodel = cellmodel;
            cursorPozitionFromCm = { line: cm.getCursor().line , ch : cm.getCursor().ch }; 
          }else{
            var theCell = notebookCellOp.getCellAtIndex(0);
            if (theCell){
              var theCM = _impl.getCM(theCell.id);
              if (theCM){
                currentCm = theCM;
                currentCellmodel = theCell;
              }
            }
          }

          var element = $window.document.getElementById("find_field");
          if(element){
            element.focus();  
          }
          
          for ( var property in _impl._focusables) {
            if (_impl._focusables.hasOwnProperty(property)) {
              if(_impl._focusables[property]){
                _impl._focusables[property].prepareForSearch();
              }
            }
          }
        }
        
        var doPostSearchNotebookActions = function () {
          
          if($scope.markAllInterval){
            clearInterval($scope.markAllInterval);
          }
          
          for ( var property in _impl._focusables) {
            if (_impl._focusables.hasOwnProperty(property)) {
              if(_impl._focusables[property]){
                _impl._focusables[property].afterSearchActions();
              }
            }
          }

          for (var index = 0; notebookCellOp.getCellsSize() > index; index++) {
            var theCell = notebookCellOp.getCellAtIndex(index);
            if (theCell){
              var theCM = _impl.getCM(theCell.id);
              if (theCM){
                clearMarcs(theCM);
              }
            }
          }
          
          previousFilter = {};
          currentCm = null;
          currentCellmodel = null;
          cursorPozitionFromCm = {};
          cursor = null;
        }
        
        var prepareForSearchCellActions = function(cell) {
          var theCM = _impl.getCM(cell.id);
          theCM.setSelection({line: 0, ch: 0}, {line: 0, ch: 0});
          if (typeof _impl._focusables[cell.id].prepareForSearchCellActions == 'function') {
            _impl._focusables[cell.id].prepareForSearchCellActions();
          }
        }
        
        var doPostSearchCellActions = function (cell) {
          var theCM = _impl.getCM(cell.id);
          theCM.setSelection({line: 0, ch: 0}, {line: 0, ch: 0});
          if (typeof _impl._focusables[cell.id].doPostSearchCellActions == 'function') {
            _impl._focusables[cell.id].doPostSearchCellActions();
          }
        }
        
        var getSearchCursor = function (filter, cursorPozition, positionType, cmToUSe) {
          var from = {line: 0, ch: 0};
          if(positionType == 'COPY'){
            if(cursorPozition){
              from = {line: cursorPozition.line , ch: cursorPozition.ch};
            }
          }else if(positionType == 'MIN'){
            from = {line: 0, ch: 0};
          }else if(positionType == 'MAX'){
            from = {line: cmToUSe.lineCount() - 1, ch: cmToUSe.getLine(cmToUSe.lastLine()).length};
          }
          return cmToUSe.getSearchCursor(filter.find, from, !filter.caseSensitive);
        }

        var getNextCursor = function (filter, cmToUSe, reversive) {
          var ret = null;
          if(filter.searchCellFilter.allNotebook){
            var index = notebookCellOp.getIndex(currentCellmodel.id);
            var nextIndex = index;
            if(reversive){
              nextIndex--;
              if(filter.wrapSearch){
                if(nextIndex < 0){
                  nextIndex = notebookCellOp.getCellsSize() - 1;
                }
              }else{
                if(nextIndex < 0){
                  nextIndex = null;
                }
              }
            }else{
              nextIndex++;
              if(filter.wrapSearch){
                if(nextIndex > notebookCellOp.getCellsSize() - 1){
                  nextIndex = 0;
                }
              }else{
                if(nextIndex > notebookCellOp.getCellsSize() - 1){
                  nextIndex = null;
                }
              }
            }
            
            if(nextIndex != null){
              var nextCell = notebookCellOp.getCellAtIndex(nextIndex);
              if (nextCell){
                var nextCm = _impl.getCM(nextCell.id);
                if (nextCm){
                  currentCm = nextCm;
                  currentCellmodel = nextCell;
                  ret = getSearchCursor(filter, null, reversive ? 'MAX' : 'MIN', nextCm);
                }
              }
            }

          }else{
            if(filter.wrapSearch){
              ret = getSearchCursor(filter, null, reversive ? 'MAX' : 'MIN', cmToUSe);
            }
            //else null
          }
          return ret;
        }

        
        $scope.showDebugTree = false;
        $scope.getNotebookModel = function () {
          return bkSessionManager.getRawNotebookModel();
        };
        $scope.clearOutput = function () {
          $.ajax({
            type: 'GET',
            datatype: 'json',
            url: bkUtils.serverUrl('beaker/rest/outputlog/clear'),
            data: {}});
          $scope.outputLog = [];
        };
        $scope.hideOutput = function () {
          _impl._viewModel.hideOutput();
          if (bkUtils.isElectron){
            bkElectron.updateMenus(bkMenuPluginManager.getMenus());
          }
        };

        $scope.isAdvancedMode = function () {
          return _impl._viewModel.isAdvancedMode();
        };

        $scope.isHierarchyEnabled = function () {
          return _impl._viewModel.isHierarchyEnabled();
        };

        $scope.showStdOut = true;
        $scope.showStdErr = true;

        $scope.toggleStdOut = function ($event) {
          if ($event) $event.stopPropagation();

          $scope.showStdOut = !$scope.showStdOut;
        };

        $scope.toggleStdErr = function ($event) {
          if ($event) $event.stopPropagation();

          $scope.showStdErr = !$scope.showStdErr;
        };

        bkOutputLog.getLog(function (res) {
          $scope.outputLog = res;
        });

        bkOutputLog.subscribe(function (reply) {
          if (!_impl._viewModel.isShowingOutput()) {
            _impl._viewModel.toggleShowOutput();
          }
          $scope.outputLog.push(reply.data);
          $scope.$apply();
          // Scroll to bottom so this output is visible.
          $.each($('.outputlogbox'),
                 function (i, v) {
                   $(v).scrollTop(v.scrollHeight);
                 });
        });
        var margin = $('.outputlogstdout').position().top;
        var outputLogHeight = 300;
        var dragHeight;
        var fixOutputLogPosition = function () {
          $('.outputlogcontainer').css('top', window.innerHeight - outputLogHeight);
          $('.outputlogcontainer').css('height', outputLogHeight);
          $('.outputlogbox').css('height', outputLogHeight - margin - 5);
        };
        $scope.unregisters = [];
        $(window).resize(fixOutputLogPosition);
        $scope.unregisters.push(function() {
          $(window).off('resize', fixOutputLogPosition);
        });
        var dragStartHandler = function () {
          dragHeight = outputLogHeight;
        };
        var outputloghandle = $('.outputloghandle');
        outputloghandle.drag('start', dragStartHandler);
        $scope.unregisters.push(function() {
          outputloghandle.off('dragstart', dragStartHandler);
        });
        var dragHandler = function (ev, dd) {
          outputLogHeight = dragHeight - dd.deltaY;
          if (outputLogHeight < 20) {
            outputLogHeight = 20;
          }
          if (outputLogHeight > window.innerHeight - 80) {
            outputLogHeight = window.innerHeight - 80;
          }
          fixOutputLogPosition();
        };
        outputloghandle.drag(dragHandler);
        $scope.unregisters.push(function() {
          outputloghandle.off('drag', dragHandler);
        });

        $scope.getChildren = function () {
          // this is the root
          return notebookCellOp.getChildren('root');
        };

        $scope.isEmpty = function() {
          return $scope.getChildren().length == 0;
        };

        $scope.$watch(function() {
          return document.body.clientHeight;
        }, function(v, prev) {
          if (v !== prev) {
            $scope.$evalAsync(Scrollin.checkForVisibleElements);
          }
        });

        $scope.defaultEvaluatorLoaded = function() {
          if (_.isEmpty(bkEvaluatorManager.getLoadedEvaluators()) || _.chain(bkEvaluatorManager.getLoadingEvaluators()).pluck("name").contains(GLOBALS.DEFAULT_EVALUATOR).value()) {
            return false;
          }
          return true;
        };

        bkUtils.getBeakerPreference('advanced-mode').then(function(isAdvanced) {
          if (_impl._viewModel.isAdvancedMode() != (isAdvanced === 'true')) {
            _impl._viewModel.toggleAdvancedMode();
          }
        });

        bkUtils.getBeakerPreference('edit-mode').then(function(editMode) {
          if (editMode !== '')
            _impl._viewModel.setEditMode(editMode);
        });

        bkUtils.getBeakerPreference('lod-threshold').then(function (lodThreshold) {
          _impl._viewModel.setLodThreshold(lodThreshold);
        });

        $scope.unregisters.push($rootScope.$on(GLOBALS.EVENTS.FILE_DROPPED, function (e, data) {
          if (bkDragAndDropHelper.isImageFile(data.file)) {
            bkDragAndDropHelper.loadImageFileAsString(data.file).then(function (imageTag) {
              
              var notebookCellOp = bkSessionManager.getNotebookCellOp();
              var markdownCell = null;

              for (var index = 0; notebookCellOp.getCellsSize() > index; index++) {
                var theCell = notebookCellOp.getCellAtIndex(index);
                if (theCell){
                  var theCM = _impl.getCM(theCell.id);
                  if (theCM && theCM.hasFocus()){
                    markdownCell = theCell;
                    var markdownCM = theCM; 
                    var pozition = {line: markdownCM.lineCount() - 1, ch: markdownCM.getLine(markdownCM.lastLine()).length};
                    markdownCM.replaceRange(imageTag, pozition);
                    break;
                  }
                }
              }

              if(!markdownCell){
                markdownCell = bkSessionManager.getNotebookNewCellFactory().newMarkdownCell();
                markdownCell.body = imageTag;
                var cells = notebookCellOp.getCells();
                if (cells.length === 0) {
                  notebookCellOp.insertFirst(markdownCell, true);
                } else {
                  notebookCellOp.insertAfter(cells[cells.length - 1].id, markdownCell, true);
                }
              }

            });
          }
        }));
      },
      link: function (scope, element, attrs) {
        scope.getNotebookElement = function() {
          return element;
        };
        scope.$on('$destroy', function() {
          scope.setBkNotebook({bkNotebook: undefined});
          bkOutputLog.unsubscribe();
          _.each(scope.unregisters, function(unregister) {
            unregister();
          });
        });
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
  var module = angular.module('bk.notebook');

  module.directive('bkSectionCell', function(
        bkUtils,
        bkEvaluatorManager,
        bkSessionManager,
        bkCoreManager,
        bkPublicationHelper) {

    var CELL_TYPE = 'section';
    var notebookCellOp = bkSessionManager.getNotebookCellOp();
    var getBkNotebookWidget = function() {
      return bkCoreManager.getBkApp().getBkNotebookWidget();
    };
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/sectioncell'](),
      controller: function($scope) {
        var notebookCellOp = bkSessionManager.getNotebookCellOp();

        var getBkNotebookWidget = function() {
          return bkCoreManager.getBkApp().getBkNotebookWidget();
        };
        
        $scope.bkNotebook = getBkNotebookWidget();
        
        $scope.cellmodel.collapsed = $scope.cellmodel.collapsed || false;

        $scope.bkNotebook.registerSectioncell($scope.cellmodel.id, $scope);
        
        $scope.toggleShowChildren = function() {
          $scope.cellmodel.collapsed = !$scope.cellmodel.collapsed;
          $scope.$broadcast('beaker.section.toggled', $scope.cellmodel.collapsed);
          bkSessionManager.setNotebookModelEdited(true);
        };

        $scope.isLeaf = function() {
          return notebookCellOp.getNextSibling($scope.cellmodel.id) === null;
        };

        $scope.isAntecedentSectionSiblingPrimogeniture = function() {
          var prev = notebookCellOp.getPrevSection($scope.cellmodel.id) || {level: $scope.cellmodel.level};

          return prev.level < $scope.cellmodel.level;
        };

        $scope.isBranch = function() {
          var hasSiblingSection = notebookCellOp.getNextSibling($scope.cellmodel.id) !== null;
          var hasChildSections = _.any(notebookCellOp.getAllDescendants($scope.cellmodel.id), function(child) {
            return child.type === 'section';
          });

          return hasSiblingSection || hasChildSections;
        };

        $scope.isShowChildren = function() {
          return !$scope.cellmodel.collapsed;
        };
        $scope.getChildren = function() {
          var children = notebookCellOp.getChildren($scope.cellmodel.id),
            childrenError = checkChildrenErrors(children);

          $scope.cellmodel.isError = childrenError;

          return children;
        };
        $scope.resetTitle = function(newTitle) {
          $scope.cellmodel.title = newTitle;
          bkUtils.refreshRootScope();
        };
        $scope.prepareForSearch = function() {
          if(!$scope.isShowChildren()){
            $scope.toggleShowChildren();
          }
        };
        $scope.afterSearchActions = function() {
          //nothing to do
        };
        var editedListener = function(newValue, oldValue) {
          if (newValue !== oldValue) {
            bkSessionManager.setNotebookModelEdited(true);
          }
        };
        $scope.$watch('cellmodel.title', editedListener);
        $scope.$watch('cellmodel.initialization', editedListener);
        
        $scope.cellview.menu.addItem({
          name: 'Change Header Level',
          sortorder: 100,
          items: [1,2,3,4].map(function(level) {
            return {
              name: 'Level ' + level,
              isChecked: function() {
                return $scope.cellmodel.level === level;
              },
              action: function() {
                $scope.cellmodel.level = level;
                notebookCellOp.reset();
              }};
          })
        });

        $scope.cellview.menu.addItem({
          name: 'Options...',
          sortorder: 130,
          action: function() {
            bkCoreManager.showFullModalDialog(function cb(r) { } ,
              'app/mainapp/dialogs/codecelloptions.jst.html', 'CodeCellOptionsController', $scope.cellmodel);
          },
          locked: function () {
            return $scope.isLockedCell();
          }
        });

        $scope.cellview.menu.addItemToHead({
          name: 'Delete section and all sub-sections',
          action: function() {
            notebookCellOp.deleteSection($scope.cellmodel.id, true);
          }
        });
       

        $scope.getPublishData = function() {
          var cells = [$scope.cellmodel]
          .concat(notebookCellOp.getAllDescendants($scope.cellmodel.id));
          var usedEvaluatorsNames = _.chain(cells)
            .filter(function(cell) {
              return cell.type === 'code';
            })
            .map(function(cell) {
              return cell.evaluator;
            })
            .unique().value();
          var evaluators = bkSessionManager.getRawNotebookModel().evaluators
            .filter(function(evaluator) {
              return _.any(usedEvaluatorsNames, function(ev) {
                return evaluator.name === ev;
              });
            });
          return bkUtils.generateNotebook(evaluators, cells, $scope.cellmodel.metadata);
        };

        $scope.cellview.menu.addItem({
          name: 'Run all',
          sortorder: 190,
          action: function() {
            bkCoreManager.getBkApp().evaluateRoot($scope.cellmodel.id).
              catch(function(data) {
                console.error(data);
              });
          }
        });

        $scope.isInitializationCell = function() {
          return $scope.cellmodel.initialization;
        };

        $scope.cellview.menu.addItem({
          name: 'Initialization Cell',
          sortorder:110,
          isChecked: function() {
            return $scope.isInitializationCell();
          },
          action: function() {
            if ($scope.isInitializationCell()) {
              $scope.cellmodel.initialization = undefined;
            } else {
              $scope.cellmodel.initialization = true;
            }
            notebookCellOp.reset();
          }
        });

        $scope.cellview.menu.addItem({
          name: 'Show section',
          sortorder:200,
          disabled: function() {
            return $scope.isShowChildren();
          },
          action: function() {
            $scope.toggleShowChildren();
          }
        });

        $scope.cellview.menu.addItem({
          name: 'Hide section',
          sortorder:210,
          disabled: function() {
            return !$scope.isShowChildren();
          },
          action: function() {
            $scope.toggleShowChildren();
          }
        });

        $scope.newCellMenuConfig = {
          isShow: function() {
            if (bkSessionManager.isNotebookLocked()) {
              return false;
            }
            return !$scope.cellmodel.hideTitle;
          },
          attachCell: function(newCell) {
            var children = notebookCellOp.getAllDescendants($scope.cellmodel.id);
            if ($scope.cellmodel.collapsed && children) {
              var lastChildCell = children[children.length - 1];
              notebookCellOp.insertAfter(lastChildCell.id, newCell);
              if (newCell.type !== "section") {
                $scope.toggleShowChildren();
              }
            } else {
              notebookCellOp.insertAfter($scope.cellmodel.id, newCell);
            }
          },
          prevCell: function() {
            return $scope.cellmodel;
          }
        };
        $scope.getFullIndex = function() {
          var index = $scope.getIndexAmongSectionCells();
          if ($scope.$parent.$parent.getNestedLevel) {
            return $scope.$parent.$parent.getFullIndex() + '.' + (index + 1);
          }

          return index + $scope.getNestedLevel();
        };
        $scope.getIndexAmongSectionCells = function() {
          var siblingSections = [];
          if ($scope.isRoot()) {
            siblingSections = notebookCellOp.getChildren('root');
          } else {
            var parent = notebookCellOp.getParent($scope.cellmodel.id);
            siblingSections = notebookCellOp.getChildren(parent.id);
          }
          siblingSections = siblingSections.filter(function(element) {
            return 'section' === element.type;
          });
          return siblingSections.indexOf($scope.cellmodel);
        };

        bkPublicationHelper.helper(CELL_TYPE, $scope);

        $scope.cellview.menu.changeSortOrder({
          name: "Lock Cell",
          sortorder: 120
        });

        $scope.cellview.menu.changeSortOrder({
          name: "cut",
          sortorder: 150
        });

        $scope.cellview.menu.changeSortOrder({
          name: "Paste (append after)",
          sortorder: 160
        });

        $scope.cellview.menu.changeSortOrder({
          name: "Publish...",
          sortorder: 170
        });
        
        $scope.cellview.menu.changeSortOrder({
          name: "Move up",
          sortorder: 220
        });


        $scope.cellview.menu.changeSortOrder({
          name: "Move down",
          sortorder: 230
        });

        $scope.cellview.menu.renameItem({
          name: 'Delete cell',
          newName: 'Delete heading and keep contents'
        });

        $scope.cellview.menu.changeSortOrder({
          name: 'Delete heading and keep contents',
          sortorder: 240
        });

        $scope.cellview.menu.changeSortOrder({
          name: 'Delete section and all sub-sections',
          sortorder: 250
        });

        $scope.cellview.menu.addSeparator("Cut");

        $scope.cellview.menu.addSeparator("Run all");
        
        $scope.$on('$destroy', function() {
          $scope.bkNotebook.unregisterSectioncell($scope.cellmodel.id);
        });

        function checkChildrenErrors(list) {
          return list.some(function(item) {
            return item.isError;
          });
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

(function() {
  'use strict';
  var module = angular.module('bk.notebook');

  module.directive('bkTextCell', function(bkSessionManager) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/textcell"](),
      controller: function($scope) {
        $scope.isEditable = function() {
          return !bkHelper.isNotebookLocked();
        };
      },
      link: function(scope, element, attrs) {
        var textbox = $(element.find(".editable-text").first());
        element.find('.editable-text').html(scope.cellmodel.body);
        textbox.bind('blur', function() {
          scope.cellmodel.body = textbox.html().trim();
          scope.$apply();
        });
        scope.edit = function() {
          textbox.focus();
        };
        scope.$watch('cellmodel.body', function(newVal, oldVal) {
          if (newVal !== oldVal) {
            bkSessionManager.setNotebookModelEdited(true);
          }
        });
        scope.$on('beaker.cell.added', function(e, cellmodel) {
          if (cellmodel === scope.cellmodel) scope.edit();
        });
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

(function () {
  'use strict';

  var module = angular.module('bk.notebook');
  module.directive('beakerobjectLayout', ['bkHelper', 'bkCoreManager', function (bkHelper, bkCoreManager) {
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/beakerobjectlayout'](),
      scope: {
        model: '='
      },
      controller: function ($scope) {
        $scope.items = $scope.model.getCellModel().items;

        $scope.labels = $scope.model.getCellModel().labels;
        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };

        $scope.isEmbedded = window.beakerRegister.isEmbedded ? true : false;
        $scope.isPublication = window.beakerRegister.isPublication ? true : false;

        $scope.showoutput = $scope.model.isShowOutput();
        $scope.items = _.map($scope.model.getCellModel().items, function (it) {
          return {
            result: it,
            isShowOutput: function () {
              return $scope.showoutput;
            }
          };
        });
        $scope.isShowMenu = function () {
          return false;
        };

        $scope.evaluate = function() {
          var cellId = $scope.model.getCellId();
          if (!cellId) return;
          bkCoreManager.getBkApp().evaluate(cellId).
            catch(function(data) {
              console.log('Evaluation failed');
            });
        };

        $scope.bkoMenuItems = [
            {
              name: 'Delete',
              action: function(idx) {
                var property = $scope.model.getCellModel().labels[idx];
                var beakerObj = bkHelper.getBeakerObject();
                var beaker = beakerObj.beakerObj;

                if (beaker && property) {
                  delete beaker[property];
                  beakerObj.beakerObjectToNotebook();
                  $scope.evaluate();
                }
              }
            },
            {
              name: 'Rename',
              action: function(idx) {
                $scope.getPropertyId = function() {
                  return idx;
                };
                bkCoreManager.showFullModalDialog(function cb(r) { } ,
                  'app/mainapp/dialogs/bkorename.jst.html', 'BkoRenameController', $scope);
              }
            }
        ];
        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
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

  var module = angular.module('bk.notebook');
  module.directive('simpleLayout', ['bkHelper', 'bkCoreManager', function (bkHelper, bkCoreManager) {
    return {
      restrict: 'E',
      template: JST['mainapp/components/notebook/simplelayout'](),
      scope: {
        model: '='
      },
      controller: function ($scope) {
        $scope.items = $scope.model.getCellModel().items;

        $scope.labels = $scope.model.getCellModel().labels;
        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };

        $scope.showoutput = $scope.model.isShowOutput();
        $scope.items = _.map($scope.model.getCellModel().items, function (it) {
          return {
            result: it,
            isShowOutput: function () {
              return $scope.showoutput;
            }
          };
        });
        $scope.isShowMenu = function () {
          return false;
        };

        $scope.evaluate = function() {
          var cellId = $scope.model.getCellId();
          if (!cellId) return;
          bkCoreManager.getBkApp().evaluate(cellId).
            catch(function(data) {
              console.log('Evaluation failed');
            });
        };

        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
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

  var module = angular.module('bk.notebook');

  module.directive('tabbedOutputContainerLayout', ['$timeout', 'GLOBALS', 'bkHelper', function ($timeout, GLOBALS, bkHelper) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/tabbedoutputcontainerlayout"](),
      scope: {
        model: '='
      },
      link: function (scope, element, attrs) {

        $timeout(function () {
          $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
            scope.$broadcast(GLOBALS.EVENTS.CELL_OUTPUT_LM_SHOWED);
          });
        });
      },
      controller: function ($scope) {
        $scope.guid =  bkHelper.guid();

        $scope.borderStyle = {
          'border': $scope.model.getCellModel().layout.borderDisplayed ? 'solid 1px #CCC' : ''
        };
        $scope.items = $scope.model.getCellModel().items;
        $scope.labels = $scope.model.getCellModel().labels;
        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };

        $scope.showoutput = $scope.model.isShowOutput();
        $scope.items = _.map($scope.model.getCellModel().items, function (it) {
          return {
            result: it,
            isShowOutput: function () {
              return $scope.showoutput;
            }
          };
        });
        $scope.isShowMenu = function () {
          return false;
        };
        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
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

  var module = angular.module('bk.notebook');
  module.directive('cyclingOutputContainerLayout', ['bkHelper', '$timeout', "GLOBALS", function (bkHelper, $timeout, GLOBALS) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/cyclingoutputcontainerlayout"](),
      scope: {
        model: '='
      },
      controller: function ($scope) {
        $scope.guid =  bkHelper.guid();

        $scope.borderStyle = {
          'border': $scope.model.getCellModel().layout.borderDisplayed ? 'solid 1px #CCC' : '',
          'margin-top': $scope.model.getCellModel().layout.borderDisplayed ? '30px' : ''
        };

        $scope.items = $scope.model.getCellModel().items;
        $scope.labels = $scope.model.getCellModel().labels;
        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };

        $scope.showoutput = $scope.model.isShowOutput();
        $scope.items = _.map($scope.model.getCellModel().items, function (it) {
          return {
            result: it,
            isShowOutput: function () {
              return $scope.showoutput;
            }
          };
        });
        $scope.isShowMenu = function () {
          return false;
        };
        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
      },
      link: function ($scope, element) {
        $timeout(function () {
          var divs = $('div[id^="lm-cycling-panel-"]').hide(),
            i = 0;
          (function cycle() {

            divs.eq(i).show(0)
              .delay($scope.model.getCellModel().layout.period)
              .hide(0, cycle);
            $scope.$broadcast(GLOBALS.EVENTS.CELL_OUTPUT_LM_SHOWED);
            i = ++i % divs.length;
          })();
        });
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

  var module = angular.module('bk.notebook');
  module.directive('gridOutputContainerLayout', ['bkHelper', function (bkHelper) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/gridoutputcontainerlayout"](),
      scope: {
        model: '='
      },
      controller: function ($scope) {

        $scope.cellStyle = {
          'border': $scope.model.getCellModel().layout.borderDisplayed ? 'solid 1px #CCC' : '',
          'padding-top': $scope.model.getCellModel().layout.paddingTop + "px",
          'padding-bottom': $scope.model.getCellModel().layout.paddingBottom + "px",
          'padding-left': $scope.model.getCellModel().layout.paddingLeft + "px",
          'padding-right': $scope.model.getCellModel().layout.paddingRight + "px"
        };
        $scope.colCount = $scope.model.getCellModel().layout.columns;
        $scope.rows = [];

        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };

        var row = 0;
        var col = 0;
        $scope.rows[row] = [];
        for (var i = 0; i < $scope.model.getCellModel().items.length; i++) {
          $scope.rows[row].push({
            result: $scope.model.getCellModel().items[i],
            isShowOutput: function () {
              return $scope.showoutput;
            },
            label: $scope.model.getCellModel().labels[i]
          });
          col++;
          if (col === $scope.colCount && i < $scope.model.getCellModel().items.length - 1) {
            row++;
            col=0;
            $scope.rows[row] = [];
          }
        }

        $scope.showoutput = $scope.model.isShowOutput();

        $scope.isShowMenu = function () {
          return false;
        };

        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
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

  var module = angular.module('bk.notebook');

  module.directive('dashboardLayout', ['bkHelper', function (bkHelper) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/dashboardlayout"](),
      scope: {
        model: '='
      },
      controller: function ($scope) {

        $scope.cellStyle = {
          'padding-top': $scope.model.getCellModel().layout.paddingTop + "px",
          'padding-bottom': $scope.model.getCellModel().layout.paddingBottom + "px",
          'padding-left': $scope.model.getCellModel().layout.paddingLeft + "px",
          'padding-right': $scope.model.getCellModel().layout.paddingRight + "px"
        };

        $scope.colCount = $scope.model.getCellModel().layout.columns;
        $scope.rows = [];

        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };

        var row = 0;
        var col = 0;
        $scope.rows[row] = [];
        for (var i = 0; i < $scope.model.getCellModel().items.length; i++) {
          $scope.rows[row].push({
            result: $scope.model.getCellModel().items[i],
            isShowOutput: function () {
              return $scope.showoutput;
            },
            label: $scope.model.getCellModel().labels[i],
            row: row,
            col: col
          });
          col++;
          if (col === $scope.colCount && i < $scope.model.getCellModel().items.length - 1) {
            row++;
            col = 0;
            $scope.rows[row] = [];
          }
        }

        $scope.showoutput = $scope.model.isShowOutput();

        $scope.isShowMenu = function () {
          return false;
        };

        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
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

  var module = angular.module('bk.notebook');
  module.directive('outputContainer', ['bkHelper', function (bkHelper) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/notebook/outputcontainer"](),
      scope: {
        model: '='
      },
      controller: function ($scope) {
        $scope.layout = $scope.model.getCellModel().layout || {};
        $scope.isShowOutput = function () {
          return $scope.model.isShowOutput();
        };
        $scope.showoutput = $scope.model.isShowOutput();
        $scope.isShowMenu = function () {
          return false;
        };
        $scope.$watch('isShowOutput()', function (oldval, newval) {
          $scope.showoutput = newval;
        });
      }
    }
  }]);
})();



/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
 * bkSparkConfigurationCtrl
 */

(function() {
  'use strict';
  var module = angular.module('bk.core');

  module.controller(
    'sparkConfigurationCtrl',
    ['$scope', '$rootScope', '$uibModalInstance', 'bkCoreManager', 'bkSessionManager',
     'bkMenuPluginManager', 'bkEvaluatePluginManager', 'bkEvaluatorManager', 'GLOBALS',
     'bkUtils', 'bkSparkContextManager',
     function($scope, $rootScope, $uibModalInstance, bkCoreManager, bkSessionManager,
              bkMenuPluginManager, bkEvaluatePluginManager,
              bkEvaluatorManager, GLOBALS, bkUtils, bkSparkContextManager) {

    // hide properties that are configurable elsewhere
    var BLACKLISTED_SPARK_PROPERTIES = [
      'spark.executor.cores', 'spark.executor.memory', 'spark.master', 'spark.ui.port'
    ];
    if (window.beakerRegister.additionalHiddenSparkProperties != null) {
      BLACKLISTED_SPARK_PROPERTIES = BLACKLISTED_SPARK_PROPERTIES.concat(
        window.beakerRegister.additionalHiddenSparkProperties);
    }

    // copy settings from SparkContextManager
    $scope.configuration = angular.copy(bkSparkContextManager.configurationObjects());

    $scope.loadSparkConf = function() {
      $scope.sparkConf = _.filter(_.map(
        angular.copy(bkSparkContextManager.sparkConf()),
        function(value, key) {
          return { key: key, value: value };
        }),
        function(property) {
          return BLACKLISTED_SPARK_PROPERTIES.indexOf(property.key) < 0;
        });
      $scope.sparkConf.push({ key: '', value: '' });
      $scope.originalSparkConf = angular.copy($scope.sparkConf);
    };
    $scope.loadSparkConf();


    var digestPlaceholder = true; // used for avoiding endless digestion
    $scope.$watch('sparkConf', function(newValue, oldValue) {
      if (!digestPlaceholder) {
        digestPlaceholder = true;
        return;
      }
      if ($scope.isDisabled())
        return;
      for (var i = 0; i < newValue.length; ++i) {
        var p = newValue[i];
        if (p.key === '')
          return;
      }

      digestPlaceholder = false;
      // we have to add a new placeholder
      $scope.sparkConf.push({ key: '', value: '' });
    }, true);

    $scope.removeSparkConfProperty = function(property) {
      if ($scope.isDisabled())
        return;
      var index = $scope.sparkConf.indexOf(property);
      $scope.sparkConf.splice(index, 1);
    };

    $scope.saveSparkConf = function() {
      var conf = {};
      for (var i = 0; i < $scope.sparkConf.length; ++i) {
        var p = $scope.sparkConf[i];
        if (p.key === '')
          continue;
        if (p.key in BLACKLISTED_SPARK_PROPERTIES) {
          console.warn('SparkConf property "' + p.key + '" cannot be specified.');
          continue;
        }
        conf[p.key] = p.value;
      }
      bkSparkContextManager.setSparkConf(conf);
      $scope.loadSparkConf();
    };

    $scope.isFixedProperty = function(propertyKey) {
      if (propertyKey === '')
        return false;
      for (var i = 0; i < $scope.originalSparkConf.length; ++i) {
        if ($scope.originalSparkConf[i].key === propertyKey)
          return true;
      }
      return false;
    };

    $scope.showAdvanced = false;
    $scope.toggleAdvanced = function() {
      $scope.showAdvanced = !$scope.showAdvanced;
    };

    $scope.doClose = function() {
      $uibModalInstance.close("ok");
    };

    $scope.isDisabled = function() {
      return bkSparkContextManager.isFailing() || bkSparkContextManager.isConnected() ||
        bkSparkContextManager.isConnecting() || bkSparkContextManager.isDisconnecting() ||
        !bkSparkContextManager.isAvailable();
    };

    $scope.start = function() {
      bkSparkContextManager.setConfigurationObjects($scope.configuration);
      $scope.saveSparkConf();
      bkSparkContextManager.connect();
    };

    $scope.stop = function() {
      $scope.loadSparkConf();
      bkSparkContextManager.disconnect();
    };

    $scope.edited = function() {
      return !angular.equals($scope.configuration, bkSparkContextManager.configurationObjects())
          || !angular.equals($scope.sparkConf, $scope.originalSparkConf);
    };

    $scope.running = function() {
      return bkSparkContextManager.runningJobs();
    };

    $scope.error = function() {
      return bkSparkContextManager.getError();
    };

    $scope.closePermitted = false;
    $scope.$on('modal.closing', function(event, reason, closed) {
      if ($scope.edited()) {
        if (!$scope.closePermitted) {
          event.preventDefault();
          bkHelper.show2ButtonModal('Discard your changes to the settings?', 'Discard changes',
              function() {
                $scope.closePermitted = true;
                $scope.doClose();
              },
              function() {
                $scope.saveSparkConf();
              },
              "Ok", "Cancel", "", "");
        }
      }
    });
  }]);
})();

/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
 * bkSparkContextManager
 */
(function() {
  'use strict';
  angular.module('bk.sparkContextManager',
    [ 'bk.utils', 'bk.helper', 'bk.sessionManager', 'bk.evaluatorManager',
      'bk.evaluatePluginManager', 'bk.globals' ])
  .factory('bkSparkContextManager', function(
      $timeout, $rootScope, $http, bkUtils, bkHelper, bkSessionManager,
      bkEvaluatorManager, bkEvaluatePluginManager, GLOBALS) {

    var PLUGIN_ID = "Scala";
    var PLUGIN_NAME = "Scala";
    var COMMAND = "scala/scalaPlugin";
    var serviceBase = null;
    var uiPort = 4040;
    var shellId = undefined;

    var connected = false;
    var connecting = false;
    var disconnecting = false;
    var error = '';
    var running = 0;

    var sparkConf = null;

    var jobsPerCell = {};
    var activeCell = null;

    var executorIds = [];

    function ConfigurationString(id, value, name, customSerializer) {
      this.id = id;
      this.value = value;
      this.type = 'string';
      this.name = typeof name === 'string' ? name : id;
      if (typeof customSerializer === 'function')
        this.serializer = customSerializer;
      else
        this.serializer = function(value) { return value; }
      
      this.serializedValue = function() {
        return this.serializer(this.value);
      };
    }

    function ConfigurationChoice(id, value, name, options) {
      ConfigurationString.apply(this, [id, value, name]);
      this.options = typeof options === 'object' ?
        options : [value];
      this.type = 'choice';
    }

    function ConfigurationBoolean(id, value, name) {
      ConfigurationString.apply(this, [id, value, name]);
      this.type = 'boolean';
    }

    function integerSerializer(min, max, suffix) {
      suffix = typeof suffix === 'string' ? suffix : '';
      return function(value) {
        var i = parseInt(value);
        if (isNaN(i))
          return String(min) + suffix;        
        return String(Math.min(max, Math.max(min, i))) + suffix;
      };
    }

    function responseContainsError(response) {
      return typeof response === "string" && response.toLowerCase().indexOf('error') >= 0;
    }

    var configurationObjects = {
      executorCores: new ConfigurationString(
        'spark.executor.cores',
        '10',
        'Executor cores',
        integerSerializer(1, 128)
      ),
      executorMemory: new ConfigurationString(
        'spark.executor.memory',
        '8g',
        'Executor memory'
      ),
      datacenter: new ConfigurationChoice(
        'datacenter',
        'dft',
        'Datacenter',
        window.beakerRegister.sparkDatacenters || ['aws', 'local']
      ),
      advanced: {
        persistent: new ConfigurationBoolean(
          'persistent',
          false,
          'Persistent'
        ),
        sc: new ConfigurationString(
          'sparkContextAlias',
          'sc',
          'SparkContext alias'
        ),
        sqlContext: new ConfigurationString(
          'sqlContextAlias',
          'sqlContext',
          'SQLContext alias'
        )
      }
    };

    function readConfiguration(config, applyOnSuccess) {
      var r = {
        configurationObjects: jQuery.extend(true, {}, configurationObjects),
        uiPort: null,
        sparkConf: null,
        success: false
      }
      try {
        r.configurationObjects.advanced.sc.value = config["sparkContextAlias"];
        r.configurationObjects.advanced.sqlContext.value = config["sqlContextAlias"];
        r.configurationObjects.advanced.persistent.value = config["persistent"];
        r.sparkConf = config["sparkConf"];
        r.configurationObjects.executorCores.value = r.sparkConf["spark.executor.cores"];
        r.configurationObjects.executorMemory.value = r.sparkConf["spark.executor.memory"];
        r.configurationObjects.datacenter.value = config["datacenter"];
        r.uiPort = parseInt(r.sparkConf["spark.ui.port"]);

        if (applyOnSuccess) {
          configurationObjects = r.configurationObjects;
          uiPort = r.uiPort;
          sparkConf = r.sparkConf;
        }

        r.success = true;
      } catch (e) {
        console.warn("Failed to deserialize configuration:", e);
      }
      return r;
    }

    function Stage(id, total, failed, completed, active) {
      this.total = total;
      this.id = id;
      this.url = bkSparkContextManager.sparkUiUrl() + '/stages/stage/?id=' + id + '&attempt=0';
      this.failed = failed;
      this.completed = completed;
      this.active = active;

      if (this.total > 0) {
        this.failedP = Math.min(100, this.failed / this.total * 100);
        this.completedP = Math.min(100, this.completed / this.total * 100);
        this.activeP = Math.min(100, this.active / this.total * 100);
      }
      else {
        this.failedP = 0;
        this.completedP = 0;
        this.activeP = 0;
      }
    };

    function Job(id, stageObjects, stages, running) {
      this.id = id;
      this.stages = stageObjects;
      this.running = running;
      if (id == null)
        this.url = null;
      else
        this.url = bkSparkContextManager.sparkUiUrl() + '/jobs/job/?id=' + id;
      this.totalTasks = 0;
      this.failedTasks = 0;
      this.succeededTasks = 0;
      this.activeTasks = 0;
      for (var index in stages) {
        this.totalTasks += stages[index].totalTasks;
        this.failedTasks += stages[index].failedTasks;
        this.activeTasks += stages[index].activeTasks;
        this.succeededTasks += stages[index].succeededTasks;
      }
    };
    
    $rootScope.getEvaluator = function() {
      return bkEvaluatorManager.getEvaluator(PLUGIN_NAME);
    };

    var appSubscription = null, jobSubscription = null;

    // retrieve service base to send http requests
    $rootScope.$watch('getEvaluator()', function(newValue, oldValue) {
      if (typeof newValue === 'undefined' || newValue == null) {
        serviceBase = null;
        return;
      }
      bkHelper.locatePluginService(PLUGIN_ID, {
        command: COMMAND,
        recordOutput: "true"
      }).success(function(ret) {
        serviceBase = ret;
        var evaluator = bkEvaluatorManager.getEvaluator(PLUGIN_NAME);
        if (typeof evaluator !== 'undefined' && evaluator != null)
          shellId = evaluator.settings.shellID;

        $.cometd.init({
          url: bkHelper.serverUrl(serviceBase) + '/cometd/'
        });
        appSubscription = $.cometd.subscribe('/sparkAppProgress', function(progress) {
          console.log("Spark app progress", progress);
        });
        jobSubscription = $.cometd.subscribe('/sparkJobProgress', function(progress) {
          running = 0;
          for (var index in progress.data.jobs) {
            running += progress.data.jobs[index].running ? 1 : 0;
          }
          if (activeCell != null) {
            var jobs = [];
            for (var jindex in progress.data.jobs) {
              var j = progress.data.jobs[jindex];
              var stages = [];
              for (var sindex in j.stages) {
                var s = j.stages[sindex];
                stages.push(new Stage(
                  s.stageId,
                  s.totalTasks,
                  s.failedTasks,
                  s.succeededTasks,
                  s.activeTasks));
              }
              jobs.push(new Job(
                j.id,
                stages,
                j.stages,
                j.running));
            }
            jobsPerCell[activeCell] = jobs;
          }          
          executorIds = progress.data.executorIds;
          $rootScope.$digest();
        });

        // get current Spark status (has the context already been started?)
        bkHelper.httpPost(
          bkHelper.serverUrl(serviceBase + "/rest/scalash/configuration"),
          { shellId: shellId }
        ).success(function(ret) {
          if (ret === "offline")
            return;
          var confReadResult = readConfiguration(ret, true);
          if (confReadResult.success) {
            connecting = false;
            connected = true;
            running = 0;
            console.log("SparkContext already started, port:", uiPort);
          } else {
            connecting = false;
            connected = false;
            running = 0;

            if (responseContainsError(ret))
              error = ret;
            else
              error = 'Error during configuration deserialization';
          }
          bkHelper.clearStatus("Creating Spark context");
        });
      }).error(function(ret) {
        serviceBase = undefined;
        console.warn('Failed to obtain service base.', ret);
      });
    });

    $rootScope.$on('$destroy', function() {
      $.cometd.unsubscribe(appSubscription);
      $.cometd.unsubscribe(jobSubscription);
    });

    return {
      isAvailable: function() {
        return serviceBase != null;
      },
      isConnecting: function() {
        return connecting;
      },
      isDisconnecting: function() {
        return disconnecting;
      },
      isFailing: function() {
        return error.length > 0;
      },
      isConnected: function() {
        return connected;
      },
      runningJobs: function() {
        return running;
      },
      isRunning: function() {
        return running > 0;
      },
      getError: function() {
        return error;
      },
      connect: function() {
        if (connected)
          return;

        bkHelper.showStatus(
          "Creating Spark context",
          bkHelper.serverUrl(serviceBase + "/rest/scalash/startSparkContext")
        );
        connecting = true;
        
        console.log('Setting up SparkContext using configuration', this.configuration());
        bkHelper.httpPost(
          bkHelper.serverUrl(serviceBase + "/rest/scalash/startSparkContext"),
          {
            shellId: shellId,
            configuration: JSON.stringify(this.configuration())
          }
        ).success(function(ret) {
          var confReadResult = readConfiguration(ret, true);
          if (confReadResult.success) {
            console.log("done startSparkContext, port:", uiPort);
            connected = true;
            error = '';
            jobsPerCell = {};
          } else {
            connected = false;
            if (responseContainsError(ret))
              error = ret;
            else
              error = 'Error during configuration deserialization';
          }
          connecting = false;
          running = 0;
          executorIds = [];
          bkHelper.clearStatus("Creating Spark context");

          // get Spark executor IDs
          bkHelper
            .httpGet(bkHelper.serverUrl(serviceBase + "/rest/scalash/sparkExecutorIds"))
            .success(function(ret) {
              if (ret instanceof Array)
                executorIds = ret;
              else
                console.warn("Error while deserializing Spark executor IDs. Given:", ret);
            })
            .error(function(ret) {
              console.warn("Error while retrieving Spark executor IDs:", ret);
            });
        }).error(function(ret) {
          if (ret == null) {
            // connection issue, Spark is just not available
            serviceBase = null;
            error = '';
          }
          else {
            // something erroneous happened
            console.error("SparkContext could not be started.", ret);
            if (responseContainsError(ret))
              error = ret;
            else
              error = 'Error: SparkContext could not be started.';
          }
          bkHelper.clearStatus("Creating Spark context");
          connecting = false;
          running = 0;
          executorIds = [];
        });
      },
      disconnect: function() {
        if (!connected)
          return;

        bkHelper.showStatus("Stopping Spark context");
        disconnecting = true;

        bkHelper.httpPost(
          bkHelper.serverUrl(serviceBase + "/rest/scalash/stopSparkContext"),
          {shellId: shellId}
        ).success(function(ret) {
          console.log("done stopSparkContext", ret);
          disconnecting = false;
          connected = false;
          running = 0;
          error = '';
          bkHelper.clearStatus("Stopping Spark context");
        }).error(function(ret) {
          if (ret == null) {
            // connection issue, Spark is just not available
            serviceBase = null;
            error = '';
          }
          else {
            // something erroneous happened
            console.error("SparkContext could not be stopped.", ret);
            if (responseContainsError(ret))
              error = ret;
            else
              error = 'Error: SparkContext could not be stopped.';
          }
          bkHelper.clearStatus("Stopping Spark context");
          disconnecting = false;
          running = 0;
        });
      },
      sparkUiUrl: function() {
        return 'http://' + window.location.hostname + ':' + uiPort;
      },
      openSparkUi: function() {
        if (!connected)
          return;
        var win = window.open(this.sparkUiUrl(), '_blank');
        win.focus();
      },
      configurationObjects: function() {
        return configurationObjects;
      },
      setConfigurationObjects: function(config) {
        configurationObjects = config;
      },
      configuration: function() {
        // serialize configuration objects to plain string dictionary
        var config = {};
        for (var key in configurationObjects) {
          if (key === 'advanced')
            continue;
          var obj = configurationObjects[key];
          config[obj.id] = obj.serializedValue();
        }
        for (var key in configurationObjects.advanced) {
          var obj = configurationObjects.advanced[key];
          config[obj.id] = obj.serializedValue();
        }
        for (var key in sparkConf) {
          config[key] = sparkConf[key];
        }
        return config;
      },
      sparkConf: function() {
        return sparkConf;
      },
      setSparkConf: function(conf) {
        sparkConf = conf;
      },
      setSparkConfProperty: function(key, value) {
        sparkConf[key] = value;
      },
      getJobsPerCell: function(cellId) {
        if (cellId in jobsPerCell)
          return jobsPerCell[cellId];
        return null;
      },
      setJobsPerCell: function(cellId, jobs) {
        jobsPerCell[cellId] = jobs;
      },
      registerCell: function(cellId) {
        jobsPerCell[cellId] = [];
        activeCell = cellId;
      },
      executorIds: function() {
        return executorIds;
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
 * This is the module for the UI that shows the list of evaluators and their corresponding
 * settings panel.
 */

(function() {
  'use strict';

  var module = angular.module('bk.core');

  module.directive('bkSparkMenu', 
    function($compile, $timeout, $uibModal, bkSparkContextManager, GLOBALS, bkUtils, bkSessionManager) {

    return {
      restrict: 'E',
      template: JST["mainapp/components/spark/sparkmenu"](),      
      replace: true,
      controller: function($scope) {
      },
      link: function(scope, element, attrs) {
        scope.showSparkConfiguration = function() {
          bkHelper.showSparkConfiguration();
        };

        scope.statusClass = function() {
          if (bkSparkContextManager.isAvailable() && bkSparkContextManager.isFailing())
            return 'plugin-error';
          if (bkSparkContextManager.isConnecting() || bkSparkContextManager.isDisconnecting())
            return 'plugin-loading';
          if (bkSparkContextManager.isAvailable() && bkSparkContextManager.isConnected())
            return 'plugin-active';
          return 'plugin-known';
        };

        scope.getError = function() {
          return bkSparkContextManager.getError();
        };

        scope.isConnected = function() {
          return bkSparkContextManager.isConnected();
        };

        scope.isConnecting = function() {
          return bkSparkContextManager.isConnecting();
        };

        scope.isDisconnecting = function() {
          return bkSparkContextManager.isDisconnecting();
        };

        scope.isInactive = function() {
          return !bkSparkContextManager.isAvailable();
        };

        scope.start = function() {
          bkSparkContextManager.connect();
        };

        scope.stop = function() {
          bkSparkContextManager.disconnect();
        };

        scope.showSparkProperties = function() {
          var options = {
            windowClass: 'beaker-sandbox',
            backdropClass: 'beaker-sandbox',
            backdrop: true,
            keyboard: true,
            backdropClick: true,
            controller: 'sparkPropertiesCtrl',
            template: JST['mainapp/components/spark/sparkproperties'](),
            size: 'lg'
          };

          var sparkPropertiesInstance = $uibModal.open(options);
          return sparkPropertiesInstance.result;
        };

        scope.showSparkUi = function() {
          bkSparkContextManager.openSparkUi();
        };
      }
    };
  });

})();

/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
 * This directive provides the spark progress bars indicating the tasks and stages.
 */

(function() {
  'use strict';

  var module = angular.module('bk.core');

  module.directive('bkSparkProgress', 
    function($compile, $timeout, bkSparkContextManager, GLOBALS, bkUtils, bkSessionManager) {
      return {
        restrict: 'E',
        template: JST["mainapp/components/spark/sparkprogress"](),
        replace: true,
        controller: function($scope) {
        },
        link: function(scope, element, attrs) {
          var cellId = scope.model.getCellId();
          scope.jobs = [];
          scope.retrieveJobs = function() {
            return bkSparkContextManager.getJobsPerCell(cellId);
          };
          scope.$watch('retrieveJobs()', function(newValue, oldValue) {
            if (newValue == null || newValue.length == 0)
              return;
            scope.jobs = newValue;
          });

          scope.isConnected = function() {
            return bkSparkContextManager.isConnected();
          };

          scope.isConnecting = function() {
            return bkSparkContextManager.isConnecting();
          };

          scope.isDisconnecting = function() {
            return bkSparkContextManager.isDisconnecting();
          };
        }
      };
  });

})();

/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
 * This directive provides the more detailed Spark status indicator.
 */

(function() {
  'use strict';

  var module = angular.module('bk.core');

  module.directive('bkSparkStatus', 
    function($compile, $timeout, bkSparkContextManager, GLOBALS, bkUtils, bkSessionManager) {
      return {
        restrict: 'E',
        template: JST["mainapp/components/spark/sparkstatus"](),
        replace: true,
        controller: function($scope) {
        },
        link: function(scope, element, attrs) {
          scope.isAvailable = function() {
            return bkSparkContextManager.isAvailable();
          }

          scope.isConnected = function() {
            return !bkSparkContextManager.isFailing() && bkSparkContextManager.isConnected() && !bkSparkContextManager.isDisconnecting() && !bkSparkContextManager.isConnecting();
          };

          scope.isConnecting = function() {
            return !bkSparkContextManager.isFailing() && bkSparkContextManager.isConnecting();
          };

          scope.isFailing = function() {
            return bkSparkContextManager.isFailing();
          };

          scope.error = function() {
            return bkSparkContextManager.getError();
          };

          scope.isDisconnecting = function() {
            return !bkSparkContextManager.isFailing() && bkSparkContextManager.isDisconnecting();
          };

          scope.isOffline = function() {
            return !bkSparkContextManager.isFailing() && !scope.isConnected() && !scope.isConnecting() && !scope.isDisconnecting();
          };

          scope.running = function() {
            return bkSparkContextManager.runningJobs();
          };
        }
      };
  });

})();

/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
 * bkSparkJobsCtrl
 */

(function() {
  'use strict';
  var module = angular.module('bk.core');

  module.controller(
    'sparkJobsCtrl',
    ['$scope', '$rootScope', '$uibModalInstance', 'bkCoreManager', 'bkSessionManager',
     'bkMenuPluginManager', 'bkEvaluatePluginManager', 'bkEvaluatorManager', 'GLOBALS',
     'bkUtils', 'bkSparkContextManager',
     function($scope, $rootScope, $uibModalInstance, bkCoreManager, bkSessionManager,
              bkMenuPluginManager, bkEvaluatePluginManager,
              bkEvaluatorManager, GLOBALS, bkUtils, bkSparkContextManager) {

    var cellId = $scope.$parent.$parent.cellId;
    $scope.jobs = [];
    $scope.retrieveJobs = function() {
      return bkSparkContextManager.getJobsPerCell(cellId);
    };
    $scope.$watch('retrieveJobs()', function(newValue, oldValue) {
      if (newValue == null || newValue.length == 0)
        return;
      // remember expanded states
      var expanded = [];
      for (var index in $scope.jobs) {
        expanded[index] = $scope.jobs[index]["expanded"] == true;
      }
      $scope.jobs = newValue;
      for (var index in expanded) {
        $scope.jobs[index]["expanded"] = expanded[index];
      }
    });

    $scope.toggle = function(job) {
      if (job.expanded == null || !job.expanded)
        job["expanded"] = true;
      else
        job["expanded"] = false;
    };

    $scope.doClose = function() {
      $uibModalInstance.close("ok");
    };

    $scope.openUrl = function($event, url) {
      $event.stopPropagation();
      var win = window.open(url, '_blank');
      win.focus();
    };

    $scope.expandAll = function() {
      for (var index in $scope.jobs) {
        $scope.jobs[index]["expanded"] = true;
      }
    };

    $scope.collapseAll = function() {
      for (var index in $scope.jobs) {
        $scope.jobs[index]["expanded"] = false;
      }
    };
  }]);
})();

/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
 * bkSparkPropertiesCtrl
 */

(function() {
  'use strict';
  var module = angular.module('bk.core');

  module.controller(
    'sparkPropertiesCtrl',
    ['$scope', '$rootScope', '$uibModalInstance', 'bkSparkContextManager',
     function($scope, $rootScope, $uibModalInstance, bkSparkContextManager) {

    // copy settings from SparkContextManager
    $scope.properties = bkSparkContextManager.sparkConf();

    $scope.doClose = function() {
      $uibModalInstance.close("ok");
    };

    $scope.executorIds = bkSparkContextManager.executorIds();
    $scope.executorIdSectionTitle = window.beakerRegister.sparkExecutorSectionTitle || "Executor IDs";
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
 * This module is the central control of all output displays. It fulfills actual angular directives
 * lazily when user load output display plugins.
 */
(function() {
  "use strict";
  var module = angular.module('bk.outputDisplay', ['bk.utils',  'ngAnimate', 'ngTouch']);
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
  "use strict";
  var module = angular.module('bk.outputDisplay');
  module.directive('bkOutputDisplay', function($compile, bkOutputDisplayFactory, bkUtils, bkNotificationService) {
    var getResultType = function(model) {
      if (model && model.getCellModel()) {
        if (_.isString(model.getCellModel())) {
          return "String";
        } else {
          return model.getCellModel().type;
        }
      }
    };
    return {
      restrict: "E",
      template: "<div>OUTPUT</div>",
      scope: {
        type: "@",
        model: "=" // assume ref to model doesn't change after directive is created
      },
      controllerAs: 'outputDisplayCtrl',
      controller: function ($scope) {

        var evaluationCompleteNotificationMethods = [];
        
        this.initAvailableNotificationMethods = function () {
          evaluationCompleteNotificationMethods = bkNotificationService.initAvailableNotificationMethods();
        };
        
        this.getAvailableNotificationMethods = function () {
          return evaluationCompleteNotificationMethods;
        };
        this.toggleNotifyWhenDone = function (notificationMethod) {
          notificationMethod.selected = !notificationMethod.selected;
          if(notificationMethod.selected && notificationMethod.checkPermissions) {
            notificationMethod.checkPermissions();
          }
        };
        this.isNotifyWhenDone = function (notificationMethod) {
          return notificationMethod.selected;
        };

        $scope.model.getOutputSummary = function () {
          var result = $scope.model.getCellModel();
          var type = $scope.type;

          function getItemsText(itemTitle, items) {
            return items + ' ' + (items > 1 ? itemTitle + 's' : itemTitle);
          }

          function strip(html) {
            var div = document.createElement('div');
            div.innerHTML = html;
            var scripts = div.getElementsByTagName('script');
            var i = scripts.length;
            while (i--) {
              scripts[i].parentNode.removeChild(scripts[i]);
            }
            return div.textContent || div.innerText || "";
          }

          function firstString(str) {
            if (str) {
              var arr = str.split('\n');
              for (var i = 0; i < arr.length; i++) {
                if (arr[i].length > 0)
                  return arr[i]
              }
            }
            return '';
          }

          function firstNChars(str, count) {
            if (str) {
              if (str.length > count){
                str = str.substr(0, count);
              }
              return str.replace(/\n/g, "");
            }
            return '';
          }

          function getOutputSummary(type, result) {
            type = type || 'Text';
            switch (type) {
              case 'CombinedPlot':
                if (result.plots && result.plots.length > 0) {
                  return result.plots.length + ' plots';
                }
                break;
              case 'Plot':
                if (result.graphics_list && result.graphics_list.length > 0) {
                  var items = result.graphics_list.length;
                  return 'a plot with ' + getItemsText('item', items);
                }
                break;
              case 'OutputContainer':
                if(result.items) {
                  return 'Container with ' + getItemsText('item', result.items.length);
                }
                break;
              case 'Table':
              case 'TableDisplay':
                var names = result.columnNames.join(", ");
                return 'a table with ' + result.values.length + ' rows and ' + result.columnNames.length + ' columns (' + names + ')';
              case 'Results':
                var out = 0, err = 0;
                if (result.outputdata && result.outputdata.length > 0) {
                  _.forEach(result.outputdata, function (outputLine) {
                    if (outputLine.type === 'err') {
                      err++;
                    } else {
                      out++;
                    }
                  })
                }
                var summary = [];
                var getLinesSummary = function (num, s) {
                  return num + ' ' + (num > 1 ? 'lines' : 'line') + ' of ' + s;
                };
                if (out > 0) {
                  summary.push(getLinesSummary(out, 'stdout'));
                }
                if (err > 0) {
                  summary.push(getLinesSummary(err, 'stderr'));
                }
                if(result.payload) {
                  summary.push(getOutputSummary(result.payload.type, result.payload));
                }
                return summary.join(', ');
                break;
              case 'Progress':
                return null;
                break;
              case 'Text':
                return firstString((typeof result === 'string') ? result : JSON.stringify(result));
              case 'Html':
                return firstNChars(strip(result), 1000);
            }
            return type;
          }
          return result !== undefined && getOutputSummary(result.innertype || type, result);
        };
      },
      link: function(scope, element, attr, ctrl) {
        var childScope = null;
        var refresh = function(type) {
          if (childScope) {
            childScope.$destroy();
          }
          childScope = scope.$new();
          childScope.model = scope.model;
          var lodT = (bkHelper.getBkNotebookViewModel() === undefined || bkHelper.getBkNotebookViewModel().getLodThreshold() === "") ? 5000 : bkHelper.getBkNotebookViewModel().getLodThreshold();
          childScope.prefs = {
              lodThreshold : lodT
          };
          var resultType = getResultType(scope.model);
          if (resultType) {
            bkUtils.log("outputDisplay", {
              resultType: resultType,
              displayType: type
            });
          }
          var directiveName = bkOutputDisplayFactory.getDirectiveName(type);
          element.html("<div class='output-padding'" + directiveName + " model='model'></div>");
          $compile(element.contents())(childScope);
        };
        scope.$watch("type", function(newType, oldType) {
          if(evaluationFinished(oldType)) {
            _.filter(ctrl.getAvailableNotificationMethods(), 'selected').forEach(function (notificationMethod) {
              notificationMethod.action.call(notificationMethod, 'Evaluation completed',
                scope.model.getOutputSummary() || 'no output', 'beakerCellEvaluationDone')
            })
          }

          refresh(newType);
        });
        scope.$on("outputDisplayFactoryUpdated", function(event, what) {
          if (what === "all" || what === scope.type) {
            refresh(scope.type);
          }
        });
        scope.$on("$destroy", function () {
          if (childScope) {
            childScope.$destroy();
          }
        });

        function evaluationFinished(oldType) {
          return oldType === 'Progress';
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
 * This module is the central control of all output displays. It fulfills actual angular directives
 * lazily when user load output display plugins.
 */
(function() {
  "use strict";
  var MAX_CAPACITY = 100;

  var module = angular.module('bk.outputDisplay');

  module.factory("bkOutputDisplayFactory", function($rootScope, bkHelper, $sce) {

    var impls = {
        "Text": {
          template: "<pre style='word-break: keep-all;'>{{getText()}}</pre>",
          controller: function($scope) {
            $scope.getText = function() {
              var model = $scope.model.getCellModel();
              return (model && model.text) ? model.text : model;
            };
          }
        },
        "DateTime": {
          template: "<pre>{{getDateTime()}}</pre>",
          controller: function($scope) {
            $scope.getDateTime = function() {
              var model = $scope.model.getCellModel();
              if (model && model.timestamp) {
                var m = moment(model.timestamp);
                return m.format("YYYYMMDD HH:mm:ss.SSS ZZ");
              }
              return model;
            };
          }
        },
        "Date": {
          template: "<pre>{{getDate()}}</pre>",
          controller: function($scope) {
            $scope.getDate = function() {
              var model = $scope.model.getCellModel();
              if (model && model.timestamp) {
                var m = moment(model.timestamp);
                return m.format("YYYY-MM-DD");
              }
              return model;
            };
          }
        },
        "Time": {
          template: "<pre>{{getTime()}}</pre>",
          controller: function($scope) {
            $scope.getTime = function() {
              var model = $scope.model.getCellModel();
              if (model && model.timestamp) {
                var m = moment(model.timestamp);
                return m.format("HH:mm:ss.SSS ZZ");
              }
              return model;
            };
          }
        },
      "Warning": {
        template: "<div class='outline warning'></div> <pre class='out_warning'>{{model.getCellModel().message}}</pre>"
      },
      "Error": {
        template: "<pre class='out_error'>" +
        "<span ng-show='canExpand' class='toggle-error' ng-click='expanded = !expanded'>{{expanded ? '-' : '+'}}</span>" +
        "<span ng-bind-html='shortError'></span></pre>" +
        "<pre ng-show='expanded'><span ng-bind-html='longError'></span>" +
        "</pre>",
        controller: function($scope, $element) {
          $scope.expanded = false;

          $scope.$watch('model.getCellModel()', function(cellModel) {
            var errors  = Array.prototype.concat(cellModel);

            $scope.shortError   = $sce.trustAsHtml(errors[0]);
            $scope.canExpand    = errors.length > 1;
            $scope.longError    = $sce.trustAsHtml(errors.slice(1).join("\n"));
          });
        }
      },
      "Html": {
        template: "<div class='output-padding'></divoutput-padding>",
        controller: function($scope, bkCellMenuPluginManager) {
          $scope.getShareMenuPlugin = function() {
            return bkCellMenuPluginManager.getPlugin("bko-html");
          };
          $scope.$watch("getShareMenuPlugin()", function() {
            var newItems = bkCellMenuPluginManager.getMenuItems("bko-html", $scope);
            $scope.model.resetShareMenuItems(newItems);
          });
        },
        link: function(scope, element, attrs) {
          var tagstofilter = ['applet', 'base', 'basefont', 'body', 'frame', 'frameset', 'head', 'html',
                              'isindex', 'link', 'meta', 'noframes', 'noscript', 'object', 'param'];

          scope.clean = function() {
            for (var t in tagstofilter) {
              var scripts = div[0].getElementsByTagName(tagstofilter[t]);
              var i = scripts.length;
              while (i--) {
                scripts[i].parentNode.removeChild(scripts[i]);
              }
            }
          }

          function renderCell(cell) {
            div.html(cell);
            var latexElement = element[0].getElementsByClassName('output_latex')
            if (latexElement.length > 0) {
              bkHelper.typeset(latexElement);
            }
            scope.clean();
          }

          var div = element.find("div").first();
          var cellModel = scope.model.getCellModel();
          renderCell(cellModel);

          scope.$watch('model.getCellModel()', function(newValue, oldValue) {
            if (newValue !== oldValue) {
              renderCell(newValue);
            }
          });
        }
      },
      "OutputContainer": {
        template: "<output-container model='model'></output-container>"
      }
    };

    var types = ["Text", "Date", "DateTime", "Time", "BeakerStandardOutput", "BeakerStandardError", "Warning", "Error", "Html", "OutputContainer"];
    var refresh = function(what, scope) {
      if (!what) {
        what = "all";
      }
      if (!scope) {
        scope = $rootScope;
      }
      scope.$broadcast("bkOutputDisplayFactory", what);
      scope.$$phase || scope.$apply();
    };
    var setImpl = function(index, type, impl) {
      types[index] = type;
      impls[type] = impl;
      refresh(type);
    };
    var resultType2DisplayTypesMap = {
      // The first in the array will be used as default
      "text": ["Text", "Html", "Latex"],
      "Date": ["DateTime", "Date", "Time", "Text"],
      "TableDisplay": ["Table", "Text"],
      "html": ["Html"],
      "ImageIcon": ["Image", "Text"],
      "BeakerDisplay": ["BeakerDisplay", "Text"],
      "Plot": ["Plot", "Text"],
      "TimePlot": ["Plot", "Text"],
      "EasyForm": ["EasyForm", "Text"],
      "NanoPlot": ["Plot", "Text"],
      "CombinedPlot": ["CombinedPlot", "Text"],
      "HiddenOutputCell": ["Hidden"],
      "Warning": ["Warning"],
      "BeakerOutputContainerDisplay": ["OutputContainer", "Text"],
      "OutputContainerCell": ["OutputContainer", "Text"],
      "OutputContainer": ["OutputContainer", "Text"],
      "CategoryPlot": ["Plot", "Text"],
      "Histogram": ["Plot", "Text"],
      "HeatMap": ["Plot", "Text"],
      "TreeMap": ["Plot", "Text"],
      "Plotly": ["Plotly", "Text"]
    };
    var factory = {
      add: function(type, impl) {
        if (types.length > MAX_CAPACITY) {
          throw "Cannot add output: " + type +
              ", max output display capacity(" + MAX_CAPACITY +
              ") reached";
        }
        // add to the end
        setImpl(types.length, type, impl);
      },
      get: function(index) {
        var type = types[index];
        return this.getImpl(type);
      },
      getImpl: function(type) {
        if (type && impls[type]) {
          return impls[type];
        } else {
          return impls["text"];
        }
      },
      getDirectiveName: function(type) {
        var index = types.indexOf(type);
        if (index === -1) {
          index = types.indexOf("Text");
        }
        return "bko" + index;
      },
      addOutputDisplayType: function(type, displays, index) {
        if (index === undefined) {
          index = 0;
        }
        if (!resultType2DisplayTypesMap[type]) {
          resultType2DisplayTypesMap[type] = displays;
        } else {
          Array.prototype.splice.apply(resultType2DisplayTypesMap[type], [index, 0].concat(displays));
        }
      },
      getApplicableDisplays: (function() {
        var isJSON = function(value) {
          var ret = true;
          try {
            JSON.parse(value);
          } catch (err) {
            ret = false;
          }
          return ret;
        };

        var isHTML = function(value) {
          return /^<[a-z][\s\S]*>/i.test(value);
        };
        return function(result) {
          if (result === undefined) {
            return ["Hidden"];
          }
          if (!result.type) {
            var ret = ["Text", "Html", "Latex"];
            if (isJSON(result)) {
              ret.push("Json", "Vega");
            }
            if (isHTML(result)) {
              ret = ["Html", "Text", "Latex"];
            }
            if (_.isArray(result)) {
              if (_.isObject(result[0])) {
                ret.push("Table");
              }
            }
            return ret;
          }
          if (resultType2DisplayTypesMap.hasOwnProperty(result.type)) {
            return resultType2DisplayTypesMap[result.type];
          } else {
            return ["Text"];
          }
        };
      })()
    };
    beakerRegister.outputDisplayFactory = factory;
    for (var key in beakerRegister.toBeAddedToOutputDisplayFactory) {
      beakerRegister.outputDisplayFactory.add(key, beakerRegister.toBeAddedToOutputDisplayFactory[key]);
    }
    beakerRegister.toBeAddedToOutputDisplayFactory = null;

    for (var key in beakerRegister.toBeAddedToOutputDisplayType) {
      var displays = beakerRegister.toBeAddedToOutputDisplayType[key];
      factory.addOutputDisplayType(key, displays);
    }
    beakerRegister.toBeAddedToOutputDisplayType = null;

    return factory;
  });

  _.each(_.range(MAX_CAPACITY), function(i) {
    module.directive("bko" + i,
        function(bkOutputDisplayFactory, bkOutputDisplayServiceManager, $injector) {
      var impl = bkOutputDisplayFactory.get(i);
      if (_.isFunction(impl)) {
        return impl(bkOutputDisplayServiceManager, $injector);
      } else if (_.isArray(impl)) {
        var args = [];
          for (var j = 0; j < impl.length; ++j) {
            var it = impl[j];
            if (_.isString(it)) {
              if (bkOutputDisplayServiceManager.has(it)) {
                args.push(bkOutputDisplayServiceManager.get(it));
              } else if ($injector.has(it)) {
                args.push($injector.get(it));
              } else {
                throw "beaker could not find provider for bkoFactory " + it;
              }
            } else if (_.isFunction(it)) {
              return it.apply(this, args);
            }
          }
      } else {
        return impl;
      }
    });
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
 * This module is the central control of all output displays. It fulfills actual angular directives
 * lazily when user load output display plugins.
 */
(function() {
  "use strict";

  var module = angular.module('bk.outputDisplay');
  module.factory("bkOutputDisplayServiceManager", function($injector) {
    var services = {};
    var factory = {
      getServices: function() {
        return services;
      },
      addService: function(key, impl) {
        if (typeof impl === "function") {
          services[key] = impl($injector);
        } else if (Object.prototype.toString.call(impl) === '[object Array]') {
          var args = [];
          for (var j = 0; j < impl.length; ++j) {
            var it = impl[j];
            if (typeof it === "string") {
              if (services.hasOwnProperty(it)) {
                args.push(services[it]);
              } else if ($injector.has(it)) {
                args.push($injector.get(it));
              }
              continue;
            }
            if (typeof it === "function") {
              services[key] = it.apply(this, args);
              break;
            }
          }
          ;
        } else {
          services[key] = impl;
        }
      },
      has: function(key) {
        return services.hasOwnProperty(key);
      },
      get: function(key) {
        return services[key];
      }
    };

    for (var key in beakerRegister.toBeAddedToOutputDisplayService) {
      var impl = beakerRegister.toBeAddedToOutputDisplayService[key];
      factory.addService(key, impl);
    }
    beakerRegister.toBeAddedToOutputDisplayService = null;
    beakerRegister.outputDisplayService = factory;
    return factory;
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
 * This is the module for the UI that shows the list of evaluators and their corresponding
 * settings panel.
 */
(function() {
  'use strict';

  var module = angular.module('bk.core');

  module.controller('pluginManagerCtrl', ['$scope', '$rootScope', '$uibModalInstance', 'bkCoreManager', 'bkSessionManager', 'bkMenuPluginManager', 'bkEvaluatePluginManager',
                                          'bkEvaluatorManager', 'GLOBALS', 'bkUtils', function($scope, $rootScope, $uibModalInstance, bkCoreManager, bkSessionManager, bkMenuPluginManager, bkEvaluatePluginManager,
                                              bkEvaluatorManager, GLOBALS, bkUtils) {


    $scope.$on(GLOBALS.EVENTS.SET_LANGUAGE_SETTINGS_EDITED, function(event, data) {
      $scope.edited = data.edited;
      $scope.editedEvalutor = data.editedEvalutor;
    });

    $scope.edited = false;
    $scope.editedEvalutor = "";

    $scope.discardChanges = function() {
      $scope.$broadcast(GLOBALS.EVENTS.DISCARD_LANGUAGE_SETTINGS);
    };
    window.discardPluginManagerChanges = $scope.discardChanges;

    $scope.navigateToModifiedTab = function() {
      $scope.$broadcast(GLOBALS.EVENTS.HIGHLIGHT_EDITED_LANGUAGE_SETTINGS);
      $scope.evalTabOp.setActiveTab($scope.editedEvalutor);
    };

    $scope.doClose = function() {
      $uibModalInstance.close("ok");
    }

    $scope.performOnClosingCleanup = function() {
      $scope.evalTabOp.showURL = false;
      $scope.evalTabOp.showWarning = false;
      $scope.evalTabOp.showSecurityWarning = false;
      $scope.evalTabOp.forceLoad = false;
      $scope.evalTabOp.newPluginNameOrUrl = "";
    };

    $scope.closePermitted = false;
    $scope.$on('modal.closing', function(event, reason, closed) {
      if ($scope.edited) {
        if (!$scope.closePermitted) {
          event.preventDefault();
          bkHelper.show2ButtonModal('Discard your changes to the settings?', 'Discard changes',
              function() {
                $scope.discardChanges();
                $scope.performOnClosingCleanup();
                $scope.closePermitted = true;
                $scope.doClose();
              },
              function() {
                $scope.navigateToModifiedTab();
              },
              "Ok", "Cancel", "", "");
        }
      } else {
        $scope.performOnClosingCleanup();
      }
    });

    $scope.getEvaluatorDetails = function(name) {
      return bkEvaluatorManager.getVisualParams(name);
    };

    $scope.allowFromUrl = function() {
      return (window.beakerRegister === undefined || window.beakerRegister.disablePluginLoadFromUrl === undefined || !window.beakerRegister.disablePluginLoadFromUrl);
    };

    $scope.getEvaluatorTooltipText = function (pluginName, pluginStatus) {
      var pluginDescription = $scope.getEvaluatorDetails(pluginName).tooltip;
      if(pluginDescription) {
        var suffix;
        switch(pluginStatus) {
          case 'known':
                suffix = ' Click to start.';
                break;
          case 'loading':
                suffix = ' Starting...';
                break;
          case 'active':
                suffix = ' Click to remove from notebook.';
                break;
        }
        return pluginDescription + suffix;
      }
    };

    $scope.evalTabOp = {
      newPluginNameOrUrl: "",
      showURL: false,
      showWarning: false,
      showSecurityWarning: false,
      forceLoad: false,
      tabs: [],
      activateThisTab: null,
      getLoadedEvaluators: function() {
        return bkEvaluatorManager.getLoadedEvaluators();
      },
      isTabActive: function(name) {
        for (var i = 0; i < this.tabs.length; i++) {
          if (this.tabs[i].evaluatorName === name) {
            return this.tabs[i].active;
          }
        }
        return false;
      },
      setActiveTab: function(name) {
        for (var i = 0; i < this.tabs.length; i++) {
          this.tabs[i].active = (this.tabs[i].evaluatorName === name);
        }
      },
      getActiveTab: function() {
        for (var i = 0; i < this.tabs.length; i++) {
          if (this.tabs[i].evaluatorName === name) {
            return this.tabs[i].active;
          }
        }
      },
      initTabs: function() {
        $scope.evalTabOp.tabs = [];
        var evaluators = $scope.evalTabOp.getEvaluatorsWithSpec();
        Object.keys(evaluators).forEach(function(evaluatorName) {
          var evaluator = evaluators[evaluatorName];
          evaluator.evaluatorName = evaluator.settings.name;
          $scope.evalTabOp.tabs.push(evaluator);
        });
        if ($scope.evalTabOp.activateThisTab && $scope.evalTabOp.tabs.length > 0) {
          $scope.evalTabOp.setActiveTab($scope.evalTabOp.activateThisTab);
          $scope.evalTabOp.activateThisTab = null;
        }
      },
      getEvaluatorsWithSpec: function() {
        var activePlugins = bkEvaluatorManager.getLoadedEvaluators();
        var result = {};
        for (var p in activePlugins) {
          if (Object.keys(activePlugins[p].spec).length > 0) {
            result[p] = activePlugins[p];
          }
        }
        return result;
      },
      getLoadingEvaluators: function() {
        return bkEvaluatorManager.getLoadingEvaluators();
      },
      getEvaluatorStatuses: function(name) {
        var knownPlugins = bkEvaluatePluginManager.getKnownEvaluatorPlugins();
        var knownPluginsNamesSorted = Object.keys(knownPlugins).sort();
        var activePlugins = bkEvaluatorManager.getLoadedEvaluators();
        var loadingPlugins = bkEvaluatorManager.getLoadingEvaluators();
        var result = {};
        for (var index = 0; index < knownPluginsNamesSorted.length; index++) {
          var status = false;
          var pluginName = knownPluginsNamesSorted[index];
          if (activePlugins[pluginName]) {
            status = "active";
          } else {
            for (var l in loadingPlugins) {
              if (loadingPlugins[l].plugin == pluginName) {
                status = "loading";
                break;
              }
            }
            if (!status) {
              status = "known";
            }
          }
          result[pluginName] = status;
        }
        return result;
      },
      setNewPluginNameOrUrl: function(pluginNameOrUrl) {
        this.newPluginNameOrUrl = pluginNameOrUrl;
      },
      togglePlugin: function(name) {
        var plugin = name || this.newPluginNameOrUrl;
        var fromUrl = name ? false : true;
        var status = this.getEvaluatorStatuses()[plugin];

        if (!fromUrl && !_.includes(['active', 'known'], status)) return;
        // for now, if the plugin isn't from a URL or active or known
        // (namely loading) return.
        // TODO: other states we should support: failed and exiting.

        if (status === 'active') {
          // turn off evaluator if on
          if (!bkSessionManager.evaluatorUnused(plugin)) {
            return $scope.evalTabOp.showWarning = true;
          }

          bkSessionManager.removeEvaluator(plugin);
          bkCoreManager.getBkApp().removeEvaluator(plugin);
        } else {
          // otherwise, turn on evaluator
          if (fromUrl) {
            var r = new RegExp('^(?:[a-z]+:)?//', 'i');
            if (r.test(plugin) && !$scope.evalTabOp.forceLoad) {
              return $scope.evalTabOp.showSecurityWarning = true;
            }

            $scope.evalTabOp.forceLoad = false;
            $scope.evalTabOp.newPluginNameOrUrl = "";
          }
          $scope.evalTabOp.activateThisTab = plugin;
          bkCoreManager.getBkApp().addEvaluatorToNotebook(plugin);
        }
      }
    };

    $scope.$watchCollection('evalTabOp.getEvaluatorsWithSpec()', $scope.evalTabOp.initTabs);

    $scope.menuTabOp = {
      newMenuPluginUrl: "./plugin/menu/debug.js",
      addMenuPlugin: function () {
        bkMenuPluginManager.loadMenuPlugin(this.newMenuPluginUrl);
      },
      getMenuPlugins: function () {
        return bkMenuPluginManager.getMenuPlugins();
      },
      getLoadingPlugins: function() {
        return bkMenuPluginManager.getLoadingPlugins();
      }
    };

    $scope.navigationGrid = [];
    $scope.onInit = function () {
      setTimeout(function () { //wait for the DOM elements to appear
        $scope.navigationElements = $('.navigate-btn');
        $scope.navigationElements.each(function (index, el) {
          var currentRow = _.last($scope.navigationGrid);
          if (!currentRow) {
            currentRow = [];
            $scope.navigationGrid.push(currentRow);
          } else {
            var prevElement = $(_.last(currentRow));
            if ($(el).position().top > prevElement.position().top) {
              currentRow = [];
              $scope.navigationGrid.push(currentRow);
            }
          }
          currentRow.push(el);
        });
      }, 0);
    };

    var getNavigationIndex = function (el) {
      var index = [];
      _.forEach($scope.navigationGrid, function (row, i) {
        _.forEach(row, function (item, j) {
          if (item == el) {
            index.push(i);
            index.push(j);
          }
        });
      });
      return index;
    };

    var getElementAtPosition = function (i, j) {
      if (i < 0) {
        i = $scope.navigationGrid.length - 1;
      }
      if (i >= $scope.navigationGrid.length) {
        i = 0;
      }
      var row = $scope.navigationGrid[i];
      if (j < 0) {
        j = row.length - 1;
      }
      if (j >= row.length) {
        row = $scope.navigationGrid[0];
      }
      return row[j];
    };

    var KEY_CODES = {
      ARROW_LEFT:  37,
      ARROW_UP:    38,
      ARROW_RIGHT: 39,
      ARROW_DOWN:  40
    };
    $scope.navigate = function (event) {
      var curElement = event.target;
      switch (event.keyCode) {
        case KEY_CODES.ARROW_LEFT:
          var index = $scope.navigationElements.index(curElement);
          $scope.navigationElements.get(index - 1).focus();
          event.preventDefault();
          break;
        case KEY_CODES.ARROW_UP:
          var index = getNavigationIndex(curElement);
          getElementAtPosition(index[0] - 1, index[1]).focus();
          event.preventDefault();
          break;
        case KEY_CODES.ARROW_RIGHT:
          var index = $scope.navigationElements.index(curElement);
          if (index >= $scope.navigationElements.length - 1) { index = -1; }
          $scope.navigationElements.get(index + 1).focus();
          event.preventDefault();
          break;
        case KEY_CODES.ARROW_DOWN:
          var index = getNavigationIndex(curElement);
          getElementAtPosition(index[0] + 1, index[1]).focus();
          event.preventDefault();
          break;
      }
    };

    $(document.body).on('keydown.plugin-manager', function (event) {
      if (_.values(KEY_CODES).indexOf(event.keyCode) > -1 && $('.plugin-manager').find(':focus').length === 0) {
        $scope.navigationElements.get(0).focus();
        event.preventDefault();
      }
    });

    $scope.$on('$destroy', function () {
      $(document.body).off('keydown.plugin-manager');
      delete $scope.navigationGrid;
      delete $scope.navigationElements;
    });

    $rootScope.$on(GLOBALS.EVENTS.LANGUAGE_MANAGER_SHOW_SPINNER, function(event, data) {
      $scope.showSpinner = true;
      $scope.showMessage = true;
      $scope.loadingMessage = 'Starting ' + data.pluginName + '...';
    });

    $rootScope.$on(GLOBALS.EVENTS.LANGUAGE_MANAGER_HIDE_SPINNER, function(event, data) {
      if (data.error) {
        $scope.loadingMessage += ' failed';
      } else {
        $scope.loadingMessage += ' done';
      }
      $scope.showSpinner = false;
      bkUtils.timeout(function() {
        $scope.showMessage = false;
      }, 3000);
    });

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
 * This is the module for the UI that shows the list of evaluators and their corresponding
 * settings panel.
 */

(function() {
  'use strict';

  var module = angular.module('bk.core');

  module.directive('bkPluginManagerEvaluatorSettings', function(
      $compile, bkSessionManager, GLOBALS, bkUtils, $timeout) {
    return {
      restrict: 'E',
      template: JST["mainapp/components/pluginmanager/pluginmanager_evaluator_settings"](),
      controller: function($scope) {

        var cdnJsError = (function() {
          var timer = $timeout(function() {}, 0);
          return function() {
            $scope.cdnJsErrorOccured = true;
            $timeout.cancel(timer);
            timer = $timeout(function() {
              $scope.cdnJsErrorOccured = false;
            }, 5000);
          }
        })();

        $scope.savedSettings = angular.copy($scope.evaluator.settings);
        $scope.highlight = false;

        $scope.$on(GLOBALS.EVENTS.DISCARD_LANGUAGE_SETTINGS, function(event, data) {
          $scope.evaluator.settings = $scope.savedSettings;
        });

        $scope.$on(GLOBALS.EVENTS.HIGHLIGHT_EDITED_LANGUAGE_SETTINGS, function(event, data) {
          $scope.highlight = true;
        });

        $scope.searchingRemote = false;

        $scope.searchRemote = function(url, scopeProperty, searchInput) {
          if (searchInput && searchInput.length > 0) {
            $scope.searchingRemote = true;
            bkUtils.httpGetCached(url).then(function(response) {
              var jsLibraries = _.filter(response.data.results, function(e) {
                return _.endsWith(e.latest, 'js');
              });
              $scope[scopeProperty] = _.take(jsLibraries, 20);
              $scope.searchingRemote = false;
            }).catch(function(e) {
              $scope.searchingRemote = false;
              cdnJsError();
            });
          } else {
            $scope[scopeProperty] = [];
          }
        };

        $scope.showLibraryPreview = function(library, prop) {
          // console.log("PREVIEW", library, prop, $scope);
        };

        $scope.set = function(property) {
          if (property.action) {
            $scope.evaluator.perform(property.key);
          }
          bkSessionManager.setNotebookModelEdited(true);
          property.edited = false;
          var noMoreUnsavedProperties = true;
          for (var i = 0; i < $scope.properties.length; i++) {
            if ($scope.properties[i].edited) {
              noMoreUnsavedProperties = false;
              break;
            }
          }
          if (noMoreUnsavedProperties) {
            $scope.$emit(GLOBALS.EVENTS.SET_LANGUAGE_SETTINGS_EDITED, {
              edited: false,
              editedEvalutor: $scope.evaluatorName
            });
          }
          $scope.savedSettings[property.key] = $scope.evaluator.settings[property.key];
          bkHelper.updateLanguageManagerSettingsInBeakerObject( $scope.evaluatorName,
                                                                property.key,
                                                                $scope.evaluator.settings[property.key])
        };

        $scope.perform = function (action) {
          action.running = true;
          var promise;
          try {
            promise = $scope.evaluator.perform(action.key);
          } catch (e) {
            console.error(e);
          }
          if(promise) {
            promise.finally(function () {
              action.running = false;
            });
          } else {
            action.running = false;
          }
        };
      },
      link: function(scope, element, attrs) {
        scope.availableProperties = GLOBALS.EVALUATOR_SPEC.PROPERTIES;

        var spec = _.map(scope.evaluator.spec, function(value, key) {
          return _.extend({ name: key, key: key }, value);
        });

        scope.properties = _.filter(spec, function(option) {
          return _(GLOBALS.EVALUATOR_SPEC.PROPERTIES)
            .values()
            .contains(option.type);
        });

        var getEditedListener = function (property) {
          return function (newValue, oldValue) {
            if (newValue !== oldValue) {
              property.edited = scope.evaluator.settings[property.key]
                  !== scope.savedSettings[property.key];
              scope.$emit(GLOBALS.EVENTS.SET_LANGUAGE_SETTINGS_EDITED, {
                edited: property.edited,
                editedEvalutor: scope.evaluatorName
              });
            }
          };
        };

        for (var i = 0; i < scope.properties.length; i++) {
          scope.properties[i].edited = false;
          if (!scope.savedSettings[scope.properties[i].key]) {
            scope.savedSettings[scope.properties[i].key] = "";
          }
          scope.$watch('evaluator.settings[\'' + scope.properties[i].key + '\']', getEditedListener(scope.properties[i]));
        }

        scope.actions = _.filter(spec, function(option) {
          return option.type === "action";
        });
      }
    };
  });

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

(function() {
  'use strict';

  var module = angular.module('bk.core');

  module.controller('publicationCtrl',
    ['$scope', 'bkHelper', 'bkPublicationApi', 'bkPublicationAuth', 'bkSessionManager', '$uibModalInstance', '$location', '$window', 'nModel',
    function($scope, bkHelper, bkPublicationApi, bkPublicationAuth, bkSessionManager, $uibModalInstance, $location, $window, nModel) {

      var notebook = nModel || bkSessionManager.getRawNotebookModel();

      $scope.user = {role: 'beaker'};
      $scope.model = {};
      $scope.baseUrl = bkPublicationApi.getBaseUrl();
      $scope.initializing = true;

      $scope.signIn = function() {
        $scope.saving = true;
        return bkPublicationAuth.signIn($scope.user)
        .then(function() {
          initPublication();
          delete $scope.user.password;
        })
        .catch(function(err) {
          $scope.error = 'Error: Invalid email or password';
        })
        .finally(function() {
          $scope.saving = false;
        });
      };

      $scope.signOut = function() {
        bkPublicationAuth.signOut();
      };

      $scope.isSignedIn = function() {
        return bkPublicationAuth.isSignedIn();
      };

      $scope.currentUser = function() {
        return bkPublicationAuth.currentUser();
      };


      function getNotebookCell(type){
        return _.find(notebook.cells, function(cell) {
          return cell.type === type;
        });
      }

      function defaultName() {
        var note = getNotebookCell('section');

        if(!note || !note.title){
          note = getNotebookCell('markdown');
          if(note && !note.title){
            note.title = note.body.substring(0, Math.min(30, note.body.length));
          }
        }

        if(!note || !note.title){
          note = getNotebookCell('code');
          if(note && !note.title){
            note.title = note.input.body.substring(0, Math.min(30, note.input.body.length));
          }
        }

        return note && note.title;
      }

      function initNodes(categories) {
        var nodes = {};
        _.each(categories, function(category) {
          nodes[category['public-id']] = _.extend(category, {
            count: +category.count,
            children: []
          });
        });

        return nodes;
      }

      function generateTree(categories) {
        var nodes = initNodes(categories);
        var rootNodes = [];

        _.each(categories, function(category) {
          var parentNode;
          if (category.parent) {
            parentNode = nodes[category.parent['public-id']];
          }
          var node = nodes[category['public-id']];
          if (parentNode) {
            node.parent = parentNode;
            parentNode.children.unshift(node);
          } else {
            rootNodes.unshift(node);
          }
        });

        return rootNodes;
      }

      function flattenCategories(categories, prefix) {
        if (!prefix) { prefix = ' '; }

        return _.reduce(_.sortBy(categories, 'order'), function(newCategories, category) {
          var toBeAdded = [];

          if (category.children.length) {
            Array.prototype.push.apply(toBeAdded, flattenCategories(category.children, '-' + prefix));
          }

          category.name = prefix + category.name;

          toBeAdded.unshift(category);

          return Array.prototype.concat.apply(newCategories, toBeAdded);
        }, []);
      }

      function initPublication() {
        bkPublicationApi.getCategories()
        .then(function(resp) {
          var tree = generateTree(resp.data)
          $scope.categories = flattenCategories(tree);
        });

        $scope.model.name = defaultName();
        $scope.published = false;
        $scope.title = 'Publish Notebook';
        $scope.saveButton = 'Publish';

        if (wasPublished()) {
          bkPublicationApi.getPublication(notebook.metadata['publication-id'])
          .then(function(resp) {
            var pub = resp.data;
            if (bkPublicationAuth.currentUser()['public-id'] == pub['author-id']) {
              $scope.model = pub;
              $scope.model['category-id'] = pub.category && pub.category['public-id'];
              $scope.attachmentUrl = $scope.model['attachment-id'] &&
                bkPublicationApi.getAttachmentUrl($scope.model['attachment-id']);
              $scope.published = true;
              $scope.title = 'Update Notebook';
              $scope.saveButton = 'Update';
            }
          });
        }
      }

      function wasPublished() {
        return notebook.metadata && notebook.metadata['publication-id'];
      }

      function setModelContents() {
        bkHelper.updateCellsFromDOM(notebook.cells);
        $scope.model.contents = bkHelper.sanitizeNotebookModel(notebook);
      }

      function getPublicationModel() {
        var pubModel = _.clone($scope.model);
        if (_.isEmpty(pubModel.name)) {
          pubModel.name = ' '; //to avoid error on pub server
        }
        return pubModel;
      }

      function createPublication() {
        setModelContents();
        return bkPublicationApi.createPublication(getPublicationModel())
        .then(function(resp) {
          // save publication id as notebook metadata - only for entire notebook publication
          if (_.isUndefined(nModel)) {
            bkSessionManager.getRawNotebookModel().metadata = {'publication-id': resp.data['public-id']};
          }
          return resp.data['public-id'];
        });
      }

      function updatePublication() {
        setModelContents();
        return bkPublicationApi.updatePublication(notebook.metadata['publication-id'], getPublicationModel())
        .then(function() {
          return notebook.metadata['publication-id'];
        });
      }

      $scope.publishAction = function() {
        var action = $scope.published ? "update" : "create";
        return $scope.publish(action);
      };

      $scope.publish = function(action, skipAttachmentDeletion) {
        var tab = $window.open(bkPublicationApi.getBaseUrl() + '/#/publication_loading');
        var publicId;
        $scope.saving = true;
        (action == "update" ? updatePublication : createPublication)()
        .then(function(publicationId) {
          $scope.saving = false;
          publicId = publicationId;
          tab.location = bkPublicationApi.getBaseUrl() + '/publications/' + publicationId;
        })
        .then(function() {
          if ($scope.deletedAttachment && !skipAttachmentDeletion) {
            return bkPublicationApi.deleteAttachment($scope.deletedAttachment);
          }
        })
        .then(function() {
          delete $scope.deletedAttachment;
          $scope.close(!_.isUndefined(nModel) && publicId);
        });
      };

      $scope.delete = function() {
        $scope.saving = true;
        return bkPublicationApi.deletePublication(notebook.metadata['publication-id'])
        .then(function() {
          delete bkSessionManager.getRawNotebookModel().metadata['publication-id'];
          delete $scope.model;
          delete $scope.attachmentUrl;
          $scope.saving = false;
          $scope.close();
        });
      }

      bkPublicationAuth.initSession()
      .then(function() {
        if ($scope.isSignedIn()) {
          initPublication();
        }
      })
      .finally(function() {
        $scope.initializing = false;
      });

      $scope.close = function(publicationId) {
        $uibModalInstance.close(publicationId || 'done');
      };

      $scope.signupUrl = function() {
        return $scope.baseUrl + '/sign_up?redirect=' + encodeURIComponent($location.absUrl());
      };

      $scope.removeAttachment = function() {
        $scope.deletedAttachment = $scope.model['attachment-id'];
        $scope.model['attachment-id'] = -1;
        delete $scope.attachmentUrl;
      };

      $scope.uploadAttachment = function(file) {
        $scope.file = file;

        if (file && !file.$error) {
          file.upload = bkPublicationApi.uploadAttachment(file);
          file.upload = file.upload.progress(function(evt) {
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
          });
          file.upload.then(function(resp) {
            if ($scope.attachmentUrl) {
              bkPublicationApi.deleteAttachment($scope.model['attachment-id']);
            }
            var attachment = resp.data;
            delete $scope.attachmentErrors;
            $scope.model['attachment-id'] = attachment['public-id'];
            $scope.attachmentUrl = bkPublicationApi.getAttachmentUrl(attachment['public-id']);
            delete file.progress;
          }, function(resp) {
            var err = resp.data;
            $scope.attachmentErrors = _.chain(err).values().flatten().value().join(', ');
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
 * bkCell
 * - the controller that responsible for directly changing the view
 * - the container for specific typed cell
 * - the directive is designed to be capable of used in a nested way
 * - conceptually, a cell is 'cell model' + 'view model'(an example of what goes in to the view
 * model is code cell bg color)
 * - A bkCell is generically corresponds to a portion of the notebook model (currently, it is
 * always a branch in the hierarchy)
 * - When exporting (a.k.a. sharing), we will need both the cell model and the view model
 */

(function() {
  'use strict';
  var module = angular.module('bk.core');

  module.controller('CodeCellOptionsController', ['$scope', '$uibModalInstance', 'dscope', 'bkCoreManager', function($scope, $uibModalInstance, dscope, bkCoreManager) {
    $scope.dscope = dscope;
    $scope.initializationCell = dscope.initialization;
    $scope.cellName = dscope.id;
    $scope.cellTags = dscope.tags;
    $scope.isInitCell = function() {
      return this.initializationCell;
    };
    $scope.toggleInitCell = function() {
      this.initializationCell = !this.initializationCell;
    };
    $scope.saveDisabled = function() {
      return !(( this.getNameError() === '' ) && ( this.getTagError() === '' ));
    };
    $scope.isError = function() {
      return !!$scope.getNameError() || !!$scope.getTagError();
    };
    $scope.getNameError = function() {
      if(this.dscope.id === this.cellName)
        return '';
      return bkCoreManager.getNotebookCellManager().canRenameCell(this.cellName);
    };
    $scope.getTagError = function() {
      return bkCoreManager.getNotebookCellManager().canSetUserTags(this.cellTags);
    };
    $scope.close = function() {
      $uibModalInstance.close('close');
    };
    $scope.save = function() {
      if (this.saveDisabled())
        return;
      var reb = false;
      this.dscope.initialization = this.initializationCell;
      if (this.dscope.tags !== this.cellTags) {
        this.dscope.tags = this.cellTags;
        reb = true;
      }
      if (this.dscope.id !== this.cellName)
        bkCoreManager.getNotebookCellManager().renameCell(this.dscope.id,this.cellName);
      else if(reb)
        bkCoreManager.getNotebookCellManager().rebuildMaps()
      $uibModalInstance.close('save');
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
(function() {
  'use strict';
  var module = angular.module('bk.core');

  module.controller('BkoRenameController', ['$scope', '$uibModalInstance', 'dscope', 'bkHelper', function($scope, $uibModalInstance, dscope, bkHelper) {
    $scope.dscope = dscope;
    $scope.propertyName = undefined;

    var idx = dscope.getPropertyId();
    var model = dscope.model;
    var oldPropertyName = model && model.getCellModel().labels[idx];

    $scope.close = function() {
      $uibModalInstance.close('close');
    };
    $scope.save = function() {
      var beakerObj = bkHelper.getBeakerObject();
      var beaker = beakerObj.beakerObj;

      if (beaker && $scope.propertyName !== oldPropertyName) {
        var value = beaker[oldPropertyName];
        beaker[$scope.propertyName] = value;
        beakerObj.beakerObjectToNotebook();

        delete beaker[oldPropertyName];
        beakerObj.beakerObjectToNotebook();

        if ($scope.dscope && typeof $scope.dscope.evaluate == 'function') {
          $scope.dscope.evaluate();
        }
      }

      $uibModalInstance.close('save');
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
  var module = angular.module('bk.core');

  module.directive('focus',
    function ($timeout) {
      return {
        scope: {
          trigger: '@focus'
        },
        link: function (scope, element) {
          scope.$watch('trigger', function (value) {
            if (value === "true") {
              $timeout(function () {
                element[0].focus();
              });
            }
          });
        }
      };
    })
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
  var module = angular.module('bk.plotapi', []);
  module.factory('bkPlotApi', [
    'bkUtils',
    function (bkUtils) {

      var getValue = function (obj, value, defaultValue) {
        return obj.hasOwnProperty(value) ? obj[value] : defaultValue;
      };

      var inheritsFrom = function (child, parent) {
        child.prototype = Object.create(parent.prototype);
      };

      var getColor = function (color) {
        if(color instanceof Array) {
          var values = [];
          for(var i = 0; i < color.length; i++){
            values.push(getColor(color[i]));
          }
          return values;
        } else if (color instanceof Color){
          return color.value;
        }
        return color;
      };

      var padYs = function (graphics, graphicsWithMaxElements) {
        var currentSize = graphics.y.length;
        var maxSize = graphicsWithMaxElements.y.length;
        var diff = maxSize - currentSize;
        if (diff > 0) {
          var lastY = graphics.y[currentSize - 1];
          graphics.y = graphics.y.concat(_.range(lastY, lastY + diff, 0));
          graphics.x = graphics.x.concat(graphicsWithMaxElements.x.slice(currentSize, maxSize + 1));
        }
      };

      //utils//
      var StrokeType = function () { };
      StrokeType.NONE = 'NONE';
      StrokeType.SOLID = 'SOLID';
      StrokeType.DASH = 'DASH';
      StrokeType.DOT = 'DOT';
      StrokeType.DASHDOT = 'DASHDOT';
      StrokeType.LONGDASH = 'LONGDASH';

      var ShapeType = function () { };
      ShapeType.SQUARE = 'SQUARE';
      ShapeType.CIRCLE = 'CIRCLE';
      ShapeType.TRIANGLE = 'TRIANGLE';
      ShapeType.DIAMOND = 'DIAMOND';
      ShapeType.DCROSS = 'DCROSS';
      ShapeType.DOWNTRIANGLE = 'DOWNTRIANGLE';
      ShapeType.CROSS = 'CROSS';
      ShapeType.DEFAULT = 'DEFAULT';
      ShapeType.LEVEL = 'LEVEL';
      ShapeType.VLEVEL = 'VLEVEL';
      ShapeType.LINECROSS = 'LINECROSS';

      var LegendPosition = function(data){
        if (data instanceof Array && data.length > 1) {
          this.x = data[0];
          this.y = data[0];
        } else {
          this.position = data;
        }
      };
      LegendPosition.TOP = new LegendPosition('TOP');
      LegendPosition.LEFT = new LegendPosition('LEFT');
      LegendPosition.BOTTOM = new LegendPosition('BOTTOM');
      LegendPosition.RIGHT = new LegendPosition('RIGHT');
      LegendPosition.TOP_LEFT = new LegendPosition('TOP_LEFT');
      LegendPosition.TOP_RIGHT = new LegendPosition('TOP_RIGHT');
      LegendPosition.BOTTOM_LEFT = new LegendPosition('BOTTOM_LEFT');
      LegendPosition.BOTTOM_RIGHT = new LegendPosition('BOTTOM_RIGHT');

      var LegendLayout = function () { };
      LegendLayout.HORIZONTAL = 'HORIZONTAL';
      LegendLayout.VERTICAL = 'VERTICAL';

      var Filter = function (text) {
        this.text = text;
      };
      Filter.AREA = new Filter('area');
      Filter.LINE = new Filter('line');
      Filter.BAR = new Filter('bar');
      Filter.BOX = new Filter('box');
      Filter.POINT = new Filter('point');
      Filter.STEAM = new Filter('stem');
      Filter.STEAM_PLUS = new Filter('stem+');
      Filter.RIVER = new Filter('river');

      var Color = function (r, g, b, a) {
        this.value = bkUtils.rgbaToHex(r, g, b, a);
      };
      Color.white = new Color(255, 255, 255);
      Color.WHITE = Color.white;
      Color.lightGray = new Color(192, 192, 192);
      Color.LIGHT_GRAY = Color.lightGray;
      Color.gray = new Color(128, 128, 128);
      Color.GRAY = Color.gray;
      Color.darkGray = new Color(64, 64, 64);
      Color.DARK_GRAY = Color.darkGray;
      Color.black = new Color(0, 0, 0);
      Color.BLACK = Color.black;
      Color.red = new Color(255, 0, 0);
      Color.RED = Color.red;
      Color.pink = new Color(255, 175, 175);
      Color.PINK = Color.pink;
      Color.orange = new Color(255, 200, 0);
      Color.ORANGE = Color.orange;
      Color.yellow = new Color(255, 255, 0);
      Color.YELLOW = Color.yellow;
      Color.green = new Color(0, 255, 0);
      Color.GREEN = Color.green;
      Color.magenta = new Color(255, 0, 255);
      Color.MAGENTA = Color.magenta;
      Color.cyan = new Color(0, 255, 255);
      Color.CYAN = Color.cyan;
      Color.blue = new Color(0, 0, 255);
      Color.BLUE = Color.blue;

      //utils//

      var YAxis = function(data) {
        if (!data) { data = {}; }
        _.extend(this, {
          "type": 'YAxis',
          "label": data.label || "",
          "auto_range": data.autoRange,
          "auto_range_includes_zero": data.autoRangeIncludesZero,
          "lower_margin": getValue(data, 'lowerMargin', 0),
          "upper_margin": getValue(data, 'upperMargin', 0),
          "lower_bound": data.lowerBound,
          "upper_bound": data.upperBound,
          "use_log": data.log,
          "log_base": data.logBase
        });
      };

      //Plot items//
      var Graphics = function (data) {
        if (!data) { data = {}; }
        _.extend(this, {
          "visible": getValue(data, 'visible', true),
          "yAxis": data.yAxis
        });
      };

      var ConstantLine = function (data) {
        if (!data) { data = {}; }
        Graphics.call(this, data);
        _.extend(this, {
          "type": "ConstantLine",
          "x" : data.x,
          "y": data.y,
          "showLabel": data.showLabel,
          "width" : getValue(data, 'width', 1.5),
          "style": data.style,
          "color": getColor(data.color)
        });
      };
      inheritsFrom(ConstantLine, Graphics);
      //add prototype methods here

      var ConstantBand = function (data) {
        if (!data) { data = {}; }
        Graphics.call(this, data);
        _.extend(this, {
          "type": "ConstantBand",
          "x" : data.x,
          "y": data.y,
          "color": getColor(getValue(data, 'color', new Color(0, 127, 255, 127)))
        });
      };
      inheritsFrom(ConstantBand, Graphics);
      //add prototype methods here

      var XYGraphics = function (data) {
        if (!data) { data = {}; }
        Graphics.call(this, data);
        if (!_.isEmpty(data.x) && data.x[0] instanceof Date) {
          for (var i = 0; i < data.x.length; i++) {
            data.x[i] = data.x[i].getTime();
          }
        }
        _.extend(this, {
          "x" : getValue(data, 'x', data.y ? _.range(data.y.length) : []),
          "y": data.y,
          "display_name": data.displayName,
          "lod_filter" : data.lodFilter,
          "tooltips": data.toolTips
          //TODO add actions
        });
      };
      inheritsFrom(XYGraphics, Graphics);
      //add prototype methods here

      var Line = function (data) {
        if (!data) { data = {}; }
        XYGraphics.call(this, data);
        _.extend(this, {
          "type": "Line",
          "color": getColor(data.color),
          "width": getValue(data, 'width', 1.5),
          "style": data.style,
          "interpolation": data.interpolation
        });
      };
      inheritsFrom(Line, XYGraphics);
      //add prototype methods here

      var BasedXYGraphics = function (data) {
        if (!data) { data = {}; }
        XYGraphics.call(this, data);
        if (data.base instanceof Array) {
          this.bases = data.base;
        } else {
          this.base = getValue(data, 'base', 0);
        }
      };
      inheritsFrom(BasedXYGraphics, XYGraphics);
      //add prototype methods here

      var Bars = function (data) {
        if (!data) { data = {}; }
        BasedXYGraphics.call(this, data);
        _.extend(this, {
          "type": "Bars"
        });
        if (data.width instanceof Array) {
          this.widths = data.width;
        } else {
          this.width = data.width;
        }
        if (data.color instanceof Array) {
          this.colors = getColor(data.color);
        } else {
          this.color = getColor(data.color);
        }
        if (data.outlineColor instanceof Array) {
          this.outline_colors = getColor(data.outlineColor);
        } else {
          this.outline_color = getColor(data.outlineColor);
        }
      };
      inheritsFrom(Bars, BasedXYGraphics);
      //add prototype methods here

      var Points = function (data) {
        if (!data) { data = {}; }
        XYGraphics.call(this, data);
        _.extend(this, {
          "type": "Points"
        });
        if (data.size instanceof Array) {
          this.sizes = data.size;
        } else {
          this.size = getValue(data, 'size', 6.0);
        }
        if (data.shape instanceof Array) {
          this.shapes = data.shape;
        } else {
          this.shape = getValue(data, 'shape', ShapeType.DEFAULT);
        }
        if (data.fill instanceof Array) {
          this.fills = data.fill;
        } else {
          this.fill = data.fill;
        }
        if (data.color instanceof Array) {
          this.colors = getColor(data.color);
        } else {
          this.color = getColor(data.color);
        }
        if (data.outlineColor instanceof Array) {
          this.outline_colors = getColor(data.outlineColor);
        } else {
          this.outline_color = getColor(data.outlineColor);
        }
      };
      inheritsFrom(Points, XYGraphics);
      //add prototype methods here

      var Stems = function (data) {
        if (!data) { data = {}; }
        BasedXYGraphics.call(this, data);
        _.extend(this, {
          "type": "Stems",
          "width": getValue(data, 'width', 1.5)
        });
        if (data.color instanceof Array) {
          this.colors = getColor(data.color);
        } else {
          this.color = getColor(data.color);
        }
        if (data.style instanceof Array) {
          this.styles = data.style;
        } else {
          this.style = getValue(data, 'style', StrokeType.SOLID);
        }
      };
      inheritsFrom(Stems, BasedXYGraphics);
      //add prototype methods here

      var Area = function (data) {
        if (!data) { data = {}; }
        BasedXYGraphics.call(this, data);
        _.extend(this, {
          "type": "Area",
          "color": getColor(data.color),
          "interpolation": data.interpolation
        });
      };
      inheritsFrom(Area, BasedXYGraphics);
      //add prototype methods here

      var Text = function (data) {
        if (!data) { data = {}; }
        _.extend(this, {
          "type": 'Text',
          "x": getValue(data, 'x', 0),
          "y": getValue(data, 'y', 0),
          "show_pointer": getValue(data, 'showPointer', true),
          "text": getValue(data, 'text', ''),
          "pointer_angle": getValue(data, 'pointerAngle', (-0.25) * Math.PI),
          "color": getColor(data.color),
          "size": getValue(data, 'size', 13)
        });
      };

      var XYStacker = function () {};
      XYStacker.stack = function (graphicsList) {
        if(_.isEmpty(graphicsList) || graphicsList.length === 1) { return graphicsList; }

        var graphicsWithMaxElements = _.max(graphicsList, function (obj) {
          return obj.y.length;
        });

        padYs(graphicsList[0], graphicsWithMaxElements);
        var stackedList = [graphicsList[0]];
        for (var gIndex = 1; gIndex < graphicsList.length; gIndex++) {
          var current = graphicsList[gIndex];
          padYs(current, graphicsWithMaxElements);
          var previous = graphicsList[gIndex - 1];
          var currentYs = current.y;
          var previousYs = previous.y;

          for (var yIndex = 0; yIndex < currentYs.length; yIndex++) {
            currentYs[yIndex] = currentYs[yIndex] + previousYs[yIndex];
          }
          current.bases = previousYs;
          stackedList.push(current);
        }
        return stackedList;
      };

      var Crosshair = function (data) {
        if (!data) { data = {}; }
        XYGraphics.call(this, data);
        _.extend(this, {
          "type": "Crosshair",
          "color": getColor(data.color),
          "style": data.style,
          "width": data.width
        });
      };
      inheritsFrom(Crosshair, BasedXYGraphics);
      //add prototype methods here

      //Plot items//

      //Plots//
      var Chart = function (data) {
        if (!data) { data = {}; }
        _.extend(this, {
          "init_width": getValue(data, 'initWidth', 640),
          "init_height": getValue(data, 'initHeight', 480),
          "chart_title": data.title,
          "show_legend": data.showLegend,
          "use_tool_tip": getValue(data, 'useToolTip', true),
          "legend_position": getValue(data, 'legendPosition', LegendPosition.TOP_RIGHT),
          "legend_layout": getValue(data, 'legendLayout', LegendLayout.VERTICAL)
        });
        this.version = 'groovy';
      };

      var AbstractChart = function (data) {
        if (!data) { data = {}; }
        Chart.call(this, data);
        var yAxis = new YAxis({
          autoRange: data.yAutoRange,
          autoRangeIncludesZero: data.yAutoRangeIncludesZero,
          lowerMargin: data.yLowerMargin,
          upperMargin: data.yUpperMargin,
          lowerBound: data.yLowerBound,
          upperBound: data.yUpperBound,
          log: data.yLog,
          logBase: data.yLogBase
        });
        _.extend(this, {
          "domain_axis_label": data.xLabel,
          "y_label": data.yLabel,
          "rangeAxes": data.yAxes || [yAxis],
          "x_lower_margin": getValue(data, 'xLowerMargin', 0.05),
          "x_upper_margin": getValue(data, 'xUpperMargin', 0.05),
          "y_auto_range": yAxis.auto_range,
          "y_auto_range_includes_zero": yAxis.auto_range_includes_zero,
          "y_lower_margin": yAxis.y_lower_margin,
          "y_upper_margin": yAxis.y_upper_margin,
          "y_lower_bound": yAxis.y_lower_bound,
          "y_upper_bound": yAxis.y_upper_bound,
          "log_y": data.logY,
          "timezone": data.timeZone,
          "crosshair": data.crosshair,
          "omit_checkboxes": data.omitCheckboxes || false,
        });
      };
      inheritsFrom(AbstractChart, Chart);
      //add prototype methods here
      AbstractChart.prototype.add = function (item) {
        if (item instanceof YAxis) {
          this.rangeAxes.push(item);
        }
        return this;
      };


      //XYPlots
      var XYChart = function(data){
        if (!data) { data = {}; }
        AbstractChart.call(this, data);
        _.extend(this, {
          "graphics_list": data.graphics || [],
          "constant_lines": data.constantLines || [],
          "constant_bands": data.constantBands || [],
          "texts": data.texts || [],
          "x_auto_range": getValue(data, 'xAutoRange', true),
          "x_lower_bound": getValue(data, 'xLowerBound', 0),
          "x_upper_bound": getValue(data, 'xUpperBound', 0),
          "log_x": getValue(data, 'logX', false),
          "x_log_base": getValue(data, 'xLogBase', 10),
          "lodThreshold": data.lodThreshold
        });
      };
      inheritsFrom(XYChart, AbstractChart);
      //add prototype methods here
      var abstractChartAdd = AbstractChart.prototype.add;
      XYChart.prototype.add = function (item) {
        if (item instanceof XYGraphics) {
          this.graphics_list.push(item);
        } else if (item instanceof Text) {
          this.texts.push(item);
        } else if (item instanceof ConstantLine) {
          this.constant_lines.push(item);
        } else if (item instanceof ConstantBand) {
          this.constant_bands.push(item);
        } else if (item instanceof Array) {
          for (var i = 0; i < item.length; i++) {
            this.add(item[i]);
          }
        } else {
          abstractChartAdd.call(this, item);
        }
        return this;
      };

      var Plot = function (data) {
        if (!data) { data = {}; }
        XYChart.call(this, data);
        this.type = 'Plot';
      };
      inheritsFrom(Plot, XYChart);
      //add prototype methods here

      var TimePlot = function (data) {
        if (!data) { data = {}; }
        XYChart.call(this, data);
        this.type = 'TimePlot';
      };
      inheritsFrom(TimePlot, Plot);
      //add prototype methods here

      var NanoPlot = function (data) {
        if (!data) { data = {}; }
        TimePlot.call(this, data);
        this.type = 'NanoPlot';
      };
      inheritsFrom(NanoPlot, TimePlot);
      //add prototype methods here

      var SimpleTimePlot = function (tableData, columnNames, params) {
        var data = {
          "use_tool_tip": true,
          "show_legend": true,
          "domain_axis_label": 'Time'
        };
        if (params) {
          _.extend(data, params);
        }
        TimePlot.call(this, data);

        function getColumnsWithoutData(dataColumnsNames) {
          var columnsCopy = _.clone(columnNames);
          return _.filter(columnsCopy, function (o) {
            return dataColumnsNames.indexOf(o) < 0;
          });
        }

        function getChartColors() {
          var chartColors = [];
          if (colors != null) {
            for (var i = 0; i < columnNames.length; i++) {
              if (i < colors.length) {
                chartColors.push(createChartColor(colors[i]));
              }
            }
          }
          return chartColors;
        }

        function createChartColor(color) {
          if (color instanceof Array) {
            try {
              return new Color(color[0], color[1], color[2]);
            } catch (e) {
              throw new Error("Color list too short");
            }
          } else {
            return color;
          }
        }

        var colors = data.colors;
        var displayLines = getValue(data, 'displayLines', true);
        var displayPoints = getValue(data, 'displayPoints', false);
        var timeColumn = getValue(data, 'timeColumn', 'time');
        var displayNames = data.displayNames;

        var xs = [];
        var yss = [];
        var dataColumnsNames = [];
        if (tableData != null && columnNames != null) {
          for (var i = 0; i < tableData.length; i++) {
            var row = tableData[i];
            var x = row[timeColumn].getTime();
            xs.push(x);

            for (var j = 0; j < columnNames.length; j++) {
              var column = columnNames[j];

              if (j >= yss.length) {
                yss.push([]);
              }
              yss[j].push(row[column]);
            }
          }
          if (!_.isEmpty(tableData)) {
            dataColumnsNames = _.keys(tableData[0]).slice(0);
          }
          var columnsWithoutData = getColumnsWithoutData(dataColumnsNames);
          if (!_.isEmpty(columnsWithoutData)) {
            throw new Error("Chart data not found for columns");
          }

          var colors = getChartColors();

          for (var i = 0; i < yss.length; i++) {
            var ys = yss[i];

            if (displayLines) {
              var lineData = {x: xs, y: ys};

              if (displayNames != null && i < displayNames.length) {
                lineData.displayName = displayNames[i];
              } else {
                lineData.displayName = columnNames[i];
              }
              if (i < colors.length) {
                lineData.color = colors[i];
              }

              this.add(new Line(lineData));
            }

            if (displayPoints) {
              var pointData = {x: xs, y: ys};
              if (displayNames != null && i < displayNames.length) {
                pointData.displayName = displayNames[i];
              } else {
                pointData.displayName = columnNames[i];
              }
              if (i < colors.length) {
                pointData.color = colors[i];
              }

              this.add(new Points(pointData));
            }
          }

        }
      };
      inheritsFrom(SimpleTimePlot, TimePlot);
      //add prototype methods here

      var setPlotType = function(combinedPlot){
        if (combinedPlot && combinedPlot.plots && combinedPlot.plots.length > 0){
          combinedPlot.plot_type = combinedPlot.plots[0].type;
        }
      };

      var CombinedPlot = function (data){
        if (!data) { data = {}; }
        _.extend(this, {
          "type": 'CombinedPlot',
          "init_width": getValue(data, 'initWidth', 640),
          "init_height": getValue(data, 'initHeight', 480),
          "title": data.title,
          "x_label": data.xLabel,
          "plots": getValue(data, 'plots', []),
          "weights": getValue(data, 'weights', [])
        });
        this.version = 'groovy';
        setPlotType(this);
      };
      //add prototype methods here
      CombinedPlot.prototype.add = function (item, weight) {
        if (item instanceof XYChart) {
          this.plots.push(item);
          this.weights.push(weight || 1);
        } else if (item instanceof Array) {
          for (var i = 0; i < item.length; i++) {
            this.add(item[i], 1);
          }
        } else {
          throw new Error("CombinedPlot takes XYChart or List of XYChart");
        }
        setPlotType(this);
        return this;
      };

      //Plots//

      var api = {
        AbstractChart: AbstractChart,
        Plot: Plot,
        TimePlot: TimePlot,
        NanoPlot: NanoPlot,
        SimpleTimePlot: SimpleTimePlot,
        CombinedPlot: CombinedPlot,
        YAxis: YAxis,
        Graphics: Graphics,
        Line: Line,
        Bars: Bars,
        Points: Points,
        Stems: Stems,
        Area: Area,
        Text: Text,
        ConstantLine: ConstantLine,
        ConstantBand: ConstantBand,
        Crosshair: Crosshair,
        StrokeType: StrokeType,
        ShapeType: ShapeType,
        LegendLayout: LegendLayout,
        LegendPosition: LegendPosition,
        Filter: Filter,
        Color: Color,
        XYStacker: XYStacker
      };
      var list = function () {
        return api;
      };
      var instanceOfPlotApi = function (obj) {
        if (!obj) { return false; }
        var res = false;
        _.forOwn(api, function (value) {
          if (obj instanceof value) {
            res = true;
          }
        });
        return res;
      };
      return {
        list: list,
        instanceOfPlotApi: instanceOfPlotApi,
        inheritsFrom: inheritsFrom,
        getValue: getValue,
        getColor: getColor
      }
    }
  ]);
})();


/*
 *  Copyright 2016 TWO SIGMA OPEN SOURCE, LLC
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
  var module = angular.module('bk.categoryplotapi', [
    'bk.plotapi'
  ]);
  module.factory('bkCategoryPlotApi', [
    'bkUtils',
    'bkPlotApi',
    function (bkUtils,
              bkPlotApi) {

      var plotApi = bkPlotApi.list();
      var getValue = bkPlotApi.getValue;
      var inheritsFrom = bkPlotApi.inheritsFrom;
      var getColor = bkPlotApi.getColor;

      //utils//
      var PlotOrientationType = function () {};
      PlotOrientationType.VERTICAL = 'VERTICAL';
      PlotOrientationType.HORIZONTAL = 'HORIZONTAL';

      var LabelPositionType = function () {};
      LabelPositionType.VALUE_OUTSIDE = 'VALUE_OUTSIDE';
      LabelPositionType.VALUE_INSIDE = 'VALUE_INSIDE';
      LabelPositionType.CENTER = 'CENTER';
      LabelPositionType.BASE_OUTSIDE = 'BASE_OUTSIDE';
      LabelPositionType.BASE_INSIDE = 'BASE_INSIDE';

      var ShapeType = function () {};
      ShapeType.SQUARE = 'SQUARE',
        ShapeType.CIRCLE = 'CIRCLE',
        ShapeType.TRIANGLE = 'TRIANGLE',
        ShapeType.DIAMOND = 'DIAMOND',
        ShapeType.DCROSS = 'DCROSS',
        ShapeType.DOWNTRIANGLE = 'DOWNTRIANGLE',
        ShapeType.CROSS = 'CROSS',
        ShapeType.DEFAULT = 'DEFAULT',
        ShapeType.LEVEL = 'LEVEL',
        ShapeType.VLEVEL = 'VLEVEL',
        ShapeType.LINECROSS = 'LINECROSS';

      //CategoryPlot items//

      var CategoryGraphics = function (data) {
        if (!data) { data = {}; }
        plotApi.Graphics.call(this, data);
        _.extend(this, {
          "showItemLabel": getValue(data, 'showItemLabel', false),
          "center_series": getValue(data, 'centerSeries', false),
          "use_tool_tip": getValue(data, 'useToolTip', true)
        });
        if (data.seriesNames != null) {
          this.seriesNames = data.seriesNames;
        }
        if (!_.isEmpty(data.value)) {
          if (data.value[0] instanceof Array) {
            this.value = data.value;
          } else {
            this.value = [data.value];
          }
        }

        if (data.color instanceof Array) {
          this.colors = getColor(data.color);
        } else {
          this.color = getColor(data.color);
        }
        if (data.itemLabel != null) {
          this.itemLabels = data.itemLabel;
        }
      };
      inheritsFrom(CategoryGraphics, plotApi.Graphics);
      //add prototype methods here

      var CategoryLines = function (data) {
        if (!data) { data = {}; }
        CategoryGraphics.call(this, data);
        _.extend(this, {
          "type": "CategoryLines"
        });
        if (data.width != null) {
          this.width = getValue(data, 'width', 1.5);
        }
        if (data.style instanceof Array) {
          this.styles = data.style;
        } else {
          this.style = getValue(data, 'style', plotApi.StrokeType.SOLID);
        }
        if (data.interpolation != null) {
          this.interpolation = data.interpolation;
        }
      };
      inheritsFrom(CategoryLines, CategoryGraphics);
      //add prototype methods here

      var CategoryBars = function (data) {
        if (!data) { data = {}; }
        CategoryGraphics.call(this, data);
        _.extend(this, {
          "type": "CategoryBars",
          "labelPosition": getValue(data, 'labelPosition', LabelPositionType.CENTER)
        });
        if (data.base instanceof Array) {
          this.bases = data.base;
        } else {
          this.base = getValue(data, 'base', 0);
        }
        if (data.width instanceof Array) {
          this.widths = data.width;
        } else {
          this.width = data.width;
        }
        if (data.outlineColor instanceof Array) {
          this.outline_colors = getColor(data.outlineColor);
        } else {
          this.outline_color = getColor(data.outlineColor);
        }
        if (data.fill instanceof Array) {
          this.fills = data.fill;
        } else {
          this.fill = data.fill;
        }
        if (data.drawOutline instanceof Array) {
          this.outlines = data.drawOutline;
        } else {
          this.outline = getValue(data, 'drawOutline', false);
        }
      };
      inheritsFrom(CategoryBars, CategoryGraphics);
      //add prototype methods here

      var CategoryPoints = function (data) {
        if (!data) { data = {}; }
        CategoryGraphics.call(this, data);
        _.extend(this, {
          "type": "CategoryPoints"
        });
        if (data.size instanceof Array) {
          this.sizes = data.size;
        } else {
          this.size = getValue(data, 'size', 6);
        }
        if (data.shape instanceof Array) {
          this.shapes = data.shape;
        } else {
          this.shape = getValue(data, 'shape', ShapeType.DEFAULT);
        }
        if (data.fill instanceof Array) {
          this.fills = data.fill;
        } else {
          this.fill = data.fill;
        }
        if (data.outline_color instanceof Array) {
          this.outline_colors = getColor(data.outlineColor);
        } else {
          this.outline_color = getColor(data.outlineColor);
        }
      };
      inheritsFrom(CategoryPoints, CategoryGraphics);
      //add prototype methods here

      var CategoryStems = function (data) {
        if (!data) { data = {}; }
        CategoryGraphics.call(this, data);
        _.extend(this, {
          "type": "CategoryStems"
        });
        if (data.width != null) {
          this.width = getValue(data, 'width', 1.5);
        }
        if (data.base instanceof Array) {
          this.bases = data.base;
        } else {
          this.base = data.base;
        }
        if (data.style instanceof Array) {
          this.styles = data.style;
        } else {
          this.style = getValue(data, 'style', plotApi.StrokeType.SOLID);
        }
      };
      inheritsFrom(CategoryStems, CategoryGraphics);
      //add prototype methods here
      //CategoryPlot items//

      //CategoryPlot//
      var CategoryPlot = function (data) {
        if (!data) { data = {}; }
        plotApi.AbstractChart.call(this, data);

        _.extend(this, {
          "type": "CategoryPlot",
          "graphics_list": data.graphics || [],
          "categoryNames": data.categoryNames || [],
          "orientation": getValue(data, 'orientation', PlotOrientationType.VERTICAL),
          "category_margin": getValue(data, 'categoryMargin', 0.2),
          "categoryNamesLabelAngle": getValue(data, 'categoryNamesLabelAngle', 0)
        });
      };
      inheritsFrom(CategoryPlot, plotApi.AbstractChart);
      var abstractChartAdd = plotApi.AbstractChart.prototype.add;
      CategoryPlot.prototype.add = function (item) {
        if (item instanceof CategoryGraphics) {
          this.graphics_list.push(item);
        } else if (item instanceof Array) {
          for (var i = 0; i < item.length; i++) {
            this.add(item[i]);
          }
        } else {
          abstractChartAdd.call(this, item);
        }
        return this;
      };
      //add prototype methods here

      var api = {
        CategoryPlot: CategoryPlot,
        CategoryLines: CategoryLines,
        CategoryBars: CategoryBars,
        CategoryPoints: CategoryPoints,
        CategoryStems: CategoryStems,
        PlotOrientationType: PlotOrientationType,
        LabelPositionType: LabelPositionType,
        ShapeType: ShapeType
      };
      var list = function () {
        return api;
      };
      var instanceOfCategoryPlotApi = function (obj) {
        if (!obj) {
          return false;
        }
        var res = false;
        _.forOwn(api, function (value) {
          if (obj instanceof value) {
            res = true;
          }
        });
        return res;
      };
      return {
        list: list,
        instanceOfCategoryPlotApi: instanceOfCategoryPlotApi
      }
    }
  ]);
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
 * Module bk.commonUtils
 * - this should be the most general utilities, the utilities that could have been found in a
 * 3rd-party library
 * and we just happen to write our own.
 */
(function() {
  'use strict';
  var module = angular.module('bk.commonUtils', []);
  module.factory('commonUtils', function() {
    return {
      generateId: function(length) {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        if (_.isUndefined(length)) {
          length = 6;
        }
        for (var i = 0; i < length; i++) {
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
      },
      loadJS: function(url, success, failure) {
        var e = document.createElement('script');
        e.type = "text/javascript";
        // Add the time to the URL to avoid caching.
        var millis = new Date().getTime();
        e.src = url + "?_=" + millis;
        if (success) {
          e.onload = success;
        }
        if (failure) {
          e.onerror = failure;
        }
        document.head.appendChild(e);
      },
      loadCSS: function(url) {
        var link = document.createElement("link");
        link.type = "text/css";
        link.rel = "stylesheet";
        link.href = url;
        document.getElementsByTagName("head")[0].appendChild(link);
      },
      getEventOffsetX: function(elem, event) { // offsetX is not defined in firefox
        var x = event.offsetX;
        if (_.isUndefined(x) && !_.isUndefined(elem.offset)) {
          x = event.pageX - elem.offset().left;
        }
        return x;
      },
      loadList: function(urls, success, failure) {
        if (urls.length === 0) {
          if (success)
            return success();
          return;
        }
        var url = urls.shift();
        var me = this;
        this.loadJS(url, function() {
          me.loadList(urls, success, failure);
        }, failure);
      },
      findTable: function(elem) {
        function findColumnNames(elem) {
          var row = elem.children[0];
          var result = [];
          for (var i = 0; i < row.children.length; i++)
            result.push(row.children[i].innerHTML);
          return result;
        }

        function findEntries(elem) {
          var result = [];
          for (var i = 0; i < elem.children.length; i++)
            result.push(elem.children[i].innerHTML);
          return result;
        }

        function findValues(elem) {
          var result = [];
          for (var i = 0; i < elem.children.length; i++)
            result.push(findEntries(elem.children[i]));
          return result;
        }

        var tag = elem.tagName;
        if (tag === 'DIV') {
          for (var i = 0; i < elem.children.length; i++) {
            var sub = this.findTable(elem.children[i]);
            if (sub) return sub;
          }
          return null;
        }
        if (tag === 'TABLE') {
          if (elem.children.length < 2) {
            return null;
          }

          // To prevent from mangling user created html table,
          // only use table display for dataframe tables (BEAKER-456)
          if (!_.includes(elem.classList, 'dataframe')) {
            return null;
          }

          // check if this table contains elements with colspan and/or rowspan
          // the slockgrid template does not support them  (BEAKER-694)
          var headerRows = $(elem).find('thead').find('tr');
          for (var i = 0; i < headerRows.length; i++) {
            var ch = headerRows[i].children;
            for (var j=0; j<ch.length; j++) {
              if (ch[j].getAttribute('colspan')>1 || ch[j].getAttribute('rowspan')>1) {
                return null;
              }
            }
          }
          var valueRows = $(elem).find('tbody').find('tr');
          for (var i = 0; i < valueRows.length; i++) {
            var ch = valueRows[i].children;
            for (var j=0; j<ch.length; j++) {
              if (ch[j].getAttribute('colspan')>1 || ch[j].getAttribute('rowspan')>1) {
                return null;
              }
            }
          }

          // check if this is a table with multiple rows
          // currently the table displays can't handle multiple rows of header (BEAKER-416)
          // added logic to collapse the two header rows  (BEAKER-694)
          var cols = [];
          if (headerRows.length === 2) {
            //if there are two rows, allow tabledisplay as long as no column has values in both rows
            //this is because pandas renders dataframes with the index col header on a second row
            var row0 = headerRows.eq(0).find('th');
            var row1 = headerRows.eq(1).find('th');
	    var min = row0.length;
            if (min>row1.length) {
		min = row1.length;
            }
            for (var i = 0; i < min; i++) {
              var r0 = row0.eq(i);
              var r1 = row1.eq(i);

              //if any column has html in both rows, don't use tabledisplay
              if (r0 !== undefined && r1 != undefined && r0.html() && r1.html()) {
                return null;
              } else if (r0 !== undefined && r0.html()) {
	        cols.push(r0.html());
	      } else if (r1 !== undefined && r1.html()) {
                cols.push(r1.html());
              } else {
		cols.push("");
	      }
            }
          } else if (headerRows.length > 1) {
            //if there are two or more header, forget about it
            return null;
          } else {
            cols = findColumnNames($(elem).find('thead')[0]);
	  }

          var vals = findValues($(elem).find('tbody')[0]);
          return {
            type: "TableDisplay",
            tableDisplayModel: {
              columnNames: cols,
              values: vals
            },
            columnNames: cols,
            values: vals
          };
        }
        return null;
      },
      formatTimestamp: function(timestamp, tz, format) {
        return this.applyTimezone(timestamp, tz).format(format);
      },
      applyTimezone: function(timestamp, tz) {
        var time = moment(timestamp);
        if (tz) {
          if (tz.startsWith("GMT")) {
            time.utcOffset(tz);
          } else {
            time.tz(tz);
          }
        }
        return time;
      },
      formatTimeString: function(millis) {
        if (millis < 60 * 1000) {
          return (millis / 1000).toFixed(1) + "s";
        } else {
          var date = new Date(millis);
          var d = Math.floor(millis / (24 * 60 * 60 * 1000));
          var h = date.getUTCHours();
          var m = date.getUTCMinutes();
          var s = date.getUTCSeconds();
          var result = "";
          if (d > 0) {
            result += (d + "d");
          }
          if (h > 0) {
            result += (h + "h");
          }
          if (m > 0) {
            result += (m + "m");
          }
          if (s > 0) {
            result += (s + "s");
          }
          return result;
        }
      },
      isMiddleClick: function(event) {
        return event.button === 1 // middle click
            || (event.button === 0 // left click
            && (navigator.appVersion.indexOf("Mac") !== -1 ? event.metaKey : event.ctrlKey));
      },
      saveAsClientFile: function (data, filename) {
        if (!data) {
          console.error('commonUtils.saveAsClientFile: No data');
          return;
        }

        if (!filename) {
          filename = 'console.json';
        }

        if (typeof data === "object") {
          data = JSON.stringify(data, undefined, 4)
        }

        var blob = new Blob([data], {type: 'text/json'}),
            e = document.createEvent('MouseEvents'),
            a = document.createElement('a')

        a.download = filename
        a.href = window.URL.createObjectURL(blob)
        a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
        e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0,
            false, false, false, false, 0, null)
        a.dispatchEvent(e)
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
 * Module bk.commonUi
 * This module is the general store of low level UI directives, which should be separated out or
 * potentially found equivalent in 3rd party libraries.
 */

(function() {
  'use strict';
  var module = angular.module('bk.commonUi', []);
  module.directive('onCtrlEnter', function() {
    return {
      link: function(scope, element, attrs) {
        element.bind('keyup', function(event) {
          if (event.ctrlKey && event.keyCode === 13) { // ctrl + enter
            scope.$apply(attrs.onCtrlEnter);
          }
        });
      }
    };
  });
  module.directive('stopClick', function() {
    return function(scope, element, attrs) {
      element.click(function(event) {
        event.preventDefault();
        event.stopPropagation();
      });
    };
  });
  module.directive('eatClick', function() {
    return function(scope, element, attrs) {
      element.click(function(event) {
        event.preventDefault();
      });
    };
  });
  module.directive('focusStart', function() {
    return {
      link: function(scope, element, attrs) {
        Q.fcall(function() {
          element.focus();
        });
      }
    };
  });
  module.filter('isHidden', function() {
    return function(input) {
      return _.filter(input, function(it) {
        return !it.hidden;
      });
    };
  });

  module.directive('dropdownMenuSearch', function() {
    return {
      restrict: 'C',
      link: function(scope, element) {
        setTimeout(function(){
          var currentUL = element.siblings('ul');
          var parentULs = currentUL.parents('ul');
          var previousCss = [];
          $([currentUL, parentULs]).each(function(i, e){
            previousCss.push(e.attr("style"));
            e.css({
              position:   'absolute',
              visibility: 'hidden',
              display:    'block'
            });
          });

          element.outerWidth(currentUL.width());

          $([currentUL, parentULs]).each(function(i, e){
            e.attr("style", previousCss[i] ? previousCss[i] : "");
          });
        });
      }
    }
  });
  module.directive('dropdownSubmenuScrollable', function() {
    return {
      restrict: 'C',
      link: function(scope, element) {
        var parent = element.parent();
        var hoverHandler = function() {
          var position = element[0].getBoundingClientRect();
          if (position.bottom > window.innerHeight) {
            var itemHeight = 24;
            var marginb = 3;
            var menuItemsLength = element.children().length;
            var itemsToShow = Math.min(menuItemsLength, 10);//show at least 10 item. if items<10 show them all
            var padding = element.innerHeight() - element.height();

            var requiredVisibleHeight = itemHeight * itemsToShow + padding;
            var actualVisibleHeight = window.innerHeight - position.top;
            var diff = requiredVisibleHeight - actualVisibleHeight + marginb;
            if (diff > 0) {
              element.css('top', parseInt(element.css('top'), 10) - diff);
              var searchBox = element.siblings('.dropdown-menu-search');
              searchBox.css('top', parseInt(searchBox.css('top'), 10) - diff);
              position = element[0].getBoundingClientRect();
            }
            //show scroll
            element.css('max-height', window.innerHeight - position.top - marginb);
          }
        };

        var leaveHandler = function () {
          element.css('top', '');
          element.css('max-height', '');
          element.siblings('.dropdown-menu-search').css('top', '');
        };

        parent.on('mouseenter', hoverHandler);
        parent.on('mouseleave', leaveHandler);

        scope.$on('$destroy', function(){
          parent.off('mouseenter', hoverHandler);
          parent.off('mouseleave', leaveHandler);
        });
      }
    }
  });
  module.directive('dropdownPromoted', function() {
    // Is your dropdown being covered by its ancestors siblings?
    // Promote that shiz, and prepend it to the notebook so it doesn't
    // ever get bullied again.
    return {
      restrict: 'C',
      link: function(scope, element) {
        $(window).on('click.' + scope.$id, hideDropdown);
        $(document).on('hide.bs.dropdown', hideDropdown);
        $(document).on('keydown', keydownListener);

        var dropdown = element.find('.dropdown-menu').first();

        element.on('click', '.dropdown-toggle', toggleDropdown);

        function toggleDropdown() {
          if ($(dropdown).is(':visible')) {
            return hideDropdown();
          }
          showDropdown();
        }

        var showDropdown = function() {
          window.requestAnimationFrame(function() {
            var notebook = bkHelper.getNotebookElement(scope);
            var toggle = element.find('.dropdown-toggle').first();
            var togglePosition = toggle.offset();
            var notebookPosition = notebook.offset();

            dropdown.prependTo(notebook);

            dropdown.show().css({
              top: togglePosition.top - notebookPosition.top + 'px',
              left: togglePosition.left - notebookPosition.left - dropdown.outerWidth() + 'px'
            });
          });
        };

        function hideDropdown() { dropdown.hide();}

        function keydownListener(evt) {
          if (evt.which === 27) {
            hideDropdown();
          }
        }

        scope.$on('$destroy', function() {
          $(document).off('hide.bs.dropdown', hideDropdown);
          $(window).off('.' + scope.$id);
          $(document).off('keydown', keydownListener);
          // Since the dropdown is external to the directive we need
          // to make sure to clean it up when the directive goes away
          dropdown.remove();
          element.off('click');
        });
      }
    };
  });
  module.directive('bkDropdownMenu', function() {
    return {
      restrict: 'E',
      template: JST['template/dropdown'](),
      scope: {
        'menuItems': '=',

        // Classes to be added to any submenu item. Used for adding
        // pull-left to menus that are on the far right (e.g. bkcellmenu).
        submenuClasses: '@'
      },
      replace: true,
      controller: function($scope) {
        $scope.getMenuItems = function() {
          return _.result($scope, 'menuItems');
        };
      }
    };
  });
  module.directive('bkDropdownMenuItem', function($compile, $sce) {
    return {
      restrict: 'E',
      template: JST['template/dropdown_item'](),
      scope: {
        'item': '='
      },
      replace: true,
      controller: function($scope) {
        var isItemDisabled = function(item) {
          if (_.isFunction(item.disabled)) {
            return item.disabled();
          }
          return item.disabled;
        };

        $scope.getAClass = function(item) {
          var result = [];
          if (isItemDisabled(item)) {
            result.push('disabled-link');
          } else if (item.items && item.items.length <= 1 && item.autoReduce) {
            if (item.items.length === 0) {
              result.push('disabled-link');
            } else if (item.items.length === 1) {
              if (isItemDisabled(item.items[0])) {
                result.push('disabled-link');
              }
            }
          }
          if(item.separator){
            result.push('menu-separator');
          }
          result.push(item.id);
          return result.join(' ');
        };

        $scope.getItemClass = function(item) {
          var result = [];
          if (item.type === 'divider') {
            result.push('divider');
          } else if (item.type === 'submenu' || item.items) {
            if (item.items && item.items.length <= 1 && item.autoReduce) {

            } else {
              result.push('dropdown-submenu');
              // Add any extra submenu classes. (e.g. to specify if it should be left or right).
              if ($scope.submenuClasses) {
                _.each(
                    $scope.submenuClasses.split(' '),
                    function(elt) {
                      result.push(elt);
                    }
                );
              }
            }
          }
          return result.join(' ');
        };

        $scope.runAction = function(item) {
          if (item.items && item.items.length === 1 && item.autoReduce) {
            item.items[0].action();
          } else {
            if (_.isFunction(item.action)) {
              item.action();
            }
          }
        };
        $scope.hasCustomMarkup = function(item) {
          return typeof _.result(item, 'markup') !== 'undefined';
        };

        $scope.getCustomMarkup = function(item) {
          return $sce.trustAsHtml(_.result(item, 'markup') || '');
        };

        $scope.getShortcut = function(itemShortcut) {
         function replace(str) {
            if (bkHelper.isMacOS) {
              var mapObj = {
                Cmd: "&#x2318;",
                Ctrl: "&#x2303;",
                Alt: "&#x2325;",
                Shift: "&#x21E7;",
                Up: "&#x2191;",
                Down: "&#x2193;",
                Backspace: "&#x232b;"
              };
              str = str.replace(/-/g, "");
              var regexp = new RegExp(Object.keys(mapObj).join("|"),"gi");
              str = str.replace(regexp, function(matched) {
                return mapObj[matched];
              });
            }

            return $sce.trustAsHtml(str);
         }

          if (_.isArray(itemShortcut)) {
            var shortcut = (bkHelper.isMacOS ? itemShortcut[1] : itemShortcut[0]) || itemShortcut[0];
            return replace(shortcut);
          } else {
            return replace(itemShortcut);
          }
        };

        $scope.getName = function(item) {
          var name = '';
          if (item.items && item.items.length === 1 && item.autoReduce) {
            if (item.items[0].reducedName) {
              name = item.items[0].reducedName;
            } else {
              name = item.items[0].name;
            }
          } else {
            name = item.name;
          }
          if (_.isFunction(name)) {
            name = name();
          }
          return name;
        };

        $scope.isMenuItemChecked = function(item) {
          if (item.isChecked) {
            if (_.isFunction(item.isChecked)) {
              return item.isChecked();
            } else {
              return item.isChecked;
            }
          }
          return false;
        };
      },
      link: function(scope, element) {
        scope.getSubItems = function() {
          if (_.isFunction(scope.item.items)) {
            return scope.item.items();
          }
          return scope.item.items;
        };

        scope.$watchCollection('getSubItems()', function(items, oldItems) {
          if (!_.isEmpty(items)) {
            //jscs:disable
            $compile('<bk-dropdown-menu menu-items="getSubItems()"></bk-dropdown-menu>')(scope, function(cloned, scope) {
            //jscs:enable
              element.find('ul.dropdown-menu').remove();
              element.append(cloned);
            });
          }
        });
      }
    };
  });

  module.directive('bkEnter', function() {
    return function(scope, element, attrs) {
      var skiptag = attrs.skipfortag;
      element.bind('keydown keypress', function(event) {
        if (event.which === 13 && event.target.tagName !== skiptag) {
          scope.$apply(function() {
            scope.$eval(attrs.bkEnter, {event: event});
          });
          event.preventDefault();
        }
      });
    };
  });

  module.directive('bkLanguageLogo', function() {
    return {
      restrict: 'E',
      template: '<span ng-style="style">{{name}}</span>',
      scope: {
        name: '@',
        bgColor: '@',
        fgColor: '@',
        borderColor: '@'
      },
      link: function(scope, element, attrs) {
        scope.style = {
          'background-color': scope.bgColor,
          'color': scope.fgColor
        };
        var updateStyle = function() {
          scope.style = {
            'background-color': scope.bgColor,
            'color': scope.fgColor
          };
          if (scope.borderColor) {
            scope.style['border-width'] = '1px';
            scope.style['border-color'] = scope.borderColor;
            scope.style['border-style'] = 'solid';
          } else {
            delete scope.style['border-width'];
            delete scope.style['border-color'];
            delete scope.style['border-style'];
          }
        };
        scope.$watch('bgColor', updateStyle);
        scope.$watch('fgColor', updateStyle);
        scope.$watch('borderColor', updateStyle);
      }
    };
  });

  module.directive('bkLanguageMenuItem', function() {
    return {
      restrict: 'E',
      template: '<span ng-style="style">{{name}}</span>&nbsp;{{key}}',
      scope: {
        key: '@',
        name: '@',
        bgColor: '@',
        fgColor: '@',
        borderColor: '@'
      },
      link: function(scope, element, attrs) {
        scope.style = {
          'background-color': scope.bgColor,
          'color': scope.fgColor
        };
        var updateStyle = function() {
          scope.style = {
            'background-color': scope.bgColor,
            'color': scope.fgColor
          };
          if (scope.borderColor) {
            scope.style['border-width'] = '1px';
            scope.style['border-color'] = scope.borderColor;
            scope.style['border-style'] = 'solid';
          } else {
            delete scope.style['border-width'];
            delete scope.style['border-color'];
            delete scope.style['border-style'];
          }
        };
        scope.$watch('bgColor', updateStyle);
        scope.$watch('fgColor', updateStyle);
        scope.$watch('borderColor', updateStyle);
      }
    };
  });

  module.directive('bkBrandLogo', function () {
    return {
      restrict: 'E',
      template: JST['template/brand_logo'](),
      replace: true,
      scope: {
        reference: "@",
        onClick: "&"
      },
      link: function(scope) {
        scope.clickAction = function(event) {
          if (typeof scope.onClick == 'function') {
              scope.onClick({ event: event });
          }
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
/**
 * Module bk.angularUtils
 * This module provides AngularJS specific utilities that are shared across the whole application.
 */
(function() {
  'use strict';
  var module = angular.module('bk.angularUtils', ['bk.globals']);
  module.factory('angularUtils', function($rootScope, $location, $http, $q, $timeout, GLOBALS) {
    return {
      setLocation: function(newLocation) {
        $location.path(newLocation);
      },
      refreshRootScope: function() {
        $rootScope.$$phase || $rootScope.$apply();
      },
      toPrettyJson: function(angularBoundJsObj) {
        if(angularBoundJsObj.cells !== undefined) {
          for (var i=0; i < angularBoundJsObj.cells.length; i++) {
            if (angularBoundJsObj.cells[i].body !== undefined && typeof angularBoundJsObj.cells[i].body === "string") {
              angularBoundJsObj.cells[i].body = angularBoundJsObj.cells[i].body.split("\n");
            }
            if (angularBoundJsObj.cells[i].input !== undefined && angularBoundJsObj.cells[i].input.body !== undefined && typeof angularBoundJsObj.cells[i].input.body === "string") {
              angularBoundJsObj.cells[i].input.body = angularBoundJsObj.cells[i].input.body.split("\n");
            }
          }
        }
        function cleanup(key, value) {
          if (key === '$$hashKey') return undefined;
          return value;
        };
        var ret = JSON.stringify(angularBoundJsObj, cleanup, 4) + "\n";
        this.removeStringArrays(angularBoundJsObj);
        return ret;
      },
      removeStringArrays: function(obj) {
        if(obj.cells !== undefined) {
          for (var i=0; i < obj.cells.length; i++) {
            if (obj.cells[i].body !== undefined && $.isArray(obj.cells[i].body)) {
              var separator = '\n';
              obj.cells[i].body = obj.cells[i].body.join([separator]);
            }
            if (obj.cells[i].input !== undefined && obj.cells[i].input.body !== undefined && $.isArray(obj.cells[i].input.body)) {
              var separator = '\n';
              obj.cells[i].input.body = obj.cells[i].input.body.join([separator]);
            }
          }
        }
      },
      fromPrettyJson: function(jsonString) {
          var ret = angular.fromJson(jsonString);
          this.removeStringArrays(ret);
          return ret;
      },
      httpGet: function(url, data, headers) {
        return $http({method: "GET", url: url, params: data, headers: headers});
      },
      httpGetCached: function(url, data, headers) {
        return $http({method: "GET", url: url, params: data, headers: headers, cache: true});
      },
      httpGetJson: function(url, data, headers) {
        return $http({
          method: "GET",
          url: url,
          params: data,
          withCredentials: true,
          headers: _.extend({'Content-Type': 'application/json'}, headers)
        });
      },
      httpDeleteJson: function(url, data, headers) {
        return $http({
          method: "DELETE",
          url: url,
          params: data,
          withCredentials: true,
          headers: _.extend({'Content-Type': 'application/json'}, headers)
        });
      },
      httpPost: function(url, data, headers) {
        return $http({
          method: "POST",
          url: url,
          data: $.param(data),
          headers: _.extend({'Content-Type': 'application/x-www-form-urlencoded'})
        });
      },
      httpPostJson: function(url, data, headers) {
        return $http({
          method: "POST",
          url: url,
          data: data,
          withCredentials: true,
          headers: _.extend({'Content-Type': 'application/json'}, headers)
        });
      },
      httpPutJson: function(url, data, headers) {
        return $http({
          method: "PUT",
          url: url,
          data: data,
          withCredentials: true,
          headers: _.extend({'Content-Type': 'application/json'}, headers)
        });
      },
      newDeferred: function() {
        return $q.defer();
      },
      newPromise: function(value) {
        return $q.when(value);
      },
      all: function() {
        return $q.all.apply($q, arguments);
      },
      fcall: function (func) {
        var deferred = $q.defer();
        $timeout(function () {
          try {
            deferred.resolve(func());
          } catch (err) {
            deferred.reject(err);
          }
        }, 0);
        return deferred.promise;
      },
      timeout: function (func, ms) {
        return $timeout(func, ms);
      },
      cancelTimeout: function(promise) {
        $timeout.cancel(promise);
      },
      delay: function(ms) {
        var deferred = $q.defer();
        $timeout(function() {
          deferred.resolve();
        }, ms);
        return deferred.promise;
      },
      showLanguageManagerSpinner: function(pluginName) {
        $rootScope.$emit(GLOBALS.EVENTS.LANGUAGE_MANAGER_SHOW_SPINNER, {pluginName: pluginName});
      },
      hideLanguageManagerSpinner: function(err) {
        $rootScope.$emit(GLOBALS.EVENTS.LANGUAGE_MANAGER_HIDE_SPINNER, {error: err});
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
 * This is a reusable UI component for tree views.
 */
(function() {
  'use strict';
  var treeView = angular.module('bk.treeView', ['ngAnimate', 'bk.utils']);

  treeView.factory('fileService', function() {
    var _provider = {};
    return {
      setProvider: function(providers) {
        _provider = providers;
      },
      getChildren: function(uri, callback) {
        _provider.getChildren(uri, callback);
      },
      fillInput: function(uri) {
        _provider.fillInput(uri);
      },
      open: function(uri) {
        _provider.open(uri);
      }
    };
  });

  var getSlash = function(isWindows) {
    if (isWindows) {
      return '\\'
    }
    return '/';
  };

  var addTrailingSlash = function(str, isWindows) {
    if (isWindows) {
      if (!_.endsWith(str, '\\')) {
        str = str + '\\';
      }
    } else {
      if (!_.endsWith(str, '/')) {
        str = str + '/';
      }
    }
    return str;
  };

  treeView.directive('treeView', function($templateCache, $rootScope, $timeout, bkUtils) {
    return {
      restrict: 'E',
      template: '<tree-node data="root" fs="fs" displayname="{{ rooturi }}"></tree-node>',
      scope: {rooturi: '@', fs: '='},
      controller: function($scope) {
        if (!$templateCache.get('treeNodeChildren.html')) {
          //jscs:disable
          $templateCache.put('treeNodeChildren.html', '<tree-node class="bk-treeview" ng-repeat="d in data.children | fileFilter:fs.filter | orderBy:fs.getOrderBy():fs.getOrderReverse()" data="d" fs="fs"></tree-node>');
          //jscs:enable
        }

        $rootScope.fsPrefs = $rootScope.fsPrefs || {
          openFolders: []
        };

        var isHomeDir = $scope.rooturi.length >= 3; // '/' for *nix and C:\ for windows
        var separator  = getSlash(bkUtils.serverOS.isWindows());

        var getOpenFolders = function(path){
          var openFolders = [];
          if (path.indexOf($scope.rooturi)!== -1){
            path = path.replace($scope.rooturi,  "");
            var the_arr = path.split(separator);
            var openFolder = addTrailingSlash($scope.rooturi, bkUtils.serverOS.isWindows());
            while (the_arr.length > 0){
              var part =  the_arr.shift();
              if (part.length > 0) {
                openFolder += addTrailingSlash(part, bkUtils.serverOS.isWindows());
                openFolders.push(openFolder);
              }
            }
            return openFolders;
          }
          return undefined;
        };

        var reinit = function (rooturi, openFolders, callback) {
          $scope.root = {
            type: 'directory',
            uri: $scope.rooturi,
            children: []
          };

          $scope.fs.getChildren(rooturi, openFolders).then(function (response) {
            $scope.$evalAsync(function () {
              $scope.root.children = response.data;
              if (callback) {
                $timeout(function () {
                  callback();
                }, 0);
              }
            });
          });
        };

        $scope.$on("SELECT_DIR", function (event, data) {
          var callback = function(){
            $rootScope.$broadcast("SCROLL_TO_TREE_NODE",{
              path: data.path
            });
          };
          var openFolders = getOpenFolders(data.path);
          if (isHomeDir && data.find_in_home_dir == true){
            if (openFolders) {
              reinit($scope.rooturi, openFolders, callback);
            }
            else {

              $rootScope.$broadcast("SELECT_DIR",{
                find_in_home_dir: false,
                path: data.path
              });
            }
          }else if (!isHomeDir && data.find_in_home_dir == false){
            if (openFolders) {
              reinit($scope.rooturi, openFolders, callback);
            }
          }
        });

        $scope.root = {
          type: 'directory',
          uri: $scope.rooturi,
          children: []
        };
      }
    };
  });

  treeView.filter('fileFilter', function() {
    return function(children, filter) {
      return _.isFunction(filter) ? _.filter(children, filter) : children;
    };
  });

  treeView.directive('treeNode', function(bkUtils) {
    return {
      restrict: 'E',
      //jscs:disable
      template: '<span ng-dblclick="dblClick()" ng-click="click()"><i class="{{ getIcon() }}"></i> <span>{{ getDisplayName() }}</span></span>' +
          '<div class="pushright">' +
          '<div ng-include="\'treeNodeChildren.html\'"></div>' +
          '</div>',
      //jscs:enable
      scope: {data: '=', fs: '=', displayname: '@'},
      controller: function($scope, $rootScope) {



        var transform = function(c) {
          return {
            type: c.type,
            uri: c.uri,
            modified: c.modified,
            displayName: c.displayName,
            children: _.map(c.children, transform)
          };

        };
        $scope.onMakeNewDir = function(path) {

          if (path){
            var removeLastDirectoryPartOf =  function (the_url)
            {
              var the_arr = the_url.split('/');
              the_arr.pop();
              return( the_arr.join('/') );
            };

            if (removeLastDirectoryPartOf(path) === $scope.data.uri) {
              $scope.data.children = $scope.fs.getChildren($scope.data.uri).success(function (list) {
                $scope.data.children = list;
              });
            }
          }
        };
        $scope.click = function() {
          if ($scope.data.type === 'directory') {
            var uri = $scope.data.uri;
            addTrailingSlash(uri, bkUtils.serverOS.isWindows());
            $scope.fs.fillInput(uri);
            // toggle
            if (!_.isEmpty($scope.data.children)) {
              $scope.data.children.splice(0, $scope.data.children.length);
              $rootScope.fsPrefs.openFolders = _.reject($rootScope.fsPrefs.openFolders, function(folder) {
                return _.startsWith(folder, uri);
              });
            } else {
              $rootScope.fsPrefs.openFolders.push(uri);
              $scope.fs.getChildren($scope.data.uri).success(function(children) {
                children = _.sortBy(children, function(c) {
                  if (c.type === 'directory') {
                    return '!!!!!' + c.uri.toLowerCase();
                  } else {
                    return c.uri.toLowerCase();
                  }
                });
                $scope.data.children = _.map(children, transform);
              });
            }
          } else {
            $scope.fs.fillInput($scope.data.uri);
          }
        };
        $scope.dblClick = function() {
          if ($scope.data.type === 'directory') {
            return;
          }

          $scope.fs.open($scope.data.uri);
        };
        $scope.getIcon = function() {
          if ($scope.data) {
            if ($scope.data.type === 'directory') {
              return 'folder-icon';
            }
            if ($scope.data.type === 'application/prs.twosigma.beaker.notebook+json') {
              return 'glyphicon glyphicon-book file-icon';
            } else if ($scope.fs && $scope.fs.getIcon && $scope.fs.getIcon($scope.data.type)) {
              return $scope.fs.getIcon($scope.data.type);
            }
          }

          return 'glyphicon glyphicon-th file-icon';
        };

        $scope.getDisplayName = function() {
          if ($scope.displayname) {
            return $scope.displayname;
          }
          if ($scope.data.displayName) {
            return $scope.data.displayName;
          }
          var name = $scope.data.uri;
          if (name && name.length > 0 && name[name.length - 1] === '/') {
            name = name.substring(0, name.length - 1);
          }
          return name ? name.replace(/^.*[\\\/]/, '') : '';
        };

        if ($scope.fs.addListener){
          $scope.fs.addListener($scope);
        }

        $scope.$on("MAKE_NEW_DIR", function (event, data) {
          $scope.onMakeNewDir(data.path);
        });
      },
      link: function(scope, element, attrs, ctrl) {
        scope.$on("SCROLL_TO_TREE_NODE", function (event, data) {
          if (addTrailingSlash(data.path, bkUtils.serverOS.isWindows()) === addTrailingSlash(scope.data.uri, bkUtils.serverOS.isWindows()))
            element.get()[0].scrollIntoView();
        });
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
 * Module bk.cometdUtils
 * This module offers the cometd service that is used to receive 'pushes' from the server.
 */
(function() {
  'use strict';
  var module = angular.module('bk.cometdUtils', []);
  module.factory('cometdUtils', function () {
    var _statusListener;
    var _outputListener;
    var _handshakeListener;
    return {
      initializeCometd: function(uri) {
        $.cometd.init({
          url: uri
        });
      },
      addConnectedStatusListener: function (cb) {
        this.removeConnectedStatusListener();
        _statusListener = $.cometd.addListener("/meta/connect", cb);
      },
      removeConnectedStatusListener: function () {
        if (_statusListener) {
          $.cometd.removeListener(_statusListener);
          _statusListener = undefined;
        }
      },
      addOutputlogUpdateListener: function (cb) {
        this.removeOutputlogUpdateListener();
        _outputListener = $.cometd.subscribe("/outputlog", cb);
      },
      removeOutputlogUpdateListener: function () {
        if (_outputListener) {
          $.cometd.removeListener(_outputListener);
          _outputListener = undefined;
        }
      },
      addHandshakeListener: function (cb) {
        this.removeHandshakeListener();
        _handshakeListener = $.cometd.addListener("/meta/handshake", cb);
      },
      removeHandshakeListener: function () {
        if (_handshakeListener) {
          $.cometd.removeListener(_handshakeListener);
          _handshakeListener = undefined;
        }
      },
      disconnect: function() {
        this.removeConnectedStatusListener();
        this.removeOutputlogUpdateListener();
        return $.cometd.disconnect();
      },
      reconnect: function() {
        $.cometd.handshake();
      }
    };
  });
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
/**
 * Module bk.publication
 * Publication API wrapper
 */
(function() {
  'use strict';
  var module = angular.module('bk.publication', [
    'bk.utils',
    'bk.core',
    'bk.sessionManager'
  ]);

  module.factory('bkPublicationApi', function (bkUtils, $localStorage, Upload) {
    var baseUrl = window.beakerRegister !== undefined && window.beakerRegister.publicationApiURL !== undefined ? window.beakerRegister.publicationApiURL : 'https://pub.beakernotebook.com';

    function headers() {
      if ($localStorage.token) {
        return {'X-Authorization': 'Token ' + $localStorage.token};
      }
    }

    return {
      createSession: function(params) {
        return bkUtils.httpPostJson(baseUrl + '/user/v1/sessions', params)
      },
      getCurrentUser: function() {
        return bkUtils.httpGetJson(baseUrl + '/user/v1/current_user', {silent: true}, headers())
      },
      createPublication: function(params) {
        return bkUtils.httpPostJson(baseUrl + '/notebook/v1/publications', params, headers());
      },
      updatePublication: function(id, params) {
        return bkUtils.httpPutJson(baseUrl + '/notebook/v1/publications/' + id, params, headers());
      },
      getPublication: function(id) {
        return bkUtils.httpGetJson(baseUrl + '/notebook/v1/publications/' + id, {}, headers());
      },
      deletePublication: function(id) {
        return bkUtils.httpDeleteJson(baseUrl + '/notebook/v1/publications/' + id, {}, headers());
      },
      getCategories: function() {
        return bkUtils.httpGetJson(baseUrl + '/notebook/v1/categories', {}, headers());
      },
      uploadAttachment: function(file) {
        return Upload.upload({
          url: baseUrl + '/user/v1/attachments',
          method: 'POST',
          headers: {'X-Authorization': 'Token ' + $localStorage.token},
          fields: {style: 'publication-preview'},
          file: file
        });
      },
      deleteAttachment: function(id) {
        return bkUtils.httpDeleteJson(baseUrl + '/user/v1/attachments/' + id, {}, headers());
      },
      getAttachmentUrl: function(id) {
        return baseUrl + '/user/v1/attachments/' + id;
      },
      getBaseUrl: function () {
        return baseUrl;
      }
    };
  });

  module.factory('bkPublicationAuth', function (bkPublicationApi, $localStorage) {
    var currentUser;

    return {
      signIn: function(user) {
        var self = this;
        return bkPublicationApi.createSession(user)
        .then(function(response) {
          if (response.data && response.data.token) {
            $localStorage.token = response.data.token
          }
          return self.initSession();
        });
      },
      signOut: function() {
        delete $localStorage.token;
        currentUser = null;
      },
      initSession: function() {
        return bkPublicationApi.getCurrentUser()
        .then(function(resp) {
          if (resp.data && resp.data.token) {
            $localStorage.token = resp.data.token
          }
          return currentUser = resp.data;
        });
      },
      currentUser: function() {
        return currentUser;
      },
      isSignedIn: function() {
        return !!currentUser;
      }
    };
  });

  module.factory('bkPublicationHelper', function (bkUtils, bkCoreManager, bkSessionManager) {
    return {
      helper: publicationHelper
    };

    function publicationHelper(type, $scope) {
      function addPublishMenuItem() {
        var item = {
          name: 'Publish...',
          action: function() {
            var notebook = $scope.getPublishData();
            var cb = function(r) {
              if (r != 'done') {
                $scope.cellmodel.metadata = {'publication-id': r};
              }
            };
            bkCoreManager.showPublishForm(notebook, cb);
          }
        };

        if (type == 'code') {
          $scope.cellmenu.addItem(item);
        } else {
          $scope.cellview.menu.addItem(item);
        }
      }

      function initWatcher() {
        $scope.$watch('cellmodel.metadata.publication-id', function(newValue, oldValue) {
          if (newValue !== oldValue) {
            bkSessionManager.setNotebookModelEdited(true);
          }
        });
      }

      function initPublishDataAction() {
        if (!angular.isFunction($scope['getPublishData'])) {
          $scope.getPublishData = function () {
            var evaluator = _.find(bkSessionManager.getRawNotebookModel().evaluators, function (evaluator) {
              return (type == 'code') ? (evaluator.name === $scope.cellmodel.evaluator) : true;
            });
            var cells = [$scope.cellmodel];
            return bkUtils.generateNotebook([evaluator], cells, $scope.cellmodel.metadata);
          };
        }

        addPublishMenuItem();
        initWatcher();
      };

      if (window.beakerRegister === undefined || window.beakerRegister.isEmbedded === undefined) {
        initPublishDataAction();
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
/**
 * Module bk.notebookVersionManager
 * Offers utilities to convert beaker notebook of old versions to the latest version
 */
(function() {
  'use strict';
  var module = angular.module('bk.notebookVersionManager', []);

  var bkNbV1Converter = (function() {
    // in v1, cell level by definition is the count of steps away from "root" in the tree
    var getSectionCellLevel = function(cell, tagMap) {
      var getParentId = function(cId) {
        var pId = null;
        _.find(tagMap, function(v, k) {
          if (_.includes(v, cId)) {
            pId = k;
            return true;
          }
        });
        return pId;
      };
      var level = 0;
      var parentId = getParentId(cell.id);
      while (parentId) {
        ++level;
        parentId = getParentId(parentId);
      }
      return level;
    };
    var convertCodeCell = function(cell) {
      return {
        "id": cell.id,
        "type": "code",
        "evaluator": cell.evaluator,
        "input": cell.input,
        "output": cell.output
      };
    };
    var convertSectionCell = function(cell, tagMap) {
      return {
        "id": cell.id,
        "type": "section",
        "level": getSectionCellLevel(cell, tagMap),
        "title": cell.title,
        "collapsed": cell.collapsed
      };
    };
    var convertTextCell = function(cell) {
      return {
        "id": cell.id,
        "type": "text",
        "body": cell.body
      };
    };
    var convertMarkdownCell = function(cell) {
      return {
        "id": cell.id,
        "type": "markdown",
        "body": cell.body,
        "mode": cell.mode
      };
    };
    var convertCell = function(cell, tagMap, tagMap2) {
      var retCell;
      switch (cell.class[0]) {
        case "code":
          retCell = convertCodeCell(cell);
          break;
        case "section":
          retCell = convertSectionCell(cell, tagMap);
          break;
        case "text":
          retCell = convertTextCell(cell);
          break;
        case "markdown":
          retCell = convertMarkdownCell(cell);
          break;
      }
      if (tagMap2 && _.includes(tagMap2.initialization, cell.id)) {
        retCell.initialization = true;
      }
      return retCell;
    };
    var getCellIds = function(cells, tagMap) {
      var cellIds = [];
      var cId, children;
      var stack = ["root"];
      while (!_.isEmpty(stack)) {
        cId = stack.pop();
        cellIds.push(cId);
        if (tagMap.hasOwnProperty(cId)) {
          children = _.clone(tagMap[cId]);
          if (!_.isEmpty(children)) {
            stack = stack.concat(children.reverse());
          }
        }
      }
      return cellIds;
    };
    var generateCellMap = function(cells) {
      var cellMap = {};
      cells.forEach(function(cell) {
        cellMap[cell.id] = cell;
      });
      return cellMap;
    };
    var convertCells = function(cells, tagMap, tagMap2) {
      var cellIds = getCellIds(cells, tagMap);
      var cellMap = generateCellMap(cells);
      var v2Cells = _(cellIds)
          .filter(function(id) {
            return id !== "root";
          })
          .map(function(id) {
            return cellMap[id];
          })
          .filter(function(cell) {
            return !cell.hideTitle;
          })
          .map(function(cell) {
            return convertCell(cell, tagMap, tagMap2);
          })
          .value();
      return v2Cells;
    };

    return {
      convert: function(notebookV1) {
        var notebookV2 = {
          beaker: "2",
          evaluators: notebookV1.evaluators,
          cells: convertCells(notebookV1.cells, notebookV1.tagMap, notebookV1.tagMap2),
          locked: notebookV1.locked
        };
        return notebookV2;
      }
    };
  })();

  module.factory('bkNotebookVersionManager', function() {
    return {
      open: function(notebook) {
        if (_.isEmpty(notebook)) {
          return {
            "beaker": "2",
            "evaluators": [],
            "cells": []
          };
        }
        // if notebook is a string, parse it to js object
        if (angular.isString(notebook)) {
          try {
            notebook = angular.fromJson(notebook);
            // TODO, to be removed. Load a corrupted notebook.
            if (angular.isString(notebook)) {
              notebook = angular.fromJson(notebook);
            }
          } catch (e) {
            console.error(e);
            console.error("This is not a valid Beaker notebook JSON");
            console.error(notebook);
            window.alert("Not a valid Beaker notebook");
            return;
          }
        }

        // if beaker version is undefined
        // treat it as beaker notebook v1
        if (_.isUndefined(notebook.beaker)) {
          notebook.beaker = "1";
        }
        //check version and see if need conversion
        if (notebook.beaker === "1") {
          notebook = bkNbV1Converter.convert(notebook);
        } else if (notebook.beaker === "2") {
          // good, "2" is the current version
        } else {
          throw "Unknown Beaker notebook version";
        }

        return notebook;
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
 * Module bk.outputLog
 * This module owns the service of get output log from the server.
 */
(function() {
  'use strict';
  var module = angular.module('bk.outputLog', ['bk.utils', 'bk.cometdUtils']);
  module.factory('bkOutputLog', function (bkUtils, cometdUtils) {
    return {
      getLog: function (cb) {
        bkUtils.httpGet(bkUtils.serverUrl("beaker/rest/outputlog/get"), {})
            .success(cb)
            .error(function () {
              console.log("failed to get output log");
            });
      },
      subscribe: function (cb) {
        return cometdUtils.addOutputlogUpdateListener(cb);
      },
      unsubscribe: function() {
        cometdUtils.removeOutputlogUpdateListener();
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
 *  Module bk.recentMenu
 *  This module owns the service of retrieving recent menu items and updating the recent menu.
 */
(function() {
  'use strict';
  var module = angular.module('bk.recentMenu', ['bk.angularUtils']);

  module.provider("bkRecentMenu", function() {
    var _server = null;
    this.configServer = function(server) {
      _server = server;
    };
    this.$get = function(angularUtils) {
      var opItems = {
        EMPTY: {name: "(Empty)", disabled: true},
        DIVIDER: {type: "divider"},
        CLEARING: {name: "(Clearing...)", disabled: true},
        UPDATING: {name: "(Updating...)", disabled: true},
        CLEAR: {name: "Clear", action: function() {
          clearMenu();
        } },
        REFRESH: {name: "Refresh", action: function() {
          refreshMenu();
        } }
      };
      var _recentMenu = [opItems.EMPTY];
      var refreshMenu = function() {
        if (!_server) {
          return;
        }
        _recentMenu.splice(0, _recentMenu.length, opItems.UPDATING);
        _server.getItems(function(items) {
          var i, HISTORY_LENGTH = 10;
          var getShortName = function(url) {
            if (url && url[url.length - 1] === "/") {
              url = url.substring(0, url.length - 1);
            }
            return url.replace(/^.*[\\\/]/, '');
          };
          if (_.isEmpty(items)) {
            _recentMenu.splice(0, _recentMenu.length, opItems.EMPTY);
          } else {
            _recentMenu.splice(0, _recentMenu.length);
            for (i = 0; i < items.length && i < HISTORY_LENGTH; ++i) {
              (function() {
                try {
                  var item = angular.fromJson(items[i]);
                    _recentMenu.push({
                    name: getShortName(item.uri),
                    meta:{
                      uri: item.uri,
                      type: item.type,
                      readOnly: item.readOnly,
                      format: item.format
                    },
                    action: function(newWindow) {
                      _pathOpener.open(item.uri, item.type, item.readOnly, item.format, newWindow);
                    },
                    tooltip: item.uri
                  });
                } catch(e) {
                  // this exists only for backward compatibility
                  var item = items[i];
                  _recentMenu.push({
                    name: getShortName(item),
                    meta:{
                      uri: item.uri,
                      type: item.type,
                      readOnly: item.readOnly,
                      format: item.format
                    },
                    action: function() {
                      _pathOpener.open(item);
                    },
                    tooltip: item
                  });
                }
              })();
            }
          }
          angularUtils.refreshRootScope();
        });
      };
      var clearMenu = function() {
        _recentMenu.splice(0, _recentMenu.length, opItems.CLEARING);
        _server.clear(refreshMenu);
      };

      var _pathOpener;
      refreshMenu(); // initialize
      return {
        init: function(pathOpener) {
          _pathOpener = pathOpener;
        },
        getMenuItems: function() {
          return _recentMenu;
        },
        recordRecentDocument: function(item) {
          if (_server) {
            _server.addItem(item, refreshMenu);
          }
        },
        updateRecentDocument: function (oldUrl, item) {
          var existingItem = _.find(this.getMenuItems(), function (item) {
            return item.tooltip === oldUrl;
          });
          if(existingItem && _server) {
            var self = this;
            _server.removeItem(existingItem, function () {
              self.recordRecentDocument(item);
            });
          } else {
            this.recordRecentDocument(item);
          }
        },
        removeRecentDocument: function(item) {
          if (_server) {
            _server.removeItem(item, refreshMenu);
          }
        }
      };
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
 * Module bk.session
 * This module owns the services of communicating to the session backup end point to load and
 * upload(backup) a session.
 */
(function() {
  'use strict';
  var module = angular.module('bk.session', ['bk.utils']);
  /**
   * bkSession
   * - talks to beaker server (/beaker/rest/session)
   * - bkSessionManager should depend on it to update/backup the session model
   */
  module.factory('bkSession', function(bkUtils) {
    var backupSession = function(sessionId, sessionData) {
      var deferred = bkUtils.newDeferred();
      bkUtils.httpPost(bkUtils.serverUrl('beaker/rest/session-backup/backup/' + sessionId), sessionData)
          .success(function(data) {
            deferred.resolve();
          })
          .error(function(data, status) {
            console.error('Failed to backup session: ' + sessionId + ', ' + status);
            deferred.reject('Failed to backup session: ' + sessionId + ', ' + status);
          });
      return deferred.promise;
    };
    var getSessions = function() {
      var deferred = bkUtils.newDeferred();
      bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/session-backup/getExistingSessions'))
          .success(function(sessions) {
            deferred.resolve(sessions);
          })
          .error(function(data, status, headers, config) {
            deferred.reject('Failed to get existing sessions ' + status);
          });
      return deferred.promise;
    };
    var getSessionEditedState = function(sessionId) {
      return bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/session-backup/getEdited'), {sessionid: sessionId});
    };

    var loadSession = function(sessionId) {
      var deferred = bkUtils.newDeferred();
      bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/session-backup/load'), {sessionid: sessionId})
          .success(function(session, status) {
            deferred.resolve(session);
          })
          .error(function(data, status, headers, config) {
            deferred.reject('Failed to load session: ' + sessionId + ', ' + status);
          });
      return deferred.promise;
    };
    var closeSession = function(sessionId) {
      var deferred = bkUtils.newDeferred();
      bkUtils.httpPost(bkUtils.serverUrl('beaker/rest/session-backup/close'), {
            sessionid: sessionId,
            isElectron: bkUtils.isElectron
          })
          .success(function(ret) {
            deferred.resolve(sessionId);
          })
          .error(function(data, status, headers, config) {
            deferred.reject('Failed to close session: ' + sessionId + ', ' + status);
          });
      return deferred.promise;
    };
    var recordLoadedPlugin = function(pluginName, pluginUrl) {
      bkUtils.httpPost(
          bkUtils.serverUrl('beaker/rest/session-backup/addPlugin'),
          {pluginname: pluginName, pluginurl: pluginUrl})
          .success(function(ret) {
            //console.log('recordLoadedPlugin');
          })
          .error(function(data, status, headers, config) {
            console.error('Failed to add plugin, ' + pluginName + ', ' + pluginUrl + ', ' + status);
          });
    };
    var getPlugins = function() {
      var deferred = bkUtils.newDeferred();
      bkUtils.httpGet(bkUtils.serverUrl('beaker/rest/session-backup/getExistingPlugins'), {})
          .success(function(plugins) {
            deferred.resolve(plugins);
          })
          .error(function(data, status, headers, config) {
            deferred.reject('Failed to get existing plugins, ' + status);
          });
      return deferred.promise;
    };
    return {
      getSessions: getSessions,
      load: loadSession,
      getSessionEditedState: getSessionEditedState,
      backup: backupSession,
      close: closeSession,
      recordLoadedPlugin: recordLoadedPlugin,
      getPlugins: getPlugins
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
 * Module bk.share
 * This module owns the bkShare service which communicate with the backend to create sharable
 * content as well as to return URL of the shard content.
 */
(function() {
  'use strict';
  var module = angular.module('bk.share', []);

  module.provider("bkShare", function() {
    var _sharingService = null;
    this.config = function(sharingService) {
      _sharingService = sharingService;
    };
    this.$get = function() {
      if (!_sharingService) {
        var noOp = function() {
          // do nothing for now
          // we might consider logging error or warning:
          //console.error("no sharing service available");
        };
        return {
          publish: noOp,
          getSharableUrl: noOp
        };
      }
      // the reason of wrapping the strategy instead of just return
      // it (_sharingService) is to make the API explicit.
      return {
        publish: function(uri, content, cb) {
          return _sharingService.publish(uri, content, cb);
        },
        generateExcel: function(path, table, cb) {
          return _sharingService.generateExcel(path, table, cb);
        },
        getSharableUrl: function(uri) {
          return _sharingService.getSharableUrl(uri);
        },
        getSharableUrl_SectionCell: function(uri) {
          return _sharingService.getSharableUrl_SectionCell(uri);
        },
        getSharableUrl_CodeCell: function(uri) {
          return _sharingService.getSharableUrl_CodeCell(uri);
        },
        getSharableUrl_Table: function(uri) {
          return _sharingService.getSharableUrl_Table(uri);
        },
        getSharableUrl_Notebook: function(uri) {
          return _sharingService.getSharableUrl_Notebook(uri);
        }
      };
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
 * Module bk.track
 * This module owns the service that can be configured to 3rd party provided usage metric
 * logging services.
 */
(function() {
  'use strict';
  var module = angular.module('bk.track', []);

  module.provider('bkTrack', function() {
    var _trackingService = null;
    this.config = function(trackingService) {
      if (_.isFunction(trackingService)) {
        _trackingService = trackingService();
      } else {
        _trackingService = trackingService;
      }
    };
    this.$get = function() {
      if (!_trackingService) {
        return {
          log: function(event, obj) {
            // do nothing
          },
          isNeedPermission: function() {
            return false;
          }
        };
      }
      return {
        log: function(event, object) {
          _trackingService.log(event, object);
        },
        enable: function() {
          // some tracking service will need to be enabled before being used
          if (_trackingService.enable && _.isFunction(_trackingService.enable)) {
            _trackingService.enable();
          }
        },
        disable: function() {
          // some tracking service will need to be enabled before being used
          if (_trackingService.disable && _.isFunction(_trackingService.disable)) {
            _trackingService.disable();
          }
        },
        isNeedPermission: function() {
          return _trackingService.isNeedPermission
              && _.isFunction(_trackingService.isNeedPermission)
              && _trackingService.isNeedPermission();
        }
      };
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
 * Module bk.utils
 * This module contains the low level utilities used by Beaker
 */
(function() {
  'use strict';
  var module = angular.module('bk.utils', [
    'bk.commonUtils',
    'bk.angularUtils',
    'bk.cometdUtils',
    'bk.track'
  ]);
  /**
   * bkUtils
   * - holds general/low0level utilities that are beaker specific that has no effect to DOM directly
   * - it also serves the purpose of hiding underneath utils: commonUtils/angularUtils/...
   *    from other parts of beaker
   */
  module.factory('bkUtils', function($rootScope, commonUtils, angularUtils, bkTrack, cometdUtils, $localStorage) {

    function endsWith(str, suffix) {
      return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    
    var serverRoot = endsWith(document.baseURI, 'beaker/') ? document.baseURI.substring(0,document.baseURI.length-7): document.baseURI;

    var osName = "Unknown";
    if (navigator.appVersion.indexOf("Win") != -1) {
      osName="Windows";
    } else if (navigator.appVersion.indexOf("Mac") != -1) {
      osName="MacOS";
    } else if (navigator.appVersion.indexOf("Linux") != -1) {
      osName="Linux";
    }


    function serverUrl(path) {
      return serverRoot + path;
    }

    var fileRoot = document.baseURI;
    
    function fileUrl(path) {
      return fileRoot + path;
    }

    // ajax notebook location types should be of the form
    // ajax:/loading/path:/saving/path
    function parseAjaxLocator(locator) {
      var pieces = locator.split(":");
      var prefix = window.location.protocol + '//' + window.location.host + '/';
      var src = prefix + pieces[1];
      var dest = prefix + pieces[2];
      return { source:  src, destination: dest }
    }

    var getServerOS = function () {
      var _isWindows = function (version) {
        return (version.toLowerCase().indexOf("win") >= 0);
      };
      var _isMacOS = function (version) {
        return version.toLowerCase().indexOf("mac") >= 0;
      };
      var _isUnix = function (version) {
        return (version.toLowerCase().indexOf("nix") >= 0 || version.indexOf("aix") > 0 );
      };
      var _isLinux = function (version) {
        return version.toLowerCase().indexOf("nux") >= 0;
      };

      var _osName = function (version) {
        var osName = "unknown";
        if (_isWindows(version)) {
          osName = "Windows";
        } else if (_isMacOS(version)) {
          osName = "MacOS";
        } else if (_isLinux(version)) {
          osName = "Linux";
        } else if (_isUnix(version)) {
          osName = "Unix";
        }
        return osName
      };

      var isWindows = false;
      var isMacOS = false;
      var isLinux = false;
      var isUnix = false;
      var osName = 'unknown';

      if (window.beakerRegister === undefined || window.beakerRegister.isPublication === undefined) {
        angularUtils.httpGet(serverUrl("beaker/rest/util/version"))
          .success(function (result) {
            isWindows = _isWindows(result);
            isMacOS = _isMacOS(result);
            isLinux = _isLinux(result);
            isUnix = _isUnix(result);
            osName = _osName(result);
          });
      } else if (window.beakerRegister === undefined || window.beakerRegister.prefsPreset === undefined) {
        isWindows = false;
        isMacOS = false;
        isLinux = true;
        isUnix = false;
        osName = "Linux";
      } else {
        isWindows = window.beakerRegister.prefsPreset.isWindows;
        isMacOS = window.beakerRegister.prefsPreset.isMacOS;
        isLinux = window.beakerRegister.prefsPreset.isLinux;
        isUnix = window.beakerRegister.prefsPreset.isUnix;
        osName = window.beakerRegister.prefsPreset.osName;
      }
      return {
        isWindows: function(){
          return isWindows;
        },
        isMacOS: function(){
          return isMacOS;
        },
        isLinux: function(){
          return isLinux;
        },
        isUnix: function(){
          return isUnix;
        },
        osName: function(){
          return osName;
        }
      };
    };

    var serverOS = getServerOS();

    var bkUtils = {
        serverUrl: serverUrl,
        fileUrl: fileUrl,

      // wrap trackingService
      log: function(event, obj) {
        obj["version"] = $rootScope.getVersion();
        bkTrack.log(event, obj);
      },

      mime: function (extension) {

        if (extension === 'bkr') {
          return ['directory', 'Beaker-Notebook'];
        } else if (extension === 'py') {
          return ['directory', 'text/x-python'];
        } else if (extension === 'csv') {
          return ['directory', 'text/x-comma-separated-values'];
        }else if (extension === 'ipynb') {
          return ['directory', 'IPython-Notebook'];
        }

        return [];
      },

      // wrap commonUtils
      generateId: function(length) {
        return commonUtils.generateId(length);
      },
      loadJS: function(url, success) {
        return commonUtils.loadJS(url, success);
      },
      loadCSS: function(url) {
        return commonUtils.loadCSS(url);
      },
      loadList: function(urls, success, failure) {
        return commonUtils.loadList(urls, success, failure);
      },
      formatTimeString: function(millis) {
        return commonUtils.formatTimeString(millis);
      },
      formatTimestamp: function(timestamp, tz, format) {
        return commonUtils.formatTimestamp(timestamp, tz, format);
      },
      applyTimezone: function(timestamp, tz) {
        return commonUtils.applyTimezone(timestamp, tz);
      },
      isMiddleClick: function(event) {
        return commonUtils.isMiddleClick(event);
      },
      getEventOffsetX: function(elem, event) {
        return commonUtils.getEventOffsetX(elem, event);
      },
      findTable: function(elem) {
        return commonUtils.findTable(elem);
      },
      saveAsClientFile: function(data, filename) {
        return commonUtils.saveAsClientFile(data, filename);
      },
      // Give the angular base URL
      // XXX This function is a HACK: '$location' should probably be used instead of
      // 'location', but '$location' seems to return the wrong path.
      getBaseUrl: function() {
        return location.protocol + '//' + location.host + location.pathname + '#';
      },
      removeSpecialChars: function(str) {
        return commonUtils.removeSpecialChars(str);
      },

      // wrap angularUtils
      refreshRootScope: function() {
        angularUtils.refreshRootScope();
      },
      toPrettyJson: function(jsObj) {
        return angularUtils.toPrettyJson(jsObj);
      },
      fromPrettyJson: function(jString) {
        return angularUtils.fromPrettyJson(jString);
      },
      httpGet: function(url, data, headers) {
        return angularUtils.httpGet(url, data, headers);
      },
      httpGetCached: function(url, data, headers) {
        return angularUtils.httpGetCached(url, data, headers);
      },
      httpGetJson: function(url, data, headers) {
        return angularUtils.httpGetJson(url, data, headers);
      },
      httpDeleteJson: function(url, data, headers) {
        return angularUtils.httpDeleteJson(url, data, headers);
      },
      httpPost: function(url, data, headers) {
        return angularUtils.httpPost(url, data, headers);
      },
      httpPostJson: function(url, data,headers) {
        return angularUtils.httpPostJson(url, data, headers);
      },
      httpPutJson: function(url, data, headers) {
        return angularUtils.httpPutJson(url, data, headers);
      },
      spinUntilReady: function(url) {
        var deferred = angularUtils.newDeferred();
        var timeRemaining = 60 * 1000;
        var maxInterval = 1000;
        var interval = 10;
        console.log("note: probing until backend is ready, an error here is normal");
        function spin() {
          angularUtils.httpGet(url, {}).success(function (r) {
            deferred.resolve("ok");
          }).error(function (r) {
            if (timeRemaining <= 0) {
              deferred.reject("timeout");
            } else {
              interval *= 1.5;
              if (interval > maxInterval) {
                interval = maxInterval;
              }
              timeRemaining = timeRemaining - interval;
              angularUtils.timeout(spin, interval);
            }
          });
        }
        spin();
        return deferred.promise;
      },
      newDeferred: function() {
        return angularUtils.newDeferred();
      },
      newPromise: function(value) {
        return angularUtils.newPromise(value);
      },
      all: function() {
        return angularUtils.all.apply(angularUtils, arguments);
      },
      fcall: function(func) {
        return angularUtils.fcall(func);
      },
      delay: function(ms) {
        return angularUtils.delay(ms);
      },
      timeout: function(func,ms) {
        return angularUtils.timeout(func,ms);
      },
      cancelTimeout: function(promise) {
        return angularUtils.cancelTimeout(promise);  
      },
      setServerRoot: function(url) {
        serverRoot = url;
      },
      setFileRoot: function(url) {
        fileRoot = url;
      },

      // beaker server involved utils
      getHomeDirectory: function() {
        var deferred = angularUtils.newDeferred();
        this.httpGet(serverUrl("beaker/rest/file-io/getHomeDirectory"))
            .success(deferred.resolve)
            .error(deferred.reject);
        return deferred.promise;
      },
      getLocalDrives: function() {
        var deferred = angularUtils.newDeferred();
        this.httpGet(serverUrl("beaker/rest/file-io/getLocalDrives"))
            .success(deferred.resolve)
            .error(deferred.reject);
        return deferred.promise;
      },
      getWorkingDirectory: function() {
        var deferred = angularUtils.newDeferred();
        this.httpGet(serverUrl("beaker/rest/file-io/getWorkingDirectory"))
            .success(deferred.resolve)
            .error(deferred.reject);
        return deferred.promise;
      },
      getVersionInfo: function() {
        var deferred = angularUtils.newDeferred();
        this.httpGet(serverUrl("beaker/rest/util/getVersionInfo"))
            .success(deferred.resolve)
            .error(deferred.reject);
        return deferred.promise;
      },
      getVersionString: function () {
        var deferred = angularUtils.newDeferred();
        this.httpGet(serverUrl("beaker/rest/util/version"))
          .success(deferred.resolve)
          .error(deferred.reject);
        return deferred.promise;
      },
      getStartUpDirectory: function() {
        var deferred = angularUtils.newDeferred();
        this.httpGet(serverUrl("beaker/rest/file-io/getStartUpDirectory"))
            .success(deferred.resolve)
            .error(deferred.reject);
        return deferred.promise;
      },
      getDefaultNotebook: function() {
        var deferred = angularUtils.newDeferred();
        angularUtils.httpGet(serverUrl("beaker/rest/util/getDefaultNotebook")).
            success(function(data) {
              deferred.resolve(data);
            }).
            error(function(data, status, header, config) {
              deferred.reject(data, status, header, config);
            });
        return deferred.promise;
      },
      getBeakerPreference: function(preferenceName) {
        return angularUtils.httpGet(serverUrl("beaker/rest/util/getPreference"), {preference: preferenceName})
          .then(function(response) {
            return response.data;
          });
      },
      generateNotebook: function(evaluators, cells, metadata) {
        var notebook = {
          beaker: "2",
          evaluators: evaluators,
          cells: cells
        };
        return _.isUndefined(metadata) ? notebook : _.extend(notebook, {metadata: metadata});
      },
      loadFile: function(path) {
        var deferred = angularUtils.newDeferred();
        angularUtils.httpGet(serverUrl("beaker/rest/file-io/load"), {path: path})
            .success(function(content) {
              if (!_.isString(content)) {
                // angular $http auto-detects JSON response and deserialize it using a JSON parser
                // we don't want this behavior, this is a hack to reverse it
                content = JSON.stringify(content);
              }
              deferred.resolve(content);
            })
            .error(deferred.reject);
        return deferred.promise;
      },

      loadHttp: function(url) {
        var deferred = angularUtils.newDeferred();
        angularUtils.httpGet(serverUrl("beaker/rest/http-proxy/load"), {url: url})
            .success(function(content) {
              if (!_.isString(content)) {
                // angular $http auto-detects JSON response and deserialize it using a JSON parser
                // we don't want this behavior, this is a hack to reverse it
                content = JSON.stringify(content);
              }
              deferred.resolve(content);
            })
            .error(deferred.reject);
        return deferred.promise;
      },
      loadAjax: function(ajaxLocator) {
        var deferred = angularUtils.newDeferred();
        angularUtils.httpGet(parseAjaxLocator(ajaxLocator).source, {}, {"X-Authorization": "Token " + $localStorage.token})
            .success(function(content) {
              if (!_.isString(content)) {
                // angular $http auto-detects JSON response and deserialize it using a JSON parser
                // we don't want this behavior, this is a hack to reverse it
                content = JSON.stringify(content);
              }
              deferred.resolve(content);
            })
            .error(deferred.reject);
        return deferred.promise;
      },
      renameFile: function(oldPath, newPath, overwrite) {
        var deferred = angularUtils.newDeferred();
        angularUtils.httpPost(serverUrl("beaker/rest/file-io/rename"), {newPath: newPath, oldPath: oldPath, overwrite: overwrite})
            .success(deferred.resolve)
            .error(function (data, status, header, config) {
              if (status === 409) {
                deferred.reject("exists");
              } else if (data === "isDirectory") {
                deferred.reject(data);
              } else {
                deferred.reject(data, status, header, config);
              }
            });
        return deferred.promise;
      },
      saveFile: function(path, contentAsJson, overwrite) {
        var deferred = angularUtils.newDeferred();
        if (overwrite) {
          angularUtils.httpPost(serverUrl("beaker/rest/file-io/save"), {path: path, content: contentAsJson})
              .success(deferred.resolve)
              .error(deferred.reject);
        } else {
          angularUtils.httpPost(serverUrl("beaker/rest/file-io/saveIfNotExists"), {path: path, content: contentAsJson})
              .success(deferred.resolve)
              .error(function(data, status, header, config) {
                if (status === 409) {
                  deferred.reject("exists");
                } else if (data === "isDirectory") {
                  deferred.reject(data);
                } else {
                  deferred.reject(data, status, header, config);
                }
              });
        }

        return deferred.promise;
      },
      saveAjax: function(ajaxLocator, contentAsJson) {
        var deferred = angularUtils.newDeferred();
        var destination = parseAjaxLocator(ajaxLocator).destination;
        angularUtils.httpPutJson(destination, {data: contentAsJson}, {"X-Authorization": "Token " + $localStorage.token})
          .success(deferred.resolve)
          .error(deferred.reject);
        return deferred.promise;
      },
      initializeCometd: function(uri) {
        return cometdUtils.initializeCometd(uri);
      },
      addConnectedStatusListener: function(cb) {
        return cometdUtils.addConnectedStatusListener(cb);
      },
      removeConnectedStatusListener: function() {
        return cometdUtils.removeConnectedStatusListener();
      },
      addHandshakeListener: function(cb) {
        return cometdUtils.addHandshakeListener(cb);
      },
      removeHandshakeListener: function() {
        return cometdUtils.removeHandshakeListener();
      },
      disconnect: function() {
        return cometdUtils.disconnect();
      },
      reconnect: function() {
        return cometdUtils.reconnect();
      },

      beginsWith: function(haystack, needle) {
        return (haystack.substr(0, needle.length) === needle);
      },

      // wrapper around requireJS
      moduleMap: {},
      loadModule: function(url, name) {
        // name is optional, if provided, it can be used to retrieve the loaded module later.
        var that = this;
        if (_.isString(url)) {
          var deferred = this.newDeferred();
          return window.loadQueuePromise.then(function() {
            window.requirejs([url], function (ret) {
              if (!_.isEmpty(name)) {
                that.moduleMap[name] = url;
              }
              deferred.resolve(ret);
            }, function(err) {
              deferred.reject({
                message: "module failed to load",
                error: err
              });
            });
            return deferred.promise;
          }).catch(function(e) {console.error(e.message + " - " + e.error)});

        }
        throw "illegal arg" + url;
      },
      require: function(nameOrUrl) {
        var url = this.moduleMap.hasOwnProperty(nameOrUrl) ? this.moduleMap[nameOrUrl] : nameOrUrl;
        return window.require(url);
      },
      setEasyFormValue: function (name, value, session, onSuccess, onError) {
        var data = {
            session: session,
            name: name,
            value: value,
            publish: false
        };
        this.httpPost(
                this.serverUrl("beaker/rest/easyform/set"),
                data)
                .success(function(ret) {
                    if (onSuccess) {
                        onSuccess(ret);
                    }
                })
                .error(function(data, status, headers, config) {
                    console.error("Failed to set easyform value. " + status);
                    if (onError) {
                        onError(data);
                    }
                });
    },
    getValidNgModelString: function(str) {
      if (str) {
        return str.replace(/[\s\d`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
      }
    },
    showLanguageManagerSpinner: function(pluginName) {
      angularUtils.showLanguageManagerSpinner(pluginName);
    },
    hideLanguageManagerSpinner: function(error) {
      angularUtils.hideLanguageManagerSpinner(error);
    },
    getEvaluationFinishedNotificationUrl: function () {
      return window.beakerRegister === undefined || !window.beakerRegister.evaluationFinishedNotificationUrl
        ? null : window.beakerRegister.evaluationFinishedNotificationUrl;
    },
    // Electron: require('remote')
    isElectron: navigator.userAgent.indexOf('beaker-desktop') > -1,

    serverOS:  serverOS,

    isWindows: osName === 'Windows',
    isMacOS: osName === 'MacOS',
    osName: osName,

    rgbaToHex: function (r, g, b, a) {
      if(a == undefined){
        a = 0xFF;
      }
      var num = ((a & 0xFF) << 24) |
        ((r & 0xFF) << 16) |
        ((g & 0xFF) << 8)  |
        ((b & 0xFF));
      if(num < 0) {
        num = 0xFFFFFFFF + num + 1;
      }
      return "#" + num.toString(16);
    }

    };

    if (typeof window.loadQueuePromise === 'undefined') {
      window.loadQueuePromise = bkUtils.newPromise();
    }

    return bkUtils;
  });
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
/**
 * Module bk.electron
 * This module contains all wrappers to Electron's API
 */
(function() {
  'use strict';
  var module = angular.module('bk.electron', [
    'bk.utils'
  ]);
  /**
   * bkElectron
   * - does all interaction with the Electron main thread, mostly through the 'remote' module
   */
  module.factory('bkElectron', function(bkUtils) {
    if (bkUtils.isElectron) {
      var remote = require('remote');
      var BrowserWindow = remote.require('browser-window');
      var Menu = remote.require('menu');
      var Dialog = remote.require('dialog');
      var Shell = remote.require('shell');
      var IPC = require('electron').ipcRenderer;
      var WebFrame = require('web-frame');
      var thisWindow = remote.getCurrentWindow();
      var app = remote.require('app');
      var clipboard = remote.require('clipboard');

      var _status = '';

      var _ctrlKey = (bkUtils.osName == 'MacOS') ? 'Command' : 'Control';
      var _zoomFactor = 1.0;
      var increaseZoom = function() {
        _zoomFactor += 0.1;
        WebFrame.setZoomFactor(_zoomFactor);
      };
      var decreaseZoom = function() {
        if (_zoomFactor > 0.1) {
          _zoomFactor -= 0.1;
        }
        WebFrame.setZoomFactor(_zoomFactor);
      };
      var resetZoom = function() {
        _zoomFactor = 1.0;
        WebFrame.setZoomFactor(_zoomFactor);
      };

      var mergeOrAddMenu = function (template, menu, index) {
        var hasMenu = false;
        for (var i in template) {
          if (template[i].label === menu.label) {
            hasMenu = true;
            template[i].submenu = template[i].submenu.concat(menu.submenu);
            break;
          }
        }
        if(!hasMenu){
          template.splice(index, 0, _viewMenu);
        }
      };

      var _assignShortcut = function(name) {
        switch (name) {
          case 'Save':
            return _ctrlKey + '+S';
          case 'Open... (.bkr)':
            return _ctrlKey + '+O';
          case 'New Notebook':
            return _ctrlKey + '+N';
          case 'Tutorial':
            return _ctrlKey + '+Shift+H';
          default:
            return undefined;
        }
      };
      var _beakerMenu = {
        label: 'Beaker',
        submenu: [
          {
            label: 'Change server',
            click: function() {
              IPC.send('try-change-server');
            }
          },
          {
            label: 'Start new local backend',
            click: function() {
              IPC.send('new-backend');
            }
          },
          {
            label: 'Open in browser',
            click: function() {
              IPC.send('open-in-browser');
            }
          },
          {
            label: 'Quit',
            click: function() {
              IPC.send('quit');
            },
            accelerator: _ctrlKey + '+Q'
          }
        ]
      };
      var _editMenu = {
        label: 'Edit',
        submenu:[
          {label: 'Undo', accelerator: _ctrlKey + '+Z', role: 'undo'},
          {label: 'Redo', accelerator: _ctrlKey + '+Shift+Z', role: 'redo'},
          {type: 'separator'},
          {label: 'Cut', accelerator: _ctrlKey + '+X', role: 'cut'},
          {label: 'Copy', accelerator: _ctrlKey + '+C', role: 'copy'},
          {label: 'Paste', accelerator: _ctrlKey + '+V', role: 'paste'},
          {label: 'Select All', accelerator: _ctrlKey + '+A', role: 'selectAll'}
        ]
      };
      var _viewMenu = {
        label: 'View',
        submenu: [
          {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: increaseZoom
          },
          {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: decreaseZoom
          },
          {
            label: 'Actual size',
            click: resetZoom
          }
        ]
      };

      var _refreshWindowTitle = function() {
        if (_status !== '') {
          thisWindow.setTitle(thisWindow.pageTitle + ' - ' + _status);
        } else {
          thisWindow.setTitle(thisWindow.pageTitle);
        }
      }

      var bkElectron = {
        remote: remote,
        BrowserWindow: BrowserWindow,
        Menu: Menu,
        Dialog: Dialog,
        Shell: Shell,
        IPC: IPC,
        WebFrame: WebFrame,
        app: app,
        clipboard: clipboard,

        increaseZoom: increaseZoom,
        decreaseZoom: decreaseZoom,
        resetZoom: resetZoom,

        toggleDevTools: function() {
          BrowserWindow.getFocusedWindow().toggleDevTools();
        },

        minimize: function() {
          BrowserWindow.getFocusedWindow().minimize();
        },
        closeWindow: function() {
          BrowserWindow.getFocusedWindow().close();
        },
        thisWindow: thisWindow,

        updateMenus: function(menus) {
          var makeMenu = function(bkmenu) {
            var menu = [];
            for (var i = 0; i < bkmenu.length; i++) {
              var bkItem = bkmenu[i];
              var newItem = {
                label: bkItem.name
              }
              if (bkItem.action !== undefined) {
                var item = {
                  action: function(itemAction, refreshBkNotebook){
                    itemAction();
                    refreshBkNotebook();
                  }.bind(this, bkItem.action, bkHelper.refreshBkNotebook)
                };
                newItem.click = item.action;
              }
              if ((bkItem.isRadio !== true) && (bkItem.isChecked !== undefined)) {
                newItem.type = 'checkbox';
                newItem.checked = bkItem.isChecked();
              } else if (bkItem.isRadio === true) {
                newItem.type = 'radio';
                newItem.checked = bkItem.isChecked();
              }
              newItem.accelerator = _assignShortcut(bkItem.name);
              // Process submenu
              if (Array.isArray(bkItem.items)) {
                newItem.submenu = makeMenu(bkItem.items);
              } else if (_.isFunction(bkItem.items)) {
                newItem.submenu = makeMenu(bkItem.items());
              }
              if (bkItem.index !== undefined) {
                menu[bkItem.index] = newItem;
              } else {
                menu.push(newItem);
              }
            }
            return menu;
          };

          var template = makeMenu(_.values(menus));
          mergeOrAddMenu(template, _viewMenu, 1);
          template.splice(1, 0, _editMenu);
          template.splice(0, 0, _beakerMenu);
          var menu = Menu.buildFromTemplate(template);
          Menu.setApplicationMenu(menu);
        },

        setStatus: function(msg) {
          _status = msg;
          _refreshWindowTitle();
        },

        getStatus: function() {
          return _status;
        }
      };
      return bkElectron;
    } else {
      return {};
    }
  });
})();
