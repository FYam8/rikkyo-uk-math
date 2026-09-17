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
    presentationLabels:{
      skills:{ALGEBRA:"式・代数",CALCULATION:"計算",CIRCLE:"円",DATA:"データの活用",EQUATION:"方程式",FUNCTION:"関数",MEASUREMENT:"長さ・面積・体積",NUMBER_THEORY:"数の性質・平方根",PLANE_GEOMETRY:"平面図形",PROBABILITY:"確率",SIMILARITY:"相似・比",SOLID_GEOMETRY:"空間図形",STATISTICS:"統計",WORD_PROBLEM:"文章題"},
      practiceLevels:{L1:"基礎を固める",L2:"入試レベルで練習",TRANSFER:"初見問題で確認",RETENTION:"翌日の定着確認"},
      families:{ALGEBRA_MANIPULATION:"式の展開・因数分解",CALCULATION_FLUENCY:"計算の正確さ・速さ",CIRCLE:"円・円周角",EQUATION_SOLVING:"方程式を解く",FUNCTION_CORE_AND_TRANSFER:"関数・グラフ",MEASUREMENT:"長さ・面積・体積",PLANE_GEOMETRY:"平面図形",PROBABILITY_NUMBER_DATA:"確率・数・データ",SIMILARITY_AND_RATIO:"相似・比",SOLID_GEOMETRY:"空間図形"},
      modes:{learning:"類題練習",retention:"定着確認",diagnostic:"実力診断",transfer:"初見応用",evaluation:"最終確認",exam:"過去問",confirmation:"別日程確認"},
      masteryStates:{learning:"学習中",weak:"要補強",improving:"改善中",mastered:"定着"},
      exposure:{unseen:"未見",seen:"確認済み",practiced:"学習済み"},
      targetRelevance:{MUST:"最優先",SHOULD:"推奨",DEFER:"後回し"},
      difficulty:{A:"基礎",B:"標準",C:"発展"}
    },
    runtime:{storageNamespace:"rikkyo-uk-math",canonicalStateKeyPrefix:"rikkyo-uk-math",backupAppId:"rikkyo-uk-math",eventNamespace:"rikkyo-uk-math",updateChannel:"rikkyo-uk-math-updates",progressSync:{enabled:false,indexedDbName:"rikkyo-uk-math-progress-sync",appId:"rikkyo-uk-math",browserApiOverrideKey:"__RIKKYO_UK_MATH_PROGRESS_API__",deploymentApiBase:null}},
    contentPolicy:{officialScoreAvailable:false,scoreAuthority:"not-available",reviewRequiredProblemIds:["R26-MATH-A-Q5-3"],learnerUnseenExamIds:["R26-MATH-B"]}
  };
  root.RIKKYO_MATH_PROFILE=Object.freeze(profile);
})(typeof window!=="undefined"?window:globalThis);
