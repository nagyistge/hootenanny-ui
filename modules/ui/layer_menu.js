import _ from 'lodash';
import * as d3 from 'd3';
import { t } from '../util/locale';
import { svgIcon } from '../svg/index';
import { rendererBackgroundSource } from '../renderer/background_source';

import { behaviorHash } from '../behavior/index';

export function uiLayerMenu(context) {

    return function(selection) {
        var div = selection
            .append('div')
            .attr('class', 'notice');

        var button = div
            .append('button')
            .attr('class', 'zoom-to notice')
            .on('click', function() { 
                var key = {name: "AllDataTypesA", id: "699", color: "violet"};
                preAddLayer(key);
            });

        button
            .call(svgIcon('#icon-plus', 'pre-text'))
            .append('span')
            .attr('class', 'label')
            .text('Add Layer');

        /* Hoot functions */
        function preAddLayer(key){
            addLayer(key,function(res){
                addSource(getNodeMapnikSource(key,function(){
                    context.background().updateSource(updateSource);
                }));
            })
        }

        function addLayer(key, callback){
            var mapId = key.id;
            getMbrFromUrl(mapId,function(resp){
                if(resp !== null){
                    if(callback){
                        callback('showprogress');
                    }

                    // zoom and render
                    // if a gpx task grid isn't present
                    var hash = behaviorHash(context);
                    hash();
                    if (!hash.gpx)
                        context.map().zoomToExtent(resp.minlon, resp.minlat, resp.maxlon, resp.maxlat);

                    addLayerAndCenter(key, callback, resp);
                }
            });
        }

        function getMbrFromUrl(id, callback){
            var url = '/hoot-services/osm'
            var request = d3.json(url + '/api/0.6/map/mbr?mapId=' + id);
            request.get(function (error, resp) {
                if (error) {
                    window.console.log(error);
                    iD.ui.Alert(error.responseText,'error',new Error().stack);
                    context.hoot().reset();
                    return callback(null);

                }
                callback(resp);
            });
        }
        
        function addSource(d) {
            var source = iD.BackgroundSource(d);
            //backgroundSources.push(source);
            context.background().toggleOverlayLayer(source);
        }

        function getNodeMapnikSource(d) {
            var source = {
                    name: d.name,
                    id: d.id,
                    type: 'tms',
                    description: d.name,
                    template: window.location.protocol + '//' + window.location.hostname
                        + ':8000' //Hoot.model.REST.formatNodeJsPortOrPath(iD.data.hootConfig.nodeMapnikServerPort)
                        + '/?z={zoom}&x={x}&y={y}&color='
                        + 'orange' //encodeURIComponent(context.hoot().palette(d.color))
                        + '&mapid=' + d.id,
                    scaleExtent: [0,18],
                    overlay: true,
                    projection: 'mercator',
                    subtype: 'density_raster'
                };
            return source;
        }


        function updateSource(d) {
            var source = findSource(d.id);
            for (var i = backgroundSources.length-1; i >= 0; i--) {
                var layer = backgroundSources[i];
                if (layer === source) {
                    backgroundSources[i] = iD.BackgroundSource(d);
                    background.addOrUpdateOverlayLayer(backgroundSources[i]);
                    break;
                }
            }
        };

        function addLayerAndCenter(key, callback, resp){
            loadData(key);
            if (callback) callback();
        };

        function loadData(options) {
            var mapid = options.mapId;
            /*loadedData[mapid] = options;
            loadedData[mapid].vis = true;
            lastLoadedLayer=options.mapId.toString();*/
            //event.layer();
        }

        /*end hoot functions*/

        function disableTooHigh() {
            div.style('display', context.editable() ? 'none' : 'block');
        }

        context.map()
            .on('move.notice', _.debounce(disableTooHigh, 500));

        disableTooHigh();
    };
}
