import { supabase, isSupabaseConfigured } from './supabase'

const fallback = {
  cards: [
    { key:'students', title:'Học viên cao học', value:523, icon:'🎓', trend:'+8%' },
    { key:'phd_students', title:'Nghiên cứu sinh', value:85, icon:'👨‍🎓', trend:'+8%' },
    { key:'faculty', title:'Giảng viên', value:96, icon:'👨‍🏫', trend:'+8%' },
    { key:'research_topics', title:'Đề tài nghiên cứu', value:421, icon:'📁', trend:'+8%' },
    { key:'councils', title:'Hội đồng', value:76, icon:'👥', trend:'+8%' },
    { key:'theses', title:'Luận văn/Luận án', value:18, icon:'📚', trend:'+8%' },
  ],
  news: [
    { title:'Thông báo lịch bảo vệ luận văn tháng 07/2026', published_at:'2026-06-25' },
    { title:'Hướng dẫn nộp hồ sơ đăng ký bảo vệ', published_at:'2026-06-20' },
  ],
  tasks: [
    { title:'Hồ sơ chờ duyệt', description:'Hồ sơ học viên, NCS mới', count:12 },
    { title:'Phân công hội đồng', description:'Chờ phân công hội đồng bảo vệ', count:7 },
    { title:'Điểm chờ xác nhận', description:'Điểm học phần, điểm luận văn/luận án', count:15 },
  ]
}

export async function getCount(table){
  if(!isSupabaseConfigured) return null
  const { count, error } = await supabase.from(table).select('*', { count:'exact', head:true })
  if(error) { console.warn(error); return null }
  return count ?? 0
}

export async function getDashboardData(){
  if(!isSupabaseConfigured) return fallback
  const tables = ['students','phd_students','faculty','research_topics','councils','theses']
  const counts = await Promise.all(tables.map(getCount))
  const cards = fallback.cards.map((c,i)=>({ ...c, value: counts[i] ?? c.value }))
  const { data: news } = await supabase.from('news').select('title,published_at').order('published_at',{ascending:false}).limit(5)
  const { data: tasks } = await supabase.from('tasks').select('title,description,status,due_date').limit(5)
  return { cards, news: news?.length ? news : fallback.news, tasks: tasks?.length ? tasks.map((t,i)=>({...t,count:[12,7,15][i]||1})) : fallback.tasks }
}
