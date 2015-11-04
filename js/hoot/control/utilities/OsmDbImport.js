Hoot.control.utilities.osmdbimport = function(context) {
	var hoot_control_utilities_osmdbimport = {};

    hoot_control_utilities_osmdbimport.newOsmDbImportPopup = function(callback) {
        var saveName = null;
        var d_form = [{
            label: 'OSM DB API Url',
            type: 'OsmDbApiUrl',
            placeholder: 'Enter Url'
        }, {
            label: 'Output Name',
            placeholder: 'Save As',
            type: 'OsmDbApiOutputName'
        }];
        var modalbg = d3.select('body')
            .append('div')
            .classed('fill-darken3 pin-top pin-left pin-bottom pin-right', true);
        var ingestDiv = modalbg.append('div')
            .classed('contain col4 pad1 hoot-menu fill-white round modal', true);
        var _form = ingestDiv.append('form');
        _form.classed('round space-bottom1 importableLayer', true)
            .append('div')
            .classed('big pad1y keyline-bottom space-bottom2', true)
            .append('h4')
            .text('OSM DB API Import')
            .append('div')
            .classed('fr _icon x point', true)
            .on('click', function () {
                //modalbg.classed('hidden', true);
                modalbg.remove();
            });
        var fieldset = _form.append('fieldset')
            .selectAll('.form-field')
            .data(d_form);
        fieldset.enter()
            .append('div')
            .classed('form-field fill-white small keyline-all round space-bottom1', true)
            .append('label')
            .classed('pad1x pad0y strong fill-light round-top keyline-bottom', true)
            .text(function (d) {
                return d.label;
            });
        fieldset.append('div')
            .classed('contain', true)
            .append('input')
            .each(function(d){
            	if(d.readonly){d3.select(this).attr('readonly',true);}
            })
            .attr('type', 'text')
            .attr('placeholder', function (field) {
                return field.placeholder;
            })
            .attr('class', function (field) {
                return 'reset ' + field.type;
            })
            .select(function (a) {
                if (a.icon) {
                    d3.select(this.parentNode)
                        .append('span')
                        .classed('point keyline-left _icon folder pin-right pad0x pad0y', true)
                        .append('input')
                        .attr('id', 'basemapfileuploader')
                        .attr('type', 'file')
                        .attr('multiple', 'true')
                        .classed('point pin-top', true)
                        .style({
                            'text-indent': '-9999px',
                            'width': '31px'
                        })
                        .on('change', function () {
                           
                        });
                }

            });

            var submitExp = ingestDiv.append('div')
            .classed('form-field col12 center ', true);
             submitExp.append('span')
            .classed('round strong big loud dark center col10 margin1 point', true)
            .classed('inline row1 fl col10 pad1y', true)
                .text('Publish')
                .on('click', function () {
                    //var spin = submitExp.insert('div',':first-child').classed('_icon _loading row1 col1 fr',true).attr('id', 'basemapimportspin');

                    var url = _form.select('.reset.OsmDbApiUrl').value();
                    var outputName = _form.select('.reset.OsmDbApiOutputName').value();
                    
                    var data = {};
                    data.inputDbUrl = url;
                    data.bbox = id.map().extent();
                    data.outputLayerName = outputName;


                    Hoot.model.REST('ingestOsmApiDb', data,
                        function (d) {
                            if(d.error){
                                context.hoot().view.utilities.errorlog.reportUIError(d.error);
                            }
                            
                        }
                    );


                });
        return modalbg;
    };



	return hoot_control_utilities_osmdbimport;
}