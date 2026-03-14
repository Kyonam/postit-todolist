"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface Memo {
  id: string
  content: string
  createdAt: Date
}

export default function Home() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [newMemo, setNewMemo] = useState("")

  const addMemo = () => {
    if (!newMemo.trim()) {
      toast.error("메모 내용을 입력해주세요.")
      return
    }
    const memo: Memo = {
      id: Math.random().toString(36).substring(2, 9),
      content: newMemo,
      createdAt: new Date(),
    }
    setMemos([memo, ...memos])
    setNewMemo("")
    toast.success("메모가 추가되었습니다.")
  }

  const deleteMemo = (id: string) => {
    setMemos(memos.filter((m) => m.id !== id))
    toast.info("메모가 삭제되었습니다.")
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">
            My Post-it List
          </h1>
          <p className="text-lg text-slate-600">아이디어를 포스트잇으로 간편하게 기록하세요.</p>
        </header>

        {/* Input Area */}
        <Card className="mb-12 border-none bg-white shadow-xl shadow-slate-200/50">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <Textarea
                placeholder="여기에 메모를 입력하세요..."
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                className="min-h-[120px] resize-none border-slate-200 bg-slate-50 text-base focus-visible:ring-yellow-400"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={addMemo} 
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 font-semibold px-6"
                >
                  <Plus className="mr-2 h-4 w-4" /> 메모 추가하기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memo Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {memos.map((memo, index) => (
            <Card
              key={memo.id}
              className="group relative h-64 overflow-hidden border-none bg-yellow-200 p-6 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-yellow-200/50"
              style={{
                transform: `rotate(${index % 2 === 0 ? '-1deg' : '1deg'})`,
              }}
            >
              <CardContent className="h-full p-0">
                <div className="flex h-full flex-col justify-between">
                  <p className="whitespace-pre-wrap text-lg font-medium text-slate-800 line-clamp-6">
                    {memo.content}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-slate-500 font-medium">
                      {memo.createdAt.toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMemo(memo.id)}
                      className="h-8 w-8 text-slate-600 hover:bg-yellow-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
              {/* Paper shadow effect */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-300/30 rounded-bl-xl shadow-inner pointer-events-none" />
            </Card>
          ))}
          {memos.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400">
              <p>기록된 메모가 없습니다. 첫 메모를 작성해 보세요!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}