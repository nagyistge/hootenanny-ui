import * as d3 from 'd3';
import _ from 'lodash';
import rbush from 'rbush';
import { utilRebind } from '../util/rebind';
import { d3geoTile } from '../lib/d3.geo.tile';
import { utilDetect } from '../util/detect';
import { geoExtent } from '../geo/index';
import { svgIcon } from '../svg/index';
import { utilQsString } from '../util/index';

var dispatch = d3.dispatch('loadedImages', 'loadedSigns');

function test(){
    console.log('test');
}

function getAvailLayers(callback){
    var request = d3.json('/hoot-services/osm/api/0.6/map/layers');
    request.get(function (error, resp) {
        if (error) {
            alert('Get available layers failed!');
            console.log(error);
            callback(null);
        } else {
            callback(resp);
            /*if(resp.layers && resp.layers.length > 0)
            {
                var layerlist = resp;
                Hoot.model.REST('getMapSizes', _.pluck(resp.layers,'id').toString(),function (sizeInfo) {
                    if(sizeInfo) {
                        layerlist.layers = _.map(layerlist.layers, function(lyr){
                            return _.extend(lyr, _.find(sizeInfo.layers, { id: lyr.id} ));
                        });
                    }


                    callback(layerlist);
                 });
            } else {
                callback(resp);
            }*/
        }
    });
}


export default {

    init: function() {
        utilRebind(this, dispatch, 'on');
    },


    reset: function() {
        userDetails = undefined;
        rateLimitError = undefined;
        _.forEach(inflight, abortRequest);
        loadedTiles = {};
        inflight = {};
        return this;
    },

    availLayers: function(callback){
        var availLayers = getAvailLayers(callback);
    }
};