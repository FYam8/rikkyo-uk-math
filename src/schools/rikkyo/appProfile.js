(function(root){
  const profile={
    id:"rikkyo-uk",schoolLabel:"立教英国学院",
    brand:{title:"立教英国学院 数学",unofficialLabel:"非公式学習版",subtitle:"FY24–FY26 A/B・212問＋固定類題411問",footer:"公式解答・公式小問配点はありません。原本、独立解答、数学的再検算、自動採点回帰と精査をAnswer Authorityとします。"},
    supportedYears:[2024,2025,2026],
    targets:[{id:"minimum",label:"最低ライン",rank:1},{id:"stable",label:"安定圏",rank:2},{id:"safe",label:"安全圏",rank:3}],
    pastPaperRouteExamIds:["R25-MATH-A","R24-MATH-A","R24-MATH-B","R25-MATH-B","R26-MATH-B","R26-MATH-A"],
    learningPhases:[
      {step:1,title:"FY25A Core Diagnostic",role:"diagnostic",examIds:["R25-MATH-A"]},
      {step:2,title:"FY24A/B Training",role:"training",examIds:["R24-MATH-A","R24-MATH-B"]},
      {step:3,title:"L1 / L2 Remediation",role:"remediation",examIds:[]},
      {step:4,title:"Clean Transfer",role:"transfer",examIds:[]},
      {step:5,title:"Retention",role:"retention",examIds:[]},
      {step:6,title:"FY25B Intermediate Transfer",role:"transfer",examIds:["R25-MATH-B"]},
      {step:7,title:"FY26B Final learner-unseen evaluation",role:"evaluation",examIds:["R26-MATH-B"]},
      {step:8,title:"FY26A Parallel-form confirmation",role:"confirmation",examIds:["R26-MATH-A"]}
    ],
    practicePolicy:{weaknessSetSize:4,weaknessDisplayLimit:3},
    runtime:{storageNamespace:"rikkyo-uk-math",canonicalStateKeyPrefix:"rikkyo-uk-math",backupAppId:"rikkyo-uk-math",eventNamespace:"rikkyo-uk-math",updateChannel:"rikkyo-uk-math-updates",progressSync:{enabled:false,indexedDbName:"rikkyo-uk-math-progress-sync",appId:"rikkyo-uk-math",browserApiOverrideKey:"__RIKKYO_UK_MATH_PROGRESS_API__",deploymentApiBase:null}},
    contentPolicy:{officialScoreAvailable:false,scoreAuthority:"not-available",reviewRequiredProblemIds:["R26-MATH-A-Q5-3"],learnerUnseenExamIds:["R26-MATH-B"]}
  };
  root.RIKKYO_MATH_PROFILE=Object.freeze(profile);
})(typeof window!=="undefined"?window:globalThis);
