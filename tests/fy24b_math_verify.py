import sympy as sp
from fractions import Fraction
x,y,t=sp.symbols('x y t', real=True)

# Q1
assert -2-(-5)==3
assert 10-5*(-3)==25
assert sp.Rational(9**2,(-3)**3)/sp.Rational(-4,3)==sp.Rational(9,4)
assert sp.simplify((10*x**3-5*x**2+10*x)/(5*x) - (2*x**2-x+2))==0
assert sp.simplify((5*x+4*y)/6-(2*x-y)/3-(x+6*y)/6)==0
assert sp.expand((3*x-2)*(3*x+2)-(2*x-1)**2)==5*x**2+4*x-5
assert sp.simplify((-x)**2-3*x**2)==-2*x**2
assert sp.simplify(2*sp.sqrt(12)+sp.sqrt(243)-4*sp.sqrt(27))==sp.sqrt(3)
assert sp.simplify(sp.sqrt(48)/(3*sp.sqrt(6)/2)*sp.sqrt(18))==8
assert sp.simplify(sp.sqrt(2)-sp.sqrt(sp.Rational(1,2)))==sp.sqrt(2)/2

# Q2/Q3
assert sp.factor(x**2-5*x-6)==(x-6)*(x+1)
assert sp.factor(x**2*sp.Symbol('y')*sp.Symbol('z')-49*sp.Symbol('y')*sp.Symbol('z'))==sp.Symbol('y')*sp.Symbol('z')*(x-7)*(x+7)
a=sp.symbols('a')
assert sp.expand((a-2)*(x-1))==sp.expand((a-2)*x+(2-a))
assert sp.solve(sp.Eq(4*(2*x-5)+16,0),x)==[sp.Rational(1,2)]
sol=sp.solve([sp.Eq(x/2-y/3,-2),sp.Eq(y,6*x-3)],[x,y], dict=True)[0]
assert sol=={x:2,y:9}
assert set(sp.solve(sp.Eq(x**2+7*x-60,0),x))=={-12,5}
assert set(sp.solve(sp.Eq(25*x**2-6,0),x))=={-sp.sqrt(6)/5,sp.sqrt(6)/5}
assert set(sp.solve(sp.Eq(3*x**2-5*x-2,0),x))=={sp.Rational(-1,3),2}

# Q4
n=sp.symbols('n')
assert sp.solve(sp.Eq((n-2)*180,1800),n)==[12]
assert sp.Rational(-4-5,3-(-3))==sp.Rational(-3,2)
pairs=[(i,j) for i in range(1,7) for j in range(1,7) if (i*j)%6==0]
assert len(pairs)==15 and sp.Rational(len(pairs),36)==sp.Rational(5,12)
assert sp.Rational(2*(-2)**2-2*(-4)**2,(-2)-(-4))==-12
assert 450*3//5-180==90
rt=sp.sqrt(2)
assert sp.expand((rt+1)**2+2*(rt+1)*(rt-1)+(rt-1)**2)==8

# Q5: source-diagram angle relations
assert 180-57-30-96 != 27  # guard against wrong triangle bookkeeping
assert 180-(180-57)-30==27
assert 2*25==50
assert 20+(90-40)==70

# Q6
# (1) altitude to hypotenuse
Y=8*sp.sqrt(3)/3
Z=64/Y
AC=sp.simplify(Y+Z)
X=sp.simplify(8*AC/16)
assert sp.simplify(X-16*sp.sqrt(3)/3)==0
assert sp.simplify(Y-8*sp.sqrt(3)/3)==0
# (2) double similarity
yy=sp.Rational(4*7,16)
xx=sp.Rational(12)*yy/4
assert yy==sp.Rational(7,4) and xx==sp.Rational(21,4)
# (3) 5-12-13 incircle
s=sp.Rational(5+12+13,2)
assert (5+12-13)/2==2 and s-12==3

# Q7
A=sp.Point(-2,4); P=sp.Point(4,16)
assert sp.Line(A,P).slope==2
q_intercept=sp.simplify(4+2*(t-2))
assert q_intercept==2*t
assert sp.solve(sp.Eq(2*t,10),t)==[5]
V=sp.Rational(1,3)*sp.pi*25*25-sp.Rational(1,3)*sp.pi*25*15
assert sp.simplify(V-250*sp.pi/3)==0

# Q8
AB=20; AE=10; AD=8; DE=9
AC=sp.Rational(AB,AE)*AD
EC=AC-AE
assert EC==6
assert sp.Rational(AE,EC)==sp.Rational(5,3)
assert sp.Rational(25,9)==sp.Rational(5,3)**2
BC=2*DE
CG=sp.Rational(AD)*3/5
FC=sp.solve(sp.Eq((BC+sp.Symbol('f'))/sp.Symbol('f'), sp.Rational(5,2)),sp.Symbol('f'))[0]
assert FC==12 and CG==sp.Rational(24,5)

# Q9
assert 2*sp.pi*3**2+2*sp.pi*3*4==42*sp.pi
assert sp.Rational(6**2,2)==18
side=3*sp.sqrt(2)
slant=sp.sqrt(4**2+(side/2)**2)
surface=18+4*sp.Rational(1,2)*side*slant
assert sp.simplify(surface-(18+6*sp.sqrt(41)))==0

print("PASS FY24B independent math recheck")
