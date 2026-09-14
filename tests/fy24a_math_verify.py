import sympy as sp
from fractions import Fraction
x,y,u,v=sp.symbols('x y u v', real=True)
# Q1
assert (-2-(-1))**3==-1
assert -3-((-13)*(-2))==-29
assert sp.Rational(24,(-2)**3)/sp.Rational(-6,5)==sp.Rational(5,2)
assert sp.simplify(3*x**2/(6*x)*2-x)==0
assert sp.simplify((2*x+y)/2-(x-3*y)/3-(4*x+9*y)/6)==0
assert sp.expand((-2*x+3)*(2*x+3)+(x+3)*(4*x-3))==9*x
assert sp.simplify((-(x**2)**3)/(x**3)**2 + x*(1+1/x)-x)==0
assert sp.simplify(sp.sqrt(48)-sp.sqrt(75)+sp.sqrt(12)-sp.sqrt(3))==0
assert sp.simplify(sp.sqrt(12)*5/sp.sqrt(6)/(1/(5*sp.sqrt(2)))-50)==0
assert sp.simplify((sp.sqrt(80)+sp.sqrt(5))/sp.sqrt(40)-5*sp.sqrt(2)/4)==0
# Q2/Q3
assert sp.factor(x**2+6*x-27)==(x-3)*(x+9)
assert sp.expand((x+2*y-2)*(x+2*y+2))==x**2+4*x*y+4*y**2-4
assert sp.expand(-2*x*(y-2)*(y+1))==-2*x*y**2+2*x*y+4*x
assert sp.solve(sp.Eq(-12*x+11,-11*x+17),x)==[-6]
sol=sp.solve([sp.Eq(y,-3*x-2),sp.Eq(-3*x+5*y,8)],[x,y],dict=True)[0]; assert sol=={x:-1,y:1}
assert set(sp.solve(sp.Eq(x**2+2*x,3),x))=={-3,1}
assert set(sp.solve(sp.Eq(4*x**2-2*x-1,0),x))=={sp.Rational(1,4)-sp.sqrt(5)/4,sp.Rational(1,4)+sp.sqrt(5)/4}
assert sp.solve(sp.Eq(4*x,22*x-50),x)==[sp.Rational(25,9)]
# Q4
assert sp.Rational((12-2)*180,12)==150
assert sp.Rational(-6-6,3-(-1))==-3
pairs=[(a,b) for a in range(1,7) for b in range(1,7) if a*b>=7]; assert len(pairs)==22 and Fraction(22,36)==Fraction(11,18)
assert min([sp.Rational(t*t,3) for t in range(-4,10)])==0 and max([sp.Rational(t*t,3) for t in range(-4,10)])==27
b=sp.symbols('b'); assert sp.solve(sp.Eq(b,(3-sp.Symbol('a'))/3),sp.Symbol('a'))==[3-3*b]
ns=[n for n in range(1,100) if sp.sqrt(sp.Rational(72*n,5)).is_integer is True]; assert ns[0]==10
# Q5 arithmetic/coordinate checks
assert 180-111-47==22  # equivalent angle chase from source slopes
assert 90-(180-140)//2==70
# Q5(3): coordinate construction AB=BC=AD=1, B=(0,0),A=(0,1),C=(1,0), D at -60deg from +x
A=sp.Point(0,1);B=sp.Point(0,0);C=sp.Point(1,0);D=sp.Point(sp.Rational(1,2),1-sp.sqrt(3)/2)
vec1=sp.Matrix([B.x-C.x,B.y-C.y]);vec2=sp.Matrix([D.x-C.x,D.y-C.y])
cosang=sp.simplify((vec1.dot(vec2))/(sp.sqrt(vec1.dot(vec1))*sp.sqrt(vec2.dot(vec2))))
assert sp.simplify(cosang-sp.cos(sp.pi/12))==0  # 15 degrees
# Q6
assert sp.sqrt(17**2-15**2)==8 and Fraction(8+15-17,2)==3
z=sp.symbols('z', positive=True); sols=sp.solve(sp.Eq((z+5)/6,6/z),z); assert 4 in sols
assert sp.Rational(5)*sp.Rational(3,2)==sp.Rational(15,2)
assert 8/2==4 and 8-4/2==6
# Q7
coef=sp.Rational(18,6**2); assert coef==sp.Rational(1,2)
assert sp.solve(sp.Eq(x**2/2,72),x)==[-12,12]
assert sp.Rational((6**2)/2-(2**2)/2,4)==4
# Q8 general-coordinate verification
u,v=sp.symbols('u v', nonzero=True)
A=sp.Point(u,v);B=sp.Point(0,0);C=sp.Point(3,0);D=sp.Point(u+3,v)
E=sp.Point(u/2,v/2);F=sp.Point(2,0);G=sp.Point(3+3*u/4,3*v/4)
H=sp.Line(C,E).intersection(sp.Line(F,G))[0]
Q=sp.Line(A,H).intersection(sp.Line(B,C))[0]
# ratios along same lines via parameter values
assert sp.simplify(E.distance(A)/ (D.distance(G)) - 2)==0
# EP:FC using line through E parallel BC
P=sp.Line(E,E+sp.Point(1,0)).intersection(sp.Line(F,G))[0]
assert sp.simplify(P.distance(E)/F.distance(C)-sp.Rational(8,3))==0
# AH:HQ =19:3 (squared ratio to avoid abs symbolic issues)
AH2=sp.simplify(A.distance(H)**2); HQ2=sp.simplify(H.distance(Q)**2); assert sp.simplify(AH2/HQ2-sp.Rational(19**2,3**2))==0
# Q9
L=sp.symbols('L',positive=True); assert sp.solve(sp.Eq(L-sp.Rational(3,5)*L,12),L)==[30]
assert sp.pi*5*30+sp.pi*5**2==175*sp.pi
assert sp.simplify((2*sp.pi*5)/30-sp.pi/3)==0 and sp.simplify(2*sp.pi/(sp.pi/3)-6)==0
print('PASS FY24A independent math recheck')
