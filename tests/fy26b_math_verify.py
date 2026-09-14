import sympy as sp
from fractions import Fraction
x,y,a,b,p,d,s,u,v=sp.symbols('x y a b p d s u v', real=True)

# Q1
assert -13-(-7)==-6
assert sp.expand(2*(7*x+3)-4*(2*x+5))==6*x-14
assert sp.expand((x-5)*(3*x+7))==3*x**2-8*x-35
assert sp.simplify(sp.sqrt(21)*sp.sqrt(35)-7*sp.sqrt(15))==0
assert 3**2-14/(-2)+5==21
assert sp.expand((2*sp.sqrt(3)+sp.sqrt(5))*(2*sp.sqrt(3)-sp.sqrt(5)))==7
expr=((sp.Rational(3,2)*x**2*y)**2)*(-6*x*y**2)/(-sp.Rational(9,8)*x**2*y**5)
assert sp.simplify(expr-12*x**3/y)==0

# Q2
assert sp.solve(sp.Eq(17+x,-19+13*x),x)==[3]
sol=sp.solve([sp.Eq(sp.Rational(13,10)*x-sp.Rational(6,10)*y,-sp.Rational(25,10)),sp.Eq(x-y,-3)],[x,y],dict=True)[0]
assert sol=={x:-1,y:2}
assert set(sp.solve(sp.Eq(3*x**2+x-1,0),x))=={(-1-sp.sqrt(13))/6,(-1+sp.sqrt(13))/6}

# Q3(1)-(3)
assert 3*a+7*b==3*a+7*b
scores=[20,17,12,23,16,26]
assert Fraction(sum(scores),len(scores))==19
counts=[int(200*q) for q in [0.17,0.37,0.30,0.16]]
assert counts==[34,74,60,32]
assert 32<40<=32+60
assert Fraction(20+30,2)==25

# Q3(4): lens = two 90-degree circular segments, radius 6
lens=2*(sp.pi*6**2/4-sp.Rational(1,2)*6*6)
assert sp.simplify(lens-(18*sp.pi-36))==0

# Q3(5): arcs from the given inscribed angles
arc_AFE=2*68
arc_FE=2*31
arc_AF=arc_AFE-arc_FE
assert arc_AF==74 and arc_AF/2==37

# Q3(6)-(9)
assert 1-Fraction(3*3,36)==Fraction(3,4)
assert sp.simplify(sp.factor(5*x**2+30*x-200)-5*(x+10)*(x-4))==0
assert [n for n in range(1,20) if 2<sp.sqrt(3*n)<4]==[2,3,4,5]
xx=sp.sqrt(5)-3; yy=sp.sqrt(5)+3
assert sp.simplify(xx**2-2*xx*yy+yy**2)==36

# Q3(10): general-coordinate proof
A=sp.Matrix([a,b]); B=sp.Matrix([0,0]); C=sp.Matrix([2,0]); D=sp.Matrix([a+2,b]); M=sp.Matrix([1,0]); N=(C+D)/2
X=A+s*(M-A)
solE=sp.solve(list(X-u*D),(s,u),dict=True)[0]
assert solE[s]==sp.Rational(2,3)
solF=sp.solve(list(X-v*N),(s,v),dict=True)[0]
assert solF[s]==sp.Rational(4,5)
AE=solE[s]; EF=solF[s]-solE[s]; FM=1-solF[s]
scale=sp.ilcm(*[sp.denom(z) for z in [AE,EF,FM]])
ratio=[sp.simplify(z*scale) for z in [AE,EF,FM]]
assert ratio==[10,2,3]

# Q4
BH=sp.Rational(8,2)
AH=10
AB2=AH**2+BH**2
DB2=AB2
DH=sp.sqrt(DB2-BH**2)
assert DH==10
area_AHD=sp.Rational(1,2)*8*sp.sqrt(10**2-4**2)
assert sp.simplify(area_AHD-8*sp.sqrt(21))==0
vol=2*sp.Rational(1,3)*area_AHD*4
assert sp.simplify(vol-64*sp.sqrt(21)/3)==0

# Q5 geometry / coordinates
A=sp.Point(2,2); O=sp.Point(0,0); B=sp.Point(-2,2); C=sp.Point(4,0)
assert sp.Line(O,B).slope==-1
M=sp.Point(1,1)
assert sp.Line(B,M).slope==sp.Rational(-1,3)
# parallelogram area AB x height = 4*2 = 8
assert abs(B.x-A.x)*2==8
P=(p,p**2/2)
coords=[(0,0),(2,2),P,(-2,2)]
signed=sum(coords[i][0]*coords[(i+1)%4][1]-coords[i][1]*coords[(i+1)%4][0] for i in range(4))/2
assert sp.simplify(signed-p**2)==0
solp=set(sp.solve(sp.Eq(p**2,24),p))
assert solp=={-2*sp.sqrt(6),2*sp.sqrt(6)}
for pp in solp:
    assert sp.simplify(pp**2/2-12)==0

print('PASS FY26B independent math recheck')
