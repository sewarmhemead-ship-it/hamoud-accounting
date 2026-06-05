import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { chatApi, profileApi, presenceApi } from '../api'
import { useAuthStore } from '../store/auth.store'
import { useUiStore } from '../store/auth.store'
import PageHeader from '../components/PageHeader'
import GlassPanel from '../components/ui/GlassPanel'
import ThreadList from '../components/chat/ThreadList'
import MessageBubble from '../components/chat/MessageBubble'
import UserAvatar from '../components/chat/UserAvatar'
import ChatComposer from '../components/chat/ChatComposer'

export default function MessagesPage() {
  const user = useAuthStore((s) => s.user)
  const showToast = useUiStore((s) => s.showToast)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const threadParam = searchParams.get('thread')
  const [activeThread, setActiveThread] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const bottomRef = useRef(null)

  const { data: threadsRes } = useQuery({
    queryKey: ['chat', 'threads'],
    queryFn: () => chatApi.listThreads(),
    refetchInterval: 15_000,
  })

  const { data: onlineRes } = useQuery({
    queryKey: ['presence', 'online'],
    queryFn: () => presenceApi.listOnline(),
    refetchInterval: 30_000,
  })

  const { data: directoryRes } = useQuery({
    queryKey: ['profile', 'directory'],
    queryFn: () => profileApi.directory(),
    enabled: showNew,
  })

  const threads = threadsRes?.data || []
  const onlineUsers = onlineRes?.data || []

  useEffect(() => {
    if (threadParam && threads.length) {
      const t = threads.find((x) => String(x.id) === threadParam)
      if (t) setActiveThread(t)
    }
  }, [threadParam, threads])

  const { data: messagesRes, isLoading: loadingMessages } = useQuery({
    queryKey: ['chat', 'messages', activeThread?.id],
    queryFn: () => chatApi.getMessages(activeThread.id),
    enabled: !!activeThread?.id,
    refetchInterval: 8_000,
  })

  const messages = messagesRes?.data || []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeThread?.id])

  const sendMutation = useMutation({
    mutationFn: (body) => chatApi.sendMessage(activeThread.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat'] })
    },
    onError: (e) => showToast(e.message || 'فشل الإرسال', 'error'),
  })

  const startDmMutation = useMutation({
    mutationFn: (userId) => chatApi.startDirect(userId),
    onSuccess: (res) => {
      setShowNew(false)
      const thread = { ...res.data, peer: res.data.peer }
      setActiveThread(thread)
      setSearchParams({ thread: String(res.data.id) })
      queryClient.invalidateQueries({ queryKey: ['chat', 'threads'] })
    },
    onError: (e) => showToast(e.message || 'تعذّر بدء المحادثة', 'error'),
  })

  function handleSelectThread(t) {
    setActiveThread(t)
    setSearchParams({ thread: String(t.id) })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="الرسائل"
        subtitle="تواصل مع المحاسبين — مشاركة حركات وتقارير وشحنات"
        actions={
          <button type="button" className="btn-primary !py-2 !px-4" onClick={() => setShowNew(true)}>
            ＋ محادثة جديدة
          </button>
        }
      />

      {onlineUsers.length > 0 && (
        <GlassPanel title="متصلون الآن" subtitle={`${onlineUsers.length} محاسب`} noPadding className="!p-4">
          <div className="flex gap-4 overflow-x-auto pb-1">
            {onlineUsers.map((u) => (
              <button
                key={u.user_id}
                type="button"
                onClick={() => startDmMutation.mutate(u.user_id)}
                className="flex flex-col items-center gap-1.5 shrink-0 group"
              >
                <UserAvatar
                  name={u.display_name}
                  avatarUrl={u.avatar_url}
                  isOnline
                  size={52}
                />
                <span className="text-[10px] text-ink-soft group-hover:text-accent transition-colors max-w-[64px] truncate">
                  {u.display_name}
                </span>
              </button>
            ))}
          </div>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 min-h-[520px]">
        <GlassPanel title="المحادثات" className="lg:max-h-[calc(100vh-220px)] overflow-y-auto">
          <ThreadList
            threads={threads}
            activeId={activeThread?.id}
            onSelect={handleSelectThread}
          />
        </GlassPanel>

        <GlassPanel
          noPadding
          className="flex flex-col min-h-[480px] lg:max-h-[calc(100vh-220px)] overflow-hidden"
        >
          {activeThread ? (
            <>
              <div
                className="px-5 py-4 flex items-center gap-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <UserAvatar
                  name={activeThread.peer?.display_name}
                  avatarUrl={activeThread.peer?.avatar_url}
                  isOnline={activeThread.peer?.is_online}
                  size={40}
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/profile/${activeThread.peer?.id}`}
                    className="text-sm font-bold text-ink hover:text-accent transition-colors"
                  >
                    {activeThread.peer?.display_name}
                  </Link>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {loadingMessages ? (
                  <div className="text-center text-ink-soft text-sm py-8">جاري التحميل…</div>
                ) : (
                  messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isMine={m.sender_id === user?.id}
                    />
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              <ChatComposer
                disabled={!activeThread?.id}
                sending={sendMutation.isPending}
                onSend={(payload) => sendMutation.mutateAsync(payload)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-soft text-sm p-8 text-center">
              اختر محادثة من القائمة أو ابدأ محادثة جديدة مع أحد الزملاء
            </div>
          )}
        </GlassPanel>
      </div>

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
          onClick={() => setShowNew(false)}
        >
          <div
            className="glass-panel rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 font-bold text-ink" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              محادثة جديدة
            </div>
            <ul className="overflow-y-auto flex-1 p-2">
              {(directoryRes?.data || []).map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/[0.04] transition-colors"
                    onClick={() => startDmMutation.mutate(u.id)}
                  >
                    <UserAvatar name={u.display_name} avatarUrl={u.avatar_url} size={40} showOnline={false} />
                    <span className="text-sm font-semibold text-ink">{u.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button type="button" className="btn-secondary w-full" onClick={() => setShowNew(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
