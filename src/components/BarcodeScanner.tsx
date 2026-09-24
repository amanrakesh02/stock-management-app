import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  // Called once per mount with the first decoded code; parents are expected to
  // unmount the scanner (or remount it via `key`) to scan again.
  onScan: (decodedText: string) => void
  onError?: (message: string) => void
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const isRunningRef = useRef(false)
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  const elementId = 'barcode-scanner-region'

  useEffect(() => {
    onScanRef.current = onScan
    onErrorRef.current = onError
  })

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    let cancelled = false
    let scanned = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          // html5-qrcode keeps decoding frames until stopped, so the same code
          // can arrive several times before the parent unmounts us.
          if (scanned || cancelled) return
          scanned = true
          navigator.vibrate?.(50)
          onScanRef.current(decodedText)
        },
        () => {
          // fires for every frame without a readable code — ignore
        }
      )
      .then(() => {
        if (cancelled) {
          // cleanup already ran before start finished — stop immediately
          scanner.stop().catch(() => {})
        } else {
          isRunningRef.current = true
        }
      })
      .catch((err) => {
        if (!cancelled) onErrorRef.current?.(`Camera start failed: ${err}`)
      })

    return () => {
      cancelled = true
      if (isRunningRef.current) {
        scanner.stop().catch(() => {})
        isRunningRef.current = false
      }
    }
  }, [])

  return <div id={elementId} className="w-full max-w-sm mx-auto" />
}
