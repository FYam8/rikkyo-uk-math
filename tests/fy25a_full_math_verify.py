import sympy as sp, runpy
from fractions import Fraction
x,y,a,b=sp.symbols('x y a b', real=True)
# Front 26 Q1-Q4
assert 5-(-3)+(-11)==-3
assert (-239+227)**2==144
assert 5*(-3)**2-2**2==41
assert sp.expand(6*x-3-2*x-8)==4*x-11
assert sp.expand(2*(3*x+2)+3*(x-9))==9*x-23
assert sp.simplify((5*x-y)/2+(x+2*y)/3-(17*x+y)/6)==0
assert sp.expand(8*x**2+(2*x+1)*(2*x-1))==12*x**2-1
assert sp.simplify(sp.sqrt(6)*sp.sqrt(14)*sp.sqrt(42)-42*sp.sqrt(2))==0
assert sp.simplify(sp.sqrt(20)+sp.sqrt(45)-sp.sqrt(80)-sp.sqrt(5))==0
assert sp.simplify(sp.sqrt(sp.Rational(3,7))-sp.sqrt(sp.Rational(7,3))+4*sp.sqrt(21)/21)==0
assert sp.factor(x**2-x-20)==(x-5)*(x+4)
assert sp.expand(4*a*(y-2)**2)==4*a*y**2-16*a*y+16*a
assert sp.expand((x-3)*(2*y+1))==x+2*x*y-6*y-3
assert sp.solve(sp.Eq(23*x-7,5*x+29),x)==[2]
assert sp.solve(sp.Eq(sp.Rational(3)*x/5,(x-1)/2),x)==[-5]
sol=sp.solve([sp.Eq(x+2*y,5),sp.Eq(3*x-y,1)],[x,y],dict=True)[0]; assert sol=={x:1,y:2}
sol=sp.solve([sp.Eq(3*x-2*y,9),sp.Eq(6*x-y,9)],[x,y],dict=True)[0]; assert sol=={x:1,y:-3}
assert set(sp.solve(sp.Eq(x**2,7*x),x))=={0,7}
assert set(sp.solve(sp.Eq(x**2+x+1,2*(x+3)),x))=={sp.Rational(1,2)-sp.sqrt(21)/2,sp.Rational(1,2)+sp.sqrt(21)/2}
assert sp.expand(x*y+a)==a+x*y
assert (206-6)**2==40000
assert len([n for n in range(1,12) if sp.sqrt(12-n).is_integer is True])==3
assert sp.Rational(3-2,5-0)==sp.Rational(1,5)
vals=[2*t*t for t in range(-7,3)]; assert min(vals)==0 and max(vals)==98
roots=[3+sp.sqrt(2),3-sp.sqrt(2)]; assert sp.simplify(roots[0]*roots[1])==7
assert 1-Fraction(1,36)==Fraction(35,36)
# Run the already independent Q5-Q9 verification too.
runpy.run_path(str(__import__('pathlib').Path(__file__).with_name('fy25a_remaining19_math_verify.py')),run_name='__main__')
print('PASS FY25A full 45 independent math recheck')
