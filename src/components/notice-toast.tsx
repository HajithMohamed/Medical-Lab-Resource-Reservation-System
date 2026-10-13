"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";

export interface NoticeToastProps {
  notices: Record<string, string | { message: string; type?: "success" | "error" | "info" }>;
}

export function NoticeToast({ notices }: NoticeToastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const noticeCode = searchParams.get("notice");

  React.useEffect(() => {
    if (!noticeCode) return;

    const notice = notices[noticeCode];
    if (notice) {
      if (typeof notice === "string") {
        toast.success(notice);
      } else {
        if (notice.type === "error") {
          toast.error(notice.message);
        } else if (notice.type === "info") {
          toast.info(notice.message);
        } else {
          toast.success(notice.message);
        }
      }
    }

    // Remove ?notice= from url without scroll
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("notice");
    const newQuery = nextParams.toString();
    const nextUrl = newQuery ? `${pathname}?${newQuery}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [noticeCode, notices, pathname, router, searchParams]);

  return null;
}
