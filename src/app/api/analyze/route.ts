import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced extract text with content validation (CONSERVATIVE ADDITION)
async function extractText(file: File): Promise<string> {
  // Basic file validation (NEW - prevents empty files)
  if (file.size === 0) {
    throw new Error('File appears to be empty. Please select a valid file with content.');
  }

  // Large file warning (NEW - practical limit)
  if (file.size > 10 * 1024 * 1024) { // 10MB
    console.warn(`Large file uploaded: ${file.size} bytes`);
  }

  const text = await file.text();
  
  if (file.type === 'application/pdf') {
    // ENHANCED: Check if we actually got text from the PDF
    if (text && text.length > 50) {
      // PDF had readable text - use it (NEW PATH)
      console.log(`📄 PDF text extracted: ${text.length} characters`);
      return text;
    } else {
      // PDF was likely scanned/image-based - use your existing fallback (KEEP WORKING APPROACH)
      console.log('📄 PDF appears to be scanned - using analysis prompt');
      return `You are a consumer protection expert analyzing this home services quote document: "${file.name}".

CRITICAL ANALYSIS REQUIREMENTS:

**1. Service Identification & Scope Assessment:**
- Identify the specific service type (HVAC, Roofing, Plumbing, Electrical, etc.)
- Evaluate if the proposed scope matches typical requirements for this service
- Assess whether the solution appears appropriate, excessive, or insufficient

**2. Pricing & Value Analysis:**
- Break down all costs (labor, materials, permits, markup)
- Identify any unusually high or unclear charges
- Flag any pricing that seems significantly above or below market expectations
- Look for hidden fees or ambiguous line items

**3. Contract Terms & Red Flag Detection:**
- Identify high-pressure sales language (urgency phrases, limited-time offers, immediate danger claims)
- Check for overly broad warranty terms or unclear service descriptions
- Flag any bundled services that lack proper itemization
- Note unusual financing terms or payment structures
- Look for vague or proprietary technology claims

**4. Professional Assessment:**
- Evaluate contractor credentials and licensing information (if provided)
- Assess timeline reasonableness for the proposed work
- Check for proper insurance and bonding references
- Review material specifications and quality indicators

**5. Consumer Protection Recommendations:**
- Suggest specific questions the customer should ask
- Recommend areas for negotiation or clarification
- Advise whether additional quotes should be obtained
- Highlight what elements of a fair quote might be missing

**ANALYSIS APPROACH:** Be thorough but fair. Protect consumers from genuinely problematic practices while not attacking legitimate businesses. Focus on transparency, value, and consumer education.

Provide your analysis in structured JSON format with clear sections for each area above.`;
    }
  }
  
  // For non-PDF files, validate content length (NEW - prevents hallucination)
  const finalText = text || `Please analyze this home services quote file: ${file.name}`;
  
  if (finalText.length < 20 && !file.type.includes('pdf')) {
    throw new Error(`Could not extract readable content from ${file.name}. Please try uploading as a text file (.txt) or ensure the file contains readable text.`);
  }

  return finalText;
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

    // Extract text from file (ENHANCED but backwards compatible)
    let text;
    try {
      text = await extractText(file);
    } catch (extractionError) {
      // NEW: Better error handling with file type guidance
      const errorMessage = extractionError instanceof Error ? extractionError.message : 'Failed to process file';
      
      return NextResponse.json(
        { 
          ok: false, 
          error: errorMessage,
          file_type_guidance: {
            supported_formats: ['Text files (.txt)', 'PDF documents', 'Word documents'],
            tips: [
              'For best results, use clear text files',
              'PDFs work well if they contain selectable text',
              'Scanned documents may have limited text extraction'
            ]
          }
        },
        { status: 400 }
      );
    }

    console.log(`📝 Extracted text length: ${text.length} characters`);

    // NEW: Content quality assessment (doesn't break existing flow)
    const contentWarnings = [];
    if (text.length < 100) {
      contentWarnings.push('Limited content detected - analysis may be less detailed');
    }

    // Check for quote-related keywords (NEW - helps validate content)
    const quoteKeywords = ['quote', 'estimate', 'cost', 'labor', 'materials', 'total', 'service', '$', 'price'];
    const hasQuoteContent = quoteKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (!hasQuoteContent && text.length < 200) {
      contentWarnings.push('File may not contain a service quote - please verify correct document');
    }

    // Call OpenAI for analysis (KEEP EXISTING APPROACH)
    console.log('🤖 Sending to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-40',
      messages: [
        {
          role: 'system',
          content: 'You are a home services quote analysis expert. Analyze the provided quote and return a detailed JSON response with insights about cost, quality, timeline, and potential issues. IMPORTANT: Only use information that is actually present in the provided text. Do not invent details that are not explicitly stated.'
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

    // Parse the JSON response (KEEP EXISTING LOGIC)
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      
      // NEW: Add processing metadata without breaking existing structure
      if (contentWarnings.length > 0) {
        analysis.processing_warnings = contentWarnings;
      }
      
    } catch (parseError) {
      // Keep existing error handling
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

// ENHANCED: Keep existing response structure, add optional warnings
const response: any = {
  ok: true,
  analysis,
  filename: file.name,
  filesize: file.size
};

// Add warnings if present (doesn't break existing frontend)
if (contentWarnings.length > 0) {
  response.warnings = contentWarnings;
}

return NextResponse.json(response);

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
