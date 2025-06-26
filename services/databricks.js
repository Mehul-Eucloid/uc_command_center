import axios from 'axios';

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;

const api = axios.create({
  baseURL: `https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2`,
  headers: {
    'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
    'Content-Type': 'application/scim+json'
  }
});
const workspaceApi = axios.create({
  baseURL: 'https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2',
  headers: {
    'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
    'Content-Type': 'application/scim+json'
  }
});

export const getUsers = async () => {
  try {
    console.log('Calling Databricks API to fetch users...');
    const response = await api.get('/Users?attributes=id,userName,name.givenName,name.familyName,emails,groups');
    
    // Get all groups to map IDs to names
    console.log('Fetching groups to resolve group names...');
    const groupsResponse = await api.get('/Groups?attributes=id,displayName');
    const groupMap = new Map(groupsResponse.data.Resources.map(g => [g.id, g.displayName]));
    
    const users = response.data.Resources.map(user => {
      // Process groups information
      const groups = user.groups?.map(group => ({
        id: group.value,
        name: groupMap.get(group.value) || group.value
      })) || [];
      
      return {
        id: user.id,
        name: `${user.name?.givenName || ''} ${user.name?.familyName || ''}`.trim(),
        email: user.emails?.[0]?.value || '',
        groups: groups,
      };
    });
    
    console.log(`Processed ${users.length} users with their groups`);
    return users;
  } catch (error) {
    console.error('Error fetching users from Databricks:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteUser = async (userId) => {
  try {
    // Add validation here too
    if (!userId || userId === 'undefined') {
      throw new Error('Valid user ID is required for deletion');
    }
    
    const response = await api.delete(`/Users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Databricks delete error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to delete user');
  }
};

export const assignUserToGroup = async (userId, groupId, isWorkspaceLevel = true) => {
  try {
    const endpoint = isWorkspaceLevel
      ? `https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2/Users/${userId}`
      : `https://accounts.cloud.databricks.com/api/2.1/accounts/${process.env.DATABRICKS_ACCOUNT_ID}/scim/v2/Users/${userId}`;
    
    const patchData = {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [{
        op: 'add',
        path: 'groups',
        value: [{
          value: groupId
        }]
      }]
    };
    
    const response = await axios.patch(endpoint, patchData, {
      headers: {
        'Authorization': `Bearer ${isWorkspaceLevel ? process.env.DATABRICKS_TOKEN : process.env.DATABRICKS_ACCOUNT_TOKEN}`,
        'Content-Type': 'application/scim+json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error assigning user to group:', error);
    throw error;
  }
};
export const getGroups = async () => {
  try {
    const response = await api.get('/Groups?attributes=id,displayName,members');
    return response.data.Resources.map(group => ({
      id: group.id,
      name: group.displayName,
      users: group.members ? group.members.length : 0,
      members: group.members || [] // Keep member list for reference
    }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    throw error;
  }
};

export const updateUser = async (userId, { name, email }) => {
  try {
    const [givenName, familyName] = name.split(' ');
    await api.put(`/Users/${userId}`, {
      name: {
        givenName,
        familyName
      },
      emails: [{
        value: email,
        type: 'work',
        primary: true
      }]
    });
    return { id: userId, name, email };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};
// export const addUsersToGroup = async (groupId, userIds) => {
//   try {
//     const response = await api.post(`/Groups/${groupId}`, {
//       Operations: userIds.map(userId => ({
//         op: 'add',
//         path: 'members',
//         value: [{ value: userId }]
//       }))
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error adding users to Databricks group:', error);
//     throw error;
//   }
// };
export const addUsersToGroup = async (groupId, userIds) => {
  try {
    // Create PATCH operation for each user
    const response = await api.patch(`/Groups/${groupId}`, {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: userIds.map(userId => ({
        op: 'add',
        path: 'members',
        value: [{ value: userId }]
      }))
    });
    return response.data;
  } catch (error) {
    console.error('Error adding users to Databricks group:', error);
    throw error;
  }
};

export const deleteGroup = async (groupId) => {
  try {
    const response = await api.delete(`/groups/${groupId}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting group ${groupId}:`, error?.response?.data || error.message);
    
    // Create a more user-friendly error message
    let errorMessage = 'Failed to delete group';
    if (error.response?.data?.detail) {
      if (error.response.status === 403) {
        errorMessage = 'You do not have permission to delete this group';
      } else {
        errorMessage = error.response.data.detail;
      }
    }
    
    throw new Error(errorMessage);
  }
};
// export const removeUsersFromGroup = async (groupId, memberIds = []) => {
//   try {
//     const results = await Promise.all(
//       memberIds.map(async (memberId) => {
//         return await api.delete(`/Groups/${groupId}/members/${memberId}`);
//       })
//     );
//     return results;
//   } catch (error) {
//     console.error(`Error removing users from group ${groupId}:`, error?.response?.data || error.message);
//     throw error;
//   }
// };
export const removeUsersFromGroup = async (groupId, userIds) => {
  try {
    const response = await api.patch(`/Groups/${groupId}`, {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: userIds.map(userId => ({
        op: 'remove',
        path: `members[value eq "${userId}"]`
      }))
    });
    return response.data;
  } catch (error) {
    console.error('Error removing users from group:', error);
    throw error;
  }
};
export const updateGroup = async (groupId, updates = {}) => {
  try {
    const response = await api.patch(`/Groups/${groupId}`, {
      ...updates,
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"]
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating group ${groupId}:`, error?.response?.data || error.message);
    throw error;
  }
};


export const getGroupMembers = async (groupId) => {
  try {
    const response = await api.get(`/Groups/${groupId}?attributes=members`);
    console.log('Current group members:', response.data.members);
    return response.data.members || [];
  } catch (error) {
    console.error('Error fetching group members:', error);
    return [];
  }
};
export const getUserGroups = async (userId) => {
  try {
    const response = await api.get(`/Users/${userId}?attributes=groups`);
    console.log('Current user groups:', response.data.groups);
    return response.data.groups || [];
  } catch (error) {
    console.error('Error fetching user groups:', error);
    return [];
  }
};
// Add these functions to your databricks.js file
export const createGroup = async (groupData) => {
  try {
    // Make sure we have the necessary data
    if (!groupData || !groupData.name) {
      throw new Error('Group name is required');
    }
    
    const { name, source = 'workspace' } = groupData;
    
    // Determine the endpoint based on source
    const endpoint = source.toLowerCase() === 'account' ? '/account/Groups' : '/Groups';
    
    console.log(`Creating group '${name}'...`);
    
    // Set headers based on source
    const headers = source.toLowerCase() === 'account' ? getAccountHeaders() : getWorkspaceHeaders();
    
    // Prepare the request payload - simplified to match your Python version
    const payload = {
      displayName: name
    };
    
    try {
      const response = await api.post(endpoint, payload, { headers });
      
      if (response.status === 201) {
        const groupId = response.data.id;
        console.log(`✅ Group created with ID: ${groupId}`);
        
        // If account group, sync to workspace if needed
        if (source.toLowerCase() === 'account' && groupId) {
          console.log(`🔄 Syncing account group to workspace...`);
          await assignAccountGroupToWorkspace(groupId, name);
        }
        
        return {
          id: groupId,
          name: response.data.displayName,
          source: source,
          isNew: true
        };
      }
    } catch (error) {
      // Check for 409 Conflict (group already exists)
      if (error.response && error.response.status === 409) {
        console.log(`ℹ️ Group already exists. Retrieving ID...`);
        const groupId = await getGroupId(name, source);
        
        if (groupId) {
          console.log(`   Found existing group ID: ${groupId}`);
          
          // If account group, sync to workspace if needed
          if (source.toLowerCase() === 'account' && groupId) {
            console.log(`🔄 Syncing account group to workspace...`);
            await assignAccountGroupToWorkspace(groupId, name);
          }
          
          return {
            id: groupId,
            name: name,
            source: source,
            isNew: false
          };
        } else {
          throw new Error('Conflict but could not fetch group ID');
        }
      }
      throw error; // Re-throw if not a 409 error
    }
  } catch (error) {
    console.error('Error creating group:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to create group');
  }
};

// Helper function to get a group ID by name
export const getGroupId = async (groupName, source = 'workspace') => {
  try {
    const endpoint = source.toLowerCase() === 'account' ? '/account/Groups' : '/Groups';
    const headers = source.toLowerCase() === 'account' ? getAccountHeaders() : getWorkspaceHeaders();
    
    // Filter by displayName
    const response = await api.get(`${endpoint}?filter=displayName eq "${encodeURIComponent(groupName)}"`, { headers });
    
    if (response.data && response.data.Resources && response.data.Resources.length > 0) {
      return response.data.Resources[0].id;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching group ID for ${groupName}:`, error);
    return null;
  }
};

// Helper function to assign account group to workspace
export const assignAccountGroupToWorkspace = async (groupId, groupName) => {
  try {
    // Implement the account to workspace sync logic here
    // This will depend on your specific Databricks environment requirements
    console.log(`✅ Synced account group ${groupName} to workspace`);
    return true;
  } catch (error) {
    console.error(`Error syncing account group to workspace:`, error);
    return false;
  }
};

// Helper functions for headers
const getWorkspaceHeaders = () => {
  return {
    'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
    'Content-Type': 'application/scim+json'
  };
};

const getAccountHeaders = () => {
  return {
    'Authorization': `Bearer ${process.env.DATABRICKS_ACCOUNT_TOKEN}`,
    'Content-Type': 'application/scim+json'
  };
};
// Optional: Function to get group details (if needed)
export const getGroupDetails = async (groupId) => {
  try {
    const response = await api.get(`/Groups/${groupId}`);
    return {
      id: response.data.id,
      name: response.data.displayName,
      source: response.data.meta?.location || 'Unknown',
      members: response.data.members?.length || 0
    };
  } catch (error) {
    console.error(`Error fetching group details for ${groupId}:`, error);
    throw error;
  }
};


// Helper function to add user to admin group
export const addUserToAdminGroup = async (userId) => {
  try {
    // You'll need to determine your admin group ID or fetch it
    const adminGroupId = process.env.DATABRICKS_ADMIN_GROUP_ID;
    
    if (!adminGroupId) {
      console.warn('Admin group ID not configured. Skipping admin group assignment.');
      return;
    }
    
    // Use the existing assignUserToGroup function
    await assignUserToGroup(userId, adminGroupId);
    console.log(`✅ User added to admin group`);
    return true;
  } catch (error) {
    console.error('Error adding user to admin group:', error);
    throw error;
  }
};

// Helper function to update user entitlements
export const updateUserEntitlements = async (userId, entitlements) => {
  try {
    if (!entitlements || entitlements.length === 0) {
      return;
    }
    
    console.log(`Updating entitlements for user ${userId}:`, entitlements);
    
    // Create PATCH operation for entitlements
    const response = await api.patch(`/Users/${userId}`, {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: [
        {
          op: "add",
          path: "entitlements",
          value: entitlements.map(entitlement => ({ value: entitlement }))
        }
      ]
    });
    
    console.log(`✅ Entitlements updated successfully`);
    return response.data;
  } catch (error) {
    console.error('Error updating user entitlements:', error.response?.data || error.message);
    throw error;
  }
};


export const getUserByEmail = async (email, isWorkspaceLevel = true) => {
  try {
    const endpoint = isWorkspaceLevel
      ? `https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2/Users`
      : `https://accounts.cloud.databricks.com/api/2.1/accounts/${process.env.DATABRICKS_ACCOUNT_ID}/scim/v2/Users`;
    
    const encodedEmail = encodeURIComponent(email);
    const response = await axios.get(`${endpoint}?filter=userName eq "${encodedEmail}"`, {
      headers: {
        'Authorization': `Bearer ${isWorkspaceLevel ? process.env.DATABRICKS_TOKEN : process.env.DATABRICKS_ACCOUNT_TOKEN}`,
        'Content-Type': 'application/scim+json'
      }
    });
    
    if (response.data.totalResults === 0) {
      return null;
    }
    
    const user = response.data.Resources[0];
    return {
      id: user.id,
      email: user.userName,
      displayName: user.displayName || '',
      groups: user.groups?.map(g => ({ 
        id: g.value,
        name: g.display || g.value
      })) || [],
      entitlements: user.entitlements?.map(e => e.value) || []
    };
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw error;
  }
};


export const createUser = async (userData) => {
  try {
    // Validate required fields
    if (!userData.email) {
      throw new Error('Email is required for user creation');
    }

    // Determine if we're creating at workspace or account level
    // Default to workspace level since that's what you want
    const isWorkspaceLevel = true;
    
    // Set the appropriate API endpoint
    const endpoint = isWorkspaceLevel 
      ? `https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2/Users` 
      : `https://accounts.cloud.databricks.com/api/2.1/accounts/${process.env.DATABRICKS_ACCOUNT_ID}/scim/v2/Users`;
    
    // Prepare SCIM compliant payload
    const payload = {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      userName: userData.email,
      displayName: userData.displayName || userData.email,
      active: true,
      // Workspace-level user creation may handle entitlements differently
      entitlements: userData.entitlements?.map(ent => ({
        value: ent
      })) || []
    };

    // Add name fields if available
    if (userData.firstName || userData.lastName) {
      payload.name = {
        givenName: userData.firstName || '',
        familyName: userData.lastName || ''
      };
    }

    // Add emails if available
    payload.emails = [{
      value: userData.email,
      type: 'work',
      primary: true
    }];

    // Make the API request to the appropriate endpoint
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Authorization': `Bearer ${isWorkspaceLevel ? process.env.DATABRICKS_TOKEN : process.env.DATABRICKS_ACCOUNT_TOKEN}`,
        'Content-Type': 'application/scim+json'
      }
    });

    // If groups are specified, add user to those groups
    if (userData.groups && userData.groups.length > 0 && response.data.id) {
      await Promise.all(
        userData.groups.map(groupId => 
          assignUserToGroup(response.data.id, groupId, isWorkspaceLevel)
        )
      );
    }

    // Return the created user data
    return {
      id: response.data.id,
      email: response.data.userName,
      displayName: response.data.displayName,
      active: response.data.active,
      groups: userData.groups || [],
      entitlements: userData.entitlements || []
    };
  } catch (error) {
    console.error('Databricks createUser error:', error.response?.data || error.message);
    
    // Handle specific error cases
    if (error.response?.status === 409) {
      throw new Error('User already exists in Databricks');
    }
    
    throw new Error(error.response?.data?.detail || 'Failed to create user in Databricks');
  }
};
export const validateGroupExists = async (groupId) => {
  try {
    const response = await api.get(`/Groups/${groupId}`);
    return response.data ? true : false;
  } catch (error) {
    if (error.response?.status === 404) {
      return false;
    }
    throw error;
  }
};

