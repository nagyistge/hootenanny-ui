import * as d3 from 'd3';
import _ from 'lodash';
import osmAuth from 'osm-auth';
import { JXON } from '../util/jxon';
import { d3geoTile } from '../lib/d3.geo.tile';
import { geoExtent } from '../geo/index';
import { osmEntity, osmNode, osmRelation, osmWay } from '../osm/index';
import { utilDetect } from '../util/detect';
import { utilRebind } from '../util/rebind';


var dispatch = d3.dispatch('authLoading', 'authDone', 'change', 'loading', 'loaded',
    'layerAdding','layerAdded','tileAdded','reviewLayerAdded' // added for hoot
    ),
    useHttps = window.location.protocol === 'https:',
    protocol = useHttps ? 'https:' : 'http:',
    urlroot = '/hoot-services/osm',
    //urlroot = protocol + '//www.openstreetmap.org', 
    //urlroot = (context && iD.data.hootConfig) ? iD.data.hootConfig.url : protocol + '//www.openstreetmap.org',
    //blacklists = ['.*\.google(apis)?\..*/(vt|kh)[\?/].*([xyz]=.*){3}.*'],
    inflight = {},
    loadedTiles = {},
    tileZoom = 2,  /* 16 --> 2 for hootenanny */
    oauth = osmAuth({
        url: urlroot,
        oauth_consumer_key: '5A043yRSEugj4DJ5TljuapfnrflWDte8jTOcWLlT',
        oauth_secret: 'aB3jKq1TRsCOUrfOIZ6oQMEDmv2ptV76PA54NGLL',
        loading: authLoading,
        done: authDone
    }),
    /* added for Hoot */
    ndStr = 'nd',
    tagStr = 'tag',
    memberStr = 'member',
    nodeStr = 'node',
    wayStr = 'way',
    relationStr = 'relation',
    layerZoomArray = [],
    totalNodesCnt = 0 ,
    maxNodesCnt = 0,    
    /* end add for hoot */
    rateLimitError,
    userDetails,
    off;


var loadedData = {};
var lastLoadedLayer;
//var doFlush = false;
var lastShowBBox = null;

function authLoading() {
    dispatch.call('authLoading');
}

function authDone() {
    return true; //dispatch.call('authDone');
}


function abortRequest(i) {
    if (i) {
        i.abort();
    }
}


function getLoc(attrs) {
    var lon = attrs.lon && attrs.lon.value,
        lat = attrs.lat && attrs.lat.value;
    return [parseFloat(lon), parseFloat(lat)];
}


function getNodes(obj) {
    var elems = obj.getElementsByTagName('nd'),
        nodes = new Array(elems.length);
    for (var i = 0, l = elems.length; i < l; i++) {
        nodes[i] = 'n' + elems[i].attributes.ref.value;
    }
    return nodes;
}


function getTags(obj, layerName) {
    var elems = obj.getElementsByTagName(tagStr),
        tags = {};
    for (var i = 0, l = elems.length; i < l; i++) {
        var attrs = elems[i].attributes;
        tags[attrs.k.value] = decodeURIComponent(attrs.v.value);
    }
    tags.hoot = layerName;
    return tags;
}


function getMembers(obj) {
    var elems = obj.getElementsByTagName(memberStr),
        members = new Array(elems.length);
    for (var i = 0, l = elems.length; i < l; i++) {
        var attrs = elems[i].attributes;
        members[i] = {
            id: attrs.type.value[0] + attrs.ref.value + '_' + mapId,
            type: attrs.type.value,
            role: attrs.role.value
        };
    }
    return members;
}

function getVisible(attrs) {
    return (!attrs.visible || attrs.visible.value !== 'false');
}


/*var parsers = {
    node: function nodeData(obj) {
        var attrs = obj.attributes;
        return new osmNode({
            id: osmEntity.id.fromOSM('node', attrs.id.value),
            loc: getLoc(attrs),
            version: attrs.version.value,
            user: attrs.user && attrs.user.value,
            tags: getTags(obj),
            visible: getVisible(attrs)
        });
    },

    way: function wayData(obj) {
        var attrs = obj.attributes;
        return new osmWay({
            id: osmEntity.id.fromOSM('way', attrs.id.value),
            version: attrs.version.value,
            user: attrs.user && attrs.user.value,
            tags: getTags(obj),
            nodes: getNodes(obj),
            visible: getVisible(attrs)
        });
    },

    relation: function relationData(obj) {
        var attrs = obj.attributes;
        return new osmRelation({
            id: osmEntity.id.fromOSM('relation', attrs.id.value),
            version: attrs.version.value,
            user: attrs.user && attrs.user.value,
            tags: getTags(obj),
            members: getMembers(obj),
            visible: getVisible(attrs)
        });
    }
};*/

var parsers = {
    node: function nodeData(obj, mapId, layerName) {
        var attrs = obj.attributes;
        return new iD.Node({
            id: iD.Entity.id.fromOSMPlus(nodeStr, attrs.id.value, mapId),
            origid: iD.Entity.id.fromOSM(nodeStr, attrs.id.value),
            loc: getLoc(attrs),
            version: attrs.version.value,
            user: attrs.user && attrs.user.value,
            tags: getTags(obj, layerName),
            layerName: layerName,
            mapId: mapId,
            hootMeta:{},
            visible: getVisible(attrs)
        });
    },

    way: function wayData(obj, mapId, layerName) {
        var attrs = obj.attributes;
        return new iD.Way({
            id: iD.Entity.id.fromOSMPlus(wayStr, attrs.id.value, mapId),
            origid: iD.Entity.id.fromOSM(wayStr, attrs.id.value),
            version: attrs.version.value,
            user: attrs.user && attrs.user.value,
            tags: getTags(obj, layerName),
            nodes: getNodes(obj, mapId),
            layerName: layerName,
            mapId: mapId,
            visible: getVisible(attrs)
        });
    },

    relation: function relationData(obj, mapId, layerName) {
        var attrs = obj.attributes;
        return new iD.Relation({
            id: iD.Entity.id.fromOSMPlus(relationStr, attrs.id.value, mapId),
            origid: iD.Entity.id.fromOSM(relationStr, attrs.id.value),
            version: attrs.version.value,
            user: attrs.user && attrs.user.value,
            tags: getTags(obj, layerName),
            members: getMembers(obj, mapId),
            layerName: layerName,
            mapId: mapId,
            visible: getVisible(attrs)
        });
    }
};

/*function parse(xml) {
    if (!xml || !xml.childNodes) return;

    var root = xml.childNodes[0],*/
function parse(dom, mapId, layerName) {
    if (!dom || !dom.childNodes) return new Error('Bad request');
    var root = dom.childNodes[0],    
        children = root.childNodes,
        entities = [];

    for (var i = 0, l = children.length; i < l; i++) {
        var child = children[i],
            parser = parsers[child.nodeName];
        if (parser) {
            //entities.push(parser(child));
            entities.push(parser(child, mapId, layerName));
        }
    }

    return entities;
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

    changesetURL: function(changesetId) {
        return urlroot + '/changeset/' + changesetId;
    },


    changesetsURL: function(center, zoom) {
        var precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
        return urlroot + '/history#map=' +
            Math.floor(zoom) + '/' +
            center[1].toFixed(precision) + '/' +
            center[0].toFixed(precision);
    },

    entityURL: function(entity) {
        return urlroot + '/' + entity.type + '/' + entity.osmId();
    },

    userURL: function(username) {
        return urlroot + '/user/' + username;
    },

    // Added for Hootenanny
    loadFromURL: function(url, callback, mapId, layerName) {
        function done(dom) {
            var result = parse(dom, mapId, layerName);
            return callback(null, result);
        }
        return d3.xml(url).get().on('load',done);
    },

    // Added for Hootenanny
    loadFromHootRest: function(command, data, callback, mapId, layerName) {
        function done(dom) {
            var result = parse(dom, mapId, layerName);
            return callback(null, result);
        }
        //return Hoot.model.REST(command, data, done);
    },

    // Added for Hootenanny
    getTileNodesCountFromURL: function(url, data, callback) {
        if (iD.data.hootConfig) {
            d3.json(url)
                .header('Content-Type', 'text/plain')
                .post(JSON.stringify(data), function (error, resp) {
                    if (error) {
                        //iD.ui.Alert(error.responseText,'error',new Error().stack);
                        window.alert(error.responseText);
                        return;
                    }
                callback(resp);
            });}
    },

    // Added for Hootenanny
    getMbrFromUrl: function(mapId, callback) {
        var request = d3.json(url + '/api/0.6/map/mbr?mapId=' + mapId);
        request.get(function (error, resp) {
            if (error) {
                window.console.log(error);
                //iD.ui.Alert(error.responseText,'error',new Error().stack);
                context.hoot().reset();
                return callback(null);

            }
            callback(resp);
        });        
    },

    // Added for Hootenanny
    isShowBBox: function() {
        return totalNodesCnt > maxNodesCnt;
    },

    // do we need this for hootenanny?  comes OOTB with iD
    loadFromAPI: function(path, callback) {
        var that = this;

        function done(err, xml) {
            var isAuthenticated = that.authenticated();

            // 400 Bad Request, 401 Unauthorized, 403 Forbidden
            // Logout and retry the request..
            if (isAuthenticated && err &&
                    (err.status === 400 || err.status === 401 || err.status === 403)) {
                that.logout();
                that.loadFromAPI(path, callback);

            // else, no retry..
            } else {
                // 509 Bandwidth Limit Exceeded, 429 Too Many Requests
                // Set the rateLimitError flag and trigger a warning..
                if (!isAuthenticated && !rateLimitError && err &&
                        (err.status === 509 || err.status === 429)) {
                    rateLimitError = err;
                    dispatch.call('change');
                }

                if (callback) {
                    callback(err, parse(xml));
                }
            }
        }

        if (this.authenticated()) {
            return oauth.xhr({ method: 'GET', path: path }, done);
        } else {
            var url = urlroot + path;
            return d3.xml(url).get(done);
        }
    },

    loadEntity: function(id, callback, mapId, layerName) {
        var type = osmEntity.id.type(id),
            osmID = osmEntity.id.toOSM(id);

        /*this.loadFromAPI(
            '/api/0.6/' + type + '/' + osmID + (type !== 'node' ? '/full' : ''),
            function(err, entities) {
                if (callback) callback(err, { data: entities });
            }
        );*/
        this.loadFromURL(
            url + '/api/0.6/' + type + '/' + osmID + (type !== 'node' ? '/full' : '') + (mapId ? '?mapId=' + mapId : ''),
            function(err, entities) {
                if (callback) callback(err, {data: entities});
            }, mapId, layerName);
    },


    loadEntityVersion: function(id, version, callback, mapId) {
        var type = osmEntity.id.type(id),
            osmID = osmEntity.id.toOSM(id);

        /*this.loadFromAPI(
            '/api/0.6/' + type + '/' + osmID + '/' + version,
            function(err, entities) {
                if (callback) callback(err, { data: entities });
            }
        );*/
        this.loadFromURL(
            url + '/api/0.6/' + type + '/' + osmID + '/' + version,
            function(err, entities) {
                if (callback) callback(err, {data: entities});
            }, mapId);
    },


    // Added for Hootenanny
    loadMissing: function(ids, callback, layername) {
        if(context.hoot().control.conflicts &&
                    context.hoot().control.conflicts.isConflictReviewExist() ){
                context.hoot().control.conflicts.setProcessing(true, 'Please wait while loading missing features.');
            }
        this.loadMultiple(ids, function(err, entities) {
            //dispatch.load(err, entities);
            if (callback) callback(err, entities);
        }, null, layerName);
    },


/*    loadMultiple: function(ids, callback) {
        var that = this;
        _.each(_.groupBy(_.uniq(ids), osmEntity.id.type), function(v, k) {
            var type = k + 's',
                osmIDs = _.map(v, osmEntity.id.toOSM);

            _.each(_.chunk(osmIDs, 150), function(arr) {
                that.loadFromAPI(
                    '/api/0.6/' + type + '?' + type + '=' + arr.join(),
                    function(err, entities) {
                        if (callback) callback(err, { data: entities });
                    }
                );
            });
        });
    },*/

    loadMultiple: function(ids, callback, hootcallback, layerName) {
        //Nee to upgrade lodash and just use _.chunk -- iD v1.7.5
        var currMapId = null;
        // get the map id. Do on first one since ids should be coming from same map
        if(ids && ids.length > 0){
            var firstId = ids[0];
            var parts = firstId.split('_');
            if(parts.length > 1){
                currMapId = '' + parts[1];
            }
        }


        _.each(_.groupBy(_.uniq(ids), iD.Entity.id.type), function(v, k) {
            var type = k + 's',
                osmIDs = _.map(v, iD.Entity.id.toOSM);

            _.each(_.chunk(osmIDs, 150), function(arr) {
                if(currMapId){
                    this.loadFromURL(
                        url + '/api/0.6/' + type + '?mapId=' + currMapId + '&elementIds'  + '=' + arr.join(),
                        function(err, entities) {

                            if (callback) callback(err, {data: entities}, hootcallback);
                        },currMapId, layerName);
                } else { // we do not know hoot map id so use the default iD behavior
                    this.loadFromURL(
                        url + '/api/0.6/' + type + '?' + type + '=' + arr.join(),
                        function(err, entities) {
                            if (callback) callback(err, {data: entities});
                        });
                }

            });
        });
    },

    authenticated: function() {
        return oauth.authenticated();
    },

    // Generate Changeset XML. Returns a string.
    changesetJXON: function(tags) {
        return {
            osm: {
                changeset: {
                    tag: _.map(tags, function(value, key) {
                        return { '@k': key, '@v': value };
                    }),
                    '@version': 0.6,
                    '@generator': 'iD'
                }
            }
        };
    },


    // Generate [osmChange](http://wiki.openstreetmap.org/wiki/OsmChange)
    // XML. Returns a string.
    osmChangeJXON: function(changeset_id, changes) {
        function nest(x, order) {
            var groups = {};
            for (var i = 0; i < x.length; i++) {
                var tagName = Object.keys(x[i])[0];
                if (!groups[tagName]) groups[tagName] = [];
                groups[tagName].push(x[i][tagName]);
            }
            var ordered = {};
            order.forEach(function(o) {
                if (groups[o]) ordered[o] = groups[o];
            });
            return ordered;
        }

        function rep(entity) {
            return entity.asJXON(changeset_id);
        }

        return {
            osmChange: {
                '@version': 0.6,
                '@generator': 'iD',
                'create': nest(changes.created.map(rep), ['node', 'way', 'relation']),
                'modify': nest(changes.modified.map(rep), ['node', 'way', 'relation']),
                'delete': _.extend(nest(changes.deleted.map(rep), ['relation', 'way', 'node']), {'@if-unused': true})
            }
        };
    },


    changesetTags: function(version, comment, imageryUsed) {
        var detected = utilDetect(), //iD.detect(),
            tags = {
                created_by: ('iD ' + version).substr(0, 255),
                imagery_used: imageryUsed.join(';').substr(0, 255),
                host: detected.host.substr(0, 255),
                locale: detected.locale.substr(0, 255),
                browser: detected.browser + ' ' + detected.version,
                platform: detected.platform
            };

        if (comment) {
            tags.comment = comment.substr(0, 255);
        }

        return tags;
    },

    // Added for Hootenanny
    putChangesetmapId: function(changes) {
        var mapid;
        var types = ['created', 'modified', 'deleted'];
        function getmapid(data){
             return _.map(data, function (a) {return a.mapId;});
        }
        for (var i = 0; i < types.length; i++) {
            var tagName = types[i];
            var obj = changes[tagName];
            if (obj.length && obj[0].layerName) {
                return obj[0].mapId;
            } else {
                return getmapid(loadedData);
            }
        }
        return mapid;
    },

    // Added for Hootenanny
    filterChangeset: function(changes) {
        var toChangemapids = {};
        var ways = _.filter(_.flatten(_.map(changes, function (a) {
            return a;
        })), function (c) {
            return c.type !== 'node';
        });

        var vis = this.visLayers();
        var go = true;
        var defaultmapid;

        if (vis.length === 1 || changes.created.length === 0){
            defaultmapid = vis[0];
        } else {
            go = false;
        }

        if (!go) {
            return -999999;
        }
        var mapids = _.compact(_.unique(_.map(_.flatten(_.map(changes, function (a) {
            return a;
        })), function (c) {
            return c.mapId;
        })));
        if (!mapids.length) {
            mapids = vis;
        }
        _.each(mapids, function (a) {
            toChangemapids[a] = {};
            toChangemapids[a].modified = [];
            toChangemapids[a].created = [];
            toChangemapids[a].deleted = [];
        });
        _.each(changes, function (a, aa) {
            if (!a.length) return;
            var type = aa;
            _.each(a, function (b) {
                var mapid = defaultmapid;
                if (b.isNew() && b.type === 'node') {
                    var parent = _.find(ways, function (a) {
                        return _.contains(a.nodes, b.id);
                    });
                    if (parent && parent.mapId) {
                        mapid = parent.mapId;
                    }
                } else {
                    mapid = (b.mapId) ? b.mapId : mapid;
                }
                toChangemapids[mapid][type].push(b);
            });
        });
        return toChangemapids;        
    },

    // Modified for Hootenanny
    putChangeset: function(changes, version, comment, imageryUsed, callback) {
        // Added for Hootenanny
        var changesArr = this.filterChangeset(changes);
        if (!changesArr) {
            callback(true);
            return;
        }

        if (changesArr === -999999) {
            callback({overwriteErrMsg:true,responseText:'New feature updated with multiple layers visible. Turn off all layer but target layer.'});
            return;
        }

        _.each(changesArr, function(a,b) {
            var changemapId = b;
            var changes = a;

            var that = this;

            oauth.xhr({
                method: 'PUT',
                path: '/api/0.6/changeset/create?mapId=' + changemapId,
                options: { header: { 'Content-Type': 'text/xml' } },
                content: JXON.stringify(that.changesetJXON(that.changesetTags(version, comment, imageryUsed)))
            }, function(err, changeset_id) {
                if (err) return callback(err);

                var mergedPoiReviewItems = context.hoot().model.conflicts.getReviewMergedElements();

                if(mergedPoiReviewItems){
                    _.each(mergedPoiReviewItems, function(itm){
                        var curRefId = itm.id;
                        var newMember = itm.obj;

                        // first see if changes.modified has the relation
                        var changeRel = _.find(changes.modified, function(mod){
                            return mod.id === curRefId;
                        });

                        if(changeRel){ // if exists in changes.modified
                            if(changeRel.members.length >= newMember.index){
                                changeRel.members.splice(newMember.index, 0, newMember);
                            } else {
                                changeRel.members.push(newMember);
                            }
                            if(changeRel.members.length < 2){
                                changeRel.tags['hoot:review:needs'] = 'no';
                            }
                        } else { // need to add to changes.modified
                            var modRelation = context.hasEntity(curRefId);
                            if(modRelation){
                                if(modRelation.members.length >= newMember.index){
                                    modRelation.members.splice(newMember.index, 0, newMember);
                                } else {
                                    modRelation.members.push(newMember);
                                }
                            }
                            if(modRelation.members.length < 2){
                                modRelation.tags['hoot:review:needs'] = 'no';
                            }
                            changes.modified.push(modRelation);
                        }
                    });
                    context.hoot().model.conflicts.setReviewMergedElements(null);
                }

                oauth.xhr({
                    method: 'POST',
                    path: '/api/0.6/changeset/' + changeset_id + '/upload?mapId=' + changemapId,
                    options: { header: { 'Content-Type': 'text/xml' } },
                    content: JXON.stringify(that.osmChangeJXON(changeset_id, changes))
                }, function(err) {
                    if (err) return callback(err);
                    // POST was successful, safe to call the callback.
                    // Still attempt to close changeset, but ignore response because #2667
                    // Add delay to allow for postgres replication #1646 #2678
                    window.setTimeout(function() { callback(null, changeset_id); }, 2500);
                    oauth.xhr({
                        method: 'PUT',
                        path: '/api/0.6/changeset/' + changeset_id + '/close?mapId=' + changemapId,
                        options: { header: { 'Content-Type': 'text/plain' } }
                    }, function(err) {
                        callback(err, changeset_id);
                    });
                });
            });

        });
    },


    userDetails: function(callback) {
        if (userDetails) {
            callback(undefined, userDetails);
            return;
        }

        function done(err, user_details) {
            if (err) return callback(err);

            var u = user_details.getElementsByTagName('user')[0],
                img = u.getElementsByTagName('img'),
                image_url = '';

            if (img && img[0] && img[0].getAttribute('href')) {
                image_url = img[0].getAttribute('href');
            }

            userDetails = {
                display_name: u.attributes.display_name.value,
                image_url: image_url,
                id: u.attributes.id.value
            };

            callback(undefined, userDetails);
        }

        oauth.xhr({ method: 'GET', path: '/api/0.6/user/details' }, done);
    },


    userChangesets: function(callback) {
        this.userDetails(function(err, user) {
            if (err) {
                callback(err);
                return;
            }

            function done(err, changesets) {
                if (err) {
                    callback(err);
                } else {
                    callback(undefined, Array.prototype.map.call(changesets.getElementsByTagName('changeset'),
                        function (changeset) {
                            return { tags: getTags(changeset) };
                        }
                    ));
                }
            }

            oauth.xhr({ method: 'GET', path: '/api/0.6/changesets?user=' + user.id }, done);
        });
    },


    status: function(callback) {
        function done(xml) {
            // update blacklists
            var elements = xml.getElementsByTagName('blacklist'),
                regexes = [];
            for (var i = 0; i < elements.length; i++) {
                var regex = elements[i].getAttribute('regex');  // needs unencode?
                if (regex) {
                    regexes.push(regex);
                }
            }
            if (regexes.length) {
                blacklists = regexes;
            }


            if (rateLimitError) {
                callback(rateLimitError, 'rateLimited');
            } else {
                var apiStatus = xml.getElementsByTagName('status'),
                    val = apiStatus[0].getAttribute('api');

                callback(undefined, val);
            }
        }

        d3.xml(urlroot + '/api/capabilities').get()
            .on('load', done)
            .on('error', callback);
    },


    imageryBlacklists: function() {
        return blacklists;
    },


    tileZoom: function(_) {
        if (!arguments.length) return tileZoom;
        tileZoom = _;
        return this;


    },


    loadTiles: function(projection, dimensions, callback) {
        if (off) return;

        var that = this,
            s = projection.scale() * 2 * Math.PI,
            z = Math.max(Math.log(s) / Math.log(2) - 8, 0),
            ts = 256 * Math.pow(2, z - tileZoom),
            origin = [
                s / 2 - projection.translate()[0],
                s / 2 - projection.translate()[1]
            ];

        // Need to document why this was added for Hoot
        var visLayers = _.filter(loadedData, function (layer) {
            return layer.vis;
        });

        // Need to document why this was added for Hoot
        var mapidArr = _.map(loadedData, function (layer) {
            return layer.mapId;
        });

        // Transform visible Hootenanny layers into tiles
        var tiles = _.map(visLayers, function (layer) {
            var _tiles = d3geoTile()
                .scaleExtent([tileZoom, tileZoom])
                .scale(s)
                .size(dimensions)
                .translate(projection.translate())()
                .map(function(tile) {
                    var x = tile[0] * ts - origin[0],
                    y = tile[1] * ts - origin[1];

                    return {
                        id: tile.toString() + ',' + layer.mapId,
                        extent: geoExtent(
                            projection.invert([x, y + ts]),
                            projection.invert([x + ts, y])),
                        mapId: layer.mapId,
                        layerName: layer.name
                    };
                });
            return _tiles;
        });

        // transform multiple arrays into single so we can process
        tiles = _.flatten(tiles);

        //Need to document why this was modified for Hoot
        function bboxUrl(tile, mapId, layerName, layerExt, showbbox) {
            var ext = '';
            if(showbbox){
                iD.data.hootConfig.hootMaxImportZoom = context.map().zoom();
                if (layerExt) {
                    var layerZoomObj = _.find(layerZoomArray, function(a){
                        return mapId === a.mapId;
                    });
                    if(layerZoomObj){
                        layerZoomObj.zoomLevel = context.map().zoom();
                    } else {
                        layerZoomObj = {};
                        layerZoomObj.mapId = mapId;
                        layerZoomObj.zoomLevel = context.map().zoom();
                        layerZoomArray.push(layerZoomObj);
                    }
                    ext = '&extent=' + layerExt.maxlon + ',' + layerExt.maxlat +
                    ',' + layerExt.minlon + ',' + layerExt.minlat + '&autoextent=manual';
                }
            }

            return url + '/api/0.6/map?mapId=' + mapId + '&bbox=' + tile.extent.toParam() + ext;
        }

        _.filter(inflight, function(v, i) {
            var wanted = _.find(tiles, function(tile) {
                var mapids = _.find(mapidArr, function (a) {
                    return tile.mapId === a;
                });
                return i === tile.id + ',' + mapids;
            });
            if (!wanted) delete inflight[i];
            return !wanted;
        }).map(abortRequest);

        // Generate the coordinates of each tiles as parameter so we can calculate total numbers of
        // Node counts, which in turn used for determining density raster vs osm display
        //var firstMapId = null;
        var params = [];
        tiles.forEach(function(tile) {
            var mapId = tile.mapId || mapId;
            //firstMapId = mapId;
            var layerName = tile.layerName || layerName;
            var vis = this.visLayer(mapId);

            //if (loadedTiles[id] || inflight[id]) return;
            //if (_.isEmpty(inflight)) { dispatch.call('loading'); }

            /*inflight[id] = that.loadFromAPI(
                '/api/0.6/map?bbox=' + tile.extent.toParam(),
                function(err, parsed) {
                    delete inflight[id];
                    if (!err) { loadedTiles[id] = true; }
                    if (callback) { callback(err, _.extend({ data: parsed }, tile)); }
                    if (_.isEmpty(inflight)) { dispatch.call('loaded'); }
                }
            );*/
            _.find(loadedData, function (layer) {
                return layer.mapId === mapId;
            });

            if (!vis) return;
            //var id = tile.id + ',' + mapId;
            //if (loadedTiles[id]) return;
            var param = {};
            param.tile = tile.extent.toParam();
            param.mapId = '' + mapId;
            params.push(param);

        });

        showDensityRaster = function(doShow){

            function toggleDensityRaster(d){
                if(d.subtype === 'density_raster'){
                    if(doShow){
                        context.background().showOverlayLayer(d);
                    } else {
                        context.background().hideOverlayLayer(d);
                    }
                }
            }
            //var tmsConfig = null;
            var lyrList = d3.selectAll('.layer-list');
            if(lyrList && lyrList.length > 0){

                for(var i=0; i<lyrList.length; i++){
                    for(var j=0; j<lyrList[i].length; j++){
                        var dataArray = d3.select(d3.selectAll('.layer-list')[i][j]).selectAll('li.layer').data();
                        if(dataArray){
                            _.each(dataArray, toggleDensityRaster);
                        }
                    }

                }
            }

        };
        // Get the node count from service
        this.getTileNodesCountFromURL(url + '/api/0.6/map/nodescount', params, function(resp){
            if(context.hoot().control.conflicts &&
                    context.hoot().control.conflicts.isConflictReviewExist()
                    ){

                if(context.hoot().control.conflicts.map.reviewarrowrenderer.isOn() === false){
                    context.hoot().control.conflicts.setProcessing(true, 'Please wait while loading vector tiles.');
                }

            }

            function showOnTop(){
                d3.select(this).moveToFront();
            }
            totalNodesCnt = 1*resp.nodescount;
            maxNodesCnt = 1*iD.data.hootConfig.maxnodescount;

            var currShowBbox = totalNodesCnt > maxNodesCnt;

            if(Object.keys(inflight).length > 0) {
                d3.select('.warning').call(iD.ui.Warning(context,true,'Data is loading...'));
            } else if((!_.isEmpty(loadedData) && totalNodesCnt === 0)||(totalNodesCnt > 0 && context.intersects(context.map().extent()).length === 0)){
                // Inform user if features are loaded but not located in the map extent
                d3.select('.warning').call(iD.ui.Warning(context,true,'There is no data in the current map extent.  Try panning the map or zooming to a layer.'));
            } else if(currShowBbox){
                // Inform user if features are hidden if user is zoomed out too far
                d3.select('.warning').call(iD.ui.Warning(context,true,'Zoom in to edit features!'));
            } else if (_.isEmpty(context.features().filter(context.intersects(context.map().extent()),context.graph())) && context.intersects(context.map().extent()).length > 0){
                //context.features().filter(context.intersects(map.extent()),graph)
                d3.select('.warning').call(iD.ui.Warning(context,true,'Features are loaded, but are currently not visible.  Try zooming in for better results.'));
            } else {
                d3.select('.warning').call(iD.ui.Warning(context,false,''));
            }

            if(currShowBbox !== lastShowBBox){

                //doFlush = true;
                context.flush(!context.history().hasChanges());

            }

            lastShowBBox = currShowBbox;

            if(context.hoot().control.conflicts &&
                    context.hoot().control.conflicts.isConflictReviewExist() &&
                    tiles.length === 0){
                dispatch.reviewLayerAdded(null, true);
            }



            if(context.hoot().control.conflicts &&
                    context.hoot().control.conflicts.isConflictReviewExist()){
                    var layerName;
                    // if all tiles are already loded then let review know
                    var foundUnloaded = false;
                    for(var ii=0; ii<tiles.length; ii++){
                        var t = tiles[ii];
                        var id = t.id + ',' + t.mapId;
                        layerName = t.layerName;
                        if (!loadedTiles[id]){
                            foundUnloaded = true;
                           break;
                        }
                    }
                    if(!foundUnloaded){
                        dispatch.reviewLayerAdded(layerName, true);
                    }


                }

            function getCurrentId(loadedData, lyr) {
                return _.find(loadedData, {'name':lyr});
            }

            tiles.forEach(function (tile) {
                var mapId = tile.mapId || mapId;
                var layerName = tile.layerName || layerName;
                var vis = this.visLayer(mapId);

                var curLayer = _.find(loadedData, function (layer) {
                    return layer.mapId === mapId;
                });

                if (!vis) {
                    dispatch.reviewLayerAdded(layerName, false);
                    return;
                }



                var id = tile.id + ',' + mapId;
                if (loadedTiles[id] || inflight[id]){
                    if(callback){
                        callback();
                    }
                    return;
                }

                if (_.isEmpty(inflight)) {
                    dispatch.loading();
                }

                // get osm from server for tile
                inflight[id] = this.loadFromURL(bboxUrl(tile, mapId, layerName, curLayer.extent, totalNodesCnt > iD.data.hootConfig.maxnodescount),
                        function (err, parsed) {
                            loadedTiles[id] = true;
                            delete inflight[id];

                            dispatch.load(err, _.extend({data: parsed}, tile));

                            // When there is no more inflight item then we are done so do post processing
                            dispatch.tileAdded();
                            if (_.isEmpty(inflight)) {
                                var hootLyrs = d3.selectAll('.hootLayers');
                                if(hootLyrs[0] !== undefined){
                                    for(var i=hootLyrs[0].length-1; i>-1; i--){
                                        var lyr = d3.select(hootLyrs[0][i]).text();
                                        var curId = getCurrentId(loadedData, lyr);
                                        if(curId)
                                        {d3.selectAll('.tag-hoot-' + curId.mapId.toString()).each(showOnTop);}
                                        dispatch.loaded();
                                        dispatch.layerAdded(lyr);
                                    }
                                } else {
                                    var modifiedId = lastLoadedLayer.toString();
                                    d3.selectAll('.tag-hoot-'+modifiedId).each(showOnTop);
                                    dispatch.loaded();
                                    dispatch.layerAdded(layerName);
                                }
                                if(totalNodesCnt > maxNodesCnt){
                                    showDensityRaster(true);

                                    if (context.hoot().control.conflicts.isConflictReviewExist()) {
                                        // When zoomed out during review load reviewable items and the dependent relations
                                        var currReviewable = context.hoot().control.conflicts.actions.traversereview.getCurrentReviewable();
                                        if(currReviewable) {
                                            context.hoot().control.conflicts.actions.idgraphsynch.getRelationFeature(currReviewable.mapId, currReviewable.relationId, function(){
                                                context.hoot().model.conflicts.loadMissingFeatureDependencies(mapId,
                                                    layerName, context.hoot().control.conflicts.reviewIds, function(){
                                                    dispatch.loaded();
                                                    dispatch.layerAdded(layerName);
                                                });
                                            });
                                        }


                                    }
                                } else {
                                    showDensityRaster(false);
                                }
                                if(context.hoot().control.conflicts &&
                                    context.hoot().control.conflicts.isConflictReviewExist()){
                                    dispatch.reviewLayerAdded(layerName, false);
                                }
                                if(callback){
                                    callback();
                                }
                            }
                    }, mapId, layerName);
            });
        });
    },

    // Added from Hootenanny
    flush: function() {
        userDetails = undefined;
        _.forEach(inflight,abortRequest);
        loadedTiles = {};
        inflight = {};
        d3.select('.spinner').style('opacity',0);
        d3.select('.warning').style('opacity',0);
        return this;
    },

    switch: function(options) {
        urlroot = options.urlroot;

        oauth.options(_.extend({
            url: urlroot,
            loading: authLoading,
            done: authDone
        }, options));
        dispatch.call('change');
        this.reset();
        return this;
    },


    toggle: function(_) {
        off = !_;
        return this;
    },


    loadedTiles: function(_) {
        if (!arguments.length) return loadedTiles;
        loadedTiles = _;
        return this;
    },


    logout: function() {
        userDetails = undefined;
        oauth.logout();
        dispatch.call('change');  //dispatch.auth() in hoot 1.9.7
        return this;
    },


    authenticate: function(callback) {
        userDetails = undefined;
        function done(err, res) {
            rateLimitError = undefined;
            dispatch.call('change');
            if (callback) callback(err, res);
        }
        return oauth.authenticate(done);
    },

    /* ===== FUNCTIONS ADDED FOR HOOTENANNY ===== */
    createChangeset: function(mapId, comment, imageryUsed, callback) {
        oauth.xhr({
            method: 'PUT',
            path: '/api/0.6/changeset/create?mapId=' + mapId,
            options: {
                header: {
                    'Content-Type': 'text/xml'
                }
            },
            content: JXON.stringify(this.changesetJXON(this.changesetTags(comment, imageryUsed)))
        }, function (err, changesetId) {
            callback(err, changesetId);
        });        
    },

    closeChangeset: function (mapId, changesetId, callback) {
        oauth.xhr({
            method: 'PUT',
            path: '/api/0.6/changeset/' + changesetId + '/close?mapId=' + mapId,
            options: {
                header: {
                    'Content-Type': 'text/plain'
                }
            }
        }, function (err) {
            callback(err, changesetId);
        });
    },

    hideLayer: function (mapid) {
        if(loadedData[mapid]){
            loadedData[mapid].vis = false;
            d3.select('#map').selectAll('[class*=_' + mapid +']').remove();
            _.each(loadedTiles, function (a, b) {
                if (b.match(',' + mapid.toString() + '$')) {
                    delete loadedTiles[b];
                }
            });
            return dispatch.layer();
        }
    },

    showLayer: function (mapid) {
        loadedData[mapid].vis = true;
        return dispatch.layer();
    },

    visLayer: function (mapid) {
        if(loadedData[mapid]){
            return loadedData[mapid].vis;
        }
        return false;
    },

    hiddenLayers: function () {
        var ar = [];
        _.each(loadedData, function (layer) {
            if (!layer.vis) {
                ar.push(layer.mapId);
            }
        });
        return ar;
    },

    visLayers: function () {
        var ar = [];
        _.each(loadedData, function (layer) {
            if (layer.vis) {
                ar.push(layer.mapId);
            }
        });
        return ar;
    },

    refresh: function () {
        dispatch.layer();
    },

    lastLoadedLayer: function (d) {
        if(d){
            lastLoadedLayer=d;
            return lastLoadedLayer;
        }
        return lastLoadedLayer;
    },

    loadData: function (options) {
        var mapid = options.mapId;
        loadedData[mapid] = options;
        loadedData[mapid].vis = true;
        lastLoadedLayer=options.mapId.toString();
        dispatch.layer();
    },

    loadedDataRemove: function (mapid) {
        delete loadedData[mapid];
        _.each(loadedTiles, function (a, b) {
            if (b.match(',' + mapid + '$')) {
                delete loadedTiles[b];
            }
        });
        dispatch.layer();
    },

    loadedData: function () {
        return loadedData;
    },

    loadedTiles: function () {
        return loadedTiles;
    },

    getLoadableTiles: function (projection, dimensions) {
        var s = projection.scale() * 2 * Math.PI,
            z = Math.max(Math.log(s) / Math.log(2) - 8, 0),
            ts = 256 * Math.pow(2, z - tileZoom),
            origin = [
            s / 2 - projection.translate()[0], s / 2 - projection.translate()[1]];
        var visLayers = _.filter(loadedData, function(layer) {
            return layer.vis;
        });
        var mapidArr = _.map(loadedData, function(layer) {
            return layer.mapId;
        });
        var tiles = _.map(visLayers, function(layer) {
            var _tiles = d3geoTile()
                .scaleExtent([tileZoom, tileZoom])
                .scale(s)
                .size(dimensions)
                .translate(projection.translate())()
                .map(function (tile) {
                    var x = tile[0] * ts - origin[0],
                        y = tile[1] * ts - origin[1];
                    return {
                        id: tile.toString() + ',' + layer.mapId,
                        extent: geoExtent(
                            projection.invert([x, y + ts]), projection.invert([x + ts, y])),
                        mapId: layer.mapId,
                        layerName: layer.name
                    };
                });
            return _tiles;
        });
        tiles = _.flatten(tiles);
        _.filter(inflight, function(v, i) {
            var wanted = _.find(tiles, function (tile) {
                var mapids = _.find(mapidArr, function (a) {
                    return tile.mapId === a;
                });
                return i === tile.id + ',' + mapids;
            });
            if (!wanted) delete inflight[i];
            return !wanted;
        })
            .map(abortRequest);

        //var firstMapId = null;
        var params = [];
        tiles.forEach(function(tile) {
            var mapId = tile.mapId || mapId;
            //firstMapId = mapId;
            var layerName = tile.layerName || layerName;
            var vis = this.visLayer(mapId);

            _.find(loadedData, function (layer) {
                return layer.mapId === mapId;
            });

            if (!vis) return;

            var param = {};
            param.tile = tile.extent.toParam();
            param.mapId = '' + mapId;
            params.push(param);

        });

        return params;
    }
};
