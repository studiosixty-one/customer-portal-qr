"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import type { Options } from "qr-code-styling";
import type QRCodeStyling from "qr-code-styling";

import { DEFAULT_DESIGN, type QrDesign } from "@/lib/qr/types";

export type QrPreviewHandle = {
  download: (extension: "png" | "svg") => void;
};

type Props = {
  data: string;
  design: QrDesign;
  fileName?: string;
  className?: string;
};

function buildOptions(data: string, design: QrDesign): Options {
  const d = { ...DEFAULT_DESIGN, ...design };
  const size = d.size ?? 300;
  const fg = d.foreground ?? "#000000";

  const dotsOptions: Options["dotsOptions"] = d.gradient
    ? {
        type: d.dotType,
        gradient: {
          type: "linear",
          rotation: 0,
          colorStops: [
            { offset: 0, color: fg },
            { offset: 1, color: d.gradientColor ?? fg },
          ],
        },
      }
    : { type: d.dotType, color: fg };

  return {
    width: size,
    height: size,
    type: "canvas",
    data,
    margin: d.margin,
    image: d.logo || undefined,
    qrOptions: { errorCorrectionLevel: d.errorCorrection },
    dotsOptions,
    backgroundOptions: { color: d.background ?? "#ffffff" },
    cornersSquareOptions: { type: d.cornerSquareType, color: fg },
    cornersDotOptions: { type: d.cornerDotType, color: fg },
    imageOptions: {
      crossOrigin: "anonymous",
      margin: d.logoMargin,
      imageSize: d.logoSize,
      hideBackgroundDots: true,
    },
  };
}

/**
 * Live QR preview backed by qr-code-styling. The library touches `self`/
 * `document` at import time, so it is imported lazily inside the effect and
 * never evaluated during SSR/build. Exposes an imperative `download`.
 */
export const QrPreview = forwardRef<QrPreviewHandle, Props>(function QrPreview(
  { data, design, fileName = "qr-code", className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const fileNameRef = useRef(fileName);
  fileNameRef.current = fileName;

  useImperativeHandle(ref, () => ({
    download(extension) {
      qrRef.current?.download({ name: fileNameRef.current, extension });
    },
  }));

  useEffect(() => {
    let cancelled = false;

    // No data → clear the canvas and skip rendering an invalid code.
    if (!data) {
      if (containerRef.current) containerRef.current.innerHTML = "";
      qrRef.current = null;
      return;
    }

    (async () => {
      const { default: QRCodeStylingCtor } = await import("qr-code-styling");
      if (cancelled) return;
      const options = buildOptions(data, design);
      if (!qrRef.current) {
        qrRef.current = new QRCodeStylingCtor(options);
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          qrRef.current.append(containerRef.current);
        }
      } else {
        qrRef.current.update(options);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [data, design]);

  return <div ref={containerRef} className={className} />;
});
