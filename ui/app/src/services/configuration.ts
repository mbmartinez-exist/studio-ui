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

import { errorSelectorApi1, get, postJSON } from '../utils/ajax';
import { catchError, map, pluck } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { deserialize, fromString } from '../utils/xml';
import { ContentTypeField } from '../models/ContentType';
import { reversePluckProps, toQueryString } from '../utils/object';
import ContentInstance from '../models/ContentInstance';
import { VersionsResponse } from '../models/Version';
import LookupTable from '../models/LookupTable';
import GlobalState from '../models/GlobalState';
import { SiteConfigurationFile } from '../models/SiteConfigurationFile';

export type CrafterCMSModules = 'studio' | 'engine';

export function fetchConfigurationXML(
  site: string,
  configPath: string,
  module: CrafterCMSModules,
  environment?: string
): Observable<string> {
  const qs = toQueryString({
    siteId: site,
    module,
    path: configPath,
    environment
  });
  return get(`/studio/api/2/configuration/get_configuration${qs}`).pipe(pluck('response', 'content'));
}

export function fetchConfigurationDOM(
  site: string,
  configPath: string,
  module: CrafterCMSModules,
  environment?: string
): Observable<XMLDocument> {
  return fetchConfigurationXML(site, configPath, module, environment).pipe(map(fromString));
}

export function fetchConfigurationJSON(
  site: string,
  configPath: string,
  module: CrafterCMSModules,
  environment?: string
): Observable<any> {
  return fetchConfigurationXML(site, configPath, module, environment).pipe(
    map((conf) => {
      return deserialize(conf, {
        parseNodeValue: false,
        tagValueProcessor: (value) =>
          value
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
      });
    })
  );
}

export function writeConfiguration(
  site: string,
  path: string,
  module: CrafterCMSModules,
  content: string,
  environment?: string
): Observable<any> {
  return postJSON('/studio/api/2/configuration/write_configuration', {
    siteId: site,
    module,
    path,
    content,
    ...(environment && { environment })
  });
}

// region AudiencesPanelConfig

interface ActiveTargetingModel {
  id: string;

  [prop: string]: string;
}

// TODO: asses the location of profile methods.
export function fetchActiveTargetingModel(site?: string): Observable<ContentInstance> {
  return get(`/api/1/profile/get`).pipe(
    map((response) => {
      const data = reversePluckProps(response.response, 'id');
      const id = response.response.id ?? null;

      return {
        craftercms: {
          id,
          path: null,
          label: null,
          locale: null,
          dateCreated: null,
          dateModified: null,
          contentTypeId: null
        },
        ...data
      };
    })
  );
}

export function deserializeActiveTargetingModelData<T extends Object>(
  data: T,
  contentTypeFields: LookupTable<ContentTypeField>
): ContentInstance {
  Object.keys(data).forEach((modelKey) => {
    if (contentTypeFields[modelKey]) {
      // if checkbox-group (Array)
      if (contentTypeFields[modelKey].type === 'checkbox-group') {
        data[modelKey] = data[modelKey] ? data[modelKey].split(',') : [];
      }
    }
  });

  return {
    craftercms: {
      id: '',
      path: null,
      label: null,
      locale: null,
      dateCreated: null,
      dateModified: null,
      contentTypeId: null
    },
    ...data
  };
}

export function setActiveTargetingModel(data): Observable<ActiveTargetingModel> {
  const model = reversePluckProps(data, 'craftercms');
  const qs = toQueryString({ ...model, id: data.craftercms.id });
  return get(`/api/1/profile/set${qs}`).pipe(pluck('response'));
}

// endregion

export function fetchSiteUiConfig(site: string): Observable<string> {
  return fetchConfigurationXML(site, '/ui.xml', 'studio');
}

const legacyToNextMenuIconMap = {
  'fa-sitemap': 'craftercms.icons.Sites',
  'fa-user': '@material-ui/icons/PeopleRounded',
  'fa-users': '@material-ui/icons/SupervisedUserCircleRounded',
  'fa-database': '@material-ui/icons/StorageRounded',
  'fa-bars': '@material-ui/icons/SubjectRounded',
  'fa-level-down': '@material-ui/icons/SettingsApplicationsRounded',
  'fa-align-left': '@material-ui/icons/FormatAlignCenterRounded',
  'fa-globe': '@material-ui/icons/PublicRounded',
  'fa-lock': '@material-ui/icons/LockRounded',
  'fa-key': '@material-ui/icons/VpnKeyRounded'
};

export function fetchGlobalMenuItems(): Observable<GlobalState['globalNavigation']['items']> {
  return get('/studio/api/2/ui/views/global_menu.json').pipe(
    pluck('response', 'menuItems'),
    map((items) => [
      ...items.map((item) => ({
        ...item,
        icon: legacyToNextMenuIconMap[item.icon]
          ? { id: legacyToNextMenuIconMap[item.icon] }
          : { baseClass: item.icon.includes('fa') ? `fa ${item.icon}` : item.icon }
      })),
      { id: 'home.globalMenu.about-us', icon: { id: 'craftercms.icons.CrafterIcon' }, label: 'About' },
      { id: 'home.globalMenu.settings', icon: { id: '@material-ui/icons/AccountCircleRounded' }, label: 'Account' }
    ])
  );
}

export function fetchProductLanguages(): Observable<{ id: string; label: string }[]> {
  return get('/studio/api/1/services/api/1/server/get-available-languages.json').pipe(pluck('response'));
}

export function fetchHistory(
  site: string,
  path: string,
  environment: string,
  module: string
): Observable<VersionsResponse> {
  const parsedPath = encodeURIComponent(path.replace(/(\/config\/)(studio|engine)/g, ''));

  return get(
    `/studio/api/2/configuration/get_configuration_history.json?siteId=${site}&path=${parsedPath}&environment=${environment}&module=${module}`
  ).pipe(pluck('response', 'history'));
}

export function fetchCannedMessage(site: string, locale: string, type: string): Observable<string> {
  return get(
    `/studio/api/1/services/api/1/site/get-canned-message.json?site=${site}&locale=${locale}&type=${type}`
  ).pipe(pluck('response'), catchError(errorSelectorApi1));
}

export function fetchSiteLocale(site: string): Observable<any> {
  return fetchConfigurationDOM(site, '/site-config.xml', 'studio').pipe(
    map((xml) => {
      let settings = {};
      if (xml) {
        const localeXML = xml.querySelector('locale');
        if (localeXML) {
          settings = deserialize(localeXML).locale;
        }
      }
      return settings;
    })
  );
}

export function fetchSiteConfigurationFiles(site: string, environment?: string): Observable<SiteConfigurationFile[]> {
  return fetchConfigurationDOM(site, '/administration/config-list.xml', 'studio', environment).pipe(
    map((xml) => {
      let files = [];
      if (xml) {
        const filesXML = xml.querySelector('files');
        if (filesXML) {
          files = deserialize(filesXML).files.file;
        }
      }
      return files;
    })
  );
}
