import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'))
const questions=read('questions.json'),bank=read('practice_bank.json'),exams=read('exams.json')
const roleForBank=level=>level==='TRANSFER'?'transfer':level==='RETENTION'?'retention':level==='L1'?'remediation':'practice'
const authorityFor=source=>({scoreAuthority:'not-available',model:source.answerAuthority||'independent_solution_plus_internal_qa',verificationStatus:source.sourceVerificationStatus||source.solutionVerificationStatus||source.answerSpec?.verification||'independent_internal_qa'})
const flagsFor=source=>String(source.answerAmbiguityStatus||'').includes('flagged')?['REVIEW_REQUIRED']:[]
const canonicalExams=exams.map(exam=>({examId:exam.examId,year:exam.year,form:exam.examType,label:exam.label,role:exam.role,scoreAuthority:'not-available',schoolEvidence:{sourceRecord:exam}}))
const past=questions.map(source=>({problemId:source.id,sourceProblemId:source.id,sourceKind:'past-paper',examId:source.examId,location:{year:source.year,form:source.examType,major:source.majorQuestion,minor:source.minorQuestion,label:source.label},role:source.role,fieldId:source.primarySkill,topicIds:[source.subSkill,...(source.skillTags||[])].filter(Boolean),difficultyId:source.difficulty,targetRelevance:source.targetRelevance,answerSpec:source.answerSpec,responseSlots:source.responseSlots||[],promptText:source.promptText,sourcePageImage:source.sourcePageImage,hints:[source.hint1,source.hint2].filter(Boolean),explanationSteps:source.explanationSteps||[],answerAuthority:authorityFor(source),qualityFlags:flagsFor(source),contentVersion:source.contentVersion,gradingVersion:source.answerSpecVersion,schoolEvidence:{sourceRecord:source}}))
const practice=bank.map(source=>({problemId:source.id,sourceProblemId:source.id,sourceKind:'fixed-practice',location:{label:source.label},role:roleForBank(source.practiceLevel),fieldId:source.primarySkill,topicIds:[source.subSkill,...(source.skillTags||[])].filter(Boolean),difficultyId:source.difficulty,targetRelevance:source.targetRelevance,answerSpec:source.answerSpec,responseSlots:source.responseSlots||[],promptText:source.promptText,sourcePageImage:source.sourcePageImage,hints:[source.hint1,source.hint2].filter(Boolean),explanationSteps:Array.isArray(source.explanationSteps)?source.explanationSteps:[source.explanation].filter(Boolean),answerAuthority:authorityFor(source),qualityFlags:flagsFor(source),contentVersion:source.contentVersion,gradingVersion:source.answerSpecVersion,schoolEvidence:{sourceRecord:source}}))
const out={contractVersion:1,schoolId:'rikkyo-uk',generatedFrom:{questions:'data/questions.json',practiceBank:'data/practice_bank.json',exams:'data/exams.json'},exams:canonicalExams,problems:[...past,...practice]}
fs.writeFileSync(path.join(root,'data','canonical_content.json'),JSON.stringify(out,null,2)+'\n')
console.log(`canonical content: ${past.length} past + ${practice.length} practice = ${out.problems.length}`)
