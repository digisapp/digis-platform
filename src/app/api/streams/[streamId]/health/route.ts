import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple health check endpoint for stream connection monitoring
 * Returns 200 OK if the stream is accessible
 */
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ streamId: string }> }
) {
  return new NextResponse(null, { status: 200 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ streamId: string }> }
) {
  const params = await context.params;
  const { streamId } = params;

  return NextResponse.json({
    status: 'ok',
    streamId,
    timestamp: new Date().toISOString(),
  });
}
