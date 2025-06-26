import axios from 'axios';

const API_BASE_URL = 'http://13.126.41.254:5000/api';

// axios instance for local API
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
    'User-Agent': 'Chatbot/1.0'
  },
  timeout: 50000,
  withCredentials: true
});

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
  const databricksHost = user.databricksHost || 'https://dbc-6e076fbc-a34a.cloud.databricks.com'; // Fallback host

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  // If the request is meant for Databricks, adjust the baseURL dynamically
  if (config.url.startsWith('/databricks')) {
    config.baseURL = databricksHost;
    config.url = config.url.replace('/databricks', ''); // Remove the prefix
  }

  console.log(`[${new Date().toISOString()}] Outgoing request to ${config.url}`);
  return config;
}, error => {
  console.error('Request error:', error);
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(response => {
  console.log(`[${new Date().toISOString()}] Response from ${response.config.url}`, response.status);
  return response;
}, error => {
  const errorDetails = {
    message: error.message,
    code: error.code,
    config: error.config,
    response: error.response?.data
  };

  console.error('API Error:', errorDetails);

  if (error.code === 'ECONNABORTED') {
    error.message = 'Request timeout - please try again';
  } else if (!error.response) {
    error.message = 'Network error - please check your connection to the server';
  } else if (error.response?.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/';
  }

  return Promise.reject(error);
});
// User-related functions
export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUserDetails = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const response = await api.get(`/users/${userId}/details`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user details:', {
      userId,
      message: error.message,
      response: error.response?.data
    });
    throw new Error(error.response?.data?.error || 'Failed to fetch user details');
  }
};
export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const deleteUser = async (userId) => {
  try {
    if (!userId) {
      throw new Error("User ID is required for deletion");
    }
    
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error("API deleteUser error:", error);
    throw error;
  }
};
export const getCatalogStats = async (catalogName) => {
  try {
    const response = await api.get(`/catalogs/${encodeURIComponent(catalogName)}/stats`);
    return response.data;
  } catch (error) {
    console.error('Error fetching catalog stats:', error);
    throw error;
  }
};
  export const getWorkspaceStats = async (timeFilter) => {
    try {
      const response = await api.get('/workspace/stats', {
        params: { timeFilter }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching workspace stats:', error);
      throw error;
    }
  };
export const assignUserToGroup = async (userId, groupId) => {
  const response = await api.post(`/users/${userId}/assign-group`, { groupId });
  return response.data;
};
export const getCatalogPrivileges = async (catalogName) => {
  try {
    const response = await api.get(`/catalogs/${encodeURIComponent(catalogName)}/privileges`);
    return response.data;
  } catch (error) {
    console.error('Error fetching catalog privileges:', error);
    throw error;
  }
};
export const getCatalogUserPrivileges = async (catalogName) => {
  try {
    const response = await api.get(`/catalogs/${encodeURIComponent(catalogName)}/user-privileges`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user privileges:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch user privilege statistics');
  }
};
// Group-related functions
export const getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};
export const getGroupsMember = async () => {
  try {
    const response = await api.get('/groups?attributes=id,displayName,members');
    return response.data.map(group => ({
      id: group.id,
      name: group.displayName,
      members: group.members || []
    }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
};

export const getGroupMembers = async (groupId) => {
  try {
    const response = await api.get(`/groups/${groupId}/members`);
    return response.data.map(member => member.value);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return [];
  }
};


export const deleteGroup = async (groupId) => {
  const response = await api.delete(`/groups/${groupId}`);
  return response.data;
};

export const addUsersToGroup = async (groupId, userIds) => {
  try {
    const response = await api.post(`/groups/${groupId}/add-members`, { userIds });
    return response.data;
  } catch (error) {
    console.error('Error adding users to group:', error);
    throw error;
  }
};

export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health');
    return {
      online: true,
      responseTime: response.headers['x-response-time'],
      version: response.data.version
    };
  } catch (error) {
    return {
      online: false,
      error: error.message
    };
  }
};
export const removeUsersFromGroup = async (groupId, userIds) => {
  try {
    const validUserIds = userIds.filter(id => id);
    if (validUserIds.length === 0) return;

    const response = await api.post(`/groups/${groupId}/remove-members`, { 
      userIds: validUserIds 
    });
    return response.data;
  } catch (error) {
    console.error('Error removing users from group:', error);
    throw error;
  }
};

export const addUserToGroup = async ({ userId, groupName }) => {
  try {
    return withRetry(async () => {
      const response = await api.post('/groups/add-member', {
        userId,
        groupName
      });
      return response.data;
    });
  } catch (error) {
    console.error('API Error - addUserToGroup:', {
      error: error.response?.data || error.message,
      userId,
      groupName
    });
    throw new Error(error.response?.data?.error || 'Failed to add user to group');
  }
};
export const addUserToGroupDirectly = async (groupId, userId) => {
  const { userExists, groupExists } = await validateEntitiesExist(userId, groupId);
  
  if (!userExists) throw new Error(`User ${userId} not found`);
  if (!groupExists) throw new Error(`Group ${groupId} not found`);

  const patchData = {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    Operations: [{
      op: 'add',
      path: 'members',
      value: [{
        value: userId,
        $ref: `${process.env.DATABRICKS_HOST}/api/2.0/account/scim/v2/Users/${userId}`
      }]
    }]
  };

  const response = await api.patch(`/Groups/${groupId}`, patchData);
  return response.data;
};
export const validateUserExists = async (userId) => {
  try {
    await api.get(`/Users/${userId}`);
    return true;
  } catch (error) {
    if (error.response?.status === 404) return false;
    throw error;
  }
};
export const validateGroupExists = async (groupId) => {
  try {
    await api.get(`/Groups/${groupId}`);
    return true;
  } catch (error) {
    if (error.response?.status === 404) return false;
    throw error;
  }
};

export const getUserGroups = async (userId) => {
  try {
    const response = await api.get(`/users/${userId}/groups`);
    return response.data || [];
  } catch (error) {
    console.error(`Failed to get groups for user ${userId}:`, error);
    return []; 
  }
};


// export const checkUserExists = async (email) => {
//   try {
//     const response = await api.get(`/users/${encodeURIComponent(email)}`);
//     return response.data;
//   } catch (error) {
//     if (error.response?.status === 404) {
//       return null;
//     }
//     console.error('Error checking user:', error);
//     throw error;
//   }
// };
export const checkUserExists = async (email) => {
  try {
    const response = await api.get(`/databricks/api/2.0/preview/scim/v2/Users?filter=userName eq "${encodeURIComponent(email)}"`);
    return response.data.Resources?.[0] || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error('Error checking user:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error('API createUser error:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
};
export const createGroup = async (groupData) => {
  try {
    console.log('Creating group:', groupData);
    
    const payload = {
      name: groupData.name,
      comment: groupData.comment || ''
    };

    const response = await api.post('/groups', payload);
    return response.data;
  } catch (error) {
    console.error('API Error - createGroup:', {
      error: error.response?.data || error.message,
      groupData
    });
    
    if (error.response?.status === 409) {
      throw new Error(`Group '${groupData.name}' already exists`);
    }
    
    throw new Error(error.response?.data?.error || 'Failed to create group');
  }
};
export const validateEntitiesExist = async (userId, groupId) => {
  try {
    const [userResponse, groupResponse] = await Promise.all([
      api.get(`/Users/${userId}`),
      api.get(`/Groups/${groupId}`)
    ]);
    return { userExists: true, groupExists: true };
  } catch (error) {
    return {
      userExists: error.config?.url.includes(userId) ? false : true,
      groupExists: error.config?.url.includes(groupId) ? false : true
    };
  }
};

// Add these functions to your api.js

export const getTables = async (catalogName, schemaName) => {
  try {
    const response = await api.get(`/tables/${catalogName}/${schemaName}`);
    // Map the response to include tags from properties
    return response.data.map(table => {
      const tags = [];
      if (table.properties) {
        Object.keys(table.properties).forEach(key => {
          if (key.startsWith('tag.')) {
            tags.push(key.replace('tag.', ''));
          }
        });
      }
      return {
        ...table,
        tags: tags.length > 0 ? tags : table.tags || []
      };
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch tables');
  }
};
export const createTable = async ({ catalogName, schemaName, tableData }) => {
  try {
    // Include metadata in the initial creation request
    const response = await api.post(`/tables`, {
      catalogName,
      schemaName,
      tableData: {
        name: tableData.name,
        comment: tableData.comment,
        columns: tableData.columns,
        metadata: tableData.metadata, // Include metadata here
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error creating table:", error);
    throw new Error(error.response?.data?.error || "Failed to create table");
  }
};

export const deleteTable = async (catalogName, schemaName, tableName) => {
  try {
    const response = await api.delete(`/tables/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}/${encodeURIComponent(tableName)}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting table:', error);
    throw new Error(error.response?.data?.error || 'Failed to delete table');
  }
};

export const getGroupDetails = async (groupId) => {
  try {
    const response = await api.get(`/groups/${groupId}`);
    return {
      id: response.data.id,
      displayName: response.data.displayName,
      name: response.data.displayName || response.data.name,
      members: response.data.members || []
    };
  } catch (error) {
    console.error('API Error - getGroupDetails:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch group details');
  }
};

// export const updateGroup = async (groupId, updates = {}) => {
//   try {
//     console.log('Preparing group update for:', groupId, updates);
    
//     // Validate inputs
//     if (!groupId) throw new Error('Group ID is required');
//     if (!updates.displayName && !updates.entitlements) {
//       console.warn('No updates provided');
//       return { success: true, message: 'No changes detected' };
//     }

//     // Prepare SCIM-compliant payload
//     const payload = {
//       schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
//       Operations: []
//     };

//     // Add displayName update if provided
//     if (updates.displayName) {
//       payload.Operations.push({
//         op: 'replace',
//         path: 'displayName',
//         value: updates.displayName
//       });
//     }

//     // Add entitlements update if provided
//     if (updates.entitlements) {
//       const entitlements = [];
      
//       if (updates.entitlements.clusterCreation) {
//         entitlements.push({ value: 'allow-cluster-create' });
//       }
//       if (updates.entitlements.sqlAccess) {
//         entitlements.push({ value: 'databricks-sql-access' });
//       }
//       if (updates.entitlements.workspaceAccess) {
//         entitlements.push({ value: 'workspace-access' });
//       }

//       payload.Operations.push({
//         op: 'replace',
//         path: 'entitlements',
//         value: entitlements
//       });
//     }

//     console.log('Sending SCIM payload:', JSON.stringify(payload, null, 2));
    
//     const response = await api.patch(`/groups/${groupId}`, payload);
//     console.log('Update successful:', response.data);
//     return response.data;

//   } catch (error) {
//     console.error('Update group error:', {
//       message: error.message,
//       response: error.response?.data,
//       request: error.config?.data,
//       stack: error.stack
//     });
    
//     let errorMsg = 'Failed to update group';
//     if (error.response?.data?.detail) {
//       errorMsg += `: ${error.response.data.detail}`;
//     } else if (error.message) {
//       errorMsg += `: ${error.message}`;
//     }
    
//     throw new Error(errorMsg);
//   }
// };
export const updateGroup = async (groupId, updates = {}, attempt = 0) => {
  const maxAttempts = 3;
  const retryDelay = 1000 * Math.pow(2, attempt); // Exponential backoff

  try {
    console.log(`Attempt ${attempt + 1}/${maxAttempts} to update group ${groupId}`);
    
    // Validate inputs
    if (!groupId) throw new Error('Missing group ID');
    if (!updates.displayName && !updates.entitlements) {
      return { success: true, message: 'No changes detected' };
    }

    // Prepare SCIM payload
    const payload = {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: []
    };

    // Add displayName update if provided
    if (updates.displayName) {
      payload.Operations.push({
        op: 'replace',
        path: 'displayName',
        value: updates.displayName
      });
    }

    // Add entitlements update if provided
    if (updates.entitlements) {
      const entitlements = [];
      
      if (updates.entitlements.clusterCreation) {
        entitlements.push({ value: 'allow-cluster-create' });
      }
      if (updates.entitlements.sqlAccess) {
        entitlements.push({ value: 'databricks-sql-access' });
      }
      if (updates.entitlements.workspaceAccess) {
        entitlements.push({ value: 'workspace-access' });
      }

      if (entitlements.length > 0) {
        payload.Operations.push({
          op: 'replace',
          path: 'entitlements',
          value: entitlements
        });
      }
    }

    // Make the API call
    const response = await api.patch(`/groups/${groupId}`, payload);
    return response.data;

  } catch (error) {
    if (attempt < maxAttempts - 1 && 
        (!error.response || error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
      console.log(`Retrying in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return updateGroup(groupId, updates, attempt + 1);
    }

    let errorMessage = 'Failed to update group';
    if (error.response) {
      errorMessage += ` (Status: ${error.response.status})`;
      if (error.response.data?.detail) {
        errorMessage += `: ${error.response.data.detail}`;
      }
    } else {
      errorMessage += `: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
};

export const updateGroupEntitlements = async (groupId, updates) => {
  try {
  
    const payload = {
      displayName: updates.displayName || updates.name,
      entitlements: updates.entitlements || {}
    };

    const response = await api.patch(`/groups/${groupId}/entitlements`, payload);
    return response.data;
  } catch (error) {
    console.error('API Error - updateGroupEntitlements:', {
      error: error.response?.data || error.message,
      groupId,
      updates
    });
    
    throw new Error(
      error.response?.data?.error || 
      error.response?.data?.details || 
      'Failed to update entitlements'
    );
  }
};

export const getGroupEntitlements = async (groupId) => {
  try {
    const response = await api.get(`/groups/${groupId}/entitlements`);
    
    return {
      clusterCreation: response.data.clusterCreation || false,
      sqlAccess: response.data.sqlAccess || false,
      workspaceAccess: response.data.workspaceAccess || false
    };
  } catch (error) {
    console.error('API Error - getGroupEntitlements:', error);
    return {
      clusterCreation: false,
      sqlAccess: false,
      workspaceAccess: false
    };
  }
};


// Catalog-related functions
export const getCatalogs = async () => {
  const response = await api.get('/catalogs');
  return response.data;
};

export const getCatalogDetails = async (catalogId) => {
  const response = await api.get(`/catalogs/${catalogId}`);
  return response.data;
};


  export const uploadData = async (formDataParams) => {
    console.log('Starting upload with params:', {
      catalog: formDataParams.get('catalog'),
      schema: formDataParams.get('schema'),
      table: formDataParams.get('table'),
      fileType: formDataParams.get('fileType'),
      file: formDataParams.get('file')?.name || 'No file',
      cloudProvider: formDataParams.get('cloudProvider'),
      sourcePath: formDataParams.get('sourcePath')
    });
    
    try {
      // Ensure schemaDefinition is properly formatted
      const schemaDefinition = formDataParams.get('schemaDefinition');
      if (schemaDefinition) {
        try {
          // Make sure it's valid JSON
          JSON.parse(schemaDefinition);
        } catch (e) {
          console.error('Invalid schema definition JSON:', e);
          throw new Error('Schema definition is not valid JSON');
        }
      }

      // Make the API request
      const response = await axios.post(`${API_BASE_URL}/upload`, formDataParams, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      console.log('Upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Upload failed:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Improve error reporting
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Unknown error during upload');
      }
    }
  };

// New function for cloud migration
export const migrateCloudData = async (formData) => {
  try {
    const response = await api.post('/cloud-migrate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Cloud migration error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to migrate cloud data');
  }
};
export const fetchSchemaDetails = async (catalog, schema, table) => {
  const response = await api.get(`/schema/${catalog}/${schema}/${table}`);
  return response.data;
};
export const updateCatalog = async (catalogId, updates) => {
  const response = await api.patch(`/catalogs/${catalogId}`, updates);
  return response.data;
};

export const deleteCatalog = async (catalogName) => {
  try {
    console.log(`Deleting catalog: ${catalogName}`);
    const response = await api.delete(`/catalogs/${encodeURIComponent(catalogName)}`);
    return response.data;
  } catch (error) {
    console.error('API Error - deleteCatalog:', {
      catalogName,
      error: error.response?.data || error.message
    });
    
    if (error.response?.status === 404) {
      throw new Error(`Catalog '${catalogName}' not found`);
    }
    if (error.response?.status === 400 && error.response.data?.error?.includes('referenced by views')) {
      throw new Error('Cannot delete - some tables are referenced by views');
    }
    
    throw new Error(error.response?.data?.error || 'Failed to delete catalog');
  }
};


export const getSchemas = async (catalogName) => {
  try {
    const response = await api.get(`/catalogs/${encodeURIComponent(catalogName)}/schemas`);
    return response.data;
  } catch (error) {
    console.error('Error fetching schemas:', {
      config: error.config,
      response: error.response?.data,
      message: error.message
    });
    throw new Error(error.response?.data?.error || 'Failed to fetch schemas');
  }
};



export const createCatalog = async (catalogData) => {
  try {
    console.log('Creating catalog:', catalogData);
    
    const propertiesObj = {};
    catalogData.properties?.forEach(prop => {
      if (prop.key && prop.value) {
        propertiesObj[prop.key] = prop.value;
      }
    });

    const payload = {
      name: catalogData.name,
      comment: catalogData.comment || '',
      properties: propertiesObj
    };

    const response = await api.post('/catalogs', payload);
    return response.data;
  } catch (error) {
    console.error('API Error - createCatalog:', {
      error: error.response?.data || error.message,
      catalogData
    });
    
    if (error.response?.status === 409) {
      throw new Error(`Catalog '${catalogData.name}' already exists`);
    }
    
    throw new Error(error.response?.data?.error || 'Failed to create catalog');
  }
};

export const createSchema = async (data) => {
  try {
    const response = await api.post('/schemas', {
      catalogName: data.catalogName,
      schemaName: data.name,  
      comment: data.comment || ''
    });
    return response.data;
  } catch (error) {
    console.error('API Error - createSchema:', {
      error: error.response?.data || error.message,
      data
    });
    throw new Error(error.response?.data?.error || 'Failed to create schema');
  }
};

export const deleteSchema = async (catalogName, schemaName) => {
  await api.delete(`/schemas/${encodeURIComponent(catalogName)}/${encodeURIComponent(schemaName)}`);
  return true;
};

const withRetry = async (fn, maxAttempts = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      console.log(`Retrying attempt ${attempt + 1}/${maxAttempts} for ${fn.name}`);
    }
  }
};
const shouldRetry = (error) => {
  return error.code === 'ECONNABORTED' ||
         error.code === 'ERR_NETWORK' ||
         error.response?.status >= 500;
};
// Privilege management functions
export const grantPrivileges = async (data) => {
  try {
    return withRetry(async () => {
      const response = await api.post('/privileges/grant', data);
      return response.data;
    });
  } catch (error) {
    console.error('API Error - grantPrivileges:', {
      error: error.response?.data || error.message,
      data
    });
    throw new Error(error.response?.data?.error || 'Failed to grant privileges');
  }
};

export const revokePrivileges = async (data) => {
  try {
    const response = await api.post('/privileges/revoke', data);
    return response.data;
  } catch (error) {
    console.error('API Error - revokePrivileges:', {
      error: error.response?.data || error.message,
      data
    });
    throw new Error(error.response?.data?.error || 'Failed to revoke privileges');
  }
};

export const getCurrentPrivileges = async (securable_type, full_name) => {
  try {
    const response = await api.get(`/privileges/${securable_type}/${encodeURIComponent(full_name)}`);
    return response.data;
  } catch (error) {
    console.error('API Error - getCurrentPrivileges:', {
      error: error.response?.data || error.message,
      securable_type,
      full_name
    });
    throw new Error(error.response?.data?.error || 'Failed to fetch current privileges');
  }
};