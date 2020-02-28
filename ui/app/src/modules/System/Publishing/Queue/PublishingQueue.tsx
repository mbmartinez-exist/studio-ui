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

import React, { useEffect, useCallback, useState } from 'react';
import makeStyles from '@material-ui/styles/makeStyles';
import { Theme } from '@material-ui/core/styles/createMuiTheme';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from '@material-ui/core/Checkbox';
import { defineMessages, useIntl } from 'react-intl';
import PublishingPackage from './PublishingPackage';
import { cancelPackage, fetchEnvironments, fetchPackages } from '../../../../services/publishing';
import {
  BLOCKED,
  CANCELLED,
  COMPLETED,
  CurrentFilters,
  Package,
  PROCESSING,
  READY_FOR_LIVE,
  Selected
} from '../../../../models/Publishing';
import ConfirmDropdown from '../../../../components/UserControl/ConfirmDropdown';
import FilterDropdown from '../../Sites/Create/FilterDropdown';
import { setRequestForgeryToken } from '../../../../utils/auth';
import TablePagination from '@material-ui/core/TablePagination';
import ErrorState from '../../../../components/SystemStatus/ErrorState';
import EmptyState from '../../../../components/SystemStatus/EmptyState';
import Typography from '@material-ui/core/Typography';
import HighlightOffIcon from '@material-ui/icons/HighlightOffRounded';
import Spinner from '../../../../components/SystemStatus/Spinner';
import RefreshIcon from '@material-ui/icons/Refresh';
import Button from '@material-ui/core/Button';
import { useSpreadState } from '../../../../utils/hooks';

const messages = defineMessages({
  selectAll: {
    id: 'publishingDashboard.selectAll',
    defaultMessage: 'Select all on this page'
  },
  cancelSelected: {
    id: 'publishingDashboard.cancelSelected',
    defaultMessage: 'Cancel Selected'
  },
  cancel: {
    id: 'publishingDashboard.no',
    defaultMessage: 'No'
  },
  confirm: {
    id: 'publishingDashboard.yes',
    defaultMessage: 'Yes'
  },
  confirmAllHelper: {
    id: 'publishingDashboard.confirmAllHelper',
    defaultMessage: 'Set the state for all selected items to "Cancelled"?'
  },
  filters: {
    id: 'publishingDashboard.filters',
    defaultMessage: 'Filters'
  },
  noPackagesTitle: {
    id: 'publishingDashboard.noPackagesTitle',
    defaultMessage: 'No Packages Were Found'
  },
  noPackagesSubtitle: {
    id: 'publishingDashboard.noPackagesSubtitle',
    defaultMessage: 'Try changing your query'
  },
  filteredBy: {
    id: 'publishingDashboard.filteredBy',
    defaultMessage: 'Showing: {state, select, all {} other {Status : {state}.}} {environment, select, all {} other {{environment} environment.}} {path, select, none {}  other {Filtered by {path}}}'
  },
  packagesSelected: {
    id: 'publishingDashboard.packagesSelected',
    defaultMessage: '{count, plural, one {{count} Package selected} other {{count} Packages selected}}'
  }
});

const useStyles = makeStyles((theme: Theme) => ({
  publishingQueue: {},
  topBar: {
    display: 'flex',
    padding: '0 0 0 0',
    alignItems: 'center',
    borderBottom: '1px solid #dedede',
    justifyContent: 'flex-end'
  },
  secondBar: {
    background: '#f9f9f9',
    padding: '10px',
    borderBottom: '1px solid #dedede'
  },
  queueList: {},
  package: {
    padding: '20px',
    '& .name': {
      display: 'flex',
      justifyContent: 'space-between'
    },
    '& .status': {
      display: 'flex',
      justifyContent: 'space-between'
    },
    '& .comment': {
      display: 'flex',
      justifyContent: 'space-between',
      '& div:first-child': {
        marginRight: '20px'
      }
    },
    '& .files': {}
  },
  packagesSelected: {
    marginRight: '10px',
    display: 'flex',
    alignItems: 'center'
  },
  clearSelected: {
    marginLeft: '5px',
    cursor: 'pointer'
  },
  selectAll: {
    marginRight: 'auto'
  },
  button: {
    margin: theme.spacing(1)
  },
  empty: {
    padding: '40px 0'
  }
}));

const currentFiltersInitialState: CurrentFilters = {
  environment: '',
  path: '',
  state: [READY_FOR_LIVE],
  limit: 5,
  page: 0
};

const selectedInitialState: Selected = {};

interface PublishingQueueProps {
  siteId: string
}

function getFilters(currentFilters: CurrentFilters) {
  let filters: any = {};
  if (currentFilters.environment) filters['environment'] = currentFilters.environment;
  if (currentFilters.path) filters['path'] = currentFilters.path;
  if (currentFilters.state.length) filters['states'] = currentFilters.state;
  if (currentFilters.limit) filters['limit'] = currentFilters.limit;
  if (currentFilters.page) filters['offset'] = currentFilters.page * currentFilters.limit;
  return filters;
}

function renderCount(selected: Selected) {
  let _selected: any = [];
  Object.keys(selected).forEach((key) => {
    if (selected[key]) {
      _selected.push(key);
    }
  });
  return _selected;
}

function PublishingQueue(props: PublishingQueueProps) {
  const classes = useStyles({});
  const [packages, setPackages] = useState(null);
  const [filesPerPackage, setFilesPerPackage] = useState(null);
  const [selected, setSelected] = useState(selectedInitialState);
  const [pending, setPending] = useState({});
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useSpreadState({
    environments: null,
    states: [READY_FOR_LIVE, PROCESSING, COMPLETED, CANCELLED, BLOCKED]
  });
  const [apiState, setApiState] = useSpreadState({
    error: false,
    errorResponse: null
  });
  const [currentFilters, setCurrentFilters] = useState(currentFiltersInitialState);
  const { formatMessage } = useIntl();
  const { siteId } = props;

  const getPackages = useCallback((siteId: string) => (
    fetchPackages(siteId, getFilters(currentFilters)).subscribe(
      ({ response }) => {
        setTotal(response.total);
        setPackages(response.packages);
      },
      ({ response }) => {
        setApiState({ error: true, errorResponse: response });
      }
    )
  ), [currentFilters, setApiState]);

  setRequestForgeryToken();

  useEffect(() => {
    fetchEnvironments(siteId).subscribe(
      ({ response }) => {
        let channels: string[] = [];
        response.availablePublishChannels.forEach((channel: any) => {
          channels.push(channel.name);
        });
        setFilters({ environments: channels });
      },
      ({ response }) => {
        setApiState({ error: true, errorResponse: response });
      }
    );
  }, [siteId, setFilters, setApiState]);

  useEffect(() => {
    getPackages(siteId);
  }, [currentFilters, siteId, getPackages]);

  useEffect(() => {
    setCount(renderCount(selected).length);
  }, [selected]);

  function renderPackages() {
    return packages.map((item: Package, index: number) => {
      return <PublishingPackage
        id={item.id}
        approver={item.approver}
        schedule={item.schedule}
        state={item.state}
        comment={item.comment}
        environment={item.environment}
        key={index}
        siteId={siteId}
        selected={selected}
        pending={pending}
        setPending={setPending}
        getPackages={getPackages}
        setApiState={setApiState}
        setSelected={setSelected}
        currentFilters={currentFilters}
        filesPerPackage={filesPerPackage}
        setFilesPerPackage={setFilesPerPackage}/>
    })
  }

  function handleCancelAll() {
    if (count === 0) return false;
    let _pending: Selected = {};
    Object.keys(selected).forEach((key: string) => {
      if (selected[key]) {
        _pending[key] = true;
      }
    });
    setPending(_pending);
    cancelPackage(siteId, Object.keys(_pending))
      .subscribe(
        () => {
          Object.keys(selected).forEach((key: string) => {
            _pending[key] = false;
          });
          setPending({ ...pending, ..._pending });
          clearSelected();
          getPackages(siteId);
        },
        ({ response }) => {
          setApiState({ error: true, errorResponse: response });
        }
      );
  }

  function clearSelected() {
    setSelected({});
  }

  function handleSelectAll(event: any) {
    if (!packages || packages.length === 0) return false;
    let _selected: Selected = {};
    if (event.target.checked) {
      packages.forEach((item: Package) => {
        _selected[item.id] = item.state === READY_FOR_LIVE;
        setSelected({ ...selected, ..._selected });
      });
    } else {
      packages.forEach((item: Package) => {
        _selected[item.id] = false;
        setSelected({ ...selected, ..._selected });
      });
    }
  }

  function areAllSelected() {
    if (!packages || packages.length === 0) return false;
    let _selected: boolean = true;
    _selected = !packages.some((item: Package) => !selected[item.id] && item.state === READY_FOR_LIVE);
    return _selected;
  }

  function handleFilterChange(event: any) {
    if (event.target.type === 'radio') {
      clearSelected();
      setCurrentFilters({ ...currentFilters, [event.target.name]: event.target.value, page: 0 });
    } else if (event.target.type === 'checkbox') {
      let state = [...currentFilters.state];
      if (event.target.checked) {
        if (event.target.value) {
          state.push(event.target.value);
        } else {
          state = [...filters.states];
        }
      } else {
        if (event.target.value) {
          state.splice(state.indexOf(event.target.value), 1);
        } else {
          state = [];
        }
      }
      setCurrentFilters({ ...currentFilters, state, page: 0 });
    }
  }

  function handleEnterKey(path: string) {
    setCurrentFilters({ ...currentFilters, path: path, page: 0 });
  }

  function handleChangePage(event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, newPage: number) {
    setCurrentFilters({ ...currentFilters, page: newPage });
  }

  function handleChangeRowsPerPage(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setCurrentFilters({ ...currentFilters, page: 0, limit: parseInt(event.target.value, 10) });
  }

  return (
    <div className={classes.publishingQueue}>
      <div className={classes.topBar}>
        {
          currentFilters.state.includes(READY_FOR_LIVE) &&
          <FormGroup className={classes.selectAll}>
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={areAllSelected()}
                  disabled={!packages || !packages.length}
                  onClick={handleSelectAll}
                />
              }
              label={formatMessage(messages.selectAll)}
            />
          </FormGroup>
        }
        {
          (count > 0 && currentFilters.state.includes(READY_FOR_LIVE)) &&
          <Typography variant="body2" className={classes.packagesSelected} color="textSecondary">
            {formatMessage(messages.packagesSelected, { count: count })}
            <HighlightOffIcon className={classes.clearSelected} onClick={clearSelected}/>
          </Typography>
        }
        <Button variant="outlined" className={classes.button} onClick={() => getPackages(siteId)}>
          <RefreshIcon/>
        </Button>
        {
          currentFilters.state.includes(READY_FOR_LIVE) &&
          <ConfirmDropdown
            text={formatMessage(messages.cancelSelected)}
            cancelText={formatMessage(messages.cancel)}
            confirmText={formatMessage(messages.confirm)}
            confirmHelperText={formatMessage(messages.confirmAllHelper)}
            onConfirm={handleCancelAll}
          />
        }
        <FilterDropdown className={classes.button} text={formatMessage(messages.filters)}
                        handleFilterChange={handleFilterChange}
                        currentFilters={currentFilters} handleEnterKey={handleEnterKey} filters={filters}/>
      </div>
      {
        (currentFilters.state.length || currentFilters.path || currentFilters.environment) &&
        <div className={classes.secondBar}>
          <Typography variant="body2">
            {
              formatMessage(
                messages.filteredBy,
                {
                  state: (
                    currentFilters.state
                      ? <strong key="state">{currentFilters.state.join(', ')}</strong>
                      : 'all'
                  ),
                  path: (
                    currentFilters.path
                      ? <strong key="path">{currentFilters.path}</strong>
                      : 'none'
                  ),
                  environment: (
                    currentFilters.environment
                      ? <strong key="environment">{currentFilters.environment}</strong>
                      : 'all'
                  )
                }
              )
            }
          </Typography>
        </div>
      }
      {
        (apiState.error && apiState.errorResponse) ?
          <ErrorState error={apiState.errorResponse}/>
          :
          <div className={classes.queueList}>
            {packages === null && <Spinner/>}
            {packages && renderPackages()}
            {
              packages !== null && packages.length === 0 &&
              <div className={classes.empty}>
                <EmptyState
                  title={formatMessage(messages.noPackagesTitle)}
                  subtitle={formatMessage(messages.noPackagesSubtitle)}
                />
              </div>
            }
          </div>
      }
      <TablePagination
        rowsPerPageOptions={[3, 5, 10]}
        component="div"
        count={total}
        rowsPerPage={currentFilters.limit}
        page={currentFilters.page}
        backIconButtonProps={{
          'aria-label': 'previous page'
        }}
        nextIconButtonProps={{
          'aria-label': 'next page'
        }}
        onChangePage={handleChangePage}
        onChangeRowsPerPage={handleChangeRowsPerPage}
      />
    </div>
  );
  // TODO: Translate aria-labels above.
}

export default PublishingQueue;
