/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Fri Apr 07 2017 15:16:26 GMT-0500 (Central Daylight Time).
 */

define(['widgets/DiagramDesigner/DiagramDesignerWidget'], function (DiagramDesignerWidget) {
    'use strict';

    var BIPExecutionVizWidget,
        WIDGET_CLASS = 'bip-execution-viz';

    BIPExecutionVizWidget = function (params, container) {
        params = params || {};
        params.loggerName = 'gme:Widgets:ModelEditor:ModelEditorWidget';

        params.tabsEnabled = true;
        params.addTabs = false;
        params.deleteTabs = false;
        params.reorderTabs = false;
        params.gridSize = 1;
        // Routing manager is switched based on context
        params.defaultConnectionRouteManagerType = 'basic';
        params.disableConnectionRendering = true;

        this._hideAllEditToolbarBtns = true;

        DiagramDesignerWidget.call(this, container, params);
        this._lineStyleControls = false;

        container.addClass(WIDGET_CLASS);
        this.logger.debug('ModelEditorWidget ctor');
    };

    _.extend(BIPExecutionVizWidget.prototype, DiagramDesignerWidget.prototype);

    return BIPExecutionVizWidget;
});
