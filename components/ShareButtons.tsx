"use client"

import { useState } from "react"

// 칼럼 공유 버튼 (2026-10-11): 카카오톡 · X · 링크 복사.
//
// 카카오톡 공유는 Kakao JavaScript SDK가 필요하다. Vercel 환경변수
// NEXT_PUBLIC_KAKAO_JS_KEY(카카오 디벨로퍼스 앱의 JavaScript 키)가 있으면 SDK로
// 카카오톡 공유창을 바로 띄우고(미리보기는 페이지의 og 태그 = 칼럼 카드 이미지),
// 키가 없으면 휴대폰의 기본 공유창(navigator.share, 카카오톡 포함)을 열고,
// 그것도 안 되는 PC 브라우저에서는 링크를 복사해 안내한다.
//
// SDK는 버튼을 눌렀을 때만 불러온다(페이지 로딩을 무겁게 하지 않기 위해).
// integrity 값은 카카오 CDN의 2.8.3 파일에서 직접 계산해 확인한 값이다.
const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js"
const KAKAO_SDK_SRI = "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy"

type KakaoSDK = {
  init: (key: string) => void
  isInitialized: () => boolean
  Share: { sendScrap: (opts: { requestUrl: string }) => void }
}

declare global {
  interface Window {
    Kakao?: KakaoSDK
  }
}

let sdkPromise: Promise<KakaoSDK | null> | null = null

function loadKakao(key: string): Promise<KakaoSDK | null> {
  if (sdkPromise) return sdkPromise
  const p = new Promise<KakaoSDK | null>((resolve) => {
    if (window.Kakao) return resolve(window.Kakao)
    const s = document.createElement("script")
    s.src = KAKAO_SDK_URL
    s.integrity = KAKAO_SDK_SRI
    s.crossOrigin = "anonymous"
    s.async = true
    s.onload = () => resolve(window.Kakao ?? null)
    s.onerror = () => {
      sdkPromise = null
      resolve(null)
    }
    document.head.appendChild(s)
  }).then((k) => {
    if (k && !k.isInitialized()) k.init(key)
    return k
  })
  sdkPromise = p
  return p
}

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [toast, setToast] = useState("")

  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(""), 2500)
  }

  async function copyLink(msg = "링크를 복사했어요") {
    try {
      await navigator.clipboard.writeText(url)
      flash(msg)
    } catch {
      window.prompt("아래 링크를 복사해 주세요", url)
    }
  }

  async function shareKakao() {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (key) {
      const kakao = await loadKakao(key)
      if (kakao) {
        try {
          kakao.Share.sendScrap({ requestUrl: url })
          return
        } catch {
          // 도메인 미등록 등으로 실패하면 아래 대체 경로로
        }
      }
    }
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
      } catch {
        // 사용자가 공유창을 닫은 경우 — 아무것도 하지 않음
      }
      return
    }
    copyLink("링크를 복사했어요. 카카오톡 대화창에 붙여넣어 주세요")
  }

  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  const btn =
    "inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-full border transition-colors"

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-floodlight/45 mr-1">공유하기</span>
        <button
          type="button"
          onClick={shareKakao}
          className={`${btn} border-[#FEE500]/60 bg-[#FEE500] text-[#191919] font-bold hover:bg-[#FEE500]/90`}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
          </svg>
          카카오톡
        </button>
        <a
          href={xHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border-turf-line text-floodlight/70 hover:text-floodlight hover:border-floodlight/40`}
        >
          X
        </a>
        <button
          type="button"
          onClick={() => copyLink()}
          className={`${btn} border-turf-line text-floodlight/70 hover:text-floodlight hover:border-floodlight/40`}
        >
          🔗 링크 복사
        </button>
      </div>
      {toast && (
        <p role="status" className="absolute left-0 top-full mt-2 text-xs text-score-amber">
          {toast}
        </p>
      )}
    </div>
  )
}
