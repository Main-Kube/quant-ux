import BaseController from './BaseController'
import lang from '../../dojo/_base/lang'

export default class Templates extends BaseController{

    updateTemplateStyle (id){
		this.logger.log(0,"updateTemplateStyle", "enter > " + id);

		if (this.model.widgets[id]){
			var widget = this.model.widgets[id]
			if (widget.template && this.model.templates[widget.template]) {

				var template = this.model.templates[widget.template];
				var command = {
					timestamp : new Date().getTime(),
					type : "UpdateWidget",
					template: lang.clone(template),
					widget: lang.clone(widget),
				};
				this.addCommand(command);

				this.modelUpdateTemplate(template, widget);

				this.showSuccess("The template "  + template.name + " was updated.");

			} else {
				this.logger.error("updateTemplateStyle", "No template > " + widget.template);
			}
		} else {
			this.logger.error("updateTemplateStyle", "No widget > " + id);
		}
	}

	modelUpdateTemplate  (template, widget) {
		for (let key in widget.style) {
			let value = widget.style[key]
			template.style[key] = value
			this.logger.log(0,"modelUpdateTemplate", "enter > " + key + " : "  + value);
		}
		widget.style = {};

		if (widget.hover) {
			let style = widget.hover
			if (!template.hover) {
				template.hover = {}
			}
			for (let key in style) {
				let value = style[key]
				template.hover[key] = value
				this.logger.log(0,"modelUpdateTemplate", "enter > " + key + " : "  + value);
			}
			widget.hover = {};
		}

		if (widget.error) {
			let style = widget.error
			if (!template.error) {
				template.error = {}
			}
			for (let key in style) {
				let value = style[key]
				template.error[key] = value
				this.logger.log(0,"modelUpdateTemplate", "enter > " + key + " : "  + value);
			}
			widget.hover = {};
		}

		if (widget.focus) {
			let style = widget.focus
			if (!template.focus) {
				template.focus = {}
			}
			for (let key in style) {
				let value = style[key]
				template.focus[key] = value
				this.logger.log(0,"modelUpdateTemplate", "enter > " + key + " : "  + value);
			}
			widget.focus = {};
		}

		template.modified = new Date().getTime()
		this.onModelChanged([{type: 'template', action:"change", id: template.id}])
		this.render();
	}

	modelRollbackUpdateTemplate (oldTemplate, oldWidget) {
		this.logger.log(-1,"modelRollbackUpdateTemplate", "enter > ", JSON.stringify(oldWidget.style));
		var template = this.model.templates[oldTemplate.id];
		var widget = this.model.widgets[oldWidget.id];
		if (template && widget) {
			template.style = oldTemplate.style
			widget.style = oldWidget.style
		}
		/**
		 * Here is an issue, that we do not rerender properly.
		 */
		this.onModelChanged([{type: 'template', action:"change", id: template.id}])
		this.render();
	}

	undoUpdateWidget (command){
		this.logger.log(0,"undoUpdateWidget", "enter > ", command);
		this.modelRollbackUpdateTemplate(command.template, command.widget);
	}

	redoUpdateWidget (command){
		this.logger.log(0,"redoUpdateWidgetfunction", "enter > ");
		this.modelUpdateTemplate(command.template, command.widget);
	}

	/**********************************************************************
	 * Create Template
	 **********************************************************************/



	addTemplateWidget (widget, name, description){
		this.logger.log(0,"addTemplateWidget", "enter > " + name);

		var template = this._createWidgetTemplate(widget, true, name, description);

		var command = {
			timestamp : new Date().getTime(),
			type : "CreateTemplate",
			models : [template],
			widgets : [widget.id],
		};
		this.addCommand(command);

		this.modelAddTemplate([template],[widget.id]);

		this.updateCreateWidget();

		this.showSuccess("The template "  + name + " was created. You can find it in the Create menu");
	}

	_createWidgetTemplate (widget, visible, name){
		var template = {};
		template.id = "tw" + this.getUUID();
		template.style = lang.clone(widget.style);

		if (widget.hover) {
			template.hover = lang.clone(widget.hover);
		}
		if (widget.error) {
			template.error = lang.clone(widget.error);
		}
		if (widget.active) {
			template.active = lang.clone(widget.active);
		}
		if (widget.focus) {
			template.focus = lang.clone(widget.focus);
		}

		if (widget.designtokens) {
			template.designtokens = lang.clone(widget.designtokens);
		}


		template.style = lang.clone(widget.style);
		template.has = lang.clone(widget.has);
		template.props = lang.clone(widget.props);
		template.w = widget.w;
		template.h = widget.h;
		template.z = widget.z;
		template.x = 0;
		template.y = 0;
		template.templateType = "Widget";
		template.type = widget.type;
		template.visible = visible;
		template.name = name;
		template.modified = new Date().getTime()
		template.created = new Date().getTime()
		return template;
	}

	addTemplateScreen (screen, name){
		this.logger.log(0,"addTemplateScreen", "enter > " + name);

		this.updateCreateWidget();
	}

	addNestedTemplateGroup (group, name) {
		this.logger.log(-1,"addNestedTemplateGroup", "enter > " + name);

		var command = {
			timestamp : new Date().getTime(),
			type : "CreateTemplate",
			models : [],
			widgets : [],
			groups:[],
			groupID : group.id,

		};

		let groupIds = this.getGroupsToTemplate(group)
		console.debug('asd', groupIds)
		if (groupIds) {
			console.debug('addNestedTemplateGroup', groupIds)
			return
		}



		/**
		 * make one group template!
		 */
		var template = {};
		template.id = "tg" + this.getUUID();
		template.type = "Group";
		template.templateType = "Group";
		template.visible=true;
		template.name = name;
		template.children = [];

		
		command.group = template;


		/**
		 * make templates for all children
		 * 
		 */
		const allChildren = this.getAllGroupChildren(group)
		const boundingBox = this.getBoundingBox(allChildren);
		for(let i=0; i < allChildren.length; i++){
			let widgetID = allChildren[i];
			let widget = this.model.widgets[widgetID];
			let t = this._createWidgetTemplate(widget, false, name+"_"+i, "");
			// add also relative coords!
			t.x = widget.x - boundingBox.x;
			t.y = widget.y - boundingBox.y;

			template.children.push(t.id);
			command.models.push(t);
			command.widgets.push(widgetID);
		}

		this.addCommand(command);
		this.modelAddTemplate(command.models,command.widgets,command.group, command.groupID);
		this.updateCreateWidget();

	}

	getGroupsToTemplate(group) {
		let groups = this.getAllChildGroups(group)
		return [group.id].concat(groups.map(g => g.id))
	}

	modelAddTemplate (templates, widgetIDs, group, groupID, groups = []){

		if (!this.model.templates){
			this.model.templates = {};
		}

		for (let i=0; i < templates.length; i++) {
			var t = templates[i];
			this.model.templates[t.id] = t;
			// make widget instance of template as well
			var widgetID = widgetIDs[i];
			var widget = this.model.widgets[widgetID];
			if(widget){
				widget.template = t.id;
				widget.isRootTemplate = true
				widget.style = {};
				if (widget.hover) {
					widget.hover = {}
				}
				if (widget.error) {
					widget.error = {}
				}
				if (widget.focus) {
					widget.focus = {}
				}
				if (widget.active) {
					widget.active = {}
				}

				// templates cannot have design tokens?
				if (widget.designtokens) {
					delete widget.designtokens
				}
			} else {
				console.warn("No Widget with ", widgetID);
			}
		}

		/**
		 * Since 4.0.60 we do not use tehse parameters any more. But the might be
		 * still on old command stacks...
		 */
		if (group) {
			this.model.templates[group.id] = group;
		}
		if (groupID) {
			this.model.groups[groupID].template = group.id;
		}

		if (groups) {
			console.debug('add groups')
		}
		this.onModelChanged([{type: 'template', action: 'add'}]);
		this.showSuccess("The Component was created. You can find it in the 'Create' menu");
	}

	undoCreateTemplate (command){
		this.logger.log(0,"undoCreateTemplate", "enter > ");
		this.modelRemoveTemplate(command.models, command.widgets, command.group, command.groupID, command.groups);
		this.updateCreateWidget();
		this.render();
	}

	redoCreateTemplate (command){
		this.logger.log(0,"redoCreateTemplate", "enter > ");
		this.modelAddTemplate(command.models, command.widgets, command.group, command.groupID, command.groups);
		this.updateCreateWidget();
		this.render();
	}



	/**********************************************************************
	 * Remove Template
	 **********************************************************************/

	removeTemplate (id){
		this.logger.log(-1,"removeTemplate", "enter > " + id);
	}


	modelRemoveTemplate (templates, widgetIDs, group, groupID){

		if(this.model.templates){
			for(var i=0; i < templates.length; i++){
				var t = templates[i];
				delete this.model.templates[t.id];

				var widgetID = widgetIDs[i];
				var widget = this.model.widgets[widgetID];
				if (widget){
					delete widget.template;
					widget.style = t.style;
				} else {
					console.warn("No widget with ", widgetID);
				}

				/**
				 * delete all children recursive
				 */
				if(t.children){
					this.modelRemoveTemplate(t.children, true);
				}

			}
		}

		if(group){
			delete this.model.templates[group.id];
		}

		if(groupID){
			delete this.model.groups[groupID].template;
		}


		this.onModelChanged([]);
		this.showSuccess("The template was removed");
	}


	undoRemoveTemplate (command){
		this.logger.log(0,"undoRemoveTemplate", "enter > ");
		this.modelAddTemplate(command.models, command.widgets, command.group);
		// this.renderCreateWidget();
		this.render();
	}

	redoRemoveTemplate (command){
		this.logger.log(0,"redoRemoveTemplate", "enter > ");
		this.modelRemoveTemplate(command.models, command.widgets, command.group);
		// this.renderCreateWidget();
		this.render();
	}


	/**********************************************************************
	 * update Template
	 **********************************************************************/

	unlinkTemplate (id, isGroup = false) {
		this.logger.log(-1,"unlinkTemplate", "enter > ", isGroup);

		if (!isGroup && !this.model.widgets[id]) {
			this.logger.log(-1,"unlinkTemplate", "No widhget > ", id);
			return
		}

		if (isGroup && this.model.groups && !this.model.groups[id]) {
			this.logger.log(-1,"unlinkTemplate", "No group > ", id);
			return
		}

		if (!this.model.templates) {
			this.logger.log(0,"unlinkTemplate", "No templates  ");
			return
		}

		let element = !isGroup ? this.model.widgets[id] : this.model.groups[id]
		let template = this.model.templates[element.template]
		if (!template) {
			this.logger.log(-1,"unlinkTemplate", "No template with id  ", element.template);
			return
		}

		/**
		 * FIXME: what about group children
		 */
		let childrenTemplateIds = []
		if (isGroup) {
			let group = this.model.groups[id]
			group.children.forEach(childId => {
				let child = this.model.widgets[childId]
				if (child && child.template) {
					childrenTemplateIds.push({
						widgetId: child.id,
						templateId: child.template
					})
				}
			})
		}

		var command = {
			timestamp : new Date().getTime(),
			type : "UnlinkTemplate",
			modelId: id,
			isGroup: isGroup,
			templateId: template.id,
			childrenTemplateIds: childrenTemplateIds
		};

		this.modelUnlinkTemplate(id, isGroup, childrenTemplateIds);
		this.onModelChanged([{type: 'widget', action:"change", id: id}])
		this.addCommand(command);

		this.render()
	}

	modelUnlinkTemplate (id, isGroup = false, childrenTemplateIds) {
		this.logger.log(-1,"modelUnlinkTemplate", "enter ");
		if (!this.model.templates) {
			this.logger.log(0,"modelUnlinkTemplate", "No templates ");
			return
		}
		if (isGroup) {
			this.modelUnlinkGroupTemplate(id, childrenTemplateIds)
		} else {
			this.modelUnlinkWidgetTemplate(id)
		}
	}

	modelUnlinkGroupTemplate(id, childrenTemplateIds) {
		this.logger.log(-1,"modelUnlinkGroupTemplate", "enter ");
		if (!this.model.groups || !this.model.groups[id]){
			this.logger.log(0,"modelUnlinkGroupTemplate", "No group ", id);
			return
		}

		/**
		 * Delete the group
		 */
		let group = this.model.groups[id]
		delete group.template

		/**
		 * Clean up children
		 */
		if (childrenTemplateIds) {
			childrenTemplateIds.forEach(child => {
				this.modelUnlinkWidgetTemplate(child.widgetId)
			})
		}
	}

	modelUnlinkWidgetTemplate (id) {
		this.logger.log(-1,"modelUnlinkWidgetTemplate", "Enter > ", id);

		if (!this.model.widgets[id]) {
			this.logger.log(0,"modelUnlinkWidgetTemplate", "No widhget > ", id);
			return
		}

		let widget = this.model.widgets[id]
		if (widget.template) {
			let template = this.model.templates[widget.template]
			if (template) {
				if (template.style) {
					let style = template.style
					for (let key in style) {
						widget.style[key] = style[key]
					}
				}

				if (template.hover) {
					let hover = template.hover
					for (let key in hover) {
						widget.hover[key] = hover[key]
					}
				}

				if (template.focus) {
					let focus = template.focus
					for (let key in focus) {
						widget.focus[key] = focus[key]
					}
				}

				if (template.error) {
					let error = template.error
					for (let key in error) {
						widget.error[key] = error[key]
					}
				}

				if (template.active) {
					let active = template.active
					for (let key in active) {
						widget.active[key] = active[key]
					}
				}
			}
		}
		widget.isRootTemplate = false
		delete widget.template
	}


	modelLinkTemplate (id, templateId, isGroup, childrenTemplateIds) {
		this.logger.log(0,"modelLinkTemplate", "enter > ", id, templateId);

		if (!this.model.templates) {
			this.logger.log(0,"modelLinkTemplate", "No templates ");
			return
		}

		let template = this.model.templates[templateId]
		if (!template) {
			this.logger.log(0,"modelUnlinkTemplate", "No template with id > ", templateId);
			return
		}

		if (isGroup) {
			this.modelLinkGroupTemplate(id, templateId, childrenTemplateIds)
		} else {
			this.modelLinkWidgetTemplate(id, templateId)
		}

	}

	modelLinkGroupTemplate (id, templateId, childrenTemplateIds) {
		this.logger.log(0,"modelLinkGroupTemplate", "enter > ", id, templateId);

		if (!this.model.groups || !this.model.groups[id]){
			this.logger.log(0,"modelLinkGroupTemplate", "No group ", id);
			return
		}

		let group = this.model.groups[id]
		group.template = templateId

		if (childrenTemplateIds) {
			childrenTemplateIds.forEach(child => {
				this.modelLinkWidgetTemplate(child.widgetId, child.templateId)
			})
		}
	}

	modelLinkWidgetTemplate (id, templateId) {
		this.logger.log(0,"modelLinkWidgetTemplate", "enter > ", id, templateId);

		if (!this.model.widgets[id]) {
			this.logger.log(0,"modelLinkWidgetTemplate", "No widhget > ", id);
			return
		}

		let widget = this.model.widgets[id]
		widget.template = templateId
		widget.style = {};
		if (widget.hover) {
			widget.hover = {}
		}
		if (widget.error) {
			widget.error = {}
		}
		if (widget.focus) {
			widget.focus = {}
		}
		if (widget.active) {
			widget.active = {}
		}
	}



	undoUnlinkTemplate (command){
		this.logger.log(0,"undoUnlinkTemplate", "enter > ");
		this.modelLinkTemplate(command.modelId, command.templateId, command.isGroup, command.childrenTemplateIds);
		this.render();
	}

	redoUnlinkTemplate (command){
		this.logger.log(0,"redoUnlinkTemplate", "enter > ");
		this.modelUnlinkTemplate(command.modelId, command.isGroup, command.childrenTemplateIds);
		this.render();
	}



	/**********************************************************************
	 * Delete Template
	 **********************************************************************/

	removeAndUnlinkTemplate (id){
		this.logger.log(-1,"removeAndUnlinkTemplate", "enter > " + id);

		if (!this.model.templates) {
			this.logger.log(0,"removeAndUnlinkTemplate", "No templates  ");
			return
		}

		if (!this.model.templates[id]) {
			this.logger.log(0,"removeAndUnlinkTemplate", "No template with id  " + id);
			return
		}

		let template = this.model.templates[id]
		let isGroup = template.templateType === 'Group'
		let widgetIds = isGroup && this.model.groups ?
			Object.values(this.model.groups).filter(g => g.template === id).map(g => g.id) :
			Object.values(this.model.widgets).filter(w => w.template === id).map(w => w.id)

		let templates = [{
			template: template,
			widgetIds: widgetIds,
			isGroup: isGroup
		}]

		/**
		 * Group templates have child templates that need to be
		 * removed
		 */
		if (template.children) {
			template.children.forEach(chidlId => {
				let childTemplate = this.model.templates[chidlId]
				if (childTemplate) {
					let childWidgetIds = Object.values(this.model.widgets).filter(w => w.template === childTemplate.id).map(w => w.id)
					templates.push({
						template: childTemplate,
						widgetIds: childWidgetIds,
						isGroup: false
					})
				}
			})
		}

		var command = {
			timestamp : new Date().getTime(),
			type : "RemoveAndUnlinkTemplate",
			templates: templates
		}

		this.modelRemoveAndUnlinkTemplate(templates)
		this.addCommand(command);
		this.render()
	}

	modelRemoveAndUnlinkTemplate (templateChanges) {
		this.logger.log(-1,"modelRemoveAndUnlinkTemplate", "enter > ", templateChanges);
		let changes = []
		templateChanges.forEach(templateChange => {
			let template = templateChange.template
			let widgetIds = templateChange.widgetIds
			let isGroup = templateChange.isGroup

			widgetIds.forEach(widgetId => {
				this.modelUnlinkTemplate(widgetId, isGroup)
				changes.push({type: 'widget', action:"change", id: widgetId})
			})
			if (this.model.templates) {
				delete this.model.templates[template.id]
			}
		})

		this.onModelChanged(changes)
	}

	modelAddAndLinkTemplate (templateChanges) {
		this.logger.log(-1,"modelAddAndLinkTemplate", "enter > ", templateChanges);

		if (!this.model.templates) {
			this.model.templates = {}
		}
		let changes = []
		templateChanges.forEach(templateChange => {
			let template = templateChange.template
			let widgetIds = templateChange.widgetIds
			let isGroup = templateChange.isGroup
			this.model.templates[template.id] = template
			widgetIds.forEach(widgetId => {
				this.modelLinkTemplate(widgetId, template.id, isGroup)
				changes.push({type: 'widget', action:"change", id: widgetId})
			})
		})
		this.onModelChanged(changes)
	}

	undoRemoveAndUnlinkTemplate(command){
		this.logger.log(0,"undoRemoveAndUnlinkTemplate", "enter > ");
		this.modelAddAndLinkTemplate(command.templates);
		this.render();
	}

	redoRemoveAndUnlinkTemplate (command){
		this.logger.log(0,"redoRemoveAndUnlinkTemplate", "enter > ");
		this.modelRemoveAndUnlinkTemplate(command.templates);
		this.render();
	}


}