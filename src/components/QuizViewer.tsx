import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizViewerProps {
  questions: QuizQuestion[];
  onComplete?: (score: number) => void;
}

export const QuizViewer = ({ questions, onComplete }: QuizViewerProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answerIndex
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeQuiz = () => {
    setIsCompleted(true);
    setShowResults(true);
    
    const correctAnswers = questions.filter(
      question => selectedAnswers[question.id] === question.correctAnswer
    ).length;
    
    const score = Math.round((correctAnswers / questions.length) * 100);
    onComplete?.(score);
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setIsCompleted(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  if (showResults) {
    const correctAnswers = questions.filter(
      question => selectedAnswers[question.id] === question.correctAnswer
    ).length;
    const score = Math.round((correctAnswers / questions.length) * 100);

    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(score)}`}>
              {score}%
            </div>
            <p className="text-muted-foreground">
              You got {correctAnswers} out of {questions.length} questions correct
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Your Answers</h3>
            {questions.map((question, index) => {
              const userAnswer = selectedAnswers[question.id];
              const isCorrect = userAnswer === question.correctAnswer;
              
              return (
                <div key={question.id} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">{question.question}</p>
                      <p className="text-sm text-muted-foreground">
                        Your answer: {question.options[userAnswer]} {!isCorrect && '❌'}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-success">
                          Correct answer: {question.options[question.correctAnswer]} ✓
                        </p>
                      )}
                      {question.explanation && (
                        <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                          {question.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 justify-center">
            <Button onClick={resetQuiz} variant="outline">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>
            Question {currentQuestionIndex + 1} of {questions.length}
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <Progress value={progress} className="w-full" />
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{currentQuestion.question}</h3>
          
          <RadioGroup
            value={selectedAnswers[currentQuestion.id]?.toString()}
            onValueChange={(value) => handleAnswerSelect(parseInt(value))}
            className="space-y-3"
          >
            {currentQuestion.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={selectedAnswers[currentQuestion.id] === undefined}
            className="bg-gradient-primary"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Complete Quiz' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};