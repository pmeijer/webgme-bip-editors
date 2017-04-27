/*globals define, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed Apr 26 2017 17:14:44 GMT-0500 (Central Daylight Time).
 */

define([
    'blob/BlobClient',
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames',
    './BIPExecutionVizInnerPanel',
    'q',
    'text!./SwitchableRoutesEngineOutput.json'
], function (BlobClient,
             CONSTANTS,
             GMEConcepts,
             nodePropertyNames,
             InnerPanel,
             Q,
             TEST_DATA) {

    'use strict';
    var RESULT_ATTR = 'engineOutput',
        TEST = true;

    function ContainerControl(options) {

        this.logger = options.logger.fork('Control');

        this._client = options.client;
        this._widget = options.widget;
        this._layoutManager = options.layoutManager;

        this._currentNodeId = null;
        this._panels = [];

        this._blobClient = new BlobClient({logger: this.logger.fork('BlobClient')});
        this._resultData = null;

        if (TEST === true) {
            this._resultData = JSON.parse(TEST_DATA);
        }

        this._step = -1;
        this._internalStep = 0;

        this.logger.debug('ctor finished');
    }

    ContainerControl.prototype._configureSimulation = function (nodeIds) {
        var self = this,
            cnt;

        function innerPanelReady() {
            cnt -= 1;

            if (cnt === 0) {
                alert('All panels ready!');
                self._panels.forEach(function(p) {
                    p.control.initializeSimulation(self._resultData);
                });

                self.startSimulationBtn.enabled(true);
                self._step = 0;
            }

            if (cnt < 0) {
                self.logger.error('cnt < ', cnt);
            }
        }

        if (TEST === true) {
            nodeIds = ['/f/t/1'];
        }

        cnt = nodeIds.length;

        nodeIds.forEach(function (nodeId) {
            var p = new InnerPanel(self._layoutManager, {client: self._client});

            self._panels.push(p);
            self._widget.addInnerPanel(p);

            p.control.uiLoaded = innerPanelReady;
            p.control.selectedObjectChanged(nodeId);
        });
    };

    ContainerControl.prototype._stepSimulation = function () {
        var self = this,
            promises;

        self.startSimulationBtn.enabled(false);

        promises = this._panels.map(function (p) {
            return p.control.stepSimulation(self._resultData.output[self._step], self._internalStep);
        });

        Q.all(promises)
            .then(function (res) {
                self.startSimulationBtn.enabled(true);

                if (res.indexOf(true) > -1) {
                    self._internalStep += 1;
                } else {
                    self._internalStep = 0;
                    self._step += 1;
                }

                if (self._step >= self._resultData.output.length) {
                    alert('Simulation ended');
                    self._step = 0;
                    self._internalStep = 0;
                }
            })
            .catch(function (err) {
                self.logger.error('Simulation step failed!', err);
            });
    };

    ContainerControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            self = this;

        this._panels.forEach(function (p) {
            p.destroy();
        });

        this._configured = false;
        this._panels = [];
        // Remove current territory patterns
        if (self._currentNodeId) {
            self._client.removeUI(self._territoryId);
        }

        self._currentNodeId = nodeId;
        self._currentNodeParentId = undefined;

        if (typeof self._currentNodeId === 'string') {
            // Put new node's info into territory rules
            self._selfPatterns = {};
            self._selfPatterns[nodeId] = {children: 0};  // Territory "rule"

            self._widget.setTitle(desc.name.toUpperCase());

            self._territoryId = self._client.addUI(self, function (events) {
                self._eventCallback(events);
            });

            // Update the territory
            self._client.updateTerritory(self._territoryId, self._selfPatterns);
        }
    };

    /* * * * * * * * Node Event Handling * * * * * * * */
    ContainerControl.prototype._eventCallback = function (events) {
        var i = events ? events.length : 0,
            event;

        while (i--) {
            event = events[i];
            switch (event.etype) {

                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._onLoad(event.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(event.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    this._onUnload(event.eid);
                    break;
                default:
                    break;
            }
        }
    };

    ContainerControl.prototype._onLoad = function (gmeId) {
        var self = this,
            node,
            blobHash;

        node = this._client.getNode(gmeId);

        this._resultData = null;
        this._widget.showProgressbar();
        this.configureSimulationBtn.enabled(false);

        blobHash = node ? node.getAttribute(RESULT_ATTR) : null;

        if (blobHash) {
            this._blobClient.getObjectAsJSON(blobHash)
                .then(function (resultData) {
                    self._resultData = resultData;
                    self._client.notifyUser({
                        message: 'Current Project has attached results! To start result simulation use tool-bar.',
                        severity: 'success'
                    });

                    self._widget.hideProgressbar();
                    self.configureSimulationBtn.enabled(true);
                })
                .catch(function (err) {
                    self._client.notifyUser({
                        message: 'Failed obtaining engineOutput from Project.',
                        severity: 'error'
                    });

                    self.logger(err);
                    self._widget.hideProgressbar();
                });

        } else {
            this._widget.hideProgressbar();
        }
    };

    ContainerControl.prototype._onUpdate = function (gmeId) {

    };

    ContainerControl.prototype._onUnload = function (gmeId) {
        if (this._configured) {
            this._widget.nodeRemoved();
        }
    };

    ContainerControl.prototype._getObjectDescriptor = function (nodeId) {
        var node = this._client.getNode(nodeId),
            objDescriptor;
        if (node) {
            objDescriptor = {
                id: node.getId(),
                name: node.getAttribute(nodePropertyNames.Attributes.name),
                childrenIds: node.getChildrenIds(),
                parentId: node.getParentId()
            };
        }

        return objDescriptor;
    };

    ContainerControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        if (this._currentNodeId === activeObjectId) {
            // The same node selected as before - do not trigger
        } else {
            this.selectedObjectChanged(activeObjectId);
        }
    };

    /* * * * * * * * Visualizer life cycle callbacks * * * * * * * */
    ContainerControl.prototype.destroy = function () {
        this._detachClientEventListeners();
        this._removeToolbarItems();
    };

    ContainerControl.prototype._attachClientEventListeners = function () {
        this._detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    ContainerControl.prototype._detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    ContainerControl.prototype.onActivate = function () {
        this._attachClientEventListeners();
        this._displayToolbarItems();

        if (typeof this._currentNodeId === 'string') {
            WebGMEGlobal.State.registerActiveObject(this._currentNodeId, {suppressVisualizerFromNode: true});
        }
    };

    ContainerControl.prototype.onDeactivate = function () {
        this._detachClientEventListeners();
        this._hideToolbarItems();
    };

    /* * * * * * * * * * Updating the toolbar * * * * * * * * * */
    ContainerControl.prototype._displayToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].show();
            }
        } else {
            this._initializeToolbar();
        }
    };

    ContainerControl.prototype._hideToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].hide();
            }
        }
    };

    ContainerControl.prototype._removeToolbarItems = function () {

        if (this._toolbarInitialized === true) {
            for (var i = this._toolbarItems.length; i--;) {
                this._toolbarItems[i].destroy();
            }
        }
    };

    ContainerControl.prototype._initializeToolbar = function () {
        var toolBar = WebGMEGlobal.Toolbar,
            self = this;

        this._toolbarItems = [];

        // Configure btn
        this.configureSimulationBtn = toolBar.addButton(
            {
                title: 'Configure simulation',
                icon: 'fa fa-cogs',
                clickFn: function (/*data*/) {
                    self._configureSimulation();
                }
            });

        this._toolbarItems.push(this.configureSimulationBtn);
        this.configureSimulationBtn.enabled(false);

        // Start btn
        this.startSimulationBtn = toolBar.addButton(
            {
                title: 'Start simulation',
                icon: 'fa fa-film',
                clickFn: function (/*data*/) {
                    self._stepSimulation();
                }
            });

        this._toolbarItems.push(this.startSimulationBtn);
        this.startSimulationBtn.enabled(false);

        // this.nextFrameBtn = toolBar.addButton(
        //     {
        //         title: 'Next frame',
        //         icon: 'fa fa-film',
        //         clickFn: function (/*data*/) {
        //             if (self._step < 0) {
        //                 self._initializeSimulation();
        //             } else {
        //                 self.startSimulationBtn.enabled(false);
        //                 Q.all([self._stepSimulation(self._resultData.output[self._step], self._internalStep)])
        //                     .then(function (res) {
        //                         self.startSimulationBtn.enabled(true);
        //                         if (res.indexOf(true) > -1) {
        //                             self._internalStep += 1;
        //                         } else {
        //                             self._internalStep = 0;
        //                             self._step += 1;
        //                         }
        //
        //                         if (self._step >= self._resultData.output.length) {
        //                             alert('Simulation ended');
        //                             self._step = 0;
        //                             self._internalStep = 0;
        //                         }
        //                     })
        //                     .catch(function (err) {
        //                         self.logger.error('Simulation step failed!', err);
        //                     });
        //             }
        //         }
        //     });
        //
        // this._toolbarItems.push(this.nextFrameBtn);
        this.startSimulationBtn.enabled(false);

        this._toolbarInitialized = true;
    };

    return ContainerControl;
});
