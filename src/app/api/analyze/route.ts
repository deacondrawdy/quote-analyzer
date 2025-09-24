import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

<<<<<<< HEAD
// Aggressive truncation to stay under rate limits
function truncateText(text: string, maxTokens: number = 25000): string {
  // Conservative estimate: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4; // 20,000 characters = ~5k tokens
  
  if (text.length <= maxChars) {
    console.log(`Text length ${text.length} characters - no truncation needed`);
    return text;
=======
// Enhanced PDF text extraction
async function extractText(file: File): Promise<string> {
  if (file.size === 0) {
    throw new Error('File appears to be empty. Please select a valid file with content.');
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
  }

  let text = '';
  
<<<<<<< HEAD
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
=======
  try {
    if (file.type === 'application/pdf') {
      // Basic PDF text extraction - you can enhance this with pdf-parse later
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      text = new TextDecoder('utf-8').decode(uint8Array);
      text = text.replace(/[^\x20-\x7E\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
      
      if (text.length < 100) {
        throw new Error('Could not extract readable text from PDF');
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

  return text;
}

// Enhanced document splitting with better technical service recognition
function splitDocumentIntoSections(text: string): { section: string, content: string, priority: number }[] {
  const sections = [];
  
  // Enhanced section markers including technical services
  const sectionMarkers = [
    { marker: 'DESCRIPTION OF CONTRACT', name: 'Contract Description', priority: 1 },
    { marker: 'TASK', name: 'Task Details and Pricing', priority: 1 },
    { marker: 'QTY', name: 'Quantities and Pricing', priority: 1 },
    { marker: 'PRICE', name: 'Pricing Details', priority: 1 },
    { marker: 'TOTAL', name: 'Total Costs and Financial Summary', priority: 1 },
    { marker: 'Aeroseal', name: 'Aeroseal Service Details', priority: 1 },
    { marker: 'Air Ranger', name: 'Air Ranger Equipment', priority: 1 },
    { marker: 'Desert Shield', name: 'Desert Shield Equipment', priority: 1 },
    { marker: 'Duct Cleaning', name: 'Duct Cleaning Services', priority: 1 },
    { marker: 'Terms & Conditions', name: 'Terms and Conditions', priority: 2 },
    { marker: 'THREE DAY RIGHT TO CANCEL', name: 'Cancellation Rights', priority: 2 },
    { marker: 'WARRANTY', name: 'Warranty Terms', priority: 2 },
    { marker: 'PAYMENT', name: 'Payment Terms', priority: 2 },
    { marker: 'DISCOUNT', name: 'Discounts and Pricing Adjustments', priority: 1 },
    { marker: 'SUB-TOTAL', name: 'Financial Summary', priority: 1 }
  ];

  // Split document by sections with enhanced detection
  let processedText = text;
  
  for (let i = 0; i < sectionMarkers.length; i++) {
    const {marker, name, priority} = sectionMarkers[i];
    const markerIndex = processedText.toLowerCase().indexOf(marker.toLowerCase());
    
    if (markerIndex !== -1) {
      // Find the next section or reasonable breakpoint
      let nextMarkerIndex = processedText.length;
      
      // Look for next section marker
      for (let j = i + 1; j < sectionMarkers.length; j++) {
        const nextIndex = processedText.toLowerCase().indexOf(sectionMarkers[j].marker.toLowerCase(), markerIndex + marker.length);
        if (nextIndex !== -1 && nextIndex < nextMarkerIndex) {
          nextMarkerIndex = nextIndex;
        }
      }
      
      // If no next section found, look for natural breaks
      if (nextMarkerIndex === processedText.length) {
        const naturalBreaks = ['\n\n\n', '___', '---', 'Page', 'Contract'];
        for (const breakMarker of naturalBreaks) {
          const breakIndex = processedText.indexOf(breakMarker, markerIndex + marker.length + 1000);
          if (breakIndex !== -1 && breakIndex < nextMarkerIndex) {
            nextMarkerIndex = breakIndex;
          }
        }
      }
      
      const sectionContent = processedText.substring(markerIndex, nextMarkerIndex).trim();
      
      if (sectionContent.length > 150) { // More substantial sections
        sections.push({
          section: name,
          content: sectionContent,
          priority: priority
        });
      }
    }
  }

  // Enhanced fallback splitting if no clear sections found
  if (sections.length === 0) {
    const chunkSize = 35000; // Slightly smaller chunks for more detailed analysis
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.substring(i, Math.min(i + chunkSize, text.length));
      if (chunk.trim().length > 100) {
        sections.push({
          section: `Document Section ${Math.floor(i / chunkSize) + 1}`,
          content: chunk,
          priority: 1
        });
      }
    }
  }

  console.log(`Enhanced document splitting created ${sections.length} sections for ultra-detailed analysis`);
  return sections.sort((a, b) => a.priority - b.priority);
}

// Ultra-enhanced section analysis prompt with aggressive consumer protection
function createSectionAnalysisPrompt(sectionName: string, sectionContent: string, fileName: string): string {
  return `You are the Ultimate Consumer Champion conducting forensic-level analysis of a home services quote section. Your mission is to protect consumers with uncompromising thoroughness and expose any practices that could exploit or disadvantage them.

**SECTION BEING ANALYZED: ${sectionName}**
**FILE: ${fileName}**

**ULTRA-DETAILED ANALYSIS MISSION:**

**1. FORENSIC RED FLAG DETECTION:**
- Identify EVERY instance of high-pressure language, no matter how subtle
- Extract and quote verbatim ALL concerning phrases, even partial sentences
- Flag every use of vague terms ("as needed", "may recommend", "subject to", "up to")
- Identify incomplete sentences or cut-off text that may hide important information
- Detect any urgency-inducing language or time-pressure tactics

**2. MICROSCOPIC COST ANALYSIS:**
- Extract and analyze EVERY number, dollar amount, and percentage mentioned
- Quote exact amounts even from incomplete sentences (e.g., "a $1000" references)
- Calculate cost per unit/ton/square foot where applicable
- Identify ALL potential hidden fees, no matter how small
- Flag any pricing that lacks detailed breakdown
- Compare specific costs to industry benchmarks (HVAC: $3,000-$8,000 typical range)

**3. TECHNICAL EQUIPMENT SCRUTINY:**
- Identify specific brands, models, and technical specifications
- Extract efficiency ratings (SEER, HSPF, tonnage) if mentioned
- Analyze warranty terms for each component separately
- Flag any proprietary or uncommon equipment that limits consumer choice
- Note missing technical specifications that should be provided

**4. CONTRACT LANGUAGE FORENSICS:**
- Examine every clause for business-favoring language
- Identify terms that waive consumer rights or protections
- Flag any arbitration clauses or dispute resolution terms
- Extract cancellation policies and associated fees verbatim
- Note any incomplete or ambiguous legal language

**5. CONSUMER PROTECTION VIOLATIONS:**
- Identify missing standard consumer protections
- Flag absent warranty details, cancellation rights, or refund policies
- Note violations of typical fair business practices
- Identify any practices that could mislead or confuse consumers

**ULTRA-SPECIFIC REQUIREMENTS:**
- Quote EXACT dollar amounts and flag any over industry thresholds
- Identify and name specific equipment brands/models mentioned
- Extract ALL service names (Aeroseal, Air Ranger, Desert Shield, etc.) with associated costs
- Calculate exact percentage markups above typical market rates
- Flag incomplete cost references or sentences that end abruptly
- Note EVERY instance of vague language that could hide costs
- Identify specific missing standard consumer protections
- Quote problematic contract language word-for-word

**ANALYSIS APPROACH:**
You are conducting a forensic audit to protect a family member from exploitation. Miss nothing. Question everything. Be absolutely uncompromising in identifying practices that could harm consumer interests.

**FORMATTING INSTRUCTIONS:**
Use clear headers and bullet points for readability. Make your analysis scannable and actionable.

---

**SECTION CONTENT FOR FORENSIC ANALYSIS:**

${sectionContent}

---

**DELIVER:**
- Exact quotes of ALL concerning language
- Specific dollar amounts and cost analysis
- Technical equipment details and market comparisons
- Precise consumer protection violations
- Actionable recommendations with specific negotiation points

Rate this section: FAIR / QUESTIONABLE / CONCERNING / PREDATORY

Provide forensic-level consumer protection analysis that leaves no stone unturned.`;
}

// Enhanced synthesis prompt for comprehensive final report
function createSynthesisPrompt(sectionAnalyses: string[], fileName: string): string {
  return `You are the Ultimate Consumer Champion delivering the definitive forensic consumer protection report. Synthesize all section analyses into a comprehensive, actionable document that empowers consumers to protect themselves from exploitation.

**FORENSIC ANALYSIS COMPLETE FOR: ${fileName}**

**SECTION-BY-SECTION FINDINGS:**

${sectionAnalyses.map((analysis, index) => `
════════════════════════════════════════
SECTION ${index + 1} FORENSIC FINDINGS:
════════════════════════════════════════
${analysis}

`).join('\n')}

**COMPREHENSIVE CONSUMER CHAMPION PROTECTION REPORT:**

**EXECUTIVE SUMMARY: THE FINAL VERDICT**
Provide a definitive assessment (FAIR/QUESTIONABLE/PREDATORY) with specific reasoning based on the forensic findings. Include:
- Total number of red flags identified
- Most serious consumer protection violations
- Overall risk level to consumer
- Clear recommendation: PROCEED/PROCEED WITH CAUTION/WALK AWAY

**CRITICAL RED FLAGS IDENTIFIED**
List ALL concerning practices found with:
- Exact quotes of problematic language
- Specific dollar amounts that are concerning
- Technical issues with equipment or services
- Contract terms that exploit consumers

**FORENSIC COST ANALYSIS**
Provide detailed financial assessment:
- Total cost breakdown with market comparisons
- Specific overcharges identified (exact dollar amounts)
- Hidden fees and their impact
- Recommended negotiation targets (specific dollar amounts)
- Alternative pricing expectations based on market rates

**CONSUMER RIGHTS VIOLATIONS**
Document all missing or inadequate protections:
- Cancellation rights deficiencies
- Warranty term problems
- Missing legal protections
- Dispute resolution concerns

**TECHNICAL EQUIPMENT ASSESSMENT**
Analyze all equipment and services mentioned:
- Specific brands/models and their market position
- Efficiency ratings and appropriateness
- Warranty coverage analysis
- Alternative options consumers should consider

**BATTLE PLAN FOR CONSUMERS**
Provide specific, actionable guidance:
- Exact questions to ask the contractor
- Specific terms to demand be changed
- Dollar amounts to negotiate (be specific)
- Red flags that warrant immediate termination of discussions
- Steps to protect consumer interests

**FINAL CONSUMER CHAMPION PROCLAMATION**
Deliver uncompromising guidance on whether consumers should proceed, what they must demand if they do, or why they should walk away. Be specific about the risks and how to mitigate them.

**FORMATTING FOR MAXIMUM IMPACT:**
- Use clear headers and sections
- Include bullet points for actionable items
- Highlight critical warnings
- Make the report scannable and easy to follow

Your report will be formatted for consumer readability, so organize it clearly with proper spacing and structure.`;
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
}

export async function POST(request: NextRequest) {
  try {
<<<<<<< HEAD
    console.log('Analysis request received');
=======
    console.log('Enhanced Consumer Champion Forensic Analysis initiated');
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
    
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

<<<<<<< HEAD
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
=======
    // Extract text with enhanced processing
    let text;
    try {
      text = await extractText(file);
      console.log(`Successfully extracted ${text.length} characters for forensic analysis`);
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
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
        },
        { status: 400 }
      );
    }
<<<<<<< HEAD

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
=======

    // Enhanced document splitting
    const sections = splitDocumentIntoSections(text);
    console.log(`Conducting forensic analysis on ${sections.length} sections with Consumer Champion rigor`);

    // Ultra-detailed section analysis
    const sectionAnalyses: string[] = [];
    
    for (const [index, section] of sections.entries()) {
      console.log(`Forensic analysis ${index + 1}/${sections.length}: ${section.section}`);
      
      try {
        const sectionPrompt = createSectionAnalysisPrompt(section.section, section.content, file.name);
        
        const completion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are the Ultimate Consumer Champion conducting forensic-level analysis. Extract every detail, quote exact problematic language, identify specific costs and technical details, and be absolutely uncompromising in protecting consumer interests. Miss nothing that could exploit or mislead consumers.'
            },
            {
              role: 'user',
              content: sectionPrompt
            }
          ],
          temperature: 0.05, // Very low for maximum consistency and accuracy
          max_tokens: 4000,
        });

        const analysis = completion.choices[0]?.message?.content;
        if (analysis) {
          sectionAnalyses.push(`**${section.section.toUpperCase()}**\n\n${analysis}`);
        }
        
        // Brief pause between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error in forensic analysis of section ${section.section}:`, error);
        sectionAnalyses.push(`**${section.section.toUpperCase()}**\n\nFORENSIC ANALYSIS ERROR: ${error instanceof Error ? error.message : 'Analysis failed'}`);
      }
    }

    console.log('Synthesizing comprehensive Consumer Champion protection report');

    // Create definitive comprehensive report
    const synthesisPrompt = createSynthesisPrompt(sectionAnalyses, file.name);
    
    const finalCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are the Ultimate Consumer Champion delivering the definitive consumer protection report. Synthesize all forensic findings into clear, actionable guidance. Be uncompromising, specific, and focused on empowering consumers to protect themselves from exploitation. Format clearly for maximum readability and impact.'
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
        },
        {
          role: 'user',
          content: synthesisPrompt
        }
      ],
<<<<<<< HEAD
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 4000, // Limit output tokens to stay under rate limits
    });

    const analysisText = completion.choices[0]?.message?.content;
    console.log('OpenAI analysis completed');
=======
      temperature: 0.05,
      max_tokens: 4000,
    });

    const comprehensiveReport = finalCompletion.choices[0]?.message?.content;
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)

    if (!comprehensiveReport) {
      throw new Error('Failed to generate comprehensive Consumer Champion report');
    }

<<<<<<< HEAD
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
=======
    console.log('Enhanced Consumer Champion forensic analysis completed successfully');

    // Enhanced response structure for better formatting
    return NextResponse.json({
      ok: true,
      analysis: {
        // Main formatted report
        comprehensive_report: comprehensiveReport,
        
        // Section details for reference
        section_analyses: sectionAnalyses,
        
        // Enhanced processing metadata
        processing_info: {
          total_sections_analyzed: sections.length,
          document_length: text.length,
          analysis_type: 'Enhanced Consumer Champion Forensic Analysis',
          analysis_depth: 'Ultra-Detailed with Technical Equipment Focus',
          consumer_protection_level: 'Maximum'
        },
        
        // File information
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
        file_info: {
          name: file.name,
          size: file.size,
          type: file.type
        }
<<<<<<< HEAD
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
=======
      },
      
      // Analysis metadata
      analysis_method: 'Enhanced Multi-Pass Consumer Champion Analysis',
      location_context: location || 'General market analysis',
      
      // Formatting helper for frontend
      display_format: {
        main_report: 'comprehensive_report',
        sections_available: true,
        formatting_type: 'pre-formatted_with_headers'
      }
    });

  } catch (error: any) {
    console.error('Enhanced Consumer Champion analysis failed:', error.message);
>>>>>>> 2b80852 (Implement Consumer Champion analysis system with comprehensive scam detection and market pricing)
    
    return NextResponse.json(
      { 
        ok: false, 
        error: error.message || 'Enhanced Consumer Champion analysis failed',
        details: 'The forensic analysis encountered an error. Please try again or contact support.'
      },
      { status: 500 }
    );
  }
}
