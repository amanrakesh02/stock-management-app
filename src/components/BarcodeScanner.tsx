import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onScan: (decodedText: string) => void
  onError?: (message: string) => void
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isRunningRef = useRef(false)
  const elementId = 'barcode-scanner-region'

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner
    let cancelled = false

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText)
        },
        (errorMessage) => {
          console.log('scan attempt:' , errorMessage)
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
        onError?.(`Camera start failed: ${err}`)
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