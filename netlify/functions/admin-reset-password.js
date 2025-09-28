const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { email, newPassword } = JSON.parse(event.body);

    if (!email || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and newPassword are required' })
      };
    }

    // Only allow admin email
    const ADMIN_EMAIL = 'bmuzza1992@gmail.com';
    if (email !== ADMIN_EMAIL) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Only admin can use this function' })
      };
    }

    // Initialize Supabase admin client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user by email first
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const adminUser = users.users.find(user => user.email === ADMIN_EMAIL);
    
    if (!adminUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          error: 'Admin user not found',
          suggestion: 'User may need to be created first'
        })
      };
    }

    // Reset admin password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { 
        password: newPassword,
        email_confirm: true // Ensure email is confirmed
      }
    );

    if (updateError) {
      throw new Error(`Failed to update password: ${updateError.message}`);
    }

    // Also ensure admin has a profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', adminUser.id)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile doesn't exist, create it
      console.log('Creating admin profile...');
      const { error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: adminUser.id,
          email: ADMIN_EMAIL,
          has_paid: true, // Admin always has paid access
          subscription_plan: 'admin',
          is_active: true
        });

      if (createProfileError) {
        console.error('Failed to create admin profile:', createProfileError);
      }
    } else if (!profile?.has_paid) {
      // Ensure admin has paid access
      console.log('Updating admin profile to ensure paid access...');
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          has_paid: true,
          subscription_plan: 'admin',
          is_active: true
        })
        .eq('user_id', adminUser.id);

      if (updateProfileError) {
        console.error('Failed to update admin profile:', updateProfileError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Admin password reset successfully',
        userInfo: {
          id: adminUser.id,
          email: adminUser.email,
          emailConfirmed: !!adminUser.email_confirmed_at,
          lastSignIn: adminUser.last_sign_in_at
        }
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};