var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _atom = require('atom');

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _featureConfig = require('../../feature-config');

var _featureConfig2 = _interopRequireDefault(_featureConfig);

var _workingSets = require('../../working-sets');

/**
 * Minimum interval (in ms) between onChangeActivePaneItem events before revealing the active pane
 * item in the file tree.
 */
var ACTIVE_PANE_DEBOUNCE_INTERVAL_MS = 150;

var REVEAL_FILE_ON_SWITCH_SETTING = 'nuclide-file-tree.revealFileOnSwitch';

var Activation = (function () {
  function Activation(state) {
    _classCallCheck(this, Activation);

    this._packageState = state;
    this._subscriptions = new _atom.CompositeDisposable();

    var FileTreeController = require('./FileTreeController');
    this._fileTreeController = new FileTreeController(this._packageState);

    var excludeVcsIgnoredPathsSetting = 'core.excludeVcsIgnoredPaths';
    var hideIgnoredNamesSetting = 'nuclide-file-tree.hideIgnoredNames';
    var ignoredNamesSetting = 'core.ignoredNames';
    var prefixKeyNavSetting = 'nuclide-file-tree.allowKeyboardPrefixNavigation';
    var usePreviewTabs = 'tabs.usePreviewTabs';

    this._subscriptions.add(_featureConfig2['default'].observe(prefixKeyNavSetting, this._setPrefixKeyNavSetting.bind(this)), _featureConfig2['default'].observe(REVEAL_FILE_ON_SWITCH_SETTING, this._setRevealOnFileSwitch.bind(this)), atom.config.observe(ignoredNamesSetting, this._setIgnoredNames.bind(this)), _featureConfig2['default'].observe(hideIgnoredNamesSetting, this._setHideIgnoredNames.bind(this)), atom.config.observe(excludeVcsIgnoredPathsSetting, this._setExcludeVcsIgnoredPaths.bind(this)), atom.config.observe(usePreviewTabs, this._setUsePreviewTabs.bind(this)));
  }

  _createClass(Activation, [{
    key: 'consumeCwdApi',
    value: function consumeCwdApi(cwdApi) {
      (0, _assert2['default'])(this._fileTreeController);
      if (this._cwdApiSubscription != null) {
        this._cwdApiSubscription.dispose();
      }
      var controller = this._fileTreeController;
      controller.setCwdApi(cwdApi);
      this._cwdApiSubscription = new _atom.Disposable(function () {
        return controller.setCwdApi(null);
      });
      return this._cwdApiSubscription;
    }
  }, {
    key: 'dispose',
    value: function dispose() {
      this._deactivate();
      this._subscriptions.dispose();
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return this._fileTreeController.serialize();
    }
  }, {
    key: 'consumeWorkingSetsStore',
    value: function consumeWorkingSetsStore(workingSetsStore) {
      var _this = this;

      this._fileTreeController.updateWorkingSetsStore(workingSetsStore);
      this._fileTreeController.updateWorkingSet(workingSetsStore.getCurrent());

      var currentSubscription = workingSetsStore.subscribeToCurrent(function (currentWorkingSet) {
        _this._fileTreeController.updateWorkingSet(currentWorkingSet);
      });
      this._subscriptions.add(currentSubscription);

      var rebuildOpenFilesWorkingSet = function rebuildOpenFilesWorkingSet() {
        var openUris = atom.workspace.getTextEditors().filter(function (te) {
          return te.getPath() != null && te.getPath() !== '';
        }).map(function (te) {
          return te.getPath();
        });
        var openFilesWorkingSet = new _workingSets.WorkingSet(openUris);
        _this._fileTreeController.updateOpenFilesWorkingSet(openFilesWorkingSet);
      };

      rebuildOpenFilesWorkingSet();

      var paneObservingDisposable = new _atom.CompositeDisposable();
      paneObservingDisposable.add(atom.workspace.onDidAddPaneItem(rebuildOpenFilesWorkingSet));
      paneObservingDisposable.add(atom.workspace.onDidDestroyPaneItem(rebuildOpenFilesWorkingSet));

      this._subscriptions.add(paneObservingDisposable);

      return new _atom.Disposable(function () {
        _this._fileTreeController.updateWorkingSetsStore(null);
        _this._fileTreeController.updateWorkingSet(new _workingSets.WorkingSet());
        _this._fileTreeController.updateOpenFilesWorkingSet(new _workingSets.WorkingSet());
        paneObservingDisposable.dispose();
        _this._subscriptions.remove(currentSubscription);
        currentSubscription.dispose();
      });
    }
  }, {
    key: '_setExcludeVcsIgnoredPaths',
    value: function _setExcludeVcsIgnoredPaths(excludeVcsIgnoredPaths) {
      this._fileTreeController.setExcludeVcsIgnoredPaths(excludeVcsIgnoredPaths);
    }
  }, {
    key: '_setHideIgnoredNames',
    value: function _setHideIgnoredNames(hideIgnoredNames) {
      this._fileTreeController.setHideIgnoredNames(hideIgnoredNames);
    }
  }, {
    key: '_setIgnoredNames',
    value: function _setIgnoredNames(ignoredNames) {
      var normalizedIgnoredNames = undefined;
      if (ignoredNames === '') {
        normalizedIgnoredNames = [];
      } else if (typeof ignoredNames === 'string') {
        normalizedIgnoredNames = [ignoredNames];
      } else {
        normalizedIgnoredNames = ignoredNames;
      }
      this._fileTreeController.setIgnoredNames(normalizedIgnoredNames);
    }
  }, {
    key: '_setRevealOnFileSwitch',
    value: function _setRevealOnFileSwitch(shouldReveal) {
      var _this2 = this;

      var onWorkspaceDidStopChangingActivePaneItem = require('../../atom-helpers').atomEventDebounce.onWorkspaceDidStopChangingActivePaneItem;

      if (shouldReveal) {
        var reveal = function reveal() {
          _this2._fileTreeController.revealActiveFile( /* showIfHidden */false);
        };
        // Guard against this getting called multiple times
        if (!this._paneItemSubscription) {
          // Debounce tab change events to limit unneeded scrolling when changing or closing tabs
          // in quick succession.
          this._paneItemSubscription = onWorkspaceDidStopChangingActivePaneItem(reveal, ACTIVE_PANE_DEBOUNCE_INTERVAL_MS);
          this._subscriptions.add(this._paneItemSubscription);
        }
      } else {
        // Use a local so Flow can refine the type.
        var paneItemSubscription = this._paneItemSubscription;
        if (paneItemSubscription) {
          this._subscriptions.remove(paneItemSubscription);
          paneItemSubscription.dispose();
          this._paneItemSubscription = null;
        }
      }
    }
  }, {
    key: '_setPrefixKeyNavSetting',
    value: function _setPrefixKeyNavSetting(usePrefixNav) {
      // config is void during startup, signifying no config yet
      if (usePrefixNav == null || !this._fileTreeController) {
        return;
      }
      this._fileTreeController.setUsePrefixNav(usePrefixNav);
    }
  }, {
    key: '_setUsePreviewTabs',
    value: function _setUsePreviewTabs(usePreviewTabs) {
      // config is void during startup, signifying no config yet
      if (usePreviewTabs == null) {
        return;
      }
      this._fileTreeController.setUsePreviewTabs(usePreviewTabs);
    }
  }, {
    key: '_deactivate',
    value: function _deactivate() {
      // Guard against deactivate being called twice
      this._fileTreeController.destroy();
    }
  }]);

  return Activation;
})();

var activation = undefined;
var deserializedState = undefined;
var onDidActivateDisposable = undefined;
var sideBarDisposable = undefined;

function disableTreeViewPackage() {
  if (!atom.packages.isPackageDisabled('tree-view')) {
    // Calling `disablePackage` on a package first *loads* the package. This step must come
    // before calling `unloadPackage`.
    atom.packages.disablePackage('tree-view');
  }

  if (atom.packages.isPackageActive('tree-view')) {
    // Only *inactive* packages can be unloaded. Attempting to unload an active package is
    // considered an exception. Deactivating must come before unloading.
    atom.packages.deactivatePackage('tree-view');
  }

  if (atom.packages.isPackageLoaded('tree-view')) {
    atom.packages.unloadPackage('tree-view');
  }
}

module.exports = {
  activate: function activate(state) {
    (0, _assert2['default'])(activation == null);
    // Disable Atom's bundled 'tree-view' package. If this activation is happening during the
    // normal startup activation, the `onDidActivateInitialPackages` handler below must unload the
    // 'tree-view' because it will have been loaded during startup.
    disableTreeViewPackage();

    // Disabling and unloading Atom's bundled 'tree-view' must happen after activation because this
    // package's `activate` is called during an traversal of all initial packages to activate.
    // Disabling a package during the traversal has no effect if this is a startup load because
    // `PackageManager` does not re-load the list of packages to activate after each iteration.
    onDidActivateDisposable = atom.packages.onDidActivateInitialPackages(function () {
      disableTreeViewPackage();
      onDidActivateDisposable.dispose();
    });

    deserializedState = state;
    activation = new Activation(deserializedState);
  },

  deactivate: function deactivate() {
    var nuclideFeatures = require('../../../../lib/nuclideFeatures');

    // Re-enable Atom's bundled 'tree-view' when this package is disabled to leave the user's
    // environment the way this package found it.
    if (nuclideFeatures.isFeatureDisabled('nuclide-file-tree') && atom.packages.isPackageDisabled('tree-view')) {
      atom.packages.enablePackage('tree-view');
    }

    if (sideBarDisposable != null) {
      sideBarDisposable.dispose();
    }

    if (!onDidActivateDisposable.disposed) {
      onDidActivateDisposable.dispose();
    }

    if (activation) {
      activation.dispose();
      activation = null;
    }
  },

  serialize: function serialize() {
    if (activation) {
      return activation.serialize();
    }
  },

  consumeNuclideSideBar: function consumeNuclideSideBar(sidebar) {
    (0, _assert2['default'])(activation);

    sidebar.registerView({
      getComponent: function getComponent() {
        return require('../components/FileTreeSidebarComponent');
      },
      onDidShow: function onDidShow() {
        // If "Reveal File on Switch" is enabled, ensure the scroll position is synced to where the
        // user expects when the side bar shows the file tree.
        if (_featureConfig2['default'].get(REVEAL_FILE_ON_SWITCH_SETTING)) {
          atom.commands.dispatch(atom.views.getView(atom.workspace), 'nuclide-file-tree:reveal-active-file');
        }
      },
      toggleCommand: 'nuclide-file-tree:toggle',
      viewId: 'nuclide-file-tree'
    });

    sideBarDisposable = new _atom.Disposable(function () {
      sidebar.destroyView('nuclide-file-tree');
    });

    return sideBarDisposable;
  },

  consumeWorkingSetsStore: function consumeWorkingSetsStore(workingSetsStore) {
    (0, _assert2['default'])(activation);

    return activation.consumeWorkingSetsStore(workingSetsStore);
  },

  consumeCwdApi: function consumeCwdApi(cwdApi) {
    (0, _assert2['default'])(activation);
    return activation.consumeCwdApi(cwdApi);
  }
};
//# sourceMappingURL=data:application/json;base64,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QUFlLFlBQU07QUFDdkMsYUFBTyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0tBQzFDLENBQUMsQ0FBQzs7QUFFSCxXQUFPLGlCQUFpQixDQUFDO0dBQzFCOztBQUVELHlCQUF1QixFQUFBLGlDQUFDLGdCQUFrQyxFQUFnQjtBQUN4RSw2QkFBVSxVQUFVLENBQUMsQ0FBQzs7QUFFdEIsV0FBTyxVQUFVLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztHQUM3RDs7QUFFRCxlQUFhLEVBQUEsdUJBQUMsTUFBYyxFQUFlO0FBQ3pDLDZCQUFVLFVBQVUsQ0FBQyxDQUFDO0FBQ3RCLFdBQU8sVUFBVSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztHQUN6QztDQUNGLENBQUMiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2UgYmFiZWwnO1xuLyogQGZsb3cgKi9cblxuLypcbiAqIENvcHlyaWdodCAoYykgMjAxNS1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBsaWNlbnNlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW5cbiAqIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLlxuICovXG5cbmltcG9ydCB0eXBlIHtGaWxlVHJlZUNvbnRyb2xsZXJTdGF0ZX0gZnJvbSAnLi9GaWxlVHJlZUNvbnRyb2xsZXInO1xuaW1wb3J0IHR5cGUgRmlsZVRyZWVDb250cm9sbGVyVHlwZSBmcm9tICcuL0ZpbGVUcmVlQ29udHJvbGxlcic7XG5pbXBvcnQgdHlwZSB7TnVjbGlkZVNpZGVCYXJTZXJ2aWNlfSBmcm9tICcuLi8uLi9zaWRlLWJhcic7XG5pbXBvcnQgdHlwZSB7Q3dkQXBpfSBmcm9tICcuLi8uLi9jdXJyZW50LXdvcmtpbmctZGlyZWN0b3J5L2xpYi9Dd2RBcGknO1xuXG5pbXBvcnQge0Rpc3Bvc2FibGUsIENvbXBvc2l0ZURpc3Bvc2FibGV9IGZyb20gJ2F0b20nO1xuaW1wb3J0IGludmFyaWFudCBmcm9tICdhc3NlcnQnO1xuXG5pbXBvcnQgZmVhdHVyZUNvbmZpZyBmcm9tICcuLi8uLi9mZWF0dXJlLWNvbmZpZyc7XG5cbmltcG9ydCB7V29ya2luZ1NldH0gZnJvbSAnLi4vLi4vd29ya2luZy1zZXRzJztcbmltcG9ydCB0eXBlIHtXb3JraW5nU2V0c1N0b3JlfSBmcm9tICcuLi8uLi93b3JraW5nLXNldHMvbGliL1dvcmtpbmdTZXRzU3RvcmUnO1xuXG4vKipcbiAqIE1pbmltdW0gaW50ZXJ2YWwgKGluIG1zKSBiZXR3ZWVuIG9uQ2hhbmdlQWN0aXZlUGFuZUl0ZW0gZXZlbnRzIGJlZm9yZSByZXZlYWxpbmcgdGhlIGFjdGl2ZSBwYW5lXG4gKiBpdGVtIGluIHRoZSBmaWxlIHRyZWUuXG4gKi9cbmNvbnN0IEFDVElWRV9QQU5FX0RFQk9VTkNFX0lOVEVSVkFMX01TID0gMTUwO1xuXG5jb25zdCBSRVZFQUxfRklMRV9PTl9TV0lUQ0hfU0VUVElORyA9ICdudWNsaWRlLWZpbGUtdHJlZS5yZXZlYWxGaWxlT25Td2l0Y2gnO1xuXG5jbGFzcyBBY3RpdmF0aW9uIHtcbiAgX2N3ZEFwaVN1YnNjcmlwdGlvbjogP0lEaXNwb3NhYmxlO1xuICBfZmlsZVRyZWVDb250cm9sbGVyOiBGaWxlVHJlZUNvbnRyb2xsZXJUeXBlO1xuICBfcGFja2FnZVN0YXRlOiA/RmlsZVRyZWVDb250cm9sbGVyU3RhdGU7XG4gIF9zdWJzY3JpcHRpb25zOiBDb21wb3NpdGVEaXNwb3NhYmxlO1xuICBfcGFuZUl0ZW1TdWJzY3JpcHRpb246ID9EaXNwb3NhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKHN0YXRlOiA/RmlsZVRyZWVDb250cm9sbGVyU3RhdGUpIHtcbiAgICB0aGlzLl9wYWNrYWdlU3RhdGUgPSBzdGF0ZTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcblxuICAgIGNvbnN0IEZpbGVUcmVlQ29udHJvbGxlciA9IHJlcXVpcmUoJy4vRmlsZVRyZWVDb250cm9sbGVyJyk7XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyID0gbmV3IEZpbGVUcmVlQ29udHJvbGxlcih0aGlzLl9wYWNrYWdlU3RhdGUpO1xuXG4gICAgY29uc3QgZXhjbHVkZVZjc0lnbm9yZWRQYXRoc1NldHRpbmcgPSAnY29yZS5leGNsdWRlVmNzSWdub3JlZFBhdGhzJztcbiAgICBjb25zdCBoaWRlSWdub3JlZE5hbWVzU2V0dGluZyA9ICdudWNsaWRlLWZpbGUtdHJlZS5oaWRlSWdub3JlZE5hbWVzJztcbiAgICBjb25zdCBpZ25vcmVkTmFtZXNTZXR0aW5nID0gJ2NvcmUuaWdub3JlZE5hbWVzJztcbiAgICBjb25zdCBwcmVmaXhLZXlOYXZTZXR0aW5nID0gJ251Y2xpZGUtZmlsZS10cmVlLmFsbG93S2V5Ym9hcmRQcmVmaXhOYXZpZ2F0aW9uJztcbiAgICBjb25zdCB1c2VQcmV2aWV3VGFicyA9ICd0YWJzLnVzZVByZXZpZXdUYWJzJztcblxuICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMuYWRkKFxuICAgICAgZmVhdHVyZUNvbmZpZy5vYnNlcnZlKHByZWZpeEtleU5hdlNldHRpbmcsIHRoaXMuX3NldFByZWZpeEtleU5hdlNldHRpbmcuYmluZCh0aGlzKSksXG4gICAgICBmZWF0dXJlQ29uZmlnLm9ic2VydmUoUkVWRUFMX0ZJTEVfT05fU1dJVENIX1NFVFRJTkcsIHRoaXMuX3NldFJldmVhbE9uRmlsZVN3aXRjaC5iaW5kKHRoaXMpKSxcbiAgICAgIGF0b20uY29uZmlnLm9ic2VydmUoaWdub3JlZE5hbWVzU2V0dGluZywgdGhpcy5fc2V0SWdub3JlZE5hbWVzLmJpbmQodGhpcykpLFxuICAgICAgZmVhdHVyZUNvbmZpZy5vYnNlcnZlKGhpZGVJZ25vcmVkTmFtZXNTZXR0aW5nLCB0aGlzLl9zZXRIaWRlSWdub3JlZE5hbWVzLmJpbmQodGhpcykpLFxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZShcbiAgICAgICAgZXhjbHVkZVZjc0lnbm9yZWRQYXRoc1NldHRpbmcsXG4gICAgICAgIHRoaXMuX3NldEV4Y2x1ZGVWY3NJZ25vcmVkUGF0aHMuYmluZCh0aGlzKSxcbiAgICAgICksXG4gICAgICBhdG9tLmNvbmZpZy5vYnNlcnZlKHVzZVByZXZpZXdUYWJzLCB0aGlzLl9zZXRVc2VQcmV2aWV3VGFicy5iaW5kKHRoaXMpKSxcbiAgICApO1xuXG4gIH1cblxuICBjb25zdW1lQ3dkQXBpKGN3ZEFwaTogQ3dkQXBpKTogSURpc3Bvc2FibGUge1xuICAgIGludmFyaWFudCh0aGlzLl9maWxlVHJlZUNvbnRyb2xsZXIpO1xuICAgIGlmICh0aGlzLl9jd2RBcGlTdWJzY3JpcHRpb24gIT0gbnVsbCkge1xuICAgICAgdGhpcy5fY3dkQXBpU3Vic2NyaXB0aW9uLmRpc3Bvc2UoKTtcbiAgICB9XG4gICAgY29uc3QgY29udHJvbGxlciA9IHRoaXMuX2ZpbGVUcmVlQ29udHJvbGxlcjtcbiAgICBjb250cm9sbGVyLnNldEN3ZEFwaShjd2RBcGkpO1xuICAgIHRoaXMuX2N3ZEFwaVN1YnNjcmlwdGlvbiA9IG5ldyBEaXNwb3NhYmxlKCgpID0+IGNvbnRyb2xsZXIuc2V0Q3dkQXBpKG51bGwpKTtcbiAgICByZXR1cm4gdGhpcy5fY3dkQXBpU3Vic2NyaXB0aW9uO1xuICB9XG5cbiAgZGlzcG9zZSgpIHtcbiAgICB0aGlzLl9kZWFjdGl2YXRlKCk7XG4gICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5kaXNwb3NlKCk7XG4gIH1cblxuICBzZXJpYWxpemUoKTogP0ZpbGVUcmVlQ29udHJvbGxlclN0YXRlIHtcbiAgICByZXR1cm4gdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnNlcmlhbGl6ZSgpO1xuICB9XG5cbiAgY29uc3VtZVdvcmtpbmdTZXRzU3RvcmUod29ya2luZ1NldHNTdG9yZTogV29ya2luZ1NldHNTdG9yZSk6ID9JRGlzcG9zYWJsZSB7XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnVwZGF0ZVdvcmtpbmdTZXRzU3RvcmUod29ya2luZ1NldHNTdG9yZSk7XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnVwZGF0ZVdvcmtpbmdTZXQod29ya2luZ1NldHNTdG9yZS5nZXRDdXJyZW50KCkpO1xuXG4gICAgY29uc3QgY3VycmVudFN1YnNjcmlwdGlvbiA9IHdvcmtpbmdTZXRzU3RvcmUuc3Vic2NyaWJlVG9DdXJyZW50KGN1cnJlbnRXb3JraW5nU2V0ID0+IHtcbiAgICAgIHRoaXMuX2ZpbGVUcmVlQ29udHJvbGxlci51cGRhdGVXb3JraW5nU2V0KGN1cnJlbnRXb3JraW5nU2V0KTtcbiAgICB9KTtcbiAgICB0aGlzLl9zdWJzY3JpcHRpb25zLmFkZChjdXJyZW50U3Vic2NyaXB0aW9uKTtcblxuICAgIGNvbnN0IHJlYnVpbGRPcGVuRmlsZXNXb3JraW5nU2V0ID0gKCkgPT4ge1xuICAgICAgY29uc3Qgb3BlblVyaXMgPSBhdG9tLndvcmtzcGFjZS5nZXRUZXh0RWRpdG9ycygpXG4gICAgICAgIC5maWx0ZXIodGUgPT4gdGUuZ2V0UGF0aCgpICE9IG51bGwgJiYgdGUuZ2V0UGF0aCgpICE9PSAnJylcbiAgICAgICAgLm1hcCh0ZSA9PiAodGUuZ2V0UGF0aCgpOiBhbnkpKTtcbiAgICAgIGNvbnN0IG9wZW5GaWxlc1dvcmtpbmdTZXQgPSBuZXcgV29ya2luZ1NldChvcGVuVXJpcyk7XG4gICAgICB0aGlzLl9maWxlVHJlZUNvbnRyb2xsZXIudXBkYXRlT3BlbkZpbGVzV29ya2luZ1NldChvcGVuRmlsZXNXb3JraW5nU2V0KTtcbiAgICB9O1xuXG4gICAgcmVidWlsZE9wZW5GaWxlc1dvcmtpbmdTZXQoKTtcblxuICAgIGNvbnN0IHBhbmVPYnNlcnZpbmdEaXNwb3NhYmxlID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGUoKTtcbiAgICBwYW5lT2JzZXJ2aW5nRGlzcG9zYWJsZS5hZGQoYXRvbS53b3Jrc3BhY2Uub25EaWRBZGRQYW5lSXRlbShyZWJ1aWxkT3BlbkZpbGVzV29ya2luZ1NldCkpO1xuICAgIHBhbmVPYnNlcnZpbmdEaXNwb3NhYmxlLmFkZChhdG9tLndvcmtzcGFjZS5vbkRpZERlc3Ryb3lQYW5lSXRlbShyZWJ1aWxkT3BlbkZpbGVzV29ya2luZ1NldCkpO1xuXG4gICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5hZGQocGFuZU9ic2VydmluZ0Rpc3Bvc2FibGUpO1xuXG4gICAgcmV0dXJuIG5ldyBEaXNwb3NhYmxlKCgpID0+IHtcbiAgICAgIHRoaXMuX2ZpbGVUcmVlQ29udHJvbGxlci51cGRhdGVXb3JraW5nU2V0c1N0b3JlKG51bGwpO1xuICAgICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnVwZGF0ZVdvcmtpbmdTZXQobmV3IFdvcmtpbmdTZXQoKSk7XG4gICAgICB0aGlzLl9maWxlVHJlZUNvbnRyb2xsZXIudXBkYXRlT3BlbkZpbGVzV29ya2luZ1NldChuZXcgV29ya2luZ1NldCgpKTtcbiAgICAgIHBhbmVPYnNlcnZpbmdEaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICAgIHRoaXMuX3N1YnNjcmlwdGlvbnMucmVtb3ZlKGN1cnJlbnRTdWJzY3JpcHRpb24pO1xuICAgICAgY3VycmVudFN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgfSk7XG4gIH1cblxuICBfc2V0RXhjbHVkZVZjc0lnbm9yZWRQYXRocyhleGNsdWRlVmNzSWdub3JlZFBhdGhzOiBib29sZWFuKTogdm9pZCB7XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnNldEV4Y2x1ZGVWY3NJZ25vcmVkUGF0aHMoZXhjbHVkZVZjc0lnbm9yZWRQYXRocyk7XG4gIH1cblxuICBfc2V0SGlkZUlnbm9yZWROYW1lcyhoaWRlSWdub3JlZE5hbWVzOiBib29sZWFuKTogdm9pZCB7XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnNldEhpZGVJZ25vcmVkTmFtZXMoaGlkZUlnbm9yZWROYW1lcyk7XG4gIH1cblxuICBfc2V0SWdub3JlZE5hbWVzKGlnbm9yZWROYW1lczogc3RyaW5nfEFycmF5PHN0cmluZz4pIHtcbiAgICBsZXQgbm9ybWFsaXplZElnbm9yZWROYW1lcztcbiAgICBpZiAoaWdub3JlZE5hbWVzID09PSAnJykge1xuICAgICAgbm9ybWFsaXplZElnbm9yZWROYW1lcyA9IFtdO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGlnbm9yZWROYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG5vcm1hbGl6ZWRJZ25vcmVkTmFtZXMgPSBbaWdub3JlZE5hbWVzXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbm9ybWFsaXplZElnbm9yZWROYW1lcyA9IGlnbm9yZWROYW1lcztcbiAgICB9XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnNldElnbm9yZWROYW1lcyhub3JtYWxpemVkSWdub3JlZE5hbWVzKTtcbiAgfVxuXG4gIF9zZXRSZXZlYWxPbkZpbGVTd2l0Y2goc2hvdWxkUmV2ZWFsOiBib29sZWFuKSB7XG4gICAgY29uc3Qge29uV29ya3NwYWNlRGlkU3RvcENoYW5naW5nQWN0aXZlUGFuZUl0ZW19ID1cbiAgICAgIHJlcXVpcmUoJy4uLy4uL2F0b20taGVscGVycycpLmF0b21FdmVudERlYm91bmNlO1xuXG4gICAgaWYgKHNob3VsZFJldmVhbCkge1xuICAgICAgY29uc3QgcmV2ZWFsID0gKCkgPT4ge1xuICAgICAgICB0aGlzLl9maWxlVHJlZUNvbnRyb2xsZXIucmV2ZWFsQWN0aXZlRmlsZSgvKiBzaG93SWZIaWRkZW4gKi8gZmFsc2UpO1xuICAgICAgfTtcbiAgICAgIC8vIEd1YXJkIGFnYWluc3QgdGhpcyBnZXR0aW5nIGNhbGxlZCBtdWx0aXBsZSB0aW1lc1xuICAgICAgaWYgKCF0aGlzLl9wYW5lSXRlbVN1YnNjcmlwdGlvbikge1xuICAgICAgICAvLyBEZWJvdW5jZSB0YWIgY2hhbmdlIGV2ZW50cyB0byBsaW1pdCB1bm5lZWRlZCBzY3JvbGxpbmcgd2hlbiBjaGFuZ2luZyBvciBjbG9zaW5nIHRhYnNcbiAgICAgICAgLy8gaW4gcXVpY2sgc3VjY2Vzc2lvbi5cbiAgICAgICAgdGhpcy5fcGFuZUl0ZW1TdWJzY3JpcHRpb24gPSBvbldvcmtzcGFjZURpZFN0b3BDaGFuZ2luZ0FjdGl2ZVBhbmVJdGVtKFxuICAgICAgICAgIHJldmVhbCxcbiAgICAgICAgICBBQ1RJVkVfUEFORV9ERUJPVU5DRV9JTlRFUlZBTF9NU1xuICAgICAgICApO1xuICAgICAgICB0aGlzLl9zdWJzY3JpcHRpb25zLmFkZCh0aGlzLl9wYW5lSXRlbVN1YnNjcmlwdGlvbik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFVzZSBhIGxvY2FsIHNvIEZsb3cgY2FuIHJlZmluZSB0aGUgdHlwZS5cbiAgICAgIGNvbnN0IHBhbmVJdGVtU3Vic2NyaXB0aW9uID0gdGhpcy5fcGFuZUl0ZW1TdWJzY3JpcHRpb247XG4gICAgICBpZiAocGFuZUl0ZW1TdWJzY3JpcHRpb24pIHtcbiAgICAgICAgdGhpcy5fc3Vic2NyaXB0aW9ucy5yZW1vdmUocGFuZUl0ZW1TdWJzY3JpcHRpb24pO1xuICAgICAgICBwYW5lSXRlbVN1YnNjcmlwdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgIHRoaXMuX3BhbmVJdGVtU3Vic2NyaXB0aW9uID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBfc2V0UHJlZml4S2V5TmF2U2V0dGluZyh1c2VQcmVmaXhOYXY6ID9ib29sZWFuKTogdm9pZCB7XG4gICAgLy8gY29uZmlnIGlzIHZvaWQgZHVyaW5nIHN0YXJ0dXAsIHNpZ25pZnlpbmcgbm8gY29uZmlnIHlldFxuICAgIGlmICh1c2VQcmVmaXhOYXYgPT0gbnVsbCB8fCAhdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2ZpbGVUcmVlQ29udHJvbGxlci5zZXRVc2VQcmVmaXhOYXYodXNlUHJlZml4TmF2KTtcbiAgfVxuXG4gIF9zZXRVc2VQcmV2aWV3VGFicyh1c2VQcmV2aWV3VGFiczogP2Jvb2xlYW4pOiB2b2lkIHtcbiAgICAvLyBjb25maWcgaXMgdm9pZCBkdXJpbmcgc3RhcnR1cCwgc2lnbmlmeWluZyBubyBjb25maWcgeWV0XG4gICAgaWYgKHVzZVByZXZpZXdUYWJzID09IG51bGwpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fZmlsZVRyZWVDb250cm9sbGVyLnNldFVzZVByZXZpZXdUYWJzKHVzZVByZXZpZXdUYWJzKTtcbiAgfVxuXG4gIF9kZWFjdGl2YXRlKCkge1xuICAgIC8vIEd1YXJkIGFnYWluc3QgZGVhY3RpdmF0ZSBiZWluZyBjYWxsZWQgdHdpY2VcbiAgICB0aGlzLl9maWxlVHJlZUNvbnRyb2xsZXIuZGVzdHJveSgpO1xuICB9XG59XG5cbmxldCBhY3RpdmF0aW9uOiA/QWN0aXZhdGlvbjtcbmxldCBkZXNlcmlhbGl6ZWRTdGF0ZTogP0ZpbGVUcmVlQ29udHJvbGxlclN0YXRlO1xubGV0IG9uRGlkQWN0aXZhdGVEaXNwb3NhYmxlOiBJRGlzcG9zYWJsZTtcbmxldCBzaWRlQmFyRGlzcG9zYWJsZTogP0lEaXNwb3NhYmxlO1xuXG5mdW5jdGlvbiBkaXNhYmxlVHJlZVZpZXdQYWNrYWdlKCkge1xuICBpZiAoIWF0b20ucGFja2FnZXMuaXNQYWNrYWdlRGlzYWJsZWQoJ3RyZWUtdmlldycpKSB7XG4gICAgLy8gQ2FsbGluZyBgZGlzYWJsZVBhY2thZ2VgIG9uIGEgcGFja2FnZSBmaXJzdCAqbG9hZHMqIHRoZSBwYWNrYWdlLiBUaGlzIHN0ZXAgbXVzdCBjb21lXG4gICAgLy8gYmVmb3JlIGNhbGxpbmcgYHVubG9hZFBhY2thZ2VgLlxuICAgIGF0b20ucGFja2FnZXMuZGlzYWJsZVBhY2thZ2UoJ3RyZWUtdmlldycpO1xuICB9XG5cbiAgaWYgKGF0b20ucGFja2FnZXMuaXNQYWNrYWdlQWN0aXZlKCd0cmVlLXZpZXcnKSkge1xuICAgIC8vIE9ubHkgKmluYWN0aXZlKiBwYWNrYWdlcyBjYW4gYmUgdW5sb2FkZWQuIEF0dGVtcHRpbmcgdG8gdW5sb2FkIGFuIGFjdGl2ZSBwYWNrYWdlIGlzXG4gICAgLy8gY29uc2lkZXJlZCBhbiBleGNlcHRpb24uIERlYWN0aXZhdGluZyBtdXN0IGNvbWUgYmVmb3JlIHVubG9hZGluZy5cbiAgICBhdG9tLnBhY2thZ2VzLmRlYWN0aXZhdGVQYWNrYWdlKCd0cmVlLXZpZXcnKTtcbiAgfVxuXG4gIGlmIChhdG9tLnBhY2thZ2VzLmlzUGFja2FnZUxvYWRlZCgndHJlZS12aWV3JykpIHtcbiAgICBhdG9tLnBhY2thZ2VzLnVubG9hZFBhY2thZ2UoJ3RyZWUtdmlldycpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBhY3RpdmF0ZShzdGF0ZTogP0ZpbGVUcmVlQ29udHJvbGxlclN0YXRlKTogdm9pZCB7XG4gICAgaW52YXJpYW50KGFjdGl2YXRpb24gPT0gbnVsbCk7XG4gICAgLy8gRGlzYWJsZSBBdG9tJ3MgYnVuZGxlZCAndHJlZS12aWV3JyBwYWNrYWdlLiBJZiB0aGlzIGFjdGl2YXRpb24gaXMgaGFwcGVuaW5nIGR1cmluZyB0aGVcbiAgICAvLyBub3JtYWwgc3RhcnR1cCBhY3RpdmF0aW9uLCB0aGUgYG9uRGlkQWN0aXZhdGVJbml0aWFsUGFja2FnZXNgIGhhbmRsZXIgYmVsb3cgbXVzdCB1bmxvYWQgdGhlXG4gICAgLy8gJ3RyZWUtdmlldycgYmVjYXVzZSBpdCB3aWxsIGhhdmUgYmVlbiBsb2FkZWQgZHVyaW5nIHN0YXJ0dXAuXG4gICAgZGlzYWJsZVRyZWVWaWV3UGFja2FnZSgpO1xuXG4gICAgLy8gRGlzYWJsaW5nIGFuZCB1bmxvYWRpbmcgQXRvbSdzIGJ1bmRsZWQgJ3RyZWUtdmlldycgbXVzdCBoYXBwZW4gYWZ0ZXIgYWN0aXZhdGlvbiBiZWNhdXNlIHRoaXNcbiAgICAvLyBwYWNrYWdlJ3MgYGFjdGl2YXRlYCBpcyBjYWxsZWQgZHVyaW5nIGFuIHRyYXZlcnNhbCBvZiBhbGwgaW5pdGlhbCBwYWNrYWdlcyB0byBhY3RpdmF0ZS5cbiAgICAvLyBEaXNhYmxpbmcgYSBwYWNrYWdlIGR1cmluZyB0aGUgdHJhdmVyc2FsIGhhcyBubyBlZmZlY3QgaWYgdGhpcyBpcyBhIHN0YXJ0dXAgbG9hZCBiZWNhdXNlXG4gICAgLy8gYFBhY2thZ2VNYW5hZ2VyYCBkb2VzIG5vdCByZS1sb2FkIHRoZSBsaXN0IG9mIHBhY2thZ2VzIHRvIGFjdGl2YXRlIGFmdGVyIGVhY2ggaXRlcmF0aW9uLlxuICAgIG9uRGlkQWN0aXZhdGVEaXNwb3NhYmxlID0gYXRvbS5wYWNrYWdlcy5vbkRpZEFjdGl2YXRlSW5pdGlhbFBhY2thZ2VzKCgpID0+IHtcbiAgICAgIGRpc2FibGVUcmVlVmlld1BhY2thZ2UoKTtcbiAgICAgIG9uRGlkQWN0aXZhdGVEaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICB9KTtcblxuICAgIGRlc2VyaWFsaXplZFN0YXRlID0gc3RhdGU7XG4gICAgYWN0aXZhdGlvbiA9IG5ldyBBY3RpdmF0aW9uKGRlc2VyaWFsaXplZFN0YXRlKTtcbiAgfSxcblxuICBkZWFjdGl2YXRlKCkge1xuICAgIGNvbnN0IG51Y2xpZGVGZWF0dXJlcyA9IHJlcXVpcmUoJy4uLy4uLy4uLy4uL2xpYi9udWNsaWRlRmVhdHVyZXMnKTtcblxuICAgIC8vIFJlLWVuYWJsZSBBdG9tJ3MgYnVuZGxlZCAndHJlZS12aWV3JyB3aGVuIHRoaXMgcGFja2FnZSBpcyBkaXNhYmxlZCB0byBsZWF2ZSB0aGUgdXNlcidzXG4gICAgLy8gZW52aXJvbm1lbnQgdGhlIHdheSB0aGlzIHBhY2thZ2UgZm91bmQgaXQuXG4gICAgaWYgKG51Y2xpZGVGZWF0dXJlcy5pc0ZlYXR1cmVEaXNhYmxlZCgnbnVjbGlkZS1maWxlLXRyZWUnKVxuICAgICAgJiYgYXRvbS5wYWNrYWdlcy5pc1BhY2thZ2VEaXNhYmxlZCgndHJlZS12aWV3JykpIHtcbiAgICAgIGF0b20ucGFja2FnZXMuZW5hYmxlUGFja2FnZSgndHJlZS12aWV3Jyk7XG4gICAgfVxuXG4gICAgaWYgKHNpZGVCYXJEaXNwb3NhYmxlICE9IG51bGwpIHtcbiAgICAgIHNpZGVCYXJEaXNwb3NhYmxlLmRpc3Bvc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoIW9uRGlkQWN0aXZhdGVEaXNwb3NhYmxlLmRpc3Bvc2VkKSB7XG4gICAgICBvbkRpZEFjdGl2YXRlRGlzcG9zYWJsZS5kaXNwb3NlKCk7XG4gICAgfVxuXG4gICAgaWYgKGFjdGl2YXRpb24pIHtcbiAgICAgIGFjdGl2YXRpb24uZGlzcG9zZSgpO1xuICAgICAgYWN0aXZhdGlvbiA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIHNlcmlhbGl6ZSgpOiA/RmlsZVRyZWVDb250cm9sbGVyU3RhdGUge1xuICAgIGlmIChhY3RpdmF0aW9uKSB7XG4gICAgICByZXR1cm4gYWN0aXZhdGlvbi5zZXJpYWxpemUoKTtcbiAgICB9XG4gIH0sXG5cbiAgY29uc3VtZU51Y2xpZGVTaWRlQmFyKHNpZGViYXI6IE51Y2xpZGVTaWRlQmFyU2VydmljZSk6IElEaXNwb3NhYmxlIHtcbiAgICBpbnZhcmlhbnQoYWN0aXZhdGlvbik7XG5cbiAgICBzaWRlYmFyLnJlZ2lzdGVyVmlldyh7XG4gICAgICBnZXRDb21wb25lbnQoKSB7IHJldHVybiByZXF1aXJlKCcuLi9jb21wb25lbnRzL0ZpbGVUcmVlU2lkZWJhckNvbXBvbmVudCcpOyB9LFxuICAgICAgb25EaWRTaG93KCkge1xuICAgICAgICAvLyBJZiBcIlJldmVhbCBGaWxlIG9uIFN3aXRjaFwiIGlzIGVuYWJsZWQsIGVuc3VyZSB0aGUgc2Nyb2xsIHBvc2l0aW9uIGlzIHN5bmNlZCB0byB3aGVyZSB0aGVcbiAgICAgICAgLy8gdXNlciBleHBlY3RzIHdoZW4gdGhlIHNpZGUgYmFyIHNob3dzIHRoZSBmaWxlIHRyZWUuXG4gICAgICAgIGlmIChmZWF0dXJlQ29uZmlnLmdldChSRVZFQUxfRklMRV9PTl9TV0lUQ0hfU0VUVElORykpIHtcbiAgICAgICAgICBhdG9tLmNvbW1hbmRzLmRpc3BhdGNoKFxuICAgICAgICAgICAgYXRvbS52aWV3cy5nZXRWaWV3KGF0b20ud29ya3NwYWNlKSxcbiAgICAgICAgICAgICdudWNsaWRlLWZpbGUtdHJlZTpyZXZlYWwtYWN0aXZlLWZpbGUnXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHRvZ2dsZUNvbW1hbmQ6ICdudWNsaWRlLWZpbGUtdHJlZTp0b2dnbGUnLFxuICAgICAgdmlld0lkOiAnbnVjbGlkZS1maWxlLXRyZWUnLFxuICAgIH0pO1xuXG4gICAgc2lkZUJhckRpc3Bvc2FibGUgPSBuZXcgRGlzcG9zYWJsZSgoKSA9PiB7XG4gICAgICBzaWRlYmFyLmRlc3Ryb3lWaWV3KCdudWNsaWRlLWZpbGUtdHJlZScpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHNpZGVCYXJEaXNwb3NhYmxlO1xuICB9LFxuXG4gIGNvbnN1bWVXb3JraW5nU2V0c1N0b3JlKHdvcmtpbmdTZXRzU3RvcmU6IFdvcmtpbmdTZXRzU3RvcmUpOiA/SURpc3Bvc2FibGUge1xuICAgIGludmFyaWFudChhY3RpdmF0aW9uKTtcblxuICAgIHJldHVybiBhY3RpdmF0aW9uLmNvbnN1bWVXb3JraW5nU2V0c1N0b3JlKHdvcmtpbmdTZXRzU3RvcmUpO1xuICB9LFxuXG4gIGNvbnN1bWVDd2RBcGkoY3dkQXBpOiBDd2RBcGkpOiBJRGlzcG9zYWJsZSB7XG4gICAgaW52YXJpYW50KGFjdGl2YXRpb24pO1xuICAgIHJldHVybiBhY3RpdmF0aW9uLmNvbnN1bWVDd2RBcGkoY3dkQXBpKTtcbiAgfSxcbn07XG4iXX0=