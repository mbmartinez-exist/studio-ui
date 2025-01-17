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
import GlobalState, { PagedEntityState } from '../../models/GlobalState';
import {
  CLEAR_DROP_TARGETS,
  CLEAR_SELECT_FOR_EDIT,
  CLOSE_TOOLS,
  CONTENT_TYPE_DROP_TARGETS_RESPONSE,
  EDIT_MODE_CHANGED,
  FETCH_ASSETS_PANEL_ITEMS,
  FETCH_ASSETS_PANEL_ITEMS_COMPLETE,
  FETCH_ASSETS_PANEL_ITEMS_FAILED,
  FETCH_COMPONENTS_BY_CONTENT_TYPE,
  FETCH_COMPONENTS_BY_CONTENT_TYPE_COMPLETE,
  FETCH_COMPONENTS_BY_CONTENT_TYPE_FAILED,
  FETCH_CONTENT_MODEL_COMPLETE,
  fetchAudiencesPanelModel,
  fetchAudiencesPanelModelComplete,
  fetchAudiencesPanelModelFailed,
  fetchGuestModelComplete,
  fetchPrimaryGuestModelComplete,
  GUEST_CHECK_IN,
  GUEST_CHECK_OUT,
  guestModelUpdated,
  guestPathUpdated,
  initPageBuilderPanelConfig,
  initToolbarConfig,
  initToolsPanelConfig,
  OPEN_TOOLS,
  popPageBuilderPanelPage,
  popToolsPanelPage,
  pushPageBuilderPanelPage,
  pushToolsPanelPage,
  SELECT_FOR_EDIT,
  SET_ACTIVE_TARGETING_MODEL,
  SET_ACTIVE_TARGETING_MODEL_COMPLETE,
  SET_ACTIVE_TARGETING_MODEL_FAILED,
  SET_CONTENT_TYPE_FILTER,
  SET_HOST_HEIGHT,
  SET_HOST_SIZE,
  SET_HOST_WIDTH,
  SET_ITEM_BEING_DRAGGED,
  setHighlightMode,
  setPreviewChoice,
  UPDATE_AUDIENCES_PANEL_MODEL,
  updatePageBuilderPanelWidth,
  updateToolsPanelWidth
} from '../actions/preview';
import { applyDeserializedXMLTransforms, createEntityState, createLookupTable, nnou, nou } from '../../utils/object';
import {
  ComponentsContentTypeParams,
  ContentInstancePage,
  ElasticParams,
  MediaItem,
  SearchResult
} from '../../models/Search';
import ContentInstance from '../../models/ContentInstance';
import { changeSite } from './sites';
import { fetchGlobalPropertiesComplete } from '../actions/user';
import { storeInitialized } from '../actions/system';
import { deserialize, fromString } from '../../utils/xml';
import { defineMessages } from 'react-intl';

const messages = defineMessages({
  emptyUiConfigMessageTitle: {
    id: 'emptyUiConfigMessageTitle.title',
    defaultMessage: 'Configuration is empty'
  },
  emptyUiConfigMessageSubtitle: {
    id: 'emptyUiConfigMessageTitle.subtitle',
    defaultMessage: 'Nothing is set to be shown here.'
  },
  noUiConfigMessageTitle: {
    id: 'noUiConfigMessageTitle.title',
    defaultMessage: 'Configuration file missing'
  },
  noUiConfigMessageSubtitle: {
    id: 'noUiConfigMessageTitle.subtitle',
    defaultMessage: 'Add & configure `ui.xml` on your site to show content here.'
  }
});

const audiencesPanelInitialState = {
  isFetching: null,
  isApplying: false,
  error: null,
  model: null,
  applied: false
};

const assetsPanelInitialState = createEntityState({
  page: [],
  query: {
    keywords: '',
    offset: 0,
    limit: 10,
    filters: {
      'mime-type': ['image/png', 'image/jpeg', 'image/gif', 'video/mp4', 'image/svg+xml']
    }
  }
}) as PagedEntityState<MediaItem>;

const componentsInitialState = createEntityState({
  page: [],
  query: {
    keywords: '',
    offset: 0,
    limit: 10,
    type: 'Component'
  },
  contentTypeFilter: '',
  inPageInstances: {}
}) as PagedEntityState<ContentInstance>;

const fetchGuestModelsCompleteHandler = (state, { type, payload }) => {
  if (nnou(state.guest)) {
    return {
      ...state,
      guest: {
        ...state.guest,
        modelId: type === fetchPrimaryGuestModelComplete.type ? payload.model.craftercms.id : state.guest.modelId,
        models: {
          ...state.guest.models,
          ...payload.modelLookup
        },
        modelIdByPath: {
          ...state.guest.modelIdByPath,
          ...payload.modelIdByPath
        },
        childrenMap: {
          ...state.guest?.childrenMap,
          ...payload.childrenMap
        }
      }
    };
  } else {
    // TODO: Currently getting models before check in some cases when coming from a different site.
    console.error('[reducer/preview] Guest models received before guest check in.');
    return state;
  }
};

const reducer = createReducer<GlobalState['preview']>(
  {
    editMode: true,
    highlightMode: 'ALL',
    previewChoice: {},
    hostSize: { width: null, height: null },
    toolsPanelPageStack: [],
    showToolsPanel: process.env.REACT_APP_SHOW_TOOLS_PANEL ? process.env.REACT_APP_SHOW_TOOLS_PANEL === 'true' : true,
    toolsPanelWidth: 240,
    pageBuilderPanelWidth: 240,
    pageBuilderPanelStack: [],
    guest: null,
    assets: assetsPanelInitialState,
    audiencesPanel: audiencesPanelInitialState,
    components: componentsInitialState,
    dropTargets: {
      selectedContentType: null,
      byId: null
    },
    toolsPanel: null,
    toolbar: {
      leftSection: null,
      middleSection: null,
      rightSection: null
    },
    pageBuilderPanel: null
  },
  {
    [storeInitialized.type]: (state, { payload }) =>
      payload.properties.previewChoice
        ? {
            ...state,
            previewChoice: JSON.parse(payload.properties.previewChoice)
          }
        : state,
    [OPEN_TOOLS]: (state) => {
      return {
        ...state,
        showToolsPanel: true
      };
    },
    [CLOSE_TOOLS]: (state) => {
      return {
        ...state,
        showToolsPanel: false
      };
    },
    [SET_HOST_SIZE]: (state, { payload }) => {
      if (isNaN(payload.width)) {
        payload.width = state.hostSize.width;
      }
      if (isNaN(payload.height)) {
        payload.height = state.hostSize.height;
      }
      return {
        ...state,
        hostSize: {
          ...state.hostSize,
          width: minFrameSize(payload.width),
          height: minFrameSize(payload.height)
        }
      };
    },
    [SET_HOST_WIDTH]: (state, { payload }) => {
      if (isNaN(payload)) {
        return state;
      }
      return {
        ...state,
        hostSize: {
          ...state.hostSize,
          width: minFrameSize(payload)
        }
      };
    },
    [SET_HOST_HEIGHT]: (state, { payload }) => {
      if (isNaN(payload)) {
        return state;
      }
      return {
        ...state,
        hostSize: {
          ...state.hostSize,
          height: minFrameSize(payload)
        }
      };
    },
    [FETCH_CONTENT_MODEL_COMPLETE]: (state, { payload }) => {
      return {
        ...state,
        currentModels: payload
      };
    },
    [GUEST_CHECK_IN]: (state, { payload }) => {
      const { location, modelId, path } = payload;
      const href = location.href;
      const origin = location.origin;
      const url = href.replace(location.origin, '');
      return {
        ...state,
        guest: {
          url,
          origin,
          modelId,
          path,
          models: null,
          childrenMap: null,
          modelIdByPath: null,
          selected: null,
          itemBeingDragged: null
        }
      };
    },
    [GUEST_CHECK_OUT]: (state) => {
      let nextState = state;
      if (state.guest) {
        nextState = {
          ...nextState,
          guest: null
        };
      }
      // If guest checks out, doesn't mean site is changing necessarily
      // hence content types haven't changed
      // if (state.contentTypes) {
      //   nextState = { ...nextState, contentTypes: null };
      // }
      return nextState;
    },
    [fetchPrimaryGuestModelComplete.type]: fetchGuestModelsCompleteHandler,
    [fetchGuestModelComplete.type]: fetchGuestModelsCompleteHandler,
    [guestModelUpdated.type]: (state, { payload: { model } }) => ({
      ...state,
      guest: {
        ...state.guest,
        models: {
          ...state.guest.models,
          [model.craftercms.id]: model
        }
      }
    }),
    [SELECT_FOR_EDIT]: (state, { payload }) => {
      if (state.guest === null) {
        return state;
      }
      return {
        ...state,
        guest: {
          ...state.guest,
          selected: [payload]
        }
      };
    },
    [CLEAR_SELECT_FOR_EDIT]: (state, { payload }) => {
      if (state.guest === null) {
        return state;
      }
      return {
        ...state,
        guest: {
          ...state.guest,
          selected: null
        }
      };
    },
    [SET_ITEM_BEING_DRAGGED]: (state, { payload }) => {
      if (nou(state.guest)) {
        return state;
      }
      return {
        ...state,
        guest: {
          ...state.guest,
          itemBeingDragged: payload
        }
      };
    },
    [changeSite.type]: (state, { payload }) => {
      return {
        ...state,
        audiencesPanel: audiencesPanelInitialState,
        components: componentsInitialState,
        assets: assetsPanelInitialState
      };
    },
    [fetchAudiencesPanelModel.type]: (state) => ({
      ...state,
      audiencesPanel: {
        ...state.audiencesPanel,
        isFetching: true,
        error: null
      }
    }),
    [fetchAudiencesPanelModelComplete.type]: (state, { payload }) => {
      return {
        ...state,
        audiencesPanel: {
          ...state.audiencesPanel,
          isFetching: false,
          error: null,
          model: payload
        }
      };
    },
    [fetchAudiencesPanelModelFailed.type]: (state, { payload }) => ({
      ...state,
      audiencesPanel: { ...state.audiencesPanel, error: payload.response, isFetching: false }
    }),
    [UPDATE_AUDIENCES_PANEL_MODEL]: (state, { payload }) => ({
      ...state,
      audiencesPanel: {
        ...state.audiencesPanel,
        applied: false,
        model: {
          ...state.audiencesPanel.model,
          ...payload
        }
      }
    }),
    [SET_ACTIVE_TARGETING_MODEL]: (state, { payload }) => ({
      ...state,
      audiencesPanel: {
        ...state.audiencesPanel,
        isApplying: true
      }
    }),
    [SET_ACTIVE_TARGETING_MODEL_COMPLETE]: (state, { payload }) => ({
      ...state,
      audiencesPanel: {
        ...state.audiencesPanel,
        isApplying: false,
        applied: true
      }
    }),
    [SET_ACTIVE_TARGETING_MODEL_FAILED]: (state, { payload }) => ({
      ...state,
      audiencesPanel: {
        ...state.audiencesPanel,
        isApplying: false,
        applied: false,
        error: payload.response
      }
    }),
    [FETCH_ASSETS_PANEL_ITEMS]: (state, { payload: query }: { payload: ElasticParams }) => {
      let newQuery = { ...state.assets.query, ...query };
      return {
        ...state,
        assets: {
          ...state.assets,
          isFetching: true,
          query: newQuery,
          pageNumber: Math.ceil(newQuery.offset / newQuery.limit)
        }
      };
    },
    [FETCH_ASSETS_PANEL_ITEMS_COMPLETE]: (state, { payload: searchResult }: { payload: SearchResult }) => {
      let itemsLookupTable = createLookupTable<MediaItem>(searchResult.items, 'path');
      let page = [...state.assets.page];
      page[state.assets.pageNumber] = searchResult.items.map((item) => item.path);
      return {
        ...state,
        assets: {
          ...state.assets,
          byId: { ...state.assets.byId, ...itemsLookupTable },
          page,
          count: searchResult.total,
          isFetching: false,
          error: null
        }
      };
    },
    [FETCH_ASSETS_PANEL_ITEMS_FAILED]: (state, { payload }) => ({
      ...state,
      assets: { ...state.assets, error: payload.response, isFetching: false }
    }),
    [FETCH_COMPONENTS_BY_CONTENT_TYPE]: (
      state,
      {
        payload: { contentTypeFilter, options }
      }: {
        payload: { contentTypeFilter: string[] | string; options?: ComponentsContentTypeParams };
      }
    ) => {
      let newQuery = { ...state.components.query, ...options };
      return {
        ...state,
        components: {
          ...state.components,
          isFetching: true,
          query: newQuery,
          pageNumber: Math.ceil(newQuery.offset / newQuery.limit),
          contentTypeFilter: contentTypeFilter ? contentTypeFilter : state.components.contentTypeFilter
        }
      };
    },
    [FETCH_COMPONENTS_BY_CONTENT_TYPE_COMPLETE]: (state, { payload }: { payload: ContentInstancePage }) => {
      let page = [...state.components.page];
      page[state.components.pageNumber] = Object.keys(payload.lookup);
      return {
        ...state,
        components: {
          ...state.components,
          byId: { ...state.components.byId, ...payload.lookup },
          page,
          count: payload.count,
          isFetching: false,
          error: null
        }
      };
    },
    [FETCH_COMPONENTS_BY_CONTENT_TYPE_FAILED]: (state, { payload }) => ({
      ...state,
      components: { ...state.components, error: payload.response, isFetching: false }
    }),
    [CONTENT_TYPE_DROP_TARGETS_RESPONSE]: (state, { payload }) => ({
      ...state,
      dropTargets: {
        ...state.dropTargets,
        selectedContentType: payload.contentTypeId,
        byId: { ...state.dropTargets.byId, ...createLookupTable(payload.dropTargets) }
      }
    }),
    [CLEAR_DROP_TARGETS]: (state, { payload }) => ({
      ...state,
      dropTargets: {
        ...state.dropTargets,
        selectedContentType: null,
        byId: null
      }
    }),
    [SET_CONTENT_TYPE_FILTER]: (state, { payload }) => ({
      ...state,
      components: {
        ...state.components,
        isFetching: null,
        contentTypeFilter: payload,
        query: {
          ...state.components.query,
          offset: 0,
          keywords: ''
        }
      }
    }),
    [EDIT_MODE_CHANGED]: (state, { payload }) => ({
      ...state,
      editMode: payload.editMode
    }),
    [updateToolsPanelWidth.type]: (state, { payload }) => {
      const minDrawerWidth = 240;
      const maxDrawerWidth = 500;
      if (payload.width < minDrawerWidth || payload.width > maxDrawerWidth) {
        return state;
      }
      return {
        ...state,
        toolsPanelWidth: payload.width
      };
    },
    [updatePageBuilderPanelWidth.type]: (state, { payload }) => {
      const minDrawerWidth = 240;
      const maxDrawerWidth = 500;
      if (payload.width < minDrawerWidth || payload.width > maxDrawerWidth) {
        return state;
      }
      return {
        ...state,
        pageBuilderPanelWidth: payload.width
      };
    },
    [pushToolsPanelPage.type]: (state, { payload }) => {
      return {
        ...state,
        toolsPanelPageStack: [...state.toolsPanelPageStack, payload]
      };
    },
    [popToolsPanelPage.type]: (state) => {
      let stack = [...state.toolsPanelPageStack];
      stack.pop();
      return {
        ...state,
        toolsPanelPageStack: stack
      };
    },
    [pushPageBuilderPanelPage.type]: (state, { payload }) => {
      return {
        ...state,
        pageBuilderPanelStack: [...state.pageBuilderPanelStack, payload]
      };
    },
    [popPageBuilderPanelPage.type]: (state) => {
      let stack = [...state.pageBuilderPanelStack];
      stack.pop();
      return {
        ...state,
        pageBuilderPanelStack: stack
      };
    },
    [guestPathUpdated.type]: (state, { payload }) => ({
      ...state,
      guest: {
        ...state.guest,
        path: payload.path
      }
    }),
    [setHighlightMode.type]: (state, { payload }) => ({
      ...state,
      highlightMode: payload.highlightMode
    }),
    [setPreviewChoice.type]: (state, { payload }) => ({
      ...state,
      previewChoice: { ...state.previewChoice, [payload.site]: payload.previewChoice }
    }),
    [fetchGlobalPropertiesComplete.type]: (state, { payload }) => ({
      ...state,
      previewChoice: { ...state.previewChoice, ...JSON.parse(payload.previewChoice ?? '{}') }
    }),
    [initToolsPanelConfig.type]: (state, { payload }) => {
      let toolsPanelConfig = {
        widgets: [
          {
            id: 'craftercms.component.EmptyState',
            uiKey: -1,
            configuration: {
              title: messages.noUiConfigMessageTitle,
              subtitle: messages.noUiConfigMessageSubtitle
            }
          }
        ]
      };
      const arrays = ['widgets', 'permittedRoles', 'excludes'];
      const lookupTables = ['fields'];
      const configDOM = fromString(payload.configXml);
      const toolsPanelPages = configDOM.querySelector(
        '[id="craftercms.components.ToolsPanel"] > configuration > widgets'
      );
      if (toolsPanelPages) {
        toolsPanelConfig = applyDeserializedXMLTransforms(deserialize(toolsPanelPages), {
          arrays,
          lookupTables
        });
      }
      return {
        ...state,
        ...(payload.pageStack ? { toolsPanelPageStack: [...state.toolsPanelPageStack, payload.pageStack] } : {}),
        toolsPanel: toolsPanelConfig
      };
    },
    [initToolbarConfig.type]: (state, { payload }) => {
      let toolbarConfig = {
        leftSection: null,
        middleSection: null,
        rightSection: null
      };
      const arrays = ['widgets'];
      const configDOM = fromString(payload.configXml);
      const toolbar = configDOM.querySelector('[id="craftercms.components.PreviewToolbar"] > configuration');

      if (toolbar) {
        const leftSection = toolbar.querySelector('leftSection > widgets');
        if (leftSection) {
          toolbarConfig.leftSection = applyDeserializedXMLTransforms(deserialize(leftSection), {
            arrays
          });
        }
        const middleSection = toolbar.querySelector('middleSection > widgets');
        if (middleSection) {
          toolbarConfig.middleSection = applyDeserializedXMLTransforms(deserialize(middleSection), {
            arrays
          });
        }
        const rightSection = toolbar.querySelector('rightSection > widgets');
        if (rightSection) {
          toolbarConfig.rightSection = applyDeserializedXMLTransforms(deserialize(rightSection), {
            arrays
          });
        }
      }

      return {
        ...state,
        toolbar: toolbarConfig
      };
    },
    [initPageBuilderPanelConfig.type]: (state, { payload }) => {
      let pageBuilderPanelConfig = {
        widgets: [
          {
            id: 'craftercms.component.EmptyState',
            uiKey: -1,
            configuration: {
              title: messages.noUiConfigMessageTitle,
              subtitle: messages.noUiConfigMessageSubtitle
            }
          }
        ]
      };
      const arrays = ['widgets', 'devices', 'values'];
      const configDOM = fromString(payload.configXml);
      const pageBuilderPanel = configDOM.querySelector(
        '[id="craftercms.components.PageBuilderPanel"] > configuration > widgets'
      );
      if (pageBuilderPanel) {
        const lookupTables = ['fields'];
        pageBuilderPanel.querySelectorAll('widget').forEach((e, index) => {
          if (e.getAttribute('id') === 'craftercms.components.ToolsPanelPageButton') {
            e.querySelector(':scope > configuration')?.setAttribute('target', 'pageBuilderPanel');
          }
        });
        pageBuilderPanelConfig = applyDeserializedXMLTransforms(deserialize(pageBuilderPanel), {
          arrays,
          lookupTables
        });
      }

      return {
        ...state,
        pageBuilderPanel: pageBuilderPanelConfig
      };
    }
  }
);

function minFrameSize(suggestedSize: number): number {
  return suggestedSize === null ? null : suggestedSize < 320 ? 320 : suggestedSize;
}

export default reducer;
