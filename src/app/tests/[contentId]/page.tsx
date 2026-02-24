'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/styles/tests.module.css';

// Sample test questions - in a real app, these would come from an API
const testQuestions: Record<string, Array<{
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}>> = {
  'Content 1': [
    {
      id: 1,
      question: 'What is the primary purpose of this learning module?',
      options: ['To test your knowledge', 'To introduce new concepts', 'To review previous material', 'To practice skills'],
      correctAnswer: 1,
    },
    {
      id: 2,
      question: 'Which of the following is a key learning objective?',
      options: ['Memorization', 'Understanding concepts', 'Speed reading', 'Note taking'],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'What should you do after completing this test?',
      options: ['Skip to next module', 'Review your answers', 'Take a break', 'Start over'],
      correctAnswer: 1,
    },
  ],
  'Content 2': [
    {
      id: 1,
      question: 'What is the main topic covered in Content 2?',
      options: ['Advanced concepts', 'Basic principles', 'Practical applications', 'Theoretical foundations'],
      correctAnswer: 2,
    },
    {
      id: 2,
      question: 'How many key points are discussed?',
      options: ['Three', 'Four', 'Five', 'Six'],
      correctAnswer: 0,
    },
    {
      id: 3,
      question: 'Which skill is most important for this content?',
      options: ['Analysis', 'Memorization', 'Creativity', 'Speed'],
      correctAnswer: 0,
    },
  ],
  'Content 3': [
    {
      id: 1,
      question: 'What makes Content 3 unique?',
      options: ['Interactive elements', 'Video content', 'Hands-on practice', 'All of the above'],
      correctAnswer: 3,
    },
    {
      id: 2,
      question: 'What is the recommended study time?',
      options: ['15 minutes', '30 minutes', '45 minutes', '60 minutes'],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'Which assessment method is used?',
      options: ['Multiple choice', 'Essay', 'Practical', 'Mixed'],
      correctAnswer: 3,
    },
  ],
  'Content 4': [
    {
      id: 1,
      question: 'What is the difficulty level of Content 4?',
      options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
      correctAnswer: 2,
    },
    {
      id: 2,
      question: 'How many modules are included?',
      options: ['2', '3', '4', '5'],
      correctAnswer: 2,
    },
    {
      id: 3,
      question: 'What is the primary learning outcome?',
      options: ['Knowledge retention', 'Skill development', 'Concept mastery', 'All of the above'],
      correctAnswer: 3,
    },
  ],
  'Content 5': [
    {
      id: 1,
      question: 'What is the final content module about?',
      options: ['Review', 'Advanced topics', 'Integration', 'Assessment'],
      correctAnswer: 2,
    },
    {
      id: 2,
      question: 'What percentage of completion is required?',
      options: ['70%', '80%', '90%', '100%'],
      correctAnswer: 1,
    },
    {
      id: 3,
      question: 'What comes after completing Content 5?',
      options: ['Certificate', 'Next level', 'Review session', 'All of the above'],
      correctAnswer: 3,
    },
  ],
};

export default function TestsPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.contentId as string;
  // Convert "content-1" to "Content 1", "content-2" to "Content 2", etc.
  const contentName = contentId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  // Get questions for this content, fallback to Content 1 if not found
  const questions = testQuestions[contentName] || testQuestions['Content 1'];

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResults) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate score
      const correct = questions.reduce((acc, q, idx) => {
        return acc + (selectedAnswers[idx] === q.correctAnswer ? 1 : 0);
      }, 0);
      setScore(correct);
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setScore(0);
  };

  const isAnswered = selectedAnswers[currentQuestion] !== undefined;
  const isCorrect = showResults && selectedAnswers[currentQuestion] === questions[currentQuestion].correctAnswer;

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.topHeader}>
        <div className={styles.headerLeft}>
          <Link href="/page4" className={styles.backButton}>
            ← Back to Courses
          </Link>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.progressInfo}>
            Question {currentQuestion + 1} of {questions.length}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {!showResults ? (
          <>
            <div className={styles.testHeader}>
              <h1 className={styles.testTitle}>{contentName} - Learning Test</h1>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className={styles.questionCard}>
              <div className={styles.questionNumber}>
                Question {currentQuestion + 1}
              </div>
              <h2 className={styles.questionText}>
                {questions[currentQuestion].question}
              </h2>

              <div className={styles.optionsList}>
                {questions[currentQuestion].options.map((option, index) => {
                  const isSelected = selectedAnswers[currentQuestion] === index;
                  const showCorrect = showResults && index === questions[currentQuestion].correctAnswer;
                  const showIncorrect = showResults && isSelected && index !== questions[currentQuestion].correctAnswer;

                  return (
                    <button
                      key={index}
                      className={`${styles.optionButton} ${
                        isSelected ? styles.selected : ''
                      } ${showCorrect ? styles.correct : ''} ${
                        showIncorrect ? styles.incorrect : ''
                      }`}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResults}
                    >
                      <span className={styles.optionLetter}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className={styles.optionText}>{option}</span>
                      {showCorrect && <span className={styles.checkmark}>✓</span>}
                      {showIncorrect && <span className={styles.crossmark}>✗</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.navigationButtons}>
              <button
                className={styles.navButton}
                onClick={handlePrevious}
                disabled={currentQuestion === 0}
              >
                ← Previous
              </button>
              <button
                className={`${styles.navButton} ${styles.primaryButton}`}
                onClick={handleNext}
                disabled={!isAnswered}
              >
                {currentQuestion === questions.length - 1 ? 'Finish Test' : 'Next →'}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.resultsCard}>
            <div className={styles.resultsIcon}>
              {score === questions.length ? '🎉' : score >= questions.length * 0.7 ? '👍' : '📚'}
            </div>
            <h1 className={styles.resultsTitle}>
              {score === questions.length
                ? 'Perfect Score!'
                : score >= questions.length * 0.7
                ? 'Great Job!'
                : 'Keep Learning!'}
            </h1>
            <div className={styles.scoreDisplay}>
              <span className={styles.scoreNumber}>{score}</span>
              <span className={styles.scoreTotal}>/ {questions.length}</span>
            </div>
            <p className={styles.resultsMessage}>
              You got {score} out of {questions.length} questions correct.
              {score === questions.length
                ? ' Excellent work! You have mastered this content.'
                : score >= questions.length * 0.7
                ? ' Well done! Consider reviewing the topics you missed.'
                : ' Review the material and try again to improve your understanding.'}
            </p>
            <div className={styles.resultsActions}>
              <button className={styles.restartButton} onClick={handleRestart}>
                Retake Test
              </button>
              <Link href="/page4" className={styles.backToCoursesButton}>
                Back to Courses
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

