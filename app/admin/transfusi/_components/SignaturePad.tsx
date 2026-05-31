'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export interface SignaturePadHandle {
  getDataURL: () => string | null
  clear: () => void
  isEmpty: () => boolean
}

/**
 * Imperative signature canvas built on react-signature-canvas.
 * The canvas is immediately active — no click-to-start required.
 * Use the ref to read the signature at form-submit time.
 *
 * Usage:
 *   const sigRef = useRef<SignaturePadHandle>(null)
 *   <SignaturePad ref={sigRef} id="my-canvas" />
 *   // on submit:
 *   const dataUrl = sigRef.current?.getDataURL()
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { id?: string }>(({ id }, ref) => {
  const canvasRef = useRef<SignatureCanvas>(null)

  useImperativeHandle(ref, () => ({
    getDataURL() {
      const inst = canvasRef.current
      if (!inst || inst.isEmpty()) return null
      return inst.toDataURL('image/png')
    },
    clear() {
      canvasRef.current?.clear()
    },
    isEmpty() {
      return canvasRef.current?.isEmpty() ?? true
    },
  }))

  return (
    <div className="space-y-2">
      {/* Canvas wrapper */}
      <div
        id={id ? `${id}-wrapper` : 'signature-canvas-wrapper'}
        className="rounded-xl overflow-hidden bg-white"
        style={{
          border: '2px dashed #d1d5db',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        {/* Placeholder text — sits behind the canvas via z-index */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ zIndex: 0 }}
        >
          <p className="text-gray-300 text-sm font-medium">✍️ Tanda tangan di sini</p>
        </div>

        {/* react-signature-canvas — immediately active, no overlay required */}
        <SignatureCanvas
          ref={canvasRef}
          penColor="#1a1a2e"
          minWidth={1.5}
          maxWidth={2.8}
          velocityFilterWeight={0.7}
          canvasProps={{
            id: id ?? 'signature-canvas',
            style: {
              width: '100%',
              height: '160px',
              display: 'block',
              cursor: 'crosshair',
              position: 'relative',
              zIndex: 1,
              background: 'transparent',
            },
          }}
        />
      </div>

      <button
        type="button"
        id={id ? `${id}-clear-btn` : 'clear-signature-btn'}
        onClick={() => canvasRef.current?.clear()}
        className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:text-red-600 hover:border-red-200 transition-colors"
      >
        🗑 Hapus Tanda Tangan
      </button>
    </div>
  )
})

SignaturePad.displayName = 'SignaturePad'
