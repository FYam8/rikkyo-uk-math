import sympy as sp
from fractions import Fraction
# Q5
assert 20+(90-40)==70
assert 180-73-(180-34-85)==46
assert (720-(120+140+100+160))//2==100
assert (180-(180-(180-2*37)))//2==53
assert (2*50-2*29)//2==21
# Q6
assert sp.Rational(3*7,5)==sp.Rational(21,5)
assert sp.sqrt(7**2+sp.sqrt(5)**2)==3*sp.sqrt(6)
assert sp.Rational(6*15,9)==10
assert sp.simplify(12*sp.sqrt(3)/2/sp.sqrt(2)-3*sp.sqrt(6))==0
# Q7
r=6;h=12
assert 2*sp.pi*r*h==144*sp.pi
assert 4*sp.pi*r*r==144*sp.pi
assert sp.simplify((sp.Rational(4,3)*sp.pi*r**3)/(sp.pi*r*r*h)-sp.Rational(2,3))==0
# Q8
assert sp.Rational(1,2)*sp.pi*3**2==sp.Rational(9,2)*sp.pi
assert sp.pi*6**2/4-sp.pi*3**2/2==sp.Rational(9,2)*sp.pi
assert 6+sp.pi*6/2+sp.pi*3==6+6*sp.pi
# Q9
d=sp.symbols('d', real=True)
A=(-3,sp.Rational(9,2));B=(1,sp.Rational(1,2))
assert sp.Rational(B[1]-A[1],B[0]-A[0])==-1
assert sp.Abs(A[0]*B[1]-A[1]*B[0])/2==3
signed=sp.factor(sp.det(sp.Matrix([[A[0],A[1],1],[d,d**2/2,1],[B[0],B[1],1]]))/2)
assert sp.simplify(signed + (d-1)*(d+3))==0
assert sp.solve(sp.Eq(-(d-1)*(d+3),3),d)==[-2,0]
left=sp.pi*3/3*(sp.Rational(9,2)**2+sp.Rational(9,2)*sp.Rational(3,2)+sp.Rational(3,2)**2)-sp.pi*3/3*sp.Rational(9,2)**2
right=sp.pi/3*(sp.Rational(3,2)**2+sp.Rational(3,2)*sp.Rational(1,2)+sp.Rational(1,2)**2)-sp.pi/3*sp.Rational(1,2)**2
assert sp.simplify(left+right-10*sp.pi)==0
print("PASS FY25A remaining19 independent math")
