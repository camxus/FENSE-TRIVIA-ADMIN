"use client"

import { useState, useEffect } from "react"
import { getAuth, onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth"
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, arrayUnion, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Plus, MoreVertical, Pencil, Trash2, FolderOpen, LogOut, Loader2 } from "lucide-react"
import Image from "next/image"

interface Question {
  id: string
  question: Record<"en" | "fr", string>
  answer: Record<"en" | "fr", string | boolean>
  timeLimit: number
  isBoolean: boolean
}

interface Category {
  id: string
  categoryName: string
  questions: Question[]
}

export default function QuizAdmin() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [isEditQuestionOpen, setIsEditQuestionOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string>("")
  const [editingCategoryId, setEditingCategoryId] = useState<string>("")
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newQuestion, setNewQuestion] = useState<Omit<Question, "id">>({
    question: { en: "", fr: "" },
    answer: { en: "", fr: "" },
    timeLimit: 30,
    isBoolean: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (currentUser) {
        setUser(currentUser)
        loadCategories()
      } else {
        router.push("/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadCategories = async () => {
    try {
      const categoriesRef = collection(db, "questions")
      const snapshot = await getDocs(categoriesRef)
      const loadedCategories: Category[] = []

      for (const categoryDoc of snapshot.docs) {
        const data = categoryDoc.data()

        const questions: Question[] = (data.questions || []).map((q: any, index: number) => ({
          id: q.id || index.toString(),
          isBoolean: q.isBoolean ?? false,
          ...q,
        }))

        loadedCategories.push({
          id: categoryDoc.id,
          categoryName: data.categoryName,
          questions,
        })
      }

      setCategories(loadedCategories)
    } catch (error) {
      console.error("[v0] Error loading categories:", error)
    }
  }

  const addCategory = async () => {
    if (!newCategoryName.trim() || isSaving) return;

    setIsSaving(true);

    try {
      const auth = getAuth();

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const docRef = await addDoc(collection(db, "questions"), {
        categoryName: newCategoryName,
        questions: [],
        createdAt: new Date(),
      });

      setCategories([...categories, { id: docRef.id, categoryName: newCategoryName, questions: [] }]);
      setNewCategoryName("");
      setIsAddCategoryOpen(false);

    } catch (error) {
      console.error("[v0] Error adding category:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    setIsSaving(true);
    try {
      const auth = getAuth();

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      await deleteDoc(doc(db, "questions", categoryId));

      setCategories(categories.filter((cat) => cat.id !== categoryId));
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("[v0] Error deleting category:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCategory = async (categoryId: string, newName: string) => {
    if (!newName.trim() || isSaving) return
    setIsSaving(true)
    try {
      const auth = getAuth();

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      await updateDoc(doc(db, "questions", categoryId), {
        categoryName: newName,
      })
      setCategories(categories.map((cat) => (cat.id === categoryId ? { ...cat, categoryName: newName } : cat)))
      if (selectedCategory === categoryId) {
        setSelectedCategory(categoryId)
      }
      setIsEditCategoryOpen(false)
      setEditingCategory("")
      setEditingCategoryId("")
    } catch (error) {
      console.error("[v0] Error updating category:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const addQuestion = async (categoryId: string) => {
    // For boolean questions, answers are always "true"/"false" — skip the answer field validation
    const answersValid = newQuestion.isBoolean
      ? typeof newQuestion.answer.en === "boolean" && typeof newQuestion.answer.fr === "boolean"
      : newQuestion.answer.en.toString().trim() && newQuestion.answer.fr.toString().trim()

    if (
      !newQuestion.question.en.trim() ||
      !newQuestion.question.fr.trim() ||
      !answersValid ||
      isSaving
    ) return;

    setIsSaving(true);

    try {
      const auth = getAuth();

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const categoryDocRef = doc(db, "questions", categoryId);

      const newQuestionEntry = {
        id: crypto.randomUUID(),
        question: newQuestion.question,
        answer: newQuestion.isBoolean
          ? { en: newQuestion.answer.en, fr: newQuestion.answer.en }
          : {
            fr: newQuestion.answer.fr.toString().toUpperCase().trim(),
            en: newQuestion.answer.en.toString().toUpperCase().trim(),
          },
        timeLimit: newQuestion.timeLimit,
        isBoolean: newQuestion.isBoolean,
      }

      await updateDoc(categoryDocRef, {
        questions: arrayUnion({
          ...newQuestionEntry,
          createdAt: new Date(),
        }),
      })

      setCategories(
        categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, questions: [...(cat.questions || []), newQuestionEntry] }
            : cat
        )
      )

      setNewQuestion({
        question: { en: "", fr: "" },
        answer: { en: "", fr: "" },
        timeLimit: 30,
        isBoolean: false,
      });
      setIsAddQuestionOpen(false);
    } catch (error) {
      console.error("[v0] Error adding question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteQuestion = async (categoryId: string, questionId: string) => {
    setIsSaving(true);
    try {
      const auth = getAuth();

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const categoryDocRef = doc(db, "questions", categoryId);

      const categorySnap = await getDoc(categoryDocRef);
      if (!categorySnap.exists()) throw new Error("Category not found");

      const currentQuestions: Question[] = categorySnap.data().questions || [];

      const updatedQuestions = currentQuestions.filter((q) => q.id !== questionId);

      await updateDoc(categoryDocRef, { questions: updatedQuestions });

      setCategories(
        categories.map((cat) =>
          cat.id === categoryId ? { ...cat, questions: updatedQuestions } : cat
        )
      );
    } catch (error) {
      console.error("[v0] Error deleting question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = async (categoryId: string, updatedQuestion: Question) => {
    const answersValid = updatedQuestion.isBoolean
      ? typeof updatedQuestion.answer.en === "boolean" && typeof updatedQuestion.answer.en === "boolean"
      : updatedQuestion.answer.fr.toString().trim() && updatedQuestion.answer.en.toString().trim()

    if (
      !updatedQuestion.question.fr.trim() ||
      !updatedQuestion.question.en.trim() ||
      !answersValid ||
      isSaving
    ) return;

    setIsSaving(true);

    try {
      const auth = getAuth();

      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const categoryDocRef = doc(db, "questions", categoryId);

      const categorySnap = await getDoc(categoryDocRef);
      if (!categorySnap.exists()) throw new Error("Category not found");

      const currentQuestions: Question[] = categorySnap.data().questions || [];

      const updatedQuestions = currentQuestions.map((q) =>
        q.id === updatedQuestion.id
          ? {
            ...q,
            question: { en: updatedQuestion.question.en, fr: updatedQuestion.question.fr },
            answer: updatedQuestion.isBoolean
              ? { en: updatedQuestion.answer.en, fr: updatedQuestion.answer.en }
              : {
                en: updatedQuestion.answer.en.toString().toUpperCase().trim(),
                fr: updatedQuestion.answer.fr.toString().toUpperCase().trim(),
              },
            timeLimit: updatedQuestion.timeLimit,
            isBoolean: updatedQuestion.isBoolean,
          }
          : q
      );

      await updateDoc(categoryDocRef, { questions: updatedQuestions });

      setCategories(
        categories.map((cat) =>
          cat.id === categoryId ? { ...cat, questions: updatedQuestions } : cat
        )
      );

      setIsEditQuestionOpen(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error("[v0] Error updating question:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("[v0] Error logging out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentCategory = categories.find((cat) => cat.id === selectedCategory)

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Image
                src="/fense-logo.png"
                alt="Fense Logo"
                width={150}
                height={150}
              />
              <p className="text-sm text-muted-foreground">Manage your quiz questions and categories</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* Categories Sidebar */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Categories</CardTitle>
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={isSaving}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Category</DialogTitle>
                      <DialogDescription>Create a new question category</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category-name">Category Name</Label>
                        <Input
                          id="category-name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter category name"
                        />
                      </div>
                      <Button onClick={addCategory} className="w-full" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Category
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`group flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent cursor-pointer ${selectedCategory === category.id ? "bg-accent" : ""
                    }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{category.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{category.questions.length} questions</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                        disabled={isSaving}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingCategory(category.categoryName)
                          setEditingCategoryId(category.id)
                          setNewCategoryName(category.categoryName)
                          setIsEditCategoryOpen(true)
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteCategory(category.id)
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Questions Panel */}
          <div>
            {selectedCategory && currentCategory ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{currentCategory.categoryName}</CardTitle>
                      <CardDescription>
                        {currentCategory.questions.length}{" "}
                        {currentCategory.questions.length === 1 ? "question" : "questions"}
                      </CardDescription>
                    </div>
                    <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
                      <DialogTrigger asChild>
                        <Button disabled={isSaving}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Question
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Question</DialogTitle>
                          <DialogDescription>
                            Create a new question for {currentCategory.categoryName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {/* Boolean toggle */}
                          <div className="flex items-center justify-between rounded-lg border border-border p-3">
                            <div>
                              <Label>True / False question</Label>
                              <p className="text-xs text-muted-foreground mt-0.5">Players answer with True or False</p>
                            </div>
                            <Switch
                              checked={newQuestion.isBoolean}
                              onCheckedChange={(checked) =>
                                setNewQuestion({ ...newQuestion, isBoolean: checked })
                              }
                            />
                          </div>

                          <Label>Question</Label>
                          <div>
                            <Label><span className="text-muted-foreground">English</span></Label>
                            <Input
                              value={newQuestion.question.en}
                              onChange={(e) =>
                                setNewQuestion({ ...newQuestion, question: { ...newQuestion.question, en: e.target.value } })
                              }
                              placeholder="Enter question in English"
                            />
                          </div>
                          <div>
                            <Label><span className="text-muted-foreground">French</span></Label>
                            <Input
                              value={newQuestion.question.fr}
                              onChange={(e) =>
                                setNewQuestion({ ...newQuestion, question: { ...newQuestion.question, fr: e.target.value } })
                              }
                              placeholder="Enter question in French"
                            />
                          </div>

                          {/* Answer fields */}
                          <Label>Correct Answer</Label>
                          {newQuestion.isBoolean ? (
                            <div className="flex gap-3">
                              {["true", "false"].map((val) => {
                                const boolVal = val === "true";
                                return (
                                  <Button
                                    key={val}
                                    type="button"
                                    variant={newQuestion.answer.en === boolVal ? "default" : "outline"}
                                    className="flex-1 capitalize"
                                    onClick={() =>
                                      setNewQuestion({ ...newQuestion, answer: { en: boolVal, fr: boolVal } })
                                    }
                                  >
                                    {val}
                                  </Button>
                                );
                              })}
                            </div>
                          ) : (
                            <>
                              <div>
                                <Label><span className="text-muted-foreground">English</span></Label>
                                <Input
                                  value={newQuestion.answer.en.toString()}
                                  onChange={(e) =>
                                    setNewQuestion({ ...newQuestion, answer: { ...newQuestion.answer, en: e.target.value.toUpperCase() } })
                                  }
                                  placeholder="Enter answer in English"
                                />
                              </div>
                              <div>
                                <Label><span className="text-muted-foreground">French</span></Label>
                                <Input
                                  value={newQuestion.answer.fr.toString()}
                                  onChange={(e) =>
                                    setNewQuestion({ ...newQuestion, answer: { ...newQuestion.answer, fr: e.target.value.toUpperCase() } })
                                  }
                                  placeholder="Enter answer in French"
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <Label htmlFor="time">Time Limit (seconds)</Label>
                            <Input
                              id="time"
                              type="number"
                              value={newQuestion.timeLimit}
                              onChange={(e) =>
                                setNewQuestion({ ...newQuestion, timeLimit: Number.parseInt(e.target.value) })
                              }
                              placeholder="30"
                            />
                          </div>
                          <Button onClick={() => addQuestion(selectedCategory)} className="w-full" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Question
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentCategory.questions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="text-sm text-muted-foreground">No questions yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Click "Add Question" to create one</p>
                    </div>
                  ) : (
                    currentCategory.questions.map((question) => (
                      <div
                        key={question.id}
                        className="group rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {question.timeLimit}s
                              </Badge>
                              {question.isBoolean && (
                                <Badge variant="outline" className="text-xs">
                                  True / False
                                </Badge>
                              )}
                            </div>
                            <p className="flex flex-col text-sm text-foreground space-y-1">
                              <span className="font-medium">Question: </span>
                              <span>
                                <span className="text-muted-foreground">English</span> {question.question.en}
                              </span>
                              <span>
                                <span className="text-muted-foreground">French</span> {question.question.fr}
                              </span>
                            </p>
                            {!question.isBoolean && (
                              <p className="flex flex-col text-sm text-muted-foreground space-y-1">
                                <span className="font-medium">Answer: </span>
                                <span>
                                  <span className="text-muted-foreground/80">English</span> {question.answer.en}
                                </span>
                                <span>
                                  <span className="text-muted-foreground/80">French</span> {question.answer.fr}
                                </span>
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
                                disabled={isSaving}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingQuestion(question)
                                  setIsEditQuestionOpen(true)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => deleteQuestion(selectedCategory, question.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">No category selected</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Select a category to view and manage questions</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category name</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-category-name">Category Name</Label>
              <Input
                id="edit-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <Button
              onClick={() => updateCategory(editingCategoryId, newCategoryName)}
              className="w-full"
              disabled={isSaving}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog open={isEditQuestionOpen} onOpenChange={setIsEditQuestionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>Update question details</DialogDescription>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4">
              {/* Boolean toggle */}
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label>True / False question</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Players answer with True or False</p>
                </div>
                <Switch
                  checked={editingQuestion.isBoolean}
                  onCheckedChange={(checked) =>
                    setEditingQuestion({ ...editingQuestion, isBoolean: checked })
                  }
                />
              </div>

              <Label>Question</Label>
              <div>
                <Label><span className="text-muted-foreground">English</span></Label>
                <Input
                  value={editingQuestion.question.en}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, en: e.target.value },
                    })
                  }
                  placeholder="Enter question in English"
                />
              </div>
              <div>
                <Label><span className="text-muted-foreground">French</span></Label>
                <Input
                  value={editingQuestion.question.fr}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      question: { ...editingQuestion.question, fr: e.target.value },
                    })
                  }
                  placeholder="Enter question in French"
                />
              </div>

              {/* Answer fields */}
              <Label>Correct Answer</Label>
              {editingQuestion.isBoolean ? (
                <div className="flex gap-3">
                  {["true", "false"].map((val) => {
                    const boolVal = val === "true";
                    return (
                      <Button
                        key={val}
                        type="button"
                        variant={editingQuestion.answer.en === boolVal ? "default" : "outline"}
                        className="flex-1 capitalize"
                        onClick={() =>
                          setEditingQuestion({ ...editingQuestion, answer: { en: boolVal, fr: boolVal } })
                        }
                      >
                        {val}
                      </Button>
                    );
                  })}
                </div>
              ) : (
                <>
                  <div>
                    <Label><span className="text-muted-foreground">English</span></Label>
                    <Input
                      value={editingQuestion.answer.en.toString()}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          answer: { ...editingQuestion.answer, en: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="Enter answer in English"
                    />
                  </div>
                  <div>
                    <Label><span className="text-muted-foreground">French</span></Label>
                    <Input
                      value={editingQuestion.answer.fr.toString()}
                      onChange={(e) =>
                        setEditingQuestion({
                          ...editingQuestion,
                          answer: { ...editingQuestion.answer, fr: e.target.value.toUpperCase() },
                        })
                      }
                      placeholder="Enter answer in French"
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="edit-time">Time Limit (seconds)</Label>
                <Input
                  id="edit-time"
                  type="number"
                  value={editingQuestion.timeLimit}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, timeLimit: Number.parseInt(e.target.value) })
                  }
                  placeholder="30"
                />
              </div>
              <Button
                onClick={() => selectedCategory && updateQuestion(selectedCategory, editingQuestion)}
                className="w-full"
                disabled={isSaving}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Question
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
