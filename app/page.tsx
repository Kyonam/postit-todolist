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
const API_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEET_API_URL;

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
  const [isLoading, setIsLoading] = useState(false)
  const { theme, setTheme } = useTheme()

  // Google Sheet 동기화 함수
  const syncWithSheet = async (action: 'create' | 'update' | 'delete', data: any) => {
    if (!API_URL) return;
    try {
      // mode: 'no-cors'를 사용할 때는 Content-Type을 text/plain으로 보내야 
      // 브라우저가 preflight(OPTIONS)를 생략하고 Apps Script에 데이터를 정상 전달합니다.
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, ...data })
      });
    } catch (error) {
      console.error("Sheet sync failed:", error);
    }
  };

  // 구글 시트에서 데이터 로드
  const loadMemosFromSheet = async () => {
    if (!API_URL) return;
    setIsLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      if (Array.isArray(data)) {
        const parsed = data
          .filter((item: any) => item.content)
          .map((item: any) => {
            // 시트 헤더 이름을 키로 사용하여 매핑
            let date = new Date(item.timestamp);
            if (isNaN(date.getTime())) {
              date = item.datetime ? new Date(item.datetime.replace(/오후|오전/, "")) : new Date();
              if (isNaN(date.getTime())) date = new Date();
            }

            return {
              id: String(item.id || Math.random().toString(36).substring(2, 9)),
              content: String(item.content || ""),
              category: (item.category || '기타') as Memo['category'],
              color: String(item.color || "bg-yellow-200"),
              createdAt: date,
            };
          });
        // 최신순 정렬
        setMemos(parsed.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      }
    } catch (error) {
      console.error("Failed to load from sheet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. 먼저 로컬 스토리지 데이터로 빠른 렌더링
    const saved = localStorage.getItem("postit_memos")
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt)
        }))
        setMemos(parsed)
      } catch (e) {}
    }
    
    setIsMounted(true);
    
    // 2. 구글 시트에서 실시간 데이터 가져와서 업데이트
    loadMemosFromSheet();
  }, [])

  // Save to localStorage when memos change (Cache)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("postit_memos", JSON.stringify(memos))
    }
  }, [memos, isMounted])

  if (!isMounted) return null

  const addMemo = async () => {
    if (!newMemo.trim()) {
      toast.error("메모 내용을 입력해주세요.")
      return
    }
    
    const randomColor = POSTIT_COLORS[Math.floor(Math.random() * POSTIT_COLORS.length)]
    const now = new Date();
    
    const memo: Memo = {
      id: Math.random().toString(36).substring(2, 9),
      content: newMemo,
      color: randomColor,
      category: newCategory,
      createdAt: now,
    }

    // 로컬 상태 즉시 업데이트
    setMemos([memo, ...memos])
    setNewMemo("")
    setNewCategory('기타')
    toast.success("메모가 추가되었습니다.")

    // 시트 동기화 (timestamp도 datetime 형식으로 저장)
    await syncWithSheet('create', {
      id: String(memo.id),
      content: memo.content,
      category: memo.category,
      color: memo.color,
      timestamp: now.toLocaleString('ko-KR'),
      datetime: now.toLocaleString('ko-KR')
    });
  }

  const deleteMemo = async (id: string) => {
    if (!id) return;
    setMemos(prev => prev.map(m => m.id === id ? { ...m, isDeleting: true } : m))
    
    setTimeout(async () => {
      setMemos(prev => prev.filter((m) => m.id !== id))
      if (editingId === id) setEditingId(null)
      toast.info("메모가 삭제되었습니다.")
      
      // 시트 동기화 (ID 필수 전달)
      await syncWithSheet('delete', { id: String(id) });
    }, 300)
  }

  const startEditing = (memo: Memo) => {
    setEditingId(memo.id)
    setEditContent(memo.content)
  }

  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) {
      toast.error("내용을 입력해주세요.")
      return
    }

    setMemos(memos.map(m => m.id === editingId ? { ...m, content: editContent } : m))
    const targetId = editingId;
    setEditingId(null)
    toast.success("메모가 수정되었습니다.")

    // 시트 동기화 (ID로 특정하여 수정)
    await syncWithSheet('update', {
      id: String(targetId),
      content: editContent
    });
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditContent("")
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
        <header className="mb-8 md:mb-12 text-center px-4">
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-5xl">
            My Post-it <span className="hidden sm:inline">List</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium break-keep">
            다채로운 생각들을 가볍게 기록하세요.
          </p>
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
                {filteredMemos.map((memo, index) => {
                  const safeId = memo.id || `memo-${index}-${Date.now()}`;
                  return (
                    <Draggable key={safeId} draggableId={safeId} index={index}>
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
                                      {memo.createdAt instanceof Date && !isNaN(memo.createdAt.getTime()) 
                                        ? new Intl.DateTimeFormat('ko-KR', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit', weekday: 'short'
                                          }).format(memo.createdAt)
                                        : "날짜 정보 없음"
                                      }
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
                  );
                })}
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