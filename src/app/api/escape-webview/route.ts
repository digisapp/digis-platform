import { NextRequest, NextResponse } from 'next/server';

/**
 * Android in-app browser escape via fake PDF response.
 *
 * How it works:
 * 1. Middleware detects Android in-app browser, serves interstitial that
 *    auto-redirects here with ?dest=<original_url>
 * 2. This route checks the user-agent:
 *    - Still in-app browser → returns Content-Type: application/pdf
 *      Instagram/TikTok/etc WebViews can't handle PDFs, so they hand off
 *      to the system browser (Chrome)
 *    - Real browser (Chrome opened it) → 302 redirect to destination
 * 3. User lands on the real page in Chrome, never saw the interstitial
 */

function isInAppBrowser(ua: string): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|musical_ly|TikTok|BytedanceWebview|Snapchat|Twitter|LinkedInApp/i.test(ua);
}

export async function GET(request: NextRequest) {
  const dest = request.nextUrl.searchParams.get('dest');

  if (!dest) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Validate destination is same-origin to prevent open redirect
  try {
    const destUrl = new URL(dest);
    const reqUrl = new URL(request.url);
    if (destUrl.origin !== reqUrl.origin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const ua = request.headers.get('user-agent') || '';

  if (isInAppBrowser(ua)) {
    // Fake PDF response — WebView can't handle it, delegates to system browser
    // The system browser will re-request this same URL but with a real browser UA
    return new NextResponse('', {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=redirect.pdf',
        'Content-Transfer-Encoding': 'binary',
        'Accept-Ranges': 'bytes',
      },
    });
  }

  // Real browser — redirect to destination
  return NextResponse.redirect(dest);
}
