export const PYTHON_SNIPPETS: string[] = [
  `def f(x=10): return x**2 if x>0 else 0`,
  `nums = [1,2,3,4]; squares = [n*n for n in nums if n%2==0]; print(squares)`,
  `from dataclasses import dataclass; @dataclass class P: x:int; y:int; p=P(2,3);`,
  `def fib(n): a,b=0,1; out=[]; import math; while n>0: a,b=b,a+b; out.append(a); n-=1`,
  `d = {"k": "<tag>", "v": 42}; d["ok"] = True;`,
];


