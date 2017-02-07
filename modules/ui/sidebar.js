import _ from 'lodash';
import { uiFeatureList } from './feature_list';
import { uiInspector } from './inspector';
import { uiNotice } from './notice';
import { uiLayerMenu } from './layer_menu';


export function uiSidebar(context) {
    var inspector = uiInspector(context),
        current;


    function sidebar(selection) {
        var featureListWrap = selection
            .append('div')
            .attr('class', 'feature-list-pane')
            .call(uiFeatureList(context));

        selection
            .call(uiNotice(context));

        selection
            .call(uiLayerMenu(context));

        var inspectorWrap = selection
            .append('div')
            .attr('class', 'inspector-hidden inspector-wrap fr');


        function hover(id) {
            if (!current && context.hasEntity(id)) {
                featureListWrap
                    .classed('inspector-hidden', true);

                inspectorWrap
                    .classed('inspector-hidden', false)
                    .classed('inspector-hover', true);

                if (inspector.entityID() !== id || inspector.state() !== 'hover') {
                    inspector
                        .state('hover')
                        .entityID(id);

                    inspectorWrap
                        .call(inspector);
                }

            } else if (!current) {
                featureListWrap
                    .classed('inspector-hidden', false);
                inspectorWrap
                    .classed('inspector-hidden', true);
                inspector
                    .state('hide');
            }
        }


        sidebar.hover = _.throttle(hover, 200);


        sidebar.select = function(id, newFeature) {
            if (!current && id) {
                featureListWrap
                    .classed('inspector-hidden', true);

                inspectorWrap
                    .classed('inspector-hidden', false)
                    .classed('inspector-hover', false);

                if (inspector.entityID() !== id || inspector.state() !== 'select') {
                    inspector
                        .state('select')
                        .entityID(id)
                        .newFeature(newFeature);

                    inspectorWrap
                        .call(inspector);
                }

            } else if (!current) {
                featureListWrap
                    .classed('inspector-hidden', false);
                inspectorWrap
                    .classed('inspector-hidden', true);
                inspector
                    .state('hide');
            }
        };


        sidebar.show = function(component) {
            featureListWrap
                .classed('inspector-hidden', true);
            inspectorWrap
                .classed('inspector-hidden', true);

            if (current) current.remove();
            current = selection
                .append('div')
                .attr('class', 'sidebar-component')
                .call(component);
        };


        sidebar.hide = function() {
            featureListWrap
                .classed('inspector-hidden', false);
            inspectorWrap
                .classed('inspector-hidden', true);

            if (current) current.remove();
            current = null;
        };
    }


    sidebar.hover = function() {};
    sidebar.hover.cancel = function() {};
    sidebar.select = function() {};
    sidebar.show = function() {};
    sidebar.hide = function() {};

    return sidebar;
}
