import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Clock, Award, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  passing_score: number;
  time_limit_minutes?: number;
}

interface QuizManagerProps {
  lessonId: string;
  onQuizCreated?: () => void;
}

export const QuizManager = ({ lessonId, onQuizCreated }: QuizManagerProps) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [timeLimit, setTimeLimit] = useState<number | undefined>();
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchQuizzes();
  }, [lessonId]);

  const fetchQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId);

      if (error) throw error;
      setQuizzes((data || []).map((quiz: any) => ({
        ...quiz,
        questions: Array.isArray(quiz.questions) ? quiz.questions : []
      })));
    } catch (error: any) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPassingScore(70);
    setTimeLimit(undefined);
    setQuestions([]);
    setEditingQuiz(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (quiz: Quiz) => {
    setTitle(quiz.title);
    setDescription(quiz.description || '');
    setPassingScore(quiz.passing_score);
    setTimeLimit(quiz.time_limit_minutes || undefined);
    setQuestions(quiz.questions);
    setEditingQuiz(quiz);
    setDialogOpen(true);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substring(2),
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions(prev => 
      prev.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => 
      prev.map((q, i) => 
        i === questionIndex 
          ? { 
              ...q, 
              options: q.options.map((opt, oi) => oi === optionIndex ? value : opt) 
            }
          : q
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }

    const invalidQuestions = questions.filter(q => 
      !q.question.trim() || q.options.some(opt => !opt.trim())
    );

    if (invalidQuestions.length > 0) {
      toast.error('Please fill in all question fields');
      return;
    }

    try {
      const quizData = {
        lesson_id: lessonId,
        title,
        description: description || null,
        questions: questions as any,
        passing_score: passingScore,
        time_limit_minutes: timeLimit || null,
      };

      let error;

      if (editingQuiz) {
        const result = await supabase
          .from('quizzes')
          .update(quizData)
          .eq('id', editingQuiz.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('quizzes')
          .insert(quizData);
        error = result.error;
      }

      if (error) throw error;

      toast.success(editingQuiz ? 'Quiz updated successfully' : 'Quiz created successfully');
      setDialogOpen(false);
      fetchQuizzes();
      onQuizCreated?.();
    } catch (error: any) {
      toast.error('Failed to save quiz');
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast.success('Quiz deleted successfully');
      fetchQuizzes();
    } catch (error: any) {
      toast.error('Failed to delete quiz');
    }
  };

  if (loading) {
    return <div className="text-center">Loading quizzes...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Quizzes</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="quiz-title">Quiz Title *</Label>
                  <Input
                    id="quiz-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Basic Greetings Quiz"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="quiz-description">Description</Label>
                  <Textarea
                    id="quiz-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the quiz..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="passing-score">Passing Score (%)</Label>
                  <Input
                    id="passing-score"
                    type="number"
                    min="0"
                    max="100"
                    value={passingScore}
                    onChange={(e) => setPassingScore(parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="time-limit">Time Limit (minutes)</Label>
                  <Input
                    id="time-limit"
                    type="number"
                    min="1"
                    value={timeLimit || ''}
                    onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">Questions</h4>
                  <Button type="button" onClick={addQuestion} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Question
                  </Button>
                </div>

                {questions.map((question, questionIndex) => (
                  <Card key={question.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <Label>Question {questionIndex + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(questionIndex)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                        placeholder="Enter your question..."
                        rows={2}
                      />

                      <div className="space-y-2">
                        <Label>Answer Options</Label>
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`question-${questionIndex}-correct`}
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => updateQuestion(questionIndex, 'correctAnswer', optionIndex)}
                            />
                            <Input
                              value={option}
                              onChange={(e) => updateQuestionOption(questionIndex, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <Label>Explanation (optional)</Label>
                        <Textarea
                          value={question.explanation || ''}
                          onChange={(e) => updateQuestion(questionIndex, 'explanation', e.target.value)}
                          placeholder="Explain why this is the correct answer..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button type="submit">
                  {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No quizzes created yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a quiz to test your students' knowledge.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <Card key={quiz.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    {quiz.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {quiz.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(quiz)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteQuiz(quiz.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {quiz.questions.length} questions
                  </Badge>
                  <Badge variant="secondary">
                    <Award className="w-3 h-3 mr-1" />
                    {quiz.passing_score}% to pass
                  </Badge>
                  {quiz.time_limit_minutes && (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      {quiz.time_limit_minutes} min limit
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
