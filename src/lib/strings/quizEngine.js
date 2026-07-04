export const quizEngine = {
  questionNotFound: '题目不存在',
  noAnswerGiven: '未作答',
  answerFeedback: (given, expected) => `你的答案: ${given}。正确答案: ${expected}。`,
  noExplanation: '暂无解析',
  solutionPathPrefix: (path) => `参考答案路径: ${path}\n\n`,
}
