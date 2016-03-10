Object.defineProperty(exports, '__esModule', {
  value: true
});

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

exports.getFileSystemContents = getFileSystemContents;
exports.getFileTreePathFromTargetEvent = getFileTreePathFromTargetEvent;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _assert = require('assert');

var _assert2 = _interopRequireDefault(_assert);

var _client = require('../../client');

var TREE_API_DATA_PATH = 'data-path';

/**
 * Reads the file contents and returns empty string if the file doesn't exist
 * which means it was removed in the HEAD dirty repository status.
 *
 * If another error is encontered, it's thrown to be handled up the stack.
 */

function getFileSystemContents(filePath) {
  var fileSystemService = (0, _client.getFileSystemServiceByNuclideUri)(filePath);
  (0, _assert2['default'])(fileSystemService);
  var localFilePath = require('../../remote-uri').getPath(filePath);
  return fileSystemService.readFile(localFilePath).then(function (contents) {
    return contents.toString('utf8');
  }, function (error) {
    if (error.code === 'ENOENT') {
      // The file is deleted in the current dirty status.
      return '';
    }
    throw error;
  });
}

function getFileTreePathFromTargetEvent(event) {
  // Event target isn't necessarily an HTMLElement,

  var target = event.currentTarget;
  var nameElement = target.hasAttribute(TREE_API_DATA_PATH) ? target : target.querySelector('[' + TREE_API_DATA_PATH + ']');
  return nameElement.getAttribute(TREE_API_DATA_PATH);
}

// but that's guaranteed in the usages here.
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInV0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O3NCQWFzQixRQUFROzs7O3NCQUNpQixjQUFjOztBQUU3RCxJQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQzs7Ozs7Ozs7O0FBUWhDLFNBQVMscUJBQXFCLENBQUMsUUFBb0IsRUFBbUI7QUFDM0UsTUFBTSxpQkFBaUIsR0FBRyw4Q0FBaUMsUUFBUSxDQUFDLENBQUM7QUFDckUsMkJBQVUsaUJBQWlCLENBQUMsQ0FBQztBQUM3QixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDcEUsU0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQzdDLElBQUksQ0FDSCxVQUFBLFFBQVE7V0FBSSxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztHQUFBLEVBQ3JDLFVBQUEsS0FBSyxFQUFJO0FBQ1AsUUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRTs7QUFFM0IsYUFBTyxFQUFFLENBQUM7S0FDWDtBQUNELFVBQU0sS0FBSyxDQUFDO0dBQ2IsQ0FDRixDQUFDO0NBQ0w7O0FBRU0sU0FBUyw4QkFBOEIsQ0FBQyxLQUFZLEVBQVU7OztBQUduRSxNQUFNLE1BQW1CLEdBQUksS0FBSyxDQUFDLGFBQWEsQUFBTSxDQUFDO0FBQ3ZELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsR0FDdkQsTUFBTSxHQUNOLE1BQU0sQ0FBQyxhQUFhLE9BQUssa0JBQWtCLE9BQUksQ0FBQztBQUNwRCxTQUFPLFdBQVcsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQztDQUNyRCIsImZpbGUiOiJ1dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2UgYmFiZWwnO1xuLyogQGZsb3cgKi9cblxuLypcbiAqIENvcHlyaWdodCAoYykgMjAxNS1wcmVzZW50LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBsaWNlbnNlIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgaW5cbiAqIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLlxuICovXG5cbmltcG9ydCB0eXBlIHtOdWNsaWRlVXJpfSBmcm9tICcuLi8uLi9yZW1vdGUtdXJpJztcblxuaW1wb3J0IGludmFyaWFudCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0IHtnZXRGaWxlU3lzdGVtU2VydmljZUJ5TnVjbGlkZVVyaX0gZnJvbSAnLi4vLi4vY2xpZW50JztcblxuY29uc3QgVFJFRV9BUElfREFUQV9QQVRIID0gJ2RhdGEtcGF0aCc7XG5cbi8qKlxuICogUmVhZHMgdGhlIGZpbGUgY29udGVudHMgYW5kIHJldHVybnMgZW1wdHkgc3RyaW5nIGlmIHRoZSBmaWxlIGRvZXNuJ3QgZXhpc3RcbiAqIHdoaWNoIG1lYW5zIGl0IHdhcyByZW1vdmVkIGluIHRoZSBIRUFEIGRpcnR5IHJlcG9zaXRvcnkgc3RhdHVzLlxuICpcbiAqIElmIGFub3RoZXIgZXJyb3IgaXMgZW5jb250ZXJlZCwgaXQncyB0aHJvd24gdG8gYmUgaGFuZGxlZCB1cCB0aGUgc3RhY2suXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRGaWxlU3lzdGVtQ29udGVudHMoZmlsZVBhdGg6IE51Y2xpZGVVcmkpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmaWxlU3lzdGVtU2VydmljZSA9IGdldEZpbGVTeXN0ZW1TZXJ2aWNlQnlOdWNsaWRlVXJpKGZpbGVQYXRoKTtcbiAgaW52YXJpYW50KGZpbGVTeXN0ZW1TZXJ2aWNlKTtcbiAgY29uc3QgbG9jYWxGaWxlUGF0aCA9IHJlcXVpcmUoJy4uLy4uL3JlbW90ZS11cmknKS5nZXRQYXRoKGZpbGVQYXRoKTtcbiAgcmV0dXJuIGZpbGVTeXN0ZW1TZXJ2aWNlLnJlYWRGaWxlKGxvY2FsRmlsZVBhdGgpXG4gICAgLnRoZW4oXG4gICAgICBjb250ZW50cyA9PiBjb250ZW50cy50b1N0cmluZygndXRmOCcpLFxuICAgICAgZXJyb3IgPT4ge1xuICAgICAgICBpZiAoZXJyb3IuY29kZSA9PT0gJ0VOT0VOVCcpIHtcbiAgICAgICAgICAvLyBUaGUgZmlsZSBpcyBkZWxldGVkIGluIHRoZSBjdXJyZW50IGRpcnR5IHN0YXR1cy5cbiAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVUcmVlUGF0aEZyb21UYXJnZXRFdmVudChldmVudDogRXZlbnQpOiBzdHJpbmcge1xuICAvLyBFdmVudCB0YXJnZXQgaXNuJ3QgbmVjZXNzYXJpbHkgYW4gSFRNTEVsZW1lbnQsXG4gIC8vIGJ1dCB0aGF0J3MgZ3VhcmFudGVlZCBpbiB0aGUgdXNhZ2VzIGhlcmUuXG4gIGNvbnN0IHRhcmdldDogSFRNTEVsZW1lbnQgPSAoZXZlbnQuY3VycmVudFRhcmdldDogYW55KTtcbiAgY29uc3QgbmFtZUVsZW1lbnQgPSB0YXJnZXQuaGFzQXR0cmlidXRlKFRSRUVfQVBJX0RBVEFfUEFUSClcbiAgICA/IHRhcmdldFxuICAgIDogdGFyZ2V0LnF1ZXJ5U2VsZWN0b3IoYFske1RSRUVfQVBJX0RBVEFfUEFUSH1dYCk7XG4gIHJldHVybiBuYW1lRWxlbWVudC5nZXRBdHRyaWJ1dGUoVFJFRV9BUElfREFUQV9QQVRIKTtcbn1cbiJdfQ==