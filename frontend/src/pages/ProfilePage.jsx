import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi, chatApi } from '../api'
import { useAuthStore } from '../store/auth.store'
import { useUiStore } from '../store/auth.store'
import PageHeader from '../components/PageHeader'
import GlassPanel from '../components/ui/GlassPanel'
import AvatarUpload from '../components/chat/AvatarUpload'
import UserAvatar from '../components/chat/UserAvatar'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const showToast = useUiStore((s) => s.showToast)
  const userId = id ? parseInt(id, 10) : currentUser?.id
  const isSelf = !id || userId === currentUser?.id

  const { data: profileRes, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () =>
      isSelf && !id ? profileApi.me() : profileApi.get(userId),
    enabled: !!userId,
  })

  const profile = profileRes?.data

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [showOnline, setShowOnline] = useState(1)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setShowOnline(profile.show_online ?? 1)
    }
  }, [profile?.user_id, profile?.display_name, profile?.bio, profile?.show_online])

  const saveMutation = useMutation({
    mutationFn: (body) => profileApi.updateMe(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      showToast('تم حفظ الملف الشخصي', 'success')
    },
    onError: (e) => showToast(e.message || 'فشل الحفظ', 'error'),
  })

  const avatarMutation = useMutation({
    mutationFn: (image) => profileApi.uploadAvatar(image),
    onSuccess: (res) => {
      const url = res?.data?.avatar_url
      if (url && userId) {
        queryClient.setQueryData(['profile', userId], (old) => {
          if (!old?.data) return old
          return { ...old, data: { ...old.data, avatar_url: url } }
        })
      }
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['presence'] })
      queryClient.invalidateQueries({ queryKey: ['chat'] })
      showToast('تم تحديث الصورة', 'success')
    },
    onError: (e) => showToast(e.message || 'فشل رفع الصورة', 'error'),
  })

  const dmMutation = useMutation({
    mutationFn: () => chatApi.startDirect(userId),
    onSuccess: (res) => {
      navigate(`/messages?thread=${res.data.id}`)
    },
    onError: (e) => showToast(e.message || 'تعذّر بدء المحادثة', 'error'),
  })

  if (isLoading || !profile) {
    return (
      <div className="h-64 rounded-2xl animate-pulse glass-panel" />
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <PageHeader
        title={isSelf ? 'ملفي الشخصي' : profile.display_name}
        subtitle={isSelf ? 'إدارة صورتك وحالة الاتصال' : profile.username}
      />

      <GlassPanel className="overflow-hidden">
        <div
          className="h-28 -mx-5 -mt-5 mb-6"
          style={{
            background:
              'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(99,102,241,0.08))',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        />
        <div className="-mt-20 flex flex-col items-center pb-2">
          {isSelf ? (
            <AvatarUpload
              name={profile.display_name}
              avatarUrl={profile.avatar_url}
              isOnline={profile.is_online}
              uploading={avatarMutation.isPending}
              onUpload={(img) => avatarMutation.mutate(img)}
            />
          ) : (
            <UserAvatar
              name={profile.display_name}
              avatarUrl={profile.avatar_url}
              isOnline={profile.is_online}
              size={96}
            />
          )}
          <h3 className="text-lg font-bold text-ink mt-4">{profile.display_name}</h3>
          <p className="text-xs text-ink-soft mt-1">
            {profile.role === 'admin' ? 'مدير النظام' : 'محاسب'}
            {' · '}
            <span
              className="inline-flex items-center gap-1"
              style={{ color: profile.is_online ? '#22c55e' : '#64748b' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'currentColor',
                  boxShadow: profile.is_online ? '0 0 6px currentColor' : 'none',
                }}
              />
              {profile.is_online ? 'متصل الآن' : 'غير متصل'}
            </span>
          </p>
        </div>
      </GlassPanel>

      {isSelf ? (
        <GlassPanel title="التفاصيل">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveMutation.mutate({
                display_name: displayName,
                bio,
                show_online: showOnline ? 1 : 0,
              })
            }}
          >
            <div>
              <label className="text-xs text-ink-soft font-semibold block mb-1.5">
                الاسم المعروض
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-ink-soft font-semibold block mb-1.5">
                نبذة
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full resize-none"
                placeholder="وصف قصير…"
              />
            </div>
            <label className="flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer"
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-sm font-semibold text-ink">إظهار حالة الاتصال</div>
                <div className="text-[11px] text-ink-soft mt-0.5">
                  عند الإيقاف تظهر غير متصل حتى لو كنت نشطاً
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!showOnline}
                onClick={() => setShowOnline((v) => (v ? 0 : 1))}
                className="w-12 h-7 rounded-full relative transition-colors shrink-0"
                style={{
                  background: showOnline
                    ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                    : 'rgba(255,255,255,0.12)',
                }}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ right: showOnline ? 4 : 22 }}
                />
              </button>
            </label>
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'جاري الحفظ…' : 'حفظ التغييرات'}
            </button>
          </form>
        </GlassPanel>
      ) : (
        <>
          {profile.bio && (
            <GlassPanel title="نبذة">
              <p className="text-sm text-ink-soft leading-relaxed">{profile.bio}</p>
            </GlassPanel>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => dmMutation.mutate()}
              disabled={dmMutation.isPending}
            >
              💬 مراسلة
            </button>
            <Link to="/messages" className="btn-secondary flex-1 text-center">
              الرسائل
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
