import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import multer from 'multer';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

import { 
  createGroup,
  getUsers, 
  deleteUser, 
  assignUserToGroup, 
  getGroups,
  updateUser,
  getUserGroups,
  getGroupMembers,
  updateGroup as databricksUpdateGroup,
  deleteGroup as databricksDeleteGroup,
  addUsersToGroup as databricksAddGroupMembers,
  removeUsersFromGroup as databricksRemoveGroupMembers,
  createUser,  
  getUserByEmail 
} from './services/databricks.js';
const app = express();
const PORT = 5000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});
import crypto from 'crypto';

// API instance
const api = axios.create({
  baseURL: 'http://13.126.41.254:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});
const sessionStore = new Map();
// OTP storage
const otpStore = new Map();
const cache = {
  data: null,
  lastFetched: 0,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};


// OAuth configuration for Databricks
const DATABRICKS_HOST = process.env.DATABRICKS_HOST || 'https://dbc-6e076fbc-a34a.cloud.databricks.com';
const CLIENT_ID = process.env.DATABRICKS_CLIENT_ID || 'a337cd27-bb20-4c9c-8c70-23314a4880b2';
const CLIENT_SECRET = process.env.DATABRICKS_CLIENT_SECRET || 'dose9f45a9d34e82f089076dd43550658523';
const REDIRECT_URI = 'http://13.126.41.254:5000/api/oauth/callback';
const SCOPES = 'offline_access'; // Adjust scopes as needed for SCIM access
const AUTH_URL = 'https://accounts.cloud.databricks.com/oidc/v1/authorize';
const TOKEN_URL = 'https://accounts.cloud.databricks.com/oidc/v1/token';


// Helper function to calculate total views
async function calculateTotalViews() {
  try {
    const sqlHistoryResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/sql/history/queries`, {
      params: { max_results: 1000 },
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const sqlQueries = sqlHistoryResponse.data.results || [];
    const viewQueries = sqlQueries.filter(query => 
      query.query_text?.toUpperCase().includes('SELECT') || 
      query.query_text?.toUpperCase().includes('VIEW')
    );
    return viewQueries.length;
  } catch (error) {
    console.error('Error calculating total views:', error.message);
    return 0;
  }
}

// Helper function to calculate storage locations
async function calculateStorageLocations() {
  try {
    const locationsResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/external-locations`, {
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const locations = locationsResponse.data.external_locations || [];
    return locations.length;
  } catch (error) {
    console.error('Error calculating storage locations:', error.message);
    return 0;
  }
}

// Helper function to calculate total jobs
async function calculateTotalJobs() {
  try {
    const jobsResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/jobs/list`, {
      params: { limit: 1000 },
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const jobs = jobsResponse.data.jobs || [];
    return jobs.length;
  } catch (error) {
    console.error('Error calculating total jobs:', error.message);
    return 0;
  }
}

// Helper functions for UC Readiness
async function calculateClusterReadiness() {
  try {
    const clustersResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/clusters/list`, {
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const clusters = clustersResponse.data.clusters || [];
    const readyClusters = clusters.filter(cluster => cluster.state === 'RUNNING');
    return clusters.length > 0 ? (readyClusters.length / clusters.length) * 100 : 0;
  } catch (error) {
    console.error('Error calculating cluster readiness:', error.message);
    return 0;
  }
}

async function calculateTableReadiness(catalogs) {
  try {
    let totalTables = 0;
    let compliantTables = 0;

    for (const catalog of catalogs) {
      const schemasResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`, {
        params: { catalog_name: catalog.name },
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });

      const schemas = schemasResponse.data.schemas || [];
      for (const schema of schemas) {
        const tablesResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`, {
          params: { catalog_name: catalog.name, schema_name: schema.name },
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          timeout: 30000
        });

        const tables = tablesResponse.data.tables || [];
        totalTables += tables.length;
        compliantTables += tables.filter(table => table.table_type === 'MANAGED').length;
      }
    }

    return totalTables > 0 ? (compliantTables / totalTables) * 100 : 0;
  } catch (error) {
    console.error('Error calculating table readiness:', error.message);
    return 0;
  }
}

async function calculateJobReadiness() {
  try {
    const jobsResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/jobs/list`, {
      params: { limit: 1000 },
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const jobs = jobsResponse.data.jobs || [];
    const compliantJobs = jobs.filter(job => job.settings?.schedule || job.settings?.trigger);
    return jobs.length > 0 ? (compliantJobs.length / jobs.length) * 100 : 0;
  } catch (error) {
    console.error('Error calculating job readiness:', error.message);
    return 0;
  }
}

async function calculatePermissionReadiness(catalogs) {
  try {
    let totalGrants = 0;
    let compliantGrants = 0;

    for (const catalog of catalogs) {
      const privilegesResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/CATALOG/${catalog.name}`, {
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });

      const privileges = privilegesResponse.data.privilege_assignments || [];
      totalGrants += privileges.length;
      compliantGrants += privileges.filter(priv => priv.privilege === 'USE_CATALOG').length;
    }

    return totalGrants > 0 ? (compliantGrants / totalGrants) * 100 : 0;
  } catch (error) {
    console.error('Error calculating permission readiness:', error.message);
    return 0;
  }
}

async function calculateOverallReadiness(catalogs) {
  const clusterReadiness = await calculateClusterReadiness();
  const tableReadiness = await calculateTableReadiness(catalogs);
  const jobReadiness = await calculateJobReadiness();
  const permissionReadiness = await calculatePermissionReadiness(catalogs);

  const readinessScores = [clusterReadiness, tableReadiness, jobReadiness, permissionReadiness];
  const total = readinessScores.reduce((sum, score) => sum + score, 0);
  return readinessScores.length > 0 ? total / readinessScores.length : 0;
}

// Helper function to generate data summary
async function generateDataSummary(catalogs) {
  const dataSummary = [];
  
  for (const catalog of catalogs) {
    let catalogTables = 0;
    let catalogViews = 0;
    let catalogDeltaTables = 0;
    let catalogGrants = 0;

    const schemasResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`, {
      params: { catalog_name: catalog.name },
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const schemas = schemasResponse.data.schemas || [];
    for (const schema of schemas) {
      const tablesResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`, {
        params: { catalog_name: catalog.name, schema_name: schema.name },
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });

      const tables = tablesResponse.data.tables || [];
      catalogTables += tables.length;
      catalogDeltaTables += tables.filter(table => table.storage_format === 'DELTA').length;

      const privilegesResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/CATALOG/${catalog.name}`, {
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });

      catalogGrants += (privilegesResponse.data.privilege_assignments || []).length;

      const sqlHistoryResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/sql/history/queries`, {
        params: { max_results: 1000 },
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });

      const sqlQueries = sqlHistoryResponse.data.results || [];
      catalogViews += sqlQueries.filter(query => 
        query.query_text?.toUpperCase().includes('VIEW') && 
        query.query_text?.includes(catalog.name)
      ).length;
    }

    dataSummary.push({
      catalog: catalog.name,
      tables: catalogTables,
      views: catalogViews,
      deltaTables: catalogDeltaTables,
      totalGrants: catalogGrants
    });
  }

  return dataSummary;
}



// Helper function to get recent jobs
async function getRecentJobs() {
  try {
    const jobsResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/jobs/list`, {
      params: { limit: 10 },
      headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
      timeout: 30000
    });

    const jobs = jobsResponse.data.jobs || [];
    return jobs.map(job => ({
      jobId: job.job_id,
      name: job.settings?.name || 'Unnamed Job',
      status: job.settings?.last_run?.state?.result_state || 'UNKNOWN',
      timestamp: job.settings?.last_run?.start_time || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Error fetching recent jobs:', error.message);
    return [];
  }
}
// Middleware setup
app.use(cors({
  origin: 'http://13.126.41.254:5001',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(cors({
  origin: 'http://13.126.41.254:5001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const workspaceApi = axios.create({
  baseURL: `https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2`,
  headers: {
    'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
    'Content-Type': 'application/scim+json'
  }
});

app.use((req, res, next) => {
  if (req.headers['user-agent'] && req.headers['user-agent'].includes('Chatbot')) {
    console.log(`[Chatbot Request] ${req.method} ${req.path} at ${new Date().toISOString()}`);
  }
  next();
});

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request body:', req.body);
  }
  next();
});
// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'working', timestamp: new Date() });
});


// server.mjs
app.post('/api/cloud-migrate', upload.none(), async (req, res) => {
  try {
    console.log('POST /api/cloud-migrate - Request body:', req.body);

    // Destructure all required fields from req.body
    const { 
      cloudProvider, 
      sourcePath, 
      catalog, 
      schema, 
      table, 
      credentials,
      schemaDefinition // This is now properly destructured from req.body
    } = req.body;

    // Validate required fields
    const requiredFields = ['cloudProvider', 'sourcePath', 'catalog', 'schema', 'table', 'credentials'];
    const missingFields = requiredFields.filter(field => !req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === ''));
    
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required parameters: ${missingFields.join(', ')}` });
    }

    // Parse credentials and schema definition
    let parsedCredentials = {};
    let parsedSchema = [];
    
    try {
      parsedCredentials = JSON.parse(credentials);
      if (cloudProvider === 's3' && (!parsedCredentials.roleArn || parsedCredentials.roleArn.trim() === '')) {
        return res.status(400).json({ error: 'Missing roleArn in credentials for S3 provider' });
      }
      
      // Parse schema definition if provided
      if (schemaDefinition) {
        parsedSchema = JSON.parse(schemaDefinition);
        
        // Validate schema
        const invalidColumns = parsedSchema.filter(col => 
          !col.type_name || String(col.type_name).toUpperCase() === 'VOID'
        );
        
        if (invalidColumns.length > 0) {
          return res.status(400).json({ 
            error: `Invalid column types found: ${invalidColumns.map(c => c.name || 'unnamed').join(', ')}`
          });
        }
      }
    } catch (e) {
      console.error('Parsing error:', e.message);
      return res.status(400).json({ 
        error: `Invalid JSON in ${e.message.includes('credentials') ? 'credentials' : 'schema definition'}`
      });
    }

    // Validate source path format based on provider
    const validPrefixes = {
      s3: 's3://',
      gcs: 'gs://',
      azure: 'abfss://'
    };

    if (!cloudProvider || !validPrefixes[cloudProvider] || !sourcePath.startsWith(validPrefixes[cloudProvider])) {
      return res.status(400).json({ 
        error: `Invalid source path for ${cloudProvider}. Must start with ${validPrefixes[cloudProvider] || 'a valid prefix'}`
      });
    }

    // Extract bucket name from S3 path (for external location URL)
    let bucketName = '';
    if (cloudProvider === 's3') {
      const pathParts = sourcePath.replace('s3://', '').split('/');
      bucketName = pathParts[0];
      if (!bucketName) {
        return res.status(400).json({ error: 'Invalid S3 source path: bucket name is missing' });
      }
    }

    // Validate schema definition
    if (parsedSchema.length === 0 && sourcePath.endsWith('.csv')) {
      return res.status(400).json({ error: 'Schema definition is required for CSV files. Please provide the column names and types.' });
    }

    // 1. Create or reuse storage credential
    let credentialName = `${cloudProvider}_cred_${Date.now()}`;
    try {
      let credentialPayload;
      if (cloudProvider === 's3') {
        credentialPayload = {
          name: credentialName,
          aws_iam_role: {
            role_arn: parsedCredentials.roleArn.trim()
          }
        };

      } else if (cloudProvider === 'gcs') {
        credentialPayload = {
          name: credentialName,
          gcp_service_account_key: {
            email: parsedCredentials.client_email,
            private_key_id: parsedCredentials.private_key_id,
            private_key: parsedCredentials.private_key
          }
        };
      } else if (cloudProvider === 'azure') {
        credentialPayload = {
          name: credentialName,
          azure_service_principal: {
            directory_id: parsedCredentials.tenantId,
            application_id: parsedCredentials.clientId,
            client_secret: parsedCredentials.clientSecret
          }
        };
      } else {
        return res.status(400).json({ error: `Unsupported cloud provider: ${cloudProvider}` });
      }

      console.log('Creating storage credential:', credentialPayload);
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/storage-credentials`,
        credentialPayload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (createError) {
      console.error('Error creating storage credential:', createError.response?.data || createError.message);
      if (createError.response?.data?.error_code === 'RESOURCE_ALREADY_EXISTS') {
        console.log('Storage credential already exists, proceeding...');
      } else {
        throw createError;
      }
    }

    // 2. Check for existing external locations
    let locationName = `migration_${Date.now()}`;
    const externalLocationUrl = cloudProvider === 's3' ? `s3://${bucketName}` : sourcePath;
    let existingLocation = null;

    try {
      console.log('Fetching existing external locations...');
      const response = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/external-locations`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const locations = response.data.external_locations || [];
      existingLocation = locations.find(loc => 
        externalLocationUrl.startsWith(loc.url) || loc.url.startsWith(externalLocationUrl)
      );
    } catch (fetchError) {
      console.error('Error fetching external locations:', fetchError.response?.data || fetchError.message);
      throw fetchError;
    }

    if (existingLocation) {
      console.log(`Found existing external location: ${existingLocation.name} with URL ${existingLocation.url}`);
      locationName = existingLocation.name;
    } else {
      // Create new external location
      try {
        console.log('Creating external location:', {
          name: locationName,
          url: externalLocationUrl,
          credential_name: credentialName
        });
        await axios.post(
          `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/external-locations`,
          {
            name: locationName,
            url: externalLocationUrl,
            credential_name: credentialName,
            comment: `Created for migration of ${table}`
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (createError) {
        console.error('Error creating external location:', createError.response?.data || createError.message);
        if (createError.response?.data?.error_code === 'LOCATION_OVERLAP') {
          return res.status(400).json({
            error: `Cannot create external location for ${externalLocationUrl}: overlaps with existing location ${createError.response.data.message.match(/Conflicting location: ([\w_]+)/)?.[1] || 'unknown'}`
          });
        }
        throw createError;
      }
    }

    // 3. Create table with schema
    try {
      const fileExtension = sourcePath.split('.').pop().toLowerCase();
      const dataSourceFormat = fileExtension === 'csv' ? 'CSV' : fileExtension === 'parquet' ? 'PARQUET' : 'DELTA';
      const tablePayload = {
        catalog_name: catalog,
        schema_name: schema,
        name: table,
        table_type: 'EXTERNAL',
        data_source_format: dataSourceFormat,
        storage_location: sourcePath,
        columns: parsedSchema.map((col, index) => ({
          name: col.name || `column_${index}`,
          type_name: col.type_name || col.type || 'STRING',
          type_text: col.type_text || col.type_name || col.type || 'STRING',
          type_json: col.type_json || col.type_name || col.type || 'STRING',
          nullable: col.nullable !== false,
          comment: col.comment || `Column ${col.name || index}`,
          position: index
        })),
        options: {
          header: 'true',
          inferSchema: 'true',
          nullValue: 'NULL', // or whatever represents null in your data
          emptyValue: '',    // how empty strings should be treated
          mode: 'PERMISSIVE' // or 'DROPMALFORMED' or 'FAILFAST'
        }
      };
      console.log('Creating table with payload:', tablePayload);
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
        tablePayload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (createError) {
      console.error('Error creating table:', createError.response?.data || createError.message);
      if (createError.response?.data?.error_code === 'TABLE_ALREADY_EXISTS') {
        console.log('Table already exists, checking schema compatibility...');
        try {
          const existingTable = await axios.get(
            `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables/${catalog}.${schema}.${table}`,
            {
              headers: {
                'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          const existingColumns = existingTable.data.columns.map(col => ({
            name: col.name,
            type_name: col.type_name
          }));
          const newColumns = parsedSchema;

          if (existingColumns.length !== newColumns.length) {
            throw new Error('Schema mismatch: Number of columns does not match');
          }
          for (let i = 0; i < existingColumns.length; i++) {
            if (existingColumns[i].name !== newColumns[i].name || existingColumns[i].type_name !== newColumns[i].type_name) {
              throw new Error(`Schema mismatch: Column ${existingColumns[i].name} type ${existingColumns[i].type_name} does not match ${newColumns[i].name} type ${newColumns[i].type_name}`);
            }
          }
          console.log('Schema is compatible, proceeding to refresh...');
        } catch (schemaError) {
          console.error('Schema compatibility error:', schemaError.message);
          return res.status(400).json({ error: `Schema mismatch for existing table: ${schemaError.message}` });
        }
      } else {
        throw createError;
      }
    }

    // 4. Refresh table metadata using SQL Statement Execution API
    try {
      console.log(`Refreshing table metadata for ${catalog}.${schema}.${table}`);
      const sqlStatement = `REFRESH TABLE ${catalog}.${schema}.${table}`;
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
        {
          statement: sqlStatement,
          warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`Successfully refreshed table ${catalog}.${schema}.${table}`);
    } catch (refreshError) {
      console.error('Error refreshing table metadata:', refreshError.response?.data || refreshError.message);
      throw refreshError;
    }

    res.json({
      success: true,
      message: `Data migrated successfully from ${sourcePath} to ${catalog}.${schema}.${table}`
    });

  } catch (error) {
    console.error('Cloud migration error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    let errorMsg = 'Failed to migrate data from cloud';
    if (error.response?.data?.error_code) {
      errorMsg = `${errorMsg}: ${error.response.data.error_code} - ${error.response.data.message || ''}`;
    } else if (error.response?.data?.message) {
      errorMsg = `${errorMsg}: ${error.response.data.message}`;
    } else if (error.message) {
      errorMsg = `${errorMsg}: ${error.message}`;
    }

    res.status(error.response?.status || 500).json({ error: errorMsg });
  }
});
app.get('/api/users/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.0/account/scim/v2/Users?filter=userName eq "${encodeURIComponent(email)}"`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/scim+json'
        }
      }
    );

    if (response.data.totalResults === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = response.data.Resources[0];
    res.json({
      id: user.id,
      email: user.userName,
      displayName: user.displayName,
      groups: user.groups?.map(g => g.display || g.value) || [],
      entitlements: user.entitlements?.map(e => e.value) || []
    });
    
  } catch (error) {
    console.error('Error checking user:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data?.detail || 'Failed to check user' 
    });
  }
});
app.get('/api/tables/:catalogName/:schemaName', async (req, res) => {
  try {
    const { catalogName, schemaName } = req.params;
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
      {
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        params: { catalog_name: catalogName, schema_name: schemaName }
      }
    );

    const tables = response.data.tables || [];
    const tablesWithTags = tables.map(table => {
      // Extract tags from properties
      const properties = table.properties || {};
      const tags = Object.keys(properties)
        .filter(key => properties[key] === "true" && key.startsWith("tag."))
        .map(key => key.replace("tag.", "")); // Remove the "tag." prefix
      
      return {
        ...table,
        metadata: {
          keywords: tags // Map the tags to the metadata.keywords field expected by the frontend
        }
      };
    });

    res.json(tablesWithTags);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ 
      error: error.response?.data?.message || 'Failed to fetch tables',
      details: error.response?.data
    });
  }
});
// Create table
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Request body:', req.body);
    console.log('File:', req.file ? {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { catalog, schema, table, fileType, schemaDefinition, metadata } = req.body;
    const file = req.file;

    // Validate required fields
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!catalog || !schema || !table) {
      return res.status(400).json({ error: 'Missing required parameters: catalog, schema, or table' });
    }
    
    if (!schemaDefinition) {
      return res.status(400).json({ error: 'Missing schema definition' });
    }

    // Parse and validate schema definition
    let parsedSchema;
    try {
      console.log('Raw schemaDefinition:', schemaDefinition);
      parsedSchema = JSON.parse(schemaDefinition);
      
      if (!Array.isArray(parsedSchema)) {
        throw new Error('Schema definition must be an array');
      }
      
      parsedSchema.forEach((col, index) => {
        if (!col.name) {
          throw new Error(`Column at index ${index} is missing a name`);
        }
        if (!col.type_name) {
          throw new Error(`Column "${col.name}" is missing a type_name`);
        }
        if (!col.type_text) col.type_text = col.type_name;
        if (!col.type_json) col.type_json = col.type_name;
        if (col.nullable === undefined) col.nullable = true;
      });
    } catch (error) {
      console.error('Schema definition parsing error:', error);
      return res.status(400).json({ 
        error: 'Invalid schema definition: ' + error.message 
      });
    }

    // Parse metadata for tags
    let parsedMetadata = {};
    let tags = [];
    try {
      parsedMetadata = metadata ? JSON.parse(metadata) : {};
      tags = Array.isArray(parsedMetadata.keywords) ? parsedMetadata.keywords : [];
    } catch (error) {
      console.error('Metadata parsing error:', error);
      return res.status(400).json({ 
        error: 'Invalid metadata format: ' + error.message 
      });
    }

    // Prepare properties for tags (like /api/tables)
    const tagProperties = tags.length > 0
      ? tags.reduce((acc, keyword) => {
          acc[`tag.${keyword}`] = 'true';
          return acc;
        }, {})
      : {};

    // Process file based on type
    let uploadFileBuffer = file.buffer;
    let uploadFileType = fileType || file.originalname.split('.').pop().toLowerCase();
    let fileExtension = uploadFileType;

    // Convert Excel to CSV if needed
    if (uploadFileType === 'xlsx') {
      console.log('Converting Excel file to CSV');
      try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvData = XLSX.utils.sheet_to_csv(firstSheet);
        uploadFileBuffer = Buffer.from(csvData);
        uploadFileType = 'csv';
        fileExtension = 'csv';
        console.log('Excel conversion successful');
      } catch (excelError) {
        console.error('Excel conversion error:', excelError);
        return res.status(400).json({ error: 'Failed to process Excel file: ' + excelError.message });
      }
    }

    console.log(`Processing ${uploadFileType} file for table ${catalog}.${schema}.${table}`);

    // 1. Create table with schema, tags in properties, and metadata
    let createResponse;
    try {
      console.log('Creating table');
      createResponse = await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
        {
          catalog_name: catalog,
          schema_name: schema,
          name: table,
          table_type: 'MANAGED',
          data_source_format: 'DELTA',
          columns: parsedSchema.map((col, index) => ({
            name: col.name,
            type_name: col.type_name,
            type_text: col.type_text,
            type_json: col.type_json,
            nullable: col.nullable !== false,
            comment: col.comment || `Column ${col.name}`,
            position: index
          })),
          properties: tagProperties, // Add tags as properties
          // metadata: { keywords: tags }, // Note: Commented out as Databricks API may not support metadata field
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Table created successfully');
    } catch (createError) {
      console.error('Table creation error:', {
        message: createError.message,
        response: createError.response?.data,
      });
      
      if (createError.response?.data?.error_code === 'TABLE_ALREADY_EXISTS') {
        console.log('Table already exists, proceeding with data upload');
      } else {
        throw createError;
      }
    }

    // 2. Apply tags to the table using ALTER TABLE SET TAGS
    if (tags.length > 0) {
      try {
        console.log('Applying tags to table');
        const tagStatements = tags.map(tag => 
          `ALTER TABLE \`${catalog}\`.\`${schema}\`.\`${table}\` SET TAGS ('${tag}' = 'true')`
        ).join('; ');
        
        console.log('Tag SQL statements:', tagStatements);
        const sqlResponse = await axios.post(
          `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
          {
            statement: tagStatements,
            warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
            wait_timeout: "50s"
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('Tags applied successfully:', sqlResponse.data);
      } catch (tagError) {
        console.error('Tag application error:', tagError);
        console.warn('Continuing despite tag application failure');
      }
    }

    // 3. Upload file to DBFS
    console.log('Uploading file to DBFS');
    const dbfsPath = `/FileStore/uploads/${catalog}/${schema}/${table}-${Date.now()}.${fileExtension}`;
    const base64File = uploadFileBuffer.toString('base64');

    try {
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/dbfs/put`,
        {
          path: dbfsPath,
          contents: base64File,
          overwrite: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('File uploaded to DBFS at path:', dbfsPath);
    } catch (dbfsError) {
      console.error('DBFS upload error:', dbfsError);
      throw new Error('Failed to upload file to Databricks: ' + dbfsError.message);
    }

    // 4. Load data into table using SQL
    try {
      console.log('Loading data into table');
      const sqlQuery = `
        COPY INTO \`${catalog}\`.\`${schema}\`.\`${table}\`
        FROM 'dbfs:${dbfsPath}'
        FILEFORMAT = ${uploadFileType.toUpperCase()}
        FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true')
        COPY_OPTIONS ('mergeSchema' = 'true')
      `;

      console.log('Executing SQL query:', sqlQuery);
      const sqlResponse = await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
        {
          statement: sqlQuery,
          warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
          wait_timeout: "50s"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Data loaded successfully');
    } catch (sqlError) {
      console.error('SQL execution error:', sqlError);
      throw new Error('Failed to load data into table: ' + sqlError.response?.data?.message || sqlError.message);
    }

    // 5. Clean up the uploaded file
    try {
      console.log('Cleaning up temporary file');
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/dbfs/delete`,
        { path: dbfsPath },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError.message);
    }

    // Return response with metadata.keywords
    res.json({
      success: true,
      message: `Data uploaded successfully to ${catalog}.${schema}.${table}`,
      data: {
        catalog_name: catalog,
        schema_name: schema,
        name: table,
        table_type: 'MANAGED',
        data_source_format: 'DELTA',
        columns: parsedSchema,
        properties: tagProperties,
      },
      metadata: { keywords: tags }, // Include metadata.keywords in response
      tagsApplied: tags
    });
    
  } catch (error) {
    console.error('Upload error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });

    let status = 500;
    let errorMessage = 'Failed to upload data';

    if (error.response) {
      status = error.response.status;
      if (error.response.data?.error_code === 'TABLE_ALREADY_EXISTS') {
        errorMessage = 'Table already exists';
      } else if (error.response.data?.error_code === 'INVALID_PARAMETER_VALUE') {
        errorMessage = 'Invalid table schema: ' + error.response.data.message;
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(status).json({ 
      error: errorMessage,
      details: error.response?.data?.error_code,
    });
  }
});

// Delete table
app.delete('/api/tables/:catalogName/:schemaName/:tableName', async (req, res) => {
  try {
    const { catalogName, schemaName, tableName } = req.params;

    await axios.delete(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables/${catalogName}.${schemaName}.${tableName}`,
      { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
    );

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting table:', error);
    res.status(500).json({ 
      error: error.response?.data?.message || 'Failed to delete table'
    });
  }
});
import XLSX from 'xlsx';
import { parse } from 'path';

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    console.log('Request body:', req.body);
    console.log('File:', req.file ? {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    const { catalog, schema, table, fileType, schemaDefinition, metadata } = req.body;
    const file = req.file;

    // Validate required fields
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!catalog || !schema || !table) {
      return res.status(400).json({ error: 'Missing required parameters: catalog, schema, or table' });
    }
    
    if (!schemaDefinition) {
      return res.status(400).json({ error: 'Missing schema definition' });
    }

    // Parse and validate schema definition
    let parsedSchema;
    try {
      console.log('Raw schemaDefinition:', schemaDefinition);
      parsedSchema = JSON.parse(schemaDefinition);
      
      if (!Array.isArray(parsedSchema)) {
        throw new Error('Schema definition must be an array');
      }
      
      parsedSchema.forEach((col, index) => {
        if (!col.name) {
          throw new Error(`Column at index ${index} is missing a name`);
        }
        if (!col.type_name) {
          throw new Error(`Column "${col.name}" is missing a type_name`);
        }
        if (!col.type_text) col.type_text = col.type_name;
        if (!col.type_json) col.type_json = col.type_name;
        if (col.nullable === undefined) col.nullable = true;
      });
    } catch (error) {
      console.error('Schema definition parsing error:', error);
      return res.status(400).json({ 
        error: 'Invalid schema definition: ' + error.message 
      });
    }

    // Parse metadata for tags
    let parsedMetadata = {};
    let tags = [];
    try {
      parsedMetadata = metadata ? JSON.parse(metadata) : {};
      tags = parsedMetadata.keywords || [];
    } catch (error) {
      console.error('Metadata parsing error:', error);
      return res.status(400).json({ 
        error: 'Invalid metadata format: ' + error.message 
      });
    }

    // Process file based on type
    let uploadFileBuffer = file.buffer;
    let uploadFileType = fileType || file.originalname.split('.').pop().toLowerCase();
    let fileExtension = uploadFileType;

    // Convert Excel to CSV if needed
    if (uploadFileType === 'xlsx') {
      console.log('Converting Excel file to CSV');
      try {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csvData = XLSX.utils.sheet_to_csv(firstSheet);
        uploadFileBuffer = Buffer.from(csvData);
        uploadFileType = 'csv';
        fileExtension = 'csv';
        console.log('Excel conversion successful');
      } catch (excelError) {
        console.error('Excel conversion error:', excelError);
        return res.status(400).json({ error: 'Failed to process Excel file: ' + excelError.message });
      }
    }

    console.log(`Processing ${uploadFileType} file for table ${catalog}.${schema}.${table}`);

    // 1. Create table with schema
    try {
      console.log('Creating table');
      const createResponse = await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
        {
          catalog_name: catalog,
          schema_name: schema,
          name: table,
          table_type: 'MANAGED',
          data_source_format: 'DELTA',
          columns: parsedSchema.map((col, index) => ({
            name: col.name,
            type_name: col.type_name,
            type_text: col.type_text,
            type_json: col.type_json,
            nullable: col.nullable !== false,
            comment: col.comment || `Column ${col.name}`,
            position: index
          }))
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Table created successfully');
    } catch (createError) {
      console.error('Table creation error:', {
        message: createError.message,
        response: createError.response?.data,
      });
      
      if (createError.response?.data?.error_code === 'TABLE_ALREADY_EXISTS') {
        console.log('Table already exists, proceeding with data upload');
      } else {
        throw createError;
      }
    }

    // 2. Apply tags to the table using ALTER TABLE SET TAGS
    if (tags.length > 0) {
      try {
        console.log('Applying tags to table');
        const tagStatements = tags.map(tag => 
          `ALTER TABLE \`${catalog}\`.\`${schema}\`.\`${table}\` SET TAGS ('${tag}' = 'true')`
        ).join('; ');
        
        console.log('Tag SQL statements:', tagStatements);
        const sqlResponse = await axios.post(
          `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
          {
            statement: tagStatements,
            warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
            wait_timeout: "50s"
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('Tags applied successfully:', sqlResponse.data);
      } catch (tagError) {
        console.error('Tag application error:', tagError);
        // Log the error but continue with the upload process
        console.warn('Continuing despite tag application failure');
      }
    }

    // 3. Upload file to DBFS
    console.log('Uploading file to DBFS');
    const dbfsPath = `/FileStore/uploads/${catalog}/${schema}/${table}-${Date.now()}.${fileExtension}`;
    const base64File = uploadFileBuffer.toString('base64');

    try {
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/dbfs/put`,
        {
          path: dbfsPath,
          contents: base64File,
          overwrite: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('File uploaded to DBFS at path:', dbfsPath);
    } catch (dbfsError) {
      console.error('DBFS upload error:', dbfsError);
      throw new Error('Failed to upload file to Databricks: ' + dbfsError.message);
    }

    // 4. Load data into table using SQL
    try {
      console.log('Loading data into table');
      const sqlQuery = `
        COPY INTO \`${catalog}\`.\`${schema}\`.\`${table}\`
        FROM 'dbfs:${dbfsPath}'
        FILEFORMAT = ${uploadFileType.toUpperCase()}
        FORMAT_OPTIONS ('header' = 'true', 'inferSchema' = 'true')
        COPY_OPTIONS ('mergeSchema' = 'true')
      `;

      console.log('Executing SQL query:', sqlQuery);
      const sqlResponse = await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
        {
          statement: sqlQuery,
          warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
          wait_timeout: "50s"
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Data loaded successfully');
    } catch (sqlError) {
      console.error('SQL execution error:', sqlError);
      throw new Error('Failed to load data into table: ' + sqlError.response?.data?.message || sqlError.message);
    }

    // 5. Clean up the uploaded file
    try {
      console.log('Cleaning up temporary file');
      await axios.post(
        `${process.env.DATABRICKS_HOST}/api/2.0/dbfs/delete`,
        { path: dbfsPath },
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError.message);
    }

    res.json({
      success: true,
      message: `Data uploaded successfully to ${catalog}.${schema}.${table}`,
      tagsApplied: tags
    });
    
  } catch (error) {
    console.error('Upload error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack,
    });

    let status = 500;
    let errorMessage = 'Failed to upload data';

    if (error.response) {
      status = error.response.status;
      if (error.response.data?.error_code === 'TABLE_ALREADY_EXISTS') {
        errorMessage = 'Table already exists';
      } else if (error.response.data?.error_code === 'INVALID_PARAMETER_VALUE') {
        errorMessage = 'Invalid table schema: ' + error.response.data.message;
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(status).json({ 
      error: errorMessage,
      details: error.response?.data?.error_code,
    });
  }
});
app.get('/api/users', async (req, res) => {
  try {
    console.log('Fetching users from Databricks...');
    const users = await getUsers();
    console.log(`Successfully fetched ${users.length} users`);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch users from Databricks'
    });
  }
});
app.get('/api/users/:userId/details', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Fetching details for userId: ${userId}`);
 
    const userResponse = await workspaceApi.get(`/Users/${userId}`);
    const user = userResponse.data;
    console.log(`User data for userId ${userId}:`, user);
 
    const groupsResponse = await workspaceApi.get(`/Users/${userId}?attributes=groups`);
    const groups = groupsResponse.data.groups || [];
    console.log(`Raw groups data for userId ${userId}:`, groups);
 
    // Define the roles to extract from groups
    const adminRoles = ['admins', 'marketplace admin', 'billing admin'];
    console.log(`Defined adminRoles:`, adminRoles);
 
    // Role descriptions mapping
    const roleDescriptions = {
      'admins': 'Can manage workspaces, users & groups, cloud resources and settings. This only indicates direct assignment of the role.',
      'marketplace admin': 'Can manage exchanges and listings on the Marketplace. This change might take a few minutes to update.',
      'billing admin': 'Can view Budgets and create budget policies. This change might take a few minutes to update.'
    };
 
    // Function to capitalize specific group/role names
    const capitalizeName = (name) => {
      if (name.toLowerCase() === 'admins') return 'Admins';
      if (name.toLowerCase() === 'marketplace admin') return 'Marketplace Admin';
      if (name.toLowerCase() === 'billing admin') return 'Billing Admin';
      return name;
    };
 
    // Split groups into actual groups and roles
    const filteredGroups = groups.filter(group => {
      const groupName = group.name || group.display || group.value || group.displayName || '';
      console.log(`Processing group:`, group, `Extracted groupName: ${groupName}`);
      const isAdminRole = adminRoles.includes(groupName.toLowerCase());
      console.log(`Is ${groupName} an admin role? ${isAdminRole}`);
      return !isAdminRole;
    });
 
    const extractedRoles = groups
      .filter(group => {
        const groupName = group.name || group.display || group.value || group.displayName || '';
        const isAdminRole = adminRoles.includes(groupName.toLowerCase());
        console.log(`Checking if ${groupName} is a role: ${isAdminRole}`);
        return isAdminRole;
      })
      .map(group => {
        const roleName = group.name || group.display || group.value || group.displayName || '';
        console.log(`Extracted role: ${roleName}`);
        return {
          name: capitalizeName(roleName),
          description: roleDescriptions[roleName.toLowerCase()] || 'No description available'
        };
      });
 
    console.log(`Final groups for userId ${userId}:`, filteredGroups);
    console.log(`Final roles for userId ${userId}:`, extractedRoles);
 
    res.json({
      id: user.id,
      userName: user.userName,
      displayName: user.displayName,
      groups: filteredGroups.map(group => ({
        id: group.value || group.id,
        name: capitalizeName(group.name || group.display || group.value || group.displayName || '')
      })),
      roles: extractedRoles
    });
  } catch (error) {
    console.error('Error fetching user details:', {
      userId: req.params.userId,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    const status = error.response?.status || 500;
    const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch user details';
    res.status(status).json({ error: errorMessage });
  }
});
// Endpoint to initiate OAuth login
app.get('/api/oauth/login', (req, res) => {
  const { workspace } = req.query;

  if (!workspace) {
    return res.status(400).json({ error: 'Workspace is required' });
  }

  const state = crypto.randomBytes(16).toString('hex');
  sessionStore.set(state, { workspace });

  const authUrl = `${AUTH_URL}` +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&state=${state}`;

  console.log('OAuth Authorization URL:', authUrl); // Debug log

  res.redirect(authUrl);
});

// OAuth callback endpoint
app.get('/api/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  console.log('Callback Query Params:', req.query); // Debug log

  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`http://13.126.41.254:5001/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    console.error('Missing code or state:', { code, state });
    return res.redirect(`http://13.126.41.254:5001/login?error=${encodeURIComponent('Missing code or state parameter')}`);
  }

  const sessionData = sessionStore.get(state);
  if (!sessionData) {
    return res.redirect(`http://13.126.41.254:5001/login?error=${encodeURIComponent('Invalid state parameter')}`);
  }

  const { workspace } = sessionData;
  sessionStore.delete(state);

  try {
    const tokenResponse = await axios.post(TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const userResponse = await axios.get(`${DATABRICKS_HOST}/api/2.0/preview/scim/v2/Me`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const user = userResponse.data;
    const email = user.userName;
    const userId = user.id;

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000;

    sessionStore.set(sessionToken, {
      email,
      userId,
      workspace,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + expires_in * 1000,
      tokenExpiresAt
    });

    res.redirect(`http://13.126.41.254:5001/login?token=${sessionToken}`);
  } catch (err) {
    console.error('Error in OAuth callback:', err.response?.data || err.message);
    res.redirect(`http://13.126.41.254:5001/login?error=${encodeURIComponent('Failed to authenticate with Databricks')}`);
  }
});

// Middleware to authenticate requests using the session token
const authenticateToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  req.user = {
    accessToken: token
  };
  next();
};

app.post('/api/validate-pat', async (req, res) => {
  const { pat, databricksHost } = req.body;

  if (!pat || !databricksHost) {
    return res.status(400).json({ error: 'PAT and Databricks host are required' });
  }

  try {
    const response = await axios.get(`${databricksHost}/api/2.0/preview/scim/v2/Me`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10-second timeout
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error validating PAT:', error.response?.data || error.message);
    let status = error.response?.status || 500;
    let errorMessage = error.response?.data?.detail || error.message || 'Invalid Personal Access Token';

    if (status === 401) {
      errorMessage = 'Invalid Personal Access Token';
    } else if (status === 403) {
      errorMessage = 'Insufficient permissions: The PAT does not have access to the SCIM API';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request to Databricks timed out';
    } else if (!error.response) {
      errorMessage = 'Network error: Could not connect to Databricks';
    }

    res.status(status).json({ error: errorMessage });
  }
});
// Example protected endpoint: Fetch users
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${DATABRICKS_HOST}/api/2.0/preview/scim/v2/Users`, {
      headers: {
        'Authorization': `Bearer ${req.user.accessToken}`
      }
    });
    res.json(response.data.Resources || []);
  } catch (error) {
    console.error('Error fetching users:', error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data?.detail || 'Failed to fetch users from Databricks'
    });
  }
});
app.get('/api/catalogs/:catalogName/schemas', async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        },
        params: {
          catalog_name: req.params.catalogName
        }
      }
    );
    res.json(response.data.schemas || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Create new user
app.post('/api/users', async (req, res) => {
  try {
   
    if (!req.body || !req.body.email || !req.body.displayName) {
      return res.status(400).json({ 
        error: 'Email and display name are required' 
      });
    }
    
    console.log('Creating user with data:', req.body);
 
    try {
      const existingUser = await getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(409).json({ 
          error: 'User already exists',
          user: existingUser
        });
      }
    } catch (checkError) {
      if (checkError.response?.status !== 404) {
        throw checkError;
      }
    }
    
    const newUser = await createUser({
      ...req.body,
      isWorkspaceLevel: true  // Ensure we create at workspace level
    });
    
    if (req.body.groupId) {
      await assignUserToGroup(newUser.id, req.body.groupId, true);
    }
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.detail || error.message || 'Failed to create user' 
    });
  }
});
// Check if user exists by email
app.get('/api/users/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user by email:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch user' 
    });
  }
});
// Group endpoints
app.post('/api/groups', async (req, res) => {
  try {
   
    if (!req.body || !req.body.name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    const newGroup = await createGroup(req.body);
    res.status(201).json(newGroup);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: error.message || 'Failed to create group' });
  }
});

// User endpoints


app.get('/api/users/:userId/groups', async (req, res) => {
  try {
    const groups = await getUserGroups(req.params.userId);
    res.json(groups || []); 
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  console.log(`Deleting user ${req.params.id}`);
  
  try {
    const userId = req.params.id;
    
    if (!userId || userId === 'undefined') {
      console.warn('Invalid user ID provided');
      return res.status(400).json({ 
        error: 'Valid user ID is required for deletion'
      });
    }
    
    console.log(`Calling Databricks API to delete user ${userId}`);
    const response = await workspaceApi.delete(`/Users/${userId}`);
    console.log(`Successfully deleted user ${userId}`);
    
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting user:', {
      userId: req.params.id,
      error: error.response?.data || error.message,
      stack: error.stack
    });
    
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.detail || 
            error.message || 
            'Failed to delete user'
    });
  }
});

app.patch('/api/groups/:groupId', async (req, res) => {
  const startTime = Date.now();
  const { groupId } = req.params;
  
  try {
    console.log(`[${new Date().toISOString()}] PATCH /api/groups/${groupId}`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    // Validate SCIM compliance
    if (!req.body.schemas || !req.body.schemas.includes("urn:ietf:params:scim:api:messages:2.0:PatchOp")) {
      return res.status(400).json({ 
        error: 'Invalid SCIM schemas',
        details: 'Must include "urn:ietf:params:scim:api:messages:2.0:PatchOp"'
      });
    }

    if (!req.body.Operations || !Array.isArray(req.body.Operations)) {
      return res.status(400).json({ 
        error: 'Invalid Operations',
        details: 'Operations array is required'
      });
    }

    // Configure Databricks request
    const source = axios.CancelToken.source();
    const timeout = setTimeout(() => {
      source.cancel('Databricks API timeout');
    }, 20000); // 20 second timeout

    const response = await workspaceApi.patch(`/Groups/${groupId}`, req.body, {
      cancelToken: source.token
    });

    clearTimeout(timeout);
    console.log(`Databricks response (${Date.now() - startTime}ms):`, response.data);
    res.json(response.data);

  } catch (error) {
    console.error('Databricks API error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      stack: error.stack
    });

    let status = 500;
    let errorData = { error: 'Failed to update group in Databricks' };

    if (axios.isCancel(error)) {
      status = 504;
      errorData.error = 'Request to Databricks timed out';
    } else if (error.response) {
      status = error.response.status;
      errorData = error.response.data || errorData;
    } else if (error.code === 'ECONNABORTED') {
      errorData.error = 'Connection to Databricks timed out';
    } else if (error.code === 'ERR_NETWORK') {
      errorData.error = 'Network error connecting to Databricks';
    }

    res.status(status).json(errorData);
  }
});

app.patch('/api/groups/:groupId/entitlements', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { displayName, entitlements } = req.body;

    // Prepare operations for SCIM API
    const operations = [];

    if (displayName) {
      operations.push({
        op: 'replace',
        path: 'displayName',
        value: displayName
      });
    }

    if (entitlements) {
      const entitlementValues = [];
      
      // Map frontend entitlement names to Databricks values
      if (entitlements.clusterCreation) {
        entitlementValues.push({ value: 'allow-cluster-create' });
      }
      if (entitlements.sqlAccess) {
        entitlementValues.push({ value: 'databricks-sql-access' });
      }
      if (entitlements.workspaceAccess) {
        entitlementValues.push({ value: 'workspace-access' });
      }

      operations.push({
        op: 'replace',
        path: 'entitlements',
        value: entitlementValues
      });
    }

    // Make the API call to Databricks
    const response = await workspaceApi.patch(`/Groups/${groupId}`, {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
      Operations: operations
    });

    res.json(response.data);
  } catch (error) {
    console.error('Error updating group entitlements:', {
      error: error.response?.data || error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to update entitlements',
      details: error.response?.data?.detail || error.message
    });
  }
});

  app.post('/api/users/:userId/assign-group', async (req, res) => {
    try {
      await assignUserToGroup(req.params.userId, req.body.groupId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error assigning user to group:', {
        userId: req.params.userId,
        groupId: req.body.groupId,
        error: error.message
      });
      res.status(error.response?.status || 500).json({ 
        error: error.message || 'Failed to assign user to group',
        details: error.response?.data
      });
    }
  });

  app.get('/api/catalogs/:catalogName/stats', async (req, res) => {
    try {
      const { catalogName } = req.params;
      console.log(`Fetching stats for catalog: ${catalogName}`); // Debug log
  
      // Get catalog metadata
      console.log('Requesting catalog metadata from Databricks...');
      const catalogResponse = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs/${catalogName}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          timeout: 20000 // Increase timeout to 20 seconds
        }
      );
      console.log('Catalog metadata received:', catalogResponse.data);
  
      // Get all schemas in the catalog
      console.log('Requesting schemas from Databricks...');
      const schemasResponse = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`,
        {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          params: { catalog_name: catalogName },
          timeout: 20000
        }
      );
      console.log('Schemas received:', schemasResponse.data);
  
      const schemas = schemasResponse.data.schemas || [];
  
      // Fetch tables for each schema and collect statistics
      const tableTypes = {
        MANAGED: 0,
        EXTERNAL: 0,
        VIEW: 0,
        OTHER: 0
      };
  
      const schemaActivity = schemas.map(schema => ({
        name: schema.name,
        tableCount: 0,
        recentActivity: 0 // Tables created/modified in the last 30 days
      }));
  
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  
      let totalTables = 0;
  
      for (const schema of schemas) {
        const schemaIndex = schemaActivity.findIndex(s => s.name === schema.name);
        try {
          console.log(`Requesting tables for schema: ${schema.name}`);
          const tablesResponse = await axios.get(
            `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
            {
              headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
              params: {
                catalog_name: catalogName,
                schema_name: schema.name
              },
              timeout: 20000
            }
          );
  
          const tables = tablesResponse.data.tables || [];
          schemaActivity[schemaIndex].tableCount = tables.length;
          totalTables += tables.length;
  
          tables.forEach(table => {
            // Table type distribution
            const tableType = table.table_type?.toUpperCase() || 'OTHER';
            if (tableType in tableTypes) {
              tableTypes[tableType]++;
            } else {
              tableTypes.OTHER++;
            }
  
            // Recent activity (created or updated in the last 30 days)
            const createdAt = table.created_at ? new Date(table.created_at).getTime() : 0;
            const updatedAt = table.updated_at ? new Date(table.updated_at).getTime() : 0;
            if (createdAt > thirtyDaysAgo || updatedAt > thirtyDaysAgo) {
              schemaActivity[schemaIndex].recentActivity++;
            }
          });
        } catch (error) {
          console.warn(`Error fetching tables for schema ${schema.name}:`, error.message);
        }
      }
  
      // Sort schema activity by recent activity (descending)
      schemaActivity.sort((a, b) => b.recentActivity - a.recentActivity);
  
      const result = {
        name: catalogName,
        schemaCount: schemas.length,
        tableCount: totalTables,
        createdBy: catalogResponse.data.owner || 'System',
        createdOn: formatDate(catalogResponse.data.created_at),
        lastModified: formatDate(catalogResponse.data.updated_at),
        tableTypes,
        schemaActivity: schemaActivity.slice(0, 10)
      };
  
      console.log('Stats response:', result);
      res.json(result);
    } catch (error) {
      console.error('Error fetching catalog stats:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        stack: error.stack
      });
  
      let errorMessage = 'Failed to fetch catalog statistics';
      if (error.response?.status === 404) {
        errorMessage = `Catalog "${catalogName}" not found`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request to Databricks timed out - please try again';
      } else if (!error.response) {
        errorMessage = 'Network error - please check your connection to Databricks';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied - please check your Databricks token';
      }
  
      res.status(500).json({
        error: errorMessage,
        name: catalogName,
        schemaCount: 0,
        tableCount: 0,
        createdBy: 'System',
        createdOn: 'Unknown',
        lastModified: 'Unknown',
        tableTypes: { MANAGED: 0, EXTERNAL: 0, VIEW: 0, OTHER: 0 },
        schemaActivity: []
      });
    }
  });
  // Helper function to format dates
  
  app.get('/api/catalogs/:catalogName/privileges', async (req, res) => {
    try {
      const { catalogName } = req.params;
      console.log(`Fetching privileges for catalog: ${catalogName}`);
  
      const response = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/catalog/${encodeURIComponent(catalogName)}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );
  
      const result = {
        totalGrants: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      };
  
      console.log('Databricks API response for privileges:', response.data);
  
      if (response.data?.privilege_assignments && Array.isArray(response.data.privilege_assignments)) {
        response.data.privilege_assignments.forEach(assignment => {
          if (Array.isArray(assignment.privileges)) {
            assignment.privileges.forEach(privilege => {
              const privilegeType = privilege?.toUpperCase();
              if (!privilegeType) {
                console.warn('Skipping invalid privilege:', privilege);
                return;
              }
              result.totalGrants++;
              if (privilegeType in result.byPrivilege) {
                result.byPrivilege[privilegeType]++;
              } else {
                result.byPrivilege.OTHER++;
              }
            });
          } else {
            console.warn('Privileges array missing or invalid:', assignment.privileges);
          }
        });
      } else {
        console.warn('No privilege assignments found for catalog:', catalogName);
      }
  
      console.log('Computed privilege stats:', result);
      res.json(result);
    } catch (error) {
      console.error('Error fetching privilege stats:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
  
      let errorMessage = 'Failed to fetch privilege statistics';
      if (error.response?.status === 404) {
        errorMessage = `Catalog "${catalogName}" not found`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request to Databricks timed out - please try again';
      } else if (!error.response) {
        errorMessage = 'Network error - please check your connection to Databricks';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied - please check your Databricks token';
      }
  
      res.status(500).json({
        error: errorMessage,
        totalGrants: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      });
    }
  });
  
  // Helper function
  function formatDate(isoString) {
    if (!isoString) return 'Unknown';
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  const formatTimeAgo = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} minutes ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`;
    return `${Math.floor(diff / (24 * 60 * 60 * 1000))} days ago`;
  };
  


  app.get('/api/workspace/stats', async (req, res) => {
    try {
      const timeFilter = req.query.timeFilter || 'week';
      console.log(`Fetching workspace statistics for timeFilter: ${timeFilter}...`);
  
      // Check cache
      const now = Date.now();
      if (cache.data && now - cache.lastFetched < cache.cacheDuration && cache.timeFilter === timeFilter) {
        console.log('Returning cached data');
        return res.json(cache.data);
      }
  
      // Determine time range
      let startTime;
      switch (timeFilter) {
        case 'day':
          startTime = now - 24 * 60 * 60 * 1000;
          break;
        case 'month':
          startTime = now - 30 * 24 * 60 * 60 * 1000;
          break;
        case 'week':
        default:
          startTime = now - 7 * 24 * 60 * 60 * 1000;
      }
  
      // 1. Fetch basic workspace data
      const [catalogsResponse, usersResponse] = await Promise.all([
        axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`, {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          timeout: 30000
        }),
        axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/preview/scim/v2/Users`, {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          timeout: 30000
        })
      ]);
  
      const catalogs = catalogsResponse.data.catalogs || [];
      const totalUsers = usersResponse.data.totalResults || 0;
      console.log(`Fetched ${catalogs.length} catalogs, ${totalUsers} users`);
  
      // 2. Fetch schemas, tables, and storage details
      let totalSchemas = 0;
      let totalTables = 0;
      const schemaTableMap = {};
      const catalogStorageMap = {};
      const storageByType = {
        Delta: 0,
        Parquet: 0,
        Other: 0
      };
  
      const schemaPromises = catalogs.map(async (catalog) => {
        try {
          const schemasResponse = await axios.get(
            `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`,
            {
              headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
              params: { catalog_name: catalog.name },
              timeout: 30000
            }
          );
  
          const schemas = schemasResponse.data.schemas || [];
          totalSchemas += schemas.length;
  
          let catalogTableCount = 0;
          const tablePromises = schemas.map(async (schema) => {
            try {
              const tablesResponse = await axios.get(
                `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
                {
                  headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
                  params: {
                    catalog_name: catalog.name,
                    schema_name: schema.name
                  },
                  timeout: 30000
                }
              );
  
              const tables = tablesResponse.data.tables || [];
              schemaTableMap[schema.name] = schemaTableMap[schema.name] || { name: schema.name, tables: 0 };
              schemaTableMap[schema.name].tables += tables.length;
              totalTables += tables.length;
              catalogTableCount += tables.length;
  
              tables.forEach(table => {
                const format = table.table_type?.toLowerCase().includes('delta') ? 'Delta' :
                              table.table_type?.toLowerCase().includes('parquet') ? 'Parquet' : 'Other';
                storageByType[format] += (table.storage_size || 10); // Assume 10MB if size not available
              });
            } catch (error) {
              console.warn(`Error fetching tables for schema ${schema.name}:`, error.message);
            }
          });
  
          await Promise.all(tablePromises);
          catalogStorageMap[catalog.name] = catalogTableCount * 10;
        } catch (error) {
          console.warn(`Error fetching schemas for catalog ${catalog.name}:`, error.message);
        }
      });
  
      await Promise.all(schemaPromises);
      const tableData = Object.values(schemaTableMap).sort((a, b) => b.tables - a.tables).slice(0, 5);
      const catalogData = Object.entries(catalogStorageMap).map(([name, storage]) => ({
        name,
        value: storage
      }));
      const storageByTypeData = Object.entries(storageByType).map(([name, value]) => ({
        name,
        value
      }));
  
      // 3. Fetch query history and calculate metrics
      let allQueries = [];
      let sensitiveDataAccesses = 0;
      const activeUserSet = new Set();
      const clustersResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/clusters/list`, {
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });
  
      const clusters = clustersResponse.data.clusters || [];
      for (const cluster of clusters.slice(0, 5)) {
        try {
          const eventsResponse = await axios.post(`${process.env.DATABRICKS_HOST}/api/2.0/clusters/events`, {
            cluster_id: cluster.cluster_id,
            start_time: startTime,
            end_time: now,
            limit: 50,
            order: 'DESC'
          }, {
            headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
            timeout: 30000
          });
  
          const notebookEvents = eventsResponse.data.events?.filter(e =>
            e.type.includes('COMMAND') || e.type.includes('RUN') || e.type.includes('COMPLETED') || e.type === 'STARTING'
          ) || [];
  
          notebookEvents.forEach(event => {
            const queryText = event.details?.command?.command_text || event.details?.notebook_path || `Cluster ${cluster.cluster_name} execution`;
            if (queryText.toLowerCase().includes('pii') || queryText.toLowerCase().includes('sensitive')) {
              sensitiveDataAccesses++;
            }
            allQueries.push({
              query_text: queryText,
              user_name: event.details?.user || 'unknown',
              execution_start_time_ms: event.timestamp,
              duration: event.details?.execution_duration || 0,
              status: event.details?.result_state || event.type,
              source: 'notebook'
            });
            if (event.details?.user) activeUserSet.add(event.details.user);
          });
        } catch (error) {
          console.warn(`Error fetching events for cluster ${cluster.cluster_id}:`, error.message);
        }
      }
  
      const jobsResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/jobs/runs/list`, {
        params: {
          limit: 50,
          start_time_from: startTime,
          expand_tasks: true,
          completed_only: false
        },
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });
  
      const notebookRuns = jobsResponse.data.runs || [];
      notebookRuns.forEach(run => {
        const queryText = run.tasks?.[0]?.notebook_task?.notebook_path || run.tasks?.[0]?.spark_python_task?.python_file || `Job ${run.run_id}`;
        if (queryText.toLowerCase().includes('pii') || queryText.toLowerCase().includes('sensitive')) {
          sensitiveDataAccesses++;
        }
        allQueries.push({
          query_text: queryText,
          user_name: run.creator_user_name || 'unknown',
          execution_start_time_ms: run.start_time,
          duration: run.execution_duration || 0,
          status: run.state?.result_state || run.state?.life_cycle_state || 'unknown',
          source: 'job'
        });
        if (run.creator_user_name) activeUserSet.add(run.creator_user_name);
      });
  
      const sqlParams = {
        max_results: 50,
        filter_by: {
          query_start_time_range: {
            start_time_ms: startTime,
            end_time_ms: now
          }
        }
      };
      if (process.env.DATABRICKS_WAREHOUSE_ID) {
        sqlParams.filter_by.warehouse_id = process.env.DATABRICKS_WAREHOUSE_ID;
      }
  
      const sqlHistoryResponse = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.0/sql/history/queries`, {
        params: sqlParams,
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        timeout: 30000
      });
  
      const sqlQueries = sqlHistoryResponse.data.results || [];
      sqlQueries.forEach(query => {
        if (query.query_text?.toLowerCase().includes('pii') || query.query_text?.toLowerCase().includes('sensitive')) {
          sensitiveDataAccesses++;
        }
        allQueries.push({
          ...query,
          source: 'sql'
        });
        if (query.user_name) activeUserSet.add(query.user_name);
      });
  
      if (allQueries.length === 0) {
        allQueries.push({
          query_text: 'No query history available',
          user_name: 'System',
          execution_start_time_ms: now,
          duration: 0,
          status: 'N/A',
          source: 'system'
        });
      }
  
      allQueries.sort((a, b) => b.execution_start_time_ms - a.execution_start_time_ms);
      const activeUsers = activeUserSet.size;
      const recentActivity = allQueries.length;
  
      // Calculate query performance
      const queryPerformance = {
        avgDuration: allQueries.reduce((sum, q) => sum + (q.duration || 0), 0) / (allQueries.length || 1) / 1000,
        successRate: (allQueries.filter(q => q.status.toLowerCase() === 'finished').length / (allQueries.length || 1)) * 100
      };
  
      // Compute usageData
      const days = timeFilter === 'day' ? 1 : timeFilter === 'month' ? 30 : 7;
      const usageData = Array.from({ length: days }, (_, i) => {
        const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
        const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();
  
        const queryCount = allQueries.filter(query => {
          const queryTime = new Date(query.execution_start_time_ms).getTime();
          return queryTime >= dayStart && queryTime <= dayEnd;
        }).length;
  
        const storageEstimate = totalTables * 10 + i * 2;
        return {
          day: dayName,
          queries: queryCount,
          storage: storageEstimate
        };
      });
  
      // 4. Fetch privilege distribution
      const privilegeDistribution = {
        totalGrants: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      };
  
      const privilegePromises = catalogs.map(async (catalog) => {
        try {
          const response = await axios.get(
            `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/catalog/${encodeURIComponent(catalog.name)}`,
            {
              headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
              timeout: 30000
            }
          );
  
          if (response.data?.privilege_assignments && Array.isArray(response.data.privilege_assignments)) {
            response.data.privilege_assignments.forEach(assignment => {
              if (Array.isArray(assignment.privileges)) {
                assignment.privileges.forEach(privilege => {
                  const privilegeType = privilege?.toUpperCase();
                  if (!privilegeType) return;
                  privilegeDistribution.totalGrants++;
                  if (privilegeType in privilegeDistribution.byPrivilege) {
                    privilegeDistribution.byPrivilege[privilegeType]++;
                  } else {
                    privilegeDistribution.byPrivilege.OTHER++;
                  }
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Error fetching privileges for catalog ${catalog.name}:`, error.message);
        }
      });
  
      await Promise.all(privilegePromises);
  
      // 5. Construct response
      const result = {
        totalCatalogs: catalogs.length,
        totalSchemas,
        totalTables,
        totalUsers,
        activeUsers,
        catalogData: catalogData.length > 0 ? catalogData : [{ name: 'No Data', value: 1 }],
        tableData: tableData.length > 0 ? tableData : [{ name: 'No Data', tables: 0 }],
        usageData: usageData.length > 0 ? usageData : [{ day: 'No Data', queries: 0, storage: 0 }],
        recentQueries: allQueries.slice(0, 5).map((q, i) => ({
          id: i + 1,
          query: q.query_text,
          user: q.user_name,
          time: formatTimeAgo(q.execution_start_time_ms),
          status: q.status,
          duration: q.duration ? `${(q.duration / 1000).toFixed(1)}s` : 'N/A',
          source: q.source
        })),
        recentActivity,
        privilegeDistribution,
        storageByType: storageByTypeData.length > 0 ? storageByTypeData : [{ name: 'No Data', value: 0 }],
        queryPerformance,
        sensitiveDataAccesses
      };
  
      // Update cache
      cache.data = result;
      cache.lastFetched = now;
      cache.timeFilter = timeFilter;
  
      console.log('Workspace stats response:', result);
      res.json(result);
    } catch (error) {
      console.error('Error fetching workspace stats:', {
        message: error.message,
        code: error.code,
        response: error.response?.data
      });
  
      let errorMessage = 'Failed to fetch workspace statistics';
      if (error.response?.status === 403) {
        errorMessage = 'Access denied - please check your Databricks token permissions';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request to Databricks timed out';
      } else if (!error.response) {
        errorMessage = 'Network error - please check your connection';
      }
  
      res.status(500).json({
        error: errorMessage,
        totalCatalogs: 0,
        totalSchemas: 0,
        totalTables: 0,
        totalUsers: 0,
        activeUsers: 0,
        catalogData: [{ name: 'No Data', value: 1 }],
        tableData: [{ name: 'No Data', tables: 0 }],
        usageData: [{ day: 'No Data', queries: 0, storage: 0 }],
        recentQueries: [{ id: 1, query: 'No queries', user: 'N/A', time: 'N/A', status: 'N/A', duration: 'N/A' }],
        recentActivity: 0,
        privilegeDistribution: {
          totalGrants: 0,
          byPrivilege: {
            USE_CATALOG: 0,
            CREATE_SCHEMA: 0,
            SELECT: 0,
            MODIFY: 0,
            ALL_PRIVILEGES: 0,
            OTHER: 0
          }
        },
        storageByType: [{ name: 'No Data', value: 0 }],
        queryPerformance: { avgDuration: 0, successRate: 0 },
        sensitiveDataAccesses: 0
      });
    }
  });

  // Add this endpoint to get user privilege counts
  app.get('/api/catalogs/:catalogName/user-privileges', async (req, res) => {
    try {
      const { catalogName } = req.params;
  
      const response = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/catalog/${catalogName}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` }
        }
      );
  
      const userPrivileges = {
        totalUsers: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      };
  
      const seenUsers = new Set();
  
      console.log('User privilege assignments:', response.data?.privilege_assignments);
  
      if (response.data?.privilege_assignments && Array.isArray(response.data.privilege_assignments)) {
        response.data.privilege_assignments.forEach(assignment => {
          const principal = assignment.principal?.toLowerCase();
          if (!principal || !principal.includes('user')) return;
  
          const userId = principal.split('/').pop();
          if (!seenUsers.has(userId)) {
            seenUsers.add(userId);
          }
  
          if (Array.isArray(assignment.privileges)) {
            assignment.privileges.forEach(privilege => {
              const privilegeType = privilege?.toUpperCase();
              if (!privilegeType) return;
              if (privilegeType in userPrivileges.byPrivilege) {
                userPrivileges.byPrivilege[privilegeType]++;
              } else {
                userPrivileges.byPrivilege.OTHER++;
              }
            });
          }
        });
      } else {
        console.warn('No user privilege assignments found for catalog:', catalogName);
      }
  
      userPrivileges.totalUsers = seenUsers.size;
  
      console.log('User privileges result:', userPrivileges);
  
      res.json(userPrivileges);
    } catch (error) {
      console.error('Error fetching user privileges:', error);
      res.status(500).json({
        error: error.response?.data?.message || 'Failed to fetch user privilege statistics',
        totalUsers: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      });
    }
  });

  
  
  // Add this endpoint to get user privilege counts
  app.get('/api/catalogs/:catalogName/user-privileges', async (req, res) => {
    try {
      const { catalogName } = req.params;
  
      const response = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/catalog/${catalogName}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` }
        }
      );
  
      const userPrivileges = {
        totalUsers: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      };
  
      const seenUsers = new Set();
  
      console.log('User privilege assignments:', response.data?.privilege_assignments); // Debug log
  
      if (response.data?.privilege_assignments && Array.isArray(response.data.privilege_assignments)) {
        response.data.privilege_assignments.forEach(assignment => {
          const principal = assignment.principal?.toLowerCase();
          if (!principal || !principal.includes('user')) return;
  
          const userId = principal.split('/').pop(); // Extract user ID
          if (!seenUsers.has(userId)) {
            seenUsers.add(userId);
          }
  
          if (Array.isArray(assignment.privileges)) {
            assignment.privileges.forEach(privilege => {
              const privilegeType = privilege?.toUpperCase();
              if (!privilegeType) return;
              if (privilegeType in userPrivileges.byPrivilege) {
                userPrivileges.byPrivilege[privilegeType]++;
              } else {
                userPrivileges.byPrivilege.OTHER++;
              }
            });
          }
        });
      } else {
        console.warn('No user privilege assignments found for catalog:', catalogName);
      }
  
      userPrivileges.totalUsers = seenUsers.size;
  
      console.log('User privileges result:', userPrivileges); // Debug log
  
      res.json(userPrivileges);
    } catch (error) {
      console.error('Error fetching user privileges:', error);
      res.status(500).json({
        error: error.response?.data?.message || 'Failed to fetch user privilege statistics',
        totalUsers: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      });
    }
  });
  // Add this endpoint to get user privilege counts
  app.get('/api/catalogs/:catalogName/user-privileges', async (req, res) => {
    try {
      const { catalogName } = req.params;
  
      const response = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/catalog/${catalogName}`,
        {
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` }
        }
      );
  
      const userPrivileges = {
        totalUsers: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      };
  
      const seenUsers = new Set();
  
      console.log('User privilege assignments:', response.data?.privilege_assignments); // Debug log
  
      if (response.data?.privilege_assignments && Array.isArray(response.data.privilege_assignments)) {
        response.data.privilege_assignments.forEach(assignment => {
          const principal = assignment.principal?.toLowerCase();
          if (!principal || !principal.includes('user')) return;
  
          const userId = principal.split('/').pop(); // Extract user ID
          if (!seenUsers.has(userId)) {
            seenUsers.add(userId);
          }
  
          if (Array.isArray(assignment.privileges)) {
            assignment.privileges.forEach(privilege => {
              const privilegeType = privilege?.toUpperCase();
              if (!privilegeType) return;
              if (privilegeType in userPrivileges.byPrivilege) {
                userPrivileges.byPrivilege[privilegeType]++;
              } else {
                userPrivileges.byPrivilege.OTHER++;
              }
            });
          }
        });
      } else {
        console.warn('No user privilege assignments found for catalog:', catalogName);
      }
  
      userPrivileges.totalUsers = seenUsers.size;
  
      console.log('User privileges result:', userPrivileges); // Debug log
  
      res.json(userPrivileges);
    } catch (error) {
      console.error('Error fetching user privileges:', error);
      res.status(500).json({
        error: error.response?.data?.message || 'Failed to fetch user privilege statistics',
        totalUsers: 0,
        byPrivilege: {
          USE_CATALOG: 0,
          CREATE_SCHEMA: 0,
          SELECT: 0,
          MODIFY: 0,
          ALL_PRIVILEGES: 0,
          OTHER: 0
        }
      });
    }
  });
app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await updateUser(req.params.id, req.body);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Group endpoints
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await getGroups();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/groups/:groupId/entitlements', async (req, res) => {
  try {
    const response = await axios.get(
      `https://dbc-6e076fbc-a34a.cloud.databricks.com/api/2.0/preview/scim/v2/Groups/${req.params.groupId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/scim+json'
        }
      }
    );
    
    const entitlements = {
      clusterCreation: false,
      sqlAccess: false,
      workspaceAccess: false
    };
    
    if (response.data.entitlements) {
      response.data.entitlements.forEach(ent => {
        if (ent.value === 'allow-cluster-create') entitlements.clusterCreation = true;
        if (ent.value === 'databricks-sql-access') entitlements.sqlAccess = true;
        if (ent.value === 'workspace-access') entitlements.workspaceAccess = true;
      });
    }
    
    res.json(entitlements);
  } catch (error) {
    console.error('Error fetching entitlements:', error);
    res.status(500).json({ error: error.message });
  }
});
app.get('/api/groups/:groupId/members', async (req, res) => {
  try {
    const members = await getGroupMembers(req.params.groupId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/groups/:groupId', async (req, res) => {
  try {
    const updatedGroup = await databricksUpdateGroup(req.params.groupId, req.body);
    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.delete('/api/groups/:groupId', async (req, res) => {
  try {
    await workspaceApi.delete(`/Groups/${req.params.groupId}`);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ 
      error: error.response?.data?.detail || error.message || 'Failed to delete group'
    });
  }
});

// app.delete('/api/groups/:groupId', async (req, res) => {
//   try {
//     const response = await axios.delete(
//       `${process.env.DATABRICKS_HOST}/api/2.0/account/scim/v2/Groups/${req.params.groupId}`,
//       {
//         headers: {
//           'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
//           'Content-Type': 'application/scim+json'
//         }
//       }
//     );
    
//     res.status(204).end();
//   } catch (error) {
//     console.error(`Error deleting group ${req.params.groupId}:`, error);
    
//     let status = 500;
//     let message = 'Failed to delete group';
    
//     if (error.response) {
//       status = error.response.status;
//       if (status === 403) {
//         message = 'Permission denied: You do not have rights to delete this group';
//       } else if (error.response.data?.detail) {
//         message = error.response.data.detail;
//       }
//     }
    
//     res.status(status).json({ error: message });
//   }
// });
// Send OTP endpoint
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email, cluster } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration

    // Store OTP with expiration
    otpStore.set(email, { otp, expiresAt, cluster });

    // Send email
    await sendEmail({
      to: email,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${otp}\n\nThis code will expire in 5 minutes.`,
      html: `<p>Your verification code is: <strong>${otp}</strong></p>
             <p>This code will expire in 5 minutes.</p>`
    });

    res.json({ 
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to send verification code'
    });
  }
});

// Verify OTP endpoint
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and OTP are required'
      });
    }

    // Get stored OTP data
    const storedData = otpStore.get(email);
    
    if (!storedData) {
      return res.status(400).json({ 
        success: false,
        message: 'No OTP found for this email. Please request a new one.'
      });
    }

    // Check expiration
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid verification code'
      });
    }

    // OTP is valid - create a session token
    const token = crypto.randomBytes(32).toString('hex');
    
    // In production, store this token in a database with user info
    otpStore.set(token, { 
      email,
      cluster: storedData.cluster,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    // Clear the OTP
    otpStore.delete(email);

    res.json({ 
      success: true,
      token,
      message: 'Verification successful'
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to verify code'
    });
  }
});
// Catalog endpoints
app.get('/api/catalogs', async (req, res) => {
  try {
    // Implement logic to fetch catalogs from Databricks Unity Catalog
    // This is a placeholder - you'll need to use the actual Databricks UC API
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        }
      }
    );
    res.json(response.data.catalogs || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/catalogs/:catalogId', async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs/${req.params.catalogId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/catalogs', async (req, res) => {
  try {
    console.log('Creating catalog with data:', req.body);
    
    // Validate required fields
    if (!req.body.name) {
      return res.status(400).json({ error: 'Catalog name is required' });
    }

    // Check if catalog already exists
    const checkResponse = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        }
      }
    );

    const existingCatalogs = checkResponse.data.catalogs || [];
    if (existingCatalogs.some(cat => cat.name === req.body.name)) {
      return res.status(409).json({ 
        error: `Catalog '${req.body.name}' already exists` 
      });
    }

    // Prepare the request payload with storage root
    const payload = {
      name: req.body.name,
      comment: req.body.comment || 'Created via UC Manager',
      storage_root: `s3://databricks-workspace-certification-bucket/unity-catalog/48569899784772/${req.body.name}`
    };

    const response = await axios.post(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Catalog created successfully:', response.data);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error creating catalog:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: error.response?.data?.message || 
            error.message || 
            'Failed to create catalog' 
    });
  }
});
app.patch('/api/catalogs/:catalogId', async (req, res) => {
  try {
    const response = await axios.patch(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs/${req.params.catalogId}`,
      req.body,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Privilege management endpoints
app.post('/api/privileges/grant', async (req, res) => {
  try {
    const { securable_type, full_name, principal, privileges } = req.body;
   
    if (!securable_type || !full_name || !principal || !privileges) {
      return res.status(400).json({
        error: 'securable_type, full_name, principal and privileges are required'
      });
    }
 
    const response = await axios.patch(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/${securable_type}/${encodeURIComponent(full_name)}`,
      {
        changes: [{
          principal,
          add: privileges.map(p => p.toUpperCase())
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
 
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error granting privileges:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
   
    res.status(500).json({
      error: error.response?.data?.message || 'Failed to grant privileges'
    });
  }
});
app.post('/api/groups/add-member', async (req, res) => {
  try {
    const { userId, groupName } = req.body;
    
    if (!userId || !groupName) {
      return res.status(400).json({
        error: 'userId and groupName are required'
      });
    }

    const response = await axios.post(
      `${process.env.DATABRICKS_HOST}/api/2.0/groups/add-member`,
      {
        user_name: userId,
        parent_name: groupName
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error adding user to group:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({
      error: error.response?.data?.message || 'Failed to add user to group'
    });
  }
});
app.post('/api/privileges/revoke', async (req, res) => {
  try {
    const { securable_type, full_name, principal, privileges } = req.body;
   
    if (!securable_type || !full_name || !principal || !privileges) {
      return res.status(400).json({
        error: 'securable_type, full_name, principal and privileges are required'
      });
    }
 
    const response = await axios.patch(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/${securable_type}/${encodeURIComponent(full_name)}`,
      {
        changes: [{
          principal,
          remove: privileges.map(p => p.toUpperCase())
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
 
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error revoking privileges:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
   
    res.status(500).json({
      error: error.response?.data?.message || 'Failed to revoke privileges'
    });
  }
});

app.get('/api/privileges/:securable_type/:full_name', async (req, res) => {
  try {
    const { securable_type, full_name } = req.params;
    
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/permissions/${securable_type}/${encodeURIComponent(full_name)}`,
      { 
        headers: { 
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        } 
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching privileges:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: error.response?.data?.message || 'Failed to fetch privileges'
    });
  }
});

// Create schema endpoint
// Create schema endpoint
app.post('/api/schemas', async (req, res) => {
  try {
    const { catalogName, schemaName, comment } = req.body;
    
    if (!catalogName || !schemaName) {
      return res.status(400).json({ 
        error: 'Catalog name and schema name are required' 
      });
    }

    // Create schema
    const response = await axios.post(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`,
      {
        name: schemaName,
        catalog_name: catalogName,
        comment: comment || ''
      },
      { 
        headers: { 
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/json'
        } 
      }
    );

    res.status(201).json(response.data);
  } catch (error) {
    console.error('Schema creation error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: error.response?.data?.message || 'Failed to create schema',
      details: error.response?.data?.error_code
    });
  }
});
// Delete schema endpoint
app.delete('/api/schemas/:catalogName/:schemaName', async (req, res) => {
  try {
    const { catalogName, schemaName } = req.params;
    const fullSchemaName = `${catalogName}.${schemaName}`;
    
    // First check if schema exists
    try {
      await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas/${fullSchemaName}`,
        { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
      );
    } catch (error) {
      if (error.response?.status === 404) {
        return res.status(404).json({ error: `Schema '${schemaName}' not found in catalog '${catalogName}'` });
      }
      throw error;
    }

    // Delete schema
    await axios.delete(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas/${fullSchemaName}`,
      { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
    );

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting schema:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: error.response?.data?.message || 'Failed to delete schema'
    });
  }
});
app.delete('/api/catalogs/:catalogName', async (req, res) => {
  try {
    const { catalogName } = req.params;
    console.log(`Deleting catalog: ${catalogName}`);

    // 1. First check if catalog exists
    const catalogCheck = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs/${catalogName}`,
      { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
    );

    if (!catalogCheck.data) {
      return res.status(404).json({ error: `Catalog '${catalogName}' not found` });
    }

    // 2. List all schemas in the catalog
    const schemasResponse = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`,
      { 
        headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
        params: { catalog_name: catalogName }
      }
    );

    const schemas = schemasResponse.data.schemas || [];

    // 3. Delete each schema and its tables (skip system schemas)
    for (const schema of schemas) {
      const schemaName = schema.name;
      
      // Skip system schemas
      if (schemaName === 'information_schema') {
        console.log(`Skipping system schema: ${catalogName}.${schemaName}`);
        continue;
      }

      const fullSchemaName = `${catalogName}.${schemaName}`;

      // List tables in schema
      const tablesResponse = await axios.get(
        `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/tables`,
        { 
          headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
          params: { 
            catalog_name: catalogName,
            schema_name: schemaName 
          }
        }
      );

      const tables = tablesResponse.data.tables || [];

      // Delete tables
      for (const table of tables) {
        const dropSql = `DROP TABLE IF EXISTS ${catalogName}.${schemaName}.${table.name}`;
        try {
          await axios.post(
            `${process.env.DATABRICKS_HOST}/api/2.0/sql/statements`,
            {
              warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
              statement: dropSql,
              wait_timeout: "10s"
            },
            { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
          );
          console.log(`Deleted table: ${catalogName}.${schemaName}.${table.name}`);
        } catch (error) {
          console.error(`Error deleting table ${catalogName}.${schemaName}.${table.name}:`, error.message);
          // Continue with deletion even if some tables fail
        }
      }

      // Delete schema
      try {
        await axios.delete(
          `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas/${fullSchemaName}`,
          { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
        );
        console.log(`Deleted schema: ${fullSchemaName}`);
      } catch (error) {
        console.error(`Error deleting schema ${fullSchemaName}:`, error.message);
        // Continue with deletion even if some schemas fail
      }
    }

    // 4. Finally delete the catalog
    await axios.delete(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs/${catalogName}`,
      { headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` } }
    );

    console.log(`Successfully deleted catalog: ${catalogName}`);
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting catalog:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });

    let statusCode = 500;
    let errorMessage = error.message;

    if (error.response) {
      statusCode = error.response.status;
      if (error.response.data?.error_code === 'SCHEMA_NOT_EMPTY') {
        errorMessage = 'Could not delete all schemas - some tables may be referenced by views';
      } else if (error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});
app.get('/api/catalogs/:catalogName/schemas', async (req, res) => {
  try {
    console.log(`Fetching schemas for catalog: ${req.params.catalogName}`);
    
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/schemas`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
        },
        params: {
          catalog_name: req.params.catalogName
        }
      }
    );

    console.log('Successfully fetched schemas:', response.data);
    res.json(response.data.schemas || []);
  } catch (error) {
    console.error('Error fetching schemas:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: error.response?.data?.message || 
            error.message || 
            'Failed to fetch schemas' 
    });
  }
});
app.get('/api/groups/:groupId', async (req, res) => {
  try {
    const response = await workspaceApi.get(`/Groups/${req.params.groupId}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ 
      error: error.response?.data?.detail || error.message || 'Failed to fetch group'
    });
  }
});

// app.post('/api/groups/:groupId/add-members', async (req, res) => {
//   try {
//     await databricksAddGroupMembers(req.params.groupId, req.body.userIds);
//     res.status(200).json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
app.post('/api/groups/:groupId/add-members', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }
    
    // Add each user to the group
    const results = await Promise.all(
      userIds.map(userId => 
        assignUserToGroup(userId, req.params.groupId)
      )
    );
    
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// app.post('/api/groups/:groupId/remove-members', async (req, res) => {
//   try {
//     await databricksRemoveGroupMembers(req.params.groupId, req.body.userIds);
//     res.status(200).json({ success: true });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });
app.post('/api/groups/:groupId/remove-members', async (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'User IDs array is required' });
    }

    // Filter out null/undefined values
    const validUserIds = userIds.filter(id => id);
    if (validUserIds.length === 0) {
      return res.json({ success: true, message: 'No valid users to remove' });
    }

    const results = await databricksRemoveGroupMembers(req.params.groupId, validUserIds);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error removing members:', error);
    res.status(500).json({ 
      error: error.response?.data?.detail || error.message || 'Failed to remove members'
    });
  }
});
app.post('/api/users/:userId/groups', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { groupId } = req.body;
    
    if (!groupId) {
      return res.status(400).json({ error: 'Group ID is required' });
    }
    
    console.log(`Assigning user ${userId} to group ${groupId}`);
    await assignUserToGroup(userId, groupId);
    
    const userGroups = await getUserGroups(userId);
    res.status(200).json(userGroups);
  } catch (error) {
    console.error('Error assigning user to group:', error);
    res.status(500).json({ error: error.message || 'Failed to assign user to group' });
  }
});
app.get('/api/users/:userId/groups', async (req, res) => {
  try {
    const userId = req.params.userId;
    const response = await axios.get(
      `${process.env.DATABRICKS_HOST}/api/2.0/account/scim/v2/Users/${userId}?attributes=groups`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
          'Content-Type': 'application/scim+json'
        }
      }
    );

    res.json(response.data.groups || []);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json([]);
  }
});
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://13.126.41.254:${PORT}`);
});