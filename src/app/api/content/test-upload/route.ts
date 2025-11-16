import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Test upload endpoint to diagnose issues
 */
export async function POST(request: NextRequest) {
  const diagnostics: any = {
    step: 'init',
    timestamp: new Date().toISOString(),
  };

  try {
    // Step 1: Auth check
    diagnostics.step = 'auth';
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      diagnostics.authError = authError?.message;
      return NextResponse.json({
        error: 'Authentication failed',
        diagnostics
      }, { status: 401 });
    }

    diagnostics.userId = user.id;
    diagnostics.userEmail = user.email;

    // Step 2: Parse form data
    diagnostics.step = 'parse_form';
    let formData: FormData;
    try {
      formData = await request.formData();
      diagnostics.formFields = Array.from(formData.keys());
    } catch (parseError: any) {
      diagnostics.parseError = parseError.message;
      return NextResponse.json({
        error: 'Failed to parse form data',
        diagnostics
      }, { status: 400 });
    }

    // Step 3: Get file
    diagnostics.step = 'get_file';
    const file = formData.get('file') as File;

    if (!file) {
      diagnostics.filePresent = false;
      return NextResponse.json({
        error: 'No file provided',
        diagnostics
      }, { status: 400 });
    }

    diagnostics.file = {
      name: file.name,
      type: file.type,
      size: file.size,
    };

    // Step 4: List storage buckets
    diagnostics.step = 'list_buckets';
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

      if (bucketsError) {
        diagnostics.bucketsError = bucketsError.message;
      } else {
        diagnostics.buckets = buckets?.map(b => ({ id: b.id, name: b.name, public: b.public }));
      }
    } catch (listError: any) {
      diagnostics.listBucketsError = listError.message;
    }

    // Step 5: Test upload to content bucket
    diagnostics.step = 'test_upload';
    const testFileName = `test/${user.id}/diagnostic-${Date.now()}.txt`;
    const testContent = new Blob(['Test upload from diagnostic endpoint'], { type: 'text/plain' });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content')
      .upload(testFileName, testContent, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      diagnostics.uploadError = {
        message: uploadError.message,
        name: uploadError.name,
        status: (uploadError as any).statusCode,
      };
    } else {
      diagnostics.uploadSuccess = true;
      diagnostics.uploadPath = uploadData?.path;

      // Clean up test file
      await supabase.storage.from('content').remove([testFileName]);
      diagnostics.testFileCleanedUp = true;
    }

    // Step 6: Check environment variables
    diagnostics.step = 'check_env';
    diagnostics.env = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
    };

    diagnostics.step = 'complete';
    return NextResponse.json({
      success: !uploadError,
      message: uploadError ? 'Upload test failed' : 'All diagnostics passed',
      diagnostics
    }, { status: uploadError ? 500 : 200 });

  } catch (error: any) {
    diagnostics.step = 'error';
    diagnostics.error = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3),
    };

    return NextResponse.json({
      error: 'Diagnostic test failed',
      diagnostics
    }, { status: 500 });
  }
}
