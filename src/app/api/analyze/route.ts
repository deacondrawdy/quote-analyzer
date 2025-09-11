import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Extract text from file
async function extractText(file: File): Promise<string> {
  const text = await file.text();
  
  if (file.type === 'application/pdf') {
    // For PDF files, create a descriptive analysis prompt
    return `Please analyze this home services quote document named "${file.name}".
    
This appears to be a home services quote that needs detailed analysis including:

1. Service type identification (HVAC, Plumbing, Electrical, Roofing, etc.)
2. Cost analysis and pricing breakdown
3. Timeline and scheduling assessment
4. Contractor evaluation
5. Materials and labor assessment
6. Red flags or concerns
7. Overall value assessment

Please provide a comprehensive analysis of this quote.`;
  }
  
  return text || `Please analyze this home services quote file: ${file.name}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log('📁 Analysis request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`📄 Processing file: ${file.name} (${file.size} bytes)`);

    // Extract text from file
    const text = await extractText(file);
    console.log(`📝 Extracted text length: ${text.length} characters`);

    // Call OpenAI for analysis
    console.log('🤖 Sending to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a home services quote analysis expert. Analyze the provided quote and return a detailed JSON response with insights about cost, quality, timeline, and potential issues.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysisText = completion.choices[0]?.message?.content;
    console.log('✅ OpenAI analysis completed');

    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      analysis = {
        error: 'Could not parse analysis',
        raw_response: analysisText,
        file_info: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      };
    }

    console.log('🎉 Analysis complete, sending response');

    return NextResponse.json({
      ok: true,
      analysis,
      filename: file.name,
      filesize: file.size
    });

  } catch (error: any) {
    console.error('❌ Analysis failed:', error.message);
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || 'Analysis failed',
        details: 'Check your OpenAI API key and try again'
      },
      { status: 500 }
    );
  }
}