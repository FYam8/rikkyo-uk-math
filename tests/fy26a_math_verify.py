import sympy as sp
from fractions import Fraction

x,y,d=sp.symbols('x y d', real=True)

# Q1
assert 37-(-24)==61
assert sp.expand(3*(2*x-5)+2*(-7*x+2))==-8*x-11
assert sp.expand((x-3)*(2*x+5))==2*x**2-x-15
assert sp.sqrt(75)*sp.sqrt(12)==30
assert 20-(5**2-7)/(-3)==26
assert sp.simplify((sp.sqrt(2)+1)**2-sp.sqrt(98)-(3-5*sp.sqrt(2)))==0
a,b=sp.symbols('a b', nonzero=True)
expr=((-sp.Rational(2,3)*a**3*b)**2)*(-sp.Rational(1,2)*a*b**2)/(sp.Rational(1,9)*a**6*b**5)
assert sp.simplify(expr+2*a/b)==0

# Q2
assert sp.solve(sp.Eq(32+14*x,10*x+12),x)==[-5]
sol=sp.solve([sp.Eq(3*(x+y),2*x-1),sp.Eq(2*x-y,12)],[x,y], dict=True)[0]
assert sol=={x:5,y:-2}
assert set(sp.solve(sp.Eq(x**2-4*x-2,0),x))=={2-sp.sqrt(6),2+sp.sqrt(6)}

# Q3
assert 500-70*3==290
assert Fraction((43+48+38+40+34),5)==Fraction(203,5)
assert int(400*(0.04+0.20))==96
assert sp.simplify(sp.pi*5**2/2-(sp.pi*2**2/2+sp.pi*3**2/2)-6*sp.pi)==0
assert 360-258==102 and 102-54==48
assert Fraction(6+6-1,36)==Fraction(11,36)
m=sp.symbols('m')
assert sp.factor(-2*m*y**2-8*m*y-8*m)==-2*m*(y+2)**2
assert [n for n in range(1,50) if 2.5<sp.sqrt(n)<3.5]==[7,8,9,10,11,12]
xx=sp.sqrt(5)+1; yy=sp.sqrt(5)-1
assert sp.simplify(xx**2+2*xx*yy+yy**2-20)==0
phi=(1+sp.sqrt(5))/2
assert sp.simplify(phi**2-phi-1)==0
assert sp.simplify(2/phi-(sp.sqrt(5)-1))==0

# Q4
AG=sp.sqrt(6**2+8**2+(2*sp.sqrt(11))**2)
assert AG==12
AF=sp.sqrt(6**2+8**2)
FP=sp.simplify(AF*(2*sp.sqrt(11))/AG)
assert sp.simplify(FP-5*sp.sqrt(11)/3)==0

# Q5
A=sp.Point(-3,-9);B=sp.Point(4,-16)
assert sp.Line(A,B).slope==-1
assert sp.Line(A,B).equation().subs({x:0,y:-12})==0
C=sp.Point(1,-1)
area=lambda P,Q,R: sp.Abs(sp.det(sp.Matrix([[P.x,P.y,1],[Q.x,Q.y,1],[R.x,R.y,1]])))/2
assert area(A,B,C)==42
C2=sp.Point(2,-4)
assert area(A,B,C2)==35
D=sp.Point(d,-d**2)
signed=sp.factor(sp.det(sp.Matrix([[A.x,A.y,1],[B.x,B.y,1],[D.x,D.y,1]]))/2)
assert sp.simplify(signed+sp.Rational(7,2)*(d-4)*(d+3))==0
eq=sp.expand((4-d)*(d+3)-10)
assert sp.simplify(eq+(d-2)*(d+1))==0
assert set(sp.solve(sp.Eq(eq,0),d))=={-1,2}

print("PASS FY26A independent math recheck")
