const LANGUAGE_LABELS = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  html: 'HTML/CSS',
}

const CODING_TEMPLATES = {
  python: `# Read input from stdin and print output to stdout.
def solve():
    value = input().strip()
    print(value)

if __name__ == "__main__":
    solve()
`,
  javascript: `function solve() {
  const value = readline().trim()
  console.log(value)
}

solve()
`,
  java: `import java.io.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        String value = reader.readLine();
        System.out.println(value == null ? "" : value.trim());
    }
}
`,
  c: `#include <stdio.h>

int main(void) {
    char value[4096];
    if (fgets(value, sizeof(value), stdin) != NULL) {
        printf("%s", value);
    }
    return 0;
}
`,
  cpp: `#include <iostream>
#include <string>

int main() {
    std::string value;
    std::getline(std::cin, value);
    std::cout << value;
    return 0;
}
`,
  html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Preview</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        padding: 16px;
        background: #f8fafc;
      }
      .card {
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        background: white;
        padding: 16px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Hello Testify</h1>
      <p>Edit this HTML/CSS and use preview to verify output.</p>
    </div>
  </body>
</html>
`,
}

const DSA_TEMPLATES = {
  python: `def solve():
    n = int(input().strip())
    nums = list(map(int, input().split()))

    # TODO: implement your logic
    print(sum(nums))

if __name__ == "__main__":
    solve()
`,
  javascript: `function solve() {
  const n = Number(readline().trim())
  const nums = readline().trim().split(/\\s+/).map(Number)

  // TODO: implement your logic
  const answer = nums.reduce((acc, item) => acc + item, 0)
  console.log(answer)
}

solve()
`,
  java: `import java.io.*;
import java.util.*;

public class Solution {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(reader.readLine().trim());
        String[] parts = reader.readLine().trim().split("\\\\s+");

        int sum = 0;
        for (int i = 0; i < Math.min(n, parts.length); i++) {
            sum += Integer.parseInt(parts[i]);
        }

        // TODO: implement your logic
        System.out.println(sum);
    }
}
`,
  c: `#include <stdio.h>

int main(void) {
    int n = 0;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    int sum = 0;
    for (int i = 0; i < n; i++) {
        int value = 0;
        scanf("%d", &value);
        sum += value;
    }

    // TODO: implement your logic
    printf("%d\n", sum);
    return 0;
}
`,
  cpp: `#include <iostream>

int main() {
    int n = 0;
    std::cin >> n;

    long long sum = 0;
    for (int i = 0; i < n; i++) {
        long long value = 0;
        std::cin >> value;
        sum += value;
    }

    // TODO: implement your logic
    std::cout << sum << "\\n";
    return 0;
}
`,
}

export function getStarterTemplate(language, questionType = 'coding') {
  const normalizedLanguage = String(language || 'python').toLowerCase()
  const normalizedType = String(questionType || 'coding').toLowerCase()

  if (normalizedType === 'dsa') {
    return DSA_TEMPLATES[normalizedLanguage] || DSA_TEMPLATES.python
  }

  return CODING_TEMPLATES[normalizedLanguage] || CODING_TEMPLATES.python
}

export function getLanguageLabel(language) {
  return LANGUAGE_LABELS[String(language || '').toLowerCase()] || String(language || 'Unknown')
}

export const CODING_LANGUAGE_OPTIONS = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'html', label: 'HTML/CSS' },
]

export const DSA_LANGUAGE_OPTIONS = CODING_LANGUAGE_OPTIONS.filter((option) => option.value !== 'html')
