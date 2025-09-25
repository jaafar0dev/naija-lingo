import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, Play, FileText, HelpCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigation } from '@/components/Navigation';
import { LessonUploader } from '@/components/LessonUploader';
import { QuizManager } from '@/components/QuizManager';
import { toast } from 'sonner';

const LessonManagement = () => {
  const { courseId } = useParams();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonType, setLessonType] = useState<'video' | 'text' | 'quiz'>('video');

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchLessons();
    }
  }, [courseId]);

  useEffect(() => {
    if (editingLesson) {
      setLessonType(editingLesson.type);
      if (editingLesson.type === 'quiz') {
        // No need to set quizContent here, QuizManager fetches its own
      } else {
        // No need to reset quizContent here
      }
    } else {
      setLessonType('video'); // Default to video when creating new lesson
    }
  }, [editingLesson]);


  const fetchCourse = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (error || !data) {
      toast.error('Course not found');
      navigate('/dashboard');
      return;
    }

    // Check if user owns this course
    if (data.teacher_id !== userProfile?.id) {
      toast.error('You do not have permission to manage this course');
      navigate('/dashboard');
      return;
    }

    setCourse(data);
    setLoading(false);
  };

  const fetchLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    setLessons(data || []);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as 'video' | 'text' | 'quiz';

    const lessonData: any = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: type,
      course_id: courseId,
      order_index: editingLesson ? editingLesson.order_index : lessons.length,
    };

    if (type === 'video') {
      lessonData.video_url = formData.get('video_url') as string;
      lessonData.duration_minutes = parseInt(formData.get('duration_minutes') as string) || null;
      lessonData.content = formData.get('content') as string; // For video transcript/notes
    } else if (type === 'text') {
      lessonData.content = formData.get('content') as string;
      lessonData.video_url = null;
      lessonData.duration_minutes = null;
    } else if (type === 'quiz') {
      lessonData.content = null; // Quiz content is managed by QuizManager in 'quizzes' table
      lessonData.video_url = null;
      lessonData.duration_minutes = null;
    }

    let result;
    if (editingLesson) {
      result = await supabase
        .from('lessons')
        .update(lessonData)
        .eq('id', editingLesson.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('lessons')
        .insert(lessonData)
        .select()
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }

    toast.success(editingLesson ? 'Lesson updated successfully!' : 'Lesson created successfully!');
    setIsDialogOpen(false);
    setEditingLesson(null);
    setLessonType('video'); // Reset lesson type after submission
    fetchLessons();
    setSubmitting(false);
  };

  const handleDelete = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      toast.error('Failed to delete lesson');
      return;
    }

    toast.success('Lesson deleted successfully');
    fetchLessons();
  };

  const reorderLessons = async (lessons: any[]) => {
    const updates = lessons.map((lesson, index) => ({
      id: lesson.id,
      order_index: index
    }));

    for (const update of updates) {
      await supabase
        .from('lessons')
        .update({ order_index: update.order_index })
        .eq('id', update.id);
    }

    toast.success('Lessons reordered successfully');
    fetchLessons();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="w-4 h-4" />;
      case 'text': return <FileText className="w-4 h-4" />;
      case 'quiz': return <HelpCircle className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/course/${courseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Manage Lessons</h1>
              <p className="text-muted-foreground">{course?.title}</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary" onClick={() => {
                  setEditingLesson(null);
                  setLessonType('video'); // Default to video when adding new lesson
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lesson
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingLesson ? 'Edit Lesson' : 'Create New Lesson'}
                  </DialogTitle>
                </DialogHeader>
                
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Lesson Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        defaultValue={editingLesson?.title}
                        placeholder="e.g., Introduction to Greetings"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Lesson Type *</Label>
                      <Select
                        name="type"
                        value={lessonType}
                        onValueChange={(value: 'video' | 'text' | 'quiz') => {
                          setLessonType(value);
                          // Reset content/video_url/duration when type changes
                          if (value !== 'video') {
                            const videoUrlInput = document.getElementById('video_url') as HTMLInputElement;
                            if (videoUrlInput) videoUrlInput.value = '';
                            const durationInput = document.getElementById('duration_minutes') as HTMLInputElement;
                            if (durationInput) durationInput.value = '';
                          }
                          if (value !== 'text') {
                            const contentInput = document.getElementById('content') as HTMLInputElement;
                            if (contentInput) contentInput.value = '';
                          }
                          // No need to set quizContent here
                        }}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {lessonType === 'video' && (
                      <div className="space-y-2">
                        <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                        <Input
                          id="duration_minutes"
                          name="duration_minutes"
                          type="number"
                          min="1"
                          defaultValue={editingLesson?.type === 'video' ? editingLesson?.duration_minutes : ''}
                          placeholder="15"
                        />
                      </div>
                    )}

                    {lessonType === 'video' && (
                      <div className="space-y-2">
                        <Label htmlFor="video_url">Video URL</Label>
                        <Input
                          id="video_url"
                          name="video_url"
                          type="url"
                          defaultValue={editingLesson?.type === 'video' ? editingLesson?.video_url : ''}
                          placeholder="https://youtube.com/watch?v=..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      rows={3}
                      defaultValue={editingLesson?.description}
                      placeholder="Brief description of what students will learn..."
                    />
                  </div>

                  {(lessonType === 'text' || lessonType === 'video') && (
                    <div className="space-y-2">
                      <Label htmlFor="content">Lesson Content {lessonType === 'text' ? '*' : '(Optional Transcript/Notes)'}</Label>
                      <Textarea
                        id="content"
                        name="content"
                        rows={8}
                        required={lessonType === 'text'}
                        defaultValue={editingLesson?.type === 'text' || editingLesson?.type === 'video' ? editingLesson?.content : ''}
                        placeholder={lessonType === 'text' ? "Enter the full lesson content..." : "Enter video transcript or notes..."}
                      />
                    </div>
                  )}

                  {lessonType === 'video' && (
                    <div className="space-y-2">
                      <Label>Upload Video File</Label>
                      <LessonUploader
                        onFileUploaded={(url) => {
                          const videoInput = document.getElementById('video_url') as HTMLInputElement;
                          if (videoInput) {
                            videoInput.value = url;
                          }
                          toast.success('Video uploaded and URL added to lesson');
                        }}
                      />
                    </div>
                  )}

                  {lessonType === 'quiz' && (
                    <div className="space-y-2">
                      <QuizManager
                        lessonId={editingLesson?.id || 'new-lesson'} // Pass a temporary ID for new lessons
                        onQuizCreated={fetchLessons} // Refresh lessons after quiz is created/updated
                      />
                    </div>
                  )}

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="bg-gradient-primary"
                    >
                      {submitting ? 'Saving...' : (editingLesson ? 'Update Lesson' : 'Create Lesson')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingLesson(null);
                        setError(null);
                        setLessonType('video'); // Reset lesson type on cancel
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-6">
          {lessons.length > 0 ? (
            <div className="grid gap-4">
              {lessons.map((lesson, index) => (
                <Card key={lesson.id} className="hover:shadow-medium transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(lesson.type)}
                          <div>
                            <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                            {lesson.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {lesson.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {lesson.duration_minutes && (
                          <span className="text-sm text-muted-foreground">
                            {lesson.duration_minutes} min
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingLesson(lesson);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(lesson.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No lessons yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first lesson to start building your course content
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-gradient-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Lesson
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonManagement;