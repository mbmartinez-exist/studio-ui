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

import React, { useEffect } from 'react';
import ViewToolbar from '../../components/ViewToolbar';
import LauncherOpenerButton from '../../components/LauncherOpenerButton';
import { closeTools, initToolbarConfig, openTools } from '../../state/actions/preview';
import { useDispatch } from 'react-redux';
import { defineMessages, useIntl } from 'react-intl';
import Tooltip from '@material-ui/core/Tooltip';
import LogoAndMenuBundleButton from '../../components/LogoAndMenuBundleButton';
import { renderWidgets } from '../../components/Widget';
import { useActiveSiteId } from '../../utils/hooks/useActiveSiteId';
import { usePreviewGuest } from '../../utils/hooks/usePreviewGuest';
import { usePreviewState } from '../../utils/hooks/usePreviewState';
import { useActiveUser } from '../../utils/hooks/useActiveUser';
import { useItemsByPath } from '../../utils/hooks/useItemsByPath';
import { useSiteUIConfig } from '../../utils/hooks/useSiteUIConfig';

const translations = defineMessages({
  openToolsPanel: {
    id: 'openToolsPanel.label',
    defaultMessage: 'Open tools panel'
  },
  toggleSidebarTooltip: {
    id: 'common.toggleSidebarTooltip',
    defaultMessage: 'Toggle sidebar'
  },
  itemMenu: {
    id: 'previewToolbar.itemMenu',
    defaultMessage: 'Item menu'
  }
});

export default function ToolBar() {
  const { formatMessage } = useIntl();
  const dispatch = useDispatch();
  const site = useActiveSiteId();
  const user = useActiveUser();
  const userRoles = user.rolesBySite[site];
  const { showToolsPanel, toolbar } = usePreviewState();
  const guest = usePreviewGuest();
  const modelId = guest?.modelId;
  const models = guest?.models;
  const items = useItemsByPath();
  const item = items?.[models?.[modelId]?.craftercms.path];
  const uiConfig = useSiteUIConfig();

  useEffect(() => {
    if (uiConfig.xml && !toolbar.leftSection && !toolbar.middleSection && !toolbar.rightSection) {
      dispatch(initToolbarConfig({ configXml: uiConfig.xml }));
    }
  }, [uiConfig.xml, toolbar, dispatch]);

  return (
    <ViewToolbar>
      <section>
        <Tooltip title={formatMessage(translations.toggleSidebarTooltip)}>
          <LogoAndMenuBundleButton
            aria-label={formatMessage(translations.openToolsPanel)}
            onClick={() => dispatch(showToolsPanel ? closeTools() : openTools())}
          />
        </Tooltip>
        {renderWidgets(toolbar.leftSection?.widgets, userRoles, { site, item })}
      </section>
      <section>{renderWidgets(toolbar.middleSection?.widgets, userRoles, { site, item })}</section>
      <section>
        {renderWidgets(toolbar.rightSection?.widgets, userRoles, { site, item })}
        <LauncherOpenerButton sitesRailPosition="left" icon="apps" />
      </section>
    </ViewToolbar>
  );
}
