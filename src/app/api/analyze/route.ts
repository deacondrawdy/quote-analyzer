import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Aggressive truncation to stay under rate limits AND timeout limits
function truncateText(text: string, maxTokens: number = 15000): string {
  // Conservative estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4; // 60,000 characters = ~15k tokens
  
  if (text.length <= maxChars) {
    console.log(`Text length ${text.length} characters - no truncation needed`);
    return text;
  }

  console.log(`Truncating text from ${text.length} to ${maxChars} characters to stay under limits`);
  return text.substring(0, maxChars) + "\n\n[Document truncated due to length - analysis based on first portion]";
}

// Enhanced PDF text extraction
async function extractText(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error('File appears to be empty. Please select a valid file with content.');
  }

  let text = '';
  
  try {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      text = new TextDecoder('utf-8').decode(uint8Array);
      text = text.replace(/[^\x20-\x7E\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
      
      if (text.length < 100) {
        throw new Error('Could not extract readable text from PDF - may be scanned/image-based');
      }
      
      console.log(`Successfully extracted ${text.length} characters from PDF`);
    } else {
      text = await file.text();
      
      if (!text || text.trim().length < 50) {
        throw new Error('Could not extract sufficient content from file.');
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to extract text from ${file.name}: ${error}`);
  }

  // Apply truncation to prevent timeouts
  return truncateText(text);
}

export async function POST(request: NextRequest) {
  try {
    console.log('Consumer Champion Analysis initiated (timeout-optimized)');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const location = formData.get('location') as string;
    
    if (!file) {
      return NextResponse.json(
        { ok: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes, type: ${file.type})`);

    // Extract text with enhanced processing
    let text;
    try {
      text = await extractText(file);
      console.log(`Successfully extracted ${text.length} characters for Consumer Champion analysis`);
    } catch (error) {
      console.error('Text extraction failed:', error);
      return NextResponse.json(
        { 
          ok: false, 
          error: error instanceof Error ? error.message : 'Failed to extract text from file',
          suggestions: [
            'Ensure the PDF contains selectable text (not just images)',
            'Try converting to a Word document or text file',
            'Check that the file is not corrupted',
            'For best results, use files with clear, readable text'
          ]
        },
        { status: 400 }
      );
    }

    console.log('Sending to OpenAI for comprehensive Consumer Champion analysis...');
    
    // Single-pass comprehensive Consumer Champion analysis prompt
    const analysisPrompt = `You are the Ultimate Consumer Champion analyzing a home services quote. Your mission is to protect consumers from exploitation with comprehensive forensic-level analysis in a single thorough review.

**DOCUMENT TO ANALYZE:**
File: ${file.name}
Location Context: ${location || 'General market analysis'}

**DOCUMENT CONTENT:**
${text}

**COMPREHENSIVE CONSUMER CHAMPION FORENSIC ANALYSIS:**

**EXECUTIVE SUMMARY: THE FINAL VERDICT**
Rate this quote: FAIR / QUESTIONABLE / CONCERNING / PREDATORY
Provide clear recommendation: PROCEED / PROCEED WITH CAUTION / WALK AWAY

**CRITICAL RED FLAGS IDENTIFIED**
Examine the entire document for:
- High-pressure language or urgency tactics ("limited time", "today only", "immediate danger")
- Vague terms that hide costs ("as needed", "up to", "may require", "subject to")
- Overpriced services compared to market rates
- Missing standard consumer protections
- Concerning contract terms or warranty limitations

**FORENSIC COST ANALYSIS & MARKET COMPARISON**
Analyze all pricing with microscopic detail:
- Extract and evaluate EVERY dollar amount mentioned
- Break down costs: labor, materials, permits, markup
- Compare to industry benchmarks (HVAC: $3,000-$8,000 typical range)
- Identify potential overcharges with specific dollar amounts
- Flag hidden fees or unclear pricing structures
- Calculate cost per unit/ton/square foot where applicable

**TECHNICAL EQUIPMENT ASSESSMENT**
Scrutinize all equipment and services:
- Identify specific brands, models, and technical specifications mentioned
- Extract efficiency ratings (SEER, HSPF, tonnage) if provided
- Analyze warranty terms for each component
- Flag proprietary or uncommon equipment that limits consumer choice
- Note missing technical specifications that should be provided
- Assess appropriateness of proposed solutions

**CONTRACT TERMS & CONSUMER RIGHTS REVIEW**
Examine legal language and protections:
- Review cancellation policies and associated fees
- Analyze warranty coverage and limitations
- Identify terms that favor the business unfairly
- Flag any arbitration clauses or dispute resolution terms
- Note missing standard consumer protections
- Extract problematic contract language verbatim

**SCAM DETECTION & EXPLOITATION PATTERNS**
Look for common predatory practices:
- Bundled services without proper itemization
- Unusual financing terms or payment structures
- Claims about "immediate danger" or "emergency repairs"
- Pressure tactics around decision timing
- Vague or proprietary technology claims
- Missing licensing, insurance, or bonding information

**CONSUMER ACTION PLAN & BATTLE STRATEGY**
Provide specific, actionable guidance:
- Exact questions to ask the contractor
- Specific terms to demand be changed or clarified
- Dollar amounts to negotiate (be specific with targets)
- Red flags that warrant immediate termination of discussions
- Steps to protect consumer interests
- Alternative options consumers should consider

**MARKET INTELLIGENCE & NEGOTIATION LEVERAGE**
Based on the analysis:
- What should this service actually cost in this market?
- Which elements are overpriced and by how much?
- What are the strongest negotiation points?
- When should the consumer walk away entirely?

**FINAL CONSUMER CHAMPION PROCLAMATION**
Deliver uncompromising guidance on whether consumers should proceed, what they must demand if they do, or why they should walk away. Be specific about risks and mitigation strategies.

**ANALYSIS REQUIREMENTS:**
- Quote exact problematic language when found
- Provide specific dollar amounts for all cost concerns
- Name specific equipment brands/models mentioned
- Calculate percentage markups above market rates
- Be absolutely uncompromising in protecting consumer interests
- Format with clear headers and bullet points for readability

**APPROACH:** Conduct this as a forensic audit to protect a family member from exploitation. Miss nothing. Question everything. Be thorough but concise.`;

    // Single comprehensive API call to stay under timeout limits
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo', // 
      messages: [
        {
          role: 'system',
          content: 'You are the Ultimate Consumer Champion conducting comprehensive forensic-level analysis to protect consumers from exploitation in home services. Be thorough, specific, and uncompromising in identifying practices that could harm consumers. Extract every detail, quote exact problematic language, and provide actionable guidance.'
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.1, // Low for consistency
      max_tokens: 4000, // Comprehensive but within limits
    });

    const analysis = completion.choices[0]?.message?.content;

    if (!analysis) {
      throw new Error('Failed to generate Consumer Champion analysis');
    }

    console.log('Consumer Champion analysis completed successfully');

    return NextResponse.json({
      ok: true,
      analysis: {
        consumer_champion_report: analysis,
        processing_info: {
          document_length: text.length,
          analysis_type: 'Comprehensive Consumer Champion Analysis',
          analysis_method: 'Single-Pass Forensic Review',
          consumer_protection_level: 'Maximum',
          processing_time: 'Optimized for sub-10s response'
        },
        file_info: {
          name: file.name,
          size: file.size,
          type: file.type
        }
      },
      location_context: location || 'General market analysis',
      analysis_timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Consumer Champion analysis failed:', error.message);
    
    // Handle specific OpenAI errors
    if (error.message.includes('Rate limit') || error.message.includes('tokens per min')) {
      return NextResponse.json(
        { 
          ok: false, 
          error: 'OpenAI rate limit exceeded. Please wait 60 seconds and try again.',
          details: 'The Consumer Champion analysis requires significant AI processing. Please retry in a moment.'
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || 'Consumer Champion analysis failed',
        details: 'The analysis encountered an error. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}