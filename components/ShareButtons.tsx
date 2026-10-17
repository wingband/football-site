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

  const enc = encodeURIComponent
  const xHref = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`
  const bandHref = `https://band.us/plugin/share?body=${enc(title + "\n" + url)}&route=${enc(url)}`

  // 인스타그램은 웹 링크 공유 주소가 없다. 링크를 복사하고 인스타그램을 열어 붙여넣게 안내한다.
  async function shareInstagram() {
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer")
    await copyLink("링크를 복사했어요. 인스타그램 스토리·DM에 붙여넣어 주세요")
  }

  // 모바일에서는 아이콘만(한 줄에 다 들어가게), sm 이상에서 이름까지
  const btn =
    "inline-flex items-center gap-1.5 text-xs p-2.5 sm:px-3 sm:py-2 rounded-full border transition-colors"
  const lbl = "hidden sm:inline"
  const plain = `${btn} border-turf-line text-floodlight/70 hover:text-floodlight hover:border-floodlight/40`
  const ico = "w-3.5 h-3.5"

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-floodlight/45 mr-1">공유하기</span>
        <button
          type="button"
          onClick={shareKakao}
          className={plain}
          aria-label="카카오톡으로 공유"
          title="카카오톡"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className={ico} fill="#FEE500">
            <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.8 5.3 4.6 6.7l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.5.1 1 .1 1.5.1 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
          </svg>
          <span className={lbl}>카카오톡</span>
        </button>
        <a href={xHref} target="_blank" rel="noopener noreferrer" className={plain} aria-label="X(트위터)로 공유" title="X(트위터)">
          <svg aria-hidden="true" viewBox="0 0 24 24" className={ico} fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <span className={lbl}>X(트위터)</span>
        </a>
        <a href={fbHref} target="_blank" rel="noopener noreferrer" className={plain} aria-label="페이스북으로 공유" title="페이스북">
          <svg aria-hidden="true" viewBox="0 0 24 24" className={ico} fill="currentColor">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971h-1.513c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
          </svg>
          <span className={lbl}>페이스북</span>
        </a>
        <button type="button" onClick={shareInstagram} className={plain} aria-label="인스타그램으로 공유" title="인스타그램">
          <svg aria-hidden="true" viewBox="0 0 24 24" className={ico} fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          <span className={lbl}>인스타그램</span>
        </button>
        <a href={bandHref} target="_blank" rel="noopener noreferrer" className={plain} aria-label="밴드로 공유" title="밴드">
          <span aria-hidden="true" className="w-3.5 h-3.5 rounded-[4px] bg-[#06C755] text-white text-[9px] font-bold leading-[14px] text-center">B</span>
          <span className={lbl}>밴드</span>
        </a>
        <button type="button" onClick={() => copyLink()} className={plain} aria-label="링크 복사" title="링크 복사">
          🔗<span className={lbl}>링크 복사</span>
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
