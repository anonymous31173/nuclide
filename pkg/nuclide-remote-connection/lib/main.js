'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {NuclideUri} from '../../commons-node/nuclideUri';
import typeof * as ArcanistService from '../../nuclide-arcanist-rpc';
import typeof * as FileSystemService from '../../nuclide-server/lib/services/FileSystemService';
import type {Directory as LocalDirectoryType} from 'atom';

import nullthrows from 'nullthrows';

import {RemoteConnection} from './RemoteConnection';
import {RemoteDirectory} from './RemoteDirectory';
import {RemoteFile} from './RemoteFile';
import {ServerConnection} from './ServerConnection';
import {ConnectionCache} from './ConnectionCache';
import NuclideTextBuffer from './NuclideTextBuffer';

import {
  SshHandshake,
  decorateSshConnectionDelegateWithTracking,
} from './SshHandshake';

import {
  getService,
  getServiceByConnection,
  getServiceByNuclideUri,
  getlocalService,
} from './service-manager';

export type Directory = LocalDirectoryType | RemoteDirectory;

export {
  RemoteConnection,
  RemoteDirectory,
  RemoteFile,
  ServerConnection,
  ConnectionCache,
  SshHandshake,
  NuclideTextBuffer,
  decorateSshConnectionDelegateWithTracking,
  getService,
  getServiceByConnection,
  getServiceByNuclideUri,
  getlocalService,
};

export function getFileSystemServiceByNuclideUri(uri: NuclideUri): FileSystemService {
  return nullthrows(getServiceByNuclideUri('FileSystemService', uri));
}

export function getArcanistServiceByNuclideUri(uri: NuclideUri): ArcanistService {
  return nullthrows(getServiceByNuclideUri('ArcanistService', uri));
}
