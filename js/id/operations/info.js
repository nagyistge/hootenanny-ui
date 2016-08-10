iD.operations.Info = function(selectedIDs, context) {
    var entityId = selectedIDs[0];

    var operation = function() {
        context.perform(
            iD.actions.Reverse(entityId),
            t('operations.info.annotation'));
    };
/*
    operation.available = function() {
        return selectedIDs.length === 1 &&
            entity.type === 'way' &&
            _.uniq(entity.nodes).length > 1;
    };

    operation.disabled = function() {
        var reason;
        if (extent.percentContainedIn(context.extent()) < 0.8) {
            reason = 'too_large';
        } else if (context.hasHiddenConnections(entityId)) {
            reason = 'connected_to_hidden';
        }
        return action.disabled(context.graph()) || reason;
    };
*/
    operation.tooltip = function() {
        return t('operations.info.description');
    };

    operation.id = 'info';
    operation.keys = [t('operations.info.key')];
    operation.title = t('operations.info.title');

    return operation;
};
