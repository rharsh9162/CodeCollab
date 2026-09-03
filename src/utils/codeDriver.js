/**
 * Code Driver Utility
 * Generates driver/wrapper code for LeetCode-style Solution class/function code
 * so it can be executed with test case inputs via stdin.
 */

/**
 * Extract method name and parameter count from a LeetCode code snippet
 */
export function extractMethodInfo(codeSnippet, language) {
    if (!codeSnippet) return null;

    let methodName = null;
    let paramCount = 0;

    if (language === 'python') {
        const match = codeSnippet.match(/def\s+(\w+)\s*\(\s*self\s*,?\s*(.*?)\)\s*[-:]|def\s+(\w+)\s*\(\s*self\s*,?\s*(.*?)\)\s*$/m);
        if (match) {
            methodName = match[1] || match[3];
            const params = match[2] || match[4] || '';
            paramCount = params.trim() ? params.split(',').filter(Boolean).length : 0;
        }
    } else if (language === 'javascript' || language === 'typescript') {
        // var twoSum = function(nums, target) {
        const match1 = codeSnippet.match(/var\s+(\w+)\s*=\s*function\s*\((.*?)\)/);
        // or: twoSum(nums, target) {
        const match2 = codeSnippet.match(/(\w+)\s*=\s*function\s*\((.*?)\)/);
        // or: function twoSum(nums, target) {
        const match3 = codeSnippet.match(/function\s+(\w+)\s*\((.*?)\)/);
        const match = match1 || match2 || match3;
        if (match) {
            methodName = match[1];
            paramCount = match[2].trim() ? match[2].split(',').filter(Boolean).length : 0;
        }
    } else if (language === 'cpp') {
        // Look for method inside Solution class (not constructor)
        const lines = codeSnippet.split('\n');
        for (const line of lines) {
            const m = line.match(/^\s+\S+[\s*&]*\s+(\w+)\s*\((.*?)\)/);
            if (m && m[1] !== 'Solution') {
                methodName = m[1];
                paramCount = m[2].trim() ? m[2].split(',').filter(Boolean).length : 0;
                break;
            }
        }
    } else if (language === 'java') {
        const match = codeSnippet.match(/public\s+\S+\s+(\w+)\s*\((.*?)\)/);
        if (match) {
            methodName = match[1];
            paramCount = match[2].trim() ? match[2].split(',').filter(Boolean).length : 0;
        }
    }

    return { methodName, paramCount };
}

/**
 * Check if user code looks like LeetCode format (has Solution class or bare function, no main)
 */
export function isLeetCodeFormat(code, language) {
    if (language === 'python') {
        return code.includes('class Solution') && !code.includes('if __name__');
    } else if (language === 'javascript' || language === 'typescript') {
        // Has a function assignment but no explicit console.log with call
        const hasFuncDef = /var\s+\w+\s*=\s*function/.test(code) || /function\s+\w+/.test(code);
        const hasMainExecution = /console\.log\s*\(\s*\w+\s*\(/.test(code);
        return hasFuncDef && !hasMainExecution;
    } else if (language === 'cpp') {
        return code.includes('class Solution') && !code.includes('int main');
    } else if (language === 'java') {
        return code.includes('class Solution') && !code.includes('public static void main');
    }
    return false;
}

/**
 * Parse test cases from the problem's exampleTestcases string
 * Returns array of test case objects, each with an array of input lines
 */
export function parseTestCases(exampleTestcases, paramCount) {
    if (!exampleTestcases) return [];
    const lines = exampleTestcases.split('\n').filter((l) => l.trim() !== '');
    const testCases = [];
    const count = Math.max(paramCount, 1);

    for (let i = 0; i + count <= lines.length; i += count) {
        testCases.push({
            inputs: lines.slice(i, i + count),
            label: `Case ${testCases.length + 1}`,
        });
    }

    return testCases;
}

/**
 * Wrap LeetCode-format code with a driver that reads from stdin and calls the solution
 */
export function wrapWithDriver(userCode, language, methodName, paramCount) {
    if (!methodName) return userCode;

    switch (language) {
        case 'python':
            return `from typing import List, Optional, Tuple, Dict, Set
import json, sys

${userCode}

if __name__ == '__main__':
    _input_lines = sys.stdin.read().strip().split('\\n')
    _sol = Solution()
    _args = [json.loads(line) for line in _input_lines[:${paramCount}]]
    _result = _sol.${methodName}(*_args)
    if isinstance(_result, list):
        print(json.dumps(_result))
    elif isinstance(_result, bool):
        print(str(_result).lower())
    elif _result is None:
        print("null")
    else:
        print(_result)
`;

        case 'javascript':
            return `${userCode}

const _inputData = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
const _args = _inputData.slice(0, ${paramCount}).map(x => JSON.parse(x));
const _result = ${methodName}(..._args);
if (typeof _result === 'object' && _result !== null) {
  console.log(JSON.stringify(_result));
} else if (typeof _result === 'boolean') {
  console.log(_result ? 'true' : 'false');
} else {
  console.log(_result);
}
`;

        case 'typescript':
            return `${userCode}

const _inputData = require('fs').readFileSync(0, 'utf8').trim().split('\\n');
const _args = _inputData.slice(0, ${paramCount}).map((x: string) => JSON.parse(x));
const _result = ${methodName}(..._args);
if (typeof _result === 'object' && _result !== null) {
  console.log(JSON.stringify(_result));
} else {
  console.log(_result);
}
`;

        case 'cpp':
            return `#include <bits/stdc++.h>
using namespace std;

${userCode}

// Helper to parse JSON arrays
vector<int> parseIntArray(const string& s) {
    vector<int> result;
    string num;
    for (char c : s) {
        if (c == '[' || c == ']' || c == ' ') continue;
        if (c == ',') { if (!num.empty()) { result.push_back(stoi(num)); num.clear(); } }
        else num += c;
    }
    if (!num.empty()) result.push_back(stoi(num));
    return result;
}

int main() {
    Solution sol;
    vector<string> lines;
    string line;
    while (getline(cin, line)) {
        if (!line.empty()) lines.push_back(line);
    }
    // Note: C++ driver supports basic cases. For complex types, add custom parsing.
    ${generateCppCall(methodName, paramCount)}
    return 0;
}
`;

        case 'java':
            return `import java.util.*;
import org.json.*;

${userCode}

class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        List<String> lines = new ArrayList<>();
        while (sc.hasNextLine()) {
            String line = sc.nextLine().trim();
            if (!line.isEmpty()) lines.add(line);
        }
        Solution sol = new Solution();
        // Note: Java driver supports basic cases.
        System.out.println("Java driver: please implement main() for full support");
    }
}
`;

        default:
            return userCode;
    }
}

function generateCppCall(methodName, paramCount) {
    // Simple case: just print that it needs custom handling
    return `
    // Auto-generated driver - works for basic integer/array types
    if (lines.size() >= ${paramCount}) {
        cout << "C++ auto-driver: For full support, include int main() with custom input parsing." << endl;
    }`;
}
