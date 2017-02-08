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
            .attr('class','notice');

        div.selectAll('div')
            .data(data)
            .enter()
            .append('form')
            .classed('round space-bottom1 strong', true)
            .on('submit',function(){
                d3.event.stopPropagation();
                d3.event.preventDefault();
            })
            .append('button')
            .classed('col4', true)
            .text(function(d){
                return d.text;
            })
            .on('click',function(){
                d3.event.stopPropagation();
                d3.event.preventDefault();
            })
            .append('span')
            .text(function(){return data.text;});






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
