// Import Redux
const { createStore } = Redux;

// Initial State
const initialState = {
    bags: [], // Stores fetched bag data
    bagsPagination: {
        total: 0,
        page: 1,
        per_page: 10
    },
    selectedBags: [] // Stores selected bags
};

// Action Types
const SET_BAGS = "SET_BAGS";
const SET_PAGINATION = "SET_PAGINATION";
const TOGGLE_BAG_SELECTION = "TOGGLE_BAG_SELECTION";
const CLEAR_SELECTED_BAGS = "CLEAR_SELECTED_BAGS";

// Action Creators
function setBags(bags) {
    return {
        type: SET_BAGS,
        payload: bags
    };
}

function setPagination(pagination) {
    return {
        type: SET_PAGINATION,
        payload: pagination
    };
}

function toggleBagSelection(bag) {
    return {
        type: TOGGLE_BAG_SELECTION,
        payload: bag
    };
}

function clearSelectedBags() {
    return {
        type: CLEAR_SELECTED_BAGS
    };
}

// Reducer Function (Without Spread Operator)
function bagReducer(state, action) {
    if (typeof state === 'undefined') {
        state = initialState;
    }

    switch (action.type) {
        case SET_BAGS:
            return Object.assign({}, state, { bags: action.payload });

        case SET_PAGINATION:
            return Object.assign({}, state, { bagsPagination: action.payload });

        case TOGGLE_BAG_SELECTION:
            var exists = false;
            var updatedSelectedBags = [];

            for (var i = 0; i < state.selectedBags.length; i++) {
                if (state.selectedBags[i].Bag_ID === action.payload.Bag_ID) {
                    exists = true; // Bag already exists, remove it
                } else {
                    updatedSelectedBags.push(state.selectedBags[i]);
                }
            }

            if (!exists) {
                updatedSelectedBags.push(action.payload);
            }

            return Object.assign({}, state, { selectedBags: updatedSelectedBags });

        case CLEAR_SELECTED_BAGS:
            return Object.assign({}, state, { selectedBags: [] });

        default:
            return state;
    }
}

// Create Store
var store = createStore(bagReducer);

// Export actions and store
window.store = store; // Attach store to window for debugging
window.setBags = setBags;
window.setPagination = setPagination;
window.toggleBagSelection = toggleBagSelection;
window.clearSelectedBags = clearSelectedBags;
