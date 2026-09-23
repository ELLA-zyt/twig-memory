// 临水轩各模块共用的本地访客标识（与书案对话台同源）
export function loadUid(): string {
  let uid = localStorage.getItem("linshuixuan-uid")
  if (!uid) {
    uid = `linshui-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem("linshuixuan-uid", uid)
  }
  return uid
}
