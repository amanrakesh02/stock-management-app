import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onScan: (decodedText: string) => void
  onError?: (message: string) => void
}

export default function BarcodeScanner({ onScan, onError }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const elementId = 'barcode-scanner-region'

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' }, // back camera
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          onScan(decodedText)
        },
        () => {
          // fires continuously while no code is found — ignore, not a real error
        }
      )
      .catch((err) => {
        onError?.(`Camera start failed: ${err}`)
      })

    return () => {
      scanner.stop().catch(() => {
        // already stopped or never started — safe to ignore
      })
    }
  }, [])

  return <div id={elementId} className="w-full max-w-sm mx-auto" />
}
