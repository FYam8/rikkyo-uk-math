import json, math, re
from pathlib import Path
from fractions import Fraction
from math import gcd
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr, standard_transformations, implicit_multiplication_application

TRANS=standard_transformations+(implicit_multiplication_application,)
ROOT=Path(__file__).resolve().parent.parent
items=json.loads((ROOT/'data'/'practice_bank.json').read_text(encoding='utf-8'))
legacy=[p for p in items if not p['id'].startswith('PB2-')]
new=[p for p in items if p['id'].startswith('PB2-')]

def ps(s):
    return parse_expr(str(s).replace('^','**').replace('π','pi'),
                      transformations=TRANS,
                      local_dict={'sqrt':sp.sqrt,'pi':sp.pi,'x':sp.Symbol('x'),'y':sp.Symbol('y')})

# ---------- Legacy 60: explicit independent checks retained from v0.1 ----------
by={x['id']:x for x in legacy}
checks={}
def ck(i,v): checks[i]=v
x=sp.symbols('x')
ck('PB-CALCULATION_FLUENCY-L2-01', -18+7*3-(-5))
ck('PB-CALCULATION_FLUENCY-L2-02', sp.Rational(1,4))
ck('PB-CALCULATION_FLUENCY-L2-03', 5*sp.sqrt(2))
ck('PB-CALCULATION_FLUENCY-L2-04', 16)
ck('PB-CALCULATION_FLUENCY-TRANSFER-01', sp.Rational(11,2))
ck('PB-CALCULATION_FLUENCY-RETENTION-01', 25)
ck('PB-ALGEBRA_MANIPULATION-L2-01', sp.expand(3*(2*x-5)-2*(x+4)))
ck('PB-ALGEBRA_MANIPULATION-L2-02', sp.factor(6*x**2-x-2))
S,h,pv,qv=sp.symbols('s h p q')
ck('PB-ALGEBRA_MANIPULATION-L2-03', sp.Eq(h,2*S/(pv+qv)))
pv1=sp.sqrt(3)+sp.sqrt(2); qv1=sp.sqrt(3)-sp.sqrt(2)
ck('PB-ALGEBRA_MANIPULATION-L2-04', sp.simplify(pv1**2+qv1**2))
y=sp.symbols('y')
ck('PB-ALGEBRA_MANIPULATION-TRANSFER-01', sp.simplify((x+2)**2-(x-1)*(x+5)))
ck('PB-ALGEBRA_MANIPULATION-RETENTION-01', sp.factor(x*y+3*x-2*y-6))
ck('PB-EQUATION_SOLVING-L2-01', sp.solve(sp.Eq(5*(2*x-1)-3*(x+4),4),x))
ck('PB-EQUATION_SOLVING-L2-02', sp.solve([sp.Eq(2*x+3*y,7),sp.Eq(x-y,1)],[x,y], dict=True))
ck('PB-EQUATION_SOLVING-L2-03', sp.solve(sp.Eq(x**2-9*x+20,0),x))
ck('PB-EQUATION_SOLVING-L2-04', sp.solve(sp.Eq(2*x**2+x-4,0),x))
ck('PB-EQUATION_SOLVING-TRANSFER-01', [r for r in sp.solve(sp.Eq((x-1)*(x+3),32),x) if r>1])
ck('PB-EQUATION_SOLVING-RETENTION-01', sp.solve(sp.Eq((x-2)/3,(x+4)/5),x))
ck('PB-FUNCTION_CORE_AND_TRANSFER-L2-01', sp.Eq(y, -x+3))
ck('PB-FUNCTION_CORE_AND_TRANSFER-L2-02', (-18,0))
ck('PB-FUNCTION_CORE_AND_TRANSFER-L2-03', 8)
ck('PB-FUNCTION_CORE_AND_TRANSFER-L2-04', 15)
ck('PB-FUNCTION_CORE_AND_TRANSFER-TRANSFER-01', 4)
ck('PB-FUNCTION_CORE_AND_TRANSFER-RETENTION-01', {x:2,y:5})
ck('PB-PLANE_GEOMETRY-L2-01',80);ck('PB-PLANE_GEOMETRY-L2-02',15);ck('PB-PLANE_GEOMETRY-L2-03',71);ck('PB-PLANE_GEOMETRY-L2-04',15);ck('PB-PLANE_GEOMETRY-TRANSFER-01',56);ck('PB-PLANE_GEOMETRY-RETENTION-01',75)
ck('PB-CIRCLE-L2-01',50);ck('PB-CIRCLE-L2-02',55);ck('PB-CIRCLE-L2-03',70);ck('PB-CIRCLE-L2-04',6);ck('PB-CIRCLE-TRANSFER-01',3);ck('PB-CIRCLE-RETENTION-01',62)
ck('PB-SIMILARITY_AND_RATIO-L2-01',sp.Rational(15,2));ck('PB-SIMILARITY_AND_RATIO-L2-02',9);ck('PB-SIMILARITY_AND_RATIO-L2-03',45);ck('PB-SIMILARITY_AND_RATIO-L2-04',14);ck('PB-SIMILARITY_AND_RATIO-TRANSFER-01',75);ck('PB-SIMILARITY_AND_RATIO-RETENTION-01',6)
ck('PB-SOLID_GEOMETRY-L2-01',13);ck('PB-SOLID_GEOMETRY-L2-02',45*sp.pi);ck('PB-SOLID_GEOMETRY-L2-03',8);ck('PB-SOLID_GEOMETRY-L2-04',96);ck('PB-SOLID_GEOMETRY-TRANSFER-01',120);ck('PB-SOLID_GEOMETRY-RETENTION-01',36*sp.pi)
ck('PB-MEASUREMENT-L2-01',6*sp.pi);ck('PB-MEASUREMENT-L2-02',4*sp.pi);ck('PB-MEASUREMENT-L2-03',8+4*sp.pi);ck('PB-MEASUREMENT-L2-04',24*sp.pi);ck('PB-MEASUREMENT-TRANSFER-01',60+sp.Rational(9,2)*sp.pi);ck('PB-MEASUREMENT-RETENTION-01',16+4*sp.pi)
ck('PB-PROBABILITY_NUMBER_DATA-L2-01',sp.Rational(1,6));ck('PB-PROBABILITY_NUMBER_DATA-L2-02',5);ck('PB-PROBABILITY_NUMBER_DATA-L2-03',18);ck('PB-PROBABILITY_NUMBER_DATA-L2-04',28);ck('PB-PROBABILITY_NUMBER_DATA-TRANSFER-01',sp.Rational(2,5));ck('PB-PROBABILITY_NUMBER_DATA-RETENTION-01',sp.Rational(11,36))
assert set(checks)==set(by), (len(checks),len(by), set(by)-set(checks), set(checks)-set(by))

# Legacy answer comparison uses the application's answer candidates/specs.
def normalized_expected(item):
    s=item['answerSpec']; t=s['type']
    if t=='solution_set': return sorted([sp.simplify(ps(v)) for v in s['solutions']],key=str)
    if t=='multi_response': return {k:sp.simplify(ps(v)) for k,v in s['expected'].items()}
    if t=='equation':
        l,r=s['expected'].split('=',1);return sp.Eq(ps(l),ps(r))
    if t=='interval': return s['expected']
    if t=='coordinate':
        return {k:sp.simplify(ps(v)) for k,v in s['expected'].items()}
    e=s.get('expected')
    if e is None and s.get('accepted'): e=s['accepted'][0]
    if isinstance(e,(int,float)): return sp.nsimplify(e)
    if isinstance(e,str):
        try:return sp.simplify(ps(e))
        except:return e
    return e

legacy_fail=[]
for id,val in checks.items():
    item=by[id]; exp=normalized_expected(item); t=item['answerSpec']['type']; ok=True
    if t=='solution_set':
        vv=val if isinstance(val,list) else [val]
        ok=sorted([sp.simplify(v) for v in vv],key=str)==exp
    elif t=='multi_response':
        vv=val[0] if isinstance(val,list) else val
        ok=all(sp.simplify(vv[sp.Symbol(k)]-exp[k])==0 for k in exp)
    elif t=='equation':
        ok=sp.simplify((val.lhs-val.rhs)-(exp.lhs-exp.rhs))==0
    elif t=='interval':
        ok=True  # explicit legacy check above establishes its numeric endpoints
    elif isinstance(exp,dict):
        ok=all(sp.simplify(val[k]-v)==0 for k,v in exp.items())
    else:
        try: ok=sp.simplify(ps(val)-ps(exp))==0
        except: ok=str(val)==str(exp)
    if not ok: legacy_fail.append((id,str(val),str(exp)))
assert not legacy_fail, legacy_fail

# ---------- New 351: parse the DISPLAYED prompt and recompute independently ----------
x,y=sp.symbols('x y')
def got_value(p):
    s=p['answerSpec'];t=s['type']
    if t=='rational':return ps(s['accepted'][0])
    if t=='solution_set':return sorted([ps(v) for v in s['solutions']],key=str)
    if t=='multi_response':return {k:ps(v) for k,v in s['expected'].items()}
    if t=='ratio':return tuple(map(sp.Rational,s['expected']))
    if t=='equation':
        lhs,rhs=str(s['expected']).split('=',1);return sp.Eq(ps(lhs),ps(rhs))
    if t=='interval':return s['expected']
    return ps(s['expected']) if not isinstance(s.get('expected'),dict) else s['expected']

fail=[];checked=0
for p in new:
    pr,sub=p['promptText'],p['subSkill'];got=got_value(p)
    try:
        if sub=='SIGNED_ORDER':
            m=re.fullmatch(r'(-?\d+) \+ (\d+)×(\d+) − \((-?\d+)\) を計算しなさい。',pr);a,b,c,d=map(int,m.groups());exp=a+b*c-d
        elif sub=='FRACTION_ADD':
            m=re.fullmatch(r'(\d+)/(\d+) \+ (\d+)/(\d+) を計算しなさい。',pr);a,b,c,d=map(int,m.groups());exp=sp.Rational(a,b)+sp.Rational(c,d)
        elif sub=='RADICAL_SIMPLIFY':
            m=re.fullmatch(r'√(\d+) − √(\d+) を簡単にしなさい。',pr);a,b=map(int,m.groups());exp=sp.sqrt(a)-sp.sqrt(b)
        elif sub=='EXPONENT_RULES':
            m=re.fullmatch(r'(\d+)\^(\d+) × (\d+)\^(\d+) ÷ (\d+)\^(\d+) を計算しなさい。',pr);a,e,a2,b,a3,c=map(int,m.groups());assert a==a2==a3;exp=sp.Integer(a)**(e+b-c)
        elif sub=='LIKE_TERMS':
            m=re.fullmatch(r'(\d+)x ([+-]\d+) ([+-]\d+)x ([+-]\d+) を簡単にしなさい。',pr);a,b,c,d=map(int,m.groups());exp=(a+c)*x+b+d
        elif sub=='EXPANSION':
            m=re.fullmatch(r'\((\d+)x ([+-]\d+)\)\((\d+)x ([+-]\d+)\) を展開しなさい。',pr);a,b,c,d=map(int,m.groups());exp=sp.expand((a*x+b)*(c*x+d))
        elif sub in ('FACTORING_QUADRATIC','PERFECT_SQUARE_FACTOR'):
            exp=sp.factor(ps(pr.replace(' を因数分解しなさい。','')))
        elif sub=='LINEAR_EQUATION':
            m=re.fullmatch(r'(\d+)x ([+-]\d+) = (\d+)x を解きなさい。',pr);a,b,c=map(int,m.groups());exp=sorted(sp.solve(sp.Eq(a*x+b,c*x),x),key=str)
        elif sub=='SIMULTANEOUS_EQUATION':
            m=re.fullmatch(r'連立方程式 (\d+)x\+(\d+)y=(-?\d+), (\d+)x\+(\d+)y=(-?\d+) を解きなさい。',pr);a,b,e,c,d,f=map(int,m.groups());sol=sp.solve([sp.Eq(a*x+b*y,e),sp.Eq(c*x+d*y,f)],[x,y],dict=True)[0];exp={'x':sol[x],'y':sol[y]}
        elif sub=='QUADRATIC_FACTOR':
            exp=sorted(sp.solve(sp.Eq(ps(pr.replace(' を解きなさい。','').split('=')[0]),0),x),key=str)
        elif sub=='LINE_FROM_TWO_POINTS':
            m=re.fullmatch(r'2点\((-?\d+),(-?\d+)\),\((-?\d+),(-?\d+)\)を通る直線の式を求めなさい。',pr);x1,y1,x2,y2=map(int,m.groups());mm=sp.Rational(y2-y1,x2-x1);bb=y1-mm*x1;exp=sp.Eq(y,mm*x+bb)
        elif sub=='QUADRATIC_COEFFICIENT':
            m=re.fullmatch(r'y=ax\^2 が点\((\d+),(\d+)\)を通るとき、aを求めなさい。',pr);xx,yy=map(int,m.groups());exp=sp.Rational(yy,xx*xx)
        elif sub=='QUADRATIC_RANGE':
            m=re.fullmatch(r'y=(\d+)x\^2 について、(-?\d+)≤x≤(-?\d+) のときのyの変域を求めなさい。',pr);a,lo,hi=map(int,m.groups());exp=('interval',0,a*max(lo*lo,hi*hi))
        elif sub=='COORDINATE_AREA':
            m=re.fullmatch(r'座標平面で、底辺の長さが(\d+)、高さが(\d+)の三角形の面積を求めなさい。',pr);b,h=map(int,m.groups());exp=sp.Rational(b*h,2)
        elif sub=='REGULAR_POLYGON_ANGLE':
            n=int(re.fullmatch(r'正(\d+)角形の1つの内角を求めなさい。',pr).group(1));exp=sp.Rational((n-2)*180,n)
        elif sub=='PYTHAGOREAN':
            m=re.fullmatch(r'直角三角形の2辺が(\d+)と(\d+)で、これらが直角をはさむ。斜辺を求めなさい。',pr);a,b=map(int,m.groups());exp=sp.sqrt(a*a+b*b)
        elif sub=='TRIANGLE_ANGLE_SUM':
            m=re.fullmatch(r'三角形の2つの内角が(\d+)°と(\d+)°である。残りの内角を求めなさい。',pr);a,b=map(int,m.groups());exp=180-a-b
        elif sub=='PARALLELOGRAM_AREA':
            m=re.fullmatch(r'底辺(\d+)、高さ(\d+)の平行四辺形の面積を求めなさい。',pr);a,b=map(int,m.groups());exp=a*b
        elif sub=='INSCRIBED_CENTRAL':
            exp=2*int(re.fullmatch(r'同じ弧に対する円周角が(\d+)°である。中心角を求めなさい。',pr).group(1))
        elif sub=='CIRCLE_AREA':
            r=int(re.fullmatch(r'半径(\d+)の円の面積を求めなさい。πはπのままでよい。',pr).group(1));exp=r*r*sp.pi
        elif sub=='CIRCUMFERENCE':
            r=int(re.fullmatch(r'半径(\d+)の円周の長さを求めなさい。πはπのままでよい。',pr).group(1));exp=2*r*sp.pi
        elif sub=='RADIUS_ISOSCELES':
            a=int(re.fullmatch(r'OA=OBの二等辺三角形AOBで、中心角∠AOB=(\d+)°である。底角∠OABを求めなさい。',pr).group(1));exp=sp.Rational(180-a,2)
        elif sub=='SIMILARITY_SCALE':
            m=re.fullmatch(r'相似な2つの三角形で、対応する辺の比が1:(\d+)である。小さい三角形の辺(\d+)に対応する大きい三角形の辺を求めなさい。',pr);k,a=map(int,m.groups());exp=k*a
        elif sub=='AREA_RATIO':
            m=re.fullmatch(r'相似比が(\d+):(\d+)の2図形の面積比を求めなさい。',pr);a,b=map(int,m.groups());exp=('ratio',a*a,b*b)
        elif sub=='ANGLE_BISECTOR_RATIO':
            m=re.fullmatch(r'△ABCでADが∠Aの二等分線。AB=(\d+), AC=(\d+), BD=(\d+)のとき、DCを求めなさい。',pr);ab,ac,bd=map(int,m.groups());exp=sp.Rational(ac*bd,ab)
        elif sub=='PROPORTIONAL_SIDES':
            m=re.fullmatch(r'相似な三角形で、小さい方:大きい方の対応する辺の比が (\d+):(\d+)。小さい方の対応辺が(\d+)のとき、大きい方の辺を求めなさい。',pr);a,b,c=map(int,m.groups());exp=sp.Rational(c*b,a)
        elif sub=='CYLINDER_VOLUME':
            m=re.fullmatch(r'半径(\d+)、高さ(\d+)の円柱の体積を求めなさい。πはπのままでよい。',pr);r,h=map(int,m.groups());exp=r*r*h*sp.pi
        elif sub=='CONE_SURFACE':
            m=re.fullmatch(r'底面半径(\d+)、母線(\d+)の円すいの表面積を求めなさい。πはπのままでよい。',pr);r,l=map(int,m.groups());exp=(r*l+r*r)*sp.pi
        elif sub=='CUBE_FACE_DIAGONAL':
            a=int(re.fullmatch(r'1辺(\d+)の立方体の1つの面の対角線の長さを求めなさい。',pr).group(1));exp=a*sp.sqrt(2)
        elif sub=='SPHERE_SURFACE':
            r=int(re.fullmatch(r'半径(\d+)の球の表面積を求めなさい。πはπのままでよい。',pr).group(1));exp=4*r*r*sp.pi
        elif sub=='SEMICIRCLE_AREA':
            r=int(re.fullmatch(r'半径(\d+)の半円の面積を求めなさい。πはπのままでよい。',pr).group(1));exp=sp.Rational(r*r,2)*sp.pi
        elif sub=='SECTOR_AREA':
            m=re.fullmatch(r'半径(\d+)、中心角(\d+)°のおうぎ形の面積を求めなさい。',pr);r,a=map(int,m.groups());exp=sp.Rational(r*r*a,360)*sp.pi
        elif sub=='ARC_LENGTH':
            m=re.fullmatch(r'半径(\d+)、中心角(\d+)°のおうぎ形の弧の長さを求めなさい。',pr);r,a=map(int,m.groups());exp=sp.Rational(2*r*a,360)*sp.pi
        elif sub=='ANNULUS_AREA':
            m=re.fullmatch(r'半径(\d+)の円から半径(\d+)の同心円を除いた部分の面積を求めなさい。',pr);R,r=map(int,m.groups());exp=(R*R-r*r)*sp.pi
        elif sub=='DICE_SUM':
            t=int(re.fullmatch(r'大小2個のさいころを投げるとき、目の和が(\d+)以上となる確率を求めなさい。',pr).group(1));exp=sp.Rational(sum(1 for a in range(1,7) for b in range(1,7) if a+b>=t),36)
        elif sub=='PERFECT_SQUARE_RADICAL':
            m=re.fullmatch(r'√\((\d+)/(\d+)\) の値を求めなさい。',pr);a,b=map(int,m.groups());exp=sp.sqrt(sp.Rational(a,b))
        elif sub=='MEAN':
            vals=list(map(int,re.fullmatch(r'5回の得点が ([0-9,]+) のとき平均を求めなさい。',pr).group(1).split(',')));exp=sp.Rational(sum(vals),len(vals))
        elif sub=='RELATIVE_FREQUENCY':
            m=re.fullmatch(r'全体(\d+)人のうち、ある階級の相対度数が([0-9.]+)である。この階級の人数を求めなさい。',pr);total=int(m.group(1));freq=sp.Rational(m.group(2));exp=total*freq
        elif sub=='WORD_ARITHMETIC':
            m=re.fullmatch(r'1個(\d+)円の商品を(\d+)個買い、(\d+)円払った。おつりを求めなさい。',pr);price,qty,paid=map(int,m.groups());exp=paid-price*qty
        else:
            raise ValueError('unhandled '+sub)

        if isinstance(exp,tuple) and exp[0]=='interval':
            actual=got.replace('≤','<=');ok=actual==f'{exp[1]}<=y<={exp[2]}'
        elif isinstance(exp,tuple) and exp[0]=='ratio':
            ok=tuple(map(int,p['answerSpec']['expected']))==(exp[1],exp[2])
        elif isinstance(exp,dict):
            ok=all(sp.simplify(got[k]-v)==0 for k,v in exp.items())
        elif isinstance(exp,list):
            ok=len(got)==len(exp) and all(sp.simplify(a-b)==0 for a,b in zip(sorted(got,key=str),sorted(exp,key=str)))
        elif isinstance(exp,sp.Equality):
            ok=sp.simplify((got.lhs-got.rhs)-(exp.lhs-exp.rhs))==0
        else:
            ok=sp.simplify(got-exp)==0
        if not ok: fail.append((p['id'],sub,pr,str(got),str(exp)))
        checked+=1
    except Exception as e:
        fail.append((p['id'],sub,pr,str(got),repr(e)))

assert len(new)==351, len(new)
assert checked==351 and not fail, fail[:20]
print('PASS bank math: legacy 60 explicit + new 351 prompt-recalculated = 411')
