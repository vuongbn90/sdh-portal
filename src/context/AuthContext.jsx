import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext(null)

const normalizeRole = (role) => String(role || 'guest').trim().toLowerCase()

async function inferProfileFromEmail(authUser) {
  if (!authUser?.email) return null

  const email = authUser.email

  const { data: student } = await supabase
    .from('students')
    .select('id,email,full_name,phone')
    .eq('email', email)
    .maybeSingle()

  if (student?.id) {
    return {
      auth_user_id: authUser.id,
      email,
      full_name: student.full_name || email,
      phone: student.phone || null,
      role: 'student',
      student_id: student.id,
      faculty_id: null,
    }
  }

  const { data: faculty } = await supabase
    .from('faculty')
    .select('id,email,full_name,phone')
    .eq('email', email)
    .maybeSingle()

  if (faculty?.id) {
    return {
      auth_user_id: authUser.id,
      email,
      full_name: faculty.full_name || email,
      phone: faculty.phone || null,
      role: 'faculty',
      student_id: null,
      faculty_id: faculty.id,
    }
  }

  return {
    auth_user_id: authUser.id,
    email,
    full_name: authUser.user_metadata?.full_name || email,
    role: email === 'admin@vaa.edu.vn' ? 'admin' : 'student',
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProfile = async (authUser) => {
    if (!authUser?.id) {
      setProfile(null)
      setPermissions([])
      return null
    }

    let currentProfile = null

    // 1) Ưu tiên tìm bằng auth_user_id
    const { data: byAuth, error: byAuthError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    if (byAuthError) console.error(byAuthError)
    currentProfile = byAuth || null

    // 2) Nếu chưa có auth_user_id, tìm bằng email rồi cập nhật auth_user_id
    if (!currentProfile && authUser.email) {
      const { data: byEmail, error: byEmailError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle()

      if (byEmailError) console.error(byEmailError)

      if (byEmail?.id) {
        const { data: updated, error: updateError } = await supabase
          .from('profiles')
          .update({ auth_user_id: authUser.id, role: normalizeRole(byEmail.role) })
          .eq('id', byEmail.id)
          .select('*')
          .single()

        if (updateError) console.error(updateError)
        currentProfile = updated || { ...byEmail, auth_user_id: authUser.id, role: normalizeRole(byEmail.role) }
      }
    }

    // 3) Nếu chưa có profile thì tự tạo theo email khớp students/faculty
    if (!currentProfile) {
      const payload = await inferProfileFromEmail(authUser)
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert([payload])
        .select('*')
        .single()

      if (createError) console.error(createError)
      currentProfile = created || payload
    }

    // Chuẩn hóa role chữ thường để MainLayout nhận đúng student/faculty/admin
    if (currentProfile?.id && currentProfile.role !== normalizeRole(currentProfile.role)) {
      const { data: normalized } = await supabase
        .from('profiles')
        .update({ role: normalizeRole(currentProfile.role) })
        .eq('id', currentProfile.id)
        .select('*')
        .single()
      currentProfile = normalized || { ...currentProfile, role: normalizeRole(currentProfile.role) }
    } else if (currentProfile) {
      currentProfile = { ...currentProfile, role: normalizeRole(currentProfile.role) }
    }

    setProfile(currentProfile || null)

    if (currentProfile?.id) {
      const { data: access, error: accessError } = await supabase
        .from('v_user_access')
        .select('permission_code')
        .eq('profile_id', currentProfile.id)

      if (accessError) console.error(accessError)
      const list = [...new Set((access || []).map((x) => x.permission_code).filter(Boolean))]
      setPermissions(list)
    } else {
      setPermissions([])
    }

    return currentProfile
  }

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return
      const authUser = data?.user || null
      setUser(authUser)
      await loadProfile(authUser)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const authUser = session?.user || null
      setUser(authUser)
      await loadProfile(authUser)
      setLoading(false)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const value = useMemo(() => ({
    user,
    profile,
    role: normalizeRole(profile?.role),
    studentId: profile?.student_id || null,
    facultyId: profile?.faculty_id || null,
    permissions,
    loading,
    hasPermission: (code) => permissions.includes(code) || permissions.includes('admin.full_access'),
    signOut: () => supabase.auth.signOut(),
    reloadProfile: () => loadProfile(user),
  }), [user, profile, permissions, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
