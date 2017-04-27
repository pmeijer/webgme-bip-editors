/*globals define, $*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed Apr 26 2017 17:14:44 GMT-0500 (Central Daylight Time).
 */

define([
    'js/Loader/LoaderCircles',
    'js/Controls/PropertyGrid/Widgets/IntegerWidget',
    'css!./styles/ContainerWidget.css'
], function (LoaderCircles, IntegerWidget) {
    'use strict';

    var ContainerWidget,
        MAX_NUMBER_OF_PANELS = 1,
        WIDGET_CLASS = 'bip-execution-container-widget';

    ContainerWidget = function (logger, container) {
        this._logger = logger.fork('Widget');

        this._el = container;
        this._panels = [];
        this._components = null;

        this._initialize();

        this._logger.debug('ctor finished');
    };

    ContainerWidget.prototype._initialize = function () {
        // set widget class
        this._el.addClass(WIDGET_CLASS);
        this._loader = new LoaderCircles({containerElement: this._el});

        this._configContainer = $('<div class="configuration-form">' +
            '<div class="configuration-title">Number of Panels</div>' +
            '<div class="configuration-desc">Select the number of panels you would like to allocate ' +
            'for each Component Type. Note that each panel can visualize multiple instances.' +
            '</div>' +
            '</div>');

        this._configForm = $('<form class="form-horizontal" role="form"></form>');
        this._configContainer.append(this._configForm);

        this._el.append(this._configContainer);
        this._configContainer.hide();
    };

    ContainerWidget.prototype.onWidgetContainerResize = function (width, height) {
        this._logger.debug('Widget is resizing...');
        // TODO: Propagate there properly..
    };

    // Adding/Removing/Updating items
    ContainerWidget.prototype.addInnerPanel = function (panel) {
        // TODO: assign these to the correct panel container.
        this._panels.push(panel);
        this._el.append(panel.$pEl);
        panel.setSize(this._el.width(), this._el.height());
    };

    ContainerWidget.prototype.populateConfigure = function (componentTypes, callback) {
        var self = this,
            widgets = [],
            okBtn,
            settings,
            sWidget,
            selectHighest;

        selectHighest = componentTypes
                .map(function (cInfo) {
                    return cInfo.cardinality;
                })
                .reduce(function (sum, card) {
                    return sum + card;
                }, 0) <= MAX_NUMBER_OF_PANELS;

        function getSelectedIds() {
            var nodeIds = [],
                j,
                i;

            // Account for the settings widget.
            for (i = 0; i < widgets.length; i += 1) {
                for (j = 0; j < widgets[i].getValue(); j += 1) {
                    nodeIds.push(widgets[i].propertyID);
                }
            }

            return nodeIds;
        }

        function onChange(/*value*/) {
            var nodeIds = getSelectedIds(),
                ok = true;

            if (nodeIds.length === 0) {
                ok = false;
            } else if (nodeIds.length > MAX_NUMBER_OF_PANELS) {
                ok = false;
                self.notifyUser({
                    severity: 'warning',
                    message: 'Currently no more than ' + MAX_NUMBER_OF_PANELS + ' panels supported.'
                });
            }

            okBtn.disable(!ok);
        }

        componentTypes.forEach(function (cInfo) {
            var entry = $('<div class="form-group">'),
                widget = new IntegerWidget({
                    value: selectHighest ? cInfo.cardinality : 0,
                    minValue: 0,
                    maxValue: cInfo.cardinality,
                    name: cInfo.name,
                    id: cInfo.id
                });

            widget.onFinishChange(onChange);
            widgets.push(widget);

            entry.append($('<div class="col-sm-6 control-label">')
                .text(cInfo.name + ' (' + cInfo.cardinality + ')')
                .attr('title', 'There are ' + cInfo.cardinality + ' ' + cInfo.name + '(s)' + ' from path [' +
                    cInfo.id + '].'
                ));

            entry.append($('<div class="col-sm-6 controls">').append(widget.el));

            self._configForm.append(entry);
        });

        self._configForm.append($('<div class="configuration-title">Settings</div>'));
        settings = $('<div class="form-group">');
        settings.append($('<div class="col-sm-6 control-label">').text('Step Animation Time [ms]'));

        sWidget = new IntegerWidget({
            value: 2000,
            minValue: 0,
            name: 'stepTime',
            id: 'stepTime'
        });

        settings.append($('<div class="col-sm-6 controls">').append(sWidget.el));

        self._configForm.append(settings);
        self._configForm.append(settings);

        okBtn = $('<a href="#" class="btn btn-sm btn-primary btn-config">OK</button>');

        okBtn.disable(!selectHighest);

        okBtn.on('click', function () {
            var nodeIds = getSelectedIds(),
                delay = sWidget.getValue();

            self._components = nodeIds;

            widgets.forEach(function (w) {
                w.remove();
            });

            sWidget.remove();

            okBtn.off('click');

            self._configForm.empty();
            self._configContainer.hide();
            self.setTitle('');
            self._el.addClass('simulation-mode');

            callback(nodeIds, delay);
        });

        this._configForm
            .append($('<div class="form-group btn-container">')
                .append($('<div class="col-sm-9 controls">'))
                .append($('<div class="col-sm-3 controls">').append(okBtn)));

        this._configContainer.show();
    };

    ContainerWidget.prototype.removeNode = function (gmeId) {
        var desc = this.nodes[gmeId];
        this._el.append('<div>Removing node "' + desc.name + '"</div>');
        delete this.nodes[gmeId];
    };

    ContainerWidget.prototype.showProgressbar = function () {
        this._loader.start();
    };

    ContainerWidget.prototype.hideProgressbar = function () {
        this._loader.stop();
    };

    ContainerWidget.prototype.destroy = function () {
        // The inner panels are destroyed by the controller.
    };

    ContainerWidget.prototype.onActivate = function () {
        this._logger.debug('ContainerWidget has been activated');
    };

    ContainerWidget.prototype.onDeactivate = function () {
        this._logger.debug('ContainerWidget has been deactivated');
    };

    return ContainerWidget;
});
