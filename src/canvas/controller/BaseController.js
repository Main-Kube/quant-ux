import hash from '../../dojo/hash'
import lang from '../../dojo/_base/lang'

import Core from '../../core/Core'
import CoreUtil from '../../core/CoreUtil'
import Logger from '../../common/Logger'
import ModelDB from './ModelDB'
import * as CollabUtil from './CollabUtil'
import CollabService from './CollabService'
import ModelFixer from './ModelFixer'
export default class BaseController extends Core {

  constructor (params){
		super()
		this.logger = new Logger("BaseController");
		this.mode = 'private'

		if(params && params.mode){
			this.mode = params.mode;
		}

		this.debug = false
		this.active = true
		this.transactions = {}
		this.modelDB = new ModelDB()
		this.collabService = new CollabService()


		this.logger.log(1,"constructor", "entry > " + this.mode);
		this.commandStack =  {stack : [], pos : 0, id:0};
		this._lastChangedWidgets = {};
	}


	/**********************************************************************
	 * Dependencies
	 **********************************************************************/

	setPublic (isPublic) {
		if (isPublic) {
			this.mode = 'public'
		}
	}

	setModelService (s) {
		this.modelService = s
	}

	setCanvas (c){
		this.logger.log(3,"setCanvas", "entry");
		this._canvas = c;
	}

	setToolbar (t){
		this.logger.log(3,"setToolbar", "entry");
		this.toolbar = t;
	}

	setModelFactory (f){
		this.logger.log(3,"setModelFactory", "entry");
		/**
		 * Just used for templated widgets...
		 */
		this.factory = f;
	}

	/**
	 * Method is called on first load. Inits the
	 */
	setModel (m, screenID){
		this.logger.log(-1,"setModel", "entry > " + screenID);

		this.model = m;
		this.oldModel = lang.clone(m);
		this.collabService.setModel(m)

		/**
		 * Apply model fixes here that might happen
		 *due to this crappy software
		 */
		ModelFixer.fixNegativeCoords(m);
		ModelFixer.fixZValues(m);
		ModelFixer.fixModelCount(m);

		this.render(screenID);

		if(this.toolbar){
			this.toolbar.setModel(m);
		} else {
			this.logger.log(2,"setModel", "No toolbar");
		}

		if (this._canvas) {
			this._canvas.setFonts(m.fonts)
			this._canvas.setModel(this.model)
		}

		/**
		 * Load model from local db and check if we have
		 * a newer version
		 */
		this.modelDB.get(m.id).then(localModel => {
			this.checkModel(localModel)
		})
	}

	checkModel (localModel) {
		this.logger.log(2,"checkModel", "enter");
		if (localModel && this.model) {
			this.logger.log(-1,"checkModel", "enter :"  + localModel.lastUpdate  + ' > ' + this.model.lastUpdate);
			if (localModel.lastUpdate > this.model.lastUpdate) {
				this.logger.error("checkModel", "error > Local mode not the newer: " + localModel.lastUpdate  + ' > ' + this.model.lastUpdate);
				this.logger.sendError(new Error('Local Model is newer'))

				/**
				 * This is tricky. Thing of the following scenarios:
				 *
				 * 1) User A is offline and the local model is last edited at t1 (e.g. 12h). The server
				 * model is still at t0 (e.g. 11h). In thsi case we should patch the model.
				 *
				 * 2) What happens if we have concurrent editing? User B edits at 13h, and misses A's changes. We would not warn,
				 * because the server version is newer. A's changesa are lost.
				 *
				 * 3) Now let's assume B changes the last time at 11:30h. In this case A's changes are newer and
				 * woudl win.
				 *
				 */
				/*
				if (this.toolbar) {
					this.toolbar.showOutOFSyncError(localModel, result => {
						console.debug(result)
					})
				}
				*/
			}
		}
	}

	setMode (mode, forceRender){
		this.logger.log(2,"setMode", "entry > " + mode);
		this._canvas.setMode(mode, forceRender);
	}

	setSinglePage (enabled){
		this.logger.log(0,"setSinglePage", "entry > " + enabled);
	}


	getZoomFactor (){
		if(this._canvas){
			return this._canvas.getZoomFactor();
		}
		return 1;
	}

	onExit (){
		this.logger.log(-1,"onExit", "enter > " );
		this.active = false;
	}

	/**********************************************************************
	 * Selection methods
	 **********************************************************************/

	onRulerSelected (screenID, rulerID) {
		this.logger.log(0 ,"onRulerSelected", "enter > ");
		if(this.toolbar){
			var screen = this.model.screens[screenID];
			if (screen) {
				let ruler = screen.rulers.find(r => r.id === rulerID)
				if (ruler) {
					this.toolbar.onRulerSelected(screen, ruler);
				}
			}
		}
	}

	onWidgetSelected (id){
		this.logger.log(3,"onWidgetSelected", "enter > "+ id);
		var widget = this.model.widgets[id];
		if(this.toolbar){
				this.toolbar.onWidgetSelected(widget);
		}
	}

	onInheritedWidgetSelected (widget) {
		this.logger.log(3,"onInheritedWidgetSelected", "enter > "+ widget.id);

		if(this.toolbar){
			this.toolbar.onInheritedWidgetSelected(widget);
		}
	}


	onScreenSelected (id){
		this.logger.log(1,"onScreenSelected", "enter > "+ id);
		var screen = this.model.screens[id];
		if(this.toolbar){
			this.toolbar.onScreenSelected(screen);
		}
	}

	onCanvasSelected (){
		this.logger.log(1,"onCanvasSelected", "enter ");
		if(this.toolbar){
			this.toolbar.onCanvasSelected();
		}
	}

	onLineSelected (id){
		this.logger.log(1,"onLineSelected", "enter > " + id);
		var line = this.model.lines[id];
		if(this.toolbar){
			this.toolbar.onLineSelected(line);
		}
	}

	onMultiSelect (selection){
		this.logger.log(1,"onMultiSelect", "enter > ");
		if(this.toolbar){
			/**
			 * TODO: get all the model elements
			 */
			this.toolbar.onMultiSelect(selection);
		}
	}

	onGroupSelected (id){
		this.logger.log(1,"onGroupSelected", "enter > " + id);
		if(this.model.groups && this.model.groups[id]){
			if(this.toolbar){
				var group = this.model.groups[id];
				this.toolbar.onGroupSelect(group);
			}
		}
	}

	/**********************************************************************
	 * Model change methods
	 **********************************************************************/


	onModelChanged (changes){
		this.logger.log(-1,"onModelChanged", "enter");
		if (!changes) {
			console.warn('onModelChanged()', 'No Changes')
		}
		if (this.active) {

			/**
			 * Update the view model too! This is super important
			 * for all child widgets that might other wise not be
			 * correctly updated. This should normally
			 * not require a new rendering!
			 */
			if (this._canvas){
				let inheritedModel = CoreUtil.createInheritedModel(this.model)
				this._canvas.renderPartial(inheritedModel, changes);
			}

			if (this.toolbar){
				this.toolbar.updatePropertiesView();
			}

			this.model.lastUpdate = new Date().getTime();

			var s = JSON.stringify(this.model);
			this.model.size = s.length;

			this.setDirty();

			this.emit('change', this.model)
		} else {
			this.logger.log(1,"onModelChanged", "Exit because not active");
		}
	}

	setDirty (){
		this._dirty = true;
		if (this.debug){
			this.saveModelChanges();
		} else {
			setTimeout(lang.hitch(this, "saveModelChanges"), 300);
		}
	}

	async saveModelChanges () {

		if (this.mode == "public"){
			this.showSuccess("Please register to save changes...");
			ModelFixer.validateAndFixModel(this.model);
			this.emit("notSavedWarningShow", this.model);
		} else {
			if (this._dirty){
				if (this.oldModel) {

					/**
					 * Validate and fix model
					 */
					 ModelFixer.validateAndFixModel(this.model);

					/**
					 * compute changes and send them to server
					 */
					var changes = CollabUtil.getModelDelta(this.oldModel, this.model);
					this.logger.log(4,"saveModelChanges", "Save changes " + changes.length);
					if (changes.length > 0) {
						/**
						 * We start a transaction, and we will close it.
						 */
						let transactionId = this.startTransaction(transactionId)
						this.modelService.updateApp(this.model, changes).then(res => {
							this.endTransaction(transactionId)
							this.onModelUpdated(res);
						}).catch(err => {
							this.logger.error("saveModelChanges", "Something wenrt wrong with the rest", err);
							this.showError("Could not reach server! Changes not saved!");
						})

						/**
						 * Since 4.2 we broadcast changes
						 */
						this.collabBroadcastChanges(changes)

					} else {
						this.logger.error("saveModelChanges", "Triggered without getting change! We send entire model");
						let res = await this.modelService.saveApp(this.model)
						this.onModelSaved(res);
					}
					this._dirty = false;
				} else {
					console.warn("saveModelChanges() > No oldModel!", this);
				}

				/**
				 * Store the model in case of network failure.
				 */
				this.storeModel(this.model)

				/**
				 * Clone currrent model as old model, so we can later again compute deltas
				 */
				this.setOldModel(this.model);
			}
		}
	}

	async onModelUpdated (response){
		/**
		 * Some server shit might happen. In this case we
		 * save the entire app.
		 */
		if(response && response.type === "error") {
			this.logger.error("onModelUpdated", "Error while partial save. ");
			let res = await this.modelService.saveApp(this.model)
			this.onModelSaved(res)
			this.logger.sendError("onModelUpdated", new Error("Could not update. Check Server Log"));
		} else {
			this.showSuccess("Model Updated!");
		}
	}

	onModelSaved (){
		this.logger.error("onModelSaved", "Should not have been called!");
		this.showSuccess("Model Saved!");
	}

	setOldModel (model) {
		this.oldModel = lang.clone(model);
	}


	/***************************************************************************************
	 *  Collab stuff
	 ***************************************************************************************/

	setModelChangeListener (callback) {
		this.collabChangeListener = callback
	}

	collabBroadcastChanges (changes) {
		this.logger.log(-1, "collabBroadcastChanges", "enter " , changes);

		if (this.collabService && this.collabChangeListener) {
			let event = this.collabService.createEvent(changes)
			this.collabChangeListener(event)
		}

	}

	collabRecieveChanges (user, event) {
		this.logger.log(1, "collabRecieveChanges", "enter " , event);

		/**
		 * Apply changes
		 */
		this.model = this.collabService.applyEvent(this.model, event)
		this.setOldModel(this.model)

		/**
		 * Rerender
		 */
		this.render();


		/**
		 * What about updating import and such?
		 */
		 this.logger.log(-1, "collabRecieveChanges", "exit " , this.model.lastUUID);
	}


	/***************************************************************************************
	 *  Local model Storage & transactions
	 ***************************************************************************************/


	storeModel (model) {
		this.logger.log(3, "storeModel", "enter " );
		this.modelDB.save(model)
	}

	startTransaction (changes) {
		let id = new Date().getTime() + '_' + Math.round(Math.random() * 1000)
		this.transactions[id] = {
			id: id,
			ts: new Date().getTime(),
			changes: changes
		}
		/**
		 * FIXME: We should think here about a good strategy for dealing with errors.
		 * We could:
		 *  - Think about persisting the changes and fire them again?
		 *  - Check on reload if there are open changes and fire and apply them again?
		 *  - We should in this case also save the entire model.... check the last update???
		 */
		this.logger.log(3, "startTransaction", "enter " + id);
		setTimeout(() => this.checkTransaction(id, 0), 3000)
		return id
	}

	checkTransaction (id, number) {

		/**
		 * If we still have a transaction id in our list, this means the
		 * is potentially and issue. We
		 */
		if (this.transactions[id]) {
			this.logger.log(1, "checkTransaction", "enter #" + number, this.transactions[id].ts);
			if (number < 4) {
				/**
				 * For now we just log that that a transaction failed.
				 * We should consoder resending!
				 */
				setTimeout(() => this.checkTransaction(id, number + 1), 3000)
			} else {
				/**
				 * here something is really wrong!
				 */
				this.logger.sendError("checkTransaction", new Error("Some transaction not done!"));
			}
		}
	}

	endTransaction (id) {
		this.logger.log(3, "endTransaction", "enter " + id);
		let transaction = this.transactions[id]
		if (transaction) {
			this.logger.log(2, "endTransaction", "time " + (new Date().getTime() - transaction.ts));
		}
		delete this.transactions[id]
	}


	/**********************************************************************
	 * Canvas Delegates
	 **********************************************************************/

	onWidgetNameChange (widget) {
		if (this._canvas) {
			this._canvas.setWidgetName(widget)
		}
	}

	onScreenNameChange (widget) {
		if (this._canvas) {
			this._canvas.setScreenName(widget)
		}
	}

	onGroupNameChange (group) {
		if (this._canvas) {
			this._canvas.setGroupName(group)
		}
	}

	/**
	 * Since 3.0.29 we have a sepcial isResize to maake the fast render faster
	 */
	render (screenID, isResize = false){
		this.logger.log(2,"render", "enter > screenID : " + screenID);
		if(this._canvas){
			/**
			 * resize the model.
			 */
			let inheritedModel = CoreUtil.createInheritedModel(this.model)
			requestAnimationFrame(() => {
				this._canvas.render(inheritedModel, isResize);
				if(screenID){
					this._canvas.moveToScreen(screenID);
				}
			});
		}
	}

	/**
	 * Notify the canvas that there has been some changes in widget positions!
	 */
	onWidgetPositionChange () {
		this.logger.log(2,"onWidgetPositionChange", "enter");
		if(this._canvas){
			/**
			 * resize the model
			 *
			 */
			let inheritedModel = CoreUtil.createInheritedModel(this.model)
			requestAnimationFrame(() => {
				this._canvas.onWidgetPositionChange(inheritedModel);
			});
		}
	}




	renderWidget (widget, type){
		this.logger.log(0,"renderWidget", "enter > type : ", type);
		if (widget) {

			/**
				* In case we have a templated or design token widget, we
				* kick of a complete rendering. This is to make sure that we
				* merge in all teh style. This does not hurt too much, because
				* we have the partical rendering now.
				* TODO: We could use the ModelUtil and inline the template and
				*  the design tokens
			 */
			if(widget.template || widget.designtokens){

				this.render();
			} else {
				/**
				 * W have to set a zoomed model! Otherwise so UI widgets that use the
				 * box size to compute some layout stuff ( e.g. icon size) have issues.
				 *
				 * FIXME: Also, there seems to be an issues when (data) props are updated!
				 * e.g. table or spinner do not update!
				 *
				 * FIXME: Also add children in case it is an container widget!
				 */
				// let designTokenWidget = ModelUtil.inlineBoxDesignToken


				this._canvas.setWidgetStyle(widget.id, widget.style, widget);

				if (type === 'props') {
					this._canvas.updateWidgetDataView(widget);
				}
			}
		} else {
			this.logger.error("renderWidget", "No widget passed for type" + type);
			this.logger.sendError(new Error("Controller.renderWidget() No widget"));
		}
	}

	renderScreen (screen){
		/**
		 * Suppose the model was already updated
		 */
		if(this._canvas){
			this._canvas.setScreenStyle(screen.id, screen.style);
		}
	}

	unSelect (){
		if(this._canvas){
			this._canvas.unSelect();
		}
		if(this.toolbar){
			this.toolbar.cleanUp();
		}
	}

	/**********************************************************************
	 * Tools
	 **********************************************************************/


	updateCreateWidget (){
		this.toolbar.toolUpdateWidgetButton();
	}

	renderCopyPasteStyleEnd (){
		this.toolbar.toolCopyPasteStyleEnd();
	}

	renderAlignEnd (){
		this.toolbar.toolAlignEnd();
	}

	showSuccess (msg){
		if(this._canvas){
			this._canvas.showSuccess(msg);
		}
	}

	showError (msg){
		if(this._canvas){
			this._canvas.showError(msg);
		}
	}

	/**********************************************************************
	 * on save as
	 **********************************************************************/
	async onSaveAs (oldModel, newName){
		/**
		 * Create a new version
		 */
		let app = await this.modelService.copyApp(oldModel, newName)
		// var app = this._doPost("rest/apps/copy/" +oldModel.id, {"name" : newName});
		this.logger.log(0, "onSaveAs", "New app" + app.id);
		return app;
	}

	async onSaveAsAfterSignUp (oldModel, newName){
		/**
		 * Create a new version
		 */
		oldModel.name = newName;
		oldModel.parent = oldModel.id;
		delete oldModel.id;
		delete oldModel._id;
		var app = await this.modelService.createApp(oldModel)
		hash("/apps/" + app.id + ".html");
		this.logger.log(0, "onSaveAsAfterSignUp", "New app" + app.id);
	}

	/**********************************************************************
	 * Fonts
	 **********************************************************************/
	async setFonts (fonts) {
		this.logger.log(0, "setFonts", "enter > ", fonts);
		this.model.fonts = fonts;
		/**
		 * We have to do a hard save here, because the delta somehow produces
		 * on the server null elements
		 */
		let res = await this.modelService.saveApp(this.model)
		if (res) {
			if (this._canvas){
				this._canvas.setFonts(fonts);
			}
			if (this.toolbar){
				this.toolbar.updateFontFamilies()
			}
		}
	}

	/**********************************************************************
	 * Imports
	 **********************************************************************/

	async setImports (imports) {
		this.logger.log(0, "setFonts", "enter > ", imports);
		this.model.imports = imports;
		/**
		 * We have to do a hard save here, because the delta somehow produces
		 * on the server null elements
		 */
		let res = await this.modelService.saveApp(this.model)
		if (res) {
			if (this.toolbar){
				this.toolbar.updateImports()
			}
		}
	}

	/**********************************************************************
	 * Grid
	 **********************************************************************/

	removeGrid (){

		var command = {
			timestamp : new Date().getTime(),
			type : "SetGrid",
			n : null,
			o : this.model.grid
		};
		this.addCommand(command);

		/**
		 * update model
		 */
		this.modelSetGrid(null);

		this.render();
	}

	setGrid (width, height, color, style,visible, enabled){

		/**
		 * create the command
		 */
		var grid = {
			w : width,
			h : height,
			color : color,
			style : style,
			visible:visible,
			enabled:enabled
		};


		var command = {
			timestamp : new Date().getTime(),
			type : "SetGrid",
			n : grid,
			o : this.model.grid
		};
		this.addCommand(command);

		/**
		 * update model
		 */
		this.modelSetGrid(grid);

		this.render();
	}

	setGrid2 (grid, color, style){

		/**
		 * mixing color
		 */
		grid.color = color;
		grid.style = style;

		var command = {
			timestamp : new Date().getTime(),
			type : "SetGrid",
			n : grid,
			o : this.model.grid
		};
		this.addCommand(command);

		/**
		 * update model
		 */
		this.modelSetGrid(grid);

		this.render();
	}

	modelSetGrid (grid){
		this.model.grid = grid;
		this.onModelChanged([{type: 'grid', action:"add"}]);
	}


	undoSetGrid (command){
		this.modelSetGrid(command.o);
		this.render();
	}

	redoSetGrid (command){
		this.modelSetGrid(command.n);
		this.render();
	}

	/**********************************************************************
	 * Add Action
	 **********************************************************************/



	addAction (widgetID, action, isGroup){
		var command = {
			timestamp : new Date().getTime(),
			type : "AddAction",
			model : action,
			modelID : widgetID,
			isGroup: isGroup
		};
		this.addCommand(command);

		this.modelAddAction(widgetID, action, isGroup);
	}

	modelAddAction (widgetID, action, isGroup){
		if(isGroup){
			var group = this.model.groups[widgetID];
			if(group){
				group.action = action;
			} else {
				console.warn("modelRemoveAction() > No group with ID", widgetID)
			}
		} else {
			var widget = this.model.widgets[widgetID];
			if(widget){
				widget.action = action;
			} else {
				console.warn("modelRemoveAction() > No widgte with ID", widgetID)
			}
		}
		this.onModelChanged([{type: 'grid', action:"add"}]);
	}

	undoAddAction (command){
		var action = command.model;
		var id = command.modelID;
		this.modelRemoveAction(id, action, command.isGroup);
		this.render();
	}

	redoAddAction (command){
		var action = command.model;
		var id = command.modelID;
		this.modelAddAction(id, action, command.isGroup);
		this.render();
	}

	/**********************************************************************
	 * Remove Action
	 **********************************************************************/


	removeAction (widgetID, action, isGroup){
		var command = {
			timestamp : new Date().getTime(),
			type : "RemoveAction",
			model : action,
			modelID: widgetID,
			isGroup: isGroup
		};
		this.addCommand(command);

		this.modelRemoveAction(widgetID, action, isGroup);
	}

	modelRemoveAction (widgetID, action, isGroup){

		if(isGroup){
			var group = this.model.groups[widgetID];
			if(group){
				delete group.action;
			} else {
				console.warn("modelRemoveAction() > No group with ID", widgetID)
			}
		} else {
			var widget = this.model.widgets[widgetID];
			if(widget){
				delete widget.action;
			} else {
				console.warn("modelRemoveAction() > No widgte with ID", widgetID)
			}
		}

		this.onModelChanged([{type: 'grid', action:"remove"}]);
	}


	undoRemoveAction (command){
		var action = command.model;
		var id = command.modelID;
		this.modelAddAction(id, action, command.isGroup);
		this.render();
	}

	redoRemoveAction (command){
		var action = command.model;
		var id = command.modelID;
		this.modelRemoveAction(id, action, command.isGroup);
		this.render();
	}

	/**********************************************************************
	 * update Action
	 **********************************************************************/
	updateAction (widgetID, action, isGroup) {
		var command = {
			timestamp : new Date().getTime(),
			type : "ActionAction",
			modelID: widgetID,
			n: action,
			o: this.getActionById(widgetID, isGroup),
			isGroup: isGroup
		};
		this.addCommand(command);

		this.modelUpdateAction(widgetID, action, isGroup);
	}

	getActionById (id, isGroup) {
		if (isGroup){
			var group = this.model.groups[id];
			return group.action;
		} else {
			var widget = this.model.widgets[id];
			return widget.action;
		}
	}

	modelUpdateAction (widgetID, action, isGroup) {
		if(isGroup){
			var group = this.model.groups[widgetID];
			if(group){
				group.action = action;
			} else {
				console.warn("modelUpdateAction() > No group with ID", widgetID)
			}
		} else {
			var widget = this.model.widgets[widgetID];
			if(widget){
				widget.action = action;
			} else {
				console.warn("modelUpdateAction() > No widgte with ID", widgetID)
			}
		}

		this.onModelChanged([{type: 'grid', action:"update"}]);
	}

	undoActionAction (command){
		var action = command.o;
		var id = command.modelID;
		this.modelUpdateAction(id, action, command.isGroup);
		this.render();
	}

	redoActionAction (command){
		var action = command.n;
		var id = command.modelID;
		this.modelUpdateAction(id, action, command.isGroup);
		this.render();
	}


	/**********************************************************************
	 * Add Line
	 **********************************************************************/

	addLine (line){

		/**
		 * here comes already the correct model.
		 * we do not have to do anything more,
		 * just add an uuid
		 */
		line.id = "l"+this.getUUID();
		var zoom = this._canvas.getZoomFactor();
		for(var i=0; i< line.points.length; i++){
			this.getUnZoomedBox(line.points[i], zoom);
		}

		/**
		 * create the command
		 */
		var command = {
			timestamp : new Date().getTime(),
			type : "AddLine",
			model : line
		};
		this.addCommand(command);

		/**
		 * update model
		 */
		this.modelAddLine(line);

		this.render();

		if(this.toolbar){
			//this.toolbar.showLineAction(line)
		}
	}

	modelAddLine (line){
		if(!this.model.lines[line.id]){
			this.model.lines[line.id] = line;
			this.onModelChanged([{type: 'line', action:"add", id:line.id}]);
		} else {
			console.warn("Could not add line", line);
		}
	}


	modelRemoveLine (line){

		if(this.model.lines[line.id]){
			delete this.model.lines[line.id];
			this.onModelChanged([{type: 'line', action:"remove", id:line.id}]);
		} else {
			console.warn("Could not delete line", line);
		}
	}

	undoAddLine (command){
		var line = command.model;
		this.modelRemoveLine(line);
		this.render();
	}

	redoAddLine (command){
		var line = command.model;
		this.modelAddLine(line);
		this.render();
	}


	/**********************************************************************
	 * Add Line
	 **********************************************************************/

	removeLine (line){

		/**
		 * create the command
		 */
		var command = {
			timestamp : new Date().getTime(),
			type : "RemoveLine",
			model : line
		};
		this.addCommand(command);

		/**
		 * update model
		 */
		this.modelRemoveLine(line);

		this.render();
	}

	undoRemoveLine (command){
		var line = command.model;
		this.modelAddLine(line);
		this.render();
	}

	redoRemoveLine (command){
		var line = command.model;
		this.modelRemoveLine(line);
		this.render();
	}

	/**********************************************************************
	 * Line Points
	 **********************************************************************/


	updateLinePoint (id, i, pos){
		this.logger.log(3,"updateLinePoint", "enter > line : " + id +  " > point : " + i);

		pos = this.getUnZoomedBox(pos, this._canvas.getZoomFactor());

		/**
		 * create the command
		 */
		var line = this.model.lines[id];
		if(line.points[i]){
			var point = line.points[i];
			var command = {
					timestamp : new Date().getTime(),
					type : "LinePointPosition",
					delta :{
						o : point,
						n : pos
					},
					i : i,
					modelId : id
			};
			this.addCommand(command);
		}



		/**
		 * update model!
		 */
		this.modelLinePointPosition(id, i, pos);
	}

	modelLinePointPosition (id, i, pos){
		var line = this.model.lines[id];
		if(line.points[i]){
			line.points[i] = pos;
		} else {
			console.warn("Could not update line point ", i, "in line", id);
		}

		this.onModelChanged([{type: 'line', action:"change", id:id}]);
	}

	undoLinePointPosition (command){
		this.modelLinePointPosition(command.modelId, command.i, command.delta.o);
		this.render();
	}

	redoLinePointPosition (command){
		this.modelLinePointPosition(command.modelId, command.i, command.delta.n);
		this.render();
	}

	/**********************************************************************
	 * Line Properties
	 **********************************************************************/
	updateLineProperties (id, key, value){
		this.logger.log(0,"updateLineProperties", "enter >key : " + key +  " > value : " + value);

		var line = this.model.lines[id];


		if(line){

			var command = {
				timestamp : new Date().getTime(),
				type : "LineProperties",
				key : key,
				delta :{
					o : line[key],
					n : value
				},
				modelId : id
			};
			this.addCommand(command);

			this.modelLineProperties(id, key, value);

			this.render();
		} else {
			console.warn("updateLineProperties() > No line with id " + id);
		}

	}


	modelLineProperties (id, key, value){
		var line = this.model.lines[id];

		if(line){
			line[key] = value;
			this.onModelChanged([{type: 'line', action:"change", id:id}]);
		} else {
			console.warn("modelLineProperties() > No line with id " + id);
		}
	}

	undoLineProperties (command){
		this.modelLineProperties(command.modelId, command.key, command.delta.o);
		this.render();
	}

	redoLineProperties (command){
		this.modelLineProperties(command.modelId, command.key, command.delta.n);
		this.render();
	}



	/**********************************************************************
	 * Line Properties
	 **********************************************************************/

	updateLineAllProperties (id, newLine){
		this.logger.log(0,"updateLineAllProperties", "enter >key : " + id );

		var line = this.model.lines[id];


		if(line){

			var command = {
				timestamp : new Date().getTime(),
				type : "LineAllProperties",
				delta :{
					o : line,
					n : newLine
				},
				modelId : id
			};
			this.addCommand(command);


			this.modelLineAllProperties(id, newLine);

			this.render();
		} else {
			console.warn("updateLineAllProperties() > No line with id " + id);
		}
	}


	modelLineAllProperties (id, newLine){

		var line = this.model.lines[id];

		if(line){
			this.model.lines[id] = newLine;
			this.onModelChanged([{type: 'line', action:"change", id:id}]);
		} else {
			console.warn("modelLineProperties() > No line with id " + id);
		}

	}

	undoLineAllProperties (command){
		this.modelLineAllProperties(command.modelId, command.delta.o);
		this.render();
	}

	redoLineAllProperties (command){
		this.modelLineAllProperties(command.modelId, command.delta.n);
		this.render();
	}

	/**********************************************************************
	 * Box
	 **********************************************************************/

	updateBox (pos, box){

		if(pos.y){
			box.y = pos.y;
		}

		if(pos.x){
			box.x = pos.x;
		}

		if(pos.h){
			box.h = pos.h;
		}

		if(pos.w){
			box.w = pos.w;
		}


		if(box.x < 0){
			box.x = Math.abs(box.x);
			console.warn("updateBox() > Something strange happened, box.x < 0 ...");
		}

		if(box.y < 0){
			box.y = Math.abs(box.y);
			console.warn("updateBox() > Something strange happened, pox.y < 0 ...");
		}
	}


	/**********************************************************************
	 * MulitCommand
	 **********************************************************************/

	undoMultiCommand (command){
		this.logger.log(0,"undoMultiCommand", "enter > " + command.id);

		for(var i=0; i< command.children.length; i++){
			var child = command.children[i];
			if(this["undo" + child.type]){
				this["undo"+ child.type](child);
			} else {
				console.warn("No Undo function defined for ", command);
			}
		}
	}

	redoMultiCommand (command){
		this.logger.log(0,"redoMultiCommand", "enter > " + command.id);

		for(var i=0; i< command.children.length; i++){
			var child = command.children[i];
			if(this["redo" + child.type]){
				this["redo"+ child.type](child);
			} else {
				console.warn("No Undo function defined for ", command);
			}
		}
	}

	/**********************************************************************
	 * CommandStack
	 **********************************************************************/


	async addCommand (command){

		if(!this.commandStack.lastUUID){
			this.commandStack.lastUUID = 0;
		}
		command.id = "c" + this.commandStack.lastUUID++;

		/**
		 * It might have happened that we have moved back in the stack via undo.
		 * if a new command comes, we throw away all newer commands.
		 */
		if(this.commandStack.pos < this.commandStack.stack.length){
			if(this.mode=="public"){
				this.onCommandDeleted(command);
			} else {
				var count = (this.commandStack.stack.length - this.commandStack.pos);
				this.modelService.deleteCommand(this.model, count).then(res => {
					this.logger.log(0,"addCommand", "cut off future! > " + count + " >> "  + res.pos);
					this.onCommandDeleted(command)
				}).catch(err => {
					this.logger.error("addCommand", "ERROR deleteing", err);
					this.showError('Could not reach server! Changes not saved')
				})
			}
		} else {
			this.postCommand(command);
		}
		this.emit("commandAdded", this.commandStack.stack.length);
	}

	onCommandDeleted (command){

		/**
		 * just remove the command. also update the pos, altough it should be updated
		 * in the next step
		 */
		// var count = (this.commandStack.stack.length - this.commandStack.pos);
		this.commandStack.stack = this.commandStack.stack.slice(0,this.commandStack.pos );
		this.logger.log(2,"onCommandDeleted", "enter > pos : " + this.commandStack.pos + " > stack : " +	this.commandStack.stack.length);

		if(this.toolbar){
			this.toolbar.disableRedo();
		}
		this.postCommand(command);
	}


	async postCommand (command){
		this.logPageEvent("addCommand", command.type)
		var result = {
			pos : this.commandStack.pos + 1,
			command : command,
			lastUUID : this.commandStack.lastUUID + 1
		}
		this.logger.log(1,"postCommand", "enter > " + this.mode);
		if (this.mode == "public"){
			/**
			 * In public mode, we do not call network, and just add
			 */
			this.onCommandAdded(result);
		} else {

			try {
				this.modelService.addCommand(this.model, command).then(pos => {
					this.onCommandAdded(pos);
				}).catch(err => {
					this.logger.error("postCommand", "ERROR saving", err);
					this.showError('Could not reach server! Changes not saved')
				})

				/**
				 * Since 2.1.3 we put stuff and the stack, without waiting
				 * for the backend.
				 */
				this.commandStack.stack.push(result.command);
				this.commandStack.pos = result.pos;
				this.commandStack.lastUUID = result.lastUUID;

				this.logger.log(1,"postCommand", "exit > lastUUID: " + this.commandStack.lastUUID  + ' > pos: ' + this.commandStack.pos);
			} catch (err) {
				this.logger.sendError("postCommand", err);
			}
		}
	}


	onCommandAdded (result){
		if(result.errors){
			this.logger.sendError("onCommandAdded", new Error("Server returned error"));
		}

		/**
		 * Since 2.1.3 we put stuff and the stack. here we just update the
		 * lastUUID ans pos with the server one, in case we would have
		 * concurrant editing
		 *
		 * FIXME: for some reason the last UUID on the server lacks
		 * the one we have in browser. Question: Do we need the last UUID on the stack?
		 * Can`t we use the normal lastUUID? Or just created with Date()
		 */

		// this.commandStack.stack.push(result.command);
		this.commandStack.pos = result.pos;
		this.commandStack.lastUUID = result.lastUUID;

		if(this.toolbar){
			this.toolbar.enbaleUndo();
		}
		this.logger.log(1,"onCommandAdded", "exit > id: "+ result.command.id + " > lastUUID: " + this.commandStack.lastUUID + " > pos: " + this.commandStack.pos);
	}


	canUndo (){
		return 	this.commandStack.pos > 0;
	}

	async undo (){
		this.logger.log(2,"undo", "enter > " + (this.commandStack.pos > 0));
		this.logPageEvent("undo", "")
		if(this.commandStack.pos > 0){
			/**
			 * Do do things faster for large requests,
			 * we do not wait for the rest response.
			 */
			if(this.mode !== "public"){
					this.modelService.undoCommand(this.model, {}).then(res => {
						if (res.pos != this.commandStack.pos) {
							this.logger.error('undo', "server is behind")
						}
						this.logger.log(2,"undo", "saved", res.pos + '==' + this.commandStack.pos);
					})
			}
			var result = {
				pos : this.commandStack.pos - 1
			}
			this.onUndoCompleted(result);
		}
		if(this.commandStack.pos <= 0){
			if(this.toolbar){
				this.toolbar.disableUndo();
			}
		}
	}


	onUndoCompleted (result){
		this.logger.log(2,"onUndoCompleted", "enter > " + result.pos);
		this.commandStack.pos = result.pos;
		var command = this.commandStack.stack[this.commandStack.pos];
		if(command){
			this.logger.log(0,"onUndoCompleted", "enter > "+ command.id);
			if(this["undo" + command.type]){
				try{
					this["undo"+ command.type](command);
				} catch(e){
					console.debug(e.stack);
				}
			} else {
				console.warn("No Undo function defined for ", command);
			}
			if(this.toolbar){
				this.toolbar.enbaleRedo();
			}
		} else {
			console.warn("No Undo command defined!");
		}
	}

	async redo (){
		this.logger.log(2,"redo", "enter > "+ (this.commandStack.pos >= this.commandStack.stack.length));
		this.logPageEvent("redo", "")
		if(this.commandStack.pos >= 0 && this.commandStack.pos < this.commandStack.stack.length){
			/**
			 * Do do things faster for large requests,
			 * we do not wait for the rest response.
			 */
			if(this.mode !=="public"){
				this.modelService.redoCommand(this.model, {}).then(res => {
					if (res.pos !== this.commandStack.pos) {
						this.logger.log(1, 'redo', "server is behind")
					}
					this.logger.log(2,"redo", "saved",  res.pos + '==' + this.commandStack.pos);
				})
			}

			var result = {
				pos : this.commandStack.pos+1
			}
			this.unRedoCompleted(result);
		} else {
			this.logger.log(0,"redo", "No redo > ");
		}

		if(this.commandStack.pos >= this.commandStack.stack.length){
			if(this.toolbar){
				this.toolbar.disableRedo();
			}
		}
	}

	unRedoCompleted (result){
		var command = this.commandStack.stack[this.commandStack.pos];
		this.commandStack.pos = result.pos;
		this.logger.log(2,"unRedoCompleted", "enter > "+ command.id);
		if(this["redo" + command.type]){
			try{
				this["redo"+ command.type](command);
			}catch(e){
				console.debug(e.stack);
			}
		} else {
			console.warn("No Redo function defined for ", command.type);
		}
		if(this.toolbar){
			this.toolbar.enbaleUndo();
		}
	}

	setCommandStack (s){

		this.logger.log(2,"setCommandStack", "enter");

		this.commandStack = s;

		if(this.toolbar){
			if(this.commandStack.pos > 0){
				this.toolbar.enbaleUndo();
			} else {
				this.toolbar.disableUndo();
			}

			if(this.commandStack.pos < this.commandStack.stack.length){
				this.toolbar.enbaleRedo();
			} else{
				this.toolbar.disableRedo();
			}
		}
	}

	/**********************************************************************
	 * Helper
	 **********************************************************************/

	getWidgetName (screenID, name){
		var screen = this.model.screens[screenID];
		if (screen){
			var children = screen.children;
			var names = {};
			for (let i = 0; i < children.length; i++){
				let widgetID = children[i];
				if (this.model.widgets[widgetID]) {
					let widget = this.model.widgets[widgetID];
					names[widget.name] = widget.id;
				} else {
					console.debug("No widget", widgetID);
				}
			}
			// also add names of parent screen widgets
			if(screen.parents && screen.parents.length > 0 ){
				for(let i = 0; i< screen.parents.length; i++){
					let parentID = screen.parents[i];
					let parent = this.model.screens[parentID];
					if (parent) {
						let parentChildren = parent.children;
						for (let j = 0; j < parentChildren.length; j++){
							let widgetID = parentChildren[j];
							if (this.model.widgets[widgetID]) {
								let widget = this.model.widgets[widgetID];
								names[widget.name] = widget.id;
							}
						}
					}
				}
			}
			return this.getUniqueName(name, names);
		} else {
			console.error("getWidgetName() > No screen", screenID);
		}
		return name;
	}

	getSceenName (name){
		var names = {};
		for (var id in this.model.screens){
			var screen =  this.model.screens[id];
			if (screen) {
				names[screen.name] = screen.id;
			} else {
				console.debug("getSceenName() > No screen", id);
			}
		}
		return this.getUniqueName(name, names);
	}

	/**
	 * Returns a unique group name within the screen!!
	 */
	getGroupName (screenID, name){
		var names = {};
		for (var id in this.model.groups){
			var group =  this.model.groups[id];
			if (group) {
				if (group.children.length > 0){
					var widgetID = group.children[0];
					var widget = this.model.widgets[widgetID];
					if (widget) {
						var parentScreen = this.getParentScreen(widget);
						if (parentScreen && parentScreen.id === screenID) {
							names[group.name] = group.id;
						}
					}
				}
			} else {
				console.debug("getGroupName() > No group", id);
			}
		}

		return this.getUniqueName(name, names);
	}

	/**
	 * Create a unique name in a screen by adding an count add the end. If there is already a count,
	 * we have to remove it
	 */
	getUniqueName  (name, names) {
		// if the name is unique simply return
		if (!names[name]){
			return name;
		}
		// else reduce to base bz assuming "<String> <Int>" pattern
		var pos = name.lastIndexOf(" ");
		if (pos > 0) {
			var end = name.substring(pos+1);
			var er = /^-?[0-9]+$/;
			var isInt =  er.test(end);
			if (isInt){
				name = name.substring(0, pos);
			}
		}
		if (!names[name]){
			return name;
		}
		var count = 1;
		var newName = name;
		while (names[newName] && count < 1000) {
			newName = name + " " + count;
			count++;
		}
		return newName;
	}

	getInlineEdit (){
		if (this._canvas){
			return this._canvas.inlineEditGetCurrent();
		}
	}

	getUUID (){
		/**
		 * We add here a random number, to avoid collisions in collab sessions. Using UUIDs would
		 * be better, hwoever the Core.getOrderedWidgets() relies for old prototypes
		 * on the id to establish order.
		 */
		var uuid = this.model.lastUUID++ + "_" + Math.round(Math.random() * 100000);
		return uuid
	}

	getLastChangedWidget (type){
		if (this._lastChangedWidgets && this._lastChangedWidgets[type]){
			return this._lastChangedWidgets[type];
		}
	}

	setLastChangedWidget (widget){
		if (this._lastChangedWidgets && widget){
			this._lastChangedWidgets[widget.type] = widget;
		}
	}

	createNiceName (w){
		return w.type;
	}

	getDeltaBox (model, pos){
		var delta = {n:{}, o:{}};
		if(model){
			for(var p in pos){
				if(pos[p] != null && pos[p]!= undefined){
					if(pos[p] != model[p]){
						delta.n[p] = pos[p];
						delta.o[p] = model[p];
						ModelFixer.fix1PXBug(p, model, pos)
					}
				}
			}
		} else{
			this.logger.error("getDeltaBox", "no model passed ");
		}
		return delta;
	}



	getPropertyDelta (model, props, type){
		/**
		 * check if we have to handle templates in here!
		 */
		if(type == "style" && model.template){
			if(this.model.templates && this.model.templates[model.template]){
				var template = this.model.templates[model.template];
				return this.getDelta(template[type], props);
			} else {
				console.warn("No template with ", model.template);
			}
		} else {
			return this.getDelta(model[type], props);
		}
	}


	getDelta (model, pos){

		var delta = {n:{}, o:{}};
		for(var p in pos){
			if(pos[p] != model[p]){
				delta.n[p] = pos[p];
				if(model[p] != null){
					delta.o[p] = model[p];
				} else {
					/**
					 * This causes some serious troubles in vertx mongo
					 */
					delta.o[p] = null;
				}

			}
		}
		return delta;
	}

	logPageEvent (action, label) {
		this.logger.log(4,"logPageEvent","enter", action + " > " + label);
		try{
			// if(ga!=null && ga!=undefined){
			//	ga('send', {
			//	  hitType: 'event',
			//	  eventCategory: 'MATC',
			//	  eventAction: action,
			//	  eventLabel: label
			//	})
			//}
		} catch(err) {
			this.logger.error("logPageEvent","error", err);
		}
	}

	printWidget (id) {
		if (this.model.widgets[id]) {
			return this.model.widgets[id].name
		}
		return id + '[Not found]'
	}

	/**********************************************************************
	 * Model FIXES
	 **********************************************************************/









}