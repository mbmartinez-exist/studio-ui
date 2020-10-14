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

import { GlobalState } from '../../models/GlobalState';
import { createReducer } from '@reduxjs/toolkit';
import {
  fetchSidebarConfig,
  fetchSidebarConfigComplete,
  fetchSidebarConfigFailed
} from '../actions/configuration';
import { changeSite } from './sites';

const initialState: GlobalState['configuration'] = {
  sidebar: {
    error: null,
    isFetching: false,
    items: null
  },
  publishing: {
    submission: {
      commentMaxLength: 250
    }
  }
};

const reducer = createReducer<GlobalState['configuration']>(initialState, {
  [fetchSidebarConfig.type]: (state) => ({
    ...state,
    sidebar: {
      ...state.sidebar,
      isFetching: true,
      error: null
    }
  }),
  [fetchSidebarConfigComplete.type]: (state, { payload }) => ({
    ...state,
    sidebar: {
      ...state.sidebar,
      isFetching: false,
      error: null,
      items: payload
    }
  }),
  [fetchSidebarConfigFailed.type]: (state, { payload }) => ({
    ...state,
    sidebar: {
      ...state.sidebar,
      isFetching: false,
      error: payload
    }
  }),
  [changeSite.type]: () => initialState
});

export default reducer;
