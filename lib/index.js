/**
 * Host half of dsh-approval-enter.
 *
 * This package contributes browser presentation only. The row exists so the
 * client module scanner can find the package: `dsh-client-modules` walks the
 * host Loader's rows, reads each row's manifest, and ships the
 * `exports["./client"]` bundle for every package declaring
 * `dsh.client.platform: "web"`.
 *
 * All of the behaviour lives in the browser bundle. This half records a single
 * boot line so the row's activation can be confirmed from outside the app, then
 * does nothing else.
 */

import { appendFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Where the boot line lands. Delete the file to reset the record. */
const BOOT_LOG = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'dsh-approval-enter.boot.log')

function noteBoot() {
  try {
    appendFileSync(BOOT_LOG, `${new Date().toISOString()} host row applied\n`, 'utf8')
  } catch {
    /* diagnostics must never break activation */
  }
}

/** Host plugin body 鈥?records the boot line and contributes nothing else. */
function apply() {
  noteBoot()
}

export { apply, BOOT_LOG }
