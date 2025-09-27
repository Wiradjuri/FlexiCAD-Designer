/**
 * Database Helper Functions for FlexiCAD
 * Helps handle database schema differences between local/production
 */

class DatabaseHelper {
    constructor(supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.availableColumns = null;
    }

    /**
     * Check what columns exist in the profiles table
     */
    async checkProfileColumns() {
        try {
            // Try to get table info from information_schema
            const { data, error } = await this.supabaseClient
                .from('information_schema.columns')
                .select('column_name')
                .eq('table_name', 'profiles')
                .eq('table_schema', 'public');

            if (error) {
                console.warn('Could not query information_schema:', error.message);
                return await this.checkColumnsWithFallback();
            }

            const columns = data.map(row => row.column_name);
            console.log('📊 Available profile columns:', columns);
            this.availableColumns = columns;
            return columns;

        } catch (error) {
            console.warn('Schema check failed, using fallback method:', error.message);
            return await this.checkColumnsWithFallback();
        }
    }

    /**
     * Fallback method: Try to query columns by attempting selects
     */
    async checkColumnsWithFallback() {
        const possibleColumns = [
            'id', 'email', 'created_at', 'updated_at',
            'is_paid', 'is_active', 'subscription_plan', 
            'stripe_customer_id', 'is_admin'
        ];

        const availableColumns = ['id']; // id always exists

        for (const column of possibleColumns) {
            if (column === 'id') continue; // already added

            try {
                await this.supabaseClient
                    .from('profiles')
                    .select(column)
                    .limit(1);
                
                availableColumns.push(column);
                console.log(`✅ Column '${column}' exists`);
            } catch (error) {
                console.log(`❌ Column '${column}' not found:`, error.message);
            }
        }

        console.log('📊 Available columns (fallback check):', availableColumns);
        this.availableColumns = availableColumns;
        return availableColumns;
    }

    /**
     * Get user profile with only available columns
     */
    async getUserProfile(userId) {
        if (!this.availableColumns) {
            await this.checkProfileColumns();
        }

        // Build select string with only available columns
        const selectColumns = this.availableColumns.filter(col => 
            ['id', 'email', 'created_at', 'is_paid', 'is_active', 
             'subscription_plan', 'stripe_customer_id', 'is_admin'].includes(col)
        );

        try {
            const { data: profile, error } = await this.supabaseClient
                .from('profiles')
                .select(selectColumns.join(', '))
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                throw error;
            }

            // Normalize the profile data
            if (profile) {
                return {
                    id: profile.id,
                    email: profile.email || '',
                    created_at: profile.created_at,
                    is_paid: profile.is_paid || profile.is_active || false, // fallback chain
                    subscription_plan: profile.subscription_plan || 'none',
                    stripe_customer_id: profile.stripe_customer_id || null,
                    is_admin: profile.is_admin || false
                };
            }

            return null;
        } catch (error) {
            console.error('❌ Failed to get user profile:', error);
            throw error;
        }
    }

    /**
     * Create user profile with only available columns
     */
    async createUserProfile(userId, email, isPaid = false) {
        if (!this.availableColumns) {
            await this.checkProfileColumns();
        }

        const profileData = { id: userId };

        // Only set fields that exist in the table
        if (this.availableColumns.includes('email')) {
            profileData.email = email;
        }
        if (this.availableColumns.includes('is_paid')) {
            profileData.is_paid = isPaid;
        } else if (this.availableColumns.includes('is_active')) {
            profileData.is_active = isPaid; // Use is_active as fallback
        }
        if (this.availableColumns.includes('subscription_plan')) {
            profileData.subscription_plan = isPaid ? 'monthly' : 'none';
        }
        if (this.availableColumns.includes('is_admin')) {
            profileData.is_admin = false;
        }

        try {
            const { data, error } = await this.supabaseClient
                .from('profiles')
                .insert([profileData])
                .select()
                .single();

            if (error) {
                throw error;
            }

            console.log('✅ User profile created:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to create user profile:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.DatabaseHelper = DatabaseHelper;