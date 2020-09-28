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

import React, { ElementType } from 'react';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';
import { MessageDescriptor, useIntl } from 'react-intl';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import { PopoverOrigin } from '@material-ui/core';
import ErrorOutlineOutlinedIcon from '@material-ui/icons/ErrorOutlineOutlined';

export const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      display: 'block',
      padding: '10px',
      textAlign: 'center'
    }
  }));

export interface Option {
  id: string;
  label: MessageDescriptor;
}

export interface SectionItem extends Option {
  type?: string;
  values?: any;
}

interface CustomMenuProps {
  anchorEl?: null | Element | ((element: Element) => Element);
  open: boolean;
  classes?: Partial<Record<'paper' | 'itemRoot' | 'menuList' | 'helperText', string>>;
  sections: SectionItem[][];
  anchorOrigin?: PopoverOrigin;
  emptyState?: {
    icon?: ElementType;
    message: string;
  }

  onClose?(): void;

  onMenuItemClicked(section: SectionItem): void;
}

export default function ContextMenu(props: CustomMenuProps) {
  const { sections, classes, onClose, open, anchorEl, onMenuItemClicked, emptyState, anchorOrigin = undefined } = props;
  const emptyStyles = useStyles({});

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      classes={{ paper: classes?.paper, list: classes?.menuList }}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
    >
      <div>
        <ContextMenuItems
          sections={sections}
          classes={classes}
          onMenuItemClicked={onMenuItemClicked}
        />
      </div>
      {
        (sections.length === 0 && emptyState?.message) &&
        <div className={emptyStyles.root}>
          <ErrorOutlineOutlinedIcon fontSize={'small'} />
          <Typography variant="caption" display="block">
            {emptyState.message}
          </Typography>
        </div>
      }
    </Menu>
  );
}

interface ContextMenuItemsProps {
  sections: SectionItem[][];
  classes?: Partial<Record<'helperText' | 'itemRoot', string>>;
  onMenuItemClicked(SectionItem): void;
}

export function ContextMenuItems(props: ContextMenuItemsProps) {
  const { sections, classes, onMenuItemClicked } = props;
  const { formatMessage } = useIntl();
  return (
    <>
      {
        sections.map((section: any, i: number) =>
          section.map((sectionItem: SectionItem, y: number) =>
            (sectionItem.type === 'text') ? (
              <div>
                <Typography variant="body1" className={classes?.helperText}>
                  {formatMessage(sectionItem.label, sectionItem.values)}
                </Typography>
                <Divider />
              </div>
            ) : (
              <MenuItem
                key={sectionItem.id}
                divider={(i !== sections.length - 1) && (y === section.length - 1)}
                onClick={() => onMenuItemClicked(sectionItem)}
                classes={{ root: classes?.itemRoot }}
                dense
              >
                {formatMessage(sectionItem.label, sectionItem.values)}
              </MenuItem>
            )
          )
        )}
    </>
  );
}
