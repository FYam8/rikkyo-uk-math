import sympy as sp
from fractions import Fraction
x,y,b,t=sp.symbols('x y b t', real=True)

# Q1
assert -27+15-(-3)==-9
assert (-1+(-2))**3==-27
assert 6-(-12)*(-3)==-30
assert sp.simplify(2*x/6*(3*x)**2-3*x**3)==0
assert sp.expand(5*x+y-3*y+x)==6*x-2*y
assert sp.simplify((x+2*y)/2-(2*x-y)/5-(x+12*y)/10)==0
assert sp.expand((x+1)*(4*x-1)-(2*x+1)**2)==-x-2
assert sp.simplify(sp.sqrt(45)-sp.sqrt(48)+sp.sqrt(80)-(7*sp.sqrt(5)-4*sp.sqrt(3)))==0
assert sp.simplify((sp.sqrt(7)/sp.sqrt(5))/(1/sp.sqrt(125))-5*sp.sqrt(7))==0
assert sp.simplify((4*sp.sqrt(3)+sp.sqrt(12))/sp.sqrt(6)-3*sp.sqrt(2))==0

# Q2
assert sp.factor(x**2+8*x-20)==(x+10)*(x-2)
z=sp.symbols('z')
assert sp.factor((2*x-1)*y+(1-2*x)*z)==(2*x-1)*(y-z)
assert sp.factor(x**2+y**2+2*x*y+x*z+y*z)==(x+y)*(x+y+z)

# Q3
assert sp.solve(sp.Eq(2*x-35,-11*x+17),x)==[4]
sol=sp.solve([sp.Eq(3*x+4*y,3),sp.Eq(x+3*y,6)],[x,y],dict=True)[0]
assert sol=={x:-3,y:3}
assert sp.solve(sp.Eq(x/4,(5*x-2)/16),x)==[2]
assert set(sp.solve(sp.Eq(5*x**2-4*x-1,0),x))=={sp.Integer(1),sp.Rational(-1,5)}
roots=set(sp.solve(sp.Eq(2*x*(x-4),-2*x-3),x))
assert roots=={(3+sp.sqrt(3))/2,(3-sp.sqrt(3))/2}

# Q4
assert sp.Rational(360,15)==24
assert sp.Rational(-2-23,0-(-5))==-5
assert sp.Rational(2*2,36)==sp.Rational(1,9)
vals=[-sp.Rational(3,4)*u*u for u in (-4,0,2)]
assert min(vals)==-12 and max(vals)==0
l,r=sp.symbols('l r')
assert sp.simplify(sp.solve(sp.Eq(l,4*sp.pi*r+2*r),r)[0]-l/(4*sp.pi+2))==0
assert sp.sqrt(sp.Rational(27*12,4))==9
for n in range(1,12):
    v=sp.sqrt(sp.Rational(27*n,4))
    assert not bool(v.is_integer)

# Q5 arithmetic/geometry consequences from source conditions
# (1) isosceles ABE + parallelogram + triangle CDE
assert sp.Rational(180-110,2)==35
assert 180-110==70
assert 180-70-16==94
assert (180-35)-94==51
# (2) vertex 30, equal sides, parallel lines
base=sp.Rational(180-30,2)
assert base==75
assert 180-(42+30)-base==33
# (3) radius/parallel construction
alpha=sp.Rational(64,2)
assert alpha==32
assert 180-alpha-64==84

# Q6
# (1)
BE=sp.sqrt(14**2-7**2)
assert sp.simplify(BE-7*sp.sqrt(3))==0
area=10*7
assert sp.Rational(area,2)==35
assert sp.solve(sp.Eq(sp.Rational(1,2)*14*y,35),y)==[5]
# (2) 6-8-10 triangle and angle bisector
AC,BC,AB=6,8,10
CP=sp.Rational(BC*AC,AC+AB)
PB=BC-CP
assert CP==3 and PB==5
C=sp.Point(sp.Rational(18,5),sp.Rational(24,5))
P=sp.Point(6,3)
assert C.distance(sp.Point(0,0))==6
assert C.distance(sp.Point(10,0))==8
AP=P.distance(sp.Point(0,0))
assert AP==3*sp.sqrt(5)
PD=sp.simplify(CP*PB/AP)
assert PD==sp.sqrt(5)
# (3) midpoint/trisection chain
xx=sp.symbols('xx', positive=True)
assert sp.solve(sp.Eq(2*xx,12+xx/2),xx)==[8]
assert 2*8==16

# Q7
assert sp.solve(sp.Eq(sp.Symbol('a'),sp.Symbol('a')**2/4),sp.Symbol('a'))==[0,4]
A=sp.Point(-4,4); O=sp.Point(0,0); Cpt=sp.Point(2,1)
areaAOC=abs(sp.det(sp.Matrix([[-4,4],[2,1]])))/2
assert areaAOC==6
bx=-2-2*sp.sqrt(5)
Dx=-2-bx
assert sp.simplify(Dx**2/4-5)==0 and bx<0

# Q8
L=sp.solve(sp.Eq(2*sp.pi*sp.Symbol('L'),4*sp.pi+6*sp.pi),sp.Symbol('L'))[0]
assert L==5
assert 360*sp.Rational(6,10)==216
assert sp.sqrt(5**2-2**2)>sp.sqrt(5**2-3**2)
assert sp.sqrt(5**2-3**2)==4

# Q9
assert sp.sqrt(8**2+8**2)==8*sp.sqrt(2)
# coordinates A=(0,0,8), B=(8,0,8), H=(0,8,0), G=(8,8,0), M midpoint GH=(4,8,0)
A3=sp.Matrix([0,0,8]); M3=sp.Matrix([4,8,0])
AM=sp.sqrt(sum(v**2 for v in (M3-A3)))
assert AM==12
height_to_AB=sp.sqrt(8**2+8**2)
assert sp.solve(sp.Eq(sp.Rational(1,2)*t*height_to_AB,12*sp.sqrt(2)),t)==[3]
h=sp.solve(sp.Eq(sp.Rational(1,2)*AM*sp.Symbol('h'),12*sp.sqrt(2)),sp.Symbol('h'))[0]
assert h==2*sp.sqrt(2)

print('PASS FY25B independent math recheck')
