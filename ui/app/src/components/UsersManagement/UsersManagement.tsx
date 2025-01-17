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

import { FormattedMessage } from 'react-intl';
import AddIcon from '@material-ui/icons/Add';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import UsersGridUI, { UsersGridSkeletonTable } from '../UsersGrid';
import CreateUserDialog from '../CreateUserDialog';
import EditUserDialog from '../EditUserDialog';
import { fetchAll } from '../../services/users';
import { PagedArray } from '../../models/PagedArray';
import User from '../../models/User';
import { ApiResponse } from '../../models/ApiResponse';
import { SuspenseWithEmptyState } from '../SystemStatus/Suspencified';
import GlobalAppToolbar from '../GlobalAppToolbar';
import Button from '@material-ui/core/Button';
import { useLogicResource } from '../../utils/hooks/useLogicResource';
import SearchBar from '../Controls/SearchBar';
import { useDebouncedInput } from '../../utils/hooks/useDebouncedInput';
import useStyles from './styles';
import clsx from 'clsx';
import Paper from '@material-ui/core/Paper';

interface UsersManagementProps {
  passwordRequirementsRegex?: string;
}

export default function UsersManagement(props: UsersManagementProps) {
  const {
    passwordRequirementsRegex = '^(?=(?<hasNumbers>.*[0-9]))(?=(?<hasLowercase>.*[a-z]))(?=(?<hasUppercase>.*[A-Z]))(?=(?<hasSpecialChars>.*[~|!`,;/@#$%^&+=]))(?<minLength>.{8,})$'
  } = props;
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);
  const [fetching, setFetching] = useState(false);
  const [users, setUsers] = useState<PagedArray<User>>(null);
  const [error, setError] = useState<ApiResponse>();
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [keyword, setKeyword] = useState('');
  const classes = useStyles();

  const fetchUsers = useCallback(
    (keyword = '') => {
      setFetching(true);
      fetchAll({ limit, offset, keyword }).subscribe(
        (users) => {
          setUsers(users);
          setFetching(false);
        },
        ({ response }) => {
          setError(response);
          setFetching(false);
        }
      );
    },
    [limit, offset]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const resource = useLogicResource<
    PagedArray<User>,
    { users: PagedArray<User>; error: ApiResponse; fetching: boolean }
  >(
    useMemo(() => ({ users, error, fetching }), [users, error, fetching]),
    {
      shouldResolve: (source) => Boolean(source.users) && !fetching,
      shouldReject: ({ error }) => Boolean(error),
      shouldRenew: (source, resource) => fetching && resource.complete,
      resultSelector: (source) => source.users,
      errorSelector: () => error
    }
  );

  const onUserCreated = () => {
    setOpenCreateUserDialog(false);
    fetchUsers();
  };

  const onUserInfoClose = () => {
    setViewUser(null);
  };

  const onUserEdited = () => {
    fetchUsers();
  };

  const onRowClicked = (user: User) => {
    setViewUser(user);
  };

  const onChangePage = (page: number) => {
    setOffset(page * limit);
  };

  const onChangeRowsPerPage = (e) => {
    setLimit(e.target.value);
  };

  const onShowSearchBox = () => {
    setShowSearchBox(!showSearchBox);
  };

  const onSearch = useCallback(
    (keyword) => {
      fetchUsers(keyword);
    },
    [fetchUsers]
  );

  const onSearch$ = useDebouncedInput(onSearch, 400);

  function handleSearchKeyword(keyword: string) {
    setKeyword(keyword);
    onSearch$.next(keyword);
  }

  return (
    <Paper elevation={0}>
      <GlobalAppToolbar
        title={<FormattedMessage id="words.users" defaultMessage="Users" />}
        leftContent={
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            color="primary"
            onClick={() => setOpenCreateUserDialog(true)}
          >
            <FormattedMessage id="usersGrid.createUser" defaultMessage="Create User" />
          </Button>
        }
        rightContent={
          <SearchBar
            classes={{ root: clsx(classes.searchBarRoot, !showSearchBox && 'hidden') }}
            keyword={keyword}
            onChange={handleSearchKeyword}
            onDecoratorButtonClick={onShowSearchBox}
            showActionButton={Boolean(keyword)}
          />
        }
      />
      <SuspenseWithEmptyState
        resource={resource}
        suspenseProps={{
          fallback: <UsersGridSkeletonTable numOfItems={limit} />
        }}
        withEmptyStateProps={{
          emptyStateProps: {
            title: <FormattedMessage id="usersGrid.emptyStateMessage" defaultMessage="No Users Found" />
          }
        }}
      >
        <UsersGridUI
          resource={resource}
          onRowClicked={onRowClicked}
          onChangePage={onChangePage}
          onChangeRowsPerPage={onChangeRowsPerPage}
        />
      </SuspenseWithEmptyState>

      <CreateUserDialog
        open={openCreateUserDialog}
        onCreateSuccess={onUserCreated}
        onClose={() => setOpenCreateUserDialog(false)}
        passwordRequirementsRegex={passwordRequirementsRegex}
      />
      <EditUserDialog
        open={Boolean(viewUser)}
        onClose={onUserInfoClose}
        onUserEdited={onUserEdited}
        user={viewUser}
        passwordRequirementsRegex={passwordRequirementsRegex}
      />
    </Paper>
  );
}
