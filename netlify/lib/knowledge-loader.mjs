// netlify/lib/knowledge-loader.mjs
// Phase 4.6.1 - Knowledge Pack Integration for AI Generation
import { createClient } from '@supabase/supabase-js';

const CURATED_GLOBAL_PATH = 'curated/global/approved.jsonl';
const CURATED_PREFIX = 'curated';
const MAX_BYTES_PER_SOURCE = 65536; // 64KB limit per source

export class KnowledgePack {
  constructor(supabaseUrl, supabaseServiceKey) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    this.assetsUsed = [];
  }

  async loadKnowledgePack(userPrompt) {
    const knowledgeBlocks = [];
    this.assetsUsed = [];

    try {
      // Load curated global knowledge
      const globalKnowledge = await this.loadJSONLSource(CURATED_GLOBAL_PATH, userPrompt);
      if (globalKnowledge.examples.length > 0) {
        knowledgeBlocks.push({
          title: 'Curated Global Knowledge',
          source: CURATED_GLOBAL_PATH,
          examples: globalKnowledge.examples
        });
        this.assetsUsed.push({
          object_path: CURATED_GLOBAL_PATH,
          bytesUsed: globalKnowledge.bytesUsed,
          source: 'curated-feedback'
        });
      }

      // Load recent training assets
      const recentAssets = await this.loadRecentTrainingAssets(userPrompt);
      if (recentAssets.examples.length > 0) {
        knowledgeBlocks.push({
          title: 'Recent Training Examples',
          source: 'training-assets',
          examples: recentAssets.examples
        });
        this.assetsUsed.push(...recentAssets.assets);
      }

    } catch (error) {
      console.warn('⚠️ Knowledge pack loading failed:', error.message);
    }

    return this.buildKnowledgePreamble(knowledgeBlocks);
  }

  async loadJSONLSource(objectPath, userPrompt) {
    try {
      const { data, error } = await this.supabase.storage
        .from('training-assets')
        .download(objectPath);

      if (error) {
        console.warn(`⚠️ Could not load ${objectPath}:`, error.message);
        return { examples: [], bytesUsed: 0 };
      }

      const text = await data.text();
      const bytesUsed = Math.min(text.length, MAX_BYTES_PER_SOURCE);
      const truncatedText = text.substring(0, MAX_BYTES_PER_SOURCE);

      // Parse JSONL lines
      const lines = truncatedText.split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .slice(0, 20); // Max 20 lines

      const examples = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (this.isRelevantExample(parsed, userPrompt)) {
            // Truncate long generated_code
            if (parsed.generated_code && parsed.generated_code.length > 800) {
              parsed.generated_code = parsed.generated_code.substring(0, 800) + '...';
            }
            examples.push(parsed);
          }
        } catch (parseError) {
          // Skip invalid JSON lines
        }
      }

      return { examples, bytesUsed };

    } catch (error) {
      console.warn(`⚠️ Error loading JSONL ${objectPath}:`, error.message);
      return { examples: [], bytesUsed: 0 };
    }
  }

  async loadRecentTrainingAssets(userPrompt) {
    try {
      // Get recent training assets from the last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: assets, error } = await this.supabase
        .from('training_assets')
        .select('object_path, tags, metadata')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error || !assets?.length) {
        return { examples: [], assets: [] };
      }

      const examples = [];
      const usedAssets = [];

      for (const asset of assets) {
        if (this.matchesTags(asset.tags, userPrompt)) {
          const jsonlData = await this.loadJSONLSource(asset.object_path, userPrompt);
          if (jsonlData.examples.length > 0) {
            examples.push(...jsonlData.examples.slice(0, 3)); // Max 3 per asset
            usedAssets.push({
              object_path: asset.object_path,
              bytesUsed: jsonlData.bytesUsed,
              source: 'training-asset'
            });
          }
        }
      }

      return { examples, assets: usedAssets };

    } catch (error) {
      console.warn('⚠️ Error loading recent training assets:', error.message);
      return { examples: [], assets: [] };
    }
  }

  isRelevantExample(example, userPrompt) {
    if (!example || !userPrompt) return false;

    const prompt = userPrompt.toLowerCase();
    const checkFields = [
      example.user_prompt,
      example.description,
      example.template,
      ...(example.tags || [])
    ];

    // Check for keyword matches
    const keywords = this.extractKeywords(prompt);
    for (const field of checkFields) {
      if (field && typeof field === 'string') {
        const fieldLower = field.toLowerCase();
        if (keywords.some(keyword => fieldLower.includes(keyword))) {
          return true;
        }
      }
    }

    return false;
  }

  matchesTags(tags, userPrompt) {
    if (!tags || !Array.isArray(tags)) return false;
    
    const prompt = userPrompt.toLowerCase();
    const keywords = this.extractKeywords(prompt);
    
    return tags.some(tag => {
      const tagLower = tag.toLowerCase();
      return keywords.some(keyword => tagLower.includes(keyword) || keyword.includes(tagLower));
    });
  }

  extractKeywords(prompt) {
    // Extract meaningful keywords from user prompt
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'that', 'this', 'make', 'create', 'design'].includes(word));
    
    return words.slice(0, 10); // Limit to 10 keywords
  }

  buildKnowledgePreamble(knowledgeBlocks) {
    if (knowledgeBlocks.length === 0) {
      return '';
    }

    let preamble = `\n### Knowledge & Learning Material (Authoritative)
You have access to small, curated snippets sampled from our private Supabase Storage bucket:

- Bucket: \`training-assets\` (private)
- Curated JSONL: \`${CURATED_GLOBAL_PATH}\` (admin-approved user feedback)
- Optional template packs under \`${CURATED_PREFIX}/…\`

**How to use this material**
1) Treat these snippets as authoritative examples and measurements.
2) Prefer examples whose \`template\` and \`tags\` best match the user request.
3) When dimensions or constraints exist in the examples, keep units consistent (mm by default).
4) If multiple examples conflict, prefer \`tags\` including \`origin:curated-feedback\` and higher \`quality_score\`.
5) Never paste the raw JSONL back to the user; only *use it* to guide the code you generate.

**Output policy**
- Return clean, runnable OpenSCAD unless the user explicitly asked for STL export.
- If STL is requested, also include the underlying OpenSCAD in a collapsible or downloadable section so the user can modify it later.

### Knowledge Pack (sampled)
- MaxBytesPerSource: ${MAX_BYTES_PER_SOURCE}
- Parsed JSONL lines shown as compact examples
- Skipping comments (#) and blank lines

`;

    for (const block of knowledgeBlocks) {
      preamble += `\n**${block.title}** (${block.source}):\n`;
      
      for (let i = 0; i < Math.min(block.examples.length, 5); i++) {
        const example = block.examples[i];
        preamble += `\nExample ${i + 1}:\n`;
        
        if (example.user_prompt) {
          preamble += `- Prompt: "${example.user_prompt}"\n`;
        }
        if (example.template) {
          preamble += `- Template: ${example.template}\n`;
        }
        if (example.tags && example.tags.length > 0) {
          preamble += `- Tags: [${example.tags.join(', ')}]\n`;
        }
        if (example.quality_score) {
          preamble += `- Quality: ${example.quality_score}\n`;
        }
        if (example.generated_code) {
          const codeSnippet = example.generated_code.length > 200 
            ? example.generated_code.substring(0, 200) + '...'
            : example.generated_code;
          preamble += `- Code snippet: \`${codeSnippet}\`\n`;
        }
      }
    }

    preamble += '\n### User Request\n';
    return preamble;
  }

  getProvenanceLog() {
    if (this.assetsUsed.length === 0) {
      return '';
    }

    let provenance = '\n\nSources used:\n';
    for (const asset of this.assetsUsed) {
      provenance += `- ${asset.object_path}`;
      if (asset.source === 'curated-feedback') {
        provenance += ' (curated feedback)';
      }
      provenance += '\n';
    }

    return provenance;
  }

  // For admin logging
  getAssetsUsed() {
    return this.assetsUsed;
  }
}

export default KnowledgePack;