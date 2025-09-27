const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  console.log('🔍 Database check function called');

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const checkType = event.queryStringParameters?.type || 'payment_first_validation';
    
    let result = {};
    
    switch (checkType) {
      case 'payment_first_validation':
        result = await validatePaymentFirstSystem();
        break;
      
      case 'user_accounts':
        result = await checkUserAccounts();
        break;
      
      case 'email_uniqueness':
        result = await checkEmailUniqueness();
        break;
      
      case 'database_constraints':
        result = await checkDatabaseConstraints();
        break;
      
      case 'full_audit':
        result = await performFullAudit();
        break;
      
      default:
        result = await validatePaymentFirstSystem();
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        check_type: checkType,
        timestamp: new Date().toISOString(),
        ...result
      }),
    };

  } catch (error) {
    console.error('❌ Database check failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

/**
 * Main validation: Ensure no unpaid accounts exist in the system
 */
async function validatePaymentFirstSystem() {
  console.log('🔍 Validating payment-first system integrity');
  
  // Check 1: Count total profiles
  const { data: allProfiles, error: allError } = await supabase
    .from('profiles')
    .select('id, email, is_paid, subscription_plan, created_at')
    .order('created_at', { ascending: false });

  if (allError) {
    throw new Error(`Failed to fetch profiles: ${allError.message}`);
  }

  // Check 2: Count unpaid profiles (should be 0 in payment-first system)
  const { data: unpaidProfiles, error: unpaidError } = await supabase
    .from('profiles')
    .select('id, email, is_paid, subscription_plan, created_at')
    .eq('is_paid', false);

  if (unpaidError) {
    throw new Error(`Failed to fetch unpaid profiles: ${unpaidError.message}`);
  }

  // Check 3: Count auth users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    throw new Error(`Failed to fetch auth users: ${authError.message}`);
  }

  // Analysis
  const totalProfiles = allProfiles?.length || 0;
  const unpaidCount = unpaidProfiles?.length || 0;
  const totalAuthUsers = authUsers?.users?.length || 0;
  const paidCount = totalProfiles - unpaidCount;

  // Payment-first system validation
  const isValidPaymentFirstSystem = unpaidCount === 0;
  const profileAuthUserMatch = totalProfiles === totalAuthUsers;

  return {
    payment_first_validation: {
      is_valid: isValidPaymentFirstSystem,
      total_profiles: totalProfiles,
      paid_profiles: paidCount,
      unpaid_profiles: unpaidCount,
      total_auth_users: totalAuthUsers,
      profile_auth_match: profileAuthUserMatch,
      issues: []
    },
    summary: isValidPaymentFirstSystem ? 
      '✅ Payment-first system is working correctly - no unpaid accounts found' :
      `❌ Payment-first system violation - found ${unpaidCount} unpaid accounts`,
    recent_profiles: allProfiles?.slice(0, 5) || []
  };
}

/**
 * Check user account integrity
 */
async function checkUserAccounts() {
  console.log('🔍 Checking user account integrity');

  // Get all profiles with their auth user data
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profileError) {
    throw new Error(`Failed to fetch profiles: ${profileError.message}`);
  }

  // Get all auth users
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  
  if (authError) {
    throw new Error(`Failed to fetch auth users: ${authError.message}`);
  }

  const authUsers = authData.users || [];

  // Analysis
  const orphanedProfiles = [];
  const orphanedAuthUsers = [];
  const validAccounts = [];

  // Check for profiles without corresponding auth users
  for (const profile of profiles) {
    const authUser = authUsers.find(u => u.id === profile.id);
    if (!authUser) {
      orphanedProfiles.push(profile);
    } else {
      validAccounts.push({
        profile: profile,
        authUser: authUser
      });
    }
  }

  // Check for auth users without corresponding profiles
  for (const authUser of authUsers) {
    const profile = profiles.find(p => p.id === authUser.id);
    if (!profile) {
      orphanedAuthUsers.push(authUser);
    }
  }

  return {
    account_integrity: {
      total_profiles: profiles.length,
      total_auth_users: authUsers.length,
      valid_accounts: validAccounts.length,
      orphaned_profiles: orphanedProfiles.length,
      orphaned_auth_users: orphanedAuthUsers.length,
      is_healthy: orphanedProfiles.length === 0 && orphanedAuthUsers.length === 0
    },
    issues: {
      orphaned_profiles: orphanedProfiles,
      orphaned_auth_users: orphanedAuthUsers.map(u => ({ id: u.id, email: u.email }))
    }
  };
}

/**
 * Check email uniqueness constraints
 */
async function checkEmailUniqueness() {
  console.log('🔍 Checking email uniqueness');

  // Check for duplicate emails in profiles table
  const { data: emailCounts, error: emailError } = await supabase
    .from('profiles')
    .select('email')
    .order('email');

  if (emailError) {
    throw new Error(`Failed to check email uniqueness: ${emailError.message}`);
  }

  // Count email occurrences
  const emailCountMap = {};
  const duplicates = [];

  for (const profile of emailCounts) {
    const email = profile.email;
    emailCountMap[email] = (emailCountMap[email] || 0) + 1;
    
    if (emailCountMap[email] === 2) {
      duplicates.push(email);
    }
  }

  return {
    email_uniqueness: {
      total_emails: emailCounts.length,
      unique_emails: Object.keys(emailCountMap).length,
      duplicate_emails: duplicates.length,
      is_unique: duplicates.length === 0,
      duplicates: duplicates
    }
  };
}

/**
 * Check database constraints and policies
 */
async function checkDatabaseConstraints() {
  console.log('🔍 Checking database constraints');

  try {
    // Test email uniqueness constraint by attempting duplicate insert
    const testEmail = `test-${Date.now()}@constraint-check.com`;
    
    // This should succeed
    const { data: testProfile, error: insertError } = await supabase
      .from('profiles')
      .insert([{
        id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        email: testEmail,
        is_paid: true
      }])
      .select();

    // Clean up test record (if it was created)
    if (testProfile) {
      await supabase
        .from('profiles')
        .delete()
        .eq('email', testEmail);
    }

    return {
      constraint_check: {
        unique_email_constraint: insertError ? 
          (insertError.message.includes('duplicate') || insertError.message.includes('unique') ? 'enforced' : 'error') :
          'needs_cleanup',
        test_email: testEmail,
        error: insertError?.message || null
      }
    };

  } catch (error) {
    return {
      constraint_check: {
        unique_email_constraint: 'check_failed',
        error: error.message
      }
    };
  }
}

/**
 * Perform comprehensive audit of the payment-first system
 */
async function performFullAudit() {
  console.log('🔍 Performing full system audit');

  const results = {};

  try {
    results.payment_first = await validatePaymentFirstSystem();
    results.accounts = await checkUserAccounts();
    results.emails = await checkEmailUniqueness();
    results.constraints = await checkDatabaseConstraints();

    // Overall health assessment
    const isHealthy = (
      results.payment_first.payment_first_validation.is_valid &&
      results.accounts.account_integrity.is_healthy &&
      results.emails.email_uniqueness.is_unique
    );

    results.overall_health = {
      is_healthy: isHealthy,
      status: isHealthy ? '✅ System is healthy' : '❌ Issues detected',
      checks_performed: 4,
      checks_passed: [
        results.payment_first.payment_first_validation.is_valid,
        results.accounts.account_integrity.is_healthy,
        results.emails.email_uniqueness.is_unique,
        results.constraints.constraint_check.unique_email_constraint === 'enforced'
      ].filter(Boolean).length
    };

    return results;

  } catch (error) {
    return {
      audit_error: error.message,
      partial_results: results
    };
  }
}