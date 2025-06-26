// import axios from 'axios';

// const API_BASE_URL = 'http://localhost:5000';

// // Create axios instance for local API
// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Authorization': `Bearer ${localStorage.getItem('token')}`,
//     'Content-Type': 'application/json'
//   }
// });

// // User-related functions
// export const getUsers = async () => {
//   const response = await api.get('/users');
//   return response.data;
// };


// export const updateUser = async (userId, userData) => {
//   const response = await api.put(`/users/${userId}`, userData);
//   return response.data;
// };

// export const deleteUser = async (userId) => {
//   try {
//     // Validate userId parameter
//     if (!userId) {
//       throw new Error("User ID is required for deletion");
//     }
    
//     const response = await fetch(`/api/users/${userId}`, {
//       method: 'DELETE',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });
    
//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.error || `Failed to delete user: ${response.status}`);
//     }
    
//     return true;
//   } catch (error) {
//     console.error("API deleteUser error:", error);
//     throw error;
//   }
// };

// export const assignUserToGroup = async (userId, groupId) => {
//   const response = await api.post(`/users/${userId}/assign-group`, { groupId });
//   return response.data;
// };

// // Group-related functions
// export const getGroups = async () => {
//   const response = await api.get('/groups');
//   return response.data;
// };
// export const getGroupsMember = async () => {
//   try {
//     const response = await api.get('/groups?attributes=id,displayName,members');
//     return response.data.map(group => ({
//       id: group.id,
//       name: group.displayName,
//       members: group.members || []
//     }));
//   } catch (error) {
//     console.error('Error fetching groups:', error);
//     return [];
//   }
// };

// export const getGroupMembers = async (groupId) => {
//   try {
//     const response = await api.get(`/groups/${groupId}/members`);
//     // Return array of member IDs (value fields)
//     return response.data.map(member => member.value);
//   } catch (error) {
//     console.error('Error fetching group members:', error);
//     return [];
//   }
// };


// export const deleteGroup = async (groupId) => {
//   const response = await api.delete(`/groups/${groupId}`);
//   return response.data;
// };

// export const addUsersToGroup = async (groupId, userIds) => {
//   try {
//     const response = await api.post(`/groups/${groupId}/add-members`, { userIds });
//     return response.data;
//   } catch (error) {
//     console.error('Error adding users to group:', error);
//     throw error;
//   }
// };

// export const removeUsersFromGroup = async (groupId, userIds) => {
//   try {
//     // Filter out any null/undefined values
//     const validUserIds = userIds.filter(id => id);
//     if (validUserIds.length === 0) return;

//     const response = await api.post(`/groups/${groupId}/remove-members`, { 
//       userIds: validUserIds 
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Error removing users from group:', error);
//     throw error;
//   }
// };
// export const addUserToGroupDirectly = async (groupId, userId) => {
//   // 1. Validate existence first
//   const { userExists, groupExists } = await validateEntitiesExist(userId, groupId);
  
//   if (!userExists) throw new Error(`User ${userId} not found`);
//   if (!groupExists) throw new Error(`Group ${groupId} not found`);

//   // 2. Proceed with assignment
//   const patchData = {
//     schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
//     Operations: [{
//       op: 'add',
//       path: 'members',
//       value: [{
//         value: userId,
//         $ref: `${process.env.DATABRICKS_HOST}/api/2.0/account/scim/v2/Users/${userId}`
//       }]
//     }]
//   };

//   const response = await api.patch(`/Groups/${groupId}`, patchData);
//   return response.data;
// };
// export const validateUserExists = async (userId) => {
//   try {
//     await api.get(`/Users/${userId}`);
//     return true;
//   } catch (error) {
//     if (error.response?.status === 404) return false;
//     throw error;
//   }
// };
// export const validateGroupExists = async (groupId) => {
//   try {
//     await api.get(`/Groups/${groupId}`);
//     return true;
//   } catch (error) {
//     if (error.response?.status === 404) return false;
//     throw error;
//   }
// };

// export const getUserGroups = async (userId) => {
//   try {
//     const response = await api.get(`/users/${userId}/groups`);
//     return response.data || []; // Ensure we always return an array
//   } catch (error) {
//     console.error(`Failed to get groups for user ${userId}:`, error);
//     return []; // Return empty array on error
//   }
// };


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

// export const createUser = async (userData) => {
//   try {
//     const response = await api.post('/users', userData);
//     return response.data;
//   } catch (error) {
//     console.error('API createUser error:', error);
//     throw new Error(error.response?.data?.error || error.message);
//   }
// };
// export const validateEntitiesExist = async (userId, groupId) => {
//   try {
//     const [userResponse, groupResponse] = await Promise.all([
//       api.get(`/Users/${userId}`),
//       api.get(`/Groups/${groupId}`)
//     ]);
//     return { userExists: true, groupExists: true };
//   } catch (error) {
//     return {
//       userExists: error.config?.url.includes(userId) ? false : true,
//       groupExists: error.config?.url.includes(groupId) ? false : true
//     };
//   }
// };
// // export const getGroupDetails = async (groupId) => {
// //   try {
// //     const response = await api.get(`/Groups/${groupId}`);
// //     const entitlements = await getGroupEntitlements(groupId);
    
// //     return {
// //       id: response.data.id,
// //       displayName: response.data.displayName,
// //       source: response.data.meta?.location || 'Unknown',
// //       members: response.data.members?.length || 0,
// //       entitlements: entitlements
// //     };
// //   } catch (error) {
// //     console.error(`Error fetching group details for ${groupId}:`, error);
// //     throw error;
// //   }
// // };
// export const getGroupDetails = async (groupId) => {
//   try {
//     const response = await api.get(`/groups/${groupId}`);
//     return {
//       id: response.data.id,
//       displayName: response.data.displayName,
//       name: response.data.displayName || response.data.name,
//       members: response.data.members || []
//     };
//   } catch (error) {
//     console.error('API Error - getGroupDetails:', error);
//     throw new Error(error.response?.data?.error || 'Failed to fetch group details');
//   }
// };

// export const updateGroup = async (groupId, updates = {}) => {
//   try {
//     console.log('Updating group with:', { groupId, updates }); // Debug log
    
//     const operations = [];
    
//     if (updates.displayName) {
//       operations.push({
//         op: 'replace',
//         path: 'displayName',
//         value: updates.displayName
//       });
//     }
    
//     if (updates.entitlements) {
//       const entitlementValues = [];
      
//       if (updates.entitlements.clusterCreation) {
//         entitlementValues.push({ value: 'allow-cluster-create' });
//       }
//       if (updates.entitlements.sqlAccess) {
//         entitlementValues.push({ value: 'databricks-sql-access' });
//       }
//       if (updates.entitlements.workspaceAccess) {
//         entitlementValues.push({ value: 'workspace-access' });
//       }
      
//       operations.push({
//         op: 'replace',
//         path: 'entitlements',
//         value: entitlementValues
//       });
//     }
    
//     if (operations.length === 0) {
//       console.warn('No updates to perform');
//       return { success: true, message: 'No changes detected' };
//     }
    
//     const response = await api.patch(`/groups/${groupId}`, {
//       schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
//       Operations: operations
//     });
    
//     console.log('Update successful:', response.data); // Debug log
//     return response.data;
//   } catch (error) {
//     console.error('Detailed update error:', {
//       message: error.message,
//       response: error.response?.data,
//       config: error.config,
//       stack: error.stack
//     });
    
//     throw new Error(error.response?.data?.detail || 
//                    error.response?.data?.error || 
//                    'Failed to update group');
//   }
// };

// export const updateGroupEntitlements = async (groupId, updates) => {
//   try {
//     // Prepare the payload in the correct format
//     const payload = {
//       displayName: updates.displayName || updates.name,
//       entitlements: updates.entitlements || {}
//     };

//     const response = await api.patch(`/groups/${groupId}/entitlements`, payload);
//     return response.data;
//   } catch (error) {
//     console.error('API Error - updateGroupEntitlements:', {
//       error: error.response?.data || error.message,
//       groupId,
//       updates
//     });
    
//     throw new Error(
//       error.response?.data?.error || 
//       error.response?.data?.details || 
//       'Failed to update entitlements'
//     );
//   }
// };


// // export const getGroupEntitlements = async (groupId) => {
// //   try {
// //     const response = await api.get(`/Groups/${groupId}?attributes=entitlements`);
    
// //     // Map the entitlements to our expected format
// //     const entitlements = {
// //       clusterCreation: false,
// //       sqlAccess: false,
// //       workspaceAccess: false
// //     };
    
// //     // Check if the group has any entitlements
// //     if (response.data.entitlements && Array.isArray(response.data.entitlements)) {
// //       response.data.entitlements.forEach(ent => {
// //         if (ent.value === 'allow-cluster-create') {
// //           entitlements.clusterCreation = true;
// //         } else if (ent.value === 'databricks-sql-access') {
// //           entitlements.sqlAccess = true;
// //         } else if (ent.value === 'workspace-access') {
// //           entitlements.workspaceAccess = true;
// //         }
// //       });
// //     }
    
// //     return entitlements;
// //   } catch (error) {
// //     console.error(`Error fetching group entitlements for ${groupId}:`, error);
// //     // Return default values if we can't fetch
// //     return {
// //       clusterCreation: false,
// //       sqlAccess: false,
// //       workspaceAccess: false
// //     };
// //   }
// // };
// export const getGroupEntitlements = async (groupId) => {
//   try {
//     const response = await api.get(`/groups/${groupId}/entitlements`);
    
//     // Map the response to our expected format
//     return {
//       clusterCreation: response.data.clusterCreation || false,
//       sqlAccess: response.data.sqlAccess || false,
//       workspaceAccess: response.data.workspaceAccess || false
//     };
//   } catch (error) {
//     console.error('API Error - getGroupEntitlements:', error);
//     return {
//       clusterCreation: false,
//       sqlAccess: false,
//       workspaceAccess: false
//     };
//   }
// };

// // Catalog API functions
// export const getCatalogs = async () => {
//     try {
//       const response = await axios.get('http://localhost:5000/catalogs', {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('access_token')}`
//         },
//         timeout: 10000
//       });
//       return response.data;
//     } catch (error) {
//       console.error('API Error - getCatalogs:', {
//         message: error.message,
//         response: error.response?.data,
//         config: error.config
//       });
//       throw error;
//     }
//   };
  
//   export const createCatalog = async (name) => {
//     try {
//       const response = await axios.post('http://localhost:5000/catalogs', 
//         { name },
//         {
//           headers: {
//             'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
//             'Content-Type': 'application/json'
//           },
//           timeout: 15000
//         }
//       );
//       return response.data;
//     } catch (error) {
//       console.error('API Error - createCatalog:', {
//         message: error.message,
//         response: error.response?.data,
//         config: error.config
//       });
//       throw error;
//     }
//   };
  
//   export const deleteCatalog = async (catalogName) => {
//     try {
//       const response = await axios.delete(`http://localhost:5000/catalogs/${catalogName}`, {
//         headers: {
//           'Authorization': `Bearer ${localStorage.getItem('access_token')}`
//         },
//         timeout: 10000
//       });
//       return response.data;
//     } catch (error) {
//       console.error('API Error - deleteCatalog:', {
//         message: error.message,
//         response: error.response?.data,
//         config: error.config
//       });
//       throw error;
//     }
//   };
