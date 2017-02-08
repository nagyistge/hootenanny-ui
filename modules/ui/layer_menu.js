import _ from 'lodash';
import * as d3 from 'd3';
import { d3combobox } from '../lib/d3.combobox.js';
import { t } from '../util/locale';
import { svgIcon } from '../svg/index';
import { rendererBackgroundSource } from '../renderer/background_source';
import { services } from '../services/index';


import { behaviorHash } from '../behavior/index';

export function uiLayerMenu(context) {

    return function(selection) {
        var _form = null;

        var data = [
            {isPrimary:true, id:'refDatset',text:'Add Reference Dataset'},
            {isPrimary:false, id:'secondaryDataset', text: 'Add Secondary Dataset'}
        ];

        var d_form = [{
            label: 'Layers',
            type: 'fileImport',
            placeholder: 'Select Layer From Database',
            /*combobox: _.map(context.hoot().model.layers
                .getAvailLayers(), function (n) {
                    return n.name;
                }),*/
            //tree: context.hoot().model.folders.getAvailFoldersWithLayers()
        }];

        var div = selection
            .append('div')
            .attr('id','add-dataset-pane')
            .attr('class','notice');

        var _form = div.selectAll('div')
            .data(data)
            .enter()
            .append('form')
            .classed('hootImport round space-bottom1 importableLayer fill-white strong', true)
            .on('submit',function(){
                /*d3.event.stopPropagation();
                d3.event.preventDefault();
                services.hoot.availLayers(function(availLayers){
                    console.log(availLayers);    
                }); */               
            });

        _form.append('a')
            .classed('button dark animate strong block _icon big plus pad2x pad1y js-toggle', true)
            .attr('href', '#')
            .text(function(d){
                return d.text;
            })
            .on('click', function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                services.hoot.availLayers(function(availLayers){
                    console.log(availLayers);    
                });     

                /*toggleForm(this);
                context.ui().sidebar.adjustMargins();*/
            });

        var _fieldset = _form.append('fieldset')
            .classed('pad1 keyline-left keyline-right keyline-bottom round-bottom', true)
            .attr('id', function(d){
                return d.id;
            });

        var _fieldDiv = _fieldset.append('div')
            .classed('form-field fill-white small keyline-all round space-bottom1', true);

        _fieldDiv.append('label')
            .classed('pad1x pad0y strong fill-light round-top keyline-bottom', true)
            .text('Layers');

        _fieldDiv.append('div').classed('contain',true).append('input')
            .attr('type','text')
            .attr('placeholder','Layers')
            .classed('reset usedLayersInput combobox-input',true)
            .attr('readonly',true);

        /*_fieldDiv.selectAll('input').call(
            d3combobox()
        );*/

        function disableTooHigh() {
            div.style('display', context.editable() ? 'none' : 'block');
        }

        function populateLayerCombo(data){
            console.log(data);
            _fieldDiv.selectAll('input')
                .call(d3combobox()
                .data(_.map(data.layers, function (n) {
                        return {
                            value: n.name,
                            title: n.id
                        };
                    })))   
        }


        services.hoot.availLayers(populateLayerCombo);

        context.map()
            .on('move.notice', _.debounce(disableTooHigh, 500));

        disableTooHigh();
    };
}
