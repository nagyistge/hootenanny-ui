import { actionChangeTags } from './change_tags';
import { actionDeleteRelation } from './delete_relation';
import { actionDeleteWay } from './delete_way';


// https://github.com/openstreetmap/potlatch2/blob/master/net/systemeD/halcyon/connection/actions/DeleteNodeAction.as
export function actionDeleteNode(nodeId) {
    // From Hootenanny 1.9.x
    // Hootenanny review validation
    function isHootReview(entity) {
        if(entity.tags['hoot:review:needs']) {
            return true;
        }
        return false;
    }

    // Mark the hoot reviewable resolved
    // May be we should move hoot functions to hoot modules
    // but this seems to be low level tag ops which may make
    // sense to leave it here
    function updateHootReviewTags(entity, graph) {
        var tags = entity.tags;
        var newTags = _.clone(tags);
        newTags['hoot:review:needs'] = 'no';
        return actionChangeTags(entity.id, newTags)(graph);
    }

    var action = function(graph) {
        var node = graph.entity(nodeId);

        graph.parentWays(node)
            .forEach(function(parent) {
                parent = parent.removeNode(nodeId);
                graph = graph.replace(parent);

                if (parent.isDegenerate()) {
                    graph = actionDeleteWay(parent.id)(graph);
                }
            });

        graph.parentRelations(node)
            .forEach(function(parent) {
                parent = parent.removeMembersWithID(nodeId);
                graph = graph.replace(parent);

                if (parent.isDegenerate()) {
                    // If we are in hoot review mode then do not delete relation
                    // This can happen only during hootenanny POI automerge
                    if(isHootReview(parent) === false){
                       graph = actionDeleteRelation(parent.id)(graph);
                    } else {
                        graph = updateHootReviewTags(parent, graph);

                    }
                } else {
                    if(!node.hootMeta || (node.hootMeta && !node.hootMeta.isReviewDel)){
                        graph = updateHootReviewTags(parent, graph);
                    }
                }
            });

        return graph.remove(node);
    };


    action.disabled = function() {
        return false;
    };


    return action;
}
