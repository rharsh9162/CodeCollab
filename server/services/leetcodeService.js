import axios from 'axios';

// In-memory problem cache to prevent redundant GraphQL requests and LeetCode rate-limiting
const problemCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

const leetcodeClient = axios.create({
    baseURL: 'https://leetcode.com/graphql',
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
});

const QUESTION_DETAIL_QUERY = `
query getQuestionDetail($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    questionId
    title
    titleSlug
    content
    difficulty
    likes
    dislikes
    categoryTitle
    topicTags {
      name
      slug
    }
    codeSnippets {
      lang
      langSlug
      code
    }
    sampleTestCase
    exampleTestcases
    hints
    stats
    acRate
  }
}
`;

const PROBLEM_SEARCH_QUERY = `
query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
  problemsetQuestionList: questionList(
    categorySlug: $categorySlug
    limit: $limit
    skip: $skip
    filters: $filters
  ) {
    total: totalNum
    questions: data {
      questionId
      title
      titleSlug
      difficulty
      acRate
      topicTags {
        name
      }
    }
  }
}
`;

/**
 * Fetch detailed problem metadata from LeetCode GraphQL with caching
 */
export async function fetchProblemDetail(titleSlug) {
    const slug = titleSlug.trim().toLowerCase();
    
    // Check cache
    const cached = problemCache.get(slug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
    }

    try {
        const response = await leetcodeClient.post('', {
            query: QUESTION_DETAIL_QUERY,
            variables: { titleSlug: slug },
        });

        const data = response.data;
        if (data.errors && data.errors.length > 0) {
            throw new Error(data.errors[0].message || 'LeetCode GraphQL error');
        }

        const question = data.data?.question;
        if (!question) {
            throw new Error('Problem not found');
        }

        // Cache response
        problemCache.set(slug, {
            timestamp: Date.now(),
            data: question,
        });

        return question;
    } catch (err) {
        if (err.response) {
            throw new Error(`LeetCode API error: ${err.response.status} ${err.response.statusText}`);
        }
        throw err;
    }
}

/**
 * Search problems on LeetCode with keyword filter
 */
export async function searchProblems(keyword, limit = 10) {
    try {
        const response = await leetcodeClient.post('', {
            query: PROBLEM_SEARCH_QUERY,
            variables: {
                categorySlug: '',
                skip: 0,
                limit,
                filters: { searchKeywords: keyword.trim() },
            },
        });

        const data = response.data;
        if (data.errors && data.errors.length > 0) {
            throw new Error(data.errors[0].message || 'LeetCode Search error');
        }

        return data.data?.problemsetQuestionList?.questions || [];
    } catch (err) {
        if (err.response) {
            throw new Error(`LeetCode Search error: ${err.response.status} ${err.response.statusText}`);
        }
        throw err;
    }
}
