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

import { RepositoryStatus } from '../../models/Repository';
import TableContainer from '@material-ui/core/TableContainer';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import GlobalAppGridRow from '../GlobalAppGridRow';
import GlobalAppGridCell from '../GlobalAppGridCell';
import Typography from '@material-ui/core/Typography';
import React from 'react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import ConfirmDropdown from '../Controls/ConfirmDropdown';
import clsx from 'clsx';
import GlobalAppToolbar from '../GlobalAppToolbar';

export interface RemoteRepositoriesStatusUIProps {
  status: RepositoryStatus;
  onRevertPull(): void;
  onClickCommit(): void;
  onResolveConflict(strategy: string, path: string): void;
  onDiffClick(path: string): void;
}

const useStyles = makeStyles((theme) =>
  createStyles({
    root: {
      paddingTop: theme.spacing(4)
    },
    sectionLabel: {
      marginTop: theme.spacing(3),
      fontWeight: 400,
      color: theme.palette.success.dark
    },
    conflictedFilesLabel: {
      color: theme.palette.error.dark
    },
    fileName: {
      fontWeight: 600
    },
    revertAllButton: {
      color: theme.palette.error.dark,
      borderColor: theme.palette.error.main,
      marginRight: theme.spacing(2)
    },
    commitButton: {
      color: theme.palette.success.dark,
      borderColor: theme.palette.success.main
    },
    statusNote: {
      color: theme.palette.text.secondary
    },
    conflictFilesContainer: {
      borderBottom: `1px solid ${theme.palette.divider}`,
      paddingBottom: theme.spacing(2)
    },
    conflictActions: {
      textAlign: 'right'
    },
    conflictActionButton: {
      marginRight: theme.spacing(2),
      color: theme.palette.warning.dark,
      borderColor: theme.palette.warning.main
    }
  })
);

export const messages = defineMessages({
  revertAll: {
    id: 'repositories.revertAll',
    defaultMessage: 'Revert All'
  },
  no: {
    id: 'words.no',
    defaultMessage: 'No'
  },
  yes: {
    id: 'words.yes',
    defaultMessage: 'Yes'
  },
  confirmHelper: {
    id: 'repositories.confirmHelper',
    defaultMessage: "Cancel pull operation and keep what's on this repository."
  },
  acceptRemote: {
    id: 'repositories.acceptRemote',
    defaultMessage: 'Accept Remote'
  },
  acceptRemoteHelper: {
    id: 'repositories.acceptRemoteHelper',
    defaultMessage: 'Override local file with the version pulled from remote.'
  },
  keepLocal: {
    id: 'repositories.keepLocal',
    defaultMessage: 'Keep Local'
  },
  keepLocalHelper: {
    id: 'repositories.keepLocalHelper',
    defaultMessage: 'Discard remote changes and keep the local file.'
  },
  diff: {
    id: 'words.diff',
    defaultMessage: 'Diff'
  }
});

export function RemoteRepositoriesStatusUI(props: RemoteRepositoriesStatusUIProps) {
  const { status, onRevertPull, onClickCommit, onResolveConflict, onDiffClick } = props;
  const classes = useStyles();
  const { formatMessage } = useIntl();

  return (
    <div className={classes.root}>
      {(status.conflicting.length > 0 || status.uncommittedChanges.length > 0) && (
        <GlobalAppToolbar
          title={<FormattedMessage id="repository.repositoryStatusLabel" defaultMessage="Repository Status" />}
          subtitle={
            <FormattedMessage
              id="repository.statusNote"
              defaultMessage="Do not use Studio as a git merge and conflict resolution platform. All merge conflicts should be resolved upstream before getting pulled into Studio."
            />
          }
          rightContent={
            <>
              <ConfirmDropdown
                classes={{ button: classes.revertAllButton }}
                text={formatMessage(messages.revertAll)}
                cancelText={formatMessage(messages.no)}
                confirmText={formatMessage(messages.yes)}
                confirmHelperText={formatMessage(messages.confirmHelper)}
                onConfirm={onRevertPull}
              />
              <Button variant="outlined" className={classes.commitButton} onClick={onClickCommit}>
                <FormattedMessage id="repositories.newRepository" defaultMessage="Commit Resolution" />
              </Button>
            </>
          }
          showHamburgerMenuButton={false}
          showAppsButton={false}
          styles={{
            toolbar: {
              '& > section': {
                alignItems: 'start'
              }
            },
            subtitle: {
              whiteSpace: 'normal'
            }
          }}
        />
      )}

      {status.conflicting.length > 0 && (
        <div className={classes.conflictFilesContainer}>
          <Typography variant="h6" className={clsx(classes.sectionLabel, classes.conflictedFilesLabel)}>
            <FormattedMessage id="repository.conflictedFiles" defaultMessage="Conflicted Files" />
          </Typography>
          <TableContainer>
            <Table>
              <TableBody>
                {status.conflicting.map((file) => (
                  <GlobalAppGridRow key={file} className="hoverDisabled">
                    <GlobalAppGridCell>
                      <span className={classes.fileName}>{file.substr(file.lastIndexOf('/') + 1)}</span> - {file}
                    </GlobalAppGridCell>
                    <GlobalAppGridCell className={classes.conflictActions}>
                      <ConfirmDropdown
                        classes={{ button: classes.conflictActionButton }}
                        text={formatMessage(messages.acceptRemote)}
                        cancelText={formatMessage(messages.no)}
                        confirmText={formatMessage(messages.yes)}
                        confirmHelperText={formatMessage(messages.acceptRemoteHelper)}
                        onConfirm={() => onResolveConflict('theirs', file)}
                      />
                      <ConfirmDropdown
                        classes={{ button: classes.conflictActionButton }}
                        text={formatMessage(messages.keepLocal)}
                        cancelText={formatMessage(messages.no)}
                        confirmText={formatMessage(messages.yes)}
                        confirmHelperText={formatMessage(messages.keepLocalHelper)}
                        onConfirm={() => onResolveConflict('ours', file)}
                      />
                      <Button variant="outlined" onClick={() => onDiffClick(file)}>
                        {formatMessage(messages.diff)}
                      </Button>
                    </GlobalAppGridCell>
                  </GlobalAppGridRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}

      {status.uncommittedChanges.length > 0 && (
        <>
          <Typography variant="h6" className={classes.sectionLabel}>
            <FormattedMessage id="repository.pendingCommit" defaultMessage="Pending Commit" />
          </Typography>
          <TableContainer>
            <Table>
              <TableBody>
                {status.uncommittedChanges.map((file) => (
                  <GlobalAppGridRow key={file} className="hoverDisabled">
                    <GlobalAppGridCell>
                      <span className={classes.fileName}>{file.substr(file.lastIndexOf('/') + 1)}</span> - {file}
                    </GlobalAppGridCell>
                  </GlobalAppGridRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  );
}

export default RemoteRepositoriesStatusUI;
