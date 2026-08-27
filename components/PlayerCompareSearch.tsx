"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { PlayerSearchResult } from "@/app/api/player-search/route"
import PlayerAvatar from "@/components/PlayerAvatar"

type Slot = "player1" | "player2"

function SearchBox({
  slot,
  label,
  currentName,
  otherId,
  onPick,
}: {
  slot: Slot
  label: string
  currentName: string | null
  otherId: number | null
  onPick: (slot: Slot, id: number) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PlayerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // 입력이 멈춘 뒤에만 요청 (한 글자마다 API를 때리면 쿼터가 금방 마름)
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/player-search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setResults(d.players ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  // 바깥을 클릭하면 결과 목록 닫기
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs text-floodlight/40 mb-1.5">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={currentName ?? "선수 이름 검색 (예: 손흥민)"}
        className="w-full bg-turf/60 border border-turf-line rounded-full px-4 py-2 text-sm text-floodlight placeholder:text-floodlight/40 focus:outline-none focus:border-score-amber transition-colors"
      />

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1.5 w-full bg-pitch-night border border-turf-line rounded-lg overflow-hidden shadow-xl max-h-72 overflow-y-auto">
          {loading && <p className="px-4 py-3 text-xs text-floodlight/40">검색 중...</p>}

          {!loading && results.length === 0 && (
            <p className="px-4 py-3 text-xs text-floodlight/40">
              검색 결과가 없습니다. 로마자 이름은 4글자 이상 입력해주세요.
            </p>
          )}

          {!loading &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.id === otherId}
                onClick={() => {
                  onPick(slot, p.id)
                  setQuery("")
                  setOpen(false)
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-score-amber/10 border-b border-turf-line/30 last:border-b-0 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <PlayerAvatar
                  src={p.photo}
                  alt={p.name}
                  className="w-8 h-8 rounded-full object-cover bg-turf-line shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-floodlight truncate">{p.name}</span>
                  <span className="block text-xs text-floodlight/40 truncate">
                    {[p.team, p.league].filter(Boolean).join(" · ") || "소속 정보 없음"}
                  </span>
                </span>
                {p.id === otherId && (
                  <span className="text-[10px] text-score-amber shrink-0">선택됨</span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

export default function PlayerCompareSearch({
  player1Id,
  player2Id,
  player1Name,
  player2Name,
}: {
  player1Id: number | null
  player2Id: number | null
  player1Name: string | null
  player2Name: string | null
}) {
  const router = useRouter()

  function pick(slot: Slot, id: number) {
    const next = {
      player1: slot === "player1" ? id : player1Id,
      player2: slot === "player2" ? id : player2Id,
    }
    const qs = new URLSearchParams()
    if (next.player1) qs.set("player1", String(next.player1))
    if (next.player2) qs.set("player2", String(next.player2))
    router.push(`/compare?${qs.toString()}`)
  }

  function swap() {
    if (!player1Id || !player2Id) return
    router.push(`/compare?player1=${player2Id}&player2=${player1Id}`)
  }

  return (
    <div className="bg-turf/40 border border-turf-line/50 p-4 sm:p-5">
      <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 sm:gap-4 items-end">
        <SearchBox
          slot="player1"
          label="선수 1"
          currentName={player1Name}
          otherId={player2Id}
          onPick={pick}
        />

        <button
          type="button"
          onClick={swap}
          disabled={!player1Id || !player2Id}
          aria-label="두 선수 위치 바꾸기"
          className="hidden sm:block mb-1 px-2.5 py-2 text-sm text-floodlight/50 hover:text-score-amber disabled:opacity-30 disabled:hover:text-floodlight/50 transition-colors"
        >
          ⇄
        </button>

        <SearchBox
          slot="player2"
          label="선수 2"
          currentName={player2Name}
          otherId={player1Id}
          onPick={pick}
        />
      </div>
    </div>
  )
}
