import json,re
from pathlib import Path
from fractions import Fraction
r=Path(__file__).resolve().parents[1]
items=[q for q in json.loads((r/'data/practice_bank.json').read_text('utf-8')) if q['id'].startswith('PB3-')]
assert len(items)==10
for q in items:
 p=q['promptText'];a,b=map(int,re.search(r'(\d+):(\d+)',p).groups());amounts=list(map(int,re.findall(r'(\d+)mL',p)))
 if '合計' in p:
  total,stock=amounts;required=Fraction(total*b,a+b);answer=required-stock
  assert Fraction(total-required,required)==Fraction(a,b)
 elif q['subSkill'].endswith('_REVERSE'):
  fixed,stock=amounts;required=Fraction(fixed*a,b);answer=required-stock
  assert Fraction(required,fixed)==Fraction(a,b)
 else:
  fixed=amounts[0];stock=amounts[1] if len(amounts)>1 else 0;required=Fraction(fixed*b,a);answer=required-stock
  assert Fraction(fixed,required)==Fraction(a,b)
 assert answer.denominator==1 and answer>0,(q['id'],answer)
 assert answer==q['answerSpec']['expected']==int(q['answerCandidate']),(q['id'],answer)
 assert q['answerSpec']['displayUnit']=='mL'
 assert 'mL' in q['explanation'] and str(answer) in q['explanation']
 assert q['sourceDocument'] is None and q['sourcePageImage'] is None
 assert q['contentProvenance']=='APP_AUTHORED_20261003_NOT_PAST_PAPER'
 assert q['transferEligibleByDesign']==(q['practiceLevel']=='TRANSFER')
 assert q['retentionEligibleByDesign']==(q['practiceLevel']=='RETENTION')
 assert q['practiceLevel']!='TRANSFER' or q['subSkill'] in ['MIXTURE_RATIO_TOTAL','MIXTURE_RATIO_REVERSE']
print('PASS 10 mixture prompts: independently recomputed from displayed quantities; reverse/total/stock, exact ratios, provenance')
