import _ from 'lodash';
import * as d3 from 'd3';
import { t } from '../util/locale';
import { svgIcon } from '../svg/index';
import { rendererBackgroundSource } from '../renderer/background_source';

import { behaviorHash } from '../behavior/index';

export function uiLayerMenu(context) {

    return function(selection) {
        var _form = null;

        var data = [
            {dataset:'primary',text:'Add Reference Dataset'},
            {dataset:'secondary', text: 'Add Secondary Dataset'}
        ];

        var div = selection
            .append('div')
            .attr('id','add-dataset-pane')
            .attr('class','notice');

        div.selectAll('div')
            .data(data)
            .enter()
            .append('form')
            .classed('hootImport round space-bottom1 importableLayer fill-white strong', true)
            .on('submit',function(){
                d3.event.stopPropagation();
                d3.event.preventDefault();
            })
            .append('a')
            .classed('button dark animate strong block _icon big plus pad2x pad1y js-toggle',true)
            .attr('href','#')
            .text(function(d){
                return d.text;
            });






       /* var div = selection
            .append('div')
            .attr('class', 'notice');

        var button = div
            .append('button')
            .attr('class', 'zoom-to notice')
            .on('click', function() { 
                
            });

        button
            .call(svgIcon('#icon-plus', 'pre-text'))
            .append('span')
            .attr('class', 'label')
            .text('Add Layer');*/

        function disableTooHigh() {
            div.style('display', context.editable() ? 'none' : 'block');
        }

        context.map()
            .on('move.notice', _.debounce(disableTooHigh, 500));

        disableTooHigh();
    };
}
