const { createClient } = require('@supabase/supabase-js');

// Admin email for promo code management
const ADMIN_EMAIL = 'bmuzza1992@gmail.com';

exports.handler = async (event, context) => {
    console.log('🎟️ Promo code management request:', event.httpMethod, event.path);

    // Handle CORS preflight requests
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Initialize Supabase client
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // Get user from Authorization header
        let user = null;
        const authHeader = event.headers.authorization || event.headers.Authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
            if (!error && authUser) {
                user = authUser;
            }
        }

        // Check if user is admin
        if (!user || user.email !== ADMIN_EMAIL) {
            console.log('❌ Access denied - not admin user:', user?.email || 'anonymous');
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({ 
                    error: 'Access denied. Admin privileges required.' 
                })
            };
        }

        console.log('✅ Admin access confirmed:', user.email);

        // Handle different HTTP methods
        switch (event.httpMethod) {
            case 'GET':
                return await listPromoCodes(supabase);
            case 'POST':
                return await createPromoCode(supabase, event.body);
            case 'PUT':
                return await updatePromoCode(supabase, event.body);
            case 'DELETE':
                return await deletePromoCode(supabase, event.body);
            default:
                return {
                    statusCode: 405,
                    headers,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }

    } catch (error) {
        console.error('❌ Promo management error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

// List all promo codes
async function listPromoCodes(supabase) {
    try {
        const { data: promoCodes, error } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        console.log(`📋 Retrieved ${promoCodes.length} promo codes`);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                promoCodes: promoCodes || []
            })
        };
    } catch (error) {
        console.error('❌ Error listing promo codes:', error);
        throw error;
    }
}

// Create a new promo code
async function createPromoCode(supabase, body) {
    try {
        const { code, description, discount_percent, expires_at } = JSON.parse(body);

        // Validation
        if (!code || !discount_percent) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Code and discount percentage are required' 
                })
            };
        }

        if (discount_percent < 1 || discount_percent > 100) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Discount percentage must be between 1 and 100' 
                })
            };
        }

        // Convert code to uppercase for consistency
        const promoCode = code.toUpperCase().trim();

        // Insert promo code
        const { data: newPromo, error } = await supabase
            .from('promo_codes')
            .insert({
                code: promoCode,
                description: description?.trim() || null,
                discount_percent: parseInt(discount_percent),
                expires_at: expires_at || null,
                active: true
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return {
                    statusCode: 409,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'Promo code already exists' 
                    })
                };
            }
            throw new Error(`Database error: ${error.message}`);
        }

        console.log('✅ Created promo code:', promoCode);

        return {
            statusCode: 201,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: 'Promo code created successfully',
                promoCode: newPromo
            })
        };
    } catch (error) {
        console.error('❌ Error creating promo code:', error);
        throw error;
    }
}

// Update an existing promo code
async function updatePromoCode(supabase, body) {
    try {
        const { id, code, description, discount_percent, expires_at, active } = JSON.parse(body);

        if (!id) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Promo code ID is required' 
                })
            };
        }

        const updates = {};
        if (code) updates.code = code.toUpperCase().trim();
        if (description !== undefined) updates.description = description?.trim() || null;
        if (discount_percent !== undefined) {
            if (discount_percent < 1 || discount_percent > 100) {
                return {
                    statusCode: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'Discount percentage must be between 1 and 100' 
                    })
                };
            }
            updates.discount_percent = parseInt(discount_percent);
        }
        if (expires_at !== undefined) updates.expires_at = expires_at || null;
        if (active !== undefined) updates.active = Boolean(active);
        updates.updated_at = new Date().toISOString();

        const { data: updatedPromo, error } = await supabase
            .from('promo_codes')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return {
                    statusCode: 409,
                    headers: { 'Access-Control-Allow-Origin': '*' },
                    body: JSON.stringify({ 
                        error: 'Promo code already exists' 
                    })
                };
            }
            throw new Error(`Database error: ${error.message}`);
        }

        if (!updatedPromo) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Promo code not found' 
                })
            };
        }

        console.log('✅ Updated promo code:', updatedPromo.code);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: 'Promo code updated successfully',
                promoCode: updatedPromo
            })
        };
    } catch (error) {
        console.error('❌ Error updating promo code:', error);
        throw error;
    }
}

// Delete a promo code
async function deletePromoCode(supabase, body) {
    try {
        const { id } = JSON.parse(body);

        if (!id) {
            return {
                statusCode: 400,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Promo code ID is required' 
                })
            };
        }

        const { data: deletedPromo, error } = await supabase
            .from('promo_codes')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        if (!deletedPromo) {
            return {
                statusCode: 404,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ 
                    error: 'Promo code not found' 
                })
            };
        }

        console.log('🗑️ Deleted promo code:', deletedPromo.code);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                success: true,
                message: 'Promo code deleted successfully',
                promoCode: deletedPromo
            })
        };
    } catch (error) {
        console.error('❌ Error deleting promo code:', error);
        throw error;
    }
}