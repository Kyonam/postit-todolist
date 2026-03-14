"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Pencil, Check, X, GripVertical, Sun, Moon, Filter, Tag } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Memo {
  id: string
  content: string
  color: string
  category: '할 일' | '아이디어' | '기타'
  createdAt: Date
  isDeleting?: boolean
}

const CATEGORIES = ['할 일', '아이디어', '기타'] as const;

const POSTIT_COLORS = [
  "bg-yellow-200 hover:shadow-yellow-300/60",
  "bg-pink-200 hover:shadow-pink-300/60",
  "bg-green-200 hover:shadow-green-300/60",
  "bg-blue-200 hover:shadow-blue-300/60",
]

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [newMemo, setNewMemo] = useState("")
  const [newCategory, setNewCategory] = useState<Memo['category']>('기타')
  const [filterCategory, setFilterCategory] = useState<'전체' | Memo['category']>('전체')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [isMounted, setIsMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("postit_memos")
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        }))
        setMemos(parsed)
      } catch (e) {
        console.error("Failed to parse saved memos")
      }
    }
    setIsMounted(true)
  }, [])

  // Save to localStorage when memos change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("postit_memos", JSON.stringify(memos))
    }
  }, [memos, isMounted])

  if (!isMounted) return null

  const addMemo = () => {
    if (!newMemo.trim()) {
      toast.error("메모 내용을 입력해주세요.")
      return
    }
    
    const randomColor = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)]
    
    const memo: Memo = {
      id: Math.random().toString(36).substring(2, 9),
      content: newMemo,
      color: randomColor,
      category: newCategory,
      createdAt: new Date(),
    }
    setMemos([memo, ...memos])
    setNewMemo("")
    setNewCategory('기타')
    toast.success("메모가 추가되었습니다.")
  }

  const filteredMemos = filterCategory === '전체' 
    ? memos 
    : memos.filter(m => m.category === filterCategory)

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(memos)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setMemos(items)
  }

  const deleteMemo = (id: string) => {
    setMemos(prev => prev.map(m => m.id === id ? { ...m, isDeleting: true } : m))
    
    setTimeout(() => {
      setMemos(prev => prev.filter((m) => m.id !== id))
      if (editingId === id) setEditingId(null)
      toast.info("메모가 삭제되었습니다.")
    }, 300)
  }

  const startEditing = (memo: Memo) => {
    setEditingId(memo.id)
    setEditContent(memo.content)
  }

  const saveEdit = () => {
    if (!editContent.trim()) {
      toast.error("내용을 입력해주세요.")
      return
    }
    setMemos(memos.map(m => m.id === editingId ? { ...m, content: editContent } : m))
    setEditingId(null)
    toast.success("메모가 수정되었습니다.")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 font-sans transition-colors duration-500 relative">
      {/* Theme Toggle Button */}
      <div className="absolute top-8 right-8">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
        >
          {theme === "dark" ? (
            <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500" />
          ) : (
            <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700" />
          )}
        </Button>
      </div>

      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 lg:text-5xl">
            My Post-it List
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">아이디어를 다채로운 포스트잇으로 기록하세요.</p>
        </header>

        {/* Input Area */}
        <Card className="mb-12 border-none bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden transition-colors duration-500">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="여기에 메모를 입력하세요..."
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                className="min-h-[120px] resize-none border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-base focus-visible:ring-yellow-400 dark:text-slate-100"
              />
              <div className="flex justify-between items-center">
                <div className="w-[140px]">
                  <Select 
                    value={newCategory} 
                    onValueChange={(value: Memo['category']) => setNewCategory(value)}
                  >
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="카테고리" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={addMemo} 
                  className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 font-semibold px-6 transition-colors duration-500"
                >
                  <Plus className="mr-2 h-4 w-4" /> 메모 추가하기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filter Area */}
        <div className="mb-6 flex justify-between items-center px-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Tag className="h-5 w-5" /> 메모 리스트
            {filterCategory !== '전체' && (
              <span className="text-sm font-medium px-2 py-0.5 bg-yellow-400 text-black rounded-full transition-all">
                {filterCategory}
              </span>
            )}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <Filter className="mr-2 h-4 w-4" /> 필터: {filterCategory}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>카테고리 선택</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterCategory('전체')}>
                전체
              </DropdownMenuItem>
              {CATEGORIES.map(cat => (
                <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)}>
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Memo Grid */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="memos-grid" direction="horizontal">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
              >
                {filteredMemos.map((memo, index) => (
                  <Draggable key={memo.id} draggableId={memo.id} index={index}>
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "group relative h-64 overflow-hidden border-none p-6 shadow-md transition-all duration-300 ease-in-out",
                          snapshot.isDragging ? "z-50 scale-105 shadow-2xl opacity-90 border-2 border-slate-400/20 dark:border-white/10" : "hover:-translate-y-2 hover:scale-[1.02] hover:shadow-2xl",
                          memo.isDeleting 
                            ? "animate-out fade-out zoom-out-95 duration-300 fill-mode-forwards" 
                            : "animate-in zoom-in-90 fade-in duration-500 ease-out", 
                          memo.color
                        )}
                        style={{
                          ...provided.draggableProps.style,
                          transform: memo.isDeleting 
                            ? 'scale(0.95)' 
                            : snapshot.isDragging 
                              ? provided.draggableProps.style?.transform 
                              : `${provided.draggableProps.style?.transform || ''} rotate(${index % 3 === 0 ? '-1.5deg' : index % 3 === 1 ? '1deg' : '2.2deg'})`,
                        }}
                      >
                        {/* Drag Handle Overlay */}
                        <div 
                          {...provided.dragHandleProps}
                          className="absolute inset-x-0 top-0 h-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-slate-500/30 hover:text-slate-500 dark:text-slate-400/30 dark:hover:text-slate-300"
                        >
                          <GripVertical className="h-6 w-6" />
                        </div>

                        <CardContent className="h-full p-0 pt-2">
                          <div className="flex h-full flex-col justify-between">
                            {editingId === memo.id ? (
                              <div className="flex flex-col gap-2 h-full">
                                <Textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="flex-1 bg-transparent border-none focus-visible:ring-0 resize-none font-medium text-slate-900 dark:text-slate-900 text-lg leading-relaxed p-0 placeholder:text-black/30"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={cancelEdit}
                                    className="h-8 px-3 text-xs font-semibold hover:bg-black/5 text-black/60"
                                  >
                                    취소
                                  </Button>
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    onClick={saveEdit}
                                    className="h-8 px-3 text-xs font-bold bg-black/10 hover:bg-black/20 text-slate-900 border-none"
                                  >
                                    저장
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-black/10 rounded uppercase tracking-wider">
                                      {memo.category}
                                    </span>
                                  </div>
                                  <p className="whitespace-pre-wrap text-lg font-medium text-slate-900 line-clamp-5 leading-relaxed">
                                    {memo.content}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                  <span className="text-[10px] text-black/40 font-medium">
                                    {new Intl.DateTimeFormat('ko-KR', {
                                      year: 'numeric', month: '2-digit', day: '2-digit',
                                      hour: '2-digit', minute: '2-digit', weekday: 'short'
                                    }).format(memo.createdAt)}
                                  </span>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => startEditing(memo)}
                                      className="h-8 w-8 text-black/40 hover:bg-black/5 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteMemo(memo.id)}
                                      className="h-8 w-8 text-black/40 hover:bg-black/5 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                        {/* Paper fold effect */}
                        <div className="absolute top-0 right-0 w-8 h-8 bg-black/5 rounded-bl-2xl pointer-events-none" />
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {memos.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="mx-auto mb-4 h-24 w-24 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
              <Plus className="h-10 w-10 text-slate-300 dark:text-slate-700" />
            </div>
            <p className="text-slate-400 dark:text-slate-600 font-medium">기록된 메모가 없습니다. 첫 메모를 작성해 보세요!</p>
          </div>
        )}
      </div>
    </main>
  )
}