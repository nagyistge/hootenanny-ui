/////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Hoot.control.export is export control which provides export when all resolution has been resolved.
//  This control seats in sidebar.
//
// NOTE: Please add to this section with any modification/addtion/deletion to the behavior
// Modifications:
//      03 Feb. 2016
//      14 Apr. 2016 eslint changes -- Sisskind
//      31 May  2016 OSM API Database export type -- bwitham
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
Hoot.control.export = function (context, sidebar) {
    var event = d3.dispatch('saveLayer', 'cancelSaveLayer');
    var exp = {};
    var save;
    var transCombo;
    exp.deactivate = function () {
        save.remove();
    };

    exp.activate = function (layer, translations) {
        var placeHolder = 'NSG Topographic Data Store (TDS) v6.1';//'Select Data Translation Schema';
       
        //The layer here does not have the "canExportToOsmApiDb" property at this point like it 
        //does in ExportDataset, so we need to get the map tags for the layer to determine whether 
        //it can be exported out to an OSM API database.
        Hoot.model.REST('getMapTags', {mapId: layer.name}, function (tags) {
            //console.log(tags);
            layer.canExportToOsmApiDb = false;
            //This timestamp tag is what the server uses to determine if a layer can be exported to
            //an OSM API db.
            if (tags.osm_api_db_export_time)
            {
                layer.canExportToOsmApiDb = true;
            }                               	
            transCombo = [];
            // filters for exportable translations
            _.each(translations, function(tr){
                if(tr.CANEXPORT && tr.CANEXPORT === true){
                    transCombo.push(tr);
                }
            });
            if(transCombo.length === 1){
                var emptyObj = {};
                emptyObj.NAME='';
                emptyObj.DESCRIPTION='';
                transCombo.push(emptyObj);
            }
        
            var exportFormatList = 
              [{'DESCRIPTION': 'File Geodatabase'}, {'DESCRIPTION': 'Shapefile'},
               //{'DESCRIPTION': 'Web Feature Service (WFS)'}, 
               {'DESCRIPTION': 'Open Street Map (OSM)'},
               {'DESCRIPTION': 'Open Street Map (PBF)'}];
            if (layer.canExportToOsmApiDb === true)
            {
                exportFormatList.push({'DESCRIPTION': 'OSM API Database'});
            }                                        	
            var d_save = [{
                label: 'Translation',
                type: 'fileExportTranslation',
                id: 'fileExportTranslation',
                combobox: {'data':transCombo },//exportResources,
                placeholder: placeHolder,
                inputtype:'text'
            }, {
                label: 'Export Status as Text',
                type: 'exportTextStatus',
                inputtype:'checkbox',
                checkbox:'cboxExportTextStatus'
            }, {
                label: 'Export Format',
                type: 'fileExportFileType',
                id: 'fileExportFileType',
                combobox: {'data': exportFormatList},
                placeholder: 'File Geodatabase',
                inputtype:'text'
            }, {
                label: 'Append to ESRI FGDB Template?',
                type: 'appendFGDBTemplate',
                inputtype:'checkbox',
                checkbox:'cboxAppendFGDBTemplate'
            }, {
                label: 'Output Name',
                type: 'fileExportOutputName',
                id: 'fileExportOutputName',
                placeholder: layer.name || 'Output Name',
                inputtype:'text'
            }];
            save = sidebar
                .append('form')
                .classed('round space-bottom1', true);
            save
                .append('a')
                .classed('button dark animate strong block _icon big plus pad2x pad1y js-toggle active', true)
                .attr('href', '#')
                .text('Save')
                .on('click', function () {
                    d3.event.stopPropagation();
                    d3.event.preventDefault();
                    toggleForm(this);
                });
            save
                .append('fieldset')
                .classed('pad1 keyline-left keyline-right keyline-bottom round-bottom', true)
                .selectAll('.form-field')
                .data(d_save)
                .enter()
                .append('div')
                .classed('form-field fill-white small keyline-all round space-bottom1', true)
                .each(function(d){
                    if(d.checkbox){d3.select(this).classed('keyline-all',false);}
                })
                .html(function (d) {
                    if(d.checkbox){
                        var retval = '<label class="pad1x pad0y round-top ' + d.checkbox + '" style="opacity: 1;">';
                        retval += '<input type="checkbox" class="reset checkbox" style="opacity: 1;">'+d.label+'</label>';
                        return retval;
                    } else {
                        return '<label class="pad1x pad0y strong fill-light round-top keyline-bottom">' + d.label; // + '</label><input type="text" class="reset ' + field.type + '" />';
                    }
                })
                .append('input')
                .attr('type',function(field){if (field.inputtype==='text') return field.inputtype;})
                .value(function (field) {
                    if (field.inputtype==='text'){
                        if(field.transcombo){
                            var defTrans = _.find(field.transcombo, {DESCRIPTION: field.placeholder});
                            if(defTrans === undefined){return field.transcombo[0].DESCRIPTION;}
                                else{return defTrans.DESCRIPTION;}
                        }
                        else{return field.placeholder;}
                    } //return field.placeholder;
                })
                .attr('class', function (field) {
                    return 'reset ' + field.type;
                })
                .select(function (a) {
                    if (a.checkbox){
                        d3.selectAll('input.rest.exportTextStatus').remove();
                        d3.select('.cboxExportTextStatus').classed('hidden',true).select('input').property('checked',false);
                        d3.selectAll('input.reset.appendFGDBTemplate').remove();
                        d3.select('.cboxAppendFGDBTemplate').select('input').property('checked',false);
                    }
                    if (a.combobox) {
                        var combo = d3.combobox()
                        .data(_.map(a.combobox.data, function (n) {
                            return {
                                value: n.DESCRIPTION,
                                title: n.DESCRIPTION
                            };
                        }));
                        d3.select(this)
                        .style('width', '100%')
                        .call(combo);
                        
                        d3.select(this)
                        .on('change',function(){
                            checkForOptions();
                        });
                    }

                    if(a.label==='Output Name'){
                        d3.select(this).on('change',function(){
                            //ensure output name is valid
                            var resp = context.hoot().checkForUnallowedChar(this.value);
                            if(resp !== true){
                                d3.select(this).classed('invalidName',true).attr('title',resp);
                            } else {
                                d3.select(this).classed('invalidName',false).attr('title',null);
                            }
                        });
                    }

                    if(a.id) {
                        d3.select(this).attr('id', a.id);
                    }
        });     
            
        var actions = save
            .select('fieldset')
            .append('div')
            .classed('form-field pill col12', true);
        actions
            .append('input')
            .attr('type', 'submit')
            .attr('value', 'Exit')
            .classed('fill-darken0 button round pad0y pad2x small strong', true)
            .attr('border-radius', '4px')
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                event.cancelSaveLayer();
            });
        actions
            .append('input')
            .attr('type', 'submit')
            .attr('value', 'Export')
            .classed('fill-dark button round pad0y pad2x dark small strong margin0', true)
            .attr('border-radius', '4px')
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                event.saveLayer(save, layer);
            });
         });
        
        function checkForOptions(){
            var hideFGDB=false;
            var hideExport=false;

            var exportType = d3.select('.fileExportFileType').value();
            var transType = d3.select('.fileExportTranslation').value();

            // Check if output type is File Geodatabase
            if (exportType===''){exportType=d3.select('.fileExportFileType').attr('placeholder');}
            if (transType===''){transType=d3.select('.fileExportTranslation').attr('placeholder');}

            if(exportType!=='File Geodatabase'){
                hideFGDB=true;
            }

            var selTrans = _.find(transCombo,{'DESCRIPTION':transType});
            if(selTrans){
                if(selTrans.NAME.substring(0,3)!=='TDS'){
                    hideFGDB=true;
                } 

                if(selTrans.NAME.substring(0,3)!=='OSM'){ 
                    hideExport=true;
                }
            } else {
                hideFGDB=true;
                hideExport=true;
            }

            d3.select('.cboxAppendFGDBTemplate').classed('hidden',hideFGDB);
            if(hideFGDB){
                d3.select('.cboxAppendFGDBTemplate').select('input').property('checked',false);
            }

            d3.select('.cboxExportTextStatus').classed('hidden',hideExport);
            if(hideExport){
                d3.select('.cboxExportTextStatus').select('input').property('checked',false);
            }
        }

        function toggleForm(context) {
            var text = !(d3.select(context).classed('active'));
            d3.select(context)
                .classed('active', text);
        }
        return save;
    };
    return d3.rebind(exp, event, 'on');
};
