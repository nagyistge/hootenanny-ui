iD.ui.MapInMap = function(context) {
    var key = '/';
    var dispatch = d3.dispatch('change','zoomPan');

    function map_in_map(selection) {
        var backgroundLayer = iD.TileLayer(),
            //dispatch = d3.dispatch('change','zoomPan'),
            //overlayLayer = iD.TileLayer(),
            overlayLayers = {},
            projection = iD.geo.RawMercator(),
            zoom = d3.behavior.zoom()
                .scaleExtent([ztok(0.5), ztok(24)])
                .on('zoom', zoomPan),
            transformed = false,
            panning = false,
            hidden = true,
            zDiff = 6,    // by default, minimap renders at (main zoom - 6)
            tStart, tLast, tCurr, kLast, kCurr, tiles, svg, timeoutId,
            geojson = [];

        function ztok(z) { return 256 * Math.pow(2, z); }
        function ktoz(k) { return Math.log(k) / Math.LN2 - 8; }


        function startMouse() {
            context.surface().on('mouseup.map-in-map-outside', endMouse);
            context.container().on('mouseup.map-in-map-outside', endMouse);

            tStart = tLast = tCurr = projection.translate();
            panning = true;
        }


        function zoomPan() {
            var e = d3.event.sourceEvent,
                t = d3.event.translate,
                k = d3.event.scale,
                zMain = ktoz(context.projection.scale() * 2 * Math.PI),
                zMini = ktoz(k);

            // restrict minimap zoom to < (main zoom - 3)
            if (zMini > zMain - 3) {
                zMini = zMain - 3;
                zoom.scale(kCurr).translate(tCurr);  // restore last good values
                return;
            }

            tCurr = t;
            kCurr = k;
            zDiff = zMain - zMini;

            var scale = kCurr / kLast,
                tX = Math.round((tCurr[0] / scale - tLast[0]) * scale),
                tY = Math.round((tCurr[1] / scale - tLast[1]) * scale);

            iD.util.setTransform(tiles, tX, tY, scale);
            iD.util.setTransform(svg, 0, 0, scale);
            transformed = true;

            queueRedraw();

            e.preventDefault();
            e.stopPropagation();
        }

        //iD 1.9.2 introduced wrap over selection


        function endMouse() {
            context.surface().on('mouseup.map-in-map-outside', null);
            context.container().on('mouseup.map-in-map-outside', null);

            updateProjection();
            panning = false;

            if (tCurr[0] !== tStart[0] && tCurr[1] !== tStart[1]) {
                var dMini = wrap.dimensions(),
                    cMini = [ dMini[0] / 2, dMini[1] / 2 ];

                context.map().center(projection.invert(cMini));
            }
        }


        function updateProjection() {
            var loc = context.map().center(),
                dMini = wrap.dimensions(),
                cMini = [ dMini[0] / 2, dMini[1] / 2 ],
                tMain = context.projection.translate(),
                kMain = context.projection.scale(),
                zMain = ktoz(kMain * 2 * Math.PI),
                zMini = Math.max(zMain - zDiff, 0.5),
                kMini = ztok(zMini);

            projection
                .translate(tMain)
                .scale(kMini / (2 * Math.PI));

            var s = projection(loc),
                mouse = panning ? [ tCurr[0] - tStart[0], tCurr[1] - tStart[1] ] : [0, 0],
                tMini = [
                    cMini[0] - s[0] + tMain[0] + mouse[0],
                    cMini[1] - s[1] + tMain[1] + mouse[1]
                ];

            projection
                .translate(tMini)
                .clipExtent([[0, 0], dMini]);

            zoom
                .center(cMini)
                .translate(tMini)
                .scale(kMini);

            tLast = tCurr = tMini;
            kLast = kCurr = kMini;

            if (transformed) {
                iD.util.setTransform(tiles, 0, 0);
                iD.util.setTransform(svg, 0, 0);
                transformed = false;
            }
        }


        function redraw() {
            if (hidden) return;

            updateProjection();

            var dMini = wrap.dimensions(),
                zMini = ktoz(projection.scale() * 2 * Math.PI);

            // setup tile container
            tiles = wrap
                .selectAll('.map-in-map-tiles')
                .data([0]);

            tiles
                .enter()
                .append('div')
                .attr('class', 'map-in-map-tiles');


            // redraw background
            backgroundLayer
                .source(context.background().baseLayerSource())
                .projection(projection)
                .dimensions(dMini);

            var background = tiles
                .selectAll('.map-in-map-background')
                .data([0]);

            background.enter()
                .append('div')
                .attr('class', 'map-in-map-background');

            background
                .call(backgroundLayer);

            // redraw overlay
            var overlaySources = context.background().overlayLayerSources(),
                // hasOverlay = false,
                activeOverlayLayers = [];
            for (var i = 0; i < overlaySources.length; i++) {
                if (overlaySources[i].validZoom(zMini)) {
                    if (!overlayLayers[i]) overlayLayers[i] = iD.TileLayer();
                    activeOverlayLayers.push(overlayLayers[i]
                        .source(overlaySources[i])
                        .projection(projection)
                        .dimensions(dMini));
                }
            }

            var overlay = tiles
                .selectAll('.map-in-map-overlay')
                .data([0]);

            overlay.enter()
                .append('div')
                .attr('class', 'map-in-map-overlay');

            var overlays = overlay
                .selectAll('div')
                .data(activeOverlayLayers, function(d) { return d.source().name(); });

            overlays.enter().append('div');
            overlays.each(function(layer) {
                d3.select(this).call(layer);
            });

            overlays.exit()
                .remove();

            // if (hasOverlay) {
            //     overlay
            //         .call(overlayLayer);
            // }

            // redraw bounding box
            if (!panning) {
                var getPath = d3.geo.path().projection(projection),
                    bbox = { type: 'Polygon', coordinates: [context.map().extent().polygon()] };

                svg = wrap.selectAll('.map-in-map-svg')
                    .data([0]);

                svg.enter()
                    .append('svg')
                    .attr('class', 'map-in-map-svg');

                var path = svg.selectAll('.map-in-map-bbox')
                    .data([bbox]);

                path.enter()
                    .append('path')
                    .attr('class', 'map-in-map-bbox');

                path
                    .attr('d', getPath)
                    .classed('thick', function(d) { return getPath.area(d) < 30; });
            }

            // redraw geojson layers
            if (!panning) {
                getPath = d3.geo.path().projection(projection);

                var g = svg.selectAll('.map-in-map-geojson')
                    .data([0]);

                g.enter()
                    .insert('g', '.map-in-map-bbox')
                    .attr('class', 'map-in-map-geojson');

                path = g.selectAll('.map-in-map-geojson')
                    .data(geojson);

                path.enter()
                    .append('path');
                path.exit().remove();
                path.attr('d', getPath)
                    .attr('class', function(d) {
                        return 'map-in-map-geojson ' + d.properties.class;
                    });
                d3.select('path.map-in-map-geojson.locked').moveToFront();
            }
        }


        function queueRedraw() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function() { redraw(); dispatch.zoomPan(); }, 300);
        }

        //Unnecessary function?
        // function hidden() {
        //     return selection.style('display') === 'none';
        // }

        map_in_map.hidden = function() {
            return hidden;
        };

        function toggle() {
            if (d3.event) d3.event.preventDefault();

            hidden = !hidden;

            var label = d3.select('.minimap-toggle');
            label.classed('active', !hidden)
                .select('input').property('checked', !hidden);

            if (hidden) {
                wrap
                    .style('display', 'block')
                    .style('opacity', 1)
                    .transition()
                    .duration(200)
                    .style('opacity', 0)
                    .each('end', function() {
                        d3.select(this).style('display', 'none');
                    });
            } else {
                wrap
                    .style('display', 'block')
                    .style('opacity', 0)
                    .transition()
                    .duration(200)
                    .style('opacity', 1);

                redraw();
            }
        }

        iD.ui.MapInMap.toggle = toggle;

        var wrap = selection.selectAll('.map-in-map')
            .data([0]);

         wrap.enter()
            .append('div')
            .attr('id', 'map-in-map')
            .attr('class', 'map-in-map')
            .style('display', (hidden ? 'none' : 'block'))
            .on('mousedown.map-in-map', startMouse)
            .on('mouseup.map-in-map', endMouse)
            .call(zoom)
            .on('dblclick.zoom', null);

        map_in_map.loadGeoJson = function(gj) {
            geojson = gj;
            redraw();
        };

        map_in_map.extent = function() {
            return new iD.geo.Extent(projection.invert([0, selection.dimensions()[1]]),
                                 projection.invert([selection.dimensions()[0], 0]));
        };

        context.map()
            .on('drawn.map-in-map', function(drawn) {
                if (drawn.full === true) redraw();
            })
            .on('move.map-in-map', redraw);

        context.MapInMap = map_in_map;

        redraw();

        var keybinding = d3.keybinding('map-in-map')
            .on(key, toggle);

        d3.select(document)
            .call(keybinding);
    }

    return d3.rebind(map_in_map, dispatch, 'on');
};
