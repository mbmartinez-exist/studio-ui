/*
 * Copyright (C) 2007-2019 Crafter Software Corporation. All Rights Reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useMemo, useState } from 'react';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import AppBar from '@material-ui/core/AppBar';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import InputBase from '@material-ui/core/InputBase';
import KeyboardArrowDownRounded from '@material-ui/icons/KeyboardArrowDownRounded';
import KeyboardArrowLeftRounded from '@material-ui/icons/KeyboardArrowLeftRounded';
import KeyboardArrowRightRounded from '@material-ui/icons/KeyboardArrowRightRounded';
import RefreshRounded from '@material-ui/icons/RefreshRounded';
import MoreVertRounded from '@material-ui/icons/MoreVertRounded';
import ToolbarGlobalNav from '../../components/Navigation/ToolbarGlobalNav';
import CustomMenu from '../../components/Icons/CustomMenu';
import {
  changeCurrentUrl,
  closeTools,
  openTools,
  RELOAD_REQUEST
} from '../../state/actions/preview';
import { useDispatch } from 'react-redux';
import { changeSite } from '../../state/actions/sites';
import { Site } from '../../models/Site';
import { LookupTable } from '../../models/LookupTable';
import { useActiveSiteId, useEnv, usePreviewState, useSelection } from '../../utils/hooks';
import { getHostToGuestBus } from './previewContext';
import { isBlank } from '../../utils/string';
import { FormattedMessage } from 'react-intl';

const foo = () => void 0;

const useStyles = makeStyles((theme: Theme) => createStyles({
  toolBar: {
    placeContent: 'center space-between'
    // background: palette.gray.dark4
  },
  addressBarInput: {
    width: 400,
    padding: '2px 4px',
    // margin: '0 5px 0 0 ',
    display: 'flex',
    alignItems: 'center'
    // backgroundColor: palette.gray.dark6
  },
  inputContainer: {
    marginLeft: theme.spacing(1),
    flex: 1
  },
  input: {
    border: 'none',
    '&:focus:invalid, &:focus': {
      border: 'none',
      boxShadow: 'none'
    }
  },
  iconButton: {
    // padding: 5,
    // margin: '0 5px 0 0',
    // color: palette.gray.light4,
    // backgroundColor: palette.gray.dark2
  },
  divider: {
    height: 28,
    margin: 4
  },

  addressBarContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  globalNavSection: {
    display: 'flex',
    alignItems: 'center'
  }

}));

function createOnEnter(handler, argument: 'value' | 'event' = 'event') {
  return (
    (argument === 'value')
      ? (e) => (e.key === 'Enter') && handler(e.target.value)
      : (e) => (e.key === 'Enter') && handler(e)
  );
}

interface AddressBarProps {
  site: string;
  url: string;
  onSiteChange: (siteId: string) => any;
  onUrlChange: (value: string) => any;
  onRefresh: (e) => any;
  sites: { id: string; name: string; } [];
}

export function AddressBar(props: AddressBarProps) {
  const classes = useStyles({});
  const {
    site,
    url = '',
    sites = [],
    onSiteChange = foo,
    onUrlChange = foo,
    onRefresh = foo
  } = props;
  const noSiteSet = isBlank(site);
  const [internalUrl, setInternalUrl] = useState(url);

  useEffect(() => {
    (url) && setInternalUrl(url);
  }, [url]);

  return (
    <>
      <IconButton className={classes.iconButton} aria-label="search">
        <KeyboardArrowLeftRounded/>
      </IconButton>
      <IconButton className={classes.iconButton} aria-label="search">
        <KeyboardArrowRightRounded/>
      </IconButton>
      <IconButton className={classes.iconButton} aria-label="search" onClick={onRefresh}>
        <RefreshRounded/>
      </IconButton>
      <Paper className={classes.addressBarInput}>
        <Select
          value={site}
          classes={{ select: classes.input }}
          onChange={(e: any) => !isBlank(e.target.value) && onSiteChange(e.target.value)}
          displayEmpty
        >
          {
            noSiteSet &&
            <MenuItem value="">
              <FormattedMessage
                id="previewToolBar.siteSelectorNoSiteSelected"
                defaultMessage="Choose site"
              />
            </MenuItem>
          }
          {
            sites.map(({ id, name }) =>
              <MenuItem key={id} value={id}>{name}</MenuItem>
            )
          }
        </Select>
        <InputBase
          value={internalUrl}
          onChange={(e) => setInternalUrl(e.target.value)}
          onKeyDown={createOnEnter((value) => onUrlChange(value), 'value')}
          placeholder={noSiteSet ? '' : '/'}
          disabled={noSiteSet}
          className={classes.inputContainer}
          classes={{ input: classes.input }}
          inputProps={{ 'aria-label': '' }}
        />
        <IconButton aria-label="search" disabled={noSiteSet}>
          <KeyboardArrowDownRounded/>
        </IconButton>
      </Paper>
      <IconButton className={classes.iconButton} aria-label="search">
        <MoreVertRounded/>
      </IconButton>
    </>
  );
}

export default function ToolBar() {
  const dispatch = useDispatch();
  const site = useActiveSiteId();
  const sitesTable = useSelection<LookupTable<Site>>(state => state.sites.byId);
  const sites = useMemo(() => Object.values(sitesTable), [sitesTable]);
  const { PREVIEW_LANDING_BASE } = useEnv();
  const {
    guest,
    currentUrl,
    showToolsPanel
  } = usePreviewState();
  let addressBarUrl = guest?.url ?? currentUrl;
  if (addressBarUrl === PREVIEW_LANDING_BASE) {
    addressBarUrl = '';
  }
  const classes = useStyles({});
  return (
    <AppBar position="static" color="default">
      <Toolbar className={classes.toolBar}>
        <IconButton
          aria-label="Open drawer"
          onClick={() => dispatch(showToolsPanel ? closeTools() : openTools())}
        >
          <CustomMenu/>
        </IconButton>
        <section className={classes.addressBarContainer}>
          <AddressBar
            site={site ?? ''}
            sites={sites}
            url={addressBarUrl}
            onSiteChange={(site) => dispatch(changeSite(site))}
            onUrlChange={(url) => dispatch(changeCurrentUrl(url))}
            onRefresh={() => getHostToGuestBus().next({ type: RELOAD_REQUEST })}
          />
        </section>
        <div className={classes.globalNavSection}>
          <ToolbarGlobalNav/>
        </div>
      </Toolbar>
    </AppBar>
  );
}