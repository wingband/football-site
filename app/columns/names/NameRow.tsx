"use client"

import { useState } from "react"

export default function NameRow({ name, ko }: { name: string; ko: string }) {
  const [value, setValue] = useState(ko)
  const [saved, setSaved] = useState(ko)
  const [state, setState] = useState<"" | "saving" | "error">("")

  async function save() {
    setState("saving")
    const res = await fetch("/api/columns/names", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ko: value }),
    }).catch(() => null)
    if (res?.ok) {
      setSaved(value.trim())
      setState("")
    } else setState("error")
  }

  const dirty = value.trim() !== saved
  return (
    <li className="flex items-center gap-2 py-2">
      <span className="w-1/2 text-xs text-floodlight/60 truncate" title={name}>{name}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={20}
        className="flex-1 min-w-0 bg-turf/60 border border-turf-line rounded px-2 py-1 text-sm text-floodlight focus:outline-none focus:border-score-amber"
      />
      <button
        onClick={save}
        disabled={!dirty || !value.trim() || state === "saving"}
        className="text-xs px-2 py-1 rounded bg-score-amber text-pitch-night font-bold disabled:opacity-30"
      >
        {state === "saving" ? "…" : state === "error" ? "다시" : "저장"}
      </button>
    </li>
  )
}
