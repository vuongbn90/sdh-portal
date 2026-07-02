const KEY='sdh_portal_user'
export function getCurrentUser(){
  const raw=localStorage.getItem(KEY)
  return raw?JSON.parse(raw):null
}
export function login(email,password){
  if(email && password){
    const user={email, full_name: email==='admin@vaa.edu.vn'?'Bùi Nhất Vương':email, role: email.includes('admin')?'ADMIN':'USER'}
    localStorage.setItem(KEY,JSON.stringify(user)); return {ok:true,user}
  }
  return {ok:false,message:'Vui lòng nhập email và mật khẩu'}
}
export function logout(){ localStorage.removeItem(KEY) }
