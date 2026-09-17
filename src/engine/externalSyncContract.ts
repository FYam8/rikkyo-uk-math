/**
 * Identity/configuration boundary for an optional external progress-sync adapter.
 *
 * This does not define what a school must upload. Projection semantics remain
 * school-owned so one school's year/target assumptions never become engine law.
 */
export type ExternalProgressSyncProfile = {
  schoolId: string
  localDatabaseName: string
  localDatabaseVersion: number
  appId: string
  apiEnvironmentKey: string
  browserApiOverrideKey: string
  deploymentApiBase: string
  transportKind: 'summary-events'
  projectionOwner: 'school'
}

export function assertExternalProgressSyncProfile(profile: ExternalProgressSyncProfile) {
  for (const [field, value] of Object.entries(profile)) {
    if (typeof value === 'string' && value.length === 0) throw new Error(`sync profile ${field} must not be empty`)
  }
  if (!Number.isInteger(profile.localDatabaseVersion) || profile.localDatabaseVersion < 1) {
    throw new Error('sync profile localDatabaseVersion must be a positive integer')
  }
  if (!/^https:\/\//.test(profile.deploymentApiBase)) {
    throw new Error('sync profile deploymentApiBase must be HTTPS')
  }
  return profile
}
