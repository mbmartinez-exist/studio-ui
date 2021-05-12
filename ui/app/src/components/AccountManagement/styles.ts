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

import { createStyles, makeStyles } from '@material-ui/core/styles';
import palette from '../../styles/palette';

export const useStyles = makeStyles((theme) =>
  createStyles({
    sectionTitle: {
      marginBottom: '20px'
    },
    paper: {
      padding: '20px',
      margin: '50px 0',
      background: theme.palette.background.default
    },
    container: {},
    avatar: {
      marginRight: '30px',
      width: '90px',
      height: '90px'
    },
    save: {
      marginLeft: 'auto'
    },
    // Password requirements
    listOfConditions: {
      listStyle: 'none',
      padding: 0,
      margin: '16px 0 16px 0'
    },
    conditionItem: {
      display: 'flex',
      alignItems: 'center'
    },
    conditionItemIcon: {
      marginRight: theme.spacing(1)
    },
    conditionItemNotMet: {
      color: palette.yellow.shade
    },
    conditionItemMet: {
      color: palette.green.shade
    }
  })
);
