/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.ui.hootformbase creates basic hoot modal dialog.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      02 Feb. 2016
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

Hoot.ui.hootformbase = function () 
{
    var _events = d3.dispatch();
    var _instance = {};

    /**
    * @desc Create basic hoot form
    * @param containerId - id of container div
    * @param formMetaData - meta data object that describes the form
    * @return returns created form.
    **/
    _instance.createForm = function(containerId, formMetaData) {
        var container;
        try{

            var btnMeta = formMetaData['button'];
            var formMeta = formMetaData['form'];
            var formTitle = formMetaData['title'];
            if(!btnMeta || !formMeta) {
                throw 'Failed to create UI. Invalid form meta data.';
            }

            if(!formTitle){
                formTitle = 'Hootenanny Form';
            }
            container = _createContainer(containerId);
            var formDiv = _createFormDiv(container)
            var form =  _createForm(container, formDiv, formTitle)
            var fieldset = _createFieldSet(form, formMeta);
            _createButtons(btnMeta, formDiv); 


        } catch (error) {
            console.error(error);
        }
    
        return container;
    }

  
    /**
    * @desc Create dark back ground mask
    * @param containerId - id of container div
    * @return returns created div.
    **/
    var _createContainer = function(containerId) {
        return d3.select(containerId)
                .append('div')
                .classed('fill-darken3 pin-top pin-left pin-bottom pin-right', true);
    }

    /**
    * @desc Create form container div
    * @param container - id of container div
    * @return returns created div.
    **/
    var _createFormDiv = function(container) {
        return container.append('div')
                .classed('contain col4 pad1 hoot-menu fill-white round modal', true);
    }

    /**
    * @desc Create form shell
    * @param container - id of container div
    * @param formDiv - id of container div
    * @param formTitle - dialog title
    * @return returns created form.
    **/
    var _createForm = function(container, formDiv, formTitle) { 

        var form = formDiv.append('form');
        form.classed('round space-bottom1 importableLayer', true)
                .append('div')
                .classed('big pad1y keyline-bottom space-bottom2', true)
                .append('h4')
                .text(formTitle)
                .append('div')
                .classed('fr _icon x point', true)
                .on('click', function () {
                    container.remove();
                });
        return form;
    }

    /**
    * @desc Create form fields. Currently handles textarea, combo and text field
    * @param form - container form
    * @param formMeta - fields meta data
    * @return returns created fields.
    **/
    var _createFieldSet = function(form, formMeta) {
        var fieldset = form.append('fieldset')
                .selectAll('.form-field')
                .data(formMeta);


        fieldset.enter()
                .append('div')
                
                .select(function(a){
                

                    var field = d3.select(this);

                    // add header and label
                    field
                    .classed('form-field fill-white small keyline-all round space-bottom1', true)
                    .append('label')
                    .classed('pad1x pad0y strong fill-light round-top keyline-bottom', true)
                    .text(a.label);


                    if(a.inputtype == 'textarea') {
                        field.style('height', '98px');//.classed('row3', true);

                        var fieldDiv = field
                        .append('div')
                        .classed('contain', true);

                        var inputField = fieldDiv
                        .append('textarea')
                        .attr('placeholder', function (field) {
                            return field.placeholder;
                        })
                        .classed('col12 row5 overflow', true)
                        .style('display','block');

                        if(a.readonly === true){
                            inputField.attr('readonly','readonly');
                        }
                        if(a.id) {
                            inputField.attr('id', a.id);
                        }
                    } else if(a.inputtype == 'combobox') {
                        var fieldDiv = field
                        .classed('contain', true);

                        var inputField = 
                        fieldDiv
                        .append('input')
                        .attr('type', 'text')
                        .attr('placeholder', function (field) {
                            return field.placeholder;
                        })
                        .attr('class', function (field) {
                            return field.className;
                        });
                      
                        if(a.id) {
                            inputField.attr('id', a.id);
                        }

                        if (a.combobox){
                            if(a.combobox.data && a.combobox.command) {
                                a.combobox.command.call(inputField.node(), a);
                            }  else {
                                _createDefaultCombo.call(inputField.node(), a);
                            }     
                        } 

                    } else {
                        var fieldDiv = field
                        .classed('contain', true);

                        var inputField = fieldDiv
                        .append('input')
                        .attr('type', 'text')
                        .attr('placeholder', function (field) {
                            return field.placeholder;
                        })
                        .attr('class', function (field) {
                            return field.className;
                        });

                        if(a.text) {
                            inputField.value(a.text);
                        }
                        if(a.id) {
                            inputField.attr('id', a.id);
                        }

                        if(a.onchange) {
                            inputField.on('change',a.onchange);
                        }

                        if(a.onclick) {
                            inputField.on('click',a.onclick);
                        }
                    }

                    

                });


        return fieldset;
    }

    /**
    * @desc Create form buttons
    * @param btnMeta - buttons meta data
    * @param formDiv - id of container div
    * @return returns created fields.
    **/
    var _createButtons = function(btnMeta, formDiv) {
        _.each(btnMeta, function(m){

                var btnLoc = 'center';
                if(m.location){
                    btnLoc = m.location;
                }

                var onClick = function(){};
                if(m.onclick){
                    onClick = m.onclick;
                }
                var btnContainer = formDiv.append('div')
                .classed('form-field col12 ' + btnLoc, true);
                 btnContainer.append('span')
                .classed('round strong big loud dark center col10 margin1 point', true)
                .classed('inline row1 fl col10 pad1y', true)
                .text(m.text)
                .on('click', onClick);


            });       
    }

    /**
    * @desc Create default combo.
    * @param a - combo meta data
    **/
    var _createDefaultCombo = function(a) {
        var combo = d3.combobox()
            .data(_.map(a.combobox, function (n) {
                return {
                    value: n,
                    title: n
                };
            }));
        var comboCnt = d3.select(this);
        comboCnt.style('width', '100%')
            .call(combo);

        if(a.onchange){
            comboCnt.on('change', a.onchange);
        }
    }

    return d3.rebind(_instance, _events, 'on');
}