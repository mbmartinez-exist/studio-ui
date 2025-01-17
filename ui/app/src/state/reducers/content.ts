/*
 * Copyright (C) 2007-2020 Crafter Software Corporation. All Rights Reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as published by
 * the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { createReducer } from '@reduxjs/toolkit';
import GlobalState from '../../models/GlobalState';
import {
  clearClipboard,
  completeDetailedItem,
  fetchDetailedItem,
  fetchDetailedItemComplete,
  fetchQuickCreateList,
  fetchQuickCreateListComplete,
  fetchQuickCreateListFailed,
  fetchSandboxItem,
  fetchSandboxItemComplete,
  localItemLock,
  reloadDetailedItem,
  restoreClipboard,
  setClipboard
} from '../actions/content';
import QuickCreateItem from '../../models/content/QuickCreateItem';
import StandardAction from '../../models/StandardAction';
import { AjaxError } from 'rxjs/ajax';
import {
  pathNavigatorConditionallySetPathComplete,
  pathNavigatorFetchParentItemsComplete,
  pathNavigatorFetchPathComplete
} from '../actions/pathNavigator';
import { parseSandBoxItemToDetailedItem } from '../../utils/content';
import { createLookupTable, reversePluckProps } from '../../utils/object';
import { DetailedItem, SandboxItem } from '../../models/Item';
import { changeSite } from './sites';
import {
  pathNavigatorTreeFetchPathChildrenComplete,
  pathNavigatorTreeFetchPathPageComplete,
  pathNavigatorTreeFetchPathsChildrenComplete,
  pathNavigatorTreeRestoreComplete
} from '../actions/pathNavigatorTree';
import { GetChildrenResponse } from '../../models/GetChildrenResponse';
import LookupTable from '../../models/LookupTable';
import { STATE_LOCKED_MASK } from '../../utils/constants';

type ContentState = GlobalState['content'];

const initialState: ContentState = {
  quickCreate: {
    error: null,
    isFetching: false,
    items: null
  },
  itemsByPath: {},
  clipboard: null,
  itemsBeingFetchedByPath: {}
};

const updateItemByPath = (state: ContentState, { payload: { parent, children } }) => {
  const nextByPath = {
    ...state.itemsByPath,
    ...createLookupTable(parseSandBoxItemToDetailedItem(children as SandboxItem[]), 'path')
  };
  if (children.levelDescriptor) {
    nextByPath[children.levelDescriptor.path] = parseSandBoxItemToDetailedItem(children.levelDescriptor);
  }
  if (parent) {
    nextByPath[parent.path] = parent;
  }
  return {
    ...state,
    itemsByPath: nextByPath
  };
};

const updateItemsBeingFetchedByPath = (state: ContentState, { payload: { path } }) => {
  return {
    ...state,
    itemsBeingFetchedByPath: {
      ...state.itemsBeingFetchedByPath,
      [path]: true
    }
  };
};

const reducer = createReducer<ContentState>(initialState, {
  [fetchQuickCreateList.type]: (state) => ({
    ...state,
    quickCreate: {
      ...state.quickCreate,
      isFetching: true
    }
  }),
  [fetchQuickCreateListComplete.type]: (state, { payload }: StandardAction<QuickCreateItem[]>) => ({
    ...state,
    quickCreate: {
      ...state.quickCreate,
      items: payload,
      isFetching: false
    }
  }),
  [fetchQuickCreateListFailed.type]: (state, error: StandardAction<AjaxError>) => ({
    ...state,
    quickCreate: {
      ...state.quickCreate,
      isFetching: false,
      error: error.payload.response
    }
  }),
  [fetchDetailedItem.type]: updateItemsBeingFetchedByPath,
  [reloadDetailedItem.type]: updateItemsBeingFetchedByPath,
  [completeDetailedItem.type]: updateItemsBeingFetchedByPath,
  [fetchSandboxItem.type]: updateItemsBeingFetchedByPath,
  [fetchDetailedItemComplete.type]: (state, { payload }) => ({
    ...state,
    itemsByPath: {
      ...state.itemsByPath,
      [payload.path]: payload
    },
    itemsBeingFetchedByPath: {
      ...reversePluckProps(state.itemsBeingFetchedByPath, payload.path)
    }
  }),
  [fetchSandboxItemComplete.type]: (state, { payload: { item } }) => ({
    ...state,
    itemsByPath: {
      ...state.itemsByPath,
      [item.path]: parseSandBoxItemToDetailedItem(item)
    },
    itemsBeingFetchedByPath: {
      ...reversePluckProps(state.itemsBeingFetchedByPath, item.path)
    }
  }),
  [restoreClipboard.type]: (state, { payload }) => ({
    ...state,
    clipboard: payload
  }),
  [setClipboard.type]: (state, { payload }) => ({
    ...state,
    clipboard: payload
  }),
  [clearClipboard.type]: (state) => ({
    ...state,
    clipboard: null
  }),
  [pathNavigatorConditionallySetPathComplete.type]: updateItemByPath,
  [pathNavigatorFetchPathComplete.type]: updateItemByPath,
  [pathNavigatorFetchParentItemsComplete.type]: (state, { payload: { items, children } }) => {
    return {
      ...state,
      itemsByPath: {
        ...state.itemsByPath,
        ...createLookupTable(children.map(parseSandBoxItemToDetailedItem), 'path'),
        ...(children.levelDescriptor && {
          [children.levelDescriptor.path]: parseSandBoxItemToDetailedItem(children.levelDescriptor)
        }),
        ...createLookupTable(items, 'path')
      }
    };
  },
  [pathNavigatorTreeFetchPathChildrenComplete.type]: updateItemByPath,
  [pathNavigatorTreeFetchPathPageComplete.type]: updateItemByPath,
  [pathNavigatorTreeRestoreComplete.type]: (
    state,
    { payload: { data, items } }: { payload: { data: LookupTable<GetChildrenResponse>; items: DetailedItem[] } }
  ) => {
    let nextByPath = {};
    Object.values(data).forEach((children) => {
      Object.assign(nextByPath, createLookupTable(parseSandBoxItemToDetailedItem(children as SandboxItem[]), 'path'));
      if (children.levelDescriptor) {
        nextByPath[children.levelDescriptor.path] = parseSandBoxItemToDetailedItem(children.levelDescriptor);
      }
    });

    items.forEach((item) => {
      nextByPath[item.path] = item;
    });

    return { ...state, itemsByPath: { ...state.itemsByPath, ...nextByPath } };
  },
  [pathNavigatorTreeFetchPathsChildrenComplete.type]: (
    state,
    { payload: { data } }: { payload: { data: LookupTable<GetChildrenResponse> } }
  ) => {
    let nextByPath = {};
    Object.values(data).forEach((children) => {
      Object.assign(nextByPath, createLookupTable(parseSandBoxItemToDetailedItem(children as SandboxItem[]), 'path'));
      if (children.levelDescriptor) {
        nextByPath[children.levelDescriptor.path] = parseSandBoxItemToDetailedItem(children.levelDescriptor);
      }
    });

    return { ...state, itemsByPath: { ...state.itemsByPath, ...nextByPath } };
  },
  [localItemLock.type]: (state, { payload }) => {
    if (state.itemsByPath[payload.path].lockOwner && state.itemsByPath[payload.path].stateMap.locked) {
      return state;
    }
    return {
      ...state,
      itemsByPath: {
        ...state.itemsByPath,
        [payload.path]: {
          ...state.itemsByPath[payload.path],
          lockOwner: payload.username,
          state: state.itemsByPath[payload.path].state + STATE_LOCKED_MASK,
          stateMap: { ...state.itemsByPath[payload.path].stateMap, locked: true }
        }
      }
    };
  },
  [changeSite.type]: () => initialState
});

export default reducer;
