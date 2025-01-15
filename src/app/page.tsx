'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { Toaster } from 'sonner'

const PROXY_SOURCES = process.env.NEXT_PUBLIC_PROXY_NODES?.split(',').map((node, index) => ({
  id: `节点${index + 1}`,
  url: node.trim()
})) || []


const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return (window as any).__NEXT_PUBLIC_BASE_URL__ || '';
  }
  return process.env.NODE_ENV === 'development' ? '' : (process.env.NEXT_PUBLIC_DOMAIN || '');
};

export default function Home() {
  const [url, setUrl] = useState("")
  const [testing, setTesting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [speeds, setSpeeds] = useState<{[key: string]: number}>({})
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<string[]>([])
  const messagesRef = useRef<HTMLDivElement>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [adminPassword, setAdminPassword] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null)

  const testSpeed = async () => {
    if (!url.includes('github.com')) {
      toast.error('请输入正确的 GitHub 链接')
      return
    }
    
    setTesting(true)
    setProgress(0)
    setSpeeds({})
    setIsOpen(true)
    
    const results: {[key: string]: number} = {}
    const totalNodes = PROXY_SOURCES.length
    let completedNodes = 0


    await Promise.all(
      PROXY_SOURCES.map(async ({ id, url: nodeUrl }) => {
        try {
          const startTime = Date.now()
          await Promise.race([
            fetch(`https://${nodeUrl}`, { method: 'HEAD' }),
            new Promise((_, reject) => setTimeout(() => reject(), 3000)) // 减少超时时间到3秒
          ])
          results[id] = Date.now() - startTime
        } catch {
          results[id] = -1
        }
        completedNodes++
        setProgress((completedNodes / totalNodes) * 100)
        setSpeeds(prev => ({ ...prev, [id]: results[id] }))
      })
    )

    setTesting(false)
  }


  const downloadFile = async (source: string) => {
    if (!url) return
    if (speeds[source] === -1 || speeds[source] > 5000) {
      toast.error('该节点连接失败或延迟过高，请选择其他节点')
      return
    }
    
    try {
      const downloadUrl = `https://${source}/${url}`
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = url.split('/').pop() || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setIsOpen(false)
      toast.success('开始下载...')
    } catch (error) {
      toast.error('下载失败，请尝试其他节点')
    }
  }


  const getSortedNodes = () => {
    return Object.entries(speeds)
      .sort(([,a], [,b]) => {
        // 失败的节点放到最后
        if (a === -1) return 1
        if (b === -1) return -1
        return a - b
      })
  }


  const verifyAdmin = () => {
    setShowAdminDialog(true)
  }

  const handleAdminSubmit = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true)
      toast.success('管理员验证成功')
      setShowAdminDialog(false)
      setAdminPassword('')
    } else {
      toast.error('密码错误')
    }
  }


  const submitMessage = async () => {
    if (!message.trim()) {
      toast.error('请输入内容')
      return
    }
    
    try {
      const res = await fetch(`${getBaseUrl()}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: message.trim(),
          isAdmin,
          replyTo
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit message')
      }

      const data = await res.json()
      if (data.success) {
        setMessage('')
        setReplyTo(null)
        fetchMessages()
        toast.success('发送成功')
      }
    } catch (error) {
      console.error('Failed to submit message:', error)
      toast.error('发送失败，请稍后重试')
    }
  }


  const fetchMessages = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/messages`)
      if (!res.ok) {
        throw new Error('Failed to fetch messages')
      }
      const data = await res.json()
      if (data.messages) {
        setMessages(Array.isArray(data.messages) ? data.messages : [])
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }


  const togglePin = async (messageId: number, currentPinned: boolean) => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/messages`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messageId, 
          isPinned: !currentPinned 
        })
      })

      if (!res.ok) {
        throw new Error('Failed to update message')
      }

      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchMessages()
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      toast.error('操作失败，请稍后重试')
    }
  }


  const deleteMessage = async (messageId: number) => {
    setMessageToDelete(messageId)
    setShowDeleteDialog(true)
  }


  const confirmDelete = async () => {
    if (!messageToDelete) return
    
    try {
      const res = await fetch(`${getBaseUrl()}/api/messages`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: messageToDelete })
      })

      if (!res.ok) {
        throw new Error('Failed to delete message')
      }

      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        fetchMessages()
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
      toast.error('删除失败，请稍后重试')
    } finally {
      setShowDeleteDialog(false)
      setMessageToDelete(null)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-[#0a0f1c] to-[#020817] text-white relative">
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10" />
        
        <div className="relative">
          <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            {/* 头部区域 */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text inline-block">
                GitHub 文件加速下载
              </h1>
              <p className="mt-3 text-gray-400 text-sm">快速、稳定的 GitHub 文件下载加速服务</p>
            </div>

            {/* 主要内容区域 */}
            <div className="space-y-6">
              {/* 输入区域 */}
              <div className="bg-[#1a1f2e]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-[#2a2f3e] p-6">
                <div className="flex gap-3">
                  <Input 
                    className="h-10 text-sm bg-[#0f1219] border-[#2a2f3e] text-white placeholder:text-gray-500 focus:ring-blue-500/50"
                    placeholder="请输入 GitHub 文件链接..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button 
                    className="h-10 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-sm whitespace-nowrap relative overflow-hidden group"
                    onClick={testSpeed}
                    disabled={testing}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {testing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          <span>检测中</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span>检测节点</span>
                        </>
                      )}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"/>
                  </Button>
                </div>
              </div>

              {/* 使用说明 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 左侧：支持类型 */}
                <div className="bg-[#1a1f2e]/80 backdrop-blur-xl rounded-xl border border-[#2a2f3e] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-blue-400">支持类型</h2>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Raw 文件下载
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Release 文件下载
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      源码打包下载
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Gist 文件下载
                    </li>
                  </ul>
                </div>

                {/* 右侧：链接示例 */}
                <div className="bg-[#1a1f2e]/80 backdrop-blur-xl rounded-xl border border-[#2a2f3e] p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-purple-400">链接示例</h2>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="text-gray-400 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Raw 文件
                      </div>
                      <code className="block bg-[#0f1219] p-2 rounded text-green-400 break-all border border-[#2a2f3e]">
                        https://raw.githubusercontent.com/microsoft/vscode/main/LICENSE.txt
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        分支源码
                      </div>
                      <code className="block bg-[#0f1219] p-2 rounded text-green-400 break-all border border-[#2a2f3e]">
                        https://github.com/microsoft/vscode/archive/refs/heads/main.zip
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Releases 文件
                      </div>
                      <code className="block bg-[#0f1219] p-2 rounded text-green-400 break-all border border-[#2a2f3e]">
                        https://github.com/github/gh-ost/releases/download/v1.1.6/gh-ost
                      </code>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Releases 源码
                      </div>
                      <code className="block bg-[#0f1219] p-2 rounded text-green-400 break-all border border-[#2a2f3e]">
                        https://github.com/microsoft/vscode/archive/refs/tags/1.82.3.zip
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              {/* 留言区域 */}
              <div className="bg-[#1a1f2e]/80 backdrop-blur-xl rounded-xl border border-[#2a2f3e] overflow-hidden">
                {/* 头部 */}
                <div className="p-6 border-b border-[#2a2f3e]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-medium bg-gradient-to-r from-green-400 to-emerald-400 text-transparent bg-clip-text">用户留言</h2>
                        <p className="text-xs text-gray-400 mt-0.5">欢迎分享您的使用体验</p>
                      </div>
                    </div>
                    {!isAdmin && (
                      <button
                        onClick={verifyAdmin}
                        className="text-sm px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        管理员入口
                      </button>
                    )}
                  </div>
                </div>

                {/* 留言列表 */}
                <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2f3e] scrollbar-track-[#0f1219]">
                  <div className="p-6 space-y-4">
                    {Array.isArray(messages) && messages.map((msg: any) => (
                      <div key={msg.id} className={`group bg-[#0f1219] rounded-xl p-4 border ${
                        msg.is_pinned 
                          ? 'border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                          : 'border-[#2a2f3e] hover:border-[#3a3f4e]'
                      } transition-colors`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${msg.is_admin ? 'bg-blue-500/20' : 'bg-gray-500/20'} flex items-center justify-center`}>
                              <svg className={`w-4 h-4 ${msg.is_admin ? 'text-blue-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${msg.is_admin === 1 ? 'text-blue-400' : 'text-gray-300'}`}>
                                  {msg.is_admin === 1 ? '管理员' : '访客'}
                                </span>
                                {msg.is_pinned === 1 && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                                    置顶
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(msg.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm mt-2">{msg.content}</p>
                            </div>
                          </div>
                          {isAdmin && (
                            <div className="flex items-center gap-2">
                              {!msg.is_admin && (
                                <button
                                  onClick={() => setReplyTo(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                >
                                  回复
                                </button>
                              )}
                              <button
                                onClick={() => togglePin(msg.id, msg.is_pinned)}
                                className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs px-3 py-1.5 rounded-lg ${
                                  msg.is_pinned
                                    ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                    : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                                }`}
                              >
                                {msg.is_pinned ? '取消置顶' : '置顶'}
                              </button>
                              <button
                                onClick={() => deleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                              >
                                删除
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 回复列表 */}
                        {msg.replies && Array.isArray(msg.replies) && msg.replies.map((reply: any) => (
                          <div key={reply.id} className="mt-3 ml-11 pl-3 border-l-2 border-[#2a2f3e]">
                            <div className="bg-[#161b2e] rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                  <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                </div>
                                <span className="text-sm text-blue-400">管理员回复</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(reply.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 输入框区域 */}
                {(!replyTo || isAdmin) && (
                  <div className="p-6 border-t border-[#2a2f3e] bg-[#0f1219]/50">
                    <div className="flex gap-3">
                      <Input 
                        className="h-10 text-sm bg-[#0f1219] border-[#2a2f3e] text-white placeholder:text-gray-500"
                        placeholder={replyTo ? "输入回复内容..." : "说点什么..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitMessage()}
                      />
                      <Button
                        className="h-10 px-6 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-sm font-medium"
                        onClick={submitMessage}
                      >
                        {replyTo ? '回复' : '发送'}
                      </Button>
                      {replyTo && (
                        <Button
                          className="h-10 px-4 bg-gray-600 hover:bg-gray-700 text-sm"
                          onClick={() => setReplyTo(null)}
                        >
                          取消
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 重要提示 */}
              <div className="bg-[#1a1f2e]/80 backdrop-blur-xl rounded-xl border border-yellow-500/20 p-4">
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>公益服务，请勿滥用。加速源来自网络收集整合，在此感谢每一位分享者。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 模态框部分 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl bg-[#1a1f2e]/95 backdrop-blur-xl border-[#2a2f3e] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              选择加速节点
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              请选择一个延迟较低的节点进行下载
            </DialogDescription>
          </DialogHeader>
          
          {/* 进度条 */}
          {testing && (
            <div className="space-y-3">
              <div className="h-2 bg-[#0f1219] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent animate-shine"></div>
                </div>
              </div>
              <p className="text-sm text-gray-400 text-center">
                正在检测节点速度 ({Math.round(progress)}%)
              </p>
            </div>
          )}

          {/* 节点列表 */}
          <div className="rounded-lg border border-[#2a2f3e] overflow-hidden">
            <div className="grid grid-cols-4 text-sm font-medium bg-[#0f1219] border-b border-[#2a2f3e]">
              <div className="p-3">节点名称</div>
              <div className="p-3">延迟</div>
              <div className="p-3">状态</div>
              <div className="p-3">操作</div>
            </div>
            <div className="divide-y divide-[#2a2f3e] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#2a2f3e] scrollbar-track-[#0f1219]">
              {getSortedNodes().map(([id, speed]) => (
                <div key={id} className="grid grid-cols-4 text-sm hover:bg-[#0f1219]/50 transition-colors">
                  <div className="p-3 font-medium text-blue-400">{id}</div>
                  <div className="p-3">
                    {speed !== -1 ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        speed > 5000 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {speed}ms
                      </span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </div>
                  <div className="p-3">
                    {speed !== -1 && speed <= 5000 ? (
                      <span className="inline-flex items-center text-green-400">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        成功
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-400">
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                        失败
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <Button
                      onClick={() => downloadFile(PROXY_SOURCES.find(n => n.id === id)?.url || '')}
                      className={`text-sm px-4 relative overflow-hidden group ${
                        speed === -1 || speed > 5000
                          ? 'bg-gray-600/50 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                      disabled={speed === -1 || speed > 5000}
                    >
                      <span className="relative z-10">使用此节点下载</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 管理员登录对话框 */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="max-w-sm bg-[#1a1f2e]/95 backdrop-blur-xl border-[#2a2f3e] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              管理员验证
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              请输入管理员密码进行身份验证
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="请输入管理员密码"
              className="h-10 text-sm bg-[#0f1219] border-[#2a2f3e] text-white placeholder:text-gray-500"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminSubmit()}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              className="h-10 px-4 bg-gray-600 hover:bg-gray-700 text-sm"
              onClick={() => {
                setShowAdminDialog(false)
                setAdminPassword('')
              }}
            >
              取消
            </Button>
            <Button
              className="h-10 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-sm"
              onClick={handleAdminSubmit}
            >
              确认
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm bg-[#1a1f2e]/95 backdrop-blur-xl border-[#2a2f3e] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除留言
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              此操作将永久删除该留言及其所有回复，无法恢复
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              className="h-10 px-4 bg-gray-600 hover:bg-gray-700 text-sm"
              onClick={() => {
                setShowDeleteDialog(false)
                setMessageToDelete(null)
              }}
            >
              取消
            </Button>
            <Button
              className="h-10 px-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-sm"
              onClick={confirmDelete}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1f2e',
            border: '1px solid #2a2f3e',
            color: '#fff',
          },
        }}
      />
    </>
  )
}
