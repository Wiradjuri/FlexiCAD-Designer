/**
 * Admin Health Check Function
 * Validates admin authorization for protected endpoints
 * FlexiCAD Designer - Phase 4.7.3
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role for admin operations

// Admin email addresses
const ADMIN_EMAILS = [
    'bmuzza1992@gmail.com'
];

export const handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers };
    }
    
    try {
        // Get authorization header
        const authHeader = event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Authorization token required',
                    admin: false
                })
            };
        }
        
        const token = authHeader.split(' ')[1];
        
        // Create Supabase client with service role for admin validation
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Verify the JWT token
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (userError || !user) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ 
                    error: 'Invalid token',
                    admin: false
                })
            };
        }
        
        // Check if user is admin
        const isAdmin = ADMIN_EMAILS.includes(user.email);
        
        if (!isAdmin) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ 
                    error: 'Admin access required',
                    admin: false,
                    email: user.email
                })
            };
        }
        
        // Admin validated successfully
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                admin: true,
                email: user.email,
                timestamp: new Date().toISOString(),
                message: 'Admin access confirmed'
            })
        };
        
    } catch (error) {
        console.error('Admin health check error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                admin: false
            })
        };
    }
};