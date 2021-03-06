////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.control.conflate.advancedoptions provides functions to generate fieldset using meta data
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      7 Jan. 2016
//      14 Apr. 2016 eslint changes -- Sisskind
//////////////////////////////////////////////////////////////////////////////////////////////////////////////


Hoot.control.conflate.advancedoptions.fieldsgenerator = function () {
    var _events = d3.dispatch();
    var _instance = {};

    /**
    * @desc Create advance options fields
    * @param fieldsMetaData - meta data
    **/
    _instance.generateFields = function(fieldsMetaData) {
        var formFields = [];
        if(fieldsMetaData){
            _.each(fieldsMetaData, function(meta){
                var field = {};
                field.id = meta.id;
                field.label = meta.name;
                field.type = meta.elem_type;
                field.placeholder = meta.defaultvalue;
                field.description = meta.description;
                field.required = meta.required;
                field.children = [];
                
                if(meta.elem_type === 'group'){
                    field.heading=meta.name;
                    //formFields.push(field);

                    //Now add the remaining fields within the group
                    _.each(meta.members,function(submeta){
                        var subfield = {};
                        
                        subfield.id = submeta.id;
                        subfield.label = submeta.name;
                        subfield.type = submeta.elem_type;
                        subfield.placeholder = submeta.defaultvalue;
                        subfield.description = submeta.description;

                        if(submeta.elem_type === 'bool'){
                            if(submeta.members){
                                subfield.combobox = submeta.members;
                                _.each(submeta.members,function(d){
                                   if (d.isDefault==='true'){subfield.placeholder=d.name;}
                                });
                            } else {
                                subfield.combobox = [{'value':'true'}, {'value':'false'}];
                            }
                        } else if(submeta.elem_type === 'list') {
                            if(submeta.members){
                                subfield.combobox = submeta.members;
                                if(submeta.onchange){subfield.onchange = submeta.onchange;}
                            } 
                        } else if(_.includes(['long','int','double'],submeta.elem_type)) {
                            subfield.maxvalue = submeta.maxvalue;
                            subfield.minvalue = submeta.minvalue;
                            subfield.onchange = 'true'; //'Hoot.control.conflate.advancedoptions.fieldsgenerator().validate(d3.select(this));';
                            if(submeta.disabled){if(submeta.disabled==='true'){subfield.disabled = true;}}
                        } else if (submeta.elem_type === 'checkbox') {
                            if(submeta.onchange){subfield.onchange = submeta.onchange;}
                        } else if (submeta.elem_type === 'checkplus') {
                            if(submeta.members){
                                var subchecks = [];
                                _.each(submeta.members,function(sc){
                                    var subcheck={};
                                    subcheck.id = sc.id;
                                    subcheck.label = sc.name;
                                    subcheck.type = sc.elem_type;
                                    subcheck.placeholder = sc.defaultvalue;
                                    subcheck.description = sc.description;
                                    subcheck.required = sc.required;
                                    if(_.includes(['long','int','double'],sc.elem_type)) {
                                        subcheck.minvalue = sc.minvalue;
                                        subcheck.maxvalue = sc.maxvalue;
                                        subcheck.onchange='true';
                                        if(sc.disabled){if(sc.disabled==='true'){subcheck.disabled = 'true';}}
                                    } 
                                    subchecks.push(subcheck);
                                });
                                
                                subfield.subchecks = subchecks;
                                if(submeta.onchange){subfield.onchange = submeta.onchange;}
                            }
                        }

                        if(submeta.dependency){
                            subfield.dependency = submeta.dependency;
                        }

                        if(submeta.dependents){
                            subfield.dependents = submeta.dependents;
                        }
                        
                        if(submeta.required){
                            subfield.required=submeta.required;
                        }

                        field.children.push(subfield);
                    });
                }
                
                formFields.push(field);
                
            });
        }
        
        return formFields;
    };


    /**
    * @desc Helper function to validate field values
    * @param data - data to inspect
    **/
    _instance.validate = function(data){
        var invalidInput = false;
        var invalidText = '';

        var target = d3.select('#' + data.property('id'));
        if(target.node().classList.contains('list')){
            //validate combobox entry
            var curOpts = _.find(target.data()[0].children,{'id':data.property('id')});
            var curVal = target.node().value;
            if(_.find(curOpts.combobox,{'name':curVal})===undefined){
                target.value(curOpts.placeholder);
            }   
        } else {
            //make sure it is double
            if(isNaN(target.value())){
                invalidInput = true;
                invalidText = 'Input value must be a valid number!';
            } else {
            //make sure it is w/in min and max
                var val = parseFloat(target.value());
                if(target.property('min')){
                    if(!isNaN(target.property('min'))){
                        var min = parseFloat(target.property('min'));
                        if(val < min){
                            invalidInput=true;
                            invalidText='Value must be greater than ' + min.toString();
                        } else{
                            invalidInput=false;
                        }
                    } 
                }
                if(target.property('max')){
                    if(!isNaN(target.property('max'))){
                        var max = parseFloat(target.property('max'));
                        if(val>max){
                            invalidInput=true;
                            invalidText='Value must be less than ' + max.toString();
                        } else {
                            invalidInput=false;
                        }                   
                    }
                }
            }
            target.classed('invalid-input',invalidInput);
            target.property('title',invalidText);   
        }
    };
    
    return d3.rebind(_instance, _events, 'on');

};