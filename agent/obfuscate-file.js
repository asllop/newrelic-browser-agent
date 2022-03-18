/*
 * Copyright 2022 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = function obfuscateFile (url) {
    try {
        parsedUrl = new URL(url)
        if (parsedUrl.protocol == "file:") {
            return parsedUrl.origin + 'HIDDEN_PATH/' + parsedUrl.pathname.split('/').pop()
        }
        else {
            return null
        }
    } catch (error) {
        return null
    }
}
