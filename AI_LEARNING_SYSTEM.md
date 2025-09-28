# FlexiCAD AI Learning System

## Overview
The FlexiCAD AI learning system allows the AI to remember what it has been taught and continuously improve based on user feedback and corrections. The system stores successful patterns and learns from user interactions to provide better OpenSCAD code generation.

## Features

### 🧠 **Persistent Learning**
- AI learns from highly-rated generations (4-5 stars)
- Stores successful patterns in a knowledge base
- References previous solutions for similar requests
- Builds expertise over time

### 📊 **User Feedback System**
- Star rating system (1-5 stars) for each generation
- Optional text feedback for improvements
- Code correction tracking when users modify generated code
- Automatic knowledge base updates from high-quality feedback

### 🎓 **Manual Teaching Interface**
- Users can manually add training examples
- Categorize patterns by type and complexity
- Add keywords and descriptions for better matching
- Contribute to the collective AI knowledge

### 🔍 **Smart Pattern Matching**
- Finds similar patterns from past successes
- Uses keyword matching and user history
- Contextualizes prompts with relevant examples
- Adapts to user preferences over time

## System Components

### Backend Functions

#### 1. `generate-template.js` (Enhanced)
- **Location**: `netlify/functions/generate-template.js`
- **Purpose**: AI code generation with learning context
- **Features**:
  - Loads training data from `ai-reference/` folder
  - Finds similar patterns in knowledge base
  - Includes user's successful history
  - Builds enhanced system prompts with context
  - Stores learning sessions for analysis

#### 2. `ai-feedback.js`
- **Location**: `netlify/functions/ai-feedback.js`
- **Purpose**: Collects user feedback and ratings
- **Features**:
  - Records star ratings (1-5)
  - Stores text feedback and code corrections
  - Triggers knowledge base updates for high ratings
  - Links corrections to original generations

#### 3. `teach-ai.js`
- **Location**: `netlify/functions/teach-ai.js`
- **Purpose**: Manual teaching interface
- **Features**:
  - Accepts new training patterns
  - Updates both database and file system
  - Categorizes by complexity and type
  - Extracts techniques from code

### Database Schema

#### Tables Created
1. **`ai_learning_sessions`** - Stores all AI generations and feedback
2. **`ai_knowledge_base`** - Successful patterns for future reference
3. **`ai_corrections`** - User modifications and improvements

#### Key Features
- Row Level Security (RLS) for user privacy
- Automatic triggers for knowledge base updates
- Indexed for fast pattern matching
- User history tracking

### Frontend Interface

#### AI Generator Page (`ai.html`)
- **Rating System**: 5-star feedback after each generation
- **Feedback Form**: Optional text feedback and code corrections
- **Teaching Interface**: Manual pattern addition for high-rated results
- **Metadata Display**: Shows generation context and performance

## Setup Instructions

### 1. Database Setup
```sql
-- Run this in your Supabase SQL editor:
-- (See database/setup_ai_learning.sql for full script)
```

### 2. Training Data
- Existing training data in `ai-reference/` folder is automatically loaded
- `ai_training_data.json` - Core training examples
- `enhanced_manifest.json` - Advanced patterns
- `examples.json` - Code examples

### 3. Environment Variables
All existing environment variables work with the enhanced system:
- `OPENAI_API_KEY` - For AI generation
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Database operations

## Usage

### For Users

#### 1. Generate Design
- Enter prompt as usual
- AI now uses learned patterns and your history
- Get better results based on collective knowledge

#### 2. Rate Generation
- Use the 5-star rating system
- Provide optional feedback
- Submit code improvements

#### 3. Teach the AI
- For highly-rated results, option to "Teach AI"
- Add pattern to knowledge base
- Help improve future generations

### For Administrators

#### Manual Teaching
```javascript
// Add training pattern via API
POST /.netlify/functions/teach-ai
{
  "patternName": "Phone Case with Cutouts",
  "description": "Protective case with camera cutouts",
  "keywords": ["phone", "case", "cutout", "camera"],
  "examplePrompt": "Create a phone case for iPhone 14",
  "successfulCode": "/* OpenSCAD code */",
  "category": "functional",
  "complexityLevel": "intermediate"
}
```

## Learning Process

### 1. **Pattern Recognition**
- When user enters a prompt, system searches for similar patterns
- Uses keyword matching and semantic similarity
- Includes user's previous successful generations

### 2. **Context Building**
- Builds enhanced system prompt with:
  - Similar patterns from knowledge base
  - User's successful history
  - Best practices from training data
  - Specific techniques for the request type

### 3. **Feedback Loop**
- Users rate generations (1-5 stars)
- High-rated generations (4-5) automatically added to knowledge base
- User corrections tracked for common mistake patterns
- System continuously improves

### 4. **Knowledge Evolution**
- Patterns get usage counts and average ratings
- Most successful patterns prioritized
- Bad patterns filtered out over time
- User-specific learning from history

## Performance Metrics

The system tracks:
- **Generation Quality**: Average user ratings
- **Pattern Usage**: How often patterns are referenced  
- **Learning Rate**: Knowledge base growth over time
- **User Satisfaction**: Feedback trends and improvements

## Security

- All learning data is protected by RLS policies
- Users can only see their own sessions and corrections
- Knowledge base is readable by paid users only
- Service role required for knowledge base modifications

## API Endpoints

### Learning Functions
- `POST /.netlify/functions/generate-template` - Enhanced generation with learning
- `POST /.netlify/functions/ai-feedback` - Submit feedback and ratings
- `POST /.netlify/functions/teach-ai` - Manual teaching interface

### Response Format
```javascript
// Enhanced generation response includes metadata
{
  "code": "// Generated OpenSCAD code",
  "prompt": "User's original prompt",
  "name": "Design name",
  "metadata": {
    "category": "functional",
    "complexity": "intermediate", 
    "similarPatterns": 3,
    "userExamples": 2,
    "generationTime": 1500,
    "tokensUsed": 800,
    "sessionId": "unique-session-id"
  }
}
```

## Future Enhancements

1. **Advanced Pattern Matching**: Vector similarity search
2. **User Clustering**: Group users with similar preferences
3. **Code Quality Analysis**: Automatic syntax and style checking
4. **Performance Optimization**: Cache frequently used patterns
5. **Analytics Dashboard**: Admin interface for learning insights

## Troubleshooting

### Common Issues

1. **Learning Not Working**
   - Verify database tables are created (`database/setup_ai_learning.sql`)
   - Check RLS policies are enabled
   - Confirm service role key is configured

2. **Patterns Not Loading**
   - Check `ai-reference/` folder exists and contains training files
   - Verify file permissions for serverless functions
   - Look at function logs for loading errors

3. **Feedback Not Saving**
   - Confirm user authentication is working
   - Check session ID is being passed correctly
   - Verify database connection and permissions

The AI learning system makes FlexiCAD's AI generator continuously smarter and more helpful to users!