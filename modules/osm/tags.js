export function osmIsInterestingTag(key) {
    return key !== 'attribution' &&
        key !== 'created_by' &&
        key !== 'source' &&
        key !== 'odbl' &&
        key.indexOf('tiger:') !== 0 &&
        key !== 'error:circular' &&
        key !== 'hoot:status';

}


export var osmOneWayTags = {
    'aerialway': {
        'chair_lift': true,
        'mixed_lift': true,
        't-bar': true,
        'j-bar': true,
        'platter': true,
        'rope_tow': true,
        'magic_carpet': true,
        'yes': true
    },
    'highway': {
        'motorway': true,
        'motorway_link': true
    },
    'junction': {
        'roundabout': true
    },
    'man_made': {
        'piste:halfpipe': true
    },
    'piste:type': {
        'downhill': true,
        'sled': true,
        'yes': true
    },
    'waterway': {
        'river': true,
        'stream': true
    }
};


export var osmPavedTags = {
    'surface': {
        'paved': true,
        'asphalt': true,
        'concrete': true
    },
    'tracktype': {
        'grade1': true
    }
};