/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

var withHash = /([^?#]*)[^#]*(#[^?]*|$).*/
var withoutHash = /([^?#]*)().*/
var obfuscateFile = require('./obfuscate-file')

module.exports = function cleanURL (url, keepHash) {
  const fileUrl = obfuscateFile(url)
  if (fileUrl != null) {
    return fileUrl
  }
  else {
    return url.replace(keepHash ? withHash : withoutHash, '$1$2')
  }
}
