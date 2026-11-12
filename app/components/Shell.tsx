'use client';
/* #viewport (mặt bàn --page) bọc #stage (tấm 1600×900 bo góc, nổi trên mặt bàn).
   Hàm fit gán transform:scale() vào style inline của #stage. Lề quanh shell do `scale:.94` trên #viewport
   trong globals.css sinh ra — thuộc tính rời, trình duyệt NHÂN với transform này thay vì đè lên.

   Màn hình nhỏ (điện thoại): co cả tấm cho vừa thì chữ còn 3–4px. Khi hệ số vừa khít < PAN_BELOW, chuyển sang
   chế độ "pan": co theo CHIỀU CAO (không nhỏ hơn PAN_MIN), tấm rộng hơn màn hình và cuộn ngang / dọc được,
   chụm hai ngón để thu nhỏ xem toàn cảnh. #pan là khung có đúng kích thước sau khi co, để thanh cuộn khớp. */
import { useLayoutEffect, useState, type ReactNode } from 'react';
import { CV } from '@/lib/tokens';

const PAN_BELOW = 0.6;  // vừa khít mà nhỏ hơn mức này ⇒ chữ quá nhỏ, chuyển sang cuộn
const PAN_MIN = 0.75;   // trong chế độ cuộn, chữ không nhỏ hơn 75% kích thước gốc

export function Shell({ id = 'stage', className, children }: {
  id?: 'stage' | 'login';
  className?: string;
  children: ReactNode;
}) {
  const [fit, setFit] = useState<{ s: number; pan: boolean } | null>(null);

  useLayoutEffect(() => {
    const onResize = () => {
      const f = Math.min(innerWidth / CV.w, innerHeight / CV.h); // không chặn trên 1: màn lớn thì phóng cho đầy
      const next = f >= PAN_BELOW ? { s: f, pan: false } : { s: Math.min(1, Math.max(PAN_MIN, innerHeight / CV.h)), pan: true };
      // visualViewport cũng báo khi chụm ngón phóng to: giữ nguyên state nếu số không đổi để khỏi vẽ lại
      setFit((p) => (p && p.s === next.s && p.pan === next.pan ? p : next));
    };
    // Xoay máy: một số trình duyệt điện thoại (Safari iOS) báo `resize` TRƯỚC khi innerWidth/innerHeight đổi,
    // nên tính lại thêm một lần sau khi xoay xong, và nghe cả orientationchange / visualViewport.
    let t: ReturnType<typeof setTimeout> | undefined;
    const later = () => { onResize(); clearTimeout(t); t = setTimeout(onResize, 350); };
    onResize();
    addEventListener('resize', later);
    addEventListener('orientationchange', later);
    visualViewport?.addEventListener('resize', later);
    // Lưới an toàn: theo dõi chính khung trang, bắt được cả lúc trình duyệt đổi kích thước mà không phát sự kiện.
    const ro = new ResizeObserver(later);
    ro.observe(document.documentElement);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      removeEventListener('resize', later);
      removeEventListener('orientationchange', later);
      visualViewport?.removeEventListener('resize', later);
    };
  }, []);

  const s = fit?.s ?? 1;
  const stage = (
    <div id={id} className={className || undefined}
         style={{ transform: `scale(${s})`, visibility: fit === null ? 'hidden' : undefined }}>
      {children}
    </div>
  );

  if (fit?.pan) {
    return (
      <div id="viewport" className="pan">
        <div id="pan" style={{ width: CV.w * s, height: CV.h * s }}>{stage}</div>
      </div>
    );
  }
  return <div id="viewport">{stage}</div>;
}
