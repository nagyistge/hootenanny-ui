iD.operations.Info = function(selectedIDs, context) {
    var action = iD.ui.Info(entityId);
    var entityId = selectedIDs[0];

    var operation = function() {
        context.perform(
            action,
            t('operations.info.annotation'));
    };


    operation.disabled = function() {
        return false;
    };


    operation.tooltip = function() {
        return t('operations.info.description');
    };

    operation.available = function() {
        return selectedIDs.length > 1 ||
            context.entity(selectedIDs[0]).type !== 'node';
    };

    operation.id = 'info';
    operation.keys = [iD.ui.cmd('I'), t('operations.info.key')];
    operation.title = t('operations.info.title');


    return operation;
};