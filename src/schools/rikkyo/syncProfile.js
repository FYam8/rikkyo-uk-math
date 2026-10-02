(function(root){
  /** @type {import('../../engine/externalSyncContract').ExternalProgressSyncProfile} */
  const RIKKYO_SYNC_PROFILE=Object.freeze({schoolId:'rikkyo-uk',localDatabaseName:'rikkyo-uk-progress-sync',localDatabaseVersion:7,appId:'rikkyo-uk-math',apiEnvironmentKey:'RIKKYO_UK_MATH_PROGRESS_API',browserApiOverrideKey:'__RIKKYO_UK_MATH_PROGRESS_API__',deploymentApiBase:'https://rikkyo-uk-progress-api.fyam8.workers.dev',transportKind:'summary-events',projectionOwner:'school'});
  root.RIKKYO_SYNC_PROFILE=RIKKYO_SYNC_PROFILE;
})(typeof window!=='undefined'?window:globalThis);
