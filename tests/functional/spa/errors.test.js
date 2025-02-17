/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

const testDriver = require('../../../tools/jil/index')
const querypack = require('@newrelic/nr-querypack')
const {getErrorsFromResponse} = require('../err/assertion-helpers')

// browsers without addEventListener do not support SPA
// browsers without Error stack are not captured (IE < 10)
let supported = testDriver.Matcher.withFeature('wrappableAddEventListener')
  .and(testDriver.Matcher.withFeature('errorStack'))

testDriver.test('error on the initial page load', supported, function (t, browser, router) {
  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-initial-page-load.html')
    .then(([rumData, eventData, domData]) => {
      var p
      if (browser.hasFeature('reliableFinalHarvest')) {
        p = clickAndRedirect(browser, router)
      } else {
        p = browser.elementByCssSelector('body').click()
      }

      return Promise.all([
        Promise.resolve(eventData),
        router.expectErrors(),
        p
      ])
    })
    .then(([eventData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should have 1 errors')

      let { body, query } = eventData
      let bel = body && body.length ? body : query.e
      let interactionTree = querypack.decode(bel)[0]

      // Root
      var interactionId = interactionTree.id
      var interactionNodeId = interactionTree.nodeId
      t.ok(interactionId != null, 'interaction id should not be null')
      t.ok(interactionNodeId != null, 'interaction should have nodeId attribute')

      // Tracer
      var interactionChildren = interactionTree.children
      t.equal(interactionChildren.length, 1, 'should have one child')
      var tracer = interactionChildren[0]
      t.equal(tracer.type, 'customTracer', 'child is a custom tracer')
      t.ok(tracer.nodeId != null, 'tracer should have a node id')

      // Error
      var error = errors[0]
      t.equal(error.params.message, 'initial page load error')
      t.equal(error.params.browserInteractionId, interactionId, 'should have the correct interaction id')
      t.equal(error.params.parentNodeId, tracer.nodeId, 'should not have parent id')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('error in root node', supported, function (t, browser, router) {
  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-root.html')
    .then(() => {
      return clickPageAndWaitForEventsAndErrors(t, browser, router)
    })
    .then(([eventData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should have 1 errors')

      let { body, query } = eventData
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var interactionId = interactionTree.id
      t.ok(interactionId != null, 'interaction id should not be null')
      t.ok(interactionTree.nodeId != null, 'interaction should have nodeId attribute')

      var error = errors[0]
      t.equal(error.params.message, 'some error')
      t.equal(error.params.browserInteractionId, interactionId, 'should have the correct interaction id')
      t.equal(error.params.parentNodeId, undefined, 'should not have parent id')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('error in xhr', supported, function (t, browser, router) {
  t.plan(7)

  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-xhr.html')
    .then(() => {
      return clickPageAndWaitForEventsAndErrors(t, browser, router)
    })
    .then(([eventData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should have 1 unique errors')

      let { body, query } = eventData
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var interactionId = interactionTree.id
      t.ok(interactionId != null, 'interaction id should not be null')
      t.ok(interactionTree.nodeId != null, 'interaction should have nodeId attribute')

      var nodeId = interactionTree.children[0].nodeId

      var error = errors[0]
      t.equal(error.params.message, 'some error')
      t.equal(error.params.browserInteractionId, interactionId, 'should have the correct interaction id')
      t.equal(error.params.parentNodeId, nodeId, 'has the correct parent node id')
      t.equal(error.metrics.count, 1, 'error should have been reported only once')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('error in custom tracer', supported, function (t, browser, router) {
  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-custom.html')
    .then(() => {
      return clickPageAndWaitForEventsAndErrors(t, browser, router)
    })
    .then(([eventData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should have 1 unique errors')

      let { body, query } = eventData
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var interactionId = interactionTree.id
      t.ok(interactionId != null, 'interaction id should not be null')
      t.ok(interactionTree.nodeId != null, 'interaction should have nodeId attribute')

      var nodeId = interactionTree.children[0].nodeId

      var error = errors[0]
      t.equal(error.params.message, 'some error')
      t.equal(error.params.browserInteractionId, interactionId, 'should have the correct interaction id')
      t.equal(error.params.parentNodeId, nodeId, 'has the correct node id')
      t.equal(error.metrics.count, 1, 'error should have been reported only once')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('string error in custom tracer', supported, function (t, browser, router) {
  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-custom-string.html')
    .then(() => {
      return clickPageAndWaitForEventsAndErrors(t, browser, router)
    })
    .then(([eventData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should have 1 unique errors')

      let { body, query } = eventData
      let interactionTree = querypack.decode(body && body.length ? body : query.e)[0]
      var interactionId = interactionTree.id
      t.ok(interactionId != null, 'interaction id should not be null')
      t.ok(interactionTree.nodeId != null, 'interaction should have nodeId attribute')

      var nodeId = interactionTree.children[0].nodeId

      var error = errors[0]
      t.equal(error.params.message, undefined)
      t.equal(error.params.browserInteractionId, interactionId, 'should have the correct interaction id')
      t.equal(error.params.parentNodeId, nodeId, 'has the correct node id')
      t.equal(error.metrics.count, 2, 'error will be reported twice')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('errors in discarded SPA interactions', supported, function (t, browser, router) {
  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/discarded-interaction.html')
    .then(() => {
      var p
      if (browser.hasFeature('reliableFinalHarvest')) {
        p = clickAndRedirect(browser, router, 200) // wait 200ms because the test page itself waits 100ms before throwing error
      } else {
        p = browser.elementByCssSelector('body').click()
      }
      return Promise.all([p, router.expectErrors()])
    })
    .then(([domData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should be only one error')

      var error = errors[0]
      t.equal(error.params.message, 'some error')
      t.equal(error.params.browserInteractionId, undefined, 'should not have interaction id')
      t.equal(error.params.parentNodeId, undefined, 'should not have parent node id')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('errors outside of interaction', supported, function (t, browser, router) {
  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-nointeraction.html')
    .then(() => {
      var p
      if (browser.hasFeature('reliableFinalHarvest')) {
        p = clickAndRedirect(browser, router, 200) // wait 200ms because the test page itself waits 100ms before throwing error
      } else {
        p = browser.elementByCssSelector('body').click()
      }
      return Promise.all([p, router.expectErrors()])
    })
    .then(([domData, errorData]) => {
      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 1, 'should be only one error')

      var error = errors[0]
      t.equal(error.params.message, 'some error')
      t.equal(error.params.browserInteractionId, undefined, 'should not have interaction id')
      t.equal(error.params.parentNodeId, undefined, 'should not have parent node id')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

testDriver.test('same error in multiple interactions', supported, function (t, browser, router) {
  var event1
  var event2

  waitForPageLoadAnInitialCalls(browser, router, 'spa/errors/captured-custom.html')
    .then(() => {
      return Promise.all([
        browser.elementByCssSelector('body').click(),
        router.expectEvents()
      ])
    })
    .then(result => {
      event1 = result[1]
      return Promise.all([
        browser.elementByCssSelector('body').click(),
        router.expectEvents()
      ])
    })
    .then(result => {
      event2 = result[1]
      if (browser.hasFeature('reliableFinalHarvest')) {
        return Promise.all([
          leavePage(browser, router),
          router.expectErrors()
        ])
          .then(result => {
            return result[1]
          })
      } else {
        return router.expectErrors()
      }
    })
    .then(errorData => {
      let interaction1 = querypack.decode(
        event1.body && event1.body.length ? event1.body : event1.query.e)[0]
      var interactionId1 = interaction1.id
      t.ok(interactionId1 != null, 'interaction 1 id should not be null')

      let interaction2 = querypack.decode(
        event2.body && event2.body.length ? event2.body : event2.query.e)[0]
      var interactionId2 = interaction2.id
      t.ok(interactionId2 != null, 'interaction 2 id should not be null')

      // check that errors payload did not include the error
      const errors = getErrorsFromResponse(errorData, browser)

      t.equal(errors.length, 2, 'should have 2 unique errors')

      var error1 = errors[0]
      var error2 = errors[1]
      t.equal(error1.params.browserInteractionId, interactionId1)
      t.equal(error2.params.browserInteractionId, interactionId2)
      t.notEqual(error1.params.browserInteractionId, error2.params.browserInteractionId,
        'should be linked to two different browser interactions')

      t.end()
    })
    .catch(fail)

  function fail (err) {
    t.error(err)
    t.end()
  }
})

function waitForPageLoadAnInitialCalls (browser, router, urlPath) {
  return Promise.all([
    router.expectRum(),
    router.expectEvents(),
    browser.safeGet(router.assetURL(urlPath, { loader: 'spa' }))
  ])
}

function clickPageAndWaitForEventsAndErrors (t, browser, router) {
  var useRedirect = browser.hasFeature('reliableFinalHarvest')
  return clickPageAndWaitForEvents(t, browser, router)
    .then(eventData => {
      if (useRedirect) {
        return Promise.all([
        // leave page to force final harvest (faster than waiting 60s for errors
        // to be harvested)
          leavePage(browser, router),
          router.expectErrors()
        ])
          .then(([domData, errorData]) => {
            return Promise.resolve([eventData, errorData])
          })
      } else {
        return Promise.all([
          Promise.resolve(eventData),
          router.expectErrors()
        ])
      }
    })
}

function clickPageAndWaitForEvents (t, browser, router) {
  return Promise.all([
    browser.elementByCssSelector('body').click(),
    router.expectEvents()
  ])
    .then(([domData, eventData]) => {
      return eventData
    })
}

// Click page (which triggers interaction to test), and then immediately load
// a different page, which triggers final harvest.
// This way the test is faster than waiting 60s for errors to be harvested.
function clickAndRedirect (browser, router, wait) {
  return browser.elementByCssSelector('body').click()
    .then(function () {
      if (wait) {
        return sleep(wait).then(() => {
          return leavePage(browser, router)
        })
      } else {
        return leavePage(browser, router)
      }
    })

  function sleep (duration) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve()
      }, duration)
    })
  }
}

function leavePage (browser, router) {
  return browser.safeGet(router.assetURL('_blank.html'))
}
