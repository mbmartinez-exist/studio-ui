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

import React, { ElementType, Fragment, useState } from 'react';
import { useIntl } from 'react-intl';
import TablePagination from '@material-ui/core/TablePagination';
import { DetailedItem } from '../../../models/Item';
import clsx from 'clsx';
import { LookupTable } from '../../../models/LookupTable';
import ContextMenu, { SectionItem } from '../../ContextMenu';
import {
  useActiveSiteId,
  useEnv,
  useLogicResource,
  useMount,
  useSelection,
  useSiteLocales,
  useSpreadState
} from '../../../utils/hooks';
import { useDispatch } from 'react-redux';
import { Resource } from '../../../models/Resource';
import { SuspenseWithEmptyState } from '../../SystemStatus/Suspencified';
import { withoutIndex } from '../../../utils/path';
import { useStyles } from './styles';
import { translations } from './translations';
import Header from './PathNavigatorHeader';
import Breadcrumbs from './PathNavigatorBreadcrumbs';
import Nav from './PathNavigatorList';
import ContentLoader from 'react-content-loader';
import { languages } from '../../../utils/i18n-legacy';
import { removeSpaces } from '../../../utils/string';
import {
  pathNavigatorInit,
  pathNavigatorItemChecked,
  pathNavigatorItemUnchecked,
  pathNavigatorSetCollapsed,
  pathNavigatorSetCurrentPath,
  pathNavigatorSetKeyword
} from '../../../state/actions/pathNavigator';
import { getStoredPreviewChoice } from '../../../utils/state';
import { ItemMenu } from '../../ItemMenu/ItemMenu';
import { fetchDetailedItem, fetchUserPermissions } from '../../../state/actions/content';

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);
const createRand = () => rand(70, 85);

const MyLoader = React.memo(function () {
  const [items] = useState(() => {
    const numOfItems = 5;
    const start = 20;
    return new Array(numOfItems).fill(null).map((_, i) => ({
      y: start + 30 * i,
      width: createRand()
    }));
  });
  return (
    <ContentLoader speed={2} width="100%" backgroundColor="#f3f3f3" foregroundColor="#ecebeb">
      {items.map(({ y, width }, i) => (
        <Fragment key={i}>
          <circle cx="10" cy={y} r="8" />
          <rect x="25" y={y - 5} rx="5" ry="5" width={`${width}%`} height="10" />
        </Fragment>
      ))}
    </ContentLoader>
  );
});

const menuOptions = {
  refresh: {
    id: 'refresh',
    label: translations.refresh
  }
};

export interface WidgetProps {
  path: string;
  icon?: string | React.ElementType;
  id: string;
  title?: string;
  locale: string;
  classes?: Partial<Record<'root' | 'body' | 'searchRoot', string>>;
}

interface MenuState {
  selectMode: boolean;
  hasClipboard: boolean;
}

interface Menu {
  path?: string;
  sections: SectionItem[][];
  anchorEl: Element;
  emptyState?: {
    icon?: ElementType;
    message: string;
  };
}

export interface WidgetState {
  rootPath: string;
  currentPath: string;
  localeCode: string;
  keyword: '';
  isSelectMode: boolean;
  hasClipboard: boolean;
  itemsInPath: string[];
  items: LookupTable<DetailedItem>;
  breadcrumb: DetailedItem[];
  selectedItems: string[];
  leafs: string[];
  count: number; // Number of items in the current path
  limit: number;
  offset: number;
  collapsed?: boolean;
}

// PathNavigator
export default function (props: WidgetProps) {
  const { title, icon, path, id = removeSpaces(props.title), locale } = props;
  const pathNavigator = useSelection((state) => state.pathNavigator);
  const state = pathNavigator[id];
  const classes = useStyles({});
  const site = useActiveSiteId();
  const { authoringBase } = useEnv();
  const dispatch = useDispatch();
  const { formatMessage } = useIntl();
  const [simpleMenu, setSimpleMenu] = useState<Menu>({
    anchorEl: null,
    sections: [],
    emptyState: null
  });

  const [itemMenu, setItemMenu] = useSpreadState<Menu>({
    path,
    sections: [],
    anchorEl: null
  });

  const siteLocales = useSiteLocales();

  useMount(() => {
    if (!state) {
      dispatch(pathNavigatorInit({ id, path: path, locale: locale }));
    }
  });

  const itemsResource: Resource<DetailedItem[]> = useLogicResource(state?.itemsInPath, {
    shouldResolve: (items) => Boolean(items),
    shouldRenew: (items, resource) => resource.complete,
    shouldReject: () => false,
    resultSelector: (items) => items.map((path) => state.items[path]),
    errorSelector: null
  });

  const onPathSelected = (item: DetailedItem) => {
    dispatch(
      pathNavigatorSetCurrentPath({
        id,
        path: item.path
      })
    );
  };

  const onPageChanged = (page: number) => void 0;

  const onSelectItem = (item: DetailedItem, checked: boolean) => {
    dispatch(
      checked
        ? pathNavigatorItemChecked({ id, item })
        : pathNavigatorItemUnchecked({
          id,
          item
        })
    );
  };

  const onCurrentParentMenu = (element: Element) => {
    dispatch(fetchDetailedItem({ site, path: state.currentPath }));
    dispatch(fetchUserPermissions({ site, path: state.currentPath }));
    setItemMenu({
      path: state.currentPath,
      anchorEl: element
    });
  };

  const onOpenItemMenu = (element: Element, item: DetailedItem) => {
    // TODO: the nav is already fetching item parents and childrens but not permissions;
    dispatch(fetchDetailedItem({ site, path: item.path }));
    dispatch(fetchUserPermissions({ site, path: item.path }));
    setItemMenu({
      path: item.path,
      anchorEl: element
    });
  };

  const onHeaderButtonClick = (anchorEl: Element, type: string) => {
    const locales = siteLocales.localeCodes?.map((code) => ({
      id: `locale.${code}`,
      label: {
        id: `locale.${code}`,
        defaultMessage: formatMessage(languages[code])
      }
    }));

    if (type === 'language') {
      setSimpleMenu({
        sections: locales.length ? [locales] : [],
        anchorEl,
        emptyState: locales.length === 0 ? { message: formatMessage(translations.noLocales) } : null
      });
    } else {
      setSimpleMenu({
        sections: [[menuOptions.refresh]],
        anchorEl
      });
    }
  };

  const onCloseSimpleMenu = () => setSimpleMenu({ ...simpleMenu, anchorEl: null });

  const onCloseItemMenu = () => setItemMenu({ ...itemMenu, anchorEl: null });

  const onItemClicked = (item: DetailedItem) => {
    if (item.previewUrl) {
      let previewBase = getStoredPreviewChoice(site) === '2' ? 'next/preview' : 'preview';
      window.location.href = `${authoringBase}/${previewBase}#/?page=${item.previewUrl}&site=${site}`;
    }
  };

  const onBreadcrumbSelected = (item: DetailedItem) => {
    if (withoutIndex(item.path) === withoutIndex(state.currentPath)) {
      onItemClicked(item);
    } else {
      dispatch(pathNavigatorSetCurrentPath({ id, path: item.path }));
    }
  };

  const onSimpleMenuClick = (section: SectionItem) => {
    onCloseSimpleMenu();
    if (section.id === 'refresh') {
      dispatch(
        pathNavigatorSetCurrentPath({
          id,
          path: state.currentPath
        })
      );
    }
  };

  const onItemMenuActionSuccessCreator = (args) => ({
    type: 'PATH_NAVIGATOR_ITEM_ACTION_SUCCESS',
    payload: { id, ...args }
  });

  return (
    <section className={clsx(classes.root, props.classes?.root, state?.collapsed && 'collapsed')}>
      <Header
        icon={icon}
        title={title}
        locale={state?.localeCode}
        onClick={() => dispatch(pathNavigatorSetCollapsed({ id, collapsed: !state?.collapsed }))}
        onContextMenu={(anchor) => onHeaderButtonClick(anchor, 'options')}
        onLanguageMenu={(anchor) => onHeaderButtonClick(anchor, 'language')}
      />
      <div {...(state?.collapsed ? { hidden: true } : {})} className={clsx(props.classes?.body)}>
        <SuspenseWithEmptyState
          resource={itemsResource}
          loadingStateProps={{
            graphicProps: { className: classes.stateGraphics }
          }}
          errorBoundaryProps={{
            errorStateProps: { classes: { graphic: classes.stateGraphics } }
          }}
          withEmptyStateProps={{
            emptyStateProps: {
              title: 'No items at this location',
              classes: { image: classes.stateGraphics }
            }
          }}
          suspenseProps={{
            fallback: <MyLoader />
          }}
        >
          <Breadcrumbs
            keyword={state?.keyword}
            breadcrumb={state?.breadcrumb}
            onMenu={onCurrentParentMenu}
            onSearch={(keyword) => dispatch(pathNavigatorSetKeyword({ id, keyword }))}
            onCrumbSelected={onBreadcrumbSelected}
            classes={{ searchRoot: props.classes?.searchRoot }}
          />
          <Nav
            leafs={state?.leafs}
            locale={state?.localeCode}
            resource={itemsResource}
            onSelectItem={onSelectItem}
            onPathSelected={onPathSelected}
            onOpenItemMenu={onOpenItemMenu}
            onItemClicked={onItemClicked}
          />
          <TablePagination
            className={classes.pagination}
            classes={{
              root: classes.pagination,
              selectRoot: 'hidden',
              toolbar: clsx(classes.paginationToolbar, classes.widgetSection)
            }}
            component="div"
            labelRowsPerPage=""
            count={state?.count}
            rowsPerPage={state?.limit}
            page={state && Math.ceil(state.offset / state.limit)}
            backIconButtonProps={{ 'aria-label': formatMessage(translations.previousPage) }}
            nextIconButtonProps={{ 'aria-label': formatMessage(translations.nextPage) }}
            onChangePage={(e, page: number) => onPageChanged(page)}
          />
        </SuspenseWithEmptyState>
      </div>
      <ItemMenu
        path={itemMenu.path}
        open={Boolean(itemMenu.anchorEl)}
        anchorEl={itemMenu.anchorEl}
        onClose={onCloseItemMenu}
        onItemMenuActionSuccessCreator={onItemMenuActionSuccessCreator}
      />
      <ContextMenu
        anchorEl={simpleMenu.anchorEl}
        sections={simpleMenu.sections}
        open={Boolean(simpleMenu.anchorEl)}
        onClose={onCloseSimpleMenu}
        onMenuItemClicked={onSimpleMenuClick}
      />
    </section>
  );
}
