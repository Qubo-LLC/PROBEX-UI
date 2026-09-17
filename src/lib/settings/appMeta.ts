// What the running dashboard can truthfully say about itself.
//
// The previous version of this file declared `environment: 'Mock / Demo'`,
// `build: '2026.06.26'` and `channel: 'Beta'` as constants — three months
// after the product went live against the engine, Settings › About still
// announced a mock build. A deployment fact that is typed by hand is a
// deployment fact that goes stale. The version is read from package.json; the
// data mode, API base and engine environment are read at runtime by the page.

import pkg from '../../../package.json'

export const APP_VERSION: string = pkg.version
