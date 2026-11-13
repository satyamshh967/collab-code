// Starter code seeded into a brand-new room document. Seeding happens once on
// the server so two clients joining an empty room at the same moment can't both
// insert it (which used to duplicate the snippet).
export const DEFAULT_SNIPPETS = {
  javascript: 'console.log("Hello World!");\n',
  typescript: 'const greeting: string = "Hello World!";\nconsole.log(greeting);\n',
  python: 'print("Hello World!")\n',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello World!");\n  }\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello World!" << std::endl;\n  return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello World!")\n}\n',
  rust: 'fn main() {\n  println!("Hello World!");\n}\n'
};

export const getDefaultSnippet = (language) => DEFAULT_SNIPPETS[language] || DEFAULT_SNIPPETS.javascript;
