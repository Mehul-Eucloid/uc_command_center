export default {
    workspace: {
      host: process.env.DATABRICKS_HOST,
      token: process.env.DATABRICKS_TOKEN,
      scimPath: '/api/2.0/preview/scim/v2'
    },
    account: {
      host: 'https://accounts.cloud.databricks.com',
      accountId: process.env.DATABRICKS_ACCOUNT_ID,
      token: process.env.DATABRICKS_ACCOUNT_TOKEN,
      scimPath: `/api/2.0/accounts/${process.env.DATABRICKS_ACCOUNT_ID}/scim/v2`
    }
  };