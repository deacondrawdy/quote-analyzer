import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Aggressive truncation to stay under rate limits
function truncateText(text: string, maxTokens: number = 5000): string {
  // Conservative estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4; // 20,000 characters = ~5k tokens
  
  if (text.length <= maxChars) {
    console.log(`Text length ${text.length} characters - no truncation needed`);
    return text;
  }
  
  console.log(`Truncating text from ${text.length} to ${maxChars} characters to stay under rate limits`);
  return text.substring(0, maxChars) + "\n\n[Document truncated due to length - analysis based on first portion of document]";
}

// Enhanced extract text with content validation and truncation
async function extractText(file: File): Promise<string> {
  // Basic file validation
  if (file.size === 0) {
    throw new Error('File appears to be empty. Please select a valid file with content.');
  }

  // Large file warning
  if (file.size > 10 * 1024 * 1024) { // 10MB
    console.warn(`Large file uploaded: ${file.size} bytes`);
  }

  let text = '';
  
  try {
    text = await file.text();
  } catch (error) {
    throw new Error(`Failed to read file: ${file.name}. Please try a different file format.`);
  }
  
  if (file.type === 'application/pdf') {
    // Check if we actually got text from the PDF
    if (text && text.length > 50) {
      // PDF had readable text - use it
      console.log(`PDF text extracted: ${text.length} characters`);
      const truncatedText = truncateText(text);
      return truncatedText;
    } else {
      // PDF was likely scanned/image-based - use enhanced analysis prompt
      console.log('PDF appears to be scanned - using enhanced analysis prompt');
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

IMPORTANT: Only use information that is actually present in the provided text. Do not invent details that are not explicitly stated.

Provide your analysis in structured JSON format with clear sections for each area above.`;
    }
  }
  
  // For non-PDF files, validate content length and truncate
  const finalText = text || `Please analyze this home services quote file: ${file.name}`;
  
  if (finalText.length < 20 && !file.type.includes('pdf')) {
    throw new Error(`Could not extract readable content from ${file.name}. Please try uploading as a text file (.txt) or ensure the file contains readable text.`);
  }

  // Apply truncation to all text content
  return truncateText(finalText);
}

export async function POST(request: NextRequest) {
  try {
    console.log('Analysis request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`);

    // Extract and truncate text from file
    let text;
    try {
      text = await extractText(file);
    } catch (extractionError) {
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
              'Scanned documents may have limited text extraction',
              'Large files are automatically truncated to prevent rate limit issues'
            ]
          }
        },
        { status: 400 }
      );
    }

    console.log(`Final text length: ${text.length} characters`);

    // Content quality assessment
    const contentWarnings = [];
    if (text.length < 100) {
      contentWarnings.push('Limited content detected - analysis may be less detailed');
    }

    // Check for quote-related keywords
    const quoteKeywords = ['quote', 'estimate', 'cost', 'labor', 'materials', 'total', 'service', '$', 'price'];
    const hasQuoteContent = quoteKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    );

    if (!hasQuoteContent && text.length < 200) {
      contentWarnings.push('File may not contain a service quote - please verify correct document');
    }

    // Call OpenAI for analysis
    console.log('Sending to OpenAI...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using smaller model to stay under rate limits
      messages: [
        {
          role: 'system',
          content: 'You are a home services quote analysis expert and consumer protection advocate. Analyze the provided quote and return a detailed JSON response with insights about cost, quality, timeline, and potential issues. IMPORTANT: Only use information that is actually present in the provided text. Do not invent details that are not explicitly stated.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000, // Limit output tokens to stay under rate limits
    });

    const analysisText = completion.choices[0]?.message?.content;
    console.log('OpenAI analysis completed');

    if (!analysisText) {
      throw new Error('No analysis returned from OpenAI');
    }

    // Parse the JSON response
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      
      // Add processing metadata without breaking existing structure
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

    console.log('Analysis complete, sending response');

    // Keep existing response structure, add optional warnings
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
    console.error('Analysis failed:', error.message);
    
    // Handle specific OpenAI rate limit errors
    if (error.message.includes('Rate limit') || error.message.includes('tokens per min')) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'Rate limit exceeded. Please wait a moment and try again with a smaller file.',
          details: 'Try uploading a shorter document or wait 60 seconds before retrying.',
          rate_limit_info: {
            suggestion: 'For large documents, consider copying just the essential quote information into a text file.'
          }
        },
        { status: 429 }
      );
    }
    
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
