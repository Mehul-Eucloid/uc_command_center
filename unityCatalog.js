// In your server routes (e.g., routes/unityCatalog.js)
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/catalogs', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`, {
      headers: {
        'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
      }
    });
    res.json({ catalogs: response.data.catalogs || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/catalogs', async (req, res) => {
  try {
    const response = await axios.post(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`, req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/catalogs/:catalogName', async (req, res) => {
  try {
    const response = await axios.delete(`${process.env.DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs/${req.params.catalogName}`, {
      headers: {
        'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;