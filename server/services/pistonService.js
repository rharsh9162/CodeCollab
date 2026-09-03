import axios from 'axios';

// Judge0 Community Edition Client (Reliable, fast, unmetered public API)
const judge0Client = axios.create({
    baseURL: 'https://ce.judge0.com',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const JUDGE0_LANG_MAP = {
    python: 100,    // Python (3.12.5) - Supports PEP 585 generics (list[int], list[list[int]], etc.)
    javascript: 93, // JavaScript (Node.js 18.15.0)
    typescript: 94, // TypeScript (5.0.3)
    cpp: 54,        // C++ (GCC 9.2.0)
    c: 50,          // C (GCC 9.2.0)
    java: 91,       // Java (JDK 17.0.6)
    csharp: 51,     // C# (Mono 6.6.0.161)
    go: 60,         // Go (1.13.5)
    rust: 73,       // Rust (1.40.0)
    ruby: 72,       // Ruby (2.7.0)
    swift: 83,      // Swift (5.2.3)
    kotlin: 78,     // Kotlin (1.3.70)
};

/**
 * Execute code safely via Judge0 CE API with automatic error parsing
 */
export async function executeCode(code, language, stdin = '') {
    const langId = JUDGE0_LANG_MAP[language];
    if (!langId) {
        throw new Error(`Unsupported programming language: ${language}`);
    }

    try {
        const response = await judge0Client.post('/submissions?base64_encoded=false&wait=true', {
            source_code: code,
            language_id: langId,
            stdin: stdin || '',
        });

        const data = response.data;
        const stderr = data.compile_output || data.stderr || '';
        const output = data.stdout || '';

        return {
            output: output,
            stderr: stderr,
            code: data.status?.id === 3 ? 0 : 1,
            signal: null,
            language,
            time: data.time,
            memory: data.memory,
            status: data.status?.description || 'Executed',
        };
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            throw new Error('Code execution timed out (limit: 15s).');
        }
        if (err.response?.data?.message) {
            throw new Error(err.response.data.message);
        }
        throw err;
    }
}
