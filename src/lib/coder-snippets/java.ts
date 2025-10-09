export const JAVA_SNIPPETS: string[] = [
  `import java.util.*; class Main{ static int add(int a,int b){ return a+b; } }`,
  `List<String> xs = new ArrayList<>(); if(xs.size()==0) xs.add("ok"); System.out.println(xs);`,
  `record P(int x,int y){} P p = new P(2,3);`,
  `Map<String,Integer> m = new HashMap<>(); m.put("k",42);`,
  `var sum = Arrays.stream(new int[]{1,2,3}).reduce(0,(a,b)->a+b);`,
];


