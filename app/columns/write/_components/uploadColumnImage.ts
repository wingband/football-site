// 브라우저에서 이미지를 최대 1600px로 줄인 뒤 /api/columns/upload로 올리고 URL을 돌려준다.
// 휴대폰 사진(수 MB)도 서버 요청 한도 안에 들어오게 하고, 페이지 로딩도 가볍게 하기 위함.
// GIF는 움직임이 깨지지 않게 그대로 올린다.
async function downscale(file: File, maxSide = 1600): Promise<Blob> {
  if (file.type === "image/gif") return file
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85))
  return out ?? file
}

export async function uploadColumnImage(file: File): Promise<string> {
  const blob = await downscale(file)
  const type = blob.type || file.type
  const ext = type.split("/")[1] ?? "jpg"
  const form = new FormData()
  form.append("file", new File([blob], `image.${ext}`, { type }))
  const res = await fetch("/api/columns/upload", { method: "POST", body: form })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? "업로드에 실패했습니다")
  return data.url as string
}
