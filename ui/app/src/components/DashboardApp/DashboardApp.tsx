/*
 * Copyright (C) 2007-2021 Crafter Software Corporation. All Rights Reserved.
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

import React, { useMemo, useRef } from 'react';
import AwaitingApprovalDashlet from '../AwaitingApprovalDashlet';
import LookupTable from '../../models/LookupTable';
import { useActiveSiteId, useSpreadState } from '../../utils/hooks';
import { fetchItemsByPath } from '../../services/content';
import ItemActionsSnackbar from '../ItemActionsSnackbar';
import { ListItem, ListItemSecondaryAction, ListItemText } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import { generateMultipleItemOptions, generateSingleItemOptions } from '../../utils/itemActions';
import { useIntl } from 'react-intl';
import translations from './translations';
import { createLookupTable } from '../../utils/object';
import { AllItemActions } from '../../models/Item';
import useStyles from './styles';

interface DashboardAppProps {}

const actionsToBeShown: AllItemActions[] = [
  'edit',
  'delete',
  'rejectPublish',
  'schedulePublish',
  'approvePublish',
  'duplicate',
  'duplicateAsset',
  'dependencies',
  'history'
];

export default function DashboardApp(props: DashboardAppProps) {
  const site = useActiveSiteId();
  const [selectedLookup, setSelectedLookup] = useSpreadState<LookupTable<boolean>>({});
  const [itemsByPath, setItemsByPath] = useSpreadState({});
  const selectedLength = useMemo(() => Object.values(selectedLookup).filter((value) => value).length, [selectedLookup]);
  const loadedRef = useRef([]);
  const { formatMessage } = useIntl();
  const classes = useStyles();

  const selectionOptions = useMemo(() => {
    const selected = Object.keys(selectedLookup).filter((path) => selectedLookup[path]);
    if (selected.length === 0) {
      return null;
    } else if (selected.length) {
      if (selected.length === 1) {
        const path = selected[0];
        const item = itemsByPath[path];
        if (item) {
          return generateSingleItemOptions(item, formatMessage, { includeOnly: actionsToBeShown }).flat();
        }
      } else {
        let itemsDetails = [];
        selected.forEach((itemPath) => {
          const item = itemsByPath[itemPath];
          if (item) {
            itemsDetails.push(item);
          }
        });
        return generateMultipleItemOptions(itemsDetails, formatMessage).filter((option) =>
          actionsToBeShown.includes(option.id as AllItemActions)
        );
      }
    }
  }, [formatMessage, itemsByPath, selectedLookup]);

  const fetchItems = (paths) => {
    const filteredPaths = paths.filter((path) => !loadedRef.current.includes(path));
    if (filteredPaths.length) {
      fetchItemsByPath(site, filteredPaths, { preferContent: false }).subscribe((items) => {
        setItemsByPath(createLookupTable(items, 'path'));
        items.forEach((item) => {
          loadedRef.current.push(item.path);
        });
      });
    }
  };

  const onItemChecked = (paths: string[], forceChecked?: boolean) => {
    const lookup = {};
    paths.forEach((path) => {
      lookup[path] = forceChecked ?? !selectedLookup[path];
    });
    fetchItems(paths);
    setSelectedLookup(lookup);
  };

  const onActionClicked = () => {};

  const handleClearSelected = () => {};

  return (
    <section className={classes.root}>
      <AwaitingApprovalDashlet selectedLookup={selectedLookup} onItemChecked={onItemChecked} />
      <ItemActionsSnackbar
        open={selectedLength > 0}
        options={selectionOptions}
        onActionClicked={onActionClicked}
        append={
          <ListItem>
            <ListItemText
              style={{ textAlign: 'center', minWidth: '65px' }}
              primaryTypographyProps={{ variant: 'caption' }}
              primary={formatMessage(translations.selectionCount, { count: selectedLength })}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" size="small" onClick={handleClearSelected}>
                <HighlightOffIcon color="primary" />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        }
      />
    </section>
  );
}
